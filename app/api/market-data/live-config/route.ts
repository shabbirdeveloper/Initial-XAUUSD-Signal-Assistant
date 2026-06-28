import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function toTwelveDataSymbol(symbol: string) {
  return symbol.toUpperCase() === "XAUUSD" ? "XAU/USD" : symbol.toUpperCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "XAUUSD";
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  const websocketBaseUrl = process.env.TWELVE_DATA_WS_URL ?? "wss://ws.twelvedata.com/v1/quotes/price";
  const disabled = process.env.TWELVE_DATA_ENABLE_WEBSOCKET === "false";

  if (!apiKey || disabled) {
    return NextResponse.json({
      enabled: false,
      reason: disabled ? "Twelve Data WebSocket is disabled." : "TWELVE_DATA_API_KEY is not configured."
    });
  }

  const url = new URL(websocketBaseUrl);
  url.searchParams.set("apikey", apiKey);

  return NextResponse.json({
    enabled: true,
    symbol: toTwelveDataSymbol(symbol),
    websocketUrl: url.toString()
  });
}
