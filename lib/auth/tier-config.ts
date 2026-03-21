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
  // ── Free tier - basic access ──
  "dashboard": "free",
  "warroom": "free",

  // ── Observer tier ($199/mo) - core intelligence ──
  "chat": "analyst",
  "signals": "analyst",
  "predictions": "analyst",
  "game-theory": "analyst",
  "calendar": "analyst",
  "timeline": "analyst",
  "alerts": "analyst",
  "news": "analyst",
  "narrative": "analyst",
  "knowledge": "analyst",
  "graph": "analyst",
  "parallels": "analyst",
  "actors": "analyst",
  "iw": "analyst",
  "longevity": "analyst",

  // ── Operator tier ($599/mo) - markets, analytics, trading, advanced intel ──
  "markets": "operator",
  "watchlists": "operator",
  "market-data": "operator",
  "on-chain": "operator",
  "short-interest": "operator",
  "gex": "operator",
  "options": "operator",
  "prediction-markets": "operator",
  "congressional-trading": "operator",
  "ai-progression": "operator",
  "gpr": "operator",
  "bocpd": "operator",
  "macro": "operator",
  "regime": "operator",
  "risk": "operator",
  "nowcast": "operator",
  "analytics": "operator",
  "thesis": "operator",
  "trade-lab": "operator",
  "trading212": "operator",
  "coinbase": "operator",
  "ibkr": "operator",
  "portfolio": "operator",
  "shipping": "operator",
  "nlp": "operator",
  "osint": "operator",
  "ach": "operator",
  "sources": "operator",
  "collection-gaps": "operator",

  // ── Institution tier (custom) - simulation, agents, API access ──
  "simulation": "institution",
  "agents": "institution",
  "nexus-bridge": "institution",
};

// ── Chat Tool → Minimum Tier ──
// Tools not listed here default to "analyst" (base paid tier).
export const TOOL_TIERS: Record<string, MinTier> = {
  // ── Observer tools (core intelligence) ──
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
  "get_country_risk": "analyst",
  "get_cross_stream_alerts": "analyst",
  "get_treasury_auctions": "analyst",
  "get_natural_threats": "analyst",
  "get_timeline": "analyst",
  "get_esoteric_reading": "analyst",
  "get_game_theory": "analyst",
  "get_iw_status": "analyst",
  "get_narratives": "analyst",
  "get_social_sentiment": "analyst",
  "dcf_valuation": "analyst",
  "get_financial_intelligence": "analyst",

  // ── Operator tools (markets, analytics, trading, advanced intel) ──
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
  "get_cot_data": "operator",
  "search_multilang_intel": "operator",
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
  "save_document_to_knowledge": "operator",
  "get_operator_context": "operator",

  // ── Memory & artifacts (all paid tiers) ──
  "recall_memory": "analyst",
  "save_memory": "analyst",
  "delete_memory": "analyst",
  "create_artifact": "analyst",
};

// ── Page → Minimum Tier (for client-side UpgradeGate) ──
export const PAGE_TIERS: Record<string, MinTier> = {
  // ── Free ──
  "/dashboard": "free",
  "/warroom": "free",

  // ── Observer ($199/mo) ──
  "/chat": "analyst",
  "/signals": "analyst",
  "/predictions": "analyst",
  "/news": "analyst",
  "/calendar": "analyst",
  "/timeline": "analyst",
  "/alerts": "analyst",
  "/game-theory": "analyst",
  "/graph": "analyst",
  "/narrative": "analyst",
  "/knowledge": "analyst",
  "/parallels": "analyst",
  "/actors": "analyst",
  "/longevity": "analyst",
  "/dashboard/operator": "analyst",

  // ── Operator ($599/mo) ──
  "/markets": "operator",
  "/watchlists": "operator",
  "/trading": "operator",
  "/on-chain": "operator",
  "/gex": "operator",
  "/short-interest": "operator",
  "/prediction-markets": "operator",
  "/congressional-trading": "operator",
  "/ai-progression": "operator",
  "/gpr": "operator",
  "/bocpd": "operator",
  "/shipping": "operator",
  "/trade-lab": "operator",
  "/thesis": "operator",
  "/sentiment": "operator",

  // ── Institution (custom) ──
  "/simulation": "institution",
};
