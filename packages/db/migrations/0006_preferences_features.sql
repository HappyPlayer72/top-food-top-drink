CREATE TYPE "public"."declaration_value" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."feature_answer" AS ENUM('yes', 'no', 'not_observed');--> statement-breakpoint
CREATE TYPE "public"."interest" AS ENUM('accesibilitate', 'lucru', 'iesiri', 'mancare');--> statement-breakpoint
CREATE TABLE "review_answers" (
	"review_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"answer" "feature_answer" NOT NULL,
	CONSTRAINT "review_answers_review_id_question_key_pk" PRIMARY KEY("review_id","question_key")
);
--> statement-breakpoint
CREATE TABLE "venue_facility_declarations" (
	"venue_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"value" "declaration_value" NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_facility_declarations_venue_id_question_key_pk" PRIMARY KEY("venue_id","question_key")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "interests" "interest"[] DEFAULT '{}'::interest[] NOT NULL;--> statement-breakpoint
ALTER TABLE "review_answers" ADD CONSTRAINT "review_answers_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_facility_declarations" ADD CONSTRAINT "venue_facility_declarations_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_facility_declarations" ADD CONSTRAINT "venue_facility_declarations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_answers_question_key_index" ON "review_answers" USING btree ("question_key");