import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  console.log('Query parameters:', Object.fromEntries(searchParams));
  try {
    // Check if trades table exists and has data
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'trades'
      ) as table_exists,
      (SELECT COUNT(*) FROM trades) as row_count;
    `);

    console.log('Table check:', tableCheck.rows[0]);

    // Debug: Show sample of trades
    const sampleTrades = await db.query(`
      SELECT id, ticker, action, shares, price, result, timestamp
      FROM trades
      LIMIT 5;
    `);
    console.log('Sample trades:', sampleTrades.rows);

    if (!tableCheck.rows[0].table_exists || tableCheck.rows[0].row_count === '0') {
      return NextResponse.json({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        biggestWin: 0,
        biggestLoss: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        averageHoldingTime: 0,
        totalInterest: 0,
        totalDividends: 0,
        totalDeposits: 0,
        totalWithdrawals: 0
      });
    }

    // Get all trades ordered by timestamp
    // First get raw data about trades and results
    const debugQuery = `
      SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE result IS NOT NULL) as has_result_count,
        COUNT(*) FILTER (WHERE result != 0) as non_zero_result_count,
        COUNT(*) FILTER (WHERE action = 'BUY') as buy_count,
        COUNT(*) FILTER (WHERE action = 'SELL') as sell_count,
        COUNT(*) FILTER (WHERE action = 'DIVIDEND') as dividend_count,
        json_agg(json_build_object(
          'action', action,
          'result', result
        )) FILTER (WHERE result != 0) as non_zero_results
      FROM trades;
    `;
    const debugResult = await db.query(debugQuery);
    console.log('Debug counts:', debugResult.rows[0]);

    const query = `
      WITH trade_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE result != 0) as total_trades,
          COUNT(CASE WHEN result > 0 THEN 1 END) as winning_trades,
          COUNT(CASE WHEN result < 0 THEN 1 END) as losing_trades,
          COALESCE(SUM(CASE WHEN result != 0 THEN result ELSE 0 END), 0) as total_pnl,
          COALESCE(MAX(CASE WHEN result > 0 THEN result END), 0) as biggest_win,
          COALESCE(MIN(CASE WHEN result < 0 THEN result END), 0) as biggest_loss,
          COALESCE(AVG(CASE WHEN result > 0 THEN result END), 0) as average_win,
          COALESCE(AVG(CASE WHEN result < 0 THEN result END), 0) as average_loss,
          COALESCE(SUM(CASE WHEN result > 0 THEN result END), 0) as total_wins,
          COALESCE(ABS(SUM(CASE WHEN result < 0 THEN result END)), 0) as total_losses,
          -- New aggregations for other transaction types
          SUM(CASE WHEN action IN ('INTEREST', 'LENDING_INTEREST') THEN price ELSE 0 END) as total_interest,
          SUM(CASE WHEN action = 'DIVIDEND' THEN price ELSE 0 END) as total_dividends,
          SUM(CASE WHEN action = 'DEPOSIT' THEN price ELSE 0 END) as total_deposits,
          SUM(CASE WHEN action = 'WITHDRAWAL' THEN price ELSE 0 END) as total_withdrawals
        FROM trades
      )
      SELECT 
        total_trades,
        winning_trades,
        losing_trades,
        COALESCE(
          ROUND(CAST((winning_trades::numeric / NULLIF(total_trades, 0)) * 100 AS numeric), 2),
          0
        ) as win_rate,
        total_pnl,
        biggest_win,
        biggest_loss,
        average_win,
        average_loss,
        CASE 
          WHEN total_losses > 0 THEN total_wins / total_losses
          ELSE total_wins 
        END as profit_factor,
        total_interest,
        total_dividends,
        total_deposits,
        total_withdrawals
      FROM trade_stats;
    `;

    console.log('Executing query:', query);
    const result = await db.query(query);
    console.log('Number of rows returned:', result.rows.length);

    if (result.rows.length === 0) {
      return NextResponse.json({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        biggestWin: 0,
        biggestLoss: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        averageHoldingTime: 0,
        totalInterest: 0,
        totalDividends: 0,
        totalDeposits: 0,
        totalWithdrawals: 0
      });
    }

    const stats = result.rows[0];
    console.log('Raw stats from database:', stats);

    return NextResponse.json({
      totalTrades: Number(stats.total_trades) || 0,
      winningTrades: Number(stats.winning_trades) || 0,
      losingTrades: Number(stats.losing_trades) || 0,
      winRate: Number(stats.win_rate) || 0,
      totalPnL: Number(stats.total_pnl) || 0,
      biggestWin: Number(stats.biggest_win) || 0,
      biggestLoss: Number(stats.biggest_loss) || 0,
      averageWin: Number(stats.average_win) || 0,
      averageLoss: Number(stats.average_loss) || 0,
      profitFactor: Number(stats.profit_factor) || 0,
      averageHoldingTime: 0,
      totalInterest: Number(stats.total_interest) || 0,
      totalDividends: Number(stats.total_dividends) || 0,
      totalDeposits: Number(stats.total_deposits) || 0,
      totalWithdrawals: Number(stats.total_withdrawals) || 0
    });
  } catch (error) {
    console.error('Error fetching trade stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade stats' },
      { status: 500 }
    );
  }
}