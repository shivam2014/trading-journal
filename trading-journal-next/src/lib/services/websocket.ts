import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { getSession } from 'next-auth/react';

export enum WebSocketMessageType {
  TRADE_UPDATE = 'TRADE_UPDATE',
  PRICE_UPDATE = 'PRICE_UPDATE',
  ANALYSIS_UPDATE = 'ANALYSIS_UPDATE',
  ERROR = 'ERROR',
  AUTH = 'AUTH',
  SUBSCRIBE = 'SUBSCRIBE',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: number;
}

interface WebSocketOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private subscriptions: Set<string> = new Set();

  constructor(options: WebSocketOptions) {
    super();
    this.url = options.url;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }

  public async connect(): Promise<void> {
    try {
      // Get auth session
      const session = await getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      this.ws = new WebSocket(this.url, {
        headers: {
          Authorization: `Bearer ${session.user.id}`,
        },
      });

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = (event: WebSocket.ErrorEvent) => {
        this.handleError(new Error(event.message));
      };
      this.ws.onmessage = this.handleMessage.bind(this);

      // Setup ping interval
      this.setupPing();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.emit('error', error);
    }
  }

  public disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
    }
  }

  public send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  public subscribe(channel: string): void {
    this.subscriptions.add(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: WebSocketMessageType.SUBSCRIBE,
        payload: { channel },
        timestamp: Date.now(),
      });
    }
  }

  public unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: WebSocketMessageType.UNSUBSCRIBE,
        payload: { channel },
        timestamp: Date.now(),
      });
    }
  }

  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.emit('connected');

    // Resubscribe to channels
    this.subscriptions.forEach(channel => {
      this.subscribe(channel);
    });
  }

  private handleClose(): void {
    console.log('WebSocket closed');
    this.cleanup();
    this.emit('disconnected');
    this.attemptReconnect();
  }

  private handleError(error: Error): void {
    console.error('WebSocket error:', error);
    this.emit('error', error);
  }

  private handleMessage(event: WebSocket.MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data.toString());
      this.emit(message.type, message.payload);
      this.emit('message', message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.emit('error', new Error('Failed to parse WebSocket message'));
    }
  }

  private setupPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Send ping every 30 seconds
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      await this.connect();
    }, this.reconnectInterval);
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton instance
let wsClientInstance: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClientInstance) {
    wsClientInstance = new WebSocketClient({
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    });
  }
  return wsClientInstance;
}