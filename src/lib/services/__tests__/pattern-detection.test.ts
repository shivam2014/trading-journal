import { PatternDetectionService } from '../pattern-detection';
import type { Candle } from '@/types/trade';

describe('PatternDetectionService', () => {
  const service = new PatternDetectionService();

  describe('Cup and Handle Detection', () => {
    it('should detect valid cup and handle pattern', () => {
      // Create a cup and handle formation
      const candles: Candle[] = [];
      let price = 100;
      
      // Left cup rim
      for (let i = 0; i < 10; i++) {
        candles.push({
          timestamp: i,
          open: price,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000
        });
        price -= 1;
      }

      // Cup bottom and right rim
      for (let i = 10; i < 20; i++) {
        candles.push({
          timestamp: i,
          open: price,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000
        });
        price += 1;
      }

      // Handle
      for (let i = 20; i < 30; i++) {
        candles.push({
          timestamp: i,
          open: price,
          high: price + 1,
          low: price - 1,
          close: price - 0.5,
          volume: 800
        });
        price -= 0.2;
      }

      const result = service.detectCupAndHandle(candles);
      expect(result).toBeTruthy();
      expect(result?.type).toBe('CUP_AND_HANDLE');
      expect(result?.direction).toBe('BULLISH');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('should return null for insufficient data', () => {
      const result = service.detectCupAndHandle([]);
      expect(result).toBeNull();
    });
  });

  describe('Flag Pattern Detection', () => {
    it('should detect valid bull flag pattern', () => {
      const candles: Candle[] = [];
      let price = 100;
      
      // Upward pole
      for (let i = 0; i < 5; i++) {
        price += 2;
        candles.push({
          timestamp: i,
          open: price - 1,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 2000
        });
      }

      // Consolidation flag
      for (let i = 5; i < 10; i++) {
        candles.push({
          timestamp: i,
          open: price,
          high: price + 0.5,
          low: price - 0.5,
          close: price - 0.1,
          volume: 1000
        });
        price -= 0.1;
      }

      const result = service.detectBullFlag(candles);
      expect(result).toBeTruthy();
      expect(result?.type).toBe('BULL_FLAG');
      expect(result?.direction).toBe('BULLISH');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect valid bear flag pattern', () => {
      const candles: Candle[] = [];
      let price = 100;
      
      // Downward pole
      for (let i = 0; i < 5; i++) {
        price -= 2;
        candles.push({
          timestamp: i,
          open: price + 1,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 2000
        });
      }

      // Consolidation flag
      for (let i = 5; i < 10; i++) {
        candles.push({
          timestamp: i,
          open: price,
          high: price + 0.5,
          low: price - 0.5,
          close: price + 0.1,
          volume: 1000
        });
        price += 0.1;
      }

      const result = service.detectBearFlag(candles);
      expect(result).toBeTruthy();
      expect(result?.type).toBe('BEAR_FLAG');
      expect(result?.direction).toBe('BEARISH');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Triple Top Detection', () => {
    it('should detect valid triple top pattern', () => {
      const candles: Candle[] = [];
      let price = 100;
      
      // Create three peaks
      for (let i = 0; i < 30; i++) {
        const isPeak = i === 5 || i === 15 || i === 25;
        if (isPeak) {
          price = 110;
        } else {
          price = 100 + Math.random() * 2;
        }
        
        candles.push({
          timestamp: i,
          open: price - 0.5,
          high: price + 0.5,
          low: price - 0.5,
          close: price,
          volume: 1000
        });
      }

      const result = service.detectTripleTop(candles);
      expect(result).toBeTruthy();
      expect(result?.type).toBe('TRIPLE_TOP');
      expect(result?.direction).toBe('BEARISH');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('should handle invalid data gracefully', () => {
      const result = service.detectTripleTop([]);
      expect(result).toBeNull();
    });
  });
});