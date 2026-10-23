CREATE TABLE "whatsapp_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" text NOT NULL,
	"provider_message_id" text,
	"provider_status" varchar(30) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "whatsapp_webhook_events_event_key_unique" UNIQUE("event_key")
);
--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_pending_idx" ON "whatsapp_webhook_events" USING btree ("status","received_at");--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_message_idx" ON "whatsapp_webhook_events" USING btree ("provider_message_id");