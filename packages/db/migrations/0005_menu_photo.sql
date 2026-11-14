ALTER TABLE "menu_items" ADD COLUMN "photo" text;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_photo_size" CHECK (length("menu_items"."photo") <= 40000);