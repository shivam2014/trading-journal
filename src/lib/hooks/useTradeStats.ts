import { useCallback, useEffect, useState } from "react";
import type { TradingStats, TradeFilters } from "@/types/trade";

interface UseTradeStatsOptions {
  filters?: TradeFilters;
}

export function useTradeStats({ filters }: UseTradeStatsOptions = {}) {
  const [stats, setStats] = useState<TradingStats>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalPnL: 0,
    biggestWin: 0,
    biggestLoss: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: 0,
    averageHoldingTime: 0,
    realizedPnL: 0,
    unrealizedPnL: 0,
    totalInterest: 0,
    totalDividends: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalFees: 0,
    totalVolume: 0,
    partiallyClosedTrades: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      
      if (filters?.symbol) {
        params.append('ticker', filters.symbol);
      }
      if (filters?.action) {
        params.append('action', filters.action);
      }
      if (filters?.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }
      if (filters?.currency) {
        params.append('currency', filters.currency);
      }

      const response = await fetch(`/api/stats${params.toString() ? `?${params.toString()}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trade stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (e) {
      console.error("Error fetching trade stats:", e);
      setError(e instanceof Error ? e : new Error("Failed to fetch trade stats"));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}