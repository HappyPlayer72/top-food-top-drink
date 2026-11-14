CREATE TABLE "tour_completions" (
	"user_id" uuid NOT NULL,
	"tour_slug" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"venue_ids" uuid[] NOT NULL,
	CONSTRAINT "tour_completions_user_id_tour_slug_pk" PRIMARY KEY("user_id","tour_slug")
);
--> statement-breakpoint
ALTER TABLE "tour_completions" ADD CONSTRAINT "tour_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;