CREATE TYPE "public"."visit_proof_method" AS ENUM('gps', 'receipt');--> statement-breakpoint
CREATE TABLE "visit_proofs" (
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
ALTER TABLE "reviews" ADD COLUMN "verified_via" "visit_proof_method";--> statement-breakpoint
ALTER TABLE "visit_proofs" ADD CONSTRAINT "visit_proofs_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_proofs" ADD CONSTRAINT "visit_proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_proofs" ADD CONSTRAINT "visit_proofs_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_proofs" ADD CONSTRAINT "visit_proofs_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "visit_proofs_image_hash_index" ON "visit_proofs" USING btree ("image_hash");--> statement-breakpoint
CREATE INDEX "visit_proofs_status_created_at_index" ON "visit_proofs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "visit_proofs_review_id_index" ON "visit_proofs" USING btree ("review_id");--> statement-breakpoint
-- Review-urile deja verificate (din seed / check-in) au fost verificate prin GPS.
UPDATE "reviews" SET "verified_via" = 'gps' WHERE "verified_visit" AND "verified_via" IS NULL;
