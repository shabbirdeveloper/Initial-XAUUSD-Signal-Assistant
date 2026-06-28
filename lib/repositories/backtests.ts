import { isSupabasePostgresConfigured, querySupabasePostgres } from "@/lib/supabase/postgres";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { type BacktestRecord, type BacktestSummary } from "@/lib/types";

type BacktestInsertPayload = Omit<BacktestRecord, "id">;

const REQUIRED_BACKTEST_COLUMNS = [
  "symbol",
  "timeframe",
  "start_date",
  "end_date",
  "win_rate",
  "profit_factor",
  "max_drawdown",
  "total_trades",
  "created_at"
] as const satisfies ReadonlyArray<keyof BacktestInsertPayload>;

function toBacktestRecord(summary: BacktestSummary): BacktestInsertPayload {
  return {
    symbol: summary.symbol,
    timeframe: summary.timeframe,
    start_date: summary.start_date,
    end_date: summary.end_date,
    win_rate: summary.win_rate,
    profit_factor: summary.profit_factor,
    max_drawdown: summary.max_drawdown,
    total_trades: summary.total_trades,
    created_at: summary.created_at
  };
}

function validateBacktestPayload(payload: BacktestInsertPayload) {
  const missing = REQUIRED_BACKTEST_COLUMNS.filter((key) => payload[key] === undefined || payload[key] === null || payload[key] === "");

  if (missing.length) {
    return `Backtest payload is missing required database column values: ${missing.join(", ")}.`;
  }

  const numericColumns: Array<keyof Pick<
    BacktestInsertPayload,
    "win_rate" | "profit_factor" | "max_drawdown" | "total_trades"
  >> = ["win_rate", "profit_factor", "max_drawdown", "total_trades"];
  const invalidNumbers = numericColumns.filter((key) => !Number.isFinite(Number(payload[key])));

  if (invalidNumbers.length) {
    return `Backtest payload has invalid numeric values: ${invalidNumbers.join(", ")}.`;
  }

  return null;
}

function formatSupabaseError(error: { code?: string; message?: string; details?: string | null; hint?: string | null }) {
  return [error.message, error.details, error.hint, error.code ? `Code: ${error.code}` : null].filter(Boolean).join(" ");
}

function isSchemaCacheError(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || Boolean(error?.message?.includes("schema cache"));
}

async function insertBacktestViaRpc(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  payload: BacktestInsertPayload
) {
  const jsonRpc = await supabase.rpc("insert_backtest_record_json", {
    payload
  });

  if (!jsonRpc.error) {
    return jsonRpc;
  }

  console.log("JSON backtest RPC unavailable; retrying legacy named-parameter RPC fallback.", jsonRpc.error);

  return supabase.rpc("insert_backtest_record", {
    p_symbol: payload.symbol,
    p_timeframe: payload.timeframe,
    p_start_date: payload.start_date,
    p_end_date: payload.end_date,
    p_win_rate: payload.win_rate,
    p_profit_factor: payload.profit_factor,
    p_max_drawdown: payload.max_drawdown,
    p_total_trades: payload.total_trades,
    p_created_at: payload.created_at
  });
}

async function listBacktestsViaRpc(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, limit: number) {
  const jsonRpc = await supabase.rpc("list_backtest_records_json", {
    payload: { limit }
  });

  if (!jsonRpc.error) {
    return jsonRpc;
  }

  console.log("JSON backtest list RPC unavailable; retrying legacy named-parameter RPC fallback.", jsonRpc.error);

  return supabase.rpc("list_backtest_records", {
    p_limit: limit
  });
}

function normalizeBacktestRows(data: unknown): BacktestRecord[] | null {
  if (Array.isArray(data)) {
    return data.map(normalizeBacktestRecord);
  }

  return null;
}

function normalizeBacktestRecord(row: BacktestRecord | Record<string, unknown>): BacktestRecord {
  const startDate = row.start_date instanceof Date ? row.start_date.toISOString() : String(row.start_date);
  const endDate = row.end_date instanceof Date ? row.end_date.toISOString() : String(row.end_date);
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);

  return {
    id: String(row.id),
    symbol: String(row.symbol),
    timeframe: row.timeframe as BacktestRecord["timeframe"],
    start_date: startDate,
    end_date: endDate,
    win_rate: Number(row.win_rate),
    profit_factor: Number(row.profit_factor),
    max_drawdown: Number(row.max_drawdown),
    total_trades: Number(row.total_trades),
    created_at: createdAt
  };
}

async function insertBacktestViaPostgres(payload: BacktestInsertPayload) {
  const result = await querySupabasePostgres<BacktestRecord>(
    `
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
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning *;
    `,
    [
      payload.symbol,
      payload.timeframe,
      payload.start_date,
      payload.end_date,
      payload.win_rate,
      payload.profit_factor,
      payload.max_drawdown,
      payload.total_trades,
      payload.created_at
    ]
  );

  return {
    ...result,
    data: result.data?.map(normalizeBacktestRecord) ?? result.data
  };
}

async function listBacktestsViaPostgres(limit: number) {
  const result = await querySupabasePostgres<BacktestRecord>(
    `
      select *
      from public.backtests
      order by created_at desc
      limit $1;
    `,
    [Math.min(Math.max(limit, 1), 500)]
  );

  return {
    ...result,
    data: result.data?.map(normalizeBacktestRecord) ?? result.data
  };
}

export async function saveBacktestSummary(summary: BacktestSummary) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { saved: false, reason: "Supabase is not configured." };
  }

  const payload = toBacktestRecord(summary);
  const payloadError = validateBacktestPayload(payload);

  console.log("Backtest Payload:", payload);

  if (payloadError) {
    console.log("Backtest Insert Result:", null);
    console.log("Backtest Insert Error:", payloadError);
    return { saved: false, reason: payloadError };
  }

  try {
    let { data, error } = await supabase.from("backtests").insert(payload).select();

    if (isSchemaCacheError(error)) {
      console.log("Backtests table endpoint unavailable; retrying through RPC fallback.");
      const rpcResult = await insertBacktestViaRpc(supabase, payload);
      data = normalizeBacktestRows(rpcResult.data) as typeof data;
      error = rpcResult.error;
    }

    console.log("Backtest Insert Result:", data);
    console.log("Backtest Insert Error:", error);

    if (error) {
      if (isSupabasePostgresConfigured()) {
        console.log("Supabase REST/RPC backtest insert failed; retrying through direct Postgres fallback.");
        const postgresResult = await insertBacktestViaPostgres(payload);

        console.log("Direct Postgres Backtest Insert Result:", postgresResult.data);
        console.log("Direct Postgres Backtest Insert Error:", postgresResult.error);

        if (postgresResult.data?.length) {
          data = postgresResult.data as typeof data;
          error = null;
        } else {
          return { saved: false, reason: postgresResult.error ?? formatSupabaseError(error) };
        }
      } else {
        return { saved: false, reason: formatSupabaseError(error) };
      }
    }

    if (error) {
      return { saved: false, reason: formatSupabaseError(error) };
    }

    let readbackFallbackError: string | null = null;
    let { data: latestBacktests, error: readError } = await supabase
      .from("backtests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (isSchemaCacheError(readError)) {
      console.log("Backtests table read unavailable; retrying read through RPC fallback.");
      const rpcRead = await listBacktestsViaRpc(supabase, 10);
      latestBacktests = normalizeBacktestRows(rpcRead.data) as typeof latestBacktests;
      readError = rpcRead.error;
    }

    if (readError && isSupabasePostgresConfigured()) {
      console.log("Supabase REST/RPC backtest readback failed; retrying through direct Postgres fallback.");
      const postgresRead = await listBacktestsViaPostgres(10);
      latestBacktests = postgresRead.data as typeof latestBacktests;
      readbackFallbackError = postgresRead.error;
      readError = postgresRead.error ? readError : null;
    }

    console.log("Backtest Post Insert Select Result:", latestBacktests);
    console.log("Backtest Post Insert Select Error:", readError);

    if (readError) {
      return {
        saved: false,
        reason: `Backtest inserted, but readback failed: ${readbackFallbackError ?? formatSupabaseError(readError)}`
      };
    }

    return { saved: true, data, latestBacktests };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unable to save backtest summary.";
    console.log("Backtest Insert Result:", null);
    console.log("Backtest Insert Error:", reason);
    return { saved: false, reason };
  }
}

export async function listBacktests(limit = 50) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  try {
    let { data, error } = await supabase
      .from("backtests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (isSchemaCacheError(error)) {
      console.log("Backtest table select unavailable; retrying through RPC fallback.");
      const rpcRead = await listBacktestsViaRpc(supabase, limit);
      data = normalizeBacktestRows(rpcRead.data) as typeof data;
      error = rpcRead.error;
    }

    if (error && isSupabasePostgresConfigured()) {
      console.log("Backtest REST/RPC select unavailable; retrying through direct Postgres fallback.");
      const postgresRead = await listBacktestsViaPostgres(limit);

      if (!postgresRead.error) {
        data = postgresRead.data as typeof data;
        error = null;
      }
    }

    if (error) {
      console.log("Backtest Select Error:", error);
      return [];
    }

    return (data ?? []) as BacktestRecord[];
  } catch (error) {
    console.log("Backtest Select Error:", error);
    return [];
  }
}
