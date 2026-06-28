import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null | undefined;
let poolSignature: string | null = null;
let loggedPostgresConfig = false;

function getDatabaseUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function maskDatabaseUrl(value: string | undefined) {
  if (!value) {
    return "missing";
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname;
    const user = parsed.username || "user";
    return `${parsed.protocol}//${user}:***@${host}${parsed.pathname}`;
  } catch {
    return "invalid";
  }
}

function logPostgresConfig(url: string | undefined) {
  if (loggedPostgresConfig) {
    return;
  }

  loggedPostgresConfig = true;
  console.info("[Supabase Postgres] Direct database fallback config", {
    configured: Boolean(url),
    url: maskDatabaseUrl(url)
  });
}

export function getSupabasePostgresPool() {
  const url = getDatabaseUrl();
  const signature = maskDatabaseUrl(url);

  if (pool !== undefined && poolSignature === signature) {
    return pool;
  }

  logPostgresConfig(url);

  if (!url) {
    pool = null;
    poolSignature = signature;
    return pool;
  }

  pool = new Pool({
    connectionString: url,
    ssl: {
      rejectUnauthorized: false
    },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  poolSignature = signature;
  return pool;
}

export function isSupabasePostgresConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getMaskedSupabasePostgresUrl() {
  return maskDatabaseUrl(getDatabaseUrl());
}

export async function querySupabasePostgres<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const client = getSupabasePostgresPool();

  if (!client) {
    return {
      data: null,
      error: "SUPABASE_DB_URL is not configured."
    };
  }

  try {
    const result = await client.query<T>(text, values);
    return {
      data: result.rows,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Direct Supabase Postgres query failed."
    };
  }
}
