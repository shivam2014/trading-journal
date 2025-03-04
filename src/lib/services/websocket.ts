// WebSocket service and types for client-side implementation

export enum WebSocketMessageType {
  // Authentication and connection messages
  AUTH = 'auth',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
  
  // Subscription messages
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  
  // Trade-related messages
  TRADES_UPDATE = 'trades_update',
  TRADE_UPDATE = 'trade_update',
  TRADE_SYNC = 'trade_sync',
  TRADE_SYNC_CONFIRM = 'trade_sync_confirm',
  
  // Market data messages
  MARKET_DATA = 'market_data',
  PRICE_UPDATE = 'price_update',
  PATTERN_DETECTED = 'pattern_detected',
  
  // Notification messages
  NOTIFICATION = 'notification',
}

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: number;
}

export interface WebSocketAuthPayload {
  success: boolean;
  error?: string;
}

export interface WebSocketTradeUpdatePayload {
  trade: any; // Replace with your Trade type
  action: 'create' | 'update' | 'delete';
}

export interface WebSocketPriceUpdatePayload {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: number;
}

export interface WebSocketPatternDetectedPayload {
  symbol: string;
  patterns: Array<{
    name: string;
    patternType: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    startIndex: number;
    endIndex: number;
  }>;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private subscriptions: Set<string> = new Set();
  private token: string | null = null;
  private url: string | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000; // Start with 1 second
  
  constructor() {
    if (typeof window !== 'undefined') {
      // Ensure we're running in browser environment
      this.setupBeforeUnloadHandler();
    }
  }
  
  /**
   * Initialize the WebSocket connection with an authentication token
   */
  public initialize(token: string): void {
    this.token = token;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.url = `${protocol}://${window.location.host}/api/ws`;
    this.connect();
  }
  
  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.isConnecting || this.socket?.readyState === WebSocket.OPEN) {
      return;
    }
    
    if (!this.token || !this.url) {
      console.error('WebSocket not initialized with token and URL');
      return;
    }
    
    this.isConnecting = true;
    
    // Close existing connection if any
    this.disconnect();
    
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }
  
  /**
   * Close the WebSocket connection
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      if (this.socket.readyState === WebSocket.OPEN || 
          this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      
      this.socket = null;
    }
    
    this.isConnecting = false;
    this.cancelReconnect();
  }
  
  /**
   * Subscribe to a channel
   */
  public subscribe(channel: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // Store subscription for when we reconnect
      this.subscriptions.add(channel);
      return;
    }
    
    this.subscriptions.add(channel);
    this.sendMessage({
      type: WebSocketMessageType.SUBSCRIBE,
      payload: { channel },
      timestamp: Date.now(),
    });
  }
  
  /**
   * Unsubscribe from a channel
   */
  public unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    this.sendMessage({
      type: WebSocketMessageType.UNSUBSCRIBE,
      payload: { channel },
      timestamp: Date.now(),
    });
  }
  
  /**
   * Send a message through the WebSocket
   */
  public sendMessage(message: WebSocketMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, message not sent:', message);
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Register an event handler
   */
  public on<T>(type: WebSocketMessageType, handler: (data: T) => void): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    
    this.eventHandlers.get(type)!.add(handler);
  }
  
  /**
   * Remove an event handler
   */
  public off<T>(type: WebSocketMessageType, handler: (data: T) => void): void {
    const handlers = this.eventHandlers.get(type);
    
    if (handlers) {
      handlers.delete(handler);
      
      if (handlers.size === 0) {
        this.eventHandlers.delete(type);
      }
    }
  }
  
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    // Resubscribe to all channels
    this.subscriptions.forEach(channel => {
      this.sendMessage({
        type: WebSocketMessageType.SUBSCRIBE,
        payload: { channel },
        timestamp: Date.now(),
      });
    });
    
    this.emit(WebSocketMessageType.AUTH, { success: true });
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.emit(message.type, message.payload);
    } catch (error) {
      console.error('Error processing WebSocket message:', error, event.data);
    }
  }
  
  private handleClose(event: CloseEvent): void {
    this.isConnecting = false;
    console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
    
    // Don't reconnect if closed cleanly (code 1000)
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
    
    this.emit(WebSocketMessageType.ERROR, { 
      error: 'Connection closed',
      code: event.code,
      reason: event.reason 
    });
  }
  
  private handleError(event: Event): void {
    this.isConnecting = false;
    console.error('WebSocket error:', event);
    
    this.emit(WebSocketMessageType.ERROR, { 
      error: 'Connection error' 
    });
    
    this.scheduleReconnect();
  }
  
  private emit(type: WebSocketMessageType, payload: any): void {
    const handlers = this.eventHandlers.get(type);
    
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in WebSocket ${type} handler:`, error);
        }
      });
    }
  }
  
  private scheduleReconnect(): void {
    // Cancel any existing reconnect timer
    this.cancelReconnect();
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }
    
    // Exponential backoff with jitter
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts) 
      * (0.9 + Math.random() * 0.2);
      
    console.log(`Scheduling reconnect in ${Math.round(delay)}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
  
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // Close connection cleanly when the page is unloaded
      this.disconnect();
    });
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();