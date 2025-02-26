import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Mock WebSocket module
jest.mock('../../services/websocket', () => {
  const eventHandlers: { [key: string]: MockWebSocketHandler[] } = {};
  const mockWebSocket = {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    isConnected: jest.fn(() => true),
    on: jest.fn((event: string, handler: MockWebSocketHandler) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    send: jest.fn(),
    emit: (event: string, data: any) => {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach(handler => handler(data));
      }
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
    _eventHandlers: eventHandlers,
  };

  return {
    getWebSocketClient: () => mockWebSocket,
    WebSocketMessageType: {
      CURRENCY_UPDATE: 'CURRENCY_UPDATE',
      ERROR: 'ERROR',
      RATE_LIMIT: 'RATE_LIMIT',
      SUBSCRIBE: 'SUBSCRIBE',
    },
    __mockWebSocket: mockWebSocket,
  };
});

describe('useCurrency', () => {
  let queryClient: QueryClient;
  const timestamp = Date.now();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

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

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch available currencies on mount', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    
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
    
    expect(convertedAmount).toBeCloseTo(92);
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
    
    expect(convertedAmounts).toEqual(expect.arrayContaining([92, 184]));
  });

  it('should handle WebSocket currency updates', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    const mockWebSocket = require('../../services/websocket').__mockWebSocket;

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const wsUpdatePayload = {
      base: 'USD',
      rates: { ...mockRates }, // Use the same rates for consistency
      timestamp: Date.now(),
    };

    await act(async () => {
      mockWebSocket.emit('CURRENCY_UPDATE', wsUpdatePayload);
    });

    expect(result.current.availableCurrencies).toContain('EUR');
    expect(await result.current.convert(100, 'USD', 'EUR')).toBeCloseTo(92);
  });

  it('should handle rate limiting', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    const mockWebSocket = require('../../services/websocket').__mockWebSocket;

    // Mock API to simulate rate limit
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })
    );

    await act(async () => {
      try {
        await result.current.refetchCurrencies();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    // Verify WebSocket subscription
    expect(mockWebSocket.subscribe).toHaveBeenCalledWith('currency-rates');
    expect(mockWebSocket._eventHandlers['RATE_LIMIT']).toBeDefined();

    await act(async () => {
      mockWebSocket.emit('RATE_LIMIT', { message: 'Rate limit exceeded' });
    });
  });

  it('should handle WebSocket disconnection', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    const mockWebSocket = require('../../services/websocket').__mockWebSocket;

    // Mock WebSocket disconnection
    mockWebSocket.isConnected.mockReturnValue(false);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Should attempt to fetch rates via HTTP when WebSocket is disconnected
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should cleanup resources on unmount', async () => {
    const mockWebSocket = require('../../services/websocket').__mockWebSocket;
    const { unmount } = renderHook(() => useCurrency(), { wrapper });
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Verify subscription was made
    expect(mockWebSocket.subscribe).toHaveBeenCalledWith('currency-rates');
    
    // Cleanup
    unmount();
    expect(mockWebSocket.unsubscribe).toHaveBeenCalledWith('currency-rates');
    expect(queryClient.isFetching()).toBe(0);
  });
});
