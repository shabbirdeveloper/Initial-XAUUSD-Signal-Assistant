import { getMockMarketData } from "@/lib/mock-data";
import { createTwelveDataProvider } from "@/lib/market-data/twelve-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { type Candle, type MarketDataResult, type Timeframe } from "@/lib/types";
import { clamp } from "@/lib/utils";

const MARKET_DATA_REFRESH_MS = 60 * 1000;
const DEFAULT_OUTPUT_SIZE = 300;
const TWELVE_DATA_WINDOW_MS = 60 * 1000;
const TWELVE_DATA_DEFAULT_MAX_CALLS_PER_MINUTE = 5;

interface CacheRecord {
  symbol: string;
  timeframe: Timeframe;
  output_size: number;
  provider: MarketDataResult["provider"];
  source_label: string | null;
  candles: Candle[];
  fetched_at: string;
  expires_at: string;
}

const memoryCache = new Map<string, { expiresAt: number; result: MarketDataResult }>();
const pendingRequests = new Map<string, Promise<MarketDataResult>>();
const twelveDataCallTimestamps: number[] = [];

function getTwelveDataMaxCallsPerMinute() {
  const configured = Number(process.env.TWELVE_DATA_MAX_CALLS_PER_MINUTE);

  if (!Number.isFinite(configured) || configured <= 0) {
    return TWELVE_DATA_DEFAULT_MAX_CALLS_PER_MINUTE;
  }

  return Math.floor(clamp(configured, 1, 8));
}

function reserveTwelveDataSlot() {
  const now = Date.now();
  const windowStart = now - TWELVE_DATA_WINDOW_MS;

  while (twelveDataCallTimestamps.length && twelveDataCallTimestamps[0] < windowStart) {
    twelveDataCallTimestamps.shift();
  }

  if (twelveDataCallTimestamps.length >= getTwelveDataMaxCallsPerMinute()) {
    return false;
  }

  twelveDataCallTimestamps.push(now);
  return true;
}

function normalizedParams(params: { symbol: string; timeframe: Timeframe; outputSize?: number }) {
  return {
    symbol: params.symbol.toUpperCase(),
    timeframe: params.timeframe,
    outputSize: params.outputSize ?? DEFAULT_OUTPUT_SIZE
  };
}

function cacheKey(params: { symbol: string; timeframe: Timeframe; outputSize?: number }) {
  const normalized = normalizedParams(params);
  return `${normalized.symbol}:${normalized.timeframe}:${normalized.outputSize}`;
}

function withCacheStatus(result: MarketDataResult, sourceLabel: string, notice?: string): MarketDataResult {
  return {
    ...result,
    status: "cached",
    sourceLabel,
    notice
  };
}

function fromCacheRecord(record: CacheRecord, sourceLabel = "Supabase cache", notice?: string): MarketDataResult {
  return {
    symbol: record.symbol,
    timeframe: record.timeframe,
    provider: record.provider,
    status: "cached",
    fetchedAt: record.fetched_at,
    sourceLabel,
    candles: record.candles,
    notice
  };
}

async function readSupabaseCache(params: {
  symbol: string;
  timeframe: Timeframe;
  outputSize: number;
}): Promise<CacheRecord | null> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("market_data_cache")
      .select("symbol,timeframe,output_size,provider,source_label,candles,fetched_at,expires_at")
      .eq("symbol", params.symbol)
      .eq("timeframe", params.timeframe)
      .eq("output_size", params.outputSize)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as CacheRecord;
  } catch {
    return null;
  }
}

async function writeSupabaseCache(
  params: { symbol: string; timeframe: Timeframe; outputSize: number },
  result: MarketDataResult
) {
  const supabase = getSupabaseServerClient();

  if (!supabase || result.provider !== "twelve-data") {
    return;
  }

  try {
    await supabase.from("market_data_cache").upsert(
      {
        symbol: params.symbol,
        timeframe: params.timeframe,
        output_size: params.outputSize,
        provider: result.provider,
        status: "live",
        source_label: result.sourceLabel ?? "Twelve Data",
        candles: result.candles,
        candle_count: result.candles.length,
        fetched_at: result.fetchedAt ?? new Date().toISOString(),
        expires_at: new Date(Date.now() + MARKET_DATA_REFRESH_MS).toISOString(),
        error_message: null,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "symbol,timeframe,output_size"
      }
    );
  } catch {
    // Supabase cache is an optimization. Live data should still render if cache writes fail.
  }
}

function remember(key: string, result: MarketDataResult) {
  memoryCache.set(key, {
    expiresAt: Date.now() + MARKET_DATA_REFRESH_MS,
    result
  });
}

function staleCacheNotice(error: unknown, fetchedAt: string) {
  const reason = error instanceof Error ? error.message : "Twelve Data failed.";
  return `${reason} Showing last successful XAUUSD candles from ${new Date(fetchedAt).toLocaleString("en-US")}.`;
}

export async function getMarketData(params: {
  symbol: string;
  timeframe: Timeframe;
  outputSize?: number;
  forceRefresh?: boolean;
}): Promise<MarketDataResult> {
  const normalized = normalizedParams(params);
  const key = cacheKey(normalized);
  const cachedMemory = memoryCache.get(key);

  if (!params.forceRefresh && cachedMemory && cachedMemory.expiresAt > Date.now()) {
    return withCacheStatus(cachedMemory.result, `${cachedMemory.result.sourceLabel ?? "Twelve Data"} memory cache`);
  }

  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }

  const request = loadMarketData(normalized, key, Boolean(params.forceRefresh));
  pendingRequests.set(key, request);

  try {
    return await request;
  } finally {
    pendingRequests.delete(key);
  }
}

async function loadMarketData(
  params: { symbol: string; timeframe: Timeframe; outputSize: number },
  key: string,
  forceRefresh: boolean
): Promise<MarketDataResult> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  const supabaseCache = await readSupabaseCache(params);

  if (!forceRefresh && supabaseCache && new Date(supabaseCache.expires_at).getTime() > Date.now()) {
    const result = fromCacheRecord(supabaseCache);
    remember(key, result);
    return result;
  }

  if (!apiKey) {
    return getMockMarketData(params.symbol, params.timeframe);
  }

  if (!reserveTwelveDataSlot()) {
    const notice = `Twelve Data minute guard is active. Max ${getTwelveDataMaxCallsPerMinute()} external calls per minute; serving cached or sample XAUUSD candles.`;

    if (supabaseCache) {
      const result = fromCacheRecord(supabaseCache, "Supabase rate-limit cache", notice);
      remember(key, result);
      return result;
    }

    const fallback = getMockMarketData(params.symbol, params.timeframe);
    return {
      ...fallback,
      status: "fallback",
      notice
    };
  }

  try {
    const live = await createTwelveDataProvider(apiKey).getCandles(params);
    remember(key, live);
    await writeSupabaseCache(params, live);
    return live;
  } catch (error) {
    if (supabaseCache) {
      const result = fromCacheRecord(supabaseCache, "Supabase stale cache", staleCacheNotice(error, supabaseCache.fetched_at));
      remember(key, result);
      return result;
    }

    const fallback = getMockMarketData(params.symbol, params.timeframe);
    return {
      ...fallback,
      status: "fallback",
      notice:
        error instanceof Error
          ? `Twelve Data failed: ${error.message}. Falling back to sample candles.`
          : "Twelve Data failed. Falling back to sample candles."
    };
  }
}
