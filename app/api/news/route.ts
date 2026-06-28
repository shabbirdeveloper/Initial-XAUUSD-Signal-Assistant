import { NextResponse } from "next/server";
import { getForexFactoryCalendar } from "@/lib/forex-factory";
import { getWorldEconomicUpdates } from "@/lib/world-economic-updates";

export const dynamic = "force-dynamic";

export async function GET() {
  const [calendar, economicUpdates] = await Promise.all([
    getForexFactoryCalendar(),
    getWorldEconomicUpdates()
  ]);

  return NextResponse.json({
    calendar,
    economicUpdates
  });
}
