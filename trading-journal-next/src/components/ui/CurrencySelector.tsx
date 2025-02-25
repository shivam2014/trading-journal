'use client';

import { useEffect } from 'react';
import { useCurrency } from '@/lib/hooks/useCurrency';

interface CurrencySelectorProps {
  value?: string;
  onChange?: (currency: string) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export default function CurrencySelector({
  value,
  onChange,
  className = '',
  label = 'Currency',
  disabled = false,
}: CurrencySelectorProps) {
  const {
    selectedCurrency,
    setSelectedCurrency,
    availableCurrencies,
    isLoadingCurrencies,
    error,
  } = useCurrency({
    defaultCurrency: value,
  });

  // Sync external value with internal state
  useEffect(() => {
    if (value && value !== selectedCurrency) {
      setSelectedCurrency(value);
    }
  }, [value, selectedCurrency, setSelectedCurrency]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange && selectedCurrency !== value) {
      onChange(selectedCurrency);
    }
  }, [onChange, selectedCurrency, value]);

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor="currency-select"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id="currency-select"
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          disabled={disabled || isLoadingCurrencies}
          className={`
            block w-full rounded-md border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800 py-2 pl-3 pr-10 text-base
            focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
            disabled:bg-gray-100 dark:disabled:bg-gray-700
            disabled:cursor-not-allowed sm:text-sm
            ${className}
            ${error ? 'border-red-300 dark:border-red-600' : ''}
          `}
        >
          {isLoadingCurrencies ? (
            <option value="">Loading currencies...</option>
          ) : error ? (
            <option value="">Error loading currencies</option>
          ) : availableCurrencies.length === 0 ? (
            <option value="">No currencies available</option>
          ) : (
            availableCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))
          )}
        </select>

        {/* Loading indicator */}
        {isLoadingCurrencies && (
          <div className="absolute right-2 top-2">
            <svg
              className="animate-spin h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}

        {/* Error indicator */}
        {error && !isLoadingCurrencies && (
          <div className="absolute right-2 top-2">
            <svg
              className="h-5 w-5 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error instanceof Error ? error.message : 'Failed to load currencies'}
        </p>
      )}
    </div>
  );
}