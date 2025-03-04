import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Add currency columns
    await db.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS currency VARCHAR(10)`);
    await db.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS target_currency VARCHAR(10)`);
    await db.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4)`);

    // Add trading strategy and session columns
    await db.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS strategy VARCHAR(50)`);
    await db.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS session VARCHAR(50)`);
    await db.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS status VARCHAR(20)`);
    await db.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS percent_closed DECIMAL(5,2)`);

    // Add trade status constraints
    try {
      await db.query(`
        ALTER TABLE trades 
        DROP CONSTRAINT IF EXISTS trades_status_check
      `);
    } catch (e) {
      // Ignore error if constraint doesn't exist
    }

    await db.query(`
      ALTER TABLE trades 
      ADD CONSTRAINT trades_status_check 
      CHECK (status IS NULL OR status IN ('OPEN', 'CLOSED', 'PARTIALLY_CLOSED'))
    `);

    // Update action column type and constraints
    await db.query(`
      ALTER TABLE trades 
      ALTER COLUMN action TYPE VARCHAR(20)
    `);
    
    // Drop existing action constraint if it exists
    try {
      await db.query(`
        ALTER TABLE trades 
        DROP CONSTRAINT trades_action_check
      `);
    } catch (e) {
      // Ignore error if constraint doesn't exist
    }

    // Add new action constraint
    await db.query(`
      ALTER TABLE trades 
      ADD CONSTRAINT trades_action_check 
      CHECK (action IN (
        'BUY', 'SELL', 'INTEREST', 'LENDING_INTEREST', 
        'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL', 'CURRENCY_CONVERSION'
      ))
    `);

    // Add isDemo column
    await db.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_is_demo ON trades(is_demo)`);

    // Add indexes for improved query performance
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(ticker)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_session ON trades(session)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_group_id ON trades(group_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)`);

    // Add unique constraint to prevent duplicate trades
    try {
      await db.query(`
        ALTER TABLE trades 
        DROP CONSTRAINT IF EXISTS trades_unique_identifier
      `);
    } catch (e) {
      // Ignore error if constraint doesn't exist
    }

    await db.query(`
      ALTER TABLE trades
      ADD CONSTRAINT trades_unique_identifier 
      UNIQUE (ticker, timestamp, action, shares, price)
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Database migration completed successfully' 
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to run database migration',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}