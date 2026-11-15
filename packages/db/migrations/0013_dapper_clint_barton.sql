ALTER TABLE "social_submissions" ADD COLUMN "discovered_via" text;--> statement-breakpoint
ALTER TABLE "social_submissions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "social_searched_at" timestamp with time zone;