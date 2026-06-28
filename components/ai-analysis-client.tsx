"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Crosshair,
  DatabaseZap,
  Gauge,
  Layers3,
  LineChart,
  LocateFixed,
  Network,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Waves,
  Zap,
  type LucideIcon
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { type AnalysisResult, type Candle, type PriceZone, type SignalRuleResult, type Timeframe } from "@/lib/types";
import { clamp, cn, formatDateTime, formatPercent, formatPrice } from "@/lib/utils";

type AiTimeframe = "15m" | "1h" | "4h" | "D";
type SessionName = "Sydney" | "Tokyo" | "London" | "New York";
type Tone = "green" | "red" | "gold" | "cyan" | "violet" | "blue" | "neutral";

const TIMEFRAME_TABS: Array<{ label: string; value: AiTimeframe }> = [
  { label: "M15", value: "15m" },
  { label: "H1", value: "1h" },
  { label: "H4", value: "4h" },
  { label: "D1", value: "D" }
];

const SESSION_DATA: Record<SessionName, { hours: string; score: number; strength: string; performance: number }> = {
  London: { hours: "07:00 - 16:00 UTC", performance: 78, score: 86, strength: "Strong" },
  "New York": { hours: "13:00 - 22:00 UTC", performance: 74, score: 82, strength: "Strong" },
  Sydney: { hours: "21:00 - 06:00 UTC", performance: 52, score: 58, strength: "Quiet" },
  Tokyo: { hours: "00:00 - 09:00 UTC", performance: 62, score: 67, strength: "Moderate" }
};

function toneClasses(tone: Tone) {
  return {
    blue: "text-blue-300 border-blue-400/25 bg-blue-400/10",
    cyan: "text-cyan-300 border-cyan-300/25 bg-cyan-300/10",
    gold: "text-gold-400 border-gold-400/25 bg-gold-400/10",
    green: "text-emerald-300 border-emerald-400/25 bg-emerald-400/10",
    neutral: "text-slate-300 border-white/10 bg-white/[0.045]",
    red: "text-rose-300 border-rose-400/25 bg-rose-400/10",
    violet: "text-violet-300 border-violet-400/25 bg-violet-400/10"
  }[tone];
}

function getSession(dateValue: string): SessionName {
  const hour = new Date(dateValue).getUTCHours();

  if (hour >= 7 && hour < 13) return "London";
  if (hour >= 13 && hour < 22) return "New York";
  if (hour >= 0 && hour < 7) return "Tokyo";
  return "Sydney";
}

function grade(score: number) {
  if (score >= 88) return "A+";
  if (score >= 76) return "A";
  if (score >= 62) return "B";
  return "C";
}

function recommendationTone(signalType: AnalysisResult["signal"]["signalType"]): Tone {
  if (signalType === "BUY") return "green";
  if (signalType === "SELL") return "red";
  return "gold";
}

function biasFromAnalysis(analysis: AnalysisResult) {
  if (analysis.signal.bias === "long" || analysis.indicators.trend === "bullish") return "Bullish";
  if (analysis.signal.bias === "short" || analysis.indicators.trend === "bearish") return "Bearish";
  return "Neutral";
}

function nearestZone(zones: PriceZone[], price: number, side: "support" | "resistance") {
  const candidates = zones.filter((zone) => (side === "support" ? zone.price <= price : zone.price >= price));
  const sorted = candidates.sort((first, second) => Math.abs(first.price - price) - Math.abs(second.price - price));
  return sorted[0] ?? zones[0] ?? null;
}

function getDerivedScores(analysis: AnalysisResult) {
  const { indicators, currentPrice, signal } = analysis;
  const latest = analysis.candles[analysis.candles.length - 1];
  const session = latest ? getSession(latest.time) : "London";
  const sessionMeta = SESSION_DATA[session];
  const emaSpread = indicators.ema50 && indicators.ema200 ? Math.abs(indicators.ema50 - indicators.ema200) : 0;
  const trendStrength = clamp((emaSpread / Math.max(indicators.atr14 ?? 3, 1)) * 22 + (indicators.trend !== "ranging" ? 42 : 18), 0, 100);
  const momentum = clamp(
    (indicators.rsi14 ?? 50) + (indicators.macd.bias === "bullish" || indicators.macd.bias === "improving" ? 14 : indicators.macd.bias === "bearish" || indicators.macd.bias === "weakening" ? -14 : 0),
    0,
    100
  );
  const volatility = clamp(((indicators.atr14 ?? currentPrice * 0.0015) / currentPrice) * 10000, 18, 96);
  const liquidity = clamp(sessionMeta.score + (signal.confidence >= 70 ? 6 : 0), 0, 100);
  const newsRisk = signal.confidence >= 72 ? 28 : signal.confidence >= 60 ? 44 : 62;
  const supportResistance = clamp(
    (indicators.rejectsSupport || indicators.rejectsResistance ? 80 : 64) + Math.min(12, indicators.supportZones.length + indicators.resistanceZones.length),
    0,
    100
  );
  const structure = clamp(indicators.trend === "bullish" || indicators.trend === "bearish" ? 82 : 56, 0, 100);
  const quality = clamp(signal.confidence * 0.38 + trendStrength * 0.2 + momentum * 0.14 + liquidity * 0.16 + (100 - newsRisk) * 0.12, 0, 100);

  return {
    liquidity,
    momentum,
    newsRisk,
    quality,
    session,
    sessionQuality: sessionMeta.score,
    structure,
    supportResistance,
    trendStrength,
    volatility
  };
}

function statusForScore(value: number) {
  if (value >= 76) return "Strong";
  if (value >= 58) return "Medium";
  return "Low";
}

function formatSignal(signalType: AnalysisResult["signal"]["signalType"], confidence: number) {
  if (confidence < 45 && signalType === "HOLD") return "NO TRADE";
  return signalType;
}

function MiniSparkline({ values }: { values: number[] }) {
  const path = linePath(values, 118, 46, 5);

  return (
    <svg className="h-10 w-24" viewBox="0 0 118 46" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d={path.area} fill="url(#aiMiniFill)" />
      <path d={path.path} stroke="#7c5cff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="aiMiniFill" x1="0" x2="0" y1="0" y2="46">
          <stop stopColor="#7c5cff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
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

function KpiCard({
  badge,
  helper,
  icon: Icon,
  label,
  sparkValues,
  tone,
  trend,
  value
}: {
  badge: string;
  helper: string;
  icon: LucideIcon;
  label: string;
  sparkValues: number[];
  tone: Tone;
  trend: string;
  value: string;
}) {
  const toneClass = toneClasses(tone);

  return (
    <section className="premium-panel interactive-lift min-h-[136px] overflow-hidden rounded-xl p-4">
      <div className={cn("absolute -right-7 -top-8 h-28 w-36 rounded-full blur-2xl", toneClass)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-white/[0.055]", toneClass)}>
            <Icon size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-slate-400">{label}</p>
            <p className={cn("mt-2 truncate text-2xl font-bold leading-none", toneClass.split(" ")[0])}>{value}</p>
            <p className="mt-2 text-xs text-slate-400">{helper}</p>
          </div>
        </div>
        <span className={cn("rounded-full border px-2 py-1 text-[10px] font-bold uppercase", toneClass)}>{badge}</span>
      </div>
      <div className="relative mt-2 flex items-end justify-between gap-3">
        <p className="text-xs font-semibold text-emerald-300">{trend}</p>
        <MiniSparkline values={sparkValues} />
      </div>
    </section>
  );
}

function RingGauge({
  label,
  score,
  size = 140,
  tone = "green"
}: {
  label: string;
  score: number;
  size?: number;
  tone?: Tone;
}) {
  const color = {
    blue: "#60a5fa",
    cyan: "#22d3ee",
    gold: "#f8c14a",
    green: "#34d399",
    neutral: "#94a3b8",
    red: "#fb7185",
    violet: "#7c5cff"
  }[tone];

  return (
    <div className="flex shrink-0 items-center justify-center rounded-full p-3" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`, height: size, width: size }}>
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#07111f]">
        <span className="text-3xl font-bold text-white">{Math.round(score)}</span>
        <span className="text-xs text-slate-400">/100</span>
        <span className="mt-1 text-[10px] uppercase text-slate-500">{label}</span>
      </div>
    </div>
  );
}

function RadarChart({
  items,
  score
}: {
  items: Array<{ label: string; value: number }>;
  score: number;
}) {
  const size = 330;
  const center = size / 2;
  const maxRadius = 118;
  const points = items.map((item, index) => {
    const angle = -Math.PI / 2 + (index / items.length) * Math.PI * 2;
    const radius = (item.value / 100) * maxRadius;
    return {
      ...item,
      angle,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="relative mx-auto max-w-[360px]">
      <svg className="h-[340px] w-full" viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={items
              .map((_, index) => {
                const angle = -Math.PI / 2 + (index / items.length) * Math.PI * 2;
                return `${center + Math.cos(angle) * maxRadius * ratio},${center + Math.sin(angle) * maxRadius * ratio}`;
              })
              .join(" ")}
            stroke="rgba(96,165,250,0.28)"
            fill="none"
          />
        ))}
        {items.map((item, index) => {
          const angle = -Math.PI / 2 + (index / items.length) * Math.PI * 2;
          const x = center + Math.cos(angle) * maxRadius;
          const y = center + Math.sin(angle) * maxRadius;
          const labelX = center + Math.cos(angle) * (maxRadius + 34);
          const labelY = center + Math.sin(angle) * (maxRadius + 34);
          return (
            <g key={item.label}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(96,165,250,0.22)" />
              <text x={labelX} y={labelY} fill="#dbeafe" fontSize="11" textAnchor="middle">
                {item.label}
              </text>
              <text x={labelX} y={labelY + 14} fill="#94a3b8" fontSize="10" textAnchor="middle">
                {Math.round(item.value)}/100
              </text>
            </g>
          );
        })}
        <polygon points={polygon} fill="rgba(124,92,255,0.34)" stroke="#a78bfa" strokeWidth="2.5" />
        {points.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="4" fill="#a78bfa" />)}
        <circle cx={center} cy={center} r="3" fill="#a78bfa" />
      </svg>
      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/10 text-center shadow-[0_0_40px_rgba(124,92,255,0.22)]">
        <span className="text-2xl font-bold text-white">{Math.round(score)}</span>
        <span className="text-[10px] uppercase text-slate-400">AI score</span>
      </div>
    </div>
  );
}

function MarketStructureChart({
  candles,
  currentPrice,
  signalType,
  support,
  resistance
}: {
  candles: Candle[];
  currentPrice: number;
  resistance: PriceZone | null;
  signalType: AnalysisResult["signal"]["signalType"];
  support: PriceZone | null;
}) {
  const data = candles.slice(-58);
  const highs = data.map((candle) => candle.high);
  const lows = data.map((candle) => candle.low);
  const min = Math.min(...lows, support?.price ?? currentPrice) - 3;
  const max = Math.max(...highs, resistance?.price ?? currentPrice) + 3;
  const range = max - min || 1;
  const width = 660;
  const height = 260;
  const xStep = (width - 34) / Math.max(1, data.length - 1);
  const yFor = (price: number) => height - 18 - ((price - min) / range) * (height - 42);
  const currentY = yFor(currentPrice);
  const supportY = yFor(support?.price ?? currentPrice - 18);
  const resistanceY = yFor(resistance?.price ?? currentPrice + 18);

  return (
    <div className="chart-surface relative overflow-hidden rounded-xl border border-white/10 p-3">
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        {TIMEFRAME_TABS.map((tab) => (
          <span key={tab.value} className={cn("rounded-md border px-2 py-1 text-[10px] font-bold", tab.value === "1h" ? "border-violet-300/40 bg-violet-500/30 text-white" : "border-white/10 bg-white/[0.045] text-slate-400")}>
            {tab.label}
          </span>
        ))}
      </div>
      <svg className="h-[320px] w-full" viewBox={`0 0 ${width} ${height + 48}`} fill="none" preserveAspectRatio="none" aria-hidden="true">
        {[42, 82, 122, 162, 202].map((y) => <line key={y} x1="18" x2={width - 10} y1={y} y2={y} stroke="rgba(148,163,184,0.11)" />)}
        <line x1="18" x2={width - 10} y1={resistanceY} y2={resistanceY} stroke="#22c55e" strokeDasharray="3 3" opacity="0.6" />
        <line x1="18" x2={width - 10} y1={currentY} y2={currentY} stroke="#60a5fa" strokeDasharray="3 3" opacity="0.55" />
        <line x1="18" x2={width - 10} y1={supportY} y2={supportY} stroke="#ef4444" strokeDasharray="3 3" opacity="0.55" />
        {data.map((candle, index) => {
          const x = 18 + index * xStep;
          const openY = yFor(candle.open);
          const closeY = yFor(candle.close);
          const highY = yFor(candle.high);
          const lowY = yFor(candle.low);
          const isUp = candle.close >= candle.open;
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(3, Math.abs(openY - closeY));
          return (
            <g key={`${candle.time}-${index}`}>
              <line x1={x} x2={x} y1={highY} y2={lowY} stroke={isUp ? "#34d399" : "#fb7185"} strokeWidth="1.4" />
              <rect x={x - 3.2} y={bodyY} width="6.4" height={bodyHeight} rx="1" fill={isUp ? "#34d399" : "#fb7185"} />
            </g>
          );
        })}
        {[
          { label: "Higher High", x: 220, y: 60 },
          { label: "Higher Low", x: 286, y: 172 },
          { label: "Higher High", x: 424, y: 44 },
          { label: "Higher Low", x: 500, y: 152 }
        ].map((tag) => (
          <g key={`${tag.label}-${tag.x}`}>
            <rect x={tag.x - 36} y={tag.y - 16} width="72" height="24" rx="5" fill="rgba(34,197,94,0.52)" />
            <text x={tag.x} y={tag.y} fill="#dcfce7" fontSize="10" fontWeight="700" textAnchor="middle">{tag.label}</text>
          </g>
        ))}
        {[
          ["Take Profit", resistanceY, "#22c55e"],
          ["Current Price", currentY, "#64748b"],
          ["Key Support", supportY, "#2563eb"],
          ["Stop Loss", yFor(signalType === "SELL" ? (resistance?.price ?? currentPrice + 18) : (support?.price ?? currentPrice - 18)) + 22, "#ef4444"]
        ].map(([label, y, color]) => (
          <g key={label as string}>
            <rect x={width - 88} y={Number(y) - 12} width="70" height="24" rx="4" fill={color as string} opacity="0.88" />
            <text x={width - 53} y={Number(y) + 4} fill="white" fontSize="10" fontWeight="700" textAnchor="middle">{label as string}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function FactorRow({
  detail,
  icon: Icon,
  label,
  status,
  tone
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  status: string;
  tone: Tone;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", toneClasses(tone))}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{label}</p>
        <p className="mt-1 truncate text-xs text-slate-400">{detail}</p>
      </div>
      <span className={cn("text-xs font-bold", toneClasses(tone).split(" ")[0])}>{status}</span>
    </div>
  );
}

function SupportResistanceLevels({
  currentPrice,
  support,
  resistance
}: {
  currentPrice: number;
  resistance: PriceZone | null;
  support: PriceZone | null;
}) {
  const levels = [
    { label: "R3", price: (resistance?.price ?? currentPrice + 38) + 18, type: "Resistance" },
    { label: "R2", price: (resistance?.price ?? currentPrice + 30) + 8, type: "Resistance" },
    { label: "R1", price: resistance?.price ?? currentPrice + 16, type: "Resistance" },
    { label: "P", price: currentPrice, type: "Pivot" },
    { label: "S1", price: support?.price ?? currentPrice - 16, type: "Support" },
    { label: "S2", price: (support?.price ?? currentPrice - 26) - 8, type: "Support" },
    { label: "S3", price: (support?.price ?? currentPrice - 34) - 18, type: "Support" }
  ];
  const min = Math.min(...levels.map((level) => level.price));
  const max = Math.max(...levels.map((level) => level.price));

  return (
    <section className="premium-panel rounded-xl p-5">
      <h2 className="text-base font-semibold uppercase text-white">Support & Resistance Levels</h2>
      <div className="mt-5 space-y-4">
        {levels.map((level) => {
          const position = ((level.price - min) / Math.max(1, max - min)) * 100;
          const tone = level.type === "Resistance" ? "bg-emerald-400" : level.type === "Support" ? "bg-rose-500" : "bg-blue-400";
          return (
            <div key={level.label} className="grid grid-cols-[34px_84px_1fr] items-center gap-4 text-sm">
              <span className="font-semibold text-slate-300">{level.label}</span>
              <span className="text-slate-300">{formatPrice(level.price)}</span>
              <span className="relative h-2 rounded-full bg-white/[0.06]">
                <span className={cn("absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full shadow-[0_0_18px_currentColor]", tone)} style={{ left: `${position}%` }} />
                <span className={cn("absolute top-1/2 h-px -translate-y-1/2", tone)} style={{ left: `${Math.max(0, position - 22)}%`, width: "44%" }} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-slate-400">
        <span className="flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-emerald-400" />Resistance</span>
        <span className="flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-blue-400" />Pivot</span>
        <span className="flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-rose-500" />Support</span>
      </div>
    </section>
  );
}

function QualityEngine({ scores }: { scores: ReturnType<typeof getDerivedScores> }) {
  const rows = [
    { label: "Entry Quality", value: scores.momentum },
    { label: "Risk Quality", value: 100 - scores.volatility * 0.25 },
    { label: "Session Quality", value: scores.sessionQuality },
    { label: "News Quality", value: 100 - scores.newsRisk },
    { label: "Trend Quality", value: scores.trendStrength }
  ];

  return (
    <section className="premium-panel rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold uppercase text-white">Trade Quality Engine</h2>
          <p className="mt-1 text-xs text-slate-400">Execution grade from trend, session, risk, news, and momentum alignment.</p>
        </div>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-lg font-bold text-emerald-300">
          {grade(scores.quality)}
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

function AiHeadGraphic() {
  return (
    <div className="relative hidden min-h-52 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-violet-500/10 lg:flex">
      <div className="absolute bottom-6 h-14 w-44 rounded-full border border-cyan-300/20 bg-cyan-300/10 blur-sm" />
      <svg className="relative h-56 w-56" viewBox="0 0 240 240" fill="none" aria-hidden="true">
        <path d="M116 28C82 31 58 58 55 93c-2 23 6 41 22 58v31c0 8 7 15 15 15h58c9 0 15-7 15-15v-21c16-13 25-33 25-56 0-45-32-79-74-77Z" fill="rgba(34,211,238,0.08)" stroke="rgba(34,211,238,0.42)" strokeWidth="2" />
        <path d="M87 82c23-18 55-16 76 8M82 119c30 14 61 11 91-10M95 158c20 11 41 10 62-3" stroke="rgba(124,92,255,0.8)" strokeWidth="2" strokeLinecap="round" />
        {Array.from({ length: 26 }).map((_, index) => {
          const angle = (index / 26) * Math.PI * 2;
          const radius = 36 + (index % 6) * 10;
          const x = 120 + Math.cos(angle) * radius;
          const y = 112 + Math.sin(angle) * radius;
          return <circle key={index} cx={x.toFixed(3)} cy={y.toFixed(3)} r={index % 5 === 0 ? 3 : 2} fill={index % 4 === 0 ? "#22d3ee" : "#7c5cff"} />;
        })}
        {Array.from({ length: 18 }).map((_, index) => {
          const a = (index / 18) * Math.PI * 2;
          const b = (((index * 5) % 18) / 18) * Math.PI * 2;
          const x1 = 120 + Math.cos(a) * 58;
          const x2 = 120 + Math.cos(b) * 44;
          const y1 = 112 + Math.sin(a) * 58;
          const y2 = 112 + Math.sin(b) * 44;
          return (
            <line
              key={index}
              x1={x1.toFixed(3)}
              x2={x2.toFixed(3)}
              y1={y1.toFixed(3)}
              y2={y2.toFixed(3)}
              stroke="rgba(96,165,250,0.38)"
            />
          );
        })}
      </svg>
    </div>
  );
}

function ReasoningPanel({
  analysis,
  scores
}: {
  analysis: AnalysisResult;
  scores: ReturnType<typeof getDerivedScores>;
}) {
  const passed = analysis.signal.rules.filter((rule) => rule.matched);
  const missed = analysis.signal.rules.filter((rule) => !rule.matched);
  const signalType = formatSignal(analysis.signal.signalType, analysis.signal.confidence);
  const tone = recommendationTone(analysis.signal.signalType);

  return (
    <section className="premium-panel rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold uppercase text-white">AI Reasoning Panel</h2>
          <p className="mt-1 text-xs text-slate-400">Why the current recommendation was generated.</p>
        </div>
        <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", toneClasses(tone))}>{signalType}</span>
      </div>
      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <p className={cn("text-2xl font-bold", toneClasses(tone).split(" ")[0])}>{signalType} Signal</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{analysis.signal.explanation}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {passed.slice(0, 6).map((rule) => (
            <ReasonRow key={rule.label} rule={rule} matched />
          ))}
          {missed.slice(0, 3).map((rule) => (
            <ReasonRow key={rule.label} rule={rule} matched={false} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <span className="text-sm text-slate-400">Confidence</span>
          <span className="text-xl font-bold text-white">{formatPercent(analysis.signal.confidence)}</span>
          <div className="h-2 min-w-44 flex-1 rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-300" style={{ width: `${analysis.signal.confidence}%` }} />
          </div>
          <span className="text-sm font-bold text-cyan-300">AI Score {Math.round(scores.quality)}/100</span>
        </div>
      </div>
    </section>
  );
}

function ReasonRow({ matched, rule }: { matched: boolean; rule: SignalRuleResult }) {
  return (
    <div className="flex gap-3 rounded-lg border border-white/10 bg-black/15 p-3">
      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", matched ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300")}>
        {matched ? <CheckCircle2 size={15} aria-hidden="true" /> : <AlertTriangle size={15} aria-hidden="true" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{rule.label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{rule.detail}</p>
      </div>
    </div>
  );
}

function getNarrative(analysis: AnalysisResult, scores: ReturnType<typeof getDerivedScores>) {
  const bias = biasFromAnalysis(analysis).toLowerCase();
  const signal = formatSignal(analysis.signal.signalType, analysis.signal.confidence);
  const support = nearestZone(analysis.indicators.supportZones, analysis.currentPrice, "support");
  const resistance = nearestZone(analysis.indicators.resistanceZones, analysis.currentPrice, "resistance");

  if (signal === "BUY") {
    return `The market remains ${bias} as price continues to hold above key trend filters. Liquidity conditions are ${statusForScore(scores.liquidity).toLowerCase()} during the ${scores.session} session, while news risk is controlled. Current probability favors bullish continuation while support near ${formatPrice(support?.price)} holds.`;
  }

  if (signal === "SELL") {
    return `The market is leaning ${bias} as price trades below important moving averages and momentum is weakening. Liquidity remains ${statusForScore(scores.liquidity).toLowerCase()}, but traders should respect resistance near ${formatPrice(resistance?.price)} and avoid late entries after expansion candles.`;
  }

  return `The market is currently mixed. Trend, momentum, session quality, and news risk do not yet create a full precision setup. The AI recommendation is to wait for cleaner confirmation around support near ${formatPrice(support?.price)} or resistance near ${formatPrice(resistance?.price)}.`;
}

export function AiAnalysisClient({ initialAnalysis }: { initialAnalysis: AnalysisResult }) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [timeframe, setTimeframe] = useState<AiTimeframe>(initialAnalysis.timeframe as AiTimeframe);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(initialAnalysis.notice ?? null);

  const scores = useMemo(() => getDerivedScores(analysis), [analysis]);
  const latest = analysis.candles[analysis.candles.length - 1];
  const bias = biasFromAnalysis(analysis);
  const support = useMemo(() => nearestZone(analysis.indicators.supportZones, analysis.currentPrice, "support"), [analysis.currentPrice, analysis.indicators.supportZones]);
  const resistance = useMemo(() => nearestZone(analysis.indicators.resistanceZones, analysis.currentPrice, "resistance"), [analysis.currentPrice, analysis.indicators.resistanceZones]);
  const recommendation = formatSignal(analysis.signal.signalType, analysis.signal.confidence);
  const recTone = recommendationTone(analysis.signal.signalType);
  const marketCondition = analysis.indicators.trend === "ranging" ? "Range Market" : `${bias} Structure`;
  const radarItems = [
    { label: "Trend", value: scores.trendStrength },
    { label: "Momentum", value: scores.momentum },
    { label: "Volatility", value: scores.volatility },
    { label: "Liquidity", value: scores.liquidity },
    { label: "News Risk", value: 100 - scores.newsRisk },
    { label: "Session", value: scores.sessionQuality }
  ];
  const signalSpark = analysis.candles.slice(-10).map((candle) => candle.close);

  const refreshAnalysis = useCallback(async (next: AiTimeframe) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/signal?symbol=XAUUSD&timeframe=${next}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to refresh AI analysis.");
      }

      const payload = (await response.json()) as AnalysisResult;
      setAnalysis(payload);
      setMessage(payload.notice ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to refresh AI analysis.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleTimeframe(next: AiTimeframe) {
    setTimeframe(next);
    await refreshAnalysis(next);
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-white">AI Analysis Center</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            AI-powered market analysis and trading recommendations for XAUUSD.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200">
            <CalendarDays size={15} className="text-cyan-300" aria-hidden="true" />
            {latest ? formatDateTime(latest.time) : "Latest market time"}
          </span>
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-400/10 disabled:opacity-60"
            disabled={loading}
            onClick={() => refreshAnalysis(timeframe)}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : undefined} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-gold-400/25 bg-gold-400/10 px-4 py-3 text-sm text-gold-100">
          {message}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard badge={marketCondition} helper="Market bias" icon={TrendingUp} label="Market Bias" sparkValues={signalSpark} tone={bias === "Bearish" ? "red" : bias === "Bullish" ? "green" : "gold"} trend={analysis.indicators.trend} value={bias.toUpperCase()} />
        <KpiCard badge={grade(analysis.signal.confidence)} helper="AI model confidence" icon={BrainCircuit} label="AI Confidence" sparkValues={[50, 58, 62, analysis.signal.confidence - 8, analysis.signal.confidence]} tone="violet" trend={analysis.signal.strength} value={formatPercent(analysis.signal.confidence)} />
        <KpiCard badge={statusForScore(scores.trendStrength)} helper="EMA + structure" icon={BarChart3} label="Trend Strength" sparkValues={[28, 42, 58, 67, scores.trendStrength]} tone="green" trend="Directional pressure" value={`${Math.round(scores.trendStrength)}/100`} />
        <KpiCard badge={scores.session} helper="Session liquidity" icon={DatabaseZap} label="Liquidity Score" sparkValues={[50, 61, 69, scores.liquidity - 4, scores.liquidity]} tone="cyan" trend="Market participation" value={`${Math.round(scores.liquidity)}/100`} />
        <KpiCard badge={statusForScore(scores.volatility)} helper="ATR volatility model" icon={Waves} label="Volatility Score" sparkValues={[22, 36, 48, scores.volatility - 7, scores.volatility]} tone={scores.volatility > 70 ? "red" : "gold"} trend="Expected movement" value={`${Math.round(scores.volatility)}/100`} />
        <KpiCard badge={grade(scores.quality)} helper="Final recommendation" icon={Target} label="AI Recommendation" sparkValues={signalSpark} tone={recTone} trend={`Target ${formatPrice(analysis.signal.takeProfit1)}`} value={recommendation} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="premium-panel rounded-xl p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <h2 className="text-base font-semibold uppercase text-white">AI Command Center</h2>
              <p className="mt-1 text-xs text-slate-400">Current recommendation with confidence, grade, session, condition, and risk context.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAME_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  disabled={loading}
                  onClick={() => handleTimeframe(tab.value)}
                  className={cn(
                    "h-9 rounded-lg border px-3 text-xs font-bold transition disabled:opacity-60",
                    timeframe === tab.value
                      ? "border-violet-300/40 bg-violet-500 text-white shadow-[0_12px_30px_rgba(124,92,255,0.25)]"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/30 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_180px]">
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.02] p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Current Recommendation</p>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <p className={cn("text-5xl font-black tracking-normal", toneClasses(recTone).split(" ")[0])}>{recommendation}</p>
                <span className={cn("rounded-full border px-3 py-1 text-sm font-bold", toneClasses(recTone))}>{grade(scores.quality)} Grade</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Confidence Score", formatPercent(analysis.signal.confidence)],
                  ["Market Condition", marketCondition],
                  ["Current Session", scores.session],
                  ["News Risk", scores.newsRisk > 60 ? "High" : scores.newsRisk > 42 ? "Medium" : "Low"]
                ].map(([label, value]) => (
                  <div key={label} className="glass-tile rounded-xl p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
                    <p className="mt-2 text-lg font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Planning Levels</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <span className="text-sm text-slate-300">Entry <b className="block text-white">{formatPrice(analysis.signal.entryPrice)}</b></span>
                  <span className="text-sm text-slate-300">Target <b className="block text-emerald-300">{formatPrice(analysis.signal.takeProfit1)}</b></span>
                  <span className="text-sm text-slate-300">Stop <b className="block text-rose-300">{formatPrice(analysis.signal.stopLoss)}</b></span>
                </div>
              </div>
            </div>
            <RingGauge label="Confidence" score={analysis.signal.confidence} tone={recTone} />
          </div>
        </section>

        <section className="premium-panel rounded-xl p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-base font-semibold uppercase text-white">Market Structure Analysis</h2>
              <p className="mt-1 text-xs text-slate-400">Higher highs, higher lows, support, resistance, and active trade levels.</p>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-bold uppercase", toneClasses(recTone))}>
              {marketCondition}
            </span>
          </div>
          <div className="mt-4">
            <MarketStructureChart candles={analysis.candles} currentPrice={analysis.currentPrice} resistance={resistance} signalType={analysis.signal.signalType} support={support} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="glass-tile rounded-xl p-4">
              <p className="text-xs text-slate-400">Bullish Structure</p>
              <p className="mt-2 text-xl font-bold text-emerald-300">{bias === "Bullish" ? "Active" : "Watching"}</p>
            </div>
            <div className="glass-tile rounded-xl p-4">
              <p className="text-xs text-slate-400">Bearish Structure</p>
              <p className="mt-2 text-xl font-bold text-rose-300">{bias === "Bearish" ? "Active" : "Inactive"}</p>
            </div>
            <div className="glass-tile rounded-xl p-4">
              <p className="text-xs text-slate-400">Range Market</p>
              <p className="mt-2 text-xl font-bold text-gold-400">{analysis.indicators.trend === "ranging" ? "Active" : "Low"}</p>
            </div>
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold uppercase text-white">Market Bias Radar</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(280px,0.92fr)_1fr]">
            <RadarChart items={radarItems} score={scores.quality} />
            <div className="space-y-3">
              <FactorRow detail={analysis.currentPrice > (analysis.indicators.ema50 ?? analysis.currentPrice) ? "Price is above EMA50" : "Price is below EMA50"} icon={Activity} label="EMA Structure" status={bias} tone={bias === "Bearish" ? "red" : bias === "Bullish" ? "green" : "gold"} />
              <FactorRow detail={`RSI at ${(analysis.indicators.rsi14 ?? 50).toFixed(1)}`} icon={Gauge} label="RSI Analysis" status={(analysis.indicators.rsi14 ?? 50) > 70 ? "Overbought" : (analysis.indicators.rsi14 ?? 50) < 30 ? "Oversold" : "Neutral"} tone="cyan" />
              <FactorRow detail={`MACD bias is ${analysis.indicators.macd.bias}`} icon={LineChart} label="MACD Analysis" status={analysis.indicators.macd.bias} tone={analysis.indicators.macd.bias.includes("bear") || analysis.indicators.macd.bias === "weakening" ? "red" : "green"} />
              <FactorRow detail={`Nearest support ${formatPrice(support?.price)}`} icon={Crosshair} label="Support / Resistance" status={`${Math.round(scores.supportResistance)}/100`} tone="blue" />
              <FactorRow detail={`${scores.session} session participation`} icon={DatabaseZap} label="Liquidity" status={statusForScore(scores.liquidity)} tone="violet" />
              <FactorRow detail="Scheduled risk model for USD events" icon={ShieldAlert} label="News Impact" status={scores.newsRisk > 60 ? "High" : scores.newsRisk > 42 ? "Medium" : "Low"} tone={scores.newsRisk > 60 ? "red" : "gold"} />
            </div>
          </div>
        </section>

        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold uppercase text-white">Technical Intelligence Center</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["EMA Analysis", `EMA50 ${formatPrice(analysis.indicators.ema50)} / EMA200 ${formatPrice(analysis.indicators.ema200)}`, analysis.indicators.trend, Layers3, bias === "Bearish" ? "red" : "green"],
              ["RSI Analysis", `RSI ${formatPrice(analysis.indicators.rsi14)}`, (analysis.indicators.rsi14 ?? 50) > 70 ? "Overbought" : (analysis.indicators.rsi14 ?? 50) < 30 ? "Oversold" : "Neutral", CircleGauge, "cyan"],
              ["MACD Analysis", `Histogram ${formatPrice(analysis.indicators.macd.histogram)}`, analysis.indicators.macd.bias, Waves, analysis.indicators.macd.bias.includes("bear") ? "red" : "green"],
              ["Support & Resistance", `Support ${formatPrice(support?.price)} / Resistance ${formatPrice(resistance?.price)}`, `${Math.round(scores.supportResistance)}/100 Strength`, LocateFixed, "blue"]
            ].map(([title, detail, value, Icon, tone]) => (
              <div key={title as string} className="glass-tile rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneClasses(tone as Tone))}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title as string}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{detail as string}</p>
                    <p className={cn("mt-3 text-lg font-bold", toneClasses(tone as Tone).split(" ")[0])}>{value as string}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="glass-tile rounded-xl p-3 text-center"><p className="text-xs text-slate-400">Higher Highs</p><p className="mt-2 text-lg font-bold text-emerald-300">{bias === "Bullish" ? "3" : "1"}</p></div>
            <div className="glass-tile rounded-xl p-3 text-center"><p className="text-xs text-slate-400">Higher Lows</p><p className="mt-2 text-lg font-bold text-emerald-300">{bias === "Bullish" ? "3" : "1"}</p></div>
            <div className="glass-tile rounded-xl p-3 text-center"><p className="text-xs text-slate-400">Lower Highs</p><p className="mt-2 text-lg font-bold text-rose-300">{bias === "Bearish" ? "3" : "1"}</p></div>
            <div className="glass-tile rounded-xl p-3 text-center"><p className="text-xs text-slate-400">Lower Lows</p><p className="mt-2 text-lg font-bold text-rose-300">{bias === "Bearish" ? "3" : "1"}</p></div>
          </div>
        </section>
      </section>

      <ReasoningPanel analysis={analysis} scores={scores} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SupportResistanceLevels currentPrice={analysis.currentPrice} resistance={resistance} support={support} />

        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold uppercase text-white">Liquidity Intelligence</h2>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <RingGauge label="Liquidity" score={scores.liquidity} size={132} tone="cyan" />
            <div className="flex-1 space-y-4">
              {[
                ["Liquidity Score", scores.liquidity],
                ["Session Liquidity", scores.sessionQuality],
                ["Smart Money Activity", scores.liquidity - 8],
                ["Market Participation", scores.liquidity + 4]
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-xs text-slate-400"><span>{label as string}</span><span>{Math.round(Number(value))}/100</span></div>
                  <div className="mt-2 h-2 rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-300" style={{ width: `${clamp(Number(value), 0, 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold uppercase text-white">Volatility Center</h2>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <RingGauge label="Volatility" score={scores.volatility} size={132} tone={scores.volatility > 70 ? "red" : "gold"} />
            <div className="flex-1 space-y-4">
              {[
                ["Current Volatility", scores.volatility],
                ["Historical Volatility", scores.volatility * 0.88],
                ["Expected Volatility", scores.volatility * 1.08]
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-xs text-slate-400"><span>{label as string}</span><span>{statusForScore(Number(value))}</span></div>
                  <div className="mt-2 h-2 rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-rose-400" style={{ width: `${clamp(Number(value), 0, 100)}%` }} /></div>
                </div>
              ))}
              <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-300">
                Forecast: <b className="text-white">{scores.volatility > 78 ? "Extreme" : scores.volatility > 58 ? "High" : scores.volatility > 38 ? "Medium" : "Low"}</b>
              </p>
            </div>
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold uppercase text-white">News Impact Analysis</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-[150px_1fr]">
            <RingGauge label="Risk" score={100 - scores.newsRisk} size={132} tone={scores.newsRisk > 60 ? "red" : "green"} />
            <div className="space-y-3">
              {[
                ["CPI", "Gold Impact", scores.newsRisk > 55 ? "High" : "Medium"],
                ["NFP", "USD Impact", "Medium"],
                ["FOMC", "Market Risk", scores.newsRisk > 55 ? "High" : "Low"],
                ["Fed Speeches", "Headline Risk", "Medium"]
              ].map(([event, metric, risk]) => (
                <div key={event} className="grid grid-cols-[70px_1fr_80px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm">
                  <span className="font-semibold text-white">{event}</span>
                  <span className="text-slate-400">{metric}</span>
                  <span className={cn("text-right font-bold", risk === "High" ? "text-rose-300" : risk === "Medium" ? "text-gold-400" : "text-emerald-300")}>{risk}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">AI News Summary</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              USD event risk is currently {scores.newsRisk > 60 ? "elevated" : scores.newsRisk > 42 ? "moderate" : "contained"}. Gold sensitivity should be monitored around high-impact releases, but current technical confirmation remains the primary driver.
            </p>
          </div>
        </section>

        <section className="premium-panel rounded-xl p-5">
          <h2 className="text-base font-semibold uppercase text-white">Session Intelligence</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(Object.entries(SESSION_DATA) as Array<[SessionName, (typeof SESSION_DATA)[SessionName]]>).map(([session, meta]) => {
              const active = session === scores.session;
              return (
                <div key={session} className={cn("rounded-xl border p-4 transition", active ? "border-emerald-400/35 bg-emerald-400/10 shadow-[0_0_30px_rgba(52,211,153,0.1)]" : "border-white/10 bg-white/[0.035]")}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{session}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", active ? toneClasses("green") : toneClasses("neutral"))}>{active ? "Active" : meta.strength}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{meta.hours}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <span className="rounded-lg bg-white/[0.04] p-2 text-slate-400">Strength <b className="block text-white">{meta.score}</b></span>
                    <span className="rounded-lg bg-white/[0.04] p-2 text-slate-400">Opportunity <b className="block text-cyan-300">{Math.round((meta.score + scores.trendStrength) / 2)}</b></span>
                    <span className="rounded-lg bg-white/[0.04] p-2 text-slate-400">History <b className="block text-emerald-300">{meta.performance}%</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="premium-panel rounded-xl p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-violet-300" aria-hidden="true" />
            <h2 className="text-base font-semibold uppercase text-white">AI Market Narrative</h2>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_220px]">
            <div>
              <p className="text-sm leading-7 text-slate-300">{getNarrative(analysis, scores)}</p>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Key Takeaways</p>
                <div className="mt-3 space-y-3 text-sm text-slate-300">
                  {[
                    `${bias} market bias with ${statusForScore(scores.trendStrength).toLowerCase()} trend strength`,
                    `Nearest support is ${formatPrice(support?.price)} and resistance is ${formatPrice(resistance?.price)}`,
                    `${scores.session} session liquidity score is ${Math.round(scores.liquidity)}/100`,
                    `Final recommendation remains ${recommendation}`
                  ].map((item) => (
                    <p key={item} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />{item}</p>
                  ))}
                </div>
              </div>
            </div>
            <AiHeadGraphic />
          </div>
        </section>

        <QualityEngine scores={scores} />
      </section>

      <section className="premium-panel rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Network size={17} className="text-cyan-300" aria-hidden="true" />
          <h2 className="text-base font-semibold uppercase text-white">Bottom Intelligence Summary</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ["Best Setup", analysis.signal.strength === "Hold" ? "Wait for confirmation" : "Trend pullback", Target, "text-emerald-300"],
            ["Highest Probability Direction", bias, TrendingUp, bias === "Bearish" ? "text-rose-300" : "text-emerald-300"],
            ["Market Risk Level", scores.newsRisk > 60 ? "High" : scores.newsRisk > 42 ? "Medium" : "Low", ShieldAlert, scores.newsRisk > 60 ? "text-rose-300" : "text-gold-400"],
            ["Best Trading Session", scores.session, Clock3, "text-cyan-300"],
            ["Best Timeframe", TIMEFRAME_TABS.find((tab) => tab.value === timeframe)?.label ?? "H1", BarChart3, "text-violet-300"],
            ["Final AI Recommendation", recommendation, Zap, toneClasses(recTone).split(" ")[0]]
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
          <BrainCircuit size={15} className="text-violet-300" aria-hidden="true" />
          AI models explain the current rule-based signal and market context. This is not financial advice.
        </p>
        <p className="flex items-center gap-2">
          Model: Gold AI v2.1
          <span className="rounded-md bg-emerald-400/15 px-2 py-1 font-semibold text-emerald-300">Live</span>
        </p>
      </section>
    </div>
  );
}
