"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import StatsGrid from "@/components/dashboard/StatsGrid";
import EquityChart from "@/components/dashboard/EquityChart";
import StatsSkeleton from "@/components/dashboard/StatsSkeleton";
import ChartSkeleton from "@/components/dashboard/ChartSkeleton";
import { TradeFilters } from "@/components/trades/TradeFilters";
import { MarketWatchlist } from "@/components/market/MarketWatchlist";
import { MarketDataCard } from "@/components/dashboard/MarketDataCard";
import type { TradeFilters as ITradeFilters } from "@/types/trade";
import { Suspense } from "react";

export function DashboardContent() {
  const [filters, setFilters] = useState<ITradeFilters>({});

  return (
    <div className="h-full">
      {/* Main content */}
      <div className="space-y-6 overflow-y-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Trading Dashboard"
            description="Performance overview and key metrics."
          />
        </div>

        <div>
          <TradeFilters onFilterChange={setFilters} alwaysOpen />
        </div>

        <div className="space-y-6">
          <Suspense fallback={<StatsSkeleton />}>
            <StatsGrid filters={filters} />
          </Suspense>

          {/* Real-time Market Data Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Market Data Card - takes 1/3 of the row on large screens */}
            <div className="lg:col-span-1">
              <MarketDataCard />
            </div>
            
            {/* Watchlist - takes 2/3 of the row on large screens */}
            <div className="lg:col-span-2">
              <MarketWatchlist />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Equity Curve */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold">Equity Curve</h3>
              <div className="h-[300px]">
                <Suspense fallback={<ChartSkeleton />}>
                  <EquityChart filters={filters} />
                </Suspense>
              </div>
            </div>

            {/* Monthly Performance */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold">Monthly Performance</h3>
              <div className="h-[300px]">
                <Suspense fallback={<ChartSkeleton />}>
                  <EquityChart variant="monthly" filters={filters} />
                </Suspense>
              </div>
            </div>
            
            {/* Win Rate Chart */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold">Win Rate Distribution</h3>
              <div className="h-[300px]">
                <Suspense fallback={<ChartSkeleton />}>
                  <EquityChart variant="winRate" filters={filters} />
                </Suspense>
              </div>
            </div>

            {/* Trade Distribution */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold">Trade Distribution</h3>
              <div className="h-[300px]">
                <Suspense fallback={<ChartSkeleton />}>
                  <EquityChart variant="distribution" filters={filters} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}