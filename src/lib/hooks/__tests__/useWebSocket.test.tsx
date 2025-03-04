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

  it('resubscribes to channels after reconnection', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    // Initial connection and subscription
    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
      result.current.subscribe('test-channel');
    });

    // Simulate disconnect and reconnect
    await act(async () => {
      mockInstance.onclose?.(new CloseEvent('close'));
      await new Promise(resolve => setTimeout(resolve, 0));
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should resubscribe to previous channels
    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', channel: 'test-channel' })
    );
  });

  it('buffers messages when disconnected and sends after reconnection', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    // Initial connection
    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Try to send while connected
    await act(async () => {
      result.current.send('test', { data: 1 });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"type":"test"')
    );

    // Simulate disconnect and attempt to send
    mockInstance.readyState = WebSocket.CLOSED;
    await act(async () => {
      result.current.send('test', { data: 2 });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Message should not be sent while disconnected
    expect(mockSend).toHaveBeenCalledTimes(1);

    // Reconnect and verify buffered message is sent
    mockInstance.readyState = WebSocket.OPEN;
    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"data":2')
    );
  });

  it('handles invalid JSON in received messages', async () => {
    const onMessage = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderHook(() => useWebSocket({ onMessage }), { wrapper });

    await act(async () => {
      mockInstance.onopen?.(new Event('open'));
      await new Promise(resolve => setTimeout(resolve, 0));
      mockInstance.onmessage?.(new MessageEvent('message', {
        data: 'invalid json'
      }));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  describe('Message Batching', () => {
    it('should batch multiple messages within the batching window', async () => {
      jest.useFakeTimers();
      const batchHandler = jest.fn();
      const { result } = renderHook(() => useWebSocket({ 
        onMessage: batchHandler,
        batchWindow: 100
      }), { wrapper });

      await act(async () => {
        mockInstance.onopen?.(new Event('open'));
        await Promise.resolve();
      });

      // Send multiple messages in quick succession
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          mockInstance.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify({ type: 'test', data: i })
          }));
        }
        jest.advanceTimersByTime(50); // Still within batch window
      });

      // Should not have triggered handler yet
      expect(batchHandler).not.toHaveBeenCalled();

      // Complete batch window
      await act(async () => {
        jest.advanceTimersByTime(51);
        await Promise.resolve();
      });

      // Should receive one call with all messages
      expect(batchHandler).toHaveBeenCalledTimes(1);
      expect(batchHandler.mock.calls[0][0]).toHaveLength(5);

      jest.useRealTimers();
    });

    it('should handle high-frequency updates efficiently', async () => {
      jest.useFakeTimers();
      const messageCount = 1000;
      const handler = jest.fn();
      const { result } = renderHook(() => useWebSocket({ 
        onMessage: handler,
        batchWindow: 50
      }), { wrapper });

      await act(async () => {
        mockInstance.onopen?.(new Event('open'));
        await Promise.resolve();

        // Simulate high-frequency messages
        for (let i = 0; i < messageCount; i++) {
          mockInstance.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify({ type: 'update', value: i })
          }));
          
          if (i % 100 === 0) {
            // Advance time a bit but stay within batch window
            jest.advanceTimersByTime(10);
            await Promise.resolve();
          }
        }

        // Complete batch window
        jest.advanceTimersByTime(50);
        await Promise.resolve();
      });

      // Should have batched all messages into fewer callbacks
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toHaveLength(messageCount);

      jest.useRealTimers();
    });

    it('should measure and optimize message latency', async () => {
      jest.useFakeTimers();
      const timestamps: number[] = [];
      const { result } = renderHook(() => useWebSocket({ 
        onMessage: (messages) => {
          timestamps.push(Date.now());
        },
        batchWindow: 50
      }), { wrapper });

      await act(async () => {
        mockInstance.onopen?.(new Event('open'));
        await Promise.resolve();

        const startTime = Date.now();
        
        // Send messages with timestamps
        for (let i = 0; i < 10; i++) {
          mockInstance.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify({ 
              type: 'update',
              timestamp: startTime + i
            })
          }));
          jest.advanceTimersByTime(5); // 5ms between messages
          await Promise.resolve();
        }

        // Complete batch window
        jest.advanceTimersByTime(50);
        await Promise.resolve();
      });

      // Verify message processing latency
      const averageLatency = timestamps.reduce((sum, t, i) => 
        sum + (i > 0 ? t - timestamps[i-1] : 0), 0) / (timestamps.length - 1);
      
      expect(averageLatency).toBeLessThanOrEqual(50); // Should be within batch window
      expect(timestamps.length).toBe(1); // Should have batched all messages

      jest.useRealTimers();
    });
  });
});