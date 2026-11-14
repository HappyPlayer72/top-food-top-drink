ALTER TABLE "menu_items" ADD COLUMN "category" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Meniul are acum secțiunea lui; postările vechi de tip „menu” rămân în blog ca noutăți.
UPDATE "posts" SET "type" = 'news' WHERE "type" = 'menu';
