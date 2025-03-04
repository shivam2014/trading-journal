import yahooFinance from 'yahoo-finance2';
import { z } from 'zod';
import { cache } from '@/lib/utils/cache';

export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  previousClose?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  currency?: string;
}

export interface HistoricalData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export interface HistoricalDataOptions {
  interval?: '1d' | '1h' | '5m' | '1m' | '1wk' | '1mo';
  range?: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max';
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
  private readonly baseUrl = 'https://query1.finance.yahoo.com/v8/finance';
  private readonly cacheTtl = 60 * 1000; // 1 minute

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

  async getHistoricalData(symbol: string, options: HistoricalDataOptions = {}): Promise<HistoricalData[]> {
    const interval = options.interval || '1d';
    const range = options.range || '1mo';
    const cacheKey = `yahoo-finance:historical:${symbol}:${interval}:${range}`;
    
    // Try to get from cache first
    const cached = cache.get<HistoricalData[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const url = `${this.baseUrl}/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data for ${symbol}: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result) {
        throw new Error(`No historical data found for symbol: ${symbol}`);
      }
      
      const timestamp = result.timestamp || [];
      const quote = result.indicators.quote?.[0] || {};
      const adjclose = result.indicators.adjclose?.[0]?.adjclose || [];
      
      const historicalData: HistoricalData[] = timestamp.map((time: number, i: number) => ({
        timestamp: time * 1000,
        open: quote.open?.[i] || 0,
        high: quote.high?.[i] || 0,
        low: quote.low?.[i] || 0,
        close: quote.close?.[i] || 0,
        volume: quote.volume?.[i] || 0,
        adjClose: adjclose[i],
      }));
      
      // Save to cache
      // Use shorter TTL for intraday data
      const ttl = interval.includes('m') || interval.includes('h') ? 5 * 60 * 1000 : this.cacheTtl;
      cache.set(cacheKey, historicalData, ttl);
      
      return historicalData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  async getCurrentPrice(symbol: string): Promise<QuoteData> {
    const cacheKey = `yahoo-finance:quote:${symbol}`;
    
    // Try to get from cache first
    const cached = cache.get<QuoteData>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const url = `${this.baseUrl}/quote?symbols=${encodeURIComponent(symbol)}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch quote for ${symbol}: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = data.quoteResponse?.result?.[0];
      
      if (!result) {
        throw new Error(`No quote data found for symbol: ${symbol}`);
      }
      
      const quoteData: QuoteData = {
        symbol: result.symbol,
        price: result.regularMarketPrice,
        change: result.regularMarketChange,
        changePercent: result.regularMarketChangePercent,
        volume: result.regularMarketVolume,
        timestamp: result.regularMarketTime * 1000,
        previousClose: result.regularMarketPreviousClose,
        open: result.regularMarketOpen,
        dayHigh: result.regularMarketDayHigh,
        dayLow: result.regularMarketDayLow,
        currency: result.currency,
      };
      
      // Save to cache
      cache.set(cacheKey, quoteData, this.cacheTtl);
      
      return quoteData;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  async searchSymbol(query: string) {
    if (!query || query.length < 1) {
      return [];
    }
    
    const cacheKey = `yahoo-finance:search:${query}`;
    
    // Try to get from cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to search symbols for "${query}": ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const quotes = data.quotes || [];
      
      // Save to cache
      cache.set(cacheKey, quotes, 5 * 60 * 1000); // 5 minutes cache
      
      return quotes;
    } catch (error) {
      console.error(`Error searching symbols for "${query}":`, error);
      return [];
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

  async getBatchQuotes(symbols: string[]): Promise<Record<string, QuoteData>> {
    if (!symbols.length) {
      return {};
    }
    
    try {
      const symbolString = symbols.join(',');
      const cacheKey = `yahoo-finance:batch-quotes:${symbolString}`;
      
      // Try to get from cache first
      const cached = cache.get<Record<string, QuoteData>>(cacheKey);
      if (cached) {
        return cached;
      }
      
      const url = `${this.baseUrl}/quote?symbols=${encodeURIComponent(symbolString)}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch batch quotes: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const results = data.quoteResponse?.result || [];
      
      const quotesMap: Record<string, QuoteData> = {};
      
      results.forEach((result: any) => {
        quotesMap[result.symbol] = {
          symbol: result.symbol,
          price: result.regularMarketPrice,
          change: result.regularMarketChange,
          changePercent: result.regularMarketChangePercent,
          volume: result.regularMarketVolume,
          timestamp: result.regularMarketTime * 1000,
          previousClose: result.regularMarketPreviousClose,
          open: result.regularMarketOpen,
          dayHigh: result.regularMarketDayHigh,
          dayLow: result.regularMarketDayLow,
          currency: result.currency,
        };
      });
      
      // Save to cache
      cache.set(cacheKey, quotesMap, this.cacheTtl);
      
      return quotesMap;
    } catch (error) {
      console.error('Error fetching batch quotes:', error);
      throw error;
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