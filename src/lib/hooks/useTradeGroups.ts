import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { 
  TradeGroup, 
  TradeGroupMetrics, 
  GroupingOptions, 
  TradeGroupingResult 
} from '@/types/trade';

interface UseTradeGroupsOptions {
  onError?: (error: Error) => void;
  onSuccess?: (result: TradeGroupingResult[]) => void;
}

export function useTradeGroups(options: UseTradeGroupsOptions = {}) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<TradeGroupingResult[]>([]);

  // Fetch all trade groups
  const fetchGroups = useCallback(async (params?: {
    status?: 'OPEN' | 'CLOSED';
    ticker?: string;
    timeframe?: string;
  }) => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.ticker) queryParams.append('ticker', params.ticker);
      if (params?.timeframe) queryParams.append('timeframe', params.timeframe);
      
      const response = await fetch(
        `/api/trades/groups?${queryParams.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch trade groups');
      }
      
      const data = await response.json();
      setGroups(data.groups);
      
      return data.groups;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session, options]);

  // Create trade groups
  const createGroups = useCallback(async (
    tradeIds: string[],
    groupingOptions: GroupingOptions
  ) => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/trades/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tradeIds,
          ...groupingOptions,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create trade groups');
      }
      
      const data = await response.json();
      
      // Update local state
      setGroups(prev => [...data.groups, ...prev]);
      
      options.onSuccess?.(data.groups);
      return data.groups;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session, options]);

  // Update a trade group
  const updateGroup = useCallback(async (
    groupId: string,
    updates: {
      notes?: string;
      status?: 'OPEN' | 'CLOSED';
    }
  ) => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/trades/groups?id=${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update trade group');
      }
      
      const data = await response.json();
      
      // Update local state
      setGroups(prev => 
        prev.map(item => 
          item.group.id === groupId
            ? { group: data.group, metrics: data.metrics }
            : item
        )
      );
      
      return { group: data.group, metrics: data.metrics };
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session, options]);

  // Delete a trade group
  const deleteGroup = useCallback(async (groupId: string) => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/trades/groups?id=${groupId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete trade group');
      }
      
      // Update local state
      setGroups(prev => prev.filter(item => item.group.id !== groupId));
      
      return true;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session, options]);

  // Calculate aggregate metrics for a set of groups
  const calculateAggregateMetrics = useCallback((
    selectedGroups: TradeGroupingResult[]
  ): TradeGroupMetrics => {
    const total = selectedGroups.reduce(
      (acc, { metrics }) => ({
        totalTrades: acc.totalTrades + metrics.totalTrades,
        winningTrades: acc.winningTrades + metrics.winningTrades,
        losingTrades: acc.losingTrades + metrics.losingTrades,
        breakEvenTrades: acc.breakEvenTrades + metrics.breakEvenTrades,
        profitFactor: 0, // Will calculate after
        averageWin: 0, // Will calculate after
        averageLoss: 0, // Will calculate after
        maxDrawdown: Math.max(acc.maxDrawdown, metrics.maxDrawdown),
        winRate: 0, // Will calculate after
        expectancy: 0, // Will calculate after
        remainingQuantity: acc.remainingQuantity + metrics.remainingQuantity,
        realizedPnl: acc.realizedPnl + metrics.realizedPnl,
      }),
      {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakEvenTrades: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        maxDrawdown: 0,
        winRate: 0,
        expectancy: 0,
        remainingQuantity: 0,
        realizedPnl: 0,
      }
    );

    // Calculate derived metrics
    const totalWinAmount = selectedGroups.reduce(
      (sum, { metrics }) => sum + (metrics.averageWin * metrics.winningTrades),
      0
    );
    const totalLossAmount = selectedGroups.reduce(
      (sum, { metrics }) => sum + (metrics.averageLoss * metrics.losingTrades),
      0
    );

    total.winRate = total.totalTrades > 0 
      ? total.winningTrades / total.totalTrades 
      : 0;
    
    total.averageWin = total.winningTrades > 0 
      ? totalWinAmount / total.winningTrades 
      : 0;
    
    total.averageLoss = total.losingTrades > 0 
      ? totalLossAmount / total.losingTrades 
      : 0;
    
    total.profitFactor = totalLossAmount !== 0 
      ? totalWinAmount / totalLossAmount 
      : totalWinAmount;
    
    total.expectancy = (total.winRate * total.averageWin) - 
      ((1 - total.winRate) * total.averageLoss);

    return total;
  }, []);

  return {
    groups,
    isLoading,
    fetchGroups,
    createGroups,
    updateGroup,
    deleteGroup,
    calculateAggregateMetrics,
  };
}