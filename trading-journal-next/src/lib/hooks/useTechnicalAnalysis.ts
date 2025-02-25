import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import type { Candle, PatternResult, IndicatorValue } from '@/lib/services/technical-analysis';

interface AnalysisOptions {
  patterns?: boolean;
  sma?: number[];
  ema?: number[];
  rsi?: number;
  macd?: {
    fast: number;
    slow: number;
    signal: number;
  };
  bbands?: {
    period: number;
    stdDev: number;
  };
}

interface AnalysisResult {
  timestamp: number;
  analysisRange: {
    start: number;
    end: number;
  };
  results: {
    patterns?: PatternResult[];
    indicators?: Record<string, IndicatorValue[]>;
  };
}

interface AnalysisCapabilities {
  availableIndicators: {
    [key: string]: {
      description: string;
      parameters: string[];
    };
  };
  availablePatterns: Array<{
    name: string;
    description: string;
    bullish: boolean;
    bearish: boolean;
  }>;
}

interface UseTechnicalAnalysisOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
  onError?: (error: Error) => void;
}

export function useTechnicalAnalysis(
  candles: Candle[],
  options: AnalysisOptions,
  {
    enabled = true,
    refetchInterval = false,
    onError,
  }: UseTechnicalAnalysisOptions = {}
) {
  // Query for available indicators and patterns
  const {
    data: capabilities,
    isLoading: isLoadingCapabilities,
    error: capabilitiesError,
  } = useQuery<AnalysisCapabilities>({
    queryKey: ['analysisCapabilities'],
    queryFn: async () => {
      const response = await fetch('/api/analysis');
      if (!response.ok) {
        throw new Error('Failed to fetch analysis capabilities');
      }
      return response.json();
    },
    staleTime: Infinity, // Cache indefinitely as capabilities rarely change
  });

  // Mutation for performing analysis
  const {
    mutateAsync: analyze,
    isPending: isAnalyzing,
    error: analysisError,
    data: analysisResult,
  } = useMutation<AnalysisResult, Error, void>({
    mutationFn: async () => {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candles, options }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      return response.json();
    },
    onError,
  });

  // Auto-analyze when enabled and candles change
  useQuery({
    queryKey: ['analysis', candles, options],
    queryFn: () => analyze(),
    enabled: enabled && candles.length > 0,
    refetchInterval,
  });

  // Helper function to get indicator values
  const getIndicatorValues = (indicatorName: string): IndicatorValue[] => {
    return analysisResult?.results.indicators?.[indicatorName] || [];
  };

  // Helper function to get patterns within a range
  const getPatternsInRange = (startTime: number, endTime: number): PatternResult[] => {
    return (
      analysisResult?.results.patterns?.filter(
        (pattern) =>
          pattern.startIndex >= startTime && pattern.endIndex <= endTime
      ) || []
    );
  };

  // Helper function to check if an indicator is available
  const isIndicatorAvailable = (indicatorName: string): boolean => {
    return !!capabilities?.availableIndicators[indicatorName];
  };

  return {
    // Data
    capabilities,
    analysisResult,
    patterns: analysisResult?.results.patterns || [],
    indicators: analysisResult?.results.indicators || {},

    // Loading states
    isLoadingCapabilities,
    isAnalyzing,

    // Error states
    error: capabilitiesError || analysisError,

    // Helper functions
    analyze,
    getIndicatorValues,
    getPatternsInRange,
    isIndicatorAvailable,
  };
}

// Export types
export type {
  AnalysisOptions,
  AnalysisResult,
  AnalysisCapabilities,
  UseTechnicalAnalysisOptions,
};