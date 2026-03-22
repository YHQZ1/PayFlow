import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  entryType: varchar("entry_type", { length: 10 }).notNull(),
  account: varchar("account", { length: 100 }).notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const balances = pgTable("balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().unique(),
  amount: integer("amount").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
