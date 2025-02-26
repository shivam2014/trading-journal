import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurrency } from '../useCurrency';

// Mock fetch globally
global.fetch = jest.fn();

describe('useCurrency', () => {
  let queryClient: QueryClient;
  const timestamp = 1740573417587; // Fixed timestamp for tests
  const mockRates = {
    USD: 1,
    EUR: 0.85,
    GBP: 0.75,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

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
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/currency/rates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            rates: mockRates,
            timestamp: timestamp,
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });
  });

  it('should fetch available currencies on mount', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    
    // Wait for fetch to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.availableCurrencies).toEqual(Object.keys(mockRates));
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle currency conversion', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    let convertedAmount;
    await act(async () => {
      convertedAmount = await result.current.convert(100, 'USD', 'EUR');
    });
    
    expect(convertedAmount).toBeCloseTo(85);
  });

  it('should handle batch conversions', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    let convertedAmounts;
    await act(async () => {
      convertedAmounts = await result.current.convertBatch([100, 200], 'USD', 'EUR');
    });
    
    expect(convertedAmounts).toEqual(expect.arrayContaining([85, 170]));
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'));
    
    const { result } = renderHook(() => useCurrency(), { wrapper });
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.availableCurrencies).toEqual([]);
  });

  it('should allow currency selection', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    
    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.selectedCurrency).toBe('USD');
    
    await act(async () => {
      result.current.setSelectedCurrency('EUR');
      // Need to wait for state update
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(result.current.selectedCurrency).toBe('EUR');
  });

  it('should format currency correctly', () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    expect(result.current.formatCurrency(1000)).toBe('$1,000.00');
    expect(result.current.formatCurrency(1000, 'EUR')).toBe('€1,000.00');
  });

  it('should handle cache age', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.cacheAge).toBe(timestamp);
  });

  it('should handle refresh', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    await act(async () => {
      await result.current.refetchCurrencies();
    });
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});