CREATE TYPE "public"."activity_event_type" AS ENUM('workspace_focused', 'workspace_blurred', 'editor_changed', 'heartbeat', 'workspace_stopped', 'idle_started', 'idle_ended');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_channel_type" AS ENUM('whatsapp', 'instagram', 'web_push', 'desktop', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_job_status" AS ENUM('pending', 'processing', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reminder_rule_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."reminder_rule_type" AS ENUM('active_work', 'inactivity', 'deadline', 'fixed_time');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'idle', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."workspace_provider" AS ENUM('vscode', 'desktop', 'browser');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('connected', 'disconnected');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_type" "activity_event_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "activity_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "notification_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_channel_type" NOT NULL,
	"destination" varchar(320) NOT NULL,
	"consent_granted_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" varchar(300),
	"error_message" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"rule_id" uuid,
	"channel_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "notification_job_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" varchar(300) NOT NULL,
	"processing_started_at" timestamp with time zone,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "reminder_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" "reminder_rule_type" NOT NULL,
	"config" jsonb NOT NULL,
	"status" "reminder_rule_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"email" varchar(320) NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone,
	"idle_since_at" timestamp with time zone,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "workspace_provider" NOT NULL,
	"name" varchar(200) NOT NULL,
	"device_id" varchar(200),
	"status" "workspace_status" DEFAULT 'connected' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_job_id_notification_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."notification_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_rule_id_reminder_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."reminder_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_channel_id_notification_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_rules" ADD CONSTRAINT "reminder_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_sessions" ADD CONSTRAINT "workspace_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_sessions" ADD CONSTRAINT "workspace_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_user_time_idx" ON "activity_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activity_events_workspace_time_idx" ON "activity_events" USING btree ("workspace_id","occurred_at");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notification_channels_user_idx" ON "notification_channels" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_job_idx" ON "notification_deliveries" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "notification_jobs_due_idx" ON "notification_jobs" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "notification_jobs_user_idx" ON "notification_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reminder_rules_user_status_idx" ON "reminder_rules" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "reminder_rules_type_idx" ON "reminder_rules" USING btree ("type");--> statement-breakpoint
CREATE INDEX "sessions_user_status_idx" ON "workspace_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "sessions_workspace_status_idx" ON "workspace_sessions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "workspaces_user_id_idx" ON "workspaces" USING btree ("user_id");