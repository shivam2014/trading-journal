import { jest } from '@jest/globals';

const mockUseTechnicalAnalysis = jest.fn().mockReturnValue({
  indicators: {
    sma: {
      '20': [102.00],
    },
    rsi: [65.00],
    macd: {
      macd: [1.4],
      signal: [1.2],
      histogram: [0.2],
    },
  },
  patterns: [
    {
      type: 'ENGULFING',
      direction: 'BULLISH',
      confidence: 80,
    },
  ],
  selectedSMAs: ['20'],
  rsiPeriod: 14,
  macdOptions: {
    fast: 12,
    slow: 26,
    signal: 9,
  },
  isLoading: false,
  error: null,
  updateIndicators: jest.fn(),
  toggleSMA: jest.fn(),
  setRSIPeriod: jest.fn(),
  setMACDOptions: jest.fn(),
});

export default mockUseTechnicalAnalysis;