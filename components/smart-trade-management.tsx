"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Lock,
  MoveRight,
  RadioTower,
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
import { type AnalysisResult } from "@/lib/types";
import { clamp, cn, formatPrice } from "@/lib/utils";

type Tone = "green" | "red" | "gold" | "cyan" | "violet" | "neutral";

const toneClasses: Record<Tone, string> = {
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200",
  gold: "border-gold-400/25 bg-gold-400/10 text-gold-300",
  green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  neutral: "border-white/10 bg-white/[0.045] text-slate-300",
  red: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-200"
};

const toneVisuals: Record<Tone, { glow: string; icon: string; progress: string; soft: string; text: string }> = {
  cyan: {
    glow: "from-cyan-300/24 to-cyan-300/0",
    icon: "border-cyan-300/30 bg-cyan-300/12 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.12)]",
    progress: "from-cyan-400 to-sky-200",
    soft: "bg-cyan-300/[0.055]",
    text: "text-cyan-200"
  },
  gold: {
    glow: "from-gold-400/24 to-gold-400/0",
    icon: "border-gold-400/30 bg-gold-400/12 text-gold-300 shadow-[0_0_28px_rgba(248,193,74,0.12)]",
    progress: "from-gold-400 to-amber-200",
    soft: "bg-gold-400/[0.055]",
    text: "text-gold-300"
  },
  green: {
    glow: "from-emerald-400/24 to-emerald-400/0",
    icon: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.12)]",
    progress: "from-emerald-500 to-cyan-300",
    soft: "bg-emerald-400/[0.055]",
    text: "text-emerald-300"
  },
  neutral: {
    glow: "from-slate-300/14 to-slate-300/0",
    icon: "border-white/12 bg-white/[0.055] text-slate-300",
    progress: "from-slate-400 to-slate-200",
    soft: "bg-white/[0.035]",
    text: "text-slate-300"
  },
  red: {
    glow: "from-rose-500/24 to-rose-500/0",
    icon: "border-rose-400/30 bg-rose-400/12 text-rose-300 shadow-[0_0_28px_rgba(251,113,133,0.12)]",
    progress: "from-rose-500 to-orange-300",
    soft: "bg-rose-400/[0.055]",
    text: "text-rose-300"
  },
  violet: {
    glow: "from-violet-500/28 to-violet-500/0",
    icon: "border-violet-400/30 bg-violet-500/14 text-violet-200 shadow-[0_0_30px_rgba(124,92,255,0.14)]",
    progress: "from-violet-500 to-fuchsia-300",
    soft: "bg-violet-500/[0.055]",
    text: "text-violet-200"
  }
};

function pointValue(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} pts`;
}

function distanceValue(value: number) {
  return `${Math.max(0, value).toFixed(2)} pts`;
}

function currentSession(now = new Date()) {
  const hour = now.getUTCHours();

  if (hour >= 13 && hour < 16) return "London + NY";
  if (hour >= 7 && hour < 13) return "London";
  if (hour >= 16 && hour < 22) return "New York";
  if (hour >= 0 && hour < 7) return "Tokyo";
  return "Sydney";
}

function directionalDistance(params: { current: number; direction: "BUY" | "SELL"; target: number }) {
  return params.direction === "BUY" ? params.target - params.current : params.current - params.target;
}

function targetReached(params: { current: number; direction: "BUY" | "SELL"; target: number }) {
  return directionalDistance(params) <= 0;
}

function volatilityLevel(atr: number | null, price: number) {
  const score = ((atr ?? price * 0.0018) / Math.max(price, 1)) * 10_000;

  if (score >= 75) return { label: "High", score: Math.round(clamp(score, 0, 100)), tone: "red" as Tone };
  if (score >= 42) return { label: "Medium", score: Math.round(clamp(score, 0, 100)), tone: "gold" as Tone };
  return { label: "Low", score: Math.round(clamp(score, 0, 100)), tone: "green" as Tone };
}

function ManagementStat({
  detail,
  icon: Icon,
  label,
  tone,
  value,
  progress
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: Tone;
  value: string;
  progress: number;
}) {
  const visual = toneVisuals[tone];

  return (
    <div className={cn("glass-tile interactive-lift relative overflow-hidden rounded-xl border p-4", toneClasses[tone])}>
      <div className={cn("absolute -right-8 -top-10 h-28 w-32 rounded-full bg-gradient-to-bl blur-2xl", visual.glow)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className={cn("mt-2 truncate text-xl font-semibold", visual.text)}>{value}</p>
        </div>
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border", visual.icon)}>
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      <p className="relative mt-2 text-xs leading-5 text-slate-400">{detail}</p>
      <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={cn("h-full rounded-full bg-gradient-to-r", visual.progress)} style={{ width: `${clamp(progress, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function MonitorRow({ icon: Icon, label, tone = "neutral", value }: { icon?: LucideIcon; label: string; tone?: Tone; value: string }) {
  const visual = toneVisuals[tone];

  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-sm transition hover:border-white/15", visual.soft)}>
      <span className="flex min-w-0 items-center gap-2 text-slate-400">
        {Icon ? <Icon size={14} className={visual.text} aria-hidden="true" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />}
        <span className="truncate">{label}</span>
      </span>
      <span className={cn("text-right font-semibold", visual.text)}>{value}</span>
    </div>
  );
}

function AlertRow({
  detail,
  icon: Icon,
  title,
  tone
}: {
  detail: string;
  icon: LucideIcon;
  title: string;
  tone: Tone;
}) {
  const visual = toneVisuals[tone];

  return (
    <div className={cn("interactive-lift relative overflow-hidden rounded-xl border p-3.5", toneClasses[tone])}>
      <div className={cn("absolute -right-10 -top-10 h-24 w-28 rounded-full bg-gradient-to-bl blur-2xl", visual.glow)} />
      <div className="relative flex items-start gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border", visual.icon)}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function SmartTradeManagement({ analysis }: { analysis: AnalysisResult }) {
  const [trailingEnabled, setTrailingEnabled] = useState(false);
  const [trailDistance, setTrailDistance] = useState(3);
  const [breakEvenMarked, setBreakEvenMarked] = useState(false);
  const direction = analysis.signal.signalType === "SELL" ? "SELL" : "BUY";
  const hasActiveTrade = analysis.signal.signalType !== "HOLD";
  const entry = analysis.signal.entryPrice;
  const current = analysis.currentPrice;
  const managementPlan = analysis.signal.tradeManagement;

  const model = useMemo(() => {
    const riskDistance = Math.max(0.01, Math.abs(entry - analysis.signal.stopLoss));
    const tp3 = managementPlan?.tp3 ?? (direction === "BUY" ? entry + riskDistance * 3 : entry - riskDistance * 3);
    const profitPoints = hasActiveTrade ? (direction === "BUY" ? current - entry : entry - current) : 0;
    const progress = clamp((profitPoints / Math.abs(tp3 - entry)) * 100, 0, 100);
    const volatility = managementPlan
      ? {
          label: managementPlan.volatilityLevel,
          score: managementPlan.volatilityLevel === "Extreme" ? 100 : managementPlan.volatilityLevel === "High" ? 82 : managementPlan.volatilityLevel === "Medium" ? 58 : 28,
          tone: managementPlan.volatilityLevel === "Extreme" || managementPlan.volatilityLevel === "High" ? "red" as Tone : managementPlan.volatilityLevel === "Medium" ? "gold" as Tone : "green" as Tone
        }
      : volatilityLevel(analysis.indicators.atr14, current);
    const tp1Reached = hasActiveTrade && targetReached({ current, direction, target: analysis.signal.takeProfit1 });
    const tp2Reached = hasActiveTrade && targetReached({ current, direction, target: analysis.signal.takeProfit2 });
    const tp3Reached = hasActiveTrade && targetReached({ current, direction, target: tp3 });
    const breakEvenReady = hasActiveTrade && profitPoints >= (managementPlan?.breakEvenAtPoints ?? 3);
    const riskFreeReady = hasActiveTrade && profitPoints >= (managementPlan?.riskFreeAtPoints ?? 4);
    const breakEvenStatus = breakEvenMarked ? "Activated" : breakEvenReady ? "Ready" : "Not Ready";
    const tradeProtection = breakEvenMarked || riskFreeReady ? "Risk-Free" : breakEvenReady ? "Protected" : "Unprotected";
    const currentRisk = hasActiveTrade ? Math.max(0, direction === "BUY" ? current - analysis.signal.stopLoss : analysis.signal.stopLoss - current) : 0;
    const riskStatus = !hasActiveTrade
      ? "Standby"
      : currentRisk <= riskDistance * 0.35 || profitPoints >= 0
        ? "Safe"
        : currentRisk <= riskDistance * 0.75
          ? "Caution"
          : "High Risk";
    const statusTone: Tone = riskStatus === "Safe" ? "green" : riskStatus === "Caution" ? "gold" : riskStatus === "High Risk" ? "red" : "neutral";

    const alerts = [
      breakEvenReady
        ? {
            detail: "Trade is now in profit. Recommendation: move stop loss to break even.",
            icon: Zap,
            title: "Break Even Alert",
            tone: "gold" as Tone
          }
        : null,
      riskFreeReady
        ? {
            detail: "Risk-free trade is available. Suggested action: move stop loss to entry price.",
            icon: ShieldCheck,
            title: "Risk-Free Trade Available",
            tone: "green" as Tone
          }
        : null,
      tp1Reached
        ? {
            detail: "Recommendation: close 30%, move stop loss to break even, protect capital.",
            icon: Target,
            title: "TP1 Reached",
            tone: "cyan" as Tone
          }
        : null,
      tp2Reached
        ? {
            detail: "Recommendation: close additional 30% and activate trailing stop.",
            icon: Target,
            title: "TP2 Reached",
            tone: "violet" as Tone
          }
        : null,
      tp3Reached
        ? {
            detail: "Final target reached. Trade management sequence completed.",
            icon: Trophy,
            title: "Final Target Reached",
            tone: "green" as Tone
          }
        : null,
      trailingEnabled
        ? {
            detail: `Trailing stop is active with a ${trailDistance}-point trail distance.`,
            icon: RadioTower,
            title: "Trailing Stop Alert",
            tone: "cyan" as Tone
          }
        : null,
      volatility.label === "High"
        ? {
            detail: "High volatility detected. Protect existing trades and consider partial profit taking before CPI, NFP, FOMC, or Fed speeches.",
            icon: AlertTriangle,
            title: "News Protection Alert",
            tone: "red" as Tone
          }
        : null
    ].filter(Boolean) as Array<{ detail: string; icon: LucideIcon; title: string; tone: Tone }>;

    const assistantRecommendation = !hasActiveTrade
      ? "No active directional setup. Hold position and wait for cleaner confirmation."
      : tp3Reached
        ? "Final target reached. Trade successfully completed."
        : tp2Reached
          ? "TP2 reached. Consider closing additional 30% and activating trailing stop."
          : tp1Reached
            ? "TP1 reached. Consider closing 30% and moving stop loss to break even."
            : riskFreeReady
              ? "Move stop loss to entry price. Risk-free trade available."
              : breakEvenReady
                ? "Move stop loss to break even. Protect existing profit."
                : volatility.label === "High" || volatility.label === "Extreme"
                  ? "High volatility ahead. Consider reducing risk or taking partial profit."
                  : profitPoints > 0
                    ? managementPlan?.exitReview.recommendation ?? "Trade is positive. Hold position while monitoring momentum and TP distance."
                    : "Trade is not yet protected. Keep risk tight and avoid adding exposure.";

    return {
      alerts,
      assistantRecommendation,
      breakEvenReady,
      breakEvenStatus,
      currentRisk,
      expectedProfitPercent: (Math.abs(tp3 - entry) / Math.max(entry, 1)) * 100,
      profitPoints,
      progress,
      riskDistance,
      riskFreeReady,
      riskStatus,
      statusTone,
      tp1Distance: directionalDistance({ current, direction, target: analysis.signal.takeProfit1 }),
      tp1Reached,
      tp2Distance: directionalDistance({ current, direction, target: analysis.signal.takeProfit2 }),
      tp2Reached,
      tp3,
      tp3Distance: directionalDistance({ current, direction, target: tp3 }),
      tp3Reached,
      tradeProtection,
      volatility
    };
  }, [analysis.indicators.atr14, analysis.signal, breakEvenMarked, current, direction, entry, hasActiveTrade, managementPlan, trailDistance, trailingEnabled]);

  const progressLabels = [
    { label: "Entry", price: entry, reached: true },
    { label: "TP1", price: analysis.signal.takeProfit1, reached: model.tp1Reached },
    { label: "TP2", price: analysis.signal.takeProfit2, reached: model.tp2Reached },
    { label: "TP3", price: model.tp3, reached: model.tp3Reached }
  ];

  return (
    <section className="premium-panel overflow-hidden rounded-xl p-4 lg:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles size={18} className="text-violet-300" aria-hidden="true" />
            <p className="text-lg font-semibold text-white">Smart Trade Management</p>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-cyan-200">
              Analysis only
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Protect capital, secure profits, monitor live trade progress, and manage break-even decisions without executing broker orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition hover:bg-white/[0.06]", breakEvenMarked ? toneClasses.green : toneClasses.neutral)}
            onClick={() => setBreakEvenMarked((currentValue) => !currentValue)}
          >
            <Lock size={14} aria-hidden="true" />
            {breakEvenMarked ? "BE Marked" : "Mark BE"}
          </button>
          <button
            type="button"
            className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition hover:bg-white/[0.06]", trailingEnabled ? toneClasses.cyan : toneClasses.neutral)}
            onClick={() => setTrailingEnabled((currentValue) => !currentValue)}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            Trail {trailingEnabled ? "Active" : "Disabled"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_1.25fr_0.9fr]">
        <div className="space-y-4">
          <div className={cn("glass-tile relative overflow-hidden rounded-xl border p-4", hasActiveTrade ? (direction === "BUY" ? "border-emerald-400/25" : "border-rose-400/25") : "border-gold-400/20")}>
            <div className={cn("absolute -right-8 -top-12 h-40 w-44 rounded-full bg-gradient-to-bl blur-2xl", hasActiveTrade ? (direction === "BUY" ? toneVisuals.green.glow : toneVisuals.red.glow) : toneVisuals.gold.glow)} />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Active Trade</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-semibold text-white">XAUUSD</span>
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", hasActiveTrade ? (direction === "BUY" ? toneClasses.green : toneClasses.red) : toneClasses.gold)}>
                    {hasActiveTrade ? direction : "HOLD"}
                  </span>
                </div>
              </div>
              <span className={cn("grid h-12 w-12 place-items-center rounded-xl border", hasActiveTrade ? (direction === "BUY" ? toneVisuals.green.icon : toneVisuals.red.icon) : toneVisuals.gold.icon)}>
                {direction === "SELL" ? <TrendingDown size={20} aria-hidden="true" /> : <TrendingUp size={20} aria-hidden="true" />}
              </span>
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-3 text-sm">
              <MonitorRow icon={Target} label="Entry Price" value={formatPrice(entry)} />
              <MonitorRow icon={RadioTower} label="Current Price" value={formatPrice(current)} />
              <MonitorRow icon={CircleDollarSign} label="Current P/L" value={pointValue(model.profitPoints)} tone={model.profitPoints >= 0 ? "green" : "red"} />
              <MonitorRow icon={Activity} label="Session" value={currentSession()} tone="cyan" />
              <MonitorRow icon={Gauge} label="Volatility" value={model.volatility.label} tone={model.volatility.tone} />
              <MonitorRow icon={Sparkles} label="Signal State" value={analysis.signal.signalType} tone={hasActiveTrade ? "violet" : "gold"} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <ManagementStat
              detail={model.breakEvenReady ? "Profit threshold reached." : `${distanceValue(3 - model.profitPoints)} until +3 pts.`}
              icon={Zap}
              label="Break Even Status"
              progress={model.breakEvenStatus === "Activated" ? 100 : model.breakEvenStatus === "Ready" ? 74 : 28}
              tone={model.breakEvenStatus === "Activated" ? "green" : model.breakEvenStatus === "Ready" ? "gold" : "neutral"}
              value={model.breakEvenStatus}
            />
            <ManagementStat
              detail={model.tradeProtection === "Unprotected" ? "SL remains exposed." : "Capital protection condition met."}
              icon={ShieldCheck}
              label="Trade Protection"
              progress={model.tradeProtection === "Risk-Free" ? 100 : model.tradeProtection === "Protected" ? 70 : 24}
              tone={model.tradeProtection === "Risk-Free" ? "green" : model.tradeProtection === "Protected" ? "cyan" : "red"}
              value={model.tradeProtection}
            />
            <ManagementStat
              detail={`Current risk distance ${distanceValue(model.currentRisk)}.`}
              icon={model.statusTone === "red" ? AlertTriangle : Gauge}
              label="Risk Status"
              progress={model.statusTone === "green" ? 88 : model.statusTone === "gold" ? 58 : model.statusTone === "red" ? 86 : 32}
              tone={model.statusTone}
              value={model.riskStatus}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-tile rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <MoveRight size={14} className="text-cyan-300" aria-hidden="true" />
                  Trade Progress Tracker
                </p>
                <p className="mt-1 text-sm text-white">Entry to final target management path</p>
              </div>
              <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
                {model.progress.toFixed(0)}% progress
              </span>
            </div>

            <div className="relative mt-7 pb-9 pt-4">
              <div className="absolute left-5 right-5 top-8 h-1 rounded-full bg-slate-800" />
              <div
                className="absolute left-5 top-8 h-1 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-violet-400 shadow-[0_0_28px_rgba(34,211,238,0.26)]"
                style={{ width: `calc((100% - 2.5rem) * ${model.progress / 100})` }}
              />
              <div
                className="absolute top-[22px] z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.8)]"
                style={{ left: `calc(1.25rem + (100% - 2.5rem) * ${model.progress / 100})` }}
              />
              <div className="relative z-20 grid grid-cols-4 gap-2">
                {progressLabels.map((item) => (
                  <div key={item.label} className="text-center">
                    <span className={cn("mx-auto grid h-10 w-10 place-items-center rounded-full border text-xs font-bold", item.reached ? toneClasses.green : toneClasses.neutral)}>
                      {item.reached ? <CheckCircle2 size={16} aria-hidden="true" /> : item.label}
                    </span>
                    <p className="mt-3 text-xs font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{formatPrice(item.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MonitorRow label="Current Position" value={`${model.progress.toFixed(0)}%`} tone="cyan" />
              <MonitorRow label="Remaining Distance" value={distanceValue(model.tp3Distance)} />
              <MonitorRow label="Expected Profit" value={`${model.expectedProfitPercent.toFixed(2)}%`} tone="green" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-tile rounded-xl p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Target size={14} className="text-gold-300" aria-hidden="true" />
                Take Profit Monitor
              </p>
              <div className="mt-4 space-y-2">
                <MonitorRow icon={Target} label="TP1 Distance" value={distanceValue(model.tp1Distance)} tone={model.tp1Reached ? "green" : "neutral"} />
                <MonitorRow icon={Target} label="TP2 Distance" value={distanceValue(model.tp2Distance)} tone={model.tp2Reached ? "green" : "neutral"} />
                <MonitorRow icon={Trophy} label="TP3 Distance" value={distanceValue(model.tp3Distance)} tone={model.tp3Reached ? "green" : "neutral"} />
                <MonitorRow icon={Gauge} label="Progress" value={`${model.progress.toFixed(0)}%`} tone="violet" />
              </div>
            </div>

            <div className="glass-tile rounded-xl p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <SlidersHorizontal size={14} className="text-cyan-300" aria-hidden="true" />
                Trailing Stop Management
              </p>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-300">Trailing Stop Status</span>
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", trailingEnabled ? toneClasses.green : toneClasses.neutral)}>
                    {trailingEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[2, 3, 5].map((distance) => (
                    <button
                      key={distance}
                      type="button"
                      className={cn("h-9 rounded-lg border text-xs font-semibold transition hover:border-cyan-300/35 hover:bg-cyan-300/10", trailDistance === distance ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.035] text-slate-300")}
                      onClick={() => setTrailDistance(distance)}
                    >
                      {distance} pts
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-400">Current trail distance: <span className="font-semibold text-white">{trailDistance} points</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-4 shadow-[0_0_40px_rgba(124,92,255,0.12)]">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-400/30 bg-violet-400/15 text-violet-200">
                <Sparkles size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">AI Trade Assistant</p>
                <p className="mt-2 text-base font-semibold leading-6 text-white">{model.assistantRecommendation}</p>
              </div>
            </div>
          </div>

          <div className="glass-tile rounded-xl p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Sparkles size={14} className="text-violet-300" aria-hidden="true" />
              Smart Exit Decision
            </p>
            <div className="mt-4 space-y-2">
              <MonitorRow
                icon={Activity}
                label="AI Action"
                value={managementPlan?.aiAction ?? model.assistantRecommendation}
                tone={managementPlan?.aiAction === "Partial Close" ? "gold" : managementPlan?.aiAction === "Hold" ? "green" : "cyan"}
              />
              <MonitorRow
                icon={TrendingUp}
                label="Continuation Chance"
                value={`${managementPlan?.continuationProbability ?? 0}%`}
                tone="green"
              />
              <MonitorRow
                icon={TrendingDown}
                label="Reversal Risk"
                value={`${managementPlan?.reversalRisk ?? 0}%`}
                tone={(managementPlan?.reversalRisk ?? 0) >= 50 ? "red" : "gold"}
              />
              <MonitorRow icon={MoveRight} label="Expected Move" value={managementPlan?.expectedMove ?? "--"} tone="cyan" />
            </div>
            {managementPlan?.exitReview.reasons.length ? (
              <div className="mt-3 space-y-1.5">
                {managementPlan.exitReview.reasons.slice(0, 4).map((reason) => (
                  <p key={reason} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs leading-5 text-slate-300">
                    {reason}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="glass-tile rounded-xl p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <RadioTower size={14} className="text-cyan-300" aria-hidden="true" />
              Live Trade Monitor
            </p>
            <div className="mt-4 space-y-2">
              <MonitorRow icon={Target} label="Entry Price" value={formatPrice(entry)} />
              <MonitorRow icon={RadioTower} label="Current Price" value={formatPrice(current)} />
              <MonitorRow icon={CircleDollarSign} label="Current Profit" value={pointValue(model.profitPoints)} tone={model.profitPoints >= 0 ? "green" : "red"} />
              <MonitorRow icon={ShieldCheck} label="Current Risk" value={distanceValue(model.currentRisk)} tone={model.statusTone} />
              <MonitorRow icon={Zap} label="Distance To BE" value={distanceValue(3 - model.profitPoints)} tone={model.breakEvenReady ? "green" : "gold"} />
              <MonitorRow icon={Target} label="Distance To TP1" value={distanceValue(model.tp1Distance)} />
              <MonitorRow icon={Target} label="Distance To TP2" value={distanceValue(model.tp2Distance)} />
              <MonitorRow icon={Trophy} label="Distance To TP3" value={distanceValue(model.tp3Distance)} />
            </div>
          </div>

          <div className="glass-tile rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-gold-400" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">News Protection</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Before CPI, NFP, FOMC, or Fed speeches: protect existing trades and consider partial profit taking.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {(model.alerts.length ? model.alerts : [
          {
            detail: "No active management alert. Continue monitoring entry, risk, and take-profit distances.",
            icon: Gauge,
            title: "Trade Monitor Stable",
            tone: "neutral" as Tone
          }
        ]).map((alert) => (
          <AlertRow key={alert.title} detail={alert.detail} icon={alert.icon} title={alert.title} tone={alert.tone} />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-slate-400">
        This section is an analysis dashboard only. It does not move stop loss, close positions, activate trailing stops, or execute broker orders.
      </div>
    </section>
  );
}
