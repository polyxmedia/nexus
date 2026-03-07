"use client";

import { useCallback, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeSizingSuggestions,
  type SizingTier,
} from "@/lib/trading/sizing";

export interface TradeRecommendation {
  ticker: string;
  direction: string;
  rationale: string;
  entry_window?: string;
  risk_level: string;
  conviction_score?: number;
  target_price?: number;
  stop_loss?: number;
}

interface Instrument {
  ticker: string;
  shortName: string;
  name: string;
  type: string;
  currencyCode: string;
}

interface TradeRecommendationCardProps {
  rec: TradeRecommendation;
  signalId: string;
}

const RISK_COLORS: Record<string, string> = {
  low: "border-accent-emerald/25 bg-accent-emerald/10 text-accent-emerald",
  medium: "border-accent-amber/25 bg-accent-amber/10 text-accent-amber",
  high: "border-accent-rose/25 bg-accent-rose/10 text-accent-rose",
};

export function TradeRecommendationCard({ rec, signalId }: TradeRecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [freeCash, setFreeCash] = useState<number>(0);
  const [resolvedTicker, setResolvedTicker] = useState("");
  const [sizingTiers, setSizingTiers] = useState<SizingTier[]>([]);

  const [quantity, setQuantity] = useState("");
  const [orderType, setOrderType] = useState("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<string | null>(null);

  const isBuy = rec.direction === "BUY";
  const DirIcon = isBuy ? TrendingUp : TrendingDown;
  const conviction = rec.conviction_score ?? 0;

  const handleExpand = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);

    if (dataLoaded) return;

    setLoadingData(true);
    Promise.all([
      fetch("/api/trading212/account").then((r) => r.json()).catch(() => null),
      fetch(`/api/market-data?type=snapshot&symbol=${encodeURIComponent(rec.ticker)}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/trading212/instruments").then((r) => r.json()).catch(() => []),
    ]).then(([accountData, snapshotData, instrumentData]) => {
      const cash = accountData?.cash?.free ?? 0;
      setFreeCash(cash);

      const price = snapshotData?.snapshot?.price ?? null;
      setCurrentPrice(price);

      const instList = Array.isArray(instrumentData) ? instrumentData : [];
      const symbol = rec.ticker.toUpperCase();
      const match = instList.find(
        (i: Instrument) =>
          i.shortName?.toUpperCase() === symbol ||
          i.ticker.toUpperCase() === symbol ||
          i.ticker.toUpperCase().startsWith(symbol + "_")
      );
      setResolvedTicker(match?.ticker || symbol);

      if (price && cash > 0) {
        setSizingTiers(computeSizingSuggestions(cash, price));
      }

      setDataLoaded(true);
      setLoadingData(false);
    });
  };

  const placeOrder = useCallback(async () => {
    if (!quantity || !resolvedTicker) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const body: Record<string, unknown> = {
        ticker: resolvedTicker,
        quantity: parseFloat(quantity),
        direction: rec.direction,
        orderType,
        signalId,
      };
      if (limitPrice) body.limitPrice = parseFloat(limitPrice);
      if (stopPrice) body.stopPrice = parseFloat(stopPrice);

      const res = await fetch("/api/trading212/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setOrderResult(`Error: ${data.error}`);
      } else {
        setOrderResult(`Order placed: ${rec.direction} ${quantity} ${rec.ticker}`);
      }
    } catch {
      setOrderResult("Failed to place order");
    } finally {
      setPlacing(false);
    }
  }, [quantity, resolvedTicker, rec.direction, rec.ticker, orderType, limitPrice, stopPrice, signalId]);

  return (
    <div className="border border-navy-700/50 rounded-lg overflow-hidden">
      {/* Collapsed header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Direction badge */}
        <div
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
            isBuy
              ? "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/25"
              : "bg-accent-rose/15 text-accent-rose border-accent-rose/25"
          }`}
        >
          <DirIcon className="h-3 w-3" />
          {rec.direction}
        </div>

        {/* Ticker */}
        <span className="text-sm font-bold text-navy-100 font-mono">{rec.ticker}</span>

        {/* Risk badge */}
        <span
          className={`text-[10px] uppercase tracking-wider font-medium rounded px-1.5 py-0.5 border ${
            RISK_COLORS[rec.risk_level] || "border-navy-600 bg-navy-800 text-navy-400"
          }`}
        >
          {rec.risk_level}
        </span>

        {/* Conviction bar */}
        {conviction > 0 && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[10px] text-navy-500">{(conviction * 100).toFixed(0)}%</span>
            <div className="h-1 w-12 rounded-full bg-navy-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${isBuy ? "bg-accent-emerald" : "bg-accent-rose"}`}
                style={{ width: `${conviction * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Target / Stop */}
        {rec.target_price != null && (
          <span className="text-[10px] text-navy-500 font-mono ml-auto mr-0">
            TP {rec.target_price} / SL {rec.stop_loss ?? "---"}
          </span>
        )}

        {/* Create Order button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleExpand}
          className="ml-auto flex items-center gap-1 text-[10px]"
        >
          {expanded ? "Close" : "Create Order"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Rationale (always visible, truncated when collapsed) */}
      <div className="px-4 pb-3">
        <p className={`text-xs text-navy-300 leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
          {rec.rationale}
        </p>
        {rec.entry_window && (
          <p className="text-[10px] text-navy-500 mt-1">
            Entry: {rec.entry_window}
          </p>
        )}
      </div>

      {/* Expanded order form */}
      {expanded && (
        <div className="border-t border-navy-700/30 px-4 py-4 bg-navy-900/50">
          {loadingData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-14 w-full rounded" />
                <Skeleton className="h-14 w-full rounded" />
                <Skeleton className="h-14 w-full rounded" />
              </div>
              <Skeleton className="h-10 w-full rounded" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Price + Cash row */}
              <div className="flex items-center gap-4">
                {currentPrice != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider">Price</span>
                    <span className="text-sm font-bold font-mono text-navy-100">
                      ${currentPrice.toFixed(2)}
                    </span>
                  </div>
                )}
                {freeCash > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider">Free Cash</span>
                    <span className="text-sm font-mono text-navy-200">
                      ${freeCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {resolvedTicker && resolvedTicker !== rec.ticker.toUpperCase() && (
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] text-navy-500">T212:</span>
                    <span className="text-[10px] font-mono text-navy-300">{resolvedTicker}</span>
                  </div>
                )}
              </div>

              {/* Position sizing tiers */}
              {sizingTiers.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {sizingTiers.map((tier) => (
                    <button
                      key={tier.label}
                      onClick={() => setQuantity(tier.quantity.toString())}
                      className={`rounded-md border p-2.5 text-left transition-colors ${
                        quantity === tier.quantity.toString()
                          ? "border-accent-cyan/40 bg-accent-cyan/5"
                          : "border-navy-700/30 bg-navy-800/40 hover:border-navy-600/40"
                      }`}
                    >
                      <div className="text-[10px] text-navy-500 uppercase tracking-wider mb-0.5">
                        {tier.label}
                      </div>
                      <div className="text-xs font-bold text-navy-100 font-mono">
                        {tier.quantity} shares
                      </div>
                      <div className="text-[10px] text-navy-400">
                        ${tier.positionValue.toLocaleString()} ({tier.percentOfCash}%)
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Order type tabs */}
              <div className="flex h-7 rounded-md border border-navy-700/30 overflow-hidden w-fit">
                {["MARKET", "LIMIT", "STOP", "STOP_LIMIT"].map((type, i) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`px-3 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      i > 0 ? "border-l border-navy-700/30" : ""
                    } ${
                      orderType === type
                        ? "bg-accent-cyan/10 text-accent-cyan"
                        : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                    }`}
                  >
                    {type.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Quantity + conditional prices */}
              <div className="flex gap-3">
                <div className="w-36">
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1 block">
                    Quantity
                  </label>
                  <Input
                    placeholder="0.00"
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                {(orderType === "LIMIT" || orderType === "STOP_LIMIT") && (
                  <div className="w-36">
                    <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1 block">
                      Limit Price
                    </label>
                    <Input
                      placeholder="0.00"
                      type="number"
                      step="any"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                    />
                  </div>
                )}
                {(orderType === "STOP" || orderType === "STOP_LIMIT") && (
                  <div className="w-36">
                    <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1 block">
                      Stop Price
                    </label>
                    <Input
                      placeholder="0.00"
                      type="number"
                      step="any"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Execute + result */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={placeOrder}
                  disabled={placing || !quantity || !resolvedTicker}
                  variant="primary"
                  size="sm"
                >
                  {placing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : isBuy ? (
                    <ArrowUpRight className="h-3.5 w-3.5 mr-2" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 mr-2" />
                  )}
                  Execute {rec.direction} {rec.ticker} {quantity ? `x ${quantity}` : ""}
                </Button>

                {orderResult && (
                  <div
                    className={`rounded-md border px-3 py-1.5 text-xs ${
                      orderResult.startsWith("Error")
                        ? "border-accent-rose/30 bg-accent-rose/5 text-accent-rose"
                        : "border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald"
                    }`}
                  >
                    {orderResult}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
