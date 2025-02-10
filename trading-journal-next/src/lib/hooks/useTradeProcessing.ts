import { useState, useEffect } from 'react';
import { Trade } from '@/types/trade';
import { 
  getStockSplits,
  adjustSharesForSplits,
  validatePriceData,
} from '@/lib/utils/yahoo-finance';

export interface ProcessedTrade extends Trade {
  adjustedShares: number;
  originalShares: number;
  isAdjustedForSplit: boolean;
}

export function useTradeProcessing(trades: Trade[]) {
  const [processedTrades, setProcessedTrades] = useState<ProcessedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function processTrades() {
      if (!trades?.length) {
        setProcessedTrades([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const processedTradesMap = new Map<string, ProcessedTrade[]>();
        
        // Group trades by ticker for efficient processing
        trades.forEach(trade => {
          const trades = processedTradesMap.get(trade.ticker) || [];
          trades.push({
            ...trade,
            adjustedShares: trade.shares,
            originalShares: trade.shares,
            isAdjustedForSplit: false,
          });
          processedTradesMap.set(trade.ticker, trades);
        });

        // Process each ticker's trades
        for (const [ticker, tickerTrades] of processedTradesMap.entries()) {
          try {
            // Sort trades by date for accurate split processing
            tickerTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            
            // Get splits data for full trade date range
            const splits = await getStockSplits(
              ticker,
              tickerTrades[0].timestamp,
              tickerTrades[tickerTrades.length - 1].timestamp
            );

            // Skip if no splits found
            if (!splits.length) continue;

            // Adjust shares for splits
            tickerTrades.forEach(trade => {
              const adjustedShares = adjustSharesForSplits(
                trade.shares,
                trade.timestamp,
                splits
              );

              if (adjustedShares !== trade.shares) {
                trade.adjustedShares = adjustedShares;
                trade.isAdjustedForSplit = true;
              }
            });

            // Validate prices for adjusted trades
            for (const trade of tickerTrades) {
              if (trade.isAdjustedForSplit) {
                const isValid = await validatePriceData(
                  ticker,
                  trade.timestamp,
                  trade.price
                );
                
                if (!isValid) {
                  console.warn(
                    `Price validation failed for ${ticker} on ${trade.timestamp}`
                  );
                }
              }
            }
          } catch (error) {
            console.error(`Error processing trades for ${ticker}:`, error);
          }
        }

        // Flatten the map back to array
        const results = Array.from(processedTradesMap.values()).flat();
        setProcessedTrades(results);
        setError(null);
      } catch (error) {
        setError(error as Error);
        console.error('Error processing trades:', error);
      } finally {
        setIsLoading(false);
      }
    }

    processTrades();
  }, [trades]);

  return {
    processedTrades,
    isLoading,
    error
  };
}