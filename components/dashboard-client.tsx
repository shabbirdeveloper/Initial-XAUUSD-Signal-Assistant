"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  Brain,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  Layers3,
  LineChart,
  Maximize2,
  PauseCircle,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp
} from "lucide-react";
import { IndicatorSummary } from "@/components/indicator-summary";
import { MetricCard } from "@/components/metric-card";
import { SignalCard } from "@/components/signal-card";
import { SmartTradeManagement } from "@/components/smart-trade-management";
import { TimeframeSelector } from "@/components/timeframe-selector";
import { TradingChart } from "@/components/trading-chart";
import { SITE_DATA_REFRESH_EVENT } from "@/lib/refresh-events";
import { type AnalysisResult, type Timeframe } from "@/lib/types";
import { cn, formatDateTime, formatPrice, formatPercent } from "@/lib/utils";

type ChipTone = "green" | "red" | "gold" | "cyan" | "violet" | "neutral";

const LIVE_REFRESH_MS = 60_000;

function getNewYorkTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "America/New_York",
    weekday: "short"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: values.weekday
  };
}

function getGoldMarketStatus(nowMs: number) {
  const { hour, minute, weekday } = getNewYorkTimeParts(new Date(nowMs));
  const minutes = hour * 60 + minute;
  const closed =
    weekday === "Sat" ||
    (weekday === "Fri" && minutes >= 17 * 60) ||
    (weekday === "Sun" && minutes < 18 * 60);

  if (!closed) {
    return {
      detail: "XAUUSD trading session is active. Live candle updates depend on provider limits and cache freshness.",
      isClosed: false,
      label: "Market Open",
      next: "Live market"
    };
  }

  return {
    detail: "Gold/XAUUSD is closed for the weekend. Prices and candles may stay fixed at the last available market candle.",
    isClosed: true,
    label: "Market Closed - Weekend",
    next: "Reopens Sunday 6:00 PM New York time"
  };
}

const chipToneClass: Record<ChipTone, string> = {
  green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  red: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  gold: "border-gold-400/20 bg-gold-400/10 text-gold-300",
  cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  violet: "border-violet-400/20 bg-violet-400/10 text-violet-200",
  neutral: "border-slate-400/15 bg-white/[0.035] text-slate-300"
};

function trendTone(value: string): ChipTone {
  if (value === "bullish") {
    return "green";
  }
  if (value === "bearish") {
    return "red";
  }
  return "gold";
}

function macdTone(value: string): ChipTone {
  if (value === "bullish" || value === "improving") {
    return "green";
  }
  if (value === "bearish" || value === "weakening") {
    return "red";
  }
  return "neutral";
}

function currentSessionLabel(nowMs: number) {
  const hour = new Date(nowMs).getUTCHours();

  if (hour >= 13 && hour < 16) return "London + NY";
  if (hour >= 7 && hour < 13) return "London";
  if (hour >= 16 && hour < 22) return "New York";
  if (hour >= 0 && hour < 7) return "Tokyo";
  return "Sydney";
}

function riskTone(score?: number): ChipTone {
  if ((score ?? 0) >= 78) return "green";
  if ((score ?? 0) >= 58) return "gold";
  return "red";
}

function newsTone(newsRisk?: string): ChipTone {
  if (newsRisk === "Low") return "green";
  if (newsRisk === "High") return "red";
  return "gold";
}

export function DashboardClient({ initialAnalysis }: { initialAnalysis: AnalysisResult }) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialAnalysis.timeframe);
  const [loading, setLoading] = useState(false);
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [lastLiveRefreshAt, setLastLiveRefreshAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const activeTimeframeRef = useRef(timeframe);

  useEffect(() => {
    activeTimeframeRef.current = timeframe;
  }, [timeframe]);

  const latestCandleTime = useMemo(() => {
    const latest = analysis.candles[analysis.candles.length - 1];
    return latest ? formatDateTime(latest.time) : "--";
  }, [analysis.candles]);

  const providerName = analysis.provider === "twelve-data" ? "Twelve Data" : "Mock sample data";
  const providerStatus = analysis.status ?? (analysis.provider === "twelve-data" ? "live" : "fallback");
  const providerTone =
    providerStatus === "live"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : providerStatus === "cached"
        ? "border-gold-400/20 bg-gold-400/10 text-gold-300"
        : "border-rose-400/20 bg-rose-400/10 text-rose-300";
  const freshnessLabel = analysis.fetchedAt ? formatDateTime(analysis.fetchedAt) : "--";
  const marketStatus = useMemo(() => getGoldMarketStatus(now), [now]);
  const nextLiveRefreshSeconds = Math.max(
    0,
    Math.ceil((LIVE_REFRESH_MS - (now - lastLiveRefreshAt)) / 1000)
  );

  const indicatorChips = useMemo(() => {
    const ema50Position =
      analysis.indicators.ema50 === null
        ? "--"
        : analysis.currentPrice >= analysis.indicators.ema50
          ? "Price above"
          : "Price below";
    const ema200Position =
      analysis.indicators.ema200 === null
        ? "--"
        : analysis.currentPrice >= analysis.indicators.ema200
          ? "Price above"
          : "Price below";

    return [
      {
        label: "Trend",
        value: analysis.indicators.trend,
        tone: trendTone(analysis.indicators.trend)
      },
      {
        label: "EMA 50",
        value: formatPrice(analysis.indicators.ema50),
        detail: ema50Position,
        tone: ema50Position === "Price above" ? "green" : ema50Position === "Price below" ? "red" : "neutral"
      },
      {
        label: "EMA 200",
        value: formatPrice(analysis.indicators.ema200),
        detail: ema200Position,
        tone: ema200Position === "Price above" ? "green" : ema200Position === "Price below" ? "red" : "neutral"
      },
      {
        label: "RSI (14)",
        value: analysis.indicators.rsi14?.toFixed(2) ?? "--",
        tone: "gold"
      },
      {
        label: "MACD",
        value: analysis.indicators.macd.bias,
        tone: macdTone(analysis.indicators.macd.bias)
      },
      {
        label: "ATR (14)",
        value: formatPrice(analysis.indicators.atr14),
        tone: "cyan"
      },
      {
        label: "Market Structure",
        value: analysis.indicators.trend,
        tone: trendTone(analysis.indicators.trend)
      }
    ] satisfies Array<{ label: string; value: string; detail?: string; tone: ChipTone }>;
  }, [analysis.currentPrice, analysis.indicators]);

  const refreshAnalysis = useCallback(async (next: Timeframe, options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (silent) {
      setLiveRefreshing(true);
    } else {
      setLoading(true);
      setMessage(null);
    }

    try {
      const response = await fetch(`/api/signal?symbol=XAUUSD&timeframe=${next}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to refresh signal.");
      }

      const payload = (await response.json()) as AnalysisResult;
      setAnalysis(payload);
      setLastLiveRefreshAt(Date.now());
    } catch (error) {
      if (!silent) {
        setMessage(error instanceof Error ? error.message : "Unable to refresh signal.");
      }
    } finally {
      if (silent) {
        setLiveRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleSiteRefresh = () => {
      void refreshAnalysis(timeframe);
    };

    window.addEventListener(SITE_DATA_REFRESH_EVENT, handleSiteRefresh);
    return () => window.removeEventListener(SITE_DATA_REFRESH_EVENT, handleSiteRefresh);
  }, [refreshAnalysis, timeframe]);

  useEffect(() => {
    const tickId = window.setInterval(() => setNow(Date.now()), 1000);
    const refreshId = window.setInterval(() => {
      if (!document.hidden) {
        void refreshAnalysis(activeTimeframeRef.current, { silent: true });
      }
    }, LIVE_REFRESH_MS);

    return () => {
      window.clearInterval(tickId);
      window.clearInterval(refreshId);
    };
  }, [refreshAnalysis]);

  async function handleTimeframeChange(next: Timeframe) {
    setTimeframe(next);
    await refreshAnalysis(next);
  }

  async function handleManualLiveRefresh() {
    await refreshAnalysis(timeframe);
  }

  async function handleSaveSignal() {
    console.log("Save button clicked");
    console.log("Payload:", { signal: analysis.signal });
    setSaving(true);
    setMessage("Saving Signal...");

    try {
      const response = await fetch("/api/signals", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ signal: analysis.signal })
      });
      const payload = (await response.json()) as { saved?: boolean; reason?: string };

      if (!response.ok || !payload.saved) {
        throw new Error(payload.reason ?? "Signal was not saved.");
      }

      setMessage("✅ Signal saved successfully");
    } catch (error) {
      setMessage(`❌ ${error instanceof Error ? error.message : "Signal was not saved."}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 xl:space-y-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gold-400">XAUUSD / Gold</p>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-cyan-200">
              Institutional signal workspace
            </span>
            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase", providerTone)}>
              {providerStatus}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase",
                marketStatus.isClosed
                  ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
                  : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              )}
            >
              {marketStatus.isClosed ? <PauseCircle size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}
              {marketStatus.label}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-4xl">Signal Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Rule-based analysis using EMA, RSI, MACD, market structure, candle rejection, and ATR risk levels.
          </p>
        </div>
        <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} disabled={loading} />
      </section>

      {message || analysis.notice ? (
        <div className="rounded-xl border border-gold-400/25 bg-gold-400/10 px-4 py-3 text-sm text-gold-100 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          {message ?? analysis.notice}
        </div>
      ) : null}

      {marketStatus.isClosed ? (
        <section className="premium-panel relative overflow-hidden rounded-xl border-rose-400/25 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          <div className="absolute -right-10 -top-12 h-36 w-48 rounded-full bg-gradient-to-bl from-rose-500/20 to-transparent blur-2xl" />
          <div className="relative flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-rose-400/30 bg-rose-400/12 text-rose-200 shadow-[0_0_28px_rgba(251,113,133,0.12)]">
                <PauseCircle size={21} aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold text-white">{marketStatus.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{marketStatus.detail}</p>
              </div>
            </div>
            <div className="rounded-xl border border-gold-400/25 bg-gold-400/10 px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-300">Next Market Open</p>
              <p className="mt-1 font-semibold text-white">{marketStatus.next}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="premium-panel relative overflow-hidden rounded-xl p-4 lg:p-5">
        <div className="absolute -right-16 -top-16 h-52 w-72 rounded-full bg-gradient-to-bl from-violet-500/20 via-cyan-300/10 to-transparent blur-3xl" />
        <div className="relative flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Brain size={19} className="text-violet-200" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-white">Trade Decision Center</h2>
              {analysis.signal.eliteSetup?.detected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/35 bg-gold-400/15 px-3 py-1 text-xs font-bold uppercase text-gold-200">
                  <Flame size={13} aria-hidden="true" />
                  Elite Setup Detected
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-semibold text-slate-300">
                  Quality over quantity
                </span>
              )}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Weighted AI model: Technical 40%, News 20%, Session 15%, SMC 15%, Risk 10%.
            </p>
          </div>
          <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm shadow-[0_0_38px_rgba(124,92,255,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Final AI Confidence</p>
            <p className="mt-1 text-3xl font-bold text-white">{analysis.signal.weightedConfidence?.final ?? analysis.signal.confidence}%</p>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {[
            { label: "Market Bias", value: analysis.signal.signalType, tone: analysis.signal.signalType === "BUY" ? "green" : analysis.signal.signalType === "SELL" ? "red" : "gold" },
            { label: "AI Grade", value: analysis.signal.weightedConfidence?.grade ?? "C", tone: "violet" },
            { label: "Current Session", value: currentSessionLabel(now), tone: "cyan" },
            { label: "News Risk", value: analysis.signal.newsRisk ?? "Medium", tone: newsTone(analysis.signal.newsRisk) },
            { label: "Risk Level", value: `${analysis.signal.riskScore ?? 0}/100`, tone: riskTone(analysis.signal.riskScore) },
            { label: "Trend Strength", value: `${analysis.signal.trendStrength ?? 0}/100`, tone: trendTone(analysis.indicators.trend) },
            { label: "SMC Score", value: `${analysis.signal.smc?.score ?? 0}/100`, tone: analysis.signal.smc?.score && analysis.signal.smc.score >= 70 ? "green" : "gold" }
          ].map((item) => (
            <div key={item.label} className={cn("glass-tile rounded-xl border p-3.5", chipToneClass[item.tone as ChipTone])}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="mt-2 truncate text-lg font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
          <div className="glass-tile rounded-xl p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-cyan-200">Why This Signal?</p>
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <CheckCircle2 size={16} className="text-emerald-300" aria-hidden="true" />
              Positive Factors
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(analysis.signal.positiveFactors?.length ? analysis.signal.positiveFactors : ["Waiting for alignment"]).slice(0, 8).map((factor) => (
                <span key={factor} className="rounded-lg border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-100">
                  {factor}
                </span>
              ))}
            </div>
          </div>
          <div className="glass-tile rounded-xl p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <AlertTriangle size={16} className="text-rose-300" aria-hidden="true" />
              Negative Factors
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(analysis.signal.negativeFactors?.length ? analysis.signal.negativeFactors : ["No major conflict"]).slice(0, 8).map((factor) => (
                <span key={factor} className="rounded-lg border border-rose-400/15 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-100">
                  {factor}
                </span>
              ))}
            </div>
          </div>
          <div className="glass-tile rounded-xl p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <Award size={16} className="text-gold-300" aria-hidden="true" />
              Best Entry Zone
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Entry Area</dt><dd className="font-semibold text-white">{formatPrice(analysis.signal.tradeManagement?.bestEntryZone.low)} - {formatPrice(analysis.signal.tradeManagement?.bestEntryZone.high)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Current Price</dt><dd className="font-semibold text-white">{formatPrice(analysis.currentPrice)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Distance</dt><dd className="font-semibold text-cyan-200">{analysis.signal.tradeManagement?.bestEntryZone.distance.toFixed(2) ?? "--"} pts</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Optimal</dt><dd className="font-semibold text-gold-200">{formatPrice(analysis.signal.tradeManagement?.bestEntryZone.optimal)}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current Price"
          value={formatPrice(analysis.currentPrice)}
          helper={`Last candle ${latestCandleTime}`}
          icon={TrendingUp}
          tone="gold"
          sparkline
        />
        <MetricCard
          label="Signal"
          value={analysis.signal.signalType}
          helper={`${analysis.signal.strength} confidence model`}
          icon={Target}
          tone={analysis.signal.signalType === "SELL" ? "red" : analysis.signal.signalType === "BUY" ? "green" : "gold"}
        />
        <MetricCard
          label="Confidence"
          value={formatPercent(analysis.signal.confidence)}
          helper="Strong signals require 70%+"
          icon={Gauge}
          tone="violet"
          progress={analysis.signal.confidence}
        />
        <MetricCard
          label="Risk"
          value={`${analysis.signal.riskPercent}%`}
          helper={`RR 1 : ${analysis.signal.riskReward.toFixed(1)}`}
          icon={ShieldCheck}
          tone="green"
          progress={analysis.signal.riskPercent * 20}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_372px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-4">
          <div className="premium-panel chart-shell relative overflow-hidden rounded-xl p-4 lg:p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <LineChart size={18} className="text-cyan-300" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-white">Candlestick Chart</h2>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Provider: {providerName} | Status: {providerStatus} | Fetched: {freshnessLabel}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={handleManualLiveRefresh}
                  disabled={loading || liveRefreshing}
                  title="Refresh candles"
                  aria-label="Refresh candles"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-400/15 disabled:opacity-60"
                >
                  <RefreshCw size={14} className={cn(liveRefreshing && "animate-spin")} aria-hidden="true" />
                  <span>{marketStatus.isClosed ? "Closed" : `Live ${nextLiveRefreshSeconds}s`}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gold-400 shadow-[0_0_14px_rgba(248,193,74,0.65)]" />
                  EMA 50
                  <span className="ml-2 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.65)]" />
                  EMA 200
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <button type="button" aria-label="Chart indicators" title="Chart indicators" className="icon-button">
                    <Activity size={15} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="Chart settings" title="Chart settings" className="icon-button">
                    <Settings2 size={15} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="Chart filters" title="Chart filters" className="icon-button">
                    <SlidersHorizontal size={15} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="Expand chart" title="Expand chart" className="icon-button">
                    <Maximize2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <TradingChart candles={analysis.candles} indicatorSeries={analysis.indicatorSeries} symbol={analysis.symbol} timeframe={timeframe} />

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              {indicatorChips.map((chip) => (
                <div
                  key={chip.label}
                  className={cn(
                    "glass-tile min-h-[58px] rounded-lg px-3 py-2.5",
                    chipToneClass[chip.tone]
                  )}
                >
                  <p className="text-[11px] font-medium uppercase text-slate-400">{chip.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold capitalize text-white">{chip.value}</p>
                  {chip.detail ? <p className="mt-0.5 text-[11px] text-slate-500">{chip.detail}</p> : null}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink-950/70 backdrop-blur-sm">
                <div className="rounded-xl border border-cyan-300/20 bg-ink-900/90 px-5 py-3 text-sm font-medium text-slate-100 shadow-2xl">
                  Refreshing analysis...
                </div>
              </div>
            ) : null}
          </div>

          <IndicatorSummary indicators={analysis.indicators} />
          <SmartTradeManagement analysis={analysis} />
        </div>

        <aside className="space-y-4 xl:self-start">
          <SignalCard signal={analysis.signal} onSave={handleSaveSignal} saving={saving} />
          <section className="premium-panel rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-gold-400" aria-hidden="true" />
              <h2 className="text-base font-semibold text-white">Risk Warning</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This is not financial advice. Always manage risk.
            </p>
            <dl className="mt-4 space-y-3">
              <div className="glass-tile flex items-center justify-between gap-3 rounded-lg p-3">
                <dt className="text-xs text-slate-400">Stop basis</dt>
                <dd className="text-sm font-semibold text-white">Swing + ATR</dd>
              </div>
              <div className="glass-tile flex items-center justify-between gap-3 rounded-lg p-3">
                <dt className="text-xs text-slate-400">TP1</dt>
                <dd className="text-sm font-semibold text-white">1 : 1.5</dd>
              </div>
              <div className="glass-tile flex items-center justify-between gap-3 rounded-lg p-3">
                <dt className="text-xs text-slate-400">TP2</dt>
                <dd className="text-sm font-semibold text-white">1 : 2.0</dd>
              </div>
            </dl>
          </section>
        </aside>
      </section>
    </div>
  );
}
