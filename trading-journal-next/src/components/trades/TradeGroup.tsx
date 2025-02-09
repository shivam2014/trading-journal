import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Trade, TradeGroup as ITradeGroup } from '@/types/trade';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface TradeGroupProps {
  group: ITradeGroup;
}

export function TradeGroup({ group }: TradeGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to render trade row
  const renderTradeRow = (trade: Trade) => {
    const tradeResult = trade.result ?? 0;
    return (
      <tr
        key={trade.id}
        className={`
          hover:bg-gray-50 dark:hover:bg-gray-900
          ${trade.action === 'DIVIDEND' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
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
        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
          {trade.shares.toLocaleString()}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
          {formatCurrency(trade.price)}
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
          {trade.notes}
        </td>
      </tr>
    );
  };

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      {/* Group Header */}
      <div
        className="flex cursor-pointer items-center justify-between bg-gray-50 px-6 py-4 dark:bg-gray-900/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5" />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {group.ticker}
              {group.strategy && (
                <span className="ml-2 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  {group.strategy}
                </span>
              )}
              {group.session && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                  {group.session}
                </span>
              )}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {group.regularTrades.length} regular trades, {group.dividendTrades.length} dividend trades
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
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Net Shares</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{group.netShares.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Realized P/L</p>
            <p className={`text-sm font-medium
              ${group.realizedPnL > 0
                ? 'text-green-600 dark:text-green-400'
                : group.realizedPnL < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {formatCurrency(group.realizedPnL)}
            </p>
          </div>
          {group.unrealizedPnL !== 0 && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Unrealized P/L</p>
              <p className={`text-sm font-medium
                ${group.unrealizedPnL > 0
                  ? 'text-green-600 dark:text-green-400'
                  : group.unrealizedPnL < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {formatCurrency(group.unrealizedPnL)}
              </p>
            </div>
          )}
          {group.summary.totalDividends > 0 && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Dividends</p>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {formatCurrency(group.summary.totalDividends)}
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Fees</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              {formatCurrency(group.summary.totalFees)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Status</p>
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
          </div>
        </div>
      </div>

      {/* Group Content */}
      {isExpanded && (
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
  );
}