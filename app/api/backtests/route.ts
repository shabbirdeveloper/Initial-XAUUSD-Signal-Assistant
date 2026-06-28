import { NextResponse } from "next/server";
import { listBacktests, saveBacktestSummary } from "@/lib/repositories/backtests";
import { type BacktestSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backtests = await listBacktests(50);
    return NextResponse.json(backtests);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { backtest?: BacktestSummary };

    if (!body.backtest) {
      return NextResponse.json({ saved: false, reason: "Missing backtest payload." }, { status: 400 });
    }

    const result = await saveBacktestSummary(body.backtest);
    return NextResponse.json(result, { status: result.saved ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      { saved: false, reason: error instanceof Error ? error.message : "Unable to save backtest." },
      { status: 500 }
    );
  }
}
