import { type Candle, type Timeframe } from "@/lib/types";
import { roundTo } from "@/lib/utils";

const INTERVAL_MINUTES: Record<Timeframe, number> = {
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "4h": 240,
  D: 1440,
  W: 10080,
  M: 43200
};

function seededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(timeframe: Timeframe) {
  return timeframe.split("").reduce((seed, char) => seed + char.charCodeAt(0), 2400);
}

function mockBasePrice() {
  const configured = Number(process.env.XAUUSD_SAMPLE_BASE_PRICE ?? process.env.NEXT_PUBLIC_XAUUSD_SAMPLE_BASE_PRICE);
  return Number.isFinite(configured) && configured > 0 ? configured : 4150;
}

export function generateMockCandles(timeframe: Timeframe, count = 260): Candle[] {
  const random = seededRandom(seedFor(timeframe));
  const intervalMs = INTERVAL_MINUTES[timeframe] * 60 * 1000;
  const now = Date.now();
  const roundedNow = Math.floor(now / intervalMs) * intervalMs;
  const candles: Candle[] = [];
  let close = mockBasePrice() - 12 + random() * 18;
  const timeframeDrift = timeframe === "D" || timeframe === "W" || timeframe === "M" || timeframe === "4h" ? 0.18 : 0.06;

  for (let index = 0; index < count; index += 1) {
    const time = new Date(roundedNow - (count - index - 1) * intervalMs).toISOString();
    const cycle = Math.sin(index / 13) * 1.2 + Math.cos(index / 29) * 0.7;
    const noise = (random() - 0.5) * 2.4;
    const drift = index > count * 0.38 ? timeframeDrift : -0.03;
    const open = close;
    close = Math.max(1900, open + drift + cycle * 0.18 + noise);
    const spread = 1.4 + random() * 3.8;
    const high = Math.max(open, close) + spread * (0.5 + random());
    const low = Math.min(open, close) - spread * (0.5 + random());

    candles.push({
      time,
      open: roundTo(open),
      high: roundTo(high),
      low: roundTo(low),
      close: roundTo(close),
      volume: Math.round(4200 + random() * 6400 + index * 8)
    });
  }

  return addLatestMockSetup(candles, timeframe);
}

function addLatestMockSetup(candles: Candle[], timeframe: Timeframe) {
  const edited = candles.map((candle) => ({ ...candle }));
  const latestIndex = edited.length - 1;
  const base = edited[latestIndex - 1].close;
  const isHigherTimeframe = timeframe === "D" || timeframe === "W" || timeframe === "M";
  const support = base - (isHigherTimeframe ? 8 : 3.2);
  const close = base + (isHigherTimeframe ? 3.6 : 1.45);

  edited[latestIndex] = {
    ...edited[latestIndex],
    open: roundTo(base - 0.35),
    low: roundTo(support - 0.45),
    high: roundTo(close + 2.05),
    close: roundTo(close),
    volume: edited[latestIndex].volume + 2100
  };

  return edited;
}

export function getMockMarketData(symbol: string, timeframe: Timeframe) {
  return {
    symbol,
    timeframe,
    provider: "mock" as const,
    status: "fallback" as const,
    fetchedAt: new Date().toISOString(),
    sourceLabel: "Sample candles",
    candles: generateMockCandles(timeframe),
    notice: "Using built-in sample candles because no live market API is configured."
  };
}
