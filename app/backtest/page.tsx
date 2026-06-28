import { BacktestClient } from "@/components/backtest-client";
import { runBasicBacktest } from "@/lib/backtest";
import { saveBacktestSummary } from "@/lib/repositories/backtests";

export const dynamic = "force-dynamic";

export default async function BacktestPage() {
  const summary = await runBasicBacktest({
    symbol: "XAUUSD",
    timeframe: "1h"
  });
  const persistence = await saveBacktestSummary(summary);

  if (!persistence.saved) {
    console.log("Backtest persistence skipped:", persistence.reason);
  }

  return <BacktestClient initialSummary={summary} />;
}
