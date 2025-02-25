import { Decimal } from '@prisma/client/runtime/library';

export interface Trade {
  id: string;
  userId: string;
  brokerTradeId: string;
  action: string;
  ticker: string;
  name?: string | null;
  quantity: Decimal;
  price: Decimal;
  currency: string;
  exchangeRate?: Decimal | null;
  totalAmount: Decimal;
  convertedCurrency?: string | null;
  convertedAmount?: Decimal | null;
  timestamp: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeGroup {
  id: string;
  userId: string;
  ticker: string;
  status: string;
  entryDate: Date;
  exitDate?: Date | null;
  initialQuantity: Decimal;
  remainingQuantity: Decimal;
  averageEntryPrice: Decimal;
  averageExitPrice?: Decimal | null;
  realizedPnl?: Decimal | null;
  currency: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  entries: TradeGroupEntry[];
  patterns: TechnicalPattern[];
}

export interface TradeGroupEntry {
  id: string;
  tradeGroupId: string;
  tradeId: string;
  quantity: Decimal;
  createdAt: Date;
  trade: Trade;
  tradeGroup: TradeGroup;
}

export interface TechnicalPattern {
  id: string;
  tradeGroupId: string;
  patternType: string;
  confidence: Decimal;
  entryPattern: boolean;
  exitPattern: boolean;
  timestamp: Date;
  metadata?: any;
  createdAt: Date;
  tradeGroup: TradeGroup;
}

export interface GroupingOptions {
  strategy: 'ticker' | 'day' | 'week' | 'pattern' | 'custom';
  timeframe?: 'day' | 'week' | 'month';
  maxTimeGap?: number;
  minTrades?: number;
  patternConfidence?: number;
  customGroupId?: string;
  notes?: string;
}

export interface TradeGroupMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  winRate: number;
  expectancy: number;
  remainingQuantity: number;
  realizedPnl: number;
}

export interface GroupedTrade {
  tradeId: string;
  groupId: string;
  quantity: number;
  price: number;
  timestamp: Date;
}

export interface PatternGroupCriteria {
  patternType: string;
  confidence: number;
  timestamp: Date;
}

export interface TradeGroupingResult {
  group: TradeGroup;
  metrics: TradeGroupMetrics;
}

export type GroupingStrategy = GroupingOptions['strategy'];

export type TimeFrame = NonNullable<GroupingOptions['timeframe']>;