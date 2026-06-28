import { NextResponse } from "next/server";
import {
  listJournalEntries,
  saveJournalEntry,
  type JournalEntryRecord
} from "@/lib/repositories/journal";

export const dynamic = "force-dynamic";

function isValidJournalEntry(value: unknown): value is JournalEntryRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<JournalEntryRecord>;
  return Boolean(
    entry.id &&
      entry.tradeDate &&
      entry.symbol &&
      entry.direction &&
      entry.result &&
      entry.session &&
      entry.timeframe &&
      Number.isFinite(Number(entry.entryPrice)) &&
      Number.isFinite(Number(entry.stopLoss)) &&
      Number.isFinite(Number(entry.takeProfit)) &&
      Number.isFinite(Number(entry.rrAchieved))
  );
}

export async function GET() {
  const result = await listJournalEntries(250);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const entry = (await request.json()) as unknown;

    if (!isValidJournalEntry(entry)) {
      return NextResponse.json({ saved: false, reason: "Invalid journal entry payload." }, { status: 400 });
    }

    const result = await saveJournalEntry(entry);
    return NextResponse.json(result, { status: result.saved ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      { saved: false, reason: error instanceof Error ? error.message : "Unable to save journal entry." },
      { status: 500 }
    );
  }
}
