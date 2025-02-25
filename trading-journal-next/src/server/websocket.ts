import { WebSocket, WebSocketServer } from 'ws';
import { Server, IncomingMessage } from 'http';
import { parse } from 'url';
import { decode } from 'next-auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { WebSocketMessageType } from '@/lib/services/websocket';
import type { Socket } from 'net';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive: boolean;
  subscriptions: Set<string>;
}

interface BroadcastOptions {
  exclude?: WebSocket;
  filter?: (client: AuthenticatedWebSocket) => boolean;
}

export class TradeWebSocketServer {
  private wss: WebSocketServer;
  private pingInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });
    
    // Handle upgrade requests
    server.on('upgrade', this.handleUpgrade.bind(this));

    // Set up connection handling
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws as AuthenticatedWebSocket);
    });

    // Set up ping interval
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach(ws => {
        const client = ws as AuthenticatedWebSocket;
        if (!client.isAlive) {
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    // Clean up on server close
    this.wss.on('close', () => {
      clearInterval(this.pingInterval);
    });
  }

  private async handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const token = authHeader.split(' ')[1];
      const decoded = await decode({
        token,
        secret: process.env.NEXTAUTH_SECRET!,
      });

      if (!decoded?.sub) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        const authenticatedWs = ws as AuthenticatedWebSocket;
        authenticatedWs.userId = user.id;
        authenticatedWs.isAlive = true;
        authenticatedWs.subscriptions = new Set();
        this.wss.emit('connection', authenticatedWs, request);
      });

    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket) {
    console.log(`Client connected: ${ws.userId}`);

    // Handle pong messages
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle messages
    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case WebSocketMessageType.SUBSCRIBE:
            this.handleSubscribe(ws, message.payload.channel);
            break;

          case WebSocketMessageType.UNSUBSCRIBE:
            this.handleUnsubscribe(ws, message.payload.channel);
            break;

          default:
            console.warn('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`Client disconnected: ${ws.userId}`);
      ws.subscriptions.clear();
    });

    // Send initial connection success
    this.sendMessage(ws, {
      type: WebSocketMessageType.AUTH,
      payload: { success: true },
      timestamp: Date.now(),
    });
  }

  private handleSubscribe(ws: AuthenticatedWebSocket, channel: string) {
    ws.subscriptions.add(channel);
    console.log(`Client ${ws.userId} subscribed to ${channel}`);
  }

  private handleUnsubscribe(ws: AuthenticatedWebSocket, channel: string) {
    ws.subscriptions.delete(channel);
    console.log(`Client ${ws.userId} unsubscribed from ${channel}`);
  }

  public broadcast(message: any, options: BroadcastOptions = {}) {
    this.wss.clients.forEach(client => {
      const authClient = client as AuthenticatedWebSocket;
      if (
        client !== options.exclude &&
        client.readyState === WebSocket.OPEN &&
        (!options.filter || options.filter(authClient))
      ) {
        this.sendMessage(client, message);
      }
    });
  }

  public broadcastToChannel(channel: string, message: any, options: BroadcastOptions = {}) {
    this.broadcast(message, {
      ...options,
      filter: (client: AuthenticatedWebSocket) => 
        client.subscriptions.has(channel) &&
        (!options.filter || options.filter(client)),
    });
  }

  private sendMessage(ws: WebSocket, message: any) {
    ws.send(JSON.stringify(message));
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: WebSocketMessageType.ERROR,
      payload: { error },
      timestamp: Date.now(),
    });
  }

  public close() {
    clearInterval(this.pingInterval);
    this.wss.close();
  }
}

let wsServer: TradeWebSocketServer | null = null;

export function getWebSocketServer(httpServer: Server): TradeWebSocketServer {
  if (!wsServer) {
    wsServer = new TradeWebSocketServer(httpServer);
  }
  return wsServer;
}