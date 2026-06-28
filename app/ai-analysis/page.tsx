import { AiAnalysisClient } from "@/components/ai-analysis-client";
import { getMarketAnalysis } from "@/lib/analysis";
import { getMockMarketData } from "@/lib/mock-data";
import { analyzeSignal } from "@/lib/signal-engine";
import { type AnalysisResult } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getInitialAnalysis(): Promise<AnalysisResult> {
  try {
    return await getMarketAnalysis({
      symbol: "XAUUSD",
      timeframe: "1h"
    });
  } catch {
    const marketData = getMockMarketData("XAUUSD", "1h");
    const { signal, indicators, indicatorSeries } = analyzeSignal({
      symbol: "XAUUSD",
      timeframe: "1h",
      candles: marketData.candles
    });
    const latest = marketData.candles[marketData.candles.length - 1];

    return {
      ...marketData,
      currentPrice: latest.close,
      indicatorSeries,
      indicators,
      notice: "AI Analysis used fallback sample data because live analysis was unavailable.",
      signal
    };
  }
}

export default async function AiAnalysisPage() {
  const initialAnalysis = await getInitialAnalysis();

  return <AiAnalysisClient initialAnalysis={initialAnalysis} />;
}
