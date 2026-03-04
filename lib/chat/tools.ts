import { db, schema } from "@/lib/db";
import { eq, desc, gte, lte } from "drizzle-orm";
import { SCENARIOS } from "@/lib/game-theory/actors";
import { analyzeScenario } from "@/lib/game-theory/analysis";
import { Trading212Client } from "@/lib/trading212/client";
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
    name: "get_portfolio",
    description:
      "Get the current Trading 212 portfolio including positions, P&L, and account value. This calls the live API.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
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
    case "get_portfolio":
      return executeGetPortfolio();
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function executeGetSignals(input: Record<string, unknown>) {
  const status = (input.status as string) || "upcoming";
  const minIntensity = (input.min_intensity as number) || 1;
  const limit = (input.limit as number) || 20;

  const rows = db
    .select()
    .from(schema.signals)
    .where(eq(schema.signals.status, status))
    .orderBy(schema.signals.date)
    .all()
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

  const row = db
    .select()
    .from(schema.marketSnapshots)
    .where(eq(schema.marketSnapshots.symbol, symbol))
    .orderBy(desc(schema.marketSnapshots.createdAt))
    .limit(1)
    .get();

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
  const thesis = db
    .select()
    .from(schema.theses)
    .orderBy(desc(schema.theses.generatedAt))
    .limit(1)
    .get();

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
  const thesis = db
    .select()
    .from(schema.theses)
    .where(eq(schema.theses.status, "active"))
    .orderBy(desc(schema.theses.generatedAt))
    .limit(1)
    .get();

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
      rows = db
        .select()
        .from(schema.predictions)
        .orderBy(desc(schema.predictions.createdAt))
        .all()
        .filter((p) => !p.outcome);
    } else {
      rows = db
        .select()
        .from(schema.predictions)
        .where(eq(schema.predictions.outcome, status))
        .orderBy(desc(schema.predictions.createdAt))
        .all();
    }
  } else {
    rows = db
      .select()
      .from(schema.predictions)
      .orderBy(desc(schema.predictions.createdAt))
      .all();
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

async function executeGetPortfolio() {
  // Get API key + secret from settings or env
  const apiKeySetting = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_api_key"))
    .get();

  const apiSecretSetting = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_api_secret"))
    .get();

  const apiKey = apiKeySetting?.value || process.env.TRADING212_API_KEY;
  const apiSecret = apiSecretSetting?.value || process.env.TRADING212_SECRET;

  if (!apiKey || !apiSecret) {
    return { error: "Trading 212 API key and secret not configured." };
  }

  const envSetting = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_environment"))
    .get();

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
