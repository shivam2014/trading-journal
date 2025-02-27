'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { Trade, TradeGroup as ITradeGroup } from '@/types/trade';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils/format';
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

  useEffect(() => {
    let isMounted = true;

    const fetchPrice = async () => {
      if (showTrades && group.ticker) {
        const price = await getCurrentPrice(group.ticker);
        if (isMounted && price) {
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

  const {
    realizedPnl = 0,
    unrealizedPnl = 0,
    totalTrades = 0,
    winRate = 0,
    profitFactor = 0,
    averageWin = 0,
    averageLoss = 0,
    maxDrawdown = 0,
    expectancy = 0,
  } = group.metrics || {};

  const totalPnL = realizedPnl + unrealizedPnl;
  const isPositive = totalPnL > 0;
  const isNegative = totalPnL < 0;

  return (
    <div className={`${indentClass} space-y-2`}>
      <div className="flex items-center gap-2 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        <div className="flex-1 grid grid-cols-7 gap-4">
          <div className="col-span-2">
            <span className="font-medium">{group.ticker}</span>
            {groupNumber && <span className="text-sm text-gray-500 ml-2">#{groupNumber}</span>}
          </div>
          
          <div className={`font-medium ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : ''}`}>
            {formatCurrency(totalPnL, group.currency)}
          </div>

          <div className="text-sm">
            <span className="text-gray-500">Win Rate:</span>
            <span className="ml-1 font-medium">{formatPercentage(winRate)}</span>
          </div>

          <div className="text-sm">
            <span className="text-gray-500">P/F:</span>
            <span className="ml-1 font-medium">{profitFactor.toFixed(2)}</span>
          </div>

          <div className="text-sm">
            <span className="text-gray-500">Trades:</span>
            <span className="ml-1 font-medium">{totalTrades}</span>
          </div>

          <div className="text-right">
            <button
              onClick={() => setShowTrades(!showTrades)}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              {showTrades ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="pl-7 space-y-4">
          {/* Detailed Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <div className="text-sm text-gray-500">Average Win</div>
              <div className="font-medium text-green-500">
                {formatCurrency(averageWin, group.currency)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Average Loss</div>
              <div className="font-medium text-red-500">
                {formatCurrency(Math.abs(averageLoss), group.currency)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Max Drawdown</div>
              <div className="font-medium text-orange-500">
                {formatCurrency(maxDrawdown, group.currency)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Expectancy</div>
              <div className={`font-medium ${expectancy > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(expectancy, group.currency)}
              </div>
            </div>
          </div>

          {/* Trade Details Table */}
          {showTrades && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {group.entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-3 py-2 text-sm">{formatDate(entry.trade.timestamp)}</td>
                      <td className={`px-3 py-2 text-sm font-medium ${
                        entry.trade.action === 'BUY' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {entry.trade.action}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">{entry.quantity.toString()}</td>
                      <td className="px-3 py-2 text-sm text-right">
                        {formatCurrency(parseFloat(entry.trade.price.toString()), entry.trade.currency)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        {formatCurrency(parseFloat(entry.trade.totalAmount.toString()), entry.trade.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Child Groups */}
          {hasChildGroups && (
            <div className="space-y-2">
              {childGroups.map((childGroup, index) => (
                <TradeGroup
                  key={childGroup.id}
                  group={childGroup}
                  level={level + 1}
                  groupNumber={index + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}