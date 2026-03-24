import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const charges = pgTable("charges", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerRef: varchar("provider_ref", { length: 255 }).notNull().unique(),
  idempotencyKey: varchar("idempotency_key", { length: 255 })
    .notNull()
    .unique(),
  paymentId: uuid("payment_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  paid: boolean("paid").default(false),
  failureCode: varchar("failure_code", { length: 100 }),
  failureMessage: varchar("failure_message", { length: 500 }),
  balanceTransaction: varchar("balance_transaction", { length: 255 }),
  metadata: jsonb("metadata"),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerRef: varchar("provider_ref", { length: 255 }).notNull().unique(),
  idempotencyKey: varchar("idempotency_key", { length: 255 })
    .notNull()
    .unique(),
  chargeRef: varchar("charge_ref", { length: 255 }).notNull(),
  tenantId: uuid("tenant_id").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
