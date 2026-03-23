import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  providerRef: varchar("provider_ref", { length: 255 }),
  failureCode: varchar("failure_code", { length: 100 }),
  failureMessage: varchar("failure_message", { length: 500 }),
  description: varchar("description", { length: 500 }),
  metadata: jsonb("metadata"),
  scheduledAt: timestamp("scheduled_at"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
