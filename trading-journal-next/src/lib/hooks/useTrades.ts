import { useEffect, useState, useCallback } from "react";
import type { Trade, Pagination, TradeSort, TradeFilters } from "@/types/trade";

type DatabaseState = 'checking' | 'empty' | 'ready' | 'error';

interface UseTradesOptions {
  sort?: TradeSort;
  filter?: TradeFilters;
}

interface RawTrade {
  timestamp: Date | string;
  shares: number | string;
  price: number | string;
  result?: number | string;
  fees?: number | string;
  exchangeRate?: number | string;
  ticker: string;
  action: Trade['action'];
  [key: string]: unknown;
}

function processTrade(trade: RawTrade): Trade {
  const timestamp = trade.timestamp instanceof Date ? 
    trade.timestamp : 
    new Date(trade.timestamp);
  
  const shares = Number(trade.shares);
  const price = Number(trade.price);
  const result = trade.result ? Number(trade.result) : 0;
  const fees = trade.fees ? Number(trade.fees) : 0;
  const exchangeRate = trade.exchangeRate ? Number(trade.exchangeRate) : undefined;

  return {
    ...trade,
    timestamp,
    shares,
    price,
    result,
    fees,
    exchangeRate
  } as Trade;
}

export function useTrades(options: UseTradesOptions = {}) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dbState, setDbState] = useState<DatabaseState>('checking');

  const { sort } = options;

  useEffect(() => {
    async function checkDatabase() {
      try {
        const response = await fetch('/api/check-db');
        if (!response.ok) {
          throw new Error('Failed to check database status');
        }
        
        const data = await response.json();
        
        if (data.status === 'created' || data.isEmpty) {
          const demoResponse = await fetch('/api/trades/demo', {
            method: 'POST'
          });
          
          if (!demoResponse.ok) {
            throw new Error('Failed to load demo trades');
          }

          setDbState('ready');
          return;
        }
        
        if (data.hasData) {
          setDbState('ready');
          return;
        }
        
        setDbState('empty');
        setIsLoading(false);
      } catch (e) {
        console.error("DB Check Error:", e);
        setDbState('error');
        setError(e instanceof Error ? e : new Error("Failed to check database status"));
        setIsLoading(false);
      }
    }
    void checkDatabase();
  }, []);

  const getTradesUrl = useCallback(() => {
    const url = new URL('/api/trades', window.location.origin);
    if (sort?.column && sort?.direction) {
      url.searchParams.set('sortColumn', sort.column);
      url.searchParams.set('sortDirection', sort.direction);
    } else {
      url.searchParams.set('sortColumn', 'lastTradeDate');
      url.searchParams.set('sortDirection', 'desc');
    }
    return url.toString();
  }, [sort]);

  useEffect(() => {
    if (dbState === 'ready') {
      async function fetchTrades() {
        try {
          setIsLoading(true);
          setError(null);

          const response = await fetch(getTradesUrl());
          if (!response.ok) throw new Error('Failed to fetch trades');

          const data = await response.json();

          if (data.status === 'empty') {
            setTrades([]);
            setIsLoading(false);
            return;
          }

          const processedTrades = data.trades.map((trade: RawTrade) => processTrade(trade));
          setTrades(processedTrades);
        } catch (e) {
          console.error("Trade Fetch Error:", e);
          setError(e instanceof Error ? e : new Error("Failed to fetch trades"));
        } finally {
          setIsLoading(false);
        }
      }
      void fetchTrades();
    }
  }, [dbState, getTradesUrl]);

  const refresh = useCallback(async () => {
    if (dbState !== 'ready') return;
    
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(getTradesUrl());
      if (!response.ok) throw new Error('Failed to fetch trades');

      const data = await response.json();
      const processedTrades = data.trades.map((trade: RawTrade) => processTrade(trade));
      setTrades(processedTrades);
    } catch (e) {
      console.error("Refresh Error:", e);
      setError(e instanceof Error ? e : new Error("Failed to fetch trades"));
    } finally {
      setIsLoading(false);
    }
  }, [dbState, getTradesUrl]);

  const pagination: Pagination = {
    page: 1,
    pageSize: 20,
    totalItems: trades.length,
    totalPages: Math.ceil(trades.length / 20)
  };

  return {
    trades,
    isLoading,
    error,
    isEmpty: trades.length === 0,
    dbState,
    refresh,
    pagination
  };
}