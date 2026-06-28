"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  Filter,
  FlaskConical,
  Gauge,
  LineChart,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { clamp, cn } from "@/lib/utils";

type Tone = "violet" | "green" | "blue" | "gold" | "red" | "cyan" | "neutral";
type StrategyName =
  | "EMA Crossover"
  | "Pullback Strategy"
  | "Breakout Strategy"
  | "Trend Following"
  | "Scalping"
  | "Custom Strategy";
type StrategyGrade = "A+" | "A" | "B" | "C";
type SortKey = "score" | "winRate" | "profitFactor" | "drawdown" | "trades";
type MarketMode = "Trending" | "Ranging" | "Volatile";

type Strategy = {
  name: StrategyName;
  subtitle: string;
  status: string;
  tone: Tone;
  icon: LucideIcon;
  winRate: number;
  profitFactor: number;
  avgRR: number;
  maxDrawdown: number;
  trades: number;
  score: number;
  grade: StrategyGrade;
  totalProfit: number;
  sharpe: number;
  trend: number[];
  equity: number[];
  monthlyReturns: number[];
  sessions: Record<string, StrategyBreakdown>;
  timeframes: Record<string, StrategyBreakdown>;
  scorecard: Record<string, number>;
};

type StrategyBreakdown = {
  winRate: number;
  profitFactor: number;
  rr: number;
  drawdown: number;
  trades: number;
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

const sessions = ["Sydney", "Tokyo", "London", "New York", "London + NY"];
const timeframes = ["M5", "M15", "M30", "H1", "H4", "Daily"];
const strategyNames: StrategyName[] = [
  "EMA Crossover",
  "Pullback Strategy",
  "Breakout Strategy",
  "Trend Following",
  "Scalping",
  "Custom Strategy"
];

const strategies: Strategy[] = [
  {
    avgRR: 1.87,
    equity: [0, 2400, 6200, 10400, 14100, 16800, 20100, 23600, 25400, 28100, 29900, 31600, 34200, 37100],
    grade: "A+",
    icon: TrendingUp,
    maxDrawdown: 8.32,
    monthlyReturns: [8.4, 11.2, 14.8, 9.5, 16.4, 12.8],
    name: "EMA Crossover",
    profitFactor: 2.45,
    score: 89,
    scorecard: { adaptability: 76, consistency: 91, entry: 88, exit: 82, risk: 90, scalability: 84 },
    sessions: {
      "London": { drawdown: 6.7, profitFactor: 2.88, rr: 2.08, trades: 68, winRate: 72.4 },
      "London + NY": { drawdown: 7.1, profitFactor: 2.65, rr: 2.02, trades: 52, winRate: 70.8 },
      "New York": { drawdown: 8.9, profitFactor: 2.12, rr: 1.72, trades: 49, winRate: 66.2 },
      "Sydney": { drawdown: 10.5, profitFactor: 1.42, rr: 1.28, trades: 31, winRate: 54.1 },
      "Tokyo": { drawdown: 9.8, profitFactor: 1.64, rr: 1.36, trades: 43, winRate: 58.2 }
    },
    sharpe: 1.82,
    status: "Top Performer",
    subtitle: "Trend-following precision model",
    timeframes: {
      "Daily": { drawdown: 6.2, profitFactor: 2.32, rr: 2.05, trades: 27, winRate: 70.1 },
      "H1": { drawdown: 7.4, profitFactor: 2.54, rr: 1.94, trades: 58, winRate: 71.4 },
      "H4": { drawdown: 6.9, profitFactor: 2.72, rr: 2.12, trades: 44, winRate: 73.6 },
      "M15": { drawdown: 9.1, profitFactor: 2.08, rr: 1.71, trades: 46, winRate: 64.2 },
      "M30": { drawdown: 8.3, profitFactor: 2.45, rr: 1.87, trades: 51, winRate: 68.4 },
      "M5": { drawdown: 11.4, profitFactor: 1.52, rr: 1.28, trades: 69, winRate: 55.8 }
    },
    tone: "violet",
    totalProfit: 28540.8,
    trades: 243,
    trend: [45, 50, 57, 54, 62, 67, 64, 70, 73, 78, 74, 82, 79, 89],
    winRate: 68.42
  },
  {
    avgRR: 1.56,
    equity: [0, 1200, 3800, 6100, 7300, 9800, 12600, 14100, 15800, 16900, 19100, 22400, 24100, 26700],
    grade: "A",
    icon: Zap,
    maxDrawdown: 12.45,
    monthlyReturns: [6.8, 7.4, 9.1, 5.2, 11.6, 8.9],
    name: "Breakout Strategy",
    profitFactor: 1.92,
    score: 76,
    scorecard: { adaptability: 74, consistency: 72, entry: 78, exit: 70, risk: 69, scalability: 82 },
    sessions: {
      "London": { drawdown: 10.4, profitFactor: 2.24, rr: 1.74, trades: 49, winRate: 65.1 },
      "London + NY": { drawdown: 11.1, profitFactor: 2.38, rr: 1.82, trades: 43, winRate: 67.8 },
      "New York": { drawdown: 12.6, profitFactor: 1.88, rr: 1.49, trades: 46, winRate: 61.9 },
      "Sydney": { drawdown: 15.2, profitFactor: 1.12, rr: 1.05, trades: 25, winRate: 46.3 },
      "Tokyo": { drawdown: 13.8, profitFactor: 1.36, rr: 1.24, trades: 35, winRate: 52.6 }
    },
    sharpe: 1.44,
    status: "High Potential",
    subtitle: "Momentum expansion model",
    timeframes: {
      "Daily": { drawdown: 9.3, profitFactor: 1.78, rr: 1.58, trades: 21, winRate: 60.3 },
      "H1": { drawdown: 11.6, profitFactor: 2.06, rr: 1.65, trades: 53, winRate: 64.4 },
      "H4": { drawdown: 10.1, profitFactor: 2.18, rr: 1.76, trades: 37, winRate: 66.7 },
      "M15": { drawdown: 13.5, profitFactor: 1.73, rr: 1.42, trades: 45, winRate: 58.9 },
      "M30": { drawdown: 12.45, profitFactor: 1.92, rr: 1.56, trades: 42, winRate: 62.18 },
      "M5": { drawdown: 16.2, profitFactor: 1.18, rr: 1.02, trades: 61, winRate: 49.8 }
    },
    tone: "green",
    totalProfit: 18230.45,
    trades: 198,
    trend: [38, 42, 47, 49, 55, 61, 66, 63, 60, 64, 68, 66, 72, 76],
    winRate: 62.18
  },
  {
    avgRR: 1.34,
    equity: [0, 700, 1900, 2600, 4100, 5200, 6400, 7800, 8600, 9400, 10100, 11100, 11900, 12450],
    grade: "B",
    icon: ShieldCheck,
    maxDrawdown: 10.21,
    monthlyReturns: [4.1, 5.2, 7.4, 3.1, 8.5, 5.6],
    name: "Pullback Strategy",
    profitFactor: 1.68,
    score: 68,
    scorecard: { adaptability: 64, consistency: 70, entry: 74, exit: 62, risk: 81, scalability: 60 },
    sessions: {
      "London": { drawdown: 8.7, profitFactor: 1.94, rr: 1.46, trades: 41, winRate: 61.7 },
      "London + NY": { drawdown: 9.4, profitFactor: 1.86, rr: 1.41, trades: 30, winRate: 60.2 },
      "New York": { drawdown: 10.9, profitFactor: 1.51, rr: 1.21, trades: 34, winRate: 55.4 },
      "Sydney": { drawdown: 9.8, profitFactor: 1.32, rr: 1.05, trades: 19, winRate: 49.6 },
      "Tokyo": { drawdown: 10.1, profitFactor: 1.48, rr: 1.16, trades: 32, winRate: 53.8 }
    },
    sharpe: 1.18,
    status: "Stable",
    subtitle: "Reversion and support retest",
    timeframes: {
      "Daily": { drawdown: 7.2, profitFactor: 1.72, rr: 1.52, trades: 18, winRate: 59.8 },
      "H1": { drawdown: 8.8, profitFactor: 1.86, rr: 1.41, trades: 37, winRate: 61.2 },
      "H4": { drawdown: 8.1, profitFactor: 1.98, rr: 1.58, trades: 26, winRate: 63.9 },
      "M15": { drawdown: 10.2, profitFactor: 1.62, rr: 1.29, trades: 36, winRate: 56.8 },
      "M30": { drawdown: 9.6, profitFactor: 1.68, rr: 1.34, trades: 39, winRate: 58.73 },
      "M5": { drawdown: 13.1, profitFactor: 1.05, rr: 0.94, trades: 52, winRate: 45.4 }
    },
    tone: "blue",
    totalProfit: 12450.3,
    trades: 156,
    trend: [31, 36, 39, 42, 41, 45, 52, 57, 55, 60, 61, 64, 63, 68],
    winRate: 58.73
  },
  {
    avgRR: 1.62,
    equity: [0, 900, 2400, 4100, 6300, 7200, 9100, 10200, 12300, 13600, 14700, 15400, 16900, 18800],
    grade: "A",
    icon: LineChart,
    maxDrawdown: 11.32,
    monthlyReturns: [5.6, 6.8, 8.3, 6.1, 10.2, 7.5],
    name: "Trend Following",
    profitFactor: 1.85,
    score: 71,
    scorecard: { adaptability: 69, consistency: 78, entry: 72, exit: 75, risk: 73, scalability: 86 },
    sessions: {
      "London": { drawdown: 9.5, profitFactor: 2.08, rr: 1.74, trades: 42, winRate: 66.6 },
      "London + NY": { drawdown: 10.2, profitFactor: 2.12, rr: 1.82, trades: 36, winRate: 67.2 },
      "New York": { drawdown: 11.7, profitFactor: 1.79, rr: 1.56, trades: 39, winRate: 62.7 },
      "Sydney": { drawdown: 13.2, profitFactor: 1.25, rr: 1.09, trades: 21, winRate: 48.9 },
      "Tokyo": { drawdown: 12.5, profitFactor: 1.49, rr: 1.26, trades: 38, winRate: 55.8 }
    },
    sharpe: 1.32,
    status: "Consistent",
    subtitle: "Long-horizon trend model",
    timeframes: {
      "Daily": { drawdown: 7.9, profitFactor: 2.08, rr: 1.96, trades: 23, winRate: 66.9 },
      "H1": { drawdown: 10.3, profitFactor: 1.86, rr: 1.58, trades: 44, winRate: 63.1 },
      "H4": { drawdown: 8.8, profitFactor: 2.22, rr: 2.01, trades: 31, winRate: 68.4 },
      "M15": { drawdown: 12.4, profitFactor: 1.51, rr: 1.26, trades: 38, winRate: 56.2 },
      "M30": { drawdown: 11.32, profitFactor: 1.85, rr: 1.62, trades: 40, winRate: 63.25 },
      "M5": { drawdown: 15.4, profitFactor: 1.08, rr: 0.98, trades: 53, winRate: 47.1 }
    },
    tone: "gold",
    totalProfit: 16780.2,
    trades: 176,
    trend: [34, 38, 42, 46, 50, 49, 54, 58, 56, 61, 65, 64, 68, 71],
    winRate: 63.25
  },
  {
    avgRR: 0.85,
    equity: [0, -500, -900, -1600, -2200, -1900, -2800, -3400, -2900, -4100, -3600, -4800, -5100, -2340],
    grade: "C",
    icon: Activity,
    maxDrawdown: 15.78,
    monthlyReturns: [-4.2, 2.1, -3.5, -1.4, -4.9, 0.8],
    name: "Scalping",
    profitFactor: 0.92,
    score: 54,
    scorecard: { adaptability: 51, consistency: 42, entry: 58, exit: 47, risk: 44, scalability: 38 },
    sessions: {
      "London": { drawdown: 14.3, profitFactor: 1.02, rr: 0.95, trades: 78, winRate: 51.8 },
      "London + NY": { drawdown: 16.1, profitFactor: 1.08, rr: 0.98, trades: 63, winRate: 52.6 },
      "New York": { drawdown: 17.4, profitFactor: 0.82, rr: 0.74, trades: 71, winRate: 46.8 },
      "Sydney": { drawdown: 19.2, profitFactor: 0.62, rr: 0.51, trades: 42, winRate: 38.1 },
      "Tokyo": { drawdown: 18.1, profitFactor: 0.74, rr: 0.66, trades: 58, winRate: 42.4 }
    },
    sharpe: 0.42,
    status: "High Risk",
    subtitle: "Short-term impulse model",
    timeframes: {
      "Daily": { drawdown: 10.2, profitFactor: 0.94, rr: 0.86, trades: 8, winRate: 46.2 },
      "H1": { drawdown: 12.7, profitFactor: 1.02, rr: 0.94, trades: 25, winRate: 51.2 },
      "H4": { drawdown: 11.3, profitFactor: 1.08, rr: 0.99, trades: 14, winRate: 52.8 },
      "M15": { drawdown: 16.4, profitFactor: 0.91, rr: 0.82, trades: 74, winRate: 47.3 },
      "M30": { drawdown: 15.78, profitFactor: 0.92, rr: 0.85, trades: 62, winRate: 48.12 },
      "M5": { drawdown: 19.6, profitFactor: 0.72, rr: 0.58, trades: 129, winRate: 40.8 }
    },
    tone: "red",
    totalProfit: -2340.1,
    trades: 312,
    trend: [28, 34, 31, 36, 42, 40, 38, 46, 52, 49, 43, 48, 51, 54],
    winRate: 48.12
  },
  {
    avgRR: 1.48,
    equity: [0, 500, 1200, 2800, 3700, 5300, 6100, 7600, 8400, 9200, 10400, 11100, 11800, 13650],
    grade: "B",
    icon: SlidersHorizontal,
    maxDrawdown: 13.1,
    monthlyReturns: [3.4, 4.2, 7.8, 2.9, 8.1, 6.6],
    name: "Custom Strategy",
    profitFactor: 1.58,
    score: 64,
    scorecard: { adaptability: 71, consistency: 61, entry: 66, exit: 60, risk: 67, scalability: 62 },
    sessions: {
      "London": { drawdown: 11.2, profitFactor: 1.76, rr: 1.55, trades: 32, winRate: 58.5 },
      "London + NY": { drawdown: 12.2, profitFactor: 1.82, rr: 1.62, trades: 29, winRate: 59.8 },
      "New York": { drawdown: 13.7, profitFactor: 1.48, rr: 1.34, trades: 31, winRate: 54.7 },
      "Sydney": { drawdown: 14.4, profitFactor: 1.02, rr: 0.98, trades: 17, winRate: 44.2 },
      "Tokyo": { drawdown: 13.9, profitFactor: 1.27, rr: 1.18, trades: 24, winRate: 50.8 }
    },
    sharpe: 1.05,
    status: "Research",
    subtitle: "Experimental filter stack",
    timeframes: {
      "Daily": { drawdown: 9.8, profitFactor: 1.62, rr: 1.55, trades: 12, winRate: 56.9 },
      "H1": { drawdown: 12.4, profitFactor: 1.7, rr: 1.48, trades: 30, winRate: 58.1 },
      "H4": { drawdown: 10.6, profitFactor: 1.86, rr: 1.72, trades: 21, winRate: 60.2 },
      "M15": { drawdown: 13.7, profitFactor: 1.41, rr: 1.22, trades: 28, winRate: 52.6 },
      "M30": { drawdown: 13.1, profitFactor: 1.58, rr: 1.48, trades: 29, winRate: 55.7 },
      "M5": { drawdown: 16.6, profitFactor: 0.96, rr: 0.82, trades: 47, winRate: 43.2 }
    },
    tone: "cyan",
    totalProfit: 13650.4,
    trades: 133,
    trend: [30, 33, 35, 40, 42, 47, 45, 51, 53, 57, 55, 60, 61, 64],
    winRate: 55.7
  }
];

const colors: Record<Tone, string> = {
  blue: "#38a3ff",
  cyan: "#22d3ee",
  gold: "#f8c14a",
  green: "#22c55e",
  neutral: "#94a3b8",
  red: "#ff4d5f",
  violet: "#8b5cf6"
};

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

function formatCurrency(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function formatNumber(value: number, digits = 2) {
  return value.toFixed(digits);
}

function gradeFromScore(score: number): StrategyGrade {
  if (score >= 85) return "A+";
  if (score >= 72) return "A";
  if (score >= 60) return "B";
  return "C";
}

function linePath(values: number[], width = 180, height = 60, padding = 4) {
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

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function selectedStrategyOrDefault(name: StrategyName) {
  return strategies.find((strategy) => strategy.name === name) ?? strategies[0];
}

function MiniSparkline({ values, tone = "violet", height = 54 }: { values: number[]; tone?: Tone; height?: number }) {
  const stroke = colors[tone];
  const path = linePath(values, 160, height, 4);
  const fillPath = `${path} L 156 ${height - 4} L 4 ${height - 4} Z`;

  return (
    <svg viewBox={`0 0 160 ${height}`} className="h-14 w-full overflow-visible" role="img" aria-label="Trend sparkline">
      <defs>
        <linearGradient id={`spark-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#spark-${tone})`} />
      <path d={path} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const tone = toneClasses(kpi.tone);

  return (
    <article className={cn("premium-panel interactive-lift overflow-hidden rounded-xl p-4", tone.shadow)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{kpi.label}</p>
          <p className="mt-3 text-2xl font-semibold text-white">{kpi.value}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-md border px-2 py-1 text-[10px] font-semibold", tone.border, tone.bg, tone.text)}>
              {kpi.badge}
            </span>
            <span className={cn("inline-flex items-center gap-1 text-xs", kpi.trend.startsWith("-") ? "text-rose-300" : "text-emerald-300")}>
              {kpi.trend.startsWith("-") ? <ArrowDownRight size={13} aria-hidden="true" /> : <ArrowUpRight size={13} aria-hidden="true" />}
              {kpi.trend}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{kpi.helper}</p>
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", tone.bg, tone.border, tone.text)}>
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2">
        <MiniSparkline values={kpi.values} tone={kpi.tone} />
      </div>
    </article>
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
        <h2 className="text-sm font-semibold uppercase tracking-[0.04em] text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function StrategyCommandCenter({
  selectedName,
  setSelectedName
}: {
  selectedName: StrategyName;
  setSelectedName: (name: StrategyName) => void;
}) {
  const selected = selectedStrategyOrDefault(selectedName);
  const tone = toneClasses(selected.tone);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
      <div className="premium-panel overflow-hidden rounded-xl p-4">
        <PanelHeader title="Strategy Command Center" eyebrow="Quant Research" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className={cn("rounded-xl border bg-gradient-to-br p-4", tone.border, tone.soft)}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border", tone.bg, tone.border, tone.text)}>
                  <selected.icon size={22} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Active Strategy</p>
                  <h3 className="mt-1 text-2xl font-semibold text-white">{selected.name}</h3>
                </div>
              </div>
              <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", tone.border, tone.bg, tone.text)}>
                {selected.status}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              {selected.subtitle}. The model currently ranks {selected.grade} with a {selected.score}/100 strategy score and
              a {formatNumber(selected.profitFactor)} profit factor across {selected.trades} backtested setups.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Win Rate" value={formatPercent(selected.winRate)} tone={selected.tone} />
              <StatTile label="Profit Factor" value={formatNumber(selected.profitFactor)} tone="green" />
              <StatTile label="Max DD" value={formatPercent(selected.maxDrawdown)} tone={selected.maxDrawdown > 13 ? "red" : "gold"} />
              <StatTile label="Grade" value={selected.grade} tone={selected.grade === "C" ? "red" : "violet"} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Strategy Selector</span>
              <select
                data-testid="strategy-selector"
                className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 text-sm font-semibold text-white outline-none transition focus:border-violet-400/50"
                value={selectedName}
                onChange={(event) => setSelectedName(event.target.value as StrategyName)}
              >
                {strategyNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <StatTile label="Strategy Status" value={selected.status} tone={selected.tone} />
            <StatTile label="Strategy Score" value={`${selected.score}/100`} tone={selected.tone} />
            <StatTile label="AI Recommendation" value={selected.score >= 80 ? "Deploy" : selected.score >= 65 ? "Optimize" : "Research"} tone={selected.score >= 80 ? "green" : selected.score >= 65 ? "gold" : "red"} />
          </div>
        </div>
      </div>

      <div className="premium-panel rounded-xl p-4">
        <PanelHeader title="Supported Strategies" eyebrow="Research Universe" />
        <div className="space-y-2">
          {strategies.map((strategy) => {
            const itemTone = toneClasses(strategy.tone);
            const isActive = strategy.name === selected.name;

            return (
              <button
                key={strategy.name}
                type="button"
                onClick={() => setSelectedName(strategy.name)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-3 text-left transition hover:-translate-y-0.5",
                  isActive ? cn(itemTone.border, itemTone.bg) : "border-white/10 bg-white/[0.025] hover:border-cyan-300/20"
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", itemTone.bg, itemTone.text)}>
                    <strategy.icon size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{strategy.name}</span>
                    <span className="text-xs text-slate-500">{strategy.trades} trades | PF {formatNumber(strategy.profitFactor)}</span>
                  </span>
                </span>
                <span className={cn("rounded-full border px-2 py-1 text-xs font-bold", itemTone.border, itemTone.text)}>
                  {strategy.score}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatTile({ label, tone = "neutral", value }: { label: string; tone?: Tone; value: string }) {
  const classes = toneClasses(tone);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={cn("mt-2 truncate text-lg font-semibold", classes.text)}>{value}</p>
    </div>
  );
}

function StrategyOverviewCards() {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Strategy Overview" eyebrow="Portfolio Models" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1760px]:grid-cols-6">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          const tone = toneClasses(strategy.tone);

          return (
            <article key={strategy.name} className={cn("interactive-lift rounded-xl border bg-gradient-to-br p-4", tone.border, tone.soft)}>
              <div className="flex items-start gap-3">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border", tone.bg, tone.border, tone.text)}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{strategy.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{strategy.subtitle}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-400">Strategy Score</p>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-3xl font-semibold text-white">{strategy.score}</span>
                  <span className="pb-1 text-xs text-slate-500">/100</span>
                </div>
              </div>
              <MiniSparkline values={strategy.trend} tone={strategy.tone} />
              <span className={cn("mt-2 inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold", tone.border, tone.bg, tone.text)}>
                {strategy.status}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EquityCurveComparison({ selectedName }: { selectedName: StrategyName }) {
  const selected = selectedStrategyOrDefault(selectedName);

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="Equity Curve Comparison"
        action={
          <div className="flex rounded-lg border border-white/10 bg-white/[0.035] p-1 text-xs">
            {["3M", "6M", "YTD", "1Y", "All"].map((item) => (
              <button
                key={item}
                type="button"
                className={cn("rounded-md px-3 py-1.5 font-medium transition", item === "All" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white")}
              >
                {item}
              </button>
            ))}
          </div>
        }
      />
      <div className="chart-surface relative h-[330px] overflow-hidden rounded-xl border border-white/10 p-4">
        <div className="absolute inset-x-0 top-4 grid h-[260px] grid-rows-5 px-4">
          {["$40K", "$30K", "$20K", "$10K", "$0"].map((label) => (
            <div key={label} className="border-t border-white/[0.055] text-[11px] text-slate-500">
              <span>{label}</span>
            </div>
          ))}
        </div>
        <svg viewBox="0 0 760 270" className="relative z-10 h-[270px] w-full overflow-visible" role="img" aria-label="Equity curves comparison">
          <defs>
            <linearGradient id="equity-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={colors.violet} stopOpacity="0.22" />
              <stop offset="100%" stopColor={colors.violet} stopOpacity="0" />
            </linearGradient>
          </defs>
          {strategies.map((strategy) => {
            const path = linePath(strategy.equity, 760, 250, 12);
            const active = strategy.name === selected.name;

            return (
              <g key={strategy.name}>
                {active ? <path d={`${path} L 748 238 L 12 238 Z`} fill="url(#equity-fill)" /> : null}
                <path
                  d={path}
                  fill="none"
                  opacity={active ? 1 : 0.72}
                  stroke={colors[strategy.tone]}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={active ? 3 : 2}
                />
              </g>
            );
          })}
          <line x1="438" x2="438" y1="26" y2="235" stroke="rgba(255,255,255,0.42)" strokeDasharray="4 4" />
          <circle cx="438" cy="76" r="4" fill="#fff" />
        </svg>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-300">
          {strategies.slice(0, 5).map((strategy) => (
            <span key={strategy.name} className="inline-flex items-center gap-2">
              <span className="h-2 w-4 rounded-full" style={{ backgroundColor: colors[strategy.tone] }} />
              {strategy.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PerformanceComparisonTable({ selectedName }: { selectedName: StrategyName }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Performance Comparison" eyebrow="Backtested Results" />
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-[760px] w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <th className="py-3 pr-4 font-semibold">Strategy</th>
              <th className="py-3 pr-4 font-semibold">Total Profit</th>
              <th className="py-3 pr-4 font-semibold">Win Rate</th>
              <th className="py-3 pr-4 font-semibold">Profit Factor</th>
              <th className="py-3 pr-4 font-semibold">Max Drawdown</th>
              <th className="py-3 pr-4 font-semibold">Avg RR</th>
              <th className="py-3 pr-4 font-semibold">Trades</th>
              <th className="py-3 font-semibold">Score</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((strategy) => {
              const Icon = strategy.icon;
              const tone = toneClasses(strategy.tone);
              const active = strategy.name === selectedName;

              return (
                <tr key={strategy.name} className={cn("border-b border-white/[0.055] transition", active ? "bg-violet-500/10" : "hover:bg-white/[0.025]")}>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2 font-semibold text-white">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", tone.bg, tone.text)}>
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      {strategy.name}
                    </span>
                  </td>
                  <td className={cn("py-3 pr-4 font-semibold", strategy.totalProfit < 0 ? "text-rose-300" : "text-slate-100")}>{formatCurrency(strategy.totalProfit)}</td>
                  <td className="py-3 pr-4 text-slate-200">{formatPercent(strategy.winRate)}</td>
                  <td className="py-3 pr-4 text-slate-200">{formatNumber(strategy.profitFactor)}</td>
                  <td className="py-3 pr-4 text-slate-200">{formatPercent(strategy.maxDrawdown)}</td>
                  <td className="py-3 pr-4 text-slate-200">{formatNumber(strategy.avgRR)}</td>
                  <td className="py-3 pr-4 text-slate-200">{strategy.trades}</td>
                  <td className="py-3">
                    <span className={cn("inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-bold", tone.border, tone.text)}>
                      {strategy.score}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">All figures use fallback research data unless a later data adapter feeds closed strategy trades.</p>
    </section>
  );
}

function DonutChart({ value, tone = "green", label }: { label: string; tone?: Tone; value: number }) {
  const circumference = 2 * Math.PI * 38;
  const dash = (clamp(value, 0, 100) / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90" role="img" aria-label={`${label} ${value}%`}>
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="13" />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke={colors[tone]}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          strokeWidth="13"
        />
      </svg>
      <div>
        <p className="text-3xl font-semibold text-white">{formatPercent(value)}</p>
        <p className="mt-1 text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function BarChartComparison({
  data,
  formatter,
  max,
  title
}: {
  data: Array<{ label: string; tone: Tone; value: number }>;
  formatter: (value: number) => string;
  max?: number;
  title: string;
}) {
  const upper = max ?? Math.max(...data.map((item) => Math.abs(item.value)), 1);

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title={title} />
      <div className="flex h-44 items-end gap-4 border-b border-white/10 px-2 pb-3">
        {data.map((item) => {
          const height = clamp((Math.abs(item.value) / upper) * 100, 8, 100);
          return (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">{formatter(item.value)}</span>
              <div
                className="w-full max-w-11 rounded-t-md shadow-[0_0_20px_rgba(124,92,255,0.18)]"
                style={{
                  background: `linear-gradient(180deg, ${colors[item.tone]}, rgba(124,92,255,0.25))`,
                  height: `${height}%`
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-400 sm:grid-cols-5">
        {data.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[item.tone] }} />
            {item.label.replace(" Strategy", "")}
          </span>
        ))}
      </div>
    </section>
  );
}

function RadarChart({ selectedName }: { selectedName: StrategyName }) {
  const selected = selectedStrategyOrDefault(selectedName);
  const axes = ["Profitability", "Risk Control", "Win Rate", "Expectancy", "Consistency"];
  const values = [
    selected.profitFactor * 33,
    100 - selected.maxDrawdown * 4,
    selected.winRate,
    selected.avgRR * 36,
    selected.scorecard.consistency
  ].map((value) => clamp(value, 10, 96));
  const center = 95;
  const radius = 70;
  const points = values.map((value, index) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const r = (value / 100) * radius;
    return `${(center + Math.cos(angle) * r).toFixed(1)},${(center + Math.sin(angle) * r).toFixed(1)}`;
  });

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Risk / Reward Distribution" />
      <div className="flex justify-center">
        <svg viewBox="0 0 190 190" className="h-56 w-full max-w-[260px]" role="img" aria-label="Strategy radar score">
          {[0.25, 0.5, 0.75, 1].map((level) => {
            const ring = axes.map((_, index) => {
              const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
              const r = radius * level;
              return `${(center + Math.cos(angle) * r).toFixed(1)},${(center + Math.sin(angle) * r).toFixed(1)}`;
            });
            return <polygon key={level} points={ring.join(" ")} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />;
          })}
          {axes.map((axis, index) => {
            const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
            const x = center + Math.cos(angle) * 86;
            const y = center + Math.sin(angle) * 86;
            return (
              <text key={axis} x={x} y={y} fill="#94a3b8" fontSize="8" textAnchor="middle">
                {axis}
              </text>
            );
          })}
          <polygon points={points.join(" ")} fill="rgba(124,92,255,0.28)" stroke={colors[selected.tone]} strokeWidth="2.5" />
          {points.map((point) => {
            const [x, y] = point.split(",");
            return <circle key={point} cx={x} cy={y} r="3" fill={colors[selected.tone]} />;
          })}
        </svg>
      </div>
    </section>
  );
}

function AnalyticsGrid({ selectedName }: { selectedName: StrategyName }) {
  const winRateAverage = average(strategies.map((strategy) => strategy.winRate));
  const selected = selectedStrategyOrDefault(selectedName);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,0.72fr)_minmax(0,0.72fr)_minmax(0,0.76fr)_minmax(0,0.95fr)]">
      <section className="premium-panel rounded-xl p-4">
        <PanelHeader title="Win Rate Comparison" />
        <DonutChart label="Average" tone="gold" value={winRateAverage} />
        <div className="mt-3 space-y-2">
          {strategies.slice(0, 5).map((strategy) => (
            <MetricLine key={strategy.name} label={strategy.name.replace(" Strategy", "")} tone={strategy.tone} value={strategy.winRate} />
          ))}
        </div>
      </section>
      <BarChartComparison
        data={strategies.slice(0, 5).map((strategy) => ({ label: strategy.name, tone: strategy.tone, value: strategy.profitFactor }))}
        formatter={(value) => formatNumber(value)}
        max={3}
        title="Profit Factor Comparison"
      />
      <BarChartComparison
        data={strategies.slice(0, 5).map((strategy) => ({ label: strategy.name, tone: strategy.tone, value: strategy.maxDrawdown }))}
        formatter={(value) => `-${formatPercent(value)}`}
        max={20}
        title="Max Drawdown Comparison"
      />
      <RadarChart selectedName={selectedName} />
      <section className="premium-panel rounded-xl p-4">
        <PanelHeader title="AI Strategy Intelligence" eyebrow="Recommendation" />
        <div className="rounded-xl border border-violet-400/35 bg-violet-500/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400">Recommended Strategy</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">{selected.score >= 75 ? selected.name : "EMA Crossover"}</h3>
            </div>
            <span className="rounded-full border border-violet-300/30 bg-violet-400/15 px-3 py-1 text-xs font-semibold text-violet-200">
              Top Choice
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            EMA Crossover shows the best risk-adjusted returns. Breakout remains strong during London expansion, while scalping should stay disabled around high-impact USD news.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            {["Highest Profit Factor", "Best Risk-Adjusted Return", "Consistent Performance", "Lower Drawdown", "High Win Rate"].map((item) => (
              <p key={item} className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 size={15} className="text-emerald-300" aria-hidden="true" />
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

function MetricLine({ label, tone, value }: { label: string; tone: Tone; value: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-24 truncate text-slate-400">{label}</span>
      <span className="h-2 flex-1 rounded-full bg-white/[0.06]">
        <span className="block h-2 rounded-full" style={{ width: `${clamp(value, 0, 100)}%`, backgroundColor: colors[tone] }} />
      </span>
      <span className="w-12 text-right font-semibold text-slate-200">{formatPercent(value)}</span>
    </div>
  );
}

function StrategyComparisonDataGrid({
  compareMode,
  query,
  setCompareMode,
  setQuery,
  setSortKey,
  sortKey,
  statusFilter,
  setStatusFilter
}: {
  compareMode: boolean;
  query: string;
  setCompareMode: (value: boolean) => void;
  setQuery: (value: string) => void;
  setSortKey: (value: SortKey) => void;
  sortKey: SortKey;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return strategies
      .filter((strategy) => !q || strategy.name.toLowerCase().includes(q) || strategy.subtitle.toLowerCase().includes(q))
      .filter((strategy) => statusFilter === "All" || strategy.status === statusFilter)
      .sort((a, b) => {
        if (sortKey === "score") return b.score - a.score;
        if (sortKey === "winRate") return b.winRate - a.winRate;
        if (sortKey === "profitFactor") return b.profitFactor - a.profitFactor;
        if (sortKey === "drawdown") return a.maxDrawdown - b.maxDrawdown;
        return b.trades - a.trades;
      });
  }, [query, sortKey, statusFilter]);

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="Strategy Comparison Table"
        action={
          <button
            data-testid="compare-mode-toggle"
            type="button"
            onClick={() => setCompareMode(!compareMode)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition",
              compareMode ? "border-violet-300/40 bg-violet-500/20 text-white" : "border-white/10 bg-white/[0.035] text-slate-300 hover:text-white"
            )}
          >
            <Filter size={14} aria-hidden="true" />
            Compare Mode
          </button>
        }
      />
      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-400">
          <Search size={16} aria-hidden="true" />
          <input
            data-testid="strategy-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search strategies..."
            className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-600"
          />
        </label>
        <select
          data-testid="status-filter"
          className="h-11 rounded-xl border border-white/10 bg-ink-950/70 px-3 text-sm text-white outline-none"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          {["All", ...Array.from(new Set(strategies.map((strategy) => strategy.status)))].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select
          data-testid="strategy-sort"
          className="h-11 rounded-xl border border-white/10 bg-ink-950/70 px-3 text-sm text-white outline-none"
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
        >
          <option value="score">Sort by Score</option>
          <option value="winRate">Sort by Win Rate</option>
          <option value="profitFactor">Sort by Profit Factor</option>
          <option value="drawdown">Sort by Lowest Drawdown</option>
          <option value="trades">Sort by Trades</option>
        </select>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-[920px] w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
              {["Strategy Name", "Win Rate", "Profit Factor", "Average RR", "Max Drawdown", "Total Trades", "Strategy Grade"].map((heading) => (
                <th key={heading} className="py-3 pr-4 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((strategy) => {
              const tone = toneClasses(strategy.tone);
              return (
                <tr key={strategy.name} className={cn("border-b border-white/[0.055] transition hover:bg-white/[0.025]", compareMode && strategy.score >= 70 ? "bg-cyan-400/5" : "")}>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-3">
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone.bg, tone.text)}>
                        <strategy.icon size={15} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-semibold text-white">{strategy.name}</span>
                        <span className="text-xs text-slate-500">{strategy.subtitle}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-200">{formatPercent(strategy.winRate)}</td>
                  <td className="py-3 pr-4 text-slate-200">{formatNumber(strategy.profitFactor)}</td>
                  <td className="py-3 pr-4 text-slate-200">{formatNumber(strategy.avgRR)}</td>
                  <td className="py-3 pr-4 text-slate-200">{formatPercent(strategy.maxDrawdown)}</td>
                  <td className="py-3 pr-4 text-slate-200">{strategy.trades}</td>
                  <td className="py-3 pr-4">
                    <span className={cn("rounded-md border px-2 py-1 text-xs font-bold", tone.border, tone.bg, tone.text)}>
                      {strategy.grade}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StrategyScorecard({ selectedName }: { selectedName: StrategyName }) {
  const selected = selectedStrategyOrDefault(selectedName);
  const entries = [
    ["Entry Quality", selected.scorecard.entry],
    ["Exit Quality", selected.scorecard.exit],
    ["Risk Management", selected.scorecard.risk],
    ["Consistency", selected.scorecard.consistency],
    ["Scalability", selected.scorecard.scalability],
    ["Market Adaptability", selected.scorecard.adaptability]
  ] as const;

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Strategy Scorecard" eyebrow={selected.name} />
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">{label}</span>
              <span className="text-sm font-semibold text-white">{value}/100</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/[0.06]">
              <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-300" style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-violet-300/25 bg-violet-500/10 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Overall Grade</span>
          <span className="rounded-full border border-violet-300/30 bg-violet-400/15 px-3 py-1 text-sm font-bold text-violet-200">
            {gradeFromScore(selected.score)}
          </span>
        </div>
      </div>
    </section>
  );
}

function StrategyOptimizationCenter({
  confidence,
  newsFilter,
  risk,
  selectedSession,
  selectedTimeframe,
  setConfidence,
  setNewsFilter,
  setRisk,
  setSelectedSession,
  setSelectedTimeframe
}: {
  confidence: number;
  newsFilter: boolean;
  risk: number;
  selectedSession: string;
  selectedTimeframe: string;
  setConfidence: (value: number) => void;
  setNewsFilter: (value: boolean) => void;
  setRisk: (value: number) => void;
  setSelectedSession: (value: string) => void;
  setSelectedTimeframe: (value: string) => void;
}) {
  const optimizedScore = clamp(64 + confidence * 0.18 + (newsFilter ? 7 : -4) + (selectedSession.includes("London") ? 8 : 1) - risk * 5, 35, 96);
  const optimizedPf = clamp(1.1 + optimizedScore / 52 - risk * 0.08, 0.75, 3.2);
  const optimizedDrawdown = clamp(17 - optimizedScore / 8 + risk * 3, 4, 18);

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Strategy Optimization Center" eyebrow="Parameter Lab" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <RangeControl label="Risk Adjustment" max={2} min={0.25} setValue={setRisk} step={0.25} suffix="%" value={risk} />
          <RangeControl label="Confidence Threshold" max={90} min={50} setValue={setConfidence} step={5} suffix="%" value={confidence} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-500">Session Selection</span>
              <select
                className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 text-sm text-white outline-none"
                value={selectedSession}
                onChange={(event) => setSelectedSession(event.target.value)}
              >
                {sessions.map((session) => <option key={session}>{session}</option>)}
              </select>
            </label>
            <label className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-500">Timeframe Selection</span>
              <select
                className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 text-sm text-white outline-none"
                value={selectedTimeframe}
                onChange={(event) => setSelectedTimeframe(event.target.value)}
              >
                {timeframes.map((timeframe) => <option key={timeframe}>{timeframe}</option>)}
              </select>
            </label>
          </div>
          <button
            data-testid="news-filter-toggle"
            type="button"
            onClick={() => setNewsFilter(!newsFilter)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border p-3 text-sm font-semibold transition",
              newsFilter ? "border-emerald-300/30 bg-emerald-400/12 text-emerald-200" : "border-rose-300/30 bg-rose-400/10 text-rose-200"
            )}
          >
            News Filter
            <span>{newsFilter ? "Enabled" : "Disabled"}</span>
          </button>
        </div>
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Optimized Results</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatTile label="Optimized Score" value={`${Math.round(optimizedScore)}/100`} tone="cyan" />
            <StatTile label="Profit Factor" value={formatNumber(optimizedPf)} tone="green" />
            <StatTile label="Drawdown" value={formatPercent(optimizedDrawdown)} tone="gold" />
            <StatTile label="Mode" value={newsFilter ? "Filtered" : "Raw"} tone={newsFilter ? "green" : "red"} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Best optimization currently favors {selectedSession}, {selectedTimeframe}, lower risk sizing, and confirmed signal confidence above {confidence}%.
          </p>
        </div>
      </div>
    </section>
  );
}

function RangeControl({
  label,
  max,
  min,
  setValue,
  step,
  suffix,
  value
}: {
  label: string;
  max: number;
  min: number;
  setValue: (value: number) => void;
  step: number;
  suffix: string;
  value: number;
}) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <span className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-slate-500">
        {label}
        <span className="text-sm font-semibold normal-case tracking-normal text-white">{value}{suffix}</span>
      </span>
      <input
        data-testid={`range-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        className="mt-4 w-full accent-violet-500"
        max={max}
        min={min}
        onChange={(event) => setValue(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function SessionAndTimeframePerformance({ selectedName }: { selectedName: StrategyName }) {
  const selected = selectedStrategyOrDefault(selectedName);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <PerformanceMatrix
        rows={sessions.map((session) => ({
          label: session,
          ...selected.sessions[session]
        }))}
        title="Session Performance"
      />
      <PerformanceMatrix
        rows={timeframes.map((timeframe) => ({
          label: timeframe,
          ...selected.timeframes[timeframe]
        }))}
        title="Timeframe Performance"
      />
    </section>
  );
}

function PerformanceMatrix({ rows, title }: { rows: Array<StrategyBreakdown & { label: string }>; title: string }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title={title} />
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-[620px] w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
              {["Segment", "Win Rate", "Profit Factor", "Avg RR", "Drawdown", "Trades"].map((heading) => (
                <th key={heading} className="py-3 pr-4 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-white/[0.055]">
                <td className="py-3 pr-4 font-semibold text-white">{row.label}</td>
                <td className="py-3 pr-4">
                  <MetricBar value={row.winRate} />
                </td>
                <td className="py-3 pr-4 text-slate-200">{formatNumber(row.profitFactor)}</td>
                <td className="py-3 pr-4 text-slate-200">{formatNumber(row.rr)}</td>
                <td className="py-3 pr-4 text-slate-200">{formatPercent(row.drawdown)}</td>
                <td className="py-3 pr-4 text-slate-200">{row.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MetricBar({ value }: { value: number }) {
  const tone = value >= 65 ? "bg-emerald-400" : value >= 55 ? "bg-gold-400" : "bg-rose-400";
  return (
    <div className="flex min-w-[150px] items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-white/[0.06]">
        <div className={cn("h-2 rounded-full", tone)} style={{ width: `${clamp(value, 0, 100)}%` }} />
      </div>
      <span className="w-12 text-right font-semibold text-slate-100">{formatPercent(value)}</span>
    </div>
  );
}

function BestWorstStrategies() {
  const best = strategies.reduce((winner, strategy) => (strategy.score > winner.score ? strategy : winner), strategies[0]);
  const worst = strategies.reduce((loser, strategy) => (strategy.score < loser.score ? strategy : loser), strategies[0]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <StrategyVerdictCard
        description="Best blend of trend capture, controlled drawdown, high expectancy, and clean institutional session performance."
        label="Best Strategy"
        strategy={best}
      />
      <StrategyVerdictCard
        description="Weakest research model because loss clusters expand during low-liquidity sessions and news volatility."
        label="Worst Strategy"
        strategy={worst}
        warning
      />
    </section>
  );
}

function StrategyVerdictCard({
  description,
  label,
  strategy,
  warning
}: {
  description: string;
  label: string;
  strategy: Strategy;
  warning?: boolean;
}) {
  const tone = toneClasses(warning ? "red" : strategy.tone);
  const Icon = warning ? AlertTriangle : Trophy;

  return (
    <section className={cn("premium-panel rounded-xl border p-4", tone.border)}>
      <PanelHeader title={label} />
      <div className="flex items-start gap-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border", tone.bg, tone.border, tone.text)}>
          <Icon size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-2xl font-semibold text-white">{strategy.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Win Rate" value={formatPercent(strategy.winRate)} tone={strategy.tone} />
            <StatTile label="PF" value={formatNumber(strategy.profitFactor)} tone={warning ? "red" : "green"} />
            <StatTile label="RR" value={formatNumber(strategy.avgRR)} tone="gold" />
            <StatTile label="Score" value={`${strategy.score}/100`} tone={strategy.tone} />
          </div>
        </div>
      </div>
    </section>
  );
}

function BacktestingSummary() {
  const totalProfit = strategies.reduce((sum, strategy) => sum + strategy.totalProfit, 0);
  const totalTrades = strategies.reduce((sum, strategy) => sum + strategy.trades, 0);
  const profitableTrades = Math.round(totalTrades * 0.6014);

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Bottom Summary" eyebrow="Research Outcome" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <SummaryTile icon={CalendarDays} label="Most Profitable Strategy" value="EMA Crossover" helper={formatCurrency(totalProfit)} tone="violet" />
        <SummaryTile icon={Trophy} label="Highest Win Rate Strategy" value="EMA Crossover" helper="68.42%" tone="green" />
        <SummaryTile icon={ShieldCheck} label="Lowest Drawdown Strategy" value="EMA Crossover" helper="8.32%" tone="cyan" />
        <SummaryTile icon={Activity} label="Best Session Strategy" value="London EMA" helper="72.4% WR" tone="gold" />
        <SummaryTile icon={LineChart} label="Best Timeframe Strategy" value="H4 EMA" helper="2.72 PF" tone="blue" />
        <SummaryTile icon={Sparkles} label="Final AI Recommendation" value="Deploy EMA" helper={`${profitableTrades} profitable setups`} tone="violet" />
      </div>
    </section>
  );
}

function SummaryTile({
  helper,
  icon: Icon,
  label,
  tone,
  value
}: {
  helper: string;
  icon: LucideIcon;
  label: string;
  tone: Tone;
  value: string;
}) {
  const classes = toneClasses(tone);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", classes.bg, classes.text)}>
          <Icon size={16} aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 font-semibold text-white">{value}</p>
          <p className={cn("mt-1 text-xs", classes.text)}>{helper}</p>
        </div>
      </div>
    </div>
  );
}

function TopKpis() {
  const best = strategies.reduce((winner, strategy) => (strategy.score > winner.score ? strategy : winner), strategies[0]);
  const highestWin = strategies.reduce((winner, strategy) => (strategy.winRate > winner.winRate ? strategy : winner), strategies[0]);
  const highestPf = strategies.reduce((winner, strategy) => (strategy.profitFactor > winner.profitFactor ? strategy : winner), strategies[0]);
  const lowestDrawdown = strategies.reduce((winner, strategy) => (strategy.maxDrawdown < winner.maxDrawdown ? strategy : winner), strategies[0]);
  const kpis: Kpi[] = [
    { badge: "6 Active", helper: "Research universe", icon: FlaskConical, label: "Total Strategies", tone: "violet", trend: "+2 this month", value: String(strategies.length), values: [2, 3, 3, 4, 4, 5, 6] },
    { badge: best.grade, helper: `${best.score}/100 score`, icon: Trophy, label: "Best Strategy", tone: best.tone, trend: "+6 score", value: best.name.replace(" Crossover", ""), values: best.trend },
    { badge: "Highest WR", helper: `${highestWin.trades} trades`, icon: Target, label: "Highest Win Rate", tone: "green", trend: "+2.8%", value: formatPercent(highestWin.winRate), values: highestWin.trend },
    { badge: "PF Leader", helper: highestPf.name, icon: CircleDollarSign, label: "Highest Profit Factor", tone: "cyan", trend: "+0.30", value: formatNumber(highestPf.profitFactor), values: highestPf.trend },
    { badge: "Controlled", helper: lowestDrawdown.name, icon: ShieldCheck, label: "Lowest Drawdown", tone: "gold", trend: "-1.12%", value: formatPercent(lowestDrawdown.maxDrawdown), values: lowestDrawdown.trend },
    { badge: "Deploy", helper: "Best risk-adjusted model", icon: BrainCircuit, label: "AI Recommended Strategy", tone: "violet", trend: "+18 confidence", value: "EMA", values: best.trend }
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-6">
      {kpis.map((kpi) => <KpiCard key={kpi.label} kpi={kpi} />)}
    </section>
  );
}

export function StrategyLabClient() {
  const [selectedName, setSelectedName] = useState<StrategyName>("EMA Crossover");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [compareMode, setCompareMode] = useState(true);
  const [risk, setRisk] = useState(1);
  const [confidence, setConfidence] = useState(70);
  const [selectedSession, setSelectedSession] = useState("London");
  const [selectedTimeframe, setSelectedTimeframe] = useState("H1");
  const [newsFilter, setNewsFilter] = useState(true);

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <FlaskConical className="text-violet-300" size={27} aria-hidden="true" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Strategy Lab</h1>
              <p className="mt-1 text-sm text-slate-400">Test, compare and optimize trading strategies with AI-powered analytics.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
            <CalendarDays size={16} aria-hidden="true" />
            Jan 1, 2026 - Jun 19, 2026
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white transition hover:border-violet-400/40 hover:bg-violet-500/15">
            <Download size={16} aria-hidden="true" />
            Export Report
          </button>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-violet-400/40 bg-violet-500/30 px-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(124,92,255,0.22)] transition hover:bg-violet-500/40">
            <Plus size={16} aria-hidden="true" />
            Add Strategy
          </button>
        </div>
      </header>

      <TopKpis />
      <StrategyCommandCenter selectedName={selectedName} setSelectedName={setSelectedName} />
      <StrategyOverviewCards />

      <section className="premium-panel rounded-xl p-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 text-sm">
            {["Performance Overview", "Equity Curves", "Trade Statistics", "Risk Analysis", "Backtesting Results", "Strategy Settings"].map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={cn("rounded-lg px-4 py-2 font-medium transition", index === 0 ? "bg-violet-500/20 text-white ring-1 ring-violet-300/30" : "text-slate-400 hover:bg-white/[0.04] hover:text-white")}
              >
                {tab}
              </button>
            ))}
          </div>
          <button type="button" className="icon-button">
            <Filter size={15} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)]">
        <EquityCurveComparison selectedName={selectedName} />
        <PerformanceComparisonTable selectedName={selectedName} />
      </section>

      <AnalyticsGrid selectedName={selectedName} />

      <StrategyComparisonDataGrid
        compareMode={compareMode}
        query={query}
        setCompareMode={setCompareMode}
        setQuery={setQuery}
        setSortKey={setSortKey}
        sortKey={sortKey}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <StrategyScorecard selectedName={selectedName} />
        <StrategyOptimizationCenter
          confidence={confidence}
          newsFilter={newsFilter}
          risk={risk}
          selectedSession={selectedSession}
          selectedTimeframe={selectedTimeframe}
          setConfidence={setConfidence}
          setNewsFilter={setNewsFilter}
          setRisk={setRisk}
          setSelectedSession={setSelectedSession}
          setSelectedTimeframe={setSelectedTimeframe}
        />
      </section>

      <SessionAndTimeframePerformance selectedName={selectedName} />
      <BestWorstStrategies />
      <BacktestingSummary />
    </div>
  );
}
