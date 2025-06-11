ALTER TABLE `product_items` ADD `serial_number` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `product_items` ADD CONSTRAINT `product_items_serial_number_unique` UNIQUE(`serial_number`);