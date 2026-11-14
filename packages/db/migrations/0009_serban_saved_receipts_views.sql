-- Tabelele și coloanele lui serban, create până acum doar la runtime de ensureExtendedSchema (src/ensure.ts).
-- Idempotentă: merge și pe o bază unde ensureExtendedSchema a rulat deja.
CREATE TABLE IF NOT EXISTS "moderation_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"decision" text NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "receipt_photo_url" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "receipt_status" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "moderation_decisions_target_type_target_id_index" ON "moderation_decisions" USING btree ("target_type","target_id");