export const SUPPORTED_TIMEFRAMES = ["5m", "15m", "30m", "1h", "4h", "D", "W", "M"] as const;

export type Timeframe = (typeof SUPPORTED_TIMEFRAMES)[number];
export type SignalType = "BUY" | "SELL" | "HOLD";
export type SignalStrength = "Strong" | "Medium" | "Weak" | "Hold";
export type TrendDirection = "bullish" | "bearish" | "ranging";
export type MacdBias = "bullish" | "bearish" | "improving" | "weakening" | "neutral";

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartLinePoint {
  time: string;
  value: number;
}

export interface PriceZone {
  type: "support" | "resistance";
  price: number;
  low: number;
  high: number;
  touches: number;
}

export interface MacdSnapshot {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
  bias: MacdBias;
}

export interface IndicatorSnapshot {
  ema50: number | null;
  ema200: number | null;
  rsi14: number | null;
  macd: MacdSnapshot;
  atr14: number | null;
  supportZones: PriceZone[];
  resistanceZones: PriceZone[];
  trend: TrendDirection;
  candlePattern: string;
  rejectsSupport: boolean;
  rejectsResistance: boolean;
}

export interface IndicatorSeries {
  ema50: ChartLinePoint[];
  ema200: ChartLinePoint[];
}

export interface SignalRuleResult {
  label: string;
  matched: boolean;
  points: number;
  detail: string;
}

export type SmcDirection = "bullish" | "bearish" | "neutral";
export type SmcGrade = "A+" | "A" | "B" | "C";

export interface SmcAnalysis {
  bos: {
    status: "Bullish BOS" | "Bearish BOS" | "No BOS";
    direction: SmcDirection;
    strength: number;
    timeframe: Timeframe;
    confirmed: boolean;
  };
  choch: {
    status: "Bullish CHoCH" | "Bearish CHoCH" | "No CHoCH";
    direction: SmcDirection;
    reversalProbability: number;
    confidence: number;
    confirmed: boolean;
  };
  liquidity: {
    status: "Equal High Sweep" | "Equal Low Sweep" | "Buy Side Liquidity" | "Sell Side Liquidity" | "No Sweep";
    direction: SmcDirection;
    strength: number;
    confirmed: boolean;
  };
  fvg: {
    status: "Bullish FVG" | "Bearish FVG" | "No FVG";
    direction: SmcDirection;
    gapCreated: boolean;
    gapRetested: boolean;
    gapFilled: boolean;
    nearest: number | null;
    distance: number | null;
    strength: number;
    confirmed: boolean;
  };
  score: number;
  grade: SmcGrade;
}

export interface WeightedConfidence {
  technical: number;
  news: number;
  session: number;
  smc: number;
  risk: number;
  final: number;
  grade: SmcGrade;
}

export interface EliteSetup {
  detected: boolean;
  direction: SignalType;
  confidence: number;
  quality: SmcGrade;
  expectedRiskReward: number;
  reasons: string[];
}

export interface TradeManagementPlan {
  tp1: number;
  tp2: number;
  tp3: number;
  volatilityLevel: "Low" | "Medium" | "High" | "Extreme";
  breakEvenAtPoints: number;
  riskFreeAtPoints: number;
  bestEntryZone: {
    low: number;
    high: number;
    optimal: number;
    distance: number;
  };
  continuationProbability: number;
  reversalRisk: number;
  expectedMove: string;
  aiAction: "Close Now" | "Partial Close" | "Hold" | "Move SL To Break Even" | "Activate Trailing Stop" | "No Trade";
  exitReview: {
    recommendation: "Close Now" | "Partial Close" | "Hold" | "Move SL To Break Even" | "Activate Trailing Stop" | "No Trade";
    reasons: string[];
  };
}

export interface SignalResult {
  symbol: string;
  timeframe: Timeframe;
  signalType: SignalType;
  strength: SignalStrength;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
  riskPercent: number;
  explanation: string;
  rules: SignalRuleResult[];
  bias: "long" | "short" | "neutral";
  createdAt: string;
  smc?: SmcAnalysis;
  weightedConfidence?: WeightedConfidence;
  eliteSetup?: EliteSetup;
  tradeManagement?: TradeManagementPlan;
  positiveFactors?: string[];
  negativeFactors?: string[];
  newsRisk?: "Low" | "Medium" | "High";
  sessionScore?: number;
  riskScore?: number;
  trendStrength?: number;
}

export interface MarketDataResult {
  symbol: string;
  timeframe: Timeframe;
  provider: "mock" | "twelve-data";
  candles: Candle[];
  status?: "live" | "cached" | "fallback";
  fetchedAt?: string;
  sourceLabel?: string;
  notice?: string;
}

export interface AnalysisResult extends MarketDataResult {
  currentPrice: number;
  indicators: IndicatorSnapshot;
  indicatorSeries: IndicatorSeries;
  signal: SignalResult;
}

export interface SignalRecord {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  signal_type: SignalType;
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  risk_reward: number;
  explanation: string;
  created_at: string;
}

export interface BacktestRecord {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  start_date: string;
  end_date: string;
  win_rate: number;
  profit_factor: number;
  max_drawdown: number;
  total_trades: number;
  created_at: string;
}

export interface BacktestTrade {
  openedAt: string;
  signalType: Exclude<SignalType, "HOLD">;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  result: "win" | "loss" | "open";
  rr: number;
  confidence?: number;
  smcScore?: number;
  smcGrade?: SmcGrade;
  bosConfirmed?: boolean;
  chochConfirmed?: boolean;
  liquiditySweep?: boolean;
  fvgRetest?: boolean;
}

export interface BacktestSummary extends BacktestRecord {
  provider: MarketDataResult["provider"];
  notice?: string;
  closed_trades: number;
  win_count: number;
  loss_count: number;
  trades: BacktestTrade[];
  expectancy?: number;
  recovery_factor?: number;
  best_session?: string;
  worst_session?: string;
  best_timeframe?: Timeframe;
  smc_stats?: {
    bos_accuracy: number;
    choch_accuracy: number;
    liquidity_sweep_accuracy: number;
    fvg_accuracy: number;
  };
  confidence_accuracy?: Array<{
    range: string;
    win_rate: number;
    total: number;
  }>;
}
