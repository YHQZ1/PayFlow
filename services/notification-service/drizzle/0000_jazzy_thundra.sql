CREATE TABLE "webhook_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"response_status" integer,
	"response_body" varchar(1000),
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"response_status" integer,
	"response_body" varchar(1000),
	"attempt_count" integer DEFAULT 0,
	"next_retry_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_attempts" ADD CONSTRAINT "webhook_attempts_delivery_id_webhook_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."webhook_deliveries"("id") ON DELETE no action ON UPDATE no action;