import cron from "node-cron";
import { createPayout } from "../services/payout.service.js";
import { db } from "../db/index.js";
import { payouts } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../logger.js";

// Process scheduled payouts every hour
cron.schedule("0 * * * *", async () => {
  logger.info("scheduled payout processor started");

  try {
    const now = new Date();
    const pendingScheduled = await db
      .select()
      .from(payouts)
      .where(
        and(
          eq(payouts.status, "pending"),
          sql`${payouts.scheduledAt} <= ${now.toISOString()}`,
        ),
      );

    logger.info(
      { count: pendingScheduled.length },
      "found scheduled payouts to process",
    );

    for (const payout of pendingScheduled) {
      try {
        await createPayout({
          tenantId: payout.tenantId,
          amount: payout.amount,
          currency: payout.currency,
          description: payout.description,
          metadata: payout.metadata,
        });
        logger.info({ payoutId: payout.id }, "scheduled payout processed");
      } catch (err) {
        logger.error(
          { err, payoutId: payout.id },
          "failed to process scheduled payout",
        );
      }
    }

    logger.info("scheduled payout processor completed");
  } catch (err) {
    logger.error({ err }, "scheduled payout processor failed");
  }
});
