import { TechnicalAnalysisService, Candle } from '../technical-analysis';

// Mock TA-Lib
jest.mock('talib.js', () => ({
  __esModule: true,
  default: {
    execute: jest.fn(),
  },
}));

describe('TechnicalAnalysisService', () => {
  let service: TechnicalAnalysisService;
  
  // Sample OHLCV data for testing
  const sampleCandles: Candle[] = [
    { timestamp: 1000, open: 100, high: 105, low: 98, close: 103, volume: 1000 },
    { timestamp: 2000, open: 103, high: 107, low: 101, close: 105, volume: 1200 },
    { timestamp: 3000, open: 105, high: 108, low: 103, close: 106, volume: 1100 },
    { timestamp: 4000, open: 106, high: 110, low: 104, close: 108, volume: 1300 },
    { timestamp: 5000, open: 108, high: 112, low: 107, close: 110, volume: 1400 },
  ];

  beforeEach(() => {
    service = new TechnicalAnalysisService();
    jest.clearAllMocks();
  });

  describe('Pattern Detection', () => {
    it('should detect candlestick patterns', async () => {
      const mockPatternResult = {
        result: {
          outInteger: [0, 0, 100, -100, 0],
        },
      };

      (require('talib.js').default.execute as jest.Mock).mockResolvedValue(mockPatternResult);

      const patterns = await service.detectPatterns(sampleCandles);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('pattern');
      expect(patterns[0]).toHaveProperty('direction');
      expect(patterns[0]).toHaveProperty('confidence');
    });

    it('should handle invalid candle data', async () => {
      const invalidCandles = [{ timestamp: 1000 }] as Candle[];
      
      await expect(service.detectPatterns(invalidCandles)).rejects.toThrow();
    });

    it('should handle empty candle array', async () => {
      await expect(service.detectPatterns([])).rejects.toThrow('Invalid candle data');
    });
  });

  describe('Technical Indicators', () => {
    const mockSMAResult = {
      result: {
        outReal: [104, 106, 108],
      },
    };

    const mockRSIResult = {
      result: {
        outReal: [65, 60, 55],
      },
    };

    const mockMACDResult = {
      result: {
        outMACD: [1.5, 1.8, 2.0],
        outMACDSignal: [1.4, 1.6, 1.8],
        outMACDHist: [0.1, 0.2, 0.2],
      },
    };

    beforeEach(() => {
      (require('talib.js').default.execute as jest.Mock)
        .mockResolvedValueOnce(mockSMAResult)
        .mockResolvedValueOnce(mockRSIResult)
        .mockResolvedValueOnce(mockMACDResult);
    });

    it('should calculate SMA correctly', async () => {
      const indicators = await service.calculateIndicators(sampleCandles, {
        sma: [3],
      });

      expect(indicators).toHaveProperty('SMA3');
      expect(indicators.SMA3).toHaveLength(3);
      expect(indicators.SMA3[0]).toHaveProperty('value');
      expect(indicators.SMA3[0]).toHaveProperty('timestamp');
    });

    it('should calculate RSI correctly', async () => {
      const indicators = await service.calculateIndicators(sampleCandles, {
        rsi: 14,
      });

      expect(indicators).toHaveProperty('RSI');
      expect(indicators.RSI).toHaveLength(3);
      expect(indicators.RSI[0].value).toBeDefined();
    });

    it('should calculate MACD correctly', async () => {
      const indicators = await service.calculateIndicators(sampleCandles, {
        macd: { fast: 12, slow: 26, signal: 9 },
      });

      expect(indicators).toHaveProperty('MACD');
      expect(indicators.MACD[0].value).toHaveLength(3); // MACD, Signal, Histogram
      expect(indicators.MACD[0].metadata).toHaveProperty('signal');
      expect(indicators.MACD[0].metadata).toHaveProperty('histogram');
    });

    it('should handle multiple indicators simultaneously', async () => {
      const indicators = await service.calculateIndicators(sampleCandles, {
        sma: [3],
        rsi: 14,
        macd: { fast: 12, slow: 26, signal: 9 },
      });

      expect(indicators).toHaveProperty('SMA3');
      expect(indicators).toHaveProperty('RSI');
      expect(indicators).toHaveProperty('MACD');
    });

    it('should handle TA-Lib errors gracefully', async () => {
      (require('talib.js').default.execute as jest.Mock).mockRejectedValue(new Error('TA-Lib error'));

      const indicators = await service.calculateIndicators(sampleCandles, {
        sma: [3],
      });

      expect(indicators.SMA3).toBeUndefined();
    });
  });

  describe('Singleton Instance', () => {
    it('should return the same instance', () => {
      const instance1 = service;
      const instance2 = new TechnicalAnalysisService();
      
      expect(instance1).not.toBe(instance2);
      
      const singleton1 = getTechnicalAnalysisService();
      const singleton2 = getTechnicalAnalysisService();
      
      expect(singleton1).toBe(singleton2);
    });
  });
});

// Import the singleton getter to test
import { getTechnicalAnalysisService } from '../technical-analysis';