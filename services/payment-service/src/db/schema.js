import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 })
    .notNull()
    .unique(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  description: varchar("description", { length: 500 }),
  providerRef: varchar("provider_ref", { length: 255 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
