import { db, schema } from "@/lib/db";
import { eq, and, desc, gte, lte, ilike, isNull, InferSelectModel } from "drizzle-orm";

type Signal = InferSelectModel<typeof schema.signals>;
type Prediction = InferSelectModel<typeof schema.predictions>;
import { SCENARIOS } from "@/lib/game-theory/actors";
import { analyzeScenario } from "@/lib/game-theory/analysis";
import { getWartimeAnalysis } from "@/lib/game-theory/wartime";
import { Trading212Client } from "@/lib/trading212/client";
import { getQuoteData, getHistoricalData } from "@/lib/market-data/yahoo";
import { computeTechnicalSnapshot } from "@/lib/market-data/indicators";
import { getCyclicalReading } from "@/lib/signals/structural-cycles";
import { getEconomicCalendarEvents } from "@/lib/signals/economic-calendar";
import { getHijriDateInfo } from "@/lib/signals/islamic-calendar";
import { getPutCallRatio } from "@/lib/market-data/options-flow";
import { extractEntities } from "@/lib/osint/entity-extractor";
import { loadPrompt } from "@/lib/prompts/loader";
import { searchKnowledge, getRelevantKnowledge, addKnowledge, getKnowledgeById } from "@/lib/knowledge/engine";
import { getAllScenarioStatuses, evaluateScenario } from "@/lib/iw/engine";
import { detectCurrentRegime, getLatestShifts } from "@/lib/regime/detection";
import { loadRegimeState } from "@/lib/regime/store";
import { computeCorrelationMatrix, getLatestCorrelations } from "@/lib/regime/correlations";
import { getSourceProfile, assessInformation, formatAdmiraltyRating } from "@/lib/sources/reliability";
import { createAnalysis as createACH, addHypothesis as addACHHypothesis, addEvidence as addACHEvidence, evaluateMatrix } from "@/lib/ach/engine";
import { getLatestNowcast, generateNowcast } from "@/lib/nowcast/engine";
import { analyzeCentralBankText } from "@/lib/nlp/central-bank";
import { assessCoverage } from "@/lib/intelligence/collection-gaps";
import { getLatestSystemicRisk, computeSystemicRisk } from "@/lib/risk/systemic";
import { getPredictionMarkets } from "@/lib/prediction-markets";
import { getOnChainSnapshot } from "@/lib/on-chain";
import { getShippingSnapshot } from "@/lib/shipping";
import { getNarrativeSnapshot } from "@/lib/narrative";
import { getBOCPDSnapshot } from "@/lib/bocpd";
import { getShortInterestSnapshot } from "@/lib/short-interest";
import { getGPRSnapshot } from "@/lib/gpr";
import { getGEXSnapshot } from "@/lib/gex";
import { findHistoricalParallels } from "@/lib/parallels/engine";
import { initializeBeliefs, runBayesianAnalysis, createSignalFromOSINT } from "@/lib/game-theory/bayesian";
import { N_PLAYER_SCENARIOS } from "@/lib/game-theory/scenarios-nplayer";
import { getExtendedActorProfile, getAllExtendedProfiles, type ExtendedActorProfile } from "@/lib/actors/profiles";
import { generateNarrativeReport } from "@/lib/reports/narrative";
import { recallMemories, saveMemory, deleteMemory } from "@/lib/memory/engine";
import { create, all as mathjsAll } from "mathjs";
const limitedMath = create(mathjsAll, { number: "number" });
const mathEvaluate = limitedMath.evaluate!.bind(limitedMath);
// Remove dangerous functions after binding evaluate (which depends on parse internally)
const BLOCKED_FNS = ["import", "createUnit", "compile", "derivative", "rationalize", "simplify"];
for (const fn of BLOCKED_FNS) delete (limitedMath as Record<string, unknown>)[fn];
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
      "Run deterministic game theory analysis on geopolitical scenarios. Returns Nash equilibria, Schelling points, escalation ladders, dominant strategies, and market assessment. Available scenarios: taiwan-strait, iran-nuclear, opec-production, russia-ukraine-endgame, us-china-trade-war, hormuz-closure, india-pakistan-kashmir, red-sea-shipping, eu-energy-crisis, dprk-provocation.",
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
    name: "create_custom_game_theory",
    description:
      "Create and analyze a custom game theory scenario with any two actors and their strategies. Use this when the user asks about a hypothetical geopolitical situation, trade war, conflict scenario, or any strategic interaction not covered by the built-in scenarios. You define the actors, their strategies, relevant market sectors, and time horizon. The system generates payoff matrices using strategy classification heuristics and returns full Nash equilibria, dominant strategies, Schelling points, escalation analysis, and market impact assessment.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short title for the scenario, e.g. 'US-Iran Strait of Hormuz Escalation'",
        },
        description: {
          type: "string",
          description: "Brief description of the strategic situation and context",
        },
        actor1_name: {
          type: "string",
          description: "Name of the first actor, e.g. 'United States', 'China', 'OPEC'",
        },
        actor2_name: {
          type: "string",
          description: "Name of the second actor",
        },
        strategies1: {
          type: "array",
          items: { type: "string" },
          description: "2-5 strategies for actor 1. Use descriptive names that indicate intent: e.g. 'Military strike on nuclear facilities', 'Diplomatic negotiations', 'Economic sanctions package', 'Naval blockade'. Strategy names are classified as escalatory/cooperative/economic/moderate to generate payoffs.",
        },
        strategies2: {
          type: "array",
          items: { type: "string" },
          description: "2-5 strategies for actor 2",
        },
        market_sectors: {
          type: "array",
          items: { type: "string" },
          description: "Affected market sectors: energy, defense, tech, finance, commodities, shipping, crypto, agriculture, healthcare, geopolitics",
        },
        time_horizon: {
          type: "string",
          enum: ["immediate", "short_term", "medium_term", "long_term"],
          description: "Time horizon for the scenario playing out",
        },
      },
      required: ["title", "actor1_name", "actor2_name", "strategies1", "strategies2"],
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
    name: "generate_thesis",
    description:
      "Generate a new intelligence thesis/briefing. Gathers market data, signals, game theory analysis, and produces a full situational assessment with trading actions. Use when the user asks to run a thesis, generate a briefing, refresh the thesis, or when no active thesis exists. Takes an optional array of ticker symbols to focus on (defaults to core watchlist if not provided).",
    input_schema: {
      type: "object" as const,
      properties: {
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "Ticker symbols to analyze (e.g. ['SPY', 'GLD', 'USO']). Defaults to core watchlist if not provided.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_predictions",
    description:
      "Get tracked predictions filtered contextually. Always pass relevant filters based on what the user is asking about rather than loading every prediction.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["pending", "confirmed", "denied", "partial", "expired"],
          description:
            "Filter by outcome status. Use 'pending' for active predictions.",
        },
        category: {
          type: "string",
          enum: ["market", "geopolitical", "celestial"],
          description:
            "Filter by prediction category.",
        },
        search: {
          type: "string",
          description:
            "Search term to match against prediction claims. Use this to find predictions about specific topics, symbols, or events.",
        },
        limit: {
          type: "number",
          description:
            "Max predictions to return. Defaults to 20. Use smaller values for summaries, larger for detailed analysis.",
        },
        days: {
          type: "number",
          description:
            "Only return predictions created within this many days. Defaults to 30. Use 7 for recent, 90 for broader history.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_vip_movements",
    description:
      "Get current positions of high-profile aircraft (heads of state, government, oligarch, military VIP jets). Returns live flight data from ADS-B tracking cross-referenced with the plane-alert-db of 15,000+ known VIP aircraft. Use when analysing geopolitical movements, diplomatic activity, or when specific leaders/governments are relevant to the discussion. Can filter by category or search for specific owners/operators.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["Head of State", "Dictator Alert", "Oligarch", "Governments", "Da Comrade", "Royal Aircraft", "Agency", "all"],
          description: "Filter by VIP category. Use 'all' or omit for everything.",
        },
        search: {
          type: "string",
          description: "Search owner, operator, or registration. E.g. 'Putin', 'Saudi', 'Air Force One'.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_prediction",
    description:
      "Create a new prediction in the tracker. Use this when the user asks you to log, record, create, or track a prediction. Requires a claim, timeframe, deadline, confidence (0-1), and category. Optionally include direction (up/down/flat), price target, reference symbol, and outcome if the prediction is already resolved.",
    input_schema: {
      type: "object" as const,
      properties: {
        claim: {
          type: "string",
          description: "The prediction claim. Be specific and falsifiable.",
        },
        timeframe: {
          type: "string",
          description: "Timeframe for the prediction, e.g. '7 days', '30 days', '48 hours'.",
        },
        deadline: {
          type: "string",
          description: "ISO date string for when the prediction should be resolved, e.g. '2026-03-16'.",
        },
        confidence: {
          type: "number",
          description: "Confidence level 0-1, e.g. 0.675 for 67.5%.",
        },
        category: {
          type: "string",
          enum: ["market", "geopolitical", "celestial"],
          description: "Prediction category.",
        },
        direction: {
          type: "string",
          enum: ["up", "down", "flat"],
          description: "Expected price direction if market-related.",
        },
        priceTarget: {
          type: "number",
          description: "Specific price target if applicable.",
        },
        referenceSymbol: {
          type: "string",
          description: "Reference ticker symbol, e.g. 'WTI', 'SPY'.",
        },
        outcome: {
          type: "string",
          enum: ["confirmed", "denied", "partial", "expired"],
          description: "Outcome if the prediction is already resolved at time of logging.",
        },
        outcomeNotes: {
          type: "string",
          description: "Notes on the outcome, e.g. what happened.",
        },
        score: {
          type: "number",
          description: "Accuracy score 0-1 if already resolved.",
        },
      },
      required: ["claim", "timeframe", "deadline", "confidence", "category"],
    },
  },
  {
    name: "resolve_prediction",
    description:
      "Resolve an existing prediction by marking its outcome. Use this when the user says a prediction was correct, wrong, partially correct, or expired. Search for the prediction first with get_predictions to find its ID or UUID.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "number",
          description: "Prediction ID (from get_predictions results).",
        },
        uuid: {
          type: "string",
          description: "Prediction UUID (alternative to ID).",
        },
        outcome: {
          type: "string",
          enum: ["confirmed", "denied", "partial", "expired"],
          description: "The outcome of the prediction.",
        },
        outcomeNotes: {
          type: "string",
          description: "Notes explaining the outcome.",
        },
        score: {
          type: "number",
          description: "Accuracy score 0-1. Use 1.0 for confirmed, 0.0 for denied, 0.5 for partial.",
        },
      },
      required: ["outcome"],
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
      "Get the user's portfolio. Includes Trading 212 broker positions (if connected) AND manually tracked positions. Returns both sources merged so you can see the full picture.",
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
      "Get daily OHLCV price history with full technical analysis for a symbol. Returns candlestick chart data, RSI(14), MACD(12,26,9), Bollinger Bands, ATR(14), SMAs (20/50/200), trend/momentum/volatility regime classification. Supports stocks (AAPL, SPY) and crypto (BTC, XRP, ETH). ALWAYS use this tool when the user asks about price targets, entry points, technical levels, or chart analysis.",
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
      "Get the full esoteric/numerological reading for a date. Cultural context only — these indicators do NOT feed trading scores or signal intensity. Includes Chinese Sexagenary Cycle, Five Elements, Flying Stars, lunar phase, Gann cycles, Armstrong Pi Cycle, Kondratieff wave, universal year, Chinese numerology score, and composite outlook.",
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
    name: "simulate_scenario_impact",
    description:
      "Simulate how geopolitical scenarios would impact the user's portfolio. Runs all 10 game theory scenarios (Iran Nuclear, Taiwan Strait, OPEC, Russia-Ukraine, etc.) against actual portfolio positions and shows estimated P&L impact per scenario. Use when the user asks 'what if', 'how would X affect my portfolio', 'scenario analysis', 'stress test my positions', or 'geopolitical risk to my portfolio'. Zero AI cost, pure computation.",
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
    name: "get_ai_progression",
    description:
      "Get AI progression data including the Remote Labor Index (automation rate benchmarks from remotelabor.ai), METR time horizons (task completion capability of frontier models), AI 2027 scenario timeline and milestones, sector-level automation risk with adoption rates, and labor displacement indicators. Use this for analysis of AI impact on employment, workforce disruption, automation trends, and technology-driven market shifts.",
    input_schema: {
      type: "object" as const,
      properties: {
        focus: {
          type: "string",
          enum: ["overview", "rli", "metr", "ai2027", "sectors", "displacement"],
          description: "Focus area. 'overview' returns composite score and regime. 'rli' returns Remote Labor Index model benchmarks. 'metr' returns METR time horizons. 'ai2027' returns AI 2027 milestones. 'sectors' returns sector automation risk. 'displacement' returns labor displacement indicators. Defaults to overview.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_prediction_markets",
    description:
      "Get prediction market data from Polymarket and Kalshi. Returns real-time probability pricing on geopolitical events, elections, economic outcomes, and policy decisions. Includes top movers, category filtering, and divergence detection against NEXUS predictions. Use for assessing market-implied probabilities of geopolitical scenarios, comparing against NEXUS confidence scores, and identifying mispricings.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["all", "geopolitical", "economic", "political", "movers"],
          description: "Filter by category. 'movers' returns top 24h movers. Defaults to all.",
        },
      },
      required: [],
    },
  },
  {
    name: "place_polymarket_order",
    description:
      "Place a buy or sell order on Polymarket prediction markets. Requires the user's Polymarket wallet private key to be configured in Settings. Use get_prediction_markets first to find the market and token ID, then place the order. Always confirm the order details with the user before executing.",
    input_schema: {
      type: "object" as const,
      properties: {
        token_id: {
          type: "string",
          description: "The CLOB token ID for the outcome to trade (YES or NO token). Get this from the market data.",
        },
        side: {
          type: "string",
          enum: ["buy", "sell"],
          description: "Whether to buy or sell shares.",
        },
        price: {
          type: "number",
          description: "Limit price per share (0.01 to 0.99). This is the probability you're buying/selling at.",
        },
        size: {
          type: "number",
          description: "Number of shares to trade.",
        },
      },
      required: ["token_id", "side", "price", "size"],
    },
  },
  {
    name: "get_polymarket_positions",
    description:
      "Get the user's current Polymarket positions, open orders, and recent trades. Use this to check what prediction market positions the user holds, their P&L, and any pending orders.",
    input_schema: {
      type: "object" as const,
      properties: {
        view: {
          type: "string",
          enum: ["positions", "orders", "trades", "all"],
          description: "What to retrieve. Defaults to all.",
        },
      },
      required: [],
    },
  },
  {
    name: "cancel_polymarket_order",
    description:
      "Cancel an open order on Polymarket. Use get_polymarket_positions with view='orders' first to find the order ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID to cancel.",
        },
      },
      required: ["order_id"],
    },
  },
  {
    name: "get_congressional_trading",
    description:
      "Get congressional and insider trading data. Returns recent STOCK Act disclosures from House and Senate members, SEC Form 4 insider filings, cluster buy detection (multiple insiders buying same stock), and party/chamber breakdown. Use for detecting informed trading by politicians and corporate insiders, cross-referencing with upcoming catalysts and geopolitical exposure.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Filter trades for a specific ticker symbol. Omit for full snapshot.",
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
  {
    name: "read_knowledge",
    description:
      "Read the full content of a specific knowledge bank entry by its ID. Use this after search_knowledge returns results and you need the complete text of a particular entry. Also use when the user asks you to read or open a specific knowledge entry.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "number",
          description: "The knowledge entry ID to read",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "explore_connections",
    description:
      "Explore the entity graph to find connections around a topic, actor, location, or concept. Use this when the user asks about relationships between entities, 'what is connected to X', 'who is involved with Y', or when you need to understand the broader context around a subject. Returns connected entities and related knowledge.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The entity or topic to explore connections for (e.g. 'Iran', 'oil', 'NATO', 'semiconductor')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_timeline",
    description:
      "Retrieve timeline events from the intelligence timeline. Use when the user asks about recent events, what happened, event history, or wants a chronological view of signals, predictions, trades, or alerts. Supports filtering by type and date range.",
    input_schema: {
      type: "object" as const,
      properties: {
        types: {
          type: "array",
          items: { type: "string", enum: ["signal", "prediction", "trade", "thesis", "alert"] },
          description: "Filter by event types. Omit for all types.",
        },
        limit: {
          type: "number",
          description: "Max events to return. Defaults to 20.",
        },
        from: {
          type: "string",
          description: "ISO date string to filter events from this date onwards.",
        },
        to: {
          type: "string",
          description: "ISO date string to filter events up to this date.",
        },
      },
      required: [],
    },
  },
  {
    name: "save_to_knowledge",
    description:
      "Save important information to the knowledge base for future reference. Use this when the user asks you to remember something, store a thesis, save an analysis, or when you discover critical intelligence worth preserving. Always check for duplicates before saving - if similar knowledge already exists, do not create a duplicate.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short, descriptive title for the knowledge entry",
        },
        content: {
          type: "string",
          description: "The full content/analysis to store",
        },
        category: {
          type: "string",
          enum: ["thesis", "model", "event", "actor", "market", "geopolitical", "technical"],
          description: "Category for the knowledge entry",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Relevant tags for discoverability",
        },
        confidence: {
          type: "number",
          description: "Confidence level 0-1 (e.g. 0.8 for high confidence)",
        },
      },
      required: ["title", "content", "category"],
    },
  },
  { name: "get_iw_status", description: "Get Indications & Warnings status across all threat scenarios. Shows escalation levels, active indicators, scores.", input_schema: { type: "object" as const, properties: { scenario_id: { type: "string", description: "Optional scenario ID" } }, required: [] } },
  { name: "get_market_regime", description: "Get current market regime: volatility, growth, monetary, risk appetite, dollar, commodities. Shows regime shifts.", input_schema: { type: "object" as const, properties: {}, required: [] } },
  { name: "get_correlation_monitor", description: "Cross-asset correlation matrix and break detection. SPY-TLT, Gold-Dollar, VIX-SPY pairs.", input_schema: { type: "object" as const, properties: {}, required: [] } },
  { name: "assess_source_reliability", description: "NATO/Admiralty source reliability rating (A-F, 1-6). Returns bias, specialties, track record.", input_schema: { type: "object" as const, properties: { domain: { type: "string", description: "Domain (e.g. reuters.com)" } }, required: ["domain"] } },
  { name: "create_ach_analysis", description: "Create Analysis of Competing Hypotheses (ACH). CIA structured analytic technique.", input_schema: { type: "object" as const, properties: { title: { type: "string" }, question: { type: "string" }, hypotheses: { type: "array", items: { type: "object", properties: { label: { type: "string" }, description: { type: "string" } } } }, evidence: { type: "array", items: { type: "object", properties: { description: { type: "string" }, source: { type: "string" }, credibility: { type: "string" }, relevance: { type: "string" } } } } }, required: ["title", "question", "hypotheses"] } },
  { name: "get_economic_nowcast", description: "Real-time economic nowcast: GDP, inflation, employment, financial conditions, recession probability.", input_schema: { type: "object" as const, properties: {}, required: [] } },
  { name: "analyze_central_bank_statement", description: "Analyze central bank statement for hawkish/dovish tone, forward guidance, market implications.", input_schema: { type: "object" as const, properties: { text: { type: "string", description: "Statement text" }, institution: { type: "string", description: "Institution name" } }, required: ["text", "institution"] } },
  { name: "get_collection_gaps", description: "Intelligence collection coverage report. Gaps, blind spots, silence detection across 16 critical regions.", input_schema: { type: "object" as const, properties: {}, required: [] } },
  {
    name: "get_systemic_risk",
    description:
      "Get systemic risk assessment: absorption ratio (PCA-based market coupling), turbulence index (Mahalanobis distance), composite stress score, and crisis regime classification. Based on Kritzman et al. (2011) methodology validated across 40+ years. Tracks 11 cross-asset returns (equities, bonds, commodities, FX, VIX).",
    input_schema: {
      type: "object" as const,
      properties: {
        refresh: {
          type: "boolean",
          description: "Force fresh computation (slow, ~20s). Default: return cached latest.",
        },
      },
      required: [],
    },
  },
  { name: "get_on_chain", description: "On-chain crypto analytics: whale transactions (>100 BTC), exchange flows, DeFi TVL, stablecoin supply. Data from Blockchain.com, CoinGecko, DeFi Llama.", input_schema: { type: "object" as const, properties: { section: { type: "string", enum: ["whales", "flows", "defi", "stablecoins"], description: "Filter to specific section" } }, required: [] } },
  { name: "get_shipping_intelligence", description: "Maritime shipping intelligence: chokepoint status (Hormuz, Suez, Malacca, Bab el-Mandeb, Panama), traffic anomalies, dark fleet alerts, sanctions evasion detection.", input_schema: { type: "object" as const, properties: { chokepoint: { type: "string", enum: ["hormuz", "suez", "malacca", "mandeb", "panama"], description: "Filter to specific chokepoint" } }, required: [] } },
  {
    name: "get_vessel_tracking",
    description: "Get live vessel positions from the war room AIS tracking layer. Returns military and civilian vessels across global chokepoints and strategic waterways. Filter by navy/flag (e.g. 'RU Navy', 'CN Navy', 'IR Navy', 'US Navy'), vessel type (military, tanker, cargo), or geographic region. Use when the user asks about naval movements, fleet deployments, maritime activity, or when correlating sea-based military posture with geopolitical events. Cross-reference results with OSINT events and shipping intelligence for pattern detection.",
    input_schema: {
      type: "object" as const,
      properties: {
        flag: {
          type: "string",
          description: "Filter by flag/navy. E.g. 'RU Navy', 'CN Navy', 'US Navy', 'IR Navy', 'India', or any country name.",
        },
        vesselType: {
          type: "string",
          enum: ["military", "tanker", "cargo", "passenger", "fishing", "all"],
          description: "Filter by vessel type. Use 'military' for warships.",
        },
        region: {
          type: "string",
          enum: ["hormuz", "suez", "mandeb", "south_china_sea", "taiwan_strait", "mediterranean", "malacca", "all"],
          description: "Filter by strategic waterway/region.",
        },
      },
      required: [],
    },
  },
  { name: "get_narratives", description: "Track narrative shifts across GDELT and Reddit. Shows trending themes, momentum (rising/peaking/fading), sentiment scores, and divergences where narrative contradicts price action.", input_schema: { type: "object" as const, properties: { theme: { type: "string", description: "Filter to specific theme keyword" } }, required: [] } },
  { name: "get_change_points", description: "Bayesian Online Change-Point Detection (Adams & MacKay 2007). Detects structural breaks in VIX, gold, oil, yields, DXY, and signal intensity. Shows run lengths and regime shifts.", input_schema: { type: "object" as const, properties: { stream: { type: "string", enum: ["vix", "gold", "oil", "yield", "dxy", "signals"], description: "Filter to specific data stream" } }, required: [] } },
  { name: "get_short_interest", description: "Aggregate short interest across sector ETFs (SPY, QQQ, IWM, XLF, XLE, XLK, etc). 52-week z-score, contrarian signals, per-sector breakdown.", input_schema: { type: "object" as const, properties: { sector: { type: "string", description: "Filter by sector name" } }, required: [] } },
  { name: "get_gpr_index", description: "Geopolitical Risk Index (Caldara-Iacoviello). Threats vs acts decomposition, regional GPR proxies (Middle East, East Asia, Europe, South Asia, Africa), threshold crossings, asset exposure mapping.", input_schema: { type: "object" as const, properties: { region: { type: "string", description: "Filter to specific region" } }, required: [] } },
  { name: "get_gamma_exposure", description: "Gamma Exposure (GEX) for SPY, QQQ, IWM. Net dealer gamma, zero-gamma level, put/call walls, regime (dampening vs amplifying). Determines if options market amplifies or dampens moves.", input_schema: { type: "object" as const, properties: { ticker: { type: "string", enum: ["SPY", "QQQ", "IWM"], description: "Filter to specific ticker" } }, required: [] } },
  {
    name: "search_historical_parallels",
    description: "Search for historical parallels to a current event. Searches Wikipedia, knowledge bank, resolved predictions, and signal history for structurally similar past situations. Returns probability of repetition, parallels with similarity scores, and actionable insights.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Description of the current situation to find parallels for (e.g. 'Iran war + red heifer timing', 'Taiwan strait military exercises')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_actor_profile",
    description: "Get extended actor-belief profile including public statements, scripture references, past decisions, calendar sensitivities, and Bayesian behavioral typing. Available actors: israel_far_right, iran_irgc, china_pla, russia_kremlin, dprk, saudi_mbs, turkey_erdogan.",
    input_schema: {
      type: "object" as const,
      properties: {
        actor_id: {
          type: "string",
          description: "Actor ID (e.g. 'israel_far_right', 'iran_irgc'). Omit to get all profiles.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_eschatological_convergence",
    description:
      "Detect active eschatological convergences (Seldon Crises): where multiple state actors simultaneously pursue incompatible end-times theologies over the same geography, creating non-linear risk amplification because divine mandates cannot be negotiated away. Returns active programmes, incompatibility scores, amplification factors, Seldon Crisis classification (crisis/approaching/latent), and no-off-ramp pair detection. A Seldon Crisis means structural forces dominate and individual agency is irrelevant to the outcome. Use when analysing Middle East escalation, Temple Mount tensions, Iran-Israel dynamics, or any scenario where actors' theological commitments constrain diplomatic options. Can also query a specific actor's eschatological profile.",
    input_schema: {
      type: "object" as const,
      properties: {
        actor_id: {
          type: "string",
          description: "Optional: get eschatological profile for a specific actor (e.g. 'israel_far_right', 'iran_irgc', 'us_executive', 'russia_kremlin', 'isis', 'turkey_erdogan'). Omit to get the full landscape.",
        },
        active_calendar_events: {
          type: "array",
          items: { type: "string" },
          description: "Optional: active calendar event keys (e.g. ['purim', 'ramadan', 'quds_day']) to check for trigger elevation. If omitted, runs without calendar context.",
        },
      },
      required: [],
    },
  },
  {
    name: "generate_narrative_report",
    description: "Generate a long-form intelligence briefing / lecture script pulling all signals, parallels, game theory, predictions, and thesis into a single coherent narrative. 10-15 minute reading time. Includes risk matrix and key takeaways.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "Optional focus topic. If omitted, generates a full-spectrum briefing.",
        },
      },
      required: [],
    },
  },
  {
    name: "run_bayesian_analysis",
    description: "Run Bayesian N-player sequential game theory analysis on geopolitical scenarios. Models real actor complexity with incomplete information, Fearon audience costs, coalition stability, and sequential move structures. Available scenarios: iran-nplayer (US/Israel/Iran/Saudi/China/Russia), taiwan-nplayer (China/US/Taiwan/Japan), ukraine-nplayer (Russia/US/China). Can incorporate OSINT signals to update actor type beliefs in real-time.",
    input_schema: {
      type: "object" as const,
      properties: {
        scenario_id: {
          type: "string",
          description: "Scenario ID: 'iran-nplayer', 'taiwan-nplayer', or 'ukraine-nplayer'. Omit to run all scenarios.",
        },
        signals: {
          type: "array",
          description: "Optional OSINT signals to update Bayesian beliefs. Each signal shifts actor type probabilities.",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Signal description (e.g. 'Iran enriches uranium to 90%')" },
              actor_id: { type: "string", description: "Actor this signal relates to (e.g. 'iran', 'us', 'china')" },
              source: { type: "string", description: "Signal source type: 'osint', 'satellite', 'sigint', 'humint'" },
            },
            required: ["description", "actor_id"],
          },
        },
      },
      required: [],
    },
  },
  // ── Memory Tools ──
  {
    name: "recall_memory",
    description: "Recall stored memories about this user (preferences, active theses, portfolio positions, standing instructions, operator-confirmed intelligence). ALWAYS call this at the start of a conversation to personalise your responses. You can filter by category: preference, thesis, portfolio, context, instruction, ground_truth.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["preference", "thesis", "portfolio", "context", "instruction"],
          description: "Optional category filter. Omit to recall all memories.",
        },
      },
      required: [],
    },
  },
  {
    name: "save_memory",
    description: "Save a persistent memory about this user that will be recalled in future conversations. Use this when the user states a preference, updates their thesis, describes their portfolio, gives a standing instruction, or shares context they want you to always remember. Categories: preference (risk tolerance, sectors, style), thesis (active investment theses), portfolio (positions, allocations), context (background info), instruction (standing orders like 'always check oil before answering'), ground_truth (operator-confirmed facts that override lagged tool data, e.g. 'Hormuz is closed to commercial traffic' when the operator has confirmed this repeatedly). Use ground_truth when the operator insists on a factual claim that your tools cannot yet verify due to data lag.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["preference", "thesis", "portfolio", "context", "instruction", "ground_truth"],
          description: "Memory category. Use ground_truth for operator-confirmed facts that should override lagged tool data.",
        },
        key: {
          type: "string",
          description: "Short label for this memory (e.g. 'risk_tolerance', 'long_energy', 'always_check_vix'). Use snake_case.",
        },
        value: {
          type: "string",
          description: "The memory content. Be specific and factual.",
        },
      },
      required: ["category", "key", "value"],
    },
  },
  {
    name: "delete_memory",
    description: "Delete a specific memory by ID. Use when the user says to forget something or a memory is outdated.",
    input_schema: {
      type: "object" as const,
      properties: {
        memory_id: {
          type: "number",
          description: "The memory ID to delete.",
        },
      },
      required: ["memory_id"],
    },
  },
  // ── Artifact Tool ──
  {
    name: "create_artifact",
    description: "Create a rich visual artifact displayed inline in the chat. Use this to present data as interactive charts, formatted tables, structured briefing documents, or code blocks instead of plain text. Types: chart (bar chart with labels/datasets), table (headers + rows), document (structured markdown), code (syntax-highlighted code), briefing (formatted intelligence briefing).",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["chart", "table", "document", "code", "briefing"],
          description: "Artifact type.",
        },
        title: {
          type: "string",
          description: "Artifact title displayed in the header.",
        },
        content: {
          description: "Artifact content. For chart: { labels: string[], datasets: [{ label, data: number[], color? }] }. For table: { headers: string[], rows: string[][] }. For document/briefing: markdown string. For code: code string.",
        },
        language: {
          type: "string",
          description: "Programming language for code artifacts (e.g. 'python', 'sql', 'typescript').",
        },
      },
      required: ["type", "title", "content"],
    },
  },
  // ── Document Analysis Tool ──
  {
    name: "save_document_to_knowledge",
    description: "Save an uploaded document's content to the knowledge bank for permanent storage and future retrieval via semantic search. Use when the user uploads a document and you want to preserve its analysis. The document text is extracted and stored as a knowledge entry with embeddings.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title for the knowledge entry.",
        },
        content: {
          type: "string",
          description: "The extracted/summarised document content to store.",
        },
        category: {
          type: "string",
          enum: ["thesis", "model", "event", "actor", "market", "geopolitical", "technical"],
          description: "Knowledge category.",
        },
        source: {
          type: "string",
          description: "Source description (e.g. 'Uploaded: earnings_q3.pdf').",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for filtering.",
        },
      },
      required: ["title", "content", "category"],
    },
  },
  // ── Longevity Risk Analysis Tool ──
  {
    name: "longevity_risk_analysis",
    description:
      "Analyze the longevity risk of a public figure using publicly available data (news, health reports, lifestyle, security threats, actuarial factors). Use this tool when users ask about whether someone will die, their health risks, survival probability, mortality risk, or longevity. Also use when asking about succession risk or what happens if a leader becomes incapacitated. Works for any public figure: world leaders, CEOs, politicians, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Full name of the public figure (e.g. 'Donald Trump', 'Vladimir Putin', 'Xi Jinping').",
        },
        timeframe_years: {
          type: "number",
          description: "Timeframe in years for the risk assessment. Defaults to 5.",
        },
      },
      required: ["name"],
    },
  },
  // ── Cross-Asset Contagion Analysis ──
  {
    name: "contagion_analysis",
    description:
      "Analyze how a shock in one asset propagates through the financial system. Use this when users ask about cascading effects, second-order impacts, 'what happens to X if Y moves', supply chain effects, or cross-asset contagion. Accepts an asset/event and shock magnitude, returns all affected assets with expected moves, causal mechanisms, and trading implications across up to 3 orders of propagation.",
    input_schema: {
      type: "object" as const,
      properties: {
        source_asset: {
          type: "string",
          description: "The asset or event experiencing the shock (e.g. 'oil', 'CL', 'fed rate', 'taiwan', 'BTC', 'gold'). Supports tickers, commodity names, and geopolitical events.",
        },
        shock_magnitude: {
          type: "number",
          description: "The shock as a decimal (e.g. -0.10 for a 10% drop, 0.05 for a 5% rise).",
        },
        trigger_description: {
          type: "string",
          description: "Optional human-readable description of what caused the shock (e.g. 'OPEC releases 500M barrels from strategic reserves').",
        },
        max_order: {
          type: "number",
          description: "Maximum propagation depth (1-3). Default 3.",
        },
      },
      required: ["source_asset", "shock_magnitude"],
    },
  },
  // ── Signal-to-PnL Attribution ──
  {
    name: "get_attribution",
    description:
      "Get the signal-to-PnL attribution report showing which signals, predictions, and theses generated each position's returns. Use when users ask 'why did I make/lose money', 'which signals worked', 'attribution report', 'what drove my PnL', or want to understand the causal chain from intelligence to returns.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Optional: get attribution for a specific ticker only.",
        },
      },
      required: [],
    },
  },
  // ── Scenario Branches ──
  {
    name: "get_scenario_branches",
    description:
      "Get pre-computed thesis branches for upcoming catalysts (FOMC, CPI, NFP, OPEC, etc). Each catalyst has multiple scenario branches with pre-determined trading action overrides and market expectations. Use when users ask about upcoming events, 'what if CPI is hot', catalyst preparation, or scenario planning.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // ── Document Generation ──
  {
    name: "generate_document",
    description:
      "Generate a downloadable PDF or PowerPoint presentation from the current discussion or analysis. Use when users ask to 'create a presentation', 'make a PDF', 'export as slides', 'generate a report', 'create a deck', 'download as PDF', or want a polished document summarizing insights, analysis, or findings. Structure the content into clear sections with headings, body text, and optional bullet points.",
    input_schema: {
      type: "object" as const,
      properties: {
        format: {
          type: "string",
          enum: ["pdf", "pptx"],
          description: "Document format. Use 'pptx' for presentations/decks, 'pdf' for reports/briefs.",
        },
        title: {
          type: "string",
          description: "Document title.",
        },
        sections: {
          type: "array",
          description: "Array of content sections. Each section becomes a slide (PPTX) or page (PDF).",
          items: {
            type: "object",
            properties: {
              heading: {
                type: "string",
                description: "Section heading.",
              },
              content: {
                type: "string",
                description: "Main body text for this section. Keep concise for slides.",
              },
              bullets: {
                type: "array",
                items: { type: "string" },
                description: "Optional bullet points for key takeaways.",
              },
            },
            required: ["heading", "content"],
          },
        },
      },
      required: ["format", "title", "sections"],
    },
  },

  // ── Platform Expansion Tools ──

  {
    name: "manage_execution_rules",
    description: "Create, list, update, or delete automated execution rules. Rules trigger trades when signal conditions are met.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: { type: "string", enum: ["list", "create", "update", "delete", "toggle"], description: "Action to perform" },
        ruleId: { type: "number", description: "Rule ID (for update/delete/toggle)" },
        name: { type: "string", description: "Rule name (for create)" },
        conditions: { type: "object", description: "Conditions JSON: {minConvergence, regime, signalLayers, tickers}" },
        sizingStrategy: { type: "string", enum: ["kelly", "fixed", "tier"], description: "Position sizing method" },
        broker: { type: "string", enum: ["t212", "coinbase"], description: "Target broker" },
        enabled: { type: "boolean", description: "Enable/disable (for toggle)" },
      },
      required: ["action"],
    },
  },
  {
    name: "get_execution_log",
    description: "View the automated execution audit trail. Shows every rule evaluation, trade execution, block, and kill switch activation.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max entries to return. Default 20." },
      },
      required: [],
    },
  },
  {
    name: "toggle_kill_switch",
    description: "Emergency stop for all automated execution. When active, no rules will fire and all existing rules are disabled.",
    input_schema: {
      type: "object" as const,
      properties: {
        active: { type: "boolean", description: "true to activate (stop all), false to deactivate" },
        reason: { type: "string", description: "Reason for activation" },
      },
      required: ["active"],
    },
  },
  {
    name: "analyze_sentiment",
    description: "Deep NLP sentiment analysis of text using Claude. Returns sentiment score (-1 to 1), tone breakdown (hawkish/dovish/uncertainty/urgency/optimism/fear), entities, key claims, and market implications.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text to analyze" },
        sourceType: { type: "string", enum: ["news", "central_bank", "earnings", "speech"], description: "Type of source" },
        institution: { type: "string", description: "Institution name (for central bank analysis)" },
        company: { type: "string", description: "Company name (for earnings analysis)" },
      },
      required: ["text", "sourceType"],
    },
  },
  {
    name: "get_sentiment_trends",
    description: "Get sentiment trends for an entity or category over time. Detects tone shifts and tracks sentiment trajectory.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity: { type: "string", description: "Entity to track (company, country, person)" },
        days: { type: "number", description: "Lookback period in days. Default 7." },
      },
      required: [],
    },
  },
  {
    name: "get_order_book",
    description: "Get live order book depth and microstructure metrics for a crypto trading pair. Shows bid/ask levels, spread, imbalance ratio, liquidity score, and flow direction.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: { type: "string", description: "Trading pair e.g. BTC-USD, ETH-USD" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_supply_chain",
    description: "Map the supply chain network for a company or commodity. Shows upstream suppliers, downstream customers, and exposure paths up to 3 levels deep.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity: { type: "string", description: "Company ticker or entity name (e.g. TSMC, AAPL, CL)" },
        depth: { type: "number", description: "Max depth to traverse. Default 3." },
      },
      required: ["entity"],
    },
  },
  {
    name: "analyze_supply_chain_exposure",
    description: "Calculate exposure to a supply chain disruption. Shows direct and indirect exposure, critical paths, bottlenecks, and trading implications.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity: { type: "string", description: "Entity to analyze exposure for" },
      },
      required: ["entity"],
    },
  },
  {
    name: "get_satellite_imagery",
    description: "Search for satellite imagery (Sentinel-2 optical, Sentinel-1 SAR) and thermal data (VIIRS) for a geographic region. Returns imagery tiles for war room overlay.",
    input_schema: {
      type: "object" as const,
      properties: {
        regionName: { type: "string", description: "Human-readable region name" },
        north: { type: "number", description: "North latitude of bounding box" },
        south: { type: "number", description: "South latitude of bounding box" },
        east: { type: "number", description: "East longitude of bounding box" },
        west: { type: "number", description: "West longitude of bounding box" },
        days: { type: "number", description: "Lookback period in days. Default 30." },
      },
      required: ["regionName", "north", "south", "east", "west"],
    },
  },
  {
    name: "get_ml_models",
    description: "List trained ML models with their accuracy metrics and feature importance. Shows which NEXUS signals are most predictive.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_feature_importance",
    description: "Get ranked feature importance from a trained ML model. Shows which features (signal intensity, prediction accuracy, convergence count, etc.) drive predictions.",
    input_schema: {
      type: "object" as const,
      properties: {
        modelId: { type: "number", description: "Model ID. If omitted, uses the active model." },
      },
      required: [],
    },
  },
  {
    name: "get_unified_portfolio",
    description: "Get aggregated portfolio view across all connected brokers (Trading 212, Coinbase). Shows total value, P&L, positions by broker and asset class, concentration risk.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_flow_imbalance",
    description: "Check order flow imbalance for a crypto pair. Detects buy/sell pressure from order book depth analysis.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: { type: "string", description: "Trading pair e.g. BTC-USD" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "analyze_opportunity",
    description:
      "Run a structured opportunity analysis on a market, geopolitical, or hybrid thesis. Evaluates asymmetry (risk/reward ratio), crowdedness, timing, convergence support, and maps monetization paths. Use this when you identify a potential trade, trend, or strategic opening and want a rigorous assessment before recommending action.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description:
            "Clear description of the opportunity (e.g. 'Long energy if Hormuz closure probability rises above 30%')",
        },
        type: {
          type: "string",
          enum: ["market", "geopolitical", "hybrid"],
          description: "Type of opportunity",
        },
        timeframe: {
          type: "string",
          description:
            "Expected horizon (e.g. '1 week', '3 months', '6 months')",
        },
        symbols: {
          type: "array",
          items: { type: "string" },
          description:
            "Relevant tickers to analyze for market data (e.g. ['USO', 'XLE', 'CVX'])",
        },
        conviction: {
          type: "number",
          description:
            "Your current conviction level 0-1 before running the analysis",
        },
        actors: {
          type: "array",
          items: { type: "string" },
          description:
            "Key actors/stakeholders involved (e.g. ['iran', 'israel', 'us'])",
        },
        scenario_id: {
          type: "string",
          description:
            "Game theory scenario to evaluate (e.g. 'iran-nuclear', 'taiwan-strait'). Optional.",
        },
      },
      required: ["description", "type"],
    },
  },
  {
    name: "calculate",
    description:
      "Evaluate mathematical expressions accurately. ALWAYS use this tool instead of doing mental math — wrong calculations destroy credibility. Supports: arithmetic (+, -, *, /, ^), functions (sqrt, abs, round, ceil, floor, log, exp, pow, min, max), constants (pi, e), and chained labeled expressions where later expressions reference earlier results. Common use cases: Position P&L: 'units * current_price - units * entry_price'. Percentage gain: '(current - entry) / entry * 100'. Trim sizing: 'round(total_units * 0.25)'. Currency conversion: 'gbp_amount * 1.26'. Cost basis per unit: 'total_cost / units'. Decay/leverage calcs: 'initial * (1 + daily_return)^days'. Thesis valuations, profit targets, stop-loss levels, portfolio weights — use this for ALL of them.",
    input_schema: {
      type: "object" as const,
      properties: {
        expressions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "Short description of what this calculation represents (e.g. 'total_cost', 'profit_pct', 'units_to_sell')",
              },
              expr: {
                type: "string",
                description: "The mathematical expression to evaluate. Can reference previous labels as variables.",
              },
            },
            required: ["label", "expr"],
          },
          description: "Array of labeled expressions to evaluate in sequence. Later expressions can reference earlier labels as variables.",
        },
      },
      required: ["expressions"],
    },
  },
  {
    name: "get_social_sentiment",
    description:
      "Get real-time social sentiment from Twitter/X, Reddit, and StockTwits. Returns credibility-weighted sentiment scores, source agreement, and dataset poisoning detection. Tracked topics include major indices (SPY, QQQ), commodities (gold, oil), crypto (BTC), volatility (VIX), and geopolitical themes (Iran, China, OPEC). Pass a custom topic for on-demand scanning. Sentiment runs on a 30-minute background cycle so results are near-instant.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "Topic to check sentiment for (e.g. 'Gold', 'S&P 500', 'Iran', 'Bitcoin'). Omit for all tracked topics.",
        },
      },
      required: [],
    },
  },
];

// ── Tool Execution ──

export interface ToolContext {
  username: string;
  sessionId?: number;
  projectId?: number | null;
}

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  context?: ToolContext
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
    case "create_custom_game_theory":
      return executeCreateCustomGameTheory(input);
    case "get_active_thesis":
      return executeGetActiveThesis();
    case "generate_thesis":
      return executeGenerateThesis(input);
    case "get_predictions":
      return executeGetPredictions(input);
    case "create_prediction":
      return executeCreatePrediction(input, context);
    case "resolve_prediction":
      return executeResolvePrediction(input);
    case "get_prediction_feedback":
      return executeGetPredictionFeedback();
    case "get_vip_movements":
      return executeGetVipMovements(input);
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
    case "simulate_scenario_impact":
      if (!context) return { error: "No user context available" };
      return executeSimulateScenarioImpact(context);
    case "extract_osint_entities":
      return executeExtractOsintEntities(input);
    case "get_ai_progression":
      return executeGetAIProgression(input);
    case "get_prediction_markets":
      return executeGetPredictionMarkets(input);
    case "place_polymarket_order":
      return executePlacePolymarketOrder(input, context);
    case "get_polymarket_positions":
      return executeGetPolymarketPositions(input, context);
    case "cancel_polymarket_order":
      return executeCancelPolymarketOrder(input, context);
    case "get_congressional_trading":
      return executeGetCongressionalTrading(input);
    case "get_macro_data":
      return executeGetMacroData(input);
    case "get_operator_context":
      return { briefing: await loadPrompt("operator_briefing") };
    case "search_knowledge":
      return executeSearchKnowledge(input);
    case "read_knowledge":
      return executeReadKnowledge(input);
    case "explore_connections":
      return executeExploreConnections(input);
    case "save_to_knowledge":
      return executeSaveToKnowledge(input);
    case "get_timeline":
      return executeGetTimeline(input);
    case "get_iw_status":
      return executeGetIWStatus(input);
    case "get_market_regime":
      return executeGetMarketRegime();
    case "get_correlation_monitor":
      return executeGetCorrelationMonitor();
    case "assess_source_reliability":
      return executeAssessSourceReliability(input);
    case "create_ach_analysis":
      return executeCreateACH(input);
    case "get_economic_nowcast":
      return executeGetNowcast();
    case "analyze_central_bank_statement":
      return executeAnalyzeCentralBank(input);
    case "get_collection_gaps":
      return executeGetCollectionGaps();
    case "get_systemic_risk":
      return executeGetSystemicRisk(input);
    case "get_on_chain":
      return executeGetOnChain(input);
    case "get_shipping_intelligence":
      return executeGetShipping(input);
    case "get_vessel_tracking":
      return executeGetVesselTracking(input);
    case "get_narratives":
      return executeGetNarratives(input);
    case "get_change_points":
      return executeGetChangePoints(input);
    case "get_short_interest":
      return executeGetShortInterest(input);
    case "get_gpr_index":
      return executeGetGPR(input);
    case "get_gamma_exposure":
      return executeGetGEX(input);
    case "search_historical_parallels":
      return executeSearchParallels(input);
    case "get_eschatological_convergence":
      return executeGetEschatologicalConvergence(input);
    case "get_actor_profile":
      return executeGetActorProfile(input);
    case "generate_narrative_report":
      return executeGenerateReport(input);
    case "run_bayesian_analysis":
      return executeRunBayesianAnalysis(input);

    // ── Memory Tools ──
    case "recall_memory": {
      if (!context?.username) return { error: "No user context available" };
      const category = input.category as string | undefined;
      const memories = await recallMemories(context.username, category);
      if (memories.length === 0) return { action: "recalled", memories: [], message: "No memories stored yet." };
      return { action: "recalled", memories };
    }
    case "save_memory": {
      if (!context?.username) return { error: "No user context available" };
      const result = await saveMemory(
        context.username,
        input.category as string,
        input.key as string,
        input.value as string
      );
      return { ...result, key: input.key, category: input.category };
    }
    case "delete_memory": {
      if (!context?.username) return { error: "No user context available" };
      await deleteMemory(context.username, input.memory_id as number);
      return { action: "deleted", message: `Memory ${input.memory_id} deleted.` };
    }

    // ── Artifact Tool ──
    case "create_artifact":
      return {
        type: input.type,
        title: input.title,
        content: input.content,
        language: input.language,
      };

    // ── Document to Knowledge ──
    case "save_document_to_knowledge": {
      const entry = await addKnowledge({
        title: input.title as string,
        content: input.content as string,
        category: input.category as string,
        source: (input.source as string) || "Document upload",
        tags: input.tags ? JSON.stringify(input.tags) : null,
        confidence: 0.7,
        status: "active",
        supersededBy: null,
        validFrom: null,
        validUntil: null,
        metadata: null,
      });
      return {
        saved: true,
        knowledgeId: entry.id,
        name: input.title,
        extractedLength: (input.content as string).length,
        message: `Saved to knowledge bank as "${input.title}"`,
      };
    }

    case "longevity_risk_analysis":
      return executeLongevityAnalysis(input);

    case "contagion_analysis":
      return executeContagionAnalysis(input);

    case "get_attribution":
      return executeGetAttribution(input);

    case "get_scenario_branches":
      return executeGetScenarioBranches();

    case "generate_document":
      return executeGenerateDocument(input);

    // ── Platform Expansion Tools ──

    case "manage_execution_rules":
      return executeManageExecutionRules(input, context);

    case "get_execution_log":
      return executeGetExecutionLog(input, context);

    case "toggle_kill_switch":
      return executeToggleKillSwitch(input, context);

    case "analyze_sentiment":
      return executeAnalyzeSentiment(input);

    case "get_sentiment_trends":
      return executeGetSentimentTrends(input);

    case "get_order_book":
      return executeGetOrderBook(input);

    case "get_supply_chain":
      return executeGetSupplyChainTool(input);

    case "analyze_supply_chain_exposure":
      return executeAnalyzeSupplyChainExposure(input);

    case "get_satellite_imagery":
      return executeGetSatelliteImagery(input);

    case "get_ml_models":
      return executeGetMlModels();

    case "get_feature_importance":
      return executeGetFeatureImportance(input);

    case "get_unified_portfolio":
      return executeGetUnifiedPortfolio(context);

    case "get_flow_imbalance":
      return executeGetFlowImbalance(input);

    case "analyze_opportunity":
      return executeAnalyzeOpportunity(input);

    case "calculate":
      return executeCalculate(input);

    case "get_social_sentiment":
      return executeGetSocialSentiment(input);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function executeGetSignals(input: Record<string, unknown>) {
  const status = (input.status as string) || "upcoming";
  const minIntensity = (input.min_intensity as number) || 1;
  const limit = (input.limit as number) || 20;

  const allSignals: Signal[] = await db
    .select()
    .from(schema.signals)
    .where(eq(schema.signals.status, status))
    .orderBy(schema.signals.date);
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
  if (!input.symbol) return { error: "symbol is required" };
  const symbol = String(input.symbol).toUpperCase();

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
    // Use wartime-aware analysis (checks for active thresholds/invalidated strategies)
    const { analysis, scenarioState, isWartime } = await getWartimeAnalysis(scenarioId);
    return {
      scenario: { id: scenario.id, title: scenario.title, description: scenario.description },
      analysis,
      scenarioState,
      isWartime,
    };
  }

  // Analyze all scenarios with wartime awareness
  const results = await Promise.all(SCENARIOS.map(async (scenario) => {
    const { analysis, scenarioState, isWartime } = await getWartimeAnalysis(scenario.id);
    return {
      scenario: { id: scenario.id, title: scenario.title, description: scenario.description },
      analysis,
      scenarioState,
      isWartime,
    };
  }));

  return { scenarios: results };
}

// ── Custom game theory helpers (mirrors api/game-theory POST logic) ──

const GT_ESCALATORY = ["military", "strike", "attack", "war", "invasion", "blockade", "nuclear", "escalat"];
const GT_COOPERATIVE = ["diplomacy", "negotiate", "concession", "treaty", "cooperat", "de-escalat", "peace", "withdraw"];
const GT_ECONOMIC = ["sanction", "tariff", "embargo", "trade", "economic"];

function gtClassify(strat: string): "escalatory" | "economic" | "cooperative" | "moderate" {
  const lower = strat.toLowerCase();
  if (GT_ESCALATORY.some(kw => lower.includes(kw))) return "escalatory";
  if (GT_COOPERATIVE.some(kw => lower.includes(kw))) return "cooperative";
  if (GT_ECONOMIC.some(kw => lower.includes(kw))) return "economic";
  return "moderate";
}

function gtPayoff(s1: string, s2: string) {
  const table: Record<string, Record<string, { p1: number; p2: number }>> = {
    escalatory:  { escalatory: { p1: -6, p2: -6 }, economic: { p1: 2, p2: -4 }, cooperative: { p1: 5, p2: -7 }, moderate: { p1: 3, p2: -3 } },
    economic:    { escalatory: { p1: -4, p2: 2 }, economic: { p1: -1, p2: -1 }, cooperative: { p1: 3, p2: -2 }, moderate: { p1: 1, p2: -1 } },
    cooperative: { escalatory: { p1: -7, p2: 5 }, economic: { p1: -2, p2: 3 }, cooperative: { p1: 4, p2: 4 }, moderate: { p1: 2, p2: 3 } },
    moderate:    { escalatory: { p1: -3, p2: 3 }, economic: { p1: -1, p2: 1 }, cooperative: { p1: 3, p2: 2 }, moderate: { p1: 1, p2: 1 } },
  };
  const { p1, p2 } = table[s1]?.[s2] ?? { p1: 0, p2: 0 };
  const n1 = Math.round((Math.random() - 0.5) * 2 * 10) / 10;
  const n2 = Math.round((Math.random() - 0.5) * 2 * 10) / 10;
  const fp1 = Math.max(-8, Math.min(8, p1 + n1));
  const fp2 = Math.max(-8, Math.min(8, p2 + n2));
  const total = fp1 + fp2;
  const direction: "bullish" | "bearish" | "mixed" = total > 2 ? "bullish" : total < -2 ? "bearish" : "mixed";
  const escLevel = (s1 === "escalatory" ? 2 : s1 === "economic" ? 1 : 0) + (s2 === "escalatory" ? 2 : s2 === "economic" ? 1 : 0);
  const magnitude: "low" | "medium" | "high" = escLevel >= 3 ? "high" : escLevel >= 1 ? "medium" : "low";
  return { p1: fp1, p2: fp2, direction, magnitude };
}

async function executeCreateCustomGameTheory(input: Record<string, unknown>) {
  const title = (input.title as string)?.trim();
  const description = (input.description as string)?.trim() || "";
  const actor1Name = (input.actor1_name as string)?.trim();
  const actor2Name = (input.actor2_name as string)?.trim();
  const strategies1 = input.strategies1 as string[];
  const strategies2 = input.strategies2 as string[];
  const marketSectors = (input.market_sectors as string[]) || ["geopolitics"];
  const timeHorizon = (input.time_horizon as string) || "medium_term";

  if (!title) return { error: "Title is required" };
  if (!actor1Name || !actor2Name) return { error: "Both actor names are required" };
  if (!strategies1?.length || strategies1.length < 2) return { error: "Actor 1 needs at least 2 strategies" };
  if (!strategies2?.length || strategies2.length < 2) return { error: "Actor 2 needs at least 2 strategies" };

  const a1Id = actor1Name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20);
  const a2Id = actor2Name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20);

  const payoffMatrix: Array<{
    strategies: Record<string, string>;
    payoffs: Record<string, number>;
    marketImpact: { direction: string; magnitude: string; sectors: string[]; description: string };
  }> = [];

  for (const s1 of strategies1) {
    const s1Class = gtClassify(s1);
    for (const s2 of strategies2) {
      const s2Class = gtClassify(s2);
      const { p1, p2, direction, magnitude } = gtPayoff(s1Class, s2Class);
      payoffMatrix.push({
        strategies: { [a1Id]: s1, [a2Id]: s2 },
        payoffs: { [a1Id]: p1, [a2Id]: p2 },
        marketImpact: { direction, magnitude, sectors: marketSectors, description: `${s1} vs ${s2}` },
      });
    }
  }

  const scenario = {
    id: `custom-chat-${Date.now()}`,
    title,
    description: description || `Custom scenario: ${actor1Name} vs ${actor2Name}`,
    actors: [a1Id, a2Id],
    strategies: { [a1Id]: strategies1, [a2Id]: strategies2 },
    payoffMatrix,
    context: `Custom scenario created via chat.`,
    marketSectors,
    timeHorizon: timeHorizon as "immediate" | "short_term" | "medium_term" | "long_term",
  };

  const analysis = analyzeScenario(scenario as any);

  return {
    scenario: {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      actors: [
        { id: a1Id, name: actor1Name, shortName: actor1Name },
        { id: a2Id, name: actor2Name, shortName: actor2Name },
      ],
      strategies: scenario.strategies,
      marketSectors,
      timeHorizon,
    },
    analysis,
    custom: true,
  };
}

async function executeGetEschatologicalConvergence(input: Record<string, unknown>) {
  const { getActorEschatologicalProfile, getEschatologicalLandscape } = await import("@/lib/signals/eschatological");

  const actorId = input.actor_id as string | undefined;
  const calendarEvents = (input.active_calendar_events as string[]) || [];

  // Single actor profile request
  if (actorId) {
    const profile = getActorEschatologicalProfile(actorId);
    if (!profile.programme) {
      return { error: `No eschatological programme found for actor '${actorId}'` };
    }
    return {
      actor: actorId,
      programme: {
        name: profile.programme.name,
        theology: profile.programme.theology,
        mandate: profile.programme.mandate,
        targetGeography: profile.programme.targetGeography,
        doctrinalBasis: profile.programme.doctrinalBasis,
        operationalIndicators: profile.programme.operationalIndicators,
        policyInfluence: profile.programme.policyInfluence,
        rigidity: profile.programme.rigidity,
      },
      calendarTriggers: profile.calendarTriggers.map((t) => ({
        event: t.calendarEvent,
        system: t.calendarSystem,
        activationMultiplier: t.activationMultiplier,
        historicalBasis: t.historicalBasis,
        confidence: t.confidence,
      })),
      incompatibilities: profile.incompatibilities,
    };
  }

  // Full landscape
  const landscape = getEschatologicalLandscape(calendarEvents);

  return {
    activeProgrammes: landscape.programmes.map((p) => ({
      actor: p.actorId,
      name: p.name,
      theology: p.theology,
      mandate: p.mandate,
      targetGeography: p.targetGeography,
      policyInfluence: p.policyInfluence,
      rigidity: p.rigidity,
      calendarElevation: p.calendarElevation,
    })),
    convergences: landscape.convergences.map((c) => ({
      actors: c.actors,
      programmes: c.programmes,
      sharedGeography: c.sharedGeography,
      incompatibility: c.incompatibilityReason,
      amplificationFactor: c.amplificationFactor,
      compositeRigidity: c.compositeRigidity,
      significance: c.significance,
      marketSectors: c.marketSectors,
      seldonClassification: c.seldonClassification,
    })),
    highestAmplification: landscape.highestAmplification,
    noOffRampPairs: landscape.noOffRampPairs,
    seldonCrisisCount: landscape.seldonCrisisCount,
    seldonApproachingCount: landscape.seldonApproachingCount,
    calendarEventsChecked: calendarEvents,
  };
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

async function executeGenerateThesis(input: Record<string, unknown>) {
  try {
    const { generateThesis } = await import("@/lib/thesis/engine");
    const DEFAULT_SYMBOLS = ["SPY", "GLD", "USO", "TLT", "DXY"];
    const symbols = Array.isArray(input.symbols) && input.symbols.length > 0
      ? (input.symbols as string[]).map(s => String(s).toUpperCase())
      : DEFAULT_SYMBOLS;

    const thesis = await generateThesis(symbols);

    return {
      generated: true,
      id: thesis.id,
      title: thesis.title,
      marketRegime: thesis.marketRegime,
      volatilityOutlook: thesis.volatilityOutlook,
      overallConfidence: thesis.overallConfidence,
      convergenceDensity: thesis.convergenceDensity,
      executiveSummary: thesis.executiveSummary,
      situationAssessment: thesis.situationAssessment,
      riskScenarios: thesis.riskScenarios,
      tradingActions: thesis.tradingActions,
      symbols,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Thesis generation failed: ${message}` };
  }
}

async function executeGetPredictions(input: Record<string, unknown>) {
  const status = input.status as string | undefined;
  const category = input.category as string | undefined;
  const search = input.search as string | undefined;
  const limit = Math.min(Math.max((input.limit as number) || 20, 1), 100);
  const days = (input.days as number) || 30;

  // Build date cutoff
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString();

  // Build query conditions
  const conditions = [gte(schema.predictions.createdAt, cutoff)];

  if (status && status !== "pending") {
    conditions.push(eq(schema.predictions.outcome, status));
  }
  if (category) {
    conditions.push(eq(schema.predictions.category, category));
  }
  if (search) {
    conditions.push(ilike(schema.predictions.claim, `%${search}%`));
  }

  let rows = await db
    .select()
    .from(schema.predictions)
    .where(and(...conditions))
    .orderBy(desc(schema.predictions.createdAt));

  // Client-side filter for pending (outcome IS NULL)
  if (status === "pending") {
    rows = rows.filter((p: Prediction) => !p.outcome);
  }

  const truncated = rows.length > limit;
  const results = rows.slice(0, limit);

  return {
    count: results.length,
    totalMatching: rows.length,
    truncated,
    filters: { status: status || "all", category: category || "all", search: search || null, days },
    predictions: results.map((p) => ({
      id: p.id,
      claim: p.claim,
      timeframe: p.timeframe,
      deadline: p.deadline,
      confidence: p.confidence,
      category: p.category,
      outcome: p.outcome || "pending",
      outcomeNotes: p.outcomeNotes,
      score: p.score,
      direction: p.direction,
      referenceSymbol: p.referenceSymbol,
    })),
  };
}

const VALID_PREDICTION_OUTCOMES = ["confirmed", "denied", "partial", "expired"];
const VALID_PREDICTION_CATEGORIES = ["market", "geopolitical", "celestial"];

async function executeCreatePrediction(input: Record<string, unknown>, context?: ToolContext) {
  const claim = input.claim as string;
  const timeframe = input.timeframe as string;
  const deadline = input.deadline as string;
  const confidence = input.confidence;
  const category = input.category as string;

  if (!claim || !timeframe || !deadline || confidence === undefined || !category) {
    return { error: "claim, timeframe, deadline, confidence, and category are all required" };
  }
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    return { error: "confidence must be a number between 0 and 1" };
  }
  if (!VALID_PREDICTION_CATEGORIES.includes(category)) {
    return { error: `category must be one of: ${VALID_PREDICTION_CATEGORIES.join(", ")}` };
  }

  const values: Record<string, unknown> = {
    claim,
    timeframe,
    deadline,
    confidence,
    category,
    direction: (input.direction as string) || null,
    priceTarget: input.priceTarget !== undefined ? (input.priceTarget as number) : null,
    referenceSymbol: (input.referenceSymbol as string) || null,
    createdBy: context?.username || null,
  };

  // If already resolved at time of creation
  if (input.outcome) {
    const outcome = input.outcome as string;
    if (!VALID_PREDICTION_OUTCOMES.includes(outcome)) {
      return { error: `outcome must be one of: ${VALID_PREDICTION_OUTCOMES.join(", ")}` };
    }
    values.outcome = outcome;
    values.outcomeNotes = (input.outcomeNotes as string) || null;
    values.score = input.score !== undefined ? (input.score as number) : null;
    values.resolvedAt = new Date().toISOString();
  }

  try {
    const rows = await db.insert(schema.predictions).values(values as typeof schema.predictions.$inferInsert).returning();
    const prediction = rows[0];

    return {
      created: true,
      prediction: {
        id: prediction.id,
        uuid: prediction.uuid,
        claim: prediction.claim,
        timeframe: prediction.timeframe,
        deadline: prediction.deadline,
        confidence: prediction.confidence,
        category: prediction.category,
        outcome: prediction.outcome || "pending",
        direction: prediction.direction,
        referenceSymbol: prediction.referenceSymbol,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Failed to create prediction: ${message}` };
  }
}

async function executeResolvePrediction(input: Record<string, unknown>) {
  const id = input.id as number | undefined;
  const uuid = input.uuid as string | undefined;
  const outcome = input.outcome as string;

  if (!outcome) return { error: "outcome is required" };
  if (!VALID_PREDICTION_OUTCOMES.includes(outcome)) {
    return { error: `outcome must be one of: ${VALID_PREDICTION_OUTCOMES.join(", ")}` };
  }
  if (!id && !uuid) return { error: "id or uuid is required to identify the prediction" };

  const existingRows = uuid
    ? await db.select().from(schema.predictions).where(eq(schema.predictions.uuid, uuid))
    : await db.select().from(schema.predictions).where(eq(schema.predictions.id, id!));

  if (!existingRows[0]) return { error: "Prediction not found" };

  const updated = await db
    .update(schema.predictions)
    .set({
      outcome,
      outcomeNotes: (input.outcomeNotes as string) || null,
      score: input.score !== undefined ? (input.score as number) : null,
      resolvedAt: new Date().toISOString(),
    })
    .where(eq(schema.predictions.id, existingRows[0].id))
    .returning();

  return {
    resolved: true,
    prediction: {
      id: updated[0].id,
      claim: updated[0].claim,
      outcome: updated[0].outcome,
      score: updated[0].score,
      resolvedAt: updated[0].resolvedAt,
    },
  };
}

async function executeGetPredictionFeedback() {
  const { computePerformanceReport } = await import("@/lib/predictions/feedback");
  const report = await computePerformanceReport();
  if (!report) {
    return { message: "Not enough resolved predictions to generate feedback (minimum 3 required)", report: null };
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

async function executeGetVipMovements(input: Record<string, unknown>) {
  const category = input.category as string | undefined;
  const search = input.search as string | undefined;

  try {
    const { getVipDatabase, getVipLabel, getVipPriority } = await import("@/lib/vip-aircraft/database");
    const db = await getVipDatabase();

    if (db.size === 0) {
      return { error: "VIP aircraft database unavailable", aircraft: [] };
    }

    // Query adsb.lol for military + PIA + LADD
    const endpoints = [
      "https://api.adsb.lol/v2/mil",
      "https://api.adsb.lol/v2/pia",
      "https://api.adsb.lol/v2/ladd",
    ];

    const allAc: Record<string, unknown>[] = [];
    const results = await Promise.allSettled(
      endpoints.map((url) => fetch(url).then((r) => r.ok ? r.json() : null))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value?.ac) {
        allAc.push(...r.value.ac);
      }
    }

    // Cross-reference against VIP database
    const matched: Array<{
      icao24: string;
      callsign: string;
      registration: string;
      owner: string;
      operator: string;
      category: string;
      aircraftType: string;
      lat: number;
      lng: number;
      altitude: number;
      velocity: number;
      heading: number;
      priority: number;
    }> = [];

    const seen = new Set<string>();
    for (const ac of allAc) {
      const hex = String(ac.hex || "").toLowerCase().trim();
      if (!hex || seen.has(hex)) continue;
      const entry = db.get(hex);
      if (!entry) continue;
      seen.add(hex);

      const lat = ac.lat as number | undefined;
      const lon = ac.lon as number | undefined;
      if (lat == null || lon == null) continue;

      const owner = getVipLabel(entry);

      // Apply filters
      if (category && category !== "all" && entry.category !== category) continue;
      if (search) {
        const q = search.toLowerCase();
        const searchable = `${owner} ${entry.operator} ${entry.registration} ${entry.tag1} ${entry.tag2} ${entry.category}`.toLowerCase();
        if (!searchable.includes(q)) continue;
      }

      matched.push({
        icao24: hex,
        callsign: String(ac.flight || "").trim(),
        registration: entry.registration,
        owner,
        operator: entry.operator,
        category: entry.category,
        aircraftType: entry.type || entry.icaoType,
        lat,
        lng: lon,
        altitude: (ac.alt_baro as number) || 0,
        velocity: (ac.gs as number) || 0,
        heading: (ac.track as number) || 0,
        priority: getVipPriority(entry.category),
      });
    }

    matched.sort((a, b) => a.priority - b.priority);

    return {
      totalTracked: matched.length,
      totalInDatabase: db.size,
      aircraft: matched.slice(0, 50), // Cap at 50 for context window
      filters: { category: category || "all", search: search || null },
    };
  } catch (err) {
    console.error("[VIP Movements] Tool error:", err);
    return { error: "Failed to fetch VIP aircraft data", aircraft: [] };
  }
}

async function executeGetPortfolio() {
  const result: Record<string, unknown> = {};

  // 1. Try Trading 212 broker positions
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

  if (apiKey && apiSecret) {
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

      result.broker = {
        source: "trading212",
        environment,
        account,
        positions: Array.isArray(positions) ? positions : [],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      result.brokerError = `Failed to fetch Trading 212: ${message}`;
    }
  }

  // 2. Fetch manual positions (all users)
  try {
    const manualPositions = await db
      .select()
      .from(schema.manualPositions)
      .where(isNull(schema.manualPositions.closedAt));

    if (manualPositions.length > 0) {
      result.manualPositions = manualPositions.map((p) => ({
        ticker: p.ticker,
        name: p.name,
        direction: p.direction,
        quantity: p.quantity,
        avgCost: p.avgCost,
        currency: p.currency,
        openedAt: p.openedAt,
        notes: p.notes,
      }));
    }
  } catch {
    // Non-critical, skip
  }

  if (!result.broker && !result.manualPositions) {
    return { error: "No portfolio data available. No broker connected and no manual positions tracked." };
  }

  return result;
}

async function executeGetLiveQuote(input: Record<string, unknown>) {
  if (!input.symbol) return { error: "symbol is required" };
  const symbol = String(input.symbol).toUpperCase();

  try {
    const quote = await getQuoteData(symbol);
    return quote;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Quote failed for ${symbol}: ${message}` };
  }
}

async function executeGetPriceHistory(input: Record<string, unknown>) {
  if (!input.symbol) return { error: "symbol is required" };
  const symbol = String(input.symbol).toUpperCase();
  const full = input.full as boolean || false;

  try {
    const bars = await getHistoricalData(symbol, full ? "5y" : "6mo");
    const recent = bars.slice(-100);
    const closes = recent.map(b => b.close);
    const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length);

    // Compute technical indicators from all available bars (need history for accuracy)
    const allOhlcv = bars.map(b => ({
      date: b.date,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
    }));
    const snapshot = computeTechnicalSnapshot(symbol, allOhlcv);

    // Chart-ready OHLCV data
    const chartBars = recent.map(b => ({
      time: b.date,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
    }));

    return {
      symbol,
      bars: recent.length,
      latest: recent[recent.length - 1],
      oldest: recent[0],
      stats: {
        avgDailyReturn: (avgReturn * 100).toFixed(4) + "%",
        dailyVolatility: (stdDev * 100).toFixed(4) + "%",
        annualizedVol: (stdDev * Math.sqrt(252) * 100).toFixed(2) + "%",
        high52w: Math.max(...closes),
        low52w: Math.min(...closes),
        rangePercent: ((Math.max(...closes) - Math.min(...closes)) / Math.min(...closes) * 100).toFixed(2) + "%",
      },
      indicators: {
        rsi14: snapshot.rsi14,
        macd: snapshot.macd,
        bollingerBands: snapshot.bollingerBands,
        atr14: snapshot.atr14,
        sma20: snapshot.sma20,
        sma50: snapshot.sma50,
        sma200: snapshot.sma200,
        trend: snapshot.trend,
        momentum: snapshot.momentum,
        volatilityRegime: snapshot.volatilityRegime,
      },
      chartBars,
      recentBars: recent.slice(-10),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Price history failed for ${symbol}: ${message}` };
  }
}

async function executeMonteCarloSimulation(input: Record<string, unknown>) {
  if (!input.symbol) return { error: "symbol is required" };
  const symbol = String(input.symbol).toUpperCase();
  const days = (input.days as number) || 63;
  const simulations = Math.min((input.simulations as number) || 10000, 50000);

  try {
    const bars = await getHistoricalData(symbol, "5y");
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

    // Build distribution histogram for visualization (30 bins) - single pass O(n)
    const p5Val = percentile(5);
    const p95Val = percentile(95);
    const binCount = 30;
    const binWidth = (p95Val - p5Val) / binCount;
    const binCounts = new Array(binCount).fill(0);
    for (const p of finalPrices) {
      if (p >= p5Val && p < p95Val) {
        const idx = Math.min(Math.floor((p - p5Val) / binWidth), binCount - 1);
        binCounts[idx]++;
      }
    }
    const distribution: Array<{ price: number; count: number }> = [];
    for (let b = 0; b < binCount; b++) {
      const lo = p5Val + b * binWidth;
      distribution.push({ price: +(lo + binWidth / 2).toFixed(2), count: binCounts[b] });
    }

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
      distribution,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Monte Carlo failed for ${symbol}: ${message}` };
  }
}

// GDELT returns 200 with HTML error pages when rate-limited or query is invalid.
// Always check content-type before parsing.
async function fetchGdeltJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json") && !ct.includes("text/json")) {
      // Peek at body to confirm it's actually JSON
      const text = await res.text();
      if (!text.trimStart().startsWith("{") && !text.trimStart().startsWith("[")) return null;
      return JSON.parse(text) as Record<string, unknown>;
    }
    return await res.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function searchGoogleNewsRSS(query: string) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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

  // Try cached news DB first (instant, no external call)
  try {
    const { getCachedNews } = await import("@/lib/news/sync");
    const cached = await getCachedNews(undefined, 200);
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
    const minTerms = Math.max(2, Math.ceil(queryTerms.length * 0.4));
    const scored = cached.map((a) => {
      const text = `${a.title} ${a.description || ""} ${a.category || ""}`.toLowerCase();
      const hits = queryTerms.filter(term => text.includes(term)).length;
      return { article: a, hits };
    }).filter(s => s.hits >= minTerms)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 15);

    if (scored.length >= 3) {
      return {
        query,
        source: "cached_news",
        resultCount: scored.length,
        articles: scored.map((s) => ({
          title: s.article.title,
          url: s.article.url,
          source: s.article.source,
          date: s.article.date,
          category: s.article.category,
        })),
      };
    }
  } catch {
    // DB read failed, continue to external sources
  }

  // Race GDELT and Google News in parallel - first good result wins
  try {
    const conflictTerms = ["attack", "war", "strike", "bomb", "shoot", "closed", "blockade", "closure", "missile", "drone", "escalat", "conflict", "military"];
    const isConflictQuery = conflictTerms.some(t => query.toLowerCase().includes(t));
    const toneParam = isConflictQuery ? "&tone=<-3" : "";
    const themeParam = isConflictQuery ? "&theme=TAX_FNCACT_MILITARY" : "";
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=25&format=json&sort=DateDesc&timespan=3d${toneParam}${themeParam}`;

    const [gdeltResult, gnResult] = await Promise.allSettled([
      fetchGdeltJson(gdeltUrl),
      searchGoogleNewsRSS(query),
    ]);

    // Prefer GDELT if it returned data
    if (gdeltResult.status === "fulfilled" && gdeltResult.value) {
      const articles = (gdeltResult.value.articles as Array<Record<string, unknown>>) || [];
      if (articles.length > 0) {
        return {
          query,
          source: "gdelt",
          resultCount: articles.length,
          articles: articles.slice(0, 15).map((a) => ({
            title: a.title,
            url: a.url,
            source: a.domain || a.sourcecountry,
            date: a.seendate,
            language: a.language,
            tone: a.tone,
          })),
        };
      }
    }

    // Fall back to Google News
    if (gnResult.status === "fulfilled" && gnResult.value.length > 0) {
      return {
        query,
        source: "google_news",
        resultCount: gnResult.value.length,
        articles: gnResult.value,
      };
    }

    // Both returned empty
    return { query, source: "none", resultCount: 0, articles: [], note: "No results found. Try different search terms." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Web search failed: ${message}` };
  }
}

async function executeGetOsintEvents(input: Record<string, unknown>) {
  const query = input.query as string;
  const limit = (input.limit as number) || 20;

  // Try cached news DB first (instant)
  try {
    const { getCachedNews } = await import("@/lib/news/sync");
    const cached = await getCachedNews(undefined, 200);
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
    const minTerms = Math.max(2, Math.ceil(queryTerms.length * 0.4));
    const scored = cached.map((a) => {
      const text = `${a.title} ${a.description || ""} ${a.category || ""}`.toLowerCase();
      const hits = queryTerms.filter(term => text.includes(term)).length;
      return { article: a, hits };
    }).filter(s => s.hits >= minTerms)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);

    if (scored.length >= 3) {
      return {
        query,
        source: "cached_news",
        timespan: "48h",
        resultCount: scored.length,
        events: scored.map((s) => ({
          title: s.article.title,
          url: s.article.url,
          source: s.article.source,
          date: s.article.date,
          category: s.article.category,
        })),
      };
    }
  } catch {
    // DB read failed, continue to external sources
  }

  try {
    // Enhanced GDELT query with conflict-aware filtering
    const conflictTerms = ["attack", "war", "strike", "bomb", "shoot", "closed", "blockade", "closure", "missile", "drone", "escalat", "conflict", "military"];
    const isConflictQuery = conflictTerms.some(t => query.toLowerCase().includes(t));
    const toneParam = isConflictQuery ? "&tone=<-3" : "";
    const themeParam = isConflictQuery ? "&theme=TAX_FNCACT_MILITARY" : "";
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${Math.min(limit, 50)}&format=json&sort=DateDesc&timespan=7d${toneParam}${themeParam}`;
    const data = await fetchGdeltJson(url);

    if (data) {
      const articles = (data.articles as Array<Record<string, unknown>>) || [];
      return {
        query,
        source: "gdelt",
        timespan: "7 days",
        resultCount: articles.length,
        events: articles.map((a) => ({
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
    const reading = getCyclicalReading(d);
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
  const today = new Date().toISOString().split("T")[0];
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  const futureStr = future.toISOString().split("T")[0];

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
      const { estimateOptionsMetrics } = await import("@/lib/market-data/options-flow");
      const [bars, quote] = await Promise.all([
        getHistoricalData(symbol.toUpperCase(), "6mo"),
        getQuoteData(symbol.toUpperCase()),
      ]);
      const closes = bars.map(b => b.close);
      const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
      const volumes = bars.map(b => b.volume);
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

      result.symbolMetrics = estimateOptionsMetrics(
        symbol.toUpperCase(), quote.price, returns, quote.volume, avgVolume
      );
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

async function executeSimulateScenarioImpact(context: ToolContext) {
  try {
    const { simulateScenarioImpacts } = await import("@/lib/portfolio/scenario-impact");
    // Get user positions from DB
    const { db: database, schema: dbSchema } = await import("@/lib/db");
    const { eq: eqOp } = await import("drizzle-orm");

    const positions: Array<{ ticker: string; value: number }> = [];

    // Manual positions
    const manual = await database.select().from(dbSchema.manualPositions)
      .where(eqOp(dbSchema.manualPositions.userId, context.username));
    for (const p of manual) {
      if (!p.closedAt && p.quantity && p.avgCost) {
        positions.push({ ticker: p.ticker, value: p.quantity * p.avgCost });
      }
    }

    // Unified positions (broker sync)
    const unified = await database.select().from(dbSchema.unifiedPositions)
      .where(eqOp(dbSchema.unifiedPositions.userId, context.username));
    for (const p of unified) {
      if (p.marketValue && p.marketValue > 0) {
        positions.push({ ticker: p.normalizedSymbol || p.symbol, value: p.marketValue });
      }
    }

    if (positions.length === 0) {
      return { error: "No portfolio positions found. Add positions to your portfolio first." };
    }

    const scenarios = simulateScenarioImpacts(positions);
    const portfolioValue = positions.reduce((s, p) => s + p.value, 0);

    return {
      portfolioValue: Math.round(portfolioValue),
      positionCount: positions.length,
      scenarioCount: scenarios.length,
      scenarios: scenarios.slice(0, 5).map((s) => ({
        scenario: s.scenarioTitle,
        direction: s.direction,
        confidence: Math.round(s.confidence * 100),
        impactPercent: Math.round(s.portfolioImpact.totalImpactPercent * 100) / 100,
        impactDollar: Math.round(s.portfolioImpact.totalImpactDollar),
        keySectors: s.keySectors,
        mostLikelyOutcome: s.mostLikelyOutcome,
        topPositionImpacts: s.portfolioImpact.positionImpacts.slice(0, 5).map((p) => ({
          ticker: p.ticker,
          currentValue: Math.round(p.currentValue),
          shockPercent: Math.round(p.shock * 100),
          impactDollar: Math.round(p.impactDollar),
        })),
        escalationRisk: s.escalationLadder.length > 0 ? s.escalationLadder.map((e) => ({
          level: e.level,
          description: e.description,
          probability: Math.round(e.probability * 100),
          portfolioImpactPercent: Math.round(e.portfolioImpactPercent * 100) / 100,
        })) : undefined,
      })),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Scenario impact simulation failed: ${message}` };
  }
}

async function executeExtractOsintEntities(input: Record<string, unknown>) {
  const query = (input.query as string) || "";

  try {
    let articles: Array<Record<string, unknown>> = [];

    // Try GDELT first, fallback to Google News RSS
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query || "conflict OR crisis OR military")}&mode=ArtList&maxrecords=20&format=json&sort=DateDesc&timespan=3d`;
    const gdeltData = await fetchGdeltJson(gdeltUrl);

    if (gdeltData) {
      articles = ((gdeltData.articles as unknown[]) || []) as Array<Record<string, unknown>>;
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

async function executeGetAIProgression(input: Record<string, unknown>) {
  try {
    const { getAIProgressionSnapshot, getRemoteLaborIndex, getMETRData, getAI2027Timeline, getSectorAutomationRisk, getLaborDisplacementIndicators } = await import("@/lib/ai-progression");
    const focus = (input.focus as string) || "overview";

    switch (focus) {
      case "rli":
        return await getRemoteLaborIndex();
      case "metr":
        return getMETRData();
      case "ai2027":
        return getAI2027Timeline();
      case "sectors":
        return getSectorAutomationRisk();
      case "displacement":
        return getLaborDisplacementIndicators();
      default:
        return await getAIProgressionSnapshot();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `AI progression data failed: ${message}` };
  }
}

async function executeGetPredictionMarkets(input: Record<string, unknown>) {
  try {
    const { getPredictionMarkets } = await import("@/lib/prediction-markets");
    const snapshot = await getPredictionMarkets();
    const category = (input.category as string) || "all";

    switch (category) {
      case "geopolitical":
        return { markets: snapshot.geopolitical, total: snapshot.geopolitical.length };
      case "economic":
        return { markets: snapshot.economic, total: snapshot.economic.length };
      case "political":
        return { markets: snapshot.political, total: snapshot.political.length };
      case "movers":
        return { topMovers: snapshot.topMovers, total: snapshot.topMovers.length };
      default:
        return snapshot;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Prediction markets fetch failed: ${message}` };
  }
}

async function executePlacePolymarketOrder(_input: Record<string, unknown>, _context?: ToolContext) {
  return {
    error: "Polymarket trading has moved to client-side wallet signing for security. Orders are placed directly from the browser wallet via the bet modal. Navigate to the prediction markets page and use the bet button on any Polymarket market.",
  };
}

async function executeGetPolymarketPositions(input: Record<string, unknown>, context?: ToolContext) {
  if (!context?.username) return { error: "No user context available" };
  try {
    const { isPolymarketConfigured, getPolymarketPositions, getPolymarketAddress } = await import("@/lib/prediction-markets/polymarket-trading");
    const configured = await isPolymarketConfigured(context.username);
    if (!configured) return { error: "Polymarket wallet not connected. Connect your wallet in Settings > Integrations." };

    const address = await getPolymarketAddress(context.username);
    const positions = await getPolymarketPositions(context.username);

    return { address, positions };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Polymarket positions fetch failed: ${message}` };
  }
}

async function executeCancelPolymarketOrder(_input: Record<string, unknown>, _context?: ToolContext) {
  return {
    error: "Polymarket order cancellation is now handled client-side via the browser wallet. Use the prediction markets page to manage your orders.",
  };
}

async function executeGetCongressionalTrading(input: Record<string, unknown>) {
  try {
    const ticker = input.ticker as string;
    if (ticker) {
      const { getTradesForTicker } = await import("@/lib/congressional-trading");
      return await getTradesForTicker(ticker);
    }
    const { getTradingSnapshot } = await import("@/lib/congressional-trading");
    return await getTradingSnapshot();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Congressional trading fetch failed: ${message}` };
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

async function executeSaveToKnowledge(input: Record<string, unknown>) {
  const title = input.title as string;
  const content = input.content as string;
  const category = input.category as string;
  const tags = input.tags as string[] | undefined;
  const confidence = (input.confidence as number) ?? 0.8;

  if (!title || !content || !category) {
    return { error: "title, content, and category are required" };
  }

  try {
    // Check for duplicates using text search (no embedding API call needed for dedup)
    const existing = await searchKnowledge(title, { limit: 5, useVector: false });
    const duplicate = existing.find((e) => {
      const titleSimilar = e.title.toLowerCase().trim() === title.toLowerCase().trim();
      if (titleSimilar) return true;
      // Check content overlap: if >60% of words match
      const existingWords = new Set(e.content.toLowerCase().split(/\s+/));
      const newWords = content.toLowerCase().split(/\s+/);
      const overlap = newWords.filter((w) => existingWords.has(w)).length;
      return overlap / newWords.length > 0.6 && newWords.length > 10;
    });

    if (duplicate) {
      return {
        stored: false,
        reason: "duplicate_detected",
        existingEntry: {
          id: duplicate.id,
          title: duplicate.title,
          category: duplicate.category,
        },
        message: `This knowledge already exists in the base: "${duplicate.title}" (ID: ${duplicate.id}). Not storing duplicate.`,
      };
    }

    const entry = await addKnowledge({
      title,
      content,
      category,
      tags: tags ? JSON.stringify(tags) : null,
      confidence,
      source: "chat",
      status: "active",
    });

    return {
      stored: true,
      id: entry.id,
      title: entry.title,
      category: entry.category,
      message: `Saved to knowledge base: "${entry.title}" (ID: ${entry.id})`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Failed to save knowledge: ${message}` };
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

async function executeReadKnowledge(input: Record<string, unknown>) {
  const id = input.id as number;
  try {
    const entry = await getKnowledgeById(id);
    if (!entry) return { error: `Knowledge entry ${id} not found` };
    return {
      id: entry.id,
      title: entry.title,
      category: entry.category,
      confidence: entry.confidence,
      tags: entry.tags ? JSON.parse(entry.tags) : [],
      source: entry.source,
      status: entry.status,
      content: entry.content,
      validFrom: entry.validFrom,
      validUntil: entry.validUntil,
      createdAt: entry.createdAt,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Failed to read knowledge: ${message}` };
  }
}

async function executeExploreConnections(input: Record<string, unknown>) {
  const query = input.query as string;
  try {
    const { exploreEntityNeighborhood } = await import("@/lib/knowledge/graph-rag");
    const result = await exploreEntityNeighborhood(query);
    if (!result) {
      return { query, found: false, message: `No entity matching "${query}" found in the graph. Try a different name or search the knowledge bank directly.` };
    }
    return {
      query,
      found: true,
      entity: result.center,
      connectionCount: result.connections.length,
      connections: result.connections.slice(0, 15).map((c) => ({
        name: c.name,
        type: c.type,
        relationship: c.relationship,
        weight: Math.round(c.weight * 100) / 100,
      })),
      relatedKnowledge: result.relatedKnowledge.slice(0, 5).map((k) => ({
        id: k.id,
        title: k.title,
        category: k.category,
        confidence: k.confidence,
      })),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Graph exploration failed: ${message}` };
  }
}

async function executeGetTimeline(input: Record<string, unknown>) {
  try {
    const { getTimeline } = await import("@/lib/timeline/engine");
    const events = await getTimeline({
      types: input.types as string[] | undefined,
      from: input.from as string | undefined,
      to: input.to as string | undefined,
      limit: (input.limit as number) || 20,
    });
    return { events, count: events.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Timeline fetch failed: ${message}` };
  }
}

// ── New Intelligence System Executors ──

async function executeGetIWStatus(input: Record<string, unknown>) {
  try {
    // Run auto-detection first so indicators reflect current reality
    // This is what makes the I&W module actually useful instead of showing stale 0% everywhere
    const { autoDetectIndicators } = await import("@/lib/iw/engine");
    await autoDetectIndicators();

    const scenarioId = input.scenario_id as string | undefined;
    if (scenarioId) {
      const status = await evaluateScenario(scenarioId);
      if (!status) return { error: "Scenario not found" };
      return status;
    }
    const statuses = await getAllScenarioStatuses();
    return {
      scenarios: statuses.map(s => ({
        id: s.scenarioId,
        name: s.name,
        region: s.region,
        escalationLevel: s.escalationLevel,
        escalationName: s.escalationName,
        score: s.score,
        activeIndicators: s.activeIndicatorCount,
        totalIndicators: s.totalIndicatorCount,
        marketSectors: s.marketSectors,
        marketImpact: s.marketImpact,
      })),
      highestEscalation: Math.max(...statuses.map(s => s.escalationLevel)),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `I&W status failed: ${message}` };
  }
}

async function executeGetMarketRegime() {
  try {
    const regime = await loadRegimeState("latest");
    const shifts = await getLatestShifts();
    if (!regime) {
      const fresh = await detectCurrentRegime();
      return { regime: fresh, shifts: [], note: "Fresh regime detection performed" };
    }
    return { regime, shifts };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Regime detection failed: ${message}` };
  }
}

async function executeGetCorrelationMonitor() {
  try {
    let matrix = await getLatestCorrelations();
    if (!matrix) {
      matrix = await computeCorrelationMatrix();
    }
    return matrix;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Correlation monitor failed: ${message}` };
  }
}

async function executeAssessSourceReliability(input: Record<string, unknown>) {
  try {
    const domain = input.domain as string;
    const profile = getSourceProfile(domain);
    const info = assessInformation([domain]);
    return {
      ...profile,
      admiraltyRating: formatAdmiraltyRating(profile.reliability, info.accuracy),
      informationAccuracy: info.accuracy,
      accuracyExplanation: info.explanation,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Source assessment failed: ${message}` };
  }
}

async function executeCreateACH(input: Record<string, unknown>) {
  try {
    const title = input.title as string;
    const question = input.question as string;
    const hypotheses = input.hypotheses as Array<{ label: string; description: string }> || [];
    const evidence = input.evidence as Array<{ description: string; source: string; credibility?: string; relevance?: string }> || [];

    const { id: analysisId } = await createACH(title, question);

    for (const hyp of hypotheses) {
      await addACHHypothesis(analysisId, hyp.label, hyp.description);
    }

    for (const ev of evidence) {
      await addACHEvidence(analysisId, ev.description, ev.source, (ev.credibility as "high" | "medium" | "low") || "medium", (ev.relevance as "high" | "medium" | "low") || "medium");
    }

    const result = await evaluateMatrix(analysisId);
    return { analysisId, ...result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `ACH creation failed: ${message}` };
  }
}

async function executeGetNowcast() {
  try {
    let nowcast = await getLatestNowcast();
    if (!nowcast) {
      nowcast = await generateNowcast();
    }
    return nowcast;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Nowcast failed: ${message}` };
  }
}

async function executeAnalyzeCentralBank(input: Record<string, unknown>) {
  try {
    const text = input.text as string;
    const institution = input.institution as string;
    return analyzeCentralBankText(text, institution);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Central bank analysis failed: ${message}` };
  }
}

async function executeGetCollectionGaps() {
  try {
    return await assessCoverage();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Collection gaps check failed: ${message}` };
  }
}

async function executeGetSystemicRisk(input: Record<string, unknown>) {
  try {
    const refresh = input.refresh === true;
    if (refresh) {
      return await computeSystemicRisk();
    }
    const latest = await getLatestSystemicRisk();
    if (latest) return latest;
    return await computeSystemicRisk();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Systemic risk computation failed: ${message}` };
  }
}

async function executeGetOnChain(input: Record<string, unknown>) {
  try {
    const snapshot = await getOnChainSnapshot();
    const section = input.section as string | undefined;
    if (section === "whales") return { whales: snapshot.whales };
    if (section === "flows") return { exchanges: snapshot.exchanges };
    if (section === "defi") return { defi: snapshot.defi };
    if (section === "stablecoins") return { stablecoins: snapshot.stablecoins };
    return snapshot;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `On-chain analytics failed: ${message}` };
  }
}

async function executeGetShipping(input: Record<string, unknown>) {
  try {
    const chokepoint = input.chokepoint as "hormuz" | "suez" | "malacca" | "mandeb" | "panama" | undefined;
    return await getShippingSnapshot(chokepoint);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Shipping intelligence failed: ${message}` };
  }
}

async function executeGetVesselTracking(input: Record<string, unknown>) {
  try {
    const { generateVessels } = await import("@/lib/warroom/vessels");
    const vessels = generateVessels();

    const flagFilter = input.flag as string | undefined;
    const typeFilter = input.vesselType as string | undefined;
    const regionFilter = input.region as string | undefined;

    // Region bounding boxes for filtering
    const REGION_BOUNDS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
      hormuz: { latMin: 24, latMax: 28, lngMin: 54, lngMax: 60 },
      suez: { latMin: 28, latMax: 32, lngMin: 30, lngMax: 35 },
      mandeb: { latMin: 11, latMax: 15, lngMin: 41, lngMax: 45 },
      south_china_sea: { latMin: 5, latMax: 22, lngMin: 105, lngMax: 121 },
      taiwan_strait: { latMin: 22, latMax: 26, lngMin: 117, lngMax: 122 },
      mediterranean: { latMin: 30, latMax: 42, lngMin: -5, lngMax: 36 },
      malacca: { latMin: -1, latMax: 7, lngMin: 98, lngMax: 105 },
    };

    let filtered = vessels;

    if (flagFilter) {
      const q = flagFilter.toLowerCase();
      filtered = filtered.filter((v) => v.flag.toLowerCase().includes(q));
    }

    if (typeFilter && typeFilter !== "all") {
      filtered = filtered.filter((v) => v.vesselType === typeFilter);
    }

    if (regionFilter && regionFilter !== "all") {
      const bounds = REGION_BOUNDS[regionFilter];
      if (bounds) {
        filtered = filtered.filter(
          (v) => v.lat >= bounds.latMin && v.lat <= bounds.latMax && v.lng >= bounds.lngMin && v.lng <= bounds.lngMax
        );
      }
    }

    // Group by flag for summary
    const byFlag: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const v of filtered) {
      byFlag[v.flag] = (byFlag[v.flag] || 0) + 1;
      byType[v.vesselType] = (byType[v.vesselType] || 0) + 1;
    }

    return {
      totalVessels: filtered.length,
      militaryCount: filtered.filter((v) => v.vesselType === "military").length,
      byFlag,
      byType,
      vessels: filtered.map((v) => ({
        name: v.name,
        mmsi: v.mmsi,
        flag: v.flag,
        vesselType: v.vesselType,
        lat: Number(v.lat.toFixed(4)),
        lng: Number(v.lng.toFixed(4)),
        speed: Number(v.speed.toFixed(1)),
        course: Math.round(v.course),
        destination: v.destination,
      })),
      filters: {
        flag: flagFilter || "all",
        vesselType: typeFilter || "all",
        region: regionFilter || "all",
      },
      note: "Cross-reference with get_shipping_intelligence for chokepoint analysis and get_osint_events for correlating naval movements with recent events.",
    };
  } catch (err) {
    console.error("[Vessel Tracking] Tool error:", err);
    return { error: "Failed to fetch vessel tracking data", vessels: [] };
  }
}

async function executeGetNarratives(input: Record<string, unknown>) {
  try {
    const theme = input.theme as string | undefined;
    return await getNarrativeSnapshot(theme);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Narrative tracking failed: ${message}` };
  }
}

async function executeGetChangePoints(input: Record<string, unknown>) {
  try {
    const snapshot = await getBOCPDSnapshot();
    const stream = input.stream as string | undefined;
    if (stream) {
      const filtered = snapshot.streams.find((s) => s.stream.toLowerCase().includes(stream));
      return filtered || { error: `Stream '${stream}' not found` };
    }
    return snapshot;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Change-point detection failed: ${message}` };
  }
}

async function executeGetShortInterest(input: Record<string, unknown>) {
  try {
    const snapshot = await getShortInterestSnapshot();
    const sector = input.sector as string | undefined;
    if (sector) {
      const filtered = snapshot.bySector.filter((s) => s.sector.toLowerCase().includes(sector.toLowerCase()));
      return { bySector: filtered, aggregateRatio: snapshot.aggregateRatio, aggregateSignal: snapshot.aggregateSignal };
    }
    return snapshot;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Short interest failed: ${message}` };
  }
}

async function executeGetGPR(input: Record<string, unknown>) {
  try {
    const snapshot = await getGPRSnapshot();
    const region = input.region as string | undefined;
    if (region) {
      const filtered = snapshot.regional.filter((r) => r.region.toLowerCase().includes(region.toLowerCase()));
      return { current: snapshot.current, regional: filtered };
    }
    return snapshot;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `GPR index failed: ${message}` };
  }
}

async function executeGetGEX(input: Record<string, unknown>) {
  try {
    const snapshot = await getGEXSnapshot();
    const ticker = input.ticker as string | undefined;
    if (ticker) {
      const filtered = snapshot.summaries.find((s) => s.ticker === ticker);
      return filtered || { error: `Ticker '${ticker}' not found` };
    }
    return snapshot;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Gamma exposure failed: ${message}` };
  }
}

async function executeSearchParallels(input: Record<string, unknown>) {
  try {
    const query = input.query as string;
    if (!query) return { error: "Query is required" };

    const { getSettingValue } = await import("@/lib/settings/get-setting");
    const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY) || "";

    if (!apiKey) return { error: "Anthropic API key not configured" };

    return await findHistoricalParallels(query, apiKey);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Historical parallels search failed: ${message}` };
  }
}

async function executeGetActorProfile(input: Record<string, unknown>) {
  try {
    const actorId = input.actor_id as string | undefined;

    if (actorId) {
      const profile = await getExtendedActorProfile(actorId);
      if (!profile) return { error: `Actor '${actorId}' not found` };
      return profile;
    }

    return { actors: await getAllExtendedProfiles() };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Actor profile fetch failed: ${message}` };
  }
}

async function executeGenerateReport(input: Record<string, unknown>) {
  try {
    const topic = input.topic as string | undefined;

    const { getSettingValue } = await import("@/lib/settings/get-setting");
    const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY) || "";

    if (!apiKey) return { error: "Anthropic API key not configured" };

    return await generateNarrativeReport(topic || null, apiKey);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Report generation failed: ${message}` };
  }
}

async function executeRunBayesianAnalysis(input: Record<string, unknown>) {
  try {
    const scenarioId = input.scenario_id as string | undefined;
    const rawSignals = input.signals as Array<{ description: string; actor_id: string; source?: string }> | undefined;

    // Convert user-provided signals to typed updates
    const manualSignals = rawSignals?.map(s =>
      createSignalFromOSINT(s.description, s.actor_id, (s.source as "osint" | "market" | "action" | "statement" | "calendar") || "osint")
    ) || [];

    // ── Auto-ingest live data from DB signals ──
    const liveSignalUpdates = [...manualSignals];

    // Pull recent active/upcoming signals from the platform's signal engine
    const recentDbSignals: Signal[] = await db
      .select()
      .from(schema.signals)
      .where(eq(schema.signals.status, "active"))
      .orderBy(desc(schema.signals.date))
      .limit(30);

    // Also pull upcoming high-intensity signals
    const upcomingSignals: Signal[] = await db
      .select()
      .from(schema.signals)
      .where(eq(schema.signals.status, "upcoming"))
      .orderBy(schema.signals.date)
      .limit(20);

    const allDbSignals = [...recentDbSignals, ...upcomingSignals];

    // Actor keyword mapping for auto-matching signals to scenario actors
    const actorKeywords: Record<string, string[]> = {
      us: ["united states", "us ", "usa", "american", "pentagon", "white house", "biden", "trump", "washington"],
      iran: ["iran", "tehran", "irgc", "khamenei", "persian", "hezbollah", "houthi"],
      israel: ["israel", "idf", "netanyahu", "tel aviv", "gaza", "west bank", "ben gvir"],
      saudi: ["saudi", "riyadh", "mbs", "aramco", "opec"],
      china: ["china", "beijing", "xi jinping", "pla", "taiwan strait", "south china sea"],
      russia: ["russia", "moscow", "putin", "kremlin", "ukraine"],
      taiwan: ["taiwan", "taipei", "tsmc"],
      japan: ["japan", "tokyo", "kishida"],
    };

    // Convert DB signals to Bayesian signal updates
    for (const sig of allDbSignals) {
      const text = `${sig.title} ${sig.description || ""}`.toLowerCase();
      for (const [actorId, keywords] of Object.entries(actorKeywords)) {
        if (keywords.some(kw => text.includes(kw))) {
          liveSignalUpdates.push(
            createSignalFromOSINT(
              sig.title,
              actorId,
              sig.category === "MKT" ? "market" : sig.category === "CAL" ? "calendar" : "osint"
            )
          );
        }
      }
    }

    // ── Auto-ingest recent GDELT OSINT for scenario actors ──
    const scenariosToRun = scenarioId
      ? N_PLAYER_SCENARIOS.filter(s => s.id === scenarioId)
      : N_PLAYER_SCENARIOS;

    const uniqueActors = [...new Set(scenariosToRun.flatMap(s => s.actors))];
    const gdeltQueries: Record<string, string> = {
      us: "United States military OR sanctions",
      iran: "Iran nuclear OR IRGC OR Hormuz",
      israel: "Israel military OR IDF",
      saudi: "Saudi Arabia OPEC OR oil",
      china: "China military OR Taiwan OR trade war",
      russia: "Russia Ukraine OR NATO",
      taiwan: "Taiwan strait OR TSMC",
      japan: "Japan defense OR military",
    };

    // Fetch GDELT for relevant actors (parallel, with timeout)
    const gdeltPromises = uniqueActors
      .filter(a => gdeltQueries[a])
      .map(async (actorId) => {
        try {
          const q = gdeltQueries[actorId];
          const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=ArtList&maxrecords=5&format=json&sort=DateDesc&timespan=3d`;
          const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (!resp.ok) return [];
          const data = await resp.json();
          const articles = (data.articles as Array<{ title?: string }>) || [];
          return articles.map(a => ({
            description: String(a.title || ""),
            actorId,
          }));
        } catch {
          return []; // GDELT timeout or error, continue without
        }
      });

    const gdeltResults = await Promise.all(gdeltPromises);
    for (const articles of gdeltResults) {
      for (const art of articles) {
        if (art.description) {
          liveSignalUpdates.push(createSignalFromOSINT(art.description, art.actorId, "osint"));
        }
      }
    }

    // ── Run analysis with live-enriched signals ──
    const runForScenario = (scenario: typeof N_PLAYER_SCENARIOS[0]) => {
      const beliefs = initializeBeliefs(scenario.actors);
      // Filter signals to only those relevant to this scenario's actors
      const relevantSignals = liveSignalUpdates.filter(s => {
        return !s.actorId || scenario.actors.includes(s.actorId);
      });
      const analysis = runBayesianAnalysis(scenario, beliefs, relevantSignals.length > 0 ? relevantSignals : undefined);
      return {
        scenario: {
          id: scenario.id,
          title: scenario.title,
          description: scenario.description,
          actors: scenario.actors,
          moveOrder: scenario.moveOrder,
          strategies: scenario.strategies,
          coalitions: scenario.coalitions,
          marketSectors: scenario.marketSectors,
          timeHorizon: scenario.timeHorizon,
        },
        analysis,
        liveDataSources: {
          dbSignals: allDbSignals.length,
          gdeltArticles: gdeltResults.flat().length,
          manualSignals: manualSignals.length,
          totalSignalUpdates: relevantSignals.length,
        },
      };
    };

    if (scenarioId) {
      const scenario = N_PLAYER_SCENARIOS.find(s => s.id === scenarioId);
      if (!scenario) {
        return { error: `Scenario not found: ${scenarioId}. Available: ${N_PLAYER_SCENARIOS.map(s => s.id).join(", ")}` };
      }
      return runForScenario(scenario);
    }

    const results = scenariosToRun.map(runForScenario);
    return { scenarios: results, count: results.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Bayesian analysis failed: ${message}` };
  }
}

// ── Longevity Risk Analysis ──

async function executeLongevityAnalysis(input: Record<string, unknown>) {
  const name = input.name as string;
  const timeframeYears = (input.timeframe_years as number) || 5;

  if (!name) return { error: "Name is required" };

  try {
    // Gather OSINT in parallel
    const [newsArticles, healthNews, wikiSummary] = await Promise.all([
      searchGDELTForLongevity(`"${name}"`, 15),
      searchGDELTForLongevity(`"${name}" (health OR medical OR hospital OR diet OR exercise OR illness OR disease OR surgery OR age)`, 10),
      getWikiSummaryForLongevity(name),
    ]);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { error: "AI API key not configured" };

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const newsCtx = newsArticles.length > 0
      ? `\n\nRecent news:\n${newsArticles.map((a) => `- ${a.title} (${a.source})`).join("\n")}`
      : "";
    const healthCtx = healthNews.length > 0
      ? `\n\nHealth-related news:\n${healthNews.map((a) => `- ${a.title} (${a.source})`).join("\n")}`
      : "";
    const wikiCtx = wikiSummary ? `\n\nWikipedia: ${wikiSummary}` : "";

    const prompt = `You are an actuarial intelligence analyst. Produce a longevity risk assessment for a public figure based on publicly available information. This is for geopolitical and market risk analysis.

Subject: ${name}
Timeframe: ${timeframeYears} years
${wikiCtx}${newsCtx}${healthCtx}

Return ONLY valid JSON:
{
  "subject": { "name": "string", "age": number|null, "nationality": "string", "role": "string", "significance": "string" },
  "riskFactors": {
    "age": { "score": 1-10, "rationale": "string" },
    "knownHealthConditions": { "score": 1-10, "rationale": "string" },
    "lifestyle": { "score": 1-10, "rationale": "string" },
    "occupationalStress": { "score": 1-10, "rationale": "string" },
    "securityThreats": { "score": 1-10, "rationale": "string" },
    "mentalHealth": { "score": 1-10, "rationale": "string" },
    "geneticIndicators": { "score": 1-10, "rationale": "string" },
    "accessToHealthcare": { "score": 1-10, "rationale": "string" },
    "substanceUse": { "score": 1-10, "rationale": "string" }
  },
  "compositeScore": {
    "overallRisk": 1-10,
    "survivalProbability": 0.0-1.0,
    "confidence": 0.0-1.0,
    "primaryConcerns": ["string"],
    "mitigatingFactors": ["string"]
  },
  "geopoliticalImpact": {
    "successionRisk": "string",
    "marketSectors": ["string"],
    "estimatedMarketImpact": "low|moderate|high|severe",
    "keyDependencies": ["string"]
  },
  "timeline": { "shortTerm": "string", "mediumTerm": "string", "trendDirection": "improving|stable|declining|unknown" },
  "intelligenceGaps": ["string"]
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "Failed to parse analysis", raw: text.slice(0, 500) };

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { error: `Longevity analysis failed: ${msg}` };
  }
}

async function searchGDELTForLongevity(query: string, max = 15) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${max}&format=json&sort=datedesc`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.articles || []).map((a: { title: string; domain: string; seendate: string }) => ({
      title: a.title, source: a.domain, date: a.seendate,
    }));
  } catch { return []; }
}

async function getWikiSummaryForLongevity(name: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=1&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const title = data?.query?.search?.[0]?.title;
    if (!title) return null;
    const c2 = new AbortController();
    const t2 = setTimeout(() => c2.abort(), 8000);
    const res2 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { signal: c2.signal });
    clearTimeout(t2);
    if (!res2.ok) return null;
    return (await res2.json())?.extract || null;
  } catch { return null; }
}

// ── Contagion Analysis Executor ──

async function executeContagionAnalysis(input: Record<string, unknown>) {
  try {
    const { propagateShock, summarizeContagion } = await import("@/lib/contagion/engine");
    const result = propagateShock(
      {
        trigger: (input.trigger_description as string) || `${input.source_asset} shock`,
        sourceAsset: input.source_asset as string,
        shockMagnitude: input.shock_magnitude as number,
        shockType: "price",
      },
      (input.max_order as number) || 3,
    );

    return {
      summary: summarizeContagion(result),
      trigger: result.trigger,
      totalAssetsAffected: result.totalAssetsAffected,
      highestOrderReached: result.highestOrderReached,
      impacts: result.impacts.map(i => ({
        asset: i.asset,
        expectedMove: `${i.direction === "up" ? "+" : ""}${(i.expectedMove * 100).toFixed(2)}%`,
        direction: i.direction,
        confidence: i.confidence,
        order: i.order,
        pathway: i.pathway.join(" -> "),
        mechanism: i.mechanism,
        lag: i.lag,
        tradingImplication: i.tradingImplication,
      })),
    };
  } catch (err) {
    return { error: `Contagion analysis failed: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

// ── Attribution Executor ──

async function executeGetAttribution(input: Record<string, unknown>) {
  try {
    const { buildAttributionChain, generateAttributionReport } = await import("@/lib/attribution/engine");
    const ticker = input.ticker as string | undefined;

    if (ticker) {
      const chain = await buildAttributionChain(ticker);
      if (!chain) return { error: `No position found for ${ticker}` };
      return chain;
    }

    const report = await generateAttributionReport();
    return {
      totalPnl: report.totalPnl,
      realizedPnl: report.totalRealizedPnl,
      unrealizedPnl: report.totalUnrealizedPnl,
      positionCount: report.chains.length,
      layerSummary: report.layerSummary,
      signalPerformance: report.signalPerformance.slice(0, 10),
      chains: report.chains.slice(0, 20),
      unattributed: report.unattributed,
    };
  } catch (err) {
    return { error: `Attribution failed: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

// ── Scenario Branches Executor ──

async function executeGetScenarioBranches() {
  try {
    const { getActiveBranchSets, identifyUpcomingCatalysts } = await import("@/lib/thesis/branching");
    const [branches, catalysts] = await Promise.all([
      getActiveBranchSets(),
      Promise.resolve(identifyUpcomingCatalysts()),
    ]);

    return {
      upcomingCatalysts: catalysts.map(c => ({
        name: c.name,
        date: c.expectedDate,
        category: c.category,
        importance: c.importance,
        consensus: c.consensusExpectation,
        affectedTickers: c.affectedTickers,
      })),
      preComputedBranches: branches.map(bs => ({
        catalyst: bs.catalyst.name,
        catalystDate: bs.catalyst.expectedDate,
        baseThesisId: bs.baseThesisId,
        branchCount: bs.branches.length,
        branches: bs.branches.map(b => ({
          scenario: b.scenarioName,
          probability: `${(b.probability * 100).toFixed(0)}%`,
          condition: b.condition,
          regimeShift: b.thesisRevision.marketRegimeShift || "none",
          volShift: b.thesisRevision.volatilityShift || "none",
          actionOverrides: b.thesisRevision.tradingActionOverrides.length,
          narrative: b.thesisRevision.narrativeGuidance,
          marketExpectations: b.marketExpectations.map(me =>
            `${me.ticker}: ${me.direction === "up" ? "+" : ""}${(me.expectedMove * 100).toFixed(1)}% (${me.timeframe})`
          ),
        })),
      })),
      totalPendingBranches: branches.reduce((sum, bs) => sum + bs.branches.length, 0),
    };
  } catch (err) {
    return { error: `Scenario branches failed: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

async function executeGenerateDocument(input: Record<string, unknown>) {
  const format = input.format as "pdf" | "pptx";
  const title = input.title as string;
  const sections = input.sections as Array<{
    heading: string;
    content: string;
    bullets?: string[];
  }>;

  if (!format || !title || !sections?.length) {
    return { error: "Missing format, title, or sections" };
  }

  // Return structured data for the client widget to handle download
  return {
    format,
    title,
    sections,
    slideCount: sections.length,
    generatedAt: new Date().toISOString(),
  };
}

// ── Platform Expansion Tool Executors ──

async function executeManageExecutionRules(input: Record<string, unknown>, context?: ToolContext) {
  try {
    const { getRules, createRule, updateRule, deleteRule, toggleRule } = await import("@/lib/execution/rules");
    const username = context?.username || "legacy";
    const action = input.action as string;

    switch (action) {
      case "list":
        return { rules: await getRules(username) };
      case "create":
        if (!input.name || !input.conditions) return { error: "name and conditions required" };
        return await createRule(username, {
          name: input.name as string,
          conditions: input.conditions as any,
          sizingStrategy: input.sizingStrategy as string,
          broker: input.broker as string,
        });
      case "update":
        if (!input.ruleId) return { error: "ruleId required" };
        return await updateRule(input.ruleId as number, username, input as any);
      case "delete":
        if (!input.ruleId) return { error: "ruleId required" };
        return { deleted: await deleteRule(input.ruleId as number, username) };
      case "toggle":
        if (!input.ruleId) return { error: "ruleId required" };
        return await toggleRule(input.ruleId as number, username, input.enabled as boolean);
      default:
        return { error: "Invalid action. Use: list, create, update, delete, toggle" };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Execution rules operation failed" };
  }
}

async function executeGetExecutionLog(input: Record<string, unknown>, context?: ToolContext) {
  try {
    const { getExecutionLog } = await import("@/lib/execution/engine");
    const limit = (input.limit as number) || 20;
    const log = await getExecutionLog(context?.username || "legacy", limit);
    return { entries: log, count: log.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch execution log" };
  }
}

async function executeToggleKillSwitch(input: Record<string, unknown>, context?: ToolContext) {
  try {
    const { getKillSwitchStatus, activateKillSwitch, deactivateKillSwitch } = await import("@/lib/execution/kill-switch");
    const username = context?.username || "legacy";
    const active = input.active as boolean;

    if (active) {
      await activateKillSwitch(username, (input.reason as string) || "Activated via chat", username);
    } else {
      await deactivateKillSwitch(username);
    }

    return await getKillSwitchStatus(username);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Kill switch operation failed" };
  }
}

async function executeAnalyzeSentiment(input: Record<string, unknown>) {
  try {
    const { analyzeSentiment, analyzeCentralBankDeep, analyzeEarningsDeep } = await import("@/lib/nlp/sentiment-engine");
    const text = input.text as string;
    const sourceType = input.sourceType as string;

    if (sourceType === "central_bank" && input.institution) {
      return await analyzeCentralBankDeep(text, input.institution as string);
    }
    if (sourceType === "earnings" && input.company) {
      return await analyzeEarningsDeep(text, input.company as string);
    }
    return await analyzeSentiment(text, sourceType);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sentiment analysis failed" };
  }
}

async function executeGetSentimentTrends(input: Record<string, unknown>) {
  try {
    const entity = input.entity as string;
    const days = (input.days as number) || 7;

    if (entity) {
      const { trackToneShift, getSentimentTimeline } = await import("@/lib/nlp/tone-tracker");
      const [toneShift, timeline] = await Promise.all([
        trackToneShift(entity, days),
        getSentimentTimeline(entity, days),
      ]);
      return { entity, toneShift, timeline, dataPoints: timeline.length };
    }

    const { getAggregatedSentiment } = await import("@/lib/nlp/batch-analyzer");
    return await getAggregatedSentiment(undefined, days * 24);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sentiment trends failed" };
  }
}

async function executeGetOrderBook(input: Record<string, unknown>) {
  try {
    const { getOrderBook, computeMicrostructure } = await import("@/lib/market-data/orderbook");
    const symbol = input.symbol as string;
    const book = await getOrderBook(symbol);
    const metrics = computeMicrostructure(book);
    return {
      ...metrics,
      topBids: book.bids.slice(0, 5).map(l => ({ price: l.price, size: l.size })),
      topAsks: book.asks.slice(0, 5).map(l => ({ price: l.price, size: l.size })),
      totalLevels: { bids: book.bids.length, asks: book.asks.length },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Order book fetch failed" };
  }
}

async function executeGetSupplyChainTool(input: Record<string, unknown>) {
  try {
    const { getSupplyChain } = await import("@/lib/supply-chain/graph");
    const entity = input.entity as string;
    const depth = (input.depth as number) || 3;
    const nodes = await getSupplyChain(entity, depth);
    return { entity, nodes, totalNodes: nodes.length, maxDepth: depth };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Supply chain query failed" };
  }
}

async function executeAnalyzeSupplyChainExposure(input: Record<string, unknown>) {
  try {
    const { getExposure } = await import("@/lib/supply-chain/graph");
    return await getExposure(input.entity as string);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Exposure analysis failed" };
  }
}

async function executeGetSatelliteImagery(input: Record<string, unknown>) {
  try {
    const { getRecentImagery } = await import("@/lib/satellite/copernicus-client");
    const { getNightlightActivity } = await import("@/lib/satellite/viirs");

    const bbox = {
      north: input.north as number,
      south: input.south as number,
      east: input.east as number,
      west: input.west as number,
    };
    const regionName = input.regionName as string;
    const days = (input.days as number) || 30;

    const [imagery, activity] = await Promise.all([
      getRecentImagery(regionName, bbox, days),
      getNightlightActivity(bbox),
    ]);

    return {
      regionName,
      imageryCount: imagery.length,
      imagery: imagery.slice(0, 5),
      thermalActivity: activity,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Satellite imagery failed" };
  }
}

async function executeGetMlModels() {
  try {
    const models = await db.select({
      id: schema.mlModels.id,
      name: schema.mlModels.name,
      modelType: schema.mlModels.modelType,
      target: schema.mlModels.target,
      status: schema.mlModels.status,
      sampleCount: schema.mlModels.sampleCount,
      metrics: schema.mlModels.metrics,
      trainingDate: schema.mlModels.trainingDate,
    }).from(schema.mlModels).orderBy(desc(schema.mlModels.createdAt));

    return {
      models: models.map(m => ({
        ...m,
        metrics: m.metrics ? JSON.parse(m.metrics) : null,
      })),
      count: models.length,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "ML models query failed" };
  }
}

async function executeGetFeatureImportance(input: Record<string, unknown>) {
  try {
    const { getTopFeatures } = await import("@/lib/ml/feature-importance");
    const { getActiveModel } = await import("@/lib/ml/inference");

    let modelId = input.modelId as number;
    if (!modelId) {
      const active = await getActiveModel("direction");
      if (!active) return { error: "No active ML model found" };
      modelId = active.id;
    }

    const features = await getTopFeatures(modelId);
    return { modelId, features, count: features.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Feature importance query failed" };
  }
}

async function executeGetUnifiedPortfolio(context?: ToolContext) {
  try {
    const { getUnifiedPortfolio } = await import("@/lib/portfolio/aggregator");
    return await getUnifiedPortfolio(context?.username || "legacy");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Portfolio aggregation failed" };
  }
}

async function executeGetFlowImbalance(input: Record<string, unknown>) {
  try {
    const { snapshotAndStore } = await import("@/lib/market-data/orderbook");
    const metrics = await snapshotAndStore(input.symbol as string);
    return {
      symbol: metrics.symbol,
      imbalanceRatio: metrics.imbalanceRatio,
      flowDirection: metrics.flowDirection,
      spreadBps: metrics.spreadBps,
      liquidityScore: metrics.liquidityScore,
      depth: { bid: metrics.depth5Bid, ask: metrics.depth5Ask },
      alert: metrics.imbalanceRatio > 0.7 || metrics.imbalanceRatio < 0.3
        ? `${metrics.flowDirection.toUpperCase()} detected (ratio: ${metrics.imbalanceRatio})`
        : null,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Flow imbalance check failed" };
  }
}

// ── Opportunity Analysis ──

async function executeAnalyzeOpportunity(input: Record<string, unknown>) {
  const description = input.description as string;
  const type = input.type as string;
  const timeframe = (input.timeframe as string) || "3 months";
  const symbols = (input.symbols as string[]) || [];
  const conviction = input.conviction as number | undefined;
  const actors = (input.actors as string[]) || [];
  const scenarioId = input.scenario_id as string | undefined;

  if (!description) return { error: "description is required" };
  if (!["market", "geopolitical", "hybrid"].includes(type)) {
    return { error: "type must be market, geopolitical, or hybrid" };
  }

  try {
    // Run all independent data fetches in parallel instead of sequential
    // Each of these is independent and best-effort, so parallel is safe
    const [knowledgeResult, signalResult, marketResult, gameTheoryResult, actorResult, regimeResult] = await Promise.allSettled([
      // 1. Knowledge context
      searchKnowledge(description, { limit: 5 }).catch(() => []),
      // 2. Signal convergence
      db.select().from(schema.signals).where(eq(schema.signals.status, "upcoming")).orderBy(desc(schema.signals.intensity)).catch(() => []),
      // 3. Market data
      (symbols.length > 0 && (type === "market" || type === "hybrid"))
        ? Promise.allSettled(symbols.slice(0, 5).map(async (sym) => {
            const { getDailySeries } = await import("@/lib/market-data/provider");
            const [quote, snapshot] = await Promise.allSettled([
              getQuoteData(sym.toUpperCase()),
              getDailySeries(sym.toUpperCase()).then((data) => computeTechnicalSnapshot(sym.toUpperCase(), data)),
            ]);
            const q = quote.status === "fulfilled" ? quote.value : null;
            const s = snapshot.status === "fulfilled" ? snapshot.value : null;
            return { symbol: sym.toUpperCase(), price: q?.price ?? null, change: q?.changePercent ?? null, rsi: s?.rsi14 ?? null, trend: s?.trend ?? null, volatilityRegime: s?.volatilityRegime ?? null };
          }))
        : Promise.resolve([]),
      // 4. Game theory (analyzeScenario is synchronous, wrap in promise)
      ((type === "geopolitical" || type === "hybrid") && scenarioId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? Promise.resolve().then(() => analyzeScenario(scenarioId as any)).catch(() => null)
        : Promise.resolve(null),
      // 5. Actor profiles (skipKnowledge to avoid N vector searches)
      actors.length > 0
        ? Promise.allSettled(actors.slice(0, 4).map((a) => getExtendedActorProfile(a, { skipKnowledge: true })))
        : Promise.resolve([]),
      // 6. Regime
      loadRegimeState("current").catch(() => null),
    ]);

    // Process knowledge
    let knowledgeContext: { count: number; entries: Array<{ title: string; summary: string }> } = { count: 0, entries: [] };
    if (knowledgeResult.status === "fulfilled") {
      const knowledge = knowledgeResult.value as Awaited<ReturnType<typeof searchKnowledge>>;
      knowledgeContext = {
        count: knowledge.length,
        entries: knowledge.slice(0, 3).map((k: Record<string, unknown>) => ({
          title: (k.title as string) || "Untitled",
          summary: ((k.content as string) || "").slice(0, 200),
        })),
      };
    }

    // Process signals
    let signalSupport: { count: number; maxIntensity: number; sectors: string[] } = { count: 0, maxIntensity: 0, sectors: [] };
    if (signalResult.status === "fulfilled") {
      const allSignals = signalResult.value as Signal[];
      const STOP_WORDS = new Set(["the","a","an","if","of","in","on","to","for","and","or","is","are","long","short","buy","sell","will","may","could","should","would","that","this","with","from","into","when","then"]);
      const keywords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
      const relevant = allSignals.filter(
        (s) => s.intensity >= 3 || (s.description && keywords.some(kw => s.description!.toLowerCase().includes(kw)))
      );
      const sectorSet = new Set<string>();
      relevant.forEach((s) => {
        const sectors = s.marketSectors as string[] | null;
        if (sectors) sectors.forEach((sec) => sectorSet.add(sec));
      });
      signalSupport = { count: relevant.length, maxIntensity: relevant.length > 0 ? relevant[0].intensity : 0, sectors: Array.from(sectorSet).slice(0, 8) };
    }

    // Process market data
    type MarketDataItem = { symbol: string; price: number | null; change: number | null; rsi: number | null; trend: string | null; volatilityRegime: string | null };
    let marketData: MarketDataItem[] = [];
    if (marketResult.status === "fulfilled") {
      const results = marketResult.value as PromiseSettledResult<MarketDataItem>[];
      marketData = results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<MarketDataItem>).value);
    }

    // Process game theory
    let gameTheoryContext: { scenario: string | null; nashEquilibria: number; dominantOutcome: string | null; marketDirection: string | null; escalationRisk: string | null } = { scenario: null, nashEquilibria: 0, dominantOutcome: null, marketDirection: null, escalationRisk: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (gameTheoryResult.status === "fulfilled" && gameTheoryResult.value && !("error" in (gameTheoryResult.value as any))) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analysis = gameTheoryResult.value as any;
      gameTheoryContext = {
        scenario: scenarioId || null,
        nashEquilibria: analysis.nashEquilibria?.length || 0,
        dominantOutcome: analysis.nashEquilibria?.[0]?.label || null,
        marketDirection: analysis.marketAssessment?.direction || null,
        escalationRisk: analysis.escalationLadder?.[0]?.level ? `Level ${analysis.escalationLadder[analysis.escalationLadder.length - 1]?.level || "?"}` : null,
      };
    }

    // Process actor profiles
    let actorProfiles: Array<{ id: string; name: string; type: string }> = [];
    if (actorResult.status === "fulfilled") {
      const profiles = actorResult.value as PromiseSettledResult<ExtendedActorProfile | null>[];
      actorProfiles = profiles
        .filter((r) => r.status === "fulfilled" && !!(r as PromiseFulfilledResult<unknown>).value)
        .map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = (r as PromiseFulfilledResult<any>).value;
          return { id: (v.id as string) || "", name: (v.name as string) || "", type: (v.type as string) || "" };
        });
    }

    // Process regime
    let regimeContext: { label: string | null; score: number | null } = { label: null, score: null };
    if (regimeResult.status === "fulfilled" && regimeResult.value) {
      const regime = regimeResult.value as Record<string, unknown>;
      regimeContext = { label: (regime.label as string) || null, score: (regime.compositeScore as number) || null };
    }

    // 7. Compute asymmetry assessment
    const asymmetry = computeAsymmetryScore({
      conviction,
      signalCount: signalSupport.count,
      maxIntensity: signalSupport.maxIntensity,
      hasGameTheory: gameTheoryContext.scenario !== null,
      nashCount: gameTheoryContext.nashEquilibria,
      marketDirection: gameTheoryContext.marketDirection,
      regimeScore: regimeContext.score,
      knowledgeCount: knowledgeContext.count,
    });

    return {
      opportunity: { description, type, timeframe, conviction: conviction ?? null },
      asymmetry,
      signalSupport,
      marketData: marketData.length > 0 ? marketData : null,
      gameTheory: gameTheoryContext.scenario ? gameTheoryContext : null,
      actors: actorProfiles.length > 0 ? actorProfiles : null,
      regime: regimeContext,
      knowledgeContext,
      monetizationPaths: deriveMonetizationPaths(type, symbols, marketData, gameTheoryContext),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Opportunity analysis failed: ${message}` };
  }
}

function computeAsymmetryScore(params: {
  conviction?: number | null;
  signalCount: number;
  maxIntensity: number;
  hasGameTheory: boolean;
  nashCount: number;
  marketDirection: string | null;
  regimeScore: number | null;
  knowledgeCount: number;
}): {
  score: number;
  grade: string;
  upsideMultiple: number;
  downsideExposure: string;
  crowdedness: string;
  timingSignal: string;
  factors: string[];
} {
  let score = 0.5; // neutral baseline
  const factors: string[] = [];

  // Signal convergence support
  if (params.maxIntensity >= 4) {
    score += 0.15;
    factors.push(`High-intensity signal convergence (${params.maxIntensity}/5)`);
  } else if (params.maxIntensity >= 3) {
    score += 0.08;
    factors.push(`Moderate signal convergence (${params.maxIntensity}/5)`);
  }

  // Multiple signals compound
  if (params.signalCount >= 3) {
    score += 0.05;
    factors.push(`${params.signalCount} supporting signals detected`);
  }

  // Game theory alignment
  if (params.hasGameTheory) {
    if (params.nashCount === 1) {
      score += 0.1;
      factors.push("Single Nash equilibrium (clear strategic outcome)");
    } else if (params.nashCount > 1) {
      score += 0.03;
      factors.push(`${params.nashCount} Nash equilibria (outcome uncertain)`);
    }
  }

  // Conviction adjustment
  if (params.conviction != null) {
    if (params.conviction > 0.7) {
      score += 0.05;
      factors.push("High prior conviction");
    } else if (params.conviction < 0.3) {
      score -= 0.05;
      factors.push("Low prior conviction (contrarian or speculative)");
    }
  }

  // Knowledge base context
  if (params.knowledgeCount >= 3) {
    score += 0.05;
    factors.push("Strong knowledge base context available");
  }

  // Regime alignment
  if (params.regimeScore != null) {
    if (params.regimeScore < -0.3 && params.marketDirection === "bearish") {
      score += 0.08;
      factors.push("Regime confirms bearish thesis (risk-off environment)");
    } else if (params.regimeScore > 0.3 && params.marketDirection === "bullish") {
      score += 0.08;
      factors.push("Regime confirms bullish thesis (risk-on environment)");
    } else if (params.regimeScore != null && params.marketDirection) {
      score -= 0.05;
      factors.push("Regime and thesis direction misaligned");
    }
  }

  // Clamp
  score = Math.max(0.1, Math.min(0.95, score));

  // Derive properties from score
  const upsideMultiple = score > 0.7 ? 3.0 : score > 0.5 ? 2.0 : score > 0.3 ? 1.5 : 1.0;

  const grade =
    score >= 0.8 ? "A" :
    score >= 0.65 ? "B" :
    score >= 0.5 ? "C" :
    score >= 0.35 ? "D" : "F";

  const downsideExposure =
    score >= 0.7 ? "contained" :
    score >= 0.5 ? "moderate" :
    score >= 0.3 ? "elevated" : "high";

  // Crowdedness heuristic: fewer signals + fewer knowledge hits = less crowded
  const crowdedness =
    params.signalCount <= 1 && params.knowledgeCount <= 1 ? "low (early/undiscovered)" :
    params.signalCount <= 3 ? "moderate" : "high (well-known)";

  // Timing signal based on intensity trend
  const timingSignal =
    params.maxIntensity >= 4 ? "act soon (high convergence)" :
    params.maxIntensity >= 3 ? "prepare (building)" :
    "monitor (early stage)";

  return { score, grade, upsideMultiple, downsideExposure, crowdedness, timingSignal, factors };
}

function deriveMonetizationPaths(
  type: string,
  symbols: string[],
  marketData: Array<{ symbol: string; price: number | null; trend: string | null }>,
  gameTheory: { marketDirection: string | null }
): Array<{ path: string; instruments: string[]; rationale: string }> {
  const paths: Array<{ path: string; instruments: string[]; rationale: string }> = [];

  if (type === "market" || type === "hybrid") {
    if (symbols.length > 0) {
      paths.push({
        path: "Direct position",
        instruments: symbols,
        rationale: `${gameTheory.marketDirection || "Directional"} exposure via identified instruments`,
      });

      // Check for options opportunity based on trend
      const trendsAvailable = marketData.some((m) => m.trend);
      if (trendsAvailable) {
        paths.push({
          path: "Options strategy",
          instruments: symbols.map((s) => `${s} options`),
          rationale: "Defined-risk exposure with leverage; suitable for asymmetric thesis",
        });
      }
    }

    paths.push({
      path: "Sector ETF",
      instruments: type === "hybrid" ? ["XLE", "XLF", "ITA", "XLK"] : symbols,
      rationale: "Broader sector exposure if single-name conviction insufficient",
    });
  }

  if (type === "geopolitical" || type === "hybrid") {
    paths.push({
      path: "Volatility",
      instruments: ["VIX calls", "UVXY", "VIXY"],
      rationale: "Long volatility ahead of geopolitical catalyst",
    });

    paths.push({
      path: "Safe haven rotation",
      instruments: ["GLD", "TLT", "CHF", "JPY"],
      rationale: "Defensive positioning if escalation materializes",
    });
  }

  return paths;
}

// ── Calculator Tool ──

function executeCalculate(input: Record<string, unknown>) {
  const expressions = input.expressions as Array<{ label: string; expr: string }>;
  if (!expressions || !Array.isArray(expressions) || expressions.length === 0) {
    return { error: "expressions array is required and must not be empty" };
  }

  const scope: Record<string, number> = {};
  const results: Array<{ label: string; expression: string; result: number | string }> = [];

  for (const { label, expr } of expressions) {
    try {
      const value = mathEvaluate(expr, scope);
      const numValue = typeof value === "number" ? value :
        typeof value?.toNumber === "function" ? value.toNumber() : Number(value);
      scope[label] = numValue;
      results.push({ label, expression: expr, result: numValue });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid expression";
      scope[label] = NaN;
      results.push({ label, expression: expr, result: `ERROR: ${message}` });
    }
  }

  return { results, variables: scope };
}

async function executeGetSocialSentiment(input: Record<string, unknown>) {
  try {
    const { getCachedSentiment, getAllCachedSentiments, getTrackedTopics, scanCustomTopic, needsScan, runSentimentScan } = await import("@/lib/sentiment/aggregator");
    const topic = input.topic as string | undefined;

    // If cache is empty, trigger a non-blocking scan
    if (needsScan()) {
      runSentimentScan().catch(() => {});
    }

    if (topic) {
      // Try cache first
      const cached = getCachedSentiment(topic);
      if (cached) return cached;

      // On-demand scan for custom topic
      const result = await scanCustomTopic(
        topic,
        `"${topic}" -is:retweet lang:en`
      );
      return result;
    }

    // Return all tracked sentiments
    const all = getAllCachedSentiments();
    return {
      trackedTopics: getTrackedTopics(),
      sentiments: all.map((s) => ({
        topic: s.topic,
        sentiment: s.composite.sentiment,
        label: s.composite.label,
        confidence: s.composite.confidence,
        postCount: s.composite.postCount,
        poisoning: s.poisoning.detected ? s.poisoning : null,
        sources: {
          twitter: s.sources.twitter.available ? { count: s.sources.twitter.count, sentiment: s.sources.twitter.credibilityWeightedSentiment } : null,
          reddit: s.sources.reddit.available ? { count: s.sources.reddit.count, sentiment: s.sources.reddit.credibilityWeightedSentiment } : null,
          stocktwits: s.sources.stocktwits.available ? { count: s.sources.stocktwits.count, sentiment: s.sources.stocktwits.credibilityWeightedSentiment } : null,
        },
        lastUpdated: s.lastUpdated,
      })),
      count: all.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Social sentiment failed: ${message}` };
  }
}
