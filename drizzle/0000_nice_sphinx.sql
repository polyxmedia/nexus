CREATE TABLE "alert_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_id" integer NOT NULL,
	"triggered_at" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" integer DEFAULT 3 NOT NULL,
	"data" text,
	"dismissed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"condition" text NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"last_triggered" text,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"cooldown_minutes" integer DEFAULT 60 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"signal_id" integer NOT NULL,
	"summary" text NOT NULL,
	"confidence" double precision NOT NULL,
	"escalation_probability" double precision,
	"market_impact" text NOT NULL,
	"trade_recommendations" text NOT NULL,
	"reasoning" text NOT NULL,
	"hebrew_calendar_analysis" text,
	"celestial_analysis" text,
	"historical_parallels" text,
	"risk_factors" text,
	"model_used" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_uses" text,
	"tool_results" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#06b6d4' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"project_id" integer,
	"tags" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'default' NOT NULL,
	"widget_type" text NOT NULL,
	"title" text NOT NULL,
	"config" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"width" integer DEFAULT 1 NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"properties" text,
	"source_type" text,
	"source_id" text,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "game_theory_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"title" text NOT NULL,
	"analysis" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"tags" text,
	"source" text,
	"confidence" double precision DEFAULT 0.8,
	"status" text DEFAULT 'active' NOT NULL,
	"superseded_by" integer,
	"valid_from" text,
	"valid_until" text,
	"metadata" text,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"snapshot" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_value" double precision NOT NULL,
	"cash" double precision NOT NULL,
	"invested" double precision NOT NULL,
	"pnl" double precision NOT NULL,
	"pnl_percent" double precision NOT NULL,
	"positions" text NOT NULL,
	"environment" text DEFAULT 'demo' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"signal_id" integer,
	"analysis_id" integer,
	"claim" text NOT NULL,
	"timeframe" text NOT NULL,
	"deadline" text NOT NULL,
	"confidence" double precision NOT NULL,
	"category" text NOT NULL,
	"metrics" text,
	"outcome" text,
	"outcome_notes" text,
	"score" double precision,
	"resolved_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_entity_id" integer NOT NULL,
	"to_entity_id" integer NOT NULL,
	"type" text NOT NULL,
	"weight" double precision DEFAULT 1,
	"properties" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"date" text NOT NULL,
	"end_date" text,
	"intensity" integer NOT NULL,
	"category" text NOT NULL,
	"celestial_type" text,
	"hebrew_date" text,
	"hebrew_holiday" text,
	"geopolitical_context" text,
	"layers" text NOT NULL,
	"market_sectors" text,
	"historical_precedent" text,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stripe_price_id" text,
	"stripe_product_id" text,
	"price" integer NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"features" text NOT NULL,
	"limits" text NOT NULL,
	"highlighted" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tier_id" integer NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" text,
	"current_period_end" text,
	"cancel_at_period_end" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "theses" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"generated_at" text NOT NULL,
	"valid_until" text NOT NULL,
	"market_regime" text NOT NULL,
	"volatility_outlook" text NOT NULL,
	"convergence_density" double precision NOT NULL,
	"overall_confidence" double precision NOT NULL,
	"trading_actions" text NOT NULL,
	"executive_summary" text NOT NULL,
	"situation_assessment" text NOT NULL,
	"risk_scenarios" text NOT NULL,
	"layer_inputs" text NOT NULL,
	"symbols" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"severity" integer DEFAULT 1,
	"category" text,
	"source_type" text,
	"source_id" integer,
	"entity_ids" text,
	"metadata" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"signal_id" integer,
	"prediction_id" integer,
	"ticker" text NOT NULL,
	"direction" text NOT NULL,
	"order_type" text NOT NULL,
	"quantity" double precision NOT NULL,
	"limit_price" double precision,
	"stop_price" double precision,
	"filled_price" double precision,
	"t212_order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"environment" text DEFAULT 'demo' NOT NULL,
	"dedupe_hash" text,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"watchlist_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_project_id_chat_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."chat_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_entity_id_entities_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_entity_id_entities_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE no action ON UPDATE no action;