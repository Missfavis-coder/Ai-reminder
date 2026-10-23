DROP INDEX "whatsapp_webhook_events_pending_idx";--> statement-breakpoint
ALTER TABLE "whatsapp_webhook_events" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_pending_idx" ON "whatsapp_webhook_events" USING btree ("status","next_attempt_at","received_at");