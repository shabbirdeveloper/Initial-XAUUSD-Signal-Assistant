import { type MarketDataProvider } from "@/lib/market-data/types";
import { type Candle, type Timeframe } from "@/lib/types";

const INTERVALS: Record<Timeframe, string> = {
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1h",
  "4h": "4h",
  D: "1day",
  W: "1week",
  M: "1month"
};

interface TwelveDataCandle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

interface TwelveDataResponse {
  values?: TwelveDataCandle[];
  status?: string;
  message?: string;
  code?: number;
}

function toTwelveDataSymbol(symbol: string) {
  return symbol.toUpperCase() === "XAUUSD" ? "XAU/USD" : symbol;
}

function parseCandle(value: TwelveDataCandle): Candle {
  return {
    time: new Date(value.datetime).toISOString(),
    open: Number(value.open),
    high: Number(value.high),
    low: Number(value.low),
    close: Number(value.close),
    volume: Number(value.volume ?? 0)
  };
}

export function createTwelveDataProvider(apiKey: string): MarketDataProvider {
  return {
    id: "twelve-data",
    async getCandles({ symbol, timeframe, outputSize = 300 }) {
      const url = new URL("https://api.twelvedata.com/time_series");
      url.searchParams.set("symbol", toTwelveDataSymbol(symbol));
      url.searchParams.set("interval", INTERVALS[timeframe]);
      url.searchParams.set("outputsize", String(outputSize));
      url.searchParams.set("apikey", apiKey);

      const response = await fetch(url, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Twelve Data request failed with ${response.status}.`);
      }

      const payload = (await response.json()) as TwelveDataResponse;

      if (payload.status === "error" || !payload.values?.length) {
        throw new Error(payload.message ?? "Twelve Data returned no candles.");
      }

      return {
        symbol,
        timeframe,
        provider: "twelve-data",
        status: "live",
        fetchedAt: new Date().toISOString(),
        sourceLabel: "Twelve Data",
        candles: payload.values.map(parseCandle).reverse()
      };
    }
  };
}
