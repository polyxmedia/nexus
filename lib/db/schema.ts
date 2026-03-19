import { pgTable, text, integer, serial, doublePrecision, uuid, real, boolean } from "drizzle-orm/pg-core";

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().defaultRandom().unique(),
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
  uuid: uuid("uuid").notNull().defaultRandom().unique(),
  signalId: integer("signal_id").references(() => signals.id),
  analysisId: integer("analysis_id").references(() => analyses.id),
  claim: text("claim").notNull(),
  timeframe: text("timeframe").notNull(), // e.g., "7 days", "30 days"
  deadline: text("deadline").notNull(), // ISO date
  confidence: doublePrecision("confidence").notNull(), // 0-1
  category: text("category").notNull(), // market | geopolitical | celestial
  metrics: text("metrics"), // JSON: what to measure for scoring
  outcome: text("outcome"), // confirmed | denied | partial | expired | post_event
  outcomeNotes: text("outcome_notes"),
  score: doublePrecision("score"), // 0-1 accuracy score
  resolvedAt: text("resolved_at"),
  // Fix 1: Regime-aware tagging
  regimeAtCreation: text("regime_at_creation"), // peacetime | transitional | wartime
  referencePrices: text("reference_prices"), // JSON: {SPY: 520, WTI: 78, GLD: 2350}
  regimeInvalidated: integer("regime_invalidated").notNull().default(0),
  invalidatedReason: text("invalidated_reason"),
  // Fix 2: Pre-event lock
  preEvent: integer("pre_event").notNull().default(1), // 1=pre-event, 0=post-event
  // Fix 3: Direction vs Level split
  direction: text("direction"), // up | down | flat
  priceTarget: doublePrecision("price_target"),
  referenceSymbol: text("reference_symbol"),
  directionCorrect: integer("direction_correct"), // 0 | 1 at resolution
  levelCorrect: integer("level_correct"), // 0 | 1 at resolution
  baseRateAtCreation: doublePrecision("base_rate_at_creation"), // base rate used for BSS
  createdBy: text("created_by"), // username of creator (null = system-generated)
  tweetId: text("tweet_id"), // X/Twitter tweet ID when prediction was posted
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const predictionBenchmarks = pgTable("prediction_benchmarks", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().defaultRandom().unique(),
  source: text("source").notNull(), // metaculus | polymarket | manifold
  externalId: text("external_id").notNull(),
  externalUrl: text("external_url"),
  question: text("question").notNull(),
  category: text("category").notNull(), // geopolitical | market | technology | science | politics
  resolutionDate: text("resolution_date"),
  crowdProbability: doublePrecision("crowd_probability"),
  crowdProbabilityAtPrediction: doublePrecision("crowd_probability_at_prediction"),
  nexusProbability: doublePrecision("nexus_probability"),
  nexusReasoning: text("nexus_reasoning"),
  nexusPredictedAt: text("nexus_predicted_at"),
  resolved: integer("resolved").notNull().default(0), // 0=false, 1=true
  outcome: integer("outcome"), // 1=yes, 0=no, null=unresolved
  resolvedAt: text("resolved_at"),
  nexusBrier: doublePrecision("nexus_brier"),
  crowdBrier: doublePrecision("crowd_brier"),
  lastSyncedAt: text("last_synced_at"),
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

export const manualPositions = pgTable("manual_positions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  ticker: text("ticker").notNull(),
  name: text("name"),
  direction: text("direction").notNull().default("long"), // long | short
  quantity: doublePrecision("quantity").notNull(),
  avgCost: doublePrecision("avg_cost").notNull(),
  currency: text("currency").notNull().default("USD"),
  openedAt: text("opened_at").notNull(),
  closedAt: text("closed_at"),
  closePrice: doublePrecision("close_price"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const theses = pgTable("theses", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().defaultRandom().unique(),
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
  userId: text("user_id"),
  instructions: text("instructions"),
  context: text("context"), // JSON: pinned knowledge IDs, symbols, etc.
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().defaultRandom().unique(),
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
  model: text("model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  creditsUsed: integer("credits_used"),
  elapsedMs: integer("elapsed_ms"),
  metadata: text("metadata"), // JSON: { sycophancyIndex, ... }
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const gameTheoryScenarios = pgTable("game_theory_scenarios", {
  id: serial("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  title: text("title").notNull(),
  analysis: text("analysis").notNull(), // JSON GameTheoryAnalysis
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Scenario States (wartime game-theory branch) ──

export const scenarioStates = pgTable("scenario_states", {
  id: serial("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  regime: text("regime").notNull().default("peacetime"), // peacetime | transitional | wartime
  state: text("state").notNull().default("baseline"), // baseline | escalating | wartime | de-escalating
  triggeredThresholds: text("triggered_thresholds"), // JSON array of threshold events that fired
  activeTrajectories: text("active_trajectories"), // JSON: escalation trajectories being tracked
  invalidatedStrategies: text("invalidated_strategies"), // JSON: strategies no longer viable (e.g., "Negotiate" after strikes)
  contextSnapshot: text("context_snapshot"), // JSON: regime state + market data at transition
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
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
  userId: text("user_id"),
  name: text("name").notNull(),
  type: text("type").notNull(), // price_threshold | vix_level | geofence | signal_intensity | prediction_due | osint_keyword | custom
  condition: text("condition").notNull(), // JSON: the condition definition
  enabled: integer("enabled").notNull().default(1), // 0 or 1
  lastTriggered: text("last_triggered"),
  triggerCount: integer("trigger_count").notNull().default(0),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(60),
  notifyTelegram: integer("notify_telegram").notNull().default(0),
  notifySms: integer("notify_sms").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const alertHistory = pgTable("alert_history", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().$defaultFn(() => crypto.randomUUID()),
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
  name: text("name").notNull(), // Observer, Operator, Institution
  stripePriceId: text("stripe_price_id"), // Stripe Price ID (null for custom/contact-us tiers)
  stripeProductId: text("stripe_product_id"), // Stripe Product ID
  price: integer("price").notNull(), // price in cents (19900 = $199)
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
  code: text("code").notNull().unique(), // UUID referral code
  commissionRate: doublePrecision("commission_rate").notNull().default(0.20), // 20% default
  isActive: integer("is_active").notNull().default(1),
  clicks: integer("clicks").notNull().default(0),
  stripeConnectId: text("stripe_connect_id"), // Stripe Connect Express account for auto-payouts
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
  uuid: uuid("uuid").notNull().defaultRandom().unique(),
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

// ── Password Resets ──

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
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
  visitorHash: text("visitor_hash"),
  country: text("country"),
  city: text("city"),
  region: text("region"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  duration: integer("duration"), // seconds on page (sent on next navigation)
  isBot: boolean("is_bot").default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Analyst Memory ──

export const analystMemory = pgTable("analyst_memory", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull().default("preference"), // preference | thesis | portfolio | context | instruction
  key: text("key").notNull(),
  value: text("value").notNull(),
  lastUsed: text("last_used"),
  useCount: integer("use_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

// ── Documents ──

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: integer("session_id").references(() => chatSessions.id),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  extractedText: text("extracted_text"),
  knowledgeId: integer("knowledge_id").references(() => knowledge.id),
  metadata: text("metadata"), // JSON
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Credits ──

export const creditLedger = pgTable("credit_ledger", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: text("reason").notNull(),
  model: text("model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  sessionId: text("session_id"),
  period: text("period").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const creditBalances = pgTable("credit_balances", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  period: text("period").notNull(),
  creditsGranted: integer("credits_granted").notNull().default(0),
  creditsUsed: integer("credits_used").notNull().default(0),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── API Keys ──

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull().default("Default"),
  scopes: text("scopes"), // JSON array of scope strings, null = all
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  revokedAt: text("revoked_at"),
});

// ── Social: Comments ──

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().defaultRandom().unique(),
  userId: text("user_id").notNull(),
  targetType: text("target_type").notNull(), // signal | prediction | thesis
  targetId: integer("target_id").notNull(),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

// ── Daily Reports ──

export const dailyReports = pgTable("daily_reports", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  reportDate: text("report_date").notNull(),
  sections: text("sections").notNull(), // JSON: array of report sections
  generatedAt: text("generated_at").notNull(),
});

export type DailyReport = typeof dailyReports.$inferSelect;
export type NewDailyReport = typeof dailyReports.$inferInsert;

// ── Analyst Jobs Marketplace ──

export const analystProfiles = pgTable("analyst_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // user:{username}
  displayName: text("display_name").notNull(),
  bio: text("bio"), // short professional summary
  expertise: text("expertise"), // JSON array: ["geopolitical", "energy", "china", ...]
  credentials: text("credentials"), // free-text: experience, clearances, affiliations
  stripeConnectId: text("stripe_connect_id"), // for payouts
  payoutsEnabled: integer("payouts_enabled").notNull().default(0),
  totalJobs: integer("total_jobs").notNull().default(0),
  totalEarnings: integer("total_earnings").notNull().default(0), // in cents
  avgAccuracy: doublePrecision("avg_accuracy"), // 0-1, computed from scored deliverables
  scoredDeliverables: integer("scored_deliverables").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | approved | suspended
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const analystJobs = pgTable("analyst_jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(), // full brief: what's needed, context, deliverable format
  category: text("category").notNull(), // geopolitical | market | actor | event | technical | osint
  expertise: text("expertise"), // JSON array of required expertise tags
  priority: text("priority").notNull().default("standard"), // standard | urgent | critical
  paymentAmount: integer("payment_amount").notNull(), // in cents
  paymentType: text("payment_type").notNull().default("fixed"), // fixed | per_hour (future)
  deadline: text("deadline"), // ISO date: when deliverable is due
  maxApplications: integer("max_applications").notNull().default(5),
  status: text("status").notNull().default("open"), // open | in_progress | completed | cancelled
  createdBy: text("created_by").notNull(), // user:{username} or "system"
  assignedTo: text("assigned_to"), // analyst_profiles.userId
  sourceType: text("source_type"), // prediction | signal | convergence | manual
  sourceId: text("source_id"), // ID of the prediction/signal that triggered this job
  deliverableFormat: text("deliverable_format").notNull().default("analysis"), // analysis | assessment | profile | briefing
  knowledgeEntryId: integer("knowledge_entry_id"), // populated after delivery is approved
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const analystApplications = pgTable("analyst_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => analystJobs.id),
  analystId: integer("analyst_id").notNull().references(() => analystProfiles.id),
  userId: text("user_id").notNull(), // user:{username}
  coverNote: text("cover_note"), // why they're qualified for this job
  proposedApproach: text("proposed_approach"), // how they'd tackle it
  estimatedHours: integer("estimated_hours"),
  status: text("status").notNull().default("pending"), // pending | accepted | rejected | withdrawn
  deliverable: text("deliverable"), // the actual analysis/report content
  deliveredAt: text("delivered_at"),
  reviewScore: doublePrecision("review_score"), // 0-1 quality score from admin
  reviewNotes: text("review_notes"),
  paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | paid | failed
  paymentReference: text("payment_reference"), // Stripe transfer ID
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export type AnalystProfile = typeof analystProfiles.$inferSelect;
export type NewAnalystProfile = typeof analystProfiles.$inferInsert;
export type AnalystJob = typeof analystJobs.$inferSelect;
export type NewAnalystJob = typeof analystJobs.$inferInsert;
export type AnalystApplication = typeof analystApplications.$inferSelect;
export type NewAnalystApplication = typeof analystApplications.$inferInsert;

// ── Social: Analyst Follows ──

export const analystFollows = pgTable("analyst_follows", {
  id: serial("id").primaryKey(),
  followerId: text("follower_id").notNull(),
  followingId: text("following_id").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Agent Simulations ──

export const agentSimulations = pgTable("agent_simulations", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().defaultRandom().unique(),
  context: text("context").notNull(),
  status: text("status").notNull().default("running"),
  convergenceScore: doublePrecision("convergence_score"),
  convergenceLabel: text("convergence_label"),
  dominantStance: text("dominant_stance"),
  agentResults: text("agent_results"), // JSON array of per-agent results
  summary: text("summary"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// Type exports
export type AgentSimulation = typeof agentSimulations.$inferSelect;
export type NewAgentSimulation = typeof agentSimulations.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
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
export type ScenarioState = typeof scenarioStates.$inferSelect;
export type NewScenarioState = typeof scenarioStates.$inferInsert;
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
export type AnalystMemoryEntry = typeof analystMemory.$inferSelect;
export type NewAnalystMemoryEntry = typeof analystMemory.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type AnalystFollow = typeof analystFollows.$inferSelect;
export type NewAnalystFollow = typeof analystFollows.$inferInsert;

// ── Cached News Articles ──

export const newsArticles = pgTable("news_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  source: text("source").notNull(),
  category: text("category").notNull(), // world | markets | conflict | energy
  description: text("description"),
  imageUrl: text("image_url"),
  bias: text("bias"), // political bias rating
  publishedAt: text("published_at").notNull(), // ISO datetime
  fetchedAt: text("fetched_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Twitter Reply Tracking ──

export const twitterReplies = pgTable("twitter_replies", {
  id: serial("id").primaryKey(),
  tweetId: text("tweet_id").notNull().unique(), // ID of the tweet we replied to
  authorUsername: text("author_username").notNull(),
  originalText: text("original_text").notNull(), // the tweet we replied to
  replyText: text("reply_text").notNull(), // what we posted
  replyTweetId: text("reply_tweet_id"), // our reply's tweet ID
  query: text("query"), // which search query matched this
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Twitter Post Log ──

export const twitterPosts = pgTable("twitter_posts", {
  id: serial("id").primaryKey(),
  tweetId: text("tweet_id").notNull(),
  tweetType: text("tweet_type").notNull(), // prediction | resolution | analyst | reply
  content: text("content").notNull(),
  predictionId: integer("prediction_id").references(() => predictions.id),
  quoteTweetId: text("quote_tweet_id"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const gprReadings = pgTable("gpr_readings", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  composite: doublePrecision("composite").notNull(),
  threats: doublePrecision("threats").notNull().default(0),
  acts: doublePrecision("acts").notNull().default(0),
  threatsToActsRatio: doublePrecision("threats_to_acts_ratio").notNull().default(1),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const partnerProspects = pgTable("partner_prospects", {
  id: serial("id").primaryKey(),
  channelId: text("channel_id").unique(),
  channelName: text("channel_name").notNull(),
  channelUrl: text("channel_url"),
  subscriberCount: integer("subscriber_count"),
  videoCount: integer("video_count"),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  contactEmail: text("contact_email"),
  status: text("status").notNull().default("prospect"),
  notes: text("notes"),
  commissionRate: integer("commission_rate").default(20),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const dataCache = pgTable("data_cache", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  data: text("data").notNull(), // JSON stringified
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(), // markdown with embedded widget directives
  category: text("category").notNull(), // market | geopolitical | macro | energy | commodities
  predictionId: integer("prediction_id").references(() => predictions.id),
  status: text("status").notNull().default("draft"), // draft | published | archived
  author: text("author").notNull().default("NEXUS Research Desk"),
  readingTime: integer("reading_time"), // estimated minutes
  tags: text("tags"), // JSON array of tags
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const partnerOutreach = pgTable("partner_outreach", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  toEmail: text("to_email").notNull(),
  status: text("status").notNull().default("draft"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ══════════════════════════════════════════════════════════════
// PLATFORM EXPANSION TABLES (migration 001)
// ══════════════════════════════════════════════════════════════

// ── Execution Rules (Automated Trading) ──

export const executionRules = pgTable("execution_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  enabled: integer("enabled").notNull().default(1),
  conditions: text("conditions").notNull(),
  sizingStrategy: text("sizing_strategy").notNull().default("tier"),
  sizingParams: text("sizing_params"),
  bracketConfig: text("bracket_config"),
  broker: text("broker").notNull().default("t212"),
  maxDailyOrders: integer("max_daily_orders").notNull().default(5),
  maxPositionPct: doublePrecision("max_position_pct").notNull().default(5.0),
  ordersToday: integer("orders_today").notNull().default(0),
  lastResetDate: text("last_reset_date"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const executionLog = pgTable("execution_log", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => executionRules.id),
  userId: text("user_id").notNull(),
  signalId: integer("signal_id"),
  predictionId: integer("prediction_id"),
  tradeId: integer("trade_id"),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const killSwitch = pgTable("kill_switch", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  active: integer("active").notNull().default(0),
  reason: text("reason"),
  activatedAt: text("activated_at"),
  activatedBy: text("activated_by"),
});

// ── Sentiment Analyses (NLP) ──

export const sentimentAnalyses = pgTable("sentiment_analyses", {
  id: serial("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  rawText: text("raw_text"),
  sentimentScore: doublePrecision("sentiment_score"),
  confidence: doublePrecision("confidence"),
  toneBreakdown: text("tone_breakdown"),
  entitiesMentioned: text("entities_mentioned"),
  keyClaims: text("key_claims"),
  marketImplications: text("market_implications"),
  modelUsed: text("model_used"),
  tokensUsed: integer("tokens_used"),
  creditsUsed: integer("credits_used"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Order Book Snapshots ──

export const orderbookSnapshots = pgTable("orderbook_snapshots", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  exchange: text("exchange").notNull().default("coinbase"),
  bids: text("bids"),
  asks: text("asks"),
  spreadBps: doublePrecision("spread_bps"),
  imbalanceRatio: doublePrecision("imbalance_ratio"),
  depth5Bid: doublePrecision("depth_5_bid"),
  depth5Ask: doublePrecision("depth_5_ask"),
  midPrice: doublePrecision("mid_price"),
  snapshotAt: text("snapshot_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const flowImbalanceAlerts = pgTable("flow_imbalance_alerts", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  imbalanceRatio: doublePrecision("imbalance_ratio").notNull(),
  direction: text("direction").notNull(),
  magnitude: doublePrecision("magnitude").notNull(),
  snapshotId: integer("snapshot_id").references(() => orderbookSnapshots.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Supply Chain Network ──

export const supplyChainEdges = pgTable("supply_chain_edges", {
  id: serial("id").primaryKey(),
  fromEntity: text("from_entity").notNull(),
  toEntity: text("to_entity").notNull(),
  relationshipType: text("relationship_type").notNull(),
  strength: doublePrecision("strength").notNull().default(0.5),
  lagDays: integer("lag_days").notNull().default(0),
  source: text("source").notNull().default("manual"),
  confidence: doublePrecision("confidence").notNull().default(0.8),
  evidence: text("evidence"),
  validFrom: text("valid_from"),
  validUntil: text("valid_until"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const supplyChainSnapshots = pgTable("supply_chain_snapshots", {
  id: serial("id").primaryKey(),
  rootEntity: text("root_entity").notNull(),
  depth: integer("depth").notNull().default(3),
  snapshot: text("snapshot").notNull(),
  exposureSummary: text("exposure_summary"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Satellite Imagery ──

export const satelliteImagery = pgTable("satellite_imagery", {
  id: serial("id").primaryKey(),
  regionName: text("region_name").notNull(),
  bbox: text("bbox").notNull(),
  imageryType: text("imagery_type").notNull(),
  source: text("source").notNull().default("sentinel2"),
  tileUrl: text("tile_url"),
  thumbnailUrl: text("thumbnail_url"),
  acquisitionDate: text("acquisition_date"),
  cloudCoverPct: doublePrecision("cloud_cover_pct"),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const imageryAnalyses = pgTable("imagery_analyses", {
  id: serial("id").primaryKey(),
  imageryId: integer("imagery_id").references(() => satelliteImagery.id),
  analysisType: text("analysis_type").notNull(),
  result: text("result").notNull(),
  confidence: doublePrecision("confidence"),
  aiSummary: text("ai_summary"),
  comparedToId: integer("compared_to_id").references(() => satelliteImagery.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── ML Models (Learned Signals) ──

export const mlModels = pgTable("ml_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  modelType: text("model_type").notNull(),
  target: text("target").notNull(),
  featuresUsed: text("features_used").notNull(),
  hyperparams: text("hyperparams"),
  artifact: text("artifact"),
  trainingDate: text("training_date"),
  trainingWindow: text("training_window"),
  sampleCount: integer("sample_count"),
  metrics: text("metrics"),
  status: text("status").notNull().default("training"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const mlPredictions = pgTable("ml_predictions", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull().references(() => mlModels.id),
  predictionDate: text("prediction_date").notNull(),
  targetSymbol: text("target_symbol"),
  predictedValue: doublePrecision("predicted_value"),
  predictedClass: text("predicted_class"),
  confidence: doublePrecision("confidence"),
  featuresSnapshot: text("features_snapshot"),
  actualValue: doublePrecision("actual_value"),
  actualClass: text("actual_class"),
  correct: integer("correct"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const featureStore = pgTable("feature_store", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  symbol: text("symbol"),
  featureName: text("feature_name").notNull(),
  featureValue: doublePrecision("feature_value").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Broker Connections & Unified Portfolio ──

export const brokerConnections = pgTable("broker_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  broker: text("broker").notNull(),
  status: text("status").notNull().default("connected"),
  lastSyncAt: text("last_sync_at"),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const unifiedPositions = pgTable("unified_positions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  broker: text("broker").notNull(),
  symbol: text("symbol").notNull(),
  normalizedSymbol: text("normalized_symbol").notNull(),
  quantity: doublePrecision("quantity").notNull().default(0),
  avgCost: doublePrecision("avg_cost"),
  currentPrice: doublePrecision("current_price"),
  marketValue: doublePrecision("market_value"),
  unrealizedPnl: doublePrecision("unrealized_pnl"),
  unrealizedPnlPct: doublePrecision("unrealized_pnl_pct"),
  currency: text("currency").notNull().default("USD"),
  assetClass: text("asset_class").notNull().default("equity"),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const unifiedPortfolio = pgTable("unified_portfolio", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  totalValue: doublePrecision("total_value").notNull().default(0),
  totalCash: doublePrecision("total_cash").notNull().default(0),
  totalInvested: doublePrecision("total_invested").notNull().default(0),
  totalPnl: doublePrecision("total_pnl").notNull().default(0),
  totalPnlPct: doublePrecision("total_pnl_pct").notNull().default(0),
  byBroker: text("by_broker"),
  byAssetClass: text("by_asset_class"),
  bySector: text("by_sector"),
  snapshotAt: text("snapshot_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Rate Limit Config ──

export const rateLimitConfig = pgTable("rate_limit_config", {
  id: serial("id").primaryKey(),
  tier: text("tier").notNull(),
  routePattern: text("route_pattern").notNull(),
  requestsPerWindow: integer("requests_per_window").notNull().default(60),
  windowMs: integer("window_ms").notNull().default(60000),
  burstLimit: integer("burst_limit"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

// ── Backtest Workers & Chunks ──

export const backtestWorkers = pgTable("backtest_workers", {
  id: serial("id").primaryKey(),
  workerId: text("worker_id").notNull(),
  status: text("status").notNull().default("idle"),
  currentRunId: text("current_run_id"),
  currentChunk: integer("current_chunk"),
  lastHeartbeat: text("last_heartbeat"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const backtestChunks = pgTable("backtest_chunks", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  dateStart: text("date_start"),
  dateEnd: text("date_end"),
  instruments: text("instruments"),
  status: text("status").notNull().default("pending"),
  workerId: text("worker_id"),
  predictions: text("predictions"),
  metrics: text("metrics"),
  error: text("error"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
});

// ── Type Exports for expansion tables ──

export type ExecutionRule = typeof executionRules.$inferSelect;
export type NewExecutionRule = typeof executionRules.$inferInsert;
export type ExecutionLogEntry = typeof executionLog.$inferSelect;
export type KillSwitchRecord = typeof killSwitch.$inferSelect;
export type SentimentAnalysis = typeof sentimentAnalyses.$inferSelect;
export type NewSentimentAnalysis = typeof sentimentAnalyses.$inferInsert;
export type OrderbookSnapshot = typeof orderbookSnapshots.$inferSelect;
export type FlowImbalanceAlert = typeof flowImbalanceAlerts.$inferSelect;
export type SupplyChainEdge = typeof supplyChainEdges.$inferSelect;
export type NewSupplyChainEdge = typeof supplyChainEdges.$inferInsert;
export type SupplyChainSnapshotRecord = typeof supplyChainSnapshots.$inferSelect;
export type SatelliteImageryRecord = typeof satelliteImagery.$inferSelect;
export type ImageryAnalysisRecord = typeof imageryAnalyses.$inferSelect;
export type MlModel = typeof mlModels.$inferSelect;
export type NewMlModel = typeof mlModels.$inferInsert;
export type MlPredictionRecord = typeof mlPredictions.$inferSelect;
export type FeatureStoreEntry = typeof featureStore.$inferSelect;
export type BrokerConnection = typeof brokerConnections.$inferSelect;
export type UnifiedPosition = typeof unifiedPositions.$inferSelect;
export type UnifiedPortfolioRecord = typeof unifiedPortfolio.$inferSelect;
export type RateLimitConfigRecord = typeof rateLimitConfig.$inferSelect;
export type BacktestWorker = typeof backtestWorkers.$inferSelect;
export type BacktestChunk = typeof backtestChunks.$inferSelect;

// ── Push notification devices ──
export const pushDevices = pgTable("push_devices", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  deviceToken: text("device_token").notNull(),
  platform: text("platform").notNull().default("ios"),
  deviceName: text("device_name"),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type PushDevice = typeof pushDevices.$inferSelect;

// ── Outreach Prospects ──

export const outreachProspects = pgTable("outreach_prospects", {
  id: serial("id").primaryKey(),
  twitterId: text("twitter_id").notNull().unique(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  followers: integer("followers").notNull().default(0),
  score: real("score").notNull().default(0),
  tags: text("tags"), // JSON array
  status: text("status").notNull().default("discovered"),
  engagedAt: text("engaged_at"),
  engagedTweetId: text("engaged_tweet_id"),
  replyTweetId: text("reply_tweet_id"),
  visitedAt: text("visited_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Automation Rules ──

export const automationRules = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  uuid: text("uuid").notNull().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  enabled: integer("enabled").notNull().default(1),
  triggerType: text("trigger_type").notNull(),
  triggerConfig: text("trigger_config").notNull(), // JSON
  actions: text("actions").notNull(), // JSON array
  lastTriggeredAt: text("last_triggered_at"),
  triggerCount: integer("trigger_count").notNull().default(0),
  lastError: text("last_error"),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(30),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Parallel Analyses ──

export const parallelAnalyses = pgTable("parallel_analyses", {
  id: serial("id").primaryKey(),
  uuid: text("uuid").notNull().$defaultFn(() => crypto.randomUUID()),
  query: text("query").notNull(),
  synthesis: text("synthesis").notNull(),
  probabilityOfRepetition: real("probability_of_repetition").notNull().default(0),
  regime: text("regime").notNull().default("peacetime"),
  confidence: real("confidence").notNull().default(0),
  warning: text("warning"),
  actionableInsights: text("actionable_insights"), // JSON
  parallels: text("parallels").notNull(), // JSON
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  createdBy: text("created_by"),
});

export type ParallelAnalysis = typeof parallelAnalyses.$inferSelect;
export type NewParallelAnalysis = typeof parallelAnalyses.$inferInsert;
