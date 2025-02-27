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

  describe('Singleton Instance', () => {
    it('should return the same instance', () => {
      const instance1 = getTechnicalAnalysisService();
      const instance2 = getTechnicalAnalysisService();
      expect(instance1).toBe(instance2);
    });
  });
});