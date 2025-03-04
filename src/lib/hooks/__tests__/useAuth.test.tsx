import { renderHook, act } from '@testing-library/react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../useAuth';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('useAuth', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockSession = {
    data: {
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      },
    },
    status: 'authenticated',
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSession as jest.Mock).mockReturnValue(mockSession);
  });

  it('should return authentication status and user data', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockSession.data.user);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should handle login successfully', async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useAuth({ redirectTo: '/dashboard' }));

    const credentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    const response = await act(async () => {
      return result.current.login(credentials);
    });

    expect(signIn).toHaveBeenCalledWith('credentials', {
      ...credentials,
      redirect: false,
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    expect(response.success).toBe(true);
  });

  it('should handle login failure', async () => {
    const error = 'Invalid credentials';
    (signIn as jest.Mock).mockResolvedValueOnce({ error });

    const onError = jest.fn();
    const { result } = renderHook(() => useAuth({ onError }));

    const response = await act(async () => {
      return result.current.login({
        email: 'test@example.com',
        password: 'wrong',
      });
    });

    expect(response.success).toBe(false);
    expect(response.error?.message).toBe(error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should handle registration successfully', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
        },
      }),
    });

    const { result } = renderHook(() => useAuth());

    const credentials = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    const response = await act(async () => {
      return result.current.register(credentials);
    });

    expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    expect(response.success).toBe(true);
  });

  it('should handle registration failure', async () => {
    const error = 'User already exists';
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error,
        code: 'USER_EXISTS',
      }),
    });

    const onError = jest.fn();
    const { result } = renderHook(() => useAuth({ onError }));

    const response = await act(async () => {
      return result.current.register({
        name: 'Test User',
        email: 'exists@example.com',
        password: 'password123',
      });
    });

    expect(response.success).toBe(false);
    expect(response.error?.message).toBe(error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should handle logout successfully', async () => {
    const { result } = renderHook(() => useAuth({ redirectTo: '/' }));

    const response = await act(async () => {
      return result.current.logout();
    });

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockRouter.push).toHaveBeenCalledWith('/');
    expect(response.success).toBe(true);
  });

  it('should handle requiresAuth callback correctly', async () => {
    const callback = jest.fn();

    // Test with authenticated user
    const { result: authenticatedResult } = renderHook(() => useAuth());
    act(() => {
      authenticatedResult.current.requiresAuth(callback);
    });
    expect(callback).toHaveBeenCalled();

    // Test with unauthenticated user
    (useSession as jest.Mock).mockReturnValueOnce({
      data: null,
      status: 'unauthenticated',
    });

    const { result: unauthenticatedResult } = renderHook(() => useAuth());
    act(() => {
      unauthenticatedResult.current.requiresAuth(callback);
    });
    expect(signIn).toHaveBeenCalled();
  });

  it('should detect admin role correctly', () => {
    // Test regular user
    const { result: userResult } = renderHook(() => useAuth());
    expect(userResult.current.isAdmin).toBe(false);

    // Test admin user
    (useSession as jest.Mock).mockReturnValueOnce({
      data: {
        user: { ...mockSession.data.user, role: 'ADMIN' },
      },
      status: 'authenticated',
    });

    const { result: adminResult } = renderHook(() => useAuth());
    expect(adminResult.current.isAdmin).toBe(true);
  });
});