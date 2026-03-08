/**
 * Central tier configuration.
 * Defines which features require which minimum tier.
 *
 * ALL enforcement happens server-side via requireTier() in API routes.
 * The client-side UpgradeGate component is UX only and can be bypassed.
 * Never trust the client.
 */

export type MinTier = "analyst" | "operator" | "institution";

// ── API Route → Minimum Tier ──
// Every protected route must call requireTier() with the mapped tier.
// Routes not listed here are either public or require only authentication.
export const ROUTE_TIERS: Record<string, MinTier> = {
  // ── Analyst tier (base paid) ──
  "chat": "analyst",
  "signals": "analyst",
  "predictions": "analyst",
  "thesis": "analyst",
  "news": "analyst",
  "dashboard": "analyst",
  "calendar": "analyst",
  "timeline": "analyst",
  "alerts": "analyst",

  // ── Operator tier (professional) ──
  "warroom": "operator",
  "trading212": "operator",
  "coinbase": "operator",
  "portfolio": "operator",
  "simulation": "operator",
  "game-theory": "operator",
  "iw": "operator",
  "risk": "operator",
  "regime": "operator",
  "nowcast": "operator",
  "bocpd": "operator",
  "gex": "operator",
  "short-interest": "operator",
  "options": "operator",
  "shipping": "operator",
  "nlp": "operator",
  "narrative": "operator",
  "osint": "operator",
  "ach": "operator",
  "sources": "operator",
  "on-chain": "operator",
  "ai-progression": "operator",
  "gpr": "operator",
  "congressional-trading": "operator",
  "prediction-markets": "operator",
  "collection-gaps": "operator",
  "graph": "operator",
  "watchlists": "operator",
  "macro": "operator",
  "market-data": "operator",
  "analytics": "operator",

  // ── Institution tier ──
  "agents": "institution",
  "nexus-bridge": "institution",
};

// ── Chat Tool → Minimum Tier ──
// Tools not listed here default to "analyst" (base paid tier).
export const TOOL_TIERS: Record<string, MinTier> = {
  // Analyst tools (included in base plan)
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
  "get_timeline": "analyst",
  "get_esoteric_reading": "analyst",

  // Operator tools (advanced analytics)
  "get_game_theory": "operator",
  "get_iw_status": "operator",
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
  "get_narratives": "operator",
  "get_prediction_markets": "operator",
  "get_congressional_trading": "operator",
  "monte_carlo_simulation": "operator",
  "get_portfolio": "operator",
  "get_portfolio_risk": "operator",
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
};

// ── Page → Minimum Tier (for client-side UpgradeGate) ──
export const PAGE_TIERS: Record<string, MinTier> = {
  "/chat": "analyst",
  "/signals": "analyst",
  "/predictions": "analyst",
  "/news": "analyst",
  "/dashboard": "analyst",
  "/calendar": "analyst",
  "/timeline": "analyst",
  "/alerts": "analyst",
  "/warroom": "operator",
  "/trading": "operator",
  "/graph": "operator",
};
