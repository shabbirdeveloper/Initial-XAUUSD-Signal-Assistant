import { NextResponse } from "next/server";
import { getAlertDashboardData } from "@/lib/alert-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAlertDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate alert data."
      },
      { status: 500 }
    );
  }
}

