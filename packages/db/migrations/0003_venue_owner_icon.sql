ALTER TABLE "venues" ADD COLUMN "owner_icon_symbol" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "owner_icon_color" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "owner_icon_image" text;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_icon_image_size" CHECK (length("venues"."owner_icon_image") <= 30000);