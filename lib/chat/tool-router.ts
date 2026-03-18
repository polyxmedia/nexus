import type Anthropic from "@anthropic-ai/sdk";

/** Pattern to detect forecasting/probability questions. Shared with the chat route for preflight gating. */
export const FORECASTING_PATTERN = /\b(probability|probabilit|forecast|predict|will .+ (happen|occur|pass|succeed|fail|win|lose)|chances? of|likelihood|what are the odds|brier|yes or no.*prob|how likely|percent chance|base rate)\b/i;

/**
 * Tool Router — selects relevant tools based on message intent.
 *
 * Instead of sending all 76 tools (~37K tokens) on every API call,
 * we classify the user's message and send only the relevant subset.
 * Core tools (memory, knowledge, artifacts) are always included.
 *
 * This typically reduces tool tokens from ~37K to ~8-15K per call.
 */

// Tools that are ALWAYS sent regardless of message content
const CORE_TOOLS = new Set([
  "recall_memory",
  "save_memory",
  "delete_memory",
  "search_knowledge",
  "save_to_knowledge",
  "create_artifact",
  "web_search",
  "get_operator_context",
  "save_document_to_knowledge",
  "calculate",
]);

// Tool groups by domain
const TOOL_GROUPS: Record<string, string[]> = {
  market: [
    "get_market_snapshot",
    "get_market_sentiment",
    "get_live_quote",
    "get_price_history",
    "monte_carlo_simulation",
    "get_options_flow",
    "get_gamma_exposure",
    "get_short_interest",
    "get_flow_imbalance",
    "get_order_book",
    "get_market_regime",
    "get_correlation_monitor",
  ],
  geopolitical: [
    "get_signals",
    "get_game_theory",
    "create_custom_game_theory",
    "get_actor_profile",
    "get_gpr_index",
    "get_iw_status",
    "run_bayesian_analysis",
    "get_scenario_branches",
    "contagion_analysis",
  ],
  forecasting: [
    "get_signals",
    "get_change_points",
    "search_historical_parallels",
    "run_bayesian_analysis",
    "get_game_theory",
    "get_macro_data",
    "get_actor_profile",
    "get_prediction_markets",
    "get_eschatological_convergence",
  ],
  macro: [
    "get_macro_data",
    "get_economic_nowcast",
    "get_economic_calendar",
    "analyze_central_bank_statement",
    "get_change_points",
  ],
  portfolio: [
    "get_portfolio",
    "get_portfolio_risk",
    "get_unified_portfolio",
    "get_attribution",
    "longevity_risk_analysis",
  ],
  trading: [
    "get_portfolio",
    "get_live_quote",
    "get_market_snapshot",
    "manage_execution_rules",
    "get_execution_log",
    "toggle_kill_switch",
  ],
  osint: [
    "get_osint_events",
    "extract_osint_entities",
    "get_vessel_tracking",
    "get_vip_movements",
    "get_shipping_intelligence",
    "get_narratives",
    "assess_source_reliability",
  ],
  predictions: [
    "get_predictions",
    "create_prediction",
    "resolve_prediction",
    "get_prediction_feedback",
    "get_prediction_markets",
    "place_polymarket_order",
    "get_polymarket_positions",
    "cancel_polymarket_order",
  ],
  thesis: [
    "get_active_thesis",
    "generate_thesis",
    "generate_narrative_report",
    "generate_document",
  ],
  intelligence: [
    "get_timeline",
    "get_collection_gaps",
    "get_systemic_risk",
    "get_congressional_trading",
    "get_ai_progression",
    "analyze_ach",
    "get_eschatological_convergence",
  ],
  crypto: [
    "get_on_chain",
    "get_live_quote",
    "get_price_history",
  ],
  esoteric: [
    "get_esoteric_reading",
    "get_economic_calendar",
    "get_signals",
  ],
  sentiment: [
    "analyze_sentiment",
    "get_sentiment_trends",
    "get_narratives",
  ],
  supply_chain: [
    "get_supply_chain",
    "analyze_supply_chain_exposure",
  ],
  satellite: [
    "get_satellite_imagery",
  ],
  ml: [
    "get_ml_models",
    "get_feature_importance",
  ],
};

// Keyword patterns that activate tool groups
const GROUP_TRIGGERS: Array<{ pattern: RegExp; groups: string[] }> = [
  // Market & trading
  { pattern: /\b(price|stock|ticker|rsi|macd|bollinger|technical|chart|quote|entry|exit|target|spy|qqq|aapl|nvda|tsla|goog|amzn|msft|amd|buy|sell|trade|position|long|short|options?|gamma|gex|put.?call|order book|flow|imbalance)\b/i, groups: ["market", "trading"] },
  // Geopolitical
  { pattern: /\b(geopolit|war|conflict|iran|china|taiwan|russia|ukraine|nato|military|strike|escala|nuclear|houthi|hezbollah|hamas|sanctions?|territory|actor|nash|game theory|schelling|equilibri)\b/i, groups: ["geopolitical"] },
  // Eschatological convergence
  { pattern: /\b(eschatolog|temple mount|third temple|mahdi|caliphate|end.?times|apocalyp|prophecy|theological|divine mandate|no.?off.?ramp|al.?aqsa|holy site|sacred|messianic|katechon|third rome|ottoman|fulfilment theolog)\b/i, groups: ["forecasting", "geopolitical", "intelligence"] },
  // Forecasting / probability
  { pattern: /\b(probabilit|forecast|predict|will .+ (happen|occur|pass|succeed|fail|win|lose)|chances? of|likelihood|what are the odds|brier|yes or no.*prob|how likely|percent chance|base rate)\b/i, groups: ["forecasting"] },
  // Macro / economic
  { pattern: /\b(macro|gdp|inflation|cpi|fed|fomc|interest rate|yield|unemployment|recession|central bank|monetary|fiscal|treasury|bond|jobs|nfp|economic)\b/i, groups: ["macro"] },
  // Portfolio
  { pattern: /\b(portfolio|risk|var|cvar|sharpe|drawdown|allocation|diversif|hedge|exposure|attribution|pension|retirement|longevity)\b/i, groups: ["portfolio"] },
  // OSINT & intelligence
  { pattern: /\b(osint|vessel|ship|maritime|aircraft|vip|flight|intelligence|source reliab|chokepoint|hormuz|suez|malacca|red sea|shipping|narrative|dark fleet)\b/i, groups: ["osint"] },
  // Predictions
  { pattern: /\b(prediction|polymarket|prediction market|bet|wager|accuracy|calibrat|brier|log.*predict|track.*predict|create.*predict|resolve.*predict|record.*predict)\b/i, groups: ["predictions"] },
  // Thesis & reports
  { pattern: /\b(thesis|briefing|report|narrative report|document|brief me|daily brief|intelligence brief)\b/i, groups: ["thesis"] },
  // Crypto
  { pattern: /\b(crypto|bitcoin|btc|ethereum|eth|defi|on.?chain|whale|stablecoin|coinbase|altcoin|sol|xrp)\b/i, groups: ["crypto"] },
  // Calendar & esoteric
  { pattern: /\b(calendar|esoteric|celestial|lunar|moon|purim|pesach|ramadan|equinox|gann|kondratieff|hebrew|hijri|cycle)\b/i, groups: ["esoteric"] },
  // Sentiment & NLP
  { pattern: /\b(sentiment|tone|hawkish|dovish|fear|greed|mood|opinion|narrative shift)\b/i, groups: ["sentiment"] },
  // Supply chain
  { pattern: /\b(supply chain|supplier|downstream|upstream|disruption|bottleneck|semiconductor|chip|tsmc)\b/i, groups: ["supply_chain"] },
  // Satellite
  { pattern: /\b(satellite|imagery|overhead|visual|sentinel|landsat)\b/i, groups: ["satellite"] },
  // ML
  { pattern: /\b(ml model|machine learn|feature importance|gradient boost|trained model|learned signal)\b/i, groups: ["ml"] },
  // Execution
  { pattern: /\b(execution|kill switch|auto.?trad|execution rule|order count)\b/i, groups: ["trading"] },
  // Congressional
  { pattern: /\b(congress|senator|pelosi|congressional trad|insider trad|politician)\b/i, groups: ["intelligence"] },
];

/**
 * Select tools relevant to the user's message.
 * Always includes core tools. Adds domain-specific tools based on keyword matching.
 * If no keywords match (generic question), includes a broad default set.
 */
export function selectTools(
  allTools: Anthropic.Tool[],
  userMessage: string,
): Anthropic.Tool[] {
  const activatedGroups = new Set<string>();

  for (const trigger of GROUP_TRIGGERS) {
    if (trigger.pattern.test(userMessage)) {
      for (const group of trigger.groups) {
        activatedGroups.add(group);
      }
    }
  }

  // If nothing matched, send a broad default set so the model isn't limited
  if (activatedGroups.size === 0) {
    activatedGroups.add("market");
    activatedGroups.add("geopolitical");
    activatedGroups.add("macro");
    activatedGroups.add("thesis");
    activatedGroups.add("intelligence");
  }

  // Collect all tool names that should be included
  const selectedNames = new Set(CORE_TOOLS);
  for (const group of activatedGroups) {
    const tools = TOOL_GROUPS[group];
    if (tools) {
      for (const name of tools) {
        selectedNames.add(name);
      }
    }
  }

  // Filter from the full list to preserve tool definitions
  return allTools.filter((t) => selectedNames.has(t.name));
}
