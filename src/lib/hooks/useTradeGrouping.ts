import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TradeGroupingService } from '@/lib/services/trade-grouping';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import type { 
  Trade, 
  TradeGroup, 
  GroupingOptions, 
  TradeGroupingResult,
  TechnicalPattern
} from '@/types/trade';

interface UseTradeGroupingOptions {
  strategy?: GroupingOptions['strategy'];
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (results: TradeGroupingResult[]) => void;
}

export function useTradeGrouping(options: UseTradeGroupingOptions = {}) {
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const queryClient = useQueryClient();
  const service = new TradeGroupingService();

  // WebSocket integration for real-time updates
  const { subscribe, unsubscribe } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'PRICE_UPDATE' || data.type === 'PATTERN_DETECTED') {
        queryClient.invalidateQueries({ queryKey: ['tradeGroups'] });
      }
    }
  });

  // Subscribe to updates on mount
  useEffect(() => {
    subscribe('trade-updates');
    subscribe('pattern-updates');
    return () => {
      unsubscribe('trade-updates');
      unsubscribe('pattern-updates');
    };
  }, [subscribe, unsubscribe]);

  // Query existing groups
  const {
    data: groups,
    isLoading: isLoadingGroups,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ['tradeGroups', options.strategy],
    queryFn: async () => {
      const allGroups = await service.getGroups();
      return allGroups.filter(group => {
        if (!options.strategy) return true;
        return group.groupingStrategy === options.strategy;
      });
    },
    enabled: options.enabled,
  });

  // Mutation for creating groups
  const {
    mutateAsync: createGroups,
    isPending: isCreatingGroups,
    error: createError,
  } = useMutation({
    mutationFn: async ({ 
      trades, 
      groupingOptions 
    }: { 
      trades: Trade[];
      groupingOptions: GroupingOptions;
    }) => {
      setIsCreatingGroup(true);
      try {
        return await service.groupTrades(trades, {
          strategy: options.strategy || 'ticker',
          ...groupingOptions,
        });
      } finally {
        setIsCreatingGroup(false);
      }
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['tradeGroups'] });
      options.onSuccess?.(results);
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });

  // Convenience method for creating a single group
  const createGroup = useCallback(async (
    trades: Trade[],
    groupingOptions: Partial<GroupingOptions> = {}
  ): Promise<TradeGroupingResult[]> => {
    return createGroups({
      trades,
      groupingOptions: {
        strategy: options.strategy || 'ticker',
        ...groupingOptions,
      },
    });
  }, [createGroups, options.strategy]);

  // Get metrics for a specific group
  const getGroupMetrics = useCallback(async (
    groupId: string
  ): Promise<TradeGroupingResult | null> => {
    const group = groups?.find(g => g.id === groupId);
    if (!group) return null;

    try {
      const metrics = await service.getGroupMetrics(group);
      return { group, metrics };
    } catch (error) {
      options.onError?.(error as Error);
      return null;
    }
  }, [groups, options.onError, service]);

  // Update group settings
  const updateGroup = useCallback(async (
    groupId: string,
    updates: Partial<GroupingOptions>
  ): Promise<void> => {
    try {
      await service.updateGroup(groupId, updates);
      await queryClient.invalidateQueries({ queryKey: ['tradeGroups'] });
    } catch (error) {
      options.onError?.(error as Error);
    }
  }, [queryClient, options.onError, service]);

  // Delete a group
  const deleteGroup = useCallback(async (
    groupId: string
  ): Promise<void> => {
    try {
      await service.deleteGroup(groupId);
      await queryClient.invalidateQueries({ queryKey: ['tradeGroups'] });
    } catch (error) {
      options.onError?.(error as Error);
    }
  }, [queryClient, options.onError, service]);

  // Helper method to check if trades can be grouped
  const canGroupTrades = useCallback((
    trades: Trade[],
    groupingOptions: GroupingOptions
  ): boolean => {
    if (!trades.length) return false;
    
    // Check minimum trades requirement
    if (groupingOptions.minTrades && trades.length < groupingOptions.minTrades) {
      return false;
    }

    // Check if all trades have the same currency for the group
    const currencies = new Set(trades.map(t => t.currency));
    if (currencies.size > 1) {
      return false;
    }

    return true;
  }, []);

  return {
    // Data
    groups,
    isLoadingGroups,
    error: groupsError || createError,

    // State
    isCreatingGroup: isCreatingGroup || isCreatingGroups,

    // Methods
    createGroup,
    createGroups,
    getGroupMetrics,
    updateGroup,
    deleteGroup,
    canGroupTrades,
    refetchGroups,
  };
}

// Export types
export type { 
  GroupingOptions,
  TradeGroup,
  TradeGroupingResult,
  UseTradeGroupingOptions,
};