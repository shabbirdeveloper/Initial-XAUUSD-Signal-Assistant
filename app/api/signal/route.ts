import { NextResponse } from "next/server";
import { getMarketAnalysis } from "@/lib/analysis";
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
    const analysis = await getMarketAnalysis({ symbol, timeframe });
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate signal." },
      { status: 500 }
    );
  }
}
