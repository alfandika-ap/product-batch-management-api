ALTER TABLE `product_batches` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `products` ADD `deleted_at` timestamp;