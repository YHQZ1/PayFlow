import { db } from "../db/index.js";
import { journalEntries, balances } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

export const checkHealth = async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return {
      status: "ok",
      service: "ledger-service",
      timestamp: new Date().toISOString(),
      checks: { database: "ok" },
    };
  } catch {
    return {
      status: "degraded",
      service: "ledger-service",
      timestamp: new Date().toISOString(),
      checks: { database: "error" },
    };
  }
};

export const getBalance = async (tenantId) => {
  const [balance] = await db
    .select()
    .from(balances)
    .where(eq(balances.tenantId, tenantId));
  return balance ?? { tenantId, amount: 0, currency: "INR" };
};

export const getJournal = async (tenantId, { limit = 20, offset = 0 } = {}) => {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.tenantId, tenantId))
    .orderBy(desc(journalEntries.createdAt))
    .limit(limit)
    .offset(offset);
  return { data: rows, limit, offset };
};

export const getJournalByPayment = async (tenantId, paymentId) => {
  return db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.paymentId, paymentId))
    .orderBy(journalEntries.entryType);
};

export const writeJournalEntries = async ({
  paymentId,
  tenantId,
  amount,
  currency,
}) => {
  await db.insert(journalEntries).values([
    {
      paymentId,
      tenantId,
      entryType: "debit",
      account: "accounts_receivable",
      amount,
      currency,
    },
    {
      paymentId,
      tenantId,
      entryType: "credit",
      account: "revenue",
      amount,
      currency,
    },
  ]);

  const [existing] = await db
    .select()
    .from(balances)
    .where(eq(balances.tenantId, tenantId));

  if (existing) {
    await db
      .update(balances)
      .set({ amount: existing.amount + amount, updatedAt: new Date() })
      .where(eq(balances.tenantId, tenantId));
  } else {
    await db.insert(balances).values({ tenantId, amount, currency });
  }
};
