'use client';

import { useState } from 'react';
import { useTradeGrouping } from '@/lib/hooks/useTradeGrouping';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { toast } from 'sonner';
import type { Trade, GroupingOptions } from '@/types/trade';

interface TradeGroupsProps {
  trades: Trade[];
  className?: string;
}

export default function TradeGroups({ trades, className = '' }: TradeGroupsProps) {
  const [groupingOptions, setGroupingOptions] = useState<GroupingOptions>({
    strategy: 'ticker',
    minTrades: 2,
  });

  const {
    groups,
    isLoadingGroups,
    isCreatingGroup,
    error,
    createGroup,
    getGroupMetrics,
    canGroupTrades,
    refetchGroups,
  } = useTradeGrouping({
    enabled: true,
    onError: (error) => toast.error(error.message),
  });

  const { subscribe, unsubscribe } = useWebSocket({
    onConnected: () => {
      // Subscribe to group updates
      subscribe('trade-groups');
    },
    onDisconnected: () => {
      console.log('Disconnected from trade groups updates');
    },
  });

  const handleCreateGroup = async () => {
    if (!canGroupTrades(trades, groupingOptions)) {
      toast.error('Not enough trades to create a group');
      return;
    }

    try {
      await createGroup(trades, groupingOptions);
      toast.success('Trade group created successfully');
    } catch (error) {
      console.error('Error creating trade group:', error);
    }
  };

  const handleStrategyChange = (strategy: GroupingOptions['strategy']) => {
    setGroupingOptions(prev => ({ ...prev, strategy }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Group Creation Controls */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Grouping Strategy
          </label>
          <select
            value={groupingOptions.strategy}
            onChange={(e) => handleStrategyChange(e.target.value as GroupingOptions['strategy'])}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="ticker">By Ticker</option>
            <option value="day">By Day</option>
            <option value="week">By Week</option>
            <option value="pattern">By Pattern</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Minimum Trades
          </label>
          <input
            type="number"
            min={1}
            value={groupingOptions.minTrades}
            onChange={(e) => setGroupingOptions(prev => ({ ...prev, minTrades: parseInt(e.target.value) }))}
            className="mt-1 block w-32 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <button
          onClick={handleCreateGroup}
          disabled={isCreatingGroup || !canGroupTrades(trades, groupingOptions)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreatingGroup ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Group...
            </>
          ) : (
            'Create Group'
          )}
        </button>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {isLoadingGroups ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg">
            {error instanceof Error ? error.message : 'Failed to load groups'}
          </div>
        ) : groups?.length === 0 ? (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            No trade groups found. Create your first group using the controls above.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {groups?.map((group) => (
              <div
                key={group.id}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {group.ticker}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      group.status === 'OPEN'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}
                  >
                    {group.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500 dark:text-gray-400">Trades</div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {group.entries.length}
                  </div>

                  <div className="text-gray-500 dark:text-gray-400">
                    Initial Quantity
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {group.initialQuantity.toString()}
                  </div>

                  <div className="text-gray-500 dark:text-gray-400">
                    Remaining
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {group.remainingQuantity.toString()}
                  </div>

                  <div className="text-gray-500 dark:text-gray-400">Currency</div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {group.currency}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}