import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortColumn = searchParams.get('sortColumn') || 'timestamp';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Convert sortColumn to actual database column name
    const columnMap: Record<string, string> = {
      'lastTradeDate': 'timestamp',
      'ticker': 'ticker',
      'action': 'action',
      'shares': 'shares',
      'price': 'price',
      'result': 'result'
    };

    const dbColumn = columnMap[sortColumn] || 'timestamp';

    // Add better error handling and logging
    console.log('Fetching trades with params:', {
      sortColumn: dbColumn,
      sortDirection
    });

    const queryString = `
      SELECT
        id,
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
      FROM trades
      ORDER BY ${dbColumn} ${sortDirection}
    `;

    const result = await db.query(queryString);
    console.log(`Found ${result.rows.length} trades`);

    if (result.rows.length === 0) {
      return NextResponse.json({
        trades: [],
        status: 'empty'
      });
    }

    const trades = result.rows.map(row => ({
      id: row.id,
      ticker: row.ticker,
      action: row.action,
      shares: Number(row.shares),
      price: Number(row.price),
      timestamp: new Date(row.timestamp),
      result: row.result ? Number(row.result) : 0,
      fees: row.fees ? Number(row.fees) : 0,
      notes: row.notes,
      groupId: row.group_id,
      currency: row.currency,
      targetCurrency: row.target_currency,
      exchangeRate: row.exchange_rate ? Number(row.exchange_rate) : undefined,
      strategy: row.strategy,
      session: row.session,
      isDemo: row.is_demo
    }));

    console.log(`Processed ${trades.length} trades for response`);

    return NextResponse.json({
      trades,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}