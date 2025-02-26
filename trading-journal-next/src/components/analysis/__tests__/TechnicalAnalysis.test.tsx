import { render, screen, fireEvent } from '@testing-library/react';
import TechnicalAnalysis from '../TechnicalAnalysis';
import { useTechnicalAnalysis } from '@/lib/hooks/useTechnicalAnalysis';
import type { Candle, PatternResult, AnalysisResult, MACDOptions } from '@/types/trade';

// Mock the hook correctly
jest.mock('@/lib/hooks/useTechnicalAnalysis', () => ({
  useTechnicalAnalysis: jest.fn()
}));

const mockHookReturn = {
  capabilities: {
    indicators: ['SMA', 'RSI', 'MACD'],
    patterns: ['ENGULFING', 'HAMMER', 'MORNINGSTAR'],
  },
  analysisResult: {
    sma: { '20': [102.00] },
    rsi: [65.00],
    macd: {
      macd: [1.4],
      signal: [1.2],
      histogram: [0.2],
    },
  } as AnalysisResult,
  patterns: [
    {
      type: 'ENGULFING',
      direction: 'BULLISH',
      confidence: 80,
    },
  ] as PatternResult[],
  selectedSMAs: ['20'],
  rsiPeriod: 14,
  macdOptions: {
    fast: 12,
    slow: 26,
    signal: 9,
  } as MACDOptions,
  isLoading: false,
  error: null,
  toggleSMA: jest.fn(),
  setRSIPeriod: jest.fn(),
  setMACDOptions: jest.fn(),
  updateIndicators: jest.fn(),
  isIndicatorAvailable: jest.fn().mockImplementation((name: string) => true),
};

describe('TechnicalAnalysis', () => {
  const mockCandles: Candle[] = [
    { 
      timestamp: new Date('2025-01-01').getTime(),
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useTechnicalAnalysis as jest.Mock).mockReturnValue(mockHookReturn);
  });

  it('renders loading state', () => {
    (useTechnicalAnalysis as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      isLoading: true,
    });

    render(<TechnicalAnalysis candles={mockCandles} />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useTechnicalAnalysis as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      error: new Error('Test error'),
    });

    render(<TechnicalAnalysis candles={mockCandles} />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders patterns and indicators', () => {
    render(<TechnicalAnalysis candles={mockCandles} />);

    // Check patterns
    expect(screen.getByText('ENGULFING')).toBeInTheDocument();
    expect(screen.getByText(/BULLISH/)).toBeInTheDocument();
    expect(screen.getByText(/80/)).toBeInTheDocument();

    // Check indicators
    expect(screen.getByText('SMA20')).toBeInTheDocument();
    expect(screen.getByText('RSI')).toBeInTheDocument();
    
    // Use partial text matching instead of exact match
    expect(screen.getByText(/102\.00/)).toBeInTheDocument();
    expect(screen.getByText(/65\.00/)).toBeInTheDocument();
  });

  it('handles SMA selection changes', () => {
    render(<TechnicalAnalysis candles={mockCandles} />);

    // Better approach for handling select element changes
    const smaSelect = screen.getByRole('listbox');
    
    // Use a more direct approach to simulate selection
    fireEvent.change(smaSelect, {
      target: {
        value: '50'
      }
    });

    expect(mockHookReturn.toggleSMA).toHaveBeenCalledWith('50');
  });

  it('handles RSI period changes', () => {
    render(<TechnicalAnalysis candles={mockCandles} />);

    // Use getByDisplayValue to find the input with a value of 14
    const rsiInput = screen.getByDisplayValue('14');
    fireEvent.change(rsiInput, { target: { value: '21' } });

    expect(mockHookReturn.setRSIPeriod).toHaveBeenCalledWith(21);
  });

  it('handles MACD options changes', () => {
    render(<TechnicalAnalysis candles={mockCandles} />);

    const fastInput = screen.getByPlaceholderText('Fast');
    fireEvent.change(fastInput, { target: { value: '10' } });

    expect(mockHookReturn.setMACDOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        fast: 10,
        slow: 26,
        signal: 9,
      })
    );
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<TechnicalAnalysis candles={mockCandles} className={customClass} />);

    const container = screen.getByTestId('technical-analysis');
    expect(container).toHaveClass(customClass);
  });
});