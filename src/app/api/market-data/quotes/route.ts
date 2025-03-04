import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { YahooFinanceService } from '@/lib/services/yahoo-finance';

/**
 * GET - Retrieve quotes for multiple symbols
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get symbols from query parameter
    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get('symbols');
    
    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Symbols parameter is required' },
        { status: 400 }
      );
    }
    
    // Parse symbols
    const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
    
    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid symbol is required' },
        { status: 400 }
      );
    }
    
    if (symbols.length > 20) {
      return NextResponse.json(
        { error: 'Maximum of 20 symbols allowed per request' },
        { status: 400 }
      );
    }
    
    // Get quotes using Yahoo Finance service
    const yahooFinance = new YahooFinanceService();
    const quotesMap = await yahooFinance.getBatchQuotes(symbols);
    
    // Transform to array for response
    const quotes = symbols.map(symbol => {
      const quote = quotesMap[symbol];
      
      if (!quote) {
        return {
          symbol,
          price: null,
          change: null,
          changePercent: null,
          timestamp: Date.now(),
          error: 'Quote not available'
        };
      }
      
      return {
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        open: quote.open,
        high: quote.dayHigh,
        low: quote.dayLow,
        volume: quote.volume,
        previousClose: quote.previousClose,
        timestamp: quote.timestamp,
        currency: quote.currency
      };
    });
    
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}