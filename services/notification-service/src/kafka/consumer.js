import { Kafka } from "kafkajs";
import { eq } from "drizzle-orm"; // Add this import
import { deliverWebhook } from "../utils/webhook.js";
import { db } from "../db/index.js";
import { webhookDeliveries, webhookAttempts } from "../db/schema.js";
import { redis } from "../redis.js";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });
const dlqProducer = kafka.producer();

const publishToDLQ = async (event, reason, deliveryId) => {
  try {
    await dlqProducer.send({
      topic: "webhook.dlq",
      messages: [
        {
          key: event.tenantId,
          value: JSON.stringify({
            originalEvent: event,
            deliveryId,
            failureReason: reason,
            failedAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.warn(
      { tenantId: event.tenantId, eventId: event.eventId, deliveryId },
      "event sent to DLQ",
    );
  } catch (err) {
    logger.error({ err }, "failed to publish to DLQ");
  }
};

const getWebhooks = async (tenantId) => {
  const cacheKey = `webhooks:${tenantId}`;
  let webhooks = await redis.get(cacheKey);

  if (!webhooks) {
    try {
      const response = await fetch(
        `${process.env.TENANT_SERVICE_URL}/tenants/${tenantId}/webhooks`,
      );
      if (!response.ok) return [];
      const data = await response.json();
      webhooks = data.filter((w) => w.active);
      await redis.set(cacheKey, JSON.stringify(webhooks), "EX", 300);
    } catch (err) {
      logger.error({ err, tenantId }, "failed to fetch webhooks");
      return [];
    }
  } else {
    webhooks = JSON.parse(webhooks);
  }

  return webhooks;
};

const logDelivery = async (event, url, secret, deliveryId) => {
  // Update delivery record
  await db
    .update(webhookDeliveries)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, deliveryId)); // Now eq is imported
};

export const startConsumer = async () => {
  await dlqProducer.connect();
  await consumer.connect();

  await consumer.subscribe({
    topics: [
      "payment.created",
      "payment.failed",
      "payment.refunded",
      "fraud.flagged",
    ],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      let deliveryId = null;

      try {
        const event = JSON.parse(message.value.toString());
        const { tenantId, eventId, eventType } = event;
        const payload = {
          eventId,
          eventType,
          createdAt: event.metadata?.producedAt || new Date().toISOString(),
          data: event.payload,
        };

        logger.info(
          { tenantId, eventId, eventType },
          "processing webhook delivery",
        );

        const webhooks = await getWebhooks(tenantId);

        if (webhooks.length === 0) {
          logger.info({ tenantId }, "no active webhook URLs registered");
          return;
        }

        for (const webhook of webhooks) {
          const [delivery] = await db
            .insert(webhookDeliveries)
            .values({
              eventId,
              eventType,
              tenantId,
              url: webhook.url,
              status: "pending",
            })
            .returning();

          deliveryId = delivery.id;

          const result = await deliverWebhook(
            webhook.url,
            payload,
            webhook.secret,
          );

          if (result.success) {
            await db
              .update(webhookDeliveries)
              .set({
                status: "delivered",
                responseStatus: result.status,
                attemptCount: result.attempt,
                deliveredAt: new Date(),
              })
              .where(eq(webhookDeliveries.id, deliveryId)); // eq used here

            await db.insert(webhookAttempts).values({
              deliveryId,
              attemptNumber: result.attempt,
              status: "delivered",
              responseStatus: result.status,
              durationMs: result.duration,
            });
          } else {
            await db
              .update(webhookDeliveries)
              .set({
                status: "failed",
                attemptCount: 5,
              })
              .where(eq(webhookDeliveries.id, deliveryId)); // eq used here

            await publishToDLQ(
              event,
              `webhook failed after retries — ${webhook.url}`,
              deliveryId,
            );
          }
        }
      } catch (err) {
        logger.error({ err, deliveryId }, "failed to process webhook delivery");

        if (deliveryId) {
          await db
            .update(webhookDeliveries)
            .set({
              status: "failed",
            })
            .where(eq(webhookDeliveries.id, deliveryId)); // eq used here
        }
      }
    },
  });

  logger.info("notification-service consumer started");
};

const shutdown = async () => {
  logger.info("shutting down notification-service");
  await consumer.disconnect();
  await dlqProducer.disconnect();
  await redis.quit();
  await db.$client?.end();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
