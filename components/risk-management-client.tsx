"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileText,
  Filter,
  Gauge,
  LineChart,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  XCircle,
  Zap,
  type LucideIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { clamp, cn, formatDateTime, formatPrice, formatPercent } from "@/lib/utils";

type Tone = "green" | "red" | "gold" | "cyan" | "violet" | "blue" | "neutral";
type RiskStatus = "SAFE" | "CAUTION" | "DANGER" | "STOP TRADING";
type TradeDirection = "BUY" | "SELL";
type RiskResult = "Win" | "Loss" | "Open" | "Breakeven";
type RiskGrade = "A+" | "A" | "B" | "C";
type SortKey = "date" | "risk" | "grade" | "result";

type RiskTrade = {
  id: string;
  date: string;
  symbol: string;
  direction: TradeDirection;
  entry: number;
  stopLoss: number;
  riskPercent: number;
  dollarRisk: number;
  result: RiskResult;
  ruleViolated: string;
  grade: RiskGrade;
  session: string;
  timeframe: string;
  rr: number;
};

type Kpi = {
  label: string;
  value: string;
  helper: string;
  badge: string;
  trend: string;
  icon: LucideIcon;
  tone: Tone;
  values: number[];
};

type ProtectionRule = {
  name: string;
  detail: string;
  limit: string;
  usage: string;
  percent: number;
  active: boolean;
  status: "Clear" | "Watch" | "Locked";
};

type QualityScore = {
  label: string;
  score: number;
  detail: string;
};

const RISK_TRADES: RiskTrade[] = [
  {
    date: "2026-06-19T10:32:00.000Z",
    direction: "BUY",
    dollarRisk: 85,
    entry: 4235.4,
    grade: "A",
    id: "risk-001",
    result: "Win",
    riskPercent: 0.85,
    rr: 1.8,
    ruleViolated: "None",
    session: "London",
    stopLoss: 4214.2,
    symbol: "XAUUSD",
    timeframe: "M15"
  },
  {
    date: "2026-06-18T16:10:00.000Z",
    direction: "SELL",
    dollarRisk: 110,
    entry: 4248.7,
    grade: "B",
    id: "risk-002",
    result: "Loss",
    riskPercent: 1.1,
    rr: -1,
    ruleViolated: "Late NY volatility",
    session: "New York",
    stopLoss: 4263.6,
    symbol: "XAUUSD",
    timeframe: "M5"
  },
  {
    date: "2026-06-18T09:20:00.000Z",
    direction: "BUY",
    dollarRisk: 75,
    entry: 4218.35,
    grade: "A+",
    id: "risk-003",
    result: "Win",
    riskPercent: 0.75,
    rr: 2.2,
    ruleViolated: "None",
    session: "London",
    stopLoss: 4205.9,
    symbol: "XAUUSD",
    timeframe: "M30"
  },
  {
    date: "2026-06-17T14:05:00.000Z",
    direction: "SELL",
    dollarRisk: 95,
    entry: 4262.8,
    grade: "A",
    id: "risk-004",
    result: "Breakeven",
    riskPercent: 0.95,
    rr: 0,
    ruleViolated: "None",
    session: "New York",
    stopLoss: 4278.1,
    symbol: "XAUUSD",
    timeframe: "H1"
  },
  {
    date: "2026-06-16T23:55:00.000Z",
    direction: "BUY",
    dollarRisk: 130,
    entry: 4221.6,
    grade: "C",
    id: "risk-005",
    result: "Loss",
    riskPercent: 1.3,
    rr: -1,
    ruleViolated: "Overtrading lock",
    session: "Tokyo",
    stopLoss: 4208.4,
    symbol: "XAUUSD",
    timeframe: "M5"
  },
  {
    date: "2026-06-16T08:40:00.000Z",
    direction: "BUY",
    dollarRisk: 80,
    entry: 4198.1,
    grade: "A",
    id: "risk-006",
    result: "Win",
    riskPercent: 0.8,
    rr: 1.5,
    ruleViolated: "None",
    session: "London",
    stopLoss: 4185.2,
    symbol: "XAUUSD",
    timeframe: "H1"
  },
  {
    date: "2026-06-15T22:15:00.000Z",
    direction: "SELL",
    dollarRisk: 70,
    entry: 4207.7,
    grade: "B",
    id: "risk-007",
    result: "Open",
    riskPercent: 0.7,
    rr: 0,
    ruleViolated: "None",
    session: "Sydney",
    stopLoss: 4219.5,
    symbol: "XAUUSD",
    timeframe: "H4"
  },
  {
    date: "2026-06-14T13:45:00.000Z",
    direction: "SELL",
    dollarRisk: 120,
    entry: 4258.2,
    grade: "B",
    id: "risk-008",
    result: "Loss",
    riskPercent: 1.2,
    rr: -1,
    ruleViolated: "News risk lock",
    session: "New York",
    stopLoss: 4270.2,
    symbol: "XAUUSD",
    timeframe: "M15"
  },
  {
    date: "2026-06-13T07:35:00.000Z",
    direction: "BUY",
    dollarRisk: 65,
    entry: 4176.4,
    grade: "A+",
    id: "risk-009",
    result: "Win",
    riskPercent: 0.65,
    rr: 2.4,
    ruleViolated: "None",
    session: "London",
    stopLoss: 4164.8,
    symbol: "XAUUSD",
    timeframe: "M30"
  },
  {
    date: "2026-06-12T01:10:00.000Z",
    direction: "BUY",
    dollarRisk: 90,
    entry: 4162.5,
    grade: "B",
    id: "risk-010",
    result: "Win",
    riskPercent: 0.9,
    rr: 1.2,
    ruleViolated: "None",
    session: "Tokyo",
    stopLoss: 4149.1,
    symbol: "XAUUSD",
    timeframe: "H4"
  }
];

const EQUITY_VALUES = [
  7600, 7820, 7950, 8300, 8120, 8750, 9020, 8840, 9360, 9660, 9520, 10040, 10220, 10880, 11260, 10980, 11620,
  11380, 12040, 11790, 12160, 11340, 10320, 9358
];
const DRAWDOWN_VALUES = [
  -1.8, -2.1, -2.9, -4.2, -2.2, -1.6, -1.9, -2.4, -1.2, -1.5, -3.6, -1.8, -1.4, -3.9, -5.2, -2.2, -1.1,
  -4.4, -2.1, -4.9, -2.8, -6.1, -8.2, -6.42
];

const PROTECTION_RULES: ProtectionRule[] = [
  {
    active: true,
    detail: "Lock trading after reaching daily loss limit",
    limit: "2.00%",
    name: "Daily Loss Lock",
    percent: 42,
    status: "Clear",
    usage: "0.85%"
  },
  {
    active: true,
    detail: "Lock trading after reaching weekly loss limit",
    limit: "5.00%",
    name: "Weekly Loss Lock",
    percent: 38,
    status: "Clear",
    usage: "1.92%"
  },
  {
    active: true,
    detail: "Pause after 5 consecutive losses",
    limit: "5 losses",
    name: "Consecutive Loss Lock",
    percent: 40,
    status: "Watch",
    usage: "2 losses"
  },
  {
    active: true,
    detail: "Maximum trades allowed in one trading day",
    limit: "5 trades",
    name: "Max Trades Per Day",
    percent: 60,
    status: "Watch",
    usage: "3 trades"
  },
  {
    active: false,
    detail: "Avoid new trades near high-impact USD events",
    limit: "60 min",
    name: "News Risk Lock",
    percent: 28,
    status: "Clear",
    usage: "32 min away"
  },
  {
    active: true,
    detail: "Stop after impulsive entries or rule breaks",
    limit: "2 flags",
    name: "Overtrading Lock",
    percent: 50,
    status: "Watch",
    usage: "1 flag"
  }
];

const QUALITY_SCORES: QualityScore[] = [
  { detail: "Sizing remains under 1% on clean setups.", label: "Position Size Discipline", score: 86 },
  { detail: "Most trades use structural stops, not random distance.", label: "Stop Loss Discipline", score: 82 },
  { detail: "Daily loss remains far below the hard stop.", label: "Daily Loss Discipline", score: 78 },
  { detail: "Three trades today is acceptable but close to watch level.", label: "Trade Frequency Discipline", score: 72 },
  { detail: "One recent trade ignored a news-risk warning.", label: "News Avoidance Discipline", score: 68 }
];

const DRAW_DOWN_HISTORY = [
  { period: "1", drawdown: "-11.28%", start: "Apr 21, 2026", end: "May 02, 2026", duration: "11d", repaired: false },
  { period: "2", drawdown: "-8.65%", start: "May 12, 2026", end: "May 18, 2026", duration: "6d", repaired: true },
  { period: "3", drawdown: "-6.42%", start: "Jun 08, 2026", end: "Jun 11, 2026", duration: "3d", repaired: true },
  { period: "4", drawdown: "-5.21%", start: "Jun 15, 2026", end: "Jun 16, 2026", duration: "1d", repaired: true }
];

const HEATMAP_DAYS = [
  { label: "Mon", values: [0.42, 0.88, 0.85] },
  { label: "Tue", values: [0.65, 1.21, 0.42] },
  { label: "Wed", values: [0.21, 0.32, 0.65] },
  { label: "Thu", values: [0.78, 0.95, 0] },
  { label: "Fri", values: [0.32, 0.62, null] },
  { label: "Sat", values: [null, 0.1, null] },
  { label: "Sun", values: [null, 0.05, null] }
];

const SESSION_RISK = [
  { label: "Sydney", value: 0.42, status: "Low" },
  { label: "Tokyo", value: 0.86, status: "Moderate" },
  { label: "London", value: 0.54, status: "Low" },
  { label: "New York", value: 1.36, status: "High" },
  { label: "Ldn + NY", value: 1.18, status: "Moderate" }
];

const TIMEFRAME_RISK = [
  { label: "M5", value: 1.52, status: "High" },
  { label: "M15", value: 0.96, status: "Moderate" },
  { label: "M30", value: 0.58, status: "Low" },
  { label: "H1", value: 0.71, status: "Low" },
  { label: "H4", value: 0.62, status: "Low" },
  { label: "Daily", value: 0.44, status: "Low" }
];

function toneClasses(tone: Tone) {
  return {
    blue: "border-blue-400/25 bg-blue-400/10 text-blue-300",
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-300",
    gold: "border-gold-400/25 bg-gold-400/10 text-gold-300",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    neutral: "border-white/10 bg-white/[0.045] text-slate-300",
    red: "border-rose-400/25 bg-rose-400/10 text-rose-300",
    violet: "border-violet-400/25 bg-violet-400/10 text-violet-300"
  }[tone];
}

function statusTone(status: RiskStatus): Tone {
  if (status === "SAFE") return "green";
  if (status === "CAUTION") return "gold";
  if (status === "DANGER") return "red";
  return "red";
}

function gradeFromScore(score: number): RiskGrade {
  if (score >= 88) return "A+";
  if (score >= 76) return "A";
  if (score >= 62) return "B";
  return "C";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

function linePath(values: number[], width = 420, height = 160, pad = 12) {
  const safe = values.length > 1 ? values : [0, values[0] ?? 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const step = safe.length > 1 ? (width - pad * 2) / (safe.length - 1) : 0;
  const points = safe.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const area = `M ${points[0].x.toFixed(2)} ${height - pad} ${points.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")} L ${points[points.length - 1].x.toFixed(2)} ${height - pad} Z`;

  return { area, path };
}

function percentWidth(value: number) {
  return `${clamp(value, 0, 100).toFixed(0)}%`;
}

function MiniSparkline({ color = "#34d399", values }: { color?: string; values: number[] }) {
  const path = linePath(values, 116, 44, 5);

  return (
    <svg className="h-11 w-28 shrink-0" viewBox="0 0 116 44" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d={path.area} fill={color} opacity="0.13" />
      <path d={path.path} stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicroBars({ color = "#7c5cff", values }: { color?: string; values: number[] }) {
  const max = Math.max(...values, 1);

  return (
    <div className="flex h-12 w-24 items-end gap-1.5" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="w-2 rounded-t-sm"
          style={{
            background: `linear-gradient(180deg, ${color}, rgba(34, 211, 238, 0.26))`,
            height: `${Math.max(14, (value / max) * 46)}px`
          }}
        />
      ))}
    </div>
  );
}

function RingGauge({
  label,
  score,
  tone = "green"
}: {
  label?: string;
  score: number;
  tone?: "green" | "red" | "gold" | "violet" | "cyan";
}) {
  const colors = {
    cyan: "#22d3ee",
    gold: "#f8c14a",
    green: "#34d399",
    red: "#fb7185",
    violet: "#7c5cff"
  };
  const color = colors[tone];

  return (
    <div
      className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${score * 3.6}deg, rgba(51,65,85,0.52) 0deg)`
      }}
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-ink-950/95 shadow-[inset_0_0_18px_rgba(255,255,255,0.04)]">
        <div className="text-center">
          <p className="text-xl font-semibold text-white">{score}</p>
          {label ? <p className="text-[10px] uppercase text-slate-500">{label}</p> : null}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const color = kpi.tone === "red" ? "#fb7185" : kpi.tone === "gold" ? "#f8c14a" : kpi.tone === "violet" ? "#7c5cff" : "#34d399";

  return (
    <section className="premium-panel interactive-lift overflow-hidden rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn("grid h-11 w-11 place-items-center rounded-full border", toneClasses(kpi.tone))}>
            <Icon size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{kpi.value}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={cn("rounded-full border px-2 py-0.5 font-semibold", toneClasses(kpi.tone))}>{kpi.badge}</span>
              <span className={cn(kpi.tone === "red" ? "text-rose-300" : "text-emerald-300")}>{kpi.trend}</span>
            </div>
          </div>
        </div>
        <MiniSparkline color={color} values={kpi.values} />
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
        <span
          className="block h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}, rgba(34,211,238,0.65))`,
            width: percentWidth(kpi.values[kpi.values.length - 1] ?? 50)
          }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">{kpi.helper}</p>
    </section>
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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p> : null}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MetricRow({
  label,
  tone = "green",
  value
}: {
  label: string;
  tone?: Tone;
  value: number;
}) {
  const color = tone === "red" ? "bg-rose-400" : tone === "gold" ? "bg-gold-400" : tone === "violet" ? "bg-violet-400" : "bg-emerald-400";

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
      <div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400">{label}</span>
          <span className="font-semibold text-white">{value.toFixed(0)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800/80">
          <span className={cn("block h-full rounded-full", color)} style={{ width: percentWidth(value) }} />
        </div>
      </div>
    </div>
  );
}

function EquityDrawdownChart() {
  const equity = linePath(EQUITY_VALUES, 640, 270, 22);
  const drawdown = linePath(DRAWDOWN_VALUES, 640, 270, 22);

  return (
    <div className="chart-surface relative h-[324px] overflow-hidden rounded-xl border border-white/10 p-4">
      <div className="mb-2 flex items-center gap-5 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-4 rounded-full bg-violet-400" />
          Equity
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-4 rounded-full bg-rose-400" />
          Drawdown %
        </span>
      </div>
      <svg className="h-[260px] w-full" viewBox="0 0 640 270" fill="none" preserveAspectRatio="none" aria-label="Equity and drawdown overview">
        {[0, 1, 2, 3, 4].map((line) => (
          <line key={line} x1="22" x2="618" y1={34 + line * 48} y2={34 + line * 48} stroke="rgba(148,163,184,0.13)" />
        ))}
        <path d={equity.area} fill="url(#riskEquityFill)" />
        <path d={equity.path} stroke="#7c5cff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={drawdown.path} stroke="#fb4545" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="618" cy="237" r="5" fill="#7c5cff" />
        <circle cx="618" cy="152" r="4.5" fill="#fb4545" />
        <defs>
          <linearGradient id="riskEquityFill" x1="0" x2="0" y1="0" y2="270">
            <stop stopColor="#7c5cff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pointer-events-none absolute bottom-20 right-8 rounded-lg border border-white/10 bg-ink-950/78 p-3 text-xs shadow-panel backdrop-blur">
        <p className="font-medium text-white">Jun 19, 2026</p>
        <p className="mt-2 flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-violet-400" />
          Equity <span className="ml-4 text-white">$9,358.00</span>
        </p>
        <p className="mt-1 flex items-center gap-2 text-rose-300">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          Drawdown <span className="ml-2 text-rose-300">-6.42%</span>
        </p>
      </div>
      <div className="mt-0 grid grid-cols-4 gap-2 text-[11px] text-slate-500">
        <span>Jun 1</span>
        <span>Jun 7</span>
        <span>Jun 13</span>
        <span className="text-right">Jun 19</span>
      </div>
    </div>
  );
}

function DrawdownCurve() {
  const curve = linePath(DRAWDOWN_VALUES.map((value) => Math.abs(value)), 360, 160, 12);

  return (
    <svg className="h-36 w-full" viewBox="0 0 360 160" fill="none" preserveAspectRatio="none" aria-label="Current drawdown curve">
      {[0, 1, 2, 3].map((line) => (
        <line key={line} x1="12" x2="348" y1={20 + line * 36} y2={20 + line * 36} stroke="rgba(148,163,184,0.14)" />
      ))}
      <path d={curve.area} fill="url(#drawdownFill)" />
      <path d={curve.path} stroke="#fb7185" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="drawdownFill" x1="0" x2="0" y1="0" y2="160">
          <stop stopColor="#fb7185" stopOpacity="0.26" />
          <stop offset="1" stopColor="#fb7185" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function RiskCommandCenter({ status }: { status: RiskStatus }) {
  const tone = statusTone(status);
  const rows = [
    { label: "Account Balance", value: "$10,000.00", sub: "Model balance", percent: 100 },
    { label: "Risk Per Trade", value: "1.00%", sub: "$100 hard cap", percent: 50 },
    { label: "Daily Loss Limit", value: "2.00%", sub: "0.85% used", percent: 42 },
    { label: "Weekly Loss Limit", value: "5.00%", sub: "1.92% used", percent: 38 },
    { label: "Open Risk", value: "0.70%", sub: "1 open setup", percent: 35 },
    { label: "Remaining Capacity", value: "1.15%", sub: "Before daily lock", percent: 58 }
  ];

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="Risk Command Center"
        action={<span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", toneClasses(tone))}>{status}</span>}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="glass-tile rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase text-slate-500">{row.label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{row.value}</p>
                <p className="mt-1 text-xs text-slate-400">{row.sub}</p>
              </div>
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]" />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
              <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: percentWidth(row.percent) }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 text-emerald-300" size={19} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-white">Capital protection status is under control.</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Risk usage is below hard locks. Keep XAUUSD exposure under 1% until drawdown recovers below 5%.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RiskCalculator() {
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState(4233.94);
  const [stopLossPrice, setStopLossPrice] = useState(4208.94);
  const [slDistance, setSlDistance] = useState(250);
  const [symbol, setSymbol] = useState("XAUUSD");

  const output = useMemo(() => {
    const dollarRisk = Math.max(0, accountBalance * (riskPercent / 100));
    const priceRisk = Math.max(0.01, Math.abs(entryPrice - stopLossPrice));
    const pointRisk = Math.max(0.01, slDistance || priceRisk * 10);
    const lotSize = dollarRisk / pointRisk;
    const riskReward = priceRisk > 0 ? 2 : 0;
    const maxAllowed = Math.min(lotSize * 1.25, accountBalance / 20000);

    return {
      dollarRisk,
      lotSize,
      maxAllowed,
      pointRisk,
      priceRisk,
      riskReward
    };
  }, [accountBalance, entryPrice, riskPercent, slDistance, stopLossPrice]);

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Position Size Calculator" />
      <div className="space-y-3">
        <CalculatorField
          label="Account Balance"
          suffix="USD"
          value={accountBalance}
          onChange={(value) => setAccountBalance(value)}
          testId="risk-account-balance"
        />
        <CalculatorField
          label="Risk percent"
          suffix="%"
          value={riskPercent}
          onChange={(value) => setRiskPercent(value)}
          step={0.1}
          testId="risk-percent"
        />
        <CalculatorField
          label="Entry Price"
          value={entryPrice}
          onChange={(value) => {
            setEntryPrice(value);
            setSlDistance(Math.abs(value - stopLossPrice) * 10);
          }}
          step={0.01}
          testId="risk-entry-price"
        />
        <CalculatorField
          label="Stop Loss Price"
          value={stopLossPrice}
          onChange={(value) => {
            setStopLossPrice(value);
            setSlDistance(Math.abs(entryPrice - value) * 10);
          }}
          step={0.01}
          testId="risk-stop-loss-price"
        />
        <CalculatorField
          label="SL Distance"
          suffix="points"
          value={slDistance}
          onChange={(value) => setSlDistance(value)}
          step={1}
          testId="risk-sl-distance"
        />
        <label className="grid gap-1 text-xs text-slate-400">
          Symbol
          <select
            aria-label="Symbol"
            className="h-10 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-sm font-medium text-white outline-none transition focus:border-cyan-300/50"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
          >
            <option value="XAUUSD">XAUUSD</option>
            <option value="XAGUSD">XAGUSD</option>
            <option value="EURUSD">EURUSD</option>
          </select>
        </label>
      </div>
      <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-4">
        <p className="text-xs uppercase text-slate-400">Recommended Lot Size</p>
        <p className="mt-1 text-3xl font-semibold text-emerald-300" data-testid="recommended-lot-size">
          {output.lotSize.toFixed(2)}
          <span className="ml-2 text-sm text-slate-400">lots</span>
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <OutputTile label="Dollar Risk" value={formatCurrency(output.dollarRisk)} />
        <OutputTile label="Pip / Point Risk" value={output.pointRisk.toFixed(0)} />
        <OutputTile label="Risk Reward" value={`1 : ${output.riskReward.toFixed(1)}`} />
        <OutputTile label="Max Allowed Position" value={`${output.maxAllowed.toFixed(2)} lots`} />
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        Calculator uses a conservative XAUUSD point model for planning only. It does not place or route orders.
      </p>
    </section>
  );
}

function CalculatorField({
  label,
  onChange,
  step = 0.01,
  suffix,
  testId,
  value
}: {
  label: string;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
  testId?: string;
  value: number;
}) {
  return (
    <label className="grid gap-1 text-xs text-slate-400">
      {label}
      <div className="flex h-10 items-center overflow-hidden rounded-lg border border-white/10 bg-ink-950/60 focus-within:border-cyan-300/50">
        <input
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-white outline-none"
          data-testid={testId}
          step={step}
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <span className="border-l border-white/10 px-3 text-[11px] uppercase text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function OutputTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-tile rounded-lg p-3">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DrawdownAnalytics() {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Drawdown Analytics" action={<Gauge size={15} className="text-slate-500" aria-hidden="true" />} />
      <div className="grid place-items-center">
        <RingGauge label="DD" score={64} tone="red" />
      </div>
      <p className="mt-3 text-center text-xl font-semibold text-white">6.42%</p>
      <p className="text-center text-xs text-slate-400">Current Drawdown</p>
      <div className="mt-4 space-y-2 text-xs">
        <StatLine label="Max Drawdown" value="11.28%" tone="red" />
        <StatLine label="Average Drawdown" value="4.21%" />
        <StatLine label="Recovery Factor" value="2.35" />
        <StatLine label="Drawdown Duration" value="3d 12h" />
      </div>
    </section>
  );
}

function StatLine({ label, tone, value }: { label: string; tone?: "red" | "green"; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className={cn("font-semibold text-white", tone === "red" && "text-rose-300", tone === "green" && "text-emerald-300")}>
        {value}
      </span>
    </div>
  );
}

function DrawdownHistory() {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="Historical Drawdown"
        action={
          <button type="button" className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300">
            All
            <ChevronDown size={13} aria-hidden="true" />
          </button>
        }
      />
      <div className="mb-4">
        <DrawdownCurve />
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="text-[11px] uppercase text-slate-500">
            <tr className="border-b border-white/10">
              <th className="py-2 font-medium">Period</th>
              <th className="py-2 font-medium">Drawdown</th>
              <th className="py-2 font-medium">Start</th>
              <th className="py-2 font-medium">End</th>
              <th className="py-2 font-medium">Duration</th>
              <th className="py-2 text-right font-medium">Repaired</th>
            </tr>
          </thead>
          <tbody>
            {DRAW_DOWN_HISTORY.map((row) => (
              <tr key={row.period} className="border-b border-white/[0.07] last:border-0">
                <td className="py-3 text-white">{row.period}</td>
                <td className={cn("py-3 font-semibold", row.drawdown.startsWith("-11") ? "text-rose-300" : "text-gold-300")}>{row.drawdown}</td>
                <td className="py-3 text-slate-300">{row.start}</td>
                <td className="py-3 text-slate-300">{row.end}</td>
                <td className="py-3 text-slate-300">{row.duration}</td>
                <td className="py-3 text-right">
                  {row.repaired ? <CheckCircle2 className="ml-auto text-emerald-300" size={16} /> : <XCircle className="ml-auto text-rose-300" size={16} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LossProtection() {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Loss Protection System" action={<Lock size={15} className="text-slate-500" aria-hidden="true" />} />
      <div className="space-y-3">
        {PROTECTION_RULES.map((rule) => (
          <div key={rule.name} className="glass-tile rounded-xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", rule.active ? "bg-emerald-400/12 text-emerald-300" : "bg-slate-400/10 text-slate-400")}>
                  <Lock size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{rule.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{rule.detail}</p>
                </div>
              </div>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", rule.active ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-slate-400/20 bg-slate-400/10 text-slate-400")}>
                {rule.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-3">
              <span>Limit: <strong className="text-white">{rule.limit}</strong></span>
              <span>Usage: <strong className="text-white">{rule.usage}</strong></span>
              <span>Status: <strong className={rule.status === "Clear" ? "text-emerald-300" : "text-gold-300"}>{rule.status}</strong></span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
              <span
                className={cn("block h-full rounded-full", rule.status === "Clear" ? "bg-emerald-400" : rule.status === "Watch" ? "bg-gold-400" : "bg-rose-400")}
                style={{ width: percentWidth(rule.percent) }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConsecutiveLosses() {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Consecutive Losses" action={<AlertTriangle size={15} className="text-slate-500" aria-hidden="true" />} />
      <div className="grid place-items-center py-3">
        <p className="text-5xl font-semibold text-rose-400">2</p>
        <p className="mt-2 text-xs text-slate-400">Current streak</p>
      </div>
      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="mt-4 space-y-3 text-xs">
        <StatLine label="Max Consecutive Losses" value="5" />
        <StatLine label="Last Loss Date" value="Jun 18, 2026" />
        <StatLine label="Loss Streak Risk" value="Low" tone="green" />
      </div>
    </section>
  );
}

function RiskHeatmap() {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="Risk Heatmap"
        action={
          <button type="button" className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300">
            June 2026
            <ChevronDown size={13} aria-hidden="true" />
          </button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr_0.8fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Day of Week Risk</p>
          <div className="grid grid-cols-[74px_repeat(7,minmax(58px,1fr))] gap-1 text-xs">
            <span />
            {HEATMAP_DAYS.map((day) => (
              <span key={day.label} className="text-center text-slate-400">{day.label}</span>
            ))}
            {["Jun 1 - Jun 7", "Jun 8 - Jun 14", "Jun 15 - Jun 21"].map((week, rowIndex) => (
              <RiskHeatmapRow key={week} rowIndex={rowIndex} week={week} />
            ))}
          </div>
        </div>
        <RiskMiniHeatmap title="Session Risk" rows={SESSION_RISK} />
        <RiskMiniHeatmap title="Timeframe Risk" rows={TIMEFRAME_RISK} />
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-4 text-[11px] text-slate-400">
        <LegendItem color="bg-emerald-400" label="Low (0 - 0.5%)" />
        <LegendItem color="bg-gold-400" label="Moderate (0.5 - 1.5%)" />
        <LegendItem color="bg-orange-500" label="High (1.5 - 2.5%)" />
        <LegendItem color="bg-rose-500" label="Very High (> 2.5%)" />
      </div>
    </section>
  );
}

function RiskHeatmapRow({ rowIndex, week }: { rowIndex: number; week: string }) {
  return (
    <>
      <span className="flex items-center text-slate-400">{week}</span>
      {HEATMAP_DAYS.map((day) => {
        const value = day.values[rowIndex];
        return (
          <span key={`${week}-${day.label}`} className={cn("grid min-h-10 place-items-center rounded-md font-semibold", heatmapColor(value))}>
            {value === null ? "-" : `${value.toFixed(2)}%`}
          </span>
        );
      })}
    </>
  );
}

function RiskMiniHeatmap({ rows, title }: { rows: Array<{ label: string; status: string; value: number }>; title: string }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[82px_1fr_auto] items-center gap-3 rounded-lg bg-white/[0.035] px-3 py-2 text-xs">
            <span className="font-semibold text-white">{row.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <span className={cn("block h-full rounded-full", row.value >= 1.5 ? "bg-orange-500" : row.value >= 0.75 ? "bg-gold-400" : "bg-emerald-400")} style={{ width: percentWidth(row.value * 45) }} />
            </div>
            <span className={cn(row.value >= 1.5 ? "text-orange-300" : row.value >= 0.75 ? "text-gold-300" : "text-emerald-300")}>
              {row.value.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function heatmapColor(value: number | null) {
  if (value === null) return "bg-slate-800/50 text-slate-500";
  if (value >= 1.5) return "bg-orange-500/65 text-white shadow-[0_0_18px_rgba(249,115,22,0.18)]";
  if (value >= 0.75) return "bg-gold-400/45 text-white shadow-[0_0_18px_rgba(248,193,74,0.14)]";
  if (value > 0) return "bg-emerald-400/35 text-white shadow-[0_0_18px_rgba(52,211,153,0.12)]";
  return "bg-emerald-400/18 text-slate-300";
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
      {label}
    </span>
  );
}

function AiRiskWarnings() {
  const warnings = [
    {
      detail: "Daily loss limit is still safe, but one more full-risk loss would move the desk into caution.",
      icon: ShieldCheck,
      label: "Risk is under control",
      tone: "green" as Tone
    },
    {
      detail: "High-impact USD news is within the next session. Avoid fresh XAUUSD entries before confirmation.",
      icon: AlertTriangle,
      label: "Avoid trading before high impact news events",
      tone: "gold" as Tone
    },
    {
      detail: "Two consecutive losses detected. Reduce size to 0.50% until the next confirmed setup.",
      icon: TrendingDown,
      label: "Loss streak protection active",
      tone: "red" as Tone
    },
    {
      detail: "London session drawdown is 24% lower than New York. Prioritize London continuation setups.",
      icon: Trophy,
      label: "Focus on London session",
      tone: "green" as Tone
    },
    {
      detail: "Your average risk per trade is slightly above the preferred drawdown-adjusted target.",
      icon: Gauge,
      label: "Consider reducing lot size",
      tone: "red" as Tone
    }
  ];

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="AI Risk Warnings" eyebrow="Capital Desk" />
      <div className="space-y-3">
        {warnings.map((warning) => {
          const Icon = warning.icon;
          return (
            <div key={warning.label} className="glass-tile interactive-lift rounded-xl p-3">
              <div className="flex items-start gap-3">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border", toneClasses(warning.tone))}>
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{warning.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{warning.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RiskQualityScore() {
  const average = Math.round(QUALITY_SCORES.reduce((total, item) => total + item.score, 0) / QUALITY_SCORES.length);

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="Risk Quality Score"
        action={<span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{gradeFromScore(average)}</span>}
      />
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="grid place-items-center rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <RingGauge label="/100" score={average} tone="green" />
          <p className="mt-3 text-sm font-semibold text-white">Overall Risk Grade</p>
          <p className="mt-1 text-xs text-slate-400">Capital-first score</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {QUALITY_SCORES.map((item) => (
            <div key={item.label} className="glass-tile rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                </div>
                <span className="text-lg font-semibold text-emerald-300">{item.score}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: percentWidth(item.score) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RiskHistoryTable() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | RiskResult>("All");
  const [sort, setSort] = useState<SortKey>("date");

  const filteredTrades = useMemo(() => {
    const term = search.trim().toLowerCase();
    return RISK_TRADES.filter((trade) => {
      const matchesFilter = filter === "All" || trade.result === filter;
      const matchesSearch =
        !term ||
        [trade.symbol, trade.direction, trade.result, trade.ruleViolated, trade.session, trade.timeframe, trade.grade]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return matchesFilter && matchesSearch;
    }).sort((first, second) => {
      if (sort === "risk") return second.riskPercent - first.riskPercent;
      if (sort === "grade") return first.grade.localeCompare(second.grade);
      if (sort === "result") return first.result.localeCompare(second.result);
      return new Date(second.date).getTime() - new Date(first.date).getTime();
    });
  }, [filter, search, sort]);

  function exportCsv() {
    const header = ["Date", "Symbol", "Direction", "Entry", "Stop Loss", "Risk %", "Dollar Risk", "Result", "Rule Violated", "Risk Grade"];
    const rows = filteredTrades.map((trade) => [
      formatDateTime(trade.date),
      trade.symbol,
      trade.direction,
      trade.entry.toFixed(2),
      trade.stopLoss.toFixed(2),
      `${trade.riskPercent.toFixed(2)}%`,
      trade.dollarRisk.toFixed(2),
      trade.result,
      trade.ruleViolated,
      trade.grade
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "xauusd-risk-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="Trade Risk History"
        action={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/20 px-3 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/30"
            onClick={exportCsv}
          >
            <Download size={14} aria-hidden="true" />
            Export CSV
          </button>
        }
      />
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_170px_170px]">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-sm text-slate-400 focus-within:border-cyan-300/50">
          <Search size={16} aria-hidden="true" />
          <input
            aria-label="Search trade risk history"
            className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-600"
            placeholder="Search risk history..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-sm text-slate-400">
          <Filter size={15} aria-hidden="true" />
          <select
            aria-label="Filter result"
            className="min-w-0 flex-1 bg-transparent text-white outline-none"
            value={filter}
            onChange={(event) => setFilter(event.target.value as "All" | RiskResult)}
          >
            <option value="All">All Results</option>
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
            <option value="Open">Open</option>
            <option value="Breakeven">Breakeven</option>
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-sm text-slate-400">
          <SlidersHorizontal size={15} aria-hidden="true" />
          <select
            aria-label="Sort risk history"
            className="min-w-0 flex-1 bg-transparent text-white outline-none"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            <option value="date">Sort: Date</option>
            <option value="risk">Sort: Risk</option>
            <option value="grade">Sort: Grade</option>
            <option value="result">Sort: Result</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-500">
            <tr className="border-b border-white/10">
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Symbol</th>
              <th className="px-3 py-3 font-medium">Direction</th>
              <th className="px-3 py-3 font-medium">Entry</th>
              <th className="px-3 py-3 font-medium">Stop Loss</th>
              <th className="px-3 py-3 font-medium">Risk %</th>
              <th className="px-3 py-3 font-medium">Dollar Risk</th>
              <th className="px-3 py-3 font-medium">Result</th>
              <th className="px-3 py-3 font-medium">Rule Violated</th>
              <th className="px-3 py-3 font-medium">Risk Grade</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.slice(0, 8).map((trade) => (
              <tr key={trade.id} className="border-b border-white/[0.07] transition hover:bg-white/[0.035]">
                <td className="px-3 py-3 text-slate-300">{formatDateTime(trade.date)}</td>
                <td className="px-3 py-3 font-semibold text-white">{trade.symbol}</td>
                <td className={cn("px-3 py-3 font-semibold", trade.direction === "BUY" ? "text-emerald-300" : "text-rose-300")}>{trade.direction}</td>
                <td className="px-3 py-3 text-slate-200">{formatPrice(trade.entry)}</td>
                <td className="px-3 py-3 text-slate-200">{formatPrice(trade.stopLoss)}</td>
                <td className="px-3 py-3 text-slate-200">{formatPercent(trade.riskPercent, 2)}</td>
                <td className="px-3 py-3 text-slate-200">{formatCurrency(trade.dollarRisk)}</td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", resultTone(trade.result))}>{trade.result}</span>
                </td>
                <td className="px-3 py-3 text-slate-300">{trade.ruleViolated}</td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", gradeTone(trade.grade))}>{trade.grade}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <p>Showing 1 to {Math.min(filteredTrades.length, 8)} of {filteredTrades.length} risk records</p>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              type="button"
              className={cn("h-8 w-8 rounded-lg border text-xs font-semibold", page === 1 ? "border-violet-400 bg-violet-500 text-white" : "border-white/10 bg-white/[0.035] text-slate-300")}
            >
              {page}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function resultTone(result: RiskResult) {
  if (result === "Win") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (result === "Loss") return "border-rose-400/25 bg-rose-400/10 text-rose-300";
  if (result === "Breakeven") return "border-gold-400/25 bg-gold-400/10 text-gold-300";
  return "border-cyan-300/25 bg-cyan-300/10 text-cyan-300";
}

function gradeTone(grade: RiskGrade) {
  if (grade === "A+" || grade === "A") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (grade === "B") return "border-gold-400/25 bg-gold-400/10 text-gold-300";
  return "border-rose-400/25 bg-rose-400/10 text-rose-300";
}

function BottomSummary() {
  const items = [
    { label: "Safest Trading Session", value: "London", detail: "0.54% average risk loss exposure", tone: "green" as Tone, icon: ShieldCheck },
    { label: "Highest Risk Session", value: "New York", detail: "Late volatility creates larger stop expansion", tone: "red" as Tone, icon: AlertTriangle },
    { label: "Biggest Risk Mistake", value: "Overtrading", detail: "One recent M5 setup ignored lock rules", tone: "gold" as Tone, icon: Zap },
    { label: "Best Risk-Controlled Trade", value: "Jun 13 BUY", detail: "0.65% risk, +2.40R, A+ grade", tone: "green" as Tone, icon: Trophy },
    { label: "Worst Risk-Controlled Trade", value: "Jun 16 BUY", detail: "1.30% risk after loss streak warning", tone: "red" as Tone, icon: TrendingDown }
  ];

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Bottom Summary" eyebrow="AI Recommendation" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass-tile interactive-lift rounded-xl p-3">
              <div className={cn("mb-3 grid h-9 w-9 place-items-center rounded-lg border", toneClasses(item.tone))}>
                <Icon size={17} aria-hidden="true" />
              </div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/8 p-4">
        <p className="text-sm font-semibold text-white">AI Recommendation: Keep risk at 0.50% to 0.75% until drawdown is below 5%.</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Capital protection is currently stable. Avoid new trades around high-impact USD news, stop after one more loss today, and favor London session setups with clean stops below structure.
        </p>
      </div>
    </section>
  );
}

export function RiskManagementClient() {
  const riskHealthScore = 78;
  const currentDrawdown = 6.42;
  const maxDrawdown = 11.28;
  const dailyRisk = 0.85;
  const weeklyRisk = 1.92;
  const monthlyRisk = 3.45;
  const status: RiskStatus = dailyRisk >= 2 ? "STOP TRADING" : currentDrawdown >= 10 ? "DANGER" : weeklyRisk >= 3.5 ? "CAUTION" : "SAFE";

  const kpis: Kpi[] = [
    {
      badge: "Safe",
      helper: "$85.00 of $10,000",
      icon: ShieldCheck,
      label: "Daily Risk Used",
      tone: "green",
      trend: "+0.15%",
      value: `${dailyRisk.toFixed(2)}%`,
      values: [12, 18, 21, 28, 34, 42]
    },
    {
      badge: "Controlled",
      helper: "$192.00 of $10,000",
      icon: BarChart3,
      label: "Weekly Risk Used",
      tone: "violet",
      trend: "+0.42%",
      value: `${weeklyRisk.toFixed(2)}%`,
      values: [18, 22, 24, 31, 36, 38]
    },
    {
      badge: "Low",
      helper: "$345.00 of $10,000",
      icon: Wallet,
      label: "Monthly Risk Used",
      tone: "blue",
      trend: "+0.80%",
      value: `${monthlyRisk.toFixed(2)}%`,
      values: [16, 18, 27, 29, 32, 34]
    },
    {
      badge: "Watch",
      helper: "-$642.00 from peak",
      icon: ShieldAlert,
      label: "Current Drawdown",
      tone: "red",
      trend: "-1.12%",
      value: `${currentDrawdown.toFixed(2)}%`,
      values: [18, 24, 32, 44, 58, 64]
    },
    {
      badge: "Limit 15%",
      helper: "$1,128.00 historical max",
      icon: TrendingDown,
      label: "Max Drawdown",
      tone: "gold",
      trend: "stable",
      value: `${maxDrawdown.toFixed(2)}%`,
      values: [31, 42, 55, 48, 66, 75]
    },
    {
      badge: "Good",
      helper: "Risk desk score",
      icon: Gauge,
      label: "Risk Health Score",
      tone: "green",
      trend: "+6 pts",
      value: `${riskHealthScore} /100`,
      values: [52, 59, 63, 68, 72, 78]
    }
  ];

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Risk Management Center</h1>
          <p className="mt-1 text-sm text-slate-400">Protect your capital. Manage risk. Trade with confidence.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
          >
            <CalendarDays size={16} aria-hidden="true" />
            Jun 1, 2026 - Jun 19, 2026
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white transition hover:border-violet-400/40 hover:bg-violet-500/15"
          >
            <Download size={16} aria-hidden="true" />
            Download Report
          </button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1.05fr_0.82fr]">
        <div className="premium-panel rounded-xl p-4">
          <PanelHeader
            title="Equity & Drawdown Overview"
            action={
              <button type="button" className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300">
                All Time
                <ChevronDown size={13} aria-hidden="true" />
              </button>
            }
          />
          <EquityDrawdownChart />
        </div>
        <RiskCommandCenter status={status} />
        <RiskCalculator />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.68fr_1.45fr_0.68fr_1.08fr]">
        <DrawdownAnalytics />
        <DrawdownHistory />
        <ConsecutiveLosses />
        <LossProtection />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.65fr_0.7fr]">
        <RiskHeatmap />
        <AiRiskWarnings />
      </section>

      <RiskQualityScore />

      <RiskHistoryTable />

      <BottomSummary />

      <footer className="premium-panel flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={14} className="text-violet-300" aria-hidden="true" />
          Risk management is the key to long term success. Protect your capital and let your strategy work.
        </span>
        <span className="inline-flex items-center gap-2">
          Last Updated: Jun 19, 2026 - 10:32 AM (UTC+0)
          <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-emerald-300">Live</span>
        </span>
      </footer>
    </div>
  );
}
