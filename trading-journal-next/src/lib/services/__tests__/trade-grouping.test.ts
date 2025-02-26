import { TradeGroupingService } from '../trade-grouping';
import { prisma } from '@/lib/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type { Trade, TradeGroup } from '@/types/trade';

// Mock prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    tradeGroup: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      createMany: jest.fn(),
    },
    tradeGroupEntry: {
      createMany: jest.fn(),
    },
    technicalPattern: {
      findMany: jest.fn(),
    },
  },
}));

describe('TradeGroupingService', () => {
  let service: TradeGroupingService;
  
  const mockTrades: Trade[] = [
    {
      id: '1',
      userId: 'user1',
      brokerTradeId: 'b1',
      action: 'BUY',
      ticker: 'AAPL',
      quantity: new Decimal(100),
      price: new Decimal(150),
      currency: 'USD',
      totalAmount: new Decimal(15000),
      timestamp: new Date('2025-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      userId: 'user1',
      brokerTradeId: 'b2',
      action: 'SELL',
      ticker: 'AAPL',
      quantity: new Decimal(50),
      price: new Decimal(160),
      currency: 'USD',
      totalAmount: new Decimal(8000),
      timestamp: new Date('2025-01-02'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockGroup: TradeGroup = {
    id: 'group1',
    userId: 'user1',
    ticker: 'AAPL',
    status: 'OPEN',
    entryDate: new Date('2025-01-01'),
    initialQuantity: new Decimal(100),
    remainingQuantity: new Decimal(50),
    averageEntryPrice: new Decimal(150),
    currency: 'USD',
    notes: 'ENGULFING pattern-based trades', // Add this line
    createdAt: new Date(),
    updatedAt: new Date(),
    entries: [
      {
        id: 'entry1',
        tradeGroupId: 'group1',
        tradeId: '1',
        quantity: new Decimal(100),
        createdAt: new Date(),
        trade: mockTrades[0],
        tradeGroup: null as any,
      },
      {
        id: 'entry2',
        tradeGroupId: 'group1',
        tradeId: '2',
        quantity: new Decimal(50),
        createdAt: new Date(),
        trade: mockTrades[1],
        tradeGroup: null as any,
      },
    ],
    patterns: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TradeGroupingService();
    (prisma.tradeGroup.create as jest.Mock).mockResolvedValue(mockGroup);
    (prisma.tradeGroup.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.tradeGroup.findUniqueOrThrow as jest.Mock).mockResolvedValue(mockGroup);
    (prisma.technicalPattern.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('groupByTicker', () => {
    it('should group trades by ticker', async () => {
      const result = await service.groupTrades(
        'user1',
        mockTrades,
        { strategy: 'ticker' }
      );

      expect(result).toHaveLength(1);
      expect(result[0].group.ticker).toBe('AAPL');
      expect(prisma.tradeGroup.create).toHaveBeenCalled();
    });

    it('should respect minimum trades requirement', async () => {
      const result = await service.groupTrades(
        'user1',
        mockTrades,
        { strategy: 'ticker', minTrades: 3 }
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('groupByTimeframe', () => {
    it('should group trades by day', async () => {
      const result = await service.groupTrades(
        'user1',
        mockTrades,
        { strategy: 'day', timeframe: 'day' }
      );

      expect(result).toHaveLength(2); // One group per day
      expect(prisma.tradeGroup.create).toHaveBeenCalledTimes(2);
    });

    it('should group trades by week', async () => {
      const result = await service.groupTrades(
        'user1',
        mockTrades,
        { strategy: 'week', timeframe: 'week' }
      );

      expect(result).toHaveLength(1); // Both trades in same week
      expect(prisma.tradeGroup.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('groupByPattern', () => {
    it('should group trades by pattern', async () => {
      const mockPattern = {
        id: 'pattern1',
        tradeGroupId: 'group1',
        patternType: 'ENGULFING',
        confidence: new Decimal(0.8),
        entryPattern: true,
        exitPattern: false,
        timestamp: new Date('2025-01-01'),
        createdAt: new Date(),
      };

      (prisma.technicalPattern.findMany as jest.Mock).mockResolvedValue([mockPattern]);

      const result = await service.groupTrades(
        'user1',
        mockTrades,
        { 
          strategy: 'pattern',
          patternConfidence: 0.7,
          maxTimeGap: 1440, // 24 hours
        }
      );

      expect(result).toHaveLength(1);
      expect(result[0].group.notes).toContain('ENGULFING');
    });
  });

  describe('Custom Grouping', () => {
    it('should create new custom group', async () => {
      const result = await service.groupTrades(
        'user1',
        mockTrades,
        { 
          strategy: 'custom',
          customGroupId: 'newGroup',
        }
      );

      expect(result).toHaveLength(1);
      expect(prisma.tradeGroup.create).toHaveBeenCalled();
    });

    it('should add to existing custom group', async () => {
      (prisma.tradeGroup.findFirst as jest.Mock).mockResolvedValue(mockGroup);

      const result = await service.groupTrades(
        'user1',
        mockTrades,
        { 
          strategy: 'custom',
          customGroupId: 'group1',
        }
      );

      expect(result).toHaveLength(1);
      expect(prisma.tradeGroupEntry.createMany).toHaveBeenCalled();
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate group metrics correctly', async () => {
      const result = await service.groupTrades(
        'user1',
        mockTrades,
        { strategy: 'ticker' }
      );

      const metrics = result[0].metrics;
      expect(metrics.totalTrades).toBe(2);
      expect(metrics.remainingQuantity).toBe(50);
      expect(metrics.realizedPnl).toBeGreaterThan(0); // Profit from partial sale at higher price
    });
  });
});