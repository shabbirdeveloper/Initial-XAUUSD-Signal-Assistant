"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  Flame,
  Gauge,
  HeartPulse,
  LineChart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  type LucideIcon
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import type {
  AiCoachData,
  CoachBehaviorMetric,
  CoachGoal,
  CoachReportType,
  CoachRoadmapStep,
  CoachTone
} from "@/lib/ai-coach-data";
import { clamp, cn } from "@/lib/utils";

type Tone = CoachTone;
type Grade = "A+" | "A" | "B" | "C";
type ReportType = CoachReportType;

type Kpi = {
  label: string;
  score: number;
  helper: string;
  badge: string;
  icon: LucideIcon;
  tone: Tone;
  values: number[];
};

type BehaviorMetric = CoachBehaviorMetric;
type RoadmapStep = CoachRoadmapStep;
type Goal = CoachGoal;

const scoreTrend = [42, 51, 57, 64, 68, 71, 76, 74, 81, 84, 80, 86];
const disciplineTrend = [58, 61, 66, 70, 72, 76, 78, 81, 79, 83, 82, 86];
const consistencyTrend = [49, 53, 59, 62, 66, 64, 69, 72, 70, 75, 78, 80];
const riskTrend = [64, 67, 70, 73, 77, 75, 79, 81, 80, 83, 84, 86];
const emotionTrend = [52, 56, 54, 62, 66, 70, 68, 74, 73, 78, 81, 84];
const coachTrend = [61, 65, 69, 74, 76, 79, 82, 85, 83, 87, 89, 91];

const behaviorMetrics: BehaviorMetric[] = [
  {
    detail: "Three days exceeded the preferred session cap. Most came after a losing trade.",
    frequency: "3 flags",
    impact: 72,
    label: "Overtrading",
    riskLevel: "Medium"
  },
  {
    detail: "One trade was taken within 18 minutes of a full loss. Pause rule should trigger sooner.",
    frequency: "1 flag",
    impact: 54,
    label: "Revenge Trading",
    riskLevel: "Medium"
  },
  {
    detail: "Fast M5 breakouts create most late entries. Wait for retest confirmation.",
    frequency: "4 flags",
    impact: 76,
    label: "FOMO Entries",
    riskLevel: "High"
  },
  {
    detail: "Emotion log shows better results when you mark calm or confident before entry.",
    frequency: "2 flags",
    impact: 48,
    label: "Emotional Trading",
    riskLevel: "Low"
  },
  {
    detail: "You followed your plan on 83% of reviewed trades. Strong but not yet elite.",
    frequency: "17% miss",
    impact: 62,
    label: "Rule Violations",
    riskLevel: "Medium"
  },
  {
    detail: "Risk stayed below 1% on most trades. One New York trade exceeded the preferred cap.",
    frequency: "1 flag",
    impact: 42,
    label: "Risk Violations",
    riskLevel: "Low"
  }
];

const disciplineHeatmap = [
  { week: "Jun 1 - Jun 7", values: [85, 90, 75, 80, 70, null, null] },
  { week: "Jun 8 - Jun 14", values: [88, 92, 85, 78, 65, 72, null] },
  { week: "Jun 15 - Jun 19", values: [90, 85, 83, 79, 88, null, null] }
];

const emotionRows = [
  { label: "Fear", value: 18, impact: -0.32, tone: "red" as Tone },
  { label: "Greed", value: 22, impact: -0.45, tone: "red" as Tone },
  { label: "FOMO", value: 31, impact: -0.58, tone: "gold" as Tone },
  { label: "Confidence", value: 74, impact: 1.24, tone: "green" as Tone },
  { label: "Patience", value: 60, impact: 0.92, tone: "cyan" as Tone },
  { label: "Discipline", value: 82, impact: 1.48, tone: "green" as Tone }
];

const performanceCards = [
  { label: "Best Session", value: "London", detail: "Win rate is 28% higher than your average.", tone: "green" as Tone },
  { label: "Worst Session", value: "Late New York", detail: "Most losses happen after volatility fades.", tone: "red" as Tone },
  { label: "Best Timeframe", value: "M30", detail: "Cleaner structure and fewer impulse entries.", tone: "green" as Tone },
  { label: "Worst Timeframe", value: "M5", detail: "FOMO entries appear 2.4x more often.", tone: "gold" as Tone },
  { label: "Best Setup", value: "EMA Pullback", detail: "Best blend of patience, RR, and confirmation.", tone: "green" as Tone },
  { label: "Worst Setup", value: "Late Breakout", detail: "Often entered after price already expanded.", tone: "red" as Tone }
];

const roadmap: RoadmapStep[] = [
  { detail: "Limit to 3 high-quality setups per day. No extra trades after two losses.", progress: 82, title: "Reduce Overtrading", week: "Week 1" },
  { detail: "Only take trades with 1:1.8 or better unless there is a planned partial exit.", progress: 64, title: "Improve RR", week: "Week 2" },
  { detail: "Prioritize London and London/New York overlap. Avoid thin liquidity windows.", progress: 76, title: "Focus London Session", week: "Week 3" },
  { detail: "Block trades 60 minutes around CPI, NFP, FOMC, and Fed speeches.", progress: 48, title: "Avoid News Volatility", week: "Week 4" }
];

const goals: Goal[] = [
  { current: 66.7, detail: "Win rate over last 24 reviewed trades.", label: "Reach 70% Win Rate", target: 70, unit: "%" },
  { current: 1.87, detail: "Average realized R multiple.", label: "Improve RR to 2.0", target: 2, unit: "R" },
  { current: 6.42, detail: "Current drawdown from latest peak.", label: "Reduce Drawdown", target: 5, unit: "%" },
  { current: 82, detail: "Rule-following and emotional discipline.", label: "Improve Discipline", target: 90, unit: "%" }
];

const reports: Record<ReportType, { title: string; strengths: string[]; weaknesses: string[]; achievements: string[]; improve: string[] }> = {
  Daily: {
    achievements: ["No trade exceeded 1% risk today.", "You waited for confirmation on 2 of 3 setups."],
    improve: ["Skip the final New York impulse trade.", "Write emotion notes before entry, not after exit."],
    strengths: ["Risk stayed controlled.", "London setup selection was clean."],
    title: "Daily Coach Report",
    weaknesses: ["One FOMO entry appeared after price expansion.", "Patience dropped during late session."]
  },
  Weekly: {
    achievements: ["Discipline improved by 14%.", "Average RR moved from 1.62R to 1.87R."],
    improve: ["Reduce M5 exposure.", "Pause after two consecutive losses."],
    strengths: ["London session win rate leads all sessions.", "Risk management is stable."],
    title: "Weekly Coach Report",
    weaknesses: ["FOMO entries still drive most losses.", "Late New York trades weaken performance."]
  },
  Monthly: {
    achievements: ["Consistency score rose by 18 points.", "Best month for rule compliance so far."],
    improve: ["Build a stricter news filter.", "Avoid scaling into weak liquidity."],
    strengths: ["Strategy execution is becoming systematic.", "EMA pullback setups show repeatable edge."],
    title: "Monthly Coach Report",
    weaknesses: ["Overtrading clusters after strong winning streaks.", "Drawdown recovery is slower after impulsive losses."]
  }
};

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

function grade(score: number): Grade {
  if (score >= 88) return "A+";
  if (score >= 76) return "A";
  if (score >= 62) return "B";
  return "C";
}

function colorForTone(tone: Tone) {
  return {
    blue: "#2d8cff",
    cyan: "#22d3ee",
    gold: "#f8c14a",
    green: "#34d399",
    neutral: "#94a3b8",
    red: "#fb7185",
    violet: "#7c5cff"
  }[tone];
}

function percentWidth(value: number) {
  return `${clamp(value, 0, 100).toFixed(0)}%`;
}

function linePath(values: number[], width = 180, height = 70, pad = 6) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const points = values.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const area = `M ${points[0].x.toFixed(2)} ${height - pad} ${points.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")} L ${points[points.length - 1].x.toFixed(2)} ${height - pad} Z`;
  return { area, path };
}

function MiniSparkline({ tone, values }: { tone: Tone; values: number[] }) {
  const color = colorForTone(tone);
  const path = linePath(values);

  return (
    <svg className="h-14 w-32 shrink-0" viewBox="0 0 180 70" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d={path.area} fill={color} opacity="0.16" />
      <path d={path.path} stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoreRing({ score, tone, size = "large" }: { score: number; tone: Tone; size?: "large" | "medium" }) {
  const color = colorForTone(tone);
  const dimension = size === "large" ? "h-28 w-28" : "h-20 w-20";
  const inner = size === "large" ? "h-[82px] w-[82px]" : "h-14 w-14";

  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full", dimension)}
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(51,65,85,0.58) 0deg)` }}
    >
      <div className={cn("grid place-items-center rounded-full bg-ink-950/95 shadow-[inset_0_0_18px_rgba(255,255,255,0.04)]", inner)}>
        <div className="text-center">
          <p className={cn("font-semibold text-white", size === "large" ? "text-3xl" : "text-xl")}>{score}</p>
          <p className="text-[11px] text-slate-400">/100</p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;

  return (
    <section className="premium-panel interactive-lift overflow-hidden rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("grid h-8 w-8 place-items-center rounded-lg border", toneClasses(kpi.tone))}>
              <Icon size={16} aria-hidden="true" />
            </span>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{kpi.label}</p>
          </div>
          <div className="mt-4">
            <ScoreRing score={kpi.score} tone={kpi.tone} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-end">
          <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", toneClasses(kpi.tone))}>{kpi.badge}</span>
          <p className="mt-3 text-xs text-slate-400">{kpi.helper}</p>
          <MiniSparkline tone={kpi.tone} values={kpi.values} />
        </div>
      </div>
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
        {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">{eyebrow}</p> : null}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MentorHead({ compact = false }: { compact?: boolean }) {
  const rawId = useId().replace(/:/g, "");
  const ids = {
    brainGlow: `${rawId}-mentor-brain-glow`,
    circuitGradient: `${rawId}-mentor-circuit-gradient`,
    cyanGlow: `${rawId}-mentor-cyan-glow`,
    faceGlass: `${rawId}-mentor-face-glass`,
    headMetal: `${rawId}-mentor-head-metal`,
    hologram: `${rawId}-mentor-hologram`,
    shellStroke: `${rawId}-mentor-shell-stroke`,
    violetGlow: `${rawId}-mentor-violet-glow`
  };

  return (
    <div className={cn("relative grid place-items-center overflow-hidden rounded-xl", compact ? "h-56" : "h-full min-h-[300px]")}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(124,92,255,0.34),transparent_31%),radial-gradient(circle_at_48%_66%,rgba(34,211,238,0.16),transparent_42%),radial-gradient(circle_at_70%_42%,rgba(14,165,233,0.1),transparent_28%)]" />
      <svg
        className="relative h-full w-full max-w-sm"
        viewBox="0 0 340 320"
        fill="none"
        role="img"
        aria-label="Futuristic robotic AI trading mentor head with pulsing neural circuits"
      >
        <rect x="18" y="24" width="304" height="258" rx="34" fill={`url(#${ids.hologram})`} opacity="0.18">
          <animate attributeName="opacity" values="0.12;0.22;0.12" dur="5.8s" repeatCount="indefinite" />
        </rect>
        <g opacity="0.7">
          <ellipse cx="170" cy="158" rx="126" ry="36" stroke="#22d3ee" strokeOpacity="0.24" strokeWidth="1.2" strokeDasharray="4 9">
            <animateTransform attributeName="transform" type="rotate" from="0 170 158" to="360 170 158" dur="22s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="170" cy="158" rx="86" ry="126" stroke="#8b5cf6" strokeOpacity="0.22" strokeWidth="1.1" strokeDasharray="3 12">
            <animateTransform attributeName="transform" type="rotate" from="360 170 158" to="0 170 158" dur="28s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="170" cy="158" rx="108" ry="108" stroke="#a78bfa" strokeOpacity="0.13" strokeWidth="1" strokeDasharray="2 14">
            <animateTransform attributeName="transform" type="rotate" from="0 170 158" to="-360 170 158" dur="34s" repeatCount="indefinite" />
          </ellipse>
        </g>

        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="7.5s" repeatCount="indefinite" />
          <g>
            <animateTransform attributeName="transform" type="rotate" values="-1.7 170 162;1.8 170 162;-1.7 170 162" dur="9.5s" repeatCount="indefinite" />

            <path
              d="M122 54 96 80l-17 53 10 64 31 49 17 44h70l17-44 30-49 10-65-18-52-27-26-48-12-49 12Z"
              fill={`url(#${ids.headMetal})`}
              stroke={`url(#${ids.shellStroke})`}
              strokeWidth="2.2"
              filter={`url(#${ids.violetGlow})`}
            />
            <path
              d="M124 76 103 100l-9 37 9 56 24 35 12 36h64l12-36 24-35 9-56-10-38-22-23-45-11-47 11Z"
              fill={`url(#${ids.faceGlass})`}
              stroke="#91e8ff"
              strokeOpacity="0.24"
              strokeWidth="1"
            >
              <animate attributeName="opacity" values="0.82;0.96;0.82" dur="4.8s" repeatCount="indefinite" />
            </path>

            <path d="M126 103 111 137l12 12h38l7-37-42-9Z" fill="#08182a" fillOpacity="0.72" stroke="#22d3ee" strokeOpacity="0.32" />
            <path d="M215 103 230 137l-12 12h-39l-7-37 43-9Z" fill="#08182a" fillOpacity="0.72" stroke="#22d3ee" strokeOpacity="0.32" />
            <path d="M119 134h42l-7 8h-39l4-8Z" fill="#22d3ee" filter={`url(#${ids.cyanGlow})`}>
              <animate attributeName="opacity" values="0.55;1;0.55" dur="3s" repeatCount="indefinite" />
            </path>
            <path d="M221 134h-42l7 8h39l-4-8Z" fill="#8b5cf6" filter={`url(#${ids.violetGlow})`}>
              <animate attributeName="opacity" values="0.45;0.95;0.45" dur="3.3s" repeatCount="indefinite" />
            </path>

            <path d="M153 111h37l-6 84h-25l-6-84Z" fill="#0b1730" fillOpacity="0.62" stroke="#a78bfa" strokeOpacity="0.28" />
            <path d="M146 216h50l-9 16h-32l-9-16Z" fill="#101b35" stroke="#22d3ee" strokeOpacity="0.22" />
            <path d="M136 242h70M129 262h83" stroke="#7c5cff" strokeOpacity="0.44" strokeWidth="2" strokeLinecap="round" />

            <g filter={`url(#${ids.brainGlow})`}>
              <path d="M134 92c8-24 31-35 54-27 20 7 32 24 31 44-1 24-20 42-45 43-27 1-49-20-45-47 1-5 3-9 5-13Z" fill="#111a3a" fillOpacity="0.84" />
              <path d="M147 105c10-16 27-23 44-18 13 4 21 14 22 27 1 17-13 29-32 29-20 0-36-14-37-31" stroke={`url(#${ids.circuitGradient})`} strokeWidth="2" strokeLinecap="round" strokeDasharray="11 10">
                <animate attributeName="stroke-dashoffset" values="0;-84" dur="4s" repeatCount="indefinite" />
              </path>
              <path d="M154 86c5 15 15 23 31 24 15 1 25 9 29 23M135 116c16-4 28 0 37 11 8 9 18 12 31 7M171 69v75" stroke="#22d3ee" strokeOpacity="0.52" strokeWidth="1.4" strokeLinecap="round" />
              {[
                [148, 106, 3.5, "#22d3ee"],
                [162, 86, 3.2, "#c4b5fd"],
                [182, 110, 4, "#8b5cf6"],
                [205, 129, 3.4, "#22d3ee"],
                [171, 141, 3.6, "#e0e7ff"],
                [133, 120, 2.8, "#22d3ee"]
              ].map(([cx, cy, r, fill], index) => (
                <circle key={`${cx}-${cy}`} cx={cx as number} cy={cy as number} r={r as number} fill={fill as string}>
                  <animate attributeName="r" values={`${r};${Number(r) + 1.5};${r}`} dur={`${2.6 + index * 0.25}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;1;0.55" dur={`${2.6 + index * 0.25}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </g>

            <path d="M117 183c21-9 38-10 53-2 18 9 34 8 55-3" stroke={`url(#${ids.circuitGradient})`} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="10 12">
              <animate attributeName="stroke-dashoffset" values="0;-90" dur="5s" repeatCount="indefinite" />
            </path>
            <path d="M112 202c28 20 91 20 119 0" stroke="#22d3ee" strokeOpacity="0.22" strokeWidth="1.5" />
            <path d="M139 79 96 132M202 80l43 53M111 218l-41 35M228 218l42 35" stroke="#8b5cf6" strokeOpacity="0.28" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </g>

        <g filter={`url(#${ids.cyanGlow})`}>
          {[
            [68, 83, 2.2, "0.4s"],
            [271, 77, 2.4, "1.1s"],
            [49, 173, 1.9, "1.6s"],
            [286, 190, 2.1, "0.8s"],
            [101, 279, 1.8, "2.1s"],
            [249, 267, 2, "2.7s"],
            [54, 238, 1.5, "3.2s"],
            [297, 121, 1.6, "2.4s"]
          ].map(([cx, cy, r, delay]) => (
            <circle key={`${cx}-${cy}`} cx={cx as number} cy={cy as number} r={r as number} fill="#22d3ee" opacity="0.72">
              <animate attributeName="cy" values={`${cy};${Number(cy) - 10};${cy}`} dur="6s" begin={delay as string} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;0.9;0.2" dur="6s" begin={delay as string} repeatCount="indefinite" />
            </circle>
          ))}
        </g>

        <path id={`${rawId}-mentor-flow-a`} d="M58 250 C96 210 126 197 167 202 C212 207 241 179 283 137" stroke="transparent" />
        <path id={`${rawId}-mentor-flow-b`} d="M286 88 C240 100 225 123 214 158 C200 202 159 225 98 222" stroke="transparent" />
        <circle r="3" fill="#22d3ee" filter={`url(#${ids.cyanGlow})`}>
          <animateMotion dur="6.5s" repeatCount="indefinite">
            <mpath href={`#${rawId}-mentor-flow-a`} />
          </animateMotion>
        </circle>
        <circle r="2.5" fill="#a78bfa" filter={`url(#${ids.violetGlow})`}>
          <animateMotion dur="7.4s" begin="1.2s" repeatCount="indefinite">
            <mpath href={`#${rawId}-mentor-flow-b`} />
          </animateMotion>
        </circle>

        <defs>
          <radialGradient id={ids.hologram} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(172 145) rotate(90) scale(142 176)">
            <stop stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="0.48" stopColor="#7c5cff" stopOpacity="0.2" />
            <stop offset="1" stopColor="#020812" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={ids.headMetal} x1="92" x2="252" y1="48" y2="284" gradientUnits="userSpaceOnUse">
            <stop stopColor="#eef8ff" stopOpacity="0.34" />
            <stop offset="0.18" stopColor="#7dd3fc" stopOpacity="0.22" />
            <stop offset="0.56" stopColor="#111b36" stopOpacity="0.86" />
            <stop offset="1" stopColor="#030712" stopOpacity="0.96" />
          </linearGradient>
          <linearGradient id={ids.faceGlass} x1="107" x2="233" y1="72" y2="259" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a5f3fc" stopOpacity="0.2" />
            <stop offset="0.42" stopColor="#172554" stopOpacity="0.36" />
            <stop offset="1" stopColor="#070b18" stopOpacity="0.82" />
          </linearGradient>
          <linearGradient id={ids.shellStroke} x1="91" x2="252" y1="52" y2="277" gradientUnits="userSpaceOnUse">
            <stop stopColor="#dbeafe" stopOpacity="0.74" />
            <stop offset="0.35" stopColor="#22d3ee" stopOpacity="0.58" />
            <stop offset="0.72" stopColor="#8b5cf6" stopOpacity="0.7" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0.24" />
          </linearGradient>
          <linearGradient id={ids.circuitGradient} x1="112" x2="232" y1="86" y2="213" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" />
            <stop offset="0.52" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#60a5fa" />
          </linearGradient>
          <filter id={ids.cyanGlow} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.133 0 0 0 0 0.827 0 0 0 0 0.933 0 0 0 0.8 0" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={ids.violetGlow} x="-28%" y="-28%" width="156%" height="156%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.486 0 0 0 0 0.361 0 0 0 0 1 0 0 0 0.75 0" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={ids.brainGlow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.58 0 0 0 0 0.36 0 0 0 0 1 0 0 0 0.92 0" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}

function CommandCenter({ data }: { data: AiCoachData["commandCenter"] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="AI Coach Command Center" eyebrow="Personal Mentor" />
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Current Trading Rating</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <h2 className="text-4xl font-semibold tracking-tight text-white">{data.rating}</h2>
            <span className="mb-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
              Grade {data.grade}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            {data.description}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ProgressTile label="Weekly Progress" value={data.weeklyProgress} detail="Discipline gain" tone="green" />
            <ProgressTile label="Monthly Progress" value={data.monthlyProgress} detail="Overall score" tone="violet" />
            <ProgressTile label="Improvement Trend" value={data.improvementTrend} detail="4-week slope" tone="cyan" />
          </div>
        </div>
        <div className="grid min-w-48 place-items-center rounded-xl border border-violet-400/20 bg-violet-500/10 p-5">
          <ScoreRing score={data.score} tone="violet" />
          <p className="mt-3 text-center text-sm font-semibold text-white">Trading Score</p>
          <p className="mt-1 text-center text-xs text-slate-400">{data.monthlyProgress} vs latest baseline</p>
        </div>
      </div>
    </section>
  );
}

function ProgressTile({ detail, label, tone, value }: { detail: string; label: string; tone: Tone; value: string }) {
  return (
    <div className="glass-tile rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", toneClasses(tone).split(" ").find((item) => item.startsWith("text-")))}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function PersonalCoach({ data }: { data: AiCoachData["personalCoach"] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="AI Personal Coach" />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.1fr]">
        <MentorHead />
        <div className="space-y-3">
          <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-4">
            <p className="text-xs uppercase text-slate-400">Today&apos;s Coaching Message</p>
            <p className="mt-2 text-lg font-semibold leading-7 text-white">
              {data.message}
            </p>
          </div>
          {data.insights.map((item) => (
            <div key={item.label} className="glass-tile interactive-lift rounded-xl p-3">
              <div className="flex items-start gap-3">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border", toneClasses(item.tone))}>
                  <Sparkles size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", toneClasses(item.tone))}>{item.tag}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{item.text}</p>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/20 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/30"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Ask AI Mentor
          </button>
        </div>
      </div>
    </section>
  );
}

function WeeklyReport({ data }: { data: AiCoachData["weeklyReport"] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="Weekly Coaching Report"
        action={
          <button type="button" className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300">
            This Week
            <ChevronDown size={13} aria-hidden="true" />
          </button>
        }
      />
      <div className="flex flex-wrap items-center gap-5">
        <ScoreRing score={data.score} tone="green" size="medium" />
        <div>
          <p className="text-4xl font-semibold text-emerald-300">{data.grade}</p>
          <p className="mt-1 text-sm font-semibold text-white">{data.headline}</p>
          <p className="mt-1 text-xs text-slate-400">Based on saved journal, signal, and backtest data.</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 border-y border-white/10 py-4 text-center text-xs">
        {data.metrics.map((metric) => (
          <StatBlock key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} />
        ))}
      </div>
      <div className="mt-4 space-y-2 text-xs">
        {data.takeaways.map((item) => (
          <p key={item.text} className={cn("flex items-start gap-2", item.tone === "gold" ? "text-gold-300" : item.tone === "red" ? "text-rose-300" : "text-slate-300")}>
            {item.tone === "gold" || item.tone === "red" ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-gold-300" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />}
            {item.text}
          </p>
        ))}
      </div>
    </section>
  );
}

function StatBlock({ label, tone, value }: { label: string; tone?: Tone; value: string }) {
  const toneText = tone ? toneClasses(tone).split(" ").find((item) => item.startsWith("text-")) : "text-white";

  return (
    <div>
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className={cn("mt-1 font-semibold", toneText)}>{value}</p>
    </div>
  );
}

function ImprovementPath({ steps }: { steps: RoadmapStep[] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="AI Improvement Roadmap" />
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.week} className="grid grid-cols-[36px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className={cn("grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold", index < 2 ? "border-violet-400 bg-violet-500 text-white" : "border-white/15 bg-white/[0.035] text-slate-300")}>
                {index < 2 ? <CheckCircle2 size={15} aria-hidden="true" /> : index + 1}
              </span>
              {index < steps.length - 1 ? <span className="mt-1 h-12 w-px bg-violet-400/35" /> : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{step.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{step.detail}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <span className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-300" style={{ width: percentWidth(step.progress) }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MentorQuote() {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="AI Mentor" />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="flex flex-col justify-center">
          <p className="text-xl font-medium leading-8 text-white">
            &quot;Discipline is doing what you know needs to be done, even when you do not feel like doing it.&quot;
          </p>
          <p className="mt-3 text-sm text-slate-400">- AI Mentor</p>
        </div>
        <MentorHead compact />
      </div>
      <button
        type="button"
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/20 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/30"
      >
        <MessageCircle size={16} aria-hidden="true" />
        Ask AI Mentor
      </button>
    </section>
  );
}

function BehaviorAnalysis({ metrics }: { metrics: BehaviorMetric[] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Behavior Analysis Center" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="glass-tile interactive-lift rounded-xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{metric.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{metric.detail}</p>
              </div>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", riskTone(metric.riskLevel))}>{metric.riskLevel}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Frequency: <strong className="text-white">{metric.frequency}</strong></span>
              <span>Impact {metric.impact}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <span className={cn("block h-full rounded-full", metric.impact >= 70 ? "bg-rose-400" : metric.impact >= 55 ? "bg-gold-400" : "bg-emerald-400")} style={{ width: percentWidth(metric.impact) }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function riskTone(level: BehaviorMetric["riskLevel"]) {
  if (level === "High") return "border-rose-400/25 bg-rose-400/10 text-rose-300";
  if (level === "Medium") return "border-gold-400/25 bg-gold-400/10 text-gold-300";
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
}

function TraderDnaProfile({ profile }: { profile: AiCoachData["profile"] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Trader DNA Profile" />
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/8 p-4">
        <p className="text-xs uppercase text-slate-400">Personalized Profile</p>
        <p className="mt-1 text-2xl font-semibold text-cyan-200">{profile.title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {profile.description}
        </p>
      </div>
      <ProfileList title="Strengths" tone="green" items={profile.strengths} />
      <ProfileList title="Weaknesses" tone="red" items={profile.weaknesses} />
      <ProfileList title="Behavior Patterns" tone="violet" items={profile.patterns} />
    </section>
  );
}

function ProfileList({ items, title, tone }: { items: string[]; title: string; tone: Tone }) {
  return (
    <div className="mt-4">
      <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", toneClasses(tone).split(" ").find((item) => item.startsWith("text-")))}>{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-3 py-2 text-xs text-slate-300">
            <span className={cn("h-2 w-2 rounded-full", tone === "red" ? "bg-rose-400" : tone === "violet" ? "bg-violet-400" : "bg-emerald-400")} />
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function DisciplineAnalytics({ data }: { data: AiCoachData["discipline"] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="Discipline Analytics"
        action={
          <button type="button" className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs text-slate-300">
            Last 3 Weeks
            <ChevronDown size={13} aria-hidden="true" />
          </button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <DisciplineHeatmap rows={data.heatmap} />
        <div className="space-y-3">
          <MetricBar label="Discipline Score" value={data.score} tone={data.score >= 76 ? "green" : "gold"} />
          <MetricBar label="Rule Following" value={data.ruleFollowing} tone={data.ruleFollowing >= 76 ? "cyan" : "gold"} />
          <MetricBar label="Trade Frequency" value={data.tradeFrequency} tone={data.tradeFrequency >= 76 ? "green" : "gold"} />
          <MetricBar label="Risk Consistency" value={data.riskConsistency} tone={data.riskConsistency >= 76 ? "green" : "red"} />
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-slate-400">
            Mistake Rate <span className="float-right font-semibold text-gold-300">{data.mistakeRate}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DisciplineHeatmap({ rows }: { rows: Array<{ week: string; values: Array<number | null> }> }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      <div className="w-full min-w-0 max-w-full overflow-x-auto scrollbar-thin">
        <div className="grid min-w-[520px] grid-cols-[88px_repeat(7,minmax(45px,1fr))] gap-1 text-xs">
          <span />
          {days.map((day) => (
            <span key={day} className="text-center text-slate-400">{day}</span>
          ))}
          {rows.map((row) => (
            <HeatmapRow key={row.week} row={row} />
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-400">
        <Legend color="bg-emerald-500" label="90-100 Excellent" />
        <Legend color="bg-lime-500" label="80-89 Good" />
        <Legend color="bg-gold-400" label="70-79 Average" />
        <Legend color="bg-orange-500" label="60-69 Poor" />
        <Legend color="bg-rose-500" label="Below 60 Needs Work" />
      </div>
    </div>
  );
}

function HeatmapRow({ row }: { row: { week: string; values: Array<number | null> } }) {
  return (
    <>
      <span className="flex items-center text-slate-400">{row.week}</span>
      {row.values.map((value, index) => (
        <span key={`${row.week}-${index}`} className={cn("grid min-h-10 place-items-center rounded-md font-semibold", heatmapClass(value))}>
          {value ?? "-"}
        </span>
      ))}
    </>
  );
}

function heatmapClass(value: number | null) {
  if (value === null) return "bg-slate-800/45 text-slate-500";
  if (value >= 90) return "bg-emerald-500/55 text-white";
  if (value >= 80) return "bg-lime-500/45 text-white";
  if (value >= 70) return "bg-gold-400/55 text-white";
  if (value >= 60) return "bg-orange-500/55 text-white";
  return "bg-rose-500/55 text-white";
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
      {label}
    </span>
  );
}

function MetricBar({ label, tone, value }: { label: string; tone: Tone; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className={cn("font-semibold", toneClasses(tone).split(" ").find((item) => item.startsWith("text-")))}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <span className="block h-full rounded-full" style={{ background: colorForTone(tone), width: percentWidth(value) }} />
      </div>
    </div>
  );
}

function EmotionalIntelligence({ data }: { data: AiCoachData["emotions"] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Emotional Intelligence Center" />
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid place-items-center rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <ScoreRing score={data.score} tone="cyan" />
          <p className="mt-3 text-sm font-semibold text-white">Emotional Score</p>
          <p className="mt-1 text-xs text-slate-400">Based on journal emotion tags.</p>
        </div>
        <div className="space-y-3">
          {data.rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[96px_1fr_64px] items-center gap-3 text-xs">
              <span className="font-medium text-slate-300">{row.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <span className="block h-full rounded-full" style={{ background: colorForTone(row.tone), width: percentWidth(row.value) }} />
              </div>
              <span className={cn("text-right font-semibold", row.impact < 0 ? "text-rose-300" : "text-emerald-300")}>
                {row.impact > 0 ? "+" : ""}{row.impact.toFixed(2)}R
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PerformanceCoaching({ cards }: { cards: AiCoachData["performanceCards"] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Performance Coaching" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="glass-tile interactive-lift rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={cn("mt-1 text-lg font-semibold", toneClasses(card.tone).split(" ").find((item) => item.startsWith("text-")))}>{card.value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{card.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TradingHabits({ data }: { data: AiCoachData["habits"] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Trading Habits Analysis" />
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="grid place-items-center rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <ScoreRing score={data.habitScore} tone="green" />
          <p className="mt-3 text-sm font-semibold text-white">Habit Score</p>
          <p className="mt-1 text-xs text-slate-400">Positive habits</p>
        </div>
        <div className="space-y-3">
          {data.rows.map((habit) => (
            <div key={habit.label} className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-300">{habit.label}</span>
                  <span className="font-semibold text-white">{habit.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-violet-400" style={{ width: percentWidth(habit.score) }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GoalTracking({ goals: coachGoals }: { goals: Goal[] }) {
  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Goal Tracking Center" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {coachGoals.map((goal) => {
          const progress = goal.unit === "%" && goal.label.includes("Drawdown")
            ? clamp((goal.target / goal.current) * 100, 0, 100)
            : clamp((goal.current / goal.target) * 100, 0, 100);
          return (
            <div key={goal.label} className="glass-tile rounded-xl p-3">
              <p className="text-sm font-semibold text-white">{goal.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{goal.detail}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-xl font-semibold text-violet-200">{goal.current}{goal.unit}</span>
                <span className="text-xs text-slate-500">Target {goal.target}{goal.unit}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <span className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-300" style={{ width: percentWidth(progress) }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CoachReport({ reports: coachReports }: { reports: AiCoachData["reports"] }) {
  const [selected, setSelected] = useState<ReportType>("Weekly");
  const report = coachReports[selected];

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader
        title="AI Coach Report"
        action={
          <div className="flex rounded-lg border border-white/10 bg-white/[0.035] p-1">
            {(["Daily", "Weekly", "Monthly"] as ReportType[]).map((item) => (
              <button
                key={item}
                type="button"
                data-testid={`coach-report-${item.toLowerCase()}`}
                className={cn("h-8 rounded-md px-3 text-xs font-semibold transition", selected === item ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white")}
                onClick={() => setSelected(item)}
              >
                {item}
              </button>
            ))}
          </div>
        }
      />
      <h3 className="text-xl font-semibold text-white" data-testid="coach-report-title">{report.title}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReportList title="Strengths" items={report.strengths} tone="green" />
        <ReportList title="Weaknesses" items={report.weaknesses} tone="red" />
        <ReportList title="Achievements" items={report.achievements} tone="cyan" />
        <ReportList title="Areas To Improve" items={report.improve} tone="gold" />
      </div>
    </section>
  );
}

function ReportList({ items, title, tone }: { items: string[]; title: string; tone: Tone }) {
  return (
    <div className="glass-tile rounded-xl p-3">
      <p className={cn("text-sm font-semibold", toneClasses(tone).split(" ").find((item) => item.startsWith("text-")))}>{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-400">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colorForTone(tone) }} />
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function ScoreEngine({ scores }: { scores: AiCoachData["scoreEngine"] }) {
  const average = Math.round(scores.reduce((total, item) => total + item.score, 0) / scores.length);

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Trading Score Engine" action={<span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{grade(average)}</span>} />
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="grid place-items-center rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <ScoreRing score={average} tone="violet" />
          <p className="mt-3 text-sm font-semibold text-white">Overall Grade {grade(average)}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {scores.map((item) => (
            <MetricBar key={item.label} label={item.label} value={item.score} tone={item.score >= 82 ? "green" : item.score >= 78 ? "cyan" : "gold"} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomSummary({ data }: { data: AiCoachData["bottomSummary"] }) {
  const icons = [ShieldCheck, AlertTriangle, TrendingUp, Trophy, Target];

  return (
    <section className="premium-panel rounded-xl p-4">
      <PanelHeader title="Bottom Summary" eyebrow="Final AI Recommendation" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {data.items.map((item, index) => {
          const Icon = icons[index] ?? Sparkles;
          return (
            <div key={item.label} className="glass-tile interactive-lift rounded-xl p-3">
              <span className={cn("mb-3 grid h-9 w-9 place-items-center rounded-lg border", toneClasses(item.tone))}>
                <Icon size={17} aria-hidden="true" />
              </span>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4">
        <p className="text-sm font-semibold text-white">{data.recommendation}</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          This recommendation updates from stored journal entries, saved signals, and Supabase backtest summaries.
        </p>
      </div>
    </section>
  );
}

const kpiIcons: Record<string, LucideIcon> = {
  "AI Coach Rating": BrainCircuit,
  "Consistency Score": BarChart3,
  "Discipline Score": ShieldCheck,
  "Emotional Score": HeartPulse,
  "Risk Score": Gauge,
  "Trading Score": Trophy
};

export function AiCoachClient({ coachData }: { coachData: AiCoachData }) {
  const kpis: Kpi[] = useMemo(
    () => coachData.kpis.map((kpi) => ({ ...kpi, icon: kpiIcons[kpi.label] ?? Sparkles })),
    [coachData.kpis]
  );

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="text-violet-300" size={26} aria-hidden="true" />
            <h1 className="text-3xl font-semibold tracking-tight text-white">AI Coach</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">Your personal trading mentor. Improve skills. Build discipline. Achieve consistency.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
            <CalendarDays size={16} aria-hidden="true" />
            {coachData.dateRange}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white transition hover:border-violet-400/40 hover:bg-violet-500/15">
            <Download size={16} aria-hidden="true" />
            Download Report
          </button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <CommandCenter data={coachData.commandCenter} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]">
        <PersonalCoach data={coachData.personalCoach} />
        <WeeklyReport data={coachData.weeklyReport} />
        <ImprovementPath steps={coachData.roadmap} />
        <MentorQuote />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <BehaviorAnalysis metrics={coachData.behaviorMetrics} />
        <TraderDnaProfile profile={coachData.profile} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]">
        <DisciplineAnalytics data={coachData.discipline} />
        <TradingHabits data={coachData.habits} />
        <EmotionalIntelligence data={coachData.emotions} />
      </section>

      <PerformanceCoaching cards={coachData.performanceCards} />

      <GoalTracking goals={coachData.goals} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CoachReport reports={coachData.reports} />
        <ScoreEngine scores={coachData.scoreEngine} />
      </section>

      <BottomSummary data={coachData.bottomSummary} />

      <footer className="premium-panel flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2">
          <Flame size={14} className="text-violet-300" aria-hidden="true" />
          {coachData.footer.message}
        </span>
        <span className="inline-flex items-center gap-2">
          Next Goal
          <Target size={14} className="text-cyan-300" aria-hidden="true" />
          {coachData.footer.nextGoal}
        </span>
      </footer>
    </div>
  );
}
