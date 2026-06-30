import { getMarketAnalysis } from "@/lib/analysis";
import { getForexFactoryCalendar } from "@/lib/forex-factory";
import { listBacktests } from "@/lib/repositories/backtests";
import { listSignals } from "@/lib/repositories/signals";
import { type AlertCategory, type AlertPriority, type AlertStatus, type Tone } from "@/lib/alert-types";
import { type AnalysisResult, type BacktestRecord, type SignalRecord, type SignalType } from "@/lib/types";

type IconKey = "alert" | "clock" | "news" | "radio" | "shield" | "target" | "trend" | "zap";

export interface AlertKpiData {
  badge: string;
  helper: string;
  iconKey: IconKey;
  label: string;
  tone: Tone;
  value: string;
  values: number[];
}

export interface AlertItemData {
  action: string;
  category: AlertCategory;
  confidence: number;
  detail: string;
  iconKey: IconKey;
  id: string;
  message: string;
  metric: string;
  priority: AlertPriority;
  session: string;
  status: AlertStatus;
  symbol: string;
  time: string;
  tone: Tone;
  type: string;
}

export interface AlertHistoryData {
  action: string;
  category: AlertCategory;
  date: string;
  id: string;
  priority: AlertPriority;
  status: AlertStatus;
  symbol: string;
  type: string;
}

export interface AlertCategoryCountData {
  count: number;
  label: "All" | AlertCategory;
  tone: Tone;
}

export interface AlertInsightData {
  label: string;
  tone: Tone;
}

export interface AlertSummaryData {
  helper: string;
  iconKey: IconKey;
  label: string;
  tone: Tone;
  value: string;
}

export interface AlertDashboardData {
  accuracyTrend: number[];
  categoryCounts: AlertCategoryCountData[];
  generatedAt: string;
  historyRows: AlertHistoryData[];
  insights: AlertInsightData[];
  items: AlertItemData[];
  kpis: AlertKpiData[];
  summary: AlertSummaryData[];
}

function formatTime(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDateTime(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function priorityFromConfidence(confidence: number): AlertPriority {
  if (confidence >= 90) return "Critical";
  if (confidence >= 75) return "High";
  if (confidence >= 60) return "Medium";
  return "Low";
}

function toneFromSignal(signalType: SignalType): Tone {
  if (signalType === "BUY") return "green";
  if (signalType === "SELL") return "red";
  return "gold";
}

function currentSession(date = new Date()) {
  const hour = date.getUTCHours();

  if (hour >= 20 || hour < 5) return "Sydney";
  if (hour >= 0 && hour < 8) return "Tokyo";
  if (hour >= 7 && hour < 16) return "London";
  if (hour >= 13 && hour < 22) return "New York";
  return "Overlap";
}

function minutesUntil(value: string) {
  return Math.round((new Date(value).getTime() - Date.now()) / 60_000);
}

function hhmmFromMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(totalMinutes, 0);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function countByCategory(items: AlertItemData[]): AlertCategoryCountData[] {
  const categories: Array<{ label: AlertCategory; tone: Tone }> = [
    { label: "Signal", tone: "green" },
    { label: "News", tone: "gold" },
    { label: "Risk", tone: "red" },
    { label: "Session", tone: "blue" },
    { label: "Market", tone: "cyan" }
  ];

  return [
    { count: items.length, label: "All", tone: "violet" },
    ...categories.map((category) => ({
      ...category,
      count: items.filter((item) => item.category === category.label).length
    }))
  ];
}

function buildSignalAlert(analysis: AnalysisResult): AlertItemData {
  const signal = analysis.signal;
  const priority = priorityFromConfidence(signal.weightedConfidence?.final ?? signal.confidence);
  const confidence = signal.weightedConfidence?.final ?? signal.confidence;
  const tradeAction = signal.signalType === "HOLD" ? "No new trade pushed" : "Signal routed to alert desk";

  return {
    action: tradeAction,
    category: "Signal",
    confidence,
    detail: `${signal.symbol} | ${signal.timeframe.toUpperCase()} | Entry ${signal.entryPrice.toFixed(2)} | TP1 ${signal.takeProfit1.toFixed(2)} | SL ${signal.stopLoss.toFixed(2)}`,
    iconKey: "trend",
    id: `signal-${signal.createdAt}`,
    message: `${signal.signalType} Signal Generated`,
    metric: analysis.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
    priority,
    session: currentSession(),
    status: signal.signalType === "HOLD" ? "Read" : "Unread",
    symbol: signal.symbol,
    time: formatTime(signal.createdAt),
    tone: toneFromSignal(signal.signalType),
    type: "Signal Alert"
  };
}

function buildMarketAlerts(analysis: AnalysisResult): AlertItemData[] {
  const signal = analysis.signal;
  const indicators = analysis.indicators;
  const items: AlertItemData[] = [];
  const atr = indicators.atr14 ?? 0;
  const volatilityLevel = signal.tradeManagement?.volatilityLevel ?? (atr > 20 ? "High" : atr > 12 ? "Medium" : "Low");

  items.push({
    action: "Volatility filter updated",
    category: "Market",
    confidence: Math.min(95, Math.round(55 + atr)),
    detail: `ATR(14) is ${atr.toFixed(2)}. Volatility level is ${volatilityLevel}; manage stop distance and partial profits carefully.`,
    iconKey: "zap",
    id: `market-volatility-${signal.createdAt}`,
    message: `${volatilityLevel} Volatility Detected`,
    metric: volatilityLevel,
    priority: volatilityLevel === "Extreme" || volatilityLevel === "High" ? "High" : volatilityLevel === "Medium" ? "Medium" : "Low",
    session: currentSession(),
    status: "Unread",
    symbol: signal.symbol,
    time: formatTime(signal.createdAt),
    tone: volatilityLevel === "High" || volatilityLevel === "Extreme" ? "red" : volatilityLevel === "Medium" ? "gold" : "cyan",
    type: "Market Alert"
  });

  return items;
}

function buildRiskAlerts(analysis: AnalysisResult, backtests: BacktestRecord[]): AlertItemData[] {
  const signal = analysis.signal;
  const latestBacktest = backtests[0];
  const riskScore = signal.riskScore ?? 75;
  const drawdown = latestBacktest?.max_drawdown ?? 0;
  const items: AlertItemData[] = [];

  if (riskScore < 70 || drawdown >= 8 || signal.newsRisk === "High") {
    items.push({
      action: "Risk panel marked caution",
      category: "Risk",
      confidence: Math.round(Math.max(70, 100 - riskScore + drawdown)),
      detail: `Risk score ${riskScore}/100, news risk ${signal.newsRisk ?? "Medium"}, latest drawdown ${drawdown.toFixed(2)}R.`,
      iconKey: "shield",
      id: `risk-${signal.createdAt}`,
      message: drawdown >= 8 ? "Drawdown Risk Elevated" : "Risk Filter Warning",
      metric: `${Math.round(100 - riskScore)}%`,
      priority: drawdown >= 10 || signal.newsRisk === "High" ? "Critical" : "Medium",
      session: currentSession(),
      status: "Unread",
      symbol: "Account",
      time: formatTime(signal.createdAt),
      tone: drawdown >= 10 || signal.newsRisk === "High" ? "red" : "gold",
      type: "Risk Alert"
    });
  }

  return items;
}

async function buildNewsAlerts(): Promise<AlertItemData[]> {
  const calendar = await getForexFactoryCalendar(8);
  const upcoming = calendar.events
    .filter((event) => event.timestamp >= Date.now())
    .filter((event) => event.country === "USD" || event.country === "All")
    .filter((event) => ["high", "medium"].some((impact) => event.impact.toLowerCase().includes(impact)))
    .slice(0, 2);

  return upcoming.map((event, index) => {
    const minutes = minutesUntil(event.date);
    const isHigh = event.impact.toLowerCase().includes("high");

    return {
      action: isHigh ? "Trade lock warning shown" : "Macro watchlist updated",
      category: "News",
      confidence: isHigh ? 92 : 76,
      detail: `${event.country} ${event.title} in ${minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${Math.max(minutes, 0)}m`}. Forecast ${event.forecast || "-"}, previous ${event.previous || "-"}.`,
      iconKey: "news",
      id: `news-${event.timestamp}-${index}`,
      message: isHigh ? "High Impact News Incoming" : "Medium Impact News Watch",
      metric: hhmmFromMinutes(minutes),
      priority: isHigh && minutes <= 60 ? "Critical" : isHigh ? "High" : "Medium",
      session: currentSession(new Date(event.date)),
      status: "Unread",
      symbol: event.country,
      time: formatTime(event.date),
      tone: isHigh ? "red" : "gold",
      type: "News Alert"
    };
  });
}

function buildSessionAlert(analysis: AnalysisResult): AlertItemData {
  const session = currentSession();
  const score = analysis.signal.sessionScore ?? (session === "London" || session === "New York" ? 86 : 64);

  return {
    action: "Session liquidity scored",
    category: "Session",
    confidence: score,
    detail: `${session} session is active. Liquidity score is ${score}/100 for ${analysis.symbol}.`,
    iconKey: "clock",
    id: `session-${analysis.signal.createdAt}`,
    message: `${session} Session Active`,
    metric: `${score}/100`,
    priority: score >= 80 ? "Medium" : "Low",
    session,
    status: score >= 80 ? "Unread" : "Read",
    symbol: analysis.symbol,
    time: formatTime(new Date()),
    tone: score >= 80 ? "blue" : "cyan",
    type: "Session Alert"
  };
}

function historyFromSignals(signals: SignalRecord[]): AlertHistoryData[] {
  return signals.slice(0, 8).map((signal) => ({
    action: signal.signal_type === "HOLD" ? "Stored as watch signal" : "Saved signal available for review",
    category: "Signal",
    date: formatDateTime(signal.created_at),
    id: signal.id,
    priority: priorityFromConfidence(signal.confidence),
    status: "Read",
    symbol: signal.symbol,
    type: `${signal.signal_type} Signal Saved`
  }));
}

function buildKpis(items: AlertItemData[], signals: SignalRecord[], backtests: BacktestRecord[]): AlertKpiData[] {
  const categoryCount = (category: AlertCategory) => items.filter((item) => item.category === category).length;
  const activeAlerts = items.filter((item) => item.status === "Unread").length;
  const latestWinRate = backtests[0]?.win_rate ?? 0;
  const accuracy = Math.round((latestWinRate || 70) * 0.7 + Math.min(100, signals.length * 3) * 0.3);

  return [
    { badge: "Live model", helper: `${items.length} generated from current analysis`, iconKey: "alert", label: "Total Alerts Today", tone: "violet", value: String(items.length), values: [1, 2, 2, 3, 4, 4, 5, items.length] },
    { badge: "Active", helper: `${activeAlerts} unread operating alerts`, iconKey: "radio", label: "Active Alerts", tone: activeAlerts ? "red" : "green", value: String(activeAlerts), values: [0, 1, 1, 2, 2, 3, activeAlerts, activeAlerts] },
    { badge: "Signal engine", helper: `${signals.length} saved signal records`, iconKey: "trend", label: "Signal Alerts", tone: "green", value: String(categoryCount("Signal")), values: [1, 1, 2, 2, 3, 3, 4, categoryCount("Signal")] },
    { badge: "Macro", helper: "Forex Factory calendar", iconKey: "news", label: "News Alerts", tone: "gold", value: String(categoryCount("News")), values: [0, 1, 1, 1, 2, 2, categoryCount("News"), categoryCount("News")] },
    { badge: "Guardrails", helper: "Risk filters from signal/backtest", iconKey: "shield", label: "Risk Alerts", tone: "red", value: String(categoryCount("Risk")), values: [0, 0, 1, 1, 1, 2, categoryCount("Risk"), categoryCount("Risk")] },
    { badge: `${accuracy} / 100`, helper: "Based on latest backtests", iconKey: "target", label: "Alert Accuracy Score", tone: "blue", value: `${accuracy}%`, values: [62, 66, 69, 71, 74, 78, 82, accuracy] }
  ];
}

function buildInsights(items: AlertItemData[], analysis: AnalysisResult): AlertInsightData[] {
  const highNews = items.find((item) => item.category === "News" && ["High", "Critical"].includes(item.priority));
  const signal = analysis.signal;

  return [
    { label: `${signal.signalType} signal confidence is ${signal.confidence}% on ${signal.timeframe.toUpperCase()}; alert only if it clears your configured threshold.`, tone: signal.signalType === "HOLD" ? "gold" : toneFromSignal(signal.signalType) },
    { label: highNews ? `${highNews.message}: ${highNews.detail}` : "No immediate high-impact USD event detected in the current alert window.", tone: highNews ? "red" : "green" },
    { label: `Trend strength is ${signal.trendStrength ?? 0}/100 and risk score is ${signal.riskScore ?? 0}/100. Use this to filter weak alerts.`, tone: (signal.trendStrength ?? 0) >= 70 ? "green" : "gold" },
    { label: `Current session is ${currentSession()} with session score ${signal.sessionScore ?? 0}/100.`, tone: (signal.sessionScore ?? 0) >= 80 ? "green" : "blue" }
  ];
}

function buildSummary(items: AlertItemData[], analysis: AnalysisResult): AlertSummaryData[] {
  const highPriority = items.find((item) => item.priority === "Critical" || item.priority === "High");
  const news = items.find((item) => item.category === "News");
  const signal = analysis.signal;

  return [
    { helper: `${items.filter((item) => item.category === "Signal").length} live signal alert`, iconKey: "alert", label: "Most Triggered Alert", tone: "violet", value: "Signal Alert" },
    { helper: `${signal.confidence}% confidence`, iconKey: "target", label: "Highest Accuracy Alert", tone: "green", value: `${signal.signalType} Signal` },
    { helper: highPriority?.detail.slice(0, 34) ?? "No critical event", iconKey: "shield", label: "Highest Priority Event", tone: highPriority?.tone ?? "green", value: highPriority?.message ?? "System Normal" },
    { helper: news?.metric ?? "No countdown", iconKey: "news", label: "Most Important News Event", tone: news?.tone ?? "green", value: news?.symbol === "USD" ? "USD Event" : "No Major News" },
    { helper: `${items.length} real-time alerts`, iconKey: "radio", label: "Current System Status", tone: "cyan", value: "Operational" },
    { helper: signal.newsRisk === "High" ? "Protect capital first" : "Follow quality threshold", iconKey: "zap", label: "AI Recommendation", tone: signal.newsRisk === "High" ? "red" : "violet", value: signal.newsRisk === "High" ? "Trade Caution" : signal.signalType }
  ];
}

export async function getAlertDashboardData(): Promise<AlertDashboardData> {
  const [analysis, signals, backtests, newsAlerts] = await Promise.all([
    getMarketAnalysis({ symbol: "XAUUSD", timeframe: "1h" }),
    listSignals(50),
    listBacktests(50),
    buildNewsAlerts()
  ]);

  const items = [
    buildSignalAlert(analysis),
    ...newsAlerts,
    ...buildRiskAlerts(analysis, backtests),
    buildSessionAlert(analysis),
    ...buildMarketAlerts(analysis)
  ];
  const categoryCounts = countByCategory(items);
  const historyRows = historyFromSignals(signals);
  const accuracyTrend = buildKpis(items, signals, backtests).at(-1)?.values ?? [65, 68, 70, 72, 75, 78, 80, 82];

  return {
    accuracyTrend,
    categoryCounts,
    generatedAt: new Date().toISOString(),
    historyRows,
    insights: buildInsights(items, analysis),
    items,
    kpis: buildKpis(items, signals, backtests),
    summary: buildSummary(items, analysis)
  };
}
