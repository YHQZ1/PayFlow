import { v4 as uuidv4 } from "uuid";
import { publishMismatch } from "../kafka/producer.js";
import { logger } from "../logger.js";
import "dotenv/config";

// In-memory run store (replace with DB in production)
const runHistory = new Map();

export const checkHealth = async () => {
  const checks = {};
  let healthy = true;

  try {
    const res = await fetch(
      `${process.env.GATEWAY_SERVICE_URL}/gateway/health`,
    );
    checks.gateway = res.ok ? "ok" : "error";
    if (!res.ok) healthy = false;
  } catch {
    checks.gateway = "error";
    healthy = false;
  }

  try {
    const res = await fetch(`${process.env.LEDGER_SERVICE_URL}/ledger/health`);
    checks.ledger = res.ok ? "ok" : "error";
    if (!res.ok) healthy = false;
  } catch {
    checks.ledger = "error";
    healthy = false;
  }

  return {
    status: healthy ? "ok" : "degraded",
    service: "reconciliation-service",
    timestamp: new Date().toISOString(),
    checks,
  };
};

const fetchLedgerJournal = async (tenantId) => {
  const res = await fetch(
    `${process.env.LEDGER_SERVICE_URL}/ledger/journal/${tenantId}?limit=100`,
  );
  if (!res.ok) throw new Error(`ledger fetch failed: ${res.status}`);
  const body = await res.json();
  return body.data;
};

const fetchGatewayCharges = async () => {
  const res = await fetch(`${process.env.GATEWAY_SERVICE_URL}/gateway/charges`);
  if (!res.ok) throw new Error(`gateway fetch failed: ${res.status}`);
  const body = await res.json();
  return body.data;
};

const compareRecords = (ledgerEntries, gatewayCharges, tenantId) => {
  const mismatches = [];

  // Build map of gateway charges by paymentId for this tenant only
  const gatewayByPaymentId = new Map();
  for (const charge of gatewayCharges) {
    if (charge.metadata?.tenantId === tenantId && charge.metadata?.paymentId) {
      gatewayByPaymentId.set(charge.metadata.paymentId, charge);
    }
  }

  // Check every ledger credit entry against gateway
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

  // Check for gateway charges with no ledger entry
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

export const runReconciliation = async (tenantId) => {
  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  logger.info({ runId, tenantId }, "reconciliation run started");

  let ledgerEntries = [];
  let gatewayCharges = [];
  let mismatches = [];
  let status = "completed";
  let error = null;

  try {
    [ledgerEntries, gatewayCharges] = await Promise.all([
      fetchLedgerJournal(tenantId),
      fetchGatewayCharges(),
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

  const run = {
    runId,
    tenantId,
    status,
    error: error ?? undefined,
    startedAt,
    completedAt: new Date().toISOString(),
    summary: {
      ledgerEntries: ledgerEntries.length,
      gatewayCharges: gatewayCharges.length,
      mismatches: mismatches.length,
    },
    mismatches,
  };

  runHistory.set(runId, run);

  logger.info(
    { runId, tenantId, mismatches: mismatches.length, status },
    "reconciliation run completed",
  );

  return run;
};

export const getRunHistory = () => {
  return Array.from(runHistory.values()).sort(
    (a, b) => new Date(b.startedAt) - new Date(a.startedAt),
  );
};

export const getMismatchesByRun = (runId) => {
  const run = runHistory.get(runId);
  return run ? run.mismatches : null;
};
