import { Server } from 'http';
import WebSocket from 'ws';
import { createServer } from 'http';
import { decode, encode } from 'next-auth/jwt';
import { TradeWebSocketServer } from '../websocket';
import { prisma } from '@/lib/db/prisma';
import { WebSocketMessageType } from '@/lib/services/websocket';

// Mock prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  decode: jest.fn(),
  encode: jest.fn(),
}));

describe('TradeWebSocketServer', () => {
  let httpServer: Server;
  let wsServer: TradeWebSocketServer;
  let wsUrl: string;
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeAll(() => {
    httpServer = createServer();
    wsServer = new TradeWebSocketServer(httpServer);
    httpServer.listen(0);
    const address = httpServer.address();
    const port = typeof address === 'object' ? address?.port : 0;
    wsUrl = `ws://localhost:${port}`;
  });

  afterAll(() => {
    wsServer.close();
    httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (decode as jest.Mock).mockResolvedValue({ sub: mockUser.id });
  });

  it('should require authentication', (done) => {
    const ws = new WebSocket(wsUrl);

    ws.on('error', () => {
      // Expected error due to missing auth
      done();
    });

    ws.on('open', () => {
      done(new Error('Should not connect without auth'));
    });
  });

  it('should authenticate with valid token', (done) => {
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe(WebSocketMessageType.AUTH);
      expect(message.payload.success).toBe(true);
      ws.close();
      done();
    });

    ws.on('error', done);
  });

  it('should handle subscriptions', (done) => {
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: WebSocketMessageType.SUBSCRIBE,
        payload: { channel: 'test-channel' },
        timestamp: Date.now(),
      }));

      // Wait a bit to ensure subscription is processed
      setTimeout(() => {
        wsServer['wss'].clients.forEach((client: any) => {
          expect(client.subscriptions.has('test-channel')).toBe(true);
        });
        ws.close();
        done();
      }, 100);
    });

    ws.on('error', done);
  });

  it('should handle unsubscriptions', (done) => {
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });

    ws.on('open', () => {
      // Subscribe first
      ws.send(JSON.stringify({
        type: WebSocketMessageType.SUBSCRIBE,
        payload: { channel: 'test-channel' },
        timestamp: Date.now(),
      }));

      setTimeout(() => {
        // Then unsubscribe
        ws.send(JSON.stringify({
          type: WebSocketMessageType.UNSUBSCRIBE,
          payload: { channel: 'test-channel' },
          timestamp: Date.now(),
        }));

        // Wait to ensure unsubscription is processed
        setTimeout(() => {
          wsServer['wss'].clients.forEach((client: any) => {
            expect(client.subscriptions.has('test-channel')).toBe(false);
          });
          ws.close();
          done();
        }, 100);
      }, 100);
    });

    ws.on('error', done);
  });

  it('should broadcast messages to subscribed clients', (done) => {
    const ws1 = new WebSocket(wsUrl, {
      headers: { Authorization: 'Bearer valid-token' },
    });
    const ws2 = new WebSocket(wsUrl, {
      headers: { Authorization: 'Bearer valid-token' },
    });

    let connected = 0;
    const channel = 'test-channel';
    const testMessage = {
      type: WebSocketMessageType.TRADE_UPDATE,
      payload: { data: 'test' },
      timestamp: Date.now(),
    };

    const handleOpen = () => {
      connected++;
      if (connected === 2) {
        // Both clients connected, subscribe ws1 to channel
        ws1.send(JSON.stringify({
          type: WebSocketMessageType.SUBSCRIBE,
          payload: { channel },
          timestamp: Date.now(),
        }));

        // Wait for subscription to be processed
        setTimeout(() => {
          wsServer.broadcastToChannel(channel, testMessage);
        }, 100);
      }
    };

    let ws1Received = false;
    ws1.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === WebSocketMessageType.TRADE_UPDATE) {
        ws1Received = true;
        expect(message).toEqual(testMessage);
      }
    });

    let ws2Received = false;
    ws2.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === WebSocketMessageType.TRADE_UPDATE) {
        ws2Received = true;
      }
    });

    ws1.on('open', handleOpen);
    ws2.on('open', handleOpen);

    // Check results after all messages are processed
    setTimeout(() => {
      expect(ws1Received).toBe(true);
      expect(ws2Received).toBe(false);
      ws1.close();
      ws2.close();
      done();
    }, 500);
  });

  it('should handle disconnection cleanup', (done) => {
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: WebSocketMessageType.SUBSCRIBE,
        payload: { channel: 'test-channel' },
        timestamp: Date.now(),
      }));

      setTimeout(() => {
        ws.close();
        setTimeout(() => {
          expect(wsServer['wss'].clients.size).toBe(0);
          done();
        }, 100);
      }, 100);
    });

    ws.on('error', done);
  });
});