import cron from "node-cron";
import { db } from "../db/index.js";
import { outbox } from "../db/schema.js";
import { eq, isNull } from "drizzle-orm";
import { publishEvent } from "../kafka/producer.js";
import { logger } from "../logger.js";

const BATCH_SIZE = parseInt(process.env.OUTBOX_BATCH_SIZE) || 100;

const processOutbox = async () => {
  try {
    const messages = await db
      .select()
      .from(outbox)
      .where(isNull(outbox.processedAt))
      .limit(BATCH_SIZE);

    if (messages.length === 0) {
      return;
    }

    logger.info({ count: messages.length }, "processing outbox messages");

    for (const message of messages) {
      try {
        await publishEvent(message.topic, message.payload);

        await db
          .update(outbox)
          .set({ processedAt: new Date() })
          .where(eq(outbox.id, message.id));

        logger.debug(
          { id: message.id, topic: message.topic },
          "outbox message processed",
        );
      } catch (err) {
        logger.error(
          { err, id: message.id, topic: message.topic },
          "failed to process outbox message",
        );
      }
    }

    logger.info({ processed: messages.length }, "outbox batch completed");
  } catch (err) {
    logger.error({ err }, "outbox processor failed");
  }
};

// Run every 5 seconds (matching your pattern - but note: other services use hours/minutes)
// For outbox, we need frequent processing. Adjust interval as needed.
cron.schedule("*/5 * * * * *", async () => {
  logger.debug("outbox processor cron job started");
  await processOutbox();
});

logger.info("outbox processor scheduled (every 5 seconds)");
