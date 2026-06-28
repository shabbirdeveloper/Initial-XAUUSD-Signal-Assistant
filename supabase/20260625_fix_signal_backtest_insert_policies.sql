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

alter table public.signals enable row level security;
alter table public.backtests enable row level security;

grant usage on schema public to anon, authenticated, service_role, authenticator;
grant select, insert on table public.signals to anon, authenticated, service_role, authenticator;
grant select, insert on table public.backtests to anon, authenticated, service_role, authenticator;

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

create or replace function public.insert_signal_record(
  p_symbol text,
  p_timeframe text,
  p_signal_type text,
  p_confidence numeric,
  p_entry_price numeric,
  p_stop_loss numeric,
  p_take_profit_1 numeric,
  p_take_profit_2 numeric,
  p_risk_reward numeric,
  p_explanation text,
  p_created_at timestamptz default now()
)
returns setof public.signals
language sql
security definer
set search_path = public
as '
  insert into public.signals (
    symbol,
    timeframe,
    signal_type,
    confidence,
    entry_price,
    stop_loss,
    take_profit_1,
    take_profit_2,
    risk_reward,
    explanation,
    created_at
  )
  values (
    p_symbol,
    p_timeframe,
    p_signal_type,
    p_confidence,
    p_entry_price,
    p_stop_loss,
    p_take_profit_1,
    p_take_profit_2,
    p_risk_reward,
    p_explanation,
    p_created_at
  )
  returning *;
';

create or replace function public.list_signal_records(p_limit integer default 50)
returns setof public.signals
language sql
security definer
set search_path = public
as '
  select *
  from public.signals
  order by created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
';

create or replace function public.insert_backtest_record(
  p_symbol text,
  p_timeframe text,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_win_rate numeric,
  p_profit_factor numeric,
  p_max_drawdown numeric,
  p_total_trades integer,
  p_created_at timestamptz default now()
)
returns setof public.backtests
language sql
security definer
set search_path = public
as '
  insert into public.backtests (
    symbol,
    timeframe,
    start_date,
    end_date,
    win_rate,
    profit_factor,
    max_drawdown,
    total_trades,
    created_at
  )
  values (
    p_symbol,
    p_timeframe,
    p_start_date,
    p_end_date,
    p_win_rate,
    p_profit_factor,
    p_max_drawdown,
    p_total_trades,
    p_created_at
  )
  returning *;
';

create or replace function public.list_backtest_records(p_limit integer default 50)
returns setof public.backtests
language sql
security definer
set search_path = public
as '
  select *
  from public.backtests
  order by created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
';

create or replace function public.insert_signal_record_json(payload jsonb)
returns jsonb
language sql
security definer
set search_path = public
as '
  with inserted as (
    insert into public.signals (
      symbol,
      timeframe,
      signal_type,
      confidence,
      entry_price,
      stop_loss,
      take_profit_1,
      take_profit_2,
      risk_reward,
      explanation,
      created_at
    )
    values (
      coalesce(nullif(payload->>''symbol'', ''''), ''XAUUSD''),
      nullif(payload->>''timeframe'', ''''),
      nullif(payload->>''signal_type'', ''''),
      nullif(payload->>''confidence'', '''')::numeric,
      nullif(payload->>''entry_price'', '''')::numeric,
      nullif(payload->>''stop_loss'', '''')::numeric,
      nullif(payload->>''take_profit_1'', '''')::numeric,
      nullif(payload->>''take_profit_2'', '''')::numeric,
      nullif(payload->>''risk_reward'', '''')::numeric,
      nullif(payload->>''explanation'', ''''),
      coalesce(nullif(payload->>''created_at'', '''')::timestamptz, now())
    )
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted)), ''[]''::jsonb)
  from inserted;
';

create or replace function public.list_signal_records_json(payload jsonb default '{}'::jsonb)
returns jsonb
language sql
security definer
set search_path = public
as '
  select coalesce(jsonb_agg(to_jsonb(records)), ''[]''::jsonb)
  from (
    select *
    from public.signals
    order by created_at desc
    limit least(greatest(coalesce(nullif(payload->>''limit'', '''')::integer, 50), 1), 500)
  ) records;
';

create or replace function public.insert_backtest_record_json(payload jsonb)
returns jsonb
language sql
security definer
set search_path = public
as '
  with inserted as (
    insert into public.backtests (
      symbol,
      timeframe,
      start_date,
      end_date,
      win_rate,
      profit_factor,
      max_drawdown,
      total_trades,
      created_at
    )
    values (
      coalesce(nullif(payload->>''symbol'', ''''), ''XAUUSD''),
      nullif(payload->>''timeframe'', ''''),
      nullif(payload->>''start_date'', '''')::timestamptz,
      nullif(payload->>''end_date'', '''')::timestamptz,
      nullif(payload->>''win_rate'', '''')::numeric,
      nullif(payload->>''profit_factor'', '''')::numeric,
      nullif(payload->>''max_drawdown'', '''')::numeric,
      nullif(payload->>''total_trades'', '''')::integer,
      coalesce(nullif(payload->>''created_at'', '''')::timestamptz, now())
    )
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted)), ''[]''::jsonb)
  from inserted;
';

create or replace function public.list_backtest_records_json(payload jsonb default '{}'::jsonb)
returns jsonb
language sql
security definer
set search_path = public
as '
  select coalesce(jsonb_agg(to_jsonb(records)), ''[]''::jsonb)
  from (
    select *
    from public.backtests
    order by created_at desc
    limit least(greatest(coalesce(nullif(payload->>''limit'', '''')::integer, 50), 1), 500)
  ) records;
';

grant execute on function public.insert_signal_record(text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text, timestamptz) to anon, authenticated, service_role, authenticator;
grant execute on function public.list_signal_records(integer) to anon, authenticated, service_role, authenticator;
grant execute on function public.insert_backtest_record(text, text, timestamptz, timestamptz, numeric, numeric, numeric, integer, timestamptz) to anon, authenticated, service_role, authenticator;
grant execute on function public.list_backtest_records(integer) to anon, authenticated, service_role, authenticator;
grant execute on function public.insert_signal_record_json(jsonb) to anon, authenticated, service_role, authenticator;
grant execute on function public.list_signal_records_json(jsonb) to anon, authenticated, service_role, authenticator;
grant execute on function public.insert_backtest_record_json(jsonb) to anon, authenticated, service_role, authenticator;
grant execute on function public.list_backtest_records_json(jsonb) to anon, authenticated, service_role, authenticator;

select pg_notify('pgrst', 'reload schema') as schema_reload_requested;
select pg_notify('pgrst', 'reload config') as config_reload_requested;
