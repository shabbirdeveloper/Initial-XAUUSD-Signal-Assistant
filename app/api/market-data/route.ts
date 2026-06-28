import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/market-data";
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
    const marketData = await getMarketData({ symbol, timeframe, outputSize: 300 });
    return NextResponse.json(marketData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load market data." },
      { status: 500 }
    );
  }
}
