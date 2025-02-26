'use client';

import React from 'react';
import { useTechnicalAnalysis } from '@/lib/hooks/useTechnicalAnalysis';
import type { Candle } from '@/types/trade';

interface TechnicalAnalysisProps {
  candles: Candle[];
  className?: string;
}

export default function TechnicalAnalysis({ candles, className = '' }: TechnicalAnalysisProps) {
  const {
    capabilities,
    analysisResult,
    patterns,
    selectedSMAs,
    rsiPeriod,
    macdOptions,
    isLoading,
    error,
    toggleSMA,
    setRSIPeriod,
    setMACDOptions,
  } = useTechnicalAnalysis();

  if (isLoading) {
    return (
      <div data-testid="loading-skeleton" className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg">
        {error.message}
      </div>
    );
  }

  return (
    <div data-testid="technical-analysis" className={`space-y-6 ${className}`}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Technical Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Simple Moving Averages
            </label>
            <select
              multiple
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              value={selectedSMAs}
              onChange={(e) => {
                const selectedValue = e.target.value;
                toggleSMA(selectedValue);
              }}
            >
              <option value="9">SMA 9</option>
              <option value="20">SMA 20</option>
              <option value="50">SMA 50</option>
              <option value="200">SMA 200</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              RSI Period
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={rsiPeriod}
              onChange={(e) => setRSIPeriod(parseInt(e.target.value, 10))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              MACD
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Fast"
                value={macdOptions.fast}
                onChange={(e) =>
                  setMACDOptions({ ...macdOptions, fast: Number(e.target.value) })
                }
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <input
                type="number"
                placeholder="Slow"
                value={macdOptions.slow}
                onChange={(e) =>
                  setMACDOptions({ ...macdOptions, slow: Number(e.target.value) })
                }
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <input
                type="number"
                placeholder="Signal"
                value={macdOptions.signal}
                onChange={(e) =>
                  setMACDOptions({ ...macdOptions, signal: Number(e.target.value) })
                }
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
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
                    pattern.direction === 'BULLISH'
                      ? 'border-green-300 dark:border-green-600'
                      : 'border-red-300 dark:border-red-600'
                  }`}
                >
                  <div className="font-medium">{pattern.type}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {pattern.direction} ({pattern.confidence}% confidence)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Indicators
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(analysisResult.sma).map(([period, values]) => (
                <div
                  key={period}
                  className="p-3 rounded-md border border-gray-300 dark:border-gray-600"
                >
                  <div className="font-medium">SMA{period}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Latest: {values[values.length - 1]?.toFixed(2)}
                  </div>
                </div>
              ))}
              {analysisResult.rsi.length > 0 && (
                <div className="p-3 rounded-md border border-gray-300 dark:border-gray-600">
                  <div className="font-medium">RSI</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Latest: {analysisResult.rsi[analysisResult.rsi.length - 1]?.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}