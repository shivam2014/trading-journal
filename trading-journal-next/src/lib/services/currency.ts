import { z } from 'zod';

// Rate response schema
const rateResponseSchema = z.object({
  base: z.string(),
  rates: z.record(z.number()),
  timestamp: z.number(),
});

export type ExchangeRates = z.infer<typeof rateResponseSchema>;

export class CurrencyService {
  private rates: Map<string, number> = new Map();
  private lastUpdate: number = 0;
  private readonly cacheTimeout = 3600000; // 1 hour in milliseconds

  constructor(
    private readonly apiKey: string = process.env.OPEN_EXCHANGE_RATES_APP_ID || '',
    private readonly baseCurrency: string = 'USD'
  ) {}

  private async fetchRates(): Promise<ExchangeRates> {
    if (!this.apiKey) {
      throw new Error('OpenExchangeRates API key not configured');
    }

    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${this.apiKey}&base=${this.baseCurrency}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data = await response.json();
    return rateResponseSchema.parse(data);
  }

  private shouldUpdateRates(): boolean {
    return (
      this.rates.size === 0 ||
      Date.now() - this.lastUpdate > this.cacheTimeout
    );
  }

  public async updateRates(): Promise<void> {
    try {
      const { rates, timestamp } = await this.fetchRates();
      this.rates.clear();
      Object.entries(rates).forEach(([currency, rate]) => {
        this.rates.set(currency, rate);
      });
      this.lastUpdate = timestamp * 1000; // Convert to milliseconds
    } catch (error) {
      console.error('Error updating exchange rates:', error);
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
}

// Singleton instance
let currencyServiceInstance: CurrencyService | null = null;

export function getCurrencyService(): CurrencyService {
  if (!currencyServiceInstance) {
    currencyServiceInstance = new CurrencyService();
  }
  return currencyServiceInstance;
}