import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserPreferences } from '../UserPreferences';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { toast } from 'sonner';

// Mock the hooks
jest.mock('@/lib/hooks/usePreferences');
jest.mock('sonner');

describe('UserPreferences', () => {
  const mockPreferences = {
    defaultCurrency: 'USD',
    theme: 'dark',
    chartPreferences: { showVolume: true },
    notificationSettings: {},
  };

  const mockUpdateTheme = jest.fn();
  const mockUpdateDefaultCurrency = jest.fn();
  const mockUpdatePreferences = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePreferences as jest.Mock).mockReturnValue({
      preferences: mockPreferences,
      isLoading: false,
      error: null,
      updateTheme: mockUpdateTheme,
      updateDefaultCurrency: mockUpdateDefaultCurrency,
      updatePreferences: mockUpdatePreferences,
    });
  });

  it('renders loading state', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      preferences: null,
      isLoading: true,
      error: null,
    });

    render(<UserPreferences />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const error = new Error('Failed to load preferences');
    (usePreferences as jest.Mock).mockReturnValue({
      preferences: null,
      isLoading: false,
      error,
    });

    render(<UserPreferences />);
    expect(screen.getByText(/Error loading preferences/)).toBeInTheDocument();
  });

  it('displays current theme selection', () => {
    render(<UserPreferences />);
    const darkButton = screen.getByRole('button', { name: /Dark/i });
    expect(darkButton).toHaveClass('bg-primary');
  });

  it('handles theme change', async () => {
    mockUpdateTheme.mockResolvedValueOnce({});
    render(<UserPreferences />);

    const lightButton = screen.getByRole('button', { name: /Light/i });
    await userEvent.click(lightButton);

    expect(mockUpdateTheme).toHaveBeenCalledWith('light');
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Theme updated successfully');
    });
  });

  it('displays current currency selection', () => {
    render(<UserPreferences />);
    const currencySelect = screen.getByRole('combobox');
    expect(currencySelect).toHaveValue('USD');
  });

  it('handles currency change', async () => {
    mockUpdateDefaultCurrency.mockResolvedValueOnce({});
    render(<UserPreferences />);

    const currencySelect = screen.getByRole('combobox');
    await userEvent.selectOptions(currencySelect, 'EUR');

    expect(mockUpdateDefaultCurrency).toHaveBeenCalledWith('EUR');
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Default currency updated successfully');
    });
  });

  it('handles chart preferences change', async () => {
    mockUpdatePreferences.mockResolvedValueOnce({});
    render(<UserPreferences />);

    const volumeCheckbox = screen.getByRole('checkbox', { name: /Show Volume/i });
    await userEvent.click(volumeCheckbox);

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      chartPreferences: {
        showVolume: false,
      },
    });
  });

  it('handles errors gracefully', async () => {
    mockUpdateTheme.mockRejectedValueOnce(new Error('Update failed'));
    render(<UserPreferences />);

    const lightButton = screen.getByRole('button', { name: /Light/i });
    await userEvent.click(lightButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update theme');
    });
  });
});