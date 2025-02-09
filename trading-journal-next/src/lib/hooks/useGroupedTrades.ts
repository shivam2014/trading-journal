import { useCallback, useMemo } from 'react';
import { useTrades } from './useTrades';
import type { Trade, TradeGroup, TradeSort, TradeFilters, TradeGroupSummary } from '@/types/trade';

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

interface UseGroupedTradesResult {
  groups: TradeGroup[];
  summary: GroupedTradesSummary;
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  dbState: 'checking' | 'empty' | 'ready' | 'error';
  refresh: () => Promise<void>;
}

export function useGroupedTrades({ sort, filter }: UseGroupedTradesOptions = {}): UseGroupedTradesResult {
  const { trades, isLoading, error, isEmpty, dbState, refresh } = useTrades({ sort, filter });

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

    // First pass: calculate net shares and collect buy trades
    const buyTrades: Trade[] = [];
    trades.forEach(trade => {
      if (trade.action === 'BUY') {
        netShares += trade.shares;
        buyTrades.push(trade);
        totalVolume += trade.shares;
      } else if (trade.action === 'SELL') {
        netShares -= trade.shares;
        realizedPnL += trade.result || 0;
        totalVolume += trade.shares;
      } else if (trade.action === 'DIVIDEND') {
        totalDividends += trade.result || 0;
      }
      totalFees += trade.fees || 0;
    });

    // Calculate percent closed if there were any buy trades
    if (buyTrades.length > 0) {
      const totalBuyShares = buyTrades.reduce((sum, trade) => sum + trade.shares, 0);
      const totalSoldShares = totalBuyShares - netShares;
      percentClosed = (totalSoldShares / totalBuyShares) * 100;

      if (percentClosed > 0 && percentClosed < 100) {
        partiallyClosedTrades = buyTrades.length;
      }
    }

    const summary: TradeGroupSummary = {
      totalTrades: trades.length,
      totalVolume,
      totalPnL: realizedPnL + unrealizedPnL,
      realizedPnL,
      unrealizedPnL,
      totalFees,
      totalDividends,
      partiallyClosedTrades,
      avgPercentClosed: partiallyClosedTrades > 0 ? percentClosed : 0
    };

    return {
      netShares,
      realizedPnL,
      unrealizedPnL,
      totalFees,
      percentClosed,
      totalDividends,
      summary,
      status: percentClosed === 0 ? 'OPEN' : percentClosed === 100 ? 'CLOSED' : 'PARTIALLY_CLOSED'
    };
  }, []);

  // Group trades by ticker, strategy, and session
  const { groups, summary } = useMemo(() => {
    // Create a composite key for grouping
    const getGroupKey = (trade: Trade) => 
      `${trade.ticker}-${trade.strategy || 'default'}-${trade.session || 'default'}`;

    const groupMap = new Map<string, Trade[]>();
    
    // First, group trades by composite key
    trades.forEach(trade => {
      const groupKey = getGroupKey(trade);
      const existingTrades = groupMap.get(groupKey) || [];
      groupMap.set(groupKey, [...existingTrades, trade]);
    });

    // Initialize summary
    const summary: GroupedTradesSummary = {
      totalTrades: trades.length,
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

    // Create groups with metrics
    const groups: TradeGroup[] = [];
    groupMap.forEach((groupTrades, groupKey) => {
      // Separate regular trades and dividend trades
      const regularTrades = groupTrades.filter(t => t.action !== 'DIVIDEND')
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const dividendTrades = groupTrades.filter(t => t.action === 'DIVIDEND')
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Calculate group metrics
      const metrics = calculateGroupMetrics([...regularTrades, ...dividendTrades]);

      const [ticker, strategy, session] = groupKey.split('-');

      const group: TradeGroup = {
        id: groupKey,
        ticker,
        strategy: strategy === 'default' ? undefined : strategy,
        session: session === 'default' ? undefined : session,
        status: metrics.status as 'OPEN' | 'CLOSED' | 'PARTIALLY_CLOSED',
        openDate: regularTrades[0].timestamp,
        closeDate: metrics.status === 'CLOSED' ? regularTrades[regularTrades.length - 1].timestamp : undefined,
        trades: [...regularTrades, ...dividendTrades],
        regularTrades,
        dividendTrades,
        netShares: metrics.netShares,
        realizedPnL: metrics.realizedPnL,
        unrealizedPnL: metrics.unrealizedPnL,
        totalFees: metrics.totalFees,
        percentClosed: metrics.percentClosed,
        currency: regularTrades[0].currency,
        summary: metrics.summary
      };

      groups.push(group);

      // Update summary
      summary.totalVolume += metrics.summary.totalVolume;
      summary.totalPnL += metrics.summary.totalPnL;
      summary.realizedPnL += metrics.realizedPnL;
      summary.unrealizedPnL += metrics.unrealizedPnL;
      summary.totalFees += metrics.totalFees;
      summary.totalDividends += metrics.totalDividends;
      
      if (metrics.status === 'PARTIALLY_CLOSED') {
        summary.partiallyClosedCount++;
      } else if (metrics.status === 'CLOSED') {
        summary.closedGroups++;
      } else {
        summary.openGroups++;
      }
    });

    // Sort groups by most recent trade
    groups.sort((a, b) => {
      const aLatest = new Date(Math.max(...a.trades.map(t => t.timestamp.getTime())));
      const bLatest = new Date(Math.max(...b.trades.map(t => t.timestamp.getTime())));
      return bLatest.getTime() - aLatest.getTime();
    });

    return { groups, summary };
  }, [trades, calculateGroupMetrics]);

  return {
    groups,
    summary,
    isLoading,
    error,
    isEmpty,
    dbState,
    refresh
  };
}