import { getMarketData } from "@/lib/market-data";
import { analyzeSignal } from "@/lib/signal-engine";
import { type AnalysisResult, type Timeframe } from "@/lib/types";

export async function getMarketAnalysis(params: {
  symbol?: string;
  timeframe: Timeframe;
}): Promise<AnalysisResult> {
  const symbol = params.symbol ?? "XAUUSD";
  const marketData = await getMarketData({
    symbol,
    timeframe: params.timeframe,
    outputSize: 300
  });

  const { signal, indicators, indicatorSeries } = analyzeSignal({
    symbol,
    timeframe: params.timeframe,
    candles: marketData.candles
  });

  const latest = marketData.candles[marketData.candles.length - 1];

  return {
    ...marketData,
    currentPrice: latest.close,
    indicators,
    indicatorSeries,
    signal
  };
}
