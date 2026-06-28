import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/market-data";
import { SUPPORTED_TIMEFRAMES, type Timeframe } from "@/lib/types";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.MARKET_DATA_REFRESH_SECRET;

  if (!secret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function refreshXauusdMarketData(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("force") === "true";
  const startedAt = new Date().toISOString();
  const results = [];

  for (const timeframe of SUPPORTED_TIMEFRAMES) {
    const result = await getMarketData({
      symbol: "XAUUSD",
      timeframe: timeframe as Timeframe,
      outputSize: 300,
      forceRefresh
    });

    const latest = result.candles[result.candles.length - 1];

    results.push({
      symbol: result.symbol,
      timeframe,
      provider: result.provider,
      status: result.status,
      sourceLabel: result.sourceLabel,
      fetchedAt: result.fetchedAt,
      candleCount: result.candles.length,
      latestClose: latest?.close ?? null,
      notice: result.notice ?? null
    });
  }

  return NextResponse.json({
    forceRefresh,
    refreshedAt: new Date().toISOString(),
    startedAt,
    refreshWindowSeconds: 60,
    optimizedExternalCallCap: "Twelve Data calls are guarded by TWELVE_DATA_MAX_CALLS_PER_MINUTE, default 5 per minute.",
    refreshMode: forceRefresh ? "Sequential forced refresh with rate-limit fallback." : "Sequential cache-first refresh. Add ?force=true only when needed.",
    results
  });
}

export async function GET(request: Request) {
  return refreshXauusdMarketData(request);
}

export async function POST(request: Request) {
  return refreshXauusdMarketData(request);
}
