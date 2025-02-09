import { useCallback, useEffect, useState } from "react";
import type { Trade, TradeSort, TradeFilters } from "@/types/trade";

interface UseTradesOptions {
  sort?: TradeSort;
  filter?: TradeFilters;
}

type DatabaseState = 'checking' | 'empty' | 'ready' | 'error';

export function useTrades({ sort, filter }: UseTradesOptions = {}) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [dbState, setDbState] = useState<DatabaseState>('checking');

  const checkDatabase = useCallback(async () => {
    try {
      const response = await fetch('/api/check-db');
      if (!response.ok) {
        throw new Error('Failed to check database status');
      }
      
      const data = await response.json();
      if (data.status === 'created' || data.isEmpty) {
        setDbState('empty');
        setIsEmpty(true);
        setIsLoading(false);
        return false;
      }
      
      setDbState('ready');
      return true;
      
    } catch (e) {
      console.error("Error checking database:", e);
      setDbState('error');
      setError(e instanceof Error ? e : new Error("Failed to check database status"));
      setIsLoading(false);
      return false;
    }
  }, []);

  const fetchTrades = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check database state first
      const dbReady = await checkDatabase();
      if (!dbReady) return;

      // Build query params
      const params = new URLSearchParams();
      
      if (filter?.symbol) {
        params.append('ticker', filter.symbol);
      }
      if (filter?.action) {
        params.append('action', filter.action);
      }
      if (filter?.startDate) {
        params.append('startDate', filter.startDate.toISOString());
      }
      if (filter?.endDate) {
        params.append('endDate', filter.endDate.toISOString());
      }
      if (filter?.status) {
        params.append('status', filter.status);
      }
      if (filter?.currency) {
        params.append('currency', filter.currency);
      }
      if (sort) {
        params.append('sortColumn', sort.column);
        params.append('sortDirection', sort.direction);
      }

      const response = await fetch(`/api/trades?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }

      const data = await response.json();
      
      if (data.status === 'empty') {
        setTrades([]);
        setIsEmpty(true);
        return;
      }

      setIsEmpty(false);
      setTrades(data.trades.map((row: any) => ({
        id: row.id,
        ticker: row.ticker,
        action: row.action,
        shares: Number(row.shares),
        price: Number(row.price),
        timestamp: new Date(row.timestamp),
        result: row.result ? Number(row.result) : 0,
        fees: row.fees ? Number(row.fees) : 0,
        notes: row.notes,
        groupId: row.groupid,
        currency: row.currency,
        targetCurrency: row.targetCurrency,
        exchangeRate: row.exchangeRate ? Number(row.exchangeRate) : undefined,
      })));
    } catch (e) {
      console.error("Error fetching trades:", e);
      setError(e instanceof Error ? e : new Error("Failed to fetch trades"));
    } finally {
      setIsLoading(false);
    }
  }, [sort, filter, checkDatabase]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return {
    trades,
    isLoading,
    error,
    isEmpty,
    dbState,
    refresh: fetchTrades,
  };
}