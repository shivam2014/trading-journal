import { Decimal } from '@prisma/client/runtime/library';
import { format } from 'date-fns';

/**
 * Formats a date or timestamp into a date string
 */
export function formatDate(date: Date | number | string): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  return format(dateObj, 'MMM dd, yyyy');
}

/**
 * Formats a date or timestamp into a time string
 */
export function formatTime(date: Date | number | string): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  return format(dateObj, 'HH:mm:ss');
}

/**
 * Formats a date or timestamp into a datetime string
 */
export function formatDateTime(date: Date | number | string): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  return format(dateObj, 'MMM dd, yyyy HH:mm');
}

/**
 * Formats a number as a currency
 */
export function formatCurrency(
  amount: number | string | Decimal,
  currency = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  const numAmount = typeof amount === 'object' ? amount.toNumber() : Number(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(numAmount);
}

/**
 * Formats a number as a percentage
 */
export function formatPercentage(
  value: number | string | Decimal,
  options?: Intl.NumberFormatOptions
): string {
  const numValue = typeof value === 'object' ? value.toNumber() : Number(value);
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(numValue / 100);
}

/**
 * Formats a number with two decimal places
 */
export const formatNumber = (num: number | string | Decimal): string => {
  const value = typeof num === 'object' ? num.toNumber() : Number(num);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};