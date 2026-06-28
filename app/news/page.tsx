import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Gauge,
  Globe2,
  RadioTower,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";
import { getForexFactoryCalendar, type ForexFactoryEvent } from "@/lib/forex-factory";
import { getWorldEconomicUpdates, type WorldEconomicHeadline } from "@/lib/world-economic-updates";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RiskLevel = "Low" | "Medium" | "High" | "Extreme";
type Reaction = "Bullish" | "Bearish" | "Neutral" | "Volatile";

const importantEvents = ["CPI", "PPI", "NFP", "FOMC", "Retail Sales", "Unemployment", "Fed Speech"];

function displayValue(value: string) {
  return value || "--";
}

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function currencyFlag(currency: string) {
  const flags: Record<string, string> = {
    USD: "US",
    EUR: "EU",
    GBP: "GB",
    JPY: "JP",
    CHF: "CH",
    CNY: "CN",
    AUD: "AU",
    CAD: "CA",
    All: "GL"
  };

  return flags[currency] ?? currency.slice(0, 2).toUpperCase();
}

function impactWeight(impact: string) {
  if (impact === "High") {
    return 3;
  }
  if (impact === "Medium") {
    return 2;
  }
  return 1;
}

function impactTone(impact: string) {
  if (impact === "High") {
    return "border-rose-400/35 bg-rose-400/10 text-rose-300";
  }
  if (impact === "Medium") {
    return "border-gold-400/35 bg-gold-400/10 text-gold-300";
  }
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
}

function riskTone(risk: RiskLevel) {
  if (risk === "Extreme") {
    return "text-rose-300";
  }
  if (risk === "High") {
    return "text-red-300";
  }
  if (risk === "Medium") {
    return "text-gold-300";
  }
  return "text-emerald-300";
}

function riskFromScore(score: number): RiskLevel {
  if (score >= 85) {
    return "Extreme";
  }
  if (score >= 65) {
    return "High";
  }
  if (score >= 38) {
    return "Medium";
  }
  return "Low";
}

function recommendationFromRisk(score: number) {
  if (score >= 70) {
    return "No Trade Recommended";
  }
  if (score >= 42) {
    return "Trade With Caution";
  }
  return "Safe To Trade";
}

function countdownTo(event: ForexFactoryEvent | undefined, now: number) {
  if (!event) {
    return { hours: "--", mins: "--", secs: "--", label: "No major event" };
  }

  const diff = Math.max(0, event.timestamp - now);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  return {
    hours: hours.toString().padStart(2, "0"),
    mins: mins.toString().padStart(2, "0"),
    secs: secs.toString().padStart(2, "0"),
    label: event.title
  };
}

function expectedGoldReaction(event: ForexFactoryEvent): Reaction {
  const title = event.title.toLowerCase();
  if (title.includes("cpi") || title.includes("inflation") || title.includes("fomc") || title.includes("fed")) {
    return "Volatile";
  }
  if (title.includes("unemployment") || title.includes("claims")) {
    return "Bullish";
  }
  if (title.includes("retail") || title.includes("gdp")) {
    return "Bearish";
  }
  return event.impact === "High" ? "Volatile" : "Neutral";
}

function expectedUsdReaction(event: ForexFactoryEvent): Reaction {
  const goldReaction = expectedGoldReaction(event);
  if (goldReaction === "Bullish") {
    return "Bearish";
  }
  if (goldReaction === "Bearish") {
    return "Bullish";
  }
  return goldReaction;
}

function reactionTone(reaction: Reaction) {
  if (reaction === "Bullish") {
    return "text-emerald-300";
  }
  if (reaction === "Bearish") {
    return "text-rose-300";
  }
  if (reaction === "Volatile") {
    return "text-gold-300";
  }
  return "text-slate-300";
}

function MiniLine({ color = "#22d3ee" }: { color?: string }) {
  const points = "2,38 14,34 25,26 38,32 49,18 61,28 73,20 85,13 97,17 110,10 126,7";

  return (
    <svg className="h-12 w-32" viewBox="0 0 130 46" fill="none" aria-hidden="true">
      <polyline points={points} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`2,44 ${points} 126,44`} fill={color} opacity="0.14" />
    </svg>
  );
}

function MiniBars({ color = "#2563eb" }: { color?: string }) {
  const bars = [14, 18, 28, 37, 25, 34, 21, 17, 26, 32];

  return (
    <svg className="h-12 w-32" viewBox="0 0 130 46" fill="none" aria-hidden="true">
      {bars.map((height, index) => (
        <rect
          key={`${height}-${index}`}
          x={index * 12 + 5}
          y={42 - height}
          width="8"
          height={height}
          rx="2"
          fill={color}
          opacity={0.45 + index / 20}
        />
      ))}
    </svg>
  );
}

function Donut({ value, color = "#ef4444" }: { value: number; color?: string }) {
  return (
    <div
      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full p-2"
      style={{
        background: `conic-gradient(${color} ${value * 3.6}deg, rgba(148, 163, 184, 0.14) 0deg)`,
        boxShadow: `0 0 34px ${color}22`
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#06111f]">
        <span className="text-2xl font-semibold text-white">{value}</span>
        <span className="text-xs text-slate-400">/100</span>
      </div>
    </div>
  );
}

function GaugeArc({ value }: { value: number }) {
  return (
    <div className="relative h-24 w-32">
      <div className="absolute inset-x-0 bottom-0 h-24 rounded-t-full bg-[conic-gradient(from_225deg,#ef4444_0deg,#f97316_62deg,#22c55e_160deg,transparent_161deg)]" />
      <div className="absolute inset-x-4 bottom-0 h-20 rounded-t-full bg-[#06111f]" />
      <div className="absolute inset-x-0 bottom-4 text-center">
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-xs text-slate-400">/100</p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  badge,
  icon: Icon,
  tone,
  chart
}: {
  label: string;
  value: string;
  helper: string;
  badge: string;
  icon: typeof Activity;
  tone: "red" | "blue" | "gold" | "violet" | "green";
  chart: React.ReactNode;
}) {
  const toneMap = {
    red: "text-rose-300 from-rose-400/22",
    blue: "text-cyan-300 from-cyan-400/22",
    gold: "text-gold-400 from-gold-400/22",
    violet: "text-violet-300 from-violet-500/24",
    green: "text-emerald-300 from-emerald-400/22"
  };
  const toneClass = toneMap[tone];

  return (
    <section className="premium-panel interactive-lift min-h-[140px] overflow-hidden rounded-xl p-5">
      <div className={cn("absolute right-0 top-0 h-28 w-32 bg-gradient-to-bl to-transparent blur-xl", toneClass)} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
          <p className={cn("mt-3 text-3xl font-bold leading-none", toneClass.split(" ")[0])}>{value}</p>
          <p className="mt-4 text-sm text-slate-400">{helper}</p>
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

function BarPanel({
  title,
  data,
  tone = "violet"
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  tone?: "violet" | "blue" | "gold";
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const color = {
    violet: "linear-gradient(180deg,#7c5cff,#3b1c9b)",
    blue: "linear-gradient(180deg,#22d3ee,#1d4ed8)",
    gold: "linear-gradient(180deg,#f8c14a,#b45309)"
  }[tone];

  return (
    <section className="premium-panel rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-5 flex h-36 items-end gap-4 border-b border-white/10 px-2">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-semibold text-white">{item.value}</span>
            <div
              className="w-full max-w-9 rounded-t-md shadow-[0_0_18px_rgba(124,92,255,0.2)]"
              style={{ height: `${Math.max(8, (item.value / max) * 104)}px`, background: color }}
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

function VolatilityLine() {
  const points = "10,116 28,104 46,111 64,88 82,98 100,80 118,64 136,44 154,36 172,30 190,54 208,80 226,86 244,72 262,78 280,68 298,74 316,66 340,70";

  return (
    <svg className="h-44 w-full" viewBox="0 0 360 160" fill="none" preserveAspectRatio="none" aria-hidden="true">
      {[34, 64, 94, 124].map((y) => (
        <line key={y} x1="10" x2="350" y1={y} y2={y} stroke="rgba(148,163,184,0.1)" />
      ))}
      <polygon points={`10,142 ${points} 340,142`} fill="#7c5cff" opacity="0.16" />
      <polyline points={points} stroke="#7c5cff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="190" x2="190" y1="20" y2="142" stroke="rgba(248,193,74,0.28)" strokeDasharray="4 4" />
      <rect x="154" y="18" width="86" height="38" rx="8" fill="rgba(124,92,255,0.28)" stroke="rgba(168,85,247,0.45)" />
      <text x="197" y="34" textAnchor="middle" fill="#d8b4fe" fontSize="10" fontWeight="700">
        High Volatility
      </text>
      <text x="197" y="48" textAnchor="middle" fill="#cbd5e1" fontSize="9">
        12:00 - 16:00
      </text>
    </svg>
  );
}

function ImpactDistribution({ high, medium, low }: { high: number; medium: number; low: number }) {
  const total = Math.max(1, high + medium + low);
  const highEnd = (high / total) * 360;
  const mediumEnd = highEnd + (medium / total) * 360;

  return (
    <section className="premium-panel rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white">Impact Distribution</h3>
      <div className="mt-5 flex items-center gap-5">
        <div
          className="flex h-32 w-32 items-center justify-center rounded-full p-3"
          style={{
            background: `conic-gradient(#ef4444 0deg ${highEnd}deg, #f59e0b ${highEnd}deg ${mediumEnd}deg, #0ea5e9 ${mediumEnd}deg 360deg)`
          }}
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#06111f]">
            <span className="text-2xl font-semibold text-white">{total}</span>
            <span className="text-xs text-slate-400">Total Events</span>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          {[
            ["High Impact", high, "bg-rose-400"],
            ["Medium Impact", medium, "bg-gold-400"],
            ["Low Impact", low, "bg-blue-500"]
          ].map(([label, value, color]) => (
            <div key={label as string} className="flex items-center gap-3">
              <span className={cn("h-2.5 w-2.5 rounded-full", color as string)} />
              <span className="min-w-28 text-slate-300">{label}</span>
              <span className="font-semibold text-white">{value as number}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeatmapBars({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 8 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-3 w-3 rounded-sm",
            index < value ? (value >= 7 ? "bg-rose-500" : value >= 4 ? "bg-gold-400" : "bg-emerald-400") : "bg-white/[0.06]"
          )}
        />
      ))}
    </div>
  );
}

function NewsHeadlineCard({ headline, index }: { headline: WorldEconomicHeadline; index: number }) {
  return (
    <Link
      href={headline.url}
      target="_blank"
      rel="noreferrer"
      className="group glass-tile rounded-xl p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-xs font-bold text-cyan-200">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-white group-hover:text-cyan-100">
            {headline.title}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {headline.domain} | {headline.sourceCountry} | {formatDateTime(headline.seenAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function NewsPage() {
  const [calendar, economicUpdates] = await Promise.all([getForexFactoryCalendar(), getWorldEconomicUpdates()]);
  const now = Date.now();
  const today = dayKey(new Date().toISOString());
  const todayEvents = calendar.events.filter((event) => dayKey(event.date) === today);
  const highImpactToday = todayEvents.filter((event) => event.impact === "High").length;
  const mediumImpactToday = todayEvents.filter((event) => event.impact === "Medium").length;
  const lowImpactToday = todayEvents.filter((event) => event.impact !== "High" && event.impact !== "Medium").length;
  const usdEventsToday = todayEvents.filter((event) => event.country === "USD").length;
  const upcomingEvents = calendar.events.filter((event) => event.timestamp >= now);
  const highUpcoming = upcomingEvents.filter((event) => event.impact === "High");
  const nextMajorEvent = highUpcoming[0] ?? upcomingEvents[0];
  const countdown = countdownTo(nextMajorEvent, now);
  const riskScore = Math.min(100, highImpactToday * 18 + mediumImpactToday * 9 + usdEventsToday * 7 + highUpcoming.length * 8);
  const goldRiskScore = Math.min(100, riskScore + (highUpcoming.some((event) => event.country === "USD") ? 12 : 0));
  const riskLevel = riskFromScore(riskScore);
  const recommendation = recommendationFromRisk(riskScore);
  const eventDensity = todayEvents.length >= 8 ? "High" : todayEvents.length >= 4 ? "Medium" : "Low";
  const volatilityForecast = riskScore >= 72 ? "High" : riskScore >= 45 ? "Medium" : "Low";
  const usdStrength = usdEventsToday >= 4 ? "Elevated" : usdEventsToday >= 2 ? "Watch" : "Stable";
  const goldSensitivity = goldRiskScore >= 70 ? "High" : goldRiskScore >= 45 ? "Medium" : "Low";
  const impactByCurrency = Object.entries(
    calendar.events.reduce<Record<string, number>>((groups, event) => {
      groups[event.country] = (groups[event.country] ?? 0) + 1;
      return groups;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([label, value]) => ({ label, value }));
  const weekdayDistribution = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sun"].map((label, index) => ({
    label,
    value: calendar.events.filter((event) => new Date(event.date).getDay() === (index + 1) % 7).length
  }));
  const timelineEvents = calendar.events
    .slice(0, 5)
    .sort((first, second) => first.timestamp - second.timestamp);
  const timelineItems = timelineEvents.map((event, index) => {
    const eventTime = new Date(event.date);
    const eventMinutes = eventTime.getHours() * 60 + eventTime.getMinutes();

    return {
      event,
      index,
      isHigh: event.impact === "High",
      isUpcoming: event.timestamp >= now,
      left: Math.min(96, Math.max(4, (eventMinutes / 1440) * 100))
    };
  });
  const timelineMarkers = timelineItems.reduce<Array<{ count: number; isHigh: boolean; isUpcoming: boolean; key: string; left: number }>>(
    (markers, item) => {
      const nearbyMarker = markers.find((marker) => Math.abs(marker.left - item.left) < 2.5);

      if (nearbyMarker) {
        nearbyMarker.count += 1;
        nearbyMarker.isHigh = nearbyMarker.isHigh || item.isHigh;
        nearbyMarker.isUpcoming = nearbyMarker.isUpcoming || item.isUpcoming;
        return markers;
      }

      markers.push({
        count: 1,
        isHigh: item.isHigh,
        isUpcoming: item.isUpcoming,
        key: `${item.event.date}-${item.event.title}`,
        left: item.left
      });

      return markers;
    },
    []
  );
  const highImpactCards = calendar.events.filter((event) => event.impact === "High").slice(0, 4);
  const mostImportant = highImpactCards[0] ?? calendar.events[0];
  const dangerousWindow = nextMajorEvent ? `${formatDateTime(nextMajorEvent.date)} around ${nextMajorEvent.title}` : "No high-impact window detected";

  return (
    <div className="space-y-4 overflow-x-hidden">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-white">News Calendar</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            Real-time economic events and market moving news for XAUUSD.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200">
            <CalendarDays size={15} className="text-cyan-300" aria-hidden="true" />
            {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date())}
          </span>
          <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200">
            <Clock3 size={15} className="text-slate-400" aria-hidden="true" />
            {new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date())}
          </span>
          <Link
            href={calendar.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
          >
            <ExternalLink size={15} aria-hidden="true" />
            Forex Factory
          </Link>
        </div>
      </section>

      {(calendar.warning || economicUpdates.warning) ? (
        <section className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} aria-hidden="true" />
            Some news feeds could not be loaded right now.
          </div>
          {calendar.warning ? <p className="mt-2 text-xs text-rose-100/75">Forex Factory: {calendar.warning}</p> : null}
          {economicUpdates.warning ? <p className="mt-1 text-xs text-rose-100/75">World updates: {economicUpdates.warning}</p> : null}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="High Impact Events Today"
          value={String(highImpactToday)}
          helper="vs Yesterday"
          badge="+2 risk"
          icon={AlertTriangle}
          tone="red"
          chart={<MiniLine color="#ef4444" />}
        />
        <KpiCard
          label="USD Events Today"
          value={String(usdEventsToday)}
          helper="USD calendar focus"
          badge="+1 flow"
          icon={Globe2}
          tone="blue"
          chart={<MiniBars color="#2563eb" />}
        />
        <KpiCard
          label="Gold Risk Score"
          value={`${goldRiskScore}`}
          helper="XAUUSD sensitivity"
          badge={goldSensitivity}
          icon={ShieldAlert}
          tone="gold"
          chart={<MiniLine color="#f59e0b" />}
        />
        <KpiCard
          label="Volatility Forecast"
          value={volatilityForecast}
          helper="For XAUUSD"
          badge={riskLevel}
          icon={Activity}
          tone={volatilityForecast === "High" ? "red" : "gold"}
          chart={<MiniLine color="#f59e0b" />}
        />
        <KpiCard
          label="Next Major Event Countdown"
          value={countdown.label.split(" ").slice(0, 3).join(" ")}
          helper={`${countdown.hours} hrs ${countdown.mins} mins ${countdown.secs} secs`}
          badge={nextMajorEvent?.country ?? "None"}
          icon={Clock3}
          tone="violet"
          chart={<MiniBars color="#7c5cff" />}
        />
        <KpiCard
          label="AI News Risk Level"
          value={riskLevel}
          helper={recommendation}
          badge="AI model"
          icon={Sparkles}
          tone={riskScore >= 65 ? "red" : "green"}
          chart={<MiniLine color={riskScore >= 65 ? "#ef4444" : "#22c55e"} />}
        />
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 space-y-4">
          <section className="premium-panel rounded-xl p-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase text-cyan-200">Economic Command Center</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Current Market Risk</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Institutional view of event density, USD sensitivity, expected volatility, and gold reaction risk.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    ["Risk Level", riskLevel],
                    ["Volatility Forecast", volatilityForecast],
                    ["Event Density", eventDensity],
                    ["USD Strength", usdStrength],
                    ["Gold Sensitivity", goldSensitivity]
                  ].map(([label, value]) => (
                    <div key={label} className="glass-tile rounded-xl p-4">
                      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
                      <p className={cn("mt-2 text-xl font-semibold text-white", label === "Risk Level" && riskTone(riskLevel))}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-tile flex flex-col justify-between rounded-xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">AI Recommendation</p>
                    <p className={cn("mt-3 text-3xl font-bold", riskScore >= 70 ? "text-rose-300" : riskScore >= 42 ? "text-gold-300" : "text-emerald-300")}>
                      {recommendation}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {riskScore >= 70
                        ? "Avoid opening new XAUUSD trades before high impact releases. Wait until spreads and candle volatility normalize."
                        : riskScore >= 42
                          ? "Use reduced size and wait for post-news confirmation before trusting technical setups."
                          : "No major immediate news pressure detected. Standard risk rules still apply."}
                    </p>
                  </div>
                  <Donut value={riskScore} color={riskScore >= 65 ? "#ef4444" : "#22c55e"} />
                </div>
              </div>
            </div>
          </section>

          <section className="premium-panel overflow-hidden rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">Live Economic Timeline</h2>
            <div className="mt-6 max-w-full overflow-x-auto pb-2 scrollbar-thin">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-7 text-xs text-slate-400">
                  {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"].map((time) => (
                    <span key={time}>{time}</span>
                  ))}
                </div>
                <div className="mt-8">
                  <div className="grid grid-cols-5 gap-4">
                    {timelineItems.map(({ event, index, isHigh, isUpcoming }) => (
                      <div
                        key={`${event.date}-${event.title}`}
                        data-news-timeline-card
                        className={cn(
                          "min-h-[132px] rounded-xl border p-3 shadow-[0_16px_40px_rgba(0,0,0,0.22)]",
                          impactTone(event.impact),
                          isHigh && "shadow-[0_0_28px_rgba(239,68,68,0.18)]"
                        )}
                      >
                        <p className="text-xs font-semibold text-cyan-200">
                          {new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.date))}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-white">{event.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {event.country} | {event.impact}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          F {displayValue(event.forecast)} | P {displayValue(event.previous)}
                        </p>
                        <span
                          className={cn(
                            "mt-3 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                            isUpcoming ? "border-blue-400/30 bg-blue-400/10 text-blue-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
                            isHigh && "border-rose-400/30 bg-rose-400/10 text-rose-200"
                          )}
                        >
                          {index === 0 ? "Past" : isUpcoming ? "Upcoming" : "Released"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="relative mt-7 h-10">
                    <div className="absolute left-0 right-0 top-6 h-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-gold-400 to-rose-500" />
                    {timelineMarkers.map(({ count, isHigh, isUpcoming, key, left }) => (
                      <div
                        key={`${key}-marker`}
                        data-news-timeline-marker
                        className="absolute top-0 -translate-x-1/2 text-center"
                        style={{ left: `${left}%` }}
                      >
                        <span
                          className={cn(
                            "mx-auto flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink-950 px-1 text-[9px] font-bold text-white shadow-[0_0_18px_rgba(34,211,238,0.28)]",
                            isUpcoming ? "bg-blue-500" : "bg-emerald-400",
                            isHigh && "bg-rose-500"
                          )}
                        >
                          {count > 1 ? count : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ImpactDistribution high={calendar.events.filter((event) => event.impact === "High").length} medium={calendar.events.filter((event) => event.impact === "Medium").length} low={calendar.events.filter((event) => event.impact !== "High" && event.impact !== "Medium").length} />
            <BarPanel title="Weekly Event Distribution" data={weekdayDistribution} tone="violet" />
            <section className="premium-panel rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white">Gold Volatility Forecast</h3>
              <div className="mt-4 chart-surface rounded-xl p-2">
                <VolatilityLine />
              </div>
            </section>
          </section>

          <section className="premium-panel overflow-hidden rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">Upcoming High Impact Events</h2>
            <div className="mt-4 max-w-full overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Time</th>
                    <th className="px-3 py-3 font-semibold">Currency</th>
                    <th className="px-3 py-3 font-semibold">Event</th>
                    <th className="px-3 py-3 font-semibold">Impact</th>
                    <th className="px-3 py-3 font-semibold">Forecast</th>
                    <th className="px-3 py-3 font-semibold">Previous</th>
                    <th className="px-3 py-3 font-semibold">Countdown</th>
                    <th className="px-3 py-3 font-semibold">Expected Volatility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {(highImpactCards.length ? highImpactCards : calendar.events.slice(0, 5)).map((event) => {
                    const eventCountdown = countdownTo(event, now);
                    return (
                      <tr key={`${event.date}-${event.country}-${event.title}`} className="transition hover:bg-cyan-300/[0.04]">
                        <td className="px-3 py-3 text-slate-400">{formatDateTime(event.date)}</td>
                        <td className="px-3 py-3 font-semibold text-white">
                          <span className="inline-flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-cyan-100">
                              {currencyFlag(event.country)}
                            </span>
                            {event.country}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-white">
                          <p className="font-semibold">{event.title}</p>
                          <p className="text-xs text-slate-500">Expected Gold: <span className={reactionTone(expectedGoldReaction(event))}>{expectedGoldReaction(event)}</span></p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", impactTone(event.impact))}>{event.impact}</span>
                        </td>
                        <td className="px-3 py-3 text-slate-300">{displayValue(event.forecast)}</td>
                        <td className="px-3 py-3 text-slate-300">{displayValue(event.previous)}</td>
                        <td className="px-3 py-3 font-semibold text-rose-300">
                          {event.timestamp >= now ? `${eventCountdown.hours}:${eventCountdown.mins}:${eventCountdown.secs}` : "Released"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={event.impact === "High" ? "text-rose-300" : event.impact === "Medium" ? "text-gold-300" : "text-emerald-300"}>
                            {event.impact}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="premium-panel rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-400/10 text-rose-300">
                  <AlertTriangle size={28} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">AI News Impact Analysis</p>
                  <p className={cn("mt-2 text-3xl font-bold", riskTone(riskLevel))}>{riskLevel}</p>
                  <p className="mt-1 text-sm text-slate-400">Current market risk</p>
                </div>
              </div>
              <GaugeArc value={riskScore} />
            </div>
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Key Reasons</p>
              <div className="mt-3 space-y-3">
                {[
                  [`USD ${nextMajorEvent?.title ?? "calendar"} in ${countdown.hours}h ${countdown.mins}m`, nextMajorEvent?.impact ?? "Medium"],
                  [`${highUpcoming.length} high impact event${highUpcoming.length === 1 ? "" : "s"} remaining`, "High Impact"],
                  [`${usdEventsToday} USD events today`, "USD"],
                  ["Geopolitical and macro headline sensitivity", "Medium Impact"]
                ].map(([reason, impact]) => (
                  <div key={reason} className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      {reason}
                    </span>
                    <span className="text-xs text-slate-400">{impact}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-rose-400/16 bg-rose-400/8 p-4">
              <div className="flex gap-3">
                <Zap size={19} className="mt-1 text-rose-300" aria-hidden="true" />
                <p className="text-sm leading-6 text-slate-200">
                  <span className="font-semibold text-white">AI Trading Recommendation:</span> {recommendation}. High impact events can expand spreads and invalidate technical levels before confirmation.
                </p>
              </div>
            </div>
          </section>

          <section className="premium-panel rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">Gold Event Heatmap</h2>
            <div className="mt-4 space-y-2">
              {importantEvents.map((eventName) => {
                const matching = calendar.events.find((event) => event.title.toLowerCase().includes(eventName.toLowerCase().split(" ")[0]));
                const value = matching ? impactWeight(matching.impact) + (matching.country === "USD" ? 3 : 1) : eventName === "CPI" || eventName === "FOMC" ? 7 : 4;
                return (
                  <div key={eventName} className="grid grid-cols-[1fr_80px_80px_96px] items-center gap-3 rounded-lg bg-white/[0.035] px-3 py-2 text-sm">
                    <span className="font-medium text-white">{eventName}</span>
                    <span className={value >= 7 ? "text-rose-300" : value >= 5 ? "text-gold-300" : "text-emerald-300"}>
                      {value >= 7 ? "Very High" : value >= 5 ? "Medium" : "Low"}
                    </span>
                    <span className={value >= 6 ? "text-rose-300" : "text-gold-300"}>{value >= 7 ? "High" : "Medium"}</span>
                    <HeatmapBars value={value} />
                  </div>
                );
              })}
            </div>
          </section>

          <BarPanel title="Event Impact By Currency" data={impactByCurrency.length ? impactByCurrency : [{ label: "USD", value: 0 }]} tone="violet" />
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <section className="premium-panel rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">High Impact Events Section</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {(highImpactCards.length ? highImpactCards : calendar.events.slice(0, 4)).map((event) => (
                <article key={`${event.date}-${event.title}`} className="glass-tile rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-cyan-100">
                        {currencyFlag(event.country)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{event.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{event.country} | {formatDateTime(event.date)}</p>
                      </div>
                    </div>
                    <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", impactTone(event.impact))}>{event.impact}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Forecast</p>
                      <p className="mt-1 font-semibold text-white">{displayValue(event.forecast)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Previous</p>
                      <p className="mt-1 font-semibold text-white">{displayValue(event.previous)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Actual</p>
                      <p className="mt-1 font-semibold text-white">{displayValue(event.actual)}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-white/[0.035] p-3 text-xs">
                    <span className={reactionTone(expectedGoldReaction(event))}>Gold {expectedGoldReaction(event)}</span>
                    <span className={reactionTone(expectedUsdReaction(event))}>USD {expectedUsdReaction(event)}</span>
                    <span className={event.impact === "High" ? "text-rose-300" : "text-gold-300"}>Vol {event.impact}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="premium-panel rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">AI News Analysis Center</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {[
                ["Bullish Events", "Weak labor data, dovish Fed language, softer inflation prints can support gold demand.", "text-emerald-300"],
                ["Bearish Events", "Hot CPI, strong retail sales, hawkish FOMC projections, or rising USD yields can pressure gold.", "text-rose-300"],
                ["Neutral Events", "Low-impact releases and mixed revisions usually need technical confirmation before action.", "text-slate-300"]
              ].map(([title, copy, tone]) => (
                <div key={title} className="glass-tile rounded-xl p-4">
                  <h3 className={cn("text-sm font-semibold", tone)}>{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-cyan-300/16 bg-cyan-300/8 p-4 text-sm leading-6 text-slate-200">
              Gold may rise when USD expectations weaken or safe-haven demand expands. Gold may fall when rate expectations rise or USD data is stronger than forecast. Volatility may increase around CPI, FOMC, NFP, and Fed speeches.
            </div>
          </section>

          <section className="premium-panel rounded-xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">W-Economic Updates</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Daily world economy headlines from {economicUpdates.sourceName}. Updated {formatDateTime(economicUpdates.fetchedAt)}.
                </p>
              </div>
              <Link
                href={economicUpdates.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/30"
              >
                <ExternalLink size={14} aria-hidden="true" />
                Source
              </Link>
            </div>
            {economicUpdates.headlines.length ? (
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {economicUpdates.headlines.map((headline, index) => (
                  <NewsHeadlineCard key={`${headline.url}-${headline.seenAt}`} headline={headline} index={index} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                No world economic update headlines are available yet.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="premium-panel rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">Volatility Intelligence Center</h2>
            <div className="mt-4 grid grid-cols-1 gap-4">
              {[
                ["Current Volatility", riskLevel, riskScore],
                ["Expected Volatility", volatilityForecast, Math.min(100, riskScore + 8)],
                ["Historical Volatility", "Medium", 55]
              ].map(([label, value, score]) => (
                <div key={label as string} className="glass-tile flex items-center justify-between rounded-xl p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
                    <p className={cn("mt-2 text-xl font-semibold", riskTone(value as RiskLevel))}>{value as string}</p>
                  </div>
                  <Donut value={score as number} color={(score as number) >= 65 ? "#ef4444" : "#22c55e"} />
                </div>
              ))}
            </div>
          </section>

          <section className="premium-panel rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">News Risk Scorecard</h2>
            <div className="mt-4 space-y-3">
              {[
                ["USD Risk Score", Math.min(100, usdEventsToday * 17 + highUpcoming.filter((event) => event.country === "USD").length * 10)],
                ["Gold Risk Score", goldRiskScore],
                ["Market Risk Score", riskScore],
                ["Event Risk Score", Math.min(100, highImpactToday * 20 + mediumImpactToday * 8)]
              ].map(([label, value]) => {
                const score = value as number;
                const grade = score >= 85 ? "A+" : score >= 70 ? "A" : score >= 45 ? "B" : "C";
                return (
                  <div key={label as string} className="glass-tile rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{label as string}</span>
                      <span className="text-sm font-semibold text-white">{grade}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-300" style={{ width: `${score}%` }} />
                    </div>
                    <p className="mt-2 text-right text-xs font-semibold text-white">{score}/100</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="premium-panel rounded-xl p-5">
            <h2 className="text-base font-semibold text-white">Upcoming Events Panel</h2>
            <div className="mt-4 space-y-3">
              {upcomingEvents.slice(0, 4).map((event) => {
                const eventCountdown = countdownTo(event, now);
                return (
                  <div key={`${event.date}-${event.title}`} className="glass-tile rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-cyan-100">
                          {currencyFlag(event.country)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white">{event.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{event.country} | {event.impact}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-rose-300">{eventCountdown.hours}:{eventCountdown.mins}:{eventCountdown.secs}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <span className={reactionTone(expectedGoldReaction(event))}>Gold: {expectedGoldReaction(event)}</span>
                      <span className={reactionTone(expectedUsdReaction(event))}>USD: {expectedUsdReaction(event)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Most Important Event This Week", mostImportant?.title ?? "No major event"],
          ["Highest Impact Currency", impactByCurrency[0]?.label ?? "USD"],
          ["Highest Volatility Event", highImpactCards[0]?.title ?? "No high-impact event"],
          ["Safest Trading Day", weekdayDistribution.sort((a, b) => a.value - b.value)[0]?.label ?? "N/A"],
          ["Most Dangerous Trading Window", dangerousWindow]
        ].map(([label, value]) => (
          <section key={label} className="premium-panel interactive-lift rounded-xl p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-white">{value}</p>
          </section>
        ))}
      </section>

      <section className="rounded-xl border border-gold-400/20 bg-gold-400/10 p-4 text-sm leading-6 text-gold-100">
        News events are context only. They do not create automatic Buy or Sell signals and this app still does not execute trades.
      </section>
    </div>
  );
}
