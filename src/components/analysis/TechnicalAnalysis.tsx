'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { getTechnicalAnalysisService } from '@/lib/services/technical-analysis';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import type { Candle, PatternResult, IndicatorValue } from '@/types/trade';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TechnicalAnalysisProps {
  symbol?: string;
  timeframe?: string;
  candles?: Candle[];
  className?: string;
  onPatternDetected?: (pattern: PatternResult) => void;
}

export function TechnicalAnalysis({ 
  symbol, 
  timeframe = '1d',
  candles: initialCandles,
  className = '',
  onPatternDetected 
}: TechnicalAnalysisProps) {
  const [candles, setCandles] = useState<Candle[]>(initialCandles || []);
  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [indicators, setIndicators] = useState<Record<string, IndicatorValue[]>>({});
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['SMA20', 'SMA50']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const service = useMemo(() => getTechnicalAnalysisService(), []);

  // WebSocket for real-time updates
  const { subscribe, unsubscribe } = useWebSocket({
    onMessage: useCallback((data) => {
      if (data?.type === 'PRICE_UPDATE' && data?.symbol === symbol) {
        const newCandle: Candle = {
          timestamp: new Date(data.timestamp).getTime(),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume,
        };
        setCandles(prev => [...prev, newCandle]);
      }
    }, [symbol])
  });

  // WebSocket subscription only if symbol is provided
  useEffect(() => {
    if (!symbol) return;
    subscribe(`price-updates-${symbol}`);
    return () => unsubscribe(`price-updates-${symbol}`);
  }, [symbol, subscribe, unsubscribe]);

  // Set initial candles
  useEffect(() => {
    if (initialCandles?.length) {
      setCandles(initialCandles);
    } else if (symbol) {
      // For now, use mock data if no candles provided
      setCandles([]);
    }
  }, [symbol, initialCandles]);

  // Calculate indicators and patterns
  useEffect(() => {
    const calculateAnalysis = async () => {
      if (!candles.length) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Calculate indicators
        const indicatorOptions = {
          sma: [20, 50],
          ema: [9],
          rsi: 14,
          macd: { fast: 12, slow: 26, signal: 9 },
          bbands: { period: 20, stdDev: 2 },
        };

        const [results, detectedPatterns] = await Promise.all([
          service.calculateIndicators(candles, indicatorOptions),
          service.detectPatterns(candles)
        ]);

        setIndicators(results as Record<string, IndicatorValue[]>);
        setPatterns(detectedPatterns);
        
        // Notify parent component of patterns
        detectedPatterns?.forEach(pattern => {
          onPatternDetected?.(pattern);
        });

        setError(null);
      } catch (error) {
        console.error('Failed to calculate technical analysis:', error);
        setError(error instanceof Error ? error : new Error('Failed to calculate technical analysis'));
      } finally {
        setIsLoading(false);
      }
    };

    calculateAnalysis();
  }, [candles, service, onPatternDetected]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!candles.length) return null;

    const dates = candles.map(c => format(c.timestamp, 'MM/dd/yyyy'));
    const prices = candles.map(c => c.close);

    const mainDataset = {
      label: symbol || 'Price',
      data: prices,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
    };

    // Only add indicator datasets if we have indicator data
    const indicatorDatasets = Object.keys(indicators).length > 0 
      ? selectedIndicators
          .filter(indicator => indicators[indicator]?.length > 0)
          .map(indicator => {
            const indicatorData = indicators[indicator];
            let color = 'rgb(255, 99, 132)';
            if (indicator.startsWith('SMA')) color = 'rgb(54, 162, 235)';
            if (indicator.startsWith('EMA')) color = 'rgb(255, 206, 86)';

            return {
              label: indicator,
              data: indicatorData.map(d => d.value),
              borderColor: color,
              tension: 0.1,
            };
          })
      : [];

    return {
      labels: dates,
      datasets: [mainDataset, ...indicatorDatasets],
    };
  }, [candles, indicators, selectedIndicators, symbol]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${symbol} Technical Analysis`,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  if (error) {
    return (
      <div data-testid="technical-analysis" className={`flex items-center justify-center h-64 ${className}`.trim()}>
        <div className="text-red-500">{error.message}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div data-testid="loading-skeleton" className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading technical analysis...</div>
      </div>
    );
  }

  if (!candles.length) {
    return (
      <div data-testid="technical-analysis" className={`flex items-center justify-center h-64 ${className}`.trim()}>
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div data-testid="technical-analysis" className={`space-y-4 ${className}`.trim()}>
      {/* Pattern List - Move this before the chart to match test expectations */}
      {patterns.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Detected Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patterns.map((pattern, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {pattern.type}
                </div>
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  {pattern.direction}
                </div>
                <div className="text-sm text-gray-500">
                  {format(pattern.timestamp, 'MM/dd/yyyy HH:mm')}
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Confidence:</span>
                  <span className="ml-1 font-medium">
                    {(pattern.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Price:</span>
                  <span className="ml-1 font-medium">
                    ${pattern.price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicator Selection */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(indicators).map(indicator => (
          <label key={indicator} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedIndicators.includes(indicator)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIndicators(prev => [...prev, indicator]);
                } else {
                  setSelectedIndicators(prev => prev.filter(i => i !== indicator));
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">{indicator}</span>
          </label>
        ))}
      </div>

      {/* Chart */}
      {chartData && (
        <div className="h-96">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}