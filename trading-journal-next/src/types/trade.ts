import { Decimal } from '@prisma/client/runtime/library';

export interface Trade {
  id: string;
  userId: string;
  brokerTradeId: string;
  ticker: string;
  action: 'BUY' | 'SELL';
  quantity: Decimal;
  price: Decimal;
  currency: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  totalAmount: Decimal;
}

export interface TradeGroup {
  id: string;
  userId: string;
  ticker: string;
  status: 'OPEN' | 'CLOSED';
  entryDate: Date;
  initialQuantity: Decimal;
  remainingQuantity: Decimal;
  averageEntryPrice: Decimal;
  currency: string;
  entries: TradeGroupEntry[];
  patterns: TechnicalPattern[];
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface TradeGroupEntry {
  id: string;
  tradeGroupId: string;
  tradeId: string;
  quantity: Decimal;
  createdAt: Date;
  trade?: Trade;
  tradeGroup?: TradeGroup;
}

export interface TechnicalPattern {
  id: string;
  tradeGroupId: string;
  patternType: string;
  confidence: Decimal;
  entryPattern: boolean;
  exitPattern: boolean;
  timestamp: Date;
  createdAt: Date;
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

export interface TradeGroupingResult {
  group: TradeGroup;
  metrics: TradeGroupMetrics;
}

export interface GroupingOptions {
  strategy: 'ticker' | 'day' | 'week' | 'pattern' | 'custom';
  minTrades?: number;
  timeframe?: 'day' | 'week' | 'month';
  patternConfidence?: number;
  maxTimeGap?: number;
  customGroupId?: string;
  notes?: string;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PatternResult {
  type: string;
  direction: 'BULLISH' | 'BEARISH';
  confidence: number;
}

export interface AnalysisResult {
  sma: Record<string, number[]>;
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
}

export interface AnalysisCapabilities {
  indicators: string[];
  patterns: string[];
}

export interface MACDOptions {
  fast: number;
  slow: number;
  signal: number;
}