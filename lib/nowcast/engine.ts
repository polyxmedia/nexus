// Economic Nowcasting Engine
// Real-time estimation of economic conditions using high-frequency data
// Provides GDP, inflation, employment, financial conditions, consumer health,
// and global trade nowcasts weeks ahead of official releases.

import { getFredSeries } from "@/lib/market-data/fred";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

interface InputValue {
  value: number | null;
  weight: number;
  source: string;
}

export interface NowcastReport {
  timestamp: string;
  gdp: {
    estimate: number;
    confidence: [number, number];
    vsLastOfficial: number | null;
    direction: "accelerating" | "stable" | "decelerating" | "contracting";
    inputs: Record<string, InputValue>;
  };
  inflation: {
    estimate: number;
    vsLastOfficial: number | null;
    direction: "rising" | "stable" | "falling";
    inputs: Record<string, InputValue>;
  };
  employment: {
    strength: "strong" | "moderate" | "weak" | "deteriorating";
    claimsDirection: "improving" | "stable" | "worsening";
    inputs: Record<string, InputValue>;
  };
  financialConditions: {
    score: number;
    label: "very-tight" | "tight" | "neutral" | "loose" | "very-loose";
    vsLastMonth: "tightening" | "stable" | "loosening";
    inputs: Record<string, InputValue>;
  };
  consumer: {
    strength: "robust" | "healthy" | "cautious" | "stressed";
    direction: "improving" | "stable" | "weakening";
    inputs: Record<string, InputValue>;
  };
  globalTrade: {
    momentum: "expanding" | "stable" | "contracting";
    direction: "accelerating" | "stable" | "decelerating";
    inputs: Record<string, InputValue>;
  };
  composite: {
    label: string;
    riskScore: number;
    recessionProbability: number;
  };
}

// Safely fetch FRED data
async function fredVal(seriesId: string, count = 5): Promise<number | null> {
  try {
    const pts = await getFredSeries(seriesId, count);
    return pts.length > 0 ? pts[pts.length - 1].value : null;
  } catch { return null; }
}

async function fredTrend(seriesId: string): Promise<"rising" | "falling" | "stable"> {
  try {
    const pts = await getFredSeries(seriesId, 10);
    if (pts.length < 3) return "stable";
    const recent = pts.slice(-5);
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    const pct = ((last - first) / Math.abs(first || 1)) * 100;
    if (pct > 3) return "rising";
    if (pct < -3) return "falling";
    return "stable";
  } catch { return "stable"; }
}

async function fredAvg(seriesId: string, count: number): Promise<number | null> {
  try {
    const pts = await getFredSeries(seriesId, count);
    if (pts.length === 0) return null;
    return pts.reduce((s, p) => s + p.value, 0) / pts.length;
  } catch { return null; }
}

function nowcastGDP(inputs: {
  gdpOfficial: number | null;
  claims: number | null;
  claimsAvg: number | null;
  sentiment: number | null;
  indpro: number | null;
  yieldCurve: number | null;
}): NowcastReport["gdp"] {
  const { gdpOfficial, claims, claimsAvg, sentiment, indpro, yieldCurve } = inputs;

  // Start with official GDP as anchor, adjust based on high-frequency data
  let estimate = gdpOfficial ?? 2.0;
  let adjustments = 0;
  let adjustmentCount = 0;

  if (claims !== null) {
    // Claims below 220k = strong, above 300k = recession signal
    const claimsSignal = (250000 - claims) / 100000; // +0.3 at 220k, -0.5 at 300k
    adjustments += claimsSignal * 0.8;
    adjustmentCount++;
  }

  if (sentiment !== null) {
    // Sentiment above 80 = strong, below 50 = recession risk
    const sentSignal = (sentiment - 65) / 30; // +0.5 at 80, -0.5 at 50
    adjustments += sentSignal * 0.5;
    adjustmentCount++;
  }

  if (yieldCurve !== null) {
    // Inverted yield curve is recession predictor
    if (yieldCurve < -0.5) adjustments -= 0.5;
    else if (yieldCurve < 0) adjustments -= 0.2;
    else adjustments += 0.1;
    adjustmentCount++;
  }

  if (adjustmentCount > 0) {
    estimate += adjustments / adjustmentCount;
  }

  estimate = Math.round(estimate * 10) / 10;
  const margin = 0.8;

  let direction: NowcastReport["gdp"]["direction"];
  if (estimate > 2.5) direction = "accelerating";
  else if (estimate > 1.0) direction = "stable";
  else if (estimate > 0) direction = "decelerating";
  else direction = "contracting";

  return {
    estimate,
    confidence: [Math.round((estimate - margin) * 10) / 10, Math.round((estimate + margin) * 10) / 10],
    vsLastOfficial: gdpOfficial,
    direction,
    inputs: {
      "GDP Official": { value: gdpOfficial, weight: 0.3, source: "FRED:A191RL1Q225SBEA" },
      "Initial Claims": { value: claims, weight: 0.25, source: "FRED:ICSA" },
      "Consumer Sentiment": { value: sentiment, weight: 0.2, source: "FRED:UMCSENT" },
      "Industrial Production": { value: indpro, weight: 0.15, source: "FRED:INDPRO" },
      "Yield Curve 2s10s": { value: yieldCurve, weight: 0.1, source: "FRED:T10Y2Y" },
    },
  };
}

function nowcastInflation(inputs: {
  cpiOfficial: number | null;
  breakeven5y: number | null;
  oil: number | null;
  oilTrend: "rising" | "falling" | "stable";
  gold: number | null;
  dxyTrend: "rising" | "falling" | "stable";
}): NowcastReport["inflation"] {
  const { cpiOfficial, breakeven5y, oil, oilTrend, gold, dxyTrend } = inputs;

  // Breakeven inflation is the market's best estimate
  let estimate = breakeven5y ?? cpiOfficial ?? 2.5;

  // Oil price adjustment
  if (oil !== null) {
    if (oil > 90) estimate += 0.3;
    else if (oil > 75) estimate += 0.1;
    else if (oil < 55) estimate -= 0.3;
  }

  // Oil trend adjustment
  if (oilTrend === "rising") estimate += 0.2;
  if (oilTrend === "falling") estimate -= 0.2;

  // Strong dollar is deflationary
  if (dxyTrend === "rising") estimate -= 0.1;
  if (dxyTrend === "falling") estimate += 0.1;

  estimate = Math.round(estimate * 10) / 10;

  let direction: NowcastReport["inflation"]["direction"];
  if (estimate > (cpiOfficial ?? 2.5) + 0.3) direction = "rising";
  else if (estimate < (cpiOfficial ?? 2.5) - 0.3) direction = "falling";
  else direction = "stable";

  return {
    estimate,
    vsLastOfficial: cpiOfficial,
    direction,
    inputs: {
      "CPI Official": { value: cpiOfficial, weight: 0.2, source: "FRED:CPIAUCSL" },
      "5Y Breakeven": { value: breakeven5y, weight: 0.3, source: "FRED:T5YIE" },
      "WTI Crude": { value: oil, weight: 0.25, source: "FRED:DCOILWTICO" },
      "Gold": { value: gold, weight: 0.1, source: "FRED:GOLDAMGBD228NLBM" },
      "Dollar Trend": { value: dxyTrend === "rising" ? 1 : dxyTrend === "falling" ? -1 : 0, weight: 0.15, source: "FRED:DTWEXBGS" },
    },
  };
}

function nowcastEmployment(inputs: {
  initialClaims: number | null;
  continuingClaims: number | null;
  claimsTrend: "rising" | "falling" | "stable";
}): NowcastReport["employment"] {
  const { initialClaims, continuingClaims, claimsTrend } = inputs;

  let strength: NowcastReport["employment"]["strength"];
  if (initialClaims !== null) {
    if (initialClaims < 220000) strength = "strong";
    else if (initialClaims < 280000) strength = "moderate";
    else if (initialClaims < 350000) strength = "weak";
    else strength = "deteriorating";
  } else {
    strength = "moderate";
  }

  let claimsDirection: NowcastReport["employment"]["claimsDirection"];
  if (claimsTrend === "falling") claimsDirection = "improving";
  else if (claimsTrend === "rising") claimsDirection = "worsening";
  else claimsDirection = "stable";

  return {
    strength,
    claimsDirection,
    inputs: {
      "Initial Claims": { value: initialClaims, weight: 0.5, source: "FRED:ICSA" },
      "Continuing Claims": { value: continuingClaims, weight: 0.3, source: "FRED:CCSA" },
      "Claims Trend": { value: claimsTrend === "rising" ? 1 : claimsTrend === "falling" ? -1 : 0, weight: 0.2, source: "FRED:ICSA" },
    },
  };
}

function nowcastFinancialConditions(inputs: {
  vix: number | null;
  creditSpread: number | null;
  tenYear: number | null;
  dxy: number | null;
  fedFunds: number | null;
}): NowcastReport["financialConditions"] {
  const { vix, creditSpread, tenYear, dxy, fedFunds } = inputs;

  let score = 0;
  let count = 0;

  if (vix !== null) {
    // VIX < 15 = loose, VIX > 30 = tight
    score += (22 - vix) / 10;
    count++;
  }

  if (creditSpread !== null) {
    // Spread < 3 = loose, > 6 = tight
    score += (4.5 - creditSpread) / 3;
    count++;
  }

  if (fedFunds !== null) {
    // Rates > 5 = tight, < 2 = loose
    score += (3.5 - fedFunds) / 3;
    count++;
  }

  if (dxy !== null) {
    // Strong dollar = tighter conditions
    score += (103 - dxy) / 10;
    count++;
  }

  const avg = count > 0 ? score / count : 0;
  const clamped = Math.max(-2, Math.min(2, Math.round(avg * 100) / 100));

  let label: NowcastReport["financialConditions"]["label"];
  if (clamped > 1) label = "very-loose";
  else if (clamped > 0.3) label = "loose";
  else if (clamped > -0.3) label = "neutral";
  else if (clamped > -1) label = "tight";
  else label = "very-tight";

  return {
    score: clamped,
    label,
    vsLastMonth: "stable", // Would need historical data to compute
    inputs: {
      "VIX": { value: vix, weight: 0.25, source: "FRED:VIXCLS" },
      "HY Credit Spread": { value: creditSpread, weight: 0.3, source: "FRED:BAMLH0A0HYM2" },
      "10Y Treasury": { value: tenYear, weight: 0.15, source: "FRED:DGS10" },
      "Dollar Index": { value: dxy, weight: 0.15, source: "FRED:DTWEXBGS" },
      "Fed Funds": { value: fedFunds, weight: 0.15, source: "FRED:FEDFUNDS" },
    },
  };
}

function nowcastConsumer(inputs: {
  sentiment: number | null;
  sentimentTrend: "rising" | "falling" | "stable";
  retailSales: number | null;
}): NowcastReport["consumer"] {
  const { sentiment, sentimentTrend, retailSales } = inputs;

  let strength: NowcastReport["consumer"]["strength"];
  if (sentiment !== null) {
    if (sentiment > 80) strength = "robust";
    else if (sentiment > 65) strength = "healthy";
    else if (sentiment > 50) strength = "cautious";
    else strength = "stressed";
  } else {
    strength = "healthy";
  }

  let direction: NowcastReport["consumer"]["direction"];
  if (sentimentTrend === "rising") direction = "improving";
  else if (sentimentTrend === "falling") direction = "weakening";
  else direction = "stable";

  return {
    strength,
    direction,
    inputs: {
      "Consumer Sentiment": { value: sentiment, weight: 0.5, source: "FRED:UMCSENT" },
      "Sentiment Trend": { value: sentimentTrend === "rising" ? 1 : sentimentTrend === "falling" ? -1 : 0, weight: 0.3, source: "FRED:UMCSENT" },
      "Retail Sales": { value: retailSales, weight: 0.2, source: "FRED:RSXFS" },
    },
  };
}

function nowcastGlobalTrade(inputs: {
  oil: number | null;
  oilTrend: "rising" | "falling" | "stable";
  dxyTrend: "rising" | "falling" | "stable";
}): NowcastReport["globalTrade"] {
  // Without direct access to BDI/shipping data, use proxies
  let momentum: NowcastReport["globalTrade"]["momentum"] = "stable";
  let direction: NowcastReport["globalTrade"]["direction"] = "stable";

  // Strong dollar = headwind for global trade
  // Rising oil with rising demand = expanding trade
  if (inputs.oilTrend === "rising" && inputs.dxyTrend !== "rising") {
    momentum = "expanding";
    direction = "accelerating";
  } else if (inputs.oilTrend === "falling" && inputs.dxyTrend === "rising") {
    momentum = "contracting";
    direction = "decelerating";
  }

  return {
    momentum,
    direction,
    inputs: {
      "WTI Crude": { value: inputs.oil, weight: 0.4, source: "FRED:DCOILWTICO" },
      "Oil Trend": { value: inputs.oilTrend === "rising" ? 1 : inputs.oilTrend === "falling" ? -1 : 0, weight: 0.3, source: "FRED:DCOILWTICO" },
      "Dollar Trend": { value: inputs.dxyTrend === "rising" ? 1 : inputs.dxyTrend === "falling" ? -1 : 0, weight: 0.3, source: "FRED:DTWEXBGS" },
    },
  };
}

function computeComposite(report: Omit<NowcastReport, "timestamp" | "composite">): NowcastReport["composite"] {
  let riskScore = 50; // Neutral baseline

  // GDP contribution
  if (report.gdp.direction === "contracting") riskScore += 25;
  else if (report.gdp.direction === "decelerating") riskScore += 10;
  else if (report.gdp.direction === "accelerating") riskScore -= 10;

  // Financial conditions
  if (report.financialConditions.label === "very-tight") riskScore += 20;
  else if (report.financialConditions.label === "tight") riskScore += 10;
  else if (report.financialConditions.label === "loose") riskScore -= 10;

  // Employment
  if (report.employment.strength === "deteriorating") riskScore += 15;
  else if (report.employment.strength === "weak") riskScore += 5;
  else if (report.employment.strength === "strong") riskScore -= 10;

  // Consumer
  if (report.consumer.strength === "stressed") riskScore += 10;
  else if (report.consumer.strength === "robust") riskScore -= 5;

  riskScore = Math.max(0, Math.min(100, riskScore));

  // Recession probability (rough heuristic)
  let recessionProb = 0.05; // Base rate
  if (report.gdp.estimate < 0) recessionProb = 0.7;
  else if (report.gdp.estimate < 1) recessionProb = 0.35;
  else if (report.gdp.estimate < 2) recessionProb = 0.15;

  if (report.financialConditions.label === "very-tight") recessionProb += 0.15;
  if (report.employment.strength === "deteriorating") recessionProb += 0.2;

  recessionProb = Math.min(0.95, Math.round(recessionProb * 100) / 100);

  // Generate label
  const growthLabel = report.gdp.direction;
  const conditionsLabel = report.financialConditions.label.replace("-", " ");
  const label = `${growthLabel.charAt(0).toUpperCase() + growthLabel.slice(1)} growth, ${conditionsLabel} financial conditions`;

  return { label, riskScore, recessionProbability: recessionProb };
}

export async function generateNowcast(): Promise<NowcastReport> {
  // Fetch all inputs in parallel
  const [
    gdpOfficial, claims, claimsAvg, continuingClaims, sentiment, indpro,
    yieldCurve, breakeven5y, oil, gold, vix, creditSpread,
    tenYear, dxy, fedFunds, retailSales,
    oilTrend, dxyTrend, claimsTrend, sentimentTrend,
  ] = await Promise.all([
    fredVal("A191RL1Q225SBEA"),
    fredVal("ICSA"),
    fredAvg("ICSA", 4),
    fredVal("CCSA"),
    fredVal("UMCSENT"),
    fredVal("INDPRO"),
    fredVal("T10Y2Y"),
    fredVal("T5YIE"),
    fredVal("DCOILWTICO"),
    fredVal("GOLDAMGBD228NLBM"),
    fredVal("VIXCLS"),
    fredVal("BAMLH0A0HYM2"),
    fredVal("DGS10"),
    fredVal("DTWEXBGS"),
    fredVal("FEDFUNDS"),
    fredVal("RSXFS"),
    fredTrend("DCOILWTICO"),
    fredTrend("DTWEXBGS"),
    fredTrend("ICSA"),
    fredTrend("UMCSENT"),
  ]);

  const gdp = nowcastGDP({ gdpOfficial, claims, claimsAvg, sentiment, indpro, yieldCurve });
  const inflation = nowcastInflation({ cpiOfficial: null, breakeven5y, oil, oilTrend, gold, dxyTrend });
  const employment = nowcastEmployment({ initialClaims: claims, continuingClaims, claimsTrend });
  const financialConditions = nowcastFinancialConditions({ vix, creditSpread, tenYear, dxy, fedFunds });
  const consumer = nowcastConsumer({ sentiment, sentimentTrend, retailSales });
  const globalTrade = nowcastGlobalTrade({ oil, oilTrend, dxyTrend });

  const dimensions = { gdp, inflation, employment, financialConditions, consumer, globalTrade };
  const composite = computeComposite(dimensions);

  const report: NowcastReport = {
    timestamp: new Date().toISOString(),
    ...dimensions,
    composite,
  };

  // Persist
  await saveNowcast(report);

  return report;
}

async function saveNowcast(report: NowcastReport): Promise<void> {
  const value = JSON.stringify(report);
  const now = new Date().toISOString();

  // Save latest
  const latestKey = "nowcast:latest";
  const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, latestKey)).limit(1);
  if (existing.length > 0) {
    await db.update(schema.settings).set({ value, updatedAt: now }).where(eq(schema.settings.key, latestKey));
  } else {
    await db.insert(schema.settings).values({ key: latestKey, value, updatedAt: now });
  }

  // Append to history (keep last 90)
  const historyKey = "nowcast:history";
  const histRows = await db.select().from(schema.settings).where(eq(schema.settings.key, historyKey)).limit(1);
  let history: NowcastReport[] = [];
  if (histRows.length > 0 && histRows[0].value) {
    try { history = JSON.parse(histRows[0].value); } catch (err) { console.error("[Nowcast] history parse failed:", err); }
  }
  history.push(report);
  history = history.slice(-90);
  const histValue = JSON.stringify(history);

  if (histRows.length > 0) {
    await db.update(schema.settings).set({ value: histValue, updatedAt: now }).where(eq(schema.settings.key, historyKey));
  } else {
    await db.insert(schema.settings).values({ key: historyKey, value: histValue, updatedAt: now });
  }
}

export async function getLatestNowcast(): Promise<NowcastReport | null> {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, "nowcast:latest")).limit(1);
  if (rows.length === 0 || !rows[0].value) return null;
  try { return JSON.parse(rows[0].value); } catch { return null; }
}

export async function getNowcastHistory(): Promise<NowcastReport[]> {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, "nowcast:history")).limit(1);
  if (rows.length === 0 || !rows[0].value) return [];
  try { return JSON.parse(rows[0].value); } catch { return []; }
}
