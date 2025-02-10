import yahooFinance from 'yahoo-finance2';
import fetch from 'cross-fetch';
import { normalizeTickerSymbol } from './ticker-mapping';

// Configure yahoo-finance2 to use cross-fetch
if (typeof global !== 'undefined') {
  (global as any).fetch = fetch;
}

export interface StockSplit {
  date: Date;
  denominator: number; // pre-split shares
  numerator: number;   // post-split shares
}

export interface HistoricalPrice {
  date: Date;
  close: number;
}

interface YahooSearchResult {
  quotes: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchDisp?: string;
    typeDisp?: string;
  }>;
}

interface YahooHistoricalQuote {
  date: Date;
  close: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  adjClose?: number;
}

interface YahooSplitsResult {
  splits?: Array<{
    date: string;
    numerator: string | number;
    denominator: string | number;
  }>;
}

/**
 * Fetch stock splits for a given ticker between start and end dates
 */
export async function getStockSplits(
  ticker: string,
  startDate: Date,
  endDate: Date = new Date()
): Promise<StockSplit[]> {
  try {
    const normalizedTicker = normalizeTickerSymbol(ticker);
    const result = await yahooFinance.search(normalizedTicker, {
      quotesCount: 1,
      newsCount: 0,
    }) as YahooSearchResult;

    if (!result.quotes?.[0]?.symbol) {
      throw new Error(`No symbol found for ticker: ${normalizedTicker}`);
    }

    const yahooSymbol = result.quotes[0].symbol;

    // Fetch quote summary to ensure the symbol is valid
    await yahooFinance.quoteSummary(yahooSymbol, {
      modules: ['defaultKeyStatistics'],
    });

    // Using any for _moduleExec since it's not properly typed in yahoo-finance2
    const splitsResult = await (yahooFinance as any)._moduleExec({
      symbol: yahooSymbol,
      module: 'splits',
      startDate,
      endDate,
    }) as YahooSplitsResult;

    if (!splitsResult?.splits) {
      return [];
    }

    return splitsResult.splits.map(split => ({
      date: new Date(split.date),
      numerator: Number(split.numerator),
      denominator: Number(split.denominator),
    }));
  } catch (error) {
    console.error('Error fetching stock splits:', error);
    return [];
  }
}

/**
 * Adjust share quantity based on stock splits
 */
export function adjustSharesForSplits(
  initialShares: number,
  tradeDate: Date,
  splits: StockSplit[]
): number {
  return splits.reduce((acc: number, split: StockSplit): number => {
    // Only apply splits that occurred after the trade
    if (split.date > tradeDate) {
      return acc * (split.numerator / split.denominator);
    }
    return acc;
  }, initialShares);
}

/**
 * Validate price data against CSV data
 */
export async function validatePriceData(
  ticker: string,
  date: Date,
  csvPrice: number
): Promise<boolean> {
  try {
    const normalizedTicker = normalizeTickerSymbol(ticker);
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const historicalData = await yahooFinance.historical(normalizedTicker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    }) as YahooHistoricalQuote[];

    if (!historicalData?.length) {
      return false;
    }

    // Find the closest price to our date using reduce
    const closestQuote = historicalData.reduce((prev: YahooHistoricalQuote, curr: YahooHistoricalQuote): YahooHistoricalQuote => {
      const prevDiff = Math.abs(new Date(prev.date).getTime() - date.getTime());
      const currDiff = Math.abs(new Date(curr.date).getTime() - date.getTime());
      return prevDiff < currDiff ? prev : curr;
    }, historicalData[0]);

    // Allow for some price difference (e.g., 5%) due to different data sources
    const priceDiffPercent = Math.abs(
      (closestQuote.close - csvPrice) / csvPrice
    );
    return priceDiffPercent <= 0.05; // 5% threshold
  } catch (error) {
    console.error('Error validating price data:', error);
    return false;
  }
}

/**
 * Get historical prices for a ticker within a date range
 */
export async function getHistoricalPrices(
  ticker: string,
  startDate: Date,
  endDate = new Date()
): Promise<HistoricalPrice[]> {
  try {
    const normalizedTicker = normalizeTickerSymbol(ticker);
    const quotes = await yahooFinance.historical(normalizedTicker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    }) as YahooHistoricalQuote[];

    return quotes.map((quote: YahooHistoricalQuote) => ({
      date: new Date(quote.date),
      close: quote.close,
    }));
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    return [];
  }
}