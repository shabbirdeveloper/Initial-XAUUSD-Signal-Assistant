"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownUp,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  Filter,
  Gauge,
  Layers3,
  LineChart,
  Medal,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trophy,
  Zap
} from "lucide-react";
import {
  SUPPORTED_TIMEFRAMES,
  type SignalRecord,
  type SignalType,
  type Timeframe
} from "@/lib/types";
import { type SignalHistorySource } from "@/lib/repositories/signals";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";

type SessionName = "Sydney" | "Tokyo" | "London" | "New York";
type Grade = "A+" | "A" | "B" | "C";
type ResultState = "Active" | "Qualified" | "Watch" | "No Trade";
type RiskLevel = "Low" | "Medium" | "High";
type SortKey =
  | "created_at"
  | "symbol"
  | "timeframe"
  | "signal_type"
  | "confidence"
  | "entry_price"
  | "stop_loss"
  | "take_profit_1"
  | "take_profit_2"
  | "risk_reward"
  | "result"
  | "session";

type SortDirection = "asc" | "desc";

interface EnrichedSignal extends SignalRecord {
  aiConfidence: number;
  grade: Grade;
  marketBias: "Bullish" | "Bearish" | "Neutral";
  marketCondition: string;
  newsRisk: RiskLevel;
  qualityScore: number;
  result: ResultState;
  riskLevel: RiskLevel;
  session: SessionName;
  sessionStrength: string;
  liquidityScore: number;
}

const sessionNames: SessionName[] = ["Sydney", "Tokyo", "London", "New York"];
const performanceTimeframes: Timeframe[] = ["5m", "15m", "30m", "1h", "4h", "D"];

function gradeFromConfidence(confidence: number): Grade {
  if (confidence >= 90) {
    return "A+";
  }
  if (confidence >= 78) {
    return "A";
  }
  if (confidence >= 60) {
    return "B";
  }
  return "C";
}

function sessionFromDate(value: string): SessionName {
  const hour = new Date(value).getUTCHours();

  if (hour >= 13 && hour < 22) {
    return "New York";
  }
  if (hour >= 7 && hour < 16) {
    return "London";
  }
  if (hour >= 0 && hour < 7) {
    return "Tokyo";
  }
  return "Sydney";
}

function riskLevel(signal: SignalRecord): RiskLevel {
  if (signal.signal_type === "HOLD") {
    return "Low";
  }
  if (signal.confidence >= 78 && signal.risk_reward >= 1.8) {
    return "Low";
  }
  if (signal.confidence >= 60) {
    return "Medium";
  }
  return "High";
}

function resultState(signal: SignalRecord): ResultState {
  if (signal.signal_type === "HOLD") {
    return "No Trade";
  }

  const ageHours = (Date.now() - new Date(signal.created_at).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 12) {
    return "Active";
  }
  return signal.confidence >= 70 ? "Qualified" : "Watch";
}

function liquidityScore(session: SessionName, confidence: number) {
  const base = session === "London" || session === "New York" ? 76 : session === "Tokyo" ? 62 : 54;
  return Math.min(100, Math.round(base + confidence * 0.18));
}

function enrichSignal(signal: SignalRecord): EnrichedSignal {
  const session = sessionFromDate(signal.created_at);
  const risk = riskLevel(signal);
  const qualityScore = Math.min(
    100,
    Math.round(signal.confidence * 0.74 + signal.risk_reward * 8 + (signal.signal_type === "HOLD" ? 0 : 7))
  );
  const marketBias =
    signal.signal_type === "BUY" ? "Bullish" : signal.signal_type === "SELL" ? "Bearish" : "Neutral";
  const condition =
    signal.confidence >= 75
      ? "Trend aligned"
      : signal.confidence >= 60
        ? "Developing setup"
        : "Mixed range";

  return {
    ...signal,
    aiConfidence: signal.confidence,
    grade: gradeFromConfidence(signal.confidence),
    marketBias,
    marketCondition: condition,
    newsRisk: signal.confidence < 45 || signal.signal_type === "HOLD" ? "Medium" : "Low",
    qualityScore,
    result: resultState(signal),
    riskLevel: risk,
    session,
    sessionStrength: session === "London" || session === "New York" ? "Institutional flow" : "Moderate flow",
    liquidityScore: liquidityScore(session, signal.confidence)
  };
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function signalTone(signalType: SignalType) {
  if (signalType === "BUY") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (signalType === "SELL") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }
  return "border-gold-400/20 bg-gold-400/10 text-gold-300";
}

function resultTone(result: ResultState) {
  if (result === "Active") {
    return "border-violet-400/20 bg-violet-400/12 text-violet-200";
  }
  if (result === "Qualified") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (result === "No Trade") {
    return "border-slate-400/15 bg-slate-400/10 text-slate-300";
  }
  return "border-gold-400/20 bg-gold-400/10 text-gold-300";
}

function riskTone(risk: RiskLevel) {
  if (risk === "Low") {
    return "text-emerald-300";
  }
  if (risk === "High") {
    return "text-rose-300";
  }
  return "text-gold-300";
}

function timeframeLabel(timeframe: Timeframe) {
  return timeframe === "D" ? "Daily" : timeframe.toUpperCase();
}

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function monthKey(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short" });
}

function groupBy<T extends string>(signals: EnrichedSignal[], keyFn: (signal: EnrichedSignal) => T) {
  return signals.reduce<Record<T, EnrichedSignal[]>>((groups, signal) => {
    const key = keyFn(signal);
    groups[key] = groups[key] ?? [];
    groups[key].push(signal);
    return groups;
  }, {} as Record<T, EnrichedSignal[]>);
}

function qualityRate(signals: EnrichedSignal[]) {
  if (!signals.length) {
    return 0;
  }
  const qualified = signals.filter((signal) => signal.qualityScore >= 70).length;
  return (qualified / signals.length) * 100;
}

function sortValue(signal: EnrichedSignal, key: SortKey) {
  if (key === "result") {
    return signal.result;
  }
  if (key === "session") {
    return signal.session;
  }
  return signal[key];
}

function Sparkline({ values, tone = "violet" }: { values: number[]; tone?: "violet" | "cyan" | "green" | "gold" }) {
  const safeValues = values.length > 1 ? values : [0, values[0] ?? 0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const points = safeValues
    .map((value, index) => {
      const x = (index / Math.max(1, safeValues.length - 1)) * 116 + 2;
      const y = 40 - ((value - min) / range) * 30;
      return `${x},${y}`;
    })
    .join(" ");
  const color = {
    violet: "#7c5cff",
    cyan: "#22d3ee",
    green: "#34d399",
    gold: "#f8c14a"
  }[tone];

  return (
    <svg className="h-12 w-28" viewBox="0 0 120 44" fill="none" aria-hidden="true">
      <polyline points={points} stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`2,42 ${points} 118,42`} fill={color} opacity="0.12" />
    </svg>
  );
}

function LargeLineChart({ values, tone = "cyan" }: { values: number[]; tone?: "cyan" | "violet" | "green" | "gold" }) {
  const safeValues = values.length > 1 ? values : [0, values[0] ?? 0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const color = {
    cyan: "#22d3ee",
    violet: "#7c5cff",
    green: "#34d399",
    gold: "#f8c14a"
  }[tone];
  const points = safeValues.map((value, index) => {
    const x = (index / Math.max(1, safeValues.length - 1)) * 328 + 16;
    const y = 132 - ((value - min) / range) * 96;
    return { x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `16,144 ${line} 344,144`;

  return (
    <svg className="h-40 w-full" viewBox="0 0 360 160" fill="none" preserveAspectRatio="none" aria-hidden="true">
      {[36, 60, 84, 108, 132].map((y) => (
        <line key={y} x1="12" x2="348" y1={y} y2={y} stroke="rgba(148, 163, 184, 0.10)" />
      ))}
      {[72, 144, 216, 288].map((x) => (
        <line key={x} x1={x} x2={x} y1="24" y2="144" stroke="rgba(148, 163, 184, 0.08)" />
      ))}
      <polygon points={area} fill={color} opacity="0.13" />
      <polyline points={line} stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {points.slice(-1).map((point) => (
        <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="5" fill={color} />
      ))}
    </svg>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const color = value >= 70 ? "#34d399" : value >= 50 ? "#f8c14a" : "#fb7185";
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${Math.max(5, value) * 3.6}deg, rgba(148, 163, 184, 0.18) 0deg)`
      }}
    >
      <span className="h-3.5 w-3.5 rounded-full bg-[#07111f]" />
    </span>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  badge,
  trend,
  sparkValues,
  tone = "cyan"
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Activity;
  badge: string;
  trend: string;
  sparkValues: number[];
  tone?: "violet" | "cyan" | "green" | "gold";
}) {
  const toneClass = {
    violet: "text-violet-300 from-violet-500/20",
    cyan: "text-cyan-300 from-cyan-300/20",
    green: "text-emerald-300 from-emerald-400/20",
    gold: "text-gold-400 from-gold-400/20"
  }[tone];

  return (
    <section className="premium-panel interactive-lift min-h-[150px] overflow-hidden rounded-xl p-5">
      <div className={cn("absolute right-0 top-0 h-24 w-28 bg-gradient-to-bl to-transparent blur-xl", toneClass)} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
          <p className="mt-4 text-3xl font-semibold leading-none text-white">{value}</p>
          <p className="mt-3 text-sm text-slate-400">{helper}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon size={18} className={cn("shrink-0", toneClass.split(" ")[0])} aria-hidden="true" />
        </span>
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-3">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-200">
          {badge}
        </span>
        <div className="flex flex-col items-end gap-1">
          <Sparkline values={sparkValues} tone={tone} />
          <span className="text-[11px] font-medium text-emerald-300">{trend}</span>
        </div>
      </div>
    </section>
  );
}

function LinePanel({
  title,
  subtitle,
  values,
  tone = "cyan"
}: {
  title: string;
  subtitle: string;
  values: number[];
  tone?: "cyan" | "violet" | "green" | "gold";
}) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <LineChart size={17} className="text-cyan-300" aria-hidden="true" />
      </div>
      <div className="chart-surface rounded-xl p-3">
        <LargeLineChart values={values} tone={tone} />
      </div>
    </section>
  );
}

function BarPanel({
  title,
  subtitle,
  data,
  tone = "cyan"
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; value: number }>;
  tone?: "cyan" | "violet" | "green" | "gold";
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const color = {
    cyan: "from-cyan-400 to-blue-500",
    violet: "from-violet-500 to-fuchsia-400",
    green: "from-emerald-400 to-cyan-300",
    gold: "from-gold-400 to-amber-200"
  }[tone];

  return (
    <section className="premium-panel rounded-xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <BarChart3 size={17} className="text-violet-300" aria-hidden="true" />
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-400">{item.label}</span>
              <span className="font-semibold text-white">{Math.round(item.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className={cn("h-full rounded-full bg-gradient-to-r", color)} style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExplanationRow({ label, value, score }: { label: string; value: string; score: number }) {
  const tone = score >= 70 ? "bg-emerald-400" : score >= 50 ? "bg-gold-400" : "bg-rose-400";
  return (
    <div className="glass-tile rounded-xl p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
        <span className="text-xs font-semibold text-white">{score}%</span>
      </div>
      <p className="mt-2 text-sm text-slate-200">{value}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function SignalHistoryTable({
  signals,
  source = "generated-fallback",
  notice
}: {
  signals: SignalRecord[];
  source?: SignalHistorySource;
  notice?: string;
}) {
  const enrichedSignals = useMemo(() => signals.map(enrichSignal), [signals]);
  const [query, setQuery] = useState("");
  const [signalFilter, setSignalFilter] = useState<SignalType | "ALL">("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<Timeframe | "ALL">("ALL");
  const [sessionFilter, setSessionFilter] = useState<SessionName | "ALL">("ALL");
  const [showFilters, setShowFilters] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "created_at",
    direction: "desc"
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(enrichedSignals[0]?.id ?? null);

  const today = dayKey(new Date().toISOString());
  const selectedSignal = enrichedSignals.find((signal) => signal.id === selectedId) ?? enrichedSignals[0];
  const latestSignal = enrichedSignals[0];
  const sampleMode = enrichedSignals.length > 0 && enrichedSignals.every((signal) => signal.id.startsWith("sample-"));
  const sourceLabel = source === "supabase" ? "Supabase history" : "Generated live analysis";
  const activeSignals = enrichedSignals.filter((signal) => signal.result === "Active");
  const avgRiskReward = average(enrichedSignals.map((signal) => signal.risk_reward));
  const modeledWinRate = qualityRate(enrichedSignals);
  const todayCount = enrichedSignals.filter((signal) => dayKey(signal.created_at) === today).length;
  const signalsByTimeframe = groupBy(enrichedSignals, (signal) => signal.timeframe);
  const bestTimeframe =
    Object.entries(signalsByTimeframe)
      .map(([timeframe, rows]) => ({ timeframe, score: qualityRate(rows) }))
      .sort((a, b) => b.score - a.score)[0]?.timeframe ?? "--";
  const dateRange = enrichedSignals.length
    ? `${formatDateTime(enrichedSignals[enrichedSignals.length - 1].created_at)} - ${formatDateTime(enrichedSignals[0].created_at)}`
    : "No signal range";

  const filteredSignals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return enrichedSignals.filter((signal) => {
      const matchesQuery =
        !normalizedQuery ||
        [signal.symbol, signal.timeframe, signal.signal_type, signal.explanation, signal.session]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesSignal = signalFilter === "ALL" || signal.signal_type === signalFilter;
      const matchesTimeframe = timeframeFilter === "ALL" || signal.timeframe === timeframeFilter;
      const matchesSession = sessionFilter === "ALL" || signal.session === sessionFilter;
      return matchesQuery && matchesSignal && matchesTimeframe && matchesSession;
    });
  }, [enrichedSignals, query, signalFilter, sessionFilter, timeframeFilter]);

  const sortedSignals = useMemo(() => {
    return [...filteredSignals].sort((first, second) => {
      const firstValue = sortValue(first, sort.key);
      const secondValue = sortValue(second, sort.key);
      const direction = sort.direction === "asc" ? 1 : -1;

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return (firstValue - secondValue) * direction;
      }

      return String(firstValue).localeCompare(String(secondValue)) * direction;
    });
  }, [filteredSignals, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedSignals.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedSignals = sortedSignals.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const confidenceSeries = enrichedSignals
    .slice()
    .reverse()
    .map((signal) => signal.confidence);
  const qualitySeries = enrichedSignals
    .slice()
    .reverse()
    .map((signal) => signal.qualityScore);
  const confidenceBuckets = [
    { label: "0-39", value: enrichedSignals.filter((signal) => signal.confidence < 40).length },
    { label: "40-59", value: enrichedSignals.filter((signal) => signal.confidence >= 40 && signal.confidence < 60).length },
    { label: "60-79", value: enrichedSignals.filter((signal) => signal.confidence >= 60 && signal.confidence < 80).length },
    { label: "80-100", value: enrichedSignals.filter((signal) => signal.confidence >= 80).length }
  ];
  const timeframeChart = SUPPORTED_TIMEFRAMES.map((timeframe) => ({
    label: timeframeLabel(timeframe),
    value: signalsByTimeframe[timeframe]?.length ?? 0
  }));
  const signalsBySession = groupBy(enrichedSignals, (signal) => signal.session);
  const sessionChart = sessionNames.map((session) => ({
    label: session,
    value: signalsBySession[session]?.length ?? 0
  }));
  const monthlyChart = Object.entries(groupBy(enrichedSignals, (signal) => monthKey(signal.created_at))).map(
    ([label, rows]) => ({
      label,
      value: average(rows.map((signal) => signal.qualityScore))
    })
  );
  const bestSession =
    sessionNames
      .map((session) => ({ session, score: qualityRate(signalsBySession[session] ?? []) }))
      .sort((a, b) => b.score - a.score)[0]?.session ?? "London";

  function updateSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc"
    }));
  }

  function exportCsv() {
    const headers = [
      "Date",
      "Symbol",
      "Timeframe",
      "Signal",
      "Confidence",
      "Entry",
      "Stop Loss",
      "TP1",
      "TP2",
      "Risk Reward",
      "Result",
      "Session"
    ];
    const rows = sortedSignals.map((signal) => [
      formatDateTime(signal.created_at),
      signal.symbol,
      signal.timeframe,
      signal.signal_type,
      `${signal.confidence}%`,
      formatPrice(signal.entry_price),
      formatPrice(signal.stop_loss),
      formatPrice(signal.take_profit_1),
      formatPrice(signal.take_profit_2),
      `1:${signal.risk_reward.toFixed(1)}`,
      signal.result,
      signal.session
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "xauusd-signals.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const kpiSpark = confidenceSeries.length ? confidenceSeries : [0, 20, 40, 60];

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <p className="text-sm font-semibold text-gold-400">XAUUSD / Gold</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-4xl">Signals</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Institutional signal management terminal for saved XAUUSD signal records and performance intelligence.
          </p>
          <span
            className={cn(
              "mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase",
              source === "supabase"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-gold-400/20 bg-gold-400/10 text-gold-300"
            )}
          >
            {sourceLabel}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200">
            <CalendarDays size={15} className="text-cyan-300" aria-hidden="true" />
            {dateRange}
          </span>
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
          >
            <Filter size={16} aria-hidden="true" />
            Filters
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex h-10 items-center gap-2 rounded-lg border border-violet-400/30 bg-gradient-to-r from-violet-600 to-indigo-500 px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(99,102,241,0.24)] transition hover:from-violet-500 hover:to-indigo-400"
          >
            <Download size={16} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </section>

      {sampleMode || notice ? (
        <section className="rounded-xl border border-gold-400/25 bg-gold-400/10 px-4 py-3 text-sm leading-6 text-gold-100 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          {notice ??
            "Showing generated fallback signals because no Supabase signal history is available or the live market provider is rate-limited."}{" "}
          Save a signal from the Dashboard after live data loads to replace these rows with stored records.
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Total Signals Generated"
          value={String(enrichedSignals.length)}
          helper="Loaded records"
          icon={Activity}
          badge="All time"
          trend="+ live history"
          sparkValues={kpiSpark}
          tone="violet"
        />
        <KpiCard
          label="Today's Signals"
          value={String(todayCount)}
          helper="Current local day"
          icon={CalendarDays}
          badge="Daily flow"
          trend="+ refreshed"
          sparkValues={confidenceSeries.slice(-8)}
          tone="cyan"
        />
        <KpiCard
          label="Active Signals"
          value={String(activeSignals.length)}
          helper="Open signal states"
          icon={Zap}
          badge="Desk watch"
          trend="+ monitored"
          sparkValues={activeSignals.map((signal) => signal.confidence)}
          tone="gold"
        />
        <KpiCard
          label="Signal Win Rate"
          value={percent(modeledWinRate)}
          helper="Quality model"
          icon={Gauge}
          badge="A/B grade"
          trend="+ modeled"
          sparkValues={qualitySeries}
          tone="green"
        />
        <KpiCard
          label="Average Risk Reward"
          value={`1 : ${avgRiskReward.toFixed(2)}`}
          helper="Saved signal RR"
          icon={Target}
          badge="Risk desk"
          trend="+ balanced"
          sparkValues={enrichedSignals.map((signal) => signal.risk_reward * 40)}
          tone="cyan"
        />
        <KpiCard
          label="Best Performing Timeframe"
          value={timeframeLabel(bestTimeframe as Timeframe)}
          helper="By quality score"
          icon={Trophy}
          badge="Top TF"
          trend="+ leader"
          sparkValues={Object.values(signalsByTimeframe).map((rows) => qualityRate(rows))}
          tone="gold"
        />
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <section className="premium-panel overflow-hidden rounded-xl p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-cyan-200">Signal Command Center</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Current Active Signal</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Front-desk view of the latest saved signal, quality grade, session context, and risk posture.
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                Terminal online
              </span>
            </div>

            {latestSignal ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-6">
                {[
                  { label: "Recommendation", value: latestSignal.signal_type, tone: signalTone(latestSignal.signal_type) },
                  { label: "Confidence Score", value: `${latestSignal.confidence}%`, tone: "border-violet-400/20 bg-violet-400/10 text-violet-200" },
                  { label: "AI Grade", value: latestSignal.grade, tone: "border-gold-400/20 bg-gold-400/10 text-gold-300" },
                  { label: "Risk Level", value: latestSignal.riskLevel, tone: "border-slate-400/15 bg-white/[0.04] text-slate-200" },
                  { label: "Session", value: latestSignal.session, tone: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" },
                  { label: "Market Condition", value: latestSignal.marketCondition, tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" }
                ].map((item) => (
                  <div key={item.label} className={cn("glass-tile rounded-xl p-4", item.tone)}>
                    <p className="text-[11px] font-semibold uppercase text-slate-400">{item.label}</p>
                    <p className="mt-3 truncate text-xl font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-6 text-sm text-slate-400">
                No saved signal records are available yet.
              </div>
            )}
          </section>

          <section className="premium-panel min-w-0 overflow-hidden rounded-xl p-5">
            <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Advanced Signal Table</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Search, filter, sort, export, and quick-view saved signal records.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="relative block">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search signals..."
                    className="h-10 w-full min-w-60 rounded-lg border border-white/10 bg-ink-950/60 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                  />
                </label>
              </div>
            </div>

            {showFilters ? (
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <select
                  value={signalFilter}
                  onChange={(event) => {
                    setSignalFilter(event.target.value as SignalType | "ALL");
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  <option value="ALL">All signals</option>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                  <option value="HOLD">HOLD</option>
                </select>
                <select
                  value={timeframeFilter}
                  onChange={(event) => {
                    setTimeframeFilter(event.target.value as Timeframe | "ALL");
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  <option value="ALL">All timeframes</option>
                  {SUPPORTED_TIMEFRAMES.map((timeframe) => (
                    <option key={timeframe} value={timeframe}>
                      {timeframeLabel(timeframe)}
                    </option>
                  ))}
                </select>
                <select
                  value={sessionFilter}
                  onChange={(event) => {
                    setSessionFilter(event.target.value as SessionName | "ALL");
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  <option value="ALL">All sessions</option>
                  {sessionNames.map((session) => (
                    <option key={session} value={session}>
                      {session}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="max-w-full overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[1340px] border-collapse text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-slate-400">
                  <tr>
                    {[
                      ["Date", "created_at"],
                      ["Symbol", "symbol"],
                      ["Timeframe", "timeframe"],
                      ["Signal", "signal_type"],
                      ["Confidence", "confidence"],
                      ["Entry", "entry_price"],
                      ["Stop Loss", "stop_loss"],
                      ["TP1", "take_profit_1"],
                      ["TP2", "take_profit_2"],
                      ["Risk Reward", "risk_reward"],
                      ["Result", "result"],
                      ["Session", "session"]
                    ].map(([label, key]) => (
                      <th key={key} className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => updateSort(key as SortKey)}
                          className="inline-flex items-center gap-1.5 text-left transition hover:text-white"
                        >
                          {label}
                          <ArrowDownUp size={12} aria-hidden="true" />
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold">Quick View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {paginatedSignals.length ? (
                    paginatedSignals.map((signal) => (
                      <tr
                        key={signal.id}
                        className={cn(
                          "transition hover:bg-cyan-300/[0.04]",
                          selectedSignal?.id === signal.id ? "bg-violet-400/[0.055]" : "bg-ink-900/30"
                        )}
                      >
                        <td className="px-4 py-3 text-slate-300">
                          <span className="inline-flex items-center gap-2">
                            <Clock3 size={15} className="text-slate-500" aria-hidden="true" />
                            {formatDateTime(signal.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">{signal.symbol}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-200">
                            {timeframeLabel(signal.timeframe)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", signalTone(signal.signal_type))}>
                            {signal.signal_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-white">
                            <ConfidenceDot value={signal.confidence} />
                            {signal.confidence}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200">{formatPrice(signal.entry_price)}</td>
                        <td className="px-4 py-3 text-slate-200">{formatPrice(signal.stop_loss)}</td>
                        <td className="px-4 py-3 text-slate-200">{formatPrice(signal.take_profit_1)}</td>
                        <td className="px-4 py-3 text-slate-200">{formatPrice(signal.take_profit_2)}</td>
                        <td className="px-4 py-3 text-slate-200">1 : {signal.risk_reward.toFixed(1)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", resultTone(signal.result))}>
                            {signal.result}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200">{signal.session}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(signal.id)}
                            className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
                          >
                            <Eye size={14} aria-hidden="true" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="px-4 py-10 text-center text-slate-500">
                        No signal records match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 text-sm text-slate-400 lg:flex-row lg:items-center">
              <p>
                Showing {paginatedSignals.length ? (currentPage - 1) * rowsPerPage + 1 : 0} to{" "}
                {Math.min(currentPage * rowsPerPage, sortedSignals.length)} of {sortedSignals.length} signals
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className="icon-button disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <span className="rounded-lg border border-white/10 bg-violet-500 px-3 py-2 text-xs font-bold text-white">
                  {currentPage}
                </span>
                <span className="text-xs text-slate-500">of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage === totalPages}
                  className="icon-button disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
                <label className="ml-0 flex items-center gap-2 lg:ml-3">
                  Rows
                  <select
                    value={rowsPerPage}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-9 rounded-lg border border-white/10 bg-ink-950/60 px-2 text-sm text-white outline-none"
                  >
                    {[8, 10, 15, 20].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="premium-panel rounded-xl p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-gold-400" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-white">Intelligence Panel</h2>
            </div>
            {selectedSignal ? (
              <div className="mt-5 space-y-3">
                {[
                  ["Current Market Bias", selectedSignal.marketBias],
                  ["Current Recommendation", selectedSignal.signal_type],
                  ["News Risk", selectedSignal.newsRisk],
                  ["Current Session", selectedSignal.session],
                  ["Liquidity Score", `${selectedSignal.liquidityScore}%`],
                  ["AI Confidence", `${selectedSignal.aiConfidence}%`]
                ].map(([label, value]) => (
                  <div key={label} className="glass-tile flex items-center justify-between gap-3 rounded-xl p-3">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-sm font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Select a signal to load intelligence details.</p>
            )}
          </section>

          <section className="premium-panel rounded-xl p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-cyan-300" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-white">Signal Quality Engine</h2>
            </div>
            {selectedSignal ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-gold-400/20 bg-gold-400/10 p-4">
                  <p className="text-xs font-semibold uppercase text-gold-300">Current Grade</p>
                  <p className="mt-2 text-4xl font-bold text-white">{selectedSignal.grade}</p>
                </div>
                {[
                  ["Quality Score", `${selectedSignal.qualityScore}%`],
                  ["Confidence", `${selectedSignal.confidence}%`],
                  ["Historical Success Rate", percent(qualityRate(enrichedSignals.filter((signal) => signal.grade === selectedSignal.grade)))],
                  ["Risk Rating", selectedSignal.riskLevel]
                ].map(([label, value]) => (
                  <div key={label} className="glass-tile flex items-center justify-between rounded-xl p-3">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className={cn("text-sm font-semibold text-white", label === "Risk Rating" && riskTone(selectedSignal.riskLevel))}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </aside>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Signal Analytics</h2>
            <p className="mt-1 text-sm text-slate-400">Professional visual readout using saved signal confidence and quality scores.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <LinePanel title="Signal Accuracy Trend" subtitle="Quality score progression" values={qualitySeries} tone="green" />
          <BarPanel title="Confidence Distribution" subtitle="Signals by confidence bucket" data={confidenceBuckets} tone="violet" />
          <BarPanel title="Signals by Timeframe" subtitle="Record count by timeframe" data={timeframeChart} tone="cyan" />
          <BarPanel title="Signals by Session" subtitle="Record count by session" data={sessionChart} tone="gold" />
          <LinePanel title="Win Rate Trend" subtitle="Modeled grade quality trend" values={qualitySeries.slice(-24)} tone="violet" />
          <BarPanel title="Monthly Signal Performance" subtitle="Average quality by month" data={monthlyChart} tone="green" />
        </div>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="premium-panel min-w-0 rounded-xl p-5">
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-cyan-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">AI Signal Explanation Panel</h2>
          </div>
          {selectedSignal ? (
            <>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                <span className="font-semibold text-gold-300">Why Signal Was Generated:</span>{" "}
                {selectedSignal.explanation}
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ExplanationRow label="EMA Structure" value={selectedSignal.explanation.toLowerCase().includes("ema") ? "EMA condition referenced in signal notes" : "No EMA detail stored"} score={selectedSignal.qualityScore} />
                <ExplanationRow label="RSI Status" value={selectedSignal.explanation.toLowerCase().includes("rsi") ? "RSI filter included in reasoning" : "RSI detail inferred from confidence"} score={Math.max(35, selectedSignal.confidence - 5)} />
                <ExplanationRow label="MACD Status" value={selectedSignal.explanation.toLowerCase().includes("macd") ? "MACD momentum referenced" : "Momentum note not stored"} score={Math.max(30, selectedSignal.confidence - 8)} />
                <ExplanationRow label="Market Structure" value={selectedSignal.marketCondition} score={selectedSignal.qualityScore} />
                <ExplanationRow label="Liquidity" value={`${selectedSignal.session} ${selectedSignal.sessionStrength}`} score={selectedSignal.liquidityScore} />
                <ExplanationRow label="News Impact" value={`${selectedSignal.newsRisk} news risk`} score={selectedSignal.newsRisk === "Low" ? 82 : 55} />
                <ExplanationRow label="Session Strength" value={selectedSignal.sessionStrength} score={selectedSignal.liquidityScore} />
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Select a signal to inspect its reasoning.</p>
          )}
        </section>

        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-center gap-2">
            <Medal size={18} className="text-gold-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Grade Bands</h2>
          </div>
          <div className="mt-5 space-y-3">
            {(["A+", "A", "B", "C"] as Grade[]).map((grade) => {
              const rows = enrichedSignals.filter((signal) => signal.grade === grade);
              return (
                <div key={grade} className="glass-tile rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{grade}</span>
                    <span className="text-xs font-semibold text-slate-400">{rows.length} signals</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span className="text-slate-500">Quality</span>
                    <span className="text-right font-semibold text-white">{percent(average(rows.map((signal) => signal.qualityScore)))}</span>
                    <span className="text-slate-500">Success Rate</span>
                    <span className="text-right font-semibold text-white">{percent(qualityRate(rows))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-center gap-2">
            <Layers3 size={18} className="text-cyan-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Timeframe Performance</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {performanceTimeframes.map((timeframe) => {
              const rows = signalsByTimeframe[timeframe] ?? [];
              return (
                <div key={timeframe} className="glass-tile rounded-xl p-4">
                  <p className="text-xl font-semibold text-white">{timeframeLabel(timeframe)}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">Win Rate</dt>
                      <dd className="font-semibold text-emerald-300">{percent(qualityRate(rows))}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">Profit Factor</dt>
                      <dd className="font-semibold text-white">{(average(rows.map((row) => row.risk_reward)) || 0).toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">Total Signals</dt>
                      <dd className="font-semibold text-white">{rows.length}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </section>

        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-gold-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Session Performance</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sessionNames.map((session) => {
              const rows = signalsBySession[session] ?? [];
              const isBest = session === bestSession;
              return (
                <div
                  key={session}
                  className={cn(
                    "glass-tile rounded-xl p-4",
                    isBest && "border-gold-400/35 bg-gold-400/10 shadow-[0_0_32px_rgba(248,193,74,0.08)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-white">{session}</p>
                    {isBest ? <span className="rounded-full bg-gold-400 px-2 py-1 text-[10px] font-bold text-ink-950">Best</span> : null}
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">Signal Count</dt>
                      <dd className="font-semibold text-white">{rows.length}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">Win Rate</dt>
                      <dd className="font-semibold text-emerald-300">{percent(qualityRate(rows))}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-400">Average RR</dt>
                      <dd className="font-semibold text-white">{(average(rows.map((row) => row.risk_reward)) || 0).toFixed(2)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
