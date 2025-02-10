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

interface TickerGroup {
  ticker: string;
  tradeGroups: TradeGroup[];
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalDividends: number;
  totalFees: number;
  openPositions: number;
  lastTradeDate: Date;
  totalVolume: number;
  winRate: number;
  score: number;
}

interface UseGroupedTradesResult {
  tickerGroups: TickerGroup[];
  groups: TradeGroup[];  // Maintained for backwards compatibility
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
    let totalBuyValue = 0;
    let totalSellValue = 0;
    let totalBuyShares = 0;
    let totalSellShares = 0;
    let winningTrades = 0;
    let totalTrades = 0;

    // First pass: calculate net shares and collect buy trades
    const buyTrades: Trade[] = [];
    const sellTrades: Trade[] = [];
    trades.forEach(trade => {
      if (trade.action === 'BUY') {
        netShares += trade.shares;
        buyTrades.push(trade);
        totalVolume += trade.shares;
        totalBuyValue += trade.shares * trade.price;
        totalBuyShares += trade.shares;
      } else if (trade.action === 'SELL') {
        netShares -= trade.shares;
        sellTrades.push(trade);
        realizedPnL += trade.result || 0;
        totalVolume += trade.shares;
        totalSellValue += trade.shares * trade.price;
        totalSellShares += trade.shares;
        if ((trade.result || 0) > 0) winningTrades++;
        totalTrades++;
      } else if (trade.action === 'DIVIDEND') {
        totalDividends += trade.result || 0;
      }
      totalFees += trade.fees || 0;
    });

    // Calculate entry/exit prices
    const avgEntryPrice = totalBuyShares > 0 ? totalBuyValue / totalBuyShares : 0;
    const avgExitPrice = totalSellShares > 0 ? totalSellValue / totalSellShares : 0;

    // Calculate percent closed if there were any buy trades
    if (buyTrades.length > 0) {
      const totalBuyShares = buyTrades.reduce((sum, trade) => sum + trade.shares, 0);
      const totalSoldShares = totalBuyShares - netShares;
      percentClosed = (totalSoldShares / totalBuyShares) * 100;

      if (percentClosed > 0 && percentClosed < 100) {
        partiallyClosedTrades = buyTrades.length;
      }
    }

    // Calculate holding period
    const firstTradeTime = Math.min(...trades.map(t => t.timestamp.getTime()));
    const lastTradeTime = Math.max(...trades.map(t => t.timestamp.getTime()));
    const holdingPeriodHours = (lastTradeTime - firstTradeTime) / (1000 * 60 * 60);

    // Calculate risk/reward and position sizing
    const maxDrawdown = Math.min(...trades.map(t => t.result || 0));
    const maxProfit = Math.max(...trades.map(t => t.result || 0));
    const riskRewardRatio = Math.abs(maxDrawdown) > 0 ? Math.abs(maxProfit / maxDrawdown) : 0;

    // Assuming account size of 100,000 for position size calculation
    const accountSize = 100000;
    const positionSizePercent = (totalBuyValue / accountSize) * 100;

    // Calculate trade score (0-10)
    let score = 5; // Base score
    if (riskRewardRatio > 2) score += 1;
    if (riskRewardRatio > 3) score += 1;
    if (holdingPeriodHours < 24) score += 1; // Bonus for quick trades
    if (positionSizePercent < 5) score += 1; // Bonus for proper position sizing
    if (realizedPnL > 0) score += 1;

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
      riskRewardRatio,
      positionSizePercent,
      score: Math.min(10, Math.max(0, score)),
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
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

  // Group trades by ticker and into sequences
  const getSortComparator = useCallback((sort?: TradeSort) => {
    if (!sort) return (a: TickerGroup, b: TickerGroup) =>
      b.lastTradeDate.getTime() - a.lastTradeDate.getTime(); // Default sort by most recent

    const { column, direction } = sort;
    const multiplier = direction === 'asc' ? 1 : -1;

    return (a: TickerGroup, b: TickerGroup) => {
      switch (column) {
        case 'ticker':
          return multiplier * a.ticker.localeCompare(b.ticker);
        case 'lastTradeDate':
          return multiplier * (a.lastTradeDate.getTime() - b.lastTradeDate.getTime());
        case 'totalRealizedPnL':
          return multiplier * (a.totalRealizedPnL - b.totalRealizedPnL);
        case 'totalUnrealizedPnL':
          return multiplier * (a.totalUnrealizedPnL - b.totalUnrealizedPnL);
        case 'totalDividends':
          return multiplier * ((a.totalDividends || 0) - (b.totalDividends || 0));
        case 'totalFees':
          return multiplier * (a.totalFees - b.totalFees);
        case 'openPositions':
          return multiplier * (a.openPositions - b.openPositions);
        case 'totalVolume':
          return multiplier * ((a.totalVolume || 0) - (b.totalVolume || 0));
        case 'winRate':
          return multiplier * ((a.winRate || 0) - (b.winRate || 0));
        case 'score':
          return multiplier * ((a.score || 0) - (b.score || 0));
        default:
          return b.lastTradeDate.getTime() - a.lastTradeDate.getTime();
      }
    };
  }, []);

  const { groups, tickerGroups, summary } = useMemo(() => {
    // Sort trades chronologically for initial processing
    const sortedTrades = [...trades].sort((a: Trade, b: Trade) => a.timestamp.getTime() - b.timestamp.getTime());

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

    const tickerMap = new Map<string, TickerGroup>();
    
    // Helper function to get or create ticker group
    const getTickerGroup = (ticker: string): TickerGroup => {
      let tickerGroup = tickerMap.get(ticker);
      if (!tickerGroup) {
        tickerGroup = {
          ticker,
          tradeGroups: [],
          totalRealizedPnL: 0,
          totalUnrealizedPnL: 0,
          totalDividends: 0,
          totalFees: 0,
          openPositions: 0,
          lastTradeDate: new Date(0),
          totalVolume: 0,
          winRate: 0,
          score: 0
        };
        tickerMap.set(ticker, tickerGroup);
      }
      return tickerGroup;
    };

    interface ActiveSequence {
      trades: Trade[];
      netShares: number;
      key: string;
      lastTradeTime: number;
      ticker: string;
    }
    const activeSequences = new Map<string, ActiveSequence>();

    // Process trades chronologically
    sortedTrades.forEach((trade: Trade) => {
      const key = `${trade.ticker}-${trade.strategy || 'default'}-${trade.session || 'default'}`;
      
      if (trade.action === 'BUY') {
        const sequence = activeSequences.get(key);
        // Start new sequence if no active sequence or previous sequence is closed
        if (!sequence || sequence.netShares <= 0) {
          activeSequences.set(key, {
            trades: [trade],
            netShares: trade.shares,
            key,
            lastTradeTime: trade.timestamp.getTime(),
            ticker: trade.ticker
          });
        } else {
          // Add to existing sequence
          sequence.trades.push(trade);
          sequence.netShares += trade.shares;
          sequence.lastTradeTime = trade.timestamp.getTime();
        }
      } else if (trade.action === 'SELL') {
        const sequence = activeSequences.get(key);
        if (sequence) {
          sequence.trades.push(trade);
          sequence.netShares -= trade.shares;
          sequence.lastTradeTime = trade.timestamp.getTime();

          // If position is closed, finalize the group
          if (sequence.netShares <= 0) {
            const regularTrades = sequence.trades.filter(t => t.action === 'BUY' || t.action === 'SELL');
            const dividendTrades = sequence.trades.filter(t => t.action === 'DIVIDEND');
            const metrics = calculateGroupMetrics(sequence.trades);
            
            const group: TradeGroup = {
              id: `${key}-${sequence.trades[0].timestamp.getTime()}`,
              ticker: trade.ticker,
              strategy: trade.strategy,
              session: trade.session,
              status: 'CLOSED',
              openDate: regularTrades[0].timestamp,
              closeDate: regularTrades[regularTrades.length - 1].timestamp,
              trades: sequence.trades,
              regularTrades,
              dividendTrades,
              netShares: 0,
              realizedPnL: metrics.realizedPnL,
              unrealizedPnL: 0,
              totalFees: metrics.totalFees,
              percentClosed: 100,
              currency: trade.currency,
              summary: metrics.summary,
              avgEntryPrice: metrics.summary.avgEntryPrice,
              avgExitPrice: metrics.summary.avgExitPrice,
              holdingPeriodHours: metrics.summary.holdingPeriodHours,
              riskRewardRatio: metrics.summary.riskRewardRatio,
              positionSizePercent: metrics.summary.positionSizePercent,
              score: metrics.summary.score,
              winRate: metrics.summary.winRate
            };

            const tickerGroup = getTickerGroup(trade.ticker);
            tickerGroup.tradeGroups.push(group);
            tickerGroup.totalRealizedPnL += metrics.realizedPnL;
            tickerGroup.totalFees += metrics.totalFees;
            tickerGroup.lastTradeDate = new Date(Math.max(
              tickerGroup.lastTradeDate.getTime(),
              group.trades[group.trades.length - 1].timestamp.getTime()
            ));
            activeSequences.delete(key);

            // Update summary
            summary.totalVolume += metrics.summary.totalVolume;
            summary.totalPnL += metrics.summary.totalPnL;
            summary.realizedPnL += metrics.realizedPnL;
            summary.totalFees += metrics.totalFees;
            summary.totalDividends += metrics.totalDividends;
            summary.closedGroups++;
          }
        }
      } else if (trade.action === 'DIVIDEND') {
        const sequence = activeSequences.get(key);
        if (sequence) {
          sequence.trades.push(trade);
          sequence.lastTradeTime = trade.timestamp.getTime();
        }
      }
    });

    // Finalize any remaining open sequences
    activeSequences.forEach(sequence => {
      const regularTrades = sequence.trades.filter(t => t.action === 'BUY' || t.action === 'SELL');
      const dividendTrades = sequence.trades.filter(t => t.action === 'DIVIDEND');
      const metrics = calculateGroupMetrics(sequence.trades);
      
      const group: TradeGroup = {
        id: `${sequence.key}-${sequence.trades[0].timestamp.getTime()}`,
        ticker: regularTrades[0].ticker,
        strategy: regularTrades[0].strategy,
        session: regularTrades[0].session,
        status: metrics.status as 'OPEN' | 'CLOSED' | 'PARTIALLY_CLOSED',
        openDate: regularTrades[0].timestamp,
        closeDate: undefined,
        trades: sequence.trades,
        regularTrades,
        dividendTrades,
        netShares: metrics.netShares,
        realizedPnL: metrics.realizedPnL,
        unrealizedPnL: metrics.unrealizedPnL,
        totalFees: metrics.totalFees,
        percentClosed: metrics.percentClosed,
        currency: regularTrades[0].currency,
        summary: metrics.summary,
        avgEntryPrice: metrics.summary.avgEntryPrice,
        avgExitPrice: metrics.summary.avgExitPrice,
        holdingPeriodHours: metrics.summary.holdingPeriodHours,
        riskRewardRatio: metrics.summary.riskRewardRatio,
        positionSizePercent: metrics.summary.positionSizePercent,
        score: metrics.summary.score,
        winRate: metrics.summary.winRate
      };

      const tickerGroup = getTickerGroup(regularTrades[0].ticker);
      tickerGroup.tradeGroups.push(group);
      tickerGroup.totalRealizedPnL += metrics.realizedPnL;
      tickerGroup.totalUnrealizedPnL += metrics.unrealizedPnL;
      tickerGroup.totalDividends += metrics.totalDividends;
      tickerGroup.totalFees += metrics.totalFees;
      tickerGroup.openPositions += metrics.netShares;
      tickerGroup.lastTradeDate = new Date(Math.max(
        tickerGroup.lastTradeDate.getTime(),
        ...group.trades.map(t => t.timestamp.getTime())
      ));

      // Update summary
      summary.totalVolume += metrics.summary.totalVolume;
      summary.totalPnL += metrics.summary.totalPnL;
      summary.realizedPnL += metrics.realizedPnL;
      summary.unrealizedPnL += metrics.unrealizedPnL;
      summary.totalFees += metrics.totalFees;
      summary.totalDividends += metrics.totalDividends;

      if (metrics.status === 'PARTIALLY_CLOSED') {
        summary.partiallyClosedCount++;
      } else {
        summary.openGroups++;
      }
    });

    // First sort trade groups within each ticker group by most recent trade
    tickerMap.forEach(tickerGroup => {
      tickerGroup.tradeGroups.sort((a: TradeGroup, b: TradeGroup) => {
        const aLatest = Math.max(...a.trades.map(t => t.timestamp.getTime()));
        const bLatest = Math.max(...b.trades.map(t => t.timestamp.getTime()));
        return bLatest - aLatest;
      });
    });

    // Calculate metrics for each ticker group
    tickerMap.forEach(group => {
      // Calculate total volume and score from trade groups
      group.totalVolume = group.tradeGroups.reduce((sum, g) => sum + g.summary.totalVolume, 0);
      group.score = group.tradeGroups.reduce((sum, g) => sum + g.score, 0) / Math.max(1, group.tradeGroups.length);
      
      // Calculate win rate from regular trades
      const regularTrades = group.tradeGroups.flatMap(g => g.regularTrades);
      const totalTrades = regularTrades.filter(t => t.action === 'SELL').length;
      const winningTrades = regularTrades.filter(t => t.action === 'SELL' && (t.result || 0) > 0).length;
      group.winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    });

    // Convert tickerMap to array and apply sorting
    const tickerGroups = Array.from(tickerMap.values()).sort(getSortComparator(sort));

    // Create a flattened array of groups for backwards compatibility, maintaining the same order as in ticker groups
    const groups = tickerGroups.flatMap(tickerGroup => tickerGroup.tradeGroups);

    return { groups, tickerGroups, summary };
  }, [trades, calculateGroupMetrics]);

  return {
    groups,
    tickerGroups,
    summary,
    isLoading,
    error,
    isEmpty,
    dbState,
    refresh
  };
}