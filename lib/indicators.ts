import {
  type Candle,
  type IndicatorSeries,
  type IndicatorSnapshot,
  type MacdBias,
  type PriceZone,
  type TrendDirection
} from "@/lib/types";

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

export function calculateEma(values: number[], period: number): NullableNumber[] {
  const result: NullableNumber[] = Array(values.length).fill(null);

  if (values.length < period) {
    return result;
  }

  const multiplier = 2 / (period + 1);
  let seed = 0;

  for (let index = 0; index < period; index += 1) {
    seed += values[index];
  }

  let previous = seed / period;
  result[period - 1] = previous;

  for (let index = period; index < values.length; index += 1) {
    previous = (values[index] - previous) * multiplier + previous;
    result[index] = previous;
  }

  return result;
}

export function calculateRsi(values: number[], period = 14): NullableNumber[] {
  const result: NullableNumber[] = Array(values.length).fill(null);

  if (values.length <= period) {
    return result;
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  result[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    result[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }

  return result;
}

export function calculateAtr(candles: Candle[], period = 14): NullableNumber[] {
  const trueRanges = candles.map((candle, index) => {
    if (index === 0) {
      return candle.high - candle.low;
    }

    const previousClose = candles[index - 1].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });

  const result: NullableNumber[] = Array(candles.length).fill(null);

  if (candles.length < period) {
    return result;
  }

  let seed = 0;
  for (let index = 0; index < period; index += 1) {
    seed += trueRanges[index];
  }

  let previous = seed / period;
  result[period - 1] = previous;

  for (let index = period; index < trueRanges.length; index += 1) {
    previous = (previous * (period - 1) + trueRanges[index]) / period;
    result[index] = previous;
  }

  return result;
}

export function calculateMacd(values: number[]) {
  const ema12 = calculateEma(values, 12);
  const ema26 = calculateEma(values, 26);
  const macdLine: NullableNumber[] = values.map((_, index) => {
    const fast = ema12[index];
    const slow = ema26[index];
    return fast !== null && slow !== null ? fast - slow : null;
  });

  const compactMacd = macdLine.filter((value): value is number => value !== null);
  const compactSignal = calculateEma(compactMacd, 9);
  const signalLine: NullableNumber[] = Array(values.length).fill(null);
  const histogram: NullableNumber[] = Array(values.length).fill(null);

  let compactIndex = -1;
  for (let index = 0; index < macdLine.length; index += 1) {
    const macd = macdLine[index];
    if (macd === null) {
      continue;
    }

    compactIndex += 1;
    const signal = compactSignal[compactIndex];
    signalLine[index] = signal;
    histogram[index] = signal !== null ? macd - signal : null;
  }

  return { macdLine, signalLine, histogram };
}

function detectMacdBias(macdLine: NullableNumber[], signalLine: NullableNumber[], histogram: NullableNumber[]): MacdBias {
  const macd = lastNonNull(macdLine);
  const signal = lastNonNull(signalLine);
  const hist = lastNonNull(histogram);

  if (!macd || !signal || !hist) {
    return "neutral";
  }

  const previousHist = previousNonNull(histogram, hist.index);

  if (macd.value > signal.value && hist.value >= 0) {
    return "bullish";
  }

  if (macd.value < signal.value && hist.value <= 0) {
    return "bearish";
  }

  if (previousHist && hist.value > previousHist.value) {
    return "improving";
  }

  if (previousHist && hist.value < previousHist.value) {
    return "weakening";
  }

  return "neutral";
}

function detectCandlePattern(candles: Candle[]) {
  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  if (!current || !previous) {
    return "Insufficient candles";
  }

  const range = Math.max(current.high - current.low, 0.01);
  const body = Math.abs(current.close - current.open);
  const upperWick = current.high - Math.max(current.open, current.close);
  const lowerWick = Math.min(current.open, current.close) - current.low;
  const isBullish = current.close > current.open;
  const isBearish = current.close < current.open;

  if (body / range < 0.12) {
    return "Doji";
  }

  if (lowerWick > body * 1.8 && lowerWick > upperWick * 1.4) {
    return isBullish ? "Bullish rejection" : "Support rejection wick";
  }

  if (upperWick > body * 1.8 && upperWick > lowerWick * 1.4) {
    return isBearish ? "Bearish rejection" : "Resistance rejection wick";
  }

  const bullishEngulfing =
    isBullish &&
    previous.close < previous.open &&
    current.close >= previous.open &&
    current.open <= previous.close;

  if (bullishEngulfing) {
    return "Bullish engulfing";
  }

  const bearishEngulfing =
    isBearish &&
    previous.close > previous.open &&
    current.close <= previous.open &&
    current.open >= previous.close;

  if (bearishEngulfing) {
    return "Bearish engulfing";
  }

  return isBullish ? "Bullish candle" : "Bearish candle";
}

function makeZone(type: PriceZone["type"], price: number, width: number, touches = 1): PriceZone {
  return {
    type,
    price,
    low: price - width,
    high: price + width,
    touches
  };
}

function findZones(candles: Candle[], currentPrice: number, atr: number | null) {
  const lookback = candles.slice(-120);
  const supportPivots: number[] = [];
  const resistancePivots: number[] = [];

  for (let index = 2; index < lookback.length - 2; index += 1) {
    const window = lookback.slice(index - 2, index + 3);
    const candle = lookback[index];
    const pivotLow = Math.min(...window.map((item) => item.low));
    const pivotHigh = Math.max(...window.map((item) => item.high));

    if (candle.low === pivotLow) {
      supportPivots.push(candle.low);
    }

    if (candle.high === pivotHigh) {
      resistancePivots.push(candle.high);
    }
  }

  const zoneWidth = Math.max(currentPrice * 0.00075, (atr ?? currentPrice * 0.001) * 0.28);
  const tolerance = Math.max(currentPrice * 0.0015, (atr ?? currentPrice * 0.001) * 0.65);

  function groupPivots(type: PriceZone["type"], pivots: number[]) {
    const grouped: PriceZone[] = [];
    const sorted = [...pivots].sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b));

    for (const pivot of sorted) {
      const existing = grouped.find((zone) => Math.abs(zone.price - pivot) <= tolerance);
      if (existing) {
        existing.price = (existing.price * existing.touches + pivot) / (existing.touches + 1);
        existing.low = existing.price - zoneWidth;
        existing.high = existing.price + zoneWidth;
        existing.touches += 1;
      } else {
        grouped.push(makeZone(type, pivot, zoneWidth));
      }
    }

    return grouped;
  }

  const supportZones = groupPivots("support", supportPivots)
    .filter((zone) => zone.price <= currentPrice * 1.004)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  const resistanceZones = groupPivots("resistance", resistancePivots)
    .filter((zone) => zone.price >= currentPrice * 0.996)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);

  return { supportZones, resistanceZones };
}

function isRejectingZone(candle: Candle, zones: PriceZone[], atr: number | null, side: "support" | "resistance") {
  const range = Math.max(candle.high - candle.low, 0.01);
  const bodyTop = Math.max(candle.open, candle.close);
  const bodyBottom = Math.min(candle.open, candle.close);
  const lowerWick = bodyBottom - candle.low;
  const upperWick = candle.high - bodyTop;
  const tolerance = Math.max((atr ?? range) * 0.55, candle.close * 0.0009);

  if (side === "support") {
    return zones.some((zone) => {
      const touched = candle.low <= zone.high + tolerance && candle.low >= zone.low - tolerance;
      return touched && candle.close > zone.price && lowerWick >= range * 0.28;
    });
  }

  return zones.some((zone) => {
    const touched = candle.high >= zone.low - tolerance && candle.high <= zone.high + tolerance;
    return touched && candle.close < zone.price && upperWick >= range * 0.28;
  });
}

export function calculateIndicators(candles: Candle[]): {
  snapshot: IndicatorSnapshot;
  series: IndicatorSeries;
} {
  if (candles.length === 0) {
    throw new Error("At least one candle is required to calculate indicators.");
  }

  const closes = candles.map((candle) => candle.close);
  const ema50Series = calculateEma(closes, 50);
  const ema200Series = calculateEma(closes, 200);
  const rsi14Series = calculateRsi(closes, 14);
  const atr14Series = calculateAtr(candles, 14);
  const macdSeries = calculateMacd(closes);
  const current = candles[candles.length - 1];

  const ema50 = lastNonNull(ema50Series)?.value ?? null;
  const ema200 = lastNonNull(ema200Series)?.value ?? null;
  const rsi14 = lastNonNull(rsi14Series)?.value ?? null;
  const atr14 = lastNonNull(atr14Series)?.value ?? null;
  const macd = lastNonNull(macdSeries.macdLine)?.value ?? null;
  const macdSignal = lastNonNull(macdSeries.signalLine)?.value ?? null;
  const macdHistogram = lastNonNull(macdSeries.histogram)?.value ?? null;

  const trend: TrendDirection =
    ema50 !== null && ema200 !== null && current.close > ema50 && ema50 > ema200
      ? "bullish"
      : ema50 !== null && ema200 !== null && current.close < ema50 && ema50 < ema200
        ? "bearish"
        : "ranging";

  const { supportZones, resistanceZones } = findZones(candles, current.close, atr14);
  const rejectsSupport = isRejectingZone(current, supportZones, atr14, "support");
  const rejectsResistance = isRejectingZone(current, resistanceZones, atr14, "resistance");

  return {
    snapshot: {
      ema50,
      ema200,
      rsi14,
      macd: {
        macd,
        signal: macdSignal,
        histogram: macdHistogram,
        bias: detectMacdBias(macdSeries.macdLine, macdSeries.signalLine, macdSeries.histogram)
      },
      atr14,
      supportZones,
      resistanceZones,
      trend,
      candlePattern: detectCandlePattern(candles),
      rejectsSupport,
      rejectsResistance
    },
    series: {
      ema50: ema50Series
        .map((value, index) => (value === null ? null : { time: candles[index].time, value }))
        .filter((point): point is { time: string; value: number } => point !== null),
      ema200: ema200Series
        .map((value, index) => (value === null ? null : { time: candles[index].time, value }))
        .filter((point): point is { time: string; value: number } => point !== null)
    }
  };
}
