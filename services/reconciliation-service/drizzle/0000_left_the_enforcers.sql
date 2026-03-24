CREATE TABLE "reconciliation_mismatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"payment_id" uuid,
	"ledger_amount" integer,
	"gateway_amount" integer,
	"gateway_status" varchar(50),
	"description" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar(255) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" varchar(50) NOT NULL,
	"error" varchar(500),
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp NOT NULL,
	"summary" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reconciliation_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
ALTER TABLE "reconciliation_mismatches" ADD CONSTRAINT "reconciliation_mismatches_run_id_reconciliation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."reconciliation_runs"("id") ON DELETE no action ON UPDATE no action;