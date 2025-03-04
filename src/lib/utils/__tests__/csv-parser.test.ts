import {
  parseCSV,
  validateTrades,
  convertToDecimal,
  formatCSVError,
  type CSVTrade,
} from '../csv-parser';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';

describe('CSV Parser', () => {
  const validCSV = `action,ticker,quantity,price,currency,timestamp
BUY,AAPL,100,150.50,USD,2025-01-01T12:00:00Z
SELL,GOOGL,50,2500.75,USD,2025-01-02T12:00:00Z`;

  const invalidCSV = `action,ticker,quantity,price,currency,timestamp
BUY,AAPL,invalid,150.50,USD,2025-01-01T12:00:00Z`;

  describe('parseCSV', () => {
    it('should parse valid CSV content', () => {
      const trades = parseCSV(validCSV);
      expect(trades).toHaveLength(2);
      expect(trades[0]).toEqual({
        action: 'BUY',
        ticker: 'AAPL',
        quantity: 100,
        price: 150.50,
        currency: 'USD',
        timestamp: new Date('2025-01-01T12:00:00Z'),
      });
    });

    it('should throw error for missing required columns', () => {
      const csvWithMissingColumn = 'action,ticker,quantity,price,timestamp\nBUY,AAPL,100,150.50,2025-01-01';
      expect(() => parseCSV(csvWithMissingColumn)).toThrow('Missing required column: currency');
    });

    it('should throw error for invalid data', () => {
      expect(() => parseCSV(invalidCSV)).toThrow('Error parsing row 2');
    });

    it('should throw error for empty CSV', () => {
      expect(() => parseCSV('')).toThrow('CSV file is empty or has no data rows');
    });

    it('should handle optional notes column', () => {
      const csvWithNotes = `${validCSV.split('\n')[0]},notes\nBUY,AAPL,100,150.50,USD,2025-01-01T12:00:00Z,test note`;
      const trades = parseCSV(csvWithNotes);
      expect(trades[0].notes).toBe('test note');
    });
  });

  describe('validateTrades', () => {
    const now = new Date();
    const validTrades: CSVTrade[] = [
      {
        action: 'BUY',
        ticker: 'AAPL',
        quantity: 100,
        price: 150.50,
        currency: 'USD',
        timestamp: new Date('2025-01-01T12:00:00Z'),
      },
    ];

    it('should validate valid trades without throwing', () => {
      expect(() => validateTrades(validTrades)).not.toThrow();
    });

    it('should throw error for zero quantity', () => {
      const invalidTrade = { ...validTrades[0], quantity: 0 };
      expect(() => validateTrades([invalidTrade])).toThrow('Quantity cannot be zero');
    });

    it('should throw error for zero price', () => {
      const invalidTrade = { ...validTrades[0], price: 0 };
      expect(() => validateTrades([invalidTrade])).toThrow('Price cannot be zero');
    });

    it('should throw error for future dates', () => {
      const invalidTrade = { ...validTrades[0], timestamp: new Date(now.getTime() + 86400000) };
      expect(() => validateTrades([invalidTrade])).toThrow('Trade date cannot be in the future');
    });

    it('should throw error for invalid currency code', () => {
      const invalidTrade = { ...validTrades[0], currency: 'USDD' };
      expect(() => validateTrades([invalidTrade])).toThrow('Invalid currency code format');
    });
  });

  describe('convertToDecimal', () => {
    it('should convert number to Decimal', () => {
      const result = convertToDecimal(150.50);
      expect(result).toBeInstanceOf(Decimal);
      expect(result.toString()).toBe('150.50');
    });

    it('should handle integers', () => {
      const result = convertToDecimal(100);
      expect(result.toString()).toBe('100');
    });

    it('should handle zero', () => {
      const result = convertToDecimal(0);
      expect(result.toString()).toBe('0');
    });
  });

  describe('formatCSVError', () => {
    it('should format Zod error', () => {
      const error = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: ['quantity'],
          message: 'Expected number, received string',
        },
      ]);
      expect(formatCSVError(error)).toBe('quantity: Expected number, received string');
    });

    it('should format regular Error', () => {
      const error = new Error('Test error');
      expect(formatCSVError(error)).toBe('Test error');
    });

    it('should handle unknown error type', () => {
      expect(formatCSVError(null)).toBe('Unknown error occurred');
    });
  });
});