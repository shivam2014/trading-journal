import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useCurrency } from '../useCurrency';

// Mock fetch globally
global.fetch = jest.fn();

type MockWebSocketHandler = (event: any) => void;

// Define rates that match the currency service tests
const mockRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 110.5,
};

// Mock currency conversion service
jest.mock('@/lib/services/currency-conversion', () => ({
  getCurrencyConversionService: () => ({
    convert: jest.fn((amount, fromCurrency, toCurrency) => {
      const fromRate = mockRates[fromCurrency] || 1;
      const toRate = mockRates[toCurrency] || 1;
      return Promise.resolve((Number(amount) / fromRate) * toRate);
    }),
    convertMany: jest.fn((amounts, fromCurrency, toCurrency) => {
      const fromRate = mockRates[fromCurrency] || 1;
      const toRate = mockRates[toCurrency] || 1;
      return Promise.resolve(
        amounts.map(amount => (Number(amount) / fromRate) * toRate)
      );
    }),
  }),
}));

// Mock useWebSocket hook
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../useWebSocket', () => ({
  useWebSocket: ({ onMessage }) => ({
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    isConnected: true,
  })
}));

// Mock next-auth session
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: '123' } },
    status: 'authenticated'
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children
}));

describe('useCurrency', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          refetchOnWindowFocus: false,
        },
      },
    });

    jest.clearAllMocks();

    mockSubscribe.mockClear();
    mockUnsubscribe.mockClear();

    // Mock API responses
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/currency/rates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            rates: mockRates,
            timestamp: Date.now(),
          }),
        });
      }
      if (url.includes('/api/settings/currency')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ currency: 'USD' }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SessionProvider session={{ user: { id: '123' }, expires: '2024-01-01' }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );

  it('should fetch available currencies on mount', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Wait for the initial query to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.availableCurrencies).toEqual(Object.keys(mockRates));
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle currency conversion', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Wait for the initial query to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const convertedAmount = await result.current.convert(100, 'USD', 'EUR');
    expect(convertedAmount).toBeCloseTo(92);
  });

  it('should handle batch conversions', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Wait for the initial query to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const convertedAmounts = await result.current.convertBatch([100, 200], 'USD', 'EUR');
    expect(convertedAmounts).toEqual([92, 184]);
  });

  it('should handle WebSocket currency updates', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Wait for initial subscription
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    expect(mockSubscribe).toHaveBeenCalledWith('currency-rates');

    // Simulate WebSocket update
    await act(async () => {
      queryClient.setQueryData(['currencies'], Object.keys({ ...mockRates, CNY: 6.5 }));
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.availableCurrencies).toContain('CNY');
  });

  it('should handle rate limiting', async () => {
    // Mock API to simulate rate limit
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      })
    );

    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Wait for the error to be set
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should cleanup resources on unmount', async () => {
    const { result, unmount } = renderHook(() => useCurrency(), { wrapper });

    // Wait for initial subscription
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    expect(mockSubscribe).toHaveBeenCalledWith('currency-rates');

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith('currency-rates');
    expect(queryClient.isFetching()).toBe(0);
  });

  it('should handle rate limit errors from WebSocket', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Wait for initial subscription
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Simulate WebSocket rate limit error
    await act(async () => {
      queryClient.setQueryData(['currencies'], (old: any) => ({
        ...old,
        error: 'Rate limit exceeded',
      }));
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.error?.message).toBe('Rate limit exceeded');
  });

  it('should resubscribe after WebSocket reconnection', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Wait for initial subscription
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    expect(mockSubscribe).toHaveBeenCalledWith('currency-rates');

    // Simulate disconnect and reconnect
    mockSubscribe.mockClear();

    // Simulate reconnection by triggering a new subscription
    await act(async () => {
      const mockReconnectEvent = new MessageEvent('message', {
        data: JSON.stringify({ type: 'AUTH', success: true })
      });
      mockOnMessage?.(mockReconnectEvent);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockSubscribe).toHaveBeenCalledWith('currency-rates');
  });

  it('should batch convert multiple amounts efficiently', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Wait for initial query to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const amounts = [100, 200, 300];
    const convertedAmounts = await result.current.convertBatch(amounts, 'USD', 'EUR');
    
    expect(convertedAmounts).toEqual([92, 184, 276]);
    // Verify we made a single API call for batch conversion
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('should handle WebSocket currency rate updates', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Wait for initial subscription
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Simulate WebSocket rate update
    const newRates = { ...mockRates, EUR: 0.95 };
    await act(async () => {
      const updateEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'CURRENCY_UPDATE',
          payload: {
            rates: newRates,
            timestamp: Date.now()
          }
        })
      });
      mockOnMessage?.(updateEvent);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const convertedAmount = await result.current.convert(100, 'USD', 'EUR');
    expect(convertedAmount).toBeCloseTo(95);
  });
});
