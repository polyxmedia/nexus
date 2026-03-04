CREATE TABLE `game_theory_scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scenario_id` text NOT NULL,
	`title` text NOT NULL,
	`analysis` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `market_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `theses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`generated_at` text NOT NULL,
	`valid_until` text NOT NULL,
	`market_regime` text NOT NULL,
	`volatility_outlook` text NOT NULL,
	`convergence_density` real NOT NULL,
	`overall_confidence` real NOT NULL,
	`trading_actions` text NOT NULL,
	`executive_summary` text NOT NULL,
	`situation_assessment` text NOT NULL,
	`risk_scenarios` text NOT NULL,
	`layer_inputs` text NOT NULL,
	`symbols` text NOT NULL
);
