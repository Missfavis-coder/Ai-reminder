CREATE TABLE "extension_auth_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"device_name" varchar(200) DEFAULT 'VS Code' NOT NULL,
	"code_challenge" text NOT NULL,
	"poll_token_hash" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"authorization_code_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"exchanged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extension_tokens" ADD COLUMN "device_id" varchar(200);--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "monitoring_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "extension_auth_requests" ADD CONSTRAINT "extension_auth_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extension_auth_requests_user_id_idx" ON "extension_auth_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "extension_auth_requests_expires_at_idx" ON "extension_auth_requests" USING btree ("expires_at");