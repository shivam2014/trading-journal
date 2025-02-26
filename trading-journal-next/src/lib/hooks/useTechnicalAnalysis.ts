import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Candle, PatternResult, AnalysisResult, AnalysisCapabilities, MACDOptions } from '@/types/trade';

interface UseTechnicalAnalysisOptions {
  candles?: Candle[];
  enabled?: boolean;
  refreshInterval?: number;
  indicators?: string[];
}

export function useTechnicalAnalysis(options: UseTechnicalAnalysisOptions = {}) {
  const { candles, enabled = true, refreshInterval = 0, indicators = [] } = options;
  
  // State for selected indicators and their parameters
  const [selectedSMAs, setSelectedSMAs] = useState<string[]>(['20']);
  const [rsiPeriod, setRSIPeriod] = useState<number>(14);
  const [macdOptions, setMACDOptions] = useState<MACDOptions>({
    fast: 12,
    slow: 26,
    signal: 9
  });

  // Fetch analysis capabilities
  const {
    data: capabilities,
    error: capabilitiesError,
    isLoading: isLoadingCapabilities,
  } = useQuery<AnalysisCapabilities>({
    queryKey: ['analysis-capabilities'],
    queryFn: async () => {
      const response = await fetch('/api/analysis/capabilities');
      if (!response.ok) {
        throw new Error('Failed to fetch analysis capabilities');
      }
      return response.json();
    },
  });

  // Prepare analysis options based on selected indicators
  const analysisOptions = useMemo(() => {
    return {
      sma: selectedSMAs.map(period => parseInt(period)),
      rsi: rsiPeriod,
      macd: macdOptions,
      patterns: true
    };
  }, [selectedSMAs, rsiPeriod, macdOptions]);

  // Perform technical analysis
  const {
    data: analysisResult,
    error: analysisError,
    isLoading: isLoadingAnalysis,
    refetch: refreshAnalysis
  } = useQuery<AnalysisResult>({
    queryKey: ['analysis', candles, analysisOptions],
    queryFn: async () => {
      if (!candles?.length) {
        throw new Error('No candles provided for analysis');
      }

      const response = await fetch('/api/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          candles,
          options: analysisOptions
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform technical analysis');
      }

      return response.json();
    },
    enabled: enabled && Boolean(candles?.length),
    refetchInterval: refreshInterval > 0 ? refreshInterval : undefined,
    // Add this to clear data on error - this fixes the first test failure
    retryOnMount: false,
    retry: false
  });

  // Detect patterns from the analysis result
  const patterns = useMemo<PatternResult[]>(() => {
    if (!analysisResult?.patterns) return [];
    
    return analysisResult.patterns.map(pattern => ({
      type: pattern.name,
      direction: pattern.bullish ? 'BULLISH' : 'BEARISH',
      confidence: pattern.confidence * 100,
    }));
  }, [analysisResult]);

  // Helper function to check if an indicator is available
  const isIndicatorAvailable = useCallback(
    (indicatorName: string) => {
      return capabilities?.indicators.includes(indicatorName) || false;
    },
    [capabilities]
  );

  // Toggle SMA periods in the selected list
  const toggleSMA = useCallback((period: string) => {
    setSelectedSMAs(current => {
      if (current.includes(period)) {
        return current.filter(p => p !== period);
      } else {
        return [...current, period];
      }
    });
  }, []);

  // Update indicators and trigger re-analysis
  const updateIndicators = useCallback(() => {
    refreshAnalysis();
  }, [refreshAnalysis]);

  return {
    capabilities,
    // Return undefined for analysisResult when there's an error
    analysisResult: analysisError ? undefined : analysisResult,
    patterns,
    selectedSMAs,
    rsiPeriod,
    macdOptions,
    isLoading: isLoadingCapabilities || isLoadingAnalysis,
    error: capabilitiesError || analysisError,
    isIndicatorAvailable,
    toggleSMA,
    setRSIPeriod,
    setMACDOptions,
    updateIndicators,
    refreshAnalysis,
  };
}