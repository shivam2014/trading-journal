import { render, screen } from '@testing-library/react';
import TradeTable from '../TradeTable';
import { Decimal } from '@prisma/client/runtime/library';
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils';

describe('TradeTable', () => {
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
      timestamp: new Date('2025-01-01T12:00:00Z'),
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
      timestamp: new Date('2025-01-02T12:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      totalAmount: new Decimal(8000),
    },
  ];

  it('renders loading state', () => {
    render(<TradeTable trades={[]} isLoading={true} />);
    const skeletons = screen.getAllByTestId('loading-skeleton');
    expect(skeletons).toHaveLength(5);
  });

  it('renders empty state', () => {
    render(<TradeTable trades={[]} />);
    expect(screen.getByText(/No trades found/)).toBeInTheDocument();
  });

  it('renders trade table with data', () => {
    render(<TradeTable trades={mockTrades} />);

    // Check headers
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Ticker')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();

    // Check first trade data
    const firstTrade = mockTrades[0];
    expect(screen.getByText(formatDate(firstTrade.timestamp))).toBeInTheDocument();
    expect(screen.getByText(firstTrade.ticker)).toBeInTheDocument();
    expect(screen.getByText(firstTrade.action)).toBeInTheDocument();
    expect(
      screen.getByText(formatNumber(parseFloat(firstTrade.quantity.toString())))
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        formatCurrency(
          parseFloat(firstTrade.price.toString()),
          firstTrade.currency
        )
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        formatCurrency(
          parseFloat(firstTrade.totalAmount.toString()),
          firstTrade.currency
        )
      )
    ).toBeInTheDocument();
  });

  it('applies correct styling for buy/sell actions', () => {
    render(<TradeTable trades={mockTrades} />);

    const buyAction = screen.getByText('BUY');
    const sellAction = screen.getByText('SELL');

    expect(buyAction).toHaveClass('bg-green-100', 'text-green-800');
    expect(sellAction).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('accepts and applies custom className', () => {
    const customClass = 'custom-class';
    render(<TradeTable trades={mockTrades} className={customClass} />);

    const table = screen.getByRole('table');
    const container = table.parentElement;
    expect(container).toHaveClass(customClass);
  });
});