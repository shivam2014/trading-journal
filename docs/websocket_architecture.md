# WebSocket Architecture and Real-Time Features

This document outlines the WebSocket implementation and real-time features of the Trading Journal application.

## Overview

The Trading Journal application implements a robust WebSocket architecture to provide real-time updates for:
- Trade data synchronization
- Price updates for watched symbols
- Technical pattern notifications
- User notifications

## Components

### 1. Server-Side Implementation

The server-side WebSocket implementation consists of two main classes:

#### `TradeWebSocketServer`
- Located in `src/server/websocket.ts`
- Responsible for authenticated WebSocket connections
- Handles user-specific trade data synchronization
- Implements a channel-based pub/sub system for targeted updates
- Features:
  - JWT authentication for secure connections
  - Automatic reconnection handling
  - Connection health monitoring (ping/pong)
  - Database change detection for trade updates

#### `WebSocketServer` 
- Implemented as a secondary class for market data streaming
- Manages watched symbols for real-time price updates
- Integrates with Yahoo Finance API for market data
- Delivers technical analysis pattern notifications

### 2. Client-Side Implementation

The client-side implementation consists of:

#### `WebSocketService`
- Located in `src/lib/services/websocket.ts`
- Singleton service for managing WebSocket connections
- Features:
  - Automatic reconnection with exponential backoff
  - Event-based subscription model
  - Channel-based messaging
  - Connection state management

#### `useTradeSync` Hook
- Located in `src/lib/hooks/useTradeSync.ts`
- React hook for component-level WebSocket integration
- Provides:
  - Real-time trade data
  - Trade update/delete operations
  - Connection state information
  - Pending action tracking

### 3. Notification System

The notification system is implemented with:

#### `NotificationService`
- Located in `src/lib/services/notifications.ts`
- Manages notifications across the application
- Features:
  - In-memory and localStorage-based storage
  - WebSocket integration for real-time notifications
  - Notification type categorization (info, success, warning, error)
  - Read/unread state management

#### `useNotifications` Hook
- Located in `src/lib/hooks/useNotifications.ts`
- React hook for using notifications in components
- Provides:
  - Access to notification list and unread count
  - Methods to create, mark read, and clear notifications

#### `NotificationCenter` Component
- Located in `src/components/ui/NotificationCenter.tsx`
- UI component for displaying and managing notifications
- Features:
  - Accessible from the navigation bar
  - Shows unread notification count badge
  - Allows marking notifications as read
  - Supports notification links and actions

### 4. Market Data Components

Real-time market data is displayed through:

#### `MarketWatchlist` Component
- Located in `src/components/market/MarketWatchlist.tsx`
- Displays real-time prices for watched symbols
- Shows technical patterns as they're detected
- Allows adding/removing symbols from watchlist

#### `MarketDataCard` Component
- Located in `src/components/dashboard/MarketDataCard.tsx`
- Shows major indices and watchlist data
- Updates prices periodically and through WebSocket
- Integrates with notifications for pattern alerts

### 5. Authentication Flow

1. Client obtains JWT token from NextAuth.js
2. Token is passed in WebSocket connection request
3. Server verifies token using NextAuth.js secret
4. If valid, connection is established and user ID is associated with the socket
5. If invalid, connection is rejected

### 6. Message Types

WebSocket communication uses typed messages defined in `WebSocketMessageType` enum:

```typescript
enum WebSocketMessageType {
  // Authentication and connection messages
  AUTH, ERROR, PING, PONG,
  
  // Subscription messages
  SUBSCRIBE, UNSUBSCRIBE,
  
  // Trade-related messages
  TRADES_UPDATE, TRADE_UPDATE, TRADE_SYNC, TRADE_SYNC_CONFIRM,
  
  // Market data messages
  MARKET_DATA, PRICE_UPDATE, PATTERN_DETECTED,
  
  // Notification messages
  NOTIFICATION
}
```

### 7. Channel-Based Communication

The system uses a channel-based approach for targeted communication:
- Users subscribe to specific channels (e.g., `trades:{userId}`, `symbol:AAPL`)
- Updates are broadcasted only to relevant subscribers
- Reduces unnecessary traffic and processing

## Technical Details

### Connection Management

- WebSocket connections use secure WebSocket protocol (WSS) in production
- Connections are authenticated using JWT tokens from NextAuth.js
- Health checks via ping/pong messages every 30 seconds
- Automatic reconnection with exponential backoff and jitter

### Data Flow

1. **Trade Updates**:
   - Changes in trade data are detected via database polling
   - Updates are broadcasted to subscribed clients on `trades:{userId}` channel
   - Clients can initiate trade updates via `TRADE_SYNC` messages

2. **Price Updates**:
   - Clients subscribe to symbol channels
   - Server fetches price data from Yahoo Finance API
   - Updates are sent at regular intervals (5 seconds)
   - Data is cached to reduce API calls

3. **Pattern Detection**:
   - Historical data is analyzed using Technical Analysis service
   - Detected patterns are broadcasted to symbol subscribers
   - Recent patterns are filtered to prevent duplicate notifications

4. **Notifications**:
   - Server sends notifications via WebSocket
   - Client stores notifications in memory and localStorage
   - UI components react to notification state changes
   - Users can interact with notifications through the NotificationCenter

## Performance Considerations

- In-memory caching for frequently requested data
- Connection pooling for database operations
- Rate limiting for external API calls
- Batched updates to reduce message frequency
- Message payload optimization
- Local storage for persisting notifications between sessions

## Security Measures

- JWT authentication for all WebSocket connections
- Input validation for all incoming messages
- Channel-based authorization (users can only access their own data)
- Secure WebSocket protocol (WSS) in production
- Protection against common WebSocket vulnerabilities

## Implementation Status

- ✅ WebSocket server implementation
- ✅ WebSocket client service
- ✅ Authentication and security
- ✅ Market data streaming
- ✅ Notification system
- ✅ Channel-based subscriptions
- ✅ Price updates
- ✅ Pattern detection
- ✅ Dashboard integration
- ✅ Real-time watchlist
- ❌ Database triggers for change detection (future enhancement)
- ❌ Message compression (future enhancement)

## Future Enhancements

- Replace polling with database triggers for change detection
- Implement message compression for large payloads
- Add message acknowledgment system for critical updates
- Integrate with external notification services for push notifications
- Implement advanced reconnection strategies

## API Documentation

### Client API

#### Initializing the WebSocket service

```typescript
// Initialize with authentication token
webSocketService.initialize(token);
```

#### Subscribing to channels

```typescript
// Subscribe to a channel
webSocketService.subscribe(`trades:${userId}`);
webSocketService.subscribe(`symbol:AAPL`);
```

#### Sending messages

```typescript
// Send a message
webSocketService.sendMessage({
  type: WebSocketMessageType.TRADE_SYNC,
  payload: { tradeId, action, data },
  timestamp: Date.now()
});
```

#### Event handling

```typescript
// Listen for events
webSocketService.on(WebSocketMessageType.TRADE_UPDATE, (data) => {
  // Handle trade update
});
```

### Notification API

```typescript
// Create notifications
notificationService.info('Title', 'Message');
notificationService.success('Title', 'Message');
notificationService.warning('Title', 'Message');
notificationService.error('Title', 'Message');

// Using the hook in React components
const { 
  notifications, 
  unreadCount,
  info, success, warning, error,
  markAsRead, markAllAsRead, clearNotifications
} = useNotifications();
```

### React Hook API

```typescript
// In a React component
const { 
  trades,
  isConnected,
  updateTrade,
  deleteTrade,
  pendingActions
} = useTradeSync({
  onTradeUpdate: (update) => console.log('Trade updated:', update),
  onConnect: () => console.log('Connected'),
  autoReconnect: true
});
```

## Testing

- Unit tests for WebSocket service
- Integration tests for React hooks
- End-to-end tests for WebSocket communication
- Mocks for external dependencies

## Deployment Considerations

- WebSocket servers require sticky sessions in load-balanced environments
- Configure proper timeouts for idle connections
- Set up monitoring for connection count and message throughput
- Implement circuit breakers for external services