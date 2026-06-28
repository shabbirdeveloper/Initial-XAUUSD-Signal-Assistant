import { cn } from "@/lib/utils";

export function ConfidenceMeter({ value, signalType }: { value: number; signalType: "BUY" | "SELL" | "HOLD" }) {
  const color =
    signalType === "BUY"
      ? "from-emerald-500 to-cyan-300"
      : signalType === "SELL"
        ? "from-rose-500 to-orange-300"
        : "from-violet-500 to-fuchsia-300";
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">Confidence</span>
        <span className="font-semibold text-white">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_20px_rgba(124,92,255,0.32)]", color)}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
