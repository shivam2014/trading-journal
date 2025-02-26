import { CurrencyService } from '../currency';
import fetchMock from 'jest-fetch-mock';
import { WebSocketMessageType } from '../websocket';

// Enable fetch mocking
fetchMock.enableMocks();

// Mock WebSocket module
jest.mock('../websocket', () => {
  const mockWS = {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    isConnected: jest.fn(() => true),
    on: jest.fn(),
    send: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    // Mock readyState to be OPEN (1)
    readyState: 1,
  };

  return {
    getWebSocketClient: () => mockWS,
    WebSocketMessageType: {
      CURRENCY_UPDATE: 'CURRENCY_UPDATE',
      ERROR: 'ERROR',
      RATE_LIMIT: 'RATE_LIMIT',
      SUBSCRIBE: 'SUBSCRIBE',
    },
    __mockWS: mockWS,
  };
});

describe('CurrencyService', () => {
  const mockApiKey = 'test-api-key';
  let currencyService: CurrencyService;
  let mockWS: any;

  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();
    mockWS = require('../websocket').__mockWS;
    mockWS.isConnected.mockReturnValue(true);
    mockWS.send.mockImplementation(() => {});
    currencyService = new CurrencyService(mockApiKey);
  });

  afterEach(() => {
    currencyService.cleanup();
  });

  const mockRatesResponse = {
    base: 'USD',
    rates: {
      EUR: 0.92,
      GBP: 0.79,
      JPY: 110.5,
      USD: 1.0,
    },
    timestamp: Date.now() / 1000,
  };

  describe('Rate Fetching', () => {
    it('should fetch rates from the API', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockRatesResponse));

      await currencyService.updateRates();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('openexchangerates.org/api/latest.json')
      );
    }, 10000);

    it('should throw error when API key is not configured', async () => {
      const serviceWithoutKey = new CurrencyService('');
      await expect(serviceWithoutKey.updateRates()).rejects.toThrow(
        'OpenExchangeRates API key not configured'
      );
    });

    it('should handle API errors gracefully', async () => {
      fetchMock.mockRejectOnce(new Error('API Error'));
      await expect(currencyService.updateRates()).rejects.toThrow('API Error');
    }, 10000);
  });

  describe('Currency Conversion', () => {
    beforeEach(async () => {
      mockWS.send.mockImplementation(() => {});
      fetchMock.mockResponseOnce(JSON.stringify(mockRatesResponse));
      await currencyService.updateRates();
    });

    it('should convert between currencies correctly', async () => {
      const amount = 100;
      const converted = await currencyService.convert(amount, 'USD', 'EUR');
      expect(converted).toBeCloseTo(92);
    });

    it('should handle same currency conversion', async () => {
      const amount = 100;
      const converted = await currencyService.convert(amount, 'USD', 'USD');
      expect(converted).toBe(100);
    });

    it('should convert through base currency when needed', async () => {
      const amount = 100;
      const converted = await currencyService.convert(amount, 'EUR', 'GBP');
      // EUR -> USD -> GBP: 100 / 0.92 * 0.79
      expect(converted).toBeCloseTo(85.87);
    });

    it('should throw error for invalid currency', async () => {
      await expect(
        currencyService.convert(100, 'USD', 'INVALID')
      ).rejects.toThrow('Exchange rate not found');
    });
  });

  describe('Batch Conversions', () => {
    beforeEach(async () => {
      mockWS.send.mockImplementation(() => {});
      fetchMock.mockResponseOnce(JSON.stringify(mockRatesResponse));
      await currencyService.updateRates();
    });

    it('should convert multiple amounts', async () => {
      const conversions = [
        { amount: 100, from: 'USD', to: 'EUR' },
        { amount: 200, from: 'USD', to: 'GBP' },
        { amount: 300, from: 'EUR', to: 'GBP' },
      ];

      const results = await currencyService.convertMultiple(conversions);
      expect(results).toHaveLength(3);
      expect(results[0]).toBeCloseTo(92);
      expect(results[1]).toBeCloseTo(158);
      expect(results[2]).toBeCloseTo(257.61);
    }, 10000);
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockWS.send.mockImplementation(() => {});
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cache rates for one hour', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockRatesResponse));
      await currencyService.updateRates();
      
      expect(currencyService.isCacheValid()).toBe(true);
      
      // Move time forward by 59 minutes
      jest.advanceTimersByTime(59 * 60 * 1000);
      expect(currencyService.isCacheValid()).toBe(true);
      
      // Move time forward to 61 minutes
      jest.advanceTimersByTime(2 * 60 * 1000);
      expect(currencyService.isCacheValid()).toBe(false);
    }, 10000);

    it('should update rates when cache is invalid', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockRatesResponse));
      await currencyService.updateRates();
      
      jest.advanceTimersByTime(61 * 60 * 1000); // Move past cache timeout
      
      fetchMock.mockResponseOnce(JSON.stringify({
        ...mockRatesResponse,
        rates: { ...mockRatesResponse.rates, EUR: 0.95 },
      }));

      const converted = await currencyService.convert(100, 'USD', 'EUR');
      expect(converted).toBeCloseTo(95);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockWS.send.mockImplementation(() => {});
    });

    it('should handle malformed API responses', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({
        base: 'USD',
        // Missing rates object
        timestamp: Date.now() / 1000,
      }));

      await expect(currencyService.updateRates()).rejects.toThrow();
    }, 10000);

    it('should handle network errors', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));
      await expect(currencyService.updateRates()).rejects.toThrow('Network error');
    }, 10000);

    it('should handle API errors with status codes', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Invalid API key' }), { 
        status: 401 
      });

      await expect(currencyService.updateRates()).rejects.toThrow();
    }, 10000);
  });

  describe('WebSocket Integration', () => {
    it('should subscribe to currency updates', async () => {
      expect(mockWS.subscribe).toHaveBeenCalledWith('currency-rates');
    });

    it('should handle WebSocket reconnection', async () => {
      mockWS.isConnected.mockReturnValueOnce(false).mockReturnValueOnce(true);
      await currencyService.updateRates();
      expect(mockWS.connect).toHaveBeenCalled();
    }, 10000);
  });
});