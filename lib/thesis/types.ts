// ── Market Data Types ──

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSnapshot {
  symbol: string;
  timestamp: string;
  price: number;
  rsi14: number | null;
  macd: { line: number; signal: number; histogram: number } | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  bollingerBands: { upper: number; middle: number; lower: number } | null;
  atr14: number | null;
  trend: "bullish" | "bearish" | "neutral";
  momentum: "strong" | "moderate" | "weak" | "divergent";
  volatilityRegime: "low" | "normal" | "high" | "extreme";
}

export interface MarketSentiment {
  vixLevel: number | null;
  vixRegime: "complacent" | "normal" | "elevated" | "panic" | null;
  sectorRotation: SectorStrength[];
  fearGreedComposite: number; // 0-100
  fearGreedLabel: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
  timestamp: string;
}

export interface SectorStrength {
  sector: string;
  etf: string;
  relativeStrength: number; // vs SPY, positive = outperforming
  trend: "bullish" | "bearish" | "neutral";
}

// ── Game Theory Types ──

export interface GeopoliticalActor {
  id: string;
  name: string;
  shortName: string;
  objectives: string[];
  capabilities: string[];
  constraints: string[];
  redLines: string[];
  alliances: string[];
  adversaries: string[];
}

export interface StrategicScenario {
  id: string;
  title: string;
  description: string;
  actors: string[]; // actor IDs
  strategies: Record<string, string[]>; // actorId -> available strategies
  payoffMatrix: PayoffEntry[];
  context: string;
  marketSectors: string[];
  timeHorizon: "immediate" | "short_term" | "medium_term" | "long_term";
}

export interface PayoffEntry {
  strategies: Record<string, string>; // actorId -> chosen strategy
  payoffs: Record<string, number>; // actorId -> payoff value (-10 to 10)
  marketImpact: {
    direction: "bullish" | "bearish" | "mixed";
    magnitude: "low" | "medium" | "high";
    sectors: string[];
    description: string;
  };
}

export interface NashEquilibrium {
  strategies: Record<string, string>;
  payoffs: Record<string, number>;
  stability: "stable" | "unstable" | "mixed";
  marketImpact: PayoffEntry["marketImpact"];
}

export interface SchellingPoint {
  strategy: Record<string, string>;
  reasoning: string;
  probability: number;
}

export interface EscalationStep {
  level: number;
  description: string;
  trigger: string;
  probability: number;
  marketImpact: {
    direction: "bullish" | "bearish" | "mixed";
    magnitude: "low" | "medium" | "high";
    sectors: string[];
  };
}

export interface GameTheoryAnalysis {
  scenarioId: string;
  nashEquilibria: NashEquilibrium[];
  schellingPoints: SchellingPoint[];
  escalationLadder: EscalationStep[];
  dominantStrategies: Record<string, string | null>;
  marketAssessment: {
    mostLikelyOutcome: string;
    direction: "bullish" | "bearish" | "mixed";
    confidence: number;
    keySectors: string[];
  };
}

// ── Thesis Types ──

export type ThesisStatus = "active" | "expired" | "superseded";

export interface TradingAction {
  ticker: string;
  direction: "BUY" | "SELL" | "HOLD";
  rationale: string;
  entryCondition: string;
  riskLevel: "low" | "medium" | "high";
  confidence: number; // 0-1
  sources: string[]; // which layers contributed
}

export interface ThesisLayerInput {
  celestial: {
    activeEvents: string[];
    convergenceIntensity: number;
  };
  hebrew: {
    activeHolidays: string[];
    shmitaRelevance: string | null;
  };
  geopolitical: {
    activeEvents: string[];
    escalationRisk: number;
  };
  market: {
    regime: "risk_on" | "risk_off" | "transitioning";
    volatilityOutlook: string;
    technicalSnapshots: TechnicalSnapshot[];
    sentiment: MarketSentiment | null;
  };
  gameTheory: {
    activeScenarios: string[];
    analyses: GameTheoryAnalysis[];
  };
}

export interface Thesis {
  id?: number;
  title: string;
  status: ThesisStatus;
  generatedAt: string;
  validUntil: string;

  // Quantitative assessments (computed from data)
  marketRegime: "risk_on" | "risk_off" | "transitioning";
  volatilityOutlook: "low" | "normal" | "elevated" | "extreme";
  convergenceDensity: number; // 0-10
  overallConfidence: number; // 0-1

  // Trading actions (derived from rules)
  tradingActions: TradingAction[];

  // Narrative sections (written by Claude)
  executiveSummary: string;
  situationAssessment: string;
  riskScenarios: string;

  // Layer inputs for traceability
  layerInputs: ThesisLayerInput;

  // Symbols analyzed
  symbols: string[];
}
