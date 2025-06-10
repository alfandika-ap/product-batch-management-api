CREATE TABLE `product_batches` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`batch_code` varchar(100) NOT NULL,
	`quantity` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `product_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_batches_batch_code_unique` UNIQUE(`batch_code`)
);
--> statement-breakpoint
CREATE TABLE `product_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`batch_id` int NOT NULL,
	`qr_code` varchar(255) NOT NULL,
	`pin_code` varchar(6) NOT NULL,
	`status` enum('unscanned','scanned','flagged') DEFAULT 'unscanned',
	`first_scan_at` timestamp,
	`scan_count` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `product_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_items_qr_code_unique` UNIQUE(`qr_code`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(255),
	`image_url` varchar(500),
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`user_id` int,
	`scanned_at` timestamp DEFAULT (now()),
	`location` varchar(255),
	`ip_address` varchar(45),
	`device_info` text,
	CONSTRAINT `scan_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `product_idx` ON `product_batches` (`product_id`);--> statement-breakpoint
CREATE INDEX `batch_code_idx` ON `product_batches` (`batch_code`);--> statement-breakpoint
CREATE INDEX `batch_idx` ON `product_items` (`batch_id`);--> statement-breakpoint
CREATE INDEX `qr_code_idx` ON `product_items` (`qr_code`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `product_items` (`status`);--> statement-breakpoint
CREATE INDEX `item_idx` ON `scan_logs` (`item_id`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `scan_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `scanned_at_idx` ON `scan_logs` (`scanned_at`);