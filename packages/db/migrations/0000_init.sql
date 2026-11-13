CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."author_type" AS ENUM('local', 'tourist', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."claim_method" AS ENUM('google_business', 'phone_code', 'cui');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."manager_role" AS ENUM('owner', 'manager');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."partnership_plan" AS ENUM('basic', 'highlight');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('menu', 'event', 'offer', 'news');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('review', 'venue', 'owner_claim', 'trap_appeal', 'user', 'post');--> statement-breakpoint
CREATE TYPE "public"."review_source" AS ENUM('native', 'google', 'tripadvisor', 'facebook', 'tiktok', 'instagram');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('published', 'flagged', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('tiktok', 'instagram', 'facebook', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'local', 'influencer', 'owner', 'employee', 'admin');--> statement-breakpoint
CREATE TYPE "public"."venue_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('gps', 'university_email', 'vouch');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."vertical" AS ENUM('food', 'drink');--> statement-breakpoint
CREATE TABLE "ad_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_slug" text NOT NULL,
	"vertical" "vertical" NOT NULL,
	"placement" text NOT NULL,
	"advertiser" text NOT NULL,
	"creative_url" text NOT NULL,
	"link_url" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"city_slug" text NOT NULL,
	"venue_id" uuid,
	"day" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"boundary" geometry(MultiPolygon, 4326),
	"neighborhoods" text[] DEFAULT '{}'::text[] NOT NULL,
	"local_average_prices" jsonb DEFAULT '{"food":{},"drink":{}}'::jsonb NOT NULL,
	"mean_score" jsonb DEFAULT '{"food":7,"drink":7}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"review_id" uuid,
	"user_id" uuid NOT NULL,
	"month" text NOT NULL,
	"friendliness" integer NOT NULL,
	"speed" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid,
	"first_name" text NOT NULL,
	"role" text NOT NULL,
	"photo_url" text,
	"accepted" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_slug" text NOT NULL,
	"vertical" "vertical" NOT NULL,
	"category" text NOT NULL,
	"month" text NOT NULL,
	"entries" jsonb NOT NULL,
	"awards" jsonb NOT NULL,
	"frozen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"city_slug" text NOT NULL,
	"method" "verification_method" NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"source" "review_source" NOT NULL,
	"external_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"name_similarity" real NOT NULL,
	"distance_m" real,
	"status" "match_status" DEFAULT 'pending' NOT NULL,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"method" "claim_method" NOT NULL,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"cui" text,
	"code_hash" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"plan" "partnership_plan" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"type" "post_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"photos" text[] DEFAULT '{}'::text[] NOT NULL,
	"event_at" timestamp with time zone,
	"publish_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "report_target" NOT NULL,
	"target_id" text NOT NULL,
	"reported_by" uuid,
	"reason" text NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"decision" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"source" "review_source" NOT NULL,
	"external_id" text,
	"author_id" uuid,
	"external_author" jsonb,
	"rating" real NOT NULL,
	"original_rating" real NOT NULL,
	"original_scale" integer DEFAULT 5 NOT NULL,
	"text" text,
	"language" text,
	"visited_at" date,
	"visit_weekend_night" boolean,
	"posted_at" timestamp with time zone NOT NULL,
	"served_by_employee_id" uuid,
	"author_type" "author_type" DEFAULT 'unknown' NOT NULL,
	"aspects" jsonb,
	"is_paid" boolean DEFAULT false NOT NULL,
	"verified_visit" boolean DEFAULT false NOT NULL,
	"fake_probability" real DEFAULT 0 NOT NULL,
	"fake_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weight" real,
	"embedding" vector(384),
	"analyzed_at" timestamp with time zone,
	"status" "review_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"submitted_by" uuid,
	"platform" "social_platform" NOT NULL,
	"url" text NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"analysis" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_submissions_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "tourist_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_slug" text NOT NULL,
	"name" text NOT NULL,
	"location" geometry(point, 4326) NOT NULL,
	"radius_m" integer DEFAULT 300 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_social_links" (
	"user_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"url" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"followers" integer,
	CONSTRAINT "user_social_links_user_id_platform_pk" PRIMARY KEY("user_id","platform")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"phone" text,
	"password_hash" text,
	"google_id" text,
	"roles" "user_role"[] DEFAULT '{user}'::user_role[] NOT NULL,
	"avatar_url" text,
	"local_city_slug" text,
	"local_neighborhood" text,
	"local_until" timestamp with time zone,
	"followers" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_googleId_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "venue_managers" (
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "manager_role" NOT NULL,
	CONSTRAINT "venue_managers_venue_id_user_id_pk" PRIMARY KEY("venue_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "venue_sources" (
	"venue_id" uuid NOT NULL,
	"source" "review_source" NOT NULL,
	"external_id" text NOT NULL,
	"raw_rating" real,
	"raw_review_count" integer,
	"url" text,
	"fetched_at" timestamp with time zone,
	CONSTRAINT "venue_sources_source_external_id_pk" PRIMARY KEY("source","external_id")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_slug" text NOT NULL,
	"vertical" "vertical" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"location" geometry(point, 4326) NOT NULL,
	"address" text,
	"neighborhood" text,
	"phone" text,
	"website" text,
	"price_level" integer,
	"price_min_lei" integer,
	"price_max_lei" integer,
	"drink_prices" jsonb,
	"opening_hours" jsonb,
	"status" "venue_status" DEFAULT 'active' NOT NULL,
	"honest_score" real,
	"locals_score" real,
	"tourists_score" real,
	"total_weight" real,
	"tourist_trap_index" integer,
	"score_explanation" jsonb,
	"score_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vibe_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid,
	"level" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouches" (
	"voucher_id" uuid NOT NULL,
	"vouchee_id" uuid NOT NULL,
	"city_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouches_voucher_id_vouchee_id_city_slug_pk" PRIMARY KEY("voucher_id","vouchee_id","city_slug")
);
--> statement-breakpoint
ALTER TABLE "ad_slots" ADD CONSTRAINT "ad_slots_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_ratings" ADD CONSTRAINT "employee_ratings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_ratings" ADD CONSTRAINT "employee_ratings_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_ratings" ADD CONSTRAINT "employee_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_verifications" ADD CONSTRAINT "local_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_verifications" ADD CONSTRAINT "local_verifications_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_claims" ADD CONSTRAINT "owner_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_claims" ADD CONSTRAINT "owner_claims_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_claims" ADD CONSTRAINT "owner_claims_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_served_by_employee_id_employees_id_fk" FOREIGN KEY ("served_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_submissions" ADD CONSTRAINT "social_submissions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_submissions" ADD CONSTRAINT "social_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourist_zones" ADD CONSTRAINT "tourist_zones_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_social_links" ADD CONSTRAINT "user_social_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_local_city_slug_cities_slug_fk" FOREIGN KEY ("local_city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_managers" ADD CONSTRAINT "venue_managers_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_managers" ADD CONSTRAINT "venue_managers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_sources" ADD CONSTRAINT "venue_sources_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_checks" ADD CONSTRAINT "vibe_checks_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_checks" ADD CONSTRAINT "vibe_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouches" ADD CONSTRAINT "vouches_voucher_id_users_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouches" ADD CONSTRAINT "vouches_vouchee_id_users_id_fk" FOREIGN KEY ("vouchee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouches" ADD CONSTRAINT "vouches_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_user_id_city_slug_day_venue_id_index" ON "checkins" USING btree ("user_id","city_slug","day","venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_ratings_employee_id_user_id_month_index" ON "employee_ratings" USING btree ("employee_id","user_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_snapshots_city_slug_vertical_category_month_index" ON "leaderboard_snapshots" USING btree ("city_slug","vertical","category","month");--> statement-breakpoint
CREATE INDEX "posts_venue_id_publish_at_index" ON "posts" USING btree ("venue_id","publish_at");--> statement-breakpoint
CREATE INDEX "posts_event_at_index" ON "posts" USING btree ("event_at");--> statement-breakpoint
CREATE INDEX "reports_status_created_at_index" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_source_external_id_index" ON "reviews" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "reviews_venue_id_posted_at_index" ON "reviews" USING btree ("venue_id","posted_at");--> statement-breakpoint
CREATE INDEX "reviews_author_id_index" ON "reviews" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "tourist_zones_location_index" ON "tourist_zones" USING gist ("location");--> statement-breakpoint
CREATE INDEX "venue_sources_venue_id_index" ON "venue_sources" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_city_slug_vertical_slug_index" ON "venues" USING btree ("city_slug","vertical","slug");--> statement-breakpoint
CREATE INDEX "venues_location_index" ON "venues" USING gist ("location");--> statement-breakpoint
CREATE INDEX "venues_city_slug_vertical_honest_score_index" ON "venues" USING btree ("city_slug","vertical","honest_score");--> statement-breakpoint
CREATE INDEX "vibe_checks_venue_id_expires_at_index" ON "vibe_checks" USING btree ("venue_id","expires_at");