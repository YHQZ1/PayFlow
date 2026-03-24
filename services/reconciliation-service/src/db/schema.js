import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

export const reconciliationRuns = pgTable("reconciliation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: varchar("run_id", { length: 255 }).notNull().unique(),
  tenantId: uuid("tenant_id").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  error: varchar("error", { length: 500 }),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  summary: jsonb("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reconciliationMismatches = pgTable("reconciliation_mismatches", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => reconciliationRuns.id),
  tenantId: uuid("tenant_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  paymentId: uuid("payment_id"),
  ledgerAmount: integer("ledger_amount"),
  gatewayAmount: integer("gateway_amount"),
  gatewayStatus: varchar("gateway_status", { length: 50 }),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
