import { Trade } from "@/types/trade";

// Initial mapping of Trading212 tickers to Yahoo Finance tickers
const tickerMap: Record<string, string> = {
  // Common US stocks - T212 sometimes adds .US suffix
  'AAPL.US': 'AAPL',
  'GOOGL.US': 'GOOGL',
  'MSFT.US': 'MSFT',
  
  // UK stocks - T212 sometimes uses .L suffix instead of .LON
  'LLOY.L': 'LLOY.LON',
  'VOD.L': 'VOD.LON',
  
  // Add more mappings as needed
};

/**
 * Normalize a Trading212 ticker to its Yahoo Finance equivalent
 */
export function normalizeTickerSymbol(t212Ticker: string): string {
  // First check direct mapping
  if (tickerMap[t212Ticker]) {
    return tickerMap[t212Ticker];
  }
  
  // Handle common patterns
  if (t212Ticker.endsWith('.US')) {
    // Try without the .US suffix
    const baseTicker = t212Ticker.replace('.US', '');
    return baseTicker;
  }
  
  // For UK stocks, ensure .LON suffix
  if (t212Ticker.endsWith('.L')) {
    return t212Ticker.replace('.L', '.LON');
  }
  
  // If no special handling needed, return as-is
  return t212Ticker;
}

/**
 * Get product details from a Trade object to help with validation
 */
export function getProductDetails(trade: Trade) {
  return {
    ticker: trade.ticker,
    currency: trade.currency
  };
}

/**
 * Add a new ticker mapping
 */
export function addTickerMapping(t212Ticker: string, yahooTicker: string) {
  tickerMap[t212Ticker] = yahooTicker;
}

/**
 * Get all current ticker mappings
 */
export function getAllTickerMappings(): Record<string, string> {
  return { ...tickerMap };
}