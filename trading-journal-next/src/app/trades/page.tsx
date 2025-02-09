import { Suspense } from "react";
import TradeTable from "@/components/trades/TradeTable";
import TableSkeleton from "@/components/trades/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";

export default function TradesPage() {
  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Trade Log"
        description="View and manage your trading history."
      />
      <div className="space-y-4">
        <Suspense fallback={<TableSkeleton />}>
          <TradeTable />
        </Suspense>
      </div>
    </div>
  );
}