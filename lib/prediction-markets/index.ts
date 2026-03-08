// Prediction Markets Integration
// Polymarket (geopolitical/political) + Kalshi (economic/financial)

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 300_000; // 5 minutes

// ── Types ──

export interface PredictionMarket {
  id: string;
  source: "polymarket" | "kalshi";
  title: string;
  description: string;
  probability: number; // 0-1
  volume24h: number;
  totalVolume: number;
  category: string;
  endDate: string;
  active: boolean;
  url: string;
  priceChange24h: number;
  priceChange7d: number;
}

export interface PredictionMarketsSnapshot {
  markets: PredictionMarket[];
  topMovers: PredictionMarket[];
  geopolitical: PredictionMarket[];
  economic: PredictionMarket[];
  political: PredictionMarket[];
  totalMarkets: number;
  lastUpdated: string;
}

// ── Polymarket (Gamma API) ──

const POLYMARKET_BASE = "https://gamma-api.polymarket.com";

// Relevant tag labels to search for
const GEO_TAGS = ["geopolitics", "war", "conflict", "military", "sanctions", "china", "russia", "iran", "middle east", "nato"];
const POLITICAL_TAGS = ["politics", "elections", "congress", "president", "trump", "biden", "legislation", "supreme court"];
const ECONOMIC_TAGS = ["economics", "finance", "fed", "interest rates", "inflation", "recession", "crypto", "bitcoin"];

interface PolymarketEvent {
  id: string;
  title: string;
  description: string;
  slug: string;
  active: boolean;
  closed: boolean;
  volume: number;
  volume24hr: number;
  startDate: string;
  endDate: string;
  tags: Array<{ id: string; label: string; slug: string }>;
  markets: Array<{
    id: string;
    question: string;
    outcomePrices: string;
    volume: string;
    volumeNum: number;
    volume24hr: number;
    active: boolean;
    closed: boolean;
    lastTradePrice: number;
    oneDayPriceChange: number;
    oneWeekPriceChange: number;
    slug: string;
    endDate: string;
  }>;
}

function categorizeEvent(tags: Array<{ label: string }>): string {
  const labels = tags.map(t => t.label.toLowerCase());
  for (const tag of labels) {
    if (GEO_TAGS.some(g => tag.includes(g))) return "geopolitical";
    if (POLITICAL_TAGS.some(p => tag.includes(p))) return "political";
    if (ECONOMIC_TAGS.some(e => tag.includes(e))) return "economic";
  }
  return "other";
}

async function fetchPolymarketEvents(): Promise<PredictionMarket[]> {
  try {
    // Fetch active events sorted by volume
    const res = await fetch(
      `${POLYMARKET_BASE}/events?active=true&closed=false&limit=100&order=volume_24hr&ascending=false`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];

    const events: PolymarketEvent[] = await res.json();
    const markets: PredictionMarket[] = [];

    for (const event of events) {
      const category = categorizeEvent(event.tags || []);

      for (const market of (event.markets || [])) {
        if (!market.active || market.closed) continue;

        let probability = market.lastTradePrice || 0;
        // Parse outcomePrices if available
        try {
          const prices = JSON.parse(market.outcomePrices || "[]");
          if (prices.length > 0) probability = parseFloat(prices[0]);
        } catch { /* use lastTradePrice */ }

        markets.push({
          id: `poly_${market.id}`,
          source: "polymarket",
          title: market.question || event.title,
          description: event.description || "",
          probability,
          volume24h: market.volume24hr || event.volume24hr || 0,
          totalVolume: market.volumeNum || event.volume || 0,
          category,
          endDate: market.endDate || event.endDate || "",
          active: true,
          url: `https://polymarket.com/event/${event.slug}`,
          priceChange24h: market.oneDayPriceChange || 0,
          priceChange7d: market.oneWeekPriceChange || 0,
        });
      }
    }

    return markets;
  } catch (err) {
    console.error("Polymarket fetch error:", err);
    return [];
  }
}

// ── Kalshi ──

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";

interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title?: string;
  yes_sub_title: string;
  no_sub_title: string;
  status: string;
  last_price: number;
  yes_bid: number;
  yes_ask: number;
  volume: number;
  volume_24h: number;
  open_interest: number;
  close_time: string;
  result: string;
  category?: string;
  subtitle?: string;
}

interface KalshiResponse {
  markets: KalshiMarket[];
  cursor: string;
}

async function fetchKalshiMarkets(): Promise<PredictionMarket[]> {
  try {
    const res = await fetch(
      `${KALSHI_BASE}/markets?limit=100&status=open`,
      {
        signal: AbortSignal.timeout(10000),
        headers: { "Accept": "application/json" },
      }
    );
    if (!res.ok) return [];

    const data: KalshiResponse = await res.json();
    const markets: PredictionMarket[] = [];

    for (const m of (data.markets || [])) {
      if (m.status !== "open") continue;

      // Categorize by ticker prefix patterns
      const ticker = m.ticker.toUpperCase();
      let category = "other";
      if (ticker.match(/^KX(CPI|NFP|GDP|FED|RATE|UNEMP|JOBS)/)) category = "economic";
      else if (ticker.match(/^KX(PRES|ELECT|CONGRESS|SENATE|HOUSE|TRUMP|BIDEN)/)) category = "political";
      else if (ticker.match(/^KX(WAR|CHINA|RUSSIA|IRAN|NATO|SANCT)/)) category = "geopolitical";

      const probability = m.last_price || ((m.yes_bid + m.yes_ask) / 2) || 0;

      markets.push({
        id: `kalshi_${m.ticker}`,
        source: "kalshi",
        title: m.yes_sub_title || m.ticker,
        description: m.subtitle || "",
        probability: probability / 100, // Kalshi prices are in cents
        volume24h: m.volume_24h || 0,
        totalVolume: m.volume || 0,
        category,
        endDate: m.close_time || "",
        active: true,
        url: `https://kalshi.com/markets/${m.event_ticker}`,
        priceChange24h: 0,
        priceChange7d: 0,
      });
    }

    return markets;
  } catch (err) {
    console.error("Kalshi fetch error:", err);
    return [];
  }
}

// ── Combined Interface ──

export async function getPredictionMarkets(): Promise<PredictionMarketsSnapshot> {
  const cacheKey = "prediction_markets:snapshot";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data as PredictionMarketsSnapshot;

  const [polymarkets, kalshiMarkets] = await Promise.allSettled([
    fetchPolymarketEvents(),
    fetchKalshiMarkets(),
  ]);

  const poly = polymarkets.status === "fulfilled" ? polymarkets.value : [];
  const kalshi = kalshiMarkets.status === "fulfilled" ? kalshiMarkets.value : [];

  const allMarkets = [...poly, ...kalshi];

  // Sort by 24h volume
  allMarkets.sort((a, b) => b.volume24h - a.volume24h);

  // Top movers by absolute price change
  const topMovers = [...allMarkets]
    .filter(m => m.priceChange24h !== 0)
    .sort((a, b) => Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h))
    .slice(0, 10);

  const result: PredictionMarketsSnapshot = {
    markets: allMarkets.slice(0, 50),
    topMovers,
    geopolitical: allMarkets.filter(m => m.category === "geopolitical").slice(0, 20),
    economic: allMarkets.filter(m => m.category === "economic").slice(0, 20),
    political: allMarkets.filter(m => m.category === "political").slice(0, 20),
    totalMarkets: allMarkets.length,
    lastUpdated: new Date().toISOString(),
  };

  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
  return result;
}

// ── Divergence Detection ──
// Compare prediction market odds against NEXUS prediction confidence

export interface MarketDivergence {
  market: PredictionMarket;
  nexusConfidence: number;
  marketProbability: number;
  divergence: number; // absolute difference
  direction: "nexus_higher" | "nexus_lower";
}

export function detectDivergences(
  markets: PredictionMarket[],
  nexusPredictions: Array<{ title: string; confidence: number }>,
): MarketDivergence[] {
  const divergences: MarketDivergence[] = [];

  for (const market of markets) {
    // Simple title matching -- can be enhanced with embeddings
    const titleLower = market.title.toLowerCase();
    for (const prediction of nexusPredictions) {
      const predLower = prediction.title.toLowerCase();
      // Check for keyword overlap (at least 3 words in common)
      const marketWords = new Set(titleLower.split(/\s+/).filter(w => w.length > 3));
      const predWords = predLower.split(/\s+/).filter(w => w.length > 3);
      const overlap = predWords.filter(w => marketWords.has(w)).length;

      if (overlap >= 3) {
        const divergence = Math.abs(prediction.confidence - market.probability);
        if (divergence > 0.15) { // Only flag significant divergences (>15pp)
          divergences.push({
            market,
            nexusConfidence: prediction.confidence,
            marketProbability: market.probability,
            divergence,
            direction: prediction.confidence > market.probability ? "nexus_higher" : "nexus_lower",
          });
        }
      }
    }
  }

  return divergences.sort((a, b) => b.divergence - a.divergence);
}
