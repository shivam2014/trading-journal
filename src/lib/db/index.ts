import './config';
import { db } from './config';
import { Trade } from '@/types/trade';

// Helper function to transform database row to Trade type
function transformTradeRow(row: any): Trade {
  return {
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
    strategy: row.strategy,
    session: row.session,
    status: row.status,
    percentClosed: row.percent_closed ? Number(row.percent_closed) : 0,
    currency: row.currency,
    targetCurrency: row.target_currency,
    exchangeRate: row.exchange_rate ? Number(row.exchange_rate) : undefined,
  };
}

export async function updateTrade(id: string, trade: Partial<Trade>): Promise<Trade> {
  const setClauses: string[] = [];
  const values = [id];

  if (trade.ticker) {
    setClauses.push(`ticker = $${(values.length + 1).toString()}`);
    values.push(trade.ticker);
  }

  if (trade.action) {
    setClauses.push(`action = $${(values.length + 1).toString()}`);
    values.push(trade.action);
  }

  if (trade.shares !== undefined) {
    setClauses.push(`shares = $${(values.length + 1).toString()}`);
    values.push(trade.shares.toString());
  }

  if (trade.price !== undefined) {
    setClauses.push(`price = $${(values.length + 1).toString()}`);
    values.push(trade.price.toString());
  }

  if (trade.timestamp) {
    setClauses.push(`timestamp = $${(values.length + 1).toString()}`);
    values.push(trade.timestamp.toISOString());
  }

  if (trade.result !== undefined) {
    setClauses.push(`result = $${(values.length + 1).toString()}`);
    values.push(trade.result.toString());
  }

  if (trade.fees !== undefined) {
    setClauses.push(`fees = $${(values.length + 1).toString()}`);
    values.push(trade.fees.toString());
  }

  if (trade.notes !== undefined) {
    setClauses.push(`notes = $${(values.length + 1).toString()}`);
    values.push(trade.notes);
  }

  if (trade.groupId !== undefined) {
    setClauses.push(`group_id = $${(values.length + 1).toString()}`);
    values.push(trade.groupId);
  }

  if (trade.strategy !== undefined) {
    setClauses.push(`strategy = $${(values.length + 1).toString()}`);
    values.push(trade.strategy);
  }

  if (trade.session !== undefined) {
    setClauses.push(`session = $${(values.length + 1).toString()}`);
    values.push(trade.session);
  }

  if (trade.status !== undefined) {
    setClauses.push(`status = $${(values.length + 1).toString()}`);
    values.push(trade.status);
  }

  if (trade.percentClosed !== undefined) {
    setClauses.push(`percent_closed = $${(values.length + 1).toString()}`);
    values.push(trade.percentClosed.toString());
  }

  if (trade.currency !== undefined) {
    setClauses.push(`currency = $${(values.length + 1).toString()}`);
    values.push(trade.currency);
  }

  if (trade.targetCurrency !== undefined) {
    setClauses.push(`target_currency = $${(values.length + 1).toString()}`);
    values.push(trade.targetCurrency);
  }

  if (trade.exchangeRate !== undefined) {
    setClauses.push(`exchange_rate = $${(values.length + 1).toString()}`);
    values.push(trade.exchangeRate.toString());
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');

  const query = `
    UPDATE trades 
    SET ${setClauses.join(', ')}
    WHERE id = $1
    RETURNING *
  `;

  const result = await db.query(query, values);
  return transformTradeRow(result.rows[0]);
}

export async function deleteTrade(id: string): Promise<void> {
  await db.query('DELETE FROM trades WHERE id = $1', [id]);
}

export async function createMigration() {
  await db.query(`
    ALTER TABLE trades
    ADD COLUMN IF NOT EXISTS strategy VARCHAR(50),
    ADD COLUMN IF NOT EXISTS session VARCHAR(50),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS percent_closed DECIMAL(5,2)
  `);
}

// Export the db instance for use in other files
export { db };