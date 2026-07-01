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

export type QualityGrade = "A+" | "A" | "B" | "C";

export interface WeightedConfidence {
  technical: number;
  news: number;
  session: number;
  risk: number;
  final: number;
  grade: QualityGrade;
}

export type TimeframeTrend = "Bullish" | "Bearish" | "Neutral";
export type MarketCondition =
  | "Bullish Continuation"
  | "Bearish Continuation"
  | "Bullish Recovery"
  | "Bearish Rejection"
  | "Range / No Trade"
  | "Mixed / Wait";
export type SignalRecommendation = "BUY" | "SELL" | "HOLD" | "NO TRADE" | "BUY WATCH" | "SELL WATCH" | "WAIT FOR BUY PULLBACK" | "WAIT FOR SELL PULLBACK";

export interface TimeframeBiasSnapshot {
  timeframe: Extract<Timeframe, "5m" | "15m" | "30m" | "1h" | "4h" | "D">;
  trend: TimeframeTrend;
  emaAlignment: TimeframeTrend;
  rsiDirection: TimeframeTrend;
  macdDirection: TimeframeTrend;
  candleMomentum: TimeframeTrend;
  pricePosition: "Above EMA50/EMA200" | "Above EMA50" | "Below EMA50/EMA200" | "Below EMA50" | "Between EMAs";
  swingDirection: TimeframeTrend;
  score: number;
}

export interface MultiTimeframeBias {
  rows: TimeframeBiasSnapshot[];
  bullishScore: number;
  bearishScore: number;
  neutralScore: number;
  overallBias: "Bullish" | "Bearish" | "Neutral";
  marketCondition: MarketCondition;
  previousBiasStatus: "Sell Invalidated" | "Buy Invalidated" | "Still Confirmed" | "No Prior Bias";
  recommendedAction: SignalRecommendation;
  bullishReversal: boolean;
  bearishReversal: boolean;
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
  weightedConfidence?: WeightedConfidence;
  tradeManagement?: TradeManagementPlan;
  positiveFactors?: string[];
  negativeFactors?: string[];
  newsRisk?: "Low" | "Medium" | "High";
  sessionScore?: number;
  riskScore?: number;
  trendStrength?: number;
  multiTimeframe?: MultiTimeframeBias;
  marketCondition?: MarketCondition;
  recommendedAction?: SignalRecommendation;
  bullishScore?: number;
  bearishScore?: number;
  neutralScore?: number;
  previousBiasStatus?: MultiTimeframeBias["previousBiasStatus"];
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
  confidence_accuracy?: Array<{
    range: string;
    win_rate: number;
    total: number;
  }>;
}
