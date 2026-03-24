import { db } from "../db/index.js";
import { journalEntries, balances, balanceHistory } from "../db/schema.js";
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
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, tenantId))
      .orderBy(desc(journalEntries.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(journalEntries)
      .where(eq(journalEntries.tenantId, tenantId)),
  ]);
  return {
    data: rows,
    total: Number(total[0].count),
    limit,
    offset,
    hasMore: offset + limit < Number(total[0].count),
  };
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
  await db.transaction(async (tx) => {
    await tx.insert(journalEntries).values([
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

    const [existing] = await tx
      .select()
      .from(balances)
      .where(eq(balances.tenantId, tenantId));

    const previousAmount = existing?.amount || 0;
    const newAmount = previousAmount + amount;

    if (existing) {
      await tx
        .update(balances)
        .set({ amount: newAmount, updatedAt: new Date() })
        .where(eq(balances.tenantId, tenantId));
    } else {
      await tx.insert(balances).values({ tenantId, amount, currency });
    }

    await tx.insert(balanceHistory).values({
      tenantId,
      paymentId,
      previousAmount,
      newAmount,
      delta: amount,
    });
  });
};

export const writeRefundEntries = async ({
  paymentId,
  tenantId,
  amount,
  currency,
}) => {
  await db.transaction(async (tx) => {
    await tx.insert(journalEntries).values([
      {
        paymentId,
        tenantId,
        entryType: "credit",
        account: "accounts_receivable",
        amount,
        currency,
      },
      {
        paymentId,
        tenantId,
        entryType: "debit",
        account: "revenue",
        amount,
        currency,
      },
    ]);

    const [existing] = await tx
      .select()
      .from(balances)
      .where(eq(balances.tenantId, tenantId));

    if (!existing) {
      throw new Error("Cannot refund: no balance found for tenant");
    }

    const previousAmount = existing.amount;
    const newAmount = previousAmount - amount;

    await tx
      .update(balances)
      .set({ amount: newAmount, updatedAt: new Date() })
      .where(eq(balances.tenantId, tenantId));

    await tx.insert(balanceHistory).values({
      tenantId,
      paymentId,
      previousAmount,
      newAmount,
      delta: -amount,
    });
  });
};
