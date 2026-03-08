// On-Chain Analytics Engine
// Aggregates data from free public APIs: Blockchain.com, CoinGecko, DeFi Llama, Etherscan

export interface WhaleTransaction {
  hash: string;
  timestamp: number;
  amount: number;
  currency: "BTC" | "ETH";
  usdValue: number;
  fromAddress: string;
  toAddress: string;
}

export interface ExchangeFlow {
  id: string;
  name: string;
  volume24h: number;
  volumeChange24h: number | null;
  marketShare: number;
  trustScore: number | null;
  country: string | null;
}

export interface StablecoinMetrics {
  symbol: string;
  name: string;
  marketCap: number;
  marketCapChange24h: number;
  volume24h: number;
  price: number;
}

export interface DeFiProtocol {
  name: string;
  tvl: number;
  tvlChange24h: number;
  category: string;
  chain: string;
  logo: string | null;
}

export interface DeFiTVL {
  totalTvl: number;
  totalChange24h: number;
  topProtocols: DeFiProtocol[];
}

export interface OnChainSnapshot {
  timestamp: number;
  whales: WhaleTransaction[] | null;
  exchanges: ExchangeFlow[] | null;
  defi: DeFiTVL | null;
  stablecoins: StablecoinMetrics[] | null;
}

// Cache: 5 minute TTL
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// --- Whale Alerts ---

interface BlockchainTx {
  hash: string;
  time: number;
  inputs: Array<{ prev_out?: { addr?: string; value: number } }>;
  out: Array<{ addr?: string; value: number }>;
}

interface BlockchainUnconfirmed {
  txs: BlockchainTx[];
}

export async function getWhaleAlerts(): Promise<WhaleTransaction[] | null> {
  const cached = getCached<WhaleTransaction[]>("whales");
  if (cached) return cached;

  // Fetch BTC unconfirmed transactions and filter large ones
  const data = await fetchJson<BlockchainUnconfirmed>(
    "https://blockchain.info/unconfirmed-transactions?format=json"
  );

  if (!data?.txs) return null;

  // Get BTC price from CoinGecko for USD conversion
  const priceData = await fetchJson<{ bitcoin: { usd: number } }>(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
  );
  const btcPrice = priceData?.bitcoin?.usd ?? 60000;

  const BTC_SATOSHI = 100_000_000;
  const MIN_BTC = 100;

  const whales: WhaleTransaction[] = data.txs
    .reduce<WhaleTransaction[]>((acc, tx) => {
      const totalOutput = tx.out.reduce((sum, o) => sum + o.value, 0);
      const btcAmount = totalOutput / BTC_SATOSHI;
      if (btcAmount < MIN_BTC) return acc;

      const fromAddr = tx.inputs?.[0]?.prev_out?.addr ?? "Unknown";
      const toAddr = tx.out?.[0]?.addr ?? "Unknown";

      acc.push({
        hash: tx.hash,
        timestamp: tx.time * 1000,
        amount: btcAmount,
        currency: "BTC" as const,
        usdValue: btcAmount * btcPrice,
        fromAddress: fromAddr,
        toAddress: toAddr,
      });
      return acc;
    }, [])
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 50);

  setCache("whales", whales);
  return whales;
}

// --- Exchange Flows ---

interface CoinGeckoExchange {
  id: string;
  name: string;
  trade_volume_24h_btc: number;
  trade_volume_24h_btc_normalized: number;
  trust_score: number | null;
  country: string | null;
}

export async function getExchangeFlows(): Promise<ExchangeFlow[] | null> {
  const cached = getCached<ExchangeFlow[]>("exchanges");
  if (cached) return cached;

  const data = await fetchJson<CoinGeckoExchange[]>(
    "https://api.coingecko.com/api/v3/exchanges?per_page=20&page=1"
  );

  if (!data || !Array.isArray(data)) return null;

  // Get BTC price for USD conversion
  const priceData = await fetchJson<{ bitcoin: { usd: number } }>(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
  );
  const btcPrice = priceData?.bitcoin?.usd ?? 60000;

  const totalVolume = data.reduce((sum, ex) => sum + ex.trade_volume_24h_btc, 0);

  const exchanges: ExchangeFlow[] = data.map((ex) => ({
    id: ex.id,
    name: ex.name,
    volume24h: ex.trade_volume_24h_btc * btcPrice,
    volumeChange24h: null,
    marketShare: totalVolume > 0 ? (ex.trade_volume_24h_btc / totalVolume) * 100 : 0,
    trustScore: ex.trust_score,
    country: ex.country,
  }));

  setCache("exchanges", exchanges);
  return exchanges;
}

// --- DeFi TVL ---

interface LlamaProtocol {
  name: string;
  tvl: number;
  change_1d: number | null;
  category: string;
  chain: string;
  logo: string | null;
  chains: string[];
}

interface LlamaHistoricalTvl {
  date: number;
  tvl: number;
}

export async function getDeFiTVL(): Promise<DeFiTVL | null> {
  const cached = getCached<DeFiTVL>("defi");
  if (cached) return cached;

  const [protocols, historicalTvl] = await Promise.all([
    fetchJson<LlamaProtocol[]>("https://api.llama.fi/protocols"),
    fetchJson<LlamaHistoricalTvl[]>("https://api.llama.fi/v2/historicalChainTvl"),
  ]);

  if (!protocols) return null;

  // Sort by TVL descending, take top 10
  const sorted = [...protocols]
    .filter((p) => p.tvl > 0)
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 10);

  const totalTvl = protocols.reduce((sum, p) => sum + (p.tvl || 0), 0);

  // Calculate 24h change from historical data
  let totalChange24h = 0;
  if (historicalTvl && historicalTvl.length >= 2) {
    const latest = historicalTvl[historicalTvl.length - 1];
    const previous = historicalTvl[historicalTvl.length - 2];
    if (latest && previous && previous.tvl > 0) {
      totalChange24h = ((latest.tvl - previous.tvl) / previous.tvl) * 100;
    }
  }

  const result: DeFiTVL = {
    totalTvl,
    totalChange24h,
    topProtocols: sorted.map((p) => ({
      name: p.name,
      tvl: p.tvl,
      tvlChange24h: p.change_1d ?? 0,
      category: p.category || "Unknown",
      chain: p.chains?.[0] || p.chain || "Multi-chain",
      logo: p.logo,
    })),
  };

  setCache("defi", result);
  return result;
}

// --- Stablecoin Flows ---

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  market_cap: number;
  market_cap_change_percentage_24h: number;
  total_volume: number;
  current_price: number;
}

export async function getStablecoinFlows(): Promise<StablecoinMetrics[] | null> {
  const cached = getCached<StablecoinMetrics[]>("stablecoins");
  if (cached) return cached;

  const data = await fetchJson<CoinGeckoCoin[]>(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=tether,usd-coin,dai,first-digital-usd,ethena-usde&order=market_cap_desc"
  );

  if (!data || !Array.isArray(data)) return null;

  const stablecoins: StablecoinMetrics[] = data.map((coin) => ({
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    marketCap: coin.market_cap,
    marketCapChange24h: coin.market_cap_change_percentage_24h || 0,
    volume24h: coin.total_volume,
    price: coin.current_price,
  }));

  setCache("stablecoins", stablecoins);
  return stablecoins;
}

// --- Full Snapshot ---

export async function getOnChainSnapshot(): Promise<OnChainSnapshot> {
  const [whales, exchanges, defi, stablecoins] = await Promise.all([
    getWhaleAlerts().catch(() => null),
    getExchangeFlows().catch(() => null),
    getDeFiTVL().catch(() => null),
    getStablecoinFlows().catch(() => null),
  ]);

  return {
    timestamp: Date.now(),
    whales,
    exchanges,
    defi,
    stablecoins,
  };
}
