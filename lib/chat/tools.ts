import { db, schema } from "@/lib/db";
import { eq, desc, gte, lte } from "drizzle-orm";
import { SCENARIOS } from "@/lib/game-theory/actors";
import { analyzeScenario } from "@/lib/game-theory/analysis";
import { Trading212Client } from "@/lib/trading212/client";
import { getQuote, getDailySeries } from "@/lib/market-data/alpha-vantage";
import { getEsotericReading } from "@/lib/signals/numerology";
import { getEconomicCalendarEvents } from "@/lib/signals/economic-calendar";
import { getHijriDateInfo } from "@/lib/signals/islamic-calendar";
import { getPutCallRatio } from "@/lib/market-data/options-flow";
import { extractEntities } from "@/lib/osint/entity-extractor";
import { loadPrompt } from "@/lib/prompts/loader";
import { searchKnowledge, getRelevantKnowledge } from "@/lib/knowledge/engine";
import type Anthropic from "@anthropic-ai/sdk";

// ── Tool Definitions (Anthropic format) ──

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "get_signals",
    description:
      "Retrieve convergence signals (celestial, hebrew, geopolitical events). Use this to answer questions about upcoming events, signal intensity, convergences, and timelines.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["upcoming", "active", "passed"],
          description: "Filter by signal status. Defaults to upcoming.",
        },
        min_intensity: {
          type: "number",
          description: "Minimum intensity level (1-5). Defaults to 1.",
        },
        limit: {
          type: "number",
          description: "Max results to return. Defaults to 20.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_market_snapshot",
    description:
      "Get the latest cached technical analysis snapshot for a symbol. Includes RSI, MACD, Bollinger Bands, ATR, trend, momentum, and volatility regime.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol (e.g. SPY, QQQ, AAPL).",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_market_sentiment",
    description:
      "Get the latest cached market sentiment data including VIX regime, fear/greed composite, and sector rotation. This reads from the most recent thesis run.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_game_theory",
    description:
      "Run deterministic game theory analysis on geopolitical scenarios. Returns Nash equilibria, Schelling points, escalation ladders, dominant strategies, and market assessment. Available scenarios: taiwan-strait, iran-nuclear, opec-production.",
    input_schema: {
      type: "object" as const,
      properties: {
        scenario_id: {
          type: "string",
          description:
            "Specific scenario ID to analyze. If omitted, analyzes all scenarios.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_active_thesis",
    description:
      "Get the current active intelligence thesis/briefing. Includes executive summary, situation assessment, risk scenarios, trading actions, market regime, and confidence levels.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_predictions",
    description:
      "Get tracked predictions with their outcomes. Predictions are time-bound claims tied to signals with confidence scores.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["pending", "confirmed", "denied", "partial", "expired"],
          description:
            "Filter by outcome status. Omit for all predictions.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_prediction_feedback",
    description:
      "Get the prediction system's self-learning performance report. Returns Brier score, log-loss, calibration analysis by confidence band, category-level accuracy, timeframe performance, failure patterns, resolution bias detection, and trend direction. Use this to answer questions about prediction accuracy, calibration quality, or which categories/timeframes perform best.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_portfolio",
    description:
      "Get the current Trading 212 portfolio including positions, P&L, and account value. This calls the live API.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_live_quote",
    description:
      "Get a real-time stock quote from Alpha Vantage. Returns current price, change, change%, and volume. Use this for live pricing data.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol. Stocks: AAPL, MSFT, SPY. Crypto: BTC, ETH, XRP, SOL (or BTC-USD, XRP-USD). Indices: use ETF equivalents (SPY not ^SPX, QQQ not ^NDX).",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_price_history",
    description:
      "Get daily OHLCV price history for a symbol. Supports stocks (AAPL, SPY) and crypto (BTC, XRP, ETH). Returns up to 100 recent bars (compact) or full history. Use this for trend analysis, support/resistance, and Monte Carlo inputs.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol. Stocks: AAPL, SPY. Crypto: BTC, XRP, SOL (or BTC-USD format).",
        },
        full: {
          type: "boolean",
          description: "If true, returns full 20-year history. Default false (100 bars).",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "monte_carlo_simulation",
    description:
      "Run a Monte Carlo simulation on a symbol's price. Supports stocks and crypto (BTC, XRP, ETH). Uses historical daily returns to simulate future paths. Returns percentile outcomes (5th, 25th, 50th, 75th, 95th) at the target horizon. Use for probability-weighted price forecasting.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol. Stocks: SPY, AAPL. Crypto: BTC, XRP, SOL.",
        },
        days: {
          type: "number",
          description: "Forecast horizon in trading days (e.g. 21 for 1 month, 63 for 3 months, 252 for 1 year). Default 63.",
        },
        simulations: {
          type: "number",
          description: "Number of simulation paths. Default 10000.",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for real-time news, geopolitical events, market analysis, or any current information. Use this when the user asks about current events, breaking news, or anything requiring up-to-date information beyond what's in the database.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query. Be specific for better results.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_osint_events",
    description:
      "Get OSINT events from the GDELT database. Returns recent conflict/crisis events with geolocation, actors, and tone analysis. Sourced from global news monitoring.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query for GDELT (e.g. 'Iran', 'oil', 'Taiwan', 'sanctions').",
        },
        limit: {
          type: "number",
          description: "Max results. Default 20.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_esoteric_reading",
    description:
      "Get the full esoteric/numerological reading for a date. Includes Chinese Sexagenary Cycle, Five Elements, Flying Stars, lunar phase, Gann cycles, Armstrong Pi Cycle, Kondratieff wave, universal year, Chinese numerology score, and composite outlook. Use for calendar convergence analysis.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "ISO date string (YYYY-MM-DD). Defaults to today.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_economic_calendar",
    description:
      "Get upcoming economic events: FOMC decisions, NFP reports, CPI releases, GDP prints, and earnings season dates. Use to identify macro catalysts and timing for entry/exit.",
    input_schema: {
      type: "object" as const,
      properties: {
        days_ahead: {
          type: "number",
          description: "How many days ahead to look. Default 30.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_options_flow",
    description:
      "Get options market data including put/call ratio, VIX-implied sentiment, and unusual activity detection for a specific symbol. Use for gauging market fear/greed and smart money positioning.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Optional ticker for symbol-specific options metrics. Omit for aggregate P/C ratio.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_portfolio_risk",
    description:
      "Get full portfolio risk analytics: VaR (95%/99%), CVaR, beta, Sharpe ratio, correlation matrix, stress test results (Oil Shock, Rate Spike, China-Taiwan, Pandemic, Dollar Crash, Credit Crisis), and concentration risk.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "extract_osint_entities",
    description:
      "Run entity extraction on recent OSINT news. Returns actors, locations, topics, tickers, and scenario matches from global news monitoring. Automatically links entities to the knowledge graph.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query for OSINT articles. Default: general conflict/crisis news.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_macro_data",
    description:
      "Get macroeconomic data from FRED. Returns key indicators: Fed Funds Rate, Treasury yields (2Y/10Y/30Y), yield curve spread, unemployment, jobless claims, CPI, breakeven inflation, consumer sentiment, VIX, gold, oil, dollar index, M2, Fed balance sheet, credit spreads, GDP growth. Use for macro analysis and regime assessment.",
    input_schema: {
      type: "object" as const,
      properties: {
        series: {
          type: "string",
          description: "Specific FRED series ID (e.g. UNRATE, DGS10, VIXCLS). Omit for full macro snapshot.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_operator_context",
    description:
      "Get the operator's master thesis, confirmed events, active financial positions, probability model, and analytical framework. ALWAYS call this at the start of any conversation about geopolitics, market positioning, pension allocation, or trade ideas. This provides critical context about active conflicts, chokepoint closures, and the operator's directional thesis that prevents peacetime model errors.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_knowledge",
    description:
      "Search the knowledge bank for relevant context. Use this to find stored theses, world models, event analyses, actor profiles, and market intelligence. Always search before making predictions or analyses to ground your reasoning in stored knowledge.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query - keywords or topics to search for",
        },
        category: {
          type: "string",
          description: "Optional category filter",
          enum: [
            "thesis",
            "model",
            "event",
            "actor",
            "market",
            "geopolitical",
            "technical",
          ],
        },
        topics: {
          type: "array",
          items: { type: "string" },
          description: "Multiple topic keywords to search across",
        },
      },
      required: ["query"],
    },
  },
];

// ── Tool Execution ──

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "get_signals":
      return executeGetSignals(input);
    case "get_market_snapshot":
      return executeGetMarketSnapshot(input);
    case "get_market_sentiment":
      return executeGetMarketSentiment();
    case "get_game_theory":
      return executeGetGameTheory(input);
    case "get_active_thesis":
      return executeGetActiveThesis();
    case "get_predictions":
      return executeGetPredictions(input);
    case "get_prediction_feedback":
      return executeGetPredictionFeedback();
    case "get_portfolio":
      return executeGetPortfolio();
    case "get_live_quote":
      return executeGetLiveQuote(input);
    case "get_price_history":
      return executeGetPriceHistory(input);
    case "monte_carlo_simulation":
      return executeMonteCarloSimulation(input);
    case "web_search":
      return executeWebSearch(input);
    case "get_osint_events":
      return executeGetOsintEvents(input);
    case "get_esoteric_reading":
      return executeGetEsotericReading(input);
    case "get_economic_calendar":
      return executeGetEconomicCalendar(input);
    case "get_options_flow":
      return executeGetOptionsFlow(input);
    case "get_portfolio_risk":
      return executeGetPortfolioRisk();
    case "extract_osint_entities":
      return executeExtractOsintEntities(input);
    case "get_macro_data":
      return executeGetMacroData(input);
    case "get_operator_context":
      return { briefing: await loadPrompt("operator_briefing") };
    case "search_knowledge":
      return executeSearchKnowledge(input);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function executeGetSignals(input: Record<string, unknown>) {
  const status = (input.status as string) || "upcoming";
  const minIntensity = (input.min_intensity as number) || 1;
  const limit = (input.limit as number) || 20;

  const allSignals = await db
    .select()
    .from(schema.signals)
    .where(eq(schema.signals.status, status))
    .orderBy(schema.signals.date)
    ;
  const rows = allSignals
    .filter((s) => s.intensity >= minIntensity)
    .slice(0, limit);

  return {
    count: rows.length,
    signals: rows.map((s) => ({
      id: s.id,
      title: s.title,
      date: s.date,
      endDate: s.endDate,
      intensity: s.intensity,
      category: s.category,
      layers: JSON.parse(s.layers),
      marketSectors: s.marketSectors ? JSON.parse(s.marketSectors) : [],
      status: s.status,
      description: s.description,
    })),
  };
}

async function executeGetMarketSnapshot(input: Record<string, unknown>) {
  const symbol = (input.symbol as string).toUpperCase();

  const [row] = await db
    .select()
    .from(schema.marketSnapshots)
    .where(eq(schema.marketSnapshots.symbol, symbol))
    .orderBy(desc(schema.marketSnapshots.createdAt))
    .limit(1);

  if (!row) {
    return {
      error: `No cached snapshot for ${symbol}. Run a thesis generation first to populate market data.`,
    };
  }

  return {
    symbol,
    snapshot: JSON.parse(row.snapshot),
    cachedAt: row.createdAt,
  };
}

async function executeGetMarketSentiment() {
  // Read from the most recent active thesis's layerInputs
  const [thesis] = await db
    .select()
    .from(schema.theses)
    .orderBy(desc(schema.theses.generatedAt))
    .limit(1);

  if (!thesis) {
    return {
      error:
        "No thesis data available. Run a thesis generation first to populate sentiment data.",
    };
  }

  const layerInputs = JSON.parse(thesis.layerInputs);
  const sentiment = layerInputs?.market?.sentiment;

  if (!sentiment) {
    return {
      error: "No sentiment data in latest thesis.",
    };
  }

  return {
    ...sentiment,
    thesisGeneratedAt: thesis.generatedAt,
  };
}

async function executeGetGameTheory(input: Record<string, unknown>) {
  const scenarioId = input.scenario_id as string | undefined;

  if (scenarioId) {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) {
      return {
        error: `Unknown scenario: ${scenarioId}. Available: ${SCENARIOS.map((s) => s.id).join(", ")}`,
      };
    }
    const analysis = analyzeScenario(scenario);
    return {
      scenario: { id: scenario.id, title: scenario.title, description: scenario.description },
      analysis,
    };
  }

  // Analyze all scenarios
  const results = SCENARIOS.map((scenario) => ({
    scenario: { id: scenario.id, title: scenario.title, description: scenario.description },
    analysis: analyzeScenario(scenario),
  }));

  return { scenarios: results };
}

async function executeGetActiveThesis() {
  const [thesis] = await db
    .select()
    .from(schema.theses)
    .where(eq(schema.theses.status, "active"))
    .orderBy(desc(schema.theses.generatedAt))
    .limit(1);

  if (!thesis) {
    return { error: "No active thesis found." };
  }

  return {
    id: thesis.id,
    title: thesis.title,
    status: thesis.status,
    generatedAt: thesis.generatedAt,
    validUntil: thesis.validUntil,
    marketRegime: thesis.marketRegime,
    volatilityOutlook: thesis.volatilityOutlook,
    convergenceDensity: thesis.convergenceDensity,
    overallConfidence: thesis.overallConfidence,
    tradingActions: JSON.parse(thesis.tradingActions),
    executiveSummary: thesis.executiveSummary,
    situationAssessment: thesis.situationAssessment,
    riskScenarios: thesis.riskScenarios,
    symbols: JSON.parse(thesis.symbols),
  };
}

async function executeGetPredictions(input: Record<string, unknown>) {
  const status = input.status as string | undefined;

  let rows;
  if (status) {
    if (status === "pending") {
      // Pending means outcome is null
      const allPreds = await db
        .select()
        .from(schema.predictions)
        .orderBy(desc(schema.predictions.createdAt));
      rows = allPreds.filter((p) => !p.outcome);
    } else {
      rows = await db
        .select()
        .from(schema.predictions)
        .where(eq(schema.predictions.outcome, status))
        .orderBy(desc(schema.predictions.createdAt));
    }
  } else {
    rows = await db
      .select()
      .from(schema.predictions)
      .orderBy(desc(schema.predictions.createdAt));
  }

  return {
    count: rows.length,
    predictions: rows.map((p) => ({
      id: p.id,
      claim: p.claim,
      timeframe: p.timeframe,
      deadline: p.deadline,
      confidence: p.confidence,
      category: p.category,
      outcome: p.outcome || "pending",
      outcomeNotes: p.outcomeNotes,
      score: p.score,
    })),
  };
}

async function executeGetPredictionFeedback() {
  const { computePerformanceReport } = await import("@/lib/predictions/feedback");
  const report = await computePerformanceReport();
  if (!report) {
    return { message: "Not enough resolved predictions to generate feedback (minimum 5 required)", report: null };
  }
  return {
    totalResolved: report.totalResolved,
    sampleSufficient: report.sampleSufficient,
    brierScore: report.brierScore,
    logLoss: report.logLoss,
    binaryAccuracy: report.binaryAccuracy,
    avgConfidence: report.avgConfidence,
    calibrationGap: report.calibrationGap,
    calibration: report.calibration,
    byCategory: report.byCategory,
    failurePatterns: report.failurePatterns,
    timeframeAccuracy: report.timeframeAccuracy,
    recentTrend: report.recentTrend,
    resolutionBias: report.resolutionBias,
  };
}

async function executeGetPortfolio() {
  // Get API key + secret from settings or env
  const [apiKeySetting] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_api_key"));

  const [apiSecretSetting] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_api_secret"));

  const apiKey = apiKeySetting?.value || process.env.TRADING212_API_KEY;
  const apiSecret = apiSecretSetting?.value || process.env.TRADING212_SECRET;

  if (!apiKey || !apiSecret) {
    return { error: "Trading 212 API key and secret not configured." };
  }

  const [envSetting] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_environment"));

  const environment = (envSetting?.value || "live") as "demo" | "live";
  const client = new Trading212Client(apiKey, apiSecret, environment);

  try {
    const [account, positions] = await Promise.all([
      client.getAccountCash() as Promise<Record<string, unknown>>,
      client.getPositions() as Promise<Array<Record<string, unknown>>>,
    ]);

    return {
      environment,
      account,
      positions: Array.isArray(positions) ? positions : [],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Failed to fetch portfolio: ${message}` };
  }
}

async function getAlphaVantageKey(): Promise<string | null> {
  const [setting] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "alpha_vantage_api_key"));
  return setting?.value || process.env.ALPHA_VANTAGE_API_KEY || null;
}

async function executeGetLiveQuote(input: Record<string, unknown>) {
  const symbol = (input.symbol as string).toUpperCase();
  const apiKey = await getAlphaVantageKey();
  if (!apiKey) return { error: "Alpha Vantage API key not configured." };

  try {
    const quote = await getQuote(symbol, apiKey);
    return quote;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Quote failed for ${symbol}: ${message}` };
  }
}

async function executeGetPriceHistory(input: Record<string, unknown>) {
  const symbol = (input.symbol as string).toUpperCase();
  const full = input.full as boolean || false;
  const apiKey = await getAlphaVantageKey();
  if (!apiKey) return { error: "Alpha Vantage API key not configured." };

  try {
    const bars = await getDailySeries(symbol, apiKey, full ? "full" : "compact");
    const recent = bars.slice(-100);
    const closes = recent.map(b => b.close);
    const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length);

    return {
      symbol,
      bars: recent.length,
      latest: recent[recent.length - 1],
      oldest: recent,
      stats: {
        avgDailyReturn: (avgReturn * 100).toFixed(4) + "%",
        dailyVolatility: (stdDev * 100).toFixed(4) + "%",
        annualizedVol: (stdDev * Math.sqrt(252) * 100).toFixed(2) + "%",
        high52w: Math.max(...closes),
        low52w: Math.min(...closes),
        rangePercent: ((Math.max(...closes) - Math.min(...closes)) / Math.min(...closes) * 100).toFixed(2) + "%",
      },
      recentBars: recent.slice(-10),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Price history failed for ${symbol}: ${message}` };
  }
}

async function executeMonteCarloSimulation(input: Record<string, unknown>) {
  const symbol = (input.symbol as string).toUpperCase();
  const days = (input.days as number) || 63;
  const simulations = Math.min((input.simulations as number) || 10000, 50000);
  const apiKey = await getAlphaVantageKey();
  if (!apiKey) return { error: "Alpha Vantage API key not configured." };

  try {
    const bars = await getDailySeries(symbol, apiKey, "full");
    if (bars.length < 30) return { error: `Not enough historical data for ${symbol}.` };

    const closes = bars.map(b => b.close);
    const returns = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
    const mu = returns.reduce((a, b) => a + b, 0) / returns.length;
    const sigma = Math.sqrt(returns.reduce((s, r) => s + (r - mu) ** 2, 0) / returns.length);
    const currentPrice = closes[closes.length - 1];

    // Run simulations
    const finalPrices: number[] = [];
    for (let sim = 0; sim < simulations; sim++) {
      let price = currentPrice;
      for (let d = 0; d < days; d++) {
        // Box-Muller transform for normal random
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const dailyReturn = mu + sigma * z;
        price *= Math.exp(dailyReturn);
      }
      finalPrices.push(price);
    }

    finalPrices.sort((a, b) => a - b);
    const percentile = (p: number) => finalPrices[Math.floor(p * finalPrices.length / 100)];

    const probAbove = finalPrices.filter(p => p > currentPrice).length / simulations;
    const probDown10 = finalPrices.filter(p => p < currentPrice * 0.9).length / simulations;
    const probUp10 = finalPrices.filter(p => p > currentPrice * 1.1).length / simulations;

    return {
      symbol,
      currentPrice,
      horizonDays: days,
      simulations,
      historicalBarsUsed: returns.length,
      dailyMu: (mu * 100).toFixed(4) + "%",
      dailySigma: (sigma * 100).toFixed(4) + "%",
      annualizedVol: (sigma * Math.sqrt(252) * 100).toFixed(2) + "%",
      percentiles: {
        p5: +percentile(5).toFixed(2),
        p10: +percentile(10).toFixed(2),
        p25: +percentile(25).toFixed(2),
        p50: +percentile(50).toFixed(2),
        p75: +percentile(75).toFixed(2),
        p90: +percentile(90).toFixed(2),
        p95: +percentile(95).toFixed(2),
      },
      probabilities: {
        probHigher: +(probAbove * 100).toFixed(1) + "%",
        probDown10pct: +(probDown10 * 100).toFixed(1) + "%",
        probUp10pct: +(probUp10 * 100).toFixed(1) + "%",
      },
      expectedReturn: +((percentile(50) - currentPrice) / currentPrice * 100).toFixed(2) + "%",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Monte Carlo failed for ${symbol}: ${message}` };
  }
}

async function searchGoogleNewsRSS(query: string) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Google News RSS failed: ${res.status}`);
  const xml = await res.text();

  const articles: Array<{ title: string; url: string; source: string; date: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && articles.length < 15) {
    const item = match[1];
    const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") || "";
    const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
    const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
    const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "";
    articles.push({ title, url: link, source, date: pubDate });
  }
  return articles;
}

async function executeWebSearch(input: Record<string, unknown>) {
  const query = input.query as string;
  if (!query) return { error: "Query required" };

  try {
    // Try GDELT first
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=15&format=json&sort=DateDesc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (res.ok) {
      const data = await res.json();
      const articles = data.articles || [];
      return {
        query,
        source: "gdelt",
        resultCount: articles.length,
        articles: articles.slice(0, 15).map((a: Record<string, unknown>) => ({
          title: a.title,
          url: a.url,
          source: a.domain || a.sourcecountry,
          date: a.seendate,
          language: a.language,
          tone: a.tone,
        })),
      };
    }

    // Fallback to Google News RSS
    const gnArticles = await searchGoogleNewsRSS(query);
    return {
      query,
      source: "google_news",
      resultCount: gnArticles.length,
      articles: gnArticles,
    };
  } catch {
    // Final fallback attempt
    try {
      const gnArticles = await searchGoogleNewsRSS(query);
      return {
        query,
        source: "google_news",
        resultCount: gnArticles.length,
        articles: gnArticles,
      };
    } catch (err2: unknown) {
      const message = err2 instanceof Error ? err2.message : "Unknown error";
      return { error: `Web search failed: ${message}` };
    }
  }
}

async function executeGetOsintEvents(input: Record<string, unknown>) {
  const query = input.query as string;
  const limit = (input.limit as number) || 20;

  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${limit}&format=json&sort=DateDesc&timespan=7d`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (res.ok) {
      const data = await res.json();
      const articles = data.articles || [];
      return {
        query,
        source: "gdelt",
        timespan: "7 days",
        resultCount: articles.length,
        events: articles.map((a: Record<string, unknown>) => ({
          title: a.title,
          url: a.url,
          source: a.domain,
          country: a.sourcecountry,
          date: a.seendate,
          tone: a.tone,
          language: a.language,
        })),
      };
    }

    // Fallback to Google News RSS
    const gnArticles = await searchGoogleNewsRSS(query);
    return {
      query,
      source: "google_news",
      timespan: "recent",
      resultCount: gnArticles.length,
      events: gnArticles.map(a => ({
        title: a.title,
        url: a.url,
        source: a.source,
        date: a.date,
      })),
    };
  } catch {
    try {
      const gnArticles = await searchGoogleNewsRSS(query);
      return {
        query,
        source: "google_news",
        timespan: "recent",
        resultCount: gnArticles.length,
        events: gnArticles.map(a => ({
          title: a.title,
          url: a.url,
          source: a.source,
          date: a.date,
        })),
      };
    } catch (err2: unknown) {
      const message = err2 instanceof Error ? err2.message : "Unknown error";
      return { error: `OSINT query failed: ${message}` };
    }
  }
}

async function executeGetEsotericReading(input: Record<string, unknown>) {
  const dateStr = input.date as string;
  const d = dateStr ? new Date(dateStr + "T12:00:00Z") : new Date();

  try {
    const reading = getEsotericReading(d);
    const hijri = getHijriDateInfo(d);

    return {
      date: d.toISOString().split("T"),
      hijri: {
        date: hijri.hijriDate,
        month: hijri.monthName,
        isRamadan: hijri.isRamadan,
        isSacredMonth: hijri.isSacredMonth,
      },
      chinese: {
        cycle: reading.sexagenaryCycle.label,
        animal: reading.sexagenaryCycle.animal,
        element: reading.sexagenaryCycle.element,
        polarity: reading.sexagenaryCycle.polarity,
        harmonies: reading.sexagenaryCycle.harmonies,
        clashes: reading.sexagenaryCycle.clashes,
      },
      flyingStars: {
        center: reading.flyingStars.centerStar,
        name: reading.flyingStars.starInfo.name,
        nature: reading.flyingStars.starInfo.nature,
        financial: reading.flyingStars.starInfo.financial,
      },
      lunar: {
        phase: reading.lunarPhase.phase,
        dayInCycle: +reading.lunarPhase.dayInCycle.toFixed(1),
        illumination: +(reading.lunarPhase.illumination * 100).toFixed(0) + "%",
        marketBias: reading.lunarPhase.marketBias,
        basisPoints: reading.lunarPhase.basisPoints,
      },
      numerology: {
        score: reading.chineseNumerology.totalScore,
        sentiment: reading.chineseNumerology.sentiment,
        patterns: reading.chineseNumerology.patterns,
      },
      universalYear: reading.universalYear,
      kondratieff: reading.kondratieff,
      piCycle: reading.piCycle.filter(p => Math.abs(p.daysFromNow) <= 365),
      compositeScore: +reading.compositeScore.toFixed(1),
      compositeOutlook: reading.compositeOutlook,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Esoteric reading failed: ${message}` };
  }
}

async function executeGetEconomicCalendar(input: Record<string, unknown>) {
  const daysAhead = (input.days_ahead as number) || 30;
  const today = new Date().toISOString().split("T");
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  const futureStr = future.toISOString().split("T");

  const year = new Date().getFullYear();
  const events = [
    ...getEconomicCalendarEvents(year),
    ...getEconomicCalendarEvents(year + 1),
  ].filter(e => e.date >= today && e.date <= futureStr);

  return {
    daysAhead,
    eventCount: events.length,
    events: events.map(e => ({
      date: e.date,
      name: e.holiday,
      type: e.type,
      significance: e.significance,
      marketRelevance: e.marketRelevance,
    })),
  };
}

async function executeGetOptionsFlow(input: Record<string, unknown>) {
  try {
    const pcr = await getPutCallRatio();
    if (!pcr) return { error: "Could not fetch options data" };

    const result: Record<string, unknown> = { putCallRatio: pcr };

    // If symbol specified, get symbol-specific metrics
    const symbol = input.symbol as string;
    if (symbol) {
      const apiKey = await getAlphaVantageKey();
      if (apiKey) {
        const { estimateOptionsMetrics } = await import("@/lib/market-data/options-flow");
        const bars = await getDailySeries(symbol.toUpperCase(), apiKey, "compact");
        const quote = await getQuote(symbol.toUpperCase(), apiKey);
        const closes = bars.map(b => b.close);
        const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
        const volumes = bars.map(b => b.volume);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

        result.symbolMetrics = estimateOptionsMetrics(
          symbol.toUpperCase(), quote.price, returns, quote.volume, avgVolume
        );
      }
    }

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Options flow failed: ${message}` };
  }
}

async function executeGetPortfolioRisk() {
  try {
    const port = process.env.PORT || "3000";
    const res = await fetch(`http://localhost:${port}/api/portfolio/risk`);
    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Portfolio risk failed: ${message}` };
  }
}

async function executeExtractOsintEntities(input: Record<string, unknown>) {
  const query = (input.query as string) || "";

  try {
    let articles: Array<Record<string, unknown>> = [];

    // Try GDELT first, fallback to Google News RSS
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query || "conflict OR crisis OR military")}&mode=ArtList&maxrecords=20&format=json&sort=DateDesc&timespan=3d`;
    const res = await fetch(gdeltUrl, { signal: AbortSignal.timeout(10000) });

    if (res.ok) {
      const data = await res.json();
      articles = (data.articles || []) as Array<Record<string, unknown>>;
    } else {
      const gnArticles = await searchGoogleNewsRSS(query || "conflict crisis military");
      articles = gnArticles.map(a => ({ title: a.title, url: a.url, domain: a.source, seendate: a.date }));
    }

    const results = articles.map(a => ({
      title: a.title as string,
      ...extractEntities(a.title as string),
    }));

    // Aggregate
    const actorCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    const scenarioCounts: Record<string, number> = {};

    for (const r of results) {
      for (const a of r.actors) actorCounts[a] = (actorCounts[a] || 0) + 1;
      for (const t of r.topics) topicCounts[t] = (topicCounts[t] || 0) + 1;
      for (const s of r.scenarios) scenarioCounts[s] = (scenarioCounts[s] || 0) + 1;
    }

    return {
      articlesProcessed: articles.length,
      topActors: Object.entries(actorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      topTopics: Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      scenarioMatches: Object.entries(scenarioCounts).sort((a, b) => b[1] - a[1]),
      criticalArticles: results.filter(r => r.urgency === "critical" || r.urgency === "high"),
      sentimentBreakdown: {
        positive: results.filter(r => r.sentiment === "positive").length,
        neutral: results.filter(r => r.sentiment === "neutral").length,
        negative: results.filter(r => r.sentiment === "negative").length,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `OSINT extraction failed: ${message}` };
  }
}

async function executeGetMacroData(input: Record<string, unknown>) {
  const series = input.series as string;

  try {
    if (series) {
      const fred = await import("@/lib/market-data/fred");
      const seriesData = await fred.getFredSeries(series, 30);
      const allSeries = fred.FRED_SERIES as Record<string, { id: string; name: string; unit: string }>;
      const info = Object.values(allSeries).find(s => s.id === series);
      return {
        id: series,
        name: info?.name || series,
        unit: info?.unit || "",
        latest: seriesData.length > 0 ? seriesData[seriesData.length - 1] : null,
        history: seriesData,
      };
    }

    // Full macro snapshot
    const fred = await import("@/lib/market-data/fred");
    const snapshot = await fred.getMacroSnapshot();

    // Summarize for the AI (full history is too large)
    const summary: Record<string, { name: string; value: number | null; change: number | null; unit: string }> = {};
    for (const [key, seriesData] of Object.entries(snapshot)) {
      summary[key] = {
        name: seriesData.name,
        value: seriesData.latest?.value ?? null,
        change: seriesData.changePercent != null ? +seriesData.changePercent.toFixed(2) : null,
        unit: seriesData.unit,
      };
    }

    return { snapshot: summary };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Macro data failed: ${message}. Make sure FRED_API_KEY is set in .env.local` };
  }
}

async function executeSearchKnowledge(input: Record<string, unknown>) {
  const query = input.query as string;
  const category = input.category as string | undefined;
  const topics = input.topics as string[] | undefined;

  try {
    let results;

    if (topics && topics.length > 0) {
      results = await getRelevantKnowledge([query, ...topics], 10);
    } else {
      results = await searchKnowledge(query, {
        category,
        limit: 10,
      });
    }

    return {
      query,
      resultCount: results.length,
      entries: results.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        confidence: r.confidence,
        tags: r.tags ? JSON.parse(r.tags) : [],
        source: r.source,
        status: r.status,
        contentPreview: r.content.slice(0, 500) + (r.content.length > 500 ? "..." : ""),
        content: r.content,
        validFrom: r.validFrom,
        validUntil: r.validUntil,
        createdAt: r.createdAt,
      })),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Knowledge search failed: ${message}` };
  }
}
