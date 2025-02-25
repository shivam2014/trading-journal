'use client';

import { useState } from 'react';
import { useTechnicalAnalysis } from '@/lib/hooks/useTechnicalAnalysis';
import type { Candle } from '@/lib/services/technical-analysis';

interface TechnicalAnalysisProps {
  candles: Candle[];
  className?: string;
}

export default function TechnicalAnalysis({
  candles,
  className = '',
}: TechnicalAnalysisProps) {
  const [selectedIndicators, setSelectedIndicators] = useState({
    sma: [20, 50, 200],
    ema: [9],
    rsi: 14,
    macd: {
      fast: 12,
      slow: 26,
      signal: 9,
    },
    bbands: {
      period: 20,
      stdDev: 2,
    },
  });

  const {
    capabilities,
    analysisResult,
    patterns,
    indicators,
    isLoadingCapabilities,
    isAnalyzing,
    error,
    analyze,
  } = useTechnicalAnalysis(candles, {
    patterns: true,
    ...selectedIndicators,
  });

  const handleIndicatorChange = (type: string, value: any) => {
    setSelectedIndicators(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Indicator Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Technical Indicators
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Moving Averages */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Simple Moving Averages
            </label>
            <select
              multiple
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              value={selectedIndicators.sma.map(String)}
              onChange={e => {
                const values = Array.from(e.target.selectedOptions).map(opt =>
                  parseInt(opt.value, 10)
                );
                handleIndicatorChange('sma', values);
              }}
            >
              <option value="9">SMA 9</option>
              <option value="20">SMA 20</option>
              <option value="50">SMA 50</option>
              <option value="200">SMA 200</option>
            </select>
          </div>

          {/* RSI */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              RSI Period
            </label>
            <input
              type="number"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              value={selectedIndicators.rsi}
              onChange={e =>
                handleIndicatorChange('rsi', parseInt(e.target.value, 10))
              }
              min="1"
              max="100"
            />
          </div>

          {/* MACD */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              MACD
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Fast"
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                value={selectedIndicators.macd.fast}
                onChange={e =>
                  handleIndicatorChange('macd', {
                    ...selectedIndicators.macd,
                    fast: parseInt(e.target.value, 10),
                  })
                }
              />
              <input
                type="number"
                placeholder="Slow"
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                value={selectedIndicators.macd.slow}
                onChange={e =>
                  handleIndicatorChange('macd', {
                    ...selectedIndicators.macd,
                    slow: parseInt(e.target.value, 10),
                  })
                }
              />
              <input
                type="number"
                placeholder="Signal"
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                value={selectedIndicators.macd.signal}
                onChange={e =>
                  handleIndicatorChange('macd', {
                    ...selectedIndicators.macd,
                    signal: parseInt(e.target.value, 10),
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      <div className="space-y-4">
        {isAnalyzing ? (
          <div className="flex items-center justify-center p-8">
            <svg
              className="animate-spin h-8 w-8 text-primary-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Analyzing...
            </span>
          </div>
        ) : error ? (
          <div className="text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/10 rounded-md">
            {error instanceof Error ? error.message : 'Analysis failed'}
          </div>
        ) : (
          <>
            {/* Patterns */}
            {patterns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Detected Patterns
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patterns.map((pattern, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md border ${
                        pattern.direction === 'bullish'
                          ? 'border-green-300 dark:border-green-600'
                          : 'border-red-300 dark:border-red-600'
                      }`}
                    >
                      <div className="font-medium">
                        {pattern.pattern.replace('CDL_', '')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {pattern.direction.toUpperCase()} (
                        {Math.round(pattern.confidence * 100)}% confidence)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indicators Summary */}
            {Object.keys(indicators).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Indicators
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(indicators).map(([name, values]) => {
                    const latestValue = values[values.length - 1];
                    return (
                      <div
                        key={name}
                        className="p-3 rounded-md border border-gray-300 dark:border-gray-600"
                      >
                        <div className="font-medium">{name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Latest: {Array.isArray(latestValue.value)
                            ? latestValue.value.map(v => v.toFixed(2)).join(', ')
                            : latestValue.value.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}