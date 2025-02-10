import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { parse as parseCSV, Parser } from 'csv-parse';
import { Readable } from 'stream';

interface T212Trade {
  Action: string;
  Time: string;
  Ticker: string;
  'No. of shares': string;
  'Price / share': string;
  Result: string;
  Currency: string;
}

type TradeValues = [
  string,      // ticker
  string,      // action
  number,      // shares
  number,      // price
  Date,        // timestamp
  number|null, // result
  number,      // fees
  string,      // notes
  null,        // group_id
  string,      // currency
  null,        // target_currency
  null,        // exchange_rate
  string,      // strategy (default: 'default')
  string,      // session (default: 'default')
  boolean      // is_demo
];

async function processCSVFile(file: File): Promise<{
  values: TradeValues[],
  totalTrades: number
}> {
  const text = await file.text();
  
  const trades: T212Trade[] = await new Promise((resolve, reject) => {
    const results: T212Trade[] = [];
    
    const parser: Parser = parseCSV({
      columns: true,
      skip_empty_lines: true
    });

    parser.on('readable', function() {
      let record: T212Trade;
      while ((record = parser.read() as T212Trade)) {
        results.push(record);
      }
    });

    parser.on('error', function(err: Error) {
      console.error(`CSV parsing error for ${file.name}:`, err);
      reject(err);
    });

    parser.on('end', function() {
      resolve(results);
    });

    const readable = new Readable();
    readable.push(text);
    readable.push(null);
    readable.pipe(parser);
  });

  const validTrades = trades.filter(trade => {
    const isValid = trade.Action === 'Market buy' ||
                   trade.Action === 'Market sell' ||
                   trade.Action === 'Limit buy' ||
                   trade.Action === 'Limit sell';
    return isValid;
  });

  const values: TradeValues[] = validTrades.map(trade => {
    try {
      const timestamp = new Date(trade.Time);
      if (isNaN(timestamp.getTime())) {
        throw new Error('Invalid timestamp');
      }

      const shares = parseFloat(trade['No. of shares']);
      if (isNaN(shares)) {
        throw new Error('Invalid shares number');
      }

      const price = parseFloat(trade['Price / share']);
      if (isNaN(price)) {
        throw new Error('Invalid price');
      }

      let result: number|null = null;
      if (trade.Result) {
        result = parseFloat(trade.Result);
        if (isNaN(result)) {
          throw new Error('Invalid result');
        }
      }

      return [
        trade.Ticker,
        trade.Action.toLowerCase().includes('buy') ? 'BUY' : 'SELL',
        shares,
        price,
        timestamp,
        result,
        0, // fees - not provided in T212 CSV
        '', // notes
        null, // group_id
        trade.Currency || 'USD', // default to USD if not provided
        null, // target_currency
        null, // exchange_rate
        'default', // strategy
        'default', // session
        false // is_demo (false for imported trades)
      ];
    } catch (error) {
      console.error(`Error processing trade:`, trade);
      throw error;
    }
  });

  return {
    values,
    totalTrades: validTrades.length
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    let allValues: TradeValues[] = [];
    let totalTradesProcessed = 0;

    for (const file of files) {
      const { values, totalTrades } = await processCSVFile(file);
      allValues = [...allValues, ...values];
      totalTradesProcessed += totalTrades;
    }

    if (allValues.length === 0) {
      return NextResponse.json(
        { error: 'No valid trades found in CSV files' },
        { status: 400 }
      );
    }

    const placeholders = allValues.map((_, i) =>
      `($${i * 15 + 1}, $${i * 15 + 2}, $${i * 15 + 3}, $${i * 15 + 4}, $${i * 15 + 5}, $${i * 15 + 6}, $${i * 15 + 7}, $${i * 15 + 8}, $${i * 15 + 9}, $${i * 15 + 10}, $${i * 15 + 11}, $${i * 15 + 12}, $${i * 15 + 13}, $${i * 15 + 14}, $${i * 15 + 15})`
    ).join(',');

    const insertValues = allValues.map(trade => [
      trade[0],  // ticker
      trade[1],  // action
      trade[2],  // shares
      trade[3],  // price
      trade[4],  // timestamp
      trade[5],  // result
      trade[6],  // fees
      trade[7],  // notes
      trade[8],  // group_id
      trade[9],  // currency
      trade[10], // target_currency
      trade[11], // exchange_rate
      trade[12], // strategy
      trade[13], // session
      trade[14]  // is_demo
    ]).flat();

    try {
      await db.query('BEGIN');

      // First check if we only have demo trades
      const tradingCheck = await db.query(`
        SELECT
          COUNT(*) as total_trades,
          COUNT(*) FILTER (WHERE is_demo = true) as demo_trades
        FROM trades
      `);

      const { total_trades, demo_trades } = tradingCheck.rows[0];
      const onlyDemoTradesPresent = parseInt(total_trades) > 0 && parseInt(total_trades) === parseInt(demo_trades);

      // If only demo trades are present, clear them before importing
      if (onlyDemoTradesPresent) {
        await db.query('DELETE FROM trades WHERE is_demo = true');
      }

      // Split the insertion into chunks if dealing with many trades
      const CHUNK_SIZE = 500;
      let insertedCount = 0;
      const totalCount = allValues.length;

      // Process in chunks
      for (let i = 0; i < allValues.length; i += CHUNK_SIZE) {
        const chunk = allValues.slice(i, i + CHUNK_SIZE);
        const chunkPlaceholders = chunk.map((_, idx) =>
          `($${idx * 15 + 1}, $${idx * 15 + 2}, $${idx * 15 + 3}, $${idx * 15 + 4}, $${idx * 15 + 5}, $${idx * 15 + 6}, $${idx * 15 + 7}, $${idx * 15 + 8}, $${idx * 15 + 9}, $${idx * 15 + 10}, $${idx * 15 + 11}, $${idx * 15 + 12}, $${idx * 15 + 13}, $${idx * 15 + 14}, $${idx * 15 + 15})`
        ).join(',');

        const chunkValues = chunk.map(trade => [
          trade[0], trade[1], trade[2], trade[3], trade[4],
          trade[5], trade[6], trade[7], trade[8], trade[9],
          trade[10], trade[11], trade[12], trade[13], trade[14]
        ]).flat();

        const result = await db.query(`
          WITH inserted AS (
            INSERT INTO trades (
              ticker, action, shares, price, timestamp,
              result, fees, notes, group_id, currency,
              target_currency, exchange_rate, strategy, session, is_demo
            )
            SELECT
              v.column1::text, v.column2::text, v.column3::numeric,
              v.column4::numeric, v.column5::timestamp, v.column6::numeric,
              v.column7::numeric, v.column8::text, v.column9::uuid,
              v.column10::text, v.column11::text, v.column12::numeric,
              v.column13::text, v.column14::text, v.column15::boolean
            FROM (VALUES ${chunkPlaceholders}) as v(
              column1, column2, column3, column4, column5,
              column6, column7, column8, column9, column10,
              column11, column12, column13, column14, column15
            )
            ON CONFLICT ON CONSTRAINT trades_unique_identifier DO NOTHING
            RETURNING *
          )
          SELECT COUNT(*) as chunk_inserted_count FROM inserted
        `, chunkValues);

        // Handle nested array structure
        const innerRow = result.rows?.[0]?.[0];
        if (!innerRow || typeof innerRow.chunk_inserted_count === 'undefined') {
          console.error('Unexpected result structure:', JSON.stringify(result.rows, null, 2));
          throw new Error('Invalid database response structure');
        }

        const chunkCount = parseInt(innerRow.chunk_inserted_count, 10);
        if (isNaN(chunkCount)) {
          throw new Error('Invalid chunk count value');
        }

        insertedCount += chunkCount;
      }

      // Calculate skipped count and ensure it's not negative
      const skippedCount = Math.max(0, totalCount - insertedCount);

      // Format the message with proper number formatting
      const message = `${insertedCount.toLocaleString()} trades imported (${skippedCount.toLocaleString()} duplicates found)`;

      console.log('Import summary:', {
        insertedCount,
        totalCount,
        skippedCount,
        message
      });

      await db.query('COMMIT');
      
      return NextResponse.json({
        message,
        insertedCount,
        skippedDuplicates: skippedCount,
        filesProcessed: files.length,
        totalProcessed: totalCount
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error importing trades:', error);
    return NextResponse.json(
      { error: 'Failed to import trades' },
      { status: 500 }
    );
  }
}