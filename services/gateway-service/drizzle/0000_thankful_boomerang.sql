CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_ref" varchar(255) NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"payment_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(50) NOT NULL,
	"paid" boolean DEFAULT false,
	"failure_code" varchar(100),
	"failure_message" varchar(500),
	"balance_transaction" varchar(255),
	"metadata" jsonb,
	"description" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "charges_provider_ref_unique" UNIQUE("provider_ref"),
	CONSTRAINT "charges_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_ref" varchar(255) NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"charge_ref" varchar(255) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(50) NOT NULL,
	"reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_provider_ref_unique" UNIQUE("provider_ref"),
	CONSTRAINT "refunds_idempotency_key_unique" UNIQUE("idempotency_key")
);
