CREATE TABLE `product_batches` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`batch_code` varchar(100) NOT NULL,
	`quantity` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`generate_product_items_status` enum('pending','completed','failed') DEFAULT 'pending',
	CONSTRAINT `product_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_batches_batch_code_unique` UNIQUE(`batch_code`)
);
--> statement-breakpoint
CREATE TABLE `product_items` (
	`id` varchar(36) NOT NULL,
	`batch_id` varchar(36) NOT NULL,
	`qr_code` varchar(255) NOT NULL,
	`serial_number` varchar(255) NOT NULL,
	`status` enum('unscanned','scanned','flagged') DEFAULT 'unscanned',
	`first_scan_at` timestamp,
	`scan_count` int DEFAULT 0,
	`item_order` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `product_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_items_qr_code_unique` UNIQUE(`qr_code`),
	CONSTRAINT `product_items_serial_number_unique` UNIQUE(`serial_number`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(255),
	`image_url` varchar(500),
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_logs` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`scanned_at` timestamp DEFAULT (now()),
	`location` varchar(255),
	`ip_address` varchar(45),
	`device_info` text,
	CONSTRAINT `scan_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `product_items` ADD CONSTRAINT `product_items_batch_id_product_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `product_batches`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `scan_logs` ADD CONSTRAINT `scan_logs_item_id_product_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `product_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `scan_logs` ADD CONSTRAINT `scan_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `product_idx` ON `product_batches` (`product_id`);--> statement-breakpoint
CREATE INDEX `batch_code_idx` ON `product_batches` (`batch_code`);--> statement-breakpoint
CREATE INDEX `batch_idx` ON `product_items` (`batch_id`);--> statement-breakpoint
CREATE INDEX `qr_code_idx` ON `product_items` (`qr_code`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `product_items` (`status`);--> statement-breakpoint
CREATE INDEX `item_idx` ON `scan_logs` (`item_id`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `scan_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `scanned_at_idx` ON `scan_logs` (`scanned_at`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);