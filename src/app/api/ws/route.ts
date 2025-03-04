import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Server as HTTPServer } from 'http';
import { getWebSocketServer } from '@/server/websocket';

// This is needed to handle WebSocket upgrade
const httpServer = new HTTPServer();

// Initialize WebSocket server
const wsServer = getWebSocketServer(httpServer);

export async function GET(req: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = await getToken({
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET,
      raw: true,
    });
    
    if (!decoded) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Handle WebSocket upgrade
    // Note: In Next.js 14+ app directory, we need a different approach for WebSockets
    // This response won't actually be seen by the client - it's just a placeholder
    // The WebSocket upgrade is handled by the server middleware
    return new Response('WebSocket endpoint', {
      headers: {
        'Upgrade': 'websocket',
      }
    });
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}