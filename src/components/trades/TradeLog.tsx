'use client';

import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useGroupedTrades } from '@/lib/hooks/useGroupedTrades';
import { TradeGroup } from './TradeGroup';
import type { TradeFilters, TradeSort } from '@/types/trade';
import { formatCurrency } from '@/lib/utils/format';

interface TradeLogProps {
  filters?: TradeFilters;
  defaultSort?: TradeSort;
}

export function TradeLog({ filters, defaultSort }: TradeLogProps) {
  const [sort, setSort] = useState<TradeSort | undefined>(defaultSort);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const { tickerGroups, summary, isLoading, error } = useGroupedTrades({ sort, filter: filters });

  const toggleTicker = (ticker: string) => {
    setExpandedTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading trades...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/50">
        <p className="text-red-700 dark:text-red-300">Error loading trades: {error.message}</p>
      </div>
    );
  }

  if (tickerGroups.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <p className="text-gray-500 dark:text-gray-400">No trades found matching the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Trade Log Summary</h2>
        <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Trades</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {summary.totalTrades}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total P/L</p>
            <p className={`mt-1 text-2xl font-semibold ${
              summary.totalPnL > 0
                ? 'text-green-600 dark:text-green-400'
                : summary.totalPnL < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-gray-100'
            }`}>
              {formatCurrency(summary.totalPnL)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Groups</p>
            <p className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {summary.openGroups}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Closed Groups</p>
            <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
              {summary.closedGroups}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Fees</p>
            <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(summary.totalFees)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Dividends</p>
            <p className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {formatCurrency(summary.totalDividends)}
            </p>
          </div>
        </div>
      </div>

      {/* Trade Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                <button
                  onClick={() => setSort({
                    column: 'ticker',
                    direction: sort?.column === 'ticker' && sort.direction === 'asc' ? 'desc' : 'asc'
                  })}
                  className="inline-flex items-center"
                >
                  Ticker {sort?.column === 'ticker' && (sort.direction === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                <button
                  onClick={() => setSort({
                    column: 'lastTradeDate',
                    direction: sort?.column === 'lastTradeDate' && sort.direction === 'asc' ? 'desc' : 'asc'
                  })}
                  className="inline-flex items-center"
                >
                  Last Trade {sort?.column === 'lastTradeDate' && (sort.direction === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                <button
                  onClick={() => setSort({
                    column: 'totalRealizedPnL',
                    direction: sort?.column === 'totalRealizedPnL' && sort.direction === 'asc' ? 'desc' : 'asc'
                  })}
                  className="inline-flex items-center justify-end w-full"
                >
                  Realised P/L {sort?.column === 'totalRealizedPnL' && (sort.direction === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                <button
                  onClick={() => setSort({
                    column: 'totalUnrealizedPnL',
                    direction: sort?.column === 'totalUnrealizedPnL' && sort.direction === 'asc' ? 'desc' : 'asc'
                  })}
                  className="inline-flex items-center justify-end w-full"
                >
                  Unrealised P/L {sort?.column === 'totalUnrealizedPnL' && (sort.direction === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                <button
                  onClick={() => setSort({
                    column: 'totalFees',
                    direction: sort?.column === 'totalFees' && sort.direction === 'asc' ? 'desc' : 'asc'
                  })}
                  className="inline-flex items-center justify-end w-full"
                >
                  Fees {sort?.column === 'totalFees' && (sort.direction === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                <button
                  onClick={() => setSort({
                    column: 'totalDividends',
                    direction: sort?.column === 'totalDividends' && sort.direction === 'asc' ? 'desc' : 'asc'
                  })}
                  className="inline-flex items-center justify-end w-full"
                >
                  Dividends {sort?.column === 'totalDividends' && (sort.direction === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                <button
                  onClick={() => setSort({
                    column: 'openPositions',
                    direction: sort?.column === 'openPositions' && sort.direction === 'asc' ? 'desc' : 'asc'
                  })}
                  className="inline-flex items-center justify-end w-full"
                >
                  Position {sort?.column === 'openPositions' && (sort.direction === 'asc' ? '↑' : '↓')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {tickerGroups.map((tickerGroup) => (
              <React.Fragment key={tickerGroup.ticker}>
                {/* Ticker Row */}
                <tr 
                  onClick={() => toggleTicker(tickerGroup.ticker)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50"
                >
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                    <div className="flex items-center space-x-2">
                      {expandedTickers.has(tickerGroup.ticker) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                      <span>
                        {tickerGroup.ticker}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {tickerGroup.strategies.length} strategies, {tickerGroup.sessions.length} sessions
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                    {tickerGroup.lastTradeDate.toLocaleDateString()}
                  </td>
                  <td className={`px-3 py-2 text-right text-sm font-medium ${
                    tickerGroup.totalRealizedPnL > 0
                      ? 'text-green-600 dark:text-green-400'
                      : tickerGroup.totalRealizedPnL < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {formatCurrency(tickerGroup.totalRealizedPnL)}
                  </td>
                  <td className={`px-3 py-2 text-right text-sm font-medium ${
                    tickerGroup.totalUnrealizedPnL > 0
                      ? 'text-green-600 dark:text-green-400'
                      : tickerGroup.totalUnrealizedPnL < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {formatCurrency(tickerGroup.totalUnrealizedPnL)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-red-600 dark:text-red-400">
                    {formatCurrency(tickerGroup.totalFees)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-blue-600 dark:text-blue-400">
                    {formatCurrency(tickerGroup.totalDividends)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-900 dark:text-gray-100">
                    {tickerGroup.openPositions}
                  </td>
                </tr>
                
                {/* Expanded Trade Groups */}
                {expandedTickers.has(tickerGroup.ticker) && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="divide-y divide-gray-200 dark:divide-gray-800">
                        {tickerGroup.tradeGroups.map((group) => (
                          <TradeGroup key={group.id} group={group} />
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}