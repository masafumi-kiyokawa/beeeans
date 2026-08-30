CREATE TABLE `bean` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`origin` text,
	`roaster` text,
	`roast_level` text,
	`roast_date` integer,
	`purchase_url` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bean_public_id_idx` ON `bean` (`public_id`);--> statement-breakpoint
CREATE INDEX `bean_userId_idx` ON `bean` (`user_id`);