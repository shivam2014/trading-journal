import yahooFinance from 'yahoo-finance2';
import { z } from 'zod';

interface HistoricalDataOptions {
  interval?: '1m' | '5m' | '15m' | '60m' | '1d' | '1wk';
  range?: string;
  start?: Date;
  end?: Date;
}

const quoteSchema = z.object({
  symbol: z.string(),
  regularMarketPrice: z.number(),
  regularMarketOpen: z.number(),
  regularMarketDayHigh: z.number(),
  regularMarketDayLow: z.number(),
  regularMarketVolume: z.number().optional(),
  regularMarketTime: z.number(),
});

export class YahooFinanceService {
  private validateAndMapHistoricalData(rawData: any[]) {
    return rawData.map(item => ({
      timestamp: new Date(item.date),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));
  }

  async getHistoricalData(symbol: string, options: HistoricalDataOptions = {}) {
    try {
      const queryOptions: any = {
        interval: options.interval || '1d',
      };

      if (options.range) {
        queryOptions.range = options.range;
      } else if (options.start && options.end) {
        queryOptions.period1 = options.start;
        queryOptions.period2 = options.end;
      } else {
        queryOptions.range = '1mo';
      }

      const result = await yahooFinance.historical(symbol, queryOptions);
      return this.validateAndMapHistoricalData(result);
    } catch (error) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error);
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }
  }

  async getCurrentPrice(symbol: string) {
    try {
      const quote = await yahooFinance.quote(symbol);
      const validatedQuote = quoteSchema.parse(quote);
      
      return {
        price: validatedQuote.regularMarketPrice,
        open: validatedQuote.regularMarketOpen,
        high: validatedQuote.regularMarketDayHigh,
        low: validatedQuote.regularMarketDayLow,
        volume: validatedQuote.regularMarketVolume,
        timestamp: new Date(validatedQuote.regularMarketTime * 1000),
      };
    } catch (error) {
      console.error(`Failed to fetch current price for ${symbol}:`, error);
      throw new Error(`Failed to fetch current price for ${symbol}`);
    }
  }

  async searchSymbol(query: string) {
    try {
      const results = await yahooFinance.search(query);
      return results.quotes
        .filter(quote => quote.isYahooFinance)
        .map(quote => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname,
          exchange: quote.exchange,
          type: quote.quoteType,
        }));
    } catch (error) {
      console.error(`Failed to search for symbol ${query}:`, error);
      throw new Error(`Failed to search for symbol ${query}`);
    }
  }

  async getQuote(symbol: string) {
    try {
      const quote = await yahooFinance.quote(symbol);
      const validatedQuote = quoteSchema.parse(quote);
      
      return {
        symbol: validatedQuote.symbol,
        price: validatedQuote.regularMarketPrice,
        open: validatedQuote.regularMarketOpen,
        high: validatedQuote.regularMarketDayHigh,
        low: validatedQuote.regularMarketDayLow,
        volume: validatedQuote.regularMarketVolume,
        timestamp: new Date(validatedQuote.regularMarketTime * 1000),
      };
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      throw new Error(`Failed to fetch quote for ${symbol}`);
    }
  }
}

// Singleton instance
let yahooFinanceServiceInstance: YahooFinanceService | null = null;

export function getYahooFinanceService(): YahooFinanceService {
  if (!yahooFinanceServiceInstance) {
    yahooFinanceServiceInstance = new YahooFinanceService();
  }
  return yahooFinanceServiceInstance;
}