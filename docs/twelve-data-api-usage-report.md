# Twelve Data API Usage Audit

Generated: June 20, 2026

## Executive Summary

The application now uses one centralized market data service:

`lib/market-data/index.ts`

All pages and API routes obtain XAUUSD candles through this service. The only remaining external Twelve Data HTTP request is isolated inside the provider adapter:

`lib/market-data/twelve-data.ts`

The optimized service uses this order:

1. In-memory cache for the current server process.
2. Supabase `market_data_cache` table.
3. Twelve Data only when the cache is missing or older than 60 seconds.
4. Stale Supabase cache if Twelve Data fails.
5. Local sample candles only when no live or cached data exists.

The app also exposes a server-side refresh endpoint:

`/api/market-data/refresh`

This endpoint refreshes all supported XAUUSD timeframes through the centralized service and can be called by a scheduler every 60 seconds. If `MARKET_DATA_REFRESH_SECRET` is set, callers must send:

`Authorization: Bearer <MARKET_DATA_REFRESH_SECRET>`

## Current API Call Audit

### Direct External Twelve Data Request

| File | Request | Purpose |
| --- | --- | --- |
| `lib/market-data/twelve-data.ts` | `https://api.twelvedata.com/time_series` | Fetch XAUUSD candles from Twelve Data |

No React page or client component calls `api.twelvedata.com` directly.

### Internal Market Data Call Sites

These call the centralized service and may indirectly need XAUUSD data:

| File | Path | Timeframes |
| --- | --- | --- |
| `lib/analysis.ts` | `getMarketAnalysis()` -> `getMarketData()` | Requested timeframe |
| `lib/backtest.ts` | `runBacktest()` -> `getMarketData()` | Requested timeframe |
| `app/api/market-data/route.ts` | `/api/market-data` -> `getMarketData()` | Requested timeframe |
| `app/api/signal/route.ts` | `/api/signal` -> `getMarketAnalysis()` | Requested timeframe |
| `app/page.tsx` | Dashboard initial load -> `getMarketAnalysis()` | `1h` |
| `app/ai-analysis/page.tsx` | AI Analysis initial load -> `getMarketAnalysis()` | `1h` |
| `lib/repositories/signals.ts` | Generated fallback history -> `getMarketAnalysis()` | `5m`, `15m`, `30m`, `1h`, `4h`, `D`, `W`, `M` |
| `components/dashboard-client.tsx` | Browser calls `/api/signal` | User-selected timeframe |
| `components/ai-analysis-client.tsx` | Browser calls `/api/signal` | User-selected timeframe |
| `components/backtest-client.tsx` | Browser calls `/api/backtest` | User-selected timeframe |
| `app/api/market-data/refresh/route.ts` | Server refresh endpoint -> `getMarketData({ forceRefresh: true })` | All supported XAUUSD timeframes |

## Previous Behavior

Before this optimization, market data was protected only by process memory. That helped during a single running process, but it did not persist in Supabase and could not reliably serve all pages after restarts or cold starts.

Cold or stale page clusters could trigger these Twelve Data calls:

| Flow | Estimated Twelve Data Calls |
| --- | ---: |
| Dashboard initial load | 1 |
| AI Analysis initial load | 1 |
| Backtest selected timeframe | 1 |
| Signals generated fallback history | 8 |
| Total core page cluster | 11 |

With 10 users or repeated reloads in the same minute, a cold deployment could produce about:

`11 calls x 10 users = 110 calls/minute`

## Optimized Behavior

The optimized service limits Twelve Data usage to one request per unique XAUUSD timeframe/output-size pair every 60 seconds.

The app currently uses `outputSize = 300`, so the practical maximum for all supported timeframes is:

| Optimized Flow | Maximum Twelve Data Calls |
| --- | ---: |
| `5m` cache refresh | 1 per 60 seconds |
| `15m` cache refresh | 1 per 60 seconds |
| `30m` cache refresh | 1 per 60 seconds |
| `1h` cache refresh | 1 per 60 seconds |
| `4h` cache refresh | 1 per 60 seconds |
| `D` cache refresh | 1 per 60 seconds |
| `W` cache refresh | 1 per 60 seconds |
| `M` cache refresh | 1 per 60 seconds |
| Total platform maximum | 8 per 60 seconds |

If a page asks for data during the 60-second window, it receives cached Supabase or memory data and does not call Twelve Data.

If the refresh endpoint is scheduled every 60 seconds, pages normally read from Supabase/memory cache and avoid provider calls entirely.

## Estimated Savings

| Scenario | Previous Calls | Optimized Calls | Estimated Savings |
| --- | ---: | ---: | ---: |
| Dashboard only, 10 users/minute | 10 | 1 | 90.0% |
| Dashboard + AI Analysis, 10 users/minute | 20 | 1 | 95.0% |
| Core page cluster, 10 users/minute | 110 | 8 | 92.7% |
| Signals fallback reloads, 10 users/minute | 80 | 8 | 90.0% |

## Supabase Cache Table

The cache table is defined in:

`supabase/schema.sql`

Table:

`public.market_data_cache`

Lookup key:

`symbol + timeframe + output_size`

Indexes:

- `market_data_cache_lookup_idx`
- `market_data_cache_expires_idx`

Write behavior:

- The Next.js server uses `SUPABASE_SERVICE_ROLE_KEY`.
- Live Twelve Data responses are upserted atomically.
- Mock/sample candles are not stored as live market data.

Read behavior:

- Pages read through the server service.
- Browser clients do not call Twelve Data directly.

## Operational Notes

If Twelve Data returns `429`, the service will:

1. Serve fresh cache if available.
2. Serve stale Supabase cache if fresh cache is unavailable.
3. Fall back to local sample candles only if no cached live data exists.

The UI now exposes status values:

- `live`
- `cached`
- `fallback`

This prevents stale or sample data from appearing as live market data.
