# Technical Analysis Specification

## Overview
This document outlines the technical indicators and chart patterns to be implemented in the Stock Trading Journal App. The implementation will use TA-Lib for calculations and pattern detection.

## Price Action Patterns

### Candlestick Patterns
1. **Reversal Patterns**
   - Hammer
   - Shooting Star
   - Engulfing (Bullish/Bearish)
   - Harami (Bullish/Bearish)
   - Morning/Evening Star
   - Doji patterns

2. **Continuation Patterns**
   - Three White Soldiers
   - Three Black Crows
   - Rising/Falling Windows
   - Spinning Tops

### Chart Patterns
1. **Bullish Patterns**
   - Cup and Handle
   - Inverse Head and Shoulders
   - Ascending Triangle
   - Bull Flag
   - Double Bottom

2. **Bearish Patterns**
   - Head and Shoulders
   - Descending Triangle
   - Bear Flag
   - Double Top
   - Triple Top

3. **Bilateral Patterns**
   - Symmetrical Triangle
   - Rectangle
   - Wedge (Rising/Falling)
   - Channel (Ascending/Descending)

## Technical Indicators

### Trend Indicators
1. **Moving Averages**
   - Simple Moving Average (SMA)
   - Exponential Moving Average (EMA)
   - Weighted Moving Average (WMA)
   - Hull Moving Average (HMA)
   - Common periods: 9, 20, 50, 200

2. **Trend Following**
   - Moving Average Convergence Divergence (MACD)
     * Fast EMA: 12
     * Slow EMA: 26
     * Signal: 9
   - Average Directional Index (ADX)
   - Parabolic SAR
   - Ichimoku Cloud

### Momentum Indicators
1. **Oscillators**
   - Relative Strength Index (RSI)
   - Stochastic Oscillator
   - Commodity Channel Index (CCI)
   - Williams %R
   - Money Flow Index (MFI)

2. **Volume-Based**
   - On-Balance Volume (OBV)
   - Volume Rate of Change
   - Accumulation/Distribution Line
   - Chaikin Money Flow

### Volatility Indicators
1. **Range-Based**
   - Bollinger Bands
     * Standard deviation: 2
     * Period: 20
   - Average True Range (ATR)
   - Keltner Channels
   - Standard Deviation

## Implementation Details

### Pattern Detection
```typescript
interface PatternDetection {
  type: 'bullish' | 'bearish' | 'neutral';
  pattern: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

interface ChartPattern extends PatternDetection {
  points: {
    x: number;
    y: number;
  }[];
}
```

### Indicator Calculation
```typescript
interface IndicatorValue {
  timestamp: number;
  value: number | number[];
  metadata?: {
    upperBand?: number;
    lowerBand?: number;
    signal?: number;
  };
}

interface IndicatorConfig {
  type: string;
  parameters: {
    period?: number;
    stdDev?: number;
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
  };
}
```

## Trade Pattern Analysis

### Entry Patterns
1. **Momentum Entry**
   - RSI crossing 30/70
   - MACD crossover
   - Bollinger Band bounce

2. **Trend Following Entry**
   - Moving Average crossover
   - Break of support/resistance
   - Pattern breakout

3. **Reversal Entry**
   - Double bottom/top completion
   - Head and shoulders breakout
   - Candlestick reversal patterns

### Exit Patterns
1. **Technical Exits**
   - Moving average crossover
   - RSI overbought/oversold
   - Pattern completion

2. **Trailing Stops**
   - ATR-based
   - Swing high/low
   - Moving average based

### Risk Management
1. **Position Sizing**
   - ATR-based sizing
   - Percentage risk
   - Fixed fractional

2. **Stop Loss Placement**
   - Pattern-based stops
   - Indicator-based stops
   - Time-based stops

## Integration with Trading Journal

### Pattern Recording
- Automatically detect and record patterns present during trade entry/exit
- Calculate success rate for each pattern type
- Track pattern reliability across different market conditions

### Performance Analysis
- Correlation between patterns and trade outcomes
- Pattern-based win rate calculation
- Risk-adjusted returns by pattern type

### Reporting
- Pattern occurrence frequency
- Success rate by pattern type
- Risk/reward ratio by pattern
- Market condition correlation

## API Integration

### TA-Lib Functions
```typescript
// Example TA-Lib integration
interface TALibConfig {
  pattern: string;
  function: string;
  parameters: {
    high: number[];
    low: number[];
    close: number[];
    volume?: number[];
    period?: number;
  };
}
```

### Custom Pattern Detection
- Machine learning based pattern recognition
- Statistical pattern validation
- Custom indicator combinations

## Future Enhancements
1. Machine learning pattern recognition
2. Real-time pattern alerts
3. Custom indicator builder
4. Pattern backtesting engine
5. Market regime detection

This document will be updated as new patterns and indicators are added or modified based on user feedback and trading requirements.