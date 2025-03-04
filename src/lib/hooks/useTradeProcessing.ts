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

        for (const [ticker, tickerTrades] of processedTradesMap.entries()) {
          try {
            tickerTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            console.log(`Processing splits for ${ticker}`);
            const splits = await getStockSplits(
              ticker,
              tickerTrades[0].timestamp,
              tickerTrades[tickerTrades.length - 1].timestamp
            );

            console.log(`Found splits for ${ticker}:`, splits);

            if (!splits.length) {
              console.log(`No splits found for ${ticker}`);
              continue;
            }

            tickerTrades.forEach(trade => {
              const adjustedShares = adjustSharesForSplits(
                trade.shares,
                trade.timestamp,
                splits
              );

              console.log(`${ticker} trade adjustment:`, {
                date: trade.timestamp,
                originalShares: trade.shares,
                adjustedShares,
                action: trade.action,
                splitInfo: splits.map(split => ({
                  date: split.date,
                  ratio: `${split.numerator}:${split.denominator}`
                }))
              });

              if (adjustedShares !== trade.shares) {
                trade.adjustedShares = adjustedShares;
                trade.isAdjustedForSplit = true;
              }
            });

            for (const trade of tickerTrades) {
              if (trade.isAdjustedForSplit) {
                await validatePriceData(
                  ticker,
                  trade.timestamp,
                  trade.price
                );
              }
            }
          } catch (error) {
            console.error(`Processing error for ${ticker}:`, {
              error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
              } : String(error),
              ticker
            });
          }
        }

        const results = Array.from(processedTradesMap.values()).flat();
        setProcessedTrades(results);
        setError(null);
      } catch (error) {
        setError(error as Error);
        console.error('Trade processing error');
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