"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Save, ShieldAlert, XCircle } from "lucide-react";

export function SettingsPanel({
  initialStatus
}: {
  initialStatus: {
    twelveDataConfigured: boolean;
    supabaseConfigured: boolean;
  };
}) {
  const [riskPercent, setRiskPercent] = useState("1");
  const [defaultTimeframe, setDefaultTimeframe] = useState("1h");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedRisk = window.localStorage.getItem("xauusd:riskPercent");
    const storedTimeframe = window.localStorage.getItem("xauusd:defaultTimeframe");
    if (storedRisk) {
      setRiskPercent(storedRisk);
    }
    if (storedTimeframe) {
      setDefaultTimeframe(storedTimeframe);
    }
  }, []);

  function handleSave() {
    window.localStorage.setItem("xauusd:riskPercent", riskPercent);
    window.localStorage.setItem("xauusd:defaultTimeframe", defaultTimeframe);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm font-medium text-gold-400">Configuration</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          API and risk preferences for analysis. Secrets stay in environment variables.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="panel rounded-md p-4">
          <div className="mb-5 flex items-center gap-2">
            <KeyRound size={18} className="text-gold-400" aria-hidden="true" />
            <h2 className="text-base font-semibold text-white">Provider Status</h2>
          </div>

          <div className="space-y-3">
            <StatusRow
              label="Twelve Data"
              detail="TWELVE_DATA_API_KEY"
              configured={initialStatus.twelveDataConfigured}
            />
            <StatusRow
              label="Supabase"
              detail="NEXT_PUBLIC_SUPABASE_URL + key"
              configured={initialStatus.supabaseConfigured}
            />
          </div>
        </div>

        <div className="panel rounded-md p-4">
          <div className="mb-5 flex items-center gap-2">
            <ShieldAlert size={18} className="text-cyan-300" aria-hidden="true" />
            <h2 className="text-base font-semibold text-white">Risk Defaults</h2>
          </div>

          <label className="block text-sm text-slate-300">
            Risk per trade
            <input
              value={riskPercent}
              onChange={(event) => setRiskPercent(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none ring-gold-400/40 focus:ring-2"
              inputMode="decimal"
            />
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            Default timeframe
            <select
              value={defaultTimeframe}
              onChange={(event) => setDefaultTimeframe(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none ring-gold-400/40 focus:ring-2"
            >
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="30m">30m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="D">D</option>
              <option value="W">W</option>
              <option value="M">M</option>
            </select>
          </label>

          <button
            type="button"
            onClick={handleSave}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-gold-400 px-4 text-sm font-semibold text-ink-950 transition hover:bg-gold-300"
          >
            <Save size={16} aria-hidden="true" />
            {saved ? "Saved" : "Save Settings"}
          </button>
        </div>
      </section>
    </div>
  );
}

function StatusRow({ label, detail, configured }: { label: string; detail: string; configured: boolean }) {
  const Icon = configured ? CheckCircle2 : XCircle;

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-ink-950/42 p-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
      <div className={configured ? "flex items-center gap-2 text-emerald-300" : "flex items-center gap-2 text-slate-500"}>
        <Icon size={17} aria-hidden="true" />
        <span className="text-xs font-semibold">{configured ? "Configured" : "Mock mode"}</span>
      </div>
    </div>
  );
}
