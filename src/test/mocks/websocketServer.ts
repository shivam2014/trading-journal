import { Server } from 'http';
import { WebSocket } from 'ws';

export class MockWebSocketServer {
  listeners: Map<string, Function[]> = new Map();
  clients: any[] = [];
  options: any;
  
  constructor(options: any) {
    this.options = options;
  }
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
    return this;
  }
  
  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(...args));
    return true;
  }
  
  send(data: any) {
    this.emit('message', data);
  }
  
  close() {
    // Emit close event
    this.emit('close');
    // Clear all listeners
    this.listeners.clear();
  }
}

// Mock WebSocket Client
export const mockWSServer = new MockWebSocketServer({ noServer: true });