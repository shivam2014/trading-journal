import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { WebSocket } from 'isomorphic-ws';
import { neonConfig } from '@neondatabase/serverless';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required');
}

const connectionString = process.env.POSTGRES_URL;

// Configure WebSocket for server environment
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = WebSocket;
}

// Configure secure WebSocket
neonConfig.useSecureWebSocket = true;

// Use the pooled connection string
const sql: NeonQueryFunction<true, false> = neon(connectionString);

interface QueryResult<T> {
  rows: T[];
}

// Export a db object with a query method to maintain compatibility with existing code
export const db = {
  query: async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
    try {
      // Wrap the query with a timeout promise
      const queryWithTimeout = async () => {
        const timeoutMs = 15000; // 15 seconds total timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Query timed out after ${timeoutMs}ms`)), timeoutMs)
        );
        const queryPromise = sql(text, params);
        return Promise.race([queryPromise, timeoutPromise]);
      };

      const result = await queryWithTimeout();
      
      // For SELECT queries, results are already in the correct format
      if (text.trim().toLowerCase().startsWith('select')) {
        return { 
          rows: result.map((row: any) => {
            // Convert any fields that should be numbers
            if ('shares' in row) row.shares = Number(row.shares);
            if ('price' in row) row.price = Number(row.price);
            if ('result' in row) row.result = Number(row.result);
            if ('fees' in row) row.fees = Number(row.fees);
            if ('count' in row) row.count = Number(row.count);
            return row;
          }) as T[]
        };
      }
      
      // For other queries (INSERT, UPDATE, DELETE), wrap the result
      return {
        rows: [result] as T[]
      };
    } catch (error) {
      console.error('Database query error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        query: text
      });

      // Use the connection string we validated at the top
      const connUrl = new URL(connectionString);
      const connInfo = {
        host: connUrl.hostname,
        database: connUrl.pathname.slice(1),
        ssl: true
      };
      
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}\nConnection info: ${JSON.stringify(connInfo)}`);
    }
  }
};