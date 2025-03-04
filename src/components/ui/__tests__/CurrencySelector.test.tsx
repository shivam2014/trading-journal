import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CurrencySelector from '../CurrencySelector';

// Mock the currency hook
jest.mock('@/lib/hooks/useCurrency', () => ({
  useCurrency: jest.fn(() => ({
    selectedCurrency: 'USD',
    setSelectedCurrency: jest.fn(),
    availableCurrencies: ['USD', 'EUR', 'GBP'],
    isLoadingCurrencies: false,
    error: null,
  })),
}));

describe('CurrencySelector', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    renderWithQueryClient(<CurrencySelector />);
    
    expect(screen.getByLabelText('Currency')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('USD');
  });

  it('displays custom label', () => {
    renderWithQueryClient(<CurrencySelector label="Select Currency" />);
    
    expect(screen.getByLabelText('Select Currency')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    jest.mocked(require('@/lib/hooks/useCurrency').useCurrency).mockReturnValue({
      selectedCurrency: 'USD',
      setSelectedCurrency: jest.fn(),
      availableCurrencies: [],
      isLoadingCurrencies: true,
      error: null,
    });

    renderWithQueryClient(<CurrencySelector />);
    
    expect(screen.getByText('Loading currencies...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('renders error state', () => {
    const error = new Error('Failed to load currencies');
    jest.mocked(require('@/lib/hooks/useCurrency').useCurrency).mockReturnValue({
      selectedCurrency: 'USD',
      setSelectedCurrency: jest.fn(),
      availableCurrencies: [],
      isLoadingCurrencies: false,
      error,
    });

    renderWithQueryClient(<CurrencySelector />);
    
    expect(screen.getByText('Error loading currencies')).toBeInTheDocument();
    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it('calls onChange when currency is selected', async () => {
    const onChange = jest.fn();
    const setSelectedCurrency = jest.fn();

    jest.mocked(require('@/lib/hooks/useCurrency').useCurrency).mockReturnValue({
      selectedCurrency: 'USD',
      setSelectedCurrency,
      availableCurrencies: ['USD', 'EUR', 'GBP'],
      isLoadingCurrencies: false,
      error: null,
    });

    renderWithQueryClient(<CurrencySelector onChange={onChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'EUR' } });

    await waitFor(() => {
      expect(setSelectedCurrency).toHaveBeenCalledWith('EUR');
    });
  });

  it('updates when value prop changes', () => {
    const { rerender } = renderWithQueryClient(
      <CurrencySelector value="USD" />
    );

    expect(screen.getByRole('combobox')).toHaveValue('USD');

    jest.mocked(require('@/lib/hooks/useCurrency').useCurrency).mockReturnValue({
      selectedCurrency: 'EUR',
      setSelectedCurrency: jest.fn(),
      availableCurrencies: ['USD', 'EUR', 'GBP'],
      isLoadingCurrencies: false,
      error: null,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <CurrencySelector value="EUR" />
      </QueryClientProvider>
    );

    expect(screen.getByRole('combobox')).toHaveValue('EUR');
  });

  it('respects disabled prop', () => {
    renderWithQueryClient(<CurrencySelector disabled />);
    
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('applies custom className', () => {
    renderWithQueryClient(
      <CurrencySelector className="custom-class" />
    );
    
    expect(screen.getByRole('combobox')).toHaveClass('custom-class');
  });

  it('shows no currencies available message when list is empty', () => {
    jest.mocked(require('@/lib/hooks/useCurrency').useCurrency).mockReturnValue({
      selectedCurrency: 'USD',
      setSelectedCurrency: jest.fn(),
      availableCurrencies: [],
      isLoadingCurrencies: false,
      error: null,
    });

    renderWithQueryClient(<CurrencySelector />);
    
    expect(screen.getByText('No currencies available')).toBeInTheDocument();
  });

  it('shows formatted currency options', () => {
    jest.mocked(require('@/lib/hooks/useCurrency').useCurrency).mockReturnValue({
      selectedCurrency: 'USD',
      setSelectedCurrency: jest.fn(),
      availableCurrencies: ['USD', 'EUR', 'GBP'],
      isLoadingCurrencies: false,
      error: null,
    });

    renderWithQueryClient(<CurrencySelector />);
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('USD');
    expect(options[1]).toHaveTextContent('EUR');
    expect(options[2]).toHaveTextContent('GBP');
  });

  it('handles WebSocket disconnection gracefully', () => {
    jest.mocked(require('@/lib/hooks/useCurrency').useCurrency).mockReturnValue({
      selectedCurrency: 'USD',
      setSelectedCurrency: jest.fn(),
      availableCurrencies: ['USD', 'EUR'],
      isLoadingCurrencies: false,
      error: new Error('WebSocket disconnected'),
    });

    renderWithQueryClient(<CurrencySelector />);
    
    expect(screen.getByText(/WebSocket disconnected/)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });

  it('maintains selected value during loading state', async () => {
    const onChange = jest.fn();
    const setSelectedCurrency = jest.fn();

    const { rerender } = renderWithQueryClient(
      <CurrencySelector value="EUR" onChange={onChange} />
    );

    // Change to loading state
    jest.mocked(require('@/lib/hooks/useCurrency').useCurrency).mockReturnValue({
      selectedCurrency: 'EUR',
      setSelectedCurrency,
      availableCurrencies: [],
      isLoadingCurrencies: true,
      error: null,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <CurrencySelector value="EUR" onChange={onChange} />
      </QueryClientProvider>
    );

    expect(screen.getByRole('combobox')).toHaveValue('EUR');
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByText('Loading currencies...')).toBeInTheDocument();
  });
});