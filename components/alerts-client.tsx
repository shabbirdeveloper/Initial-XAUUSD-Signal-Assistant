"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Filter,
  Gauge,
  History,
  Mail,
  MoreVertical,
  Newspaper,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type AlertDashboardData,
  type AlertInsightData,
  type AlertItemData,
  type AlertKpiData,
  type AlertSummaryData
} from "@/lib/alert-engine";
import {
  type AlertCategory,
  type AlertPriority,
  type AlertStatus,
  type Tone
} from "@/lib/alert-types";
import { clamp, cn } from "@/lib/utils";

type AlertTab = "feed" | "history";

type Kpi = {
  label: string;
  value: string;
  helper: string;
  badge: string;
  icon: LucideIcon;
  tone: Tone;
  values: number[];
};

type AlertItem = {
  id: string;
  action: string;
  category: AlertCategory;
  confidence: number;
  detail: string;
  icon: LucideIcon;
  message: string;
  metric: string;
  priority: AlertPriority;
  session: string;
  status: AlertStatus;
  symbol: string;
  time: string;
  tone: Tone;
  type: string;
};

type AlertHistory = {
  action: string;
  category: AlertCategory;
  date: string;
  id: string;
  priority: AlertPriority;
  status: AlertStatus;
  symbol: string;
  type: string;
};

type AlertCategoryCount = AlertDashboardData["categoryCounts"][number];
type IconKey = AlertItemData["iconKey"];

const iconRegistry: Record<IconKey, LucideIcon> = {
  alert: BellRing,
  clock: Clock3,
  news: Newspaper,
  radio: Radio,
  shield: ShieldAlert,
  target: Target,
  trend: TrendingUp,
  zap: Zap
};

const colors: Record<Tone, string> = {
  blue: "#38a3ff",
  cyan: "#22d3ee",
  gold: "#f8c14a",
  green: "#22c55e",
  neutral: "#94a3b8",
  red: "#ff4d5f",
  violet: "#8b5cf6"
};

const alertItems: AlertItem[] = [
  {
    action: "Sent Telegram and browser notification",
    category: "Signal",
    confidence: 86,
    detail: "XAUUSD | M15 | EMA Pullback | Entry 2,335.45 | TP 2,350.00 | SL 2,320.00",
    icon: TrendingUp,
    id: "alert-001",
    message: "BUY Signal Generated",
    metric: "2,335.45",
    priority: "High",
    session: "London",
    status: "Unread",
    symbol: "XAUUSD",
    time: "10:32 AM",
    tone: "green",
    type: "Signal Alert"
  },
  {
    action: "Trade lock warning shown",
    category: "News",
    confidence: 92,
    detail: "US Core PCE Price Index in 1h 27m. Avoid fresh entries 60 minutes before release.",
    icon: Newspaper,
    id: "alert-002",
    message: "High Impact News Incoming",
    metric: "01:27:34",
    priority: "High",
    session: "New York",
    status: "Unread",
    symbol: "USD",
    time: "10:30 AM",
    tone: "red",
    type: "News Alert"
  },
  {
    action: "Risk panel marked caution",
    category: "Risk",
    confidence: 85,
    detail: "Current daily risk used is 85% of the configured loss limit.",
    icon: AlertTriangle,
    id: "alert-003",
    message: "Risk Limit Near",
    metric: "85%",
    priority: "Medium",
    session: "London",
    status: "Unread",
    symbol: "Account",
    time: "09:45 AM",
    tone: "gold",
    type: "Risk Alert"
  },
  {
    action: "Session watchlist enabled",
    category: "Session",
    confidence: 78,
    detail: "London trading session starts in 14 minutes. Liquidity score expected to improve.",
    icon: Clock3,
    id: "alert-004",
    message: "London Session Starting",
    metric: "00:14:32",
    priority: "Low",
    session: "London",
    status: "Read",
    symbol: "XAUUSD",
    time: "09:30 AM",
    tone: "blue",
    type: "Session Alert"
  },
  {
    action: "Partial close reminder sent",
    category: "Market",
    confidence: 81,
    detail: "TP1 hit on XAUUSD buy setup. Consider moving stop loss to breakeven.",
    icon: ShieldCheck,
    id: "alert-005",
    message: "Take Profit Hit",
    metric: "2,341.20",
    priority: "High",
    session: "London",
    status: "Resolved",
    symbol: "XAUUSD",
    time: "09:15 AM",
    tone: "green",
    type: "Market Alert"
  },
  {
    action: "Volatility filter elevated",
    category: "Market",
    confidence: 74,
    detail: "ATR expansion detected on M5 and M15. Spread risk may increase.",
    icon: Zap,
    id: "alert-006",
    message: "Volatility Spike Detected",
    metric: "High",
    priority: "Medium",
    session: "New York",
    status: "Read",
    symbol: "XAUUSD",
    time: "08:55 AM",
    tone: "cyan",
    type: "Market Alert"
  }
];

const historyRows: AlertHistory[] = [
  { action: "Opened signal detail", category: "Signal", date: "Jun 19, 10:32 AM", id: "h-001", priority: "High", status: "Unread", symbol: "XAUUSD", type: "BUY Signal Generated" },
  { action: "Muted entries before news", category: "News", date: "Jun 19, 10:30 AM", id: "h-002", priority: "High", status: "Unread", symbol: "USD", type: "High Impact News Incoming" },
  { action: "Reduced risk to 0.5%", category: "Risk", date: "Jun 19, 09:45 AM", id: "h-003", priority: "Medium", status: "Read", symbol: "Account", type: "Daily Loss Limit Warning" },
  { action: "Added session watch", category: "Session", date: "Jun 19, 09:30 AM", id: "h-004", priority: "Low", status: "Read", symbol: "XAUUSD", type: "London Session Starting" },
  { action: "Moved SL to breakeven", category: "Market", date: "Jun 19, 09:15 AM", id: "h-005", priority: "High", status: "Resolved", symbol: "XAUUSD", type: "Take Profit Hit" },
  { action: "Skipped trade", category: "Risk", date: "Jun 18, 08:42 PM", id: "h-006", priority: "Critical", status: "Resolved", symbol: "Account", type: "Consecutive Loss Lock" },
  { action: "Watched FOMC window", category: "News", date: "Jun 18, 02:00 PM", id: "h-007", priority: "Critical", status: "Resolved", symbol: "USD", type: "FOMC Volatility Risk" }
];

const categoryCounts: Array<{ count: number; label: "All" | AlertCategory; tone: Tone }> = [
  { count: 128, label: "All", tone: "violet" },
  { count: 56, label: "Signal", tone: "green" },
  { count: 32, label: "News", tone: "gold" },
  { count: 18, label: "Risk", tone: "red" },
  { count: 22, label: "Session", tone: "blue" },
  { count: 14, label: "Market", tone: "cyan" }
];

const alertAccuracy = [68, 72, 75, 79, 77, 82, 86, 88, 91, 89, 92, 94];
const signalTrend = [31, 38, 42, 45, 49, 52, 56, 58];
const newsTrend = [19, 22, 27, 25, 30, 32, 31, 34];
const riskTrend = [8, 10, 12, 14, 13, 16, 18, 17];
const sessionTrend = [10, 12, 15, 17, 19, 20, 22, 24];

function hydrateKpi(kpi: AlertKpiData): Kpi {
  return {
    ...kpi,
    icon: iconRegistry[kpi.iconKey]
  };
}

function hydrateAlertItem(item: AlertItemData): AlertItem {
  return {
    ...item,
    icon: iconRegistry[item.iconKey]
  };
}

function toneClasses(tone: Tone) {
  const map: Record<Tone, { bg: string; border: string; text: string; soft: string; shadow: string }> = {
    blue: {
      bg: "bg-blue-400/15",
      border: "border-blue-300/25",
      shadow: "shadow-[0_18px_44px_rgba(37,99,235,0.16)]",
      soft: "from-blue-500/18 to-cyan-500/6",
      text: "text-blue-300"
    },
    cyan: {
      bg: "bg-cyan-300/15",
      border: "border-cyan-300/25",
      shadow: "shadow-[0_18px_44px_rgba(34,211,238,0.14)]",
      soft: "from-cyan-500/18 to-blue-500/6",
      text: "text-cyan-300"
    },
    gold: {
      bg: "bg-gold-400/15",
      border: "border-gold-300/25",
      shadow: "shadow-[0_18px_44px_rgba(248,193,74,0.14)]",
      soft: "from-gold-400/18 to-orange-500/6",
      text: "text-gold-300"
    },
    green: {
      bg: "bg-emerald-400/15",
      border: "border-emerald-300/25",
      shadow: "shadow-[0_18px_44px_rgba(34,197,94,0.14)]",
      soft: "from-emerald-500/18 to-cyan-500/6",
      text: "text-emerald-300"
    },
    neutral: {
      bg: "bg-slate-400/10",
      border: "border-slate-300/15",
      shadow: "shadow-[0_18px_44px_rgba(15,23,42,0.18)]",
      soft: "from-slate-500/14 to-slate-800/8",
      text: "text-slate-300"
    },
    red: {
      bg: "bg-rose-400/15",
      border: "border-rose-300/25",
      shadow: "shadow-[0_18px_44px_rgba(244,63,94,0.15)]",
      soft: "from-rose-500/18 to-red-500/6",
      text: "text-rose-300"
    },
    violet: {
      bg: "bg-violet-400/15",
      border: "border-violet-300/25",
      shadow: "shadow-[0_18px_44px_rgba(124,92,255,0.18)]",
      soft: "from-violet-500/18 to-cyan-500/6",
      text: "text-violet-300"
    }
  };

  return map[tone];
}

function priorityClasses(priority: AlertPriority) {
  if (priority === "Critical") return "border-rose-300/35 bg-rose-500/18 text-rose-200";
  if (priority === "High") return "border-rose-300/25 bg-rose-500/12 text-rose-200";
  if (priority === "Medium") return "border-gold-300/25 bg-gold-400/12 text-gold-200";
  return "border-blue-300/25 bg-blue-400/12 text-blue-200";
}

function linePath(values: number[], width = 160, height = 56, padding = 4) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / spread) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MiniSparkline({ values, tone = "violet" }: { values: number[]; tone?: Tone }) {
  const stroke = colors[tone];
  const path = linePath(values);

  return (
    <svg viewBox="0 0 160 56" className="h-12 w-full overflow-visible" role="img" aria-label="Alert trend sparkline">
      <path d={`${path} L 156 52 L 4 52 Z`} fill={stroke} opacity="0.12" />
      <path d={path} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" />
    </svg>
  );
}

function PanelHeader({
  action,
  eyebrow,
  title
}: {
  action?: React.ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p> : null}
        <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const tone = toneClasses(kpi.tone);

  return (
    <article className={cn("premium-panel interactive-lift overflow-hidden rounded-xl p-4", tone.shadow)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{kpi.label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{kpi.value}</p>
          <p className="mt-1 text-xs text-emerald-300">{kpi.helper}</p>
        </div>
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full border", tone.bg, tone.border, tone.text)}>
          <Icon size={24} aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2">
        <MiniSparkline values={kpi.values} tone={kpi.tone} />
      </div>
      <span className={cn("mt-2 inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold", tone.border, tone.bg, tone.text)}>
        {kpi.badge}
      </span>
    </article>
  );
}

function TopKpis({ kpis: liveKpis }: { kpis?: Kpi[] }) {
  const kpis: Kpi[] = liveKpis ?? [
    { badge: "Operations", helper: "+18% vs last 7 days", icon: BellRing, label: "Total Alerts Today", tone: "violet", value: "128", values: [62, 70, 66, 88, 91, 107, 118, 128] },
    { badge: "Live", helper: "+12% vs last 7 days", icon: Radio, label: "Active Alerts", tone: "red", value: "24", values: [14, 16, 19, 17, 20, 22, 24, 24] },
    { badge: "Signals", helper: "+15% vs last 7 days", icon: TrendingUp, label: "Signal Alerts", tone: "green", value: "56", values: signalTrend },
    { badge: "Macro", helper: "+8% vs last 7 days", icon: Newspaper, label: "News Alerts", tone: "gold", value: "32", values: newsTrend },
    { badge: "Guardrails", helper: "+25% vs last 7 days", icon: ShieldAlert, label: "Risk Alerts", tone: "red", value: "18", values: riskTrend },
    { badge: "94 / 100", helper: "+10% vs last 7 days", icon: Target, label: "Alert Accuracy Score", tone: "blue", value: "94%", values: alertAccuracy }
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-6">
      {kpis.map((kpi) => <KpiCard key={kpi.label} kpi={kpi} />)}
    </section>
  );
}

function AlertCommandCenter({ counts = categoryCounts }: { counts?: AlertCategoryCount[] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Alert Command Center" eyebrow="Current Active Alerts" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {counts.slice(1).map((category) => {
          const tone = toneClasses(category.tone);
          const priority = category.count === 0
            ? "Low"
            : category.label === "Risk"
              ? "Critical"
              : category.label === "News"
                ? "High"
                : category.label === "Signal"
                  ? "High"
                  : category.label === "Market"
                    ? "Medium"
                    : "Low";
          return (
            <article key={category.label} className={cn("rounded-xl border bg-gradient-to-br p-4", tone.border, tone.soft)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">{category.label} Alert</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{category.count}</p>
                </div>
                <span className={cn("rounded-full border px-2 py-1 text-[10px] font-bold", priorityClasses(priority as AlertPriority))}>
                  {priority}
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/[0.06]">
                <div className="h-2 rounded-full" style={{ width: `${clamp(category.count, 12, 72)}%`, backgroundColor: colors[category.tone] }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AlertFeedPanel({
  counts = categoryCounts,
  history = historyRows,
  items = alertItems
}: {
  counts?: AlertCategoryCount[];
  history?: AlertHistory[];
  items?: AlertItem[];
}) {
  const [tab, setTab] = useState<AlertTab>("feed");
  const [category, setCategory] = useState<"All" | AlertCategory>("All");
  const [query, setQuery] = useState("");
  const [readAll, setReadAll] = useState(false);

  const filteredAlerts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const categoryMatch = category === "All" || item.category === category;
      const queryMatch = !q || `${item.type} ${item.message} ${item.symbol} ${item.session}`.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [category, items, query]);

  const filteredHistory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((item) => {
      const categoryMatch = category === "All" || item.category === category;
      const queryMatch = !q || `${item.type} ${item.symbol} ${item.priority} ${item.action}`.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [category, history, query]);

  return (
    <section className="premium-panel overflow-hidden rounded-xl">
      <div className="border-b border-white/10 px-4 pt-4">
        <div className="flex gap-3">
          <button
            data-testid="alert-feed-tab"
            type="button"
            onClick={() => setTab("feed")}
            className={cn("border-b-2 px-3 pb-3 text-sm font-semibold transition", tab === "feed" ? "border-violet-400 text-white" : "border-transparent text-slate-400 hover:text-white")}
          >
            Alert Feed
          </button>
          <button
            data-testid="alert-history-tab"
            type="button"
            onClick={() => setTab("history")}
            className={cn("border-b-2 px-3 pb-3 text-sm font-semibold transition", tab === "history" ? "border-violet-400 text-white" : "border-transparent text-slate-400 hover:text-white")}
          >
            Alert History
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {counts.map((item) => {
              const tone = toneClasses(item.tone);
              const active = category === item.label;
              return (
                <button
                  key={item.label}
                  data-testid={`alert-category-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  type="button"
                  onClick={() => setCategory(item.label)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                    active ? cn(tone.border, tone.bg, "text-white") : "border-white/10 bg-white/[0.035] text-slate-300 hover:text-white"
                  )}
                >
                  {item.label} <span className={cn("rounded-full px-2 py-0.5 text-[11px]", tone.bg, tone.text)}>{item.count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <label className="flex h-10 min-w-[240px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-400">
              <Search size={16} aria-hidden="true" />
              <input
                data-testid="alert-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search alerts..."
                className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-600"
              />
            </label>
            <button
              data-testid="mark-alerts-read"
              type="button"
              onClick={() => setReadAll(true)}
              className="h-10 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-slate-200 transition hover:border-violet-300/40 hover:bg-violet-500/15"
            >
              {readAll ? "All marked read" : "Mark all as read"}
            </button>
          </div>
        </div>

        {tab === "feed" ? (
          <div className="space-y-2">
            {filteredAlerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} readAll={readAll} />
            ))}
          </div>
        ) : (
          <AlertHistoryTable rows={filteredHistory} />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-slate-400">
          <span>Showing 1 to {tab === "feed" ? filteredAlerts.length : filteredHistory.length} of {counts[0]?.count ?? 0} alerts</span>
          <div className="flex items-center gap-2">
            {["1", "2", "3", "...", "26"].map((page) => (
              <button
                key={page}
                type="button"
                className={cn("h-9 min-w-9 rounded-lg border px-3 text-sm transition", page === "1" ? "border-violet-300/50 bg-violet-500/30 text-white" : "border-white/10 bg-white/[0.035] text-slate-300")}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AlertRow({ alert, readAll }: { alert: AlertItem; readAll: boolean }) {
  const Icon = alert.icon;
  const tone = toneClasses(alert.tone);
  const status = readAll ? "Read" : alert.status;

  return (
    <article className="interactive-lift rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_110px_90px_130px] lg:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <span className={cn("mt-7 h-3 w-3 shrink-0 rounded-full shadow-[0_0_16px_currentColor]", tone.text)} />
          <span className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-full border", tone.border, tone.bg, tone.text)}>
            <Icon size={25} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{alert.message}</h3>
              <span className={cn("rounded-md border px-2 py-1 text-[11px] font-bold", priorityClasses(alert.priority))}>{alert.priority}</span>
              <span className={cn("rounded-md border px-2 py-1 text-[11px] font-semibold", status === "Unread" ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/[0.035] text-slate-400")}>{status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{alert.symbol} | {alert.session} | {alert.type}</p>
            <p className="mt-1 text-sm text-slate-400">{alert.detail}</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink-950/40 p-3 text-center">
          <p className="text-xl font-semibold text-white">{alert.metric}</p>
          <p className={cn("mt-1 text-xs font-semibold", tone.text)}>{alert.confidence}% confidence</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{alert.time}</p>
          <p className="mt-1 text-xs text-slate-500">Just now</p>
        </div>
        <div className="flex items-center justify-start gap-3 lg:justify-end">
          <button type="button" className="icon-button h-8 w-8 text-sky-300"><Send size={14} aria-hidden="true" /></button>
          <button type="button" className="icon-button h-8 w-8 text-slate-300"><BellRing size={14} aria-hidden="true" /></button>
          <button type="button" className="icon-button h-8 w-8 text-slate-300"><Mail size={14} aria-hidden="true" /></button>
          <button type="button" className="icon-button h-8 w-8 text-slate-300"><MoreVertical size={14} aria-hidden="true" /></button>
        </div>
      </div>
    </article>
  );
}

function AlertHistoryTable({ rows }: { rows: AlertHistory[] }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="min-w-[850px] w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
            {["Date", "Alert Type", "Category", "Symbol", "Priority", "Status", "Action Taken"].map((heading) => (
              <th key={heading} className="py-3 pr-4 font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/[0.055] transition hover:bg-white/[0.025]">
              <td className="py-3 pr-4 text-slate-300">{row.date}</td>
              <td className="py-3 pr-4 font-semibold text-white">{row.type}</td>
              <td className="py-3 pr-4 text-slate-300">{row.category}</td>
              <td className="py-3 pr-4 text-slate-300">{row.symbol}</td>
              <td className="py-3 pr-4"><span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", priorityClasses(row.priority))}>{row.priority}</span></td>
              <td className="py-3 pr-4 text-slate-300">{row.status}</td>
              <td className="py-3 pr-4 text-slate-300">{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsRail({ items = alertItems }: { items?: AlertItem[] }) {
  return (
    <aside className="space-y-4">
      <section className="premium-panel rounded-xl p-4">
        <PanelHeader title="Alert Settings" action={<Settings size={18} className="text-slate-400" aria-hidden="true" />} />
        <div className="space-y-4">
          <SliderSetting label="Signal Confidence" value={70} />
          <SelectSetting label="News Impact Filter" value="High & Medium" />
          <SliderSetting label="Risk Threshold" value={75} />
          <SwitchSetting active label="Session Alerts" />
          <SwitchSetting active label="Sound Notifications" />
          <SwitchSetting active label="Push Notifications" />
          <button type="button" className="mt-2 flex h-10 w-full items-center justify-between rounded-lg border border-violet-300/25 bg-violet-500/12 px-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20">
            Manage Alert Rules <ChevronDown className="-rotate-90" size={15} aria-hidden="true" />
          </button>
        </div>
      </section>
      <IntegrationsPanel />
      <LiveActivityPanel items={items} />
    </aside>
  );
}

function SliderSetting({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">{value}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/[0.08]">
        <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SelectSetting({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-300">{label}</span>
      <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold text-slate-200">
        {value} <ChevronDown size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

function SwitchSetting({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={cn("inline-flex h-6 w-12 items-center rounded-full border p-0.5 transition", active ? "border-violet-300/30 bg-violet-500/40" : "border-white/10 bg-white/[0.06]")}>
        <span className={cn("h-5 w-5 rounded-full bg-white transition", active ? "translate-x-6" : "translate-x-0")} />
      </span>
    </div>
  );
}

function IntegrationsPanel() {
  const integrations = [
    { label: "Telegram", icon: Send, tone: "blue" as Tone },
    { label: "Email", icon: Mail, tone: "red" as Tone },
    { label: "Push Notification", icon: Smartphone, tone: "cyan" as Tone }
  ];

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Integrations" action={<span className="text-xs font-semibold text-emerald-300">Connected</span>} />
      <div className="space-y-3">
        {integrations.map((item) => {
          const Icon = item.icon;
          const tone = toneClasses(item.tone);
          return (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <span className="flex items-center gap-3">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", tone.bg, tone.text)}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-white">{item.label}</span>
              </span>
              <span className="text-xs font-semibold text-emerald-300">Connected</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LiveActivityPanel({ items = alertItems }: { items?: AlertItem[] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Live Activity" action={<button type="button" className="rounded-lg border border-violet-300/25 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">View All</button>} />
      <div className="space-y-3 text-sm">
        {items.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[item.tone] }} />
              <span className="truncate text-slate-300">{item.message}</span>
            </span>
            <span className="shrink-0 text-xs text-slate-400">{item.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotificationSettings() {
  const channels = [
    { detail: "Instant signal and risk alerts", label: "Telegram", tone: "blue" as Tone },
    { detail: "Daily digest plus high priority events", label: "Email", tone: "red" as Tone },
    { detail: "Desktop and mobile app alerts", label: "Push Notifications", tone: "cyan" as Tone },
    { detail: "In-browser trading desk notifications", label: "Browser Notifications", tone: "violet" as Tone }
  ];

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Notification Settings" eyebrow="Channels" />
      <div className="grid gap-3 sm:grid-cols-2">
        {channels.map((channel) => {
          const tone = toneClasses(channel.tone);
          return (
            <div key={channel.label} className={cn("rounded-xl border bg-gradient-to-br p-4", tone.border, tone.soft)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{channel.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{channel.detail}</p>
                </div>
                <SwitchSetting active label="" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <span className="rounded-lg border border-white/10 bg-white/[0.035] p-2 text-slate-300">Instant</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.035] p-2 text-slate-300">Quiet 23-06</span>
                <span className={cn("rounded-lg border p-2", tone.border, tone.bg, tone.text)}>High+</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AlertRuleSettings() {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <RulePanel
        icon={TrendingUp}
        items={["Minimum Confidence: 70%", "Minimum AI Grade: A", "Allowed Sessions: London, New York", "Allowed Timeframes: M15, M30, H1", "Allowed Risk Levels: Low, Medium"]}
        title="Signal Alert Settings"
        tone="green"
      />
      <RulePanel
        icon={Newspaper}
        items={["CPI Alerts: Enabled", "NFP Alerts: Enabled", "FOMC Alerts: Enabled", "Fed Speech Alerts: Enabled", "High Impact USD Alerts: 60m countdown"]}
        title="News Alert Settings"
        tone="gold"
      />
      <RulePanel
        icon={ShieldAlert}
        items={["Daily Loss Limit Alert: 85%", "Weekly Loss Limit Alert: 70%", "Consecutive Loss Alert: 2 losses", "Drawdown Alert: 8%", "Overtrading Alert: 5 trades/day"]}
        title="Risk Alert Settings"
        tone="red"
      />
    </section>
  );
}

function RulePanel({ icon: Icon, items, title, tone }: { icon: LucideIcon; items: string[]; title: string; tone: Tone }) {
  const classes = toneClasses(tone);

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title={title}
        action={
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", classes.border, classes.bg, classes.text)}>
            <Icon size={17} aria-hidden="true" />
          </span>
        }
      />
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-sm">
            <span className="text-slate-300">{item}</span>
            <CheckCircle2 size={16} className={classes.text} aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}

function AiAlertIntelligence({ insights: liveInsights }: { insights?: AlertInsightData[] }) {
  const insights = liveInsights ?? [
    { label: "Too many low-quality signals detected during M5 volatility spikes.", tone: "gold" as Tone },
    { label: "High volatility expected in 45 minutes because USD news risk is elevated.", tone: "red" as Tone },
    { label: "Risk threshold almost reached. Reduce position size until daily reset.", tone: "red" as Tone },
    { label: "Best trading window begins in 30 minutes during London/New York overlap.", tone: "green" as Tone }
  ];

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="AI Alert Intelligence" eyebrow="Recommendation Engine" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-xl border border-violet-300/25 bg-violet-500/10 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-500/20 text-violet-200">
              <BrainCircuit size={23} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">AI Monitoring Status</p>
              <p className="text-xs text-slate-400">Operations desk is active across signal, news, risk, session, and market alerts.</p>
            </div>
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">Caution</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Keep alerts active, but avoid taking new trades until the high-impact USD event window clears or volatility contracts.
          </p>
        </div>
        <div className="space-y-3">
          {insights.map((insight) => {
            const tone = toneClasses(insight.tone);
            return (
              <div key={insight.label} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.bg, tone.text)}>
                  <Zap size={15} aria-hidden="true" />
                </span>
                <p className="text-sm leading-6 text-slate-300">{insight.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AlertPerformanceAnalytics({
  accuracyTrend = alertAccuracy,
  counts = categoryCounts
}: {
  accuracyTrend?: number[];
  counts?: AlertCategoryCount[];
}) {
  const fallbackBars = [
    { label: "Signal", tone: "green" as Tone, value: 56 },
    { label: "News", tone: "gold" as Tone, value: 32 },
    { label: "Risk", tone: "red" as Tone, value: 18 },
    { label: "Session", tone: "blue" as Tone, value: 22 },
    { label: "Market", tone: "cyan" as Tone, value: 14 }
  ];
  const bars = counts.length > 1
    ? counts.slice(1).map((item) => ({ label: item.label, tone: item.tone, value: item.count }))
    : fallbackBars;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="premium-panel rounded-xl p-4">
        <PanelHeader title="Alert Performance Analytics" eyebrow="Monitoring Quality" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="chart-surface rounded-xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">Alerts Triggered</p>
            <div className="mt-5 flex h-44 items-end gap-5 border-b border-white/10 px-2 pb-3">
              {bars.map((bar) => (
                <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">{bar.value}</span>
                  <span
                    className="w-full max-w-12 rounded-t-lg"
                    style={{
                      background: `linear-gradient(180deg, ${colors[bar.tone]}, rgba(124,92,255,0.22))`,
                      height: `${bar.value * 2.4}px`
                    }}
                  />
                  <span className="text-[11px] text-slate-500">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-surface rounded-xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">Alert Accuracy</p>
            <MiniSparkline values={accuracyTrend} tone="violet" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatTile label="Most Valuable" tone="green" value="Signal Alerts" />
              <StatTile label="Response Rate" tone="cyan" value="88%" />
              <StatTile label="False Positive" tone="gold" value="6%" />
              <StatTile label="Accuracy" tone="violet" value={`${accuracyTrend.at(-1) ?? 94}%`} />
            </div>
          </div>
        </div>
      </section>
      <section className="premium-panel rounded-xl p-4">
        <PanelHeader title="Most Valuable Alert Types" />
        <div className="space-y-4">
          {[
            { label: "Signal Alerts", value: 94, tone: "green" as Tone },
            { label: "Risk Alerts", value: 91, tone: "red" as Tone },
            { label: "News Alerts", value: 86, tone: "gold" as Tone },
            { label: "Session Alerts", value: 78, tone: "blue" as Tone }
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-300">{item.label}</span>
                <span className="font-semibold text-white">{item.value}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/[0.06]">
                <div className="h-2 rounded-full" style={{ width: `${item.value}%`, backgroundColor: colors[item.tone] }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function StatTile({ label, tone, value }: { label: string; tone: Tone; value: string }) {
  const classes = toneClasses(tone);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={cn("mt-2 text-lg font-semibold", classes.text)}>{value}</p>
    </div>
  );
}

function BottomSummary({ summary }: { summary?: AlertSummaryData[] }) {
  const items = summary?.map((item) => ({
    ...item,
    icon: iconRegistry[item.iconKey]
  })) ?? [
    { helper: "BUY signal generated", icon: BellRing, label: "Most Triggered Alert", tone: "violet" as Tone, value: "Signal Alert" },
    { helper: "94% precision", icon: Target, label: "Highest Accuracy Alert", tone: "green" as Tone, value: "Risk Limit" },
    { helper: "USD Core PCE", icon: AlertTriangle, label: "Highest Priority Event", tone: "red" as Tone, value: "High Impact News" },
    { helper: "1h 27m left", icon: Newspaper, label: "Most Important News Event", tone: "gold" as Tone, value: "US Core PCE" },
    { helper: "Monitoring all channels", icon: Radio, label: "Current System Status", tone: "cyan" as Tone, value: "Operational" },
    { helper: "Protect capital first", icon: BrainCircuit, label: "AI Recommendation", tone: "violet" as Tone, value: "Trade Caution" }
  ];

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Bottom Summary" eyebrow="Operations Snapshot" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {items.map((item) => {
          const Icon = item.icon;
          const tone = toneClasses(item.tone);
          return (
            <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tone.bg, tone.text)}>
                <Icon size={16} aria-hidden="true" />
              </div>
              <p className="mt-3 text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 font-semibold text-white">{item.value}</p>
              <p className={cn("mt-1 text-xs", tone.text)}>{item.helper}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AlertsClient() {
  const [data, setData] = useState<AlertDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/alerts", {
          cache: "no-store"
        });
        const payload = response.ok
          ? (await response.json()) as AlertDashboardData
          : { error: `Alert API returned ${response.status}` };

        if (cancelled) {
          return;
        }

        if ("error" in payload) {
          setLoadError(String(payload.error));
          return;
        }

        setData(payload);
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load real alert data.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAlerts();
    const timer = setInterval(loadAlerts, 60_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const liveItems = useMemo(() => data?.items.map(hydrateAlertItem) ?? alertItems, [data]);
  const liveHistory = data?.historyRows ?? historyRows;
  const liveCounts = data?.categoryCounts ?? categoryCounts;
  const liveKpis = useMemo(() => data?.kpis.map(hydrateKpi), [data]);
  const unreadCount = liveItems.filter((item) => item.status === "Unread").length;

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Alert Center</h1>
          <p className="mt-1 text-sm text-slate-400">Manage all trading alerts and notifications in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-violet-400/40 bg-violet-500/30 px-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(124,92,255,0.22)] transition hover:bg-violet-500/40">
            <Plus size={16} aria-hidden="true" />
            Create Alert
          </button>
          <button type="button" className="icon-button relative">
            <BellRing size={16} aria-hidden="true" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>
          </button>
          <button type="button" className="icon-button"><History size={16} aria-hidden="true" /></button>
          <button type="button" className="icon-button"><Filter size={16} aria-hidden="true" /></button>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
            <CalendarDays size={16} aria-hidden="true" />
            {data ? new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(data.generatedAt)) : "Live Alerts"}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      {loadError ? (
        <div className="rounded-xl border border-gold-400/25 bg-gold-400/10 px-4 py-3 text-sm text-gold-100">
          Real alert feed unavailable: {loadError}. Showing fallback alert desk data.
        </div>
      ) : null}
      {isLoading && !data ? (
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
          Loading real signal, news, risk, session, and market alerts...
        </div>
      ) : null}

      <TopKpis kpis={liveKpis} />
      <AlertCommandCenter counts={liveCounts} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.34fr)]">
        <AlertFeedPanel counts={liveCounts} history={liveHistory} items={liveItems} />
        <SettingsRail items={liveItems} />
      </section>

      <NotificationSettings />
      <AlertRuleSettings />
      <AiAlertIntelligence insights={data?.insights} />
      <AlertPerformanceAnalytics accuracyTrend={data?.accuracyTrend} counts={liveCounts} />
      <BottomSummary summary={data?.summary} />
    </div>
  );
}
