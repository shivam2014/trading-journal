import { useEffect, useCallback, useState } from 'react';
import { getWebSocketClient, WebSocketMessage, WebSocketMessageType } from '@/lib/services/websocket';
import { useAuth } from './useAuth';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isAuthenticated } = useAuth();

  const wsClient = getWebSocketClient();

  const connect = useCallback(async () => {
    if (!isAuthenticated) {
      setError(new Error('Authentication required'));
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      await wsClient.connect();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      options.onError?.(err instanceof Error ? err : new Error('Failed to connect'));
    } finally {
      setIsConnecting(false);
    }
  }, [isAuthenticated, options, wsClient]);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, [wsClient]);

  const subscribe = useCallback((channel: string) => {
    if (!isConnected) {
      throw new Error('WebSocket is not connected');
    }
    wsClient.subscribe(channel);
  }, [isConnected, wsClient]);

  const unsubscribe = useCallback((channel: string) => {
    wsClient.unsubscribe(channel);
  }, [wsClient]);

  const send = useCallback((message: WebSocketMessage) => {
    if (!isConnected) {
      throw new Error('WebSocket is not connected');
    }
    wsClient.send(message);
  }, [isConnected, wsClient]);

  // Set up event listeners
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
      options.onConnected?.();
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      options.onDisconnected?.();
    };

    const handleError = (err: Error) => {
      setError(err);
      options.onError?.(err);
    };

    wsClient.on('connected', handleConnect);
    wsClient.on('disconnected', handleDisconnect);
    wsClient.on('error', handleError);

    // Auto-connect if specified
    if (options.autoConnect && isAuthenticated) {
      connect();
    }

    return () => {
      wsClient.off('connected', handleConnect);
      wsClient.off('disconnected', handleDisconnect);
      wsClient.off('error', handleError);
    };
  }, [wsClient, options, connect, isAuthenticated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const addMessageListener = useCallback(<T = any>(
    type: WebSocketMessageType,
    callback: (payload: T) => void
  ) => {
    wsClient.on(type, callback);
    return () => wsClient.off(type, callback);
  }, [wsClient]);

  const removeMessageListener = useCallback(<T = any>(
    type: WebSocketMessageType,
    callback: (payload: T) => void
  ) => {
    wsClient.off(type, callback);
  }, [wsClient]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,

    // Connection methods
    connect,
    disconnect,

    // Messaging methods
    send,
    subscribe,
    unsubscribe,
    addMessageListener,
    removeMessageListener,
  };
}

// Type exports for consumers
export type { WebSocketMessage, WebSocketMessageType };