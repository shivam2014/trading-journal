import { z } from 'zod';

// Trading212 CSV format validation schema
export const trading212TradeSchema = z.object({
  Action: z.string().refine(
    val => ['Market buy', 'Market sell', 'Limit buy', 'Limit sell'].includes(val),
    { message: 'Invalid trade action' }
  ),
  Time: z.string().datetime({ message: 'Invalid date format' }),
  ISIN: z.string().optional(),
  Ticker: z.string().min(1, { message: 'Ticker is required' }),
  Name: z.string().optional(),
  'No. of shares': z.string().transform((val, ctx) => {
    const num = parseFloat(val);
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid number of shares',
      });
      return z.NEVER;
    }
    return num;
  }),
  'Price / share': z.string().transform((val, ctx) => {
    const num = parseFloat(val);
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid price per share',
      });
      return z.NEVER;
    }
    return num;
  }),
  Currency: z.string().min(3).max(3),
  'Exchange rate': z.string().optional().transform((val, ctx) => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid exchange rate',
      });
      return z.NEVER;
    }
    return num;
  }),
  Result: z.string().optional().transform((val, ctx) => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid result value',
      });
      return z.NEVER;
    }
    return num;
  }),
  Notes: z.string().optional(),
  ID: z.string().optional(),
});

export type Trading212Trade = z.infer<typeof trading212TradeSchema>;

// Validated trade ready for database insertion
export interface ProcessedTrade {
  ticker: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
  timestamp: Date;
  result: number | null;
  fees: number;
  notes: string;
  currency: string;
  exchangeRate: number | null;
  brokerTradeId: string | null;
  strategy: string;
  session: string;
  isDemo: boolean;
}

export function processTrade(trade: Trading212Trade): ProcessedTrade {
  return {
    ticker: trade.Ticker,
    action: trade.Action.toLowerCase().includes('buy') ? 'BUY' : 'SELL',
    shares: trade['No. of shares'],
    price: trade['Price / share'],
    timestamp: new Date(trade.Time),
    result: trade.Result,
    fees: 0, // Trading212 doesn't include fees in CSV
    notes: trade.Notes || '',
    currency: trade.Currency,
    exchangeRate: trade['Exchange rate'] || null,
    brokerTradeId: trade.ID || null,
    strategy: 'default',
    session: 'default',
    isDemo: false,
  };
}

export function validateAndProcessTrades(csvData: unknown[]): {
  validTrades: ProcessedTrade[];
  errors: { row: number; error: string }[];
} {
  const validTrades: ProcessedTrade[] = [];
  const errors: { row: number; error: string }[] = [];

  csvData.forEach((row, index) => {
    try {
      const validatedTrade = trading212TradeSchema.parse(row);
      validTrades.push(processTrade(validatedTrade));
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            row: index + 2, // +2 because CSV header is row 1 and array is 0-based
            error: `${err.path.join('.')}: ${err.message}`,
          });
        });
      } else {
        errors.push({
          row: index + 2,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  });

  return { validTrades, errors };
}