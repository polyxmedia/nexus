"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function TradeRow({ t }: { t: any }) {
  const isBuy = t.transactionType?.toLowerCase().includes("purchase");
  return (
    <div className="py-1.5 border-b border-navy-800/50 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 font-mono text-[9px] px-1 py-0.5 rounded"
            style={{
              color: isBuy ? "#10b981" : "#f43f5e",
              backgroundColor: isBuy ? "#10b98110" : "#f43f5e10",
            }}
          >
            {isBuy ? "BUY" : "SELL"}
          </span>
          <span className="font-mono text-[10px] text-accent-cyan font-semibold">{t.ticker}</span>
          <span className="font-mono text-[10px] text-navy-400 truncate">{t.name}</span>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[9px] text-navy-400">{t.amount}</div>
          {t.party && (
            <span
              className="font-mono text-[8px]"
              style={{ color: t.party === "Democrat" ? "#3b82f6" : t.party === "Republican" ? "#ef4444" : "#6b7280" }}
            >
              {t.party?.[0]} - {t.chamber}
            </span>
          )}
        </div>
      </div>
      {t.excessReturn != null && Math.abs(t.excessReturn) > 0 && (
        <div className="font-mono text-[9px] mt-0.5" style={{ color: t.excessReturn > 0 ? "#10b981" : "#f43f5e" }}>
          excess return: {t.excessReturn > 0 ? "+" : ""}{t.excessReturn.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export function CongressionalTradingWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const { congressional, insider, lastUpdated } = data;

  return (
    <div className="my-2 space-y-3">
      {/* Congressional */}
      {congressional && (
        <div className="border border-navy-700/40 rounded bg-navy-900/60 p-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-2">
            Congressional Trading
          </div>
          {congressional.byParty && (
            <div className="flex gap-3 mb-2">
              <span className="font-mono text-[9px] text-blue-400">D: {congressional.byParty.democrat}</span>
              <span className="font-mono text-[9px] text-red-400">R: {congressional.byParty.republican}</span>
              {congressional.byParty.independent > 0 && (
                <span className="font-mono text-[9px] text-navy-400">I: {congressional.byParty.independent}</span>
              )}
            </div>
          )}
          {(congressional.recent || []).slice(0, 8).map((t: any, i: number) => (
            <TradeRow key={i} t={t} />
          ))}
        </div>
      )}

      {/* Insider */}
      {insider && (
        <div className="border border-navy-700/40 rounded bg-navy-900/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500">
              Insider Trading
            </div>
            {insider.buyRatio != null && (
              <span className="font-mono text-[9px]" style={{ color: insider.buyRatio > 0.5 ? "#10b981" : "#f43f5e" }}>
                Buy ratio: {(insider.buyRatio * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {/* Cluster buys */}
          {(insider.clusterBuys || []).length > 0 && (
            <div className="mb-2">
              <div className="font-mono text-[9px] text-accent-emerald/60 mb-1">Cluster Buys</div>
              {insider.clusterBuys.slice(0, 3).map((c: any, i: number) => (
                <div key={i} className="font-mono text-[10px] text-navy-300 mb-0.5">
                  {c.ticker} - {c.insiders} insiders, ${(c.totalValue / 1e6).toFixed(1)}M
                </div>
              ))}
            </div>
          )}

          {(insider.recent || []).slice(0, 5).map((t: any, i: number) => (
            <div key={i} className="py-1 border-b border-navy-800/50 last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-accent-cyan">{t.ticker}</span>
                  <span className="font-mono text-[9px] text-navy-500">{t.insider}</span>
                </div>
                <span className="font-mono text-[9px] text-navy-400">
                  {t.totalValue ? `$${(t.totalValue / 1e6).toFixed(2)}M` : `${t.shares?.toLocaleString()} shares`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {lastUpdated && (
        <div className="font-mono text-[9px] text-navy-700 px-1">
          Source: Capitol Trades, SEC Form 4
        </div>
      )}
    </div>
  );
}
