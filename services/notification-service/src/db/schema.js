import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: varchar("event_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  tenantId: uuid("tenant_id").notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  responseStatus: integer("response_status"),
  responseBody: varchar("response_body", { length: 1000 }),
  attemptCount: integer("attempt_count").default(0),
  nextRetryAt: timestamp("next_retry_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookAttempts = pgTable("webhook_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryId: uuid("delivery_id")
    .notNull()
    .references(() => webhookDeliveries.id),
  attemptNumber: integer("attempt_number").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  responseStatus: integer("response_status"),
  responseBody: varchar("response_body", { length: 1000 }),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
