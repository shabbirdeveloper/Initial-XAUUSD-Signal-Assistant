import { type MarketDataResult, type Timeframe } from "@/lib/types";

export interface MarketDataProvider {
  id: MarketDataResult["provider"];
  getCandles(params: {
    symbol: string;
    timeframe: Timeframe;
    outputSize?: number;
  }): Promise<MarketDataResult>;
}
