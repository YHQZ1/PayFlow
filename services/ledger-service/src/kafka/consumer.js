import { Kafka } from "kafkajs";
import { db } from "../db/index.js";
import { journalEntries, balances } from "../db/schema.js";
import { eq } from "drizzle-orm";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "ledger-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });

const writeJournalEntries = async ({
  paymentId,
  tenantId,
  amount,
  currency,
}) => {
  // always write two entries — debit and credit
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

  // update running balance for this tenant
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

  console.log(
    `journal entries written for payment ${paymentId} — debit + credit ₹${amount}`,
  );
};

export const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment.created", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());

      const { paymentId, amount, currency, status } = event.payload;
      const { tenantId } = event;

      // only write ledger entries for succeeded payments
      if (status !== "succeeded") {
        console.log(`skipping payment ${paymentId} — status: ${status}`);
        return;
      }

      await writeJournalEntries({ paymentId, tenantId, amount, currency });
    },
  });

  console.log("ledger-service consumer started — listening on payment.created");
};
