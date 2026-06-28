import { Activity, Gauge, Layers3, LocateFixed } from "lucide-react";
import { type IndicatorSnapshot } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

function clampDisplayScore(value: number) {
  return Math.min(100, Math.max(0, value));
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function trendScore(trend: IndicatorSnapshot["trend"]) {
  if (trend === "bullish") {
    return 76;
  }
  if (trend === "bearish") {
    return 24;
  }
  return 50;
}

function biasScore(bias: IndicatorSnapshot["macd"]["bias"]) {
  if (bias === "bullish" || bias === "improving") {
    return 74;
  }
  if (bias === "bearish" || bias === "weakening") {
    return 28;
  }
  return 50;
}

function toneForStatus(status: string) {
  if (["Bullish", "Improving", "Supported", "Active"].includes(status)) {
    return "text-emerald-300";
  }
  if (["Bearish", "Weakening", "Rejected", "Overbought", "Oversold"].includes(status)) {
    return "text-rose-300";
  }
  if (["Low", "Neutral", "Ranging"].includes(status)) {
    return "text-gold-300";
  }
  return "text-slate-300";
}

function rsiStatus(value: number | null) {
  if (value === null) {
    return "Neutral";
  }
  if (value >= 70) {
    return "Overbought";
  }
  if (value <= 30) {
    return "Oversold";
  }
  if (value >= 55) {
    return "Bullish";
  }
  if (value <= 45) {
    return "Bearish";
  }
  return "Neutral";
}

export function IndicatorSummary({ indicators }: { indicators: IndicatorSnapshot }) {
  const support = indicators.supportZones[0];
  const resistance = indicators.resistanceZones[0];
  const rsiState = rsiStatus(indicators.rsi14);
  const trendState = titleCase(indicators.trend);
  const macdState = titleCase(indicators.macd.bias);

  const gauges = [
    {
      label: "EMA Trend",
      value: trendState,
      status: trendState,
      score: trendScore(indicators.trend),
      color: indicators.trend === "bullish" ? "#34d399" : indicators.trend === "bearish" ? "#fb7185" : "#f8c14a",
      icon: Activity
    },
    {
      label: "RSI (14)",
      value: indicators.rsi14?.toFixed(2) ?? "--",
      status: rsiState,
      score: clampDisplayScore(indicators.rsi14 ?? 50),
      color: rsiState === "Bullish" ? "#34d399" : rsiState === "Bearish" ? "#fb7185" : "#f8c14a",
      icon: Gauge
    },
    {
      label: "MACD",
      value: indicators.macd.histogram?.toFixed(2) ?? macdState,
      status: macdState,
      score: biasScore(indicators.macd.bias),
      color: indicators.macd.bias === "bullish" || indicators.macd.bias === "improving" ? "#34d399" : indicators.macd.bias === "neutral" ? "#94a3b8" : "#fb7185",
      icon: LocateFixed
    },
    {
      label: "ATR (14)",
      value: formatPrice(indicators.atr14),
      status: "Volatility",
      score: clampDisplayScore(indicators.atr14 ?? 50),
      color: "#22d3ee",
      icon: Layers3
    },
    {
      label: "Support",
      value: support ? formatPrice(support.price) : "--",
      status: indicators.rejectsSupport ? "Active" : "Watched",
      score: support ? clampDisplayScore(support.touches * 20) : 35,
      color: indicators.rejectsSupport ? "#34d399" : "#f8c14a",
      icon: Activity
    },
    {
      label: "Resistance",
      value: resistance ? formatPrice(resistance.price) : "--",
      status: indicators.rejectsResistance ? "Rejected" : "Watched",
      score: resistance ? clampDisplayScore(resistance.touches * 20) : 35,
      color: indicators.rejectsResistance ? "#fb7185" : "#f8c14a",
      icon: Layers3
    },
    {
      label: "Structure",
      value: trendState,
      status: trendState === "Ranging" ? "Ranging" : trendState,
      score: trendScore(indicators.trend),
      color: indicators.trend === "bullish" ? "#34d399" : indicators.trend === "bearish" ? "#fb7185" : "#f8c14a",
      icon: LocateFixed
    }
  ];

  return (
    <section className="premium-panel rounded-xl p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">Indicator Overview</p>
          <p className="mt-1 text-xs text-slate-400">EMA, RSI, MACD, volatility, zones, and structure</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold capitalize text-slate-200">
          {indicators.trend}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {gauges.map((item) => {
          const Icon = item.icon;
          const score = clampDisplayScore(item.score);
          return (
            <div key={item.label} className="glass-tile rounded-xl p-3.5 text-center">
              <p className="text-xs text-slate-400">{item.label}</p>
              <div
                className="mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-full p-1"
                style={{
                  background: `conic-gradient(${item.color} ${score * 3.6}deg, rgba(148, 163, 184, 0.12) 0deg)`
                }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#07111f] shadow-[inset_0_0_18px_rgba(0,0,0,0.38)]">
                  <Icon size={18} className="text-slate-200" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 truncate text-sm font-semibold capitalize text-white">{item.value}</p>
              <p className={cn("mt-1 text-xs font-medium", toneForStatus(item.status))}>{item.status}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="glass-tile rounded-xl p-3.5">
          <p className="text-xs text-slate-400">Candle Pattern</p>
          <p className="mt-2 text-sm font-semibold text-white">{indicators.candlePattern}</p>
        </div>
        <div className="glass-tile rounded-xl p-3.5">
          <p className="text-xs text-slate-400">Support Zone</p>
          <p className="mt-2 text-sm font-semibold text-white">{support ? formatPrice(support.price) : "--"}</p>
          <p className="mt-1 text-xs text-slate-500">{support ? `${support.touches} touches` : "No active zone"}</p>
        </div>
        <div className="glass-tile rounded-xl p-3.5">
          <p className="text-xs text-slate-400">Resistance Zone</p>
          <p className="mt-2 text-sm font-semibold text-white">{resistance ? formatPrice(resistance.price) : "--"}</p>
          <p className="mt-1 text-xs text-slate-500">{resistance ? `${resistance.touches} touches` : "No active zone"}</p>
        </div>
      </div>
    </section>
  );
}
