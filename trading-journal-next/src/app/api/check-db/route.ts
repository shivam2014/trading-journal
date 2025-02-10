import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test connection first
    const connectionTest = await db.query('SELECT 1;');
    if (!connectionTest.rows[0]) {
      throw new Error('Database connection test failed');
    }

    // Check if trades table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'trades'
      ) as exists;
    `);

    if (!tableCheck.rows[0]?.exists) {
      // Create trades table if it doesn't exist
      await db.query(`
        CREATE TABLE trades (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticker VARCHAR(20) NOT NULL,
          action VARCHAR(20) NOT NULL CHECK (action IN ('BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL', 'LENDING_INTEREST', 'CURRENCY_CONVERSION')),
          shares DECIMAL NOT NULL,
          price DECIMAL NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          result DECIMAL,
          fees DECIMAL,
          notes TEXT,
          group_id UUID,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          is_demo BOOLEAN DEFAULT false,
          currency VARCHAR(10),
          target_currency VARCHAR(10),
          exchange_rate DECIMAL,
          strategy VARCHAR(20),
          session VARCHAR(20)
        );
      `);

      // Create indexes in separate queries
      await db.query(`CREATE INDEX trades_ticker_idx ON trades(ticker);`);
      await db.query(`CREATE INDEX trades_timestamp_idx ON trades(timestamp);`);

      return NextResponse.json({ 
        message: 'Trades table created successfully',
        status: 'created'
      });
    }

    // Check table schema and count trades
    const [columnsCheck, tradesCount] = await Promise.all([
      db.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'trades';
      `),
      db.query(`SELECT COUNT(*) as count FROM trades;`)
    ]);

    return NextResponse.json({
      message: 'Trades table exists',
      status: 'exists',
      schema: columnsCheck.rows,
      isEmpty: Number(tradesCount.rows[0]?.count || '0') === 0,
      hasData: Number(tradesCount.rows[0]?.count || '0') > 0
    });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check database status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}