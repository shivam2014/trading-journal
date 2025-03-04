import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { YahooFinanceService } from '@/lib/services/yahoo-finance';

// Schema for adding a symbol
const addSymbolSchema = z.object({
  symbol: z.string().min(1).max(20),
});

/**
 * GET - Fetch user's watchlist
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's watchlist from database
    const watchlistItems = await prisma.watchlistItem.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json({
      symbols: watchlistItems.map(item => ({
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

/**
 * POST - Add a symbol to watchlist
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const validatedData = addSymbolSchema.parse(body);
    
    // Check if symbol already exists in watchlist
    const existingItem = await prisma.watchlistItem.findFirst({
      where: {
        userId: session.user.id,
        symbol: validatedData.symbol,
      },
    });
    
    if (existingItem) {
      return NextResponse.json(
        { error: 'Symbol already in watchlist' },
        { status: 400 }
      );
    }
    
    // Validate symbol with Yahoo Finance
    const yahooFinance = new YahooFinanceService();
    let symbolName = null;
    
    try {
      const searchResults = await yahooFinance.searchSymbol(validatedData.symbol);
      if (searchResults.length > 0) {
        symbolName = searchResults[0].shortname || searchResults[0].longname;
      }
    } catch (error) {
      console.error('Error validating symbol:', error);
      // Continue even if validation fails
    }
    
    // Add to watchlist
    const watchlistItem = await prisma.watchlistItem.create({
      data: {
        userId: session.user.id,
        symbol: validatedData.symbol.toUpperCase(),
        name: symbolName,
      },
    });
    
    return NextResponse.json({
      id: watchlistItem.id,
      symbol: watchlistItem.symbol,
      name: watchlistItem.name,
      createdAt: watchlistItem.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.format() },
        { status: 400 }
      );
    }
    
    console.error('Error adding symbol to watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to add symbol to watchlist' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a symbol from watchlist
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get symbol from query parameter
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }
    
    // Delete from watchlist
    await prisma.watchlistItem.deleteMany({
      where: {
        userId: session.user.id,
        symbol,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: `Symbol ${symbol} removed from watchlist`,
    });
  } catch (error) {
    console.error('Error removing symbol from watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove symbol from watchlist' },
      { status: 500 }
    );
  }
}