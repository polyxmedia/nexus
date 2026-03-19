import {
  getCashFlowStatement,
  getBalanceSheet,
  getIncomeStatement,
  getQuote,
  type CashFlowStatement,
  type BalanceSheetEntry,
} from "@/lib/market-data/alpha-vantage";

// Sector WACC lookup (approximate cost of capital)
const SECTOR_WACC: Record<string, number> = {
  technology: 0.10,
  healthcare: 0.09,
  financials: 0.08,
  "consumer discretionary": 0.09,
  "consumer staples": 0.07,
  industrials: 0.09,
  energy: 0.10,
  utilities: 0.06,
  "real estate": 0.07,
  materials: 0.09,
  "communication services": 0.09,
};

const DEFAULT_WACC = 0.10;
const DEFAULT_TERMINAL_GROWTH = 0.025;
const MAX_GROWTH_CAP = 0.15;
const PROJECTION_YEARS = 5;
const GROWTH_DECAY = 0.95;

export interface DCFResult {
  symbol: string;
  currentPrice: number;
  fairValue: number;
  upside: number; // percentage
  enterpriseValue: number;
  equityValue: number;
  sharesOutstanding: number;
  fcfHistory: Array<{ year: string; fcf: number }>;
  projectedFCF: Array<{ year: number; fcf: number; discounted: number }>;
  terminalValue: number;
  discountedTerminalValue: number;
  assumptions: {
    wacc: number;
    terminalGrowth: number;
    fcfGrowthRate: number;
    yearsProjected: number;
  };
  sensitivity: Array<{ wacc: number; terminalGrowth: number; fairValue: number }>;
  caveats: string[];
}

function computeCAGR(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  if (first <= 0 || last <= 0) return 0;
  const years = values.length - 1;
  return Math.pow(last / first, 1 / years) - 1;
}

function computeFairValue(params: {
  latestFCF: number;
  growthRate: number;
  wacc: number;
  terminalGrowth: number;
  debt: number;
  cash: number;
  sharesOutstanding: number;
}): {
  fairValue: number;
  enterpriseValue: number;
  equityValue: number;
  projectedFCF: Array<{ year: number; fcf: number; discounted: number }>;
  terminalValue: number;
  discountedTerminalValue: number;
} {
  const { latestFCF, growthRate, wacc, terminalGrowth, debt, cash, sharesOutstanding } = params;

  const projectedFCF: Array<{ year: number; fcf: number; discounted: number }> = [];
  let currentGrowth = growthRate;
  let fcf = Math.abs(latestFCF);
  let pvSum = 0;

  for (let y = 1; y <= PROJECTION_YEARS; y++) {
    fcf = fcf * (1 + currentGrowth);
    const discounted = fcf / Math.pow(1 + wacc, y);
    pvSum += discounted;
    projectedFCF.push({ year: y, fcf: Math.round(fcf), discounted: Math.round(discounted) });
    currentGrowth *= GROWTH_DECAY; // decay toward terminal
  }

  // Terminal value using Gordon Growth Model
  const terminalFCF = fcf * (1 + terminalGrowth);
  const terminalValue = terminalFCF / (wacc - terminalGrowth);
  const discountedTerminalValue = terminalValue / Math.pow(1 + wacc, PROJECTION_YEARS);

  const enterpriseValue = pvSum + discountedTerminalValue;
  const equityValue = enterpriseValue - debt + cash;
  const fairValue = sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0;

  return {
    fairValue,
    enterpriseValue,
    equityValue,
    projectedFCF,
    terminalValue: Math.round(terminalValue),
    discountedTerminalValue: Math.round(discountedTerminalValue),
  };
}

export async function runDCF(params: {
  symbol: string;
  apiKey: string;
  waccOverride?: number;
  terminalGrowthOverride?: number;
}): Promise<DCFResult> {
  const { symbol, apiKey, waccOverride, terminalGrowthOverride } = params;
  const caveats: string[] = [];

  // Fetch all three fundamental datasets in parallel
  const [cashFlows, balanceSheets, incomeStatements, quote] = await Promise.all([
    getCashFlowStatement(symbol, apiKey),
    getBalanceSheet(symbol, apiKey),
    getIncomeStatement(symbol, apiKey),
    getQuote(symbol, apiKey),
  ]);

  // Extract FCF history (most recent 5 years)
  const fcfHistory = cashFlows
    .slice(0, 5)
    .reverse()
    .map((cf: CashFlowStatement) => ({
      year: cf.fiscalDateEnding,
      fcf: cf.freeCashFlow,
    }));

  if (fcfHistory.length < 2) {
    caveats.push("Insufficient FCF history (less than 2 years). Results may be unreliable.");
  }

  // Check for negative FCF
  const latestFCF = cashFlows[0]?.freeCashFlow ?? 0;
  const hasNegativeFCF = latestFCF < 0;
  if (hasNegativeFCF) {
    caveats.push(`Negative free cash flow ($${(latestFCF / 1e6).toFixed(0)}M). Using absolute value with extreme caution. This company may not be suitable for DCF valuation.`);
  }

  // Balance sheet data (most recent)
  const latestBS: BalanceSheetEntry = balanceSheets[0] ?? {
    fiscalDateEnding: "",
    totalDebt: 0,
    cashAndEquivalents: 0,
    commonSharesOutstanding: 0,
  };

  const sharesOutstanding = latestBS.commonSharesOutstanding;
  if (sharesOutstanding === 0) {
    caveats.push("Shares outstanding not found. Fair value per share cannot be calculated.");
  }

  // Growth rate from FCF CAGR
  const fcfValues = fcfHistory.map((f) => f.fcf).filter((v) => v > 0);
  let fcfGrowthRate = computeCAGR(fcfValues);

  if (fcfGrowthRate > MAX_GROWTH_CAP) {
    caveats.push(`FCF growth rate (${(fcfGrowthRate * 100).toFixed(1)}%) exceeds cap. Capped at ${MAX_GROWTH_CAP * 100}%.`);
    fcfGrowthRate = MAX_GROWTH_CAP;
  }
  if (fcfGrowthRate < -0.1) {
    caveats.push(`FCF is declining (${(fcfGrowthRate * 100).toFixed(1)}% CAGR). Using 0% growth floor.`);
    fcfGrowthRate = 0;
  }

  // WACC: override > sector lookup > default
  const wacc = waccOverride ?? DEFAULT_WACC;
  const terminalGrowth = terminalGrowthOverride ?? DEFAULT_TERMINAL_GROWTH;

  if (wacc <= terminalGrowth) {
    caveats.push("WACC must be greater than terminal growth rate. Results will be invalid.");
  }

  // Core DCF computation
  const core = computeFairValue({
    latestFCF: Math.abs(latestFCF),
    growthRate: fcfGrowthRate,
    wacc,
    terminalGrowth,
    debt: latestBS.totalDebt,
    cash: latestBS.cashAndEquivalents,
    sharesOutstanding,
  });

  // Sensitivity matrix: WACC +/-1%, terminal growth +/-0.5%
  const sensitivity: DCFResult["sensitivity"] = [];
  for (const wDelta of [-0.01, 0, 0.01]) {
    for (const tDelta of [-0.005, 0, 0.005]) {
      const w = wacc + wDelta;
      const t = terminalGrowth + tDelta;
      if (w <= t) continue; // skip invalid combos
      const s = computeFairValue({
        latestFCF: Math.abs(latestFCF),
        growthRate: fcfGrowthRate,
        wacc: w,
        terminalGrowth: t,
        debt: latestBS.totalDebt,
        cash: latestBS.cashAndEquivalents,
        sharesOutstanding,
      });
      sensitivity.push({
        wacc: Math.round(w * 1000) / 1000,
        terminalGrowth: Math.round(t * 10000) / 10000,
        fairValue: Math.round(s.fairValue * 100) / 100,
      });
    }
  }

  const fairValue = Math.round(core.fairValue * 100) / 100;
  const upside = quote.price > 0 ? ((fairValue - quote.price) / quote.price) * 100 : 0;

  if (hasNegativeFCF) {
    caveats.push("DCF on negative-FCF companies is inherently unreliable. Consider using EV/Revenue or comparable multiples instead.");
  }

  return {
    symbol,
    currentPrice: quote.price,
    fairValue,
    upside: Math.round(upside * 10) / 10,
    enterpriseValue: Math.round(core.enterpriseValue),
    equityValue: Math.round(core.equityValue),
    sharesOutstanding,
    fcfHistory,
    projectedFCF: core.projectedFCF,
    terminalValue: core.terminalValue,
    discountedTerminalValue: core.discountedTerminalValue,
    assumptions: {
      wacc,
      terminalGrowth,
      fcfGrowthRate: Math.round(fcfGrowthRate * 1000) / 1000,
      yearsProjected: PROJECTION_YEARS,
    },
    sensitivity,
    caveats,
  };
}
