import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import type { Candle } from '@/types/trade';

interface MarketDataOptions {
  symbol: string;
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  limit?: number;
}

const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export function useMarketData({ 
  symbol, 
  timeframe = '1d', 
  limit = 100 
}: MarketDataOptions) {
  const queryClient = useQueryClient();

  // WebSocket setup for real-time updates
  const { subscribe, unsubscribe } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'PRICE_UPDATE' && data.symbol === symbol) {
        // Update cached data with new price
        queryClient.setQueryData(['marketData', symbol, timeframe], (oldData: Candle[] | undefined) => {
          if (!oldData) return [data];

          const lastCandle = oldData[oldData.length - 1];
          const newCandle: Candle = {
            timestamp: new Date(data.timestamp),
            open: data.open,
            high: Math.max(data.high, lastCandle.high),
            low: Math.min(data.low, lastCandle.low),
            close: data.close,
            volume: (lastCandle.volume || 0) + (data.volume || 0),
          };

          // Update last candle if in same timeframe, otherwise add new candle
          const isNewCandle = !isSameTimeframe(lastCandle.timestamp, new Date(data.timestamp), timeframe);
          if (isNewCandle) {
            return [...oldData.slice(-limit + 1), newCandle];
          } else {
            return [...oldData.slice(0, -1), newCandle];
          }
        });
      }
    }
  });

  // Subscribe to price updates on mount
  useEffect(() => {
    subscribe(`price-updates-${symbol}`);
    return () => unsubscribe(`price-updates-${symbol}`);
  }, [symbol, subscribe, unsubscribe]);

  // Query for historical data
  const {
    data: candles,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['marketData', symbol, timeframe],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/market-data?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`
        );
        if (!response.ok) throw new Error('Failed to fetch market data');
        
        const data = await response.json();
        return data.map((item: any) => ({
          timestamp: new Date(item.timestamp),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: item.volume ? parseFloat(item.volume) : undefined,
        }));
      } catch (error) {
        console.error('Error fetching market data:', error);
        throw error;
      }
    },
    staleTime: CACHE_TIME,
    cacheTime: CACHE_TIME,
  });

  return {
    candles,
    isLoading,
    error,
    refetch,
  };
}

function isSameTimeframe(date1: Date, date2: Date, timeframe: string): boolean {
  switch (timeframe) {
    case '1m':
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate() &&
        date1.getHours() === date2.getHours() &&
        date1.getMinutes() === date2.getMinutes()
      );
    case '5m':
    case '15m':
      const minutes = parseInt(timeframe);
      const period1 = Math.floor(date1.getMinutes() / minutes);
      const period2 = Math.floor(date2.getMinutes() / minutes);
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate() &&
        date1.getHours() === date2.getHours() &&
        period1 === period2
      );
    case '1h':
    case '4h':
      const hours = parseInt(timeframe);
      const hourPeriod1 = Math.floor(date1.getHours() / hours);
      const hourPeriod2 = Math.floor(date2.getHours() / hours);
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate() &&
        hourPeriod1 === hourPeriod2
      );
    case '1d':
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    case '1w':
      const week1 = getWeekNumber(date1);
      const week2 = getWeekNumber(date2);
      return (
        date1.getFullYear() === date2.getFullYear() &&
        week1 === week2
      );
    default:
      return false;
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}