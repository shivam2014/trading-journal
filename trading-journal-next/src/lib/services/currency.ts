import { z } from 'zod';
import { WebSocketMessageType, getWebSocketClient } from './websocket';
import { EventEmitter } from 'events';

// Rate response schema
const rateResponseSchema = z.object({
  base: z.string(),
  rates: z.record(z.number()),
  timestamp: z.number(),
});

export type ExchangeRates = z.infer<typeof rateResponseSchema>;

interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // in milliseconds
}

export class CurrencyService extends EventEmitter {
  private rates: Map<string, number> = new Map();
  private lastUpdate: number = 0;
  private readonly cacheTimeout = 3600000; // 1 hour in milliseconds
  private retryCount = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private requestCount = 0;
  private lastReset = Date.now();
  private wsClient = getWebSocketClient();

  constructor(
    private readonly apiKey: string = process.env.OPEN_EXCHANGE_RATES_APP_ID || '',
    private readonly baseCurrency: string = 'USD',
    private readonly rateLimit: RateLimitConfig = {
      maxRequests: 30,
      timeWindow: 60000, // 1 minute
    }
  ) {
    super();
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.wsClient.subscribe('currency-rates');
    
    this.wsClient.on(WebSocketMessageType.CURRENCY_UPDATE, (payload) => {
      const { rates, timestamp } = rateResponseSchema.parse(payload);
      this.updateRatesFromWS(rates, timestamp);
    });

    this.wsClient.on(WebSocketMessageType.ERROR, (error) => {
      this.emit('error', error);
    });

    this.wsClient.on(WebSocketMessageType.RATE_LIMIT, () => {
      this.emit('rateLimit');
    });
  }

  private updateRatesFromWS(rates: Record<string, number>, timestamp: number): void {
    this.rates.clear();
    Object.entries(rates).forEach(([currency, rate]) => {
      this.rates.set(currency, rate);
    });
    this.lastUpdate = timestamp * 1000;
    this.emit('ratesUpdated', Array.from(this.rates.entries()));
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.lastReset > this.rateLimit.timeWindow) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    if (this.requestCount >= this.rateLimit.maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    this.requestCount++;
    return true;
  }

  private async fetchRates(attempt = 0): Promise<ExchangeRates> {
    this.checkRateLimit();

    if (!this.apiKey) {
      throw new Error('OpenExchangeRates API key not configured');
    }

    try {
      const response = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${this.apiKey}&base=${this.baseCurrency}`
      );

      if (!response.ok) {
        if (response.status === 429) { // Rate limit exceeded
          this.emit('rateLimit');
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
      }

      const data = await response.json();
      return rateResponseSchema.parse(data);
    } catch (error) {
      if (attempt < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
        return this.fetchRates(attempt + 1);
      }
      throw error;
    }
  }

  private shouldUpdateRates(): boolean {
    return (
      this.rates.size === 0 ||
      Date.now() - this.lastUpdate > this.cacheTimeout ||
      !this.wsClient.isConnected()
    );
  }

  public async updateRates(): Promise<void> {
    try {
      const { rates, timestamp } = await this.fetchRates();
      this.updateRatesFromWS(rates, timestamp);
      
      // Broadcast the update via WebSocket
      this.wsClient.send({
        type: WebSocketMessageType.CURRENCY_UPDATE,
        payload: { rates, timestamp },
        timestamp: Date.now(),
      });
    } catch (error) {
      if (error instanceof Error) {
        this.emit('error', error);
        if (error.message.includes('Rate limit')) {
          this.emit('rateLimit');
        }
      }
      throw error;
    }
  }

  public async getRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;

    if (this.shouldUpdateRates()) {
      await this.updateRates();
    }

    const fromRate = this.rates.get(from);
    const toRate = this.rates.get(to);

    if (!fromRate || !toRate) {
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    }

    // Convert through base currency if needed
    return toRate / fromRate;
  }

  public async convert(
    amount: number,
    from: string,
    to: string
  ): Promise<number> {
    const rate = await this.getRate(from, to);
    return amount * rate;
  }

  public async convertMultiple(
    amounts: Array<{ amount: number; from: string; to: string }>
  ): Promise<number[]> {
    // Update rates once for all conversions
    if (this.shouldUpdateRates()) {
      await this.updateRates();
    }

    return Promise.all(
      amounts.map(async ({ amount, from, to }) => {
        const rate = await this.getRate(from, to);
        return amount * rate;
      })
    );
  }

  public getAvailableCurrencies(): string[] {
    return Array.from(this.rates.keys());
  }

  public getCacheAge(): number {
    return Date.now() - this.lastUpdate;
  }

  public isCacheValid(): boolean {
    return !this.shouldUpdateRates();
  }

  public resetRateLimit(): void {
    this.requestCount = 0;
    this.lastReset = Date.now();
    this.emit('rateLimitReset');
  }

  // Cleanup method for proper resource management
  public cleanup(): void {
    this.wsClient.unsubscribe('currency-rates');
    this.wsClient.disconnect();
    this.removeAllListeners();
    this.rates.clear();
  }
}

// Singleton instance
let currencyServiceInstance: CurrencyService | null = null;

export function getCurrencyService(): CurrencyService {
  if (!currencyServiceInstance) {
    currencyServiceInstance = new CurrencyService();
  }
  return currencyServiceInstance;
}

// Clean up singleton on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (currencyServiceInstance) {
      currencyServiceInstance.cleanup();
      currencyServiceInstance = null;
    }
  });

  process.on('SIGINT', () => {
    if (currencyServiceInstance) {
      currencyServiceInstance.cleanup();
      currencyServiceInstance = null;
    }
    process.exit(0);
  });
}