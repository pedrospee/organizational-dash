CREATE TABLE `exchange_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`base_currency` text NOT NULL,
	`quote_currency` text NOT NULL,
	`rate` text NOT NULL,
	`effective_date` text NOT NULL,
	`source` text NOT NULL,
	`recorded_at` text NOT NULL
);
