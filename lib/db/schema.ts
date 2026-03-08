import { pgTable, text, integer, serial, doublePrecision } from "drizzle-orm/pg-core";

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(), // ISO date string
  endDate: text("end_date"), // for multi-day events
  intensity: integer("intensity").notNull(), // 1-5
  category: text("category").notNull(), // celestial | hebrew | geopolitical | convergence
  celestialType: text("celestial_type"), // eclipse, conjunction, blood_moon, etc.
  hebrewDate: text("hebrew_date"),
  hebrewHoliday: text("hebrew_holiday"),
  geopoliticalContext: text("geopolitical_context"),
  layers: text("layers").notNull(), // JSON array of contributing layer names
  marketSectors: text("market_sectors"), // JSON array of affected sectors
  historicalPrecedent: text("historical_precedent"),
  status: text("status").notNull().default("upcoming"), // upcoming | active | passed
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").notNull().references(() => signals.id),
  summary: text("summary").notNull(),
  confidence: doublePrecision("confidence").notNull(), // 0-1
  escalationProbability: doublePrecision("escalation_probability"), // 0-1
  marketImpact: text("market_impact").notNull(), // JSON: sectors, direction, magnitude
  tradeRecommendations: text("trade_recommendations").notNull(), // JSON array
  reasoning: text("reasoning").notNull(),
  hebrewCalendarAnalysis: text("hebrew_calendar_analysis"),
  celestialAnalysis: text("celestial_analysis"),
  historicalParallels: text("historical_parallels"),
  riskFactors: text("risk_factors"), // JSON array
  redTeamAssessment: text("red_team_assessment"), // JSON: adversarial challenge
  modelUsed: text("model_used").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").references(() => signals.id),
  analysisId: integer("analysis_id").references(() => analyses.id),
  claim: text("claim").notNull(),
  timeframe: text("timeframe").notNull(), // e.g., "7 days", "30 days"
  deadline: text("deadline").notNull(), // ISO date
  confidence: doublePrecision("confidence").notNull(), // 0-1
  category: text("category").notNull(), // market | geopolitical | celestial
  metrics: text("metrics"), // JSON: what to measure for scoring
  outcome: text("outcome"), // confirmed | denied | partial | expired
  outcomeNotes: text("outcome_notes"),
  score: doublePrecision("score"), // 0-1 accuracy score
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("legacy"),
  signalId: integer("signal_id").references(() => signals.id),
  predictionId: integer("prediction_id").references(() => predictions.id),
  ticker: text("ticker").notNull(),
  direction: text("direction").notNull(), // BUY | SELL
  orderType: text("order_type").notNull(), // MARKET | LIMIT | STOP | STOP_LIMIT
  quantity: doublePrecision("quantity").notNull(),
  limitPrice: doublePrecision("limit_price"),
  stopPrice: doublePrecision("stop_price"),
  filledPrice: doublePrecision("filled_price"),
  t212OrderId: text("t212_order_id"),
  status: text("status").notNull().default("pending"), // pending | filled | rejected | cancelled
  environment: text("environment").notNull().default("demo"), // demo | live
  dedupeHash: text("dedupe_hash"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: serial("id").primaryKey(),
  totalValue: doublePrecision("total_value").notNull(),
  cash: doublePrecision("cash").notNull(),
  invested: doublePrecision("invested").notNull(),
  pnl: doublePrecision("pnl").notNull(),
  pnlPercent: doublePrecision("pnl_percent").notNull(),
  positions: text("positions").notNull(), // JSON array of position details
  environment: text("environment").notNull().default("demo"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const theses = pgTable("theses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("active"), // active | expired | superseded
  generatedAt: text("generated_at").notNull().$defaultFn(() => new Date().toISOString()),
  validUntil: text("valid_until").notNull(),
  marketRegime: text("market_regime").notNull(), // risk_on | risk_off | transitioning
  volatilityOutlook: text("volatility_outlook").notNull(), // low | normal | elevated | extreme
  convergenceDensity: doublePrecision("convergence_density").notNull(),
  overallConfidence: doublePrecision("overall_confidence").notNull(),
  tradingActions: text("trading_actions").notNull(), // JSON array
  executiveSummary: text("executive_summary").notNull(),
  situationAssessment: text("situation_assessment").notNull(),
  riskScenarios: text("risk_scenarios").notNull(),
  layerInputs: text("layer_inputs").notNull(), // JSON
  symbols: text("symbols").notNull(), // JSON array
  redTeamChallenge: text("red_team_challenge"), // JSON: RedTeamAssessment
});

export const marketSnapshots = pgTable("market_snapshots", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  snapshot: text("snapshot").notNull(), // JSON TechnicalSnapshot
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const chatProjects = pgTable("chat_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#06b6d4"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("legacy"),
  title: text("title").notNull().default("New Chat"),
  projectId: integer("project_id").references(() => chatProjects.id),
  tags: text("tags"), // JSON array of string tags
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => chatSessions.id),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  toolUses: text("tool_uses"), // JSON array of { toolName, toolUseId, input }
  toolResults: text("tool_results"), // JSON array of { toolName, toolUseId, result }
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const gameTheoryScenarios = pgTable("game_theory_scenarios", {
  id: serial("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  title: text("title").notNull(),
  analysis: text("analysis").notNull(), // JSON GameTheoryAnalysis
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Entity Graph ──

export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // actor | aircraft | vessel | signal | prediction | trade | thesis | sector | ticker | event | location
  name: text("name").notNull(),
  properties: text("properties"), // JSON: arbitrary key-value metadata
  sourceType: text("source_type"), // which table/source this was derived from
  sourceId: text("source_id"), // ID in the source table
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  fromEntityId: integer("from_entity_id").notNull().references(() => entities.id),
  toEntityId: integer("to_entity_id").notNull().references(() => entities.id),
  type: text("type").notNull(), // affects | triggers | belongs_to | correlated_with | trades | opposes | allies | monitors | predicts | located_in
  weight: doublePrecision("weight").default(1.0), // 0-1 strength of relationship
  properties: text("properties"), // JSON: direction, context, evidence
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Timeline Events ──

export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  timestamp: text("timestamp").notNull(), // ISO datetime
  type: text("type").notNull(), // signal | prediction | trade | thesis | osint | alert | market | analysis
  title: text("title").notNull(),
  description: text("description"),
  severity: integer("severity").default(1), // 1-5
  category: text("category"), // market | geopolitical | celestial | system
  sourceType: text("source_type"), // table name
  sourceId: integer("source_id"), // row ID in source table
  entityIds: text("entity_ids"), // JSON array of entity IDs involved
  metadata: text("metadata"), // JSON: extra context
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Alerts & Watch Conditions ──

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // price_threshold | vix_level | geofence | signal_intensity | prediction_due | osint_keyword | custom
  condition: text("condition").notNull(), // JSON: the condition definition
  enabled: integer("enabled").notNull().default(1), // 0 or 1
  lastTriggered: text("last_triggered"),
  triggerCount: integer("trigger_count").notNull().default(0),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(60),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const alertHistory = pgTable("alert_history", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").notNull().references(() => alerts.id),
  triggeredAt: text("triggered_at").notNull().$defaultFn(() => new Date().toISOString()),
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: integer("severity").notNull().default(3), // 1-5
  data: text("data"), // JSON: snapshot of what triggered it
  dismissed: integer("dismissed").notNull().default(0), // 0 or 1
});

// ── Dashboard Widgets ──

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  widgetType: text("widget_type").notNull(), // metric | chart | signals | predictions | macro | risk | options | calendar | thesis | portfolio
  title: text("title").notNull(),
  config: text("config").notNull(), // JSON: widget-specific configuration
  position: integer("position").notNull().default(0), // order index
  width: integer("width").notNull().default(1), // 1=third, 2=two-thirds, 3=full
  enabled: integer("enabled").notNull().default(1),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Knowledge Bank ──

export const knowledge = pgTable("knowledge", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // thesis | model | event | actor | market | geopolitical | technical
  tags: text("tags"), // JSON array of string tags for filtering
  source: text("source"), // where this knowledge came from
  confidence: doublePrecision("confidence").default(0.8), // 0-1 how confident we are in this info
  status: text("status").notNull().default("active"), // active | archived | superseded
  supersededBy: integer("superseded_by"), // ID of newer version
  validFrom: text("valid_from"), // ISO date - when this became true
  validUntil: text("valid_until"), // ISO date - when this stops being relevant
  metadata: text("metadata"), // JSON: extra structured data
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

// ── Watchlists ──

export const watchlists = pgTable("watchlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const watchlistItems = pgTable("watchlist_items", {
  id: serial("id").primaryKey(),
  watchlistId: integer("watchlist_id").notNull().references(() => watchlists.id),
  symbol: text("symbol").notNull(),
  position: integer("position").notNull().default(0),
  lastPrice: doublePrecision("last_price"),
  lastChange: doublePrecision("last_change"),
  lastChangePercent: doublePrecision("last_change_percent"),
  lastVolume: integer("last_volume"),
  lastUpdated: text("last_updated"),
  addedAt: text("added_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Subscription Tiers ──

export const subscriptionTiers = pgTable("subscription_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Analyst, Operator, Institution
  stripePriceId: text("stripe_price_id"), // Stripe Price ID (null for custom/contact-us tiers)
  stripeProductId: text("stripe_product_id"), // Stripe Product ID
  price: integer("price").notNull(), // price in cents (4900 = $49)
  interval: text("interval").notNull().default("month"), // month | year
  features: text("features").notNull(), // JSON array of feature strings
  limits: text("limits").notNull(), // JSON: { chatMessages: 100, warRoomAccess: "view", ... }
  highlighted: integer("highlighted").notNull().default(0), // 0 or 1
  position: integer("position").notNull().default(0), // display order
  active: integer("active").notNull().default(1), // 0 or 1
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // matches user:{username} key pattern
  tierId: integer("tier_id").notNull().references(() => subscriptionTiers.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("active"), // active | past_due | canceled | trialing | incomplete
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  cancelAtPeriodEnd: integer("cancel_at_period_end").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

// ── Referrals & Commissions ──

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // the referrer (user:{username})
  code: text("code").notNull().unique(), // short unique code e.g. "andre-7x3k"
  commissionRate: doublePrecision("commission_rate").notNull().default(0.20), // 20% default
  isActive: integer("is_active").notNull().default(1),
  clicks: integer("clicks").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referralCodeId: integer("referral_code_id").notNull().references(() => referralCodes.id),
  referrerId: text("referrer_id").notNull(), // user:{username} of referrer
  referredUserId: text("referred_user_id").notNull(), // user:{username} of new user
  status: text("status").notNull().default("signed_up"), // signed_up | subscribed | churned
  subscribedAt: text("subscribed_at"),
  subscriptionTierId: integer("subscription_tier_id").references(() => subscriptionTiers.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").notNull().references(() => referrals.id),
  referrerId: text("referrer_id").notNull(),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"), // pending | approved | paid | rejected
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  paidAt: text("paid_at"),
  paymentMethod: text("payment_method"), // paypal | bank_transfer | stripe
  paymentReference: text("payment_reference"), // transaction ID
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Support Tickets ──

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // user:{username}
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open | in_progress | resolved | closed
  priority: text("priority").notNull().default("normal"), // low | normal | high | urgent
  category: text("category").notNull().default("general"), // billing | technical | feature | account | general
  assignedTo: text("assigned_to"), // admin username
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  resolvedAt: text("resolved_at"),
});

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  userId: text("user_id").notNull(), // who sent it
  content: text("content").notNull(),
  isStaff: integer("is_staff").notNull().default(0), // 0 = user, 1 = staff
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Analytics ──

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull().default("pageview"),
  path: text("path").notNull(),
  referrer: text("referrer"),
  sessionHash: text("session_hash"),
  userAgentHash: text("user_agent_hash"),
  country: text("country"),
  deviceType: text("device_type"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// Type exports
export type Signal = typeof signals.$inferSelect;
export type NewSignal = typeof signals.$inferInsert;
export type Analysis = typeof analyses.$inferSelect;
export type NewAnalysis = typeof analyses.$inferInsert;
export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type ThesisRecord = typeof theses.$inferSelect;
export type NewThesisRecord = typeof theses.$inferInsert;
export type MarketSnapshotRecord = typeof marketSnapshots.$inferSelect;
export type GameTheoryScenarioRecord = typeof gameTheoryScenarios.$inferSelect;
export type ChatProject = typeof chatProjects.$inferSelect;
export type NewChatProject = typeof chatProjects.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type AlertHistoryRecord = typeof alertHistory.$inferSelect;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof dashboardWidgets.$inferInsert;
export type KnowledgeEntry = typeof knowledge.$inferSelect;
export type NewKnowledgeEntry = typeof knowledge.$inferInsert;
export type Watchlist = typeof watchlists.$inferSelect;
export type NewWatchlist = typeof watchlists.$inferInsert;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type NewWatchlistItem = typeof watchlistItems.$inferInsert;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type NewSubscriptionTier = typeof subscriptionTiers.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type NewReferralCode = typeof referralCodes.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;
export type Commission = typeof commissions.$inferSelect;
export type NewCommission = typeof commissions.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;
