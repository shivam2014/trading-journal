import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { validateAndProcessTrades } from '@/lib/validation/trading212';
import { createTrading212Parser } from '@/lib/utils/csv-parser';

export const maxDuration = 300; // 5 minutes timeout for large files

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    
    // Collect all files from form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // Validate file type and size
        if (!value.name.toLowerCase().endsWith('.csv')) {
          return NextResponse.json(
            { error: 'Only CSV files are allowed' },
            { status: 400 }
          );
        }
        if (value.size > 5 * 1024 * 1024) { // 5MB limit
          return NextResponse.json(
            { error: 'File size exceeds 5MB limit' },
            { status: 400 }
          );
        }
        files.push(value);
      }
    }
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const results = {
      successCount: 0,
      errorCount: 0,
      errors: [] as { file: string; errors: { row: number; error: string }[] }[],
      filesProcessed: files.length,
    };

    for (const file of files) {
      try {
        // Parse CSV file
        const parser = createTrading212Parser();
        const csvData = await parser.parseFile(file);
        
        // Validate and process trades
        const { validTrades, errors } = validateAndProcessTrades(csvData);

        if (errors.length > 0) {
          results.errors.push({
            file: file.name,
            errors,
          });
          results.errorCount += errors.length;
        }

        if (validTrades.length === 0) {
          continue; // Skip if no valid trades found
        }

        // Start database transaction
        await db.query('BEGIN');

        try {
          // Process in chunks of 500 trades
          const CHUNK_SIZE = 500;
          for (let i = 0; i < validTrades.length; i += CHUNK_SIZE) {
            const chunk = validTrades.slice(i, i + CHUNK_SIZE);
            
            const values = chunk.map((trade, index) => {
              const offset = i + index;
              return `($${offset * 14 + 1}, $${offset * 14 + 2}, $${offset * 14 + 3}, $${offset * 14 + 4}, $${offset * 14 + 5}, $${offset * 14 + 6}, $${offset * 14 + 7}, $${offset * 14 + 8}, $${offset * 14 + 9}, $${offset * 14 + 10}, $${offset * 14 + 11}, $${offset * 14 + 12}, $${offset * 14 + 13}, $${offset * 14 + 14})`;
            }).join(',');

            const params = chunk.flatMap(trade => [
              trade.ticker,
              trade.action,
              trade.shares,
              trade.price,
              trade.timestamp,
              trade.result,
              trade.fees,
              trade.notes,
              trade.currency,
              trade.exchangeRate,
              trade.brokerTradeId,
              trade.strategy,
              trade.session,
              trade.isDemo,
            ]);

            const result = await db.query(`
              WITH inserted AS (
                INSERT INTO trades (
                  ticker, action, shares, price, timestamp,
                  result, fees, notes, currency, exchange_rate,
                  broker_trade_id, strategy, session, is_demo
                )
                VALUES ${values}
                ON CONFLICT ON CONSTRAINT trades_unique_identifier DO NOTHING
                RETURNING *
              )
              SELECT COUNT(*) as inserted_count FROM inserted
            `, params);

            const insertedCount = parseInt(result.rows[0].inserted_count);
            results.successCount += insertedCount;
          }

          await db.query('COMMIT');
        } catch (error) {
          await db.query('ROLLBACK');
          throw error;
        }
      } catch (error) {
        results.errors.push({
          file: file.name,
          errors: [{
            row: 0,
            error: error instanceof Error ? error.message : 'Unknown error processing file',
          }],
        });
        results.errorCount++;
      }
    }

    // Prepare response message
    const message = results.successCount > 0
      ? `Successfully imported ${results.successCount.toLocaleString()} trades`
      : 'No new trades were imported';

    const response = {
      message,
      successCount: results.successCount,
      errorCount: results.errorCount,
      filesProcessed: results.filesProcessed,
      errors: results.errors,
    };

    if (results.errorCount > 0) {
      return NextResponse.json(response, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error importing trades:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import trades',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}