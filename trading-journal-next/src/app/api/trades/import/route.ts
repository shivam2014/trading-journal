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
  null         // group_id
];

async function processCSVFile(file: File): Promise<{
  values: TradeValues[],
  totalTrades: number
}> {
  console.log(`Starting to process file: ${file.name}`);
  const text = await file.text();
  console.log(`File content length: ${text.length} characters`);
  
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
      console.log(`CSV parsing complete for ${file.name}. Found ${results.length} total records`);
      resolve(results);
    });

    const readable = new Readable();
    readable.push(text);
    readable.push(null);
    readable.pipe(parser);
  });

  console.log(`Raw trades parsed from ${file.name}: ${trades.length}`);

  const validTrades = trades.filter(trade => {
    const isValid = trade.Action === 'Market buy' ||
                   trade.Action === 'Market sell' ||
                   trade.Action === 'Limit buy' ||
                   trade.Action === 'Limit sell';
    
    if (!isValid) {
      console.log(`Skipping invalid trade action: ${trade.Action}`);
    }
    return isValid;
  });

  console.log(`File ${file.name}: ${validTrades.length} valid trades out of ${trades.length} total`);

  const values: TradeValues[] = validTrades.map(trade => {
    try {
      // Parse the timestamp carefully to preserve exact time
      const timestamp = new Date(trade.Time);
      if (isNaN(timestamp.getTime())) {
        console.error(`Invalid timestamp for trade: ${trade.Time}`);
        throw new Error('Invalid timestamp');
      }

      const shares = parseFloat(trade['No. of shares']);
      if (isNaN(shares)) {
        console.error(`Invalid shares number: ${trade['No. of shares']}`);
        throw new Error('Invalid shares number');
      }

      const price = parseFloat(trade['Price / share']);
      if (isNaN(price)) {
        console.error(`Invalid price: ${trade['Price / share']}`);
        throw new Error('Invalid price');
      }

      let result: number|null = null;
      if (trade.Result) {
        result = parseFloat(trade.Result);
        if (isNaN(result)) {
          console.error(`Invalid result: ${trade.Result}`);
          throw new Error('Invalid result');
        }
      }

      console.log(`Processing valid trade: ${trade.Ticker} at ${timestamp.toISOString()} - ${shares} shares at ${price}`);
      
      return [
        trade.Ticker,
        trade.Action.toLowerCase().includes('buy') ? 'BUY' : 'SELL',
        shares,
        price,
        timestamp,
        result,
        0, // fees - not provided in T212 CSV
        '', // notes - could be added later
        null // group_id - could be used for grouping related trades
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
    
    // Collect all files from formData
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

    console.log('Starting import process...');
    
    let allValues: TradeValues[] = [];
    let totalTradesProcessed = 0;

    // Process each file
    for (const file of files) {
      console.log(`Processing file: ${file.name}`);
      const { values, totalTrades } = await processCSVFile(file);
      console.log(`File ${file.name} processed: ${values.length} trades extracted`);
      allValues = [...allValues, ...values];
      totalTradesProcessed += totalTrades;
    }

    console.log(`Total trades extracted: ${allValues.length}`);
    console.log(`Total trades processed: ${totalTradesProcessed}`);

    if (allValues.length === 0) {
      return NextResponse.json(
        { error: 'No valid trades found in CSV files' },
        { status: 400 }
      );
    }

    console.log(`Processing ${allValues.length} trades from ${files.length} files for import`);

    // Prepare all trades for insertion with ON CONFLICT handling
    const placeholders = allValues.map((_, i) =>
      `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
    ).join(',');

    const insertValues = allValues.map(trade => [
      trade[0], // ticker
      trade[1], // action
      trade[2], // shares
      trade[3], // price
      trade[4], // timestamp
      trade[5], // result
      trade[6], // fees
      trade[7], // notes
    ]).flat();

    try {
      // Start transaction
      await db.query('BEGIN');

      // Insert trades with conflict handling and count both inserted and duplicates
      const result = await db.query(`
        WITH input_values AS (
          SELECT * FROM (VALUES ${placeholders}) as v
        ),
        inserted AS (
          INSERT INTO trades (
            ticker,
            action,
            shares,
            price,
            timestamp,
            result,
            fees,
            notes,
            group_id
          )
          SELECT
            v.column1::text,
            v.column2::text,
            v.column3::numeric,
            v.column4::numeric,
            v.column5::timestamp,
            v.column6::numeric,
            v.column7::numeric,
            v.column8::text,
            NULL::uuid
          FROM input_values v
          ON CONFLICT ON CONSTRAINT trades_unique_identifier DO NOTHING
          RETURNING *
        )
        SELECT
          (SELECT COUNT(*)::int FROM inserted) AS "insertedCount",
          (SELECT COUNT(*)::int FROM input_values) AS "totalCount"
      `, [...insertValues]);

      // Debug database response
      console.log('Full database result:', result);
      
      // Handle the nested array structure from the database
      if (!result.rows || !result.rows[0] || !result.rows[0][0]) {
        throw new Error('Invalid database response structure');
      }

      const data = result.rows[0][0];
      console.log('Extracted data:', data);

      // Extract and validate counts using correct camelCase property names
      const insertedCount = Number(data.insertedCount);
      const totalCount = Number(data.totalCount);

      if (isNaN(insertedCount) || isNaN(totalCount)) {
        throw new Error(
          `Invalid count values: inserted=${data.insertedCount}, total=${data.totalCount}`
        );
      }

      const skippedCount = totalCount - insertedCount;
      const filesWord = files.length === 1 ? 'file' : 'files';

      // Debug parsed values
      console.log('Parsed values:', {
        insertedCount,
        totalCount,
        skippedCount
      });

      // Commit transaction
      await db.query('COMMIT');

      console.log(`Import details:
        Total trades processed: ${totalCount}
        Successfully inserted: ${insertedCount}
        Already existed: ${skippedCount}
        Success rate: ${((insertedCount / totalCount) * 100).toFixed(1)}%
      `);

      // Build response with validated numbers
      const responseData = {
        message: `Successfully imported ${insertedCount} new trades from ${files.length} ${filesWord}`,
        insertedCount: insertedCount,
        skippedDuplicates: skippedCount,
        filesProcessed: files.length,
        totalProcessed: totalCount
      };

      console.log('Response data:', JSON.stringify(responseData, null, 2));

      return NextResponse.json(responseData);

    } catch (error) {
      // Rollback on error
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