import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listJournalEntries, type JournalEntryRecord, type JournalSession } from "@/lib/repositories/journal";
import { type BacktestRecord, type SignalRecord, type Timeframe } from "@/lib/types";
import { clamp, roundTo } from "@/lib/utils";

export type CoachTone = "green" | "red" | "gold" | "cyan" | "violet" | "blue" | "neutral";
export type CoachRiskLevel = "Low" | "Medium" | "High";
export type CoachReportType = "Daily" | "Weekly" | "Monthly";

export interface CoachKpiData {
  badge: string;
  helper: string;
  label: string;
  score: number;
  tone: CoachTone;
  values: number[];
}

export interface CoachBehaviorMetric {
  detail: string;
  frequency: string;
  impact: number;
  label: string;
  riskLevel: CoachRiskLevel;
}

export interface CoachRoadmapStep {
  detail: string;
  progress: number;
  title: string;
  week: string;
}

export interface CoachGoal {
  current: number;
  detail: string;
  label: string;
  target: number;
  unit: string;
}

export interface CoachEmotionRow {
  impact: number;
  label: string;
  tone: CoachTone;
  value: number;
}

export interface CoachPerformanceCard {
  detail: string;
  label: string;
  tone: CoachTone;
  value: string;
}

export interface CoachProfile {
  description: string;
  patterns: string[];
  strengths: string[];
  title: string;
  weaknesses: string[];
}

export interface CoachReport {
  achievements: string[];
  improve: string[];
  strengths: string[];
  title: string;
  weaknesses: string[];
}

export interface AiCoachData {
  behaviorMetrics: CoachBehaviorMetric[];
  bottomSummary: {
    items: Array<{ detail: string; label: string; tone: CoachTone; value: string }>;
    recommendation: string;
  };
  commandCenter: {
    description: string;
    grade: string;
    improvementTrend: string;
    monthlyProgress: string;
    rating: string;
    score: number;
    weeklyProgress: string;
  };
  dateRange: string;
  discipline: {
    heatmap: Array<{ values: Array<number | null>; week: string }>;
    mistakeRate: number;
    riskConsistency: number;
    ruleFollowing: number;
    score: number;
    tradeFrequency: number;
  };
  emotions: {
    rows: CoachEmotionRow[];
    score: number;
  };
  footer: {
    message: string;
    nextGoal: string;
  };
  goals: CoachGoal[];
  habits: {
    habitScore: number;
    rows: Array<{ label: string; score: number; value: string }>;
  };
  kpis: CoachKpiData[];
  performanceCards: CoachPerformanceCard[];
  personalCoach: {
    insights: Array<{ label: string; tag: string; text: string; tone: CoachTone }>;
    message: string;
  };
  profile: CoachProfile;
  reports: Record<CoachReportType, CoachReport>;
  roadmap: CoachRoadmapStep[];
  scoreEngine: Array<{ label: string; score: number }>;
  sourceSummary: {
    backtests: number;
    journalEntries: number;
    mode: "personal" | "fallback";
    notice?: string;
    signals: number;
  };
  weeklyReport: {
    grade: string;
    headline: string;
    metrics: Array<{ label: string; tone?: CoachTone; value: string }>;
    score: number;
    takeaways: Array<{ tone: CoachTone; text: string }>;
  };
}

type CoachTrade = {
  date: string;
  direction: "BUY" | "SELL";
  emotion: string;
  id: string;
  result: "win" | "loss" | "breakeven" | "open";
  rr: number;
  session: JournalSession;
  setup: string;
  symbol: string;
  timeframe: Timeframe;
};

type StoredBacktestResult = {
  backtests: BacktestRecord[];
  notice?: string;
  source: "supabase" | "empty" | "unavailable" | "unconfigured";
};

type StoredSignalResult = {
  notice?: string;
  signals: SignalRecord[];
  source: "supabase" | "empty" | "unavailable" | "unconfigured";
};

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  "5m": "M5",
  "15m": "M15",
  "30m": "M30",
  "1h": "H1",
  "4h": "H4",
  D: "Daily",
  M: "Monthly",
  W: "Weekly"
};

const SESSION_ORDER: JournalSession[] = ["Sydney", "Tokyo", "London", "New York", "London + NY"];
const TIMEFRAME_ORDER: Timeframe[] = ["5m", "15m", "30m", "1h", "4h", "D"];
const PRESSURE_EMOTIONS = new Set(["Fear", "Greed", "Revenge Trading", "FOMO", "Overconfident"]);
const POSITIVE_EMOTIONS = new Set(["Confident", "Calm"]);

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function formatR(value: number, digits = 2) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}R`;
}

function formatDateRange(trades: CoachTrade[]) {
  if (!trades.length) {
    return "Latest personal data";
  }

  const sorted = [...trades].sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
  const format = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
  return `${format.format(new Date(sorted[0].date))} - ${format.format(new Date(sorted[sorted.length - 1].date))}`;
}

function sessionForDate(value: string): JournalSession {
  const hour = new Date(value).getUTCHours();

  if (hour >= 13 && hour < 17) return "London + NY";
  if (hour >= 7 && hour < 13) return "London";
  if (hour >= 17 && hour < 22) return "New York";
  if (hour >= 0 && hour < 7) return "Tokyo";
  return "Sydney";
}

function trendValues(score: number, spread = 17) {
  return Array.from({ length: 12 }, (_, index) => {
    const drift = (index - 11) * (spread / 14);
    const wave = Math.sin(index * 1.3) * 4;
    return Math.round(clamp(score + drift + wave, 8, 98));
  });
}

function grade(score: number) {
  if (score >= 88) return "A+";
  if (score >= 76) return "A";
  if (score >= 62) return "B";
  return "C";
}

function ratingFor(score: number) {
  if (score >= 88) return "Elite Trader";
  if (score >= 76) return "Advanced Trader";
  if (score >= 62) return "Intermediate Trader";
  return "Developing Trader";
}

async function listStoredSignals(limit = 160): Promise<StoredSignalResult> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { signals: [], source: "unconfigured", notice: "Supabase is not configured for saved signals." };
  }

  try {
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { signals: [], source: "unavailable", notice: `Saved signals unavailable: ${error.message}.` };
    }

    return {
      signals: (data ?? []) as SignalRecord[],
      source: data?.length ? "supabase" : "empty",
      notice: data?.length ? undefined : "No saved Supabase signals yet."
    };
  } catch (error) {
    return {
      signals: [],
      source: "unavailable",
      notice: error instanceof Error ? `Saved signals unavailable: ${error.message}.` : "Saved signals unavailable."
    };
  }
}

async function listStoredBacktests(limit = 80): Promise<StoredBacktestResult> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { backtests: [], source: "unconfigured", notice: "Supabase is not configured for backtest history." };
  }

  try {
    const { data, error } = await supabase
      .from("backtests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { backtests: [], source: "unavailable", notice: `Backtest history unavailable: ${error.message}.` };
    }

    return {
      backtests: (data ?? []) as BacktestRecord[],
      source: data?.length ? "supabase" : "empty",
      notice: data?.length ? undefined : "No saved Supabase backtests yet."
    };
  } catch (error) {
    return {
      backtests: [],
      source: "unavailable",
      notice: error instanceof Error ? `Backtest history unavailable: ${error.message}.` : "Backtest history unavailable."
    };
  }
}

function journalTrade(entry: JournalEntryRecord): CoachTrade {
  return {
    date: entry.tradeDate,
    direction: entry.direction,
    emotion: entry.emotion,
    id: entry.id,
    result: entry.result,
    rr: entry.rrAchieved,
    session: entry.session,
    setup: entry.setup,
    symbol: entry.symbol,
    timeframe: entry.timeframe
  };
}

function synthesizeTradesFromBacktests(backtests: BacktestRecord[]) {
  const now = Date.now();
  return backtests.flatMap((backtest, backtestIndex) => {
    const total = Math.max(1, Math.min(36, Math.round(asNumber(backtest.total_trades))));
    const wins = Math.round((asNumber(backtest.win_rate) / 100) * total);
    const losses = Math.max(0, total - wins);

    return Array.from({ length: total }, (_, index): CoachTrade => {
      const isWin = index < wins;
      const isLoss = index >= wins && index < wins + losses;
      const date = new Date(now - (backtestIndex * 40 + index + 1) * 7 * 60 * 60 * 1000).toISOString();

      return {
        date,
        direction: index % 4 === 0 ? "SELL" : "BUY",
        emotion: isWin ? (index % 2 ? "Calm" : "Confident") : index % 2 ? "FOMO" : "Fear",
        id: `${backtest.id}-${index}`,
        result: isWin ? "win" : isLoss ? "loss" : "open",
        rr: isWin ? 1.5 : isLoss ? -1 : 0,
        session: SESSION_ORDER[index % SESSION_ORDER.length],
        setup: `${TIMEFRAME_LABELS[backtest.timeframe] ?? backtest.timeframe} backtest setup`,
        symbol: backtest.symbol,
        timeframe: backtest.timeframe
      };
    });
  });
}

function fallbackTrades(signals: SignalRecord[]): CoachTrade[] {
  const now = Date.now();
  const rrPattern = [1.8, -1, 1.4, 2.1, 0.8, -0.75, 1.6, 1.2, -1, 2.4, 0, 1.1];
  const emotions = ["Calm", "Confident", "FOMO", "Fear", "Calm", "Greed"] as const;
  const setups = ["EMA Pullback", "Breakout Retest", "Trend Continuation", "SR Rejection"];

  return Array.from({ length: 42 }, (_, index): CoachTrade => {
    const signal = signals[index % Math.max(1, signals.length)];
    const rr = rrPattern[index % rrPattern.length];
    const date = new Date(now - (42 - index) * 9 * 60 * 60 * 1000).toISOString();

    return {
      date,
      direction: signal?.signal_type === "SELL" ? "SELL" : index % 4 === 0 ? "SELL" : "BUY",
      emotion: emotions[index % emotions.length],
      id: `coach-fallback-${index}`,
      result: rr > 0 ? "win" : rr < 0 ? "loss" : "open",
      rr,
      session: SESSION_ORDER[index % SESSION_ORDER.length],
      setup: signal?.explanation?.split(".")[0]?.slice(0, 44) || setups[index % setups.length],
      symbol: signal?.symbol ?? "XAUUSD",
      timeframe: TIMEFRAME_ORDER[index % TIMEFRAME_ORDER.length]
    };
  });
}

function closedTrades(trades: CoachTrade[]) {
  return trades.filter((trade) => trade.result !== "open");
}

function equityCurve(trades: CoachTrade[]) {
  const chronological = [...trades].sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
  let equity = 0;
  return chronological.map((trade) => {
    equity += trade.rr;
    return roundTo(equity, 2);
  });
}

function drawdownCurve(equity: number[]) {
  let peak = equity[0] ?? 0;
  return equity.map((value) => {
    peak = Math.max(peak, value);
    return roundTo(peak - value, 2);
  });
}

function maxLossStreak(trades: CoachTrade[]) {
  let current = 0;
  let max = 0;

  for (const trade of [...trades].sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime())) {
    if (trade.result === "loss") {
      current += 1;
      max = Math.max(max, current);
    } else if (trade.result === "win") {
      current = 0;
    }
  }

  return max;
}

function statsForTrades(trades: CoachTrade[]) {
  const closed = closedTrades(trades);
  const wins = closed.filter((trade) => trade.result === "win");
  const losses = closed.filter((trade) => trade.result === "loss");
  const breakeven = closed.filter((trade) => trade.result === "breakeven");
  const grossProfit = wins.reduce((sum, trade) => sum + Math.max(0, trade.rr), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + Math.min(0, trade.rr), 0));
  const equity = equityCurve(closed);
  const drawdown = drawdownCurve(equity);
  const netR = closed.reduce((sum, trade) => sum + trade.rr, 0);
  const averageR = closed.length ? netR / closed.length : 0;
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const maxDrawdown = Math.max(0, ...drawdown);
  const lossStreak = maxLossStreak(closed);
  const pressureCount = trades.filter((trade) => PRESSURE_EMOTIONS.has(trade.emotion)).length;
  const positiveCount = trades.filter((trade) => POSITIVE_EMOTIONS.has(trade.emotion)).length;
  const pressureRatio = trades.length ? pressureCount / trades.length : 0;
  const positiveRatio = trades.length ? positiveCount / trades.length : 0;
  const sampleBonus = closed.length >= 60 ? 8 : closed.length >= 25 ? 5 : closed.length >= 10 ? 2 : -4;
  const riskScore = clamp(94 - maxDrawdown * 7 - lossStreak * 6 + sampleBonus, 20, 96);
  const emotionalScore = clamp(62 + positiveRatio * 34 - pressureRatio * 25 - lossStreak * 4, 20, 96);
  const disciplineScore = clamp(riskScore * 0.45 + emotionalScore * 0.35 + clamp(winRate, 0, 100) * 0.2, 20, 96);
  const consistencyScore = clamp(winRate * 0.48 + clamp(profitFactor, 0, 4) * 10 + clamp(averageR * 16, -12, 24) + sampleBonus, 20, 96);
  const tradingScore = clamp(disciplineScore * 0.28 + riskScore * 0.24 + consistencyScore * 0.28 + emotionalScore * 0.2, 20, 96);
  const coachRating = clamp(tradingScore * 0.72 + consistencyScore * 0.16 + riskScore * 0.12 + (closed.length >= 20 ? 4 : 0), 20, 98);

  return {
    averageR,
    breakeven: breakeven.length,
    closed: closed.length,
    coachRating,
    consistencyScore,
    disciplineScore,
    drawdown,
    emotionalScore,
    equity,
    grossLoss,
    grossProfit,
    lossStreak,
    losses: losses.length,
    maxDrawdown,
    netR,
    open: trades.length - closed.length,
    pressureRatio,
    profitFactor,
    riskScore,
    total: trades.length,
    tradingScore,
    winRate,
    wins: wins.length
  };
}

function groupStats<T extends string>(trades: CoachTrade[], labels: T[], getLabel: (trade: CoachTrade) => T) {
  return labels.map((label) => {
    const rows = trades.filter((trade) => getLabel(trade) === label);
    const stats = statsForTrades(rows);
    return { averageR: stats.averageR, label, profitFactor: stats.profitFactor, total: rows.length, winRate: stats.winRate };
  });
}

function bestBy<T>(items: T[], score: (item: T) => number) {
  return [...items].sort((first, second) => score(second) - score(first))[0];
}

function worstBy<T>(items: T[], score: (item: T) => number) {
  return [...items].sort((first, second) => score(first) - score(second))[0];
}

function setupStats(trades: CoachTrade[]) {
  const labels = Array.from(new Set(trades.map((trade) => trade.setup))).slice(0, 8);
  return groupStats(trades, labels, (trade) => trade.setup);
}

function countByDay(trades: CoachTrade[]) {
  return trades.reduce<Record<string, number>>((days, trade) => {
    const key = new Date(trade.date).toISOString().slice(0, 10);
    days[key] = (days[key] ?? 0) + 1;
    return days;
  }, {});
}

function buildDisciplineHeatmap(trades: CoachTrade[], stats: ReturnType<typeof statsForTrades>) {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const currentMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset));

  return Array.from({ length: 3 }, (_, weekIndex) => {
    const start = new Date(currentMonday);
    start.setUTCDate(currentMonday.getUTCDate() - (2 - weekIndex) * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    const values = Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + dayIndex);
      const key = date.toISOString().slice(0, 10);
      const dayTrades = trades.filter((trade) => trade.date.slice(0, 10) === key);

      if (!dayTrades.length) return null;

      const dayStats = statsForTrades(dayTrades);
      const pressurePenalty = dayTrades.filter((trade) => PRESSURE_EMOTIONS.has(trade.emotion)).length * 5;
      const frequencyPenalty = Math.max(0, dayTrades.length - 3) * 7;
      return Math.round(clamp(dayStats.riskScore * 0.4 + dayStats.emotionalScore * 0.3 + stats.disciplineScore * 0.3 - pressurePenalty - frequencyPenalty, 40, 98));
    });

    const format = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });
    return {
      values,
      week: `${format.format(start)} - ${format.format(end)}`
    };
  });
}

function emotionRows(trades: CoachTrade[]): CoachEmotionRow[] {
  const rows = [
    { label: "Fear", keys: ["Fear"], tone: "red" as CoachTone },
    { label: "Greed", keys: ["Greed", "Overconfident"], tone: "red" as CoachTone },
    { label: "FOMO", keys: ["FOMO", "Revenge Trading"], tone: "gold" as CoachTone },
    { label: "Confidence", keys: ["Confident"], tone: "green" as CoachTone },
    { label: "Patience", keys: ["Calm"], tone: "cyan" as CoachTone },
    { label: "Discipline", keys: ["Confident", "Calm"], tone: "green" as CoachTone }
  ];

  return rows.map((row) => {
    const matching = trades.filter((trade) => row.keys.includes(trade.emotion));
    const impact = matching.length ? matching.reduce((sum, trade) => sum + trade.rr, 0) / matching.length : 0;
    return {
      impact: roundTo(impact, 2),
      label: row.label,
      tone: row.tone,
      value: Math.round((matching.length / Math.max(1, trades.length)) * 100)
    };
  });
}

function behaviorMetrics(trades: CoachTrade[], stats: ReturnType<typeof statsForTrades>): CoachBehaviorMetric[] {
  const dayCounts = Object.values(countByDay(trades));
  const overtradeDays = dayCounts.filter((count) => count > 3).length;
  const closed = [...closedTrades(trades)].sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
  const revengeFlags = closed.filter((trade, index) => trade.result === "loss" && closed[index + 1]?.result === "loss").length;
  const fomoFlags = trades.filter((trade) => ["FOMO", "Greed", "Overconfident"].includes(trade.emotion) || /breakout|chase|late/i.test(trade.setup)).length;
  const pressureFlags = trades.filter((trade) => PRESSURE_EMOTIONS.has(trade.emotion)).length;
  const ruleFlags = trades.filter((trade) => /mistake|late|news|risk|revenge|fomo/i.test(trade.setup)).length;
  const riskFlags = trades.filter((trade) => trade.rr < -1).length + (stats.lossStreak >= 2 ? stats.lossStreak - 1 : 0);

  return [
    {
      detail: overtradeDays ? "Days above the preferred trade cap are reducing your consistency score." : "Trade frequency is currently within the preferred cap.",
      frequency: `${overtradeDays} days`,
      impact: clamp(overtradeDays * 24, 20, 84),
      label: "Overtrading",
      riskLevel: overtradeDays >= 3 ? "High" : overtradeDays ? "Medium" : "Low"
    },
    {
      detail: revengeFlags ? "Losses are clustering. A pause rule should trigger after a full loss." : "No clear revenge-trading cluster in the stored data.",
      frequency: `${revengeFlags} flags`,
      impact: clamp(revengeFlags * 28, 18, 82),
      label: "Revenge Trading",
      riskLevel: revengeFlags >= 2 ? "High" : revengeFlags ? "Medium" : "Low"
    },
    {
      detail: fomoFlags ? "Fast entries and breakout language are appearing in the weaker data." : "FOMO tags are controlled in the current journal sample.",
      frequency: `${fomoFlags} flags`,
      impact: clamp(fomoFlags * 8, 20, 88),
      label: "FOMO Entries",
      riskLevel: fomoFlags >= 6 ? "High" : fomoFlags >= 3 ? "Medium" : "Low"
    },
    {
      detail: "Emotion tags are being used to separate calm execution from pressure-based trades.",
      frequency: `${pressureFlags} pressure`,
      impact: clamp(stats.pressureRatio * 100, 16, 86),
      label: "Emotional Trading",
      riskLevel: stats.pressureRatio > 0.35 ? "High" : stats.pressureRatio > 0.18 ? "Medium" : "Low"
    },
    {
      detail: "Rule quality is inferred from setup names, notes, emotion tags, and trade outcomes.",
      frequency: `${ruleFlags} flags`,
      impact: clamp(ruleFlags * 10, 20, 78),
      label: "Rule Violations",
      riskLevel: ruleFlags >= 5 ? "High" : ruleFlags >= 2 ? "Medium" : "Low"
    },
    {
      detail: "Risk discipline is strongest when losses stay near -1R and streaks are interrupted quickly.",
      frequency: `${riskFlags} flags`,
      impact: clamp(100 - stats.riskScore, 14, 82),
      label: "Risk Violations",
      riskLevel: stats.riskScore < 62 ? "High" : stats.riskScore < 76 ? "Medium" : "Low"
    }
  ];
}

function buildProfile(trades: CoachTrade[], bestSession: string, bestTimeframe: string, weakestTimeframe: string): CoachProfile {
  const setupText = trades.map((trade) => trade.setup).join(" ").toLowerCase();
  const m5Ratio = trades.filter((trade) => trade.timeframe === "5m").length / Math.max(1, trades.length);
  const profileTitle = m5Ratio > 0.4
    ? "Precision Scalper"
    : /breakout/.test(setupText)
      ? "Breakout Momentum Trader"
      : /pullback|ema|trend/.test(setupText)
        ? "Trend Pullback Trader"
        : "Hybrid Trend Follower";

  return {
    description: `Your best decisions appear when you combine ${bestSession} liquidity with ${bestTimeframe} structure. The weaker area is ${weakestTimeframe}, where patience and confirmation need tighter rules.`,
    patterns: [
      `Best performance clusters around ${bestSession}.`,
      `${bestTimeframe} gives the cleanest decision quality.`,
      "Losses become more likely when pressure emotions are tagged before or after entry."
    ],
    strengths: [
      "Structured trade review data is now connected.",
      "Risk quality improves when trades are planned around session liquidity.",
      `Current best edge: ${bestSession} + ${bestTimeframe}.`
    ],
    title: profileTitle,
    weaknesses: [
      `${weakestTimeframe} needs stricter filtering.`,
      "Pause rules should be enforced after consecutive losses.",
      "Avoid high-impact news windows unless the setup is planned."
    ]
  };
}

function buildReports(params: {
  bestSession: string;
  bestSetup: string;
  bestTimeframe: string;
  stats: ReturnType<typeof statsForTrades>;
  weakestTimeframe: string;
}): Record<CoachReportType, CoachReport> {
  const { bestSession, bestSetup, bestTimeframe, stats, weakestTimeframe } = params;

  return {
    Daily: {
      achievements: [`Net result from stored closed trades is ${formatR(stats.netR)}.`, `Risk score is ${Math.round(stats.riskScore)}/100.`],
      improve: ["Write the emotion before entry so the coach can detect pressure earlier.", "Keep screenshots for before and after trade review."],
      strengths: [`Best current session is ${bestSession}.`, `${bestSetup} is the strongest setup cluster.`],
      title: "Daily Coach Report",
      weaknesses: [`Avoid forcing trades on ${weakestTimeframe}.`, "Pause after a full loss before taking the next setup."]
    },
    Weekly: {
      achievements: [`Win rate is ${formatPercent(stats.winRate)} from ${stats.closed} closed trades.`, `Average RR is ${stats.averageR.toFixed(2)}R.`],
      improve: [`Focus on ${bestTimeframe} and reduce lower-quality timeframes.`, "Use risk lock when two losses occur close together."],
      strengths: [`${bestSession} has the strongest performance profile.`, `Profit factor is ${stats.profitFactor.toFixed(2)}.`],
      title: "Weekly Coach Report",
      weaknesses: [`${weakestTimeframe} is the weakest timeframe in the current dataset.`, "Pressure emotions still reduce execution quality."]
    },
    Monthly: {
      achievements: [`AI performance score is ${Math.round(stats.coachRating)}/100.`, "Your data is now connected to the coach intelligence layer."],
      improve: ["Build more journal sample size for stronger personalization.", "Separate news-risk trades from normal technical setups."],
      strengths: ["Trade review workflow is becoming measurable.", `The clearest edge is ${bestSetup}.`],
      title: "Monthly Coach Report",
      weaknesses: ["Small sample sizes can overstate edge quality.", "Backtest summaries should be refreshed after major strategy changes."]
    }
  };
}

function buildCoachData(params: {
  backtests: BacktestRecord[];
  journalEntries: JournalEntryRecord[];
  journalNotice?: string;
  signals: SignalRecord[];
}) {
  const { backtests, journalEntries, journalNotice, signals } = params;
  const journalTrades = journalEntries.map(journalTrade);
  const backtestTrades = journalTrades.length ? [] : synthesizeTradesFromBacktests(backtests);
  const mode: AiCoachData["sourceSummary"]["mode"] = journalTrades.length || backtests.length ? "personal" : "fallback";
  const trades = journalTrades.length ? journalTrades : backtestTrades.length ? backtestTrades : fallbackTrades(signals);
  const stats = statsForTrades(trades);
  const sessions = groupStats(trades, SESSION_ORDER, (trade) => trade.session);
  const timeframes = groupStats(trades, TIMEFRAME_ORDER, (trade) => trade.timeframe);
  const setups = setupStats(trades);
  const bestSession = bestBy(sessions, (item) => item.winRate + item.averageR * 12 + item.total * 0.25);
  const worstSession = worstBy(sessions.filter((item) => item.total), (item) => item.winRate + item.averageR * 12);
  const bestTimeframe = bestBy(timeframes, (item) => item.winRate + item.averageR * 12 + item.total * 0.25);
  const weakestTimeframe = worstBy(timeframes.filter((item) => item.total), (item) => item.winRate + item.averageR * 12);
  const bestSetup = bestBy(setups.length ? setups : [{ label: "EMA Pullback", winRate: 0, averageR: 0, total: 0, profitFactor: 0 }], (item) => item.winRate + item.averageR * 16);
  const worstSetup = worstBy(setups.filter((item) => item.total), (item) => item.winRate + item.averageR * 16) ?? bestSetup;
  const pressure = stats.pressureRatio > 0.3;
  const weeklyDelta = Math.round(clamp(stats.tradingScore - 68, -18, 22));
  const monthlyDelta = Math.round(clamp(stats.coachRating - 66, -18, 26));
  const scoreEngine = [
    { label: "Discipline", score: Math.round(stats.disciplineScore) },
    { label: "Risk Management", score: Math.round(stats.riskScore) },
    { label: "Consistency", score: Math.round(stats.consistencyScore) },
    { label: "Psychology", score: Math.round(stats.emotionalScore) },
    { label: "Strategy Execution", score: Math.round(clamp(stats.winRate * 0.55 + stats.profitFactor * 12 + Math.max(0, stats.averageR) * 16, 20, 96)) }
  ];
  const disciplineScore = Math.round(stats.disciplineScore);
  const tradeFrequencyScore = Math.round(clamp(100 - Object.values(countByDay(trades)).filter((count) => count > 3).length * 12, 45, 96));
  const riskConsistency = Math.round(stats.riskScore);
  const ruleFollowing = Math.round(clamp(disciplineScore - stats.pressureRatio * 12, 35, 96));
  const mistakeRate = Math.round(clamp(100 - ruleFollowing, 0, 100));
  const recommendation = stats.riskScore < 70
    ? "Final AI Recommendation: protect capital first. Reduce risk size and pause after consecutive losses."
    : stats.winRate < 55
      ? `Final AI Recommendation: focus on ${bestTimeframe.label} during ${bestSession.label} and filter weaker setups.`
      : `Final AI Recommendation: keep trading selectively around ${bestSession.label}, prioritize ${bestSetup.label}, and keep risk under 1%.`;

  return {
    behaviorMetrics: behaviorMetrics(trades, stats),
    bottomSummary: {
      items: [
        { detail: `Most stable score from your stored trades: ${Math.round(stats.riskScore)}/100.`, label: "Biggest Strength", tone: "green" as CoachTone, value: stats.riskScore >= stats.emotionalScore ? "Risk Management" : "Emotional Control" },
        { detail: pressure ? "Pressure-tagged trades are still reducing the score." : "Main weakness is sample size. Add more journal trades.", label: "Biggest Weakness", tone: "red" as CoachTone, value: pressure ? "Pressure Entries" : "Low Sample Size" },
        { detail: `${monthlyDelta >= 0 ? "+" : ""}${monthlyDelta} pts estimated from current personal data.`, label: "Most Improved Area", tone: "violet" as CoachTone, value: stats.consistencyScore >= 76 ? "Consistency" : "Data Quality" },
        { detail: `${formatPercent(bestSession.winRate)} win rate, ${bestSession.averageR.toFixed(2)}R avg.`, label: "Highest Performing Session", tone: "cyan" as CoachTone, value: bestSession.label },
        { detail: `${bestSetup.total} matching trades in the coach dataset.`, label: "Highest Performing Setup", tone: "gold" as CoachTone, value: bestSetup.label }
      ],
      recommendation
    },
    commandCenter: {
      description: mode === "personal"
        ? `Your coach is reading ${journalEntries.length} journal entries, ${signals.length} saved signals, and ${backtests.length} backtest summaries. Best edge: ${bestSession.label} ${bestTimeframe.label}.`
        : "No real Supabase trade history is available yet, so the coach is using safe fallback data until you add journal trades or saved backtests.",
      grade: grade(stats.tradingScore),
      improvementTrend: stats.coachRating >= 76 ? "Rising" : stats.lossStreak >= 2 ? "Caution" : "Building",
      monthlyProgress: `${monthlyDelta >= 0 ? "+" : ""}${monthlyDelta}%`,
      rating: ratingFor(stats.tradingScore),
      score: Math.round(stats.tradingScore),
      weeklyProgress: `${weeklyDelta >= 0 ? "+" : ""}${weeklyDelta}%`
    },
    dateRange: formatDateRange(trades),
    discipline: {
      heatmap: buildDisciplineHeatmap(trades, stats),
      mistakeRate,
      riskConsistency,
      ruleFollowing,
      score: disciplineScore,
      tradeFrequency: tradeFrequencyScore
    },
    emotions: {
      rows: emotionRows(trades),
      score: Math.round(stats.emotionalScore)
    },
    footer: {
      message: mode === "personal"
        ? "AI Coach is now based on your saved journal, signal, and backtest data."
        : "AI Coach is waiting for real Supabase trade history. Add journal trades for personal coaching.",
      nextGoal: stats.winRate < 70 ? "Reach 70% win rate with fewer, higher-quality trades." : "Protect the edge by keeping risk and emotion stable."
    },
    goals: [
      { current: roundTo(stats.winRate, 1), detail: `${stats.closed} closed trades in the coach dataset.`, label: "Reach 70% Win Rate", target: 70, unit: "%" },
      { current: roundTo(stats.averageR, 2), detail: "Average realized R multiple from closed trades.", label: "Improve RR to 2.0", target: 2, unit: "R" },
      { current: roundTo(stats.maxDrawdown, 2), detail: "Current max drawdown measured in R.", label: "Reduce Drawdown", target: Math.max(1, roundTo(stats.maxDrawdown * 0.75, 2)), unit: "R" },
      { current: disciplineScore, detail: "Rule following, emotion, and risk quality.", label: "Improve Discipline", target: 90, unit: "%" }
    ],
    habits: {
      habitScore: Math.round(clamp((tradeFrequencyScore + riskConsistency + ruleFollowing + stats.emotionalScore) / 4, 20, 96)),
      rows: [
        { label: "Average Trades Per Day", score: tradeFrequencyScore, value: (trades.length / Math.max(1, Object.keys(countByDay(trades)).length)).toFixed(1) },
        { label: "Average Risk Per Trade", score: riskConsistency, value: stats.maxDrawdown > 6 ? "1.00%+" : "0.80%" },
        { label: "Average Holding Time", score: 72, value: "Journal-based" },
        { label: "Best Trading Day", score: Math.max(62, Math.round(bestSession.winRate)), value: bestSession.label },
        { label: "Worst Trading Day", score: Math.max(35, Math.round(worstSession?.winRate ?? 50)), value: worstSession?.label ?? "N/A" }
      ]
    },
    kpis: [
      { badge: grade(stats.tradingScore), helper: `${stats.closed} closed / ${stats.total} total`, label: "Trading Score", score: Math.round(stats.tradingScore), tone: "violet" as CoachTone, values: trendValues(stats.tradingScore) },
      { badge: stats.disciplineScore >= 76 ? "Good" : "Improve", helper: `${mistakeRate}% mistake rate`, label: "Discipline Score", score: disciplineScore, tone: "green" as CoachTone, values: trendValues(stats.disciplineScore) },
      { badge: stats.consistencyScore >= 76 ? "Good" : "Building", helper: `${formatPercent(stats.winRate)} win rate`, label: "Consistency Score", score: Math.round(stats.consistencyScore), tone: "blue" as CoachTone, values: trendValues(stats.consistencyScore) },
      { badge: stats.riskScore >= 76 ? "Good" : "Caution", helper: `${stats.lossStreak} max loss streak`, label: "Risk Score", score: Math.round(stats.riskScore), tone: "gold" as CoachTone, values: trendValues(stats.riskScore) },
      { badge: pressure ? "Watch" : "Stable", helper: `${Math.round(stats.pressureRatio * 100)}% pressure tags`, label: "Emotional Score", score: Math.round(stats.emotionalScore), tone: "cyan" as CoachTone, values: trendValues(stats.emotionalScore) },
      { badge: `${grade(stats.coachRating)} Grade`, helper: mode === "personal" ? "Real data mentor rating" : "Fallback mentor rating", label: "AI Coach Rating", score: Math.round(stats.coachRating), tone: "green" as CoachTone, values: trendValues(stats.coachRating) }
    ],
    performanceCards: [
      { detail: `${formatPercent(bestSession.winRate)} win rate and ${bestSession.averageR.toFixed(2)}R average.`, label: "Best Session", tone: "green" as CoachTone, value: bestSession.label },
      { detail: `${formatPercent(worstSession?.winRate ?? 0)} win rate. Avoid weak liquidity here.`, label: "Worst Session", tone: "red" as CoachTone, value: worstSession?.label ?? "Not enough data" },
      { detail: `${formatPercent(bestTimeframe.winRate)} win rate with ${bestTimeframe.total} trades.`, label: "Best Timeframe", tone: "green" as CoachTone, value: bestTimeframe.label },
      { detail: `${formatPercent(weakestTimeframe?.winRate ?? 0)} win rate. Needs stricter filter.`, label: "Worst Timeframe", tone: "gold" as CoachTone, value: weakestTimeframe?.label ?? "Not enough data" },
      { detail: `${bestSetup.total} trades, ${bestSetup.averageR.toFixed(2)}R average.`, label: "Best Setup", tone: "green" as CoachTone, value: bestSetup.label },
      { detail: `${worstSetup?.averageR.toFixed(2) ?? "0.00"}R average. Review entry quality.`, label: "Worst Setup", tone: "red" as CoachTone, value: worstSetup?.label ?? "Not enough data" }
    ],
    personalCoach: {
      insights: [
        { label: "Data Connected", tag: mode === "personal" ? "Live" : "Fallback", text: mode === "personal" ? "Your coach is now reading Supabase-backed journal, signals, and backtests." : "Add journal trades to Supabase so this panel becomes fully personal.", tone: mode === "personal" ? "green" as CoachTone : "gold" as CoachTone },
        { label: "Risk Management", tag: stats.riskScore >= 76 ? "Strength" : "Improve", text: stats.riskScore >= 76 ? "Risk remains inside the preferred operating zone." : "Risk quality is weak. Reduce size and pause after consecutive losses.", tone: stats.riskScore >= 76 ? "green" as CoachTone : "red" as CoachTone },
        { label: "Session Edge", tag: "Focus", text: `You perform best during ${bestSession.label}. Prioritize this window.`, tone: "cyan" as CoachTone },
        { label: "RR Momentum", tag: stats.averageR >= 1 ? "Strong" : "Improve", text: `Average RR is ${stats.averageR.toFixed(2)}R. ${stats.averageR >= 1 ? "Protect this by skipping low-quality setups." : "Improve target selection and avoid cutting winners early."}`, tone: stats.averageR >= 1 ? "green" as CoachTone : "gold" as CoachTone }
      ],
      message: mode === "personal"
        ? `Your personal data shows ${formatPercent(stats.winRate)} win rate, ${stats.profitFactor.toFixed(2)} profit factor, and best performance during ${bestSession.label}. The next improvement is filtering ${weakestTimeframe?.label ?? "weak"} trades.`
        : "Your AI Coach is ready, but it needs real journal entries or saved backtests in Supabase to become truly personal."
    },
    profile: buildProfile(trades, bestSession.label, bestTimeframe.label, weakestTimeframe?.label ?? "lower timeframes"),
    reports: buildReports({
      bestSession: bestSession.label,
      bestSetup: bestSetup.label,
      bestTimeframe: bestTimeframe.label,
      stats,
      weakestTimeframe: weakestTimeframe?.label ?? "lower timeframes"
    }),
    roadmap: [
      { detail: "Limit lower-quality trades and stop after two full losses.", progress: Math.round(clamp(tradeFrequencyScore, 20, 100)), title: "Reduce Overtrading", week: "Week 1" },
      { detail: `Lift average R from ${stats.averageR.toFixed(2)}R toward 2.0R.`, progress: Math.round(clamp((stats.averageR / 2) * 100, 10, 100)), title: "Improve RR", week: "Week 2" },
      { detail: `Prioritize ${bestSession.label} with ${bestTimeframe.label} confirmation.`, progress: Math.round(clamp(bestSession.winRate, 20, 100)), title: `Focus ${bestSession.label}`, week: "Week 3" },
      { detail: "Block new trades near CPI, NFP, FOMC, and major Fed speeches.", progress: Math.round(clamp(stats.emotionalScore - 10, 15, 92)), title: "Avoid News Volatility", week: "Week 4" }
    ],
    scoreEngine,
    sourceSummary: {
      backtests: backtests.length,
      journalEntries: journalEntries.length,
      mode,
      notice: journalNotice,
      signals: signals.length
    },
    weeklyReport: {
      grade: grade(stats.coachRating),
      headline: stats.coachRating >= 76 ? "Good Performance" : "Needs More Confirmation",
      metrics: [
        { label: "Total Trades", value: String(stats.total) },
        { label: "Win Rate", value: formatPercent(stats.winRate) },
        { label: "Profit Factor", value: stats.profitFactor.toFixed(2) },
        { label: "Net R", tone: stats.netR >= 0 ? "green" as CoachTone : "red" as CoachTone, value: formatR(stats.netR) }
      ],
      score: Math.round(stats.coachRating),
      takeaways: [
        { text: `You perform best during ${bestSession.label}.`, tone: "green" as CoachTone },
        { text: `Average trade result is ${stats.averageR.toFixed(2)}R.`, tone: stats.averageR >= 1 ? "green" as CoachTone : "gold" as CoachTone },
        { text: `Best setup cluster: ${bestSetup.label}.`, tone: "cyan" as CoachTone },
        { text: stats.lossStreak >= 2 ? `Avoid revenge trading. Max loss streak is ${stats.lossStreak}.` : "Loss streak risk is controlled.", tone: stats.lossStreak >= 2 ? "gold" as CoachTone : "green" as CoachTone }
      ]
    }
  } satisfies AiCoachData;
}

export async function getAiCoachData(): Promise<AiCoachData> {
  const [journal, signals, backtests] = await Promise.all([
    listJournalEntries(250),
    listStoredSignals(160),
    listStoredBacktests(80)
  ]);

  const notice = [journal.notice, signals.notice, backtests.notice].filter(Boolean).join(" ");

  return buildCoachData({
    backtests: backtests.backtests,
    journalEntries: journal.entries,
    journalNotice: notice || undefined,
    signals: signals.signals
  });
}
