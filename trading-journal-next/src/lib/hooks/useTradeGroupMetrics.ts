import { useCallback } from 'react';
import type { Trade, TradeGroupSummary } from '@/types/trade';

export function useTradeGroupMetrics() {
  // Calculate group score based on various metrics
  const calculateGroupScore = useCallback((
    realizedPnL: number,
    unrealizedPnL: number,
    percentClosed: number,
    holdingPeriodHours: number
  ): number => {
    let score = 0;
    const totalPnL = realizedPnL + unrealizedPnL;

    // Profit/Loss impact (0-50 points)
    if (totalPnL > 0) {
      score += Math.min(50, (totalPnL / 1000) * 10);
    }

    // Holding period impact (0-25 points)
    const holdingPeriodDays = holdingPeriodHours / 24;
    if (holdingPeriodDays <= 5) {
      score += 25;
    } else if (holdingPeriodDays <= 10) {
      score += 15;
    } else if (holdingPeriodDays <= 20) {
      score += 10;
    } else {
      score += 5;
    }

    // Position closure impact (0-25 points)
    if (percentClosed === 100) {
      score += 25;
    } else if (percentClosed >= 75) {
      score += 20;
    } else if (percentClosed >= 50) {
      score += 15;
    } else if (percentClosed > 0) {
      score += 10;
    }

    return Math.round(score);
  }, []);

  // Calculate metrics for a group of trades
  const calculateGroupMetrics = useCallback((trades: Trade[]) => {
    let netShares = 0;
    let realizedPnL = 0;
    let unrealizedPnL = 0;
    let totalFees = 0;
    let totalDividends = 0;
    let totalVolume = 0;
    let percentClosed = 0;
    let partiallyClosedTrades = 0;
    let totalBuyValue = 0;
    let totalSellValue = 0;
    let totalBuyShares = 0;
    let totalSellShares = 0;
    let winningTrades = 0;
    let totalClosedTrades = 0;

    const buyTrades: Trade[] = [];
    const sellTrades: Trade[] = [];
    const runningPnL = new Map<number, number>();
    let currentRunningPnL = 0;

    // Sort trades chronologically
    const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    sortedTrades.forEach((trade, index) => {
      if (trade.action === 'BUY') {
        netShares += trade.shares;
        buyTrades.push(trade);
        totalVolume += trade.shares;
        totalBuyValue += trade.shares * trade.price;
        totalBuyShares += trade.shares;
        runningPnL.set(index, currentRunningPnL);
      } else if (trade.action === 'SELL') {
        netShares -= trade.shares;
        sellTrades.push(trade);
        const result = trade.result || 0;
        realizedPnL += result;
        currentRunningPnL += result;
        totalVolume += trade.shares;
        totalSellValue += trade.shares * trade.price;
        totalSellShares += trade.shares;

        if (netShares === 0) {
          totalClosedTrades++;
          if (currentRunningPnL > 0) winningTrades++;
        }
      } else if (trade.action === 'DIVIDEND') {
        totalDividends += trade.result || 0;
        currentRunningPnL += trade.result || 0;
      }
      totalFees += trade.fees || 0;
    });

    // Calculate average prices and unrealized P&L
    const avgEntryPrice = totalBuyShares > 0 ? totalBuyValue / totalBuyShares : 0;
    const avgExitPrice = totalSellShares > 0 ? totalSellValue / totalSellShares : 0;
    
    if (netShares > 0 && trades.length > 0) {
      const lastPrice = trades[trades.length - 1].price;
      unrealizedPnL = netShares * (lastPrice - avgEntryPrice);
    }

    if (buyTrades.length > 0) {
      const totalSoldShares = totalBuyShares - netShares;
      percentClosed = (totalSoldShares / totalBuyShares) * 100;

      if (percentClosed > 0 && percentClosed < 100) {
        partiallyClosedTrades = 1;
      }
    }

    const firstTradeTime = Math.min(...trades.map(t => t.timestamp.getTime()));
    const lastTradeTime = Math.max(...trades.map(t => t.timestamp.getTime()));
    const holdingPeriodHours = (lastTradeTime - firstTradeTime) / (1000 * 60 * 60);

    const summary: TradeGroupSummary = {
      totalTrades: trades.length,
      totalVolume,
      totalPnL: realizedPnL + unrealizedPnL,
      realizedPnL,
      unrealizedPnL,
      totalFees,
      totalDividends,
      partiallyClosedTrades,
      avgPercentClosed: partiallyClosedTrades > 0 ? percentClosed : 0,
      avgEntryPrice,
      avgExitPrice,
      holdingPeriodHours,
      riskRewardRatio: 0,
      positionSizePercent: (totalBuyValue / 100000) * 100,
      score: calculateGroupScore(realizedPnL, unrealizedPnL, percentClosed, holdingPeriodHours),
      winRate: totalClosedTrades > 0 ? (winningTrades / totalClosedTrades) * 100 : 0
    };

    const status = percentClosed === 0 ? 'OPEN' : percentClosed === 100 ? 'CLOSED' : 'PARTIALLY_CLOSED';

    return {
      netShares,
      realizedPnL,
      unrealizedPnL,
      totalFees,
      percentClosed,
      totalDividends,
      summary,
      status
    };
  }, [calculateGroupScore]);

  return {
    calculateGroupMetrics,
    calculateGroupScore
  };
}