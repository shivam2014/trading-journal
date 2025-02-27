import { renderHook, act } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { useWebSocket } from '../useWebSocket';

// Mock next-auth session
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  useSession: () => ({
    data: { user: { id: '123' } },
    status: 'authenticated'
  })
}));

describe('useWebSocket', () => {
  // Mock WS methods
  const mockSend = jest.fn();
  const mockClose = jest.fn();
  let mockInstance: any;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SessionProvider session={{ user: { id: '123' }, expires: '2024-01-01' }}>
      {children}
    </SessionProvider>
  );

  // Mock window.WebSocket
  const originalWebSocket = global.WebSocket;

  class MockWebSocket {
    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    connected = false;
    error = null;
    readyState = WebSocket.OPEN;
    send = mockSend;
    close = mockClose;

    constructor(url: string) {
      mockInstance = this;
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockInstance = null;
    global.WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it('initializes in disconnected state', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('connects when initialized', async () => {
    const onConnected = jest.fn();
    const { result } = renderHook(() => useWebSocket({ onConnected }), { wrapper });

    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onConnected).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(true);
  });

  it('handles messages correctly', async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => useWebSocket({ onMessage }), { wrapper });

    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({ type: 'test', data: 'data' })
      });
      mockInstance.onmessage?.(messageEvent);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onMessage).toHaveBeenCalledWith({ type: 'test', data: 'data' });
  });

  it('handles subscription', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.subscribe('test-channel');
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', channel: 'test-channel' })
    );
  });

  it('handles unsubscription', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.subscribe('test-channel');
      result.current.unsubscribe('test-channel');
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'unsubscribe', channel: 'test-channel' })
    );
  });

  it('handles disconnection', async () => {
    const onDisconnected = jest.fn();
    renderHook(() => useWebSocket({ onDisconnected }), { wrapper });

    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
      mockInstance.onclose?.(new CloseEvent('close'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onDisconnected).toHaveBeenCalled();
  });

  it('handles errors', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useWebSocket({ onError }), { wrapper });

    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
      mockInstance.onerror?.(new Event('error'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onError).toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('cleans up on unmount', async () => {
    const { unmount } = renderHook(() => useWebSocket(), { wrapper });

    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      unmount();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockClose).toHaveBeenCalled();
  });
});