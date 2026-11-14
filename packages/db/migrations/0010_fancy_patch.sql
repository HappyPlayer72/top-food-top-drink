CREATE TABLE "google_api_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"place_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_api_calls" ADD CONSTRAINT "google_api_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "google_api_calls_user_id_created_at_index" ON "google_api_calls" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "google_api_calls_created_at_index" ON "google_api_calls" USING btree ("created_at");