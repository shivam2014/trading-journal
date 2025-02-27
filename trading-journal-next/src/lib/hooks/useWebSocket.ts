import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const subscribedChannels = useRef<Set<string>>(new Set());

  // Initialize WebSocket connection
  useEffect(() => {
    if (!session?.user) return;

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || `ws://${window.location.host}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      options.onConnected?.();
      
      // Resubscribe to channels after reconnection
      subscribedChannels.current.forEach(channel => {
        ws.send(JSON.stringify({ type: 'subscribe', channel }));
      });
    };

    ws.onclose = () => {
      setIsConnected(false);
      options.onDisconnected?.();
    };

    ws.onerror = (event) => {
      const wsError = new Error('WebSocket error');
      setError(wsError);
      options.onError?.(wsError);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        options.onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [session, options]);

  // Subscribe to a channel
  const subscribe = useCallback((channel: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot subscribe to:', channel);
      return;
    }

    subscribedChannels.current.add(channel);
    wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
  }, []);

  // Unsubscribe from a channel
  const unsubscribe = useCallback((channel: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot unsubscribe from:', channel);
      return;
    }

    subscribedChannels.current.delete(channel);
    wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
  }, []);

  // Send a message
  const send = useCallback((type: string, payload: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type,
      payload,
      timestamp: Date.now(),
    }));
  }, []);

  return {
    isConnected,
    error,
    subscribe,
    unsubscribe,
    send,
  };
}