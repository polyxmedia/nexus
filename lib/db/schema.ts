import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const signals = sqliteTable("signals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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

export const analyses = sqliteTable("analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  signalId: integer("signal_id").notNull().references(() => signals.id),
  summary: text("summary").notNull(),
  confidence: real("confidence").notNull(), // 0-1
  escalationProbability: real("escalation_probability"), // 0-1
  marketImpact: text("market_impact").notNull(), // JSON: sectors, direction, magnitude
  tradeRecommendations: text("trade_recommendations").notNull(), // JSON array
  reasoning: text("reasoning").notNull(),
  hebrewCalendarAnalysis: text("hebrew_calendar_analysis"),
  celestialAnalysis: text("celestial_analysis"),
  historicalParallels: text("historical_parallels"),
  riskFactors: text("risk_factors"), // JSON array
  modelUsed: text("model_used").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const predictions = sqliteTable("predictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  signalId: integer("signal_id").references(() => signals.id),
  analysisId: integer("analysis_id").references(() => analyses.id),
  claim: text("claim").notNull(),
  timeframe: text("timeframe").notNull(), // e.g., "7 days", "30 days"
  deadline: text("deadline").notNull(), // ISO date
  confidence: real("confidence").notNull(), // 0-1
  category: text("category").notNull(), // market | geopolitical | celestial
  metrics: text("metrics"), // JSON: what to measure for scoring
  outcome: text("outcome"), // confirmed | denied | partial | expired
  outcomeNotes: text("outcome_notes"),
  score: real("score"), // 0-1 accuracy score
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  signalId: integer("signal_id").references(() => signals.id),
  predictionId: integer("prediction_id").references(() => predictions.id),
  ticker: text("ticker").notNull(),
  direction: text("direction").notNull(), // BUY | SELL
  orderType: text("order_type").notNull(), // MARKET | LIMIT | STOP | STOP_LIMIT
  quantity: real("quantity").notNull(),
  limitPrice: real("limit_price"),
  stopPrice: real("stop_price"),
  filledPrice: real("filled_price"),
  t212OrderId: text("t212_order_id"),
  status: text("status").notNull().default("pending"), // pending | filled | rejected | cancelled
  environment: text("environment").notNull().default("demo"), // demo | live
  dedupeHash: text("dedupe_hash"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const portfolioSnapshots = sqliteTable("portfolio_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  totalValue: real("total_value").notNull(),
  cash: real("cash").notNull(),
  invested: real("invested").notNull(),
  pnl: real("pnl").notNull(),
  pnlPercent: real("pnl_percent").notNull(),
  positions: text("positions").notNull(), // JSON array of position details
  environment: text("environment").notNull().default("demo"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const theses = sqliteTable("theses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  status: text("status").notNull().default("active"), // active | expired | superseded
  generatedAt: text("generated_at").notNull().$defaultFn(() => new Date().toISOString()),
  validUntil: text("valid_until").notNull(),
  marketRegime: text("market_regime").notNull(), // risk_on | risk_off | transitioning
  volatilityOutlook: text("volatility_outlook").notNull(), // low | normal | elevated | extreme
  convergenceDensity: real("convergence_density").notNull(),
  overallConfidence: real("overall_confidence").notNull(),
  tradingActions: text("trading_actions").notNull(), // JSON array
  executiveSummary: text("executive_summary").notNull(),
  situationAssessment: text("situation_assessment").notNull(),
  riskScenarios: text("risk_scenarios").notNull(),
  layerInputs: text("layer_inputs").notNull(), // JSON
  symbols: text("symbols").notNull(), // JSON array
});

export const marketSnapshots = sqliteTable("market_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  snapshot: text("snapshot").notNull(), // JSON TechnicalSnapshot
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull().default("New Chat"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => chatSessions.id),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  toolUses: text("tool_uses"), // JSON array of { toolName, toolUseId, input }
  toolResults: text("tool_results"), // JSON array of { toolName, toolUseId, result }
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const gameTheoryScenarios = sqliteTable("game_theory_scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scenarioId: text("scenario_id").notNull(),
  title: text("title").notNull(),
  analysis: text("analysis").notNull(), // JSON GameTheoryAnalysis
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
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
