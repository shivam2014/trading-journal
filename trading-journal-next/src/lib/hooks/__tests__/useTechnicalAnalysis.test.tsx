import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTechnicalAnalysis } from '../useTechnicalAnalysis';
import type { Candle, AnalysisCapabilities, AnalysisResult } from '@/types/trade';

// Mock fetch globally
global.fetch = jest.fn();

describe('useTechnicalAnalysis', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockCandles: Candle[] = [
    {
      timestamp: new Date('2025-01-01').getTime(),
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000,
    },
  ];

  const mockCapabilities: AnalysisCapabilities = {
    indicators: ['SMA', 'RSI', 'MACD'],
    patterns: ['ENGULFING', 'HAMMER', 'DOJI'],
  };

  const mockAnalysis: AnalysisResult = {
    sma: { '20': [102.00] },
    rsi: [65.00],
    macd: {
      macd: [1.4],
      signal: [1.2],
      histogram: [0.2],
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
          refetchOnWindowFocus: false,
        },
      },
    });

    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/analysis/capabilities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCapabilities),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnalysis),
      });
    });
  });

  it('should fetch capabilities on mount', async () => {
    const { result } = renderHook(() => useTechnicalAnalysis(), { wrapper });

    // Wait for initial fetch
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.capabilities).toEqual(mockCapabilities);
    expect(result.current.isLoading).toBe(false);
  });

  it('should perform analysis when enabled', async () => {
    const { result } = renderHook(
      () => useTechnicalAnalysis({ candles: mockCandles }),
      { wrapper }
    );

    // Wait for all fetches to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.analysisResult).toEqual(mockAnalysis);
    expect(result.current.isLoading).toBe(false);
  }, 10000);

  it('should not analyze when disabled', async () => {
    const { result } = renderHook(
      () => useTechnicalAnalysis({ candles: mockCandles, enabled: false }),
      { wrapper }
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.analysisResult).toBeUndefined();
    // We still expect capabilities to be fetched
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/analysis/capabilities');
  });

  it('should handle analysis errors', async () => {
    const error = new Error('Analysis failed');
    
    // Create a more specific mock that only rejects the analysis endpoint
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/analysis/capabilities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCapabilities),
        });
      }
      if (url.includes('/api/analysis/analyze')) {
        return Promise.reject(error);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    const { result } = renderHook(
      () => useTechnicalAnalysis({ candles: mockCandles }),
      { wrapper }
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.analysisResult).toBeUndefined();
  });

  it('should handle helper functions correctly', async () => {
    const { result } = renderHook(() => useTechnicalAnalysis(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isIndicatorAvailable('SMA')).toBe(true);
    expect(result.current.isIndicatorAvailable('UNKNOWN')).toBe(false);
  });

  it('should refetch analysis with interval when specified', async () => {
    jest.useFakeTimers();

    // Setup fetch mock to count calls
    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      fetchCount++;
      if (url.includes('/api/analysis/capabilities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCapabilities),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnalysis),
      });
    });

    renderHook(
      () => useTechnicalAnalysis({
        candles: mockCandles,
        refreshInterval: 1000,
      }),
      { wrapper }
    );

    // Initial fetch
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Flush promises
    });

    // Reset count after initial fetches
    const initialFetchCount = fetchCount;

    // Advance timers
    await act(async () => {
      jest.advanceTimersByTime(1100);
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Flush promises
    });

    // Verify additional fetches occurred
    expect(fetchCount).toBeGreaterThan(initialFetchCount);

    jest.useRealTimers();
  }, 15000);
});