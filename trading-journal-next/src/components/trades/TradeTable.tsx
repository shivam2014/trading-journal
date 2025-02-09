"use client";

import { useState } from "react";
import Link from "next/link";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { useGroupedTrades } from "@/lib/hooks/useGroupedTrades";
import { formatCurrency } from "@/lib/utils/format";
import { type TradeSort, type TradeFilters } from "@/types/trade";
import { TradeGroup } from "./TradeGroup";
import { TradeFilters as TradeFilterControls } from "./TradeFilters";
import TableSkeleton from "./TableSkeleton";

export default function TradeTable() {
  const [sort, setSort] = useState<TradeSort>({ column: "timestamp", direction: "desc" });
  const [filter, setFilter] = useState<TradeFilters>({});
  const { groups, summary, isLoading, error, isEmpty, dbState } = useGroupedTrades({ sort, filter });

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 p-4 dark:border-red-900">
        <p className="text-red-600 dark:text-red-400">Error loading trades: {error.message}</p>
      </div>
    );
  }

  if (dbState === 'checking') {
    return (
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">Checking database status...</p>
      </div>
    );
  }

  if (dbState === 'empty') {
    return (
      <div className="rounded-lg border border-gray-200 p-6 text-center dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No trades found</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Get started by importing your trading history from supported brokers.
        </p>
        <Link
          href="/import"
          className="mt-4 inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Import Trades
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TradeFilterControls onFilterChange={setFilter} />

      {isEmpty || groups.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-6 text-center dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No matching trades</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your filters to see more results.
          </p>
        </div>
      ) : (
        <>
          {/* Overall Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Trades</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {summary.totalTrades.toLocaleString()}
                  </p>
                </div>
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
            </div>
            
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total P/L</p>
              <p className={`mt-1 text-2xl font-semibold 
                ${summary.totalPnL > 0
                  ? 'text-green-600 dark:text-green-400'
                  : summary.totalPnL < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {formatCurrency(summary.totalPnL)}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Dividends</p>
              <p className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(summary.totalDividends)}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Fees</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(summary.totalFees)}
              </p>
            </div>
          </div>

          {/* Trade Groups */}
          <div className="space-y-2">
            {groups.map((group) => (
              <TradeGroup key={group.id} group={group} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}