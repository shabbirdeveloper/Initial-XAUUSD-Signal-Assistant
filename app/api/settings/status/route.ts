import { NextResponse } from "next/server";

function isValidSupabaseUrl(url: string | undefined) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function GET() {
  return NextResponse.json({
    twelveDataConfigured: Boolean(process.env.TWELVE_DATA_API_KEY),
    supabaseConfigured: Boolean(
      isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    )
  });
}
