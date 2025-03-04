import { useMemo } from 'react';
import { useTrades } from './useTrades';
import { useTradeGrouping } from './useTradeGrouping';
import { useTradeProcessing } from './useTradeProcessing';
import type { TradeSort, TradeFilters, TradeGroup, TickerGroup } from '@/types/trade';

interface UseGroupedTradesOptions {
  sort?: TradeSort;
  filter?: TradeFilters;
}

interface GroupedTradesSummary {
  totalTrades: number;
  totalVolume: number;
  totalPnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalFees: number;
  totalDividends: number;
  partiallyClosedCount: number;
  openGroups: number;
  closedGroups: number;
}

export function useGroupedTrades({ sort, filter }: UseGroupedTradesOptions = {}) {
  const { trades, isLoading: isLoadingTrades, error: tradesError, isEmpty, dbState, refresh, pagination } = useTrades({ sort, filter });
  const { processedTrades, isLoading: isProcessingTrades, error: processingError } = useTradeProcessing(trades);
  const {
    createTickerGroup,
    createTradeGroup,
    groupTradesByRelationship,
    updateTickerGroupMetrics
  } = useTradeGrouping();

  const { groups, tickerGroups, summary } = useMemo(() => {
    const emptySummary: GroupedTradesSummary = {
      totalTrades: 0,
      totalVolume: 0,
      totalPnL: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalFees: 0,
      totalDividends: 0,
      partiallyClosedCount: 0,
      openGroups: 0,
      closedGroups: 0
    };

    if (!processedTrades?.length) {
      return {
        groups: [],
        tickerGroups: [],
        summary: emptySummary
      };
    }

    const sortedTrades = [...processedTrades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const tickerMap = new Map<string, TickerGroup>();
    const summary: GroupedTradesSummary = {
      ...emptySummary,
      totalTrades: processedTrades.length
    };

    sortedTrades.forEach(trade => {
      if (!tickerMap.has(trade.ticker)) {
        tickerMap.set(trade.ticker, createTickerGroup(trade.ticker));
      }
    });

    tickerMap.forEach((tickerGroup, ticker) => {
      const tickerTrades = sortedTrades.filter(t => t.ticker === ticker);

      const adjustedTrades = tickerTrades.map(trade => ({
        ...trade,
        shares: trade.adjustedShares || trade.shares
      }));

      const tradeGroups = groupTradesByRelationship(adjustedTrades, ticker);

      tradeGroups.forEach(tradeGroup => {
        tickerGroup.tradeGroups.push(tradeGroup);
        updateTickerGroupMetrics(tickerGroup, tradeGroup);

        if (tradeGroup.status === 'PARTIALLY_CLOSED') {
          summary.partiallyClosedCount++;
        } else if (tradeGroup.status === 'OPEN') {
          summary.openGroups++;
        } else {
          summary.closedGroups++;
        }

        if (tradeGroup.strategy && !tickerGroup.strategies.includes(tradeGroup.strategy)) {
          tickerGroup.strategies.push(tradeGroup.strategy);
        }
        if (tradeGroup.session && !tickerGroup.sessions.includes(tradeGroup.session)) {
          tickerGroup.sessions.push(tradeGroup.session);
        }
      });

      const activeGroups = tickerGroup.tradeGroups.length;
      if (activeGroups > 0) {
        tickerGroup.winRate = tickerGroup.tradeGroups.reduce((acc, g) => acc + g.winRate, 0) / activeGroups;
        tickerGroup.score = tickerGroup.tradeGroups.reduce((acc, g) => acc + g.score, 0) / activeGroups;
      }

      summary.totalVolume += tickerGroup.totalVolume;
      summary.totalPnL += tickerGroup.totalRealizedPnL + tickerGroup.totalUnrealizedPnL;
      summary.realizedPnL += tickerGroup.totalRealizedPnL;
      summary.unrealizedPnL += tickerGroup.totalUnrealizedPnL;
      summary.totalFees += tickerGroup.totalFees;
      summary.totalDividends += tickerGroup.totalDividends;
    });

    let sortedTickerGroups = Array.from(tickerMap.values());
    if (sort?.column) {
      sortedTickerGroups.sort((a, b) => {
        const multiplier = sort.direction === 'asc' ? 1 : -1;
        
        switch (sort.column) {
          case 'ticker':
            return multiplier * a.ticker.localeCompare(b.ticker);
          case 'totalRealizedPnL':
            return multiplier * (a.totalRealizedPnL - b.totalRealizedPnL);
          case 'totalUnrealizedPnL':
            return multiplier * (a.totalUnrealizedPnL - b.totalUnrealizedPnL);
          case 'totalDividends':
            return multiplier * (a.totalDividends - b.totalDividends);
          case 'totalFees':
            return multiplier * (a.totalFees - b.totalFees);
          case 'openPositions':
            return multiplier * (a.openPositions - b.openPositions);
          case 'totalVolume':
            return multiplier * (a.totalVolume - b.totalVolume);
          case 'winRate':
            return multiplier * (a.winRate - b.winRate);
          case 'score':
            return multiplier * (a.score - b.score);
          case 'lastTradeDate':
          default:
            return multiplier * (b.lastTradeDate.getTime() - a.lastTradeDate.getTime());
        }
      });
    } else {
      sortedTickerGroups.sort((a, b) => b.lastTradeDate.getTime() - a.lastTradeDate.getTime());
    }

    return {
      groups: sortedTickerGroups.flatMap(tg => tg.tradeGroups),
      tickerGroups: sortedTickerGroups,
      summary
    };
  }, [processedTrades, sort, createTickerGroup, createTradeGroup, groupTradesByRelationship, updateTickerGroupMetrics]);

  return {
    groups,
    tickerGroups,
    summary,
    pagination,
    isLoading: isLoadingTrades || isProcessingTrades,
    error: tradesError || processingError,
    isEmpty: groups.length === 0,
    dbState,
    refresh
  };
}