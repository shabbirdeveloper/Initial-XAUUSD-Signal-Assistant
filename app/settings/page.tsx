import { SettingsPanel } from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <SettingsPanel
      initialStatus={{
        twelveDataConfigured: Boolean(process.env.TWELVE_DATA_API_KEY),
        supabaseConfigured: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
            (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        )
      }}
    />
  );
}
