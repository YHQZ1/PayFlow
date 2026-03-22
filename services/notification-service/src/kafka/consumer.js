import { Kafka } from "kafkajs";
import { deliverWebhook } from "../utils/webhook.js";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });
const dlqProducer = kafka.producer();

const publishToDLQ = async (event, reason) => {
  try {
    await dlqProducer.send({
      topic: "webhook.dlq",
      messages: [
        {
          key: event.tenantId,
          value: JSON.stringify({
            originalEvent: event,
            failureReason: reason,
            failedAt: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.warn(
      { tenantId: event.tenantId, eventId: event.eventId },
      "event sent to DLQ",
    );
  } catch (err) {
    logger.error({ err }, "failed to publish to DLQ");
  }
};

const getWebhookUrls = async (tenantId) => {
  try {
    const response = await fetch(
      `${process.env.TENANT_SERVICE_URL}/tenants/${tenantId}/webhooks`,
    );
    if (!response.ok) return [];
    const webhooks = await response.json();
    return webhooks.filter((w) => w.active).map((w) => w.url);
  } catch (err) {
    logger.error({ err, tenantId }, "failed to fetch webhook URLs");
    return [];
  }
};

export const startConsumer = async () => {
  await dlqProducer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: "payment.created", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      const { tenantId, eventId, eventType } = event;

      logger.info(
        { tenantId, eventId, eventType },
        "processing webhook delivery",
      );

      const urls = await getWebhookUrls(tenantId);

      if (urls.length === 0) {
        logger.info({ tenantId }, "no active webhook URLs registered");
        return;
      }

      const payload = {
        eventId,
        eventType,
        createdAt: event.metadata.producedAt,
        data: event.payload,
      };

      for (const url of urls) {
        const result = await deliverWebhook(url, payload);
        if (!result.success) {
          await publishToDLQ(
            event,
            `webhook delivery failed after retries — ${url}`,
          );
        }
      }
    },
  });

  logger.info("notification-service consumer started");
};
