import ImportTrades from "@/components/trades/ImportTrades";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ImportPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <PageHeader title="Import Trades" description="Import your trades from supported brokers" />
      <ImportTrades />
    </div>
  );
}