CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"provider_ref" varchar(255),
	"failure_code" varchar(100),
	"failure_message" varchar(500),
	"description" varchar(500),
	"metadata" jsonb,
	"scheduled_at" timestamp,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
