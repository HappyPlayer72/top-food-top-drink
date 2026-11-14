CREATE TABLE "review_submissions" (
	"review_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"client_hash" text,
	"fill_ms" integer,
	"account_age_sec" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "bot_cleared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_submissions_client_hash_created_at_index" ON "review_submissions" USING btree ("client_hash","created_at");--> statement-breakpoint
CREATE INDEX "review_submissions_user_id_created_at_index" ON "review_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "review_submissions_created_at_index" ON "review_submissions" USING btree ("created_at");