import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TechnicalAnalysis from '../TechnicalAnalysis';
import { useTechnicalAnalysis } from '@/lib/hooks/useTechnicalAnalysis';

// Mock the technical analysis hook
jest.mock('@/lib/hooks/useTechnicalAnalysis');

const mockCandles = [
  { timestamp: 1000, open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  { timestamp: 2000, open: 103, high: 107, low: 101, close: 105, volume: 1200 },
  { timestamp: 3000, open: 105, high: 108, low: 103, close: 106, volume: 1100 },
];

const mockPatterns = [
  {
    pattern: 'CDL_ENGULFING',
    direction: 'bullish',
    startIndex: 1,
    endIndex: 2,
    confidence: 0.8,
  },
];

const mockIndicators = {
  SMA20: [
    { timestamp: 1000, value: 100 },
    { timestamp: 2000, value: 102 },
  ],
  RSI: [
    { timestamp: 1000, value: 55 },
    { timestamp: 2000, value: 65 },
  ],
};

describe('TechnicalAnalysis', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Default mock implementation
    (useTechnicalAnalysis as jest.Mock).mockReturnValue({
      capabilities: {
        availableIndicators: {
          sma: { description: 'Simple Moving Average', parameters: ['period'] },
          rsi: { description: 'RSI', parameters: ['period'] },
        },
      },
      patterns: mockPatterns,
      indicators: mockIndicators,
      isLoadingCapabilities: false,
      isAnalyzing: false,
      error: null,
      analyze: jest.fn(),
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  it('renders all indicator selection controls', () => {
    renderWithProviders(<TechnicalAnalysis candles={mockCandles} />);

    expect(screen.getByText('Simple Moving Averages')).toBeInTheDocument();
    expect(screen.getByText('RSI Period')).toBeInTheDocument();
    expect(screen.getByText('MACD')).toBeInTheDocument();
  });

  it('displays loading state while analyzing', () => {
    (useTechnicalAnalysis as jest.Mock).mockReturnValue({
      isAnalyzing: true,
      patterns: [],
      indicators: {},
    });

    renderWithProviders(<TechnicalAnalysis candles={mockCandles} />);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
  });

  it('displays error message when analysis fails', () => {
    const error = new Error('Analysis failed');
    (useTechnicalAnalysis as jest.Mock).mockReturnValue({
      error,
      patterns: [],
      indicators: {},
    });

    renderWithProviders(<TechnicalAnalysis candles={mockCandles} />);

    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it('displays detected patterns', () => {
    renderWithProviders(<TechnicalAnalysis candles={mockCandles} />);

    expect(screen.getByText('ENGULFING')).toBeInTheDocument();
    expect(screen.getByText('BULLISH (80% confidence)')).toBeInTheDocument();
  });

  it('displays indicator values', () => {
    renderWithProviders(<TechnicalAnalysis candles={mockCandles} />);

    expect(screen.getByText('SMA20')).toBeInTheDocument();
    expect(screen.getByText('Latest: 102.00')).toBeInTheDocument();
  });

  it('handles SMA period selection', async () => {
    const mockAnalyze = jest.fn();
    (useTechnicalAnalysis as jest.Mock).mockReturnValue({
      capabilities: {
        availableIndicators: {
          sma: { description: 'Simple Moving Average', parameters: ['period'] },
        },
      },
      patterns: [],
      indicators: {},
      analyze: mockAnalyze,
    });

    renderWithProviders(<TechnicalAnalysis candles={mockCandles} />);

    const select = screen.getByRole('listbox');
    fireEvent.change(select, {
      target: { value: ['20', '50'] },
    });

    await waitFor(() => {
      expect(useTechnicalAnalysis).toHaveBeenCalledWith(
        mockCandles,
        expect.objectContaining({
          sma: [20, 50],
        }),
        expect.any(Object)
      );
    });
  });

  it('handles RSI period change', async () => {
    renderWithProviders(<TechnicalAnalysis candles={mockCandles} />);

    const input = screen.getByLabelText('RSI Period');
    fireEvent.change(input, { target: { value: '21' } });

    await waitFor(() => {
      expect(useTechnicalAnalysis).toHaveBeenCalledWith(
        mockCandles,
        expect.objectContaining({
          rsi: 21,
        }),
        expect.any(Object)
      );
    });
  });

  it('handles MACD parameter changes', async () => {
    renderWithProviders(<TechnicalAnalysis candles={mockCandles} />);

    const [fastInput, slowInput, signalInput] = screen.getAllByRole('spinbutton').slice(1);

    fireEvent.change(fastInput, { target: { value: '8' } });
    fireEvent.change(slowInput, { target: { value: '21' } });
    fireEvent.change(signalInput, { target: { value: '5' } });

    await waitFor(() => {
      expect(useTechnicalAnalysis).toHaveBeenCalledWith(
        mockCandles,
        expect.objectContaining({
          macd: {
            fast: 8,
            slow: 21,
            signal: 5,
          },
        }),
        expect.any(Object)
      );
    });
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    renderWithProviders(
      <TechnicalAnalysis candles={mockCandles} className={customClass} />
    );

    const container = screen.getByRole('region');
    expect(container).toHaveClass(customClass);
  });
});