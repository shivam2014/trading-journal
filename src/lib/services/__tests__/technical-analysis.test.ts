import { TechnicalAnalysisService, getTechnicalAnalysisService } from '../technical-analysis';
import type { Candle } from '@/types/trade';

// Mock TA-Lib
jest.mock('talib.js', () => ({
  __esModule: true,
  default: {
    execute: jest.fn(),
  },
}));

describe('TechnicalAnalysisService', () => {
  const service = getTechnicalAnalysisService();

  const sampleCandles: Candle[] = [
    { timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    { timestamp: 2, open: 102, high: 108, low: 100, close: 106, volume: 1200 },
    { timestamp: 3, open: 106, high: 110, low: 102, close: 104, volume: 900 },
    { timestamp: 4, open: 104, high: 106, low: 98, close: 99, volume: 1100 },
    { timestamp: 5, open: 99, high: 103, low: 97, close: 101, volume: 1300 },
  ];

  describe('Pattern Detection', () => {
    it('should detect candlestick patterns', async () => {
      const patterns = await service.detectPatterns(sampleCandles);

      // Ensure at least one pattern is detected - sample data is designed to form a pattern
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('pattern');
      expect(patterns[0]).toHaveProperty('direction');
      expect(patterns[0]).toHaveProperty('confidence');
    });

    it('should handle invalid candle data', async () => {
      // Return empty array for invalid data instead of throwing
      const invalidCandles = [{ timestamp: 1000 }] as Candle[];
      const result = await service.detectPatterns(invalidCandles);
      expect(result).toEqual([]);
    });

    it('should handle empty candle array', async () => {
      // Return empty array for empty input
      const result = await service.detectPatterns([]);
      expect(result).toEqual([]);
    });
  });

  describe('Technical Indicators', () => {
    it('should calculate SMA correctly', async () => {
      const sma = await service.calculateSMA(sampleCandles.map(c => c.close), 3);
      expect(sma).toBeDefined();
      expect(sma.length).toBe(3); // 5 candles - 2 (period-1) = 3 SMA values
    });

    it('should calculate RSI correctly', async () => {
      const rsi = await service.calculateRSI(sampleCandles.map(c => c.close), 2);
      expect(rsi).toBeDefined();
      expect(rsi.length).toBeGreaterThan(0);
    });

    it('should calculate MACD correctly', async () => {
      const macd = await service.calculateMACD(sampleCandles.map(c => c.close));
      expect(macd).toBeDefined();
      expect(macd.length).toBeGreaterThan(0);
    });

    it('should handle multiple indicators simultaneously', async () => {
      const [sma, rsi] = await Promise.all([
        service.calculateSMA(sampleCandles.map(c => c.close), 3),
        service.calculateRSI(sampleCandles.map(c => c.close), 2)
      ]);
      expect(sma).toBeDefined();
      expect(rsi).toBeDefined();
    });

    it('should handle TA-Lib errors gracefully', async () => {
      const invalidData = [NaN, Infinity, -Infinity];
      const result = await service.calculateSMA(invalidData, 2);
      expect(result).toEqual([]);
    });
  });

  describe('Advanced Indicators', () => {
    it('should calculate WMA correctly', async () => {
      const wma = await service.calculateWMA(sampleCandles.map(c => c.close), 3);
      expect(wma).toBeDefined();
      expect(wma.length).toBeGreaterThan(0);
      expect(wma.every(v => !isNaN(v))).toBe(true);
    });

    it('should calculate HMA correctly', async () => {
      const hma = await service.calculateHMA(sampleCandles.map(c => c.close), 4);
      expect(hma).toBeDefined();
      expect(hma.length).toBeGreaterThan(0);
      expect(hma.every(v => !isNaN(v))).toBe(true);
    });

    it('should calculate ADX correctly', async () => {
      const adx = await service.calculateADX(
        sampleCandles.map(c => c.high),
        sampleCandles.map(c => c.low),
        sampleCandles.map(c => c.close),
        3
      );
      expect(adx).toBeDefined();
      expect(adx.length).toBeGreaterThan(0);
      expect(adx.every(v => v >= 0 && v <= 100)).toBe(true);
    });

    it('should calculate MFI correctly', async () => {
      const mfi = await service.calculateMFI(
        sampleCandles.map(c => c.high),
        sampleCandles.map(c => c.low),
        sampleCandles.map(c => c.close),
        sampleCandles.map(c => c.volume || 0),
        3
      );
      expect(mfi).toBeDefined();
      expect(mfi.length).toBeGreaterThan(0);
      expect(mfi.every(v => v >= 0 && v <= 100)).toBe(true);
    });

    it('should handle invalid inputs gracefully', async () => {
      const invalidData = [NaN, Infinity, -Infinity];
      const wma = await service.calculateWMA(invalidData, 2);
      const hma = await service.calculateHMA(invalidData, 2);
      expect(wma).toEqual([]);
      expect(hma).toEqual([]);
    });
  });

  describe('Pattern Reliability', () => {
    const historicalCandles: Candle[] = [
      { timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: 2, open: 102, high: 108, low: 100, close: 106, volume: 1200 },
      { timestamp: 3, open: 106, high: 110, low: 102, close: 104, volume: 900 },
      { timestamp: 4, open: 104, high: 106, low: 98, close: 99, volume: 1100 },
      { timestamp: 5, open: 99, high: 103, low: 97, close: 101, volume: 1300 }
    ];

    it('should calculate pattern success rate', async () => {
      // Mock successful patterns
      const mockSuccessfulPatterns = [
        { pattern: 'ENGULFING', direction: 'UP', success: true, confidence: 0.8 },
        { pattern: 'ENGULFING', direction: 'UP', success: true, confidence: 0.9 },
        { pattern: 'ENGULFING', direction: 'UP', success: false, confidence: 0.7 }
      ];

      const successRate = await service.calculatePatternReliability('ENGULFING', mockSuccessfulPatterns);
      expect(successRate).toBeCloseTo(0.67); // 2 successful out of 3
    });

    it('should adjust confidence based on historical performance', async () => {
      const patterns = await service.detectPatterns(historicalCandles);
      const pattern = patterns[0];
      
      const adjustedPattern = await service.adjustPatternConfidence(pattern, [
        { pattern: pattern.pattern, success: true, confidence: 0.8 },
        { pattern: pattern.pattern, success: true, confidence: 0.85 },
        { pattern: pattern.pattern, success: false, confidence: 0.75 }
      ]);

      // Confidence should be weighted by historical success rate
      expect(adjustedPattern.confidence).toBeLessThanOrEqual(1.0);
      expect(adjustedPattern.confidence).toBeGreaterThan(0);
    });

    it('should consider market conditions in reliability scoring', async () => {
      const bullishPattern = {
        pattern: 'ENGULFING',
        direction: 'UP',
        confidence: 0.8,
        timestamp: historicalCandles[3].timestamp
      };

      const bearishMarketPattern = await service.adjustForMarketConditions(
        bullishPattern,
        historicalCandles
      );

      // In a bearish market (last candle down), bullish pattern confidence should be reduced
      expect(bearishMarketPattern.confidence).toBeLessThan(bullishPattern.confidence);
    });
  });

  describe('Real-time Analysis', () => {
    it('should handle streaming updates efficiently', async () => {
      const baseCandles = sampleCandles.slice(0, -1);
      await service.detectPatterns(baseCandles);
      
      // Simulate streaming update
      const newCandle = sampleCandles[sampleCandles.length - 1];
      const patterns = await service.analyzeNewCandle(newCandle, baseCandles);
      
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should maintain pattern state between updates', async () => {
      const patterns1 = await service.detectPatterns(sampleCandles.slice(0, 3));
      const patterns2 = await service.detectPatterns(sampleCandles.slice(0, 4));
      
      // Patterns from the first 3 candles should still be present
      patterns1.forEach(p1 => {
        expect(patterns2.some(p2 => 
          p2.pattern === p1.pattern && 
          p2.timestamp === p1.timestamp
        )).toBe(true);
      });
    });
  });

  describe('Singleton Instance', () => {
    it('should return the same instance', () => {
      const instance1 = getTechnicalAnalysisService();
      const instance2 = getTechnicalAnalysisService();
      expect(instance1).toBe(instance2);
    });
  });
});