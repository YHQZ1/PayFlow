CREATE TABLE "balance_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"previous_amount" integer NOT NULL,
	"new_amount" integer NOT NULL,
	"delta" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_payment_id_entry_type_unique" UNIQUE("payment_id","entry_type");