import { AiCoachClient } from "@/components/ai-coach-client";
import { getAiCoachData } from "@/lib/ai-coach-data";

export const dynamic = "force-dynamic";

export default async function AiCoachPage() {
  const coachData = await getAiCoachData();
  return <AiCoachClient coachData={coachData} />;
}
