"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  Globe2,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Star,
  TimerReset,
  TrendingUp,
  XCircle,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TradingSession {
  id: string;
  name: string;
  region: string;
  openUtcMinutes: number;
  closeUtcMinutes: number;
  volatility: string;
  goldFocus: string;
  bestUse: string;
  overlap: string;
}

interface SessionProfile {
  short: string;
  cityTimeZone: string;
  winRate: number;
  profitFactor: number;
  averageRr: number;
  totalTrades: number;
  liquidityScore: number;
  volatilityScore: number;
  trendQuality: number;
  aiScore: number;
  quality: "Weak" | "Average" | "Strong" | "Excellent";
  accent: string;
}

const sessions: TradingSession[] = [
  {
    id: "sydney",
    name: "Sydney",
    region: "Australia",
    openUtcMinutes: 22 * 60,
    closeUtcMinutes: 7 * 60,
    volatility: "Low to medium",
    goldFocus: "Early liquidity, AUD moves, weekend gap digestion",
    bestUse: "Watch structure form before Asia momentum builds.",
    overlap: "Overlaps Tokyo during the Asian morning."
  },
  {
    id: "tokyo",
    name: "Tokyo",
    region: "Asia",
    openUtcMinutes: 0,
    closeUtcMinutes: 9 * 60,
    volatility: "Medium",
    goldFocus: "JPY flows, China headlines, Asian risk sentiment",
    bestUse: "Good for range levels, support rejections, and early breakouts.",
    overlap: "Overlaps Sydney first, then London near the close."
  },
  {
    id: "london",
    name: "London",
    region: "Europe",
    openUtcMinutes: 7 * 60,
    closeUtcMinutes: 16 * 60,
    volatility: "High",
    goldFocus: "Liquidity expansion, USD positioning, European data",
    bestUse: "Best for breakout confirmation and trend continuation.",
    overlap: "Overlaps New York from 12:00 to 16:00 UTC."
  },
  {
    id: "new-york",
    name: "New York",
    region: "United States",
    openUtcMinutes: 12 * 60,
    closeUtcMinutes: 21 * 60,
    volatility: "High",
    goldFocus: "US data, Fed headlines, bond yields, USD strength",
    bestUse: "Best for XAUUSD impulse moves and news-driven volatility.",
    overlap: "Overlaps London during the most active XAUUSD window."
  }
];

const sessionProfiles: Record<string, SessionProfile> = {
  sydney: {
    short: "SY",
    cityTimeZone: "Australia/Sydney",
    winRate: 48,
    profitFactor: 1.45,
    averageRr: 1.28,
    totalTrades: 152,
    liquidityScore: 52,
    volatilityScore: 42,
    trendQuality: 54,
    aiScore: 52,
    quality: "Weak",
    accent: "#3b82f6"
  },
  tokyo: {
    short: "TK",
    cityTimeZone: "Asia/Tokyo",
    winRate: 57,
    profitFactor: 1.82,
    averageRr: 1.42,
    totalTrades: 186,
    liquidityScore: 61,
    volatilityScore: 58,
    trendQuality: 64,
    aiScore: 61,
    quality: "Average",
    accent: "#2563eb"
  },
  london: {
    short: "LD",
    cityTimeZone: "Europe/London",
    winRate: 71,
    profitFactor: 2.65,
    averageRr: 1.86,
    totalTrades: 312,
    liquidityScore: 78,
    volatilityScore: 82,
    trendQuality: 80,
    aiScore: 78,
    quality: "Strong",
    accent: "#7c5cff"
  },
  "new-york": {
    short: "NY",
    cityTimeZone: "America/New_York",
    winRate: 76,
    profitFactor: 3.12,
    averageRr: 2.05,
    totalTrades: 364,
    liquidityScore: 92,
    volatilityScore: 85,
    trendQuality: 88,
    aiScore: 89,
    quality: "Strong",
    accent: "#22d3ee"
  }
};

const overlapProfile = {
  name: "London + New York Overlap",
  range: "12:00 - 16:00 UTC",
  winRate: 84,
  profitFactor: 3.85,
  averageRr: 2.48,
  totalTrades: 298,
  liquidityScore: 92,
  volatilityScore: 85,
  trendQuality: 88,
  aiScore: 92,
  quality: "Excellent" as const,
  accent: "#22c55e"
};

function getUtcMinutes(date: Date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function isSessionOpen(session: TradingSession, utcMinutes: number) {
  if (session.openUtcMinutes < session.closeUtcMinutes) {
    return utcMinutes >= session.openUtcMinutes && utcMinutes < session.closeUtcMinutes;
  }

  return utcMinutes >= session.openUtcMinutes || utcMinutes < session.closeUtcMinutes;
}

function minutesUntil(targetMinutes: number, utcMinutes: number) {
  return targetMinutes >= utcMinutes ? targetMinutes - utcMinutes : 1440 - utcMinutes + targetMinutes;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${remainingMinutes.toString().padStart(2, "0")}m`;
}

function utcDateForMinutes(baseDate: Date, minutes: number, dayOffset = 0) {
  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate() + dayOffset,
      Math.floor(minutes / 60),
      minutes % 60
    )
  );
}

function formatLocalRange(session: TradingSession, now: Date) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
  const closeDayOffset = session.closeUtcMinutes <= session.openUtcMinutes ? 1 : 0;
  const openDate = utcDateForMinutes(now, session.openUtcMinutes);
  const closeDate = utcDateForMinutes(now, session.closeUtcMinutes, closeDayOffset);

  return `${formatter.format(openDate)} - ${formatter.format(closeDate)}`;
}

function formatUtcRange(session: TradingSession) {
  const format = (minutes: number) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
    const mins = (minutes % 60).toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  return `${format(session.openUtcMinutes)} - ${format(session.closeUtcMinutes)}`;
}

function timelinePercent(minutes: number) {
  return (minutes / 1440) * 100;
}

function formatSessionClock(timeZone: string, now: Date | null) {
  if (!now) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(now);
}

function qualityTone(quality: SessionProfile["quality"]) {
  if (quality === "Excellent") {
    return "text-emerald-300";
  }
  if (quality === "Strong") {
    return "text-green-300";
  }
  if (quality === "Average") {
    return "text-gold-300";
  }
  return "text-rose-300";
}

function volatilityLabel(score: number) {
  if (score >= 75) {
    return "High";
  }
  if (score >= 55) {
    return "Medium";
  }
  return "Low";
}

function Sparkline({ tone = "#22d3ee" }: { tone?: string }) {
  const points = "2,38 16,35 28,24 40,31 52,20 64,25 76,18 88,22 100,14 114,17 128,8";

  return (
    <svg className="h-14 w-36" viewBox="0 0 132 46" fill="none" aria-hidden="true">
      <polyline points={points} stroke={tone} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`2,44 ${points} 128,44`} fill={tone} opacity="0.14" />
    </svg>
  );
}

function DonutScore({ value, color = "#22d3ee", size = "lg" }: { value: number; color?: string; size?: "md" | "lg" }) {
  const dimensions = size === "lg" ? "h-24 w-24" : "h-20 w-20";

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full p-1.5", dimensions)}
      style={{
        background: `conic-gradient(${color} ${value * 3.6}deg, rgba(148, 163, 184, 0.14) 0deg)`,
        boxShadow: `0 0 34px ${color}22`
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#06111f] shadow-[inset_0_0_24px_rgba(0,0,0,0.5)]">
        <span className="text-2xl font-semibold leading-none text-white">{value}</span>
        <span className="mt-1 text-xs text-slate-400">/100</span>
      </div>
    </div>
  );
}

function MeterGauge({ value }: { value: number }) {
  const angle = -130 + value * 2.6;

  return (
    <div className="relative h-36 w-36">
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_225deg,#ef4444_0deg,#f59e0b_82deg,#22c55e_180deg,transparent_181deg)] opacity-95" />
      <div className="absolute inset-5 rounded-full bg-[#06111f]" />
      <div className="absolute inset-x-0 bottom-3 text-center">
        <p className="text-lg font-semibold text-emerald-300">Strong</p>
        <p className="text-xs text-slate-400">Market Condition</p>
      </div>
      <div
        className="absolute left-1/2 top-1/2 h-1 w-14 origin-left rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.5)]"
        style={{ transform: `rotate(${angle}deg)` }}
      />
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-slate-900" />
    </div>
  );
}

function StatCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
  children
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof Activity;
  tone: "green" | "red" | "blue" | "gold";
  children?: React.ReactNode;
}) {
  const toneMap = {
    green: "text-emerald-300 from-emerald-400/20",
    red: "text-red-300 from-red-400/20",
    blue: "text-cyan-300 from-cyan-400/20",
    gold: "text-gold-400 from-gold-400/20"
  };
  const toneClass = toneMap[tone];

  return (
    <section className="premium-panel interactive-lift min-h-[148px] overflow-hidden rounded-xl p-5">
      <div className={cn("absolute right-0 top-0 h-28 w-36 bg-gradient-to-bl to-transparent blur-xl", toneClass)} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">{title}</p>
          <p className={cn("mt-3 text-3xl font-bold leading-none", toneClass.split(" ")[0])}>{value}</p>
          <p className="mt-5 text-sm text-slate-400">{helper}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon size={18} className={toneClass.split(" ")[0]} aria-hidden="true" />
        </span>
      </div>
      {children ? <div className="relative mt-2 flex justify-end">{children}</div> : null}
    </section>
  );
}

function BarChartPanel({
  title,
  metric,
  suffix = "",
  decimals = 0
}: {
  title: string;
  metric: keyof Pick<SessionProfile, "winRate" | "profitFactor" | "averageRr" | "totalTrades">;
  suffix?: string;
  decimals?: number;
}) {
  const data = [
    ...sessions.map((session) => ({
      label: session.name,
      value: sessionProfiles[session.id][metric],
      color: sessionProfiles[session.id].accent
    })),
    {
      label: "Ldn + NY",
      value: overlapProfile[metric],
      color: "#22c55e"
    }
  ];
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <section className="premium-panel rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-5 flex h-36 items-end gap-3 border-b border-white/10 px-1">
        {data.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-xs font-semibold text-white">
              {item.value.toFixed(decimals)}
              {suffix}
            </span>
            <div
              className="w-full max-w-9 rounded-t-md shadow-[0_0_18px_rgba(34,211,238,0.18)]"
              style={{
                height: `${Math.max(14, (item.value / max) * 104)}px`,
                background: `linear-gradient(180deg, ${item.color}, rgba(59, 130, 246, 0.22))`
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px] text-slate-500">
        {data.map((item) => (
          <span key={item.label} className="truncate">
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function SessionProgress({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-white">{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function SessionBadge({ session, isOpen }: { session: TradingSession; isOpen: boolean }) {
  const profile = sessionProfiles[session.id];
  const segments =
    session.openUtcMinutes < session.closeUtcMinutes
      ? [{ left: timelinePercent(session.openUtcMinutes), width: timelinePercent(session.closeUtcMinutes - session.openUtcMinutes) }]
      : [
          { left: timelinePercent(session.openUtcMinutes), width: timelinePercent(1440 - session.openUtcMinutes) },
          { left: 0, width: timelinePercent(session.closeUtcMinutes) }
        ];

  return (
    <article
      className={cn(
        "glass-tile rounded-xl p-4",
        isOpen && "border-emerald-400/45 bg-emerald-400/10 shadow-[0_0_30px_rgba(34,197,94,0.12)]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: profile.accent }}
          >
            {profile.short}
          </span>
          <h3 className="font-semibold text-white">{session.name}</h3>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-1 text-[10px] font-bold uppercase",
            isOpen ? "bg-emerald-400/16 text-emerald-300" : "bg-slate-400/10 text-slate-400"
          )}
        >
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-300">{formatUtcRange(session)}</p>
      <div className="relative mt-4 h-2 rounded-full bg-white/[0.08]">
        {segments.map((segment, index) => (
          <span
            key={`${session.id}-${index}`}
            className="absolute top-0 h-full rounded-full"
            style={{ left: `${segment.left}%`, width: `${segment.width}%`, background: profile.accent }}
          />
        ))}
        <span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-300 bg-slate-500" style={{ left: "50%" }} />
      </div>
    </article>
  );
}

export function SessionsClient() {
  const [now, setNow] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const id = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(id);
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    setNow(new Date());
    window.setTimeout(() => setRefreshing(false), 700);
  }

  const utcMinutes = now ? getUtcMinutes(now) : null;
  const activeSessions = useMemo(() => {
    if (utcMinutes === null) {
      return [];
    }

    return sessions.filter((session) => isSessionOpen(session, utcMinutes));
  }, [utcMinutes]);

  const primaryActiveSession =
    activeSessions.find((session) => session.id === "new-york") ??
    activeSessions.find((session) => session.id === "london") ??
    activeSessions[0] ??
    sessions[3];
  const primaryProfile = sessionProfiles[primaryActiveSession.id];
  const boundaryMinutes =
    utcMinutes === null
      ? null
      : minutesUntil(
          isSessionOpen(primaryActiveSession, utcMinutes)
            ? primaryActiveSession.closeUtcMinutes
            : primaryActiveSession.openUtcMinutes,
          utcMinutes
        );
  const currentVolatility = volatilityLabel(primaryProfile.volatilityScore);
  const dateLabel = now
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(now)
    : "--";

  return (
    <div className="space-y-4">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-white">Session Overview</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            Real-time market sessions, performance analytics and AI-powered session insights for XAUUSD.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200">
            <CalendarDays size={15} className="text-cyan-300" aria-hidden="true" />
            {dateLabel}
          </span>
          <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200">
            <Globe2 size={15} className="text-cyan-300" aria-hidden="true" />
            UTC +00:00
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
          >
            <RefreshCw size={15} className={cn("text-cyan-300", refreshing && "animate-spin")} aria-hidden="true" />
            Auto Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          title="Active Session"
          value={primaryActiveSession.name}
          helper={boundaryMinutes === null ? "Syncing session clock" : `Closes in ${formatDuration(boundaryMinutes)}`}
          icon={RadioTower}
          tone="green"
        >
          <Sparkline tone="#22c55e" />
        </StatCard>
        <StatCard
          title="Current Volatility"
          value={currentVolatility}
          helper={`ATR (14) ${primaryProfile.volatilityScore >= 75 ? "28.45" : "18.60"}`}
          icon={AlertTriangle}
          tone={currentVolatility === "High" ? "red" : "gold"}
        >
          <Sparkline tone={currentVolatility === "High" ? "#ef4444" : "#f8c14a"} />
        </StatCard>
        <section className="premium-panel interactive-lift flex min-h-[148px] items-center justify-between gap-4 rounded-xl p-5">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Liquidity Score</p>
            <DonutScore value={primaryProfile.liquidityScore} color="#0ea5e9" />
          </div>
          <Sparkline tone="#0ea5e9" />
        </section>
        <StatCard
          title="AI Session Score"
          value="A+"
          helper={`${primaryProfile.aiScore}/100`}
          icon={Gauge}
          tone="green"
        >
          <Sparkline tone="#22c55e" />
        </StatCard>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <section className="premium-panel rounded-xl p-4">
            <h2 className="text-base font-semibold text-white">Global Market Sessions</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-4">
              {sessions.map((session) => (
                <SessionBadge
                  key={session.id}
                  session={session}
                  isOpen={utcMinutes !== null && isSessionOpen(session, utcMinutes)}
                />
              ))}
            </div>
            <div className="relative mt-5 h-10 rounded-full bg-white/[0.06]">
              <span className="absolute left-[33.33%] top-0 h-full w-[16.67%] rounded-full bg-sky-500/80" />
              <span className="absolute left-[50%] top-0 h-full w-[16.67%] rounded-full bg-violet-500/80" />
              <span className="absolute left-[50%] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_24px_rgba(34,197,94,0.75)]" />
              <span className="absolute left-[66.67%] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_24px_rgba(34,197,94,0.75)]" />
            </div>
            <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
              <p className="text-sky-300">Tokyo/London Overlap: 07:00 - 09:00 UTC</p>
              <p className="text-violet-300">London/New York Overlap: 12:00 - 16:00 UTC</p>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <BarChartPanel title="Win Rate by Session" metric="winRate" suffix="%" />
            <BarChartPanel title="Profit Factor by Session" metric="profitFactor" decimals={2} />
            <BarChartPanel title="Average RR by Session" metric="averageRr" decimals={2} />
            <BarChartPanel title="Total Trades by Session" metric="totalTrades" />
          </div>

          <section className="premium-panel overflow-hidden rounded-xl p-4">
            <h2 className="text-base font-semibold text-white">Session Performance Heatmap</h2>
            <div className="mt-4 overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Session</th>
                    <th className="px-3 py-3 font-semibold">Win Rate</th>
                    <th className="px-3 py-3 font-semibold">Profit Factor</th>
                    <th className="px-3 py-3 font-semibold">Avg RR</th>
                    <th className="px-3 py-3 font-semibold">AI Score</th>
                    <th className="px-3 py-3 font-semibold">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {[
                    ...sessions.map((session) => ({ name: session.name, ...sessionProfiles[session.id] })),
                    { ...overlapProfile, short: "OL", cityTimeZone: "UTC" }
                  ].map((row) => (
                    <tr key={row.name}>
                      <td className="px-3 py-3 font-semibold text-white">{row.name}</td>
                      <td className="bg-rose-500/15 px-3 py-3 text-white">{row.winRate}%</td>
                      <td className="bg-gold-400/15 px-3 py-3 text-white">{row.profitFactor.toFixed(2)}</td>
                      <td className="bg-cyan-300/12 px-3 py-3 text-white">{row.averageRr.toFixed(2)}</td>
                      <td className="bg-emerald-400/12 px-3 py-3 text-white">{row.aiScore}/100</td>
                      <td className={cn("bg-emerald-400/12 px-3 py-3 font-semibold", qualityTone(row.quality))}>
                        {row.quality}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="premium-panel rounded-xl p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-base font-semibold text-white">Session Overlap Analysis</h2>
                <p className="mt-2 text-lg font-semibold text-gold-300">{overlapProfile.name}</p>
              </div>
              <span className="text-sm text-slate-300">{overlapProfile.range}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {[
                ["Win Rate", `${overlapProfile.winRate}%`, "text-emerald-300"],
                ["Profit Factor", overlapProfile.profitFactor.toFixed(2), "text-white"],
                ["Avg RR", overlapProfile.averageRr.toFixed(2), "text-white"],
                ["Liquidity", "High", "text-emerald-300"],
                ["Volatility", "High", "text-red-300"]
              ].map(([label, value, tone]) => (
                <div key={label} className="glass-tile rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className={cn("mt-2 text-2xl font-semibold", tone)}>{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-gold-400/20 bg-gold-400/10 p-3 text-sm text-slate-200">
              <Star size={17} className="text-gold-400" aria-hidden="true" />
              This overlap period has the highest probability setups and strongest momentum for XAUUSD.
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="premium-panel rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Active Session</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{primaryActiveSession.name} Session</h2>
              </div>
              <span className="rounded-md bg-emerald-400/14 px-3 py-1 text-xs font-bold uppercase text-emerald-300">
                {utcMinutes !== null && isSessionOpen(primaryActiveSession, utcMinutes) ? "Open" : "Next"}
              </span>
            </div>
            <div className="mt-5 space-y-4">
              <SessionProgress label="Liquidity Score" value={primaryProfile.liquidityScore} color="#22c55e" />
              <SessionProgress label="Volatility" value={primaryProfile.volatilityScore} color="#f59e0b" />
              <SessionProgress label="Trend Quality" value={primaryProfile.trendQuality} color="#38bdf8" />
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-300">Best For</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {["Breakouts", "News Trading", "Trend Continuation", "Momentum Trades"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-300" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <DonutScore value={primaryProfile.aiScore} color="#22c55e" size="md" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-sm font-semibold text-rose-300">Avoid</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  {["Counter Trend Entries", "Low RR Trades"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <XCircle size={15} className="text-rose-300" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-emerald-400/16 bg-emerald-400/8 p-4">
              <div className="flex gap-3">
                <Zap size={20} className="mt-1 text-emerald-300" aria-hidden="true" />
                <p className="text-sm leading-6 text-slate-200">
                  <span className="font-semibold text-emerald-300">AI Recommendation:</span> This is currently one of the strongest XAUUSD trading sessions. High liquidity and volatility create optimal trading opportunities.
                </p>
              </div>
            </div>
          </section>

          <section className="premium-panel rounded-xl p-4">
            <h2 className="text-base font-semibold text-white">Live Market Clocks</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {sessions.map((session) => {
                const profile = sessionProfiles[session.id];
                const isOpen = utcMinutes !== null && isSessionOpen(session, utcMinutes);
                return (
                  <div
                    key={session.id}
                    className={cn("glass-tile rounded-xl p-4", isOpen && "border-emerald-400/35 bg-emerald-400/8")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: profile.accent }}>
                        {profile.short}
                      </span>
                      <p className="text-sm font-semibold text-white">{session.name}</p>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-white">{formatSessionClock(profile.cityTimeZone, now)}</p>
                    <p className={cn("mt-2 text-xs font-semibold", isOpen ? "text-emerald-300" : "text-slate-500")}>
                      {isOpen ? "Open" : "Closed"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="premium-panel rounded-xl p-4">
            <h2 className="text-base font-semibold text-white">Session Insights</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                {[
                  ["Best Time Today", "London + New York Overlap (12:00 - 16:00 UTC)", "gold"],
                  ["Avoid Trading", "Sydney Session (lower liquidity & higher fakeouts)", "red"],
                  ["News Impact", "High impact news during New York session", "green"],
                  ["Trend Bias", "Bullish bias stronger during London - New York overlap", "green"]
                ].map(([title, text, tone]) => (
                  <div key={title} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg",
                        tone === "red" ? "bg-rose-400/10 text-rose-300" : tone === "gold" ? "bg-gold-400/10 text-gold-300" : "bg-emerald-400/10 text-emerald-300"
                      )}
                    >
                      {tone === "red" ? <AlertTriangle size={15} /> : tone === "gold" ? <Clock3 size={15} /> : <TrendingUp size={15} />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-xs leading-5 text-slate-400">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <MeterGauge value={primaryProfile.aiScore} />
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
