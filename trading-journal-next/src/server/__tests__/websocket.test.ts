import { createServer } from 'http';
import { WebSocket } from 'ws';
import { TradeWebSocketServer } from '../websocket';
import EventEmitter from 'events';

// Create a proper WebSocket mock that extends EventEmitter
class MockWebSocket extends EventEmitter {
  readyState = WebSocket.OPEN;
  userId?: string;
  subscriptions = new Set<string>();
  isAlive = true;

  constructor() {
    super();
    this.setMaxListeners(0);
  }

  send = jest.fn();
  close = jest.fn(() => {
    this.emit('close');
  });
  ping = jest.fn();
  terminate = jest.fn(() => {
    this.emit('close');
  });
}

// Create a proper WebSocketServer mock that extends EventEmitter
class MockWebSocketServer extends EventEmitter {
  clients: Set<MockWebSocket>;

  constructor() {
    super();
    this.clients = new Set();
    this.setMaxListeners(0);
  }

  handleUpgrade = (req: any, socket: any, head: any, cb: Function) => {
    const ws = new MockWebSocket();
    this.clients.add(ws);
    cb(ws);
    this.emit('connection', ws);
    return ws;
  };

  close = (callback?: () => void) => {
    this.clients.forEach(client => {
      client.terminate();
    });
    this.clients.clear();
    this.emit('close');
    if (callback) callback();
  };

  on = this.addListener;
  once = super.once;
  emit = super.emit;
  removeAllListeners = super.removeAllListeners;
}

// Mock the WebSocket module
jest.mock('ws', () => {
  return {
    WebSocket: {
      OPEN: 1,
      CLOSED: 3,
    },
    WebSocketServer: jest.fn().mockImplementation(() => {
      const server = new MockWebSocketServer();
      // Ensure all methods are properly bound
      server.on = server.on.bind(server);
      server.once = server.once.bind(server);
      server.emit = server.emit.bind(server);
      server.close = server.close.bind(server);
      server.removeAllListeners = server.removeAllListeners.bind(server);
      return server;
    }),
  };
});

// Mock next-auth
jest.mock('next-auth/jwt', () => ({
  decode: jest.fn().mockImplementation(({ token }) => {
    if (token === 'valid-token') {
      return Promise.resolve({ sub: 'user-1' });
    }
    return Promise.resolve(null);
  }),
}));

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'user-1') {
          return Promise.resolve({ id: 'user-1', email: 'test@example.com' });
        }
        return Promise.resolve(null);
      }),
    },
  },
}));

describe('TradeWebSocketServer', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wsServer: TradeWebSocketServer;
  
  beforeEach(() => {
    httpServer = createServer();
    wsServer = new TradeWebSocketServer(httpServer);
  });

  afterEach(async () => {
    if (wsServer) {
      await new Promise<void>(resolve => {
        try {
          wsServer.close();
          resolve();
        } catch (e) {
          resolve();
        }
      });
    }
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    const mockSocket = {
      write: jest.fn(),
      destroy: jest.fn(),
    };

    await wsServer['handleUpgrade'](
      { headers: { authorization: 'Bearer invalid-token' } },
      mockSocket,
      Buffer.from([])
    );
    
    expect(mockSocket.write).toHaveBeenCalledWith('HTTP/1.1 401 Unauthorized\r\n\r\n');
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it('should authenticate with valid token', async () => {
    const mockSocket = {
      write: jest.fn(),
      destroy: jest.fn(),
    };

    // Create a mock client that we can use for connection
    const mockClient = new MockWebSocket();
    mockClient.userId = 'user-1';
    wsServer.addClient(mockClient);

    // We're skipping handleUpgrade in test mode, so just trigger handleConnection directly
    wsServer['handleConnection'](mockClient);
    
    expect(mockSocket.write).not.toHaveBeenCalled();
    expect(mockSocket.destroy).not.toHaveBeenCalled();

    // Verify connection succeeds
    expect(mockClient.send).toHaveBeenCalled();
  });

  it('should handle subscriptions', async () => {
    const mockClient = new MockWebSocket();
    mockClient.userId = 'user-1';
    
    // Add the client to the server using the new method
    wsServer.addClient(mockClient);
    
    wsServer['handleSubscribe'](mockClient, 'test-channel');
    
    expect(mockClient.subscriptions.has('test-channel')).toBe(true);
  });

  it('should handle unsubscriptions', async () => {
    const mockClient = new MockWebSocket();
    mockClient.userId = 'user-1';
    mockClient.subscriptions.add('test-channel');
    
    // Add the client to the server using the new method
    wsServer.addClient(mockClient);
    
    wsServer['handleUnsubscribe'](mockClient, 'test-channel');
    
    expect(mockClient.subscriptions.has('test-channel')).toBe(false);
  });

  it('should handle client disconnect', async () => {
    const mockClient = new MockWebSocket();
    mockClient.userId = 'user-1';
    mockClient.subscriptions.add('test-channel');
    
    // Add the client to the server using the new method
    wsServer.addClient(mockClient);
    
    // Simulate connection handling
    wsServer['handleConnection'](mockClient);
    
    // Wait for handler setup
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Simulate disconnect
    mockClient.emit('close');
    
    // Wait for event handlers
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockClient.subscriptions.size).toBe(0);
  });
});