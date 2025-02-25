import { z } from 'zod';

// Price data schema
const candleSchema = z.object({
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

export type Candle = z.infer<typeof candleSchema>;

// Pattern result schema
export interface PatternResult {
  pattern: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  startIndex: number;
  endIndex: number;
  confidence: number;
  description?: string;
}

// Indicator result schema
export interface IndicatorValue {
  timestamp: number;
  value: number | number[];
  metadata?: Record<string, number>;
}

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export class TechnicalAnalysisService {
  private talib: any; // Will be initialized when needed

  private async initTALib() {
    if (!this.talib) {
      try {
        const ta = await import('talib.js');
        this.talib = ta.default;
      } catch (error) {
        console.error('Failed to initialize TA-Lib:', error);
        throw new Error('Technical Analysis library initialization failed');
      }
    }
  }

  private validateCandles(candles: Candle[]): void {
    if (!Array.isArray(candles) || candles.length === 0) {
      throw new Error('Invalid candle data');
    }

    candles.forEach((candle, index) => {
      try {
        candleSchema.parse(candle);
      } catch (error) {
        throw new Error(`Invalid candle data at index ${index}`);
      }
    });
  }

  async detectPatterns(candles: Candle[]): Promise<PatternResult[]> {
    await this.initTALib();
    this.validateCandles(candles);

    const patterns: PatternResult[] = [];
    const opens = candles.map(c => c.open);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);

    // Common candlestick patterns
    const patternFuncs = [
      { name: 'CDL_ENGULFING', description: 'Engulfing Pattern' },
      { name: 'CDL_DOJI', description: 'Doji' },
      { name: 'CDL_HAMMER', description: 'Hammer' },
      { name: 'CDL_SHOOTING_STAR', description: 'Shooting Star' },
      { name: 'CDL_MORNING_STAR', description: 'Morning Star' },
      { name: 'CDL_EVENING_STAR', description: 'Evening Star' },
    ];

    for (const pattern of patternFuncs) {
      try {
        const result = await this.talib.execute({
          name: pattern.name,
          startIdx: 0,
          endIdx: candles.length - 1,
          open: opens,
          high: highs,
          low: lows,
          close: closes,
        });

        if (result.result.outInteger) {
          result.result.outInteger.forEach((value: number, i: number) => {
            if (value !== 0) {
              patterns.push({
                pattern: pattern.name,
                direction: value > 0 ? 'bullish' : 'bearish',
                startIndex: Math.max(0, i - 2),
                endIndex: i,
                confidence: Math.abs(value) / 100,
                description: pattern.description,
              });
            }
          });
        }
      } catch (error) {
        console.error(`Error detecting ${pattern.name}:`, error);
      }
    }

    return patterns;
  }

  async calculateIndicators(candles: Candle[], options: {
    sma?: number[],
    ema?: number[],
    rsi?: number,
    macd?: { fast: number, slow: number, signal: number },
    bbands?: { period: number, stdDev: number },
  } = {}): Promise<Record<string, IndicatorValue[]>> {
    await this.initTALib();
    this.validateCandles(candles);

    const closes = candles.map(c => c.close);
    const timestamps = candles.map(c => c.timestamp);
    const results: Record<string, IndicatorValue[]> = {};

    // Calculate SMAs
    if (options.sma) {
      for (const period of options.sma) {
        try {
          const sma = await this.talib.execute({
            name: 'SMA',
            startIdx: 0,
            endIdx: closes.length - 1,
            inReal: closes,
            optInTimePeriod: period,
          });

          results[`SMA${period}`] = sma.result.outReal.map((value: number, i: number) => ({
            timestamp: timestamps[i + period - 1],
            value,
          }));
        } catch (error) {
          console.error(`Error calculating SMA${period}:`, error);
        }
      }
    }

    // Calculate EMAs
    if (options.ema) {
      for (const period of options.ema) {
        try {
          const ema = await this.talib.execute({
            name: 'EMA',
            startIdx: 0,
            endIdx: closes.length - 1,
            inReal: closes,
            optInTimePeriod: period,
          });

          results[`EMA${period}`] = ema.result.outReal.map((value: number, i: number) => ({
            timestamp: timestamps[i + period - 1],
            value,
          }));
        } catch (error) {
          console.error(`Error calculating EMA${period}:`, error);
        }
      }
    }

    // Calculate RSI
    if (options.rsi) {
      try {
        const rsi = await this.talib.execute({
          name: 'RSI',
          startIdx: 0,
          endIdx: closes.length - 1,
          inReal: closes,
          optInTimePeriod: options.rsi,
        });

        results.RSI = rsi.result.outReal.map((value: number, i: number) => ({
          timestamp: timestamps[i + options.rsi! - 1],
          value,
        }));
      } catch (error) {
        console.error('Error calculating RSI:', error);
      }
    }

    // Calculate MACD
    if (options.macd) {
      try {
        const macd = await this.talib.execute({
          name: 'MACD',
          startIdx: 0,
          endIdx: closes.length - 1,
          inReal: closes,
          optInFastPeriod: options.macd.fast,
          optInSlowPeriod: options.macd.slow,
          optInSignalPeriod: options.macd.signal,
        });

        results.MACD = macd.result.outMACD.map((value: number, i: number) => ({
          timestamp: timestamps[i + options.macd!.slow - 1],
          value: [value, macd.result.outMACDSignal[i], macd.result.outMACDHist[i]],
          metadata: {
            signal: macd.result.outMACDSignal[i],
            histogram: macd.result.outMACDHist[i],
          },
        }));
      } catch (error) {
        console.error('Error calculating MACD:', error);
      }
    }

    // Calculate Bollinger Bands
    if (options.bbands) {
      try {
        const bbands = await this.talib.execute({
          name: 'BBANDS',
          startIdx: 0,
          endIdx: closes.length - 1,
          inReal: closes,
          optInTimePeriod: options.bbands.period,
          optInNbDevUp: options.bbands.stdDev,
          optInNbDevDn: options.bbands.stdDev,
          optInMAType: 0, // Simple Moving Average
        });

        results.BBANDS = bbands.result.outRealUpperBand.map((upper: number, i: number) => ({
          timestamp: timestamps[i + options.bbands!.period - 1],
          value: [upper, bbands.result.outRealMiddleBand[i], bbands.result.outRealLowerBand[i]],
          metadata: {
            upper,
            middle: bbands.result.outRealMiddleBand[i],
            lower: bbands.result.outRealLowerBand[i],
          },
        }));
      } catch (error) {
        console.error('Error calculating Bollinger Bands:', error);
      }
    }

    return results;
  }
}

// Singleton instance
let technicalAnalysisServiceInstance: TechnicalAnalysisService | null = null;

export function getTechnicalAnalysisService(): TechnicalAnalysisService {
  if (!technicalAnalysisServiceInstance) {
    technicalAnalysisServiceInstance = new TechnicalAnalysisService();
  }
  return technicalAnalysisServiceInstance;
}