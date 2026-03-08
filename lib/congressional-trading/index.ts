// Congressional & Insider Trading Tracker
// Sources: Senate/House Stock Watcher (free S3 JSON), SEC EDGAR Form 4

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 1800_000; // 30 minutes

// ── Types ──

export interface CongressionalTrade {
  id: string;
  name: string;
  chamber: "senate" | "house";
  party?: string;
  state?: string;
  ticker: string;
  asset: string;
  transactionType: "purchase" | "sale" | "exchange";
  amount: string; // dollar range e.g. "$1,001 - $15,000"
  transactionDate: string;
  filingDate: string;
  owner: string; // "Self", "Spouse", "Child", "Joint"
  comment?: string;
}

export interface InsiderTrade {
  id: string;
  insider: string;
  title: string; // CEO, CFO, Director, etc.
  company: string;
  ticker: string;
  transactionType: "purchase" | "sale" | "exercise";
  shares: number;
  pricePerShare: number | null;
  totalValue: number | null;
  transactionDate: string;
  filingDate: string;
  sharesOwned: number | null;
}

export interface ClusterBuy {
  ticker: string;
  company: string;
  insiders: Array<{ name: string; title: string; shares: number; date: string }>;
  totalShares: number;
  totalValue: number;
  windowDays: number;
  significance: "high" | "medium" | "low";
}

export interface TradingSnapshot {
  congressional: {
    recent: CongressionalTrade[];
    topBuys: CongressionalTrade[];
    topSells: CongressionalTrade[];
    byParty: { democrat: number; republican: number; independent: number };
    byChamber: { senate: number; house: number };
  };
  insider: {
    recent: InsiderTrade[];
    clusterBuys: ClusterBuy[];
    buyRatio: number; // buy / (buy + sell)
    topSectors: Array<{ sector: string; buys: number; sells: number }>;
  };
  lastUpdated: string;
}

// ── Senate Stock Watcher ──

const SENATE_URL = "https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json";

interface SenateRaw {
  first_name: string;
  last_name: string;
  office?: string;
  date_received: string;
  transaction_date: string;
  owner: string;
  ticker: string;
  asset_description: string;
  asset_type: string;
  type: string; // "Purchase", "Sale (Full)", "Sale (Partial)", "Exchange"
  amount: string;
  comment: string;
  party?: string;
  state?: string;
}

async function fetchSenateTrades(): Promise<CongressionalTrade[]> {
  try {
    const res = await fetch(SENATE_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];

    const raw: SenateRaw[] = await res.json();

    // Sort by transaction date descending, take recent
    const sorted = raw
      .filter(t => t.ticker && t.ticker !== "--" && t.ticker !== "N/A")
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      .slice(0, 200);

    return sorted.map((t, i) => ({
      id: `senate_${i}_${t.ticker}_${t.transaction_date}`,
      name: `${t.first_name} ${t.last_name}`,
      chamber: "senate" as const,
      party: t.party,
      state: t.state,
      ticker: t.ticker,
      asset: t.asset_description,
      transactionType: t.type.toLowerCase().includes("purchase") ? "purchase" as const
        : t.type.toLowerCase().includes("sale") ? "sale" as const
        : "exchange" as const,
      amount: t.amount,
      transactionDate: t.transaction_date,
      filingDate: t.date_received,
      owner: t.owner || "Self",
      comment: t.comment,
    }));
  } catch (err) {
    console.error("Senate trades fetch error:", err);
    return [];
  }
}

// ── House Stock Watcher ──

const HOUSE_URL = "https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json";

interface HouseRaw {
  representative: string;
  date: string;
  transaction_date: string;
  ticker: string;
  asset_description: string;
  type: string;
  amount: string;
  owner: string;
  party?: string;
  state?: string;
  district?: string;
}

async function fetchHouseTrades(): Promise<CongressionalTrade[]> {
  try {
    const res = await fetch(HOUSE_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];

    const raw: HouseRaw[] = await res.json();

    const sorted = raw
      .filter(t => t.ticker && t.ticker !== "--" && t.ticker !== "N/A" && t.ticker !== "")
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      .slice(0, 200);

    return sorted.map((t, i) => ({
      id: `house_${i}_${t.ticker}_${t.transaction_date}`,
      name: t.representative,
      chamber: "house" as const,
      party: t.party,
      state: t.state,
      ticker: t.ticker,
      asset: t.asset_description,
      transactionType: t.type.toLowerCase().includes("purchase") ? "purchase" as const
        : t.type.toLowerCase().includes("sale") ? "sale" as const
        : "exchange" as const,
      amount: t.amount,
      transactionDate: t.transaction_date,
      filingDate: t.date,
      owner: t.owner || "Self",
    }));
  } catch (err) {
    console.error("House trades fetch error:", err);
    return [];
  }
}

// ── SEC EDGAR Form 4 (Insider Trading) ──

const EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index";

async function fetchRecentInsiderTrades(): Promise<InsiderTrade[]> {
  try {
    // Use SEC full-text search for recent Form 4 filings
    const res = await fetch(
      `${EDGAR_SEARCH}?q=%22open+market%22+%22purchase%22&forms=4&dateRange=custom&startdt=${getDateDaysAgo(30)}&enddt=${getTodayDate()}&from=0&size=50`,
      {
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent": "NexusIntelligence contact@nexus.app",
          "Accept": "application/json",
        },
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const filings = data.hits?.hits || data.filings || [];

    // EDGAR search returns filing metadata, not parsed transactions
    // For now, return structured summaries from the search results
    return filings.slice(0, 30).map((f: Record<string, unknown>, i: number) => {
      const source = (f._source || f) as Record<string, unknown>;
      return {
        id: `edgar_${i}_${source.accession_no || i}`,
        insider: (source.display_names as string[])?.[0] || "Unknown",
        title: "",
        company: (source.entity_name as string) || "",
        ticker: "", // EDGAR search doesn't always return ticker
        transactionType: "purchase" as const,
        shares: 0,
        pricePerShare: null,
        totalValue: null,
        transactionDate: (source.period_of_report as string) || "",
        filingDate: (source.file_date as string) || "",
        sharesOwned: null,
      };
    });
  } catch (err) {
    console.error("EDGAR fetch error:", err);
    return [];
  }
}

// ── Cluster Buy Detection ──

function detectClusterBuys(trades: InsiderTrade[], windowDays: number = 14): ClusterBuy[] {
  // Group purchases by ticker
  const byTicker = new Map<string, InsiderTrade[]>();
  for (const trade of trades) {
    if (trade.transactionType !== "purchase" || !trade.ticker) continue;
    const existing = byTicker.get(trade.ticker) || [];
    existing.push(trade);
    byTicker.set(trade.ticker, existing);
  }

  const clusters: ClusterBuy[] = [];

  for (const [ticker, tickerTrades] of byTicker) {
    if (tickerTrades.length < 2) continue;

    // Sort by date
    const sorted = tickerTrades.sort((a, b) =>
      new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    // Sliding window for clusters
    for (let i = 0; i < sorted.length; i++) {
      const windowStart = new Date(sorted[i].transactionDate).getTime();
      const windowEnd = windowStart + windowDays * 86400000;
      const inWindow = sorted.filter(t => {
        const d = new Date(t.transactionDate).getTime();
        return d >= windowStart && d <= windowEnd;
      });

      // Deduplicate insiders
      const uniqueInsiders = new Map<string, typeof inWindow[0]>();
      for (const t of inWindow) uniqueInsiders.set(t.insider, t);

      if (uniqueInsiders.size >= 2) {
        const insiders = Array.from(uniqueInsiders.values()).map(t => ({
          name: t.insider,
          title: t.title,
          shares: t.shares,
          date: t.transactionDate,
        }));

        const totalShares = insiders.reduce((sum, ins) => sum + ins.shares, 0);
        const totalValue = inWindow.reduce((sum, t) => sum + (t.totalValue || 0), 0);

        clusters.push({
          ticker,
          company: sorted[0].company,
          insiders,
          totalShares,
          totalValue,
          windowDays,
          significance: uniqueInsiders.size >= 4 ? "high" : uniqueInsiders.size >= 3 ? "medium" : "low",
        });
      }
    }
  }

  // Deduplicate clusters by ticker (keep highest significance)
  const uniqueClusters = new Map<string, ClusterBuy>();
  for (const c of clusters) {
    const existing = uniqueClusters.get(c.ticker);
    if (!existing || c.insiders.length > existing.insiders.length) {
      uniqueClusters.set(c.ticker, c);
    }
  }

  return Array.from(uniqueClusters.values())
    .sort((a, b) => b.insiders.length - a.insiders.length);
}

// ── Combined Snapshot ──

export async function getTradingSnapshot(): Promise<TradingSnapshot> {
  const cacheKey = "congressional_trading:snapshot";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data as TradingSnapshot;

  const [senateResult, houseResult, insiderResult] = await Promise.allSettled([
    fetchSenateTrades(),
    fetchHouseTrades(),
    fetchRecentInsiderTrades(),
  ]);

  const senate = senateResult.status === "fulfilled" ? senateResult.value : [];
  const house = houseResult.status === "fulfilled" ? houseResult.value : [];
  const insiderTrades = insiderResult.status === "fulfilled" ? insiderResult.value : [];

  const allCongressional = [...senate, ...house]
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  // Party breakdown
  const byParty = { democrat: 0, republican: 0, independent: 0 };
  for (const t of allCongressional) {
    const p = (t.party || "").toLowerCase();
    if (p.includes("democrat") || p === "d") byParty.democrat++;
    else if (p.includes("republican") || p === "r") byParty.republican++;
    else byParty.independent++;
  }

  // Purchases vs sales
  const purchases = allCongressional.filter(t => t.transactionType === "purchase");
  const sales = allCongressional.filter(t => t.transactionType === "sale");

  // Insider cluster detection
  const clusterBuys = detectClusterBuys(insiderTrades);

  // Buy ratio
  const insiderBuys = insiderTrades.filter(t => t.transactionType === "purchase").length;
  const insiderSells = insiderTrades.filter(t => t.transactionType === "sale").length;
  const buyRatio = (insiderBuys + insiderSells) > 0 ? insiderBuys / (insiderBuys + insiderSells) : 0.5;

  const result: TradingSnapshot = {
    congressional: {
      recent: allCongressional.slice(0, 50),
      topBuys: purchases.slice(0, 20),
      topSells: sales.slice(0, 20),
      byParty,
      byChamber: { senate: senate.length, house: house.length },
    },
    insider: {
      recent: insiderTrades.slice(0, 30),
      clusterBuys,
      buyRatio,
      topSectors: [], // Would need sector mapping from ticker
    },
    lastUpdated: new Date().toISOString(),
  };

  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
  return result;
}

// ── Query by ticker ──

export async function getTradesForTicker(ticker: string): Promise<{
  congressional: CongressionalTrade[];
  insider: InsiderTrade[];
}> {
  const snapshot = await getTradingSnapshot();
  const upperTicker = ticker.toUpperCase();

  return {
    congressional: snapshot.congressional.recent.filter(t => t.ticker.toUpperCase() === upperTicker),
    insider: snapshot.insider.recent.filter(t => t.ticker.toUpperCase() === upperTicker),
  };
}

// ── Helpers ──

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
