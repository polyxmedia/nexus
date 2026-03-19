/**
 * Financial Intelligence Router
 *
 * Regex-based sub-tool routing for the get_financial_intelligence meta-tool.
 * No LLM call - fast pattern matching to determine which financial tools to run.
 */

interface RoutedTool {
  toolName: string;
  toolInput: Record<string, unknown>;
}

const TOOL_PATTERNS: Array<{ pattern: RegExp; tools: string[] }> = [
  // Technical analysis
  { pattern: /\b(technical|rsi|macd|chart|bollinger|trend|momentum)\b/i, tools: ["get_price_history", "get_market_snapshot"] },
  // Options
  { pattern: /\b(option|put.*call|gamma|gex|greeks|implied vol|iv|skew)\b/i, tools: ["get_options_flow", "get_gamma_exposure"] },
  // Macro
  { pattern: /\b(macro|gdp|inflation|fed|fomc|cpi|interest rate|yield|unemployment|recession|economic)\b/i, tools: ["get_macro_data"] },
  // Short interest
  { pattern: /\b(short|squeeze|short interest|borrow)\b/i, tools: ["get_short_interest"] },
  // Valuation / DCF
  { pattern: /\b(valuation|dcf|fair value|intrinsic|overvalued|undervalued|worth|pe ratio)\b/i, tools: ["dcf_valuation"] },
  // Monte Carlo
  { pattern: /\b(monte carlo|simulation|probability distribution|var)\b/i, tools: ["monte_carlo_simulation"] },
  // Sentiment
  { pattern: /\b(sentiment|fear|greed|mood|social)\b/i, tools: ["get_market_sentiment", "get_social_sentiment"] },
  // On-chain (crypto)
  { pattern: /\b(on.?chain|whale|defi|stablecoin)\b/i, tools: ["get_on_chain"] },
  // Flow / order book
  { pattern: /\b(flow|order book|imbalance|dark pool)\b/i, tools: ["get_flow_imbalance"] },
  // Regime
  { pattern: /\b(regime|correlation|risk.?off|risk.?on)\b/i, tools: ["get_market_regime", "get_correlation_monitor"] },
];

/**
 * Route a financial query to the appropriate sub-tools.
 * Returns deduplicated list of tools with their inputs.
 */
export function routeFinancialQuery(query: string, symbol?: string): RoutedTool[] {
  const matched = new Set<string>();

  // Always include quote if symbol is present
  if (symbol) {
    matched.add("get_live_quote");
  }

  // Pattern match
  for (const { pattern, tools } of TOOL_PATTERNS) {
    if (pattern.test(query)) {
      for (const tool of tools) {
        matched.add(tool);
      }
    }
  }

  // Default bundle: if we have a symbol but no specific patterns matched (just a ticker)
  if (symbol && matched.size <= 1) {
    matched.add("get_live_quote");
    matched.add("get_price_history");
    matched.add("get_market_snapshot");
  }

  // If no symbol and nothing matched, try macro as default
  if (!symbol && matched.size === 0) {
    matched.add("get_macro_data");
    matched.add("get_market_sentiment");
  }

  // Build tool inputs
  const results: RoutedTool[] = [];
  for (const toolName of matched) {
    const toolInput: Record<string, unknown> = {};

    // Tools that need a symbol
    if (symbol) {
      const symbolTools = new Set([
        "get_live_quote", "get_price_history", "get_market_snapshot",
        "get_options_flow", "get_gamma_exposure", "get_short_interest",
        "monte_carlo_simulation", "dcf_valuation", "get_on_chain",
        "get_flow_imbalance",
      ]);
      if (symbolTools.has(toolName)) {
        toolInput.symbol = symbol;
      }
    }

    // Special input mapping
    if (toolName === "get_social_sentiment" && symbol) {
      toolInput.topic = symbol;
    }

    results.push({ toolName, toolInput });
  }

  return results;
}
