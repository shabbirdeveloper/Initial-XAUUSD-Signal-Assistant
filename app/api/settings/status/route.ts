import { NextResponse } from "next/server";
import { isValidSupabaseUrl } from "@/lib/supabase/url";

export function GET() {
  return NextResponse.json({
    twelveDataConfigured: Boolean(process.env.TWELVE_DATA_API_KEY),
    supabaseConfigured: Boolean(
      isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    )
  });
}
