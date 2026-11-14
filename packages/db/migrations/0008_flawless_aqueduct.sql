CREATE TABLE "outing_poll_votes" (
	"poll_token" text NOT NULL,
	"voter_hash" text NOT NULL,
	"venue_slug" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outing_poll_votes_poll_token_voter_hash_pk" PRIMARY KEY("poll_token","voter_hash")
);
--> statement-breakpoint
CREATE TABLE "outing_polls" (
	"token" text PRIMARY KEY NOT NULL,
	"venue_slugs" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outing_poll_votes" ADD CONSTRAINT "outing_poll_votes_poll_token_outing_polls_token_fk" FOREIGN KEY ("poll_token") REFERENCES "public"."outing_polls"("token") ON DELETE cascade ON UPDATE no action;