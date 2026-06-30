"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bold,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  Expand,
  FileText,
  Filter,
  Gauge,
  ImagePlus,
  Italic,
  LineChart,
  List,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Upload,
  XCircle,
  type LucideIcon
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode
} from "react";
import { clamp, cn } from "@/lib/utils";

type TradeDirection = "BUY" | "SELL";
type TradeResult = "win" | "loss" | "breakeven" | "open";
type Emotion =
  | "Confident"
  | "Calm"
  | "Fear"
  | "Greed"
  | "Revenge Trading"
  | "FOMO"
  | "Overconfident";
type JournalSession = "Sydney" | "Tokyo" | "London" | "New York" | "London + NY";
type JournalTimeframe = "5m" | "15m" | "30m" | "1h" | "4h" | "D";
type ScreenshotSlot = "before" | "during" | "after";

type JournalEntry = {
  id: string;
  tradeDate: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  result: TradeResult;
  rrAchieved: number;
  session: JournalSession;
  timeframe: JournalTimeframe;
  setup: string;
  emotion: Emotion;
  whyEntered: string;
  whyExited: string;
  mistakes: string;
  lessons: string;
  improvements: string;
  screenshots: Record<ScreenshotSlot, string>;
};

type DraftEntry = Omit<JournalEntry, "id" | "screenshots"> & {
  screenshots: Record<ScreenshotSlot, string>;
};

type PerformanceRow = {
  label: string;
  total: number;
  winRate: number;
  averageR: number;
  profitFactor: number;
};

const STORAGE_KEY = "xauusd-trade-journal-v1";
const PAGE_SIZE = 6;
const RESULT_OPTIONS: TradeResult[] = ["win", "loss", "breakeven", "open"];
const EMOTIONS: Emotion[] = ["Confident", "Calm", "Fear", "Greed", "Revenge Trading", "FOMO", "Overconfident"];
const SESSIONS: JournalSession[] = ["Sydney", "Tokyo", "London", "New York", "London + NY"];
const TIMEFRAMES: JournalTimeframe[] = ["5m", "15m", "30m", "1h", "4h", "D"];
const TIMEFRAME_LABELS: Record<JournalTimeframe, string> = {
  "5m": "M5",
  "15m": "M15",
  "30m": "M30",
  "1h": "H1",
  "4h": "H4",
  D: "Daily"
};

const INITIAL_ENTRIES: JournalEntry[] = [
  {
    id: "journal-001",
    tradeDate: "2026-06-19T10:32:00.000Z",
    symbol: "XAUUSD",
    direction: "BUY",
    entryPrice: 2336.12,
    stopLoss: 2328.2,
    takeProfit: 2359,
    result: "win",
    rrAchieved: 1.85,
    session: "London",
    timeframe: "15m",
    setup: "EMA Pullback",
    emotion: "Calm",
    whyEntered: "<p>Price pulled back to the EMA stack inside London liquidity. Momentum held above support and the bullish engulfing candle gave confirmation.</p>",
    whyExited: "<p>Price reached the planned take-profit zone near prior resistance. Exit respected the plan.</p>",
    mistakes: "<p>No major execution mistake. Stop could have moved to breakeven earlier.</p>",
    lessons: "<p>Best trades came after waiting for confirmation instead of entering the first touch.</p>",
    improvements: "<p>Track partial exits and move SL only after market structure confirms.</p>",
    screenshots: { before: "", during: "", after: "" }
  },
  {
    id: "journal-002",
    tradeDate: "2026-06-18T14:15:00.000Z",
    symbol: "XAUUSD",
    direction: "SELL",
    entryPrice: 2341.05,
    stopLoss: 2348.6,
    takeProfit: 2327.4,
    result: "loss",
    rrAchieved: -0.8,
    session: "New York",
    timeframe: "5m",
    setup: "Breakout",
    emotion: "FOMO",
    whyEntered: "<p>Entered after a fast break under intraday support.</p>",
    whyExited: "<p>Stopped out when price snapped back above the broken level.</p>",
    mistakes: "<p>Chased the move after the candle closed too far from value.</p>",
    lessons: "<p>Do not short late breaks without a retest or liquidity sweep.</p>",
    improvements: "<p>Require a pullback, lower high, and bearish continuation before entry.</p>",
    screenshots: { before: "", during: "", after: "" }
  },
  {
    id: "journal-003",
    tradeDate: "2026-06-18T09:45:00.000Z",
    symbol: "XAUUSD",
    direction: "BUY",
    entryPrice: 2328.5,
    stopLoss: 2322.4,
    takeProfit: 2340.2,
    result: "win",
    rrAchieved: 2.15,
    session: "London",
    timeframe: "30m",
    setup: "Trend Continuation",
    emotion: "Confident",
    whyEntered: "<p>Higher low formed above support with EMA 50 holding as dynamic support.</p>",
    whyExited: "<p>Exited into a clean resistance target after volume expanded.</p>",
    mistakes: "<p>Entry was strong but position size was slightly conservative.</p>",
    lessons: "<p>Continuation trades work best when London confirms the trend.</p>",
    improvements: "<p>Scale into the second confirmation candle only when RR remains above 1:1.5.</p>",
    screenshots: { before: "", during: "", after: "" }
  },
  {
    id: "journal-004",
    tradeDate: "2026-06-17T23:05:00.000Z",
    symbol: "XAUUSD",
    direction: "BUY",
    entryPrice: 2322.4,
    stopLoss: 2315.8,
    takeProfit: 2330.6,
    result: "win",
    rrAchieved: 1.25,
    session: "Tokyo",
    timeframe: "1h",
    setup: "EMA Pullback",
    emotion: "Calm",
    whyEntered: "<p>Price respected the trend stack and rejected the previous session low.</p>",
    whyExited: "<p>Took profit before low-liquidity consolidation.</p>",
    mistakes: "<p>Trade was clean, but target selection was too conservative.</p>",
    lessons: "<p>Asian session setups require patience and smaller target expectations.</p>",
    improvements: "<p>Use ATR-based targets when volatility is compressed.</p>",
    screenshots: { before: "", during: "", after: "" }
  },
  {
    id: "journal-005",
    tradeDate: "2026-06-16T16:30:00.000Z",
    symbol: "XAUUSD",
    direction: "SELL",
    entryPrice: 2340.8,
    stopLoss: 2347.2,
    takeProfit: 2328.1,
    result: "loss",
    rrAchieved: -0.65,
    session: "New York",
    timeframe: "15m",
    setup: "SR Rejection",
    emotion: "Greed",
    whyEntered: "<p>Shorted a resistance rejection after two bearish candles.</p>",
    whyExited: "<p>Exited manually before the full stop after buyers absorbed the level.</p>",
    mistakes: "<p>Ignored improving MACD and entered into a late-session reversal.</p>",
    lessons: "<p>Resistance rejection needs momentum confirmation, not only wick rejection.</p>",
    improvements: "<p>Add a strict momentum filter before taking counter-trend shorts.</p>",
    screenshots: { before: "", during: "", after: "" }
  },
  {
    id: "journal-006",
    tradeDate: "2026-06-14T13:20:00.000Z",
    symbol: "XAUUSD",
    direction: "BUY",
    entryPrice: 2316.2,
    stopLoss: 2308.9,
    takeProfit: 2331.5,
    result: "win",
    rrAchieved: 2.05,
    session: "London + NY",
    timeframe: "4h",
    setup: "Trend Pullback",
    emotion: "Confident",
    whyEntered: "<p>Trend pullback into daily support followed by bullish confirmation.</p>",
    whyExited: "<p>Closed at the next major supply zone.</p>",
    mistakes: "<p>No mistake. Waited for confirmation and respected risk.</p>",
    lessons: "<p>London and New York overlap gives the cleanest continuation after confirmed pullbacks.</p>",
    improvements: "<p>Document more screenshots around the confirmation candle.</p>",
    screenshots: { before: "", during: "", after: "" }
  },
  {
    id: "journal-007",
    tradeDate: "2026-06-12T06:10:00.000Z",
    symbol: "XAUUSD",
    direction: "SELL",
    entryPrice: 2354.9,
    stopLoss: 2361.2,
    takeProfit: 2344.6,
    result: "breakeven",
    rrAchieved: 0,
    session: "Sydney",
    timeframe: "30m",
    setup: "Range Fade",
    emotion: "Fear",
    whyEntered: "<p>Sold the top of a tight range with weak momentum.</p>",
    whyExited: "<p>Moved stop to breakeven before liquidity improved.</p>",
    mistakes: "<p>Trade had limited range expansion potential.</p>",
    lessons: "<p>Range fades are lower quality before London volume arrives.</p>",
    improvements: "<p>Avoid low-volatility trades unless the RR is exceptional.</p>",
    screenshots: { before: "", during: "", after: "" }
  },
  {
    id: "journal-008",
    tradeDate: "2026-06-10T15:05:00.000Z",
    symbol: "XAUUSD",
    direction: "BUY",
    entryPrice: 2305.3,
    stopLoss: 2298.6,
    takeProfit: 2318.4,
    result: "win",
    rrAchieved: 1.65,
    session: "New York",
    timeframe: "1h",
    setup: "News Continuation",
    emotion: "Overconfident",
    whyEntered: "<p>Entered after USD weakness confirmed a bullish continuation.</p>",
    whyExited: "<p>Closed into TP1 after price slowed near resistance.</p>",
    mistakes: "<p>Confidence was high after previous wins and could have led to oversizing.</p>",
    lessons: "<p>Good result, but news trades still need reduced size.</p>",
    improvements: "<p>Cap risk after consecutive wins to avoid overconfidence.</p>",
    screenshots: { before: "", during: "", after: "" }
  }
];

function createDefaultDraft(): DraftEntry {
  return {
    tradeDate: new Date().toISOString().slice(0, 10),
    symbol: "XAUUSD",
    direction: "BUY",
    entryPrice: 4230,
    stopLoss: 4218,
    takeProfit: 4254,
    result: "win",
    rrAchieved: 1.5,
    session: "London",
    timeframe: "15m",
    setup: "EMA Pullback",
    emotion: "Calm",
    whyEntered: "<p>Price rejected support and aligned with the trend stack.</p>",
    whyExited: "<p>Exited at planned resistance after momentum slowed.</p>",
    mistakes: "<p>No major mistake noted.</p>",
    lessons: "<p>Waiting for confirmation improved trade quality.</p>",
    improvements: "<p>Keep screenshots before entry and after exit for review.</p>",
    screenshots: { before: "", during: "", after: "" }
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatR(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function grade(score: number) {
  if (score >= 90) return "A+";
  if (score >= 78) return "A";
  if (score >= 64) return "B";
  return "C";
}

function resultLabel(result: TradeResult) {
  return result === "breakeven" ? "Breakeven" : result[0].toUpperCase() + result.slice(1);
}

function profitForEntry(entry: Pick<JournalEntry, "rrAchieved">) {
  return entry.rrAchieved * 650;
}

function getStats(entries: JournalEntry[]) {
  const closed = entries.filter((entry) => entry.result !== "open");
  const wins = entries.filter((entry) => entry.result === "win").length;
  const losses = entries.filter((entry) => entry.result === "loss").length;
  const breakeven = entries.filter((entry) => entry.result === "breakeven").length;
  const totalR = entries.reduce((sum, entry) => sum + entry.rrAchieved, 0);
  const grossProfit = entries.filter((entry) => entry.rrAchieved > 0).reduce((sum, entry) => sum + entry.rrAchieved, 0);
  const grossLoss = Math.abs(entries.filter((entry) => entry.rrAchieved < 0).reduce((sum, entry) => sum + entry.rrAchieved, 0));
  const winRate = closed.length ? (wins / closed.length) * 100 : 0;
  const averageR = closed.length ? totalR / closed.length : 0;
  const riskScore = clamp(94 - losses * 5 + wins * 1.3, 0, 100);
  const emotionalScore = entries.length
    ? (entries.filter((entry) => entry.emotion === "Calm" || entry.emotion === "Confident").length / entries.length) * 100
    : 0;
  const entryScore = entries.length
    ? (entries.filter((entry) => stripHtml(entry.whyEntered).length > 35).length / entries.length) * 100
    : 0;
  const exitScore = entries.length
    ? (entries.filter((entry) => stripHtml(entry.whyExited).length > 30).length / entries.length) * 100
    : 0;
  const disciplineScore = clamp(riskScore * 0.32 + emotionalScore * 0.28 + entryScore * 0.2 + exitScore * 0.2, 0, 100);

  return {
    averageR,
    breakeven,
    disciplineScore,
    emotionalScore,
    entryScore,
    exitScore,
    grossLoss,
    grossProfit,
    losses,
    netProfit: entries.reduce((sum, entry) => sum + profitForEntry(entry), 0),
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit,
    riskScore,
    total: entries.length,
    totalR,
    winRate,
    wins
  };
}

function performanceBy<T extends string>(
  entries: JournalEntry[],
  labels: T[],
  getValue: (entry: JournalEntry) => T
): PerformanceRow[] {
  return labels.map((label) => {
    const rows = entries.filter((entry) => getValue(entry) === label);
    const stats = getStats(rows);
    return {
      averageR: stats.averageR,
      label,
      profitFactor: stats.profitFactor,
      total: rows.length,
      winRate: stats.winRate
    };
  });
}

function distributionByEmotion(entries: JournalEntry[]) {
  return EMOTIONS.map((emotion) => ({
    color:
      emotion === "Calm" || emotion === "Confident"
        ? "#34d399"
        : emotion === "Fear"
          ? "#60a5fa"
          : emotion === "Overconfident"
            ? "#f8c14a"
            : "#fb7185",
    label: emotion,
    value: entries.filter((entry) => entry.emotion === emotion).length
  })).filter((item) => item.value > 0);
}

function winRateTrend(entries: JournalEntry[]) {
  const chronological = [...entries].sort((first, second) => new Date(first.tradeDate).getTime() - new Date(second.tradeDate).getTime());
  let wins = 0;
  let closed = 0;
  return chronological.map((entry) => {
    if (entry.result !== "open") {
      closed += 1;
      if (entry.result === "win") wins += 1;
    }
    return closed ? Number(((wins / closed) * 100).toFixed(1)) : 0;
  });
}

function equityCurve(entries: JournalEntry[]) {
  let equity = 0;
  return [0, ...[...entries]
    .sort((first, second) => new Date(first.tradeDate).getTime() - new Date(second.tradeDate).getTime())
    .map((entry) => {
      equity += profitForEntry(entry);
      return Number(equity.toFixed(2));
    })];
}

function linePath(values: number[], width = 420, height = 150, pad = 12) {
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

function qualityScores(entry: JournalEntry) {
  const entryQuality = clamp((stripHtml(entry.whyEntered).length > 40 ? 8.5 : 6.4) + (entry.rrAchieved > 1 ? 0.8 : 0), 0, 10);
  const exitQuality = clamp((stripHtml(entry.whyExited).length > 35 ? 8 : 6.2) + (entry.result === "win" ? 0.8 : 0), 0, 10);
  const riskManagement = clamp(9 - (entry.result === "loss" ? 1.3 : 0) + (Math.abs(entry.rrAchieved) <= 2.5 ? 0.4 : -0.6), 0, 10);
  const emotionalControl = clamp(
    entry.emotion === "Calm" || entry.emotion === "Confident" ? 8.8 : entry.emotion === "Fear" ? 6.8 : 5.8,
    0,
    10
  );
  const overall = (entryQuality + exitQuality + riskManagement + emotionalControl) / 4;
  return { emotionalControl, entryQuality, exitQuality, overall, riskManagement };
}

function exportCsv(entries: JournalEntry[]) {
  const rows = [
    ["Date", "Symbol", "Direction", "Timeframe", "Session", "Result", "RR", "Emotion", "Setup", "Notes"],
    ...entries.map((entry) => [
      formatDateTime(entry.tradeDate),
      entry.symbol,
      entry.direction,
      TIMEFRAME_LABELS[entry.timeframe],
      entry.session,
      resultLabel(entry.result),
      entry.rrAchieved.toFixed(2),
      entry.emotion,
      entry.setup,
      stripHtml(entry.lessons)
    ])
  ];

  return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n"))}`;
}

function mergeJournalEntries(primary: JournalEntry[], secondary: JournalEntry[]) {
  const byId = new Map<string, JournalEntry>();

  [...secondary, ...primary].forEach((entry) => {
    byId.set(entry.id, entry);
  });

  return Array.from(byId.values()).sort((first, second) => new Date(second.tradeDate).getTime() - new Date(first.tradeDate).getTime());
}

function syncJournalEntry(entry: JournalEntry) {
  return fetch("/api/journal", {
    body: JSON.stringify(entry),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  }).catch(() => undefined);
}

function useJournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>(INITIAL_ENTRIES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as JournalEntry[];
        if (Array.isArray(parsed) && parsed.length) {
          setEntries(parsed);
        }
      }
    } catch {
      setEntries(INITIAL_ENTRIES);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/journal", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { entries?: JournalEntry[] } | null) => {
        if (cancelled || !Array.isArray(payload?.entries) || !payload.entries.length) {
          return;
        }

        setEntries((current) => mergeJournalEntries(payload.entries ?? [], current));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, loaded]);

  return [entries, setEntries] as const;
}

function KpiCard({
  badge,
  helper,
  icon: Icon,
  sparkValues,
  tone,
  trend,
  value
}: {
  badge: string;
  helper: string;
  icon: LucideIcon;
  sparkValues: number[];
  tone: "violet" | "blue" | "green" | "gold" | "red" | "cyan";
  trend: string;
  value: string;
}) {
  const toneMap = {
    blue: "text-blue-300 from-blue-500/22 to-blue-500/0",
    cyan: "text-cyan-300 from-cyan-400/22 to-cyan-500/0",
    gold: "text-gold-400 from-gold-400/24 to-gold-400/0",
    green: "text-emerald-300 from-emerald-400/24 to-emerald-400/0",
    red: "text-rose-300 from-rose-500/24 to-rose-500/0",
    violet: "text-violet-300 from-violet-500/24 to-violet-500/0"
  }[tone];
  const iconTone = toneMap.split(" ")[0];

  return (
    <section className="premium-panel interactive-lift min-h-[136px] overflow-hidden rounded-xl p-4">
      <div className={cn("absolute -right-8 -top-8 h-28 w-36 rounded-full bg-gradient-to-br blur-2xl", toneMap)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055]", iconTone)}>
            <Icon size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-slate-400">{helper}</p>
            <p className={cn("mt-2 text-2xl font-bold leading-none", iconTone)}>{value}</p>
            <p className="mt-2 text-xs font-semibold text-emerald-300">{trend}</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase text-slate-300">
          {badge}
        </span>
      </div>
      <MiniSparkline values={sparkValues} className="absolute bottom-3 right-4 h-10 w-24 opacity-80" />
    </section>
  );
}

function MiniSparkline({ className, values }: { className?: string; values: number[] }) {
  const path = linePath(values, 120, 48, 5);
  return (
    <svg className={className} viewBox="0 0 120 48" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d={path.area} fill="url(#journalMiniFill)" />
      <path d={path.path} stroke="#7c5cff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="journalMiniFill" x1="0" x2="0" y1="0" y2="48">
          <stop stopColor="#7c5cff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LineAreaChart({
  color = "#2d8cff",
  values
}: {
  color?: string;
  values: number[];
}) {
  const path = linePath(values, 500, 180, 14);
  return (
    <svg className="h-52 w-full" viewBox="0 0 500 180" fill="none" preserveAspectRatio="none" aria-hidden="true">
      {[36, 72, 108, 144].map((y) => (
        <line key={y} x1="14" x2="486" y1={y} y2={y} stroke="rgba(148,163,184,0.12)" />
      ))}
      {[100, 200, 300, 400].map((x) => (
        <line key={x} x1={x} x2={x} y1="14" y2="166" stroke="rgba(148,163,184,0.08)" />
      ))}
      <path d={path.area} fill={color} opacity="0.22" />
      <path d={path.path} stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({
  center,
  label,
  segments
}: {
  center: string;
  label: string;
  segments: Array<{ color: string; label: string; value: number }>;
}) {
  const total = Math.max(1, segments.reduce((sum, segment) => sum + segment.value, 0));
  let cursor = 0;
  const gradient = segments
    .map((segment) => {
      const start = cursor;
      const end = cursor + (segment.value / total) * 360;
      cursor = end;
      return `${segment.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full p-3" style={{ background: `conic-gradient(${gradient}, rgba(255,255,255,0.08) 0deg)` }}>
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#07111f]">
          <span className="text-2xl font-bold text-white">{center}</span>
          <span className="text-[11px] text-slate-400">{label}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate text-slate-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="font-semibold text-white">{Math.round((segment.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerticalBars({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((item) => Math.abs(item.value)));
  return (
    <div className="mt-4 flex h-44 items-end gap-4 border-b border-white/10 px-2">
      {data.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className={cn("text-xs font-semibold", item.value >= 0 ? "text-emerald-300" : "text-rose-300")}>
            {item.value.toFixed(1)}
          </span>
          <div
            className={cn(
              "w-full max-w-9 rounded-t-md shadow-[0_0_20px_rgba(124,92,255,0.18)]",
              item.value >= 0 ? "bg-gradient-to-t from-cyan-700 to-emerald-300" : "bg-gradient-to-t from-rose-700 to-red-400"
            )}
            style={{ height: `${Math.max(10, (Math.abs(item.value) / max) * 118)}px` }}
          />
          <span className="truncate text-[10px] text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({
  rows,
  tone = "green"
}: {
  rows: Array<{ label: string; value: number }>;
  tone?: "green" | "blue" | "violet" | "gold";
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const color = {
    blue: "from-blue-500 to-cyan-300",
    gold: "from-gold-500 to-gold-400",
    green: "from-emerald-500 to-green-300",
    violet: "from-violet-500 to-fuchsia-300"
  }[tone];

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[88px_1fr_56px] items-center gap-3 text-sm">
          <span className="truncate text-slate-300">{row.label}</span>
          <div className="h-2 rounded-full bg-white/[0.07]">
            <div className={cn("h-full rounded-full bg-gradient-to-r", color)} style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <span className="text-right text-xs font-semibold text-white">{row.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function CandlePreview({ label, tone = "green" }: { label: string; tone?: "green" | "red" | "blue" }) {
  const color = tone === "red" ? "#fb7185" : tone === "blue" ? "#60a5fa" : "#34d399";
  return (
    <div className="chart-surface relative h-56 overflow-hidden rounded-xl border border-white/10">
      <div className="absolute left-4 top-4 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{label}</div>
      <svg className="h-full w-full" viewBox="0 0 420 220" fill="none" preserveAspectRatio="none" aria-hidden="true">
        {[46, 86, 126, 166].map((y) => (
          <line key={y} x1="18" x2="402" y1={y} y2={y} stroke="rgba(148,163,184,0.1)" />
        ))}
        <rect x="26" y="38" width="365" height="28" fill="rgba(248,113,113,0.12)" />
        <rect x="26" y="154" width="365" height="28" fill="rgba(52,211,153,0.12)" />
        {Array.from({ length: 34 }).map((_, index) => {
          const x = 36 + index * 10.5;
          const wave = Math.sin(index * 0.7) * 26 + Math.cos(index * 0.25) * 18;
          const bodyTop = 112 - wave + (index % 3) * 4;
          const bodyHeight = 12 + (index % 5) * 3;
          const up = index % 4 !== 0;
          return (
            <g key={index}>
              <line x1={x + 3} x2={x + 3} y1={bodyTop - 11} y2={bodyTop + bodyHeight + 12} stroke={up ? "#34d399" : "#fb7185"} strokeWidth="1.2" />
              <rect x={x} y={bodyTop} width="6" height={bodyHeight} rx="1" fill={up ? "#34d399" : "#fb7185"} />
            </g>
          );
        })}
        <path d="M72 142 L106 126 L132 134 L165 96 L198 115 L226 90 L260 84 L294 72 L330 54 L374 42" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between text-[10px] text-slate-500">
        <span>09:00</span>
        <span>10:00</span>
        <span>11:00</span>
        <span>12:00</span>
      </div>
    </div>
  );
}

function FormField({
  children,
  label
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#06111f]/80 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:bg-[#071827]";

function RichTextEditor({
  icon: Icon,
  label,
  onChange,
  tone,
  value
}: {
  icon: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  tone: "green" | "blue" | "gold" | "red";
  value: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const toneClass = {
    blue: "text-blue-300 border-blue-400/25",
    gold: "text-gold-400 border-gold-400/25",
    green: "text-emerald-300 border-emerald-400/25",
    red: "text-rose-300 border-rose-400/25"
  }[tone];

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const runCommand = (command: "bold" | "italic" | "insertUnorderedList") => {
    ref.current?.focus();
    document.execCommand(command);
    onChange(ref.current?.innerHTML ?? "");
  };

  return (
    <section className={cn("glass-tile rounded-xl p-4", toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase text-white">
          <Icon size={16} className={toneClass.split(" ")[0]} aria-hidden="true" />
          {label}
        </div>
        <div className="flex gap-1">
          {[
            ["bold", Bold],
            ["italic", Italic],
            ["insertUnorderedList", List]
          ].map(([command, ToolbarIcon]) => (
            <button
              key={command as string}
              type="button"
              className="icon-button h-8 w-8"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand(command as "bold" | "italic" | "insertUnorderedList")}
              aria-label={`${label} ${command}`}
            >
              <ToolbarIcon size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <div
        ref={ref}
        aria-label={label}
        className="mt-3 min-h-28 rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-200 outline-none transition focus:border-cyan-300/40"
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        suppressContentEditableWarning
      />
    </section>
  );
}

function ScreenshotManager({
  screenshots,
  onUpload
}: {
  onUpload: (slot: ScreenshotSlot, dataUrl: string) => void;
  screenshots: Record<ScreenshotSlot, string>;
}) {
  const handleUpload = (slot: ScreenshotSlot, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpload(slot, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="premium-panel rounded-xl p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-white">Screenshot Management</h2>
          <p className="mt-1 text-xs text-slate-400">Attach before, during, and after screenshots for every review.</p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
          Gallery ready
        </span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {(["before", "during", "after"] as ScreenshotSlot[]).map((slot) => (
          <div key={slot} className="glass-tile overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <p className="text-xs font-semibold uppercase text-slate-300">{slot} trade</p>
              <label className="icon-button h-8 w-8" aria-label={`Upload ${slot} screenshot`} title={`Upload ${slot} screenshot`}>
                <ImagePlus size={14} aria-hidden="true" />
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleUpload(slot, event)} />
              </label>
            </div>
            {screenshots[slot] ? (
              <div
                role="img"
                aria-label={`${slot} trade screenshot`}
                className="h-44 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${screenshots[slot]})` }}
              />
            ) : (
              <div className="p-3">
                <CandlePreview label={`${slot} screenshot`} tone={slot === "after" ? "green" : slot === "during" ? "blue" : "red"} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function EmotionTracker({
  selected,
  setSelected,
  summary
}: {
  selected: Emotion;
  setSelected: (emotion: Emotion) => void;
  summary: Array<{ color: string; label: string; value: number }>;
}) {
  return (
    <section className="premium-panel rounded-xl p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-base font-semibold text-white">Emotion Tracker</h2>
          <p className="mt-1 text-xs text-slate-400">Tag the dominant emotion so performance can be reviewed without guessing later.</p>
        </div>
        <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
          Current: {selected}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {EMOTIONS.map((emotion) => {
          const active = selected === emotion;
          return (
            <button
              key={emotion}
              type="button"
              className={cn(
                "rounded-xl border px-3 py-3 text-left text-xs font-semibold transition",
                active
                  ? "border-cyan-300/50 bg-cyan-300/15 text-white shadow-[0_0_34px_rgba(34,211,238,0.12)]"
                  : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
              )}
              onClick={() => setSelected(emotion)}
            >
              <span className={cn("mb-2 block h-2 w-8 rounded-full", active ? "bg-cyan-300" : "bg-slate-600")} />
              {emotion}
            </button>
          );
        })}
      </div>
      <div className="mt-5">
        <DonutChart center={String(summary.reduce((sum, item) => sum + item.value, 0))} label="Emotion Tags" segments={summary.length ? summary : [{ color: "#64748b", label: "No Data", value: 1 }]} />
      </div>
    </section>
  );
}

function ResultPill({ result }: { result: TradeResult }) {
  const tone = {
    breakeven: "border-gold-400/25 bg-gold-400/10 text-gold-300",
    loss: "border-rose-400/25 bg-rose-400/10 text-rose-300",
    open: "border-blue-400/25 bg-blue-400/10 text-blue-300",
    win: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
  }[result];

  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", tone)}>{resultLabel(result)}</span>;
}

function DirectionText({ direction }: { direction: TradeDirection }) {
  return <span className={direction === "BUY" ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>{direction === "BUY" ? "Buy" : "Sell"}</span>;
}

function DisciplineScorePanel({ stats }: { stats: ReturnType<typeof getStats> }) {
  const rows = [
    { label: "Risk Discipline", value: stats.riskScore },
    { label: "Emotional Discipline", value: stats.emotionalScore },
    { label: "Entry Discipline", value: stats.entryScore },
    { label: "Exit Discipline", value: stats.exitScore }
  ];

  return (
    <section className="premium-panel rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Discipline Score</h2>
          <p className="mt-1 text-xs text-slate-400">Execution quality from risk, emotion, entry, and exit notes.</p>
        </div>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-lg font-bold text-emerald-300">
          {grade(stats.disciplineScore)}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="glass-tile rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-slate-400">{row.label}</p>
              <span className="text-sm font-bold text-white">{Math.round(row.value)}/100</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-300" style={{ width: `${clamp(row.value, 0, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AiTradeReview({ entry }: { entry: JournalEntry }) {
  const scores = qualityScores(entry);
  const weaknesses = entry.result === "loss" ? "Loss came from confirmation weakness or emotional pressure." : "Trade management can improve through partial scaling.";
  const recommendation =
    entry.emotion === "FOMO" || entry.emotion === "Greed" || entry.emotion === "Revenge Trading"
      ? "Reduce size after emotional triggers and require a retest before entry."
      : "Keep documenting screenshots and wait for the same clean confirmation model.";

  return (
    <section className="premium-panel rounded-xl p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold uppercase text-white">AI Trade Review</h2>
        <span className="rounded-full border border-blue-400/25 bg-blue-400/10 px-2 py-0.5 text-[10px] font-bold text-blue-200">BETA</span>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[150px_1fr]">
        <div className="flex h-36 w-36 items-center justify-center rounded-full p-3" style={{ background: `conic-gradient(#34d399 ${scores.overall * 36}deg, rgba(255,255,255,0.08) 0deg)` }}>
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#07111f]">
            <span className="text-3xl font-bold text-white">{scores.overall.toFixed(1)}</span>
            <span className="text-xs text-slate-400">/10 Quality</span>
          </div>
        </div>
        <div className="space-y-3">
          {[
            ["Entry Quality", scores.entryQuality],
            ["Exit Quality", scores.exitQuality],
            ["Risk Management", scores.riskManagement],
            ["Emotional Control", scores.emotionalControl]
          ].map(([label, value]) => (
            <div key={label as string} className="grid grid-cols-[1fr_44px] items-center gap-3 text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <span className={cn("h-2.5 w-2.5 rounded-full", Number(value) >= 8 ? "bg-emerald-400" : Number(value) >= 7 ? "bg-gold-400" : "bg-rose-400")} />
                {label as string}
              </span>
              <span className="text-right font-semibold text-white">{Number(value).toFixed(0)}/10</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="glass-tile rounded-xl p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Strengths</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {entry.session} session execution and {entry.setup.toLowerCase()} documentation give this trade a clear review trail.
          </p>
        </div>
        <div className="glass-tile rounded-xl p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Weaknesses</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{weaknesses}</p>
        </div>
        <div className="glass-tile rounded-xl p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Recommendations</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{recommendation}</p>
        </div>
      </div>
    </section>
  );
}

function SelectedTradeDetail({ entry }: { entry: JournalEntry }) {
  return (
    <section className="premium-panel overflow-hidden rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-white">{formatDateTime(entry.tradeDate)}</h2>
        <ResultPill result={entry.result} />
        <span className="text-sm font-semibold text-violet-300">{entry.setup}</span>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[240px_1fr_1fr]">
        <div className="glass-tile rounded-xl p-4 text-sm">
          {[
            ["Pair", entry.symbol],
            ["Direction", entry.direction === "BUY" ? "Buy" : "Sell"],
            ["Entry", formatPrice(entry.entryPrice)],
            ["Stop Loss", formatPrice(entry.stopLoss)],
            ["Take Profit", formatPrice(entry.takeProfit)],
            ["RR", entry.rrAchieved.toFixed(2)],
            ["P/L", formatMoney(profitForEntry(entry))],
            ["Session", entry.session],
            ["Timeframe", TIMEFRAME_LABELS[entry.timeframe]],
            ["Emotion", entry.emotion]
          ].map(([label, value]) => (
            <div key={label} className="mb-2 flex items-center justify-between gap-4 last:mb-0">
              <span className="text-slate-500">{label}</span>
              <span className={cn("text-right font-semibold", label === "P/L" ? (entry.rrAchieved >= 0 ? "text-emerald-300" : "text-rose-300") : "text-slate-200")}>{value}</span>
            </div>
          ))}
          <div className="mt-4 flex items-center gap-1 text-gold-400">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={15} fill={index < Math.round(qualityScores(entry).overall / 2) ? "currentColor" : "none"} aria-hidden="true" />
            ))}
          </div>
        </div>
        <div>
          {entry.screenshots.before ? (
            <div
              role="img"
              aria-label="Before trade"
              className="h-56 w-full rounded-xl border border-white/10 bg-cover bg-center"
              style={{ backgroundImage: `url(${entry.screenshots.before})` }}
            />
          ) : (
            <CandlePreview label="Before Trade" tone={entry.direction === "BUY" ? "green" : "red"} />
          )}
        </div>
        <div>
          {entry.screenshots.after ? (
            <div
              role="img"
              aria-label="After trade"
              className="h-56 w-full rounded-xl border border-white/10 bg-cover bg-center"
              style={{ backgroundImage: `url(${entry.screenshots.after})` }}
            />
          ) : (
            <CandlePreview label="After Trade" tone={entry.result === "loss" ? "red" : "green"} />
          )}
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {[
          ["Why I Entered", entry.whyEntered, TrendingUp, "border-emerald-400/20"],
          ["Why I Exited", entry.whyExited, Target, "border-blue-400/20"],
          ["Lessons Learned", entry.lessons, BookOpen, "border-gold-400/20"]
        ].map(([title, html, Icon, border]) => (
          <div key={title as string} className={cn("glass-tile rounded-xl p-4", border as string)}>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase text-white">
              <Icon size={16} className="text-cyan-300" aria-hidden="true" />
              {title as string}
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-300" dangerouslySetInnerHTML={{ __html: html as string }} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400">Tags</span>
          {[entry.setup, `${entry.session} Session`, TIMEFRAME_LABELS[entry.timeframe]].map((tag) => (
            <span key={tag} className="rounded-md bg-violet-400/18 px-3 py-1 text-xs font-semibold text-violet-200">{tag}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Screenshot</span>
          <button type="button" className="icon-button h-8 w-8" title="Download screenshot"><Download size={14} aria-hidden="true" /></button>
          <button type="button" className="icon-button h-8 w-8" title="Expand screenshot"><Expand size={14} aria-hidden="true" /></button>
          <button type="button" className="icon-button h-8 w-8" title="Capture note"><Camera size={14} aria-hidden="true" /></button>
        </div>
      </div>
    </section>
  );
}

function TradeHistoryTable({
  entries,
  onSelect,
  selectedId
}: {
  entries: JournalEntry[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<"all" | TradeResult>("all");
  const [directionFilter, setDirectionFilter] = useState<"all" | TradeDirection>("all");
  const [setupFilter, setSetupFilter] = useState("all");
  const [page, setPage] = useState(1);
  const setups = useMemo(() => Array.from(new Set(entries.map((entry) => entry.setup))), [entries]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesResult = resultFilter === "all" || entry.result === resultFilter;
      const matchesDirection = directionFilter === "all" || entry.direction === directionFilter;
      const matchesSetup = setupFilter === "all" || entry.setup === setupFilter;
      const haystack = [entry.symbol, entry.setup, entry.session, entry.emotion, stripHtml(entry.lessons), entry.direction, entry.result].join(" ").toLowerCase();
      return matchesResult && matchesDirection && matchesSetup && (!normalized || haystack.includes(normalized));
    });
  }, [directionFilter, entries, query, resultFilter, setupFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [directionFilter, query, resultFilter, setupFilter]);

  return (
    <section className="premium-panel overflow-hidden rounded-xl">
      <div className="border-b border-white/10 p-4">
        <h2 className="text-base font-semibold text-white">Trade History Table</h2>
        <p className="mt-1 text-xs text-slate-400">Search, filter, select, paginate, and export professional journal records.</p>
      </div>
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[150px_150px_160px_1fr]">
          <select className={inputClass} value={resultFilter} onChange={(event) => setResultFilter(event.target.value as "all" | TradeResult)}>
            <option value="all">All Trades</option>
            {RESULT_OPTIONS.map((result) => <option key={result} value={result}>{resultLabel(result)}</option>)}
          </select>
          <select className={inputClass} value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value as "all" | TradeDirection)}>
            <option value="all">All Direction</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
          <select className={inputClass} value={setupFilter} onChange={(event) => setSetupFilter(event.target.value)}>
            <option value="all">All Setups</option>
            {setups.map((setup) => <option key={setup} value={setup}>{setup}</option>)}
          </select>
          <label className="relative block min-w-[260px]">
            <Search className="absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input className={cn(inputClass, "pl-10")} placeholder="Search trades..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className="flex gap-2">
          <button type="button" className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10">
            <Filter size={15} aria-hidden="true" />
            Filters
          </button>
          <a
            className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200 transition hover:border-violet-300/30 hover:bg-violet-400/10"
            download="xauusd-trade-journal.csv"
            href={exportCsv(filtered)}
          >
            <Download size={15} aria-hidden="true" />
            Export
          </a>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="border-b border-white/10 text-[11px] uppercase text-slate-400">
            <tr>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Symbol</th>
              <th className="px-5 py-3 font-semibold">Direction</th>
              <th className="px-5 py-3 font-semibold">RR</th>
              <th className="px-5 py-3 font-semibold">Result</th>
              <th className="px-5 py-3 font-semibold">Emotion</th>
              <th className="px-5 py-3 font-semibold">Session</th>
              <th className="px-5 py-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {paged.map((entry) => {
              const isSelected = selectedId === entry.id;
              return (
                <tr
                  key={entry.id}
                  className={cn(
                    "cursor-pointer transition hover:bg-white/[0.045]",
                    isSelected && "bg-blue-500/10 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.45)]"
                  )}
                  onClick={() => onSelect(entry.id)}
                >
                  <td className="px-5 py-4 text-slate-300">{formatDateTime(entry.tradeDate)}</td>
                  <td className="px-5 py-4 font-semibold text-white">{entry.symbol}</td>
                  <td className="px-5 py-4"><DirectionText direction={entry.direction} /></td>
                  <td className={cn("px-5 py-4 font-semibold", entry.rrAchieved >= 0 ? "text-emerald-300" : "text-rose-300")}>{entry.rrAchieved.toFixed(2)}</td>
                  <td className="px-5 py-4"><ResultPill result={entry.result} /></td>
                  <td className="px-5 py-4 text-slate-300">{entry.emotion}</td>
                  <td className="px-5 py-4 text-slate-300">{entry.session}</td>
                  <td className="max-w-[280px] truncate px-5 py-4 text-slate-400">{stripHtml(entry.lessons || entry.mistakes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col justify-between gap-3 border-t border-white/10 p-4 text-sm text-slate-400 md:flex-row md:items-center">
        <p>Showing {filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} to {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} journal entries</p>
        <div className="flex items-center gap-2">
          <button type="button" className="icon-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1} aria-label="Previous page">
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          {Array.from({ length: Math.min(4, pageCount) }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                key={pageNumber}
                type="button"
                className={cn("h-9 w-9 rounded-lg border text-sm font-semibold transition", safePage === pageNumber ? "border-violet-300/50 bg-violet-500 text-white" : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.06]")}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            );
          })}
          <button type="button" className="icon-button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={safePage === pageCount} aria-label="Next page">
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

export function JournalClient() {
  const [entries, setEntries] = useJournalEntries();
  const [draft, setDraft] = useState<DraftEntry>(() => createDefaultDraft());
  const [selectedId, setSelectedId] = useState<string>(INITIAL_ENTRIES[0].id);
  const [importMessage, setImportMessage] = useState("");
  const formRef = useRef<HTMLElement>(null);

  const sortedEntries = useMemo(
    () => [...entries].sort((first, second) => new Date(second.tradeDate).getTime() - new Date(first.tradeDate).getTime()),
    [entries]
  );
  const selectedEntry = sortedEntries.find((entry) => entry.id === selectedId) ?? sortedEntries[0];
  const stats = useMemo(() => getStats(entries), [entries]);
  const equity = useMemo(() => equityCurve(entries), [entries]);
  const sessionStats = useMemo(() => performanceBy(entries, SESSIONS, (entry) => entry.session), [entries]);
  const timeframeStats = useMemo(() => performanceBy(entries, TIMEFRAMES, (entry) => entry.timeframe), [entries]);
  const emotionDistribution = useMemo(() => distributionByEmotion(entries), [entries]);
  const bestTrade = useMemo(() => [...entries].sort((first, second) => second.rrAchieved - first.rrAchieved)[0], [entries]);
  const worstTrade = useMemo(() => [...entries].sort((first, second) => first.rrAchieved - second.rrAchieved)[0], [entries]);
  const bestSession = useMemo(() => [...sessionStats].sort((first, second) => second.winRate - first.winRate || second.averageR - first.averageR)[0], [sessionStats]);
  const bestTimeframe = useMemo(() => [...timeframeStats].sort((first, second) => second.winRate - first.winRate || second.averageR - first.averageR)[0], [timeframeStats]);
  const mostCommonMistake = useMemo(() => {
    const pressure = entries.filter((entry) => ["FOMO", "Greed", "Revenge Trading", "Overconfident"].includes(entry.emotion)).length;
    return pressure >= 3 ? "Emotional entries after momentum spikes" : "Late target management after TP1";
  }, [entries]);
  const monthlyR = useMemo(() => {
    const grouped = entries.reduce<Record<string, number>>((groups, entry) => {
      const label = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(entry.tradeDate));
      groups[label] = (groups[label] ?? 0) + entry.rrAchieved;
      return groups;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }));
  }, [entries]);
  const rrDistribution = useMemo(() => [
    { label: "< -1R", value: entries.filter((entry) => entry.rrAchieved < -1).length },
    { label: "-1R", value: entries.filter((entry) => entry.rrAchieved <= -0.5 && entry.rrAchieved >= -1).length },
    { label: "0R", value: entries.filter((entry) => entry.rrAchieved === 0).length },
    { label: "0-1R", value: entries.filter((entry) => entry.rrAchieved > 0 && entry.rrAchieved < 1).length },
    { label: "1-2R", value: entries.filter((entry) => entry.rrAchieved >= 1 && entry.rrAchieved < 2).length },
    { label: "2R+", value: entries.filter((entry) => entry.rrAchieved >= 2).length }
  ], [entries]);
  const tradeFrequency = useMemo(() => {
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return weekdays.map((label, index) => {
      const day = index === 6 ? 0 : index + 1;
      return { label, value: entries.filter((entry) => new Date(entry.tradeDate).getDay() === day).length };
    });
  }, [entries]);

  const updateDraft = useCallback(<K extends keyof DraftEntry>(key: K, value: DraftEntry[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const updateNote = useCallback((key: "whyEntered" | "whyExited" | "mistakes" | "lessons" | "improvements", value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const handleScreenshotUpload = useCallback((slot: ScreenshotSlot, dataUrl: string) => {
    setDraft((current) => ({
      ...current,
      screenshots: {
        ...current.screenshots,
        [slot]: dataUrl
      }
    }));
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const date = draft.tradeDate.includes("T") ? draft.tradeDate : `${draft.tradeDate}T10:30:00.000Z`;
    const nextEntry: JournalEntry = {
      ...draft,
      id: `journal-${Date.now()}`,
      tradeDate: new Date(date).toISOString()
    };

    setEntries((current) => [nextEntry, ...current]);
    setSelectedId(nextEntry.id);
    setDraft(createDefaultDraft());
    void syncJournalEntry(nextEntry);
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as JournalEntry[];
        if (!Array.isArray(parsed)) {
          throw new Error("Invalid journal file.");
        }
        setEntries(parsed);
        setSelectedId(parsed[0]?.id ?? "");
        setImportMessage(`Imported ${parsed.length} entries`);
        void Promise.all(parsed.map((entry) => syncJournalEntry(entry)));
      } catch {
        setImportMessage("Import failed. Use a journal JSON export.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 overflow-x-hidden">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-white">Trade Journal</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            Track, review, and analyze every XAUUSD trade to improve discipline and execution.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200">
            <CalendarDays size={15} className="text-cyan-300" aria-hidden="true" />
            Jun 1, 2026 - Jun 19, 2026
          </span>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10">
            <Upload size={15} aria-hidden="true" />
            Import
            <input className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} />
          </label>
          <a
            className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200 transition hover:border-violet-300/30 hover:bg-violet-400/10"
            download="xauusd-trade-journal.csv"
            href={exportCsv(entries)}
          >
            <Download size={15} aria-hidden="true" />
            Export
          </a>
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg border border-violet-300/30 bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-xs font-semibold text-white shadow-[0_16px_40px_rgba(124,92,255,0.25)] transition hover:translate-y-[-1px]"
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <Plus size={15} aria-hidden="true" />
            Add Trade
          </button>
        </div>
      </section>
      {importMessage ? (
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100">
          {importMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard badge="Live" helper="Total Journal Entries" icon={ClipboardList} sparkValues={equity.slice(-8)} tone="violet" trend="+ entries tracked" value={String(stats.total)} />
        <KpiCard badge="Edge" helper="Win Rate" icon={ShieldCheck} sparkValues={winRateTrend(entries)} tone="blue" trend="+2.31%" value={`${stats.winRate.toFixed(1)}%`} />
        <KpiCard badge="Avg" helper="Average RR" icon={Target} sparkValues={entries.map((entry) => entry.rrAchieved)} tone="gold" trend={formatR(stats.averageR)} value={stats.averageR.toFixed(2)} />
        <KpiCard badge={grade(stats.disciplineScore)} helper="Discipline Score" icon={Gauge} sparkValues={[stats.riskScore, stats.emotionalScore, stats.entryScore, stats.exitScore, stats.disciplineScore]} tone="cyan" trend="+6 pts" value={`${Math.round(stats.disciplineScore)}/100`} />
        <KpiCard badge="Best" helper="Best Trade" icon={Trophy} sparkValues={[0, bestTrade?.rrAchieved ?? 0, stats.averageR, stats.totalR]} tone="green" trend={bestTrade?.setup ?? "No trade"} value={bestTrade ? formatMoney(profitForEntry(bestTrade)) : "$0"} />
        <KpiCard badge="Risk" helper="Worst Trade" icon={TrendingDown} sparkValues={[0, worstTrade?.rrAchieved ?? 0, stats.averageR, stats.totalR]} tone="red" trend={worstTrade?.setup ?? "No trade"} value={worstTrade ? formatMoney(profitForEntry(worstTrade)) : "$0"} />
      </section>

      <section ref={formRef} className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
        <section className="premium-panel rounded-xl p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <h2 className="text-base font-semibold text-white">Trade Journal Command Center</h2>
              <p className="mt-1 text-xs text-slate-400">Create a structured record with execution data, notes, screenshots, and emotion tags.</p>
            </div>
            <span className="rounded-full border border-gold-400/25 bg-gold-400/10 px-3 py-1 text-xs font-semibold text-gold-300">
              Prop review format
            </span>
          </div>
          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FormField label="Trade Date">
                <input className={inputClass} type="date" value={draft.tradeDate.slice(0, 10)} onChange={(event) => updateDraft("tradeDate", event.target.value)} />
              </FormField>
              <FormField label="Symbol">
                <input className={inputClass} value={draft.symbol} onChange={(event) => updateDraft("symbol", event.target.value.toUpperCase())} />
              </FormField>
              <FormField label="Direction">
                <select className={inputClass} value={draft.direction} onChange={(event) => updateDraft("direction", event.target.value as TradeDirection)}>
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
              </FormField>
              <FormField label="Session">
                <select className={inputClass} value={draft.session} onChange={(event) => updateDraft("session", event.target.value as JournalSession)}>
                  {SESSIONS.map((session) => <option key={session} value={session}>{session}</option>)}
                </select>
              </FormField>
              <FormField label="Timeframe">
                <select className={inputClass} value={draft.timeframe} onChange={(event) => updateDraft("timeframe", event.target.value as JournalTimeframe)}>
                  {TIMEFRAMES.map((timeframe) => <option key={timeframe} value={timeframe}>{TIMEFRAME_LABELS[timeframe]}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FormField label="Entry Price">
                <input className={inputClass} type="number" step="0.01" value={draft.entryPrice} onChange={(event) => updateDraft("entryPrice", Number(event.target.value))} />
              </FormField>
              <FormField label="Stop Loss">
                <input className={inputClass} type="number" step="0.01" value={draft.stopLoss} onChange={(event) => updateDraft("stopLoss", Number(event.target.value))} />
              </FormField>
              <FormField label="Take Profit">
                <input className={inputClass} type="number" step="0.01" value={draft.takeProfit} onChange={(event) => updateDraft("takeProfit", Number(event.target.value))} />
              </FormField>
              <FormField label="Result">
                <select className={inputClass} value={draft.result} onChange={(event) => updateDraft("result", event.target.value as TradeResult)}>
                  {RESULT_OPTIONS.map((result) => <option key={result} value={result}>{resultLabel(result)}</option>)}
                </select>
              </FormField>
              <FormField label="RR Achieved">
                <input className={inputClass} type="number" step="0.01" value={draft.rrAchieved} onChange={(event) => updateDraft("rrAchieved", Number(event.target.value))} />
              </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <FormField label="Setup">
                <input className={inputClass} value={draft.setup} onChange={(event) => updateDraft("setup", event.target.value)} placeholder="EMA Pullback, Breakout, Trend Pullback" />
              </FormField>
              <FormField label="Emotion">
                <select className={inputClass} value={draft.emotion} onChange={(event) => updateDraft("emotion", event.target.value as Emotion)}>
                  {EMOTIONS.map((emotion) => <option key={emotion} value={emotion}>{emotion}</option>)}
                </select>
              </FormField>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs text-slate-400">
                Estimated trade impact: <span className={draft.rrAchieved >= 0 ? "font-bold text-emerald-300" : "font-bold text-rose-300"}>{formatMoney(profitForEntry(draft))}</span>
              </p>
              <button type="submit" className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 text-xs font-bold text-ink-950 transition hover:translate-y-[-1px]">
                <Plus size={15} aria-hidden="true" />
                Save Journal Entry
              </button>
            </div>
          </form>
        </section>

        <AiTradeReview entry={{ ...draft, id: "draft" }} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Trade Notes Section</h2>
              <p className="mt-1 text-xs text-slate-400">Rich text review fields for execution, mistakes, lessons, and future improvement.</p>
            </div>
            <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">Rich editor</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <RichTextEditor icon={TrendingUp} label="Why I Entered" onChange={(value) => updateNote("whyEntered", value)} tone="green" value={draft.whyEntered} />
            <RichTextEditor icon={Target} label="Why I Exited" onChange={(value) => updateNote("whyExited", value)} tone="blue" value={draft.whyExited} />
            <RichTextEditor icon={AlertTriangle} label="Mistakes Made" onChange={(value) => updateNote("mistakes", value)} tone="red" value={draft.mistakes} />
            <RichTextEditor icon={BookOpen} label="Lessons Learned" onChange={(value) => updateNote("lessons", value)} tone="gold" value={draft.lessons} />
            <div className="lg:col-span-2">
              <RichTextEditor icon={Sparkles} label="Future Improvements" onChange={(value) => updateNote("improvements", value)} tone="blue" value={draft.improvements} />
            </div>
          </div>
        </section>
        <EmotionTracker selected={draft.emotion} setSelected={(emotion) => updateDraft("emotion", emotion)} summary={emotionDistribution} />
      </section>

      <ScreenshotManager screenshots={draft.screenshots} onUpload={handleScreenshotUpload} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <TradeHistoryTable entries={sortedEntries} onSelect={setSelectedId} selectedId={selectedEntry?.id ?? null} />
        <DisciplineScorePanel stats={stats} />
      </section>

      {selectedEntry ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
          <SelectedTradeDetail entry={selectedEntry} />
          <section className="space-y-4">
            <AiTradeReview entry={selectedEntry} />
            <section className="premium-panel rounded-xl p-5">
              <h2 className="text-base font-semibold uppercase text-white">Performance Impact</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="glass-tile rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400">This Trade</p>
                  <p className={cn("mt-2 text-lg font-bold", selectedEntry.rrAchieved >= 0 ? "text-emerald-300" : "text-rose-300")}>{formatMoney(profitForEntry(selectedEntry))}</p>
                </div>
                <div className="glass-tile rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400">Account Impact</p>
                  <p className={cn("mt-2 text-lg font-bold", selectedEntry.rrAchieved >= 0 ? "text-emerald-300" : "text-rose-300")}>{selectedEntry.rrAchieved >= 0 ? "+" : ""}{(selectedEntry.rrAchieved * 0.65).toFixed(2)}%</p>
                </div>
                <div className="glass-tile rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400">Quality Grade</p>
                  <p className="mt-2 text-lg font-bold text-cyan-300">{grade(qualityScores(selectedEntry).overall * 10)}</p>
                </div>
              </div>
              <LineAreaChart color="#7c5cff" values={equity} />
            </section>
          </section>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <section className="premium-panel rounded-xl p-4 xl:col-span-2">
          <h2 className="text-base font-semibold uppercase text-white">Win Rate Trend</h2>
          <LineAreaChart color="#34d399" values={winRateTrend(entries)} />
        </section>
        <section className="premium-panel rounded-xl p-4">
          <h2 className="text-base font-semibold uppercase text-white">Emotion Distribution</h2>
          <div className="mt-5">
            <DonutChart center={String(entries.length)} label="Entries" segments={emotionDistribution.length ? emotionDistribution : [{ color: "#64748b", label: "No Data", value: 1 }]} />
          </div>
        </section>
        <section className="premium-panel rounded-xl p-4">
          <h2 className="text-base font-semibold uppercase text-white">RR Distribution</h2>
          <VerticalBars data={rrDistribution} />
        </section>
        <section className="premium-panel rounded-xl p-4">
          <h2 className="text-base font-semibold uppercase text-white">Trade Frequency</h2>
          <VerticalBars data={tradeFrequency} />
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold uppercase text-white">Session Performance</h2>
          <div className="mt-5">
            <HorizontalBars rows={sessionStats.map((row) => ({ label: row.label.replace("London + NY", "Ldn + NY"), value: row.winRate }))} tone="green" />
          </div>
          <div className="mt-5 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-white/10 text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-3">Session</th>
                  <th className="px-3 py-3">Win Rate</th>
                  <th className="px-3 py-3">Profit Factor</th>
                  <th className="px-3 py-3">Avg RR</th>
                  <th className="px-3 py-3">Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sessionStats.map((row) => (
                  <tr key={row.label} className={row.label === bestSession?.label ? "bg-emerald-400/[0.045]" : undefined}>
                    <td className="px-3 py-3 font-semibold text-white">{row.label}</td>
                    <td className="px-3 py-3 text-emerald-300">{row.winRate.toFixed(1)}%</td>
                    <td className="px-3 py-3 text-cyan-200">{row.profitFactor.toFixed(2)}</td>
                    <td className={cn("px-3 py-3", row.averageR >= 0 ? "text-emerald-300" : "text-rose-300")}>{formatR(row.averageR)}</td>
                    <td className="px-3 py-3 text-slate-300">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold uppercase text-white">Timeframe Performance</h2>
          <div className="mt-5">
            <HorizontalBars rows={timeframeStats.map((row) => ({ label: TIMEFRAME_LABELS[row.label as JournalTimeframe] ?? row.label, value: row.winRate }))} tone="blue" />
          </div>
          <div className="mt-5 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-white/10 text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-3">Timeframe</th>
                  <th className="px-3 py-3">Win Rate</th>
                  <th className="px-3 py-3">Profit Factor</th>
                  <th className="px-3 py-3">Avg RR</th>
                  <th className="px-3 py-3">Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {timeframeStats.map((row) => (
                  <tr key={row.label} className={row.label === bestTimeframe?.label ? "bg-cyan-400/[0.045]" : undefined}>
                    <td className="px-3 py-3 font-semibold text-white">{TIMEFRAME_LABELS[row.label as JournalTimeframe] ?? row.label}</td>
                    <td className="px-3 py-3 text-emerald-300">{row.winRate.toFixed(1)}%</td>
                    <td className="px-3 py-3 text-cyan-200">{row.profitFactor.toFixed(2)}</td>
                    <td className={cn("px-3 py-3", row.averageR >= 0 ? "text-emerald-300" : "text-rose-300")}>{formatR(row.averageR)}</td>
                    <td className="px-3 py-3 text-slate-300">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="premium-panel rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-violet-300" aria-hidden="true" />
          <h2 className="text-base font-semibold uppercase text-white">Bottom Insights</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Best Trade Ever", bestTrade ? `${bestTrade.setup} ${formatR(bestTrade.rrAchieved)}` : "--", Trophy, "text-emerald-300"],
            ["Worst Trade Ever", worstTrade ? `${worstTrade.setup} ${formatR(worstTrade.rrAchieved)}` : "--", XCircle, "text-rose-300"],
            ["Most Common Mistake", mostCommonMistake, AlertTriangle, "text-gold-300"],
            ["Most Profitable Session", bestSession?.label ?? "--", Activity, "text-cyan-300"],
            ["Best Timeframe", bestTimeframe ? TIMEFRAME_LABELS[bestTimeframe.label as JournalTimeframe] ?? bestTimeframe.label : "--", BarChart3, "text-violet-300"]
          ].map(([label, value, Icon, tone]) => (
            <div key={label as string} className="glass-tile rounded-xl p-4">
              <Icon size={18} className={tone as string} aria-hidden="true" />
              <p className="mt-3 text-xs font-semibold uppercase text-slate-400">{label as string}</p>
              <p className="mt-2 text-sm font-bold text-white">{value as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-panel flex flex-col gap-3 rounded-xl p-4 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2">
          <FileText size={15} className="text-cyan-300" aria-hidden="true" />
          Journal data is stored locally in this browser with safe fallback sample entries.
        </p>
        <p className="flex items-center gap-2">
          <LineChart size={15} className="text-violet-300" aria-hidden="true" />
          Monthly R: {monthlyR.map((item) => `${item.label} ${formatR(item.value)}`).join(" / ")}
        </p>
      </section>
    </div>
  );
}
