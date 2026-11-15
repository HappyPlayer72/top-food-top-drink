-- Voturile lunare pe categorii (PR #21). Idempotent: ensureExtendedSchema poate crea deja tabelul la rulare.
CREATE TABLE IF NOT EXISTS "monthly_category_votes" (
	"month" text NOT NULL,
	"vertical" "vertical" NOT NULL,
	"category_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_slug" text NOT NULL,
	"venue_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_category_votes_month_vertical_category_id_user_id_pk" PRIMARY KEY("month","vertical","category_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "monthly_category_votes" ADD CONSTRAINT "monthly_category_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
