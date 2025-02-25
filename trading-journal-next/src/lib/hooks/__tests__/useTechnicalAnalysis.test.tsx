import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTechnicalAnalysis } from '../useTechnicalAnalysis';
import type { Candle } from '@/lib/services/technical-analysis';

const mockCapabilities = {
  availableIndicators: {
    sma: {
      description: 'Simple Moving Average',
      parameters: ['period'],
    },
    rsi: {
      description: 'Relative Strength Index',
      parameters: ['period'],
    },
  },
  availablePatterns: [
    {
      name: 'CDL_ENGULFING',
      description: 'Engulfing Pattern',
      bullish: true,
      bearish: true,
    },
  ],
};

const mockAnalysisResult = {
  timestamp: Date.now(),
  analysisRange: {
    start: 1000,
    end: 5000,
  },
  results: {
    patterns: [
      {
        pattern: 'CDL_ENGULFING',
        direction: 'bullish',
        startIndex: 1,
        endIndex: 2,
        confidence: 0.8,
      },
    ],
    indicators: {
      SMA20: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 102 },
      ],
    },
  },
};

const sampleCandles: Candle[] = [
  { timestamp: 1000, open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  { timestamp: 2000, open: 103, high: 107, low: 101, close: 105, volume: 1200 },
  { timestamp: 3000, open: 105, high: 108, low: 103, close: 106, volume: 1100 },
];

describe('useTechnicalAnalysis', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient();
    fetchMock.resetMocks();
  });

  it('should fetch capabilities on mount', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockCapabilities));

    const { result } = renderHook(
      () => useTechnicalAnalysis(sampleCandles, { patterns: true }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoadingCapabilities).toBe(true);

    await waitFor(() => {
      expect(result.current.capabilities).toEqual(mockCapabilities);
    });

    expect(result.current.isLoadingCapabilities).toBe(false);
  });

  it('should perform analysis when enabled', async () => {
    fetchMock
      .mockResponseOnce(JSON.stringify(mockCapabilities))
      .mockResponseOnce(JSON.stringify(mockAnalysisResult));

    const { result } = renderHook(
      () =>
        useTechnicalAnalysis(
          sampleCandles,
          {
            patterns: true,
            sma: [20],
          },
          { enabled: true }
        ),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.analysisResult).toEqual(mockAnalysisResult);
    });

    expect(result.current.patterns).toHaveLength(1);
    expect(result.current.indicators.SMA20).toBeDefined();
  });

  it('should not analyze when disabled', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockCapabilities));

    const { result } = renderHook(
      () =>
        useTechnicalAnalysis(
          sampleCandles,
          {
            patterns: true,
          },
          { enabled: false }
        ),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.capabilities).toBeDefined();
    });

    expect(result.current.analysisResult).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1); // Only capabilities fetch
  });

  it('should handle analysis errors', async () => {
    const mockError = { error: 'Analysis failed' };
    fetchMock
      .mockResponseOnce(JSON.stringify(mockCapabilities))
      .mockResponseOnce(JSON.stringify(mockError), { status: 500 });

    const onError = jest.fn();

    const { result } = renderHook(
      () =>
        useTechnicalAnalysis(
          sampleCandles,
          {
            patterns: true,
          },
          { onError }
        ),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });

    expect(result.current.error).toBeDefined();
  });

  it('should handle helper functions correctly', async () => {
    fetchMock
      .mockResponseOnce(JSON.stringify(mockCapabilities))
      .mockResponseOnce(JSON.stringify(mockAnalysisResult));

    const { result } = renderHook(
      () => useTechnicalAnalysis(sampleCandles, { patterns: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.analysisResult).toBeDefined();
    });

    // Test getIndicatorValues
    const smaValues = result.current.getIndicatorValues('SMA20');
    expect(smaValues).toHaveLength(2);

    // Test getPatternsInRange
    const patterns = result.current.getPatternsInRange(1000, 5000);
    expect(patterns).toHaveLength(1);

    // Test isIndicatorAvailable
    expect(result.current.isIndicatorAvailable('sma')).toBe(true);
    expect(result.current.isIndicatorAvailable('unknown')).toBe(false);
  });

  it('should refetch analysis with interval when specified', async () => {
    jest.useFakeTimers();
    
    fetchMock
      .mockResponseOnce(JSON.stringify(mockCapabilities))
      .mockResponse(JSON.stringify(mockAnalysisResult));

    renderHook(
      () =>
        useTechnicalAnalysis(
          sampleCandles,
          { patterns: true },
          { refetchInterval: 5000 }
        ),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2); // Initial capabilities + analysis
    });

    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3); // One more analysis fetch
    });

    jest.useRealTimers();
  });
});