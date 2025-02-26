import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

describe('useWebSocket', () => {
  // Mock WS methods
  const mockSend = jest.fn();
  const mockClose = jest.fn();

  let wsEventHandlers: Record<string, Function> = {};

  // Mock window.WebSocket
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    wsEventHandlers = {};

    class MockWebSocket {
      constructor(url: string) {
        setTimeout(() => {
          if (wsEventHandlers.open) {
            wsEventHandlers.open(new Event('open'));
          }
        }, 0);
      }

      set onopen(handler: (event: Event) => void) {
        wsEventHandlers.open = handler;
      }

      set onclose(handler: (event: CloseEvent) => void) {
        wsEventHandlers.close = handler;
      }

      set onmessage(handler: (event: MessageEvent) => void) {
        wsEventHandlers.message = handler;
      }

      set onerror(handler: (event: Event) => void) {
        wsEventHandlers.error = handler;
      }

      send = mockSend;
      close = mockClose;
      readyState = WebSocket.OPEN;
    }

    global.WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it('initializes in disconnected state', () => {
    const { result } = renderHook(() => useWebSocket());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('connects when initialized', async () => {
    const onConnected = jest.fn();
    const { result } = renderHook(() => useWebSocket({ onConnected }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onConnected).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(true);
  });

  it('handles messages correctly', async () => {
    const onMessage = jest.fn();
    renderHook(() => useWebSocket({ onMessage }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      wsEventHandlers.message(new MessageEvent('message', {
        data: JSON.stringify({ type: 'test', data: 'data' })
      }));
    });

    expect(onMessage).toHaveBeenCalledWith({ type: 'test', data: 'data' });
  });

  it('handles subscription', async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      result.current.subscribe('test-channel');
    });

    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', channel: 'test-channel' })
    );
  });

  it('handles unsubscription', async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      result.current.subscribe('test-channel');
      result.current.unsubscribe('test-channel');
    });

    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'unsubscribe', channel: 'test-channel' })
    );
  });

  it('handles disconnection', async () => {
    const onDisconnected = jest.fn();
    renderHook(() => useWebSocket({ onDisconnected }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      wsEventHandlers.close(new CloseEvent('close'));
    });

    expect(onDisconnected).toHaveBeenCalled();
  });

  it('handles errors', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useWebSocket({ onError }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      wsEventHandlers.error(new Event('error'));
    });

    expect(onError).toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('cleans up on unmount', async () => {
    const { unmount } = renderHook(() => useWebSocket());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      unmount();
    });

    expect(mockClose).toHaveBeenCalled();
  });
});