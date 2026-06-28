import { getMarketAnalysis } from "@/lib/analysis";
import { isSupabasePostgresConfigured, querySupabasePostgres } from "@/lib/supabase/postgres";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  SUPPORTED_TIMEFRAMES,
  type SignalRecord,
  type SignalResult,
  type Timeframe
} from "@/lib/types";

export type SignalHistorySource = "supabase" | "generated-fallback";

export interface SignalHistoryResult {
  signals: SignalRecord[];
  source: SignalHistorySource;
  notice?: string;
}

type SignalInsertPayload = Omit<SignalRecord, "id">;

const REQUIRED_SIGNAL_COLUMNS = [
  "symbol",
  "timeframe",
  "signal_type",
  "confidence",
  "entry_price",
  "stop_loss",
  "take_profit_1",
  "take_profit_2",
  "risk_reward",
  "explanation",
  "created_at"
] as const satisfies ReadonlyArray<keyof SignalInsertPayload>;

function toSignalRecord(signal: SignalResult): SignalInsertPayload {
  return {
    symbol: signal.symbol,
    timeframe: signal.timeframe,
    signal_type: signal.signalType,
    confidence: signal.confidence,
    entry_price: signal.entryPrice,
    stop_loss: signal.stopLoss,
    take_profit_1: signal.takeProfit1,
    take_profit_2: signal.takeProfit2,
    risk_reward: signal.riskReward,
    explanation: signal.explanation,
    created_at: signal.createdAt
  };
}

function validateSignalPayload(payload: SignalInsertPayload) {
  const missing = REQUIRED_SIGNAL_COLUMNS.filter((key) => payload[key] === undefined || payload[key] === null || payload[key] === "");

  if (missing.length) {
    return `Signal payload is missing required database column values: ${missing.join(", ")}.`;
  }

  const numericColumns: Array<keyof Pick<
    SignalInsertPayload,
    "confidence" | "entry_price" | "stop_loss" | "take_profit_1" | "take_profit_2" | "risk_reward"
  >> = ["confidence", "entry_price", "stop_loss", "take_profit_1", "take_profit_2", "risk_reward"];
  const invalidNumbers = numericColumns.filter((key) => !Number.isFinite(Number(payload[key])));

  if (invalidNumbers.length) {
    return `Signal payload has invalid numeric values: ${invalidNumbers.join(", ")}.`;
  }

  return null;
}

function formatSupabaseError(error: { code?: string; message?: string; details?: string | null; hint?: string | null }) {
  return [error.message, error.details, error.hint, error.code ? `Code: ${error.code}` : null].filter(Boolean).join(" ");
}

function isSchemaCacheError(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || Boolean(error?.message?.includes("schema cache"));
}

async function insertSignalViaRpc(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, payload: SignalInsertPayload) {
  const jsonRpc = await supabase.rpc("insert_signal_record_json", {
    payload
  });

  if (!jsonRpc.error) {
    return jsonRpc;
  }

  console.log("JSON signal RPC unavailable; retrying legacy named-parameter RPC fallback.", jsonRpc.error);

  return supabase.rpc("insert_signal_record", {
    p_symbol: payload.symbol,
    p_timeframe: payload.timeframe,
    p_signal_type: payload.signal_type,
    p_confidence: payload.confidence,
    p_entry_price: payload.entry_price,
    p_stop_loss: payload.stop_loss,
    p_take_profit_1: payload.take_profit_1,
    p_take_profit_2: payload.take_profit_2,
    p_risk_reward: payload.risk_reward,
    p_explanation: payload.explanation,
    p_created_at: payload.created_at
  });
}

async function listSignalsViaRpc(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, limit: number) {
  const jsonRpc = await supabase.rpc("list_signal_records_json", {
    payload: { limit }
  });

  if (!jsonRpc.error) {
    return jsonRpc;
  }

  console.log("JSON signal list RPC unavailable; retrying legacy named-parameter RPC fallback.", jsonRpc.error);

  return supabase.rpc("list_signal_records", {
    p_limit: limit
  });
}

function normalizeSignalRows(data: unknown): SignalRecord[] | null {
  if (Array.isArray(data)) {
    return data.map(normalizeSignalRecord);
  }

  return null;
}

function normalizeSignalRecord(row: SignalRecord | Record<string, unknown>): SignalRecord {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);

  return {
    id: String(row.id),
    symbol: String(row.symbol),
    timeframe: row.timeframe as SignalRecord["timeframe"],
    signal_type: row.signal_type as SignalRecord["signal_type"],
    confidence: Number(row.confidence),
    entry_price: Number(row.entry_price),
    stop_loss: Number(row.stop_loss),
    take_profit_1: Number(row.take_profit_1),
    take_profit_2: Number(row.take_profit_2),
    risk_reward: Number(row.risk_reward),
    explanation: String(row.explanation),
    created_at: createdAt
  };
}

async function insertSignalViaPostgres(payload: SignalInsertPayload) {
  const result = await querySupabasePostgres<SignalRecord>(
    `
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
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      returning *;
    `,
    [
      payload.symbol,
      payload.timeframe,
      payload.signal_type,
      payload.confidence,
      payload.entry_price,
      payload.stop_loss,
      payload.take_profit_1,
      payload.take_profit_2,
      payload.risk_reward,
      payload.explanation,
      payload.created_at
    ]
  );

  return {
    ...result,
    data: result.data?.map(normalizeSignalRecord) ?? result.data
  };
}

async function listSignalsViaPostgres(limit: number) {
  const result = await querySupabasePostgres<SignalRecord>(
    `
      select *
      from public.signals
      order by created_at desc
      limit $1;
    `,
    [Math.min(Math.max(limit, 1), 500)]
  );

  return {
    ...result,
    data: result.data?.map(normalizeSignalRecord) ?? result.data
  };
}

export async function saveSignal(signal: SignalResult) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { saved: false, reason: "Supabase is not configured." };
  }

  const payload = toSignalRecord(signal);
  const payloadError = validateSignalPayload(payload);

  console.log("Payload:", payload);

  if (payloadError) {
    console.log("Insert Result:", null);
    console.log("Insert Error:", payloadError);
    return { saved: false, reason: payloadError };
  }

  try {
    let { data, error } = await supabase.from("signals").insert(payload).select();

    if (isSchemaCacheError(error)) {
      console.log("Signals table endpoint unavailable; retrying through RPC fallback.");
      const rpcResult = await insertSignalViaRpc(supabase, payload);
      data = normalizeSignalRows(rpcResult.data) as typeof data;
      error = rpcResult.error;
    }

    console.log("Insert Result:", data);
    console.log("Insert Error:", error);

    if (error) {
      if (isSupabasePostgresConfigured()) {
        console.log("Supabase REST/RPC insert failed; retrying through direct Postgres fallback.");
        const postgresResult = await insertSignalViaPostgres(payload);

        console.log("Direct Postgres Insert Result:", postgresResult.data);
        console.log("Direct Postgres Insert Error:", postgresResult.error);

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
    let { data: latestSignals, error: readError } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (isSchemaCacheError(readError)) {
      console.log("Signals table read unavailable; retrying read through RPC fallback.");
      const rpcRead = await listSignalsViaRpc(supabase, 10);
      latestSignals = normalizeSignalRows(rpcRead.data) as typeof latestSignals;
      readError = rpcRead.error;
    }

    if (readError && isSupabasePostgresConfigured()) {
      console.log("Supabase REST/RPC readback failed; retrying through direct Postgres fallback.");
      const postgresRead = await listSignalsViaPostgres(10);
      latestSignals = postgresRead.data as typeof latestSignals;
      readbackFallbackError = postgresRead.error;
      readError = postgresRead.error ? readError : null;
    }

    console.log("Post Insert Select Result:", latestSignals);
    console.log("Post Insert Select Error:", readError);

    if (readError) {
      return {
        saved: false,
        reason: `Signal inserted, but readback failed: ${readbackFallbackError ?? formatSupabaseError(readError)}`
      };
    }

    return { saved: true, data, latestSignals };
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : "Unable to reach Supabase.";
    console.log("Insert Result:", null);
    console.log("Insert Error:", reason);
    return { saved: false, reason };
  }
}

export async function listSignalHistory(limit = 20): Promise<SignalHistoryResult> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data?.length) {
        return {
          signals: data as SignalRecord[],
          source: "supabase"
        };
      }

      if (error) {
        if (isSupabasePostgresConfigured()) {
          const postgresRead = await listSignalsViaPostgres(limit);

          if (!postgresRead.error && postgresRead.data?.length) {
            return {
              signals: postgresRead.data,
              source: "supabase"
            };
          }
        }

        if (isSchemaCacheError(error)) {
          const rpcRead = await listSignalsViaRpc(supabase, limit);
          const rows = normalizeSignalRows(rpcRead.data);

          if (!rpcRead.error && rows?.length) {
            return {
              signals: rows,
              source: "supabase"
            };
          }

        }

        const signals = await getFallbackSignals(limit);
        return {
          signals,
          source: "generated-fallback",
          notice: `Supabase signal history is unavailable: ${error.message}. Showing generated live analysis rows.`
        };
      }
    } catch (error) {
      const signals = await getFallbackSignals(limit);
      return {
        signals,
        source: "generated-fallback",
        notice:
          error instanceof Error
            ? `Supabase signal history is unavailable: ${error.message}. Showing generated live analysis rows.`
            : "Supabase signal history is unavailable. Showing generated live analysis rows."
      };
    }

    const signals = await getFallbackSignals(limit);
    return {
      signals,
      source: "generated-fallback",
      notice: "No saved Supabase signal history yet. Showing generated live analysis rows."
    };
  }

  try {
    const signals = await getFallbackSignals(limit);
    return {
      signals,
      source: "generated-fallback",
      notice: "Supabase is not configured. Showing generated live analysis rows."
    };
  } catch {
    return {
      signals: [],
      source: "generated-fallback",
      notice: "Unable to load signal history or generated fallback signals."
    };
  }
}

export async function listSignals(limit = 20): Promise<SignalRecord[]> {
  const history = await listSignalHistory(limit);
  return history.signals;
}

async function getFallbackSignals(limit: number): Promise<SignalRecord[]> {
  const samples = await Promise.all(
    SUPPORTED_TIMEFRAMES.map(async (timeframe) => {
      const analysis = await getMarketAnalysis({ timeframe: timeframe as Timeframe });
      return {
        id: `sample-${timeframe}`,
        ...toSignalRecord(analysis.signal),
        created_at: new Date(Date.now() - SUPPORTED_TIMEFRAMES.indexOf(timeframe) * 90 * 60 * 1000).toISOString()
      };
    })
  );

  return samples.slice(0, limit);
}
