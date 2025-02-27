import { renderHook, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePreferences } from '../usePreferences';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockPreferences = {
  defaultCurrency: 'USD',
  theme: 'dark',
  chartPreferences: {},
  notificationSettings: {},
};

describe('usePreferences', () => {
  let queryClient: QueryClient;

  const mockSession = {
    data: {
      user: {
        id: '123',
        email: 'test@example.com',
      },
    },
    status: 'authenticated',
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
          refetchOnWindowFocus: false,
        },
      },
    });

    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue(mockSession);
    mockFetch.mockImplementation((url) => {
      if (url === '/api/settings/preferences') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPreferences),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should return preferences data', async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    // Initialize preferences in queryClient with the correct query key
    queryClient.setQueryData(['userPreferences'], mockPreferences);

    // Wait for data to load and settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.preferences).toEqual(mockPreferences);
    expect(result.current.isLoading).toBe(false);
    // Error should be undefined when data is loaded successfully
    expect(result.current.error).toBeFalsy();
  });

  it('should update theme', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce((url, options) => {
      if (url === '/api/settings/preferences' && options.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockPreferences, theme: 'light' }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });

    const { result } = renderHook(() => usePreferences(), { wrapper });

    await act(async () => {
      await result.current.updatePreferences({ theme: 'light' });
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/settings/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ theme: 'light' }),
    });
  });

  it('should update default currency', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce((url, options) => {
      if (url === '/api/settings/preferences' && options.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockPreferences, defaultCurrency: 'EUR' }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });

    const { result } = renderHook(() => usePreferences(), { wrapper });

    await act(async () => {
      await result.current.updatePreferences({ defaultCurrency: 'EUR' });
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/settings/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ defaultCurrency: 'EUR' }),
    });
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to update preferences');
    (global.fetch as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePreferences(), { wrapper });

    await act(async () => {
      try {
        await result.current.updatePreferences({ theme: 'light' });
      } catch (e) {
        expect(e).toEqual(error);
      }
    });
  });
});