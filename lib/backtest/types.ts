// ── Backtest types ──

export interface BacktestConfig {
  /** Start date (ISO, e.g. "2015-01-01") */
  startDate: string;
  /** End date (ISO, e.g. "2025-12-31") */
  endDate: string;
  /** Instruments to track for validation */
  instruments: string[];
  /** Minimum convergence intensity to trigger a prediction (1-5) */
  convergenceThreshold: number;
  /** Prediction timeframes to generate (days) */
  timeframes: number[];
  /** Signal layers to include */
  layers: string[];
  /** Step interval in days (e.g. 7 = weekly) */
  stepDays: number;
}

export interface BacktestPrediction {
  /** The simulation date when this prediction was generated */
  predictionDate: string;
  /** The convergence that triggered this prediction */
  convergenceDate: string;
  convergenceIntensity: number;
  convergenceLayers: string[];
  convergenceDescription: string;
  /** What the AI predicted */
  claim: string;
  direction: "bullish" | "bearish" | "neutral";
  instruments: string[];
  confidence: number; // 0-1
  timeframeDays: number;
  category: "market" | "geopolitical" | "mixed";
  reasoning: string;
  /** Validation data (filled after validation phase) */
  validationDate?: string;
  priceAtPrediction?: Record<string, number>;
  priceAtValidation?: Record<string, number>;
  actualReturn?: Record<string, number>;
  directionCorrect?: boolean;
  brierScore?: number;
  outcome?: "confirmed" | "denied" | "partial";
}

export interface BacktestRun {
  id: string;
  config: BacktestConfig;
  status: "pending" | "collecting_data" | "generating_signals" | "simulating" | "validating" | "analyzing" | "complete" | "failed";
  progress: number; // 0-100
  progressMessage: string;
  predictions: BacktestPrediction[];
  results?: BacktestResults;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BacktestResults {
  // ── Sample metrics ──
  totalPredictions: number;
  totalValidated: number;
  dateRange: { start: string; end: string };
  yearsSpanned: number;

  // ── Accuracy metrics ──
  directionalAccuracy: number; // 0-1
  brierScore: number;
  logLoss: number;
  avgConfidence: number;
  calibrationGap: number;

  // ── Baseline comparison ──
  randomBaseline: {
    directionalAccuracy: number;
    brierScore: number;
  };
  /** p-value: probability that observed accuracy is due to chance */
  pValue: number;
  /** Is the result statistically significant at 95% confidence? */
  significant: boolean;

  // ── Breakdowns ──
  byTimeframe: Record<number, TimeframeStats>;
  byCategory: Record<string, CategoryStats>;
  byYear: Record<number, YearStats>;
  byInstrument: Record<string, InstrumentStats>;
  calibrationCurve: CalibrationBucket[];

  // ── Time series for charts ──
  cumulativeAccuracy: { date: string; accuracy: number; n: number }[];
  brierOverTime: { date: string; brier: number; rolling30: number }[];
  hypotheticalPnl: { date: string; pnl: number; trades: number }[];

  // ── AI Analysis ──
  aiAnalysis?: string;
}

export interface TimeframeStats {
  count: number;
  directionalAccuracy: number;
  brierScore: number;
  avgConfidence: number;
}

export interface CategoryStats {
  count: number;
  directionalAccuracy: number;
  brierScore: number;
  avgConfidence: number;
}

export interface YearStats {
  count: number;
  directionalAccuracy: number;
  brierScore: number;
  avgConfidence: number;
  hypotheticalReturn: number;
}

export interface InstrumentStats {
  count: number;
  directionalAccuracy: number;
  avgReturn: number;
  winRate: number;
}

export interface CalibrationBucket {
  range: string;
  midpoint: number;
  count: number;
  observedFrequency: number;
  expectedFrequency: number;
}
