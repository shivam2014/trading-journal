import { useState, useCallback, useEffect, useRef } from 'react';
import { WebSocketProvider } from '@/types/websocket';

export interface UseWebSocketOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket({
  onConnected,
  onDisconnected,
  onMessage,
  onError,
  reconnectAttempts = 5,
  reconnectInterval = 1000,
}: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;
        onConnected?.();

        // Resubscribe to channels
        subscriptionsRef.current.forEach(channel => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        onDisconnected?.();

        // Attempt to reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1;
          setTimeout(connect, reconnectInterval);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        const wsError = new Error('WebSocket error');
        setError(wsError);
        onError?.(wsError);
      };

      wsRef.current = ws;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect to WebSocket');
      setError(error);
      onError?.(error);
    }
  }, [onConnected, onDisconnected, onMessage, onError, reconnectAttempts, reconnectInterval]);

  const subscribe = useCallback((channel: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      subscriptionsRef.current.add(channel);
      connect();
      return;
    }

    wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
    subscriptionsRef.current.add(channel);
  }, [connect]);

  const unsubscribe = useCallback((channel: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
    subscriptionsRef.current.delete(channel);
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    error,
    subscribe,
    unsubscribe,
    send,
  };
}