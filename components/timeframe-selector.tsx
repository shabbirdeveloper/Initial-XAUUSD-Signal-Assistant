"use client";

import { SUPPORTED_TIMEFRAMES, type Timeframe } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TimeframeSelector({
  value,
  onChange,
  disabled = false
}: {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-ink-950/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur">
      {SUPPORTED_TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe}
          type="button"
          disabled={disabled}
          onClick={() => onChange(timeframe)}
          className={cn(
            "h-9 min-w-12 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-60",
            timeframe === value
              ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-[0_10px_24px_rgba(99,102,241,0.28)]"
              : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
          )}
          aria-pressed={timeframe === value}
        >
          {timeframe}
        </button>
      ))}
    </div>
  );
}
