import { NextResponse } from "next/server";
import { listSignals, saveSignal } from "@/lib/repositories/signals";
import { type SignalResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const signals = await listSignals(50);
    return NextResponse.json(signals);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { signal?: SignalResult };

    if (!body.signal) {
      return NextResponse.json({ saved: false, reason: "Missing signal payload." }, { status: 400 });
    }

    const result = await saveSignal(body.signal);
    return NextResponse.json(result, { status: result.saved ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      { saved: false, reason: error instanceof Error ? error.message : "Unable to save signal." },
      { status: 500 }
    );
  }
}
