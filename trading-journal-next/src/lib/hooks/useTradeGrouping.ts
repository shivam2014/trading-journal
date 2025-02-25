import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TradeGroupingService } from '@/lib/services/trade-grouping';
import type { 
  Trade, 
  TradeGroup, 
  GroupingOptions, 
  TradeGroupingResult 
} from '@/types/trade';

interface UseTradeGroupingOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (results: TradeGroupingResult[]) => void;
}

export function useTradeGrouping(options: UseTradeGroupingOptions = {}) {
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const queryClient = useQueryClient();
  
  // Create a singleton instance of the service
  const tradeGroupingService = new TradeGroupingService();

  // Query existing groups
  const {
    data: groups,
    isLoading: isLoadingGroups,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ['tradeGroups'],
    queryFn: async () => {
      // This would be replaced with your API call to fetch groups
      return [] as TradeGroup[];
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
        // We'll need to get the user ID from your auth context
        const userId = 'current-user-id'; // Replace with actual user ID
        return await tradeGroupingService.groupTrades(
          userId,
          trades,
          groupingOptions
        );
      } finally {
        setIsCreatingGroup(false);
      }
    },
    onSuccess: (results) => {
      // Invalidate and refetch groups
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
    groupingOptions: GroupingOptions
  ): Promise<TradeGroupingResult[]> => {
    return createGroups({ trades, groupingOptions });
  }, [createGroups]);

  // Method to get metrics for a specific group
  const getGroupMetrics = useCallback(async (
    groupId: string
  ): Promise<TradeGroupingResult | null> => {
    const group = groups?.find(g => g.id === groupId);
    if (!group) return null;

    try {
      // Get metrics for the group
      const metrics = await tradeGroupingService.getGroupMetrics(group);
      return { group, metrics };
    } catch (error) {
      options.onError?.(error as Error);
      return null;
    }
  }, [groups, options.onError, tradeGroupingService]);

  // Method to update group settings
  const updateGroup = useCallback(async (
    groupId: string,
    updates: Partial<GroupingOptions>
  ): Promise<void> => {
    try {
      // This would be replaced with your API call to update group
      await Promise.resolve(); // Placeholder
      // Invalidate and refetch groups
      queryClient.invalidateQueries({ queryKey: ['tradeGroups'] });
    } catch (error) {
      options.onError?.(error as Error);
    }
  }, [queryClient, options.onError]);

  // Helper method to check if trades can be grouped
  const canGroupTrades = useCallback((
    trades: Trade[],
    options: GroupingOptions
  ): boolean => {
    if (!trades.length) return false;
    
    // Check minimum trades requirement
    if (options.minTrades && trades.length < options.minTrades) {
      return false;
    }

    // Additional validation could be added here
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