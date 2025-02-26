'use client';

import { useState, useEffect } from 'react';
import { useTradeGrouping } from '@/lib/hooks/useTradeGrouping';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { formatCurrency } from '@/lib/utils/formatters';
import { toast } from 'sonner';
import { Decimal } from 'decimal.js';
import type { Trade, TradeGroup, GroupingOptions } from '@/types/trade';

interface TradeGroupsProps {
  trades?: Trade[];
  className?: string;
}

export default function TradeGroups({ trades = [], className = '' }: TradeGroupsProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupingStrategy, setGroupingStrategy] = useState<GroupingOptions['strategy']>('ticker');
  
  const {
    groups,
    isLoadingGroups,
    error,
    createGroup,
    deleteGroup,
    refetchGroups
  } = useTradeGrouping({
    strategy: groupingStrategy,
    onSuccess: () => toast.success('Groups loaded successfully'),
    onError: (error) => toast.error(`Error: ${error.message}`)
  });

  // Set up WebSocket for real-time updates
  const { subscribe, unsubscribe } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'TRADE_GROUP_UPDATED') {
        refetchGroups();
      }
    }
  });

  useEffect(() => {
    subscribe('trade-groups');
    return () => unsubscribe('trade-groups');
  }, [subscribe, unsubscribe]);

  // Handle group expansion toggle
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroupId(prev => prev === groupId ? null : groupId);
  };

  // Handle group creation
  const handleCreateGroup = async () => {
    if (trades.length === 0) {
      toast.error('No trades available to group');
      return;
    }
    
    try {
      await createGroup(trades);
      toast.success('Group created successfully');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Failed to create group: ${error.message}`);
      } else {
        toast.error('Failed to create group');
      }
    }
  };

  // Handle group deletion
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      toast.success('Group deleted successfully');
      if (expandedGroupId === groupId) {
        setExpandedGroupId(null);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Failed to delete group: ${error.message}`);
      } else {
        toast.error('Failed to delete group');
      }
    }
  };

  // Calculate group profit
  const calculateGroupProfit = (group: TradeGroup): Decimal => {
    return group.entries.reduce((total, entry) => {
      return total.plus(entry.profit || 0);
    }, new Decimal(0));
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Trade Groups</h2>
        <div className="flex items-center gap-4">
          <select
            value={groupingStrategy}
            onChange={(e) => setGroupingStrategy(e.target.value as GroupingOptions['strategy'])}
            className="block rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="ticker">By Ticker</option>
            <option value="day">By Day</option>
            <option value="week">By Week</option>
            <option value="pattern">By Pattern</option>
          </select>
          
          <button
            onClick={handleCreateGroup}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm"
          >
            Create Group
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoadingGroups ? (
          <div data-testid="loading-skeleton" className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg">
            {error.message}
          </div>
        ) : groups?.length === 0 ? (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            No trade groups found. Create your first group using the button above.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {groups?.map((group) => {
              const profit = calculateGroupProfit(group);
              const profitColor = profit.greaterThanOrEqualTo(0) 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400';
              
              return (
                <div
                  key={group.id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 
                      className="text-lg font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                      onClick={() => toggleGroupExpansion(group.id)}
                    >
                      {group.ticker}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${profitColor}`}>
                        {formatCurrency(profit.toNumber(), group.currency)}
                      </span>
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
                  
                  {expandedGroupId === group.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Trade Entries</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {group.entries.map((entry) => (
                          <div 
                            key={entry.id} 
                            className="p-2 rounded bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center"
                          >
                            <div>
                              <span className="font-medium">{entry.type}</span>
                              <span className="text-gray-500 dark:text-gray-400 ml-2">
                                {new Date(entry.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className={entry.profit && new Decimal(entry.profit).greaterThanOrEqualTo(0) 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'}>
                                {formatCurrency(entry.profit?.toString() || '0', group.currency)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Delete Group
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}