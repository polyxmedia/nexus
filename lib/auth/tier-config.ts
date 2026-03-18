/**
 * Central tier configuration.
 * Defines which features require which minimum tier.
 *
 * ALL enforcement happens server-side via requireTier() in API routes.
 * The client-side UpgradeGate component is UX only and can be bypassed.
 * Never trust the client.
 */

export type MinTier = "free" | "analyst" | "observer" | "operator" | "institution";

// ── API Route → Minimum Tier ──
// Every protected route must call requireTier() with the mapped tier.
// Routes not listed here are either public or require only authentication.
export const ROUTE_TIERS: Record<string, MinTier> = {
  // ── Observer tier ($199/mo) - core intelligence ──
  "chat": "analyst",
  "signals": "analyst",
  "predictions": "analyst",
  "dashboard": "free",
  "warroom": "free",
  "game-theory": "analyst",
  "calendar": "analyst",
  "timeline": "analyst",
  "alerts": "analyst",
  "news": "analyst",
  "narrative": "analyst",
  "knowledge": "analyst",
  "thesis": "operator",
  "graph": "analyst",
  "parallels": "analyst",
  "actors": "analyst",
  "iw": "analyst",
  "longevity": "analyst",

  // ── Operator tier ($599/mo) - advanced analytics + trading ──
  "trade-lab": "operator",
  "trading212": "operator",
  "coinbase": "operator",
  "ibkr": "operator",
  "portfolio": "operator",
  "market-data": "operator",
  "markets": "operator",
  "watchlists": "operator",
  "on-chain": "operator",
  "short-interest": "operator",
  "gex": "operator",
  "options": "operator",
  "simulation": "operator",
  "prediction-markets": "operator",
  "congressional-trading": "operator",
  "ai-progression": "operator",
  "gpr": "operator",
  "bocpd": "operator",
  "shipping": "operator",
  "macro": "operator",
  "regime": "operator",
  "risk": "operator",
  "nowcast": "operator",
  "nlp": "operator",
  "osint": "operator",
  "ach": "operator",
  "sources": "operator",
  "collection-gaps": "operator",
  "analytics": "operator",

  // ── Institution tier (custom pricing) ──
  "agents": "institution",
  "nexus-bridge": "institution",
};

// ── Chat Tool → Minimum Tier ──
// Tools not listed here default to "analyst" (base paid tier).
export const TOOL_TIERS: Record<string, MinTier> = {
  // Analyst tools (core intelligence)
  "get_signals": "analyst",
  "get_market_snapshot": "analyst",
  "get_market_sentiment": "analyst",
  "get_active_thesis": "analyst",
  "get_predictions": "analyst",
  "get_prediction_feedback": "analyst",
  "get_live_quote": "analyst",
  "get_price_history": "analyst",
  "get_economic_calendar": "analyst",
  "web_search": "analyst",
  "search_knowledge": "analyst",
  "read_knowledge": "analyst",
  "explore_connections": "analyst",
  "get_timeline": "analyst",
  "get_esoteric_reading": "analyst",
  "get_game_theory": "analyst",
  "get_iw_status": "analyst",
  "get_narratives": "analyst",

  // Operator tools (advanced analytics + trading)
  "get_market_regime": "operator",
  "get_systemic_risk": "operator",
  "get_economic_nowcast": "operator",
  "get_change_points": "operator",
  "get_gpr_index": "operator",
  "get_gamma_exposure": "operator",
  "get_short_interest": "operator",
  "get_options_flow": "operator",
  "get_correlation_monitor": "operator",
  "get_shipping_intelligence": "operator",
  "get_on_chain": "operator",
  "get_ai_progression": "operator",
  "get_prediction_markets": "operator",
  "get_congressional_trading": "operator",
  "monte_carlo_simulation": "operator",
  "get_portfolio": "operator",
  "get_portfolio_risk": "operator",
  "simulate_scenario_impact": "operator",
  "get_macro_data": "operator",
  "analyze_central_bank_statement": "operator",
  "create_ach_analysis": "operator",
  "assess_source_reliability": "operator",
  "get_collection_gaps": "operator",
  "get_osint_events": "operator",
  "extract_osint_entities": "operator",
  "save_to_knowledge": "operator",
  "add_knowledge": "operator",
  "get_operator_context": "operator",

  // Memory & artifacts (all tiers)
  "recall_memory": "analyst",
  "save_memory": "analyst",
  "delete_memory": "analyst",
  "create_artifact": "analyst",
  "save_document_to_knowledge": "operator",
};

// ── Page → Minimum Tier (for client-side UpgradeGate) ──
export const PAGE_TIERS: Record<string, MinTier> = {
  // Analyst
  "/chat": "analyst",
  "/signals": "analyst",
  "/predictions": "analyst",
  "/news": "analyst",
  "/dashboard": "free",
  "/calendar": "analyst",
  "/timeline": "analyst",
  "/alerts": "analyst",
  "/warroom": "free",
  "/game-theory": "analyst",
  "/graph": "analyst",
  "/narrative": "analyst",
  "/knowledge": "analyst",
  "/parallels": "analyst",
  "/actors": "analyst",
  "/longevity": "analyst",
  // Operator
  "/trading": "operator",
  "/markets": "operator",
  "/watchlists": "operator",
  "/on-chain": "operator",
  "/gex": "operator",
  "/short-interest": "operator",
  "/simulation": "operator",
  "/prediction-markets": "operator",
  "/congressional-trading": "operator",
  "/ai-progression": "operator",
  "/gpr": "operator",
  "/bocpd": "operator",
  "/shipping": "operator",
  "/trade-lab": "operator",
  "/thesis": "operator",
  "/dashboard/operator": "operator",
};
