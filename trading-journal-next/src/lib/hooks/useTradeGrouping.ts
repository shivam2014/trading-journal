import { useCallback } from 'react';
import type { Trade, TradeGroup, TickerGroup } from '@/types/trade';
import { useTradeGroupMetrics } from './useTradeGroupMetrics';

export function useTradeGrouping() {
  const { calculateGroupMetrics } = useTradeGroupMetrics();

  const createTickerGroup = useCallback((ticker: string): TickerGroup => {
    return {
      ticker,
      tradeGroups: [],
      totalRealizedPnL: 0,
      totalUnrealizedPnL: 0,
      totalDividends: 0,
      totalFees: 0,
      openPositions: 0,
      lastTradeDate: new Date(),
      totalVolume: 0,
      winRate: 0,
      score: 0,
      strategies: [],
      sessions: [],
      openGroups: 0,
      closedGroups: 0,
      partialGroups: 0
    };
  }, []);

  const createTradeGroup = useCallback((
    trades: Trade[],
    ticker: string,
    strategy: string | undefined,
    session: string | undefined,
    metrics: ReturnType<typeof calculateGroupMetrics>,
    isSubGroup: boolean = false
  ): TradeGroup => {
    const regularTrades = trades.filter(t => t.action === 'BUY' || t.action === 'SELL');
    const dividendTrades = trades.filter(t => t.action === 'DIVIDEND');

    return {
      id: `${ticker}-${strategy || 'default'}-${session || 'default'}-${Date.now()}`,
      ticker,
      strategy,
      session,
      status: metrics.status as 'OPEN' | 'CLOSED' | 'PARTIALLY_CLOSED',
      openDate: trades[0].timestamp,
      closeDate: metrics.status === 'CLOSED' ? trades[trades.length - 1].timestamp : undefined,
      trades,
      regularTrades,
      dividendTrades,
      netShares: metrics.netShares,
      realizedPnL: metrics.realizedPnL,
      unrealizedPnL: metrics.unrealizedPnL,
      totalFees: metrics.totalFees,
      percentClosed: metrics.percentClosed,
      currency: regularTrades[0]?.currency,
      summary: metrics.summary,
      avgEntryPrice: metrics.summary.avgEntryPrice,
      avgExitPrice: metrics.summary.avgExitPrice,
      holdingPeriodHours: metrics.summary.holdingPeriodHours,
      riskRewardRatio: metrics.summary.riskRewardRatio,
      positionSizePercent: metrics.summary.positionSizePercent,
      score: metrics.summary.score,
      winRate: metrics.summary.winRate,
      isSubGroup,
      groupType: isSubGroup ? 'session' : 'strategy'
    };
  }, [calculateGroupMetrics]);

  const groupTradesByRelationship = useCallback((trades: Trade[], ticker: string): TradeGroup[] => {
    const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const groups: TradeGroup[] = [];
    let currentGroup: Trade[] = [];
    let remainingShares = 0;

    // Process each trade
    for (const trade of sortedTrades) {
      if (trade.action === 'BUY') {
        // If we have no remaining shares, start a new group
        if (remainingShares === 0) {
          currentGroup = [];
        }
        remainingShares += trade.shares;
        currentGroup.push(trade);
      } else if (trade.action === 'SELL') {
        // Only add sell trades if we have an active group
        if (remainingShares > 0) {
          remainingShares -= trade.shares;
          currentGroup.push(trade);

          // If position is closed (remainingShares = 0), finish the group
          if (remainingShares === 0) {
            const metrics = calculateGroupMetrics(currentGroup);
            const group = createTradeGroup(
              currentGroup,
              ticker,
              currentGroup[0].strategy,
              currentGroup[0].session,
              metrics,
              false
            );
            groups.push(group);
            currentGroup = [];
          }
          // If we've sold more shares than we have, something is wrong
          else if (remainingShares < 0) {
            console.error('Invalid trade sequence: More shares sold than bought');
            remainingShares = 0;
            currentGroup = [];
          }
        }
      } else if (trade.action === 'DIVIDEND' && currentGroup.length > 0) {
        // Add dividends to the current group if one exists
        currentGroup.push(trade);
      }
    }

    // If we have an unfinished group with remaining shares, add it
    if (currentGroup.length > 0) {
      const metrics = calculateGroupMetrics(currentGroup);
      const group = createTradeGroup(
        currentGroup,
        ticker,
        currentGroup[0].strategy,
        currentGroup[0].session,
        metrics,
        false
      );
      groups.push(group);
    }

    return groups;
  }, [calculateGroupMetrics, createTradeGroup]);

  const updateTickerGroupMetrics = useCallback((
    tickerGroup: TickerGroup,
    tradeGroup: TradeGroup
  ) => {
    tickerGroup.totalRealizedPnL += tradeGroup.realizedPnL;
    tickerGroup.totalUnrealizedPnL += tradeGroup.unrealizedPnL;
    tickerGroup.totalDividends += tradeGroup.summary.totalDividends;
    tickerGroup.totalFees += tradeGroup.totalFees;
    tickerGroup.openPositions += tradeGroup.netShares;
    tickerGroup.totalVolume += tradeGroup.summary.totalVolume;

    if (tradeGroup.status === 'OPEN') tickerGroup.openGroups++;
    else if (tradeGroup.status === 'CLOSED') tickerGroup.closedGroups++;
    else tickerGroup.partialGroups++;

    // Update lastTradeDate if this group has more recent trades
    const groupLastTradeDate = tradeGroup.closeDate || tradeGroup.openDate;
    if (groupLastTradeDate > tickerGroup.lastTradeDate) {
      tickerGroup.lastTradeDate = groupLastTradeDate;
    }
  }, []);

  return {
    createTickerGroup,
    createTradeGroup,
    groupTradesByRelationship,
    updateTickerGroupMetrics
  };
}