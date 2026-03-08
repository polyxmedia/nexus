// ── Three-Brain Architecture Types ──

export interface SentinelAlert {
  type: "anomaly" | "threshold" | "convergence" | "escalation";
  severity: number; // 1-5
  title: string;
  summary: string;
  data: Record<string, unknown>;
  recommendsAnalyst: boolean;
}

export interface SentinelContext {
  recentSignals: Array<{ title: string; intensity: number; category: string; date: string; status: string }>;
  marketData: Record<string, { price: number; change: number; changePercent: number }>;
  activeThesisSummary: string | null;
  pendingPredictions: Array<{ claim: string; deadline: string; confidence: number }>;
  undismissedAlerts: number;
}

export interface AnalystContext {
  sentinelAlerts: SentinelAlert[];
  signals: Array<{ title: string; description: string; intensity: number; category: string; layers: string; date: string }>;
  knowledgeContext: string;
  activeThesis: { summary: string; regime: string; confidence: number; riskScenarios: string } | null;
  predictions: Array<{ claim: string; confidence: number; category: string; deadline: string }>;
  gameTheory: Array<{ title: string; analysis: string }>;
}

export interface AnalystBriefing {
  summary: string;
  confidence: number;
  thesisImpact: "reinforces" | "challenges" | "neutral";
  actionItems: {
    type: "trade" | "alert" | "thesis_update";
    description: string;
    urgency: "immediate" | "soon" | "monitor";
  }[];
  convergenceScore: number; // 0-10
  regime: "wartime" | "peacetime" | "transition";
}

export interface ExecutorContext {
  briefing: AnalystBriefing;
  positions: Array<{ symbol: string; quantity: number; avgPrice: number; currentPrice: number; pnl: number }>;
  accountBalance: number;
  riskParams: {
    maxPositionPercent: number; // max % of portfolio in one position
    maxDrawdownPercent: number; // stop trading threshold
    defaultStopLossPercent: number;
  };
}

export interface ExecutorAction {
  action: "buy" | "sell" | "hold" | "adjust_stop" | "take_profit";
  ticker: string;
  quantity?: number;
  price?: number;
  reason: string;
  riskRewardRatio: number;
  positionSizePercent: number;
}

export interface CycleResult {
  timestamp: string;
  sentinel: {
    alerts: SentinelAlert[];
    duration: number;
  };
  analyst: {
    briefing: AnalystBriefing | null;
    triggered: boolean;
    duration: number;
  };
  executor: {
    actions: ExecutorAction[];
    triggered: boolean;
    duration: number;
  };
  totalDuration: number;
}

export interface AgentStatus {
  name: string;
  model: string;
  lastRun: string | null;
  lastDuration: number | null;
  errorCount: number;
  lastError: string | null;
}
