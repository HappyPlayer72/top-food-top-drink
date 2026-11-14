CREATE TYPE "public"."quick_vote_kind" AS ENUM('safety', 'noise');--> statement-breakpoint
CREATE TABLE "venue_quick_votes" (
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "quick_vote_kind" NOT NULL,
	"value" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_quick_votes_venue_id_user_id_kind_pk" PRIMARY KEY("venue_id","user_id","kind"),
	CONSTRAINT "venue_quick_votes_value" CHECK ("venue_quick_votes"."value" between 1 and (case when "venue_quick_votes"."kind" = 'noise' then 4 else 5 end))
);
--> statement-breakpoint
ALTER TABLE "venue_quick_votes" ADD CONSTRAINT "venue_quick_votes_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_quick_votes" ADD CONSTRAINT "venue_quick_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;