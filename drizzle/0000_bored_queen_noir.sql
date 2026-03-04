CREATE TABLE `analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`signal_id` integer NOT NULL,
	`summary` text NOT NULL,
	`confidence` real NOT NULL,
	`escalation_probability` real,
	`market_impact` text NOT NULL,
	`trade_recommendations` text NOT NULL,
	`reasoning` text NOT NULL,
	`hebrew_calendar_analysis` text,
	`celestial_analysis` text,
	`historical_parallels` text,
	`risk_factors` text,
	`model_used` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`signal_id`) REFERENCES `signals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `portfolio_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`total_value` real NOT NULL,
	`cash` real NOT NULL,
	`invested` real NOT NULL,
	`pnl` real NOT NULL,
	`pnl_percent` real NOT NULL,
	`positions` text NOT NULL,
	`environment` text DEFAULT 'demo' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`signal_id` integer,
	`analysis_id` integer,
	`claim` text NOT NULL,
	`timeframe` text NOT NULL,
	`deadline` text NOT NULL,
	`confidence` real NOT NULL,
	`category` text NOT NULL,
	`metrics` text,
	`outcome` text,
	`outcome_notes` text,
	`score` real,
	`resolved_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`signal_id`) REFERENCES `signals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`analysis_id`) REFERENCES `analyses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`date` text NOT NULL,
	`end_date` text,
	`intensity` integer NOT NULL,
	`category` text NOT NULL,
	`celestial_type` text,
	`hebrew_date` text,
	`hebrew_holiday` text,
	`geopolitical_context` text,
	`layers` text NOT NULL,
	`market_sectors` text,
	`historical_precedent` text,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`signal_id` integer,
	`prediction_id` integer,
	`ticker` text NOT NULL,
	`direction` text NOT NULL,
	`order_type` text NOT NULL,
	`quantity` real NOT NULL,
	`limit_price` real,
	`stop_price` real,
	`filled_price` real,
	`t212_order_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`environment` text DEFAULT 'demo' NOT NULL,
	`dedupe_hash` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`signal_id`) REFERENCES `signals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prediction_id`) REFERENCES `predictions`(`id`) ON UPDATE no action ON DELETE no action
);
