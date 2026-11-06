CREATE TABLE "in_app_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(250) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(30) DEFAULT 'Reminder' NOT NULL,
	"icon" varchar(30) DEFAULT 'reminder' NOT NULL,
	"action_label" varchar(100),
	"action_href" varchar(500),
	"source_key" varchar(300),
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "in_app_notifications_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "in_app_notifications_user_created_idx" ON "in_app_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "in_app_notifications_user_read_idx" ON "in_app_notifications" USING btree ("user_id","read_at");