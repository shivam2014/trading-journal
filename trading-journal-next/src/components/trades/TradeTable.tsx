"use client";

import { useState } from "react";
import Link from "next/link";
import { ChartBarIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useGroupedTrades } from "@/lib/hooks/useGroupedTrades";
import { formatCurrency } from "@/lib/utils/format";
import { type TradeSort, type TradeFilters, type SortableTickerColumns } from "@/types/trade";
import { TradeGroup } from "./TradeGroup";
import { TradeFilters as TradeFilterControls } from "./TradeFilters";
import TableSkeleton from "./TableSkeleton";

export default function TradeTable() {
  const [sort, setSort] = useState<TradeSort>({ column: "lastTradeDate", direction: "desc" });
  const [filter, setFilter] = useState<TradeFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const {
    groups,
    tickerGroups,
    summary,
    pagination,
    isLoading,
    error,
    isEmpty,
    dbState
  } = useGroupedTrades({
    sort,
    filter,
    pagination: { page, pageSize }
  });

  const handleSortChange = (column: SortableTickerColumns) => {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

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
      <TradeFilterControls
        onFilterChange={setFilter}
        tickerGroups={tickerGroups}
      />

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

          {/* Table Header */}
          <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th
                      className="group cursor-pointer px-6 py-3 text-left"
                      onClick={() => handleSortChange('ticker')}
                    >
                      <div className="flex items-center">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ticker</span>
                        <span className={`ml-2 flex-none rounded opacity-0 group-hover:opacity-50 ${
                          sort.column === 'ticker' ? 'opacity-100' : ''
                        }`}>
                          {sort.column === 'ticker' && sort.direction === 'desc' ? '↓' : '↑'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="group cursor-pointer px-6 py-3 text-right"
                      onClick={() => handleSortChange('totalRealizedPnL')}
                    >
                      <div className="flex items-center justify-end">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Realized P/L</span>
                        <span className={`ml-2 flex-none rounded opacity-0 group-hover:opacity-50 ${
                          sort.column === 'totalRealizedPnL' ? 'opacity-100' : ''
                        }`}>
                          {sort.column === 'totalRealizedPnL' && sort.direction === 'desc' ? '↓' : '↑'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="group cursor-pointer px-6 py-3 text-right"
                      onClick={() => handleSortChange('totalUnrealizedPnL')}
                    >
                      <div className="flex items-center justify-end">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Unrealized P/L</span>
                        <span className={`ml-2 flex-none rounded opacity-0 group-hover:opacity-50 ${
                          sort.column === 'totalUnrealizedPnL' ? 'opacity-100' : ''
                        }`}>
                          {sort.column === 'totalUnrealizedPnL' && sort.direction === 'desc' ? '↓' : '↑'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="group cursor-pointer px-6 py-3 text-right"
                      onClick={() => handleSortChange('totalDividends')}
                    >
                      <div className="flex items-center justify-end">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dividends</span>
                        <span className={`ml-2 flex-none rounded opacity-0 group-hover:opacity-50 ${
                          sort.column === 'totalDividends' ? 'opacity-100' : ''
                        }`}>
                          {sort.column === 'totalDividends' && sort.direction === 'desc' ? '↓' : '↑'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="group cursor-pointer px-6 py-3 text-right"
                      onClick={() => handleSortChange('totalFees')}
                    >
                      <div className="flex items-center justify-end">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fees</span>
                        <span className={`ml-2 flex-none rounded opacity-0 group-hover:opacity-50 ${
                          sort.column === 'totalFees' ? 'opacity-100' : ''
                        }`}>
                          {sort.column === 'totalFees' && sort.direction === 'desc' ? '↓' : '↑'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="group cursor-pointer px-6 py-3 text-right"
                      onClick={() => handleSortChange('openPositions')}
                    >
                      <div className="flex items-center justify-end">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Open Positions</span>
                        <span className={`ml-2 flex-none rounded opacity-0 group-hover:opacity-50 ${
                          sort.column === 'openPositions' ? 'opacity-100' : ''
                        }`}>
                          {sort.column === 'openPositions' && sort.direction === 'desc' ? '↓' : '↑'}
                        </span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Status</span>
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
          </div>

          {/* Trade Groups */}
          <div className="space-y-2">
            {groups.map((group) => (
              <TradeGroup key={group.id} group={group} />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setPage(page => Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page => Math.min(pagination.totalPages, page + 1))}
                disabled={page >= pagination.totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{Math.min((page - 1) * pageSize + 1, pagination.totalItems)}</span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(page * pageSize, pagination.totalItems)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.totalItems}</span> results
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1); // Reset to first page when changing page size
                  }}
                  className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setPage(page => Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-primary-600 text-white dark:bg-primary-500'
                            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(page => Math.min(pagination.totalPages, page + 1))}
                    disabled={page >= pagination.totalPages}
                    className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}