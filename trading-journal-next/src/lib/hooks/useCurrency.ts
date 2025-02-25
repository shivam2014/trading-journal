import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

interface ConversionRequest {
  amount: number;
  from: string;
  to: string;
}

interface ConversionResult extends ConversionRequest {
  result: number;
  timestamp: number;
}

interface BatchConversionResponse {
  results: ConversionResult[];
}

interface CurrencyData {
  availableCurrencies: string[];
  cacheAge: number;
  timestamp: number;
}

interface CurrencyError {
  error: string;
  details?: string | unknown[];
}

interface UseCurrencyOptions {
  defaultCurrency?: string;
  autoCacheRefresh?: boolean;
  cacheStaleTime?: number;
}

export function useCurrency({
  defaultCurrency = 'USD',
  autoCacheRefresh = true,
  cacheStaleTime = 3600000, // 1 hour
}: UseCurrencyOptions = {}) {
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);

  // Fetch available currencies
  const { 
    data: currencyData,
    isPending: isLoadingCurrencies,
    error: currencyError,
    refetch: refetchCurrencies,
  } = useQuery<CurrencyData, CurrencyError>({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await fetch('/api/currency/convert');
      if (!response.ok) {
        throw new Error('Failed to fetch currencies');
      }
      return response.json();
    },
    staleTime: cacheStaleTime,
  });

  // Convert amount mutation
  const { 
    mutateAsync: convert,
    isPending: isConverting,
    error: conversionError,
  } = useMutation<ConversionResult, CurrencyError, ConversionRequest>({
    mutationFn: async ({ amount, from, to }: ConversionRequest) => {
      const response = await fetch('/api/currency/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, from, to }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Conversion failed');
      }

      return response.json();
    },
  });

  // Batch convert mutation
  const {
    mutateAsync: convertBatch,
    isPending: isConvertingBatch,
    error: batchConversionError,
  } = useMutation<BatchConversionResponse, CurrencyError, ConversionRequest[]>({
    mutationFn: async (conversions: ConversionRequest[]) => {
      const response = await fetch('/api/currency/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversions),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Batch conversion failed');
      }

      return response.json();
    },
  });

  // Convenience method to convert to selected currency
  const convertToSelected = useCallback(
    async (amount: number, from: string): Promise<ConversionResult> => {
      return convert({ amount, from, to: selectedCurrency });
    },
    [convert, selectedCurrency]
  );

  // Auto refresh currency cache if enabled
  useEffect(() => {
    if (!autoCacheRefresh) return;

    const interval = setInterval(() => {
      refetchCurrencies();
    }, cacheStaleTime);

    return () => clearInterval(interval);
  }, [autoCacheRefresh, cacheStaleTime, refetchCurrencies]);

  // Format amount in currency
  const formatCurrency = useCallback(
    (amount: number, currency: string = selectedCurrency): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 8, // For crypto currencies
      }).format(amount);
    },
    [selectedCurrency]
  );

  return {
    // State
    selectedCurrency,
    setSelectedCurrency,
    availableCurrencies: currencyData?.availableCurrencies || [],
    cacheAge: currencyData?.cacheAge || 0,
    
    // Loading states
    isLoadingCurrencies,
    isConverting,
    isConvertingBatch,
    
    // Error states
    error: currencyError || conversionError || batchConversionError,
    
    // Methods
    convert,
    convertBatch,
    convertToSelected,
    formatCurrency,
    refetchCurrencies,
  } as const;
}

// Export types for consumers
export type { 
  ConversionRequest,
  ConversionResult,
  BatchConversionResponse,
  CurrencyData,
  CurrencyError,
  UseCurrencyOptions,
};