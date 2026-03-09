"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Market {
  id: string;
  source: "polymarket" | "kalshi";
  title: string;
  probability: number;
  url: string;
  // Polymarket-specific: clobTokenIds as JSON string "[yesId, noId]"
  clobTokenIds?: string;
}

interface BetModalProps {
  market: Market;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BetModal({ market, open, onClose, onSuccess }: BetModalProps) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [contracts, setContracts] = useState(1);
  const [price, setPrice] = useState(Math.round(market.probability * 100) || 50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const isKalshi = market.source === "kalshi";
  const isPoly = market.source === "polymarket";

  // Kalshi uses cents (1-99), Polymarket uses decimals (0.01-0.99)
  const costCents = contracts * price;
  const payoutCents = contracts * 100;
  const profitCents = payoutCents - costCents;

  function getPolyTokenId(): string | null {
    if (!market.clobTokenIds) return null;
    try {
      const ids = JSON.parse(market.clobTokenIds);
      return side === "yes" ? ids[0] : ids[1];
    } catch {
      return null;
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let body: Record<string, unknown>;

      if (isKalshi) {
        const kalshiTicker = market.id.replace("kalshi_", "");
        body = {
          platform: "kalshi",
          ticker: kalshiTicker,
          action: "buy",
          side,
          count: contracts,
          price,
        };
      } else {
        // Polymarket
        const tokenId = getPolyTokenId();
        if (!tokenId) {
          setError("Missing token ID for this market. Try refreshing the page.");
          setLoading(false);
          return;
        }
        body = {
          platform: "polymarket",
          tokenId,
          side: "buy",
          price: price / 100, // convert cents to decimal for Polymarket
          size: contracts,
        };
      }

      const res = await fetch("/api/prediction-markets/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order failed");
        return;
      }

      setResult(`Order placed: ${contracts} ${side.toUpperCase()} @ ${price}c`);
      onSuccess?.();
    } catch {
      setError("Network error, try again");
    } finally {
      setLoading(false);
    }
  }

  // Check if Polymarket market has the token IDs needed for trading
  const polyTradeable = isPoly && !!market.clobTokenIds;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
          <div className="bg-navy-950 border border-navy-800/60 rounded-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-navy-800/40">
              <div className="min-w-0 flex-1 pr-4">
                <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-1">
                  {isKalshi ? "Kalshi" : "Polymarket"} / Place Bet
                </span>
                <p className="text-sm text-navy-200 leading-snug">{market.title}</p>
              </div>
              <Dialog.Close asChild>
                <button className="text-navy-600 hover:text-navy-400 transition-colors mt-0.5">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="p-5 space-y-5">
              {isPoly && !polyTradeable ? (
                // Polymarket without token IDs: link out
                <div className="text-center space-y-3">
                  <p className="text-sm text-navy-400">
                    Token data unavailable for in-app trading. Place your bet directly on Polymarket.
                  </p>
                  <a
                    href={market.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-5 py-2.5 bg-navy-200 text-navy-950 text-xs font-mono uppercase tracking-wider rounded hover:bg-navy-300 transition-colors"
                  >
                    Open on Polymarket
                  </a>
                </div>
              ) : (
                <>
                  {/* Current market probability */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-navy-500">
                    <span>Market Probability</span>
                    <span className="text-navy-300 text-sm">{(market.probability * 100).toFixed(0)}%</span>
                  </div>

                  {/* Side selector */}
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-2">
                      Position
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSide("yes")}
                        className={`py-2.5 rounded text-xs font-mono uppercase tracking-wider transition-all ${
                          side === "yes"
                            ? "bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30"
                            : "bg-navy-900/50 text-navy-500 border border-navy-800/40 hover:border-navy-700/40"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setSide("no")}
                        className={`py-2.5 rounded text-xs font-mono uppercase tracking-wider transition-all ${
                          side === "no"
                            ? "bg-accent-rose/15 text-accent-rose border border-accent-rose/30"
                            : "bg-navy-900/50 text-navy-500 border border-navy-800/40 hover:border-navy-700/40"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Price (cents) */}
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-2">
                      Price (cents per contract, 1-99)
                    </span>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={price}
                        onChange={(e) => setPrice(parseInt(e.target.value))}
                        className="flex-1 accent-navy-400"
                      />
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={price}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (v >= 1 && v <= 99) setPrice(v);
                        }}
                        className="w-16 bg-navy-900/50 border border-navy-800/40 rounded px-2 py-1.5 text-sm font-mono text-navy-200 text-center"
                      />
                      <span className="text-[10px] font-mono text-navy-600">c</span>
                    </div>
                  </div>

                  {/* Contracts / Shares */}
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600 block mb-2">
                      {isKalshi ? "Contracts" : "Shares"}
                    </span>
                    <div className="flex items-center gap-2">
                      {[1, 5, 10, 25, 50, 100].map((n) => (
                        <button
                          key={n}
                          onClick={() => setContracts(n)}
                          className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                            contracts === n
                              ? "bg-navy-700/50 text-navy-200 border border-navy-600/40"
                              : "bg-navy-900/50 text-navy-500 border border-navy-800/30 hover:border-navy-700/30"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={isKalshi ? 1000 : 10000}
                        value={contracts}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          const max = isKalshi ? 1000 : 10000;
                          if (v >= 1 && v <= max) setContracts(v);
                        }}
                        className="w-16 bg-navy-900/50 border border-navy-800/40 rounded px-2 py-1.5 text-sm font-mono text-navy-200 text-center ml-auto"
                      />
                    </div>
                  </div>

                  {/* Order summary */}
                  <div className="bg-navy-900/40 border border-navy-800/30 rounded p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-navy-500">Cost</span>
                      <span className="text-navy-300">${(costCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-navy-500">Payout if correct</span>
                      <span className="text-navy-300">${(payoutCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono border-t border-navy-800/30 pt-1.5">
                      <span className="text-navy-500">Potential profit</span>
                      <span className="text-accent-emerald">${(profitCents / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {isPoly && (
                    <p className="text-[10px] font-mono text-navy-600">
                      Requires USDC on Polygon in your connected wallet.
                    </p>
                  )}

                  {/* Error / Result */}
                  {error && (
                    <p className="text-[11px] text-accent-rose font-mono">{error}</p>
                  )}
                  {result && (
                    <p className="text-[11px] text-accent-emerald font-mono">{result}</p>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-2.5 rounded text-xs font-mono uppercase tracking-wider transition-colors bg-navy-200 text-navy-950 hover:bg-navy-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? "Placing order..." : `Buy ${contracts} ${side.toUpperCase()} @ ${price}c`}
                  </button>
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
