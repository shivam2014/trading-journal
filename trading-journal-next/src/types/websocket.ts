export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error';
  channel?: string;
  data?: any;
  error?: string;
}

export type WebSocketProvider = {
  connect: () => void;
  disconnect: () => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  send: (message: WebSocketMessage) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  isConnected: boolean;
};

export interface WebSocketState {
  isConnected: boolean;
  error: Error | null;
}