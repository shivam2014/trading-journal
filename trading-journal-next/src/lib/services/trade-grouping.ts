import { prisma } from '@/lib/db/prisma';
import type {
  Trade,
  TradeGroup,
  GroupingOptions,
  TradeGroupMetrics,
  TradeGroupingResult,
  TechnicalPattern,
} from '@/types/trade';
import { Decimal } from '@prisma/client/runtime/library';

export class TradeGroupingService {
  private async createGroup(
    userId: string,
    ticker: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroup> {
    if (!trades.length) {
      throw new Error('No trades provided for group creation');
    }

    // Calculate initial metrics
    const initialQuantity = trades.reduce((sum, trade) => {
      const tradeQty = trade.action === 'BUY' ? trade.quantity : trade.quantity.negated();
      return sum.plus(tradeQty);
    }, new Decimal(0));

    const totalQuantity = trades.reduce((sum, trade) => 
      sum.plus(trade.quantity), new Decimal(0));

    const averageEntryPrice = trades.reduce((sum, trade) => 
      sum.plus(trade.price.times(trade.quantity)), new Decimal(0))
      .div(totalQuantity);

    return await prisma.tradeGroup.create({
      data: {
        userId,
        ticker,
        status: 'OPEN',
        entryDate: trades[0].timestamp,
        initialQuantity,
        remainingQuantity: initialQuantity,
        averageEntryPrice,
        currency: trades[0].currency,
        notes: options.notes || `Auto-grouped by ${options.strategy} strategy`,
        entries: {
          create: trades.map(trade => ({
            tradeId: trade.id,
            quantity: trade.quantity,
          })),
        },
      },
      include: {
        entries: {
          include: {
            trade: true,
          },
        },
        patterns: true,
      },
    });
  }

  public async groupTrades(
    userId: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroupingResult[]> {
    const results: TradeGroupingResult[] = [];
    let groups: TradeGroup[] = [];

    switch (options.strategy) {
      case 'ticker':
        groups = await this.groupByTicker(userId, trades, options);
        break;

      case 'day':
      case 'week':
        groups = await this.groupByTimeframe(userId, trades, options);
        break;

      case 'pattern':
        groups = await this.groupByPattern(userId, trades, options);
        break;

      case 'custom':
        if (!options.customGroupId) {
          throw new Error('Custom group ID required for custom grouping');
        }
        groups = await this.groupCustom(userId, trades, options);
        break;

      default:
        throw new Error(`Unknown grouping strategy: ${options.strategy}`);
    }

    // Calculate metrics for each group
    for (const group of groups) {
      const metrics = await this.getGroupMetrics(group);
      results.push({ group, metrics });
    }

    return results;
  }

  public async getGroupMetrics(group: TradeGroup): Promise<TradeGroupMetrics> {
    return this.calculateMetrics(group);
  }

  private async calculateMetrics(group: TradeGroup): Promise<TradeGroupMetrics> {
    const trades = group.entries.map(entry => entry.trade);
    let totalPnl = new Decimal(0);
    let remainingQuantity = new Decimal(0);
    let winningTrades = 0;
    let losingTrades = 0;
    let breakEvenTrades = 0;
    let totalWins = new Decimal(0);
    let totalLosses = new Decimal(0);
    let maxDrawdown = new Decimal(0);
    let currentDrawdown = new Decimal(0);

    trades.forEach(trade => {
      const tradeValue = trade.price.times(trade.quantity);
      if (trade.action === 'BUY') {
        remainingQuantity = remainingQuantity.plus(trade.quantity);
        totalPnl = totalPnl.minus(tradeValue);
        currentDrawdown = Decimal.min(currentDrawdown, totalPnl);
      } else {
        remainingQuantity = remainingQuantity.minus(trade.quantity);
        totalPnl = totalPnl.plus(tradeValue);
        
        // Update trade statistics
        if (totalPnl.isPositive()) {
          winningTrades++;
          totalWins = totalWins.plus(totalPnl);
        } else if (totalPnl.isNegative()) {
          losingTrades++;
          totalLosses = totalLosses.plus(totalPnl.abs());
        } else {
          breakEvenTrades++;
        }
      }

      maxDrawdown = Decimal.min(maxDrawdown, currentDrawdown);
    });

    const totalTrades = winningTrades + losingTrades + breakEvenTrades;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const averageWin = winningTrades > 0 ? totalWins.dividedBy(winningTrades).toNumber() : 0;
    const averageLoss = losingTrades > 0 ? totalLosses.dividedBy(losingTrades).toNumber() : 0;
    const profitFactor = totalLosses.isZero() ? 0 : totalWins.dividedBy(totalLosses).toNumber();
    const expectancy = winRate * averageWin - (1 - winRate) * averageLoss;

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
      remainingQuantity: remainingQuantity.toNumber(),
      realizedPnl: totalPnl.toNumber(),
    };
  }

  private async groupByTicker(
    userId: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroup[]> {
    const groups: TradeGroup[] = [];
    const tradesByTicker = new Map<string, Trade[]>();

    // Group trades by ticker
    trades.forEach(trade => {
      const tickerTrades = tradesByTicker.get(trade.ticker) || [];
      tickerTrades.push(trade);
      tradesByTicker.set(trade.ticker, tickerTrades);
    });

    // Create groups for each ticker
    for (const [ticker, tickerTrades] of tradesByTicker) {
      if (tickerTrades.length >= (options.minTrades || 1)) {
        const group = await this.createGroup(userId, ticker, tickerTrades, options);
        groups.push(group);
      }
    }

    return groups;
  }

  private async groupByTimeframe(
    userId: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroup[]> {
    const groups: TradeGroup[] = [];
    const tradesByPeriod = new Map<string, Trade[]>();

    // Sort trades by timestamp
    const sortedTrades = [...trades].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Group trades by period
    sortedTrades.forEach(trade => {
      const date = new Date(trade.timestamp);
      let periodKey: string;

      switch (options.timeframe) {
        case 'day':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'week':
          const week = Math.floor(date.getDate() / 7);
          periodKey = `${date.getFullYear()}-W${week}`;
          break;
        case 'month':
          periodKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        default:
          throw new Error(`Invalid timeframe: ${options.timeframe}`);
      }

      const periodTrades = tradesByPeriod.get(periodKey) || [];
      periodTrades.push(trade);
      tradesByPeriod.set(periodKey, periodTrades);
    });

    // Create groups for each period
    for (const [_, periodTrades] of tradesByPeriod) {
      if (periodTrades.length >= (options.minTrades || 1)) {
        const group = await this.createGroup(
          userId,
          periodTrades[0].ticker,
          periodTrades,
          options
        );
        groups.push(group);
      }
    }

    return groups;
  }

  private async groupByPattern(
    userId: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroup[]> {
    const groups: TradeGroup[] = [];
    const tradesByPattern = new Map<string, Trade[]>();

    // Get patterns for trades
    const patterns = await prisma.technicalPattern.findMany({
      where: {
        tradeGroup: {
          userId,
        },
        timestamp: {
          gte: new Date(Math.min(...trades.map(t => t.timestamp.getTime()))),
          lte: new Date(Math.max(...trades.map(t => t.timestamp.getTime()))),
        },
        confidence: {
          gte: new Decimal(options.patternConfidence || 0.7),
        },
      },
    });

    // Group trades by pattern
    patterns.forEach((pattern: TechnicalPattern) => {
      const relatedTrades = trades.filter(trade => 
        Math.abs(trade.timestamp.getTime() - pattern.timestamp.getTime()) < 
        (options.maxTimeGap || 60) * 60 * 1000 // Convert minutes to milliseconds
      );

      if (relatedTrades.length > 0) {
        const patternTrades = tradesByPattern.get(pattern.patternType) || [];
        patternTrades.push(...relatedTrades);
        tradesByPattern.set(pattern.patternType, patternTrades);
      }
    });

    // Create groups for each pattern
    for (const [patternType, patternTrades] of tradesByPattern) {
      if (patternTrades.length >= (options.minTrades || 1)) {
        const group = await this.createGroup(
          userId,
          patternTrades[0].ticker,
          patternTrades,
          {
            ...options,
            notes: `Pattern-based group: ${patternType}`,
          }
        );
        groups.push(group);
      }
    }

    return groups;
  }

  private async groupCustom(
    userId: string,
    trades: Trade[],
    options: GroupingOptions
  ): Promise<TradeGroup[]> {
    if (!options.customGroupId) {
      throw new Error('Custom group ID required');
    }

    // Check if group exists
    let group = await prisma.tradeGroup.findFirst({
      where: {
        id: options.customGroupId,
        userId,
      },
      include: {
        entries: {
          include: {
            trade: true,
          },
        },
        patterns: true,
      },
    });

    // Create new group if it doesn't exist
    if (!group) {
      group = await this.createGroup(
        userId,
        trades[0].ticker,
        trades,
        options
      );
    } else {
      // Add trades to existing group
      await prisma.tradeGroupEntry.createMany({
        data: trades.map(trade => ({
          tradeGroupId: group!.id,
          tradeId: trade.id,
          quantity: trade.quantity,
        })),
      });

      // Refresh group data
      group = await prisma.tradeGroup.findUniqueOrThrow({
        where: { id: group.id },
        include: {
          entries: {
            include: {
              trade: true,
            },
          },
          patterns: true,
        },
      });
    }

    return [group];
  }
}

// Export types
export type { 
  Trade, 
  TradeGroup, 
  GroupingOptions, 
  TradeGroupMetrics, 
  TradeGroupingResult,
  TechnicalPattern,
};

// Singleton instance
let tradeGroupingServiceInstance: TradeGroupingService | null = null;

export function getTradeGroupingService(): TradeGroupingService {
  if (!tradeGroupingServiceInstance) {
    tradeGroupingServiceInstance = new TradeGroupingService();
  }
  return tradeGroupingServiceInstance;
}