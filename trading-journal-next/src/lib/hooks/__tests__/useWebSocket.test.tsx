import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { getWebSocketClient, WebSocketMessageType } from '@/lib/services/websocket';
import { useAuth } from '../useAuth';

// Mock dependencies
jest.mock('@/lib/services/websocket');
jest.mock('../useAuth');

describe('useWebSocket', () => {
  const mockWsClient = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getWebSocketClient as jest.Mock).mockReturnValue(mockWsClient);
    (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: true });
  });

  it('should initialize in disconnected state', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should connect when autoConnect is true', () => {
    renderHook(() => useWebSocket({ autoConnect: true }));

    expect(mockWsClient.connect).toHaveBeenCalled();
  });

  it('should not connect when not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: false });

    const { result } = renderHook(() => useWebSocket({ autoConnect: true }));

    expect(mockWsClient.connect).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('should handle successful connection', async () => {
    const onConnected = jest.fn();
    const { result } = renderHook(() => useWebSocket({ onConnected }));

    // Simulate connect call
    await act(async () => {
      await result.current.connect();
    });

    // Simulate connection success
    act(() => {
      const connectHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'connected'
      )[1];
      connectHandler();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
    expect(onConnected).toHaveBeenCalled();
  });

  it('should handle connection failure', async () => {
    const error = new Error('Connection failed');
    mockWsClient.connect.mockRejectedValueOnce(error);
    const onError = jest.fn();

    const { result } = renderHook(() => useWebSocket({ onError }));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe(error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should handle disconnection', () => {
    const onDisconnected = jest.fn();
    const { result } = renderHook(() => useWebSocket({ onDisconnected }));

    // Simulate successful connection first
    act(() => {
      const connectHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'connected'
      )[1];
      connectHandler();
    });

    // Simulate disconnect
    act(() => {
      const disconnectHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'disconnected'
      )[1];
      disconnectHandler();
    });

    expect(result.current.isConnected).toBe(false);
    expect(onDisconnected).toHaveBeenCalled();
  });

  it('should manage subscriptions correctly', async () => {
    const { result } = renderHook(() => useWebSocket());

    // Simulate connection
    act(() => {
      const connectHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'connected'
      )[1];
      connectHandler();
    });

    // Subscribe to a channel
    act(() => {
      result.current.subscribe('test-channel');
    });

    expect(mockWsClient.subscribe).toHaveBeenCalledWith('test-channel');

    // Unsubscribe from channel
    act(() => {
      result.current.unsubscribe('test-channel');
    });

    expect(mockWsClient.unsubscribe).toHaveBeenCalledWith('test-channel');
  });

  it('should handle message listeners correctly', () => {
    const { result } = renderHook(() => useWebSocket());
    const messageHandler = jest.fn();

    // Add message listener
    act(() => {
      result.current.addMessageListener(WebSocketMessageType.TRADE_UPDATE, messageHandler);
    });

    expect(mockWsClient.on).toHaveBeenCalledWith(
      WebSocketMessageType.TRADE_UPDATE,
      messageHandler
    );

    // Remove message listener
    act(() => {
      result.current.removeMessageListener(WebSocketMessageType.TRADE_UPDATE, messageHandler);
    });

    expect(mockWsClient.off).toHaveBeenCalledWith(
      WebSocketMessageType.TRADE_UPDATE,
      messageHandler
    );
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket());

    unmount();

    expect(mockWsClient.disconnect).toHaveBeenCalled();
  });

  it('should prevent actions when not connected', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(() => result.current.send({ 
      type: WebSocketMessageType.TRADE_UPDATE,
      payload: {},
      timestamp: Date.now(),
    })).toThrow('WebSocket is not connected');

    expect(() => result.current.subscribe('test-channel')).toThrow(
      'WebSocket is not connected'
    );
  });
});