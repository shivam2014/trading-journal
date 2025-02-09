import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortColumn = searchParams.get('sortColumn');
    const sortDirection = searchParams.get('sortDirection');

    let queryString = `
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
        is_demo
      FROM trades
    `;

    const conditions: string[] = [];
    const values: any[] = [];

    if (ticker) {
      conditions.push(`ticker ILIKE $${values.length + 1}`);
      values.push(`%${ticker}%`);
    }

    if (action) {
      conditions.push(`action = $${values.length + 1}`);
      values.push(action);
    }

    if (startDate) {
      conditions.push(`timestamp >= $${values.length + 1}`);
      values.push(new Date(startDate));
    }

    if (endDate) {
      conditions.push(`timestamp <= $${values.length + 1}`);
      values.push(new Date(endDate));
    }

    if (conditions.length > 0) {
      queryString += ` AND ${conditions.join(" AND ")}`;
    }

    if (sortColumn && sortDirection) {
      queryString += ` ORDER BY ${sortColumn} ${sortDirection}`;
    } else {
      queryString += ` ORDER BY timestamp DESC`;
    }

    const result = await db.query(queryString, values);

    if (result.rows.length === 0) {
      return NextResponse.json({
        trades: [],
        status: 'empty'
      });
    }

    return NextResponse.json({
      trades: result.rows.map(row => ({
        id: row.id,
        ticker: row.ticker,
        action: row.action,
        shares: Number(row.shares),
        price: Number(row.price),
        timestamp: row.timestamp,
        result: row.result ? Number(row.result) : 0,
        fees: row.fees ? Number(row.fees) : 0,
        notes: row.notes,
        groupId: row.group_id,
      })),
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