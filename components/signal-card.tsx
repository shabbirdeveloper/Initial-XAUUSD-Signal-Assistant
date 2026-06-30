import { CheckCircle2, MinusCircle, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { ConfidenceMeter } from "@/components/confidence-meter";
import { type SignalResult } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

function signalStyles(signalType: SignalResult["signalType"]) {
  if (signalType === "BUY") {
    return {
      icon: TrendingUp,
      panel: "border-emerald-400/25",
      text: "text-emerald-300",
      badge: "bg-emerald-400 text-ink-950",
      glow: "from-emerald-400/20"
    };
  }

  if (signalType === "SELL") {
    return {
      icon: TrendingDown,
      panel: "border-rose-400/25",
      text: "text-rose-300",
      badge: "bg-rose-400 text-ink-950",
      glow: "from-rose-400/20"
    };
  }

  return {
    icon: MinusCircle,
    panel: "border-gold-400/20",
    text: "text-gold-400",
    badge: "bg-slate-200 text-ink-950",
    glow: "from-violet-500/20"
  };
}

export function SignalCard({ signal, onSave, saving }: { signal: SignalResult; onSave?: () => void; saving?: boolean }) {
  const styles = signalStyles(signal.signalType);
  const Icon = styles.icon;

  return (
    <section className={cn("premium-panel relative overflow-hidden rounded-xl p-4 lg:p-5", styles.panel)}>
      <div className={cn("absolute right-0 top-0 h-48 w-48 bg-gradient-to-bl to-transparent blur-2xl", styles.glow)} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Signal</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.035]">
              <Icon size={26} className={styles.text} aria-hidden="true" />
            </span>
            <div>
              <p className={cn("text-4xl font-bold leading-none", styles.text)}>{signal.signalType}</p>
              <p className="mt-1 text-xs text-slate-400">{signal.strength} setup</p>
            </div>
          </div>
        </div>
        <span className={cn("rounded-lg px-3 py-1.5 text-xs font-bold shadow-[0_10px_24px_rgba(0,0,0,0.24)]", styles.badge)}>
          {signal.confidence}%
        </span>
      </div>

      <div className="relative mt-6">
        <ConfidenceMeter value={signal.confidence} signalType={signal.signalType} />
      </div>

      <dl className="relative mt-5 grid grid-cols-2 gap-3">
        {[
          ["Entry", signal.entryPrice],
          ["Stop Loss", signal.stopLoss],
          ["TP1", signal.takeProfit1],
          ["TP2", signal.takeProfit2],
          ["TP3", signal.tradeManagement?.tp3 ?? signal.takeProfit2]
        ].map(([label, value]) => (
          <div key={label} className="glass-tile rounded-lg p-3.5 transition hover:border-cyan-300/25 hover:bg-cyan-300/5">
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="mt-1.5 text-base font-semibold text-white">
              {formatPrice(value as number)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="relative mt-4 grid grid-cols-1 gap-3">
        <div className="glass-tile rounded-lg p-3.5">
          <p className="text-xs text-slate-400">AI Grade</p>
          <p className="mt-1.5 text-xl font-bold text-violet-200">{signal.weightedConfidence?.grade ?? "C"}</p>
        </div>
      </div>

      <div className="glass-tile relative mt-4 rounded-lg p-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Risk / Reward</span>
          <span className="text-base font-semibold text-white">1 : {signal.riskReward.toFixed(1)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Default risk</span>
          <span className="text-base font-semibold text-white">{signal.riskPercent}%</span>
        </div>
      </div>

      <div className="relative mt-4 rounded-xl border border-gold-400/15 bg-gold-400/10 p-3.5">
        <p className="text-sm leading-6 text-slate-200">
          <span className="font-semibold text-gold-300">{signal.signalType}:</span> {signal.explanation}
        </p>
      </div>

      <div className="scrollbar-thin relative mt-4 max-h-64 space-y-2.5 overflow-y-auto pr-1">
        {signal.rules.map((rule) => {
          const RuleIcon = rule.matched ? CheckCircle2 : XCircle;
          return (
            <div key={rule.label} className="flex gap-2 rounded-lg px-1 py-0.5 text-xs">
              <span className="mt-0.5">
                <RuleIcon
                  size={15}
                  className={rule.matched ? "text-emerald-300" : "text-rose-300/80"}
                  aria-hidden="true"
                />
              </span>
              <div>
                <p className={rule.matched ? "text-slate-100" : "text-slate-400"}>{rule.label}</p>
                <p className={rule.matched ? "text-emerald-300/70" : "text-slate-600"}>{rule.points} pts</p>
              </div>
            </div>
          );
        })}
      </div>

      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="relative mt-5 h-11 w-full rounded-lg border border-gold-400/30 bg-gradient-to-r from-gold-400/20 to-cyan-300/10 px-4 text-sm font-semibold text-gold-100 transition hover:border-gold-300/50 hover:from-gold-400/25 hover:to-cyan-300/15 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Signal"}
        </button>
      ) : null}
    </section>
  );
}
