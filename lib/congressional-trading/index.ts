// Congressional & Insider Trading Tracker
// Sources: Quiver Quant (congressional trades), SEC EDGAR (Form 4 insider filings)

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 1800_000; // 30 minutes

// ── Types ──

export interface CongressionalTrade {
  id: string;
  name: string;
  chamber: "senate" | "house";
  party?: string;
  ticker: string;
  asset: string;
  transactionType: "purchase" | "sale" | "exchange";
  amount: string;
  transactionDate: string;
  filingDate: string;
  owner: string;
  excessReturn?: number;
  bioguideId?: string;
}

export interface InsiderTrade {
  id: string;
  insider: string;
  title: string;
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

export interface TopTrader {
  name: string;
  party: string;
  chamber: "senate" | "house";
  bioguideId?: string;
  totalTrades: number;
  purchases: number;
  sales: number;
  avgExcessReturn: number;
  totalExcessReturn: number;
  bestTrade: { ticker: string; excessReturn: number } | null;
  worstTrade: { ticker: string; excessReturn: number } | null;
  recentTickers: string[];
}

export interface TradingSnapshot {
  congressional: {
    recent: CongressionalTrade[];
    topBuys: CongressionalTrade[];
    topSells: CongressionalTrade[];
    topTraders: TopTrader[];
    byParty: { democrat: number; republican: number; independent: number };
    byChamber: { senate: number; house: number };
  };
  insider: {
    recent: InsiderTrade[];
    clusterBuys: ClusterBuy[];
    buyRatio: number;
    topSectors: Array<{ sector: string; buys: number; sells: number }>;
  };
  lastUpdated: string;
}

// ── Quiver Quant (Congressional Trading) ──
// Quiver Quant API - requires Authorization header (API key via env, falls back to public token)
const QUIVER_URL = "https://api.quiverquant.com/beta/live/congresstrading";

interface QuiverTrade {
  Representative: string;
  TransactionDate: string;
  ReportDate: string;
  Ticker: string;
  Transaction: string;
  Range: string;
  House: string;
  Amount: string;
  Party: string;
  TickerType: string;
  Description: string | null;
  ExcessReturn: number | null;
  BioGuideID: string | null;
}

async function fetchCongressionalTrades(): Promise<CongressionalTrade[]> {
  try {
    const quiverToken = process.env.QUIVER_API_KEY || "public";
    const res = await fetch(QUIVER_URL, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${quiverToken}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const raw: QuiverTrade[] = await res.json();

    const filtered = raw
      .filter((t) => t.Ticker && t.Ticker !== "--" && t.Ticker !== "N/A" && t.TickerType === "Stock")
      .slice(0, 200);

    return filtered.map((t, i) => ({
      id: `qv_${i}_${t.Ticker}_${t.TransactionDate}`,
      name: t.Representative,
      chamber: t.House.toLowerCase() === "senate" ? "senate" as const : "house" as const, // Quiver uses "Senate" | "Representatives"
      party: t.Party === "R" ? "Republican" : t.Party === "D" ? "Democrat" : "Independent",
      ticker: t.Ticker,
      asset: t.Description || t.Ticker,
      transactionType: t.Transaction.toLowerCase().includes("purchase") ? "purchase" as const
        : t.Transaction.toLowerCase().includes("sale") ? "sale" as const
        : "exchange" as const,
      amount: t.Range || t.Amount || "",
      transactionDate: t.TransactionDate,
      filingDate: t.ReportDate,
      owner: "Self",
      excessReturn: t.ExcessReturn ?? undefined,
      bioguideId: t.BioGuideID || undefined,
    }));
  } catch (err) {
    console.error("Quiver Quant fetch error:", err);
    return [];
  }
}

// ── SEC EDGAR Form 4 (Insider Trading) ──

const EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index";

async function fetchEdgarInsiderTrades(): Promise<InsiderTrade[]> {
  try {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const res = await fetch(
      `${EDGAR_SEARCH}?q=purchase&forms=4&dateRange=custom&startdt=${startDate}&enddt=${endDate}&from=0&size=50`,
      {
        signal: AbortSignal.timeout(12000),
        headers: {
          "User-Agent": "NexusIntelligence hello@nexushq.xyz",
          "Accept": "application/json",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const hits = data.hits?.hits || [];

    return hits.slice(0, 30).map((h: Record<string, unknown>, i: number) => {
      const src = (h._source || h) as Record<string, unknown>;
      const names = src.display_names as string[] | undefined;
      const insider = names?.[0]?.replace(/\s*\(CIK.*\)/, "") || "Unknown";
      const company = (names?.length ?? 0) > 1 ? (names?.[1]?.replace(/\s*\(CIK.*\)/, "") || "") : "";

      return {
        id: `edgar_${i}_${src.adsh || i}`,
        insider,
        title: "",
        company,
        ticker: "",
        transactionType: "purchase" as const,
        shares: 0,
        pricePerShare: null,
        totalValue: null,
        transactionDate: (src.period_ending as string) || "",
        filingDate: (src.file_date as string) || "",
        sharesOwned: null,
      };
    });
  } catch (err) {
    console.error("EDGAR insider fetch error:", err);
    return [];
  }
}

// ── Cluster Buy Detection ──

function detectClusterBuys(trades: InsiderTrade[], windowDays: number = 14): ClusterBuy[] {
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

    const sorted = tickerTrades.sort((a, b) =>
      new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    for (let i = 0; i < sorted.length; i++) {
      const windowStart = new Date(sorted[i].transactionDate).getTime();
      const windowEnd = windowStart + windowDays * 86400000;
      const inWindow = sorted.filter((t) => {
        const d = new Date(t.transactionDate).getTime();
        return d >= windowStart && d <= windowEnd;
      });

      const uniqueInsiders = new Map<string, (typeof inWindow)[0]>();
      for (const t of inWindow) uniqueInsiders.set(t.insider, t);

      if (uniqueInsiders.size >= 2) {
        const insiders = Array.from(uniqueInsiders.values()).map((t) => ({
          name: t.insider,
          title: t.title,
          shares: t.shares,
          date: t.transactionDate,
        }));

        clusters.push({
          ticker,
          company: sorted[0].company,
          insiders,
          totalShares: insiders.reduce((sum, ins) => sum + ins.shares, 0),
          totalValue: inWindow.reduce((sum, t) => sum + (t.totalValue || 0), 0),
          windowDays,
          significance: uniqueInsiders.size >= 4 ? "high" : uniqueInsiders.size >= 3 ? "medium" : "low",
        });
      }
    }
  }

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

// ── Top Traders Aggregation ──

function aggregateTopTraders(trades: CongressionalTrade[]): TopTrader[] {
  const byMember = new Map<string, CongressionalTrade[]>();
  for (const t of trades) {
    const existing = byMember.get(t.name) || [];
    existing.push(t);
    byMember.set(t.name, existing);
  }

  const traders: TopTrader[] = [];

  for (const [name, memberTrades] of byMember) {
    if (memberTrades.length < 2) continue;

    const withReturn = memberTrades.filter((t) => t.excessReturn !== undefined);
    const purchases = memberTrades.filter((t) => t.transactionType === "purchase").length;
    const sales = memberTrades.filter((t) => t.transactionType === "sale").length;

    const totalExcessReturn = withReturn.reduce((sum, t) => sum + (t.excessReturn || 0), 0);
    const avgExcessReturn = withReturn.length > 0 ? totalExcessReturn / withReturn.length : 0;

    let bestTrade: TopTrader["bestTrade"] = null;
    let worstTrade: TopTrader["worstTrade"] = null;
    for (const t of withReturn) {
      const er = t.excessReturn || 0;
      if (!bestTrade || er > bestTrade.excessReturn) bestTrade = { ticker: t.ticker, excessReturn: er };
      if (!worstTrade || er < worstTrade.excessReturn) worstTrade = { ticker: t.ticker, excessReturn: er };
    }

    const recentTickers = [...new Set(memberTrades.slice(0, 5).map((t) => t.ticker))];
    const first = memberTrades[0];

    traders.push({
      name,
      party: first.party || "",
      chamber: first.chamber,
      bioguideId: first.bioguideId,
      totalTrades: memberTrades.length,
      purchases,
      sales,
      avgExcessReturn,
      totalExcessReturn,
      bestTrade,
      worstTrade,
      recentTickers,
    });
  }

  return traders.sort((a, b) => b.avgExcessReturn - a.avgExcessReturn);
}

// ── Combined Snapshot ──

export async function getTradingSnapshot(): Promise<TradingSnapshot> {
  const cacheKey = "congressional_trading:snapshot";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data as TradingSnapshot;

  const [congressResult, insiderResult] = await Promise.allSettled([
    fetchCongressionalTrades(),
    fetchEdgarInsiderTrades(),
  ]);

  const congressional = congressResult.status === "fulfilled" ? congressResult.value : [];
  const insiderTrades = insiderResult.status === "fulfilled" ? insiderResult.value : [];

  const allCongressional = congressional
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const byParty = { democrat: 0, republican: 0, independent: 0 };
  for (const t of allCongressional) {
    const p = (t.party || "").toLowerCase();
    if (p.includes("democrat")) byParty.democrat++;
    else if (p.includes("republican")) byParty.republican++;
    else byParty.independent++;
  }

  const senate = allCongressional.filter((t) => t.chamber === "senate");
  const house = allCongressional.filter((t) => t.chamber === "house");
  const purchases = allCongressional.filter((t) => t.transactionType === "purchase");
  const sales = allCongressional.filter((t) => t.transactionType === "sale");

  const topTraders = aggregateTopTraders(allCongressional);
  const clusterBuys = detectClusterBuys(insiderTrades);

  const insiderBuys = insiderTrades.filter((t) => t.transactionType === "purchase").length;
  const insiderSells = insiderTrades.filter((t) => t.transactionType === "sale").length;
  const buyRatio = (insiderBuys + insiderSells) > 0 ? insiderBuys / (insiderBuys + insiderSells) : 0.5;

  const result: TradingSnapshot = {
    congressional: {
      recent: allCongressional.slice(0, 50),
      topBuys: purchases.slice(0, 20),
      topSells: sales.slice(0, 20),
      topTraders,
      byParty,
      byChamber: { senate: senate.length, house: house.length },
    },
    insider: {
      recent: insiderTrades.slice(0, 30),
      clusterBuys,
      buyRatio,
      topSectors: [],
    },
    lastUpdated: new Date().toISOString(),
  };

  // Only cache if we got actual data - don't cache empty results from API failures
  if (congressional.length > 0 || insiderTrades.length > 0) {
    cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
  }
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
    congressional: snapshot.congressional.recent.filter((t) => t.ticker.toUpperCase() === upperTicker),
    insider: snapshot.insider.recent.filter((t) => t.ticker.toUpperCase() === upperTicker),
  };
}
