create extension if not exists pgcrypto;

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  symbol text not null default 'XAUUSD',
  timeframe text not null check (timeframe in ('5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M')),
  signal_type text not null check (signal_type in ('BUY', 'SELL', 'HOLD')),
  confidence numeric(5, 2) not null check (confidence >= 0 and confidence <= 100),
  entry_price numeric(12, 4) not null,
  stop_loss numeric(12, 4) not null,
  take_profit_1 numeric(12, 4) not null,
  take_profit_2 numeric(12, 4) not null,
  risk_reward numeric(6, 2) not null,
  explanation text not null,
  created_at timestamptz not null default now()
);

create index if not exists signals_symbol_timeframe_created_idx
  on public.signals (symbol, timeframe, created_at desc);

create index if not exists signals_created_idx
  on public.signals (created_at desc);

create table if not exists public.backtests (
  id uuid primary key default gen_random_uuid(),
  symbol text not null default 'XAUUSD',
  timeframe text not null check (timeframe in ('5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M')),
  start_date timestamptz not null,
  end_date timestamptz not null,
  win_rate numeric(6, 2) not null check (win_rate >= 0 and win_rate <= 100),
  profit_factor numeric(10, 4) not null default 0,
  max_drawdown numeric(10, 4) not null default 0,
  total_trades integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists backtests_symbol_timeframe_created_idx
  on public.backtests (symbol, timeframe, created_at desc);

create table if not exists public.trade_journal (
  id text primary key,
  trade_date timestamptz not null,
  symbol text not null default 'XAUUSD',
  direction text not null check (direction in ('BUY', 'SELL')),
  entry_price numeric(12, 4) not null,
  stop_loss numeric(12, 4) not null,
  take_profit numeric(12, 4) not null,
  result text not null check (result in ('win', 'loss', 'breakeven', 'open')),
  rr_achieved numeric(8, 3) not null default 0,
  session text not null check (session in ('Sydney', 'Tokyo', 'London', 'New York', 'London + NY')),
  timeframe text not null check (timeframe in ('5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M')),
  setup text not null default 'Manual Journal Entry',
  emotion text not null default 'Calm' check (emotion in ('Confident', 'Calm', 'Fear', 'Greed', 'Revenge Trading', 'FOMO', 'Overconfident')),
  why_entered text not null default '',
  why_exited text not null default '',
  mistakes text not null default '',
  lessons text not null default '',
  improvements text not null default '',
  screenshots jsonb not null default '{"before":"","during":"","after":""}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trade_journal_trade_date_idx
  on public.trade_journal (trade_date desc);

create index if not exists trade_journal_symbol_timeframe_idx
  on public.trade_journal (symbol, timeframe, trade_date desc);

create index if not exists trade_journal_session_idx
  on public.trade_journal (session, trade_date desc);

create table if not exists public.market_data_cache (
  id uuid primary key default gen_random_uuid(),
  symbol text not null default 'XAUUSD',
  timeframe text not null check (timeframe in ('5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M')),
  output_size integer not null default 300 check (output_size > 0 and output_size <= 5000),
  provider text not null default 'twelve-data',
  status text not null default 'live',
  source_label text not null default 'Twelve Data',
  candles jsonb not null,
  candle_count integer not null default 0,
  fetched_at timestamptz not null,
  expires_at timestamptz not null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_data_cache_symbol_timeframe_output_key unique (symbol, timeframe, output_size)
);

create index if not exists market_data_cache_lookup_idx
  on public.market_data_cache (symbol, timeframe, output_size, expires_at desc);

create index if not exists market_data_cache_expires_idx
  on public.market_data_cache (expires_at);

alter table public.signals enable row level security;
alter table public.backtests enable row level security;
alter table public.trade_journal enable row level security;
alter table public.market_data_cache enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert on table public.signals to anon, authenticated, service_role;
grant select, insert on table public.backtests to anon, authenticated, service_role;
grant select, insert, update on table public.trade_journal to anon, authenticated, service_role;
grant select, insert, update on table public.market_data_cache to anon, authenticated, service_role;

drop policy if exists "Signals are readable" on public.signals;
create policy "Signals are readable"
  on public.signals
  for select
  using (true);

drop policy if exists "Signals Insert" on public.signals;
create policy "Signals Insert"
  on public.signals
  for insert
  to anon
  with check (true);

drop policy if exists "Backtests are readable" on public.backtests;
create policy "Backtests are readable"
  on public.backtests
  for select
  using (true);

drop policy if exists "Backtests Insert" on public.backtests;
create policy "Backtests Insert"
  on public.backtests
  for insert
  to anon
  with check (true);

drop policy if exists "Trade journal entries are readable" on public.trade_journal;
create policy "Trade journal entries are readable"
  on public.trade_journal
  for select
  using (true);

drop policy if exists "Market data cache is readable" on public.market_data_cache;
create policy "Market data cache is readable"
  on public.market_data_cache
  for select
  using (true);

-- Inserts should be performed by the Next.js server with SUPABASE_SERVICE_ROLE_KEY.
-- The service role bypasses RLS, keeping browser clients read-only by default.
notify pgrst, 'reload schema';
