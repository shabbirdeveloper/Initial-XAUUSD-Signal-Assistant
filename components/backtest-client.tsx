"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Download,
  Eye,
  Filter,
  LineChart,
  Play,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  type LucideIcon
} from "lucide-react";
import { TimeframeSelector } from "@/components/timeframe-selector";
import { SITE_DATA_REFRESH_EVENT } from "@/lib/refresh-events";
import { SUPPORTED_TIMEFRAMES, type BacktestSummary, type BacktestTrade, type Timeframe } from "@/lib/types";
import { clamp, cn, formatDateTime, formatPrice } from "@/lib/utils";

type ResultFilter = "all" | BacktestTrade["result"];
type SortKey = "openedAt" | "entryPrice" | "rr" | "result";
type SessionName = "Sydney" | "Tokyo" | "London" | "New York" | "London + NY";

const PAGE_SIZE = 8;
const SESSIONS: SessionName[] = ["Sydney", "Tokyo", "London", "New York", "London + NY"];
const TF_LABELS: Record<Timeframe, string> = {
  "5m": "M5",
  "15m": "M15",
  "30m": "M30",
  "1h": "H1",
  "4h": "H4",
  D: "Daily",
  W: "Weekly",
  M: "Monthly"
};

function resultLabel(result: BacktestTrade["result"]) {
  return result === "open" ? "No hit" : result;
}

function formatR(value: number, digits = 2) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}R`;
}

function formatNum(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.00";
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function tradeKey(trade: BacktestTrade) {
  return `${trade.openedAt}-${trade.entryPrice}-${trade.stopLoss}`;
}

function directionTone(signalType: BacktestTrade["signalType"]) {
  return signalType === "BUY" ? "text-emerald-300" : "text-rose-300";
}

function resultTone(result: BacktestTrade["result"]) {
  if (result === "win") {
    return "text-emerald-300";
  }
  if (result === "loss") {
    return "text-rose-300";
  }
  return "text-gold-300";
}

function resultPillClass(result: BacktestTrade["result"]) {
  return cn(
    "inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold uppercase",
    result === "win" && "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    result === "loss" && "border-rose-400/25 bg-rose-400/10 text-rose-300",
    result === "open" && "border-gold-400/25 bg-gold-400/10 text-gold-300"
  );
}

function sessionForTrade(trade: BacktestTrade): SessionName {
  const hour = new Date(trade.openedAt).getHours();

  if (hour >= 13 && hour < 17) {
    return "London + NY";
  }
  if (hour >= 7 && hour < 13) {
    return "London";
  }
  if (hour >= 17 && hour < 22) {
    return "New York";
  }
  if (hour >= 0 && hour < 7) {
    return "Tokyo";
  }
  return "Sydney";
}

function gradeFromScore(score: number) {
  if (score >= 88) {
    return "A+";
  }
  if (score >= 74) {
    return "A";
  }
  if (score >= 60) {
    return "B";
  }
  return "C";
}

function tradeGrade(trade: BacktestTrade) {
  if (trade.smcGrade === "A+" || (trade.confidence ?? 0) >= 88) {
    return "A+";
  }
  if (trade.result === "win" && trade.rr >= 1.5) {
    return "A";
  }
  if (trade.result === "open") {
    return "B";
  }
  return "C";
}

function createPath(values: number[], width: number, height: number, pad = 6) {
  const series = values.length > 1 ? values : [0, values[0] ?? 0];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;
  const points = series.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const area = `M ${points[0].x.toFixed(2)} ${(height - pad).toFixed(2)} ${points
    .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")} L ${points[points.length - 1].x.toFixed(2)} ${(height - pad).toFixed(2)} Z`;

  return { area, path };
}

function equityValues(trades: BacktestTrade[]) {
  const chronological = [...trades].sort((first, second) => new Date(first.openedAt).getTime() - new Date(second.openedAt).getTime());
  let equity = 0;
  return [0, ...chronological.map((trade) => {
    equity += trade.rr;
    return Number(equity.toFixed(2));
  })];
}

function drawdownValues(values: number[]) {
  let peak = values[0] ?? 0;
  return values.map((value) => {
    peak = Math.max(peak, value);
    return Number((peak - value).toFixed(2));
  });
}

function streakStats(trades: BacktestTrade[]) {
  const chronological = [...trades]
    .filter((trade) => trade.result !== "open")
    .sort((first, second) => new Date(first.openedAt).getTime() - new Date(second.openedAt).getTime());
  let wins = 0;
  let losses = 0;
  let maxWins = 0;
  let maxLosses = 0;

  chronological.forEach((trade) => {
    if (trade.result === "win") {
      wins += 1;
      losses = 0;
      maxWins = Math.max(maxWins, wins);
    } else {
      losses += 1;
      wins = 0;
      maxLosses = Math.max(maxLosses, losses);
    }
  });

  return { maxLosses, maxWins };
}

function sessionStats(trades: BacktestTrade[]) {
  return SESSIONS.map((session) => {
    const rows = trades.filter((trade) => sessionForTrade(trade) === session);
    const closed = rows.filter((trade) => trade.result !== "open");
    const wins = closed.filter((trade) => trade.result === "win").length;
    const losses = closed.filter((trade) => trade.result === "loss").length;
    const grossProfit = wins * 1.5;
    const grossLoss = losses;
    const totalR = rows.reduce((sum, trade) => sum + trade.rr, 0);

    return {
      averageR: rows.length ? totalR / rows.length : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0,
      session,
      total: rows.length,
      winRate: closed.length ? Math.round((wins / closed.length) * 100) : 0
    };
  });
}

function rDistribution(trades: BacktestTrade[]) {
  return [
    { label: "< -1R", value: trades.filter((trade) => trade.rr < -1).length },
    { label: "-1R", value: trades.filter((trade) => trade.rr === -1).length },
    { label: "0R", value: trades.filter((trade) => trade.rr === 0).length },
    { label: "0R to 1R", value: trades.filter((trade) => trade.rr > 0 && trade.rr < 1).length },
    { label: "1R to 2R", value: trades.filter((trade) => trade.rr >= 1 && trade.rr < 2).length },
    { label: "2R to 3R", value: trades.filter((trade) => trade.rr >= 2 && trade.rr < 3).length },
    { label: "> 3R", value: trades.filter((trade) => trade.rr >= 3).length }
  ];
}

function weekdayReturns(trades: BacktestTrade[]) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((label, index) => {
    const day = index === 6 ? 0 : index + 1;
    const value = trades.filter((trade) => new Date(trade.openedAt).getDay() === day).reduce((sum, trade) => sum + trade.rr, 0);
    return { label, value: Number(value.toFixed(2)) };
  });
}

function monthlyReturns(trades: BacktestTrade[], fallback: number) {
  const grouped = trades.reduce<Record<string, number>>((groups, trade) => {
    const label = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(trade.openedAt));
    groups[label] = (groups[label] ?? 0) + trade.rr;
    return groups;
  }, {});
  const rows = Object.entries(grouped).map(([label, value]) => ({ label, value: Number(value.toFixed(2)) })).slice(-6);
  return rows.length ? rows : [{ label: "Now", value: fallback }];
}

function sortTrades(trades: BacktestTrade[], sortKey: SortKey) {
  return [...trades].sort((first, second) => {
    if (sortKey === "openedAt") {
      return new Date(second.openedAt).getTime() - new Date(first.openedAt).getTime();
    }
    if (sortKey === "result") {
      return first.result.localeCompare(second.result);
    }
    return second[sortKey] - first[sortKey];
  });
}

function MiniSparkline({ color = "#22d3ee", values }: { color?: string; values: number[] }) {
  const { area, path } = createPath(values, 128, 54, 5);

  return (
    <svg className="h-14 w-32" viewBox="0 0 128 54" fill="none" aria-hidden="true">
      <path d={area} fill={color} opacity="0.14" />
      <path d={path} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  );
}

function MiniBars({ color = "#7c5cff", values }: { color?: string; values: number[] }) {
  const max = Math.max(1, ...values.map((value) => Math.abs(value)));

  return (
    <svg className="h-14 w-32" viewBox="0 0 128 54" fill="none" aria-hidden="true">
      {values.map((value, index) => {
        const height = Math.max(6, (Math.abs(value) / max) * 38);
        return (
          <rect
            key={`${value}-${index}`}
            x={index * 13 + 6}
            y={48 - height}
            width="8"
            height={height}
            rx="2"
            fill={value < 0 ? "#ef4444" : color}
            opacity={0.55 + index / 20}
          />
        );
      })}
    </svg>
  );
}

function KpiCard({
  badge,
  chart,
  helper,
  icon: Icon,
  label,
  tone,
  value
}: {
  badge: string;
  chart: ReactNode;
  helper: string;
  icon: LucideIcon;
  label: string;
  tone: "green" | "blue" | "red" | "violet" | "gold" | "cyan";
  value: string;
}) {
  const toneMap = {
    green: "text-emerald-300 from-emerald-400/22",
    blue: "text-blue-300 from-blue-400/22",
    red: "text-rose-300 from-rose-400/22",
    violet: "text-violet-300 from-violet-500/24",
    gold: "text-gold-400 from-gold-400/22",
    cyan: "text-cyan-300 from-cyan-300/22"
  };
  const toneClass = toneMap[tone];

  return (
    <section className="premium-panel interactive-lift min-h-[142px] overflow-hidden rounded-xl p-5">
      <div className={cn("absolute right-0 top-0 h-28 w-36 bg-gradient-to-bl to-transparent blur-xl", toneClass)} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
          <p className={cn("mt-3 text-3xl font-bold leading-none", toneClass.split(" ")[0])}>{value}</p>
          <p className="mt-3 text-sm text-slate-400">{helper}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon size={18} className={toneClass.split(" ")[0]} aria-hidden="true" />
        </span>
      </div>
      <div className="relative mt-1 flex items-end justify-between gap-3">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-200">
          {badge}
        </span>
        {chart}
      </div>
    </section>
  );
}

function ScoreBar({ label, value, tone = "cyan" }: { label: string; value: number; tone?: "cyan" | "green" | "gold" | "red" | "violet" }) {
  const toneClass = {
    cyan: "from-cyan-400 to-blue-500",
    green: "from-emerald-400 to-green-500",
    gold: "from-gold-400 to-amber-500",
    red: "from-rose-500 to-orange-400",
    violet: "from-violet-500 to-fuchsia-400"
  }[tone];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="font-semibold text-white">{Math.round(value)}/100</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.07]">
        <div className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_16px_rgba(34,211,238,0.22)]", toneClass)} style={{ width: `${clamp(value, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function DonutChart({ center, color = "#22c55e", label, value }: { center: string; color?: string; label: string; value: number }) {
  return (
    <div
      className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full p-3"
      style={{
        background: `conic-gradient(${color} ${clamp(value, 0, 100) * 3.6}deg, rgba(239,68,68,0.86) 0deg, rgba(255,255,255,0.08) 360deg)`,
        boxShadow: `0 0 38px ${color}1f`
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#06111f]">
        <span className="text-3xl font-bold text-white">{center}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
    </div>
  );
}

function EquityCurveChart({ drawdown, equity }: { drawdown: number[]; equity: number[] }) {
  const equityPath = createPath(equity, 760, 230, 18);
  const drawdownPath = createPath(drawdown.map((value) => -value), 760, 230, 18);
  const growth = equity[equity.length - 1] ?? 0;

  return (
    <section className="premium-panel overflow-hidden rounded-xl p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-base font-semibold text-white">Equity Curve</h2>
          <p className="mt-1 text-xs text-slate-400">Balance curve, growth in R, and drawdown overlay from the current replay sample.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-300">
            Growth {formatR(growth)}
          </span>
          <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 font-semibold text-rose-300">
            DD overlay
          </span>
        </div>
      </div>
      <div className="chart-surface mt-5 rounded-xl p-4">
        <svg className="h-[260px] w-full" viewBox="0 0 760 230" fill="none" preserveAspectRatio="none" aria-hidden="true">
          {[30, 70, 110, 150, 190].map((y) => (
            <line key={y} x1="18" x2="742" y1={y} y2={y} stroke="rgba(148,163,184,0.11)" />
          ))}
          {[120, 250, 380, 510, 640].map((x) => (
            <line key={x} x1={x} x2={x} y1="18" y2="212" stroke="rgba(148,163,184,0.08)" />
          ))}
          <path d={equityPath.area} fill="url(#equityFill)" />
          <path d={drawdownPath.path} stroke="#ef4444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" opacity="0.72" />
          <path d={equityPath.path} stroke="#22d3ee" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <defs>
            <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="230" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" stopOpacity="0.28" />
              <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
}

function BarPanel({
  data,
  title,
  tone = "violet"
}: {
  data: Array<{ label: string; value: number }>;
  title: string;
  tone?: "violet" | "green" | "red" | "gold" | "cyan";
}) {
  const max = Math.max(1, ...data.map((item) => Math.abs(item.value)));
  const color = {
    violet: "linear-gradient(180deg,#8b5cf6,#3b1c9b)",
    green: "linear-gradient(180deg,#34d399,#15803d)",
    red: "linear-gradient(180deg,#fb7185,#b91c1c)",
    gold: "linear-gradient(180deg,#f8c14a,#b45309)",
    cyan: "linear-gradient(180deg,#22d3ee,#1d4ed8)"
  }[tone];

  return (
    <section className="premium-panel rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-5 flex h-36 items-end gap-3 border-b border-white/10 px-2">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <span className={cn("text-xs font-semibold", item.value < 0 ? "text-rose-300" : "text-white")}>{formatNum(item.value, item.value % 1 === 0 ? 0 : 1)}</span>
            <div
              className="w-full max-w-9 rounded-t-md shadow-[0_0_18px_rgba(124,92,255,0.22)]"
              style={{ height: `${Math.max(8, (Math.abs(item.value) / max) * 104)}px`, background: item.value < 0 ? "linear-gradient(180deg,#fb7185,#991b1b)" : color }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-1 text-center text-[10px] text-slate-500" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((item) => (
          <span key={item.label} className="truncate">
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function MetricTile({ label, value, tone = "white" }: { label: string; value: string; tone?: "white" | "green" | "red" | "gold" | "cyan" | "violet" }) {
  const toneClass = {
    white: "text-white",
    green: "text-emerald-300",
    red: "text-rose-300",
    gold: "text-gold-300",
    cyan: "text-cyan-300",
    violet: "text-violet-300"
  }[tone];

  return (
    <div className="glass-tile rounded-xl p-4">
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className={cn("mt-2 text-xl font-bold", toneClass)}>{value}</p>
    </div>
  );
}

function SmcAccuracyTile({ accuracy, label, total }: { accuracy: number; label: string; total: number }) {
  const tone = accuracy >= 70 ? "text-emerald-300" : accuracy >= 55 ? "text-gold-300" : "text-rose-300";

  return (
    <div className="glass-tile rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-300">
          {total} trades
        </span>
      </div>
      <p className={cn("mt-3 text-2xl font-bold", tone)}>{accuracy.toFixed(1)}%</p>
      <div className="mt-3 h-2 rounded-full bg-slate-900/70">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-gold-300" style={{ width: `${clamp(accuracy, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function ConfidenceBucketRow({ bucket, total, winRate }: { bucket: string; total: number; winRate: number }) {
  const tone = winRate >= 70 ? "bg-emerald-400" : winRate >= 55 ? "bg-gold-400" : "bg-rose-400";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-white">{bucket}</span>
        <span className="text-xs text-slate-400">{total} closed</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-slate-900/70">
          <div className={cn("h-full rounded-full", tone)} style={{ width: `${clamp(winRate, 0, 100)}%` }} />
        </div>
        <span className="w-14 text-right text-sm font-bold text-cyan-100">{winRate.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function BacktestClient({ initialSummary }: { initialSummary: BacktestSummary }) {
  const [summary, setSummary] = useState(initialSummary);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialSummary.timeframe);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("openedAt");
  const [page, setPage] = useState(1);
  const [selectedTradeKey, setSelectedTradeKey] = useState<string | null>(initialSummary.trades[0] ? tradeKey(initialSummary.trades[0]) : null);

  const refreshBacktest = useCallback(async (next: Timeframe) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backtest?symbol=XAUUSD&timeframe=${next}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to run backtest.");
      }

      const nextSummary = (await response.json()) as BacktestSummary;
      setSummary(nextSummary);
      setSelectedTradeKey(nextSummary.trades[0] ? tradeKey(nextSummary.trades[0]) : null);
      setPage(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to run backtest.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleSiteRefresh = () => {
      void refreshBacktest(timeframe);
    };

    window.addEventListener(SITE_DATA_REFRESH_EVENT, handleSiteRefresh);
    return () => window.removeEventListener(SITE_DATA_REFRESH_EVENT, handleSiteRefresh);
  }, [refreshBacktest, timeframe]);

  async function handleTimeframeChange(next: Timeframe) {
    setTimeframe(next);
    await refreshBacktest(next);
  }

  const orderedTrades = useMemo(() => sortTrades(summary.trades, sortKey), [sortKey, summary.trades]);
  const filteredTrades = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orderedTrades.filter((trade) => {
      const matchesResult = resultFilter === "all" || trade.result === resultFilter;
      const haystack = [trade.signalType, resultLabel(trade.result), formatDateTime(trade.openedAt), sessionForTrade(trade), tradeGrade(trade)]
        .join(" ")
        .toLowerCase();
      return matchesResult && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [orderedTrades, query, resultFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredTrades.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedTrades = filteredTrades.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedTrade = filteredTrades.find((trade) => tradeKey(trade) === selectedTradeKey) ?? filteredTrades[0] ?? summary.trades[0];
  const closedTrades = summary.closed_trades;
  const grossProfit = summary.win_count * 1.5;
  const grossLoss = summary.loss_count;
  const netR = grossProfit - grossLoss;
  const expectancy = closedTrades ? netR / closedTrades : 0;
  const averageR = summary.total_trades ? summary.trades.reduce((sum, trade) => sum + trade.rr, 0) / summary.trades.length : 0;
  const recoveryFactor = summary.max_drawdown > 0 ? netR / summary.max_drawdown : netR > 0 ? netR : 0;
  const payoffRatio = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const equity = useMemo(() => equityValues(summary.trades), [summary.trades]);
  const drawdown = useMemo(() => drawdownValues(equity), [equity]);
  const streaks = useMemo(() => streakStats(summary.trades), [summary.trades]);
  const sessions = useMemo(() => sessionStats(summary.trades), [summary.trades]);
  const bestSession = [...sessions].sort((first, second) => second.winRate - first.winRate || second.total - first.total)[0];
  const worstSession = [...sessions].sort((first, second) => first.winRate - second.winRate || second.total - first.total)[0];
  const distribution = useMemo(() => rDistribution(summary.trades), [summary.trades]);
  const weeklyData = useMemo(() => weekdayReturns(summary.trades), [summary.trades]);
  const monthlyData = useMemo(() => monthlyReturns(summary.trades, netR), [netR, summary.trades]);
  const bestTrade = [...summary.trades].sort((first, second) => second.rr - first.rr)[0];
  const worstTrade = [...summary.trades].sort((first, second) => first.rr - second.rr)[0];
  const score = clamp(summary.win_rate * 0.45 + clamp(summary.profit_factor, 0, 4) * 7.5 + clamp(25 - summary.max_drawdown * 8, 0, 25), 0, 100);
  const grade = gradeFromScore(score);
  const reliability = closedTrades >= 30 ? "High" : closedTrades >= 10 ? "Developing" : "Sample Low";
  const qualityScores = {
    entry: clamp(summary.win_rate + 10, 0, 100),
    exit: clamp(summary.profit_factor * 22, 0, 100),
    market: clamp(score, 0, 100),
    risk: clamp(100 - summary.max_drawdown * 18, 0, 100),
    session: clamp((bestSession?.winRate ?? 0) + 12, 0, 100),
    timeframe: clamp(summary.win_rate + (summary.total_trades > 5 ? 8 : -8), 0, 100)
  };
  const aiRecommendation =
    summary.total_trades < 10
      ? "Continue forward testing before trusting the score. Current sample size is still developing."
      : summary.win_rate >= 70 && summary.profit_factor >= 1.5
        ? "Strategy profile is constructive. Keep risk fixed and prioritize the strongest session windows."
        : "Performance needs more confirmation. Reduce size and avoid low-liquidity setups.";
  const smcStats = summary.smc_stats;
  const smcTotals = {
    bos: summary.trades.filter((trade) => trade.bosConfirmed).length,
    choch: summary.trades.filter((trade) => trade.chochConfirmed).length,
    liquidity: summary.trades.filter((trade) => trade.liquiditySweep).length,
    fvg: summary.trades.filter((trade) => trade.fvgRetest).length
  };
  const confidenceAccuracy = (summary.confidence_accuracy ?? [
    { bucket: "90-100%", total: summary.trades.filter((trade) => (trade.confidence ?? 0) >= 90 && trade.result !== "open").length, winRate: 0 },
    { bucket: "80-89%", total: summary.trades.filter((trade) => (trade.confidence ?? 0) >= 80 && (trade.confidence ?? 0) < 90 && trade.result !== "open").length, winRate: 0 },
    { bucket: "70-79%", total: summary.trades.filter((trade) => (trade.confidence ?? 0) >= 70 && (trade.confidence ?? 0) < 80 && trade.result !== "open").length, winRate: 0 },
    { bucket: "Below 70%", total: summary.trades.filter((trade) => (trade.confidence ?? 0) < 70 && trade.result !== "open").length, winRate: 0 }
  ]).map((row) => "range" in row ? { bucket: row.range, total: row.total, winRate: row.win_rate } : row);

  function exportCsv() {
    const header = ["Date", "Symbol", "Timeframe", "Direction", "Entry", "Stop Loss", "Take Profit", "Result", "RR", "Session", "Signal Grade"];
    const rows = filteredTrades.map((trade) => [
      formatDateTime(trade.openedAt),
      summary.symbol,
      summary.timeframe,
      trade.signalType,
      formatPrice(trade.entryPrice),
      formatPrice(trade.stopLoss),
      formatPrice(trade.takeProfit),
      resultLabel(trade.result),
      formatR(trade.rr),
      sessionForTrade(trade),
      tradeGrade(trade)
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `xauusd-backtest-${summary.timeframe}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-white">Backtest Results</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            Precision trend-pullback replay using TP1 for outcome measurement and closed setups for win rate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200">
            <Database size={15} className="text-emerald-300" aria-hidden="true" />
            {summary.provider === "twelve-data" ? "Twelve Data" : "Mock Data"}
          </span>
          <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200">
            <Clock3 size={15} className="text-slate-400" aria-hidden="true" />
            {formatDateTime(summary.created_at)}
          </span>
          <button
            type="button"
            onClick={() => void refreshBacktest(timeframe)}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 text-xs font-bold text-white shadow-[0_14px_30px_rgba(124,92,255,0.24)] transition hover:bg-violet-500/30 disabled:opacity-60"
          >
            <Play size={15} aria-hidden="true" />
            {loading ? "Running" : "Run Backtest"}
          </button>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}
      {summary.notice ? (
        <div className="rounded-xl border border-gold-400/20 bg-gold-400/10 px-4 py-3 text-sm text-gold-100">
          {summary.notice}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard badge={`${summary.win_count} wins / ${summary.loss_count} losses`} chart={<MiniSparkline color="#34d399" values={equity} />} helper={`${closedTrades} closed setups`} icon={Target} label="Win Rate" tone="green" value={closedTrades > 0 ? `${summary.win_rate}%` : "--"} />
        <KpiCard badge="Gross profit / loss" chart={<MiniSparkline color="#3b82f6" values={equity.map((value) => value + summary.profit_factor)} />} helper="Profit efficiency" icon={TrendingUp} label="Profit Factor" tone="blue" value={summary.profit_factor.toFixed(2)} />
        <KpiCard badge={summary.max_drawdown <= 1 ? "Controlled" : "Monitor"} chart={<MiniSparkline color="#ef4444" values={drawdown} />} helper="R-multiple risk" icon={ShieldAlert} label="Max Drawdown" tone="red" value={`${summary.max_drawdown.toFixed(2)}R`} />
        <KpiCard badge="Avg R / closed" chart={<MiniBars color="#14b8a6" values={summary.trades.map((trade) => trade.rr).slice(0, 10)} />} helper="Expected R multiple" icon={Activity} label="Expectancy" tone="cyan" value={formatR(expectancy)} />
        <KpiCard badge={`${summary.timeframe} replay`} chart={<MiniBars color="#8b5cf6" values={[1, 2, 3, 5, 8, summary.total_trades]} />} helper="Backtested setups" icon={BarChart3} label="Total Trades" tone="violet" value={String(summary.total_trades)} />
        <KpiCard badge={`Score ${Math.round(score)}/100`} chart={<MiniSparkline color="#f8c14a" values={[40, 52, 48, 63, score - 8, score]} />} helper={reliability} icon={Trophy} label="Strategy Grade" tone="gold" value={grade} />
      </section>

      <section className="premium-panel overflow-hidden rounded-xl p-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-cyan-200">Backtest Command Center</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Precision Mode Strategy Replay</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Institutional overview for symbol, timeframe, test window, strategy score, and reliability rating.
                </p>
              </div>
              <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 py-4 text-right shadow-[0_0_34px_rgba(124,92,255,0.18)]">
                <p className="text-xs font-semibold uppercase text-slate-400">Overall Strategy Score</p>
                <p className="mt-1 text-4xl font-bold text-violet-200">{Math.round(score)}</p>
                <p className="text-xs text-slate-400">AI reliability: {reliability}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="Selected Symbol" value={summary.symbol} tone="gold" />
              <MetricTile label="Timeframe" value={TF_LABELS[summary.timeframe]} tone="cyan" />
              <MetricTile label="Backtest Period" value={`${shortDate(summary.start_date)} - ${shortDate(summary.end_date)}`} />
              <MetricTile label="Strategy Name" value="Precision TP1" tone="violet" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="glass-tile rounded-xl p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Symbol Selector</p>
              <select className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 text-sm font-semibold text-white outline-none">
                <option>XAUUSD</option>
              </select>
            </div>
            <div className="glass-tile rounded-xl p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Strategy Selector</p>
              <select className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 text-sm font-semibold text-white outline-none">
                <option>Precision Mode (TP1)</option>
              </select>
            </div>
            <div className="glass-tile rounded-xl p-4 sm:col-span-2 xl:col-span-1">
              <p className="text-xs font-semibold uppercase text-slate-400">Timeframe Selector</p>
              <div className="mt-3">
                <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} disabled={loading} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <EquityCurveChart drawdown={drawdown} equity={equity} />

          <section className="premium-panel overflow-hidden rounded-xl p-5">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-base font-semibold text-white">Trade History</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDateTime(summary.start_date)} to {formatDateTime(summary.end_date)} | historical setups only.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search trades..."
                    className="h-10 w-56 rounded-lg border border-white/10 bg-white/[0.045] pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                  />
                </label>
                <select
                  value={resultFilter}
                  onChange={(event) => {
                    setResultFilter(event.target.value as ResultFilter);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-slate-200 outline-none"
                >
                  <option value="all">All Results</option>
                  <option value="win">Wins</option>
                  <option value="loss">Losses</option>
                  <option value="open">No Hit</option>
                </select>
                <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="h-10 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-slate-200 outline-none">
                  <option value="openedAt">Sort Date</option>
                  <option value="rr">Sort RR</option>
                  <option value="entryPrice">Sort Entry</option>
                  <option value="result">Sort Result</option>
                </select>
                <button type="button" onClick={exportCsv} className="flex h-10 items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/15 px-3 text-xs font-bold text-violet-100 transition hover:bg-violet-500/25">
                  <Download size={15} aria-hidden="true" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="mt-5 max-w-full overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.025] text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Symbol</th>
                    <th className="px-4 py-3 font-semibold">Timeframe</th>
                    <th className="px-4 py-3 font-semibold">Direction</th>
                    <th className="px-4 py-3 font-semibold">Entry</th>
                    <th className="px-4 py-3 font-semibold">Stop Loss</th>
                    <th className="px-4 py-3 font-semibold">Take Profit</th>
                    <th className="px-4 py-3 font-semibold">Result</th>
                    <th className="px-4 py-3 font-semibold">RR</th>
                    <th className="px-4 py-3 font-semibold">Profit / Loss</th>
                    <th className="px-4 py-3 font-semibold">Session</th>
                    <th className="px-4 py-3 font-semibold">Signal Grade</th>
                    <th className="px-4 py-3 text-right font-semibold">Quick View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {pagedTrades.length ? (
                    pagedTrades.map((trade) => (
                      <tr key={tradeKey(trade)} className="transition hover:bg-cyan-300/[0.035]">
                        <td className="px-4 py-3 text-slate-300">{formatDateTime(trade.openedAt)}</td>
                        <td className="px-4 py-3 font-semibold text-white">{summary.symbol}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-bold text-slate-200">{summary.timeframe}</span></td>
                        <td className={cn("px-4 py-3 font-bold", directionTone(trade.signalType))}>{trade.signalType}</td>
                        <td className="px-4 py-3 text-white">{formatPrice(trade.entryPrice)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatPrice(trade.stopLoss)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatPrice(trade.takeProfit)}</td>
                        <td className="px-4 py-3"><span className={resultPillClass(trade.result)}>{resultLabel(trade.result)}</span></td>
                        <td className={cn("px-4 py-3 font-semibold", resultTone(trade.result))}>{formatR(trade.rr)}</td>
                        <td className={cn("px-4 py-3 font-semibold", trade.rr >= 0 ? "text-emerald-300" : "text-rose-300")}>{formatR(trade.rr)}</td>
                        <td className="px-4 py-3 text-slate-300">{sessionForTrade(trade)}</td>
                        <td className="px-4 py-3"><span className="rounded-lg border border-white/10 bg-white/[0.045] px-2 py-1 text-xs font-bold text-cyan-200">{tradeGrade(trade)}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTradeKey(tradeKey(trade))}
                            title="Quick view"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-slate-300 transition hover:border-cyan-300/35 hover:text-white"
                          >
                            <Eye size={15} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="px-4 py-10 text-center text-slate-500">No setups match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 text-sm text-slate-400 md:flex-row md:items-center">
              <p>
                Showing {pagedTrades.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} to {Math.min(safePage * PAGE_SIZE, filteredTrades.length)} of {filteredTrades.length} setups
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage === 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:text-white disabled:opacity-40">
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <span className="rounded-lg border border-violet-400/30 bg-violet-500/20 px-3 py-2 text-xs font-bold text-white">{safePage} / {pageCount}</span>
                <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={safePage === pageCount} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:text-white disabled:opacity-40">
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4 2xl:sticky 2xl:top-24 2xl:self-start">
          <section className="premium-panel rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">Performance Overview</h2>
            <div className="mt-5 flex items-center justify-between gap-5">
              <DonutChart center={String(summary.total_trades)} label="Total Trades" value={summary.win_rate} />
              <div className="flex-1 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Win</span><span className="font-semibold text-white">{summary.win_count} ({summary.win_rate}%)</span></div>
                <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" />Loss</span><span className="font-semibold text-white">{summary.loss_count}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full bg-gold-400" />No Hit</span><span className="font-semibold text-white">{summary.trades.filter((trade) => trade.result === "open").length}</span></div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
              <div><p className="text-slate-400">Best Trade</p><p className="mt-1 font-semibold text-emerald-300">{bestTrade ? formatR(bestTrade.rr) : "--"}</p></div>
              <div><p className="text-slate-400">Worst Trade</p><p className="mt-1 font-semibold text-rose-300">{worstTrade ? formatR(worstTrade.rr) : "--"}</p></div>
              <div><p className="text-slate-400">Win Streak</p><p className="mt-1 font-semibold text-emerald-300">{streaks.maxWins}</p></div>
              <div><p className="text-slate-400">Loss Streak</p><p className="mt-1 font-semibold text-rose-300">{streaks.maxLosses}</p></div>
            </div>
          </section>

          <BarPanel title="R-Multiple Distribution" data={distribution} tone="green" />

          <section className="premium-panel rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">Backtest Summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
              <div><p className="text-slate-400">Total Net Profit</p><p className={cn("mt-1 font-semibold", netR >= 0 ? "text-emerald-300" : "text-rose-300")}>{formatR(netR)}</p></div>
              <div><p className="text-slate-400">Average Win</p><p className="mt-1 font-semibold text-emerald-300">{summary.win_count ? "+1.50R" : "--"}</p></div>
              <div><p className="text-slate-400">Gross Profit</p><p className="mt-1 font-semibold text-emerald-300">{formatR(grossProfit)}</p></div>
              <div><p className="text-slate-400">Average Loss</p><p className="mt-1 font-semibold text-rose-300">{summary.loss_count ? "-1.00R" : "--"}</p></div>
              <div><p className="text-slate-400">Gross Loss</p><p className="mt-1 font-semibold text-rose-300">{formatR(-grossLoss)}</p></div>
              <div><p className="text-slate-400">Recovery Factor</p><p className="mt-1 font-semibold text-cyan-300">{formatNum(recoveryFactor, 2)}</p></div>
            </div>
          </section>

          <section className="premium-panel rounded-xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Quick View</h2>
              <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-xs font-bold text-cyan-200">{selectedTrade ? tradeGrade(selectedTrade) : "--"}</span>
            </div>
            {selectedTrade ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-400">Direction</span><span className={cn("font-bold", directionTone(selectedTrade.signalType))}>{selectedTrade.signalType}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400">Entry</span><span className="font-semibold text-white">{formatPrice(selectedTrade.entryPrice)}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400">Exit Target</span><span className="font-semibold text-white">{formatPrice(selectedTrade.takeProfit)}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400">Session</span><span className="font-semibold text-cyan-200">{sessionForTrade(selectedTrade)}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400">Result</span><span className={resultPillClass(selectedTrade.result)}>{resultLabel(selectedTrade.result)}</span></div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No trade selected.</p>
            )}
          </section>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Drawdown Analytics</h2>
              <p className="mt-1 text-xs text-slate-400">Risk compression, recovery behavior, and losing streak pressure.</p>
            </div>
            <span className="rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 text-xs font-bold text-rose-200">Max {summary.max_drawdown.toFixed(2)}R</span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
            <div className="chart-surface rounded-xl p-4">
              <svg className="h-52 w-full" viewBox="0 0 520 180" fill="none" preserveAspectRatio="none" aria-hidden="true">
                {[35, 70, 105, 140].map((y) => <line key={y} x1="12" x2="508" y1={y} y2={y} stroke="rgba(148,163,184,0.11)" />)}
                <path d={createPath(drawdown, 520, 180, 14).area} fill="#ef4444" opacity="0.14" />
                <path d={createPath(drawdown, 520, 180, 14).path} stroke="#fb7185" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <MetricTile label="Average Drawdown" value={`${formatNum(drawdown.reduce((sum, value) => sum + value, 0) / Math.max(1, drawdown.length), 2)}R`} tone="red" />
              <MetricTile label="Recovery Time" value={`${Math.max(1, drawdown.filter((value) => value > 0).length)} bars`} tone="gold" />
              <MetricTile label="Worst Losing Streak" value={String(streaks.maxLosses)} tone="red" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BarPanel title="Monthly Returns" data={monthlyData} tone="violet" />
          <BarPanel title="Weekly Returns" data={weeklyData} tone="cyan" />
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="premium-panel rounded-xl p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Advanced Strategy Metrics</h2>
              <p className="mt-1 text-xs text-slate-400">Derived analytics from the current backtest summary and recent setup sample.</p>
            </div>
            <SlidersHorizontal size={18} className="text-cyan-300" aria-hidden="true" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricTile label="Sharpe Ratio" value={formatNum(expectancy / Math.max(0.1, summary.max_drawdown || 0.1), 2)} tone="cyan" />
            <MetricTile label="Recovery Factor" value={formatNum(recoveryFactor, 2)} tone="green" />
            <MetricTile label="Average RR" value={formatR(averageR)} tone={averageR >= 0 ? "green" : "red"} />
            <MetricTile label="Average Win" value={summary.win_count ? "+1.50R" : "--"} tone="green" />
            <MetricTile label="Average Loss" value={summary.loss_count ? "-1.00R" : "--"} tone="red" />
            <MetricTile label="Consecutive Wins" value={String(streaks.maxWins)} tone="green" />
            <MetricTile label="Consecutive Losses" value={String(streaks.maxLosses)} tone="red" />
            <MetricTile label="Payoff Ratio" value={formatNum(payoffRatio, 2)} tone="violet" />
          </div>
        </section>

        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">Strategy Health Score</h2>
            <span className="text-4xl font-bold text-gold-300">{grade}</span>
          </div>
          <div className="mt-5 space-y-4">
            <ScoreBar label="Entry Quality" value={qualityScores.entry} tone="green" />
            <ScoreBar label="Exit Quality" value={qualityScores.exit} tone="cyan" />
            <ScoreBar label="Risk Quality" value={qualityScores.risk} tone="red" />
            <ScoreBar label="Session Quality" value={qualityScores.session} tone="violet" />
            <ScoreBar label="Timeframe Quality" value={qualityScores.timeframe} tone="gold" />
            <ScoreBar label="Market Condition Fit" value={qualityScores.market} tone="green" />
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr_0.85fr]">
        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">SMC Backtest Analysis</h2>
              <p className="mt-1 text-xs text-slate-400">Institutional confirmation layer accuracy for BOS, CHoCH, liquidity sweeps, and FVG retests.</p>
            </div>
            <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-200">Phase 3</span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SmcAccuracyTile accuracy={smcStats?.bos_accuracy ?? 0} label="BOS Accuracy" total={smcTotals.bos} />
            <SmcAccuracyTile accuracy={smcStats?.choch_accuracy ?? 0} label="CHoCH Accuracy" total={smcTotals.choch} />
            <SmcAccuracyTile accuracy={smcStats?.liquidity_sweep_accuracy ?? 0} label="Liquidity Sweep" total={smcTotals.liquidity} />
            <SmcAccuracyTile accuracy={smcStats?.fvg_accuracy ?? 0} label="FVG Retest" total={smcTotals.fvg} />
          </div>
        </section>

        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold text-white">Confidence Accuracy</h2>
          <p className="mt-1 text-xs text-slate-400">Actual closed-trade win rate by AI confidence range.</p>
          <div className="mt-5 space-y-3">
            {confidenceAccuracy.map((row) => (
              <ConfidenceBucketRow key={row.bucket} bucket={row.bucket} total={row.total} winRate={row.winRate} />
            ))}
          </div>
        </section>

        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-300">
              <Trophy size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">Session Intelligence</h2>
              <p className="text-xs text-slate-400">Best windows from the replay.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-slate-400">Best Session</span><span className="font-semibold text-emerald-300">{summary.best_session ?? bestSession?.session ?? "--"}</span></div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-slate-400">Worst Session</span><span className="font-semibold text-rose-300">{summary.worst_session ?? worstSession?.session ?? "--"}</span></div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-slate-400">Best Timeframe</span><span className="font-semibold text-cyan-200">{summary.best_timeframe ? TF_LABELS[summary.best_timeframe] : TF_LABELS[summary.timeframe]}</span></div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-slate-400">Expectancy</span><span className={cn("font-semibold", (summary.expectancy ?? expectancy) >= 0 ? "text-emerald-300" : "text-rose-300")}>{formatR(summary.expectancy ?? expectancy)}</span></div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-slate-400">Recovery Factor</span><span className="font-semibold text-violet-200">{formatNum(summary.recovery_factor ?? recoveryFactor, 2)}</span></div>
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold text-white">Best Trade</h2>
          {bestTrade ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-400">Direction</span><span className={cn("font-bold", directionTone(bestTrade.signalType))}>{bestTrade.signalType}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Entry</span><span className="font-semibold text-white">{formatPrice(bestTrade.entryPrice)}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Exit</span><span className="font-semibold text-white">{formatPrice(bestTrade.takeProfit)}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">RR</span><span className="font-semibold text-emerald-300">{formatR(bestTrade.rr)}</span></div>
              <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">Reason: target was reached before stop, matching the TP1 replay rule.</p>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">No trade available.</p>}
        </section>

        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold text-white">Worst Trade</h2>
          {worstTrade ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-400">Direction</span><span className={cn("font-bold", directionTone(worstTrade.signalType))}>{worstTrade.signalType}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Entry</span><span className="font-semibold text-white">{formatPrice(worstTrade.entryPrice)}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Exit</span><span className="font-semibold text-white">{formatPrice(worstTrade.stopLoss)}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">RR</span><span className="font-semibold text-rose-300">{formatR(worstTrade.rr)}</span></div>
              <p className="rounded-xl border border-rose-400/15 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">Risk factor: setup failed the forward replay before TP1 confirmation.</p>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">No trade available.</p>}
        </section>

        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300"><Sparkles size={20} aria-hidden="true" /></span>
            <div>
              <h2 className="text-base font-semibold text-white">AI Backtest Insights</h2>
              <p className="text-xs text-slate-400">Read-only interpretation of replay statistics.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
            <p>{aiRecommendation}</p>
            <p>Best observed session: <span className="font-semibold text-cyan-200">{bestSession?.session ?? "--"}</span>.</p>
            <p>Drawdown is {summary.max_drawdown <= 1 ? "controlled" : "elevated"} at <span className="font-semibold text-rose-200">{summary.max_drawdown.toFixed(2)}R</span>.</p>
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="premium-panel overflow-hidden rounded-xl p-5">
          <h2 className="text-base font-semibold text-white">Session Performance</h2>
          <div className="mt-4 max-w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-3 font-semibold">Session</th>
                  <th className="px-3 py-3 font-semibold">Win Rate</th>
                  <th className="px-3 py-3 font-semibold">Profit Factor</th>
                  <th className="px-3 py-3 font-semibold">Average RR</th>
                  <th className="px-3 py-3 font-semibold">Total Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sessions.map((session) => (
                  <tr key={session.session} className={cn(session.session === bestSession?.session && "bg-emerald-400/[0.045]")}>
                    <td className="px-3 py-3 font-semibold text-white">{session.session}</td>
                    <td className="px-3 py-3 text-emerald-300">{session.total ? `${session.winRate}%` : "--"}</td>
                    <td className="px-3 py-3 text-cyan-200">{session.total ? formatNum(session.profitFactor, 2) : "--"}</td>
                    <td className={cn("px-3 py-3", session.averageR >= 0 ? "text-emerald-300" : "text-rose-300")}>{session.total ? formatR(session.averageR) : "--"}</td>
                    <td className="px-3 py-3 text-slate-300">{session.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold text-white">Timeframe Performance</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {SUPPORTED_TIMEFRAMES.slice(0, 6).map((item) => {
              const active = item === summary.timeframe;
              return (
                <div key={item} className={cn("glass-tile rounded-xl p-4", active && "border-cyan-300/35 bg-cyan-300/[0.055]")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">{TF_LABELS[item]}</span>
                    {active ? <CheckCircle2 size={15} className="text-emerald-300" aria-hidden="true" /> : <Filter size={14} className="text-slate-500" aria-hidden="true" />}
                  </div>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Win Rate</span><span className="font-semibold text-slate-200">{active ? `${summary.win_rate}%` : "Select"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">PF</span><span className="font-semibold text-slate-200">{active ? summary.profit_factor.toFixed(2) : "--"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Trades</span><span className="font-semibold text-slate-200">{active ? summary.total_trades : "--"}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>

      <section className="premium-panel rounded-xl p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricTile label="Best Session" value={bestSession?.session ?? "--"} tone="green" />
          <MetricTile label="Best Timeframe" value={TF_LABELS[summary.timeframe]} tone="cyan" />
          <MetricTile label="Worst Session" value={worstSession?.session ?? "--"} tone="red" />
          <MetricTile label="Worst Timeframe" value={TF_LABELS[summary.timeframe]} tone="gold" />
          <MetricTile label="Market Condition" value={summary.max_drawdown <= 1 ? "Controlled" : "Volatile"} tone={summary.max_drawdown <= 1 ? "green" : "red"} />
          <MetricTile label="AI Recommendation" value={summary.win_rate >= 70 ? "Forward Test" : "Reduce Risk"} tone="violet" />
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-300">
          This is a historical analysis dashboard only. It does not execute trades or connect to broker order flow.
        </div>
      </section>
    </div>
  );
}
