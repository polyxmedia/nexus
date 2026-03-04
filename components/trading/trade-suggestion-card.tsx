"use client";

import { TrendingUp, TrendingDown, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TradingAction {
  ticker: string;
  direction: "BUY" | "SELL" | "HOLD";
  rationale: string;
  confidence: number;
  riskLevel?: string;
}

interface TradeSuggestionCardProps {
  action: TradingAction;
  executed?: boolean;
  onApprove: () => void;
  onDecline: () => void;
}

const DIRECTION_STYLES = {
  BUY: {
    badge: "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/25",
    icon: TrendingUp,
  },
  SELL: {
    badge: "bg-accent-rose/15 text-accent-rose border-accent-rose/25",
    icon: TrendingDown,
  },
  HOLD: {
    badge: "bg-navy-700/50 text-navy-300 border-navy-600/30",
    icon: Minus,
  },
};

export function TradeSuggestionCard({
  action,
  executed,
  onApprove,
  onDecline,
}: TradeSuggestionCardProps) {
  const style = DIRECTION_STYLES[action.direction];
  const Icon = style.icon;

  if (executed) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-navy-700/20 bg-navy-900/40 px-3 py-2 opacity-60">
        <div className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${style.badge}`}>
          <Icon className="h-3 w-3" />
          {action.direction}
        </div>
        <span className="text-xs font-semibold text-navy-300">{action.ticker}</span>
        <Check className="h-3.5 w-3.5 text-accent-emerald ml-auto" />
        <span className="text-[10px] text-navy-500">Executed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-navy-700/30 bg-navy-800/40 px-3 py-2 hover:bg-navy-800/60 transition-colors">
      <div className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider shrink-0 ${style.badge}`}>
        <Icon className="h-3 w-3" />
        {action.direction}
      </div>
      <span className="text-xs font-semibold text-navy-100 shrink-0">{action.ticker}</span>
      <span className="text-[10px] text-navy-400 font-mono shrink-0">
        {(action.confidence * 100).toFixed(0)}%
      </span>
      <span className="text-[10px] text-navy-400 truncate flex-1 min-w-0">
        {action.rationale}
      </span>
      {action.direction !== "HOLD" && (
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <Button variant="primary" size="sm" onClick={onApprove} className="h-6 px-2 text-[10px]">
            Approve
          </Button>
          <Button variant="ghost" size="sm" onClick={onDecline} className="h-6 px-2 text-[10px] text-navy-500 hover:text-navy-300">
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
