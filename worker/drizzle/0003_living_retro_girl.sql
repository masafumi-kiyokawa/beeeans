ALTER TABLE `recipe` ADD `bean_id` integer REFERENCES bean(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `recipe_beanId_idx` ON `recipe` (`bean_id`);