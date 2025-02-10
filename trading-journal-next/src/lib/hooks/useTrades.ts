import { useEffect, useState, useCallback } from "react";
import type { Trade, Pagination, TradeSort, TradeFilters } from "@/types/trade";

type DatabaseState = 'checking' | 'empty' | 'ready' | 'error';

interface UseTradesOptions {
  sort?: TradeSort;
  filter?: TradeFilters;
}

function processTrade(trade: any): Trade {
  // Ensure timestamp is a Date object whether it comes as string or Date
  const timestamp = trade.timestamp instanceof Date ? 
    trade.timestamp : 
    new Date(trade.timestamp);
  
  // Process numeric fields
  const shares = Number(trade.shares);
  const price = Number(trade.price);
  const result = trade.result ? Number(trade.result) : 0;
  const fees = trade.fees ? Number(trade.fees) : 0;
  const exchangeRate = trade.exchangeRate ? Number(trade.exchangeRate) : undefined;

  console.log('Processing trade:', {
    ticker: trade.ticker,
    action: trade.action,
    timestamp: timestamp.toISOString(),
    shares,
    price,
    result
  });

  return {
    ...trade,
    timestamp,
    shares,
    price,
    result,
    fees,
    exchangeRate
  };
}

export function useTrades(options: UseTradesOptions = {}) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dbState, setDbState] = useState<DatabaseState>('checking');

  const { sort } = options;

  // Check database state and load demo trades if needed
  useEffect(() => {
    async function checkDatabase() {
      try {
        const response = await fetch('/api/check-db');
        if (!response.ok) {
          throw new Error('Failed to check database status');
        }
        
        const data = await response.json();
        console.log('Database check result:', data);
        
        if (data.status === 'created' || data.isEmpty) {
          // Load demo trades when database is empty
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
        console.error("Error checking database:", e);
        setDbState('error');
        setError(e instanceof Error ? e : new Error("Failed to check database status"));
        setIsLoading(false);
      }
    }
    void checkDatabase();
  }, []);

  // Construct URL with sort parameters
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

  // Fetch trades when database is ready
  useEffect(() => {
    if (dbState === 'ready') {
      async function fetchTrades() {
        try {
          setIsLoading(true);
          setError(null);

          console.log('Fetching trades from:', getTradesUrl());
          const response = await fetch(getTradesUrl());
          if (!response.ok) throw new Error('Failed to fetch trades');

          const data = await response.json();
          console.log('Trades API response:', data);

          if (data.status === 'empty') {
            console.log('No trades found');
            setTrades([]);
            setIsLoading(false);
            return;
          }

          const processedTrades = data.trades.map(processTrade);
          console.log(`Processed ${processedTrades.length} trades`);
          setTrades(processedTrades);
        } catch (e) {
          console.error("Error fetching trades:", e);
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

      console.log('Refreshing trades');
      const response = await fetch(getTradesUrl());
      if (!response.ok) throw new Error('Failed to fetch trades');

      const data = await response.json();
      console.log('Refresh response:', data);
      
      const processedTrades = data.trades.map(processTrade);
      console.log(`Processed ${processedTrades.length} trades during refresh`);
      setTrades(processedTrades);
    } catch (e) {
      console.error("Error fetching trades:", e);
      setError(e instanceof Error ? e : new Error("Failed to fetch trades"));
    } finally {
      setIsLoading(false);
    }
  }, [dbState, getTradesUrl]);

  // Create a default pagination object
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