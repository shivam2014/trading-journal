import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Trade } from '@/types/trade';

export interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export type DatabaseState = 'empty' | 'loading' | 'ready' | 'error';

export interface UseTradesOptions {
  initialPage?: number;
  pageSize?: number;
  onError?: (error: Error) => void;
}

export function useTrades(options: UseTradesOptions = {}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(options.initialPage || 1);
  const pageSize = options.pageSize || 10;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trades', page, pageSize],
    queryFn: async () => {
      const response = await fetch(
        `/api/trades?page=${page}&pageSize=${pageSize}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }
      return response.json();
    },
  });

  const { mutateAsync: clearTrades } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/trades/clear', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to clear trades');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });

  const trades: Trade[] = data?.trades || [];
  const pagination: Pagination = data?.pagination || {
    page,
    pageSize,
    totalPages: 1,
    totalItems: 0,
  };

  const isEmpty = !isLoading && trades.length === 0;
  const dbState: DatabaseState = isLoading
    ? 'loading'
    : error
    ? 'error'
    : isEmpty
    ? 'empty'
    : 'ready';

  return {
    trades,
    isLoading,
    error,
    isEmpty,
    dbState,
    pagination,
    clearTrades,
    refresh: refetch,
  };
}