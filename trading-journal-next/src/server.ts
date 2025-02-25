import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { getWebSocketServer } from './server/websocket';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Prepare Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url!, true);
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize WebSocket server
  const wsServer = getWebSocketServer(server);

  // Start listening
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : 'production'
      }`
    );
  });

  // Handle graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'] as const;
  
  function cleanup(signal: typeof signals[number]) {
    console.log(`\n${signal} signal received. Closing server...`);
    server.close(() => {
      console.log('HTTP server closed');
      wsServer.close();
      console.log('WebSocket server closed');
      process.exit(0);
    });
  }

  signals.forEach(signal => {
    process.on(signal, () => cleanup(signal));
  });

}).catch((err) => {
  console.error('Error occurred starting server:', err);
  process.exit(1);
});