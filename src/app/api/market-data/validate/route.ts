import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { YahooFinanceService } from '@/lib/services/yahoo-finance';

/**
 * GET - Validate a stock symbol
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get symbol from query params
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }
    
    // Validate symbol with Yahoo Finance
    const yahooFinance = new YahooFinanceService();
    
    try {
      // Try to get a quote for the symbol
      const quote = await yahooFinance.getCurrentPrice(symbol);
      
      // If we get here, the symbol is valid
      return NextResponse.json({
        valid: true,
        symbol: quote.symbol,
        name: quote.symbol, // We don't get the company name from getCurrentPrice
        price: quote.price,
        currency: quote.currency || 'USD',
      });
    } catch (error) {
      // Try search as a fallback
      try {
        const searchResults = await yahooFinance.searchSymbol(symbol);
        
        if (searchResults.length > 0) {
          const bestMatch = searchResults[0];
          
          return NextResponse.json({
            valid: true,
            symbol: bestMatch.symbol,
            name: bestMatch.shortname || bestMatch.longname || bestMatch.symbol,
            type: bestMatch.typeDisp || 'Equity',
            exchange: bestMatch.exchange,
          });
        } else {
          return NextResponse.json(
            { error: 'Invalid symbol', valid: false },
            { status: 404 }
          );
        }
      } catch (searchError) {
        console.error('Error searching symbol:', searchError);
        return NextResponse.json(
          { error: 'Invalid symbol', valid: false },
          { status: 404 }
        );
      }
    }
  } catch (error) {
    console.error('Error validating symbol:', error);
    return NextResponse.json(
      { error: 'Failed to validate symbol' },
      { status: 500 }
    );
  }
}