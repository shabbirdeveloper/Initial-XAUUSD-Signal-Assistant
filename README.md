# XAUUSD Signal Assistant

A complete MVP dashboard for XAUUSD / Gold signal analysis. It does not execute live trades, place orders, connect to broker execution, or automate trading.

## Features

- Next.js 14 App Router with TypeScript and Tailwind CSS
- TradingView Lightweight Charts candlestick chart with volume, EMA 50, and EMA 200
- Timeframe selector for `5m`, `15m`, `30m`, `1h`, `4h`, `D`, `W`, and `M`
- Rule-based Buy / Sell / Hold signal engine
- Confidence score, entry, stop loss, TP1, TP2, risk/reward, and explanation
- EMA 50, EMA 200, RSI 14, MACD, ATR, support/resistance, trend, and candle pattern detection
- Mock candle provider that works without API keys
- Twelve Data provider via `TWELVE_DATA_API_KEY`
- Daily site refresh that updates server pages and the selected dashboard/backtest timeframe while the app is open
- Supabase-ready `signals`, `backtests`, `market_data_cache`, and `trade_journal` tables
- Dashboard, signal history, session details, W-Economic Updates, Forex Factory news calendar, backtest, and settings pages

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

On Windows PowerShell, if `npm` scripts are blocked by execution policy, use:

```bash
npm.cmd install
npm.cmd run dev
```

## Environment

Copy `.env.example` to `.env.local`:

```bash
TWELVE_DATA_API_KEY=
TWELVE_DATA_MAX_CALLS_PER_MINUTE=5

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

If `TWELVE_DATA_API_KEY` is empty, the app uses built-in mock candles. `TWELVE_DATA_MAX_CALLS_PER_MINUTE` protects low-tier API plans from minute-limit spikes; keep it at `5` for an 8/minute Twelve Data plan so there is enough headroom for browser reloads, alerts, and background refreshes. If Supabase values are empty, signal history shows sample records and saving signals or journal entries returns a clear configuration message.

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor.

The app reads from:

- `signals`
- `backtests`
- `trade_journal`
- `market_data_cache`

Signal and journal inserts are intended to run from the Next.js server using `SUPABASE_SERVICE_ROLE_KEY`. Browser clients are read-only by default in the schema.

The AI Coach reads saved trade journal entries first, then saved backtest summaries and signal history. If these tables are empty, it shows safe fallback coaching data until real trade history is available.

## Signal Logic

The engine is in `lib/signal-engine.ts`.

BUY scoring checks:

- Price above EMA 50
- EMA 50 above EMA 200
- RSI between 35 and 60
- Price rejects support zone
- MACD bullish or improving
- Bullish trend and basic candle confirmation

SELL scoring checks:

- Price below EMA 50
- EMA 50 below EMA 200
- RSI between 40 and 70
- Price rejects resistance zone
- MACD bearish or weakening
- Bearish trend and basic candle confirmation

Signals under 60% confidence, ranging markets, or mixed directional conditions are downgraded to HOLD. Strong signals require 70%+ confidence.

## Risk Management

- Default risk per trade is 1%
- Stop loss uses recent swing high/low plus ATR buffer
- TP1 uses 1:1.5 risk/reward
- TP2 uses 1:2 risk/reward

The app displays: `This is not financial advice. Always manage risk.`

## Market Data Providers

Provider abstraction lives in `lib/market-data`.

- `mock-data.ts` generates deterministic sample candles
- `twelve-data.ts` loads Twelve Data candles when `TWELVE_DATA_API_KEY` is set
- Additional providers such as MT5 or Exness market data can implement `MarketDataProvider`

This MVP intentionally has no broker execution layer.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```
