import { getSupabaseServerClient } from "@/lib/supabase/server";

export type JournalDirection = "BUY" | "SELL";
export type JournalResult = "win" | "loss" | "breakeven" | "open";
export type JournalEmotion =
  | "Confident"
  | "Calm"
  | "Fear"
  | "Greed"
  | "Revenge Trading"
  | "FOMO"
  | "Overconfident";
export type JournalSession = "Sydney" | "Tokyo" | "London" | "New York" | "London + NY";
export type JournalTimeframe = "5m" | "15m" | "30m" | "1h" | "4h" | "D" | "W" | "M";
export type ScreenshotSlot = "before" | "during" | "after";

export interface JournalEntryRecord {
  id: string;
  tradeDate: string;
  symbol: string;
  direction: JournalDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  result: JournalResult;
  rrAchieved: number;
  session: JournalSession;
  timeframe: JournalTimeframe;
  setup: string;
  emotion: JournalEmotion;
  whyEntered: string;
  whyExited: string;
  mistakes: string;
  lessons: string;
  improvements: string;
  screenshots: Record<ScreenshotSlot, string>;
}

export type JournalSource = "supabase" | "empty" | "unavailable" | "unconfigured";

export interface JournalHistoryResult {
  entries: JournalEntryRecord[];
  source: JournalSource;
  notice?: string;
}

type DbJournalEntry = {
  id: string;
  trade_date: string;
  symbol: string;
  direction: JournalDirection;
  entry_price: number | string;
  stop_loss: number | string;
  take_profit: number | string;
  result: JournalResult;
  rr_achieved: number | string;
  session: JournalSession;
  timeframe: JournalTimeframe;
  setup: string | null;
  emotion: JournalEmotion | null;
  why_entered: string | null;
  why_exited: string | null;
  mistakes: string | null;
  lessons: string | null;
  improvements: string | null;
  screenshots: Record<ScreenshotSlot, string> | null;
};

const TABLE_NAME = "trade_journal";

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeScreenshots(value: unknown): Record<ScreenshotSlot, string> {
  if (!value || typeof value !== "object") {
    return { after: "", before: "", during: "" };
  }

  const screenshots = value as Partial<Record<ScreenshotSlot, unknown>>;
  return {
    after: typeof screenshots.after === "string" ? screenshots.after : "",
    before: typeof screenshots.before === "string" ? screenshots.before : "",
    during: typeof screenshots.during === "string" ? screenshots.during : ""
  };
}

function fromDb(row: DbJournalEntry): JournalEntryRecord {
  return {
    direction: row.direction,
    emotion: row.emotion ?? "Calm",
    entryPrice: asNumber(row.entry_price),
    id: row.id,
    improvements: row.improvements ?? "",
    lessons: row.lessons ?? "",
    mistakes: row.mistakes ?? "",
    result: row.result,
    rrAchieved: asNumber(row.rr_achieved),
    screenshots: normalizeScreenshots(row.screenshots),
    session: row.session,
    setup: row.setup ?? "Manual Journal Entry",
    stopLoss: asNumber(row.stop_loss),
    symbol: row.symbol,
    takeProfit: asNumber(row.take_profit),
    timeframe: row.timeframe,
    tradeDate: row.trade_date,
    whyEntered: row.why_entered ?? "",
    whyExited: row.why_exited ?? ""
  };
}

function toDb(entry: JournalEntryRecord) {
  return {
    direction: entry.direction,
    emotion: entry.emotion,
    entry_price: entry.entryPrice,
    id: entry.id,
    improvements: entry.improvements,
    lessons: entry.lessons,
    mistakes: entry.mistakes,
    result: entry.result,
    rr_achieved: entry.rrAchieved,
    screenshots: entry.screenshots,
    session: entry.session,
    setup: entry.setup,
    stop_loss: entry.stopLoss,
    symbol: entry.symbol,
    take_profit: entry.takeProfit,
    timeframe: entry.timeframe,
    trade_date: entry.tradeDate,
    why_entered: entry.whyEntered,
    why_exited: entry.whyExited
  };
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.message?.toLowerCase().includes(TABLE_NAME);
}

export async function listJournalEntries(limit = 200): Promise<JournalHistoryResult> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      entries: [],
      source: "unconfigured",
      notice: "Supabase is not configured. AI Coach is using fallback coaching data."
    };
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("trade_date", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        entries: [],
        source: isMissingTableError(error) ? "empty" : "unavailable",
        notice: isMissingTableError(error)
          ? "Supabase trade_journal table is not created yet. Run the updated schema to enable real journal coaching."
          : `Supabase trade journal is unavailable: ${error.message}.`
      };
    }

    if (!data?.length) {
      return {
        entries: [],
        source: "empty",
        notice: "No Supabase trade journal entries yet. Add journal trades to make AI Coach personal."
      };
    }

    return {
      entries: (data as DbJournalEntry[]).map(fromDb),
      source: "supabase"
    };
  } catch (error) {
    return {
      entries: [],
      source: "unavailable",
      notice:
        error instanceof Error
          ? `Supabase trade journal is unavailable: ${error.message}.`
          : "Supabase trade journal is unavailable."
    };
  }
}

export async function saveJournalEntry(entry: JournalEntryRecord) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { saved: false, reason: "Supabase is not configured." };
  }

  try {
    const { error } = await supabase.from(TABLE_NAME).upsert(toDb(entry), { onConflict: "id" });

    if (error) {
      return { saved: false, reason: error.message };
    }

    return { saved: true };
  } catch (error) {
    return {
      saved: false,
      reason: error instanceof Error ? error.message : "Unable to save journal entry."
    };
  }
}
