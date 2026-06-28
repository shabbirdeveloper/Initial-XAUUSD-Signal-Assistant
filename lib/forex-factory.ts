export const FOREX_FACTORY_CALENDAR_URL = "https://www.forexfactory.com/calendar?week=this";
export const FOREX_FACTORY_JSON_URL =
  process.env.FOREX_FACTORY_EXPORT_URL ?? "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

const GOLD_RELEVANT_COUNTRIES = new Set(["USD", "All", "CNY", "EUR", "GBP", "JPY", "CHF"]);

export interface ForexFactoryEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  actual: string;
  forecast: string;
  previous: string;
  timestamp: number;
}

export interface ForexFactoryCalendarResult {
  events: ForexFactoryEvent[];
  fetchedAt: string;
  sourceUrl: string;
  exportUrl: string;
  warning?: string;
}

interface RawForexFactoryEvent {
  title?: unknown;
  country?: unknown;
  currency?: unknown;
  date?: unknown;
  impact?: unknown;
  actual?: unknown;
  forecast?: unknown;
  previous?: unknown;
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function createUtcDate(offsetDays: number, hour: number, minute = 0) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offsetDays);
  value.setUTCHours(hour, minute, 0, 0);

  if (value.getTime() < Date.now()) {
    value.setUTCDate(value.getUTCDate() + 1);
  }

  return value.toISOString();
}

function getFallbackForexFactoryEvents(): ForexFactoryEvent[] {
  const templates = [
    {
      title: "US CPI m/m",
      country: "USD",
      impact: "High",
      forecast: "0.2%",
      previous: "0.3%",
      date: createUtcDate(0, 12, 30)
    },
    {
      title: "US Retail Sales m/m",
      country: "USD",
      impact: "High",
      forecast: "0.1%",
      previous: "0.4%",
      date: createUtcDate(0, 14, 0)
    },
    {
      title: "FOMC Member Speech",
      country: "USD",
      impact: "Medium",
      forecast: "",
      previous: "",
      date: createUtcDate(0, 17, 0)
    },
    {
      title: "Unemployment Claims",
      country: "USD",
      impact: "High",
      forecast: "240K",
      previous: "248K",
      date: createUtcDate(1, 12, 30)
    },
    {
      title: "Fed Chair Speech",
      country: "USD",
      impact: "High",
      forecast: "",
      previous: "",
      date: createUtcDate(1, 19, 0)
    },
    {
      title: "ECB President Speech",
      country: "EUR",
      impact: "Medium",
      forecast: "",
      previous: "",
      date: createUtcDate(2, 13, 0)
    }
  ];

  return templates.map((event) => {
    const timestamp = new Date(event.date).getTime();

    return {
      ...event,
      actual: "",
      timestamp
    };
  });
}

function normalizeEvent(value: RawForexFactoryEvent): ForexFactoryEvent | null {
  const date = asText(value.date);
  const timestamp = new Date(date).getTime();

  if (!date || Number.isNaN(timestamp)) {
    return null;
  }

  return {
    title: asText(value.title) || "Untitled event",
    country: asText(value.country) || asText(value.currency) || "All",
    date,
    impact: asText(value.impact) || "Low",
    actual: asText(value.actual),
    forecast: asText(value.forecast),
    previous: asText(value.previous),
    timestamp
  };
}

function sortByMarketRelevance(events: ForexFactoryEvent[]) {
  const now = Date.now();

  return [...events].sort((left, right) => {
    const leftUpcoming = left.timestamp >= now;
    const rightUpcoming = right.timestamp >= now;

    if (leftUpcoming !== rightUpcoming) {
      return leftUpcoming ? -1 : 1;
    }

    return leftUpcoming ? left.timestamp - right.timestamp : right.timestamp - left.timestamp;
  });
}

export async function getForexFactoryCalendar(limit = 28): Promise<ForexFactoryCalendarResult> {
  try {
    const response = await fetch(FOREX_FACTORY_JSON_URL, {
      headers: {
        accept: "application/json"
      },
      next: { revalidate: 15 * 60 }
    });

    if (!response.ok) {
      throw new Error(`Forex Factory export returned ${response.status}.`);
    }

    const payload = (await response.json()) as unknown;

    if (!Array.isArray(payload)) {
      throw new Error("Forex Factory export shape changed.");
    }

    const events = payload
      .map((item) => normalizeEvent(item as RawForexFactoryEvent))
      .filter((event): event is ForexFactoryEvent => Boolean(event))
      .filter((event) => GOLD_RELEVANT_COUNTRIES.has(event.country))
      .filter((event) => !event.impact.toLowerCase().includes("holiday"));

    if (events.length === 0) {
      throw new Error("Forex Factory export returned no gold-relevant events.");
    }

    return {
      events: sortByMarketRelevance(events).slice(0, limit),
      fetchedAt: new Date().toISOString(),
      sourceUrl: FOREX_FACTORY_CALENDAR_URL,
      exportUrl: FOREX_FACTORY_JSON_URL
    };
  } catch (error) {
    return {
      events: sortByMarketRelevance(getFallbackForexFactoryEvents()).slice(0, limit),
      fetchedAt: new Date().toISOString(),
      sourceUrl: FOREX_FACTORY_CALENDAR_URL,
      exportUrl: FOREX_FACTORY_JSON_URL,
      warning:
        error instanceof Error
          ? `${error.message} Showing fallback economic calendar until Forex Factory is reachable.`
          : "Unable to load Forex Factory calendar. Showing fallback economic calendar until Forex Factory is reachable."
    };
  }
}
