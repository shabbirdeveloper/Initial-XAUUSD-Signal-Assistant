import { type Candle, type SmcAnalysis, type SmcGrade, type Timeframe } from "@/lib/types";
import { clamp, roundTo } from "@/lib/utils";

function gradeFromScore(score: number): SmcGrade {
  if (score >= 88) return "A+";
  if (score >= 74) return "A";
  if (score >= 58) return "B";
  return "C";
}

function swingPoints(candles: Candle[], lookback = 90) {
  const sample = candles.slice(-lookback);
  const highs: Array<{ index: number; value: number }> = [];
  const lows: Array<{ index: number; value: number }> = [];
  const offset = candles.length - sample.length;

  for (let index = 2; index < sample.length - 2; index += 1) {
    const window = sample.slice(index - 2, index + 3);
    const candle = sample[index];
    const high = Math.max(...window.map((item) => item.high));
    const low = Math.min(...window.map((item) => item.low));

    if (candle.high >= high) {
      highs.push({ index: offset + index, value: candle.high });
    }

    if (candle.low <= low) {
      lows.push({ index: offset + index, value: candle.low });
    }
  }

  return { highs, lows };
}

function nearestDistance(price: number, level: number | null) {
  return level === null ? null : roundTo(Math.abs(price - level));
}

function detectFvg(candles: Candle[], currentPrice: number, atr: number | null) {
  const sample = candles.slice(-60);
  const minGap = Math.max((atr ?? currentPrice * 0.0012) * 0.12, currentPrice * 0.00012);
  const gaps: Array<{
    direction: "bullish" | "bearish";
    top: number;
    bottom: number;
    createdAt: number;
    retested: boolean;
    filled: boolean;
  }> = [];

  for (let index = 2; index < sample.length; index += 1) {
    const first = sample[index - 2];
    const third = sample[index];

    if (third.low > first.high + minGap) {
      const bottom = first.high;
      const top = third.low;
      const after = sample.slice(index + 1);
      gaps.push({
        direction: "bullish",
        top,
        bottom,
        createdAt: index,
        retested: after.some((candle) => candle.low <= top && candle.high >= bottom),
        filled: after.some((candle) => candle.low <= bottom)
      });
    }

    if (third.high < first.low - minGap) {
      const bottom = third.high;
      const top = first.low;
      const after = sample.slice(index + 1);
      gaps.push({
        direction: "bearish",
        top,
        bottom,
        createdAt: index,
        retested: after.some((candle) => candle.high >= bottom && candle.low <= top),
        filled: after.some((candle) => candle.high >= top)
      });
    }
  }

  const nearest = [...gaps].sort((first, second) => {
    const firstMid = (first.top + first.bottom) / 2;
    const secondMid = (second.top + second.bottom) / 2;
    return Math.abs(currentPrice - firstMid) - Math.abs(currentPrice - secondMid);
  })[0];

  if (!nearest) {
    return {
      status: "No FVG" as const,
      direction: "neutral" as const,
      gapCreated: false,
      gapRetested: false,
      gapFilled: false,
      nearest: null,
      distance: null,
      strength: 0,
      confirmed: false
    };
  }

  const midpoint = roundTo((nearest.top + nearest.bottom) / 2);
  const width = nearest.top - nearest.bottom;
  const freshness = clamp(100 - (sample.length - nearest.createdAt) * 2, 20, 100);
  const widthScore = clamp((width / Math.max(atr ?? currentPrice * 0.001, 1)) * 80, 15, 100);
  const strength = Math.round(clamp((freshness + widthScore + (nearest.retested ? 20 : 0) - (nearest.filled ? 25 : 0)) / 2, 0, 100));

  return {
    status: nearest.direction === "bullish" ? "Bullish FVG" as const : "Bearish FVG" as const,
    direction: nearest.direction,
    gapCreated: true,
    gapRetested: nearest.retested,
    gapFilled: nearest.filled,
    nearest: midpoint,
    distance: nearestDistance(currentPrice, midpoint),
    strength,
    confirmed: nearest.retested && !nearest.filled
  };
}

export function analyzeSmartMoneyConcepts(params: {
  candles: Candle[];
  timeframe: Timeframe;
  atr: number | null;
}): SmcAnalysis {
  const { candles, timeframe, atr } = params;
  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2] ?? current;
  const price = current.close;
  const { highs, lows } = swingPoints(candles);
  const recentHigh = highs[highs.length - 1];
  const previousHigh = highs[highs.length - 2];
  const recentLow = lows[lows.length - 1];
  const previousLow = lows[lows.length - 2];
  const tolerance = Math.max((atr ?? price * 0.0015) * 0.24, price * 0.00035);

  const bullishBos = Boolean(recentHigh && current.close > recentHigh.value + tolerance);
  const bearishBos = Boolean(recentLow && current.close < recentLow.value - tolerance);
  const bosStrength = bullishBos && recentHigh
    ? clamp(((current.close - recentHigh.value) / Math.max(atr ?? tolerance, tolerance)) * 55 + 45, 0, 100)
    : bearishBos && recentLow
      ? clamp(((recentLow.value - current.close) / Math.max(atr ?? tolerance, tolerance)) * 55 + 45, 0, 100)
      : 0;

  const madeLowerLow = Boolean(recentLow && previousLow && recentLow.value < previousLow.value - tolerance);
  const madeHigherHigh = Boolean(recentHigh && previousHigh && recentHigh.value > previousHigh.value + tolerance);
  const bullishChoch = madeLowerLow && bullishBos;
  const bearishChoch = madeHigherHigh && bearishBos;
  const chochConfidence = bullishChoch || bearishChoch ? Math.round(clamp(bosStrength * 0.7 + 22, 0, 100)) : 0;

  const equalHighSweep = Boolean(
    recentHigh &&
      Math.abs(current.high - recentHigh.value) <= tolerance * 1.6 &&
      current.high > recentHigh.value &&
      current.close < recentHigh.value
  );
  const equalLowSweep = Boolean(
    recentLow &&
      Math.abs(current.low - recentLow.value) <= tolerance * 1.6 &&
      current.low < recentLow.value &&
      current.close > recentLow.value
  );
  const buySideLiquidity = equalHighSweep || Boolean(recentHigh && current.high > recentHigh.value && current.close < previous.close);
  const sellSideLiquidity = equalLowSweep || Boolean(recentLow && current.low < recentLow.value && current.close > previous.close);
  const liquidityStrength = buySideLiquidity || sellSideLiquidity
    ? Math.round(clamp(((current.high - current.low) / Math.max(atr ?? current.high - current.low, 0.01)) * 38 + 42, 0, 100))
    : 0;

  const fvg = detectFvg(candles, price, atr);

  const bosPoints = bullishBos || bearishBos ? 15 : 0;
  const chochPoints = bullishChoch || bearishChoch ? 15 : 0;
  const liquidityPoints = buySideLiquidity || sellSideLiquidity ? 10 : 0;
  const fvgPoints = fvg.confirmed ? 10 : fvg.gapCreated ? 5 : 0;
  const score = Math.round(clamp(((bosPoints + chochPoints + liquidityPoints + fvgPoints) / 50) * 100, 0, 100));

  return {
    bos: {
      status: bullishBos ? "Bullish BOS" : bearishBos ? "Bearish BOS" : "No BOS",
      direction: bullishBos ? "bullish" : bearishBos ? "bearish" : "neutral",
      strength: Math.round(bosStrength),
      timeframe,
      confirmed: bullishBos || bearishBos
    },
    choch: {
      status: bullishChoch ? "Bullish CHoCH" : bearishChoch ? "Bearish CHoCH" : "No CHoCH",
      direction: bullishChoch ? "bullish" : bearishChoch ? "bearish" : "neutral",
      reversalProbability: chochConfidence,
      confidence: chochConfidence,
      confirmed: bullishChoch || bearishChoch
    },
    liquidity: {
      status: equalHighSweep
        ? "Equal High Sweep"
        : equalLowSweep
          ? "Equal Low Sweep"
          : buySideLiquidity
            ? "Buy Side Liquidity"
            : sellSideLiquidity
              ? "Sell Side Liquidity"
              : "No Sweep",
      direction: sellSideLiquidity ? "bullish" : buySideLiquidity ? "bearish" : "neutral",
      strength: liquidityStrength,
      confirmed: buySideLiquidity || sellSideLiquidity
    },
    fvg,
    score,
    grade: gradeFromScore(score)
  };
}
