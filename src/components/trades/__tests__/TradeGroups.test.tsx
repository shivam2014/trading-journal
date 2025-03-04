import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TradeGroups from '../TradeGroups';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Decimal } from '@prisma/client/runtime/library';
import type { Trade, TradeGroup, TradeGroupEntry } from '@/types/trade';

// Setup mock data
const mockTrades: Trade[] = [
  {
    id: '1',
    userId: 'user1',
    brokerTradeId: 'bt1',
    ticker: 'AAPL',
    action: 'BUY' as const,
    quantity: new Decimal(100),
    price: new Decimal(150),
    totalAmount: new Decimal(15000),
    timestamp: new Date(),
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    userId: 'user1',
    brokerTradeId: 'bt2',
    ticker: 'AAPL',
    action: 'SELL' as const,
    quantity: new Decimal(50),
    price: new Decimal(160),
    totalAmount: new Decimal(8000),
    timestamp: new Date(),
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Create base mock implementations
const defaultGroup: TradeGroup = {
  id: 'group1',
  userId: 'user1',
  ticker: 'AAPL',
  status: 'OPEN',
  entryDate: new Date(),
  initialQuantity: new Decimal(100),
  remainingQuantity: new Decimal(50),
  averageEntryPrice: new Decimal(150),
  currency: 'USD',
  entries: [
    {
      id: 'entry1',
      tradeGroupId: 'group1',
      tradeId: 'trade1',
      quantity: new Decimal(100),
      createdAt: new Date(),
      trade: {
        id: 'trade1',
        userId: 'user1',
        brokerTradeId: 'bt1',
        ticker: 'AAPL',
        action: 'BUY' as const,
        quantity: new Decimal(100),
        price: new Decimal(150),
        currency: 'USD',
        timestamp: new Date(),
        totalAmount: new Decimal(15000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
  ],
  patterns: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock the hooks
const mockCreateGroup = jest.fn();
const mockDeleteGroup = jest.fn();
const mockRefetchGroups = jest.fn();

jest.mock('../../../lib/hooks/useTradeGrouping', () => ({
  useTradeGrouping: () => ({
    groups: [defaultGroup],
    isLoadingGroups: false,
    error: null,
    isCreatingGroup: false,
    createGroup: mockCreateGroup,
    deleteGroup: mockDeleteGroup,
    refetchGroups: mockRefetchGroups,
  })
}));

jest.mock('../../../lib/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  }
}));

// Mock formatters to avoid dependency issues
jest.mock('../../../lib/utils/formatters', () => ({
  formatCurrency: (val: number) => `$${val.toFixed(2)}`,
  formatPercentage: (val: number) => `${val.toFixed(2)}%`,
}));

describe('TradeGroups', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TradeGroups trades={mockTrades} {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders group creation controls', () => {
    renderComponent();
    
    expect(screen.getByText('Trade Groups')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Group' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('handles group creation', async () => {
    mockCreateGroup.mockResolvedValueOnce([{ group: defaultGroup }]);
    renderComponent();

    const button = screen.getByRole('button', { name: 'Create Group' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith(mockTrades);
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('handles group creation failure', async () => {
    const error = new Error('Failed to create group');
    mockCreateGroup.mockRejectedValueOnce(error);
    renderComponent();

    const button = screen.getByRole('button', { name: 'Create Group' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(`Failed to create group: ${error.message}`);
    });
  });

  it('renders trade groups', () => {
    renderComponent();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Number of entries
  });
});