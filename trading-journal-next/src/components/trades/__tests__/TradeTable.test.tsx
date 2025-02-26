import { render, screen } from '@testing-library/react';
import TradeTable from '../TradeTable';
import { Decimal } from '@prisma/client/runtime/library';
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils';
import type { Trade } from '@/types/trade';

describe('TradeTable', () => {
  const mockTrades: Trade[] = [
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
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<TradeTable trades={[]} />);
    expect(screen.getByText(/No trades found/)).toBeInTheDocument();
  });

  it('renders trade table with data', () => {
    render(<TradeTable trades={mockTrades} />);

    const firstTrade = mockTrades[0];
    
    // Check date
    expect(screen.getByText(formatDate(firstTrade.timestamp))).toBeInTheDocument();
    
    // Check ticker
    expect(screen.getAllByTestId(`ticker-${firstTrade.ticker}`)[0]).toHaveTextContent(firstTrade.ticker);
    
    // Check actions
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('SELL')).toBeInTheDocument();
    
    // Check quantities
    const quantity = formatNumber(parseFloat(firstTrade.quantity.toString()));
    expect(screen.getByText(quantity)).toBeInTheDocument();
    
    // Check prices
    const price = formatCurrency(parseFloat(firstTrade.price.toString()), firstTrade.currency);
    expect(screen.getByText(price)).toBeInTheDocument();
    
    // Check total amounts
    const total = formatCurrency(parseFloat(firstTrade.totalAmount.toString()), firstTrade.currency);
    expect(screen.getByText(total)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<TradeTable trades={mockTrades} className={customClass} />);
    const container = screen.getByRole('table').parentElement;
    expect(container).toHaveClass(customClass);
  });

  it('applies correct styling for buy/sell actions', () => {
    render(<TradeTable trades={mockTrades} />);

    const buyAction = screen.getByText('BUY');
    const sellAction = screen.getByText('SELL');

    expect(buyAction).toHaveClass('bg-green-100', 'text-green-800');
    expect(sellAction).toHaveClass('bg-red-100', 'text-red-800');
  });
});