import { CurrencyService } from '../currency';
import fetchMock from 'jest-fetch-mock';

// Enable fetch mocking
fetchMock.enableMocks();

describe('CurrencyService', () => {
  const mockApiKey = 'test-api-key';
  let currencyService: CurrencyService;

  beforeEach(() => {
    fetchMock.resetMocks();
    currencyService = new CurrencyService(mockApiKey);
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
    });

    it('should throw error when API key is not configured', async () => {
      const serviceWithoutKey = new CurrencyService('');
      await expect(serviceWithoutKey.updateRates()).rejects.toThrow(
        'OpenExchangeRates API key not configured'
      );
    });

    it('should handle API errors gracefully', async () => {
      fetchMock.mockRejectOnce(new Error('API Error'));
      await expect(currencyService.updateRates()).rejects.toThrow('API Error');
    });
  });

  describe('Currency Conversion', () => {
    beforeEach(async () => {
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
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
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
    });

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
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed API responses', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({
        base: 'USD',
        // Missing rates object
        timestamp: Date.now() / 1000,
      }));

      await expect(currencyService.updateRates()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));
      await expect(currencyService.updateRates()).rejects.toThrow('Network error');
    });

    it('should handle API errors with status codes', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Invalid API key' }), { 
        status: 401 
      });

      await expect(currencyService.updateRates()).rejects.toThrow();
    });
  });
});