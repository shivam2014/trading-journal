import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrencyConversionService } from '@/lib/services/currency-conversion';
import { useSession } from 'next-auth/react';
import type { Decimal } from '@prisma/client/runtime/library';
import { useWebSocket } from './useWebSocket';

interface UseCurrencyOptions {
  defaultCurrency?: string;
  onError?: (error: Error) => void;
}

export function useCurrency(options: UseCurrencyOptions = {}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const conversionService = getCurrencyConversionService();

  // Handle WebSocket updates
  const { subscribe, unsubscribe, isConnected } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'CURRENCY_UPDATE') {
        queryClient.setQueryData(['currencies'], Object.keys(data.rates));
      }
    }
  });

  // Query available currencies
  const {
    data: availableCurrencies = [],
    isLoading: isLoadingCurrencies,
    error: currenciesError,
    refetch: refetchCurrencies
  } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await fetch('/api/currency/rates');
      if (!response.ok) {
        throw new Error('Failed to fetch currency rates');
      }
      const data = await response.json();
      return Object.keys(data.rates);
    },
  });

  // Query user's preferred currency
  const {
    data: preferredCurrency,
    isLoading,
    error: preferredCurrencyError,
  } = useQuery({
    queryKey: ['userPreferences', 'currency'],
    queryFn: async () => {
      if (!session?.user?.id) return options.defaultCurrency || 'USD';

      const response = await fetch('/api/settings/currency');
      if (!response.ok) {
        throw new Error('Failed to fetch currency preference');
      }

      const { currency } = await response.json();
      return currency || options.defaultCurrency || 'USD';
    },
  });

  // Convert a single value
  const convert = useCallback(async (
    amount: number | Decimal,
    fromCurrency: string,
    toCurrency?: string
  ): Promise<number> => {
    const targetCurrency = toCurrency || preferredCurrency || 'USD';
    try {
      return await conversionService.convert(amount, fromCurrency, targetCurrency);
    } catch (error) {
      options.onError?.(error as Error);
      return typeof amount === 'number' ? amount : parseFloat(amount.toString());
    }
  }, [conversionService, preferredCurrency, options.onError]);

  // Convert batch of values
  const convertBatch = useCallback(async (
    amounts: (number | Decimal)[],
    fromCurrency: string,
    toCurrency?: string
  ): Promise<number[]> => {
    const targetCurrency = toCurrency || preferredCurrency || 'USD';
    try {
      return await conversionService.convertMany(amounts, fromCurrency, targetCurrency);
    } catch (error) {
      options.onError?.(error as Error);
      return amounts.map(a => typeof a === 'number' ? a : parseFloat(a.toString()));
    }
  }, [conversionService, preferredCurrency, options.onError]);

  // Subscribe to currency updates
  useEffect(() => {
    if (isConnected) {
      subscribe('currency-rates');
      return () => unsubscribe('currency-rates');
    }
  }, [isConnected, subscribe, unsubscribe]);

  return {
    preferredCurrency,
    availableCurrencies,
    isLoading: isLoading || isLoadingCurrencies || isUpdating,
    error: currenciesError || preferredCurrencyError,
    convert,
    convertBatch,
    refetchCurrencies,
  };
}