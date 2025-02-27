import { NextResponse } from 'next/server';
import { z } from 'zod';
import { YahooFinanceService } from '@/lib/services/yahoo-finance';

const querySchema = z.object({
  symbol: z.string(),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d', '1w']).default('1d'),
  limit: z.coerce.number().min(1).max(1000).default(100),
});

// Map timeframes to Yahoo Finance intervals
const timeframeMap = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '60m',
  '4h': '60m',
  '1d': '1d',
  '1w': '1wk',
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      symbol: searchParams.get('symbol'),
      timeframe: searchParams.get('timeframe'),
      limit: searchParams.get('limit'),
    };

    // Validate query parameters
    const result = querySchema.safeParse({
      symbol: params.symbol,
      timeframe: params.timeframe,
      limit: params.limit,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { symbol, timeframe, limit } = result.data;

    // Calculate the range based on timeframe
    const range = calculateRange(timeframe, limit);
    
    // Initialize Yahoo Finance service
    const service = new YahooFinanceService();
    
    // Fetch historical data
    const data = await service.getHistoricalData(symbol, {
      interval: timeframeMap[timeframe],
      range: range,
    });

    // For 4h timeframe, aggregate the 1h data
    if (timeframe === '4h') {
      const aggregatedData = aggregateCandles(data, 4);
      return NextResponse.json(aggregatedData.slice(-limit));
    }

    return NextResponse.json(data.slice(-limit));
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

function calculateRange(timeframe: string, limit: number): string {
  const now = new Date();
  let days = 0;

  switch (timeframe) {
    case '1m':
    case '5m':
      days = Math.ceil(limit / (78 * 6.5)); // ~78 5-min candles per day (6.5 trading hours)
      return days <= 7 ? '7d' : '1mo';
    case '15m':
      days = Math.ceil(limit / (26 * 6.5)); // ~26 15-min candles per day
      return days <= 60 ? '60d' : '6mo';
    case '1h':
    case '4h':
      days = Math.ceil(limit / 6.5); // ~6.5 hours per trading day
      return days <= 730 ? '2y' : 'max';
    case '1d':
      return limit <= 30 ? '1mo' :
             limit <= 90 ? '3mo' :
             limit <= 180 ? '6mo' :
             limit <= 365 ? '1y' :
             limit <= 730 ? '2y' : 'max';
    case '1w':
      return limit <= 52 ? '1y' :
             limit <= 104 ? '2y' :
             limit <= 260 ? '5y' : 'max';
    default:
      return '1mo';
  }
}

function aggregateCandles(hourlyCandles: any[], hours: number) {
  const aggregated = [];
  
  for (let i = 0; i < hourlyCandles.length; i += hours) {
    const chunk = hourlyCandles.slice(i, i + hours);
    if (chunk.length === 0) continue;

    aggregated.push({
      timestamp: chunk[0].timestamp,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + (c.volume || 0), 0),
    });
  }

  return aggregated;
}