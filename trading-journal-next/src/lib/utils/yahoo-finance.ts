import yahooFinance from 'yahoo-finance2';
import fetch from 'cross-fetch';
import { normalizeTickerSymbol } from './ticker-mapping';
import { Trade } from '@/types/trade';

declare module 'yahoo-finance2';

export class YahooFinanceError extends Error {
  constructor(
    message: string,
    public readonly context: {
      ticker: string;
      yahooSymbol?: string | null;
      uniqueVariations?: string[];
      timestamp: string;
    }
  ) {
    super(message);
    this.name = 'YahooFinanceError';
  }
}

// Type definitions for yahoo-finance2
interface YahooFinanceInstance {
  search: (query: string, options?: { quotesCount?: number; newsCount?: number }) => Promise<YahooSearchResult>;
  quoteSummary: (symbol: string, options: { modules: string[] }) => Promise<any>;
  historical: (symbol: string, options: { period1: Date; period2: Date; interval: string }) => Promise<YahooHistoricalQuote[]>;
  setGlobalConfig: (options: any) => void;
  _moduleExec: (params: {
    symbol: string;
    module: string;
    startDate?: Date;
    endDate?: Date;
  }) => Promise<YahooSplitsResult>;
}

// Initialize Yahoo Finance with required dependencies
const initYahooFinance = async (): Promise<YahooFinanceInstance> => {
  try {
    // Configure the instance with conservative rate limiting
    const config = {
      queue: {
        concurrency: 1,    // Only process one request at a time
        timeout: 15000     // 15 second timeout per request
      }
    };

    yahooFinance.setGlobalConfig(config);
    console.log('Yahoo Finance initialized with rate limiting');

    // Validate connectivity with both quoteSummary and search
    try {
      // Test quoteSummary
      await yahooFinance.quoteSummary('AAPL', {
        modules: ['price']
      });
      console.log('Yahoo Finance quoteSummary test successful');

      // Test search
      const searchTest = await yahooFinance.search('AAPL', {
        quotesCount: 1,
        newsCount: 0
      });
      if (searchTest?.quotes?.length) {
        console.log('Yahoo Finance search test successful');
      }
    } catch (testError) {
      console.warn('Initial connectivity test warning:', {
        error: testError,
        message: testError instanceof Error ? testError.message : String(testError)
      });
      // Continue despite test failure - the actual requests will have retries
    }

    return yahooFinance as unknown as YahooFinanceInstance;
  } catch (error) {
    console.error('Yahoo Finance initialization error:', {
      error,
      errorType: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

// Initialize the module with rate limiting and error handling
const initializeFinance = async (): Promise<YahooFinanceInstance> => {
  try {
    return await initYahooFinance();
  } catch (error) {
    console.error('Failed to initialize Yahoo Finance, using fallback configuration');
    const fallbackFinance = yahooFinance as unknown as YahooFinanceInstance;
    
    // Apply minimal configuration
    fallbackFinance.setGlobalConfig({
      queue: {
        concurrency: 1,     // Only process one request at a time
        timeout: 15000      // 15 second timeout per request
      }
    });
    
    return fallbackFinance;
  }
};

// Initialize with default configuration first, will be updated after async init
let finance: YahooFinanceInstance = yahooFinance as unknown as YahooFinanceInstance;

// Start async initialization
initializeFinance().then(instance => {
  finance = instance;
  console.log('Yahoo Finance initialization complete');
}).catch(error => {
  console.error('Yahoo Finance initialization failed:', error);
});

// Basic interfaces
export interface StockSplit {
  date: Date;
  denominator: number;
  numerator: number;
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

interface YahooFinanceExtended {
  _moduleExec: (params: {
    symbol: string;
    module: string;
    startDate?: Date;
    endDate?: Date;
  }) => Promise<YahooSplitsResult>;
}

type SplitData = {
  date: string;
  numerator: string | number;
  denominator: string | number;
};

// Helper function to validate finance instance
const validateFinanceInstance = () => {
  if (!finance || typeof finance.search !== 'function' || typeof finance.quoteSummary !== 'function') {
    throw new Error('Yahoo Finance not properly initialized');
  }
};

// Get stock splits
export const getStockSplits = async (
  ticker: string,
  startDate: Date,
  endDate: Date = new Date()
): Promise<StockSplit[]> => {
  // Validate finance instance before proceeding
  try {
    validateFinanceInstance();
  } catch (error) {
    console.error('Yahoo Finance validation failed:', error);
    return [];
  }

  // Initialize variables
  let yahooSymbol: string | null = null;
  let uniqueVariations: string[] = [];
  let lastError: unknown = null;

  // Main execution block
  try {
    console.log(`Starting split fetch process for ${ticker}`);
    
    try {
      console.log(`Attempting quoteSummary for ${ticker}...`);
      const summary = await finance.quoteSummary(ticker, {
        modules: ['price'],
      });
      if (summary?.price?.symbol) {
        yahooSymbol = summary.price.symbol;
        console.log(`Found symbol via quoteSummary: ${yahooSymbol}`);
      }
    } catch (summaryError) {
      console.log(`QuoteSummary failed for ${ticker} with error:`, {
        error: summaryError,
        message: summaryError instanceof Error ? summaryError.message : String(summaryError)
      });
      console.log(`Trying search for ${normalizeTickerSymbol(ticker)}...`);
      try {
        const searchResult = await finance.search(normalizeTickerSymbol(ticker), {
          quotesCount: 1,
          newsCount: 0,
        }) as YahooSearchResult;

        if (searchResult.quotes?.[0]?.symbol) {
          yahooSymbol = searchResult.quotes[0].symbol;
          console.log(`Found symbol via search: ${yahooSymbol}`);
        } else {
          console.log('Search returned no results');
        }
      } catch (searchError) {
        console.log(`Search failed with error:`, {
          error: searchError,
          message: searchError instanceof Error ? searchError.message : String(searchError)
        });
      }
    }

    if (!yahooSymbol) {
      console.log(`No symbol found yet, trying variations for ${ticker}...`);
      const variations = [
        ticker,
        normalizeTickerSymbol(ticker),
        ticker.replace('.US', ''),
        `${ticker}.US`,
      ];

      uniqueVariations = [...new Set(variations)].filter(Boolean);
      console.log(`Testing variations:`, uniqueVariations);
      
      for (const variation of uniqueVariations) {
        try {
          console.log(`Attempting search for variation: ${variation}`);
          const result = await finance.search(variation, {
            quotesCount: 1,
            newsCount: 0,
          }) as YahooSearchResult;

          if (result.quotes?.[0]?.symbol) {
            yahooSymbol = result.quotes[0].symbol;
            console.log(`Found symbol via variation ${variation}: ${yahooSymbol}`);
            break;
          } else {
            console.log(`No results found for variation: ${variation}`);
          }
        } catch (error) {
          lastError = error;
          console.log(`Search failed for variation ${variation}:`, {
            error,
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    if (!yahooSymbol) {
      const errorMsg = `Unable to find valid Yahoo Finance symbol for ${ticker}`;
      console.log(errorMsg, {
        triedVariations: uniqueVariations,
        lastError: lastError instanceof Error ? lastError.message : String(lastError)
      });
      throw new Error(errorMsg);
    }

    const validation = await finance.quoteSummary(yahooSymbol, {
      modules: ['price']
    });
    
    if (!validation?.price) {
      throw new Error(`Unable to validate symbol ${yahooSymbol}`);
    }
    
    console.log(`Validated symbol ${yahooSymbol}, fetching splits between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    console.log('Attempting to fetch splits with _moduleExec...');
    try {
      const splitsResult = await (finance as unknown as YahooFinanceExtended)._moduleExec({
        symbol: yahooSymbol,
        module: 'splits',
        startDate,
        endDate,
      });

      console.log('Raw splits result:', splitsResult);

      if (!splitsResult) {
        console.log('Splits result is null or undefined');
        return [];
      }

      if (!splitsResult.splits) {
        console.log('No splits array in result');
        return [];
      }

      if (!splitsResult.splits.length) {
        console.log(`No splits found for ${yahooSymbol} in the specified date range`);
        return [];
      }

      try {
        const splits = splitsResult.splits.map((split: SplitData, index: number) => {
          console.log(`Processing split ${index}:`, split);
          if (!split.date || !split.numerator || !split.denominator) {
            console.log(`Invalid split data at index ${index}:`, split);
            throw new Error(`Invalid split data at index ${index}`);
          }
          return {
            date: new Date(split.date),
            numerator: Number(split.numerator),
            denominator: Number(split.denominator),
          };
        });

        console.log(`Successfully processed ${splits.length} splits for ${yahooSymbol}`);
        return splits;
      } catch (processingError) {
        console.error('Error processing splits data:', {
          error: processingError,
          message: processingError instanceof Error ? processingError.message : String(processingError),
          rawSplits: splitsResult.splits
        });
        return [];
      }
    } catch (fetchError) {
      console.error('Error fetching splits:', {
        error: fetchError,
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        symbol: yahooSymbol
      });
      return [];
    }
  } catch (error) {
    // Enhanced error logging
    const errorContext = {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error),
      type: error instanceof Error ? 'Error' : typeof error,
      ticker,
      yahooSymbol,
      uniqueVariations,
      timestamp: new Date().toISOString()
    };
    console.error('Split fetch error details:', errorContext);
    
    return []; // Return empty array on error as fallback
  }
};

// Create a virtual SPLIT trade leg
export const createSplitTrade = (
  ticker: string,
  splitDate: Date,
  numerator: number,
  denominator: number,
  currency?: string
): Trade => {
  return {
    id: `SPLIT-${ticker}-${splitDate.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
    ticker,
    action: 'SPLIT',
    shares: 0, // Split trades don't affect share count directly
    price: 0,  // Price is adjusted automatically
    timestamp: splitDate,
    currency,
    splitRatio: {
      numerator,
      denominator
    },
    isSystemGenerated: true,
    notes: `${numerator}:${denominator} share split`
  };
};

// Adjust a trade for splits
export const adjustTradeForSplit = (trade: Trade, split: StockSplit): Trade => {
  if (trade.timestamp.getTime() >= split.date.getTime()) {
    return trade; // Don't adjust trades that occur after the split
  }

  const ratio = split.numerator / split.denominator;
  return {
    ...trade,
    adjustedShares: (trade.adjustedShares || trade.shares) * ratio,
    originalShares: trade.originalShares || trade.shares,
    price: trade.price / ratio,
    isAdjustedForSplit: true
  };
};

// Adjust shares for splits
export const adjustSharesForSplits = (
  initialShares: number,
  tradeDate: Date,
  splits: { date: Date; numerator: number; denominator: number }[]
): number => {
  return splits.reduce((acc: number, split): number => {
    if (split.date.getTime() > tradeDate.getTime()) {
      return acc * (split.numerator / split.denominator);
    }
    return acc;
  }, initialShares);
};

// Validate price data
export const validatePriceData = async (
  ticker: string,
  date: Date,
  csvPrice: number
): Promise<boolean> => {
  try {
    validateFinanceInstance();
  } catch (error) {
    console.error('Yahoo Finance validation failed:', error);
    return false;
  }

  try {
    const normalizedTicker = normalizeTickerSymbol(ticker);
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const historicalData = await finance.historical(normalizedTicker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    }) as YahooHistoricalQuote[];

    if (!historicalData?.length) {
      return false;
    }

    const closestQuote = historicalData.reduce(
      (prev: YahooHistoricalQuote, curr: YahooHistoricalQuote): YahooHistoricalQuote => {
        const prevDiff = Math.abs(prev.date.getTime() - date.getTime());
        const currDiff = Math.abs(curr.date.getTime() - date.getTime());
        return prevDiff < currDiff ? prev : curr;
      },
      historicalData[0]
    );

    const priceDiffPercent = Math.abs((closestQuote.close - csvPrice) / csvPrice);
    return priceDiffPercent <= 0.05;
  } catch (error) {
    console.error('Price validation error:', {
      error,
      ticker,
      date: date.toISOString(),
      csvPrice
    });
    return false;
  }
};

// Process trades and apply split adjustments
export const processSplitAdjustments = async (
  trades: Trade[],
  ticker: string
): Promise<Trade[]> => {
  if (!trades.length) return trades;

  // Find date range for split lookup
  const dates = trades.map(t => t.timestamp);
  const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // Get splits for the date range
  const splits = await getStockSplits(ticker, startDate, endDate);
  if (!splits.length) return trades;

  // Sort trades chronologically
  const sortedTrades = [...trades].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Create a new array with split trades inserted and existing trades adjusted
  const adjustedTrades: Trade[] = [];
  let currentSplitIndex = 0;

  for (const trade of sortedTrades) {
    // Add any splits that should come before this trade
    while (
      currentSplitIndex < splits.length &&
      splits[currentSplitIndex].date.getTime() <= trade.timestamp.getTime()
    ) {
      const split = splits[currentSplitIndex];
      adjustedTrades.push(
        createSplitTrade(
          ticker,
          split.date,
          split.numerator,
          split.denominator,
          trade.currency
        )
      );
      currentSplitIndex++;
    }

    // Add the trade with any necessary adjustments
    let adjustedTrade = { ...trade };
    for (const split of splits) {
      adjustedTrade = adjustTradeForSplit(adjustedTrade, split);
    }
    adjustedTrades.push(adjustedTrade);
  }

  // Add any remaining splits that come after all trades
  while (currentSplitIndex < splits.length) {
    const split = splits[currentSplitIndex];
    adjustedTrades.push(
      createSplitTrade(
        ticker,
        split.date,
        split.numerator,
        split.denominator,
        sortedTrades[0].currency
      )
    );
    currentSplitIndex++;
  }

  return adjustedTrades;
};

// Get current stock price
export const getCurrentPrice = async (ticker: string): Promise<number | null> => {
  // Ensure finance instance is properly initialized
  if (!finance || typeof finance.quoteSummary !== 'function') {
    console.error('Yahoo Finance not properly initialized, waiting for initialization...');
    try {
      finance = await initializeFinance();
    } catch (initError) {
      console.error('Failed to initialize Yahoo Finance:', initError);
      return null;
    }
  }

  // Add a small delay between retries to avoid rate limiting
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Initialize variables
  let yahooSymbol: string | null = null;
  let uniqueVariations: string[] = [];
  let lastError: unknown = null;

  try {
    // First try direct ticker lookup
    try {
      console.log(`Attempting quoteSummary for ${ticker}...`);
      const summary = await finance.quoteSummary(ticker, {
        modules: ['price'],
      });
      if (summary?.price?.regularMarketPrice) {
        console.log(`Successfully got price for ${ticker}:`, summary.price.regularMarketPrice);
        return summary.price.regularMarketPrice;
      } else {
        console.log(`No regularMarketPrice in response for ${ticker}`, summary?.price);
      }
    } catch (summaryError) {
      const summaryErrorContext = {
        error: summaryError instanceof Error ? {
          name: summaryError.name,
          message: summaryError.message,
          stack: summaryError.stack
        } : String(summaryError),
        type: summaryError instanceof Error ? 'Error' : typeof summaryError,
        context: { ticker }
      };
      console.error(`QuoteSummary failed for ${ticker}:`, summaryErrorContext);
      lastError = summaryError;
      await delay(1000); // Wait 1 second before next attempt
    }

    // Try with normalized ticker
    const normalizedTicker = normalizeTickerSymbol(ticker);
    try {
      console.log(`Attempting quoteSummary with normalized ticker ${normalizedTicker}...`);
      const result = await finance.quoteSummary(normalizedTicker, {
        modules: ['price']
      });

      if (result?.price?.regularMarketPrice) {
        console.log(`Successfully got price for normalized ticker ${normalizedTicker}:`, result.price.regularMarketPrice);
        return result.price.regularMarketPrice;
      } else {
        console.log(`No regularMarketPrice in response for normalized ticker ${normalizedTicker}`, result?.price);
      }
    } catch (normalizedError) {
      const normalizedErrorContext = {
        error: normalizedError instanceof Error ? {
          name: normalizedError.name,
          message: normalizedError.message,
          stack: normalizedError.stack
        } : String(normalizedError),
        type: normalizedError instanceof Error ? 'Error' : typeof normalizedError,
        context: { ticker, normalizedTicker }
      };
      console.error(`Normalized ticker lookup failed for ${normalizedTicker}:`, normalizedErrorContext);
      lastError = normalizedError;
      await delay(1000); // Wait 1 second before next attempt
    }

    // Try variations as last resort
    await delay(1000); // Wait 1 second before starting variations
    const variations = [
      ticker,
      normalizeTickerSymbol(ticker),
      ticker.replace('.US', ''),
      `${ticker}.US`,
    ];

    uniqueVariations = [...new Set(variations)].filter(Boolean);
    console.log(`Testing variations for current price:`, uniqueVariations);
    
    for (const variation of uniqueVariations) {
      try {
        console.log(`Attempting quoteSummary for variation: ${variation}`);
        const result = await finance.quoteSummary(variation, {
          modules: ['price']
        });

        if (result?.price?.regularMarketPrice) {
          console.log(`Successfully got price for variation ${variation}:`, result.price.regularMarketPrice);
          return result.price.regularMarketPrice;
        } else {
          console.log(`No regularMarketPrice in response for variation ${variation}`, result?.price);
        }
      } catch (error) {
        const variationErrorContext = {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : String(error),
          type: error instanceof Error ? 'Error' : typeof error,
          context: { ticker, variation, normalizedTicker }
        };
        console.error(`Failed to get price for variation ${variation}:`, variationErrorContext);
        lastError = error;
      }
      if (variation !== uniqueVariations[uniqueVariations.length - 1]) {
        await delay(1000); // Wait 1 second before trying next variation
      }
    }

    // If we get here, all attempts failed
    const errorContext = {
      ticker,
      normalizedTicker,
      triedVariations: uniqueVariations,
      lastError: lastError instanceof Error ? {
        name: lastError.name,
        message: lastError.message,
        stack: lastError.stack
      } : String(lastError),
      timestamp: new Date().toISOString()
    };
    
    console.error('All attempts to fetch current price failed:', errorContext);
    return null;
  } catch (error) {
    const finalErrorContext = {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error),
      type: error instanceof Error ? 'Error' : typeof error,
      context: {
        ticker,
        uniqueVariations,
        timestamp: new Date().toISOString()
      }
    };
    console.error('Current price fetch error:', finalErrorContext);
    return null;
  }
};

// Get historical prices
export const getHistoricalPrices = async (
  ticker: string,
  startDate: Date,
  endDate: Date = new Date()
): Promise<HistoricalPrice[]> => {
  try {
    validateFinanceInstance();
  } catch (error) {
    console.error('Yahoo Finance validation failed:', error);
    return [];
  }

  try {
    const normalizedTicker = normalizeTickerSymbol(ticker);
    const historicalData = await finance.historical(normalizedTicker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    }) as YahooHistoricalQuote[];

    if (!historicalData?.length) {
      return [];
    }

    return historicalData.map((quote: YahooHistoricalQuote): HistoricalPrice => ({
      date: quote.date,
      close: quote.close,
    }));
  } catch (error) {
    console.error('Historical prices fetch error:', {
      error,
      ticker,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return [];
  }
};