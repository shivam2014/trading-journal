import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TradeGrouping } from '../TradeGrouping';
import { useTradeGroups } from '@/lib/hooks/useTradeGroups';
import { mockToast } from '@/test/mocks/toast';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Decimal
class MockDecimal {
  private value: number;

  constructor(value: number) {
    this.value = value;
  }

  toNumber() {
    return this.value;
  }

  toString() {
    return this.value.toString();
  }
}

// Mock the hooks
jest.mock('@/lib/hooks/useTradeGroups');
jest.mock('@prisma/client/runtime/library', () => ({
  Decimal: MockDecimal
}));

// Sample trade data
const mockTrades = [
  {
    id: '1',
    userId: 'user1',
    brokerTradeId: 'broker1',
    ticker: 'AAPL',
    action: 'BUY',
    quantity: new MockDecimal(100),
    price: new MockDecimal(150.50),
    currency: 'USD',
    timestamp: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    totalAmount: new MockDecimal(15050),
  },
  {
    id: '2',
    userId: 'user1',
    brokerTradeId: 'broker2',
    ticker: 'AAPL',
    action: 'SELL',
    quantity: new MockDecimal(100),
    price: new MockDecimal(155.50),
    currency: 'USD',
    timestamp: new Date('2024-01-02'),
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    totalAmount: new MockDecimal(15550),
  },
];

describe('TradeGrouping', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock hook implementations
    (useTradeGroups as jest.Mock).mockReturnValue({
      groups: [],
      isLoading: false,
      createGroups: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      fetchGroups: jest.fn(),
      calculateAggregateMetrics: jest.fn(),
    });
  });

  it('renders trade grouping interface', () => {
    render(
      <TradeGrouping
        trades={mockTrades}
        defaultCurrency="USD"
        onGroupCreated={() => {}}
      />
    );

    expect(screen.getByText('Trade Groups')).toBeInTheDocument();
    expect(screen.getByText('Create Group')).toBeInTheDocument();
  });

  it('allows trade selection', () => {
    render(
      <TradeGrouping
        trades={mockTrades}
        defaultCurrency="USD"
        onGroupCreated={() => {}}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(checkboxes[0]).toBeChecked();
  });

  it('opens group creation dialog', () => {
    render(
      <TradeGrouping
        trades={mockTrades}
        defaultCurrency="USD"
        onGroupCreated={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Create Group'));

    expect(screen.getByText('Create Trade Group')).toBeInTheDocument();
    expect(screen.getByText('Select grouping options and create a new trade group')).toBeInTheDocument();
  });

  it('creates a trade group', async () => {
    const mockCreateGroups = jest.fn().mockResolvedValue([]);
    (useTradeGroups as jest.Mock).mockReturnValue({
      groups: [],
      isLoading: false,
      createGroups: mockCreateGroups,
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      fetchGroups: jest.fn(),
      calculateAggregateMetrics: jest.fn(),
    });

    render(
      <TradeGrouping
        trades={mockTrades}
        defaultCurrency="USD"
        onGroupCreated={() => {}}
      />
    );

    // Select a trade
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    // Open dialog
    fireEvent.click(screen.getByText('Create Group'));

    // Click create button
    fireEvent.click(screen.getByText('Create Groups'));

    await waitFor(() => {
      expect(mockCreateGroups).toHaveBeenCalledWith(
        ['1'],
        expect.objectContaining({
          strategy: 'ticker',
          minTrades: 2,
        })
      );
    });
  });

  it('shows error when no trades are selected', async () => {
    render(
      <TradeGrouping
        trades={mockTrades}
        defaultCurrency="USD"
        onGroupCreated={() => {}}
      />
    );

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    // Get the primary action button in the dialog
    const createButton = screen.getByRole('button', { name: /Create/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Error',
          description: 'Please select trades to group',
        })
      );
    });
  });

  it('formats currency values correctly', () => {
    render(
      <TradeGrouping
        trades={mockTrades}
        defaultCurrency="USD"
        onGroupCreated={() => {}}
      />
    );

    expect(screen.getByText('$150.50')).toBeInTheDocument();
    expect(screen.getByText('$155.50')).toBeInTheDocument();
  });

  it('displays loading state when creating groups', async () => {
    const mockCreateGroups = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    (useTradeGroups as jest.Mock).mockReturnValue({
      groups: [],
      isLoading: true,
      createGroups: mockCreateGroups,
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      fetchGroups: jest.fn(),
      calculateAggregateMetrics: jest.fn(),
    });

    render(
      <TradeGrouping
        trades={mockTrades}
        defaultCurrency="USD"
        onGroupCreated={() => {}}
      />
    );

    // Select a trade and open dialog
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    // Click the create button
    const createButton = screen.getByRole('button', { name: /Create/i });
    fireEvent.click(createButton);

    expect(await screen.findByText('Creating...')).toBeInTheDocument();
  });
});