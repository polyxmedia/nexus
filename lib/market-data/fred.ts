// FRED API client for macroeconomic data
// https://fred.stlouisfed.org/docs/api/fred/

const BASE_URL = "https://api.stlouisfed.org/fred";

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 3600_000; // 1 hour

export const FRED_SERIES = {
  FEDFUNDS: { id: "FEDFUNDS", name: "Fed Funds Rate", unit: "%" },
  DGS2: { id: "DGS2", name: "2-Year Treasury", unit: "%" },
  DGS10: { id: "DGS10", name: "10-Year Treasury", unit: "%" },
  DGS30: { id: "DGS30", name: "30-Year Treasury", unit: "%" },
  T10Y2Y: { id: "T10Y2Y", name: "10Y-2Y Spread", unit: "%" },
  CPIAUCSL: { id: "CPIAUCSL", name: "CPI (All Items)", unit: "index" },
  T5YIE: { id: "T5YIE", name: "5Y Breakeven Inflation", unit: "%" },
  T10YIE: { id: "T10YIE", name: "10Y Breakeven Inflation", unit: "%" },
  UNRATE: { id: "UNRATE", name: "Unemployment Rate", unit: "%" },
  PAYEMS: { id: "PAYEMS", name: "Nonfarm Payrolls", unit: "thousands" },
  ICSA: { id: "ICSA", name: "Initial Jobless Claims", unit: "claims" },
  CCSA: { id: "CCSA", name: "Continuing Claims", unit: "claims" },
  A191RL1Q225SBEA: { id: "A191RL1Q225SBEA", name: "Real GDP Growth", unit: "%" },
  UMCSENT: { id: "UMCSENT", name: "Consumer Sentiment", unit: "index" },
  RSXFS: { id: "RSXFS", name: "Retail Sales", unit: "millions $" },
  HOUST: { id: "HOUST", name: "Housing Starts", unit: "thousands" },
  M2SL: { id: "M2SL", name: "M2 Money Supply", unit: "billions $" },
  WALCL: { id: "WALCL", name: "Fed Balance Sheet", unit: "millions $" },
  RRPONTSYD: { id: "RRPONTSYD", name: "Reverse Repo", unit: "billions $" },
  BAMLH0A0HYM2: { id: "BAMLH0A0HYM2", name: "HY OAS Spread", unit: "%" },
  BAMLC0A0CM: { id: "BAMLC0A0CM", name: "IG OAS Spread", unit: "%" },
  INDPRO: { id: "INDPRO", name: "Industrial Production", unit: "index" },
  DTWEXBGS: { id: "DTWEXBGS", name: "Trade-Weighted Dollar", unit: "index" },
  DEXUSEU: { id: "DEXUSEU", name: "USD/EUR", unit: "rate" },
  DEXJPUS: { id: "DEXJPUS", name: "JPY/USD", unit: "rate" },
  DEXCHUS: { id: "DEXCHUS", name: "CNY/USD", unit: "rate" },
  GOLDAMGBD228NLBM: { id: "GOLDAMGBD228NLBM", name: "Gold Price", unit: "$/oz" },
  DCOILWTICO: { id: "DCOILWTICO", name: "WTI Crude Oil", unit: "$/bbl" },
  DCOILBRENTEU: { id: "DCOILBRENTEU", name: "Brent Crude Oil", unit: "$/bbl" },
  DHHNGSP: { id: "DHHNGSP", name: "Natural Gas", unit: "$/mmbtu" },
  VIXCLS: { id: "VIXCLS", name: "VIX Close", unit: "index" },
} as const;

export type FredSeriesId = keyof typeof FRED_SERIES;

export interface FredDataPoint {
  date: string;
  value: number;
}

export interface FredSeriesData {
  id: string;
  name: string;
  unit: string;
  latest: FredDataPoint | null;
  previous: FredDataPoint | null;
  change: number | null;
  changePercent: number | null;
  history: FredDataPoint[];
}

function getApiKey(): string | null {
  return process.env.FRED_API_KEY || null;
}

export async function getFredSeries(
  seriesId: string,
  limit: number = 30
): Promise<FredDataPoint[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("FRED_API_KEY not configured. Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html");

  const cacheKey = `fred:${seriesId}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data as FredDataPoint[];

  const url = `${BASE_URL}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!res.ok) throw new Error(`FRED API error: ${res.status}`);

  const json = await res.json();
  const observations = (json.observations || []) as Array<{ date: string; value: string }>;

  const points: FredDataPoint[] = observations
    .filter(o => o.value !== ".")
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();

  cache.set(cacheKey, { data: points, expiry: Date.now() + CACHE_TTL });
  return points;
}

export async function getMacroSnapshot(): Promise<Record<string, FredSeriesData>> {
  const cacheKey = "fred:macro_snapshot";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data as Record<string, FredSeriesData>;

  const keys: FredSeriesId[] = [
    "FEDFUNDS", "DGS2", "DGS10", "DGS30", "T10Y2Y",
    "UNRATE", "ICSA", "CCSA", "PAYEMS", "CPIAUCSL", "T5YIE", "T10YIE",
    "UMCSENT", "RSXFS", "VIXCLS",
    "GOLDAMGBD228NLBM", "DCOILWTICO", "DCOILBRENTEU", "DHHNGSP",
    "DTWEXBGS", "DEXUSEU", "DEXJPUS", "DEXCHUS",
    "M2SL", "WALCL", "RRPONTSYD",
    "BAMLH0A0HYM2", "BAMLC0A0CM",
    "A191RL1Q225SBEA", "HOUST", "INDPRO",
  ];

  const results: Record<string, FredSeriesData> = {};

  // Fetch all series in parallel (each has its own 10s timeout + 1h cache)
  const allResults = await Promise.allSettled(
    keys.map(async (key) => {
      const series = FRED_SERIES[key];
      const points = await getFredSeries(series.id, 10);
      const latest = points.length > 0 ? points[points.length - 1] : null;
      const previous = points.length > 1 ? points[points.length - 2] : null;
      const change = latest && previous ? latest.value - previous.value : null;
      const changePercent = latest && previous && previous.value !== 0
        ? ((latest.value - previous.value) / Math.abs(previous.value)) * 100
        : null;

      return { key, data: { id: series.id, name: series.name, unit: series.unit, latest, previous, change, changePercent, history: points } as FredSeriesData };
    })
  );

  for (const result of allResults) {
    if (result.status === "fulfilled") results[result.value.key] = result.value.data;
  }

  cache.set(cacheKey, { data: results, expiry: Date.now() + CACHE_TTL });
  return results;
}

export async function getYieldCurve(): Promise<{
  curve: Array<{ maturity: string; yield: number }>;
  spread2s10s: number | null;
  isInverted: boolean;
  fedFunds: number | null;
}> {
  const maturities: Array<{ key: string; label: string }> = [
    { key: "DGS1MO", label: "1M" }, { key: "DGS3MO", label: "3M" },
    { key: "DGS6MO", label: "6M" }, { key: "DGS1", label: "1Y" },
    { key: "DGS2", label: "2Y" }, { key: "DGS5", label: "5Y" },
    { key: "DGS10", label: "10Y" }, { key: "DGS30", label: "30Y" },
  ];

  const results = await Promise.allSettled(
    maturities.map(async (m) => {
      const points = await getFredSeries(m.key, 2);
      return { maturity: m.label, yield: points.length > 0 ? points[points.length - 1].value : 0 };
    })
  );

  const curve = results
    .filter((r): r is PromiseFulfilledResult<{ maturity: string; yield: number }> => r.status === "fulfilled")
    .map(r => r.value);

  let spread2s10s: number | null = null;
  try {
    const d = await getFredSeries("T10Y2Y", 2);
    spread2s10s = d.length > 0 ? d[d.length - 1].value : null;
  } catch { /* ignore */ }

  let fedFunds: number | null = null;
  try {
    const d = await getFredSeries("FEDFUNDS", 2);
    fedFunds = d.length > 0 ? d[d.length - 1].value : null;
  } catch { /* ignore */ }

  return { curve, spread2s10s, isInverted: spread2s10s != null && spread2s10s < 0, fedFunds };
}
