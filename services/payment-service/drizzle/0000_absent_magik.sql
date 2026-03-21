CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"description" varchar(500),
	"provider_ref" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
