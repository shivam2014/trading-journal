import { prisma } from '@/lib/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type { 
  Trade, 
  TradeGroup, 
  GroupingOptions, 
  TradeGroupMetrics, 
  TradeGroupingResult 
} from '@/types/trade';
import { TechnicalAnalysisService } from './technical-analysis';
import { formatDateRange, getWeekNumber } from '@/lib/utils/date';

export class TradeGroupingService {
  private technicalAnalysis: TechnicalAnalysisService;

  constructor() {
    this.technicalAnalysis = new TechnicalAnalysisService();
  }

  /**
   * Group trades based on provided options
   */
  async groupTrades(
    userId: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroupingResult[]> {
    switch (options.strategy) {
      case 'ticker':
        return this.groupByTicker(userId, trades, options);
      case 'day':
        return this.groupByTimeframe(userId, trades, options, 'day');
      case 'week':
        return this.groupByTimeframe(userId, trades, options, 'week');
      case 'pattern':
        return this.groupByPattern(userId, trades, options);
      case 'custom':
        return this.groupCustom(userId, trades, options);
      default:
        throw new Error('Invalid grouping strategy');
    }
  }

  /**
   * Group trades by ticker symbol
   */
  private async groupByTicker(
    userId: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroupingResult[]> {
    const results: TradeGroupingResult[] = [];
    const tickerGroups = new Map<string, Trade[]>();

    // Group trades by ticker
    trades.forEach(trade => {
      const existingGroup = tickerGroups.get(trade.ticker) || [];
      tickerGroups.set(trade.ticker, [...existingGroup, trade]);
    });

    // Process each ticker group
    for (const [ticker, tickerTrades] of tickerGroups) {
      if (options.minTrades && tickerTrades.length < options.minTrades) {
        continue;
      }

      const group = await this.createTradeGroup(userId, {
        ticker,
        trades: tickerTrades,
        notes: `Automatically grouped ${ticker} trades`,
      });

      const metrics = await this.calculateGroupMetrics(group.id);
      results.push({ group, metrics });
    }

    return results;
  }

  /**
   * Group trades by timeframe (day/week)
   */
  private async groupByTimeframe(
    userId: string,
    trades: Trade[],
    options: GroupingOptions,
    timeframe: 'day' | 'week'
  ): Promise<TradeGroupingResult[]> {
    const results: TradeGroupingResult[] = [];
    const timeframeGroups = new Map<string, Trade[]>();

    // Group trades by timeframe
    trades.forEach(trade => {
      const date = new Date(trade.timestamp);
      const key = timeframe === 'day'
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-W${getWeekNumber(date)}`;

      const existingGroup = timeframeGroups.get(key) || [];
      timeframeGroups.set(key, [...existingGroup, trade]);
    });

    // Process each timeframe group
    for (const [timeKey, timeframeTrades] of timeframeGroups) {
      if (options.minTrades && timeframeTrades.length < options.minTrades) {
        continue;
      }

      const dateRange = formatDateRange(
        timeframeTrades[0].timestamp,
        timeframeTrades[timeframeTrades.length - 1].timestamp
      );

      const group = await this.createTradeGroup(userId, {
        ticker: 'MIXED',
        trades: timeframeTrades,
        notes: `${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} trades: ${dateRange}`,
      });

      const metrics = await this.calculateGroupMetrics(group.id);
      results.push({ group, metrics });
    }

    return results;
  }

  /**
   * Group trades by technical pattern
   */
  private async groupByPattern(
    userId: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroupingResult[]> {
    const results: TradeGroupingResult[] = [];
    const patternGroups = new Map<string, Trade[]>();

    // Analyze each trade's pattern
    for (const trade of trades) {
      const patterns = await this.technicalAnalysis.detectPatterns(trade.ticker, {
        startDate: new Date(trade.timestamp),
        endDate: new Date(trade.timestamp),
      });

      if (patterns.length > 0) {
        // Use the highest confidence pattern for grouping
        const mainPattern = patterns.reduce((prev, current) => 
          (current.confidence > prev.confidence ? current : prev)
        );

        if (mainPattern.confidence >= (options.patternConfidence || 0.7)) {
          const patternKey = mainPattern.type;
          const existingGroup = patternGroups.get(patternKey) || [];
          patternGroups.set(patternKey, [...existingGroup, trade]);
        }
      }
    }

    // Process each pattern group
    for (const [pattern, patternTrades] of patternGroups) {
      if (options.minTrades && patternTrades.length < options.minTrades) {
        continue;
      }

      const group = await this.createTradeGroup(userId, {
        ticker: 'PATTERN',
        trades: patternTrades,
        notes: `Pattern-based group: ${pattern}`,
      });

      const metrics = await this.calculateGroupMetrics(group.id);
      results.push({ group, metrics });
    }

    return results;
  }

  /**
   * Create custom trade groups
   */
  private async groupCustom(
    userId: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroupingResult[]> {
    if (!options.customGroupId) {
      throw new Error('Custom group ID is required');
    }

    const group = await this.createTradeGroup(userId, {
      ticker: 'CUSTOM',
      trades,
      notes: options.notes || 'Custom trade group',
    });

    const metrics = await this.calculateGroupMetrics(group.id);
    return [{ group, metrics }];
  }

  /**
   * Create a new trade group
   */
  private async createTradeGroup(
    userId: string,
    params: {
      ticker: string;
      trades: Trade[];
      notes?: string;
    }
  ): Promise<TradeGroup> {
    const { ticker, trades, notes } = params;
    const firstTrade = trades[0];

    // Calculate initial metrics
    const initialQuantity = trades.reduce((sum, trade) => 
      sum.plus(trade.action === 'BUY' ? trade.quantity : trade.quantity.negated()),
      new Decimal(0)
    );

    const totalBuyQuantity = trades
      .filter(t => t.action === 'BUY')
      .reduce((sum, t) => sum.plus(t.quantity), new Decimal(0));

    const totalBuyAmount = trades
      .filter(t => t.action === 'BUY')
      .reduce((sum, t) => sum.plus(t.totalAmount), new Decimal(0));

    const averageEntryPrice = totalBuyQuantity.isZero()
      ? new Decimal(0)
      : totalBuyAmount.dividedBy(totalBuyQuantity);

    // Create the group
    const group = await prisma.tradeGroup.create({
      data: {
        userId,
        ticker,
        status: initialQuantity.isZero() ? 'CLOSED' : 'OPEN',
        entryDate: firstTrade.timestamp,
        exitDate: initialQuantity.isZero() ? trades[trades.length - 1].timestamp : null,
        initialQuantity,
        remainingQuantity: initialQuantity,
        averageEntryPrice,
        currency: firstTrade.currency,
        notes,
        entries: {
          create: trades.map(trade => ({
            tradeId: trade.id,
            quantity: trade.quantity,
          })),
        },
      },
      include: {
        entries: true,
        patterns: true,
      },
    });

    return group;
  }

  /**
   * Calculate metrics for a trade group
   */
  private async calculateGroupMetrics(groupId: string): Promise<TradeGroupMetrics> {
    const group = await prisma.tradeGroup.findUnique({
      where: { id: groupId },
      include: {
        entries: {
          include: {
            trade: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error('Trade group not found');
    }

    const trades = group.entries.map(e => e.trade!);
    let realizedPnl = new Decimal(0);
    let winningTrades = 0;
    let losingTrades = 0;
    let breakEvenTrades = 0;
    let totalWinAmount = new Decimal(0);
    let totalLossAmount = new Decimal(0);
    let maxDrawdown = new Decimal(0);
    let currentDrawdown = new Decimal(0);
    let peak = new Decimal(0);

    // Calculate trade-by-trade metrics
    trades.forEach(trade => {
      const pnl = trade.action === 'SELL'
        ? trade.totalAmount.minus(
            group.averageEntryPrice.multipliedBy(trade.quantity)
          )
        : new Decimal(0);

      if (!pnl.isZero()) {
        realizedPnl = realizedPnl.plus(pnl);

        if (pnl.isPositive()) {
          winningTrades++;
          totalWinAmount = totalWinAmount.plus(pnl);
        } else if (pnl.isNegative()) {
          losingTrades++;
          totalLossAmount = totalLossAmount.plus(pnl.abs());
        } else {
          breakEvenTrades++;
        }

        // Update drawdown calculations
        if (realizedPnl.isGreaterThan(peak)) {
          peak = realizedPnl;
          currentDrawdown = new Decimal(0);
        } else {
          currentDrawdown = peak.minus(realizedPnl);
          if (currentDrawdown.isGreaterThan(maxDrawdown)) {
            maxDrawdown = currentDrawdown;
          }
        }
      }
    });

    const totalTrades = winningTrades + losingTrades + breakEvenTrades;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const averageWin = winningTrades > 0 
      ? totalWinAmount.dividedBy(winningTrades).toNumber()
      : 0;
    const averageLoss = losingTrades > 0
      ? totalLossAmount.dividedBy(losingTrades).toNumber()
      : 0;
    const profitFactor = totalLossAmount.isZero()
      ? totalWinAmount.toNumber()
      : totalWinAmount.dividedBy(totalLossAmount).toNumber();
    const expectancy = (winRate * averageWin) - ((1 - winRate) * averageLoss);

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      breakEvenTrades,
      profitFactor,
      averageWin,
      averageLoss,
      maxDrawdown: maxDrawdown.toNumber(),
      winRate,
      expectancy,
      remainingQuantity: group.remainingQuantity.toNumber(),
      realizedPnl: realizedPnl.toNumber(),
    };
  }
}