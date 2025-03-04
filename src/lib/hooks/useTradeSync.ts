import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { WebSocketMessageType } from '@/lib/services/websocket';
import { toast } from 'sonner';

type Trade = any; // Replace with your actual Trade type

interface TradeUpdate {
  trade: Trade;
  action: 'update' | 'delete' | 'create';
}

interface UseTradeSyncOptions {
  onTradeUpdate?: (update: TradeUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
}

export function useTradeSync(options: UseTradeSyncOptions = {}) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pendingActions, setPendingActions] = useState<Map<string, string>>(new Map());
  const socket = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!session?.user?.id || isConnecting || isConnected) return;

    setIsConnecting(true);

    // Close existing connection if any
    if (socket.current && socket.current.readyState !== WebSocket.CLOSED) {
      socket.current.close();
    }

    // Create new WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/api/ws`;
    
    const ws = new WebSocket(wsUrl);
    socket.current = ws;

    // Add authorization header
    ws.onopen = () => {
      console.log('WebSocket connected');
      // Subscribe to user's trades channel
      const subscribeMessage = {
        type: WebSocketMessageType.SUBSCRIBE,
        payload: {
          channel: `trades:${session.user.id}`,
        },
      };
      ws.send(JSON.stringify(subscribeMessage));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case WebSocketMessageType.AUTH:
            if (message.payload.success) {
              setIsConnected(true);
              setIsConnecting(false);
              options.onConnect?.();
              
              // Clear any reconnect timer since we're connected
              if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
                reconnectTimer.current = null;
              }
            }
            break;
            
          case WebSocketMessageType.TRADES_UPDATE:
            if (message.payload.trades) {
              setTrades(message.payload.trades);
            }
            break;
            
          case WebSocketMessageType.TRADE_UPDATE:
            const { trade, action } = message.payload;
            
            // Remove from pending actions if this was initiated by this client
            if (pendingActions.has(trade.id)) {
              setPendingActions(prev => {
                const newMap = new Map(prev);
                newMap.delete(trade.id);
                return newMap;
              });
            }
            
            // Update local state
            if (action === 'update') {
              setTrades(prev => prev.map(t => t.id === trade.id ? trade : t));
            } else if (action === 'delete') {
              setTrades(prev => prev.filter(t => t.id !== trade.id));
            } else if (action === 'create') {
              setTrades(prev => [trade, ...prev]);
            }
            
            // Call onTradeUpdate callback
            options.onTradeUpdate?.({ trade, action });
            break;
            
          case WebSocketMessageType.TRADE_SYNC_CONFIRM:
            const { tradeId, action: confirmedAction, success } = message.payload;
            if (success) {
              toast.success(`Trade ${confirmedAction} successful`);
            }
            break;
            
          case WebSocketMessageType.ERROR:
            toast.error(`WebSocket error: ${message.payload.error}`);
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setIsConnecting(false);
      options.onDisconnect?.();
      
      // Attempt reconnection if configured
      if (options.autoReconnect !== false && !reconnectTimer.current) {
        reconnectTimer.current = setTimeout(() => {
          reconnectTimer.current = null;
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Connection error: Please check your network');
    };
    
  }, [session, isConnecting, isConnected, options]);

  // Connect when session becomes available
  useEffect(() => {
    if (session?.user?.id && !isConnected && !isConnecting) {
      connect();
    }
    
    return () => {
      if (socket.current) {
        socket.current.close();
      }
      
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, [session, connect, isConnected, isConnecting]);

  // Function to update a trade via WebSocket
  const updateTrade = useCallback((tradeId: string, data: Partial<Trade>) => {
    if (!isConnected || !socket.current) {
      toast.error('Not connected to server');
      return false;
    }
    
    try {
      // Add to pending actions
      setPendingActions(prev => {
        const newMap = new Map(prev);
        newMap.set(tradeId, 'update');
        return newMap;
      });
      
      // Send update message
      socket.current.send(JSON.stringify({
        type: WebSocketMessageType.TRADE_SYNC,
        payload: {
          tradeId,
          action: 'update',
          data,
        },
      }));
      
      return true;
    } catch (error) {
      console.error('Error updating trade:', error);
      toast.error('Failed to update trade');
      return false;
    }
  }, [isConnected]);

  // Function to delete a trade via WebSocket
  const deleteTrade = useCallback((tradeId: string) => {
    if (!isConnected || !socket.current) {
      toast.error('Not connected to server');
      return false;
    }
    
    try {
      // Add to pending actions
      setPendingActions(prev => {
        const newMap = new Map(prev);
        newMap.set(tradeId, 'delete');
        return newMap;
      });
      
      // Send delete message
      socket.current.send(JSON.stringify({
        type: WebSocketMessageType.TRADE_SYNC,
        payload: {
          tradeId,
          action: 'delete',
        },
      }));
      
      return true;
    } catch (error) {
      console.error('Error deleting trade:', error);
      toast.error('Failed to delete trade');
      return false;
    }
  }, [isConnected]);

  return {
    isConnected,
    isConnecting,
    trades,
    updateTrade,
    deleteTrade,
    pendingActions: Object.fromEntries(pendingActions),
    connect,
  };
}