import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

/**
 * POST - Run the watchlist migration to create the watchlist table
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if the user is an admin
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let message = 'Watchlist migration completed successfully';
    
    try {
      // Check if the migration has already been run
      await prisma.$queryRaw`SELECT 1 FROM "WatchlistItem" LIMIT 1`;
      message = 'Watchlist migration has already been applied';
    } catch (error) {
      // If the table doesn't exist, create it
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WatchlistItem" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "symbol" TEXT NOT NULL,
          "name" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          
          CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "WatchlistItem_userId_symbol_key" UNIQUE ("userId", "symbol"),
          CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");
      `);
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Error running watchlist migration:', error);
    return NextResponse.json(
      { error: 'Failed to run watchlist migration' },
      { status: 500 }
    );
  }
}