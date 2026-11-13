ALTER TYPE "public"."venue_status" ADD VALUE 'pending';--> statement-breakpoint
CREATE TABLE "loyalty_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stamps" integer DEFAULT 0 NOT NULL,
	"redeemed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"created_by" uuid NOT NULL,
	"custom_name" text,
	"reward_title" text NOT NULL,
	"stamps_required" integer NOT NULL,
	"icon" text DEFAULT 'heart' NOT NULL,
	"accent_color" text,
	"stamp_secret" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_stamps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"day" date NOT NULL,
	"kind" text DEFAULT 'stamp' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_lei" integer,
	"description" text,
	"must_order" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_votes" (
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_votes_review_id_user_id_pk" PRIMARY KEY("review_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "added_by" uuid;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "photos" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "editorial_headline" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "editorial_writeup" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "occasion_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "drink_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "aspect_scores" jsonb;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_stamps" ADD CONSTRAINT "loyalty_stamps_card_id_loyalty_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."loyalty_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_cards_program_id_user_id_index" ON "loyalty_cards" USING btree ("program_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_stamps_card_id_day_kind_index" ON "loyalty_stamps" USING btree ("card_id","day","kind");--> statement-breakpoint
CREATE INDEX "menu_items_venue_id_position_index" ON "menu_items" USING btree ("venue_id","position");