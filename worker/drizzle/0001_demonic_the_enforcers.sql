CREATE TABLE `brew_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`recipe_id` integer NOT NULL,
	`brewed_at` integer NOT NULL,
	`rating` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brew_log_public_id_idx` ON `brew_log` (`public_id`);--> statement-breakpoint
CREATE INDEX `brew_log_recipeId_idx` ON `brew_log` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `pour_step` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`recipe_id` integer NOT NULL,
	`step_order` integer NOT NULL,
	`target_time_sec` integer NOT NULL,
	`cumulative_water_ml` real NOT NULL,
	`notes` text,
	`deleted_at` integer,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pour_step_public_id_idx` ON `pour_step` (`public_id`);--> statement-breakpoint
CREATE INDEX `pour_step_recipeId_idx` ON `pour_step` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipe` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`bean_origin` text,
	`dose_g` real NOT NULL,
	`water_ml` real NOT NULL,
	`water_temp_c` real NOT NULL,
	`grind_size` text,
	`total_time_sec` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_public_id_idx` ON `recipe` (`public_id`);--> statement-breakpoint
CREATE INDEX `recipe_userId_idx` ON `recipe` (`user_id`);