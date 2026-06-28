import { SignalHistoryTable } from "@/components/signal-history-table";
import { listSignalHistory } from "@/lib/repositories/signals";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const history = await listSignalHistory(128);

  return <SignalHistoryTable signals={history.signals} source={history.source} notice={history.notice} />;
}
