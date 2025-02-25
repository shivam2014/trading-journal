'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { Trade, TradeGroup as ITradeGroup } from '@/types/trade';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { getCurrentPrice } from '@/lib/utils/yahoo-finance';

interface TradeGroupProps {
  group: ITradeGroup;
  level?: number;
  isExpanded?: boolean;
  groupNumber?: number;
}

export function TradeGroup({ group, level = 0, isExpanded: defaultExpanded = false, groupNumber }: TradeGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showTrades, setShowTrades] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  // Fetch current price when group is expanded
  useEffect(() => {
    let isMounted = true;

    const fetchPrice = async () => {
      if (showTrades && group.ticker) {
        const price = await getCurrentPrice(group.ticker);
        if (isMounted) {
          setCurrentPrice(price);
        }
      }
    };

    fetchPrice();
    return () => { isMounted = false; };
  }, [showTrades, group.ticker]);

  const childGroups = group.childGroups || [];
  const hasChildGroups = childGroups.length > 0;
  const indentClass = `ml-${level * 4}`;

  // Calculate total P/L
  const totalPnL = group.realizedPnL + group.unrealizedPnL;

  // Helper to render trade row
  const renderTradeRow = (trade: Trade) => {
    const tradeResult = trade.result ?? 0;
    const isAdjusted = trade.isAdjustedForSplit && trade.adjustedShares !== trade.shares;
    const originalShares = trade.originalShares ?? trade.shares;
    const adjustedShares = trade.adjustedShares ?? trade.shares;

    return (
      <tr
        key={trade.id}
        className={`
          hover:bg-gray-50 dark:hover:bg-gray-900
          ${trade.action === 'DIVIDEND' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
          ${isAdjusted ? 'relative' : ''}
        `}
      >
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
          {formatDate(trade.timestamp)}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm">
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              trade.action === 'BUY'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : trade.action === 'SELL'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : trade.action === 'DIVIDEND'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            {trade.action}
          </span>
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
          {isAdjusted ? (
            <div className="flex items-center justify-end space-x-2">
              <span className="text-gray-500 line-through dark:text-gray-400">
                {originalShares.toLocaleString()}
              </span>
              <ArrowsUpDownIcon className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {adjustedShares.toLocaleString()}
              </span>
            </div>
          ) : (
            <span className="text-gray-900 dark:text-gray-100">
              {trade.shares.toLocaleString()}
            </span>
          )}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
          {formatCurrency(trade.price)}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
          {currentPrice === null ? (
            <span className="text-gray-500 dark:text-gray-400" title="Loading or unable to fetch current price">
              {showTrades ? "Loading..." : "-"}
            </span>
          ) : (
            <span className={`font-medium ${
              currentPrice > trade.price
                ? 'text-green-600 dark:text-green-400'
                : currentPrice < trade.price
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-gray-100'
            }`}>
              {formatCurrency(currentPrice)}
            </span>
          )}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
          <span
            className={`font-medium ${
              tradeResult > 0
                ? 'text-green-600 dark:text-green-400'
                : tradeResult < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {formatCurrency(tradeResult)}
          </span>
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
          {trade.fees ? formatCurrency(trade.fees) : '-'}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
          {isAdjusted ? (
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Split Adjusted
              </span>
              {trade.notes && <span>· {trade.notes}</span>}
            </div>
          ) : (
            trade.notes
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className={`mb-4 overflow-hidden rounded-lg bg-white dark:bg-gray-900 ${indentClass}`}>
      {/* Group Header */}
      <div
        className="flex cursor-pointer items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5" />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                Group {groupNumber}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                  ${group.status === 'CLOSED'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : group.status === 'PARTIALLY_CLOSED'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}
              >
                {group.status}
                {group.status === 'PARTIALLY_CLOSED' && ` (${group.percentClosed.toFixed(1)}%)`}
              </span>
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {group.regularTrades.length} trades · {group.netShares} net shares ·
              <span className={`font-medium ml-2 ${
                totalPnL > 0
                  ? 'text-green-600 dark:text-green-400'
                  : totalPnL < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {formatCurrency(totalPnL)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Volume</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {group.summary.totalVolume.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Period</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(group.holdingPeriodHours / 24)} days
            </p>
          </div>
        </div>
      </div>

      {/* Group Content */}
      {isExpanded && (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {/* Child Groups */}
          {hasChildGroups && (
            <div className="space-y-4 p-4">
              {childGroups.map((childGroup) => (
                <TradeGroup
                  key={childGroup.id}
                  group={childGroup}
                  level={level + 1}
                />
              ))}
            </div>
          )}

          {/* Trades */}
          <div className="px-4 py-2">
            <button
              onClick={() => setShowTrades(!showTrades)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {showTrades ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
              <span>Show Trades</span>
            </button>
          </div>

          {showTrades && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Action
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Shares
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                      P/L
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {/* Regular trades first */}
                  {group.regularTrades.map(renderTradeRow)}
                  {/* Dividend trades last */}
                  {group.dividendTrades.map(renderTradeRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}