import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Trade } from '@/types/trade';

// Demo trade data with realistic trading patterns and multiple groups per ticker
const demoTrades: Partial<Trade>[] = [
  // AAPL Swing Trading Group
  {
    ticker: 'AAPL',
    action: 'BUY',
    shares: 50,
    price: 185.92,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    fees: 1.50,
    notes: 'Initial position in Apple',
    strategy: 'swing',
    session: 'morning',
    groupId: '123e4567-e89b-12d3-a456-426614174000',
    currency: 'USD'
  },
  {
    ticker: 'AAPL',
    action: 'BUY',
    shares: 25,
    price: 183.50,
    timestamp: new Date('2024-01-15T14:45:00Z'),
    fees: 1.50,
    notes: 'Adding to swing position on weakness',
    strategy: 'swing',
    session: 'afternoon',
    groupId: '123e4567-e89b-12d3-a456-426614174000',
    currency: 'USD'
  },
  {
    ticker: 'AAPL',
    action: 'SELL',
    shares: 35,
    price: 188.95,
    timestamp: new Date('2024-01-17T11:20:00Z'),
    result: 147.75,
    fees: 1.50,
    notes: 'Taking partial profits on swing trade',
    strategy: 'swing',
    session: 'morning',
    groupId: '123e4567-e89b-12d3-a456-426614174000',
    currency: 'USD'
  },

  // AAPL Day Trading Group
  {
    ticker: 'AAPL',
    action: 'BUY',
    shares: 100,
    price: 187.50,
    timestamp: new Date('2024-01-20T09:35:00Z'),
    fees: 1.50,
    notes: 'Day trade entry on morning dip',
    strategy: 'day',
    session: 'morning',
    groupId: '234e5678-e89b-12d3-a456-426614174001',
    currency: 'USD'
  },
  {
    ticker: 'AAPL',
    action: 'SELL',
    shares: 100,
    price: 189.25,
    timestamp: new Date('2024-01-20T11:45:00Z'),
    result: 175.00,
    fees: 1.50,
    notes: 'Day trade exit on morning rally',
    strategy: 'day',
    session: 'morning',
    groupId: '234e5678-e89b-12d3-a456-426614174001',
    currency: 'USD'
  },

  // AAPL Dividends (associated with swing position)
  {
    ticker: 'AAPL',
    action: 'DIVIDEND',
    shares: 40,
    price: 0.85,
    timestamp: new Date('2024-02-10T09:00:00Z'),
    result: 34.00,
    notes: 'AAPL Q1 2024 Dividend',
    strategy: 'swing',
    groupId: '123e4567-e89b-12d3-a456-426614174000',
    currency: 'USD'
  },

  // MSFT Investment Group
  {
    ticker: 'MSFT',
    action: 'BUY',
    shares: 30,
    price: 397.58,
    timestamp: new Date('2024-01-20T09:30:00Z'),
    fees: 1.50,
    notes: 'Long-term investment position',
    strategy: 'investment',
    session: 'morning',
    groupId: '345e6789-e89b-12d3-a456-426614174002',
    currency: 'USD'
  },
  {
    ticker: 'MSFT',
    action: 'SELL',
    shares: 15,
    price: 405.25,
    timestamp: new Date('2024-01-25T15:45:00Z'),
    result: 114.55,
    fees: 1.50,
    notes: 'Taking partial profits on investment',
    strategy: 'investment',
    session: 'afternoon',
    groupId: '345e6789-e89b-12d3-a456-426614174002',
    currency: 'USD'
  },
  {
    ticker: 'MSFT',
    action: 'DIVIDEND',
    shares: 30,
    price: 2.45,
    timestamp: new Date('2024-01-25T09:00:00Z'),
    result: 73.50,
    notes: 'MSFT Q4 2023 Dividend',
    strategy: 'investment',
    groupId: '345e6789-e89b-12d3-a456-426614174002',
    currency: 'USD'
  },

  // MSFT Scalping Group
  {
    ticker: 'MSFT',
    action: 'BUY',
    shares: 50,
    price: 402.30,
    timestamp: new Date('2024-01-26T10:15:00Z'),
    fees: 1.50,
    notes: 'Scalp trade entry',
    strategy: 'scalp',
    session: 'morning',
    groupId: '456e7890-e89b-12d3-a456-426614174003',
    currency: 'USD'
  },
  {
    ticker: 'MSFT',
    action: 'SELL',
    shares: 50,
    price: 403.45,
    timestamp: new Date('2024-01-26T10:25:00Z'),
    result: 57.50,
    fees: 1.50,
    notes: 'Scalp trade exit',
    strategy: 'scalp',
    session: 'morning',
    groupId: '456e7890-e89b-12d3-a456-426614174003',
    currency: 'USD'
  },

  // TSLA Multiple Day Trading Sessions
  {
    ticker: 'TSLA',
    action: 'BUY',
    shares: 30,
    price: 182.63,
    timestamp: new Date('2024-02-01T10:15:00Z'),
    fees: 1.50,
    notes: 'Morning session entry',
    strategy: 'day',
    session: 'morning',
    groupId: '567e8901-e89b-12d3-a456-426614174004',
    currency: 'USD'
  },
  {
    ticker: 'TSLA',
    action: 'SELL',
    shares: 30,
    price: 186.50,
    timestamp: new Date('2024-02-01T11:45:00Z'),
    result: 116.10,
    fees: 1.50,
    notes: 'Morning session exit',
    strategy: 'day',
    session: 'morning',
    groupId: '567e8901-e89b-12d3-a456-426614174004',
    currency: 'USD'
  },
  {
    ticker: 'TSLA',
    action: 'BUY',
    shares: 25,
    price: 184.75,
    timestamp: new Date('2024-02-01T13:30:00Z'),
    fees: 1.50,
    notes: 'Afternoon session entry',
    strategy: 'day',
    session: 'afternoon',
    groupId: '678e9012-e89b-12d3-a456-426614174005',
    currency: 'USD'
  },
  {
    ticker: 'TSLA',
    action: 'SELL',
    shares: 25,
    price: 183.25,
    timestamp: new Date('2024-02-01T15:45:00Z'),
    result: -37.50,
    fees: 1.50,
    notes: 'Afternoon session exit',
    strategy: 'day',
    session: 'afternoon',
    groupId: '678e9012-e89b-12d3-a456-426614174005',
    currency: 'USD'
  },

  // META Complex Multi-Day Swing Trade
  {
    ticker: 'META',
    action: 'BUY',
    shares: 40,
    price: 380.25,
    timestamp: new Date('2024-01-22T10:30:00Z'),
    fees: 1.50,
    notes: 'Initial swing position',
    strategy: 'swing',
    session: 'morning',
    groupId: '789e0123-e89b-12d3-a456-426614174006',
    currency: 'USD'
  },
  {
    ticker: 'META',
    action: 'BUY',
    shares: 20,
    price: 375.50,
    timestamp: new Date('2024-01-23T14:15:00Z'),
    fees: 1.50,
    notes: 'Adding on dip',
    strategy: 'swing',
    session: 'afternoon',
    groupId: '789e0123-e89b-12d3-a456-426614174006',
    currency: 'USD'
  },
  {
    ticker: 'META',
    action: 'SELL',
    shares: 30,
    price: 385.75,
    timestamp: new Date('2024-01-24T11:30:00Z'),
    result: 225.00,
    fees: 1.50,
    notes: 'Taking partial profits',
    strategy: 'swing',
    session: 'morning',
    groupId: '789e0123-e89b-12d3-a456-426614174006',
    currency: 'USD'
  },
  {
    ticker: 'META',
    action: 'BUY',
    shares: 15,
    price: 382.25,
    timestamp: new Date('2024-01-25T13:45:00Z'),
    fees: 1.50,
    notes: 'Adding on strength',
    strategy: 'swing',
    session: 'afternoon',
    groupId: '789e0123-e89b-12d3-a456-426614174006',
    currency: 'USD'
  },
  {
    ticker: 'META',
    action: 'SELL',
    shares: 45,
    price: 394.50,
    timestamp: new Date('2024-01-26T15:30:00Z'),
    result: 495.75,
    fees: 1.50,
    notes: 'Final exit on swing trade',
    strategy: 'swing',
    session: 'afternoon',
    groupId: '789e0123-e89b-12d3-a456-426614174006',
    currency: 'USD'
  },

  // NVDA Breakeven Trade Group
  {
    ticker: 'NVDA',
    action: 'BUY',
    shares: 20,
    price: 552.75,
    timestamp: new Date('2024-02-05T10:15:00Z'),
    fees: 1.50,
    notes: 'Entry on morning momentum',
    strategy: 'day',
    session: 'morning',
    groupId: '890e1234-e89b-12d3-a456-426614174007',
    currency: 'USD'
  },
  {
    ticker: 'NVDA',
    action: 'SELL',
    shares: 20,
    price: 552.90,
    timestamp: new Date('2024-02-05T10:45:00Z'),
    result: 3.00,
    fees: 1.50,
    notes: 'Quick exit at breakeven',
    strategy: 'day',
    session: 'morning',
    groupId: '890e1234-e89b-12d3-a456-426614174007',
    currency: 'USD'
  },

  // AMD Short Selling Example
  {
    ticker: 'AMD',
    action: 'SELL',
    shares: 35,
    price: 172.50,
    timestamp: new Date('2024-02-06T09:45:00Z'),
    fees: 1.50,
    notes: 'Short position on opening gap',
    strategy: 'day',
    session: 'morning',
    groupId: '901e2345-e89b-12d3-a456-426614174008',
    currency: 'USD'
  },
  {
    ticker: 'AMD',
    action: 'BUY',
    shares: 35,
    price: 169.75,
    timestamp: new Date('2024-02-06T11:30:00Z'),
    result: 96.25,
    fees: 1.50,
    notes: 'Covering short position on target',
    strategy: 'day',
    session: 'morning',
    groupId: '901e2345-e89b-12d3-a456-426614174008',
    currency: 'USD'
  },

  // Financial Transactions
  {
    ticker: 'USD',
    action: 'DEPOSIT',
    shares: 1,
    price: 50000,
    timestamp: new Date('2024-01-01T09:00:00Z'),
    notes: 'Initial account funding',
    currency: 'USD'
  },
  {
    ticker: 'USD',
    action: 'WITHDRAWAL',
    shares: 1,
    price: 5000,
    timestamp: new Date('2024-02-15T16:30:00Z'),
    notes: 'Monthly withdrawal',
    currency: 'USD'
  },
  {
    ticker: 'USD',
    action: 'LENDING_INTEREST',
    shares: 1,
    price: 25.50,
    timestamp: new Date('2024-01-31T23:59:59Z'),
    notes: 'January securities lending interest',
    currency: 'USD'
  },
  {
    ticker: 'EUR/USD',
    action: 'CURRENCY_CONVERSION',
    shares: 5000,
    price: 1.0785,
    timestamp: new Date('2024-02-01T10:00:00Z'),
    notes: 'EUR to USD conversion',
    currency: 'EUR',
    targetCurrency: 'USD',
    exchangeRate: 1.0785
  }
];

export async function POST(request: NextRequest) {
  try {
    // Prepare values for batch insert
    const values = demoTrades.map(trade => [
      trade.ticker,
      trade.action,
      trade.shares,
      trade.price,
      trade.timestamp,
      trade.result || null,
      trade.fees || null,
      trade.notes || null,
      trade.groupId || null,
      trade.currency || null,
      trade.targetCurrency || null,
      trade.exchangeRate || null,
      trade.strategy || null,
      trade.session || null,
      true // is_demo flag
    ]);

    // Create placeholders for the batch insert
    const placeholders = values.map((_, i) =>
      `($${i * 15 + 1}, $${i * 15 + 2}, $${i * 15 + 3}, $${i * 15 + 4}, $${i * 15 + 5}, $${i * 15 + 6}, $${i * 15 + 7}, $${i * 15 + 8}, $${i * 15 + 9}, $${i * 15 + 10}, $${i * 15 + 11}, $${i * 15 + 12}, $${i * 15 + 13}, $${i * 15 + 14}, $${i * 15 + 15})`
    ).join(',');

    // Flatten values array for query
    const flatValues = values.flat();

    // Insert all trades at once with ON CONFLICT DO NOTHING
    const result = await db.query(
      `INSERT INTO trades (
        ticker,
        action,
        shares,
        price,
        timestamp,
        result,
        fees,
        notes,
        group_id,
        currency,
        target_currency,
        exchange_rate,
        strategy,
        session,
        is_demo
      ) VALUES ${placeholders}
      ON CONFLICT ON CONSTRAINT trades_unique_identifier DO UPDATE SET
        result = CASE
          WHEN trades.result IS NULL AND EXCLUDED.result IS NOT NULL
          THEN EXCLUDED.result
          ELSE trades.result
        END,
        fees = CASE
          WHEN trades.fees IS NULL AND EXCLUDED.fees IS NOT NULL
          THEN EXCLUDED.fees
          ELSE trades.fees
        END,
        notes = CASE
          WHEN trades.notes IS NULL AND EXCLUDED.notes IS NOT NULL
          THEN EXCLUDED.notes
          ELSE trades.notes
        END,
        group_id = CASE
          WHEN trades.group_id IS NULL AND EXCLUDED.group_id IS NOT NULL
          THEN EXCLUDED.group_id
          ELSE trades.group_id
        END,
        currency = CASE
          WHEN trades.currency IS NULL AND EXCLUDED.currency IS NOT NULL
          THEN EXCLUDED.currency
          ELSE trades.currency
        END,
        target_currency = CASE
          WHEN trades.target_currency IS NULL AND EXCLUDED.target_currency IS NOT NULL
          THEN EXCLUDED.target_currency
          ELSE trades.target_currency
        END,
        exchange_rate = CASE
          WHEN trades.exchange_rate IS NULL AND EXCLUDED.exchange_rate IS NOT NULL
          THEN EXCLUDED.exchange_rate
          ELSE trades.exchange_rate
        END,
        strategy = CASE
          WHEN trades.strategy IS NULL AND EXCLUDED.strategy IS NOT NULL
          THEN EXCLUDED.strategy
          ELSE trades.strategy
        END,
        session = CASE
          WHEN trades.session IS NULL AND EXCLUDED.session IS NOT NULL
          THEN EXCLUDED.session
          ELSE trades.session
        END,
        is_demo = true
      RETURNING *`,
      flatValues
    );

    // Calculate stats by examining the ctid system column
    // New rows have a different ctid from their old version
    const updated = result.rows.filter(row => row.ctid).length;
    const inserted = result.rows.length - updated;
    const unchanged = demoTrades.length - result.rows.length;

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${demoTrades.length} demo trades: ${inserted} new, ${updated} updated${unchanged > 0 ? `, ${unchanged} unchanged` : ''}`,
      inserted,
      updated,
      unchanged,
      total: demoTrades.length
    });

  } catch (error) {
    console.error('Error initializing demo trades:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to initialize demo trades',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
