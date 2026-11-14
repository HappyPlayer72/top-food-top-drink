-- serban: saved_venues, venue_views_daily, venue_score_snapshots, moderation_decisions (create până acum doar
--   la runtime de ensureExtendedSchema, src/ensure.ts).
-- oli: vizită verificată (visit_proofs, reviews.verified_via) și anti-bot (review_submissions, reviews.bot_cleared),
--   renumerotate după 0008 (erau 0004_visit_proofs și 0005_anti_bot pe branch-ul oli).
-- Idempotentă: merge și pe o bază unde ensureExtendedSchema a creat deja tabelele.
DO $$ BEGIN
 CREATE TYPE "public"."visit_proof_method" AS ENUM('gps', 'receipt');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"decision" text NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_submissions" (
	"review_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"client_hash" text,
	"fill_ms" integer,
	"account_age_sec" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_venues" (
	"user_id" uuid NOT NULL,
	"venue_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_venues_user_id_venue_slug_pk" PRIMARY KEY("user_id","venue_slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_score_snapshots" (
	"venue_id" uuid NOT NULL,
	"day" date NOT NULL,
	"score" real NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "venue_score_snapshots_venue_id_day_pk" PRIMARY KEY("venue_id","day")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_views_daily" (
	"venue_id" uuid NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "venue_views_daily_venue_id_day_pk" PRIMARY KEY("venue_id","day")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visit_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"method" "visit_proof_method" DEFAULT 'receipt' NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"image" "bytea",
	"image_type" text,
	"image_hash" text NOT NULL,
	"decision" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "verified_via" "visit_proof_method";--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "bot_cleared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_venues" ADD CONSTRAINT "saved_venues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_score_snapshots" ADD CONSTRAINT "venue_score_snapshots_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_views_daily" ADD CONSTRAINT "venue_views_daily_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_proofs" ADD CONSTRAINT "visit_proofs_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_proofs" ADD CONSTRAINT "visit_proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_proofs" ADD CONSTRAINT "visit_proofs_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_proofs" ADD CONSTRAINT "visit_proofs_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_decisions_target_type_target_id_index" ON "moderation_decisions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_submissions_client_hash_created_at_index" ON "review_submissions" USING btree ("client_hash","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_submissions_user_id_created_at_index" ON "review_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_submissions_created_at_index" ON "review_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "visit_proofs_image_hash_index" ON "visit_proofs" USING btree ("image_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_proofs_status_created_at_index" ON "visit_proofs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visit_proofs_review_id_index" ON "visit_proofs" USING btree ("review_id");--> statement-breakpoint
-- Review-urile deja verificate (din seed / check-in) au fost verificate prin GPS.
UPDATE "reviews" SET "verified_via" = 'gps' WHERE "verified_visit" AND "verified_via" IS NULL;
