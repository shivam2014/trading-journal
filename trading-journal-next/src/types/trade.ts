export interface Trade {
  id: string;
  ticker: string;
  action: 'BUY' | 'SELL' | 'INTEREST' | 'LENDING_INTEREST' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL' | 'CURRENCY_CONVERSION';
  shares: number;
  price: number;
  timestamp: Date;
  result?: number;
  fees?: number;
  notes?: string;
  groupId?: string;
  strategy?: string;
  session?: string;
  status?: 'OPEN' | 'CLOSED' | 'PARTIALLY_CLOSED';
  currency?: string;
  targetCurrency?: string;  // For currency conversion transactions
  exchangeRate?: number;    // For currency conversion transactions
  percentClosed?: number;   // For partially closed trades
  isDemo?: boolean;         // Flag to identify demo trades
}

export interface TradeGroupSummary {
  totalTrades: number;
  totalVolume: number;
  totalPnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalFees: number;
  totalDividends: number;
  partiallyClosedTrades: number;
  avgPercentClosed: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  holdingPeriodHours: number;
  riskRewardRatio: number;
  positionSizePercent: number;
  score: number;
  winRate: number;
}

export interface TradeGroup {
  id: string;
  ticker: string;
  strategy?: string;
  session?: string;
  status: 'OPEN' | 'CLOSED' | 'PARTIALLY_CLOSED';
  openDate: Date;
  closeDate?: Date;
  trades: Trade[];
  regularTrades: Trade[];    // Regular buy/sell trades
  dividendTrades: Trade[];   // Dividend-related trades
  netShares: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalFees: number;
  percentClosed: number;
  currency?: string;
  summary: TradeGroupSummary;
  // Additional metrics from original implementation
  avgEntryPrice: number;
  avgExitPrice: number;
  holdingPeriodHours: number;
  riskRewardRatio: number;
  positionSizePercent: number;
  score: number;
  winRate: number;
}

export interface TickerGroup {
  ticker: string;
  tradeGroups: TradeGroup[];
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalDividends: number;
  totalFees: number;
  openPositions: number;
  lastTradeDate: Date;
  totalVolume: number;   // Required for sorting and display
  winRate: number;      // Required for sorting and display
  score: number;        // Required for sorting and display
}

export interface TradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  biggestWin: number;
  biggestLoss: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  averageHoldingTime: number;
  totalInterest: number;     // Added for interest earnings
  totalDividends: number;    // Added for dividend earnings
  totalDeposits: number;     // Added for deposits
  totalWithdrawals: number;  // Added for withdrawals
  totalFees: number;
  totalVolume: number;
  partiallyClosedTrades: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }[];
}

export interface TradeFilters {
  symbol?: string;
  strategy?: string;
  session?: string;
  startDate?: Date;
  endDate?: Date;
  action?: 'BUY' | 'SELL' | 'INTEREST' | 'LENDING_INTEREST' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL' | 'CURRENCY_CONVERSION';
  status?: 'OPEN' | 'CLOSED' | 'PARTIALLY_CLOSED';
  currency?: string;
}

export type SortableTickerColumns = 
  | 'ticker'
  | 'lastTradeDate'
  | 'totalRealizedPnL'
  | 'totalUnrealizedPnL'
  | 'totalDividends'
  | 'totalFees'
  | 'openPositions'
  | 'totalVolume'
  | 'winRate'
  | 'score';

export interface TradeSort {
  column: SortableTickerColumns;
  direction: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}