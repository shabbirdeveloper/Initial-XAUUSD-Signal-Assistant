import { DashboardClient } from "@/components/dashboard-client";
import { getMarketAnalysis } from "@/lib/analysis";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const analysis = await getMarketAnalysis({
    symbol: "XAUUSD",
    timeframe: "1h"
  });

  return <DashboardClient initialAnalysis={analysis} />;
}
