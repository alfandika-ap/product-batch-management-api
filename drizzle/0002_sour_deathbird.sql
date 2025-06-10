ALTER TABLE `users` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `product_batches` ADD `generate_product_items_status` enum('pending','completed','failed') DEFAULT 'pending';--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `product_items` DROP COLUMN `pin_code`;