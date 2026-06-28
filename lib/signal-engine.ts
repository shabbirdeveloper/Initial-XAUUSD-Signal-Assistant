import { calculateAtr, calculateEma, calculateIndicators, calculateMacd, calculateRsi } from "@/lib/indicators";
import { analyzeSmartMoneyConcepts } from "@/lib/smc-engine";
import {
  type Candle,
  type EliteSetup,
  type SmcAnalysis,
  type SmcGrade,
  type SignalResult,
  type SignalRuleResult,
  type SignalStrength,
  type SignalType,
  type TradeManagementPlan,
  type WeightedConfidence,
  type Timeframe
} from "@/lib/types";
import { clamp, roundTo } from "@/lib/utils";

const DEFAULT_RISK_PERCENT = 1;

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

function gradeFromScore(score: number): SmcGrade {
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
  smcScore: number;
  riskScore: number;
}): WeightedConfidence {
  const final = Math.round(
    params.technical * 0.4 +
      params.newsScore * 0.2 +
      params.sessionScore * 0.15 +
      params.smcScore * 0.15 +
      params.riskScore * 0.1
  );

  return {
    technical: Math.round(params.technical),
    news: Math.round(params.newsScore),
    session: Math.round(params.sessionScore),
    smc: Math.round(params.smcScore),
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

function buildEliteSetup(params: {
  signalType: SignalType;
  confidence: number;
  weighted: WeightedConfidence;
  smc: SmcAnalysis;
  emaAligned: boolean;
  rsiConfirmed: boolean;
  macdConfirmed: boolean;
  fvgRetest: boolean;
  sessionActive: boolean;
  newsSafe: boolean;
  riskAcceptable: boolean;
}): EliteSetup {
  const smcDirection = params.signalType === "BUY" ? "bullish" : params.signalType === "SELL" ? "bearish" : "neutral";
  const detected =
    params.signalType !== "HOLD" &&
    params.weighted.final >= 95 &&
    params.emaAligned &&
    params.rsiConfirmed &&
    params.macdConfirmed &&
    params.smc.bos.confirmed &&
    params.smc.bos.direction === smcDirection &&
    params.smc.choch.confirmed &&
    params.smc.choch.direction === smcDirection &&
    params.smc.liquidity.confirmed &&
    params.smc.liquidity.direction === smcDirection &&
    params.fvgRetest &&
    params.smc.fvg.direction === smcDirection &&
    params.sessionActive &&
    params.newsSafe &&
    params.riskAcceptable;

  return {
    detected,
    direction: params.signalType,
    confidence: params.weighted.final,
    quality: detected ? "A+" : params.weighted.grade,
    expectedRiskReward: 2,
    reasons: [
      params.emaAligned ? "EMA Trend Aligned" : "EMA trend incomplete",
      params.rsiConfirmed ? "RSI Confirmed" : "RSI not confirmed",
      params.macdConfirmed ? "MACD Confirmed" : "MACD not confirmed",
      params.smc.bos.confirmed ? params.smc.bos.status : "BOS not confirmed",
      params.smc.choch.confirmed ? params.smc.choch.status : "CHoCH not confirmed",
      params.smc.liquidity.confirmed ? params.smc.liquidity.status : "Liquidity sweep missing",
      params.fvgRetest ? "FVG Retest" : "FVG retest missing",
      params.sessionActive ? "Session Active" : "Session inactive",
      params.newsSafe ? "News Safe" : "News risk elevated",
      params.riskAcceptable ? "Risk Acceptable" : "Risk filter weak"
    ]
  };
}

function explanationFor(signal: SignalType, confidence: number, matchedRules: SignalRuleResult[], failedRules: SignalRuleResult[]) {
  const passed = matchedRules.map((item) => item.label.toLowerCase()).slice(0, 4);
  const missing = failedRules.map((item) => item.label.toLowerCase()).slice(0, 3);

  if (signal === "HOLD") {
    return `Hold: confidence is ${confidence}% because the precision filter is not complete. Missing or weak factors include ${missing.join(", ") || "follow-through"}. Wait for trend stack, pullback/rejection, momentum, session, and volatility alignment.`;
  }

  return `${signal}: confidence is ${confidence}% with ${passed.join(", ")}. Precision trend-pullback setup only; manage risk at 1%, use the ATR-capped swing stop, and treat TP1/TP2 as planning levels only.`;
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

export function analyzeSignal(params: {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
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
  const volatilityOk = atr !== null && atrPct >= profile.minAtrPct && atrPct <= profile.maxAtrPct;
  const trendStrengthOk = emaSpreadAtr >= profile.minEmaSpreadAtr;
  const smc = analyzeSmartMoneyConcepts({ candles, timeframe, atr });
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
  const bestDirection = buyScore >= sellScore ? "long" : "short";
  const bestScore = Math.max(buyScore, sellScore);
  const separation = Math.abs(buyScore - sellScore);
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
  const coreConfirmed = bestDirection === "long" ? longCore || tunedLongCore : shortCore || tunedShortCore;
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
    smcScore: smc.score,
    riskScore
  });
  let confidence = technicalConfidence;

  let signalType: SignalType = bestDirection === "long" ? "BUY" : "SELL";

  if (
    !coreConfirmed ||
    confidence < profile.minConfidence ||
    separation < profile.minSeparation ||
    snapshot.trend === "ranging"
  ) {
    signalType = "HOLD";
  }

  confidence = signalType === "HOLD" ? Math.min(technicalConfidence, weightedConfidence.final) : weightedConfidence.final;

  const bias = signalType === "BUY" ? "long" : signalType === "SELL" ? "short" : bestDirection;
  const activeRules = bestDirection === "long" ? buyRules : sellRules;
  const smcDirection = bestDirection === "long" ? "bullish" : "bearish";
  const smcRules = [
    rule("BOS Confirmed", smc.bos.confirmed && smc.bos.direction === smcDirection, 15, `${smc.bos.status} strength ${smc.bos.strength}/100.`),
    rule("CHoCH Confirmed", smc.choch.confirmed && smc.choch.direction === smcDirection, 15, `${smc.choch.status} confidence ${smc.choch.confidence}/100.`),
    rule(
      "Liquidity Sweep Present",
      smc.liquidity.confirmed && smc.liquidity.direction === smcDirection,
      10,
      `${smc.liquidity.status} strength ${smc.liquidity.strength}/100.`
    ),
    rule("FVG Retest", smc.fvg.confirmed && smc.fvg.direction === smcDirection, 10, `${smc.fvg.status}; distance ${smc.fvg.distance ?? "--"} points.`)
  ];
  const displayRules = [...activeRules, ...smcRules];
  const matchedRules = activeRules.filter((item) => item.matched);
  const failedRules = activeRules.filter((item) => !item.matched);
  const riskLevels = buildRiskLevelsForTimeframe(
    candles,
    timeframe,
    bias === "short" ? "short" : "long",
    snapshot.atr14
  );
  const trendStrength = Math.round(clamp(emaSpreadAtr * 24 + (trendStrengthOk ? 48 : 18), 0, 100));
  const positiveFactors = displayRules.filter((item) => item.matched).map((item) => item.label);
  const negativeFactors = displayRules.filter((item) => !item.matched).map((item) => item.label).slice(0, 8);
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
  const eliteSetup = buildEliteSetup({
    signalType,
    confidence,
    weighted: weightedConfidence,
    smc,
    emaAligned: bestDirection === "long" ? bullishTrendFilter : bearishTrendFilter,
    rsiConfirmed:
      bestDirection === "long"
        ? Boolean(longMomentum || h1LongMomentum || m15LongMomentum || m30LongMomentum || h4LongMomentum)
        : Boolean(shortMomentum || h1ShortMomentum || m15ShortMomentum || m30ShortMomentum || h4ShortMomentum),
    macdConfirmed: bestDirection === "long" ? macdBias === "bullish" || macdImproving : macdBias === "bearish" || macdWeakening,
    fvgRetest: smc.fvg.confirmed,
    sessionActive: activeSession,
    newsSafe: newsRisk !== "High",
    riskAcceptable: riskScore >= 70
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
      explanation: explanationFor(signalType, confidence, matchedRules, failedRules),
      rules: displayRules,
      bias: signalType === "HOLD" ? "neutral" : bias,
      createdAt: new Date().toISOString(),
      smc,
      weightedConfidence,
      eliteSetup,
      tradeManagement,
      positiveFactors,
      negativeFactors,
      newsRisk,
      sessionScore,
      riskScore,
      trendStrength
    }
  };
}
