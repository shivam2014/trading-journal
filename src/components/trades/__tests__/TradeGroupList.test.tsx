import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TradeGroupList } from '../TradeGroupList';
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

// Sample group and metrics data
const mockGroups = [
  {
    group: {
      id: '1',
      userId: 'user1',
      ticker: 'AAPL',
      status: 'OPEN',
      entryDate: new Date('2024-01-01'),
      exitDate: null,
      initialQuantity: new MockDecimal(100),
      remainingQuantity: new MockDecimal(50),
      averageEntryPrice: new MockDecimal(150.50),
      currency: 'USD',
      notes: 'Test group',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      entries: [],
      patterns: [],
    },
    metrics: {
      totalTrades: 2,
      winningTrades: 1,
      losingTrades: 1,
      breakEvenTrades: 0,
      profitFactor: 1.2,
      averageWin: 500,
      averageLoss: 300,
      maxDrawdown: 300,
      winRate: 0.5,
      expectancy: 100,
      remainingQuantity: 50,
      realizedPnl: 200,
    },
  },
];

describe('TradeGroupList', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock hook implementations
    (useTradeGroups as jest.Mock).mockReturnValue({
      groups: mockGroups,
      isLoading: false,
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      fetchGroups: jest.fn(),
      calculateAggregateMetrics: jest.fn().mockReturnValue({
        totalTrades: 2,
        winningTrades: 1,
        losingTrades: 1,
        breakEvenTrades: 0,
        profitFactor: 1.2,
        averageWin: 500,
        averageLoss: 300,
        maxDrawdown: 300,
        winRate: 0.5,
        expectancy: 100,
        remainingQuantity: 50,
        realizedPnl: 200,
      }),
    });
  });

  it('renders trade group list', () => {
    render(
      <TradeGroupList
        defaultCurrency="USD"
        onGroupUpdated={() => {}}
      />
    );

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });

  it('applies filters correctly', async () => {
    const mockFetchGroups = jest.fn();
    (useTradeGroups as jest.Mock).mockReturnValue({
      groups: mockGroups,
      isLoading: false,
      fetchGroups: mockFetchGroups,
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      calculateAggregateMetrics: jest.fn(),
    });

    render(
      <TradeGroupList
        defaultCurrency="USD"
        onGroupUpdated={() => {}}
      />
    );

    // Change status filter
    fireEvent.click(screen.getByText('All Status'));
    fireEvent.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(mockFetchGroups).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'OPEN',
        })
      );
    });
  });

  it('allows group selection and shows summary', () => {
    render(
      <TradeGroupList
        defaultCurrency="USD"
        onGroupUpdated={() => {}}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(screen.getByText('Selected Groups Summary')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument(); // Win rate
    expect(screen.getByText('1.20')).toBeInTheDocument(); // Profit factor
  });

  it('expands group details', async () => {
    render(
      <TradeGroupList
        defaultCurrency="USD"
        onGroupUpdated={() => {}}
      />
    );

    // Find and click the expand button
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    // Check that details are shown
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
    expect(screen.getByText('Average Win')).toBeInTheDocument();
    expect(screen.getByText('Average Loss')).toBeInTheDocument();
  });

  it('updates group notes', async () => {
    const mockUpdateGroup = jest.fn().mockResolvedValue({});
    (useTradeGroups as jest.Mock).mockReturnValue({
      groups: mockGroups,
      isLoading: false,
      updateGroup: mockUpdateGroup,
      deleteGroup: jest.fn(),
      fetchGroups: jest.fn(),
      calculateAggregateMetrics: jest.fn(),
    });

    render(
      <TradeGroupList
        defaultCurrency="USD"
        onGroupUpdated={() => {}}
      />
    );

    // Expand group
    fireEvent.click(screen.getByRole('button', { name: /expand/i }));

    // Update notes
    const notesInput = screen.getByPlaceholderText('Add notes...');
    fireEvent.change(notesInput, { target: { value: 'New test note' } });
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(mockUpdateGroup).toHaveBeenCalledWith('1', {
        notes: 'New test note',
      });
    });
  });

  it('deletes a group after confirmation', async () => {
    const mockDeleteGroup = jest.fn().mockResolvedValue(true);
    (useTradeGroups as jest.Mock).mockReturnValue({
      groups: mockGroups,
      isLoading: false,
      updateGroup: jest.fn(),
      deleteGroup: mockDeleteGroup,
      fetchGroups: jest.fn(),
      calculateAggregateMetrics: jest.fn(),
    });

    render(
      <TradeGroupList
        defaultCurrency="USD"
        onGroupUpdated={() => {}}
      />
    );

    // Expand group
    fireEvent.click(screen.getByRole('button', { name: /expand/i }));

    // Click delete button and confirm
    fireEvent.click(screen.getByText('Delete Group'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockDeleteGroup).toHaveBeenCalledWith('1');
    });
  });

  it('displays loading skeleton when loading', () => {
    (useTradeGroups as jest.Mock).mockReturnValue({
      groups: [],
      isLoading: true,
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      fetchGroups: jest.fn(),
      calculateAggregateMetrics: jest.fn(),
    });

    render(
      <TradeGroupList
        defaultCurrency="USD"
        onGroupUpdated={() => {}}
      />
    );

    // Check for skeleton elements
    const skeletons = document.getElementsByClassName('animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('changes group status', async () => {
    const mockUpdateGroup = jest.fn().mockResolvedValue({});
    (useTradeGroups as jest.Mock).mockReturnValue({
      groups: mockGroups,
      isLoading: false,
      updateGroup: mockUpdateGroup,
      deleteGroup: jest.fn(),
      fetchGroups: jest.fn(),
      calculateAggregateMetrics: jest.fn(),
    });

    render(
      <TradeGroupList
        defaultCurrency="USD"
        onGroupUpdated={() => {}}
      />
    );

    // Expand group
    fireEvent.click(screen.getByRole('button', { name: /expand/i }));

    // Click the close group button
    fireEvent.click(screen.getByText('Close Group'));

    await waitFor(() => {
      expect(mockUpdateGroup).toHaveBeenCalledWith('1', {
        status: 'CLOSED',
      });
    });
  });
});