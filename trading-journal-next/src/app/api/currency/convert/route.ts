import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrencyService } from '@/lib/services/currency';

// Input validation schema
const convertRequestSchema = z.object({
  amount: z.number().positive(),
  from: z.string().length(3).toUpperCase(),
  to: z.string().length(3).toUpperCase(),
});

// Batch conversion schema
const batchConvertRequestSchema = z.object({
  conversions: z.array(convertRequestSchema).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const currencyService = getCurrencyService();

    // Check if it's a batch request
    if (Array.isArray(data)) {
      const { conversions } = batchConvertRequestSchema.parse({ conversions: data });
      const results = await currencyService.convertMultiple(conversions);
      
      return NextResponse.json({
        results: results.map((amount, index) => ({
          ...conversions[index],
          result: amount,
        })),
      });
    }

    // Single conversion request
    const { amount, from, to } = convertRequestSchema.parse(data);
    
    const result = await currencyService.convert(amount, from, to);
    
    return NextResponse.json({
      amount,
      from,
      to,
      result,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Currency conversion error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Currency conversion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const currencyService = getCurrencyService();
    await currencyService.updateRates();

    return NextResponse.json({
      availableCurrencies: currencyService.getAvailableCurrencies(),
      cacheAge: currencyService.getCacheAge(),
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error fetching available currencies:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch available currencies',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}