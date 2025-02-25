import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TradeGroups from '../TradeGroups';
import { useTradeGrouping } from '@/lib/hooks/useTradeGrouping';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { toast } from 'sonner';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('@/lib/hooks/useTradeGrouping');
jest.mock('@/lib/hooks/useWebSocket');
jest.mock('sonner');

describe('TradeGroups', () => {
  const mockTrades = [
    {
      id: '1',
      userId: 'user1',
      brokerTradeId: 'bt1',
      ticker: 'AAPL',
      action: 'BUY',
      quantity: new Decimal(100),
      price: new Decimal(150),
      currency: 'USD',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      totalAmount: new Decimal(15000),
    },
    {
      id: '2',
      userId: 'user1',
      brokerTradeId: 'bt2',
      ticker: 'AAPL',
      action: 'SELL',
      quantity: new Decimal(50),
      price: new Decimal(160),
      currency: 'USD',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      totalAmount: new Decimal(8000),
    },
  ];

  const mockGroups = [
    {
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
        { id: 'entry1', tradeId: '1', quantity: new Decimal(100) },
        { id: 'entry2', tradeId: '2', quantity: new Decimal(50) },
      ],
      patterns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useTradeGrouping as jest.Mock).mockReturnValue({
      groups: mockGroups,
      isLoadingGroups: false,
      isCreatingGroup: false,
      error: null,
      createGroup: jest.fn(),
      getGroupMetrics: jest.fn(),
      canGroupTrades: jest.fn().mockReturnValue(true),
      refetchGroups: jest.fn(),
    });
    (useWebSocket as jest.Mock).mockReturnValue({
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TradeGroups trades={mockTrades} />
      </QueryClientProvider>
    );
  };

  it('renders group creation controls', () => {
    renderComponent();

    expect(screen.getByText('Grouping Strategy')).toBeInTheDocument();
    expect(screen.getByText('Minimum Trades')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Group' })).toBeInTheDocument();
  });

  it('handles strategy change', () => {
    renderComponent();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'day' } });

    expect(select).toHaveValue('day');
  });

  it('handles minimum trades change', () => {
    renderComponent();

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '3' } });

    expect(input).toHaveValue(3);
  });

  it('displays loading state', () => {
    (useTradeGrouping as jest.Mock).mockReturnValue({
      ...useTradeGrouping(),
      isLoadingGroups: true,
    });

    renderComponent();

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('displays error state', () => {
    const error = new Error('Failed to load groups');
    (useTradeGrouping as jest.Mock).mockReturnValue({
      ...useTradeGrouping(),
      error,
    });

    renderComponent();

    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it('displays empty state', () => {
    (useTradeGrouping as jest.Mock).mockReturnValue({
      ...useTradeGrouping(),
      groups: [],
    });

    renderComponent();

    expect(screen.getByText(/No trade groups found/)).toBeInTheDocument();
  });

  it('displays trade groups', () => {
    renderComponent();

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of trades
  });

  it('handles group creation', async () => {
    const createGroup = jest.fn().mockResolvedValue({});
    (useTradeGrouping as jest.Mock).mockReturnValue({
      ...useTradeGrouping(),
      createGroup,
    });

    renderComponent();

    const button = screen.getByRole('button', { name: 'Create Group' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(createGroup).toHaveBeenCalledWith(
        mockTrades,
        expect.objectContaining({ strategy: 'ticker' })
      );
      expect(toast.success).toHaveBeenCalledWith('Trade group created successfully');
    });
  });

  it('handles group creation failure', async () => {
    const error = new Error('Failed to create group');
    const createGroup = jest.fn().mockRejectedValue(error);
    (useTradeGrouping as jest.Mock).mockReturnValue({
      ...useTradeGrouping(),
      createGroup,
    });

    renderComponent();

    const button = screen.getByRole('button', { name: 'Create Group' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(error.message);
    });
  });

  it('subscribes to WebSocket updates on mount', () => {
    const subscribe = jest.fn();
    (useWebSocket as jest.Mock).mockReturnValue({
      subscribe,
      unsubscribe: jest.fn(),
    });

    renderComponent();

    expect(subscribe).toHaveBeenCalledWith('trade-groups');
  });
});