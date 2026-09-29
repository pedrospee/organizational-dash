CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`institution` text,
	`kind` text NOT NULL,
	`currency` text NOT NULL,
	`overdraft_limit_minor` integer,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
