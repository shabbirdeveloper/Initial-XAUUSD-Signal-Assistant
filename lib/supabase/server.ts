import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isValidSupabaseUrl, normalizeSupabaseUrl } from "@/lib/supabase/url";

let cachedClient: SupabaseClient | null | undefined;
let cachedClientSignature: string | null = null;
let loggedSupabaseConfig = false;

function maskSecret(value: string | undefined) {
  if (!value) {
    return "missing";
  }

  if (value.length <= 12) {
    return `${value.slice(0, 2)}...${value.slice(-2)}`;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getProjectRefFromUrl(url: string) {
  try {
    return new URL(url).hostname.split(".")[0] ?? "unknown";
  } catch {
    return "invalid";
  }
}

function getProjectRefFromJwt(token: string | undefined) {
  if (!token) {
    return "missing";
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return "invalid";
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as { ref?: string };
    return parsed.ref ?? "missing";
  } catch {
    return "invalid";
  }
}

function logSupabaseConfig(url: string | undefined, anonKey: string | undefined, activeKey: string | undefined) {
  if (loggedSupabaseConfig) {
    return;
  }

  loggedSupabaseConfig = true;

  const projectRef = url && isValidSupabaseUrl(url) ? getProjectRefFromUrl(url) : "invalid";
  const anonProjectRef = getProjectRefFromJwt(anonKey);
  const activeProjectRef = getProjectRefFromJwt(activeKey);

  console.info("[Supabase] Server client config", {
    url: url ? `${projectRef}.supabase.co` : "missing",
    anonKey: maskSecret(anonKey),
    activeKey: maskSecret(activeKey),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    projectRef,
    anonProjectRef,
    activeProjectRef,
    refsMatch: projectRef !== "invalid" && projectRef === anonProjectRef && projectRef === activeProjectRef
  });
}

export function getSupabaseServerClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const signature = `${url ?? "missing"}:${maskSecret(key)}`;

  if (cachedClient !== undefined && cachedClientSignature === signature) {
    return cachedClient;
  }

  logSupabaseConfig(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, key);

  if (!isValidSupabaseUrl(url) || !key) {
    cachedClient = null;
    cachedClientSignature = signature;
    return cachedClient;
  }

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  cachedClientSignature = signature;

  return cachedClient;
}
