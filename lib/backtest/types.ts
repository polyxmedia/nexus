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
  /** Starting capital in USD for P&L simulation */
  initialCapital?: number;
  /** Position size as % of portfolio per trade (default 5%) */
  positionSizePct?: number;
  /** Estimated round-trip trading cost in bps (default 10bps = 0.1%) */
  tradingCostBps?: number;
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
  outcome?: "confirmed" | "denied";
  /** Walk-forward fold this prediction belongs to */
  walkForwardFold?: number;
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
  /** Climatological baseline: naive "always bullish" accuracy */
  climatologicalBaseline: {
    directionalAccuracy: number;
    brierScore: number;
  };
  /** p-value: probability that observed accuracy is due to chance (vs random) */
  pValue: number;
  /** p-value corrected for multiple comparisons (Holm-Bonferroni) */
  pValueCorrected: number;
  /** Number of hypothesis tests run (for multiple testing correction) */
  hypothesisCount: number;
  /** Is the result statistically significant at 95% confidence after correction? */
  significant: boolean;

  // ── Walk-forward validation ──
  walkForward?: WalkForwardResults;

  // ── Regime-conditioned analysis ──
  byRegime?: Record<string, RegimeStats>;

  // ── Transaction cost sensitivity ──
  costSensitivity?: CostSensitivityResult[];

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

  // ── Portfolio P&L (dollar terms) ──
  portfolio?: PortfolioResults;

  // ── AI Analysis ──
  aiAnalysis?: string;
}

export interface WalkForwardResults {
  /** Number of folds (expanding window) */
  foldCount: number;
  folds: WalkForwardFold[];
  /** Out-of-sample aggregate accuracy */
  oosAccuracy: number;
  /** Out-of-sample aggregate Brier score */
  oosBrierScore: number;
  /** Ratio: OOS accuracy / in-sample accuracy (< 1 = overfit) */
  overfitRatio: number;
  /** Is OOS accuracy significantly above random? */
  oosSignificant: boolean;
  oosPValue: number;
}

export interface WalkForwardFold {
  foldIndex: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  trainCount: number;
  testCount: number;
  trainAccuracy: number;
  testAccuracy: number;
  trainBrier: number;
  testBrier: number;
}

export interface RegimeStats {
  regime: string;
  count: number;
  directionalAccuracy: number;
  brierScore: number;
  avgConfidence: number;
  avgReturn: number;
}

export interface CostSensitivityResult {
  costBps: number;
  totalReturn: number;
  totalReturnPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  profitFactor: number;
}

export interface PortfolioResults {
  initialCapital: number;
  finalValue: number;
  totalReturn: number;
  totalReturnPct: number;
  annualizedReturn: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  maxDrawdownDate: string;
  sharpeRatio: number;
  sortinoRatio: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalTrades: number;
  totalCosts: number;
  equityCurve: EquityPoint[];
  tradeLog: TradeRecord[];
}

export interface EquityPoint {
  date: string;
  portfolioValue: number;
  cash: number;
  invested: number;
  drawdown: number;
  drawdownPct: number;
}

export interface TradeRecord {
  date: string;
  validationDate: string;
  instruments: string[];
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  positionSize: number;
  entryPrices: Record<string, number>;
  exitPrices: Record<string, number>;
  pnl: number;
  pnlPct: number;
  cost: number;
  outcome: "win" | "loss";
  claim: string;
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
