ALTER TABLE "api_keys" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD COLUMN "secret" varchar(255) NOT NULL;