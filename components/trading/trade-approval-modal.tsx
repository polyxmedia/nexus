"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Globe,
  Star,
  Activity,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { TechnicalSnapshot } from "@/lib/thesis/types";

interface SizingTier {
  label: string;
  percentOfCash: number;
  positionValue: number;
  quantity: number;
}

interface RiskEstimates {
  upsideTarget: number;
  upsidePercent: number;
  downsideRisk: number;
  downsidePercent: number;
  riskRewardRatio: number;
}

function computeSizingTiers(freeCash: number, currentPrice: number, minQty = 0.001): SizingTier[] {
  if (freeCash <= 0 || currentPrice <= 0) return [];
  const tiers = [
    { label: "Conservative", pct: 0.01 },
    { label: "Moderate", pct: 0.025 },
    { label: "Aggressive", pct: 0.05 },
  ];
  return tiers.map(({ label, pct }) => {
    const positionValue = freeCash * pct;
    const rawQty = positionValue / currentPrice;
    const quantity = Math.max(Math.floor(rawQty * 1000) / 1000, minQty);
    return {
      label,
      percentOfCash: Math.round(pct * 10000) / 100,
      positionValue: Math.round(positionValue * 100) / 100,
      quantity,
    };
  });
}

function computeRiskEstimates(
  direction: "BUY" | "SELL",
  snapshot: TechnicalSnapshot
): RiskEstimates | null {
  const { price, bollingerBands, atr14 } = snapshot;
  if (!bollingerBands || !atr14 || price <= 0) return null;
  const upsideTarget = direction === "BUY" ? bollingerBands.upper : bollingerBands.lower;
  const downsideRisk = direction === "BUY" ? price - 2 * atr14 : price + 2 * atr14;
  const upsidePercent = ((upsideTarget - price) / price) * 100;
  const downsidePercent = ((downsideRisk - price) / price) * 100;
  const absUpside = Math.abs(upsideTarget - price);
  const absDownside = Math.abs(price - downsideRisk);
  const riskRewardRatio = absDownside > 0 ? absUpside / absDownside : 0;
  return {
    upsideTarget: Math.round(upsideTarget * 100) / 100,
    upsidePercent: Math.round(upsidePercent * 100) / 100,
    downsideRisk: Math.round(downsideRisk * 100) / 100,
    downsidePercent: Math.round(downsidePercent * 100) / 100,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
  };
}

interface TradingAction {
  ticker: string;
  direction: "BUY" | "SELL" | "HOLD";
  rationale: string;
  entryCondition: string;
  riskLevel: string;
  confidence: number;
  sources: string[];
}

interface Instrument {
  ticker: string;
  shortName: string;
  name: string;
  type: string;
  currencyCode: string;
}

interface ThesisContext {
  id: number;
  uuid: string;
  title: string;
  marketRegime: string;
  volatilityOutlook: string;
  convergenceDensity: number;
  overallConfidence: number;
  layerInputs: {
    celestial: { activeEvents: string[]; convergenceIntensity: number };
    hebrew: { activeHolidays: string[]; shmitaRelevance: string | null };
    geopolitical: { activeEvents: string[]; escalationRisk: number };
    market: { regime: string; volatilityOutlook: string };
    gameTheory: {
      activeScenarios: string[];
      analyses: Array<{
        scenarioId: string;
        marketAssessment: {
          mostLikelyOutcome: string;
          direction: string;
          confidence: number;
          keySectors: string[];
        };
      }>;
    };
  };
}

interface TradeApprovalModalProps {
  action: TradingAction | null;
  thesisContext?: ThesisContext | null;
  onClose: () => void;
  onExecuted: (ticker: string, direction: string) => void;
}

const RISK_COLORS: Record<string, string> = {
  low: "text-accent-emerald",
  medium: "text-accent-amber",
  high: "text-accent-rose",
};

export function TradeApprovalModal({ action, thesisContext, onClose, onExecuted }: TradeApprovalModalProps) {
  const [snapshot, setSnapshot] = useState<TechnicalSnapshot | null>(null);
  const [freeCash, setFreeCash] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);

  const [resolvedTicker, setResolvedTicker] = useState<string>("");

  const [quantity, setQuantity] = useState("");
  const [orderType, setOrderType] = useState("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<string | null>(null);

  const [sizingTiers, setSizingTiers] = useState<SizingTier[]>([]);
  const [riskEstimates, setRiskEstimates] = useState<RiskEstimates | null>(null);

  const [showThesisDetail, setShowThesisDetail] = useState(false);

  // Fetch account cash, market snapshot, and instruments when modal opens
  useEffect(() => {
    if (!action) return;

    setLoadingData(true);
    setSnapshot(null);
    setFreeCash(0);
    setSizingTiers([]);
    setRiskEstimates(null);
    setQuantity("");
    setOrderType("MARKET");
    setLimitPrice("");
    setStopPrice("");
    setOrderResult(null);
    setResolvedTicker("");
    setShowThesisDetail(false);

    Promise.all([
      fetch("/api/trading212/account").then((r) => r.json()).catch(() => null),
      fetch(`/api/market-data?type=snapshot&symbol=${encodeURIComponent(action.ticker)}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/trading212/instruments").then((r) => r.json()).catch(() => []),
    ]).then(async ([accountData, snapshotData, instrumentData]) => {
      const cash = accountData?.cash?.free ?? 0;
      setFreeCash(cash);

      const snap: TechnicalSnapshot | null = snapshotData?.snapshot ?? null;
      setSnapshot(snap);

      const instList = Array.isArray(instrumentData) ? instrumentData : [];

      // Resolve ticker to T212 format
      const symbol = action.ticker.toUpperCase();
      const match = instList.find(
        (i: Instrument) =>
          i.shortName?.toUpperCase() === symbol ||
          i.ticker.toUpperCase() === symbol ||
          i.ticker.toUpperCase().startsWith(symbol + "_")
      );
      setResolvedTicker(match?.ticker || symbol);

      // Compute sizing & risk
      if (snap && cash > 0) {
        setSizingTiers(computeSizingTiers(cash, snap.price));
      }
      if (snap && action.direction !== "HOLD") {
        setRiskEstimates(computeRiskEstimates(action.direction, snap));
      }

      setLoadingData(false);
    });
  }, [action]);

  const placeOrder = useCallback(async () => {
    if (!action || !quantity || !resolvedTicker) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const body: Record<string, unknown> = {
        ticker: resolvedTicker,
        quantity: parseFloat(quantity),
        direction: action.direction,
        orderType,
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
        setOrderResult(`Order placed: ${action.direction} ${quantity} ${action.ticker}`);
        onExecuted(action.ticker, action.direction);
      }
    } catch {
      setOrderResult("Failed to place order");
    } finally {
      setPlacing(false);
    }
  }, [action, quantity, resolvedTicker, orderType, limitPrice, stopPrice, onExecuted]);

  if (!action) return null;

  const isBuy = action.direction === "BUY";
  const dirColor = isBuy ? "accent-emerald" : "accent-rose";
  const DirIcon = isBuy ? TrendingUp : TrendingDown;

  const layers = thesisContext?.layerInputs;
  const hasThesisDetail =
    layers &&
    (layers.celestial.activeEvents.length > 0 ||
      layers.hebrew.activeHolidays.length > 0 ||
      layers.geopolitical.activeEvents.length > 0 ||
      layers.gameTheory.analyses.length > 0);

  return (
    <Dialog.Root open={!!action} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-lg border border-navy-700/60 bg-navy-900/95 backdrop-blur-md p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold border uppercase tracking-wider ${isBuy ? "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/25" : "bg-accent-rose/15 text-accent-rose border-accent-rose/25"}`}>
                <DirIcon className="h-3.5 w-3.5" />
                {action.direction}
              </div>
              <span className="text-lg font-bold text-navy-100 font-mono">{action.ticker}</span>
              <span className={`text-[10px] uppercase tracking-wider font-medium ${RISK_COLORS[action.riskLevel] || "text-navy-400"}`}>
                {action.riskLevel} risk
              </span>
            </div>
            <Dialog.Close asChild>
              <button className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Confidence bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-navy-500">Confidence</span>
              <span className="text-xs font-mono text-navy-200">{(action.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-navy-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${isBuy ? "bg-accent-emerald" : "bg-accent-rose"}`}
                style={{ width: `${action.confidence * 100}%` }}
              />
            </div>
          </div>

          <Dialog.Title className="sr-only">
            Trade Approval: {action.direction} {action.ticker}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Review and approve trade suggestion
          </Dialog.Description>

          {/* Rationale & Entry Condition */}
          <div className="space-y-3 mb-5">
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-1.5">Rationale</h4>
              <p className="text-xs text-navy-200 leading-relaxed">{action.rationale}</p>
            </section>
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-1.5">Entry Condition</h4>
              <p className="text-xs text-navy-300 leading-relaxed">{action.entryCondition}</p>
            </section>
            {action.sources && action.sources.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-navy-500">Sources:</span>
                {action.sources.map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-navy-800 text-navy-300 border border-navy-700/30">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Technical Analysis */}
          <section className="mb-5">
            <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20 flex items-center gap-1.5">
              <Activity className="h-3 w-3" />
              Technical Analysis
            </h4>
            {loadingData ? (
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : snapshot ? (
              <div className="space-y-2">
                {/* Price & Trend row */}
                <div className="grid grid-cols-4 gap-2">
                  <MetricCell label="Price" value={`$${snapshot.price.toFixed(2)}`} />
                  <MetricCell
                    label="Trend"
                    value={snapshot.trend}
                    accent={snapshot.trend === "bullish" ? "emerald" : snapshot.trend === "bearish" ? "rose" : undefined}
                  />
                  <MetricCell
                    label="Momentum"
                    value={snapshot.momentum}
                    accent={snapshot.momentum === "strong" ? "emerald" : snapshot.momentum === "weak" ? "rose" : undefined}
                  />
                  <MetricCell
                    label="Volatility"
                    value={snapshot.volatilityRegime}
                    accent={snapshot.volatilityRegime === "extreme" || snapshot.volatilityRegime === "high" ? "rose" : undefined}
                  />
                </div>
                {/* Oscillators */}
                <div className="grid grid-cols-4 gap-2">
                  <MetricCell
                    label="RSI(14)"
                    value={snapshot.rsi14?.toFixed(1) ?? "N/A"}
                    accent={snapshot.rsi14 ? (snapshot.rsi14 > 70 ? "rose" : snapshot.rsi14 < 30 ? "emerald" : undefined) : undefined}
                  />
                  <MetricCell
                    label="MACD Line"
                    value={snapshot.macd?.line.toFixed(3) ?? "N/A"}
                    accent={snapshot.macd ? (snapshot.macd.line > 0 ? "emerald" : "rose") : undefined}
                  />
                  <MetricCell
                    label="MACD Signal"
                    value={snapshot.macd?.signal.toFixed(3) ?? "N/A"}
                  />
                  <MetricCell
                    label="MACD Hist"
                    value={snapshot.macd?.histogram.toFixed(3) ?? "N/A"}
                    accent={snapshot.macd ? (snapshot.macd.histogram > 0 ? "emerald" : "rose") : undefined}
                  />
                </div>
                {/* Moving Averages */}
                <div className="grid grid-cols-4 gap-2">
                  <MetricCell label="SMA(20)" value={snapshot.sma20?.toFixed(2) ?? "N/A"} />
                  <MetricCell label="SMA(50)" value={snapshot.sma50?.toFixed(2) ?? "N/A"} />
                  <MetricCell label="SMA(200)" value={snapshot.sma200?.toFixed(2) ?? "N/A"} />
                  <MetricCell label="ATR(14)" value={snapshot.atr14?.toFixed(2) ?? "N/A"} />
                </div>
                {/* Bollinger Bands */}
                <div className="grid grid-cols-3 gap-2">
                  <MetricCell label="BB Upper" value={snapshot.bollingerBands?.upper.toFixed(2) ?? "N/A"} />
                  <MetricCell label="BB Middle" value={snapshot.bollingerBands?.middle.toFixed(2) ?? "N/A"} />
                  <MetricCell label="BB Lower" value={snapshot.bollingerBands?.lower.toFixed(2) ?? "N/A"} />
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-navy-500">Market data unavailable</p>
            )}
          </section>

          {/* Thesis Drill-Down */}
          {hasThesisDetail && (
            <section className="mb-5">
              <button
                onClick={() => setShowThesisDetail(!showThesisDetail)}
                className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20 hover:text-navy-300 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3" />
                  Thesis Context
                </span>
                {showThesisDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showThesisDetail && (
                <div className="space-y-3">
                  {/* Hebrew Calendar */}
                  {layers.hebrew.activeHolidays.length > 0 && (
                    <div className="rounded-md border border-accent-amber/20 bg-accent-amber/5 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Calendar className="h-3 w-3 text-accent-amber" />
                        <span className="text-[10px] uppercase tracking-wider text-accent-amber font-medium">Hebrew Calendar</span>
                      </div>
                      <div className="space-y-1">
                        {layers.hebrew.activeHolidays.map((h, i) => (
                          <p key={i} className="text-xs text-navy-200">{h}</p>
                        ))}
                        {layers.hebrew.shmitaRelevance && (
                          <p className="text-[10px] text-accent-amber/70 mt-1">{layers.hebrew.shmitaRelevance}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Celestial Events */}
                  {layers.celestial.activeEvents.length > 0 && (
                    <div className="rounded-md border border-accent-cyan/20 bg-accent-cyan/5 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Star className="h-3 w-3 text-accent-cyan" />
                        <span className="text-[10px] uppercase tracking-wider text-accent-cyan font-medium">
                          Celestial Events
                        </span>
                        <span className="text-[10px] text-navy-400 font-mono ml-auto">
                          intensity {layers.celestial.convergenceIntensity.toFixed(1)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {layers.celestial.activeEvents.map((e, i) => (
                          <p key={i} className="text-xs text-navy-200">{e}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Geopolitical Events */}
                  {layers.geopolitical.activeEvents.length > 0 && (
                    <div className="rounded-md border border-accent-rose/20 bg-accent-rose/5 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Globe className="h-3 w-3 text-accent-rose" />
                        <span className="text-[10px] uppercase tracking-wider text-accent-rose font-medium">
                          Geopolitical
                        </span>
                        <span className="text-[10px] text-navy-400 font-mono ml-auto">
                          escalation {(layers.geopolitical.escalationRisk * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        {layers.geopolitical.activeEvents.map((e, i) => (
                          <p key={i} className="text-xs text-navy-200">{e}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Game Theory */}
                  {layers.gameTheory.analyses.length > 0 && (
                    <div className="rounded-md border border-navy-700/30 bg-navy-800/30 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-navy-500 font-medium mb-2">
                        Game Theory Assessments
                      </div>
                      <div className="space-y-2">
                        {layers.gameTheory.analyses.map((a) => (
                          <div key={a.scenarioId} className="text-xs">
                            <span className="text-navy-300 font-medium">{a.scenarioId.replace(/-/g, " ")}</span>
                            <span className="text-navy-500 mx-1.5">/</span>
                            <span className={`font-mono ${a.marketAssessment.direction === "bullish" ? "text-accent-emerald" : a.marketAssessment.direction === "bearish" ? "text-accent-rose" : "text-navy-300"}`}>
                              {a.marketAssessment.direction}
                            </span>
                            <span className="text-navy-500 mx-1.5">/</span>
                            <span className="text-navy-400">{(a.marketAssessment.confidence * 100).toFixed(0)}% conf</span>
                            <p className="text-[10px] text-navy-400 mt-0.5">{a.marketAssessment.mostLikelyOutcome}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Link to full thesis */}
                  {thesisContext && (
                    <Link
                      href={`/thesis/${thesisContext.uuid}`}
                      className="flex items-center gap-1.5 text-[10px] text-navy-400 hover:text-accent-cyan transition-colors"
                    >
                      View full thesis briefing
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Upside / Downside */}
          {riskEstimates && (
            <section className="mb-5">
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Risk / Reward
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border border-accent-emerald/20 bg-accent-emerald/5 p-3">
                  <div className="text-[10px] text-accent-emerald/70 uppercase tracking-wider mb-1">Upside Target</div>
                  <div className="text-sm font-bold text-accent-emerald font-mono">${riskEstimates.upsideTarget}</div>
                  <div className="text-[10px] text-accent-emerald/60 font-mono">{riskEstimates.upsidePercent > 0 ? "+" : ""}{riskEstimates.upsidePercent}%</div>
                </div>
                <div className="rounded-md border border-accent-rose/20 bg-accent-rose/5 p-3">
                  <div className="text-[10px] text-accent-rose/70 uppercase tracking-wider mb-1">Downside Risk</div>
                  <div className="text-sm font-bold text-accent-rose font-mono">${riskEstimates.downsideRisk}</div>
                  <div className="text-[10px] text-accent-rose/60 font-mono">{riskEstimates.downsidePercent > 0 ? "+" : ""}{riskEstimates.downsidePercent}%</div>
                </div>
                <div className="rounded-md border border-navy-700/30 bg-navy-800/40 p-3">
                  <div className="text-[10px] text-navy-500 uppercase tracking-wider mb-1">R/R Ratio</div>
                  <div className="text-sm font-bold text-navy-100 font-mono">{riskEstimates.riskRewardRatio}x</div>
                  <div className="text-[10px] text-navy-500">risk to reward</div>
                </div>
              </div>
            </section>
          )}

          {/* Position Sizing */}
          {sizingTiers.length > 0 && (
            <section className="mb-5">
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Position Sizing
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {sizingTiers.map((tier) => (
                  <button
                    key={tier.label}
                    onClick={() => setQuantity(tier.quantity.toString())}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      quantity === tier.quantity.toString()
                        ? "border-accent-cyan/40 bg-accent-cyan/5"
                        : "border-navy-700/30 bg-navy-800/40 hover:border-navy-600/40"
                    }`}
                  >
                    <div className="text-[10px] text-navy-500 uppercase tracking-wider mb-1">{tier.label}</div>
                    <div className="text-xs font-bold text-navy-100 font-mono">{tier.quantity} shares</div>
                    <div className="text-[10px] text-navy-400">${tier.positionValue.toLocaleString()} ({tier.percentOfCash}%)</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Resolved ticker info */}
          {resolvedTicker && resolvedTicker !== action.ticker && (
            <div className="mb-3 text-[10px] text-navy-400">
              Resolved to <span className="font-mono text-navy-200">{resolvedTicker}</span>
            </div>
          )}

          {/* Order Form */}
          <section className="border-t border-navy-700/20 pt-4">
            <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-3">Order</h4>

            {/* Order type tabs */}
            <div className="flex h-7 rounded-md border border-navy-700/30 overflow-hidden w-fit mb-3">
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
            <div className="flex gap-3 mb-4">
              <div className="w-36">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1 block">Quantity</label>
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
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1 block">Limit Price</label>
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
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1 block">Stop Price</label>
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
              >
                {placing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : isBuy ? (
                  <ArrowUpRight className="h-3.5 w-3.5 mr-2" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 mr-2" />
                )}
                Execute {action.direction} {action.ticker} {quantity ? `x ${quantity}` : ""}
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
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MetricCell({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "rose" }) {
  const color = accent === "emerald" ? "text-accent-emerald" : accent === "rose" ? "text-accent-rose" : "text-navy-100";
  return (
    <div className="rounded-md border border-navy-700/20 bg-navy-800/40 px-3 py-2">
      <div className="text-[10px] text-navy-500 uppercase tracking-wider">{label}</div>
      <div className={`text-xs font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}
