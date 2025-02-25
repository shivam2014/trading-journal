'use client';

import { Suspense } from "react";
import { TradeLog } from "@/components/trades/TradeLog";
import { PageHeader } from "@/components/layout/PageHeader";
import { TradeFilters } from "@/components/trades/TradeFilters";
import { useState } from "react";
import type { TradeFilters as ITradeFilters } from "@/types/trade";

const defaultFilters: ITradeFilters = {
  symbols: [],
  strategy: undefined,
  session: undefined,
  startDate: undefined,
  endDate: undefined,
  action: undefined,
  status: undefined,
  currency: undefined,
  groupType: 'strategy' // Default grouping
};

export default function TradesPage() {
  const [filters, setFilters] = useState<ITradeFilters>(defaultFilters);

  const handleFilterChange = (newFilters: Partial<ITradeFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Trade Log"
        description="View and analyze your trading history with advanced grouping and filtering."
      />
      <div className="space-y-6">
        {/* Filters Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-medium text-gray-900 dark:text-gray-100">
            Filters & Options
          </h2>
          <TradeFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* Trade Log */}
        <Suspense
          fallback={
            <div className="flex h-48 items-center justify-center">
              <div className="text-gray-500 dark:text-gray-400">Loading trades...</div>
            </div>
          }
        >
          <TradeLog filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}