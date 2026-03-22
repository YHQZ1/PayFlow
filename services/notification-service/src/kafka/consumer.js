import { Kafka } from "kafkajs";
import { deliverWebhook } from "../utils/webhook.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });

const getWebhookUrls = async (tenantId) => {
  const response = await fetch(
    `${process.env.TENANT_SERVICE_URL}/tenants/${tenantId}/webhooks`,
  );
  if (!response.ok) return [];
  const webhooks = await response.json();
  return webhooks.filter((w) => w.active).map((w) => w.url);
};

export const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment.created", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      const { tenantId } = event;

      console.log(`received ${event.eventType} for tenant ${tenantId}`);

      const urls = await getWebhookUrls(tenantId);

      if (urls.length === 0) {
        console.log(`no webhook urls registered for tenant ${tenantId}`);
        return;
      }

      const payload = {
        eventId: event.eventId,
        eventType: event.eventType,
        createdAt: event.metadata.producedAt,
        data: event.payload,
      };

      for (const url of urls) {
        await deliverWebhook(url, payload);
      }
    },
  });

  console.log(
    "notification-service consumer started — listening on payment.created",
  );
};
