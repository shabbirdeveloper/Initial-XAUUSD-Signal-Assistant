import { getMarketData } from "@/lib/market-data";
import { analyzeSignal } from "@/lib/signal-engine";
import { type AnalysisResult, type Timeframe } from "@/lib/types";

const SIGNAL_ALIGNMENT_TIMEFRAMES = ["5m", "15m", "30m", "1h", "4h", "D"] as const;

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

  const alignmentResults = await Promise.all(
    SIGNAL_ALIGNMENT_TIMEFRAMES.map(async (timeframe) => {
      if (timeframe === params.timeframe) {
        return [timeframe, marketData.candles] as const;
      }

      try {
        const result = await getMarketData({
          symbol,
          timeframe,
          outputSize: 220
        });
        return [timeframe, result.candles] as const;
      } catch {
        return [timeframe, []] as const;
      }
    })
  );

  const { signal, indicators, indicatorSeries } = analyzeSignal({
    symbol,
    timeframe: params.timeframe,
    candles: marketData.candles,
    multiTimeframeCandles: Object.fromEntries(alignmentResults)
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
