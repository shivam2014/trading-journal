import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurrency } from '../useCurrency';

// Mock successful responses
const mockCurrencyData = {
  availableCurrencies: ['USD', 'EUR', 'GBP'],
  cacheAge: 0,
  timestamp: Date.now(),
};

const mockConversionResult = {
  amount: 100,
  from: 'USD',
  to: 'EUR',
  result: 92,
  timestamp: Date.now(),
};

describe('useCurrency', () => {
  let queryClient: QueryClient;

  // Wrapper component for React Query
  const createWrapper = () => {
    const queryClient = new QueryClient({
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

  it('should fetch available currencies on mount', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockCurrencyData));

    const { result } = renderHook(() => useCurrency(), {
      wrapper: createWrapper(),
    });

    // Should start with loading state
    expect(result.current.isLoadingCurrencies).toBe(true);

    // Wait for data to be fetched
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.availableCurrencies).toEqual(['USD', 'EUR', 'GBP']);
    expect(result.current.isLoadingCurrencies).toBe(false);
  });

  it('should handle currency conversion', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockCurrencyData));
    fetchMock.mockResponseOnce(JSON.stringify(mockConversionResult));

    const { result } = renderHook(() => useCurrency(), {
      wrapper: createWrapper(),
    });

    // Wait for initial currencies to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Perform conversion
    let conversionResult;
    await act(async () => {
      conversionResult = await result.current.convert({
        amount: 100,
        from: 'USD',
        to: 'EUR',
      });
    });

    expect(conversionResult).toEqual(mockConversionResult);
    expect(result.current.error).toBeNull();
  });

  it('should handle batch conversions', async () => {
    const mockBatchResults = {
      results: [
        { amount: 100, from: 'USD', to: 'EUR', result: 92, timestamp: Date.now() },
        { amount: 200, from: 'USD', to: 'GBP', result: 158, timestamp: Date.now() },
      ],
    };

    fetchMock.mockResponseOnce(JSON.stringify(mockCurrencyData));
    fetchMock.mockResponseOnce(JSON.stringify(mockBatchResults));

    const { result } = renderHook(() => useCurrency(), {
      wrapper: createWrapper(),
    });

    // Wait for initial currencies to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Perform batch conversion
    let batchResults;
    await act(async () => {
      batchResults = await result.current.convertBatch([
        { amount: 100, from: 'USD', to: 'EUR' },
        { amount: 200, from: 'USD', to: 'GBP' },
      ]);
    });

    expect(batchResults).toEqual(mockBatchResults);
    expect(result.current.error).toBeNull();
  });

  it('should format currency correctly', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockCurrencyData));

    const { result } = renderHook(() => useCurrency({ defaultCurrency: 'USD' }), {
      wrapper: createWrapper(),
    });

    // Wait for initial currencies to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.formatCurrency(1234.567)).toBe('$1,234.57');
    expect(result.current.formatCurrency(1234.567, 'EUR')).toBe('€1,234.57');
  });

  it('should handle API errors gracefully', async () => {
    const errorResponse = {
      error: 'Failed to fetch currencies',
      details: 'API Error',
    };

    fetchMock.mockResponseOnce(JSON.stringify(errorResponse), { status: 500 });

    const { result } = renderHook(() => useCurrency(), {
      wrapper: createWrapper(),
    });

    // Wait for error to be processed
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.availableCurrencies).toEqual([]);
  });

  it('should auto-refresh cache when enabled', async () => {
    jest.useFakeTimers();

    fetchMock.mockResponse(JSON.stringify(mockCurrencyData));

    renderHook(() => useCurrency({ autoCacheRefresh: true, cacheStaleTime: 1000 }), {
      wrapper: createWrapper(),
    });

    // Initial fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance timer by cache stale time
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Should fetch again
    expect(fetchMock).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should not auto-refresh when disabled', async () => {
    jest.useFakeTimers();

    fetchMock.mockResponse(JSON.stringify(mockCurrencyData));

    renderHook(() => useCurrency({ autoCacheRefresh: false }), {
      wrapper: createWrapper(),
    });

    // Initial fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance timer
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // Should not fetch again
    expect(fetchMock).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});