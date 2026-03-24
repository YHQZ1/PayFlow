import { v4 as uuidv4 } from "uuid";
import { publishMismatch } from "../kafka/producer.js";
import { db } from "../db/index.js";
import { reconciliationRuns, reconciliationMismatches } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../logger.js";
import "dotenv/config";

const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 100));
    }
  }
};

const fetchAllLedgerJournal = async (tenantId, startDate, endDate) => {
  let allEntries = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${process.env.LEDGER_SERVICE_URL}/ledger/journal/${tenantId}?limit=${limit}&offset=${offset}`;
    if (startDate) url += `&startDate=${startDate.toISOString()}`;
    if (endDate) url += `&endDate=${endDate.toISOString()}`;

    const res = await fetchWithRetry(url);
    const { data, hasMore } = await res.json();
    allEntries = allEntries.concat(data);
    if (!hasMore) break;
    offset += limit;
  }
  return allEntries;
};

const fetchGatewayChargesByDate = async (startDate, endDate) => {
  let allCharges = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${process.env.GATEWAY_SERVICE_URL}/gateway/charges?limit=${limit}&offset=${offset}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    const res = await fetchWithRetry(url);
    const { data, hasMore } = await res.json();
    allCharges = allCharges.concat(data);
    if (!hasMore) break;
    offset += limit;
  }
  return allCharges;
};

const compareRecords = (ledgerEntries, gatewayCharges, tenantId) => {
  const mismatches = [];

  const gatewayByPaymentId = new Map();
  for (const charge of gatewayCharges) {
    if (charge.metadata?.tenantId === tenantId && charge.metadata?.paymentId) {
      gatewayByPaymentId.set(charge.metadata.paymentId, charge);
    }
  }

  const creditEntries = ledgerEntries.filter((e) => e.entryType === "credit");

  for (const entry of creditEntries) {
    const gatewayCharge = gatewayByPaymentId.get(entry.paymentId);

    if (!gatewayCharge) {
      mismatches.push({
        type: "MISSING_IN_GATEWAY",
        paymentId: entry.paymentId,
        ledgerAmount: entry.amount,
        gatewayAmount: null,
        description: "Payment exists in ledger but not found in gateway",
      });
      continue;
    }

    if (gatewayCharge.amount !== entry.amount) {
      mismatches.push({
        type: "AMOUNT_MISMATCH",
        paymentId: entry.paymentId,
        ledgerAmount: entry.amount,
        gatewayAmount: gatewayCharge.amount,
        description: `Ledger ₹${entry.amount} does not match gateway ₹${gatewayCharge.amount}`,
      });
      continue;
    }

    if (gatewayCharge.status !== "succeeded") {
      mismatches.push({
        type: "STATUS_MISMATCH",
        paymentId: entry.paymentId,
        ledgerAmount: entry.amount,
        gatewayStatus: gatewayCharge.status,
        description: `Ledger has credit entry but gateway shows: ${gatewayCharge.status}`,
      });
    }
  }

  for (const [paymentId, charge] of gatewayByPaymentId) {
    if (charge.status !== "succeeded") continue;
    const hasLedgerEntry = creditEntries.some((e) => e.paymentId === paymentId);
    if (!hasLedgerEntry) {
      mismatches.push({
        type: "MISSING_IN_LEDGER",
        paymentId,
        ledgerAmount: null,
        gatewayAmount: charge.amount,
        description: "Payment succeeded in gateway but missing from ledger",
      });
    }
  }

  return mismatches;
};

export const checkHealth = async () => {
  const checks = {};
  let healthy = true;

  try {
    const res = await fetchWithRetry(
      `${process.env.GATEWAY_SERVICE_URL}/gateway/health`,
    );
    checks.gateway = res.ok ? "ok" : "error";
    if (!res.ok) healthy = false;
  } catch {
    checks.gateway = "error";
    healthy = false;
  }

  try {
    const res = await fetchWithRetry(
      `${process.env.LEDGER_SERVICE_URL}/ledger/health`,
    );
    checks.ledger = res.ok ? "ok" : "error";
    if (!res.ok) healthy = false;
  } catch {
    checks.ledger = "error";
    healthy = false;
  }

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  return {
    status: healthy ? "ok" : "degraded",
    service: "reconciliation-service",
    timestamp: new Date().toISOString(),
    checks,
  };
};

export const runReconciliation = async (tenantId, startDate, endDate) => {
  const runId = uuidv4();
  const startedAt = new Date();

  logger.info({ runId, tenantId }, "reconciliation run started");

  let ledgerEntries = [];
  let gatewayCharges = [];
  let mismatches = [];
  let status = "completed";
  let error = null;

  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    [ledgerEntries, gatewayCharges] = await Promise.all([
      fetchAllLedgerJournal(tenantId, start, end),
      fetchGatewayChargesByDate(start, end),
    ]);

    mismatches = compareRecords(ledgerEntries, gatewayCharges, tenantId);

    for (const mismatch of mismatches) {
      await publishMismatch({ runId, tenantId, ...mismatch });
    }
  } catch (err) {
    logger.error({ err, runId }, "reconciliation run failed");
    status = "failed";
    error = err.message;
  }

  const [run] = await db
    .insert(reconciliationRuns)
    .values({
      runId,
      tenantId,
      status,
      error: error || null,
      startedAt,
      completedAt: new Date(),
      summary: {
        ledgerEntries: ledgerEntries.length,
        gatewayCharges: gatewayCharges.length,
        mismatches: mismatches.length,
      },
    })
    .returning();

  for (const mismatch of mismatches) {
    await db.insert(reconciliationMismatches).values({
      runId: run.id,
      tenantId,
      type: mismatch.type,
      paymentId: mismatch.paymentId,
      ledgerAmount: mismatch.ledgerAmount,
      gatewayAmount: mismatch.gatewayAmount,
      gatewayStatus: mismatch.gatewayStatus,
      description: mismatch.description,
    });
  }

  logger.info(
    { runId, tenantId, mismatches: mismatches.length, status },
    "reconciliation run completed",
  );

  return {
    runId,
    tenantId,
    status,
    error,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    summary: {
      ledgerEntries: ledgerEntries.length,
      gatewayCharges: gatewayCharges.length,
      mismatches: mismatches.length,
    },
  };
};

export const getRunHistory = async ({ limit = 20, offset = 0 } = {}) => {
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(reconciliationRuns)
      .orderBy(desc(reconciliationRuns.startedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql`count(*)` }).from(reconciliationRuns),
  ]);

  return {
    data: rows,
    total: Number(total[0].count),
    limit,
    offset,
    hasMore: offset + limit < Number(total[0].count),
  };
};

export const getMismatchesByRun = async (runId) => {
  const [run] = await db
    .select()
    .from(reconciliationRuns)
    .where(eq(reconciliationRuns.runId, runId));

  if (!run) return null;

  const mismatches = await db
    .select()
    .from(reconciliationMismatches)
    .where(eq(reconciliationMismatches.runId, run.id));

  return mismatches;
};

export const checkForMismatch = async ({ tenantId, paymentId, amount }) => {
  try {
    // Fetch the corresponding gateway charge
    const response = await fetch(
      `${process.env.GATEWAY_SERVICE_URL}/gateway/charge/${paymentId}`,
    );

    if (!response.ok) {
      // Gateway doesn't have this charge - mismatch detected
      logger.warn(
        { tenantId, paymentId, amount },
        "MISMATCH: Payment in ledger but not in gateway",
      );

      // Publish mismatch event
      const { publishMismatch } = await import("../kafka/producer.js");
      await publishMismatch({
        runId: `realtime_${Date.now()}`,
        tenantId,
        type: "MISSING_IN_GATEWAY",
        paymentId,
        ledgerAmount: amount,
        gatewayAmount: null,
        description: "Payment exists in ledger but not found in gateway",
      });
      return;
    }

    const charge = await response.json();

    if (charge.amount !== amount) {
      logger.warn(
        {
          tenantId,
          paymentId,
          ledgerAmount: amount,
          gatewayAmount: charge.amount,
        },
        "MISMATCH: Amount mismatch between ledger and gateway",
      );

      const { publishMismatch } = await import("../kafka/producer.js");
      await publishMismatch({
        runId: `realtime_${Date.now()}`,
        tenantId,
        type: "AMOUNT_MISMATCH",
        paymentId,
        ledgerAmount: amount,
        gatewayAmount: charge.amount,
        description: `Ledger ₹${amount} does not match gateway ₹${charge.amount}`,
      });
    }
  } catch (err) {
    logger.error({ err, tenantId, paymentId }, "failed to check for mismatch");
  }
};
