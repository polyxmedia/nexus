"use client";

interface WhaleTransaction {
  hash: string;
  timestamp: number;
  amount: number;
  currency: "BTC" | "ETH";
  usdValue: number;
  fromAddress: string;
  toAddress: string;
}

interface ExchangeFlow {
  id: string;
  name: string;
  volume24h: number;
  volumeChange24h: number | null;
  marketShare: number;
  trustScore: number | null;
  country: string | null;
}

interface StablecoinMetrics {
  symbol: string;
  name: string;
  marketCap: number;
  marketCapChange24h: number;
  volume24h: number;
  price: number;
}

interface DeFiProtocol {
  name: string;
  tvl: number;
  tvlChange24h: number;
  category: string;
  chain: string;
}

interface DeFiTVL {
  totalTvl: number;
  totalChange24h: number;
  topProtocols: DeFiProtocol[];
}

interface OnChainData {
  timestamp?: number;
  whales?: WhaleTransaction[] | null;
  exchanges?: ExchangeFlow[] | null;
  defi?: DeFiTVL | null;
  stablecoins?: StablecoinMetrics[] | null;
  error?: string;
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${fmt(n)}`;
}

function changeColor(val: number | null | undefined): string {
  if (val == null) return "#6b7280";
  if (val > 0) return "#10b981";
  if (val < 0) return "#f43f5e";
  return "#6b7280";
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
      {label}
    </div>
  );
}

function WhalesSection({ whales }: { whales: WhaleTransaction[] }) {
  const sorted = [...whales].sort((a, b) => b.usdValue - a.usdValue).slice(0, 8);
  return (
    <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
      <SectionHeader label={`Whale Transactions (${whales.length})`} />
      <div className="space-y-1.5">
        {sorted.map((tx, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="font-mono text-[9px] px-1 rounded"
                style={{
                  color: tx.currency === "BTC" ? "#f59e0b" : "#818cf8",
                  backgroundColor: tx.currency === "BTC" ? "#f59e0b10" : "#818cf810",
                }}
              >
                {tx.currency}
              </span>
              <span className="font-mono text-[10px] text-navy-300 font-medium">
                {fmt(tx.amount, tx.currency === "BTC" ? 2 : 1)} {tx.currency}
              </span>
              <span className="font-mono text-[9px] text-navy-600 truncate">
                {tx.fromAddress ? `${tx.fromAddress.slice(0, 8)}...` : "unknown"}
                <span className="mx-1 text-navy-700">→</span>
                {tx.toAddress ? `${tx.toAddress.slice(0, 8)}...` : "unknown"}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-[10px] text-navy-300">{fmtUsd(tx.usdValue)}</span>
              <span className="font-mono text-[9px] text-navy-600">
                {new Date(tx.timestamp * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExchangesSection({ exchanges }: { exchanges: ExchangeFlow[] }) {
  const sorted = [...exchanges].sort((a, b) => b.volume24h - a.volume24h).slice(0, 6);
  return (
    <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
      <SectionHeader label="Exchange Flows (24h Volume)" />
      <div className="space-y-1.5">
        {sorted.map((ex) => (
          <div key={ex.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-navy-200 font-medium w-24 truncate">{ex.name}</span>
              {ex.country && (
                <span className="font-mono text-[9px] text-navy-600">{ex.country}</span>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="font-mono text-[10px] text-navy-300">{fmtUsd(ex.volume24h)}</div>
                {ex.volumeChange24h != null && (
                  <div
                    className="font-mono text-[9px]"
                    style={{ color: changeColor(ex.volumeChange24h) }}
                  >
                    {ex.volumeChange24h >= 0 ? "+" : ""}{fmt(ex.volumeChange24h)}%
                  </div>
                )}
              </div>
              <div className="text-right w-14">
                <div className="font-mono text-[9px] text-navy-600">share</div>
                <div className="font-mono text-[10px] text-navy-400">{fmt(ex.marketShare)}%</div>
              </div>
              {ex.trustScore != null && (
                <div className="text-right w-10">
                  <div className="font-mono text-[9px] text-navy-600">trust</div>
                  <div
                    className="font-mono text-[10px]"
                    style={{ color: ex.trustScore >= 8 ? "#10b981" : ex.trustScore >= 5 ? "#f59e0b" : "#f43f5e" }}
                  >
                    {ex.trustScore}/10
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeFiSection({ defi }: { defi: DeFiTVL }) {
  return (
    <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
      <SectionHeader label="DeFi TVL" />
      {/* Totals row */}
      <div className="flex items-center gap-6 mb-3 pb-2 border-b border-navy-800">
        <div>
          <div className="font-mono text-[9px] text-navy-600 mb-0.5">Total TVL</div>
          <div className="font-mono text-base font-bold text-navy-100">{fmtUsd(defi.totalTvl)}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] text-navy-600 mb-0.5">24h Change</div>
          <div
            className="font-mono text-sm font-semibold"
            style={{ color: changeColor(defi.totalChange24h) }}
          >
            {defi.totalChange24h >= 0 ? "+" : ""}{fmt(defi.totalChange24h)}%
          </div>
        </div>
      </div>
      {/* Top protocols */}
      <div className="space-y-1.5">
        {defi.topProtocols.slice(0, 6).map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[10px] text-navy-200 font-medium truncate w-28">{p.name}</span>
              <span className="font-mono text-[9px] text-navy-600">{p.category}</span>
              <span className="font-mono text-[9px] text-navy-700">{p.chain}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-[10px] text-navy-300">{fmtUsd(p.tvl)}</span>
              <span
                className="font-mono text-[9px] w-14 text-right"
                style={{ color: changeColor(p.tvlChange24h) }}
              >
                {p.tvlChange24h >= 0 ? "+" : ""}{fmt(p.tvlChange24h)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StablecoinsSection({ stablecoins }: { stablecoins: StablecoinMetrics[] }) {
  const sorted = [...stablecoins].sort((a, b) => b.marketCap - a.marketCap).slice(0, 6);
  const totalMcap = sorted.reduce((s, c) => s + c.marketCap, 0);
  return (
    <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
      <SectionHeader label={`Stablecoin Supply — ${fmtUsd(totalMcap)} total`} />
      <div className="space-y-1.5">
        {sorted.map((s) => (
          <div key={s.symbol} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-navy-200 font-medium w-12">{s.symbol}</span>
              <span className="font-mono text-[9px] text-navy-600">{s.name}</span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="font-mono text-[10px] text-navy-300">{fmtUsd(s.marketCap)}</div>
                <div
                  className="font-mono text-[9px]"
                  style={{ color: changeColor(s.marketCapChange24h) }}
                >
                  {s.marketCapChange24h >= 0 ? "+" : ""}{fmt(s.marketCapChange24h)}%
                </div>
              </div>
              <div className="text-right w-20">
                <div className="font-mono text-[9px] text-navy-600">vol 24h</div>
                <div className="font-mono text-[10px] text-navy-400">{fmtUsd(s.volume24h)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OnChainWidget({ data }: { data: OnChainData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const hasAny = data.whales || data.exchanges || data.defi || data.stablecoins;
  if (!hasAny) {
    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/60 px-3 py-2 text-xs text-navy-500 font-mono">
        No on-chain data available
      </div>
    );
  }

  return (
    <div className="my-2 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-navy-500">On-Chain Analytics</span>
        {data.timestamp && (
          <span className="font-mono text-[9px] text-navy-700">
            {new Date(data.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {data.whales && data.whales.length > 0 && (
        <WhalesSection whales={data.whales} />
      )}
      {data.exchanges && data.exchanges.length > 0 && (
        <ExchangesSection exchanges={data.exchanges} />
      )}
      {data.defi && (
        <DeFiSection defi={data.defi} />
      )}
      {data.stablecoins && data.stablecoins.length > 0 && (
        <StablecoinsSection stablecoins={data.stablecoins} />
      )}
    </div>
  );
}
