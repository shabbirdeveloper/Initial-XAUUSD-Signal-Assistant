import { NextResponse } from "next/server";
import { runBasicBacktest } from "@/lib/backtest";
import { saveBacktestSummary } from "@/lib/repositories/backtests";
import { isSupportedTimeframe } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe");
  const symbol = searchParams.get("symbol") ?? "XAUUSD";

  if (!isSupportedTimeframe(timeframe)) {
    return NextResponse.json({ error: "Unsupported timeframe." }, { status: 400 });
  }

  try {
    const summary = await runBasicBacktest({ symbol, timeframe });
    const persistence = await saveBacktestSummary(summary);

    if (!persistence.saved) {
      console.log("Backtest persistence skipped:", persistence.reason);
    }

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run backtest." },
      { status: 500 }
    );
  }
}
