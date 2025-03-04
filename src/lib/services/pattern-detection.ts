import type { Candle, PatternResult } from '@/types/trade';

export class PatternDetectionService {
  detectCupAndHandle(candles: Candle[]): PatternResult | null {
    if (candles.length < 30) return null; // Need sufficient data

    try {
      const prices = candles.map(c => c.close);
      const leftCupStart = Math.max(...prices.slice(0, 10));
      const cupBottom = Math.min(...prices.slice(10, 20));
      const rightCupEnd = prices[prices.length - 10];
      const handleEnd = prices[prices.length - 1];

      // Cup criteria
      const cupDepth = (leftCupStart - cupBottom) / leftCupStart;
      const cupSymmetry = Math.abs(rightCupEnd - leftCupStart) / leftCupStart;
      const handleRetrace = (rightCupEnd - handleEnd) / rightCupEnd;

      if (
        cupDepth >= 0.15 && cupDepth <= 0.45 && // 15-45% cup depth
        cupSymmetry <= 0.1 && // Cup top within 10%
        handleRetrace >= 0.1 && handleRetrace <= 0.25 // Handle retraces 10-25%
      ) {
        return {
          type: 'CUP_AND_HANDLE',
          direction: 'BULLISH',
          confidence: 0.8 - cupSymmetry, // Higher symmetry = higher confidence
          timestamp: candles[candles.length - 1].timestamp,
          price: handleEnd
        };
      }
    } catch (error) {
      console.error('Error detecting cup and handle pattern:', error);
    }
    return null;
  }

  detectBullFlag(candles: Candle[]): PatternResult | null {
    if (candles.length < 10) return null;

    try {
      const flagPeriod = candles.slice(-5);
      const polePeriod = candles.slice(-10, -5);

      // Check for strong upward pole
      const poleMove = (polePeriod[polePeriod.length - 1].close - polePeriod[0].close) / polePeriod[0].close;
      const poleVolume = polePeriod.reduce((sum, c) => sum + (c.volume || 0), 0) / polePeriod.length;

      // Check for consolidation flag
      const flagHighs = Math.max(...flagPeriod.map(c => c.high));
      const flagLows = Math.min(...flagPeriod.map(c => c.low));
      const flagVolume = flagPeriod.reduce((sum, c) => sum + (c.volume || 0), 0) / flagPeriod.length;
      const flagSlope = (flagPeriod[flagPeriod.length - 1].close - flagPeriod[0].close) / flagPeriod[0].close;

      if (
        poleMove > 0.1 && // At least 10% pole move
        flagVolume < poleVolume && // Decreasing volume in flag
        Math.abs(flagSlope) < 0.05 && // Relatively flat or slight downward slope
        (flagHighs - flagLows) / flagLows < 0.1 // Tight consolidation
      ) {
        return {
          type: 'BULL_FLAG',
          direction: 'BULLISH',
          confidence: 0.7 + (poleMove - 0.1), // Higher move = higher confidence
          timestamp: candles[candles.length - 1].timestamp,
          price: candles[candles.length - 1].close
        };
      }
    } catch (error) {
      console.error('Error detecting bull flag pattern:', error);
    }
    return null;
  }

  detectBearFlag(candles: Candle[]): PatternResult | null {
    if (candles.length < 10) return null;

    try {
      const flagPeriod = candles.slice(-5);
      const polePeriod = candles.slice(-10, -5);

      // Check for strong downward pole
      const poleMove = (polePeriod[0].close - polePeriod[polePeriod.length - 1].close) / polePeriod[0].close;
      const poleVolume = polePeriod.reduce((sum, c) => sum + (c.volume || 0), 0) / polePeriod.length;

      // Check for consolidation flag
      const flagHighs = Math.max(...flagPeriod.map(c => c.high));
      const flagLows = Math.min(...flagPeriod.map(c => c.low));
      const flagVolume = flagPeriod.reduce((sum, c) => sum + (c.volume || 0), 0) / flagPeriod.length;
      const flagSlope = (flagPeriod[flagPeriod.length - 1].close - flagPeriod[0].close) / flagPeriod[0].close;

      if (
        poleMove > 0.1 && // At least 10% pole move
        flagVolume < poleVolume && // Decreasing volume in flag
        Math.abs(flagSlope) < 0.05 && // Relatively flat or slight upward slope
        (flagHighs - flagLows) / flagLows < 0.1 // Tight consolidation
      ) {
        return {
          type: 'BEAR_FLAG',
          direction: 'BEARISH',
          confidence: 0.7 + (poleMove - 0.1), // Higher move = higher confidence
          timestamp: candles[candles.length - 1].timestamp,
          price: candles[candles.length - 1].close
        };
      }
    } catch (error) {
      console.error('Error detecting bear flag pattern:', error);
    }
    return null;
  }

  detectTripleTop(candles: Candle[]): PatternResult | null {
    if (candles.length < 30) return null;

    try {
      const prices = candles.map(c => c.high);
      const maxPrice = Math.max(...prices);
      const peaks = [];

      // Find peaks within 2% of max
      for (let i = 5; i < prices.length - 5; i++) {
        if (
          prices[i] > prices[i - 1] && 
          prices[i] > prices[i + 1] &&
          Math.abs(prices[i] - maxPrice) / maxPrice <= 0.02
        ) {
          peaks.push({ price: prices[i], index: i });
        }
      }

      // Need exactly 3 peaks
      if (peaks.length === 3) {
        const spacing = peaks[2].index - peaks[0].index;
        const symmetry = Math.max(
          Math.abs(peaks[1].price - peaks[0].price),
          Math.abs(peaks[2].price - peaks[1].price),
          Math.abs(peaks[2].price - peaks[0].price)
        ) / maxPrice;

        if (
          spacing >= 10 && // Minimum 10 bars between first and last peak
          symmetry <= 0.02 // Peaks within 2% of each other
        ) {
          return {
            type: 'TRIPLE_TOP',
            direction: 'BEARISH',
            confidence: 0.8 - symmetry * 10, // Higher symmetry = higher confidence
            timestamp: candles[candles.length - 1].timestamp,
            price: candles[candles.length - 1].close
          };
        }
      }
    } catch (error) {
      console.error('Error detecting triple top pattern:', error);
    }
    return null;
  }
}