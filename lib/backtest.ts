import { getMarketData } from "@/lib/market-data";
import { analyzeSignal } from "@/lib/signal-engine";
import { type BacktestSummary, type BacktestTrade, type Timeframe } from "@/lib/types";
import { roundTo } from "@/lib/utils";

const FORWARD_WINDOW: Record<Timeframe, number> = {
  "5m": 36,
  "15m": 12,
  "30m": 32,
  "1h": 36,
  "4h": 20,
  D: 20,
  W: 12,
  M: 8
};

const STEP_SIZE: Record<Timeframe, number> = {
  "5m": 6,
  "15m": 1,
  "30m": 1,
  "1h": 1,
  "4h": 1,
  D: 2,
  W: 1,
  M: 1
};

const OUTPUT_SIZE: Record<Timeframe, number> = {
  "5m": 300,
  "15m": 300,
  "30m": 300,
  "1h": 360,
  "4h": 300,
  D: 360,
  W: 360,
  M: 360
};

const START_INDEX: Record<Timeframe, number> = {
  "5m": 220,
  "15m": 200,
  "30m": 200,
  "1h": 220,
  "4h": 200,
  D: 220,
  W: 220,
  M: 220
};

function evaluateTrade(params: {
  signalType: "BUY" | "SELL";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  futureCandles: { high: number; low: number }[];
}) {
  const { signalType, entryPrice, stopLoss, takeProfit, futureCandles } = params;

  for (const candle of futureCandles) {
    if (signalType === "BUY") {
      if (candle.low <= stopLoss) {
        return "loss" as const;
      }

      if (candle.high >= takeProfit) {
        return "win" as const;
      }
    } else {
      if (candle.high >= stopLoss) {
        return "loss" as const;
      }

      if (candle.low <= takeProfit) {
        return "win" as const;
      }
    }
  }

  return "open" as const;
}

function sessionForTime(value: string) {
  const hour = new Date(value).getUTCHours();

  if (hour >= 13 && hour < 16) return "London + NY";
  if (hour >= 7 && hour < 13) return "London";
  if (hour >= 16 && hour < 22) return "New York";
  if (hour >= 0 && hour < 7) return "Tokyo";
  return "Sydney";
}

function accuracyFor(
  trades: BacktestTrade[],
  predicate: (trade: BacktestTrade) => boolean
) {
  const rows = trades.filter((trade) => predicate(trade) && trade.result !== "open");
  const wins = rows.filter((trade) => trade.result === "win").length;
  return rows.length ? roundTo((wins / rows.length) * 100, 1) : 0;
}

function confidenceAccuracy(trades: BacktestTrade[]) {
  const buckets = [
    { range: "90-100%", min: 90, max: 100 },
    { range: "80-89%", min: 80, max: 89.99 },
    { range: "70-79%", min: 70, max: 79.99 },
    { range: "Below 70%", min: 0, max: 69.99 }
  ];

  return buckets.map((bucket) => {
    const rows = trades.filter((trade) => (trade.confidence ?? 0) >= bucket.min && (trade.confidence ?? 0) <= bucket.max && trade.result !== "open");
    const wins = rows.filter((trade) => trade.result === "win").length;
    return {
      range: bucket.range,
      win_rate: rows.length ? roundTo((wins / rows.length) * 100, 1) : 0,
      total: rows.length
    };
  });
}

export async function runBasicBacktest(params: {
  symbol?: string;
  timeframe: Timeframe;
}): Promise<BacktestSummary> {
  const symbol = params.symbol ?? "XAUUSD";
  const marketData = await getMarketData({
    symbol,
    timeframe: params.timeframe,
    outputSize: OUTPUT_SIZE[params.timeframe]
  });

  const candles = marketData.candles;
  const forwardWindow = FORWARD_WINDOW[params.timeframe];
  const stepSize = STEP_SIZE[params.timeframe];
  const startIndex = START_INDEX[params.timeframe];
  const trades: BacktestTrade[] = [];
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (let index = startIndex; index < candles.length - forwardWindow; index += stepSize) {
    const sample = candles.slice(0, index + 1);
    const { signal } = analyzeSignal({
      symbol,
      timeframe: params.timeframe,
      candles: sample
    });

    if (signal.signalType === "HOLD" || signal.confidence < 60) {
      continue;
    }

    const result = evaluateTrade({
      signalType: signal.signalType,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit1,
      futureCandles: candles.slice(index + 1, index + 1 + forwardWindow)
    });

    const rr = result === "win" ? 1.5 : result === "loss" ? -1 : 0;
    equity += rr;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);

    trades.push({
      openedAt: candles[index]?.time ?? signal.createdAt,
      signalType: signal.signalType,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit1,
      result,
      rr,
      confidence: signal.confidence,
      smcScore: signal.smc?.score,
      smcGrade: signal.smc?.grade,
      bosConfirmed: signal.smc?.bos.confirmed,
      chochConfirmed: signal.smc?.choch.confirmed,
      liquiditySweep: signal.smc?.liquidity.confirmed,
      fvgRetest: signal.smc?.fvg.confirmed
    });
  }

  const closedTrades = trades.filter((trade) => trade.result !== "open");
  const wins = closedTrades.filter((trade) => trade.result === "win").length;
  const losses = closedTrades.filter((trade) => trade.result === "loss").length;
  const grossProfit = wins * 1.5;
  const grossLoss = losses;
  const netR = trades.reduce((sum, trade) => sum + trade.rr, 0);
  const expectancy = closedTrades.length ? roundTo(netR / closedTrades.length, 2) : 0;
  const recoveryFactor = maxDrawdown > 0 ? roundTo(netR / maxDrawdown, 2) : netR > 0 ? roundTo(netR, 2) : 0;
  const sessions = ["Sydney", "Tokyo", "London", "New York", "London + NY"].map((session) => {
    const rows = closedTrades.filter((trade) => sessionForTime(trade.openedAt) === session);
    const sessionWins = rows.filter((trade) => trade.result === "win").length;
    const totalR = rows.reduce((sum, trade) => sum + trade.rr, 0);
    return {
      session,
      score: rows.length ? totalR + (sessionWins / rows.length) * 2 : -999
    };
  });
  const rankedSessions = sessions.sort((first, second) => second.score - first.score);
  const startDate = candles[0]?.time ?? new Date().toISOString();
  const endDate = candles[candles.length - 1]?.time ?? new Date().toISOString();

  return {
    id: `bt-${symbol}-${params.timeframe}`,
    symbol,
    timeframe: params.timeframe,
    start_date: startDate,
    end_date: endDate,
    win_rate: closedTrades.length ? roundTo((wins / closedTrades.length) * 100, 1) : 0,
    profit_factor: grossLoss > 0 ? roundTo(grossProfit / grossLoss, 2) : grossProfit > 0 ? grossProfit : 0,
    max_drawdown: roundTo(maxDrawdown, 2),
    total_trades: trades.length,
    created_at: new Date().toISOString(),
    provider: marketData.provider,
    notice: marketData.notice,
    closed_trades: closedTrades.length,
    win_count: wins,
    loss_count: losses,
    trades: trades.slice(-12).reverse(),
    expectancy,
    recovery_factor: recoveryFactor,
    best_session: rankedSessions[0]?.score === -999 ? "No sample" : rankedSessions[0]?.session,
    worst_session: rankedSessions[rankedSessions.length - 1]?.score === -999 ? "No sample" : rankedSessions[rankedSessions.length - 1]?.session,
    best_timeframe: params.timeframe,
    smc_stats: {
      bos_accuracy: accuracyFor(trades, (trade) => Boolean(trade.bosConfirmed)),
      choch_accuracy: accuracyFor(trades, (trade) => Boolean(trade.chochConfirmed)),
      liquidity_sweep_accuracy: accuracyFor(trades, (trade) => Boolean(trade.liquiditySweep)),
      fvg_accuracy: accuracyFor(trades, (trade) => Boolean(trade.fvgRetest))
    },
    confidence_accuracy: confidenceAccuracy(trades)
  };
}
