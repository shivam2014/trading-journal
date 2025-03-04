import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TechnicalAnalysis } from '../TechnicalAnalysis';
import { useTechnicalAnalysis } from '@/lib/hooks/useTechnicalAnalysis';
import type { Candle, PatternResult, AnalysisResult, MACDOptions } from '@/types/trade';
import { getTechnicalAnalysisService } from '@/lib/services/technical-analysis';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: () => null
}));

// Mock hooks and services
jest.mock('@/lib/hooks/useTechnicalAnalysis', () => ({
  useTechnicalAnalysis: jest.fn()
}));

const mockCalculateIndicators = jest.fn();
const mockDetectPatterns = jest.fn();

jest.mock('@/lib/services/technical-analysis', () => ({
  getTechnicalAnalysisService: jest.fn(() => ({
    calculateIndicators: mockCalculateIndicators,
    detectPatterns: mockDetectPatterns
  }))
}));

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
let mockOnMessage: ((data: any) => void) | null = null;

jest.mock('@/lib/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(({ onMessage }) => {
    mockOnMessage = onMessage;
    return {
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe
    };
  })
}));

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
    // Reset mocks to default successful responses
    mockCalculateIndicators.mockResolvedValue({
      'SMA20': [{ value: 102 }],
      'RSI': [{ value: 65 }]
    });
    mockDetectPatterns.mockResolvedValue([{
      type: 'ENGULFING',
      direction: 'BULLISH',
      confidence: 0.8,
      timestamp: new Date('2025-01-01').getTime(),
      price: 102
    }]);
  });

  it('renders loading state initially', async () => {
    // Create a promise that won't resolve immediately
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockCalculateIndicators.mockImplementation(() => promise);

    render(<TechnicalAnalysis candles={mockCandles} />);
    
    // Loading state should be visible immediately
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders with provided candles', async () => {
    await act(async () => {
      render(<TechnicalAnalysis candles={mockCandles} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('ENGULFING')).toBeInTheDocument();
    });

    const pattern = await screen.findByText('BULLISH');
    expect(pattern).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('renders with symbol-based data fetching', async () => {
    await act(async () => {
      render(<TechnicalAnalysis symbol="AAPL" />);
    });
    
    expect(mockSubscribe).toHaveBeenCalledWith('price-updates-AAPL');

    // Verify cleanup
    const { unmount } = render(<TechnicalAnalysis symbol="AAPL" />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledWith('price-updates-AAPL');
  });

  it('applies custom className', async () => {
    const customClass = 'custom-class';
    await act(async () => {
      render(<TechnicalAnalysis candles={mockCandles} className={customClass} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('technical-analysis')).toHaveClass(customClass);
    });
  });

  it('handles empty candles state', async () => {
    await act(async () => {
      render(<TechnicalAnalysis candles={[]} />);
    });
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('updates indicators when new candles arrive via WebSocket', async () => {
    await act(async () => {
      render(<TechnicalAnalysis candles={mockCandles} />);
    });

    expect(mockOnMessage).toBeTruthy();
    
    const newCandle = {
      timestamp: new Date('2025-01-02').getTime(),
      open: 101,
      high: 106,
      low: 96,
      close: 103,
      volume: 1100
    };
    
    await act(async () => {
      mockOnMessage?.({ type: 'CANDLE_UPDATE', data: newCandle });
    });

    await waitFor(() => {
      expect(mockCalculateIndicators).toHaveBeenCalledWith([...mockCandles, newCandle]);
      expect(mockDetectPatterns).toHaveBeenCalledWith([...mockCandles, newCandle]);
    });
  });

  it('shows error state when calculation fails', async () => {
    const errorMessage = 'Test error';
    mockCalculateIndicators.mockRejectedValueOnce(new Error(errorMessage));

    await act(async () => {
      render(<TechnicalAnalysis candles={mockCandles} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Error calculating indicators/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles WebSocket reconnection gracefully', async () => {
    await act(async () => {
      render(<TechnicalAnalysis symbol="AAPL" />);
    });

    // Simulate disconnect
    await act(async () => {
      mockOnMessage?.({ type: 'DISCONNECT' });
    });

    // Verify resubscribe on reconnect
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockSubscribe).toHaveBeenLastCalledWith('price-updates-AAPL');
  });

  it('updates patterns when new candle data arrives', async () => {
    await act(async () => {
      render(<TechnicalAnalysis candles={mockCandles} />);
    });

    const newPattern = {
      type: 'DOJI',
      direction: 'NEUTRAL',
      confidence: 0.9,
      timestamp: new Date('2025-01-02').getTime(),
      price: 103
    };

    mockDetectPatterns.mockResolvedValueOnce([newPattern]);

    await act(async () => {
      mockOnMessage?.({ type: 'PATTERN_DETECTED', data: newPattern });
    });

    await waitFor(() => {
      expect(screen.getByText('NEUTRAL')).toBeInTheDocument();
      expect(screen.getByText('90.0%')).toBeInTheDocument();
    });
  });

  it('handles invalid WebSocket messages gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await act(async () => {
      render(<TechnicalAnalysis symbol="AAPL" />);
    });

    await act(async () => {
      mockOnMessage?.({ type: 'INVALID_TYPE', data: {} });
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('batches multiple rapid WebSocket updates', async () => {
    jest.useFakeTimers();
    
    await act(async () => {
      render(<TechnicalAnalysis candles={mockCandles} />);
    });

    await act(async () => {
      for (let i = 0; i < 5; i++) {
        mockOnMessage?.({
          type: 'CANDLE_UPDATE',
          data: {
            timestamp: new Date(`2025-01-0${i + 2}`).getTime(),
            open: 100 + i,
            high: 105 + i,
            low: 95 + i,
            close: 102 + i,
            volume: 1000 + (i * 100)
          }
        });
      }
    });

    // Fast-forward timers to trigger the batched update
    await act(async () => {
      jest.runAllTimers();
    });

    // Should only calculate once for the batch
    expect(mockCalculateIndicators).toHaveBeenCalledTimes(2); // Initial + batch
    expect(mockDetectPatterns).toHaveBeenCalledTimes(2); // Initial + batch

    jest.useRealTimers();
  });

  describe('Pattern Batching', () => {
    it('should batch multiple pattern updates', async () => {
      await act(async () => {
        render(<TechnicalAnalysis candles={mockCandles} />);
      });

      // Simulate rapid pattern detections
      await act(async () => {
        const patterns = [
          {
            type: 'DOJI',
            direction: 'NEUTRAL',
            confidence: 0.85,
            timestamp: Date.now(),
            price: 102
          },
          {
            type: 'ENGULFING',
            direction: 'BULLISH',
            confidence: 0.9,
            timestamp: Date.now(),
            price: 102
          }
        ];

        patterns.forEach(pattern => {
          mockOnMessage?.({ type: 'PATTERN_DETECTED', data: pattern });
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should render both patterns in a single update
      expect(screen.getAllByTestId('pattern-indicator')).toHaveLength(2);
    });

    it('should deduplicate similar patterns', async () => {
      await act(async () => {
        render(<TechnicalAnalysis candles={mockCandles} />);
      });

      // Simulate duplicate pattern detections
      await act(async () => {
        const pattern = {
          type: 'DOJI',
          direction: 'NEUTRAL',
          confidence: 0.85,
          timestamp: Date.now(),
          price: 102
        };

        // Send same pattern multiple times
        for (let i = 0; i < 3; i++) {
          mockOnMessage?.({ type: 'PATTERN_DETECTED', data: pattern });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should only render one instance of the pattern
      expect(screen.getAllByTestId('pattern-indicator')).toHaveLength(1);
    });

    it('should prioritize higher confidence patterns', async () => {
      await act(async () => {
        render(<TechnicalAnalysis candles={mockCandles} />);
      });

      const timestamp = Date.now();
      
      // Send patterns with different confidence levels
      await act(async () => {
        const patterns = [
          {
            type: 'DOJI',
            direction: 'NEUTRAL',
            confidence: 0.6,
            timestamp,
            price: 102
          },
          {
            type: 'DOJI',
            direction: 'NEUTRAL',
            confidence: 0.9,
            timestamp,
            price: 102
          }
        ];

        patterns.forEach(pattern => {
          mockOnMessage?.({ type: 'PATTERN_DETECTED', data: pattern });
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should display the higher confidence pattern
      const confidenceElement = screen.getByText('90.0%');
      expect(confidenceElement).toBeInTheDocument();
    });
  });
});