import { calculateAtr, calculateEma, calculateIndicators, calculateMacd, calculateRsi } from "@/lib/indicators";
import {
  type Candle,
  type MultiTimeframeBias,
  type QualityGrade,
  type SignalResult,
  type SignalRuleResult,
  type SignalStrength,
  type SignalType,
  type TimeframeBiasSnapshot,
  type TradeManagementPlan,
  type WeightedConfidence,
  type Timeframe
} from "@/lib/types";
import { clamp, roundTo } from "@/lib/utils";

const DEFAULT_RISK_PERCENT = 1;
const ALIGNMENT_TIMEFRAMES = ["5m", "15m", "30m", "1h", "4h", "D"] as const;
type AlignmentTimeframe = (typeof ALIGNMENT_TIMEFRAMES)[number];

const PROFILE: Record<
  Timeframe,
  {
    minConfidence: number;
    minSeparation: number;
    minEmaSpreadAtr: number;
    maxDistanceFromEmaAtr: number;
    minAtrPct: number;
    maxAtrPct: number;
    activeSessionOnly: boolean;
  }
> = {
  "5m": {
    minConfidence: 86,
    minSeparation: 24,
    minEmaSpreadAtr: 0.35,
    maxDistanceFromEmaAtr: 1.1,
    minAtrPct: 0.00035,
    maxAtrPct: 0.004,
    activeSessionOnly: true
  },
  "15m": {
    minConfidence: 80,
    minSeparation: 12,
    minEmaSpreadAtr: 0.05,
    maxDistanceFromEmaAtr: 4,
    minAtrPct: 0.00045,
    maxAtrPct: 0.005,
    activeSessionOnly: true
  },
  "30m": {
    minConfidence: 80,
    minSeparation: 14,
    minEmaSpreadAtr: 0.02,
    maxDistanceFromEmaAtr: 1.8,
    minAtrPct: 0.00055,
    maxAtrPct: 0.006,
    activeSessionOnly: true
  },
  "1h": {
    minConfidence: 76,
    minSeparation: 12,
    minEmaSpreadAtr: 0.1,
    maxDistanceFromEmaAtr: 3.35,
    minAtrPct: 0.0007,
    maxAtrPct: 0.008,
    activeSessionOnly: true
  },
  "4h": {
    minConfidence: 80,
    minSeparation: 12,
    minEmaSpreadAtr: 0.05,
    maxDistanceFromEmaAtr: 2.5,
    minAtrPct: 0.001,
    maxAtrPct: 0.014,
    activeSessionOnly: true
  },
  D: {
    minConfidence: 78,
    minSeparation: 18,
    minEmaSpreadAtr: 0.28,
    maxDistanceFromEmaAtr: 1.9,
    minAtrPct: 0.0015,
    maxAtrPct: 0.03,
    activeSessionOnly: false
  },
  W: {
    minConfidence: 80,
    minSeparation: 20,
    minEmaSpreadAtr: 0.25,
    maxDistanceFromEmaAtr: 2.1,
    minAtrPct: 0.002,
    maxAtrPct: 0.05,
    activeSessionOnly: false
  },
  M: {
    minConfidence: 80,
    minSeparation: 20,
    minEmaSpreadAtr: 0.22,
    maxDistanceFromEmaAtr: 2.4,
    minAtrPct: 0.002,
    maxAtrPct: 0.08,
    activeSessionOnly: false
  }
};

type NullableNumber = number | null;

function lastNonNull(values: NullableNumber[]) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== null && Number.isFinite(value)) {
      return { index, value };
    }
  }

  return null;
}

function previousNonNull(values: NullableNumber[], fromIndex: number) {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== null && Number.isFinite(value)) {
      return { index, value };
    }
  }

  return null;
}

function scoreRules(rules: SignalRuleResult[]) {
  return rules.reduce((total, rule) => total + (rule.matched ? rule.points : 0), 0);
}

function buildStrength(signalType: SignalType, confidence: number): SignalStrength {
  if (signalType === "HOLD") {
    return "Hold";
  }

  if (confidence >= 70) {
    return "Strong";
  }

  if (confidence >= 60) {
    return "Medium";
  }

  return "Weak";
}

function gradeFromScore(score: number): QualityGrade {
  if (score >= 88) return "A+";
  if (score >= 74) return "A";
  if (score >= 58) return "B";
  return "C";
}

function recentSwing(candles: Candle[], side: "low" | "high") {
  const window = candles.slice(-14);
  return side === "low"
    ? Math.min(...window.map((candle) => candle.low))
    : Math.max(...window.map((candle) => candle.high));
}

function buildRiskLevels(candles: Candle[], direction: "long" | "short", atr: number | null) {
  const entry = candles[candles.length - 1].close;
  const fallbackAtr = atr ?? Math.max(entry * 0.0015, 3);

  if (direction === "short") {
    const swingHigh = recentSwing(candles, "high");
    let stopLoss = Math.min(swingHigh + fallbackAtr * 0.18, entry + fallbackAtr * 1.35);
    if (stopLoss <= entry) {
      stopLoss = entry + fallbackAtr * 1.15;
    }
    const risk = Math.max(stopLoss - entry, fallbackAtr);

    return {
      entryPrice: roundTo(entry),
      stopLoss: roundTo(stopLoss),
      takeProfit1: roundTo(entry - risk * 1.5),
      takeProfit2: roundTo(entry - risk * 2),
      riskReward: 2
    };
  }

  const swingLow = recentSwing(candles, "low");
  let stopLoss = Math.max(swingLow - fallbackAtr * 0.18, entry - fallbackAtr * 1.35);
  if (stopLoss >= entry) {
    stopLoss = entry - fallbackAtr * 1.15;
  }
  const risk = Math.max(entry - stopLoss, fallbackAtr);

  return {
    entryPrice: roundTo(entry),
    stopLoss: roundTo(stopLoss),
    takeProfit1: roundTo(entry + risk * 1.5),
    takeProfit2: roundTo(entry + risk * 2),
    riskReward: 2
  };
}

function buildRiskLevelsForTimeframe(
  candles: Candle[],
  timeframe: Timeframe,
  direction: "long" | "short",
  atr: number | null
) {
  const tunedRisk: Partial<Record<Timeframe, { stopAtr: number; minRiskAtr: number; swingPadAtr: number }>> = {
    "15m": { stopAtr: 1, minRiskAtr: 0.8, swingPadAtr: 0.1 },
    "30m": { stopAtr: 1.7, minRiskAtr: 1, swingPadAtr: 0.15 },
    "1h": { stopAtr: 1.6, minRiskAtr: 1, swingPadAtr: 0.15 },
    "4h": { stopAtr: 2.8, minRiskAtr: 1, swingPadAtr: 0.12 }
  };
  const settings = tunedRisk[timeframe];

  if (!settings) {
    return buildRiskLevels(candles, direction, atr);
  }

  const entry = candles[candles.length - 1].close;
  const fallbackAtr = atr ?? Math.max(entry * 0.0015, 3);

  if (direction === "short") {
    const swingHigh = recentSwing(candles, "high");
    let stopLoss = Math.min(swingHigh + fallbackAtr * settings.swingPadAtr, entry + fallbackAtr * settings.stopAtr);
    if (stopLoss <= entry) {
      stopLoss = entry + fallbackAtr * settings.stopAtr;
    }
    const risk = Math.max(stopLoss - entry, fallbackAtr * settings.minRiskAtr);

    return {
      entryPrice: roundTo(entry),
      stopLoss: roundTo(stopLoss),
      takeProfit1: roundTo(entry - risk * 1.5),
      takeProfit2: roundTo(entry - risk * 2),
      riskReward: 2
    };
  }

  const swingLow = recentSwing(candles, "low");
  let stopLoss = Math.max(swingLow - fallbackAtr * settings.swingPadAtr, entry - fallbackAtr * settings.stopAtr);
  if (stopLoss >= entry) {
    stopLoss = entry - fallbackAtr * settings.stopAtr;
  }
  const risk = Math.max(entry - stopLoss, fallbackAtr * settings.minRiskAtr);

  return {
    entryPrice: roundTo(entry),
    stopLoss: roundTo(stopLoss),
    takeProfit1: roundTo(entry + risk * 1.5),
    takeProfit2: roundTo(entry + risk * 2),
    riskReward: 2
  };
}

function rule(label: string, matched: boolean, points: number, detail: string): SignalRuleResult {
  return { label, matched, points, detail };
}

function volatilityBucket(atr: number | null, price: number): TradeManagementPlan["volatilityLevel"] {
  const atrPoints = atr ?? Math.max(price * 0.0015, 3);
  if (atrPoints >= 34) return "Extreme";
  if (atrPoints >= 22) return "High";
  if (atrPoints >= 10) return "Medium";
  return "Low";
}

function tpPointsForVolatility(level: TradeManagementPlan["volatilityLevel"]) {
  if (level === "Extreme") return [20, 40, 60] as const;
  if (level === "High") return [15, 30, 45] as const;
  if (level === "Medium") return [10, 20, 30] as const;
  return [5, 10, 15] as const;
}

function buildWeightedConfidence(params: {
  technical: number;
  newsScore: number;
  sessionScore: number;
  riskScore: number;
}): WeightedConfidence {
  const final = Math.round(
    params.technical * 0.5 +
      params.newsScore * 0.2 +
      params.sessionScore * 0.2 +
      params.riskScore * 0.1
  );

  return {
    technical: Math.round(params.technical),
    news: Math.round(params.newsScore),
    session: Math.round(params.sessionScore),
    risk: Math.round(params.riskScore),
    final,
    grade: gradeFromScore(final)
  };
}

function buildTradeManagementPlan(params: {
  direction: "long" | "short" | "neutral";
  entry: number;
  currentPrice: number;
  atr: number | null;
  confidence: number;
  riskScore: number;
  sessionScore: number;
  newsScore: number;
}): TradeManagementPlan {
  const volatilityLevel = volatilityBucket(params.atr, params.currentPrice);
  const [tp1Points, tp2Points, tp3Points] = tpPointsForVolatility(volatilityLevel);
  const sign = params.direction === "short" ? -1 : 1;
  const atrPad = Math.max((params.atr ?? params.currentPrice * 0.0015) * 0.18, 1.2);
  const optimal = params.entry;
  const low = optimal - atrPad;
  const high = optimal + atrPad;
  const continuationProbability = Math.round(
    clamp(params.confidence * 0.55 + params.sessionScore * 0.18 + params.riskScore * 0.12 + params.newsScore * 0.15, 0, 100)
  );
  const reversalRisk = 100 - continuationProbability;
  const expectedLow = Math.max(5, Math.round(tp1Points * 0.75));
  const expectedHigh = Math.max(expectedLow + 5, tp2Points);
  const aiAction =
    params.direction === "neutral"
      ? "No Trade"
      : continuationProbability >= 72
      ? "Hold"
      : reversalRisk >= 58
        ? "Partial Close"
        : params.riskScore < 55
          ? "Move SL To Break Even"
          : "Hold";

  return {
    tp1: roundTo(params.entry + sign * tp1Points),
    tp2: roundTo(params.entry + sign * tp2Points),
    tp3: roundTo(params.entry + sign * tp3Points),
    volatilityLevel,
    breakEvenAtPoints: 3,
    riskFreeAtPoints: 4,
    bestEntryZone: {
      low: roundTo(low),
      high: roundTo(high),
      optimal: roundTo(optimal),
      distance: roundTo(Math.abs(params.currentPrice - optimal))
    },
    continuationProbability,
    reversalRisk,
    expectedMove: params.direction === "neutral" ? "Wait for valid setup" : `${sign > 0 ? "+" : "-"}${expectedLow} to ${sign > 0 ? "+" : "-"}${expectedHigh} points`,
    aiAction,
    exitReview: {
      recommendation: aiAction,
      reasons: [
        params.direction === "neutral" ? "No active trade while signal is HOLD" : `Continuation probability ${continuationProbability}%`,
        `Reversal risk ${reversalRisk}%`,
        `${volatilityLevel} volatility TP model active`,
        params.newsScore >= 70 ? "News risk acceptable" : "News risk requires protection"
      ]
    }
  };
}

function explanationFor(signal: SignalType, confidence: number, matchedRules: SignalRuleResult[], failedRules: SignalRuleResult[], multiTimeframe: MultiTimeframeBias) {
  const passed = matchedRules.map((item) => item.label.toLowerCase()).slice(0, 4);
  const missing = failedRules.map((item) => item.label.toLowerCase()).slice(0, 3);
  const biasReset =
    multiTimeframe.previousBiasStatus === "Sell Invalidated"
      ? " Previous bearish bias invalidated: lower timeframes flipped bullish and recovery pressure is active."
      : multiTimeframe.previousBiasStatus === "Buy Invalidated"
        ? " Previous bullish bias invalidated: lower timeframes flipped bearish and rejection pressure is active."
        : "";

  if (signal === "HOLD") {
    const action = multiTimeframe.recommendedAction === "BUY WATCH" || multiTimeframe.recommendedAction === "SELL WATCH" || multiTimeframe.recommendedAction === "NO TRADE"
      ? `${multiTimeframe.recommendedAction}: `
      : "Hold: ";
    return `${action}confidence is ${confidence}% with bullish score ${multiTimeframe.bullishScore}, bearish score ${multiTimeframe.bearishScore}, and market condition ${multiTimeframe.marketCondition}. Missing or weak factors include ${missing.join(", ") || "follow-through"}. Wait for fresh EMA, RSI, MACD, session, news, and volatility alignment.${biasReset}`;
  }

  return `${signal}: confidence is ${confidence}% with ${passed.join(", ")}. Market condition is ${multiTimeframe.marketCondition}; bullish score ${multiTimeframe.bullishScore}, bearish score ${multiTimeframe.bearishScore}. Precision trend-pullback setup only; manage risk at 1%, use the ATR-capped swing stop, and treat TP1/TP2 as planning levels only.${biasReset}`;
}

function isGoldActiveSession(candleTime: string, timeframe: Timeframe) {
  if (!PROFILE[timeframe].activeSessionOnly) {
    return true;
  }

  const hour = new Date(candleTime).getUTCHours();
  const day = new Date(candleTime).getUTCDay();

  if (timeframe === "4h") {
    return day >= 1 && day <= 5 && !(day === 5 && hour >= 21);
  }

  if (timeframe === "30m") {
    return hour >= 11 && hour <= 20;
  }

  if (timeframe === "15m" || timeframe === "1h") {
    return hour >= 6 && hour <= 20;
  }

  return hour >= 7 && hour <= 20;
}

function closeLocation(candle: Candle) {
  const range = Math.max(candle.high - candle.low, 0.01);
  return (candle.close - candle.low) / range;
}

function isBullishPattern(pattern: string) {
  return pattern.includes("bullish") || pattern.includes("support");
}

function isBearishPattern(pattern: string) {
  return pattern.includes("bearish") || pattern.includes("resistance");
}

function trendFromScores(bullish: number, bearish: number): TimeframeBiasSnapshot["trend"] {
  if (bullish >= 52 && bullish >= bearish + 12) return "Bullish";
  if (bearish >= 52 && bearish >= bullish + 12) return "Bearish";
  return "Neutral";
}

function swingDirection(candles: Candle[]): TimeframeBiasSnapshot["swingDirection"] {
  const sample = candles.slice(-40);
  if (sample.length < 12) return "Neutral";

  const split = Math.floor(sample.length / 2);
  const first = sample.slice(0, split);
  const second = sample.slice(split);
  const firstLow = Math.min(...first.map((candle) => candle.low));
  const secondLow = Math.min(...second.map((candle) => candle.low));
  const firstHigh = Math.max(...first.map((candle) => candle.high));
  const secondHigh = Math.max(...second.map((candle) => candle.high));
  const tolerance = Math.max((sample[sample.length - 1].close * 0.00035), 0.8);

  if (secondHigh > firstHigh + tolerance && secondLow > firstLow - tolerance) return "Bullish";
  if (secondLow < firstLow - tolerance && secondHigh < firstHigh + tolerance) return "Bearish";
  return "Neutral";
}

function analyzeTimeframeBias(timeframe: AlignmentTimeframe, candles: Candle[]): TimeframeBiasSnapshot | null {
  if (candles.length < 60) {
    return null;
  }

  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2] ?? current;
  const closes = candles.map((candle) => candle.close);
  const indicators = calculateIndicators(candles).snapshot;
  const ema50 = indicators.ema50;
  const ema200 = indicators.ema200;
  const rsi = indicators.rsi14;
  const macd = indicators.macd.bias;
  const swing = swingDirection(candles);
  const candleRange = Math.max(current.high - current.low, 0.01);
  const candleLocation = (current.close - current.low) / candleRange;
  const ema50Series = calculateEma(closes, 50);
  const ema50Latest = lastNonNull(ema50Series);
  const ema50Previous = ema50Latest ? previousNonNull(ema50Series, ema50Latest.index) : null;
  const emaSlope = ema50Latest && ema50Previous ? ema50Latest.value - ema50Previous.value : 0;

  let bullish = 0;
  let bearish = 0;

  if (ema50 !== null && current.close > ema50) bullish += 18;
  if (ema50 !== null && current.close < ema50) bearish += 18;
  if (ema50 !== null && ema200 !== null && ema50 >= ema200) bullish += 14;
  if (ema50 !== null && ema200 !== null && ema50 <= ema200) bearish += 14;
  if (emaSlope > 0) bullish += 10;
  if (emaSlope < 0) bearish += 10;
  if (rsi !== null && rsi >= 52) bullish += 16;
  if (rsi !== null && rsi <= 48) bearish += 16;
  if (macd === "bullish" || macd === "improving") bullish += 16;
  if (macd === "bearish" || macd === "weakening") bearish += 16;
  if (current.close > current.open && candleLocation >= 0.55) bullish += 12;
  if (current.close < current.open && candleLocation <= 0.45) bearish += 12;
  if (current.close > previous.close) bullish += 8;
  if (current.close < previous.close) bearish += 8;
  if (swing === "Bullish") bullish += 14;
  if (swing === "Bearish") bearish += 14;

  const trend = trendFromScores(bullish, bearish);
  const emaAlignment = ema50 !== null && ema200 !== null ? trendFromScores(ema50 >= ema200 ? 62 : 24, ema50 <= ema200 ? 62 : 24) : "Neutral";
  const rsiDirection = rsi === null ? "Neutral" : rsi >= 52 ? "Bullish" : rsi <= 48 ? "Bearish" : "Neutral";
  const macdDirection = macd === "bullish" || macd === "improving" ? "Bullish" : macd === "bearish" || macd === "weakening" ? "Bearish" : "Neutral";
  const candleMomentum = current.close > current.open && candleLocation >= 0.55 ? "Bullish" : current.close < current.open && candleLocation <= 0.45 ? "Bearish" : "Neutral";
  const pricePosition =
    ema50 !== null && ema200 !== null && current.close > ema50 && current.close > ema200
      ? "Above EMA50/EMA200"
      : ema50 !== null && ema200 !== null && current.close < ema50 && current.close < ema200
        ? "Below EMA50/EMA200"
        : ema50 !== null && current.close > ema50
          ? "Above EMA50"
          : ema50 !== null && current.close < ema50
            ? "Below EMA50"
            : "Between EMAs";

  return {
    timeframe,
    trend,
    emaAlignment,
    rsiDirection,
    macdDirection,
    candleMomentum,
    pricePosition,
    swingDirection: swing,
    score: Math.round(clamp(Math.max(bullish, bearish), 0, 100))
  };
}

function buildMultiTimeframeBias(params: {
  selectedTimeframe: Timeframe;
  selectedCandles: Candle[];
  multiTimeframeCandles?: Partial<Record<AlignmentTimeframe, Candle[]>>;
}): MultiTimeframeBias {
  const rows = ALIGNMENT_TIMEFRAMES.map((timeframe) => {
    const candles = params.multiTimeframeCandles?.[timeframe] ?? (timeframe === params.selectedTimeframe ? params.selectedCandles : []);
    return analyzeTimeframeBias(timeframe, candles);
  }).filter((row): row is TimeframeBiasSnapshot => Boolean(row));

  const fallback = analyzeTimeframeBias(
    ALIGNMENT_TIMEFRAMES.includes(params.selectedTimeframe as AlignmentTimeframe) ? params.selectedTimeframe as AlignmentTimeframe : "1h",
    params.selectedCandles
  );
  const usableRows = rows.length ? rows : fallback ? [fallback] : [];
  const weights: Record<AlignmentTimeframe, number> = {
    "5m": 1.1,
    "15m": 1.2,
    "30m": 1.25,
    "1h": 1.35,
    "4h": 1.05,
    D: 0.75
  };
  const totalWeight = usableRows.reduce((sum, row) => sum + weights[row.timeframe], 0) || 1;
  const bullishScore = Math.round(usableRows.reduce((sum, row) => sum + (row.trend === "Bullish" ? row.score : row.trend === "Neutral" ? 35 : 10) * weights[row.timeframe], 0) / totalWeight);
  const bearishScore = Math.round(usableRows.reduce((sum, row) => sum + (row.trend === "Bearish" ? row.score : row.trend === "Neutral" ? 35 : 10) * weights[row.timeframe], 0) / totalWeight);
  const neutralScore = Math.round(clamp(100 - Math.abs(bullishScore - bearishScore), 0, 100));
  const lowerRows = usableRows.filter((row) => row.timeframe === "5m" || row.timeframe === "15m" || row.timeframe === "30m");
  const lowerBullish = lowerRows.filter((row) => row.trend === "Bullish").length;
  const lowerBearish = lowerRows.filter((row) => row.trend === "Bearish").length;
  const h1 = usableRows.find((row) => row.timeframe === "1h");
  const daily = usableRows.find((row) => row.timeframe === "D");
  const bullishReversal = lowerBullish >= 3 && h1?.trend !== "Bearish" && bullishScore >= bearishScore + 10;
  const bearishReversal = lowerBearish >= 3 && h1?.trend !== "Bullish" && bearishScore >= bullishScore + 10;
  const previousBiasStatus =
    daily?.trend === "Bearish" && bullishReversal
      ? "Sell Invalidated"
      : daily?.trend === "Bullish" && bearishReversal
        ? "Buy Invalidated"
        : daily?.trend === "Bullish" || daily?.trend === "Bearish"
          ? "Still Confirmed"
          : "No Prior Bias";
  const overallBias = bullishScore >= bearishScore + 12 ? "Bullish" : bearishScore >= bullishScore + 12 ? "Bearish" : "Neutral";
  const marketCondition: MultiTimeframeBias["marketCondition"] =
    bullishReversal && daily?.trend === "Bearish"
      ? "Bullish Recovery"
      : bearishReversal && daily?.trend === "Bullish"
        ? "Bearish Rejection"
        : overallBias === "Bullish" && lowerBullish >= 2
          ? "Bullish Continuation"
          : overallBias === "Bearish" && lowerBearish >= 2
            ? "Bearish Continuation"
            : neutralScore >= 75
              ? "Range / No Trade"
              : "Mixed / Wait";
  const recommendedAction: MultiTimeframeBias["recommendedAction"] =
    bullishScore >= 75 && bullishScore >= bearishScore + 15
      ? "BUY"
      : bearishScore >= 75 && bearishScore >= bullishScore + 15
        ? "SELL"
        : bullishScore >= bearishScore + 12
          ? "BUY WATCH"
          : bearishScore >= bullishScore + 12
            ? "SELL WATCH"
            : neutralScore >= 78
              ? "NO TRADE"
              : "HOLD";

  return {
    rows: usableRows,
    bullishScore,
    bearishScore,
    neutralScore,
    overallBias,
    marketCondition,
    previousBiasStatus,
    recommendedAction,
    bullishReversal,
    bearishReversal
  };
}

export function analyzeSignal(params: {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  multiTimeframeCandles?: Partial<Record<AlignmentTimeframe, Candle[]>>;
}): {
  signal: SignalResult;
  indicators: ReturnType<typeof calculateIndicators>["snapshot"];
  indicatorSeries: ReturnType<typeof calculateIndicators>["series"];
} {
  const { symbol, timeframe, candles } = params;
  const { snapshot, series } = calculateIndicators(candles);
  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2] ?? current;
  const price = current.close;
  const profile = PROFILE[timeframe];
  const ema50 = snapshot.ema50;
  const ema200 = snapshot.ema200;
  const rsi = snapshot.rsi14;
  const macdBias = snapshot.macd.bias;
  const candlePattern = snapshot.candlePattern.toLowerCase();
  const closes = candles.map((candle) => candle.close);
  const ema20Series = calculateEma(closes, 20);
  const ema50Series = calculateEma(closes, 50);
  const rsiSeries = calculateRsi(closes, 14);
  const atrSeries = calculateAtr(candles, 14);
  const macdSeries = calculateMacd(closes);
  const ema20 = lastNonNull(ema20Series)?.value ?? null;
  const ema20Latest = lastNonNull(ema20Series);
  const ema20Previous = ema20Latest ? previousNonNull(ema20Series, ema20Latest.index) : null;
  const ema50Latest = lastNonNull(ema50Series);
  const ema50Previous = ema50Latest ? previousNonNull(ema50Series, ema50Latest.index) : null;
  const rsiLatest = lastNonNull(rsiSeries);
  const rsiPrevious = rsiLatest ? previousNonNull(rsiSeries, rsiLatest.index) : null;
  const atr = lastNonNull(atrSeries)?.value ?? snapshot.atr14;
  const histogram = lastNonNull(macdSeries.histogram);
  const previousHistogram = histogram ? previousNonNull(macdSeries.histogram, histogram.index) : null;
  const atrPct = atr ? atr / price : 0;
  const emaSpreadAtr = ema50 !== null && ema200 !== null && atr ? Math.abs(ema50 - ema200) / atr : 0;
  const ema20Slope = ema20Latest && ema20Previous ? ema20Latest.value - ema20Previous.value : 0;
  const ema50Slope = ema50Latest && ema50Previous ? ema50Latest.value - ema50Previous.value : 0;
  const location = closeLocation(current);
  const activeSession = isGoldActiveSession(current.time, timeframe);
  const multiTimeframe = buildMultiTimeframeBias({
    selectedTimeframe: timeframe,
    selectedCandles: candles,
    multiTimeframeCandles: params.multiTimeframeCandles
  });
  const lowerBullishCount = multiTimeframe.rows.filter((row) => (row.timeframe === "5m" || row.timeframe === "15m" || row.timeframe === "30m") && row.trend === "Bullish").length;
  const lowerBearishCount = multiTimeframe.rows.filter((row) => (row.timeframe === "5m" || row.timeframe === "15m" || row.timeframe === "30m") && row.trend === "Bearish").length;
  const h1Bias = multiTimeframe.rows.find((row) => row.timeframe === "1h")?.trend ?? "Neutral";
  const volatilityOk = atr !== null && atrPct >= profile.minAtrPct && atrPct <= profile.maxAtrPct;
  const trendStrengthOk = emaSpreadAtr >= profile.minEmaSpreadAtr;
  const rsiRising = rsiLatest && rsiPrevious ? rsiLatest.value >= rsiPrevious.value - 0.8 : false;
  const rsiFalling = rsiLatest && rsiPrevious ? rsiLatest.value <= rsiPrevious.value + 0.8 : false;
  const macdImproving = histogram && previousHistogram ? histogram.value > previousHistogram.value : false;
  const macdWeakening = histogram && previousHistogram ? histogram.value < previousHistogram.value : false;
  const bullishStack =
    ema20 !== null &&
    ema50 !== null &&
    ema200 !== null &&
    ema20 >= ema50 &&
    ema50 > ema200 &&
    price > ema50 &&
    ema50Slope > 0;
  const bearishStack =
    ema20 !== null &&
    ema50 !== null &&
    ema200 !== null &&
    ema20 <= ema50 &&
    ema50 < ema200 &&
    price < ema50 &&
    ema50Slope < 0;
  const m15BullishTrend =
    timeframe === "15m" &&
    ema20 !== null &&
    ema50 !== null &&
    ema200 !== null &&
    price > ema50 &&
    ema20 >= ema50 &&
    ema50 >= ema200 &&
    ema50Slope >= 0;
  const m15BearishTrend =
    timeframe === "15m" &&
    ema20 !== null &&
    ema50 !== null &&
    ema200 !== null &&
    price < ema50 &&
    ema20 <= ema50 &&
    ema50 <= ema200 &&
    ema50Slope <= 0;
  const m30BullishTrend =
    timeframe === "30m" &&
    ema20 !== null &&
    ema50 !== null &&
    ema200 !== null &&
    atr !== null &&
    price > ema50 &&
    ema20 >= ema50 - atr * 0.08 &&
    ema50 >= ema200 - atr * 0.12;
  const m30BearishTrend =
    timeframe === "30m" &&
    ema20 !== null &&
    ema50 !== null &&
    ema200 !== null &&
    atr !== null &&
    price < ema50 &&
    ema20 <= ema50 + atr * 0.08 &&
    ema50 <= ema200 + atr * 0.12;
  const h4BullishTrend =
    timeframe === "4h" &&
    ema20 !== null &&
    ema50 !== null &&
    atr !== null &&
    price > ema50 &&
    ema20 >= ema50 - atr * 0.2 &&
    ema20Slope >= -atr * 0.1;
  const h4BearishTrend =
    timeframe === "4h" &&
    ema20 !== null &&
    ema50 !== null &&
    atr !== null &&
    price < ema50 &&
    ema20 <= ema50 + atr * 0.2 &&
    ema20Slope <= atr * 0.1;
  const h1BullishTrend =
    timeframe === "1h" &&
    ema20 !== null &&
    ema50 !== null &&
    ema200 !== null &&
    atr !== null &&
    ema20 >= ema50 &&
    ema50 > ema200 &&
    price > ema50 &&
    ema50Slope >= -atr * 0.03;
  const h1BearishTrend =
    timeframe === "1h" &&
    ema20 !== null &&
    ema50 !== null &&
    ema200 !== null &&
    atr !== null &&
    ema20 <= ema50 &&
    ema50 < ema200 &&
    price < ema50 &&
    ema50Slope <= atr * 0.03;
  const bullishTrendFilter = bullishStack || h1BullishTrend || m15BullishTrend || m30BullishTrend || h4BullishTrend;
  const bearishTrendFilter = bearishStack || h1BearishTrend || m15BearishTrend || m30BearishTrend || h4BearishTrend;
  const distanceFromEma50Atr = ema50 !== null && atr ? Math.abs(price - ema50) / atr : Number.POSITIVE_INFINITY;
  const notOverextended = distanceFromEma50Atr <= profile.maxDistanceFromEmaAtr;
  const pulledBackLong =
    ema20 !== null &&
    ema50 !== null &&
    atr !== null &&
    (current.low <= ema20 + atr * 0.25 ||
      previous.low <= ema20 + atr * 0.25 ||
      current.low <= ema50 + atr * 0.35 ||
      snapshot.rejectsSupport);
  const pulledBackShort =
    ema20 !== null &&
    ema50 !== null &&
    atr !== null &&
    (current.high >= ema20 - atr * 0.25 ||
      previous.high >= ema20 - atr * 0.25 ||
      current.high >= ema50 - atr * 0.35 ||
      snapshot.rejectsResistance);
  const bullishCandleTrigger =
    location >= 0.58 &&
    (isBullishPattern(candlePattern) || (ema20 !== null && current.close > ema20) || snapshot.rejectsSupport);
  const bearishCandleTrigger =
    location <= 0.42 &&
    (isBearishPattern(candlePattern) || (ema20 !== null && current.close < ema20) || snapshot.rejectsResistance);
  const longMomentum = rsi !== null && rsi >= 42 && rsi <= 64 && rsiRising && (macdBias === "bullish" || macdImproving);
  const shortMomentum = rsi !== null && rsi >= 36 && rsi <= 58 && rsiFalling && (macdBias === "bearish" || macdWeakening);
  const h1LongMomentum = timeframe === "1h" && rsi !== null && rsi >= 48 && rsi <= 62;
  const h1ShortMomentum = timeframe === "1h" && rsi !== null && rsi >= 38 && rsi <= 52;
  const h1LongEntryQuality = timeframe === "1h" && location >= 0.55;
  const h1ShortEntryQuality = timeframe === "1h" && location <= 0.45;
  const m15LongMomentum = timeframe === "15m" && rsi !== null && rsi >= 25 && rsi <= 75 && (macdBias === "bullish" || macdImproving);
  const m15ShortMomentum =
    timeframe === "15m" && rsi !== null && rsi >= 25 && rsi <= 75 && (macdBias === "bearish" || macdWeakening);
  const m30LongMomentum = timeframe === "30m" && rsi !== null && rsi >= 42 && rsi <= 66 && (macdBias === "bullish" || macdImproving);
  const m30ShortMomentum = timeframe === "30m" && rsi !== null && rsi >= 34 && rsi <= 58 && (macdBias === "bearish" || macdWeakening);
  const h4LongMomentum = timeframe === "4h" && rsi !== null && rsi >= 50 && rsi <= 80 && (macdBias === "bullish" || macdImproving);
  const h4ShortMomentum = timeframe === "4h" && rsi !== null && rsi >= 20 && rsi <= 50 && (macdBias === "bearish" || macdWeakening);
  const h1LongPullbackSetup =
    h1BullishTrend &&
    trendStrengthOk &&
    pulledBackLong &&
    h1LongMomentum &&
    h1LongEntryQuality &&
    notOverextended &&
    volatilityOk &&
    activeSession;
  const h1ShortPullbackSetup =
    h1BearishTrend &&
    trendStrengthOk &&
    pulledBackShort &&
    h1ShortMomentum &&
    h1ShortEntryQuality &&
    notOverextended &&
    volatilityOk &&
    activeSession;
  const m15LongMomentumSetup =
    m15BullishTrend && trendStrengthOk && m15LongMomentum && notOverextended && volatilityOk && activeSession;
  const m15ShortMomentumSetup =
    m15BearishTrend && trendStrengthOk && m15ShortMomentum && notOverextended && volatilityOk && activeSession;
  const m30LongPullbackSetup =
    m30BullishTrend && trendStrengthOk && pulledBackLong && m30LongMomentum && notOverextended && volatilityOk && activeSession;
  const m30ShortPullbackSetup =
    m30BearishTrend && trendStrengthOk && pulledBackShort && m30ShortMomentum && notOverextended && volatilityOk && activeSession;
  const h4LongMomentumSetup = h4BullishTrend && trendStrengthOk && h4LongMomentum && notOverextended && volatilityOk;
  const h4ShortMomentumSetup = h4BearishTrend && trendStrengthOk && h4ShortMomentum && notOverextended && volatilityOk;
  const tunedLongSetup = h1LongPullbackSetup || m15LongMomentumSetup || m30LongPullbackSetup || h4LongMomentumSetup;
  const tunedShortSetup = h1ShortPullbackSetup || m15ShortMomentumSetup || m30ShortPullbackSetup || h4ShortMomentumSetup;
  const bullishTrigger = bullishCandleTrigger || tunedLongSetup;
  const bearishTrigger = bearishCandleTrigger || tunedShortSetup;

  // Precision trend-pullback rules are intentionally conservative and non-executing.
  // They prefer H1/H4-style gold continuation setups, reject noisy lower-timeframe
  // overtrading, and only allow Buy/Sell when trend, pullback, session, volatility,
  // momentum, and candle trigger agree.
  const buyRules = [
    rule("London/New York liquidity window", activeSession, 8, "Intraday XAUUSD signals are filtered to active liquidity hours."),
    rule("M5/M15/M30 bullish alignment", lowerBullishCount >= 2 && h1Bias !== "Bearish", 16, `${lowerBullishCount}/3 lower timeframes are bullish; H1 is ${h1Bias}.`),
    rule("Bullish EMA trend stack", bullishTrendFilter, 20, "EMA trend is aligned with positive H1 tolerance."),
    rule("Trend strength above ATR filter", trendStrengthOk, 12, "EMA separation is large enough versus ATR to avoid chop."),
    rule(
      timeframe === "15m" || timeframe === "4h" ? "Trend momentum continuation" : "Pullback to EMA or support",
      pulledBackLong || m15LongMomentumSetup || h4LongMomentumSetup,
      18,
      timeframe === "15m" || timeframe === "4h"
        ? "Momentum continuation is aligned with trend and MACD."
        : "Price has pulled back into EMA/support instead of chasing extension."
    ),
    rule(
      timeframe === "1h"
        ? "H1 EMA pullback entry"
        : timeframe === "15m"
          ? "M15 momentum entry"
          : timeframe === "30m"
            ? "M30 EMA pullback entry"
            : timeframe === "4h"
              ? "H4 swing momentum entry"
              : "Bullish trigger candle",
      bullishTrigger,
      14,
      timeframe === "1h"
        ? "H1 gold setup accepts controlled EMA pullbacks inside the main trend."
        : timeframe === "15m"
          ? "M15 setup uses fast trend momentum inside London/New York hours."
          : timeframe === "30m"
            ? "M30 setup requires a controlled EMA pullback."
            : timeframe === "4h"
              ? "H4 setup uses wider-stop swing momentum."
        : "Latest candle closes in the upper range or confirms rejection."
    ),
    rule(
      "RSI pullback momentum",
      longMomentum || h1LongMomentum || m15LongMomentum || m30LongMomentum || h4LongMomentum,
      12,
      "RSI is constructive without being overbought."
    ),
    rule("MACD confirms long pressure", macdBias === "bullish" || macdImproving, 10, "MACD is bullish or histogram is improving."),
    rule("Not overextended from EMA 50", notOverextended, 8, "Entry is close enough to EMA 50 for realistic risk/reward."),
    rule("ATR volatility acceptable", volatilityOk, 8, "ATR is neither too dead nor too explosive for the timeframe."),
    rule(
      "Bullish candle pattern",
      candlePattern.includes("bullish") || candlePattern.includes("support"),
      5,
      `Detected ${snapshot.candlePattern}.`
    )
  ];

  const sellRules = [
    rule("London/New York liquidity window", activeSession, 8, "Intraday XAUUSD signals are filtered to active liquidity hours."),
    rule("M5/M15/M30 bearish alignment", lowerBearishCount >= 2 && h1Bias !== "Bullish", 16, `${lowerBearishCount}/3 lower timeframes are bearish; H1 is ${h1Bias}.`),
    rule("Bearish EMA trend stack", bearishTrendFilter, 20, "EMA trend is aligned with negative H1 tolerance."),
    rule("Trend strength above ATR filter", trendStrengthOk, 12, "EMA separation is large enough versus ATR to avoid chop."),
    rule(
      timeframe === "15m" || timeframe === "4h" ? "Trend momentum continuation" : "Pullback to EMA or resistance",
      pulledBackShort || m15ShortMomentumSetup || h4ShortMomentumSetup,
      18,
      timeframe === "15m" || timeframe === "4h"
        ? "Momentum continuation is aligned with trend and MACD."
        : "Price has pulled back into EMA/resistance instead of chasing extension."
    ),
    rule(
      timeframe === "1h"
        ? "H1 EMA pullback entry"
        : timeframe === "15m"
          ? "M15 momentum entry"
          : timeframe === "30m"
            ? "M30 EMA pullback entry"
            : timeframe === "4h"
              ? "H4 swing momentum entry"
              : "Bearish trigger candle",
      bearishTrigger,
      14,
      timeframe === "1h"
        ? "H1 gold setup accepts controlled EMA pullbacks inside the main trend."
        : timeframe === "15m"
          ? "M15 setup uses fast trend momentum inside London/New York hours."
          : timeframe === "30m"
            ? "M30 setup requires a controlled EMA pullback."
            : timeframe === "4h"
              ? "H4 setup uses wider-stop swing momentum."
        : "Latest candle closes in the lower range or confirms rejection."
    ),
    rule(
      "RSI pullback momentum",
      shortMomentum || h1ShortMomentum || m15ShortMomentum || m30ShortMomentum || h4ShortMomentum,
      12,
      "RSI allows downside without being oversold."
    ),
    rule("MACD confirms short pressure", macdBias === "bearish" || macdWeakening, 10, "MACD is bearish or histogram is weakening."),
    rule("Not overextended from EMA 50", notOverextended, 8, "Entry is close enough to EMA 50 for realistic risk/reward."),
    rule("ATR volatility acceptable", volatilityOk, 8, "ATR is neither too dead nor too explosive for the timeframe."),
    rule(
      "Bearish candle pattern",
      candlePattern.includes("bearish") || candlePattern.includes("resistance"),
      5,
      `Detected ${snapshot.candlePattern}.`
    )
  ];

  const buyScore = scoreRules(buyRules);
  const sellScore = scoreRules(sellRules);
  const buyRuleScore = clamp((buyScore / 131) * 100, 0, 100);
  const sellRuleScore = clamp((sellScore / 131) * 100, 0, 100);
  const bullishDecisionScore = Math.round(
    clamp(
      buyRuleScore * 0.56 +
        multiTimeframe.bullishScore * 0.44 +
        (multiTimeframe.bullishReversal ? 7 : 0) -
        (multiTimeframe.previousBiasStatus === "Buy Invalidated" ? 10 : 0),
      0,
      100
    )
  );
  const bearishDecisionScore = Math.round(
    clamp(
      sellRuleScore * 0.56 +
        multiTimeframe.bearishScore * 0.44 +
        (multiTimeframe.bearishReversal ? 7 : 0) -
        (multiTimeframe.previousBiasStatus === "Sell Invalidated" ? 10 : 0),
      0,
      100
    )
  );
  const neutralDecisionScore = Math.round(clamp((multiTimeframe.neutralScore + (snapshot.trend === "ranging" ? 85 : 35)) / 2, 0, 100));
  multiTimeframe.bullishScore = bullishDecisionScore;
  multiTimeframe.bearishScore = bearishDecisionScore;
  multiTimeframe.neutralScore = neutralDecisionScore;
  multiTimeframe.overallBias = bullishDecisionScore >= bearishDecisionScore + 12 ? "Bullish" : bearishDecisionScore >= bullishDecisionScore + 12 ? "Bearish" : "Neutral";
  multiTimeframe.recommendedAction =
    bullishDecisionScore >= 75 && bullishDecisionScore >= bearishDecisionScore + 15
      ? "BUY"
      : bearishDecisionScore >= 75 && bearishDecisionScore >= bullishDecisionScore + 15
        ? "SELL"
        : bullishDecisionScore >= bearishDecisionScore + 12
          ? "BUY WATCH"
          : bearishDecisionScore >= bullishDecisionScore + 12
            ? "SELL WATCH"
            : neutralDecisionScore >= 78 || snapshot.trend === "ranging"
              ? "NO TRADE"
              : "HOLD";
  const bestDirection = bullishDecisionScore >= bearishDecisionScore ? "long" : "short";
  const bestScore = Math.max(bullishDecisionScore, bearishDecisionScore);
  const separation = Math.abs(bullishDecisionScore - bearishDecisionScore);
  const trendPenalty = snapshot.trend === "ranging" ? 12 : 0;
  const longCore =
    bullishStack && trendStrengthOk && pulledBackLong && bullishTrigger && longMomentum && notOverextended && volatilityOk && activeSession;
  const shortCore =
    bearishStack && trendStrengthOk && pulledBackShort && bearishTrigger && shortMomentum && notOverextended && volatilityOk && activeSession;
  const h1LongCore =
    h1LongPullbackSetup ||
    (h1BullishTrend &&
      trendStrengthOk &&
      pulledBackLong &&
      bullishTrigger &&
      h1LongMomentum &&
      notOverextended &&
      volatilityOk &&
      activeSession);
  const h1ShortCore =
    h1ShortPullbackSetup ||
    (h1BearishTrend &&
      trendStrengthOk &&
      pulledBackShort &&
      bearishTrigger &&
      h1ShortMomentum &&
      notOverextended &&
      volatilityOk &&
      activeSession);
  const tunedLongCore = h1LongCore || m15LongMomentumSetup || m30LongPullbackSetup || h4LongMomentumSetup;
  const tunedShortCore = h1ShortCore || m15ShortMomentumSetup || m30ShortPullbackSetup || h4ShortMomentumSetup;
  const bullishRecoveryCore =
    multiTimeframe.bullishReversal &&
    ema50 !== null &&
    price > ema50 &&
    rsi !== null &&
    rsi >= 50 &&
    (macdBias === "bullish" || macdImproving) &&
    activeSession &&
    volatilityOk;
  const freshBullishAlignmentCore =
    lowerBullishCount >= 2 &&
    h1Bias !== "Bearish" &&
    buyRuleScore >= 78 &&
    rsi !== null &&
    rsi >= 50 &&
    (macdBias === "bullish" || macdImproving) &&
    activeSession &&
    volatilityOk;
  const bearishRejectionCore =
    multiTimeframe.bearishReversal &&
    ema50 !== null &&
    price < ema50 &&
    rsi !== null &&
    rsi <= 50 &&
    (macdBias === "bearish" || macdWeakening) &&
    activeSession &&
    volatilityOk;
  const freshBearishAlignmentCore =
    lowerBearishCount >= 2 &&
    h1Bias !== "Bullish" &&
    sellRuleScore >= 78 &&
    rsi !== null &&
    rsi <= 50 &&
    (macdBias === "bearish" || macdWeakening) &&
    activeSession &&
    volatilityOk;
  const coreConfirmed = bestDirection === "long" ? longCore || tunedLongCore || bullishRecoveryCore || freshBullishAlignmentCore : shortCore || tunedShortCore || bearishRejectionCore || freshBearishAlignmentCore;
  const technicalConfidence = clamp(Math.round(bestScore - trendPenalty - (coreConfirmed ? 0 : 30)), 0, 100);
  const sessionScore = activeSession ? 92 : profile.activeSessionOnly ? 36 : 78;
  const newsRisk: SignalResult["newsRisk"] = atrPct > profile.maxAtrPct * 0.82 ? "High" : atrPct > profile.maxAtrPct * 0.58 ? "Medium" : "Low";
  const newsScore = newsRisk === "Low" ? 90 : newsRisk === "Medium" ? 68 : 35;
  const riskScore = Math.round(
    clamp(
      (notOverextended ? 34 : 8) +
        (volatilityOk ? 28 : 8) +
        (trendStrengthOk ? 20 : 8) +
        (activeSession || !profile.activeSessionOnly ? 18 : 5),
      0,
      100
    )
  );
  const weightedConfidence = buildWeightedConfidence({
    technical: technicalConfidence,
    newsScore,
    sessionScore,
    riskScore
  });
  let confidence = technicalConfidence;

  let signalType: SignalType = "HOLD";

  if (
    bestDirection === "long" &&
    coreConfirmed &&
    bullishDecisionScore >= 75 &&
    separation >= 15 &&
    multiTimeframe.marketCondition !== "Range / No Trade" &&
    newsRisk !== "High"
  ) {
    signalType = "BUY";
  } else if (
    bestDirection === "short" &&
    coreConfirmed &&
    bearishDecisionScore >= 75 &&
    separation >= 15 &&
    multiTimeframe.marketCondition !== "Range / No Trade" &&
    newsRisk !== "High"
  ) {
    signalType = "SELL";
  }

  confidence = signalType === "HOLD" ? Math.min(technicalConfidence, weightedConfidence.final) : weightedConfidence.final;

  const bias = signalType === "BUY" ? "long" : signalType === "SELL" ? "short" : bestDirection;
  const activeRules = bestDirection === "long" ? buyRules : sellRules;
  const displayRules = activeRules;
  const matchedRules = activeRules.filter((item) => item.matched);
  const failedRules = activeRules.filter((item) => !item.matched);
  const riskLevels = buildRiskLevelsForTimeframe(
    candles,
    timeframe,
    bias === "short" ? "short" : "long",
    snapshot.atr14
  );
  const trendStrength = Math.round(clamp(emaSpreadAtr * 24 + (trendStrengthOk ? 48 : 18), 0, 100));
  const alignmentFactors = multiTimeframe.rows
    .filter((row) => row.trend !== "Neutral")
    .map((row) => `${row.timeframe.toUpperCase()} ${row.trend.toLowerCase()}`);
  const positiveFactors = [
    ...displayRules.filter((item) => item.matched).map((item) => item.label),
    ...alignmentFactors,
    multiTimeframe.previousBiasStatus === "Sell Invalidated" ? "Previous SELL bias invalidated" : "",
    multiTimeframe.previousBiasStatus === "Buy Invalidated" ? "Previous BUY bias invalidated" : ""
  ].filter(Boolean);
  const negativeFactors = [
    ...displayRules.filter((item) => !item.matched).map((item) => item.label),
    multiTimeframe.overallBias === "Neutral" ? "Multi-timeframe alignment mixed" : "",
    newsRisk === "High" ? "High news risk" : ""
  ].filter(Boolean).slice(0, 8);
  const tradeManagement = buildTradeManagementPlan({
    direction: signalType === "BUY" ? "long" : signalType === "SELL" ? "short" : "neutral",
    entry: riskLevels.entryPrice,
    currentPrice: price,
    atr: snapshot.atr14,
    confidence,
    riskScore,
    sessionScore,
    newsScore
  });
  return {
    indicators: snapshot,
    indicatorSeries: series,
    signal: {
      symbol,
      timeframe,
      signalType,
      strength: buildStrength(signalType, confidence),
      confidence,
      ...riskLevels,
      riskPercent: DEFAULT_RISK_PERCENT,
      explanation: explanationFor(signalType, confidence, matchedRules, failedRules, multiTimeframe),
      rules: displayRules,
      bias: signalType === "HOLD" ? "neutral" : bias,
      createdAt: new Date().toISOString(),
      weightedConfidence,
      tradeManagement,
      positiveFactors,
      negativeFactors,
      newsRisk,
      sessionScore,
      riskScore,
      trendStrength,
      multiTimeframe,
      marketCondition: multiTimeframe.marketCondition,
      recommendedAction: multiTimeframe.recommendedAction,
      bullishScore: bullishDecisionScore,
      bearishScore: bearishDecisionScore,
      neutralScore: neutralDecisionScore,
      previousBiasStatus: multiTimeframe.previousBiasStatus
    }
  };
}
