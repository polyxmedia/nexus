/**
 * Thesis Scenario Branching System
 *
 * Pre-computes thesis variants for upcoming catalysts so when the event
 * hits, the response is instant. No waiting for regeneration.
 *
 * "If CPI comes in hot, here's the revised thesis."
 * "If FOMC is hawkish, here's what changes."
 * "If OPEC cuts production, here are the trades."
 *
 * The fund that has pre-computed their response outperforms the fund
 * that scrambles to analyze after the headline.
 */

import { db, schema } from "../db";
import { eq, desc, like } from "drizzle-orm";

// ── Types ──

export interface CatalystDefinition {
  id: string;
  name: string;
  expectedDate: string;
  category: "economic" | "geopolitical" | "policy" | "earnings" | "election";
  consensusExpectation?: string;
  priorValue?: string;
  affectedSectors: string[];
  affectedTickers: string[];
  importance: "high" | "medium" | "low";
}

export interface TradingActionOverride {
  ticker: string;
  action: "add" | "remove" | "modify";
  direction?: "BUY" | "SELL" | "HOLD";
  rationale: string;
  confidence?: number;
  riskLevel?: "low" | "medium" | "high";
}

export interface ScenarioBranch {
  id: string;
  catalystId: string;
  scenarioName: string;
  probability: number;
  condition: string;
  thesisRevision: {
    marketRegimeShift?: string;
    volatilityShift?: string;
    confidenceAdjustment: number;
    tradingActionOverrides: TradingActionOverride[];
    narrativeGuidance: string;
  };
  marketExpectations: {
    ticker: string;
    expectedMove: number;
    direction: "up" | "down";
    timeframe: string;
  }[];
}

export interface ThesisBranchSet {
  id: string;
  baseThesisId: number;
  catalyst: CatalystDefinition;
  branches: ScenarioBranch[];
  createdAt: string;
  status: "pending" | "activated" | "expired";
  activatedBranchId?: string;
  activatedAt?: string;
}

// ── Economic Calendar ──

// FOMC 2026 dates
const FOMC_2026 = [
  "2026-01-28", "2026-03-18", "2026-05-06", "2026-06-17",
  "2026-07-29", "2026-09-16", "2026-11-04", "2026-12-16",
];

// OPEC+ meetings 2026 (approximate quarterly schedule)
const OPEC_2026 = [
  "2026-03-05", "2026-06-04", "2026-09-03", "2026-12-03",
];

function getNextFirstFriday(fromDate: Date): Date {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();

  // Try this month first, then next month
  for (let m = month; m <= month + 1; m++) {
    const d = new Date(year, m, 1);
    // Find first Friday
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
    if (d > fromDate) return d;
  }
  // Fallback
  const d = new Date(year, month + 2, 1);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  return d;
}

function getCPIDate(fromDate: Date): Date {
  // CPI typically released 10th-14th of the month
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();

  for (let m = month; m <= month + 1; m++) {
    // Assume 12th of month as typical CPI release
    const d = new Date(year, m, 12);
    // If it falls on weekend, move to next weekday
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    if (d > fromDate) return d;
  }
  return new Date(year, month + 2, 12);
}

function getGDPDate(fromDate: Date): Date {
  // GDP advance estimate: last week of Jan, Apr, Jul, Oct
  const year = fromDate.getFullYear();
  const gdpMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct

  for (const m of gdpMonths) {
    const d = new Date(year, m, 28);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    if (d > fromDate) return d;
  }
  // Next year Jan
  return new Date(year + 1, 0, 28);
}

function findNextDate(dates: string[], fromDate: Date): string | null {
  const fromStr = fromDate.toISOString().split("T")[0];
  for (const d of dates) {
    if (d >= fromStr) return d;
  }
  return null;
}

/**
 * Identify upcoming catalysts for the next 14 days.
 */
export function identifyUpcomingCatalysts(): CatalystDefinition[] {
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const catalysts: CatalystDefinition[] = [];

  // FOMC
  const nextFOMC = findNextDate(FOMC_2026, now);
  if (nextFOMC && new Date(nextFOMC) <= horizon) {
    catalysts.push({
      id: `fomc_${nextFOMC}`,
      name: `FOMC Rate Decision - ${formatDate(nextFOMC)}`,
      expectedDate: nextFOMC,
      category: "policy",
      consensusExpectation: "Hold rates steady",
      affectedSectors: ["finance", "real_estate", "technology", "bonds"],
      affectedTickers: ["TLT", "XLF", "QQQ", "VNQ", "HYG", "SPY"],
      importance: "high",
    });
  }

  // NFP (Non-Farm Payrolls)
  const nextNFP = getNextFirstFriday(now);
  if (nextNFP <= horizon) {
    catalysts.push({
      id: `nfp_${nextNFP.toISOString().split("T")[0]}`,
      name: `Non-Farm Payrolls - ${formatDate(nextNFP.toISOString().split("T")[0])}`,
      expectedDate: nextNFP.toISOString().split("T")[0],
      category: "economic",
      consensusExpectation: "180K-220K jobs added",
      affectedSectors: ["broad_market", "bonds", "consumer"],
      affectedTickers: ["SPY", "TLT", "XLY", "XLF"],
      importance: "high",
    });
  }

  // CPI
  const nextCPI = getCPIDate(now);
  if (nextCPI <= horizon) {
    catalysts.push({
      id: `cpi_${nextCPI.toISOString().split("T")[0]}`,
      name: `CPI Release - ${formatDate(nextCPI.toISOString().split("T")[0])}`,
      expectedDate: nextCPI.toISOString().split("T")[0],
      category: "economic",
      consensusExpectation: "2.8-3.2% YoY",
      affectedSectors: ["bonds", "technology", "real_estate", "consumer"],
      affectedTickers: ["TLT", "TIP", "QQQ", "VNQ", "GLD"],
      importance: "high",
    });
  }

  // GDP
  const nextGDP = getGDPDate(now);
  if (nextGDP <= horizon) {
    catalysts.push({
      id: `gdp_${nextGDP.toISOString().split("T")[0]}`,
      name: `GDP Advance Estimate - ${formatDate(nextGDP.toISOString().split("T")[0])}`,
      expectedDate: nextGDP.toISOString().split("T")[0],
      category: "economic",
      consensusExpectation: "2.0-2.5% annualized",
      affectedSectors: ["broad_market", "consumer", "industrial"],
      affectedTickers: ["SPY", "IWM", "XLI", "XLY"],
      importance: "high",
    });
  }

  // OPEC
  const nextOPEC = findNextDate(OPEC_2026, now);
  if (nextOPEC && new Date(nextOPEC) <= horizon) {
    catalysts.push({
      id: `opec_${nextOPEC}`,
      name: `OPEC+ Meeting - ${formatDate(nextOPEC)}`,
      expectedDate: nextOPEC,
      category: "policy",
      consensusExpectation: "Maintain current production quotas",
      affectedSectors: ["energy", "transportation", "consumer"],
      affectedTickers: ["CL", "USO", "XLE", "JETS", "XOM", "CVX"],
      importance: "high",
    });
  }

  // Sort by date
  catalysts.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
  return catalysts;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Branch Generation ──

function generateEconomicBranches(catalyst: CatalystDefinition): ScenarioBranch[] {
  const id = catalyst.id;

  if (id.startsWith("cpi_")) {
    return [
      {
        id: `${id}_hot`, catalystId: id,
        scenarioName: "CPI comes in hot (above consensus)",
        probability: 0.25,
        condition: "CPI YoY > consensus + 0.2%",
        thesisRevision: {
          volatilityShift: "elevated",
          confidenceAdjustment: 0.85,
          tradingActionOverrides: [
            { ticker: "TLT", action: "add", direction: "SELL", rationale: "Hot inflation means higher-for-longer rates; long-duration bonds sell off", confidence: 0.75, riskLevel: "medium" },
            { ticker: "GLD", action: "add", direction: "BUY", rationale: "Inflation hedge demand increases as real rates may turn negative", confidence: 0.6, riskLevel: "medium" },
            { ticker: "QQQ", action: "modify", direction: "SELL", rationale: "Growth stocks face higher discount rates if Fed stays hawkish", confidence: 0.65, riskLevel: "high" },
            { ticker: "TIP", action: "add", direction: "BUY", rationale: "TIPS outperform nominals when inflation expectations rise", confidence: 0.7, riskLevel: "low" },
          ],
          narrativeGuidance: "Hot CPI print forces reassessment of rate cut timeline. Market reprices for higher-for-longer. Duration-sensitive assets under pressure. Inflation hedges bid.",
        },
        marketExpectations: [
          { ticker: "TLT", expectedMove: -0.015, direction: "down", timeframe: "1d" },
          { ticker: "QQQ", expectedMove: -0.012, direction: "down", timeframe: "1d" },
          { ticker: "GLD", expectedMove: 0.008, direction: "up", timeframe: "1w" },
          { ticker: "VNQ", expectedMove: -0.018, direction: "down", timeframe: "1d" },
          { ticker: "SPY", expectedMove: -0.008, direction: "down", timeframe: "1d" },
        ],
      },
      {
        id: `${id}_inline`, catalystId: id,
        scenarioName: "CPI in-line with consensus",
        probability: 0.45,
        condition: "CPI YoY within 0.1% of consensus",
        thesisRevision: {
          confidenceAdjustment: 1.0,
          tradingActionOverrides: [],
          narrativeGuidance: "In-line CPI maintains current trajectory. No major thesis revision needed. Existing positions hold. Focus shifts to next catalyst.",
        },
        marketExpectations: [
          { ticker: "SPY", expectedMove: 0.003, direction: "up", timeframe: "1d" },
          { ticker: "TLT", expectedMove: 0.002, direction: "up", timeframe: "1d" },
        ],
      },
      {
        id: `${id}_cool`, catalystId: id,
        scenarioName: "CPI comes in cool (below consensus)",
        probability: 0.25,
        condition: "CPI YoY < consensus - 0.2%",
        thesisRevision: {
          marketRegimeShift: "risk_on",
          confidenceAdjustment: 0.9,
          tradingActionOverrides: [
            { ticker: "TLT", action: "add", direction: "BUY", rationale: "Cooling inflation accelerates rate cut expectations; bonds rally", confidence: 0.7, riskLevel: "low" },
            { ticker: "QQQ", action: "add", direction: "BUY", rationale: "Lower rates benefit growth stock valuations; tech rallies", confidence: 0.7, riskLevel: "medium" },
            { ticker: "VNQ", action: "add", direction: "BUY", rationale: "REITs benefit from lower rate expectations", confidence: 0.6, riskLevel: "medium" },
          ],
          narrativeGuidance: "Cool CPI print validates disinflation narrative. Rate cuts move forward in timeline. Risk assets rally. Duration extends.",
        },
        marketExpectations: [
          { ticker: "TLT", expectedMove: 0.012, direction: "up", timeframe: "1d" },
          { ticker: "QQQ", expectedMove: 0.015, direction: "up", timeframe: "1d" },
          { ticker: "SPY", expectedMove: 0.01, direction: "up", timeframe: "1d" },
          { ticker: "VNQ", expectedMove: 0.018, direction: "up", timeframe: "1w" },
        ],
      },
      {
        id: `${id}_shock`, catalystId: id,
        scenarioName: "CPI shock (extreme miss in either direction)",
        probability: 0.05,
        condition: "CPI YoY deviates > 0.5% from consensus",
        thesisRevision: {
          volatilityShift: "extreme",
          confidenceAdjustment: 0.6,
          tradingActionOverrides: [
            { ticker: "VIX", action: "add", direction: "BUY", rationale: "Extreme data surprise drives vol spike across asset classes", confidence: 0.85, riskLevel: "high" },
            { ticker: "SPY", action: "modify", direction: "SELL", rationale: "Reduce equity exposure during uncertainty spike; reassess after dust settles", confidence: 0.6, riskLevel: "high" },
          ],
          narrativeGuidance: "Extreme CPI surprise invalidates consensus models. High uncertainty period. Reduce exposure, increase hedges, wait for clarity before repositioning.",
        },
        marketExpectations: [
          { ticker: "VIX", expectedMove: 0.25, direction: "up", timeframe: "1d" },
          { ticker: "SPY", expectedMove: -0.02, direction: "down", timeframe: "1d" },
        ],
      },
    ];
  }

  if (id.startsWith("nfp_")) {
    return [
      {
        id: `${id}_strong`, catalystId: id,
        scenarioName: "Strong jobs report (>250K)",
        probability: 0.25,
        condition: "NFP > 250K and/or unemployment drops",
        thesisRevision: {
          confidenceAdjustment: 0.9,
          tradingActionOverrides: [
            { ticker: "XLF", action: "add", direction: "BUY", rationale: "Strong labor market supports consumer spending and loan demand", confidence: 0.6, riskLevel: "medium" },
            { ticker: "TLT", action: "add", direction: "SELL", rationale: "Strong jobs reduce rate cut urgency; yields rise", confidence: 0.65, riskLevel: "medium" },
          ],
          narrativeGuidance: "Strong jobs report suggests economy running hot. Rate cuts delayed. Cyclicals outperform. Duration pressure.",
        },
        marketExpectations: [
          { ticker: "SPY", expectedMove: 0.005, direction: "up", timeframe: "1d" },
          { ticker: "TLT", expectedMove: -0.008, direction: "down", timeframe: "1d" },
          { ticker: "XLF", expectedMove: 0.01, direction: "up", timeframe: "1d" },
        ],
      },
      {
        id: `${id}_inline`, catalystId: id,
        scenarioName: "Jobs in-line (180K-220K)",
        probability: 0.40,
        condition: "NFP between 180K-220K, unemployment flat",
        thesisRevision: {
          confidenceAdjustment: 1.0,
          tradingActionOverrides: [],
          narrativeGuidance: "Goldilocks jobs number. Neither too hot nor too cold. Existing thesis holds. Market focus shifts to next catalyst.",
        },
        marketExpectations: [
          { ticker: "SPY", expectedMove: 0.002, direction: "up", timeframe: "1d" },
        ],
      },
      {
        id: `${id}_weak`, catalystId: id,
        scenarioName: "Weak jobs report (<150K)",
        probability: 0.25,
        condition: "NFP < 150K and/or unemployment rises",
        thesisRevision: {
          marketRegimeShift: "risk_off",
          confidenceAdjustment: 0.8,
          tradingActionOverrides: [
            { ticker: "TLT", action: "add", direction: "BUY", rationale: "Weak labor market accelerates rate cut timeline", confidence: 0.7, riskLevel: "low" },
            { ticker: "XLY", action: "add", direction: "SELL", rationale: "Consumer discretionary at risk from rising unemployment", confidence: 0.6, riskLevel: "medium" },
          ],
          narrativeGuidance: "Weak jobs raise recession fears. Flight to safety. Rate cuts priced in aggressively. Defensive positioning warranted.",
        },
        marketExpectations: [
          { ticker: "SPY", expectedMove: -0.01, direction: "down", timeframe: "1d" },
          { ticker: "TLT", expectedMove: 0.01, direction: "up", timeframe: "1d" },
          { ticker: "GLD", expectedMove: 0.005, direction: "up", timeframe: "1d" },
        ],
      },
      {
        id: `${id}_negative`, catalystId: id,
        scenarioName: "Negative jobs print (contraction)",
        probability: 0.10,
        condition: "NFP negative, unemployment spikes",
        thesisRevision: {
          marketRegimeShift: "risk_off",
          volatilityShift: "extreme",
          confidenceAdjustment: 0.5,
          tradingActionOverrides: [
            { ticker: "VIX", action: "add", direction: "BUY", rationale: "Labor market contraction triggers volatility surge", confidence: 0.8, riskLevel: "high" },
            { ticker: "TLT", action: "add", direction: "BUY", rationale: "Emergency rate cut expectations; massive flight to Treasuries", confidence: 0.8, riskLevel: "medium" },
            { ticker: "GLD", action: "add", direction: "BUY", rationale: "Safe-haven demand spikes on recession confirmation", confidence: 0.75, riskLevel: "medium" },
          ],
          narrativeGuidance: "Recession signal confirmed. Maximum defensive posture. Emergency rate cuts likely. Risk assets face sustained selling pressure.",
        },
        marketExpectations: [
          { ticker: "SPY", expectedMove: -0.03, direction: "down", timeframe: "1d" },
          { ticker: "VIX", expectedMove: 0.30, direction: "up", timeframe: "1d" },
          { ticker: "TLT", expectedMove: 0.02, direction: "up", timeframe: "1d" },
        ],
      },
    ];
  }

  // Generic economic catalyst branches
  return [
    {
      id: `${id}_above`, catalystId: id,
      scenarioName: "Above consensus",
      probability: 0.30,
      condition: `${catalyst.name} exceeds market expectations`,
      thesisRevision: {
        confidenceAdjustment: 0.9,
        tradingActionOverrides: [],
        narrativeGuidance: `${catalyst.name} beat expectations. Reassess positioning in ${catalyst.affectedSectors.join(", ")}.`,
      },
      marketExpectations: catalyst.affectedTickers.map(t => ({
        ticker: t, expectedMove: 0.01, direction: "up" as const, timeframe: "1d",
      })),
    },
    {
      id: `${id}_inline`, catalystId: id,
      scenarioName: "In-line with consensus",
      probability: 0.40,
      condition: `${catalyst.name} meets expectations`,
      thesisRevision: {
        confidenceAdjustment: 1.0,
        tradingActionOverrides: [],
        narrativeGuidance: "Data in-line. No thesis revision needed.",
      },
      marketExpectations: [],
    },
    {
      id: `${id}_below`, catalystId: id,
      scenarioName: "Below consensus",
      probability: 0.30,
      condition: `${catalyst.name} misses market expectations`,
      thesisRevision: {
        confidenceAdjustment: 0.85,
        tradingActionOverrides: [],
        narrativeGuidance: `${catalyst.name} missed. Reassess downside in ${catalyst.affectedSectors.join(", ")}.`,
      },
      marketExpectations: catalyst.affectedTickers.map(t => ({
        ticker: t, expectedMove: -0.01, direction: "down" as const, timeframe: "1d",
      })),
    },
  ];
}

function generatePolicyBranches(catalyst: CatalystDefinition): ScenarioBranch[] {
  const id = catalyst.id;

  if (id.startsWith("fomc_")) {
    return [
      {
        id: `${id}_hawkish`, catalystId: id,
        scenarioName: "Hawkish FOMC (rate hike or hawkish hold)",
        probability: 0.20,
        condition: "Fed raises rates or signals further tightening",
        thesisRevision: {
          marketRegimeShift: "risk_off",
          volatilityShift: "elevated",
          confidenceAdjustment: 0.8,
          tradingActionOverrides: [
            { ticker: "TLT", action: "add", direction: "SELL", rationale: "Hawkish Fed pushes yields higher across the curve", confidence: 0.8, riskLevel: "medium" },
            { ticker: "QQQ", action: "modify", direction: "SELL", rationale: "Higher rates hit growth stock valuations hardest", confidence: 0.7, riskLevel: "high" },
            { ticker: "XLF", action: "add", direction: "BUY", rationale: "Banks benefit from wider net interest margins", confidence: 0.65, riskLevel: "medium" },
            { ticker: "UUP", action: "add", direction: "BUY", rationale: "Rate differential supports dollar strength", confidence: 0.6, riskLevel: "low" },
          ],
          narrativeGuidance: "Hawkish surprise from Fed. Market reprices entire rate trajectory. Growth-to-value rotation accelerates. Dollar strengthens. EM under pressure.",
        },
        marketExpectations: [
          { ticker: "SPY", expectedMove: -0.015, direction: "down", timeframe: "1d" },
          { ticker: "QQQ", expectedMove: -0.02, direction: "down", timeframe: "1d" },
          { ticker: "TLT", expectedMove: -0.02, direction: "down", timeframe: "1d" },
          { ticker: "XLF", expectedMove: 0.015, direction: "up", timeframe: "1d" },
          { ticker: "UUP", expectedMove: 0.008, direction: "up", timeframe: "1d" },
        ],
      },
      {
        id: `${id}_neutral`, catalystId: id,
        scenarioName: "Neutral FOMC (hold, balanced statement)",
        probability: 0.45,
        condition: "Fed holds rates with balanced forward guidance",
        thesisRevision: {
          confidenceAdjustment: 1.0,
          tradingActionOverrides: [],
          narrativeGuidance: "FOMC as expected. No change to thesis. Market focuses on dot plot details and press conference nuance.",
        },
        marketExpectations: [
          { ticker: "SPY", expectedMove: 0.003, direction: "up", timeframe: "1d" },
        ],
      },
      {
        id: `${id}_dovish`, catalystId: id,
        scenarioName: "Dovish FOMC (rate cut or dovish guidance)",
        probability: 0.30,
        condition: "Fed cuts rates or signals accelerated easing",
        thesisRevision: {
          marketRegimeShift: "risk_on",
          confidenceAdjustment: 0.9,
          tradingActionOverrides: [
            { ticker: "TLT", action: "add", direction: "BUY", rationale: "Rate cuts push long-end yields down; bonds rally", confidence: 0.8, riskLevel: "low" },
            { ticker: "QQQ", action: "add", direction: "BUY", rationale: "Lower discount rates boost growth stock valuations", confidence: 0.75, riskLevel: "medium" },
            { ticker: "VNQ", action: "add", direction: "BUY", rationale: "REITs re-rate on lower cap rate expectations", confidence: 0.65, riskLevel: "medium" },
            { ticker: "EEM", action: "add", direction: "BUY", rationale: "Weaker dollar and easier financial conditions benefit EM", confidence: 0.55, riskLevel: "high" },
          ],
          narrativeGuidance: "Dovish pivot confirms easing cycle. Risk-on positioning warranted. Duration extends. Dollar weakens. EM and growth lead.",
        },
        marketExpectations: [
          { ticker: "SPY", expectedMove: 0.02, direction: "up", timeframe: "1d" },
          { ticker: "QQQ", expectedMove: 0.025, direction: "up", timeframe: "1d" },
          { ticker: "TLT", expectedMove: 0.015, direction: "up", timeframe: "1d" },
          { ticker: "VNQ", expectedMove: 0.02, direction: "up", timeframe: "1w" },
        ],
      },
      {
        id: `${id}_emergency`, catalystId: id,
        scenarioName: "Emergency action (unscheduled cut or crisis response)",
        probability: 0.05,
        condition: "Emergency rate cut or extraordinary policy action",
        thesisRevision: {
          volatilityShift: "extreme",
          confidenceAdjustment: 0.5,
          tradingActionOverrides: [
            { ticker: "VIX", action: "add", direction: "BUY", rationale: "Emergency Fed action signals crisis; volatility spikes", confidence: 0.9, riskLevel: "high" },
            { ticker: "GLD", action: "add", direction: "BUY", rationale: "Crisis-level safe haven demand for gold", confidence: 0.8, riskLevel: "medium" },
          ],
          narrativeGuidance: "Emergency Fed action indicates systemic stress. Maximum caution. Reduce all risk. Hold cash and safe-haven assets until picture clarifies.",
        },
        marketExpectations: [
          { ticker: "VIX", expectedMove: 0.40, direction: "up", timeframe: "1d" },
          { ticker: "GLD", expectedMove: 0.03, direction: "up", timeframe: "1d" },
          { ticker: "SPY", expectedMove: -0.03, direction: "down", timeframe: "1d" },
        ],
      },
    ];
  }

  if (id.startsWith("opec_")) {
    return [
      {
        id: `${id}_cut`, catalystId: id,
        scenarioName: "OPEC+ production cut",
        probability: 0.25,
        condition: "OPEC+ announces production cuts or extends existing cuts",
        thesisRevision: {
          confidenceAdjustment: 0.85,
          tradingActionOverrides: [
            { ticker: "USO", action: "add", direction: "BUY", rationale: "Production cut tightens supply; crude rallies", confidence: 0.8, riskLevel: "medium" },
            { ticker: "XLE", action: "add", direction: "BUY", rationale: "Energy sector benefits from higher realized oil prices", confidence: 0.75, riskLevel: "medium" },
            { ticker: "JETS", action: "add", direction: "SELL", rationale: "Higher fuel costs compress airline margins", confidence: 0.6, riskLevel: "medium" },
          ],
          narrativeGuidance: "OPEC+ supply cut supports oil prices. Energy sector outperforms. Transportation/airlines face margin pressure. Inflation expectations rise.",
        },
        marketExpectations: [
          { ticker: "USO", expectedMove: 0.05, direction: "up", timeframe: "1d" },
          { ticker: "XLE", expectedMove: 0.03, direction: "up", timeframe: "1d" },
          { ticker: "JETS", expectedMove: -0.02, direction: "down", timeframe: "1w" },
        ],
      },
      {
        id: `${id}_hold`, catalystId: id,
        scenarioName: "OPEC+ maintains quotas",
        probability: 0.45,
        condition: "OPEC+ maintains current production levels",
        thesisRevision: {
          confidenceAdjustment: 1.0,
          tradingActionOverrides: [],
          narrativeGuidance: "OPEC+ status quo. No supply shock. Oil trades on demand fundamentals.",
        },
        marketExpectations: [],
      },
      {
        id: `${id}_increase`, catalystId: id,
        scenarioName: "OPEC+ production increase / quota breach",
        probability: 0.25,
        condition: "OPEC+ raises quotas or members breach limits",
        thesisRevision: {
          confidenceAdjustment: 0.85,
          tradingActionOverrides: [
            { ticker: "USO", action: "add", direction: "SELL", rationale: "Supply increase pushes crude lower", confidence: 0.75, riskLevel: "medium" },
            { ticker: "JETS", action: "add", direction: "BUY", rationale: "Lower fuel costs improve airline margins", confidence: 0.6, riskLevel: "medium" },
            { ticker: "XLY", action: "add", direction: "BUY", rationale: "Lower gas prices boost consumer spending power", confidence: 0.5, riskLevel: "low" },
          ],
          narrativeGuidance: "OPEC+ supply increase bearish for crude. Energy sector underperforms. Consumer-facing sectors benefit from lower input costs.",
        },
        marketExpectations: [
          { ticker: "USO", expectedMove: -0.05, direction: "down", timeframe: "1d" },
          { ticker: "XLE", expectedMove: -0.03, direction: "down", timeframe: "1d" },
          { ticker: "JETS", expectedMove: 0.02, direction: "up", timeframe: "1w" },
        ],
      },
      {
        id: `${id}_flood`, catalystId: id,
        scenarioName: "Major supply flood (SPR release or cartel breakdown)",
        probability: 0.05,
        condition: "Strategic reserve release or OPEC+ collapse",
        thesisRevision: {
          volatilityShift: "elevated",
          confidenceAdjustment: 0.7,
          tradingActionOverrides: [
            { ticker: "USO", action: "add", direction: "SELL", rationale: "Massive supply increase crashes crude; could see $20+ drop", confidence: 0.85, riskLevel: "high" },
            { ticker: "XLE", action: "add", direction: "SELL", rationale: "Energy sector faces earnings collapse at lower crude", confidence: 0.8, riskLevel: "high" },
            { ticker: "JETS", action: "add", direction: "BUY", rationale: "Airlines are largest beneficiary of oil price crash", confidence: 0.7, riskLevel: "medium" },
            { ticker: "XLY", action: "add", direction: "BUY", rationale: "Consumer windfall from lower gas prices", confidence: 0.6, riskLevel: "medium" },
          ],
          narrativeGuidance: "Oil supply flood reshapes energy landscape. Massive rotation out of energy into consumer/transport. Deflationary impulse. Watch for producer country instability.",
        },
        marketExpectations: [
          { ticker: "USO", expectedMove: -0.15, direction: "down", timeframe: "1w" },
          { ticker: "XLE", expectedMove: -0.08, direction: "down", timeframe: "1w" },
          { ticker: "JETS", expectedMove: 0.05, direction: "up", timeframe: "1w" },
        ],
      },
    ];
  }

  // Generic policy branches
  return [
    {
      id: `${id}_hawkish`, catalystId: id,
      scenarioName: "Hawkish outcome",
      probability: 0.30,
      condition: `${catalyst.name} produces tighter-than-expected policy`,
      thesisRevision: {
        confidenceAdjustment: 0.85,
        tradingActionOverrides: [],
        narrativeGuidance: `Hawkish ${catalyst.name}. Reassess rate-sensitive positions.`,
      },
      marketExpectations: [],
    },
    {
      id: `${id}_neutral`, catalystId: id,
      scenarioName: "Neutral outcome",
      probability: 0.40,
      condition: `${catalyst.name} as expected`,
      thesisRevision: { confidenceAdjustment: 1.0, tradingActionOverrides: [], narrativeGuidance: "No revision needed." },
      marketExpectations: [],
    },
    {
      id: `${id}_dovish`, catalystId: id,
      scenarioName: "Dovish outcome",
      probability: 0.30,
      condition: `${catalyst.name} produces easier-than-expected policy`,
      thesisRevision: {
        confidenceAdjustment: 0.9,
        tradingActionOverrides: [],
        narrativeGuidance: `Dovish ${catalyst.name}. Consider adding risk exposure.`,
      },
      marketExpectations: [],
    },
  ];
}

function generateGeopoliticalBranches(catalyst: CatalystDefinition): ScenarioBranch[] {
  const id = catalyst.id;
  return [
    {
      id: `${id}_escalation`, catalystId: id,
      scenarioName: "Escalation",
      probability: 0.20,
      condition: "Situation escalates beyond expectations",
      thesisRevision: {
        marketRegimeShift: "risk_off",
        volatilityShift: "elevated",
        confidenceAdjustment: 0.7,
        tradingActionOverrides: [
          { ticker: "GLD", action: "add", direction: "BUY", rationale: "Safe-haven demand on geopolitical escalation", confidence: 0.75, riskLevel: "medium" },
          { ticker: "ITA", action: "add", direction: "BUY", rationale: "Defense sector benefits from escalation", confidence: 0.7, riskLevel: "medium" },
        ],
        narrativeGuidance: "Geopolitical escalation drives risk-off. Defensive positioning. Safe havens bid. Energy may spike on supply fears.",
      },
      marketExpectations: [
        { ticker: "SPY", expectedMove: -0.015, direction: "down", timeframe: "1d" },
        { ticker: "GLD", expectedMove: 0.015, direction: "up", timeframe: "1d" },
        { ticker: "VIX", expectedMove: 0.20, direction: "up", timeframe: "1d" },
      ],
    },
    {
      id: `${id}_status_quo`, catalystId: id,
      scenarioName: "Status quo maintained",
      probability: 0.50,
      condition: "No significant change in situation",
      thesisRevision: {
        confidenceAdjustment: 1.0,
        tradingActionOverrides: [],
        narrativeGuidance: "Geopolitical situation unchanged. Existing thesis holds.",
      },
      marketExpectations: [],
    },
    {
      id: `${id}_deescalation`, catalystId: id,
      scenarioName: "De-escalation / diplomatic progress",
      probability: 0.25,
      condition: "Diplomatic breakthrough or tension reduction",
      thesisRevision: {
        marketRegimeShift: "risk_on",
        confidenceAdjustment: 0.9,
        tradingActionOverrides: [
          { ticker: "GLD", action: "modify", direction: "SELL", rationale: "Safe-haven premium unwinds on de-escalation", confidence: 0.6, riskLevel: "low" },
        ],
        narrativeGuidance: "De-escalation reduces geopolitical risk premium. Risk-on rotation. Defense may underperform.",
      },
      marketExpectations: [
        { ticker: "SPY", expectedMove: 0.01, direction: "up", timeframe: "1d" },
        { ticker: "GLD", expectedMove: -0.008, direction: "down", timeframe: "1d" },
      ],
    },
    {
      id: `${id}_black_swan`, catalystId: id,
      scenarioName: "Black swan event",
      probability: 0.05,
      condition: "Completely unexpected escalation or crisis",
      thesisRevision: {
        marketRegimeShift: "risk_off",
        volatilityShift: "extreme",
        confidenceAdjustment: 0.4,
        tradingActionOverrides: [
          { ticker: "VIX", action: "add", direction: "BUY", rationale: "Crisis-level vol spike", confidence: 0.9, riskLevel: "high" },
          { ticker: "GLD", action: "add", direction: "BUY", rationale: "Maximum safe-haven demand", confidence: 0.85, riskLevel: "medium" },
          { ticker: "TLT", action: "add", direction: "BUY", rationale: "Flight to quality in Treasuries", confidence: 0.8, riskLevel: "medium" },
        ],
        narrativeGuidance: "Black swan event. All models invalidated. Maximum capital preservation. Cash and safe havens only until clarity emerges.",
      },
      marketExpectations: [
        { ticker: "SPY", expectedMove: -0.05, direction: "down", timeframe: "1d" },
        { ticker: "VIX", expectedMove: 0.50, direction: "up", timeframe: "1d" },
        { ticker: "GLD", expectedMove: 0.03, direction: "up", timeframe: "1d" },
      ],
    },
  ];
}

/**
 * Generate branches for a catalyst.
 */
export async function generateBranchesForCatalyst(
  catalyst: CatalystDefinition,
  baseThesisId: number,
): Promise<ThesisBranchSet> {
  let branches: ScenarioBranch[];

  switch (catalyst.category) {
    case "economic":
      branches = generateEconomicBranches(catalyst);
      break;
    case "policy":
      branches = generatePolicyBranches(catalyst);
      break;
    case "geopolitical":
    case "election":
      branches = generateGeopoliticalBranches(catalyst);
      break;
    default:
      branches = generateEconomicBranches(catalyst);
  }

  const branchSet: ThesisBranchSet = {
    id: `branch_${catalyst.id}_${Date.now()}`,
    baseThesisId,
    catalyst,
    branches,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  // Persist in settings table
  await db.insert(schema.settings).values({
    key: `thesis_branch:${branchSet.id}`,
    value: JSON.stringify(branchSet),
  }).onConflictDoUpdate({
    target: schema.settings.key,
    set: {
      value: JSON.stringify(branchSet),
      updatedAt: new Date().toISOString(),
    },
  });

  return branchSet;
}

/**
 * Activate a branch when a catalyst outcome is known.
 */
export async function activateBranch(
  branchSetId: string,
  branchId: string,
): Promise<{ success: boolean; error?: string }> {
  // Load branch set
  const [row] = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, `thesis_branch:${branchSetId}`))
    .limit(1);

  if (!row) return { success: false, error: "Branch set not found" };

  const branchSet: ThesisBranchSet = JSON.parse(row.value);
  const branch = branchSet.branches.find(b => b.id === branchId);
  if (!branch) return { success: false, error: "Branch not found" };

  // Update branch set status
  branchSet.status = "activated";
  branchSet.activatedBranchId = branchId;
  branchSet.activatedAt = new Date().toISOString();

  await db.update(schema.settings)
    .set({
      value: JSON.stringify(branchSet),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.settings.key, `thesis_branch:${branchSetId}`));

  // Apply thesis revision: create a new thesis with adjusted parameters
  const [baseThesis] = await db.select().from(schema.theses)
    .where(eq(schema.theses.id, branchSet.baseThesisId))
    .limit(1);

  if (baseThesis) {
    const existingActions = JSON.parse(baseThesis.tradingActions) as Array<{
      ticker: string;
      direction: string;
      rationale: string;
      confidence: number;
      riskLevel: string;
      sources: string[];
      entryCondition: string;
    }>;

    // Apply overrides
    let newActions = [...existingActions];
    for (const override of branch.thesisRevision.tradingActionOverrides) {
      if (override.action === "add") {
        newActions.push({
          ticker: override.ticker,
          direction: override.direction || "HOLD",
          rationale: override.rationale,
          confidence: override.confidence || 0.5,
          riskLevel: override.riskLevel || "medium",
          sources: ["scenario_branch"],
          entryCondition: `Activated by: ${branch.scenarioName}`,
        });
      } else if (override.action === "remove") {
        newActions = newActions.filter(a => a.ticker !== override.ticker);
      } else if (override.action === "modify") {
        const idx = newActions.findIndex(a => a.ticker === override.ticker);
        if (idx >= 0) {
          newActions[idx] = {
            ...newActions[idx],
            direction: override.direction || newActions[idx].direction,
            rationale: override.rationale,
            confidence: override.confidence || newActions[idx].confidence,
            riskLevel: override.riskLevel || newActions[idx].riskLevel,
          };
        } else {
          newActions.push({
            ticker: override.ticker,
            direction: override.direction || "HOLD",
            rationale: override.rationale,
            confidence: override.confidence || 0.5,
            riskLevel: override.riskLevel || "medium",
            sources: ["scenario_branch"],
            entryCondition: `Activated by: ${branch.scenarioName}`,
          });
        }
      }
    }

    // Create revised thesis
    const newConfidence = baseThesis.overallConfidence * branch.thesisRevision.confidenceAdjustment;
    const newRegime = branch.thesisRevision.marketRegimeShift || baseThesis.marketRegime;
    const newVol = branch.thesisRevision.volatilityShift || baseThesis.volatilityOutlook;

    await db.insert(schema.theses).values({
      title: `${baseThesis.title} [Revised: ${branch.scenarioName}]`,
      status: "active",
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      marketRegime: newRegime,
      volatilityOutlook: newVol,
      convergenceDensity: baseThesis.convergenceDensity,
      overallConfidence: Math.max(0.1, Math.min(0.95, newConfidence)),
      tradingActions: JSON.stringify(newActions),
      executiveSummary: `[SCENARIO ACTIVATED: ${branch.scenarioName}] ${branch.thesisRevision.narrativeGuidance}`,
      situationAssessment: `${baseThesis.situationAssessment}\n\n---\nSCENARIO BRANCH ACTIVATED: ${branch.scenarioName}\nCondition: ${branch.condition}\n${branch.thesisRevision.narrativeGuidance}`,
      riskScenarios: baseThesis.riskScenarios,
      layerInputs: baseThesis.layerInputs,
      symbols: baseThesis.symbols,
    });

    // Supersede the old thesis
    await db.update(schema.theses)
      .set({ status: "superseded" })
      .where(eq(schema.theses.id, baseThesis.id));
  }

  return { success: true };
}

/**
 * Get all active (pending) branch sets.
 */
export async function getActiveBranchSets(): Promise<ThesisBranchSet[]> {
  const rows = await db.select().from(schema.settings)
    .where(like(schema.settings.key, "thesis_branch:%"));

  const sets: ThesisBranchSet[] = [];
  for (const row of rows) {
    try {
      const set: ThesisBranchSet = JSON.parse(row.value);
      if (set.status === "pending") sets.push(set);
    } catch {
      // Bad JSON
    }
  }

  // Sort by catalyst date
  sets.sort((a, b) => a.catalyst.expectedDate.localeCompare(b.catalyst.expectedDate));
  return sets;
}

/**
 * Get all branch sets (including activated and expired).
 */
export async function getAllBranchSets(): Promise<ThesisBranchSet[]> {
  const rows = await db.select().from(schema.settings)
    .where(like(schema.settings.key, "thesis_branch:%"));

  const sets: ThesisBranchSet[] = [];
  for (const row of rows) {
    try {
      sets.push(JSON.parse(row.value));
    } catch {
      // Bad JSON
    }
  }

  sets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return sets;
}

/**
 * Expire branch sets whose catalyst date has passed + 24h.
 */
export async function expireOldBranches(): Promise<number> {
  const rows = await db.select().from(schema.settings)
    .where(like(schema.settings.key, "thesis_branch:%"));

  let expired = 0;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  for (const row of rows) {
    try {
      const set: ThesisBranchSet = JSON.parse(row.value);
      if (set.status === "pending" && set.catalyst.expectedDate < cutoff) {
        set.status = "expired";
        await db.update(schema.settings)
          .set({ value: JSON.stringify(set), updatedAt: new Date().toISOString() })
          .where(eq(schema.settings.key, row.key));
        expired++;
      }
    } catch {
      // Bad JSON
    }
  }

  return expired;
}

/**
 * Generate branches for all upcoming catalysts against current active thesis.
 */
export async function generateAllBranches(): Promise<{
  catalysts: number;
  branchSets: number;
  branches: number;
}> {
  // Get current active thesis
  const [activeThesis] = await db.select().from(schema.theses)
    .where(eq(schema.theses.status, "active"))
    .orderBy(desc(schema.theses.generatedAt))
    .limit(1);

  if (!activeThesis) {
    return { catalysts: 0, branchSets: 0, branches: 0 };
  }

  // Expire old branches first
  await expireOldBranches();

  // Get existing pending branch catalyst IDs
  const existing = await getActiveBranchSets();
  const existingCatalystIds = new Set(existing.map(s => s.catalyst.id));

  // Identify upcoming catalysts
  const catalysts = identifyUpcomingCatalysts();
  let branchSets = 0;
  let totalBranches = 0;

  for (const catalyst of catalysts) {
    // Skip if we already have branches for this catalyst
    if (existingCatalystIds.has(catalyst.id)) continue;

    const set = await generateBranchesForCatalyst(catalyst, activeThesis.id);
    branchSets++;
    totalBranches += set.branches.length;
  }

  return {
    catalysts: catalysts.length,
    branchSets,
    branches: totalBranches,
  };
}
