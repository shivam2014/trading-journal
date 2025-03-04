import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import NodeCache from 'node-cache';

const rateSchema = z.object({
  success: z.boolean(),
  timestamp: z.number(),
  base: z.string(),
  rates: z.record(z.number()),
});

interface ConversionRate {
  rate: number;
  timestamp: Date;
}

export class CurrencyConversionService {
  private cache: NodeCache;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour
    this.apiKey = process.env.EXCHANGE_RATES_API_KEY || '';
    this.baseUrl = 'https://api.exchangerate-api.com/v4/latest';
  }

  private getCacheKey(fromCurrency: string, toCurrency: string): string {
    return `${fromCurrency}:${toCurrency}`;
  }

  async getRate(fromCurrency: string, toCurrency: string): Promise<ConversionRate> {
    const cacheKey = this.getCacheKey(fromCurrency, toCurrency);
    const cached = this.cache.get<ConversionRate>(cacheKey);
    if (cached) return cached;

    // Try to get from database first
    const dbRate = await prisma.exchangeRate.findFirst({
      where: {
        baseCurrency: fromCurrency,
        quoteCurrency: toCurrency,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (dbRate && this.isRateValid(dbRate.timestamp)) {
      const rate = {
        rate: parseFloat(dbRate.rate.toString()),
        timestamp: dbRate.timestamp,
      };
      this.cache.set(cacheKey, rate);
      return rate;
    }

    // Fetch from API if not in database or rate is old
    const response = await fetch(`${this.baseUrl}/${fromCurrency}?apikey=${this.apiKey}`);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const validated = rateSchema.parse(data);

    const rate = validated.rates[toCurrency];
    if (!rate) {
      throw new Error(`No rate found for ${toCurrency}`);
    }

    const result = {
      rate,
      timestamp: new Date(validated.timestamp * 1000),
    };

    // Save to database
    await prisma.exchangeRate.create({
      data: {
        baseCurrency: fromCurrency,
        quoteCurrency: toCurrency,
        rate: new Decimal(rate),
        timestamp: result.timestamp,
      },
    });

    this.cache.set(cacheKey, result);
    return result;
  }

  async convert(
    amount: number | Decimal,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return typeof amount === 'number' ? amount : parseFloat(amount.toString());
    }

    const { rate } = await this.getRate(fromCurrency, toCurrency);
    const value = typeof amount === 'number' ? amount : parseFloat(amount.toString());
    return value * rate;
  }

  private isRateValid(timestamp: Date): boolean {
    const now = new Date();
    const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24; // Consider rates valid for 24 hours
  }

  async convertMany(
    amounts: (number | Decimal)[],
    fromCurrency: string,
    toCurrency: string
  ): Promise<number[]> {
    if (fromCurrency === toCurrency) {
      return amounts.map(a => typeof a === 'number' ? a : parseFloat(a.toString()));
    }

    const { rate } = await this.getRate(fromCurrency, toCurrency);
    return amounts.map(amount => {
      const value = typeof amount === 'number' ? amount : parseFloat(amount.toString());
      return value * rate;
    });
  }
}

// Singleton instance
let currencyConversionServiceInstance: CurrencyConversionService | null = null;

export function getCurrencyConversionService(): CurrencyConversionService {
  if (!currencyConversionServiceInstance) {
    currencyConversionServiceInstance = new CurrencyConversionService();
  }
  return currencyConversionServiceInstance;
}