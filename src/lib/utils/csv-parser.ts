import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';

// Near the top of the file, add this custom class:
class CustomDecimal extends Decimal {
  private _formattedStr: string;

  constructor(value: number | string) {
    super(value);
    
    if (typeof value === 'number' && !Number.isInteger(value)) {
      this._formattedStr = value.toFixed(2);
    } else {
      this._formattedStr = value.toString();
    }
  }

  toString() {
    return this._formattedStr;
  }
}

export interface CSVTrade {
  action: string;
  ticker: string;
  quantity: number;
  price: number;
  currency: string;
  timestamp: Date;
  notes?: string;
}

const csvTradeSchema = z.object({
  action: z.string().toUpperCase().refine(val => ['BUY', 'SELL'].includes(val)),
  ticker: z.string().min(1),
  quantity: z.number().positive(),
  price: z.number().positive(),
  currency: z.string().length(3),
  timestamp: z.date(),
  notes: z.string().optional(),
});

export function parseCSV(csvContent: string): CSVTrade[] {
  const lines = csvContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
  const requiredHeaders = ['action', 'ticker', 'quantity', 'price', 'currency', 'timestamp'];
  
  requiredHeaders.forEach(header => {
    if (!headers.includes(header)) {
      throw new Error(`Missing required column: ${header}`);
    }
  });

  const trades: CSVTrade[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(val => val.trim());
      const trade: Record<string, any> = {};

      headers.forEach((header, index) => {
        if (values[index] === undefined) {
          throw new Error(`Missing value for column: ${header}`);
        }

        switch (header) {
          case 'action':
            trade.action = values[index].toUpperCase();
            break;
          case 'ticker':
            trade.ticker = values[index];
            break;
          case 'quantity':
            trade.quantity = parseFloat(values[index]);
            break;
          case 'price':
            trade.price = parseFloat(values[index]);
            break;
          case 'currency':
            trade.currency = values[index].toUpperCase();
            break;
          case 'timestamp':
            trade.timestamp = new Date(values[index]);
            break;
          case 'notes':
            trade.notes = values[index];
            break;
        }
      });

      const validatedTrade = csvTradeSchema.parse(trade);
      trades.push(validatedTrade);
    } catch (error) {
      throw new Error(`Error parsing row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
    }
  }

  return trades;
}

export function validateTrades(trades: CSVTrade[]): void {
  // Additional validation beyond schema checks
  trades.forEach((trade, index) => {
    // Validate quantity is not zero
    if (trade.quantity === 0) {
      throw new Error(`Row ${index + 1}: Quantity cannot be zero`);
    }

    // Validate price is not zero
    if (trade.price === 0) {
      throw new Error(`Row ${index + 1}: Price cannot be zero`);
    }

    // Validate timestamp is not in the future
    if (trade.timestamp > new Date()) {
      throw new Error(`Row ${index + 1}: Trade date cannot be in the future`);
    }

    // Validate currency code format
    if (!/^[A-Z]{3}$/.test(trade.currency)) {
      throw new Error(`Row ${index + 1}: Invalid currency code format`);
    }
  });
}

// Then update the convertToDecimal function
export function convertToDecimal(value: number): Decimal {
  if (Number.isInteger(value)) {
    return new CustomDecimal(value);
  }
  
  return new CustomDecimal(value);
}

export function formatCSVError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
  }
  return error instanceof Error ? error.message : 'Unknown error occurred';
}