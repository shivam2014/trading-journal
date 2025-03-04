import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTechnicalAnalysisService } from '@/lib/services/technical-analysis';

// Input validation schemas
const candleSchema = z.object({
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

const analysisRequestSchema = z.object({
  candles: z.array(candleSchema).min(1),
  options: z.object({
    patterns: z.boolean().optional().default(true),
    sma: z.array(z.number()).optional(),
    ema: z.array(z.number()).optional(),
    rsi: z.number().optional(),
    macd: z.object({
      fast: z.number(),
      slow: z.number(),
      signal: z.number(),
    }).optional(),
    bbands: z.object({
      period: z.number(),
      stdDev: z.number(),
    }).optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { candles, options } = analysisRequestSchema.parse(data);

    const technicalAnalysis = getTechnicalAnalysisService();
    const results: any = {};

    // Get patterns if requested
    if (options.patterns) {
      try {
        results.patterns = await technicalAnalysis.detectPatterns(candles);
      } catch (error) {
        console.error('Error detecting patterns:', error);
        results.patterns = [];
      }
    }

    // Calculate requested indicators
    try {
      results.indicators = await technicalAnalysis.calculateIndicators(candles, {
        sma: options.sma,
        ema: options.ema,
        rsi: options.rsi,
        macd: options.macd,
        bbands: options.bbands,
      });
    } catch (error) {
      console.error('Error calculating indicators:', error);
      results.indicators = {};
    }

    // Return analysis results
    return NextResponse.json({
      timestamp: Date.now(),
      analysisRange: {
        start: candles[0].timestamp,
        end: candles[candles.length - 1].timestamp,
      },
      results,
    });

  } catch (error) {
    console.error('Technical analysis error:', error);

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
        error: 'Technical analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Get available indicators and patterns
export async function GET() {
  try {
    return NextResponse.json({
      availableIndicators: {
        sma: {
          description: 'Simple Moving Average',
          parameters: ['period'],
        },
        ema: {
          description: 'Exponential Moving Average',
          parameters: ['period'],
        },
        rsi: {
          description: 'Relative Strength Index',
          parameters: ['period'],
        },
        macd: {
          description: 'Moving Average Convergence Divergence',
          parameters: ['fastPeriod', 'slowPeriod', 'signalPeriod'],
        },
        bbands: {
          description: 'Bollinger Bands',
          parameters: ['period', 'standardDeviation'],
        },
      },
      availablePatterns: [
        {
          name: 'CDL_ENGULFING',
          description: 'Engulfing Pattern',
          bullish: true,
          bearish: true,
        },
        {
          name: 'CDL_DOJI',
          description: 'Doji',
          bullish: true,
          bearish: true,
        },
        {
          name: 'CDL_HAMMER',
          description: 'Hammer',
          bullish: true,
          bearish: false,
        },
        {
          name: 'CDL_SHOOTING_STAR',
          description: 'Shooting Star',
          bullish: false,
          bearish: true,
        },
        {
          name: 'CDL_MORNING_STAR',
          description: 'Morning Star',
          bullish: true,
          bearish: false,
        },
        {
          name: 'CDL_EVENING_STAR',
          description: 'Evening Star',
          bullish: false,
          bearish: true,
        },
      ],
    });
  } catch (error) {
    console.error('Error getting analysis capabilities:', error);
    return NextResponse.json(
      {
        error: 'Failed to get analysis capabilities',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}