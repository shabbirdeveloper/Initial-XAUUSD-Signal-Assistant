import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getMaskedSupabasePostgresUrl,
  isSupabasePostgresConfigured,
  querySupabasePostgres
} from "@/lib/supabase/postgres";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export const dynamic = "force-dynamic";

function mask(value: string | undefined) {
  if (!value) {
    return "missing";
  }

  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : `${value.slice(0, 2)}...${value.slice(-2)}`;
}

function getProjectRefFromUrl(url: string | undefined) {
  if (!url) {
    return "missing";
  }

  try {
    return new URL(url).hostname.split(".")[0] ?? "invalid";
  } catch {
    return "invalid";
  }
}

function getProjectRefFromJwt(token: string | undefined) {
  if (!token) {
    return {
      ref: "missing",
      role: "missing"
    };
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return {
        ref: "invalid",
        role: "invalid"
      };
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { ref?: string; role?: string };
    return {
      ref: parsed.ref ?? "missing",
      role: parsed.role ?? "missing"
    };
  } catch {
    return {
      ref: "invalid",
      role: "invalid"
    };
  }
}

async function probeTable(table: "signals" | "backtests") {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      table,
      ok: false,
      error: "Supabase URL/key is missing."
    };
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data, error, status, statusText } = await supabase
    .from(table)
    .select("id")
    .limit(1);

  return {
    table,
    ok: !error,
    rowCount: data?.length ?? 0,
    status,
    statusText,
    error: error
      ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }
      : null
  };
}

function getDiagnosticClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function writeDiagnosticSignal() {
  const supabase = getDiagnosticClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Supabase URL/key is missing."
    };
  }

  const payload = {
    symbol: "XAUUSD",
    timeframe: "15m",
    signal_type: "HOLD",
    confidence: 1,
    entry_price: 1,
    stop_loss: 1,
    take_profit_1: 1,
    take_profit_2: 1,
    risk_reward: 1,
    explanation: "diagnostic insert from local app",
    created_at: new Date().toISOString()
  };

  const { data, error, status, statusText } = await supabase.from("signals").insert(payload).select();

  return {
    ok: !error,
    status,
    statusText,
    data,
    error: error
      ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }
      : null
  };
}

async function probeRpcFallback(shouldWrite: boolean) {
  const supabase = getDiagnosticClient();

  if (!supabase) {
    return {
      listSignals: { ok: false, error: "Supabase URL/key is missing." },
      listBacktests: { ok: false, error: "Supabase URL/key is missing." },
      writeSignal: null
    };
  }

  const listSignalsJson = await supabase.rpc("list_signal_records_json", { payload: { limit: 1 } });
  const listBacktestsJson = await supabase.rpc("list_backtest_records_json", { payload: { limit: 1 } });
  const listSignals = listSignalsJson.error ? await supabase.rpc("list_signal_records", { p_limit: 1 }) : listSignalsJson;
  const listBacktests = listBacktestsJson.error ? await supabase.rpc("list_backtest_records", { p_limit: 1 }) : listBacktestsJson;
  const writeSignalJson = shouldWrite
    ? await supabase.rpc("insert_signal_record_json", {
        payload: {
          symbol: "XAUUSD",
          timeframe: "15m",
          signal_type: "HOLD",
          confidence: 1,
          entry_price: 1,
          stop_loss: 1,
          take_profit_1: 1,
          take_profit_2: 1,
          risk_reward: 1,
          explanation: "diagnostic json rpc insert from local app",
          created_at: new Date().toISOString()
        }
      })
    : null;
  const writeSignal = shouldWrite && writeSignalJson?.error
    ? await supabase.rpc("insert_signal_record", {
        p_symbol: "XAUUSD",
        p_timeframe: "15m",
        p_signal_type: "HOLD",
        p_confidence: 1,
        p_entry_price: 1,
        p_stop_loss: 1,
        p_take_profit_1: 1,
        p_take_profit_2: 1,
        p_risk_reward: 1,
        p_explanation: "diagnostic rpc insert from local app",
        p_created_at: new Date().toISOString()
      })
    : writeSignalJson;

  return {
    jsonRpcExposure: {
      listSignals: {
        ok: !listSignalsJson.error,
        status: listSignalsJson.status,
        statusText: listSignalsJson.statusText,
        error: listSignalsJson.error
          ? {
              code: listSignalsJson.error.code,
              message: listSignalsJson.error.message,
              details: listSignalsJson.error.details,
              hint: listSignalsJson.error.hint
            }
          : null
      },
      listBacktests: {
        ok: !listBacktestsJson.error,
        status: listBacktestsJson.status,
        statusText: listBacktestsJson.statusText,
        error: listBacktestsJson.error
          ? {
              code: listBacktestsJson.error.code,
              message: listBacktestsJson.error.message,
              details: listBacktestsJson.error.details,
              hint: listBacktestsJson.error.hint
            }
          : null
      },
      writeSignal: writeSignalJson
        ? {
            ok: !writeSignalJson.error,
            status: writeSignalJson.status,
            statusText: writeSignalJson.statusText,
            error: writeSignalJson.error
              ? {
                  code: writeSignalJson.error.code,
                  message: writeSignalJson.error.message,
                  details: writeSignalJson.error.details,
                  hint: writeSignalJson.error.hint
                }
              : null
          }
        : null
    },
    listSignals: {
      ok: !listSignals.error,
      status: listSignals.status,
      statusText: listSignals.statusText,
      rowCount: listSignals.data?.length ?? 0,
      error: listSignals.error
        ? {
            code: listSignals.error.code,
            message: listSignals.error.message,
            details: listSignals.error.details,
            hint: listSignals.error.hint
          }
        : null
    },
    listBacktests: {
      ok: !listBacktests.error,
      status: listBacktests.status,
      statusText: listBacktests.statusText,
      rowCount: listBacktests.data?.length ?? 0,
      error: listBacktests.error
        ? {
            code: listBacktests.error.code,
            message: listBacktests.error.message,
            details: listBacktests.error.details,
            hint: listBacktests.error.hint
          }
        : null
    },
    writeSignal: writeSignal
      ? {
          ok: !writeSignal.error,
          status: writeSignal.status,
          statusText: writeSignal.statusText,
          rowCount: writeSignal.data?.length ?? 0,
          error: writeSignal.error
            ? {
                code: writeSignal.error.code,
                message: writeSignal.error.message,
                details: writeSignal.error.details,
                hint: writeSignal.error.hint
              }
            : null
        }
      : null
  };
}

async function fetchRestOpenApiTables() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      ok: false,
      tables: [],
      error: "Supabase URL/key is missing."
    };
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`
      },
      cache: "no-store"
    });
    const payload = (await response.json()) as { definitions?: Record<string, unknown>; paths?: Record<string, unknown> };
    const definitions = Object.keys(payload.definitions ?? {});
    const paths = Object.keys(payload.paths ?? {}).map((path) => path.replace(/^\//, ""));
    const tables = [...new Set([...definitions, ...paths])].sort();

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      tables,
      hasSignals: tables.includes("signals"),
      hasBacktests: tables.includes("backtests")
    };
  } catch (error) {
    return {
      ok: false,
      tables: [],
      error: error instanceof Error ? error.message : "Unable to fetch Supabase REST OpenAPI schema."
    };
  }
}

async function probeDirectPostgres(shouldWrite: boolean) {
  if (!isSupabasePostgresConfigured()) {
    return {
      configured: false,
      url: getMaskedSupabasePostgresUrl(),
      selectSignals: null,
      selectBacktests: null,
      writeSignal: null
    };
  }

  const selectSignals = await querySupabasePostgres<{ id: string }>("select id from public.signals order by created_at desc limit 1");
  const selectBacktests = await querySupabasePostgres<{ id: string }>("select id from public.backtests order by created_at desc limit 1");
  const writeSignal = shouldWrite
    ? await querySupabasePostgres<{ id: string }>(
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
          values ('XAUUSD', '15m', 'HOLD', 1, 1, 1, 1, 1, 1, 'diagnostic direct postgres insert from local app', now())
          returning id;
        `
      )
    : null;

  return {
    configured: true,
    url: getMaskedSupabasePostgresUrl(),
    selectSignals: {
      ok: !selectSignals.error,
      rowCount: selectSignals.data?.length ?? 0,
      error: selectSignals.error
    },
    selectBacktests: {
      ok: !selectBacktests.error,
      rowCount: selectBacktests.data?.length ?? 0,
      error: selectBacktests.error
    },
    writeSignal: writeSignal
      ? {
          ok: !writeSignal.error,
          rowCount: writeSignal.data?.length ?? 0,
          error: writeSignal.error
        }
      : null
  };
}

export async function GET(request: Request) {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const activeKey = serviceRoleKey || anonKey;
  const urlProjectRef = getProjectRefFromUrl(url);
  const anon = getProjectRefFromJwt(anonKey);
  const active = getProjectRefFromJwt(activeKey);
  const { searchParams } = new URL(request.url);
  const shouldWrite = searchParams.get("write") === "true";

  const [signals, backtests] = await Promise.all([probeTable("signals"), probeTable("backtests")]);
  const restSchema = await fetchRestOpenApiTables();
  const diagnosticWrite = shouldWrite ? await writeDiagnosticSignal() : null;
  const rpcFallback = await probeRpcFallback(shouldWrite);
  const directPostgres = await probeDirectPostgres(shouldWrite);

  return NextResponse.json({
    connectedProject: {
      url: url ? `${urlProjectRef}.supabase.co` : "missing",
      urlProjectRef,
      anonProjectRef: anon.ref,
      anonRole: anon.role,
      activeKeyProjectRef: active.ref,
      activeKeyRole: active.role,
      anonKey: mask(anonKey),
      serviceRoleConfigured: Boolean(serviceRoleKey),
      activeKey: mask(activeKey),
      refsMatch:
        urlProjectRef !== "missing" &&
        urlProjectRef !== "invalid" &&
        anon.ref === urlProjectRef &&
        active.ref === urlProjectRef
    },
    tableProbe: {
      signals,
      backtests
    },
    restSchema,
    rpcFallback,
    directPostgres,
    diagnosticWrite,
    expectedFix:
      signals.ok && backtests.ok && (!shouldWrite || diagnosticWrite?.ok)
        ? "Supabase REST can see both tables."
        : rpcFallback.listSignals.ok && rpcFallback.listBacktests.ok && (!shouldWrite || rpcFallback.writeSignal?.ok)
          ? "Supabase table REST is not exposed, but RPC fallback is working."
          : directPostgres.configured && directPostgres.selectSignals?.ok && directPostgres.selectBacktests?.ok && (!shouldWrite || directPostgres.writeSignal?.ok)
            ? "Supabase REST/RPC is still not exposed, but direct Postgres fallback is working."
            : "Supabase REST/RPC is not exposed. Add SUPABASE_DB_URL for direct server fallback, or fix Data API exposure/cache in Supabase."
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
