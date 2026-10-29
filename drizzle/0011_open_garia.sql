CREATE TABLE "whatsapp_verification_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"destination" varchar(20) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_verification_challenges" ADD CONSTRAINT "whatsapp_verification_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_verification_user_idx" ON "whatsapp_verification_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "whatsapp_verification_expiry_idx" ON "whatsapp_verification_challenges" USING btree ("expires_at");