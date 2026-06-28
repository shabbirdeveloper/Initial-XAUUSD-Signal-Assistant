import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricTone = "neutral" | "gold" | "green" | "red" | "cyan" | "violet";

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
  progress,
  sparkline = false
}: {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: MetricTone;
  progress?: number;
  sparkline?: boolean;
}) {
  const toneStyles: Record<MetricTone, { text: string; glow: string; progress: string }> = {
    neutral: {
      text: "text-slate-300",
      glow: "from-slate-400/20 to-slate-400/0",
      progress: "from-slate-400 to-slate-200"
    },
    gold: {
      text: "text-gold-400",
      glow: "from-gold-400/20 to-gold-400/0",
      progress: "from-gold-400 to-amber-200"
    },
    green: {
      text: "text-emerald-300",
      glow: "from-emerald-400/20 to-emerald-400/0",
      progress: "from-emerald-500 to-cyan-300"
    },
    red: {
      text: "text-rose-300",
      glow: "from-rose-400/20 to-rose-400/0",
      progress: "from-rose-500 to-orange-300"
    },
    cyan: {
      text: "text-cyan-300",
      glow: "from-cyan-300/20 to-cyan-300/0",
      progress: "from-cyan-400 to-sky-200"
    },
    violet: {
      text: "text-violet-300",
      glow: "from-violet-500/25 to-violet-500/0",
      progress: "from-violet-500 to-fuchsia-300"
    }
  };
  const toneClass = toneStyles[tone];
  const safeProgress = typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : null;

  return (
    <section className="premium-panel interactive-lift min-h-[132px] overflow-hidden rounded-xl p-5">
      <div className={cn("absolute right-0 top-0 h-28 w-36 bg-gradient-to-bl blur-xl", toneClass.glow)} />
      {sparkline ? (
        <svg
          className="metric-sparkline pointer-events-none absolute bottom-5 right-5 h-16 w-32 text-emerald-400/80"
          viewBox="0 0 128 64"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 52 C14 44 19 49 29 38 S48 32 56 26 S75 28 83 19 S100 16 110 9 S119 14 126 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M2 62 L2 52 C14 44 19 49 29 38 S48 32 56 26 S75 28 83 19 S100 16 110 9 S119 14 126 5 L126 62 Z" fill="url(#metricSparkGradient)" opacity="0.22" />
          <defs>
            <linearGradient id="metricSparkGradient" x1="64" x2="64" y1="5" y2="62" gradientUnits="userSpaceOnUse">
              <stop stopColor="currentColor" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      ) : null}

      <div className="relative flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035]">
          <Icon size={17} className={cn("shrink-0", toneClass.text)} aria-hidden="true" />
        </span>
      </div>

      <p className={cn("relative mt-4 text-3xl font-semibold leading-none text-white", tone === "gold" && label === "Signal" && toneClass.text)}>
        {value}
      </p>
      {helper ? <p className="relative mt-2 text-xs text-slate-400">{helper}</p> : null}

      {safeProgress !== null ? (
        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_18px_rgba(124,92,255,0.28)]", toneClass.progress)}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      ) : null}
    </section>
  );
}
