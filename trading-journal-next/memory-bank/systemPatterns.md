# System Patterns and Best Practices

## Custom Hook Patterns
1. Resource Hooks
   - useTrades: Central trade data management
   - useCurrency: Currency conversion with real-time updates
   - useWebSocket: WebSocket connection management with reconnection logic
    
2. Feature Hooks
   - useTradeGrouping: Trade organization logic
   - useTradeStats: Performance metrics calculation
   - useTechnicalAnalysis: Technical indicators

## Component Patterns
1. Data Display
   - Table components with sorting/filtering
   - Chart components with dynamic updates
   - Skeleton loaders for loading states
   - Real-time data updates via WebSocket

2. Layout Structure
   - Page-level components in app directory
   - Reusable UI components in components/ui
   - Feature-specific components in dedicated directories
   - Socket-aware components with connection status handling

## State Management
1. Server State
   - React Query for data fetching
   - Optimistic updates for better UX
   - Background data synchronization
   - WebSocket integration for real-time updates

2. Local State
   - useState for simple component state
   - Context API for shared state
   - Custom hooks for complex logic
   - Socket connection state management

## Testing Patterns
1. Hook Testing
   - Mock external dependencies
   - Test state updates
   - Verify side effects
   - WebSocket connection testing
   - Currency conversion validation

2. Component Testing
   - Test user interactions
   - Verify render logic
   - Mock API calls
   - WebSocket event handling tests

## Error Handling
1. API Errors
   - Typed error responses
   - Centralized error processing
   - User-friendly messages
   - WebSocket error recovery

2. Validation
   - Schema-based validation
   - Real-time feedback
   - Clear error messages
   - Currency conversion edge cases

## Performance Optimization
1. Data Management
   - Pagination for large datasets
   - Caching strategies
   - Optimistic updates
   - WebSocket message batching
   - Currency rate caching

2. Rendering
   - Component memoization
   - Virtual scrolling
   - Code splitting
   - Efficient WebSocket updates

## WebSocket Patterns
1. Connection Management
   - Automatic reconnection
   - Exponential backoff
   - Connection status tracking
   - Health checks

2. Message Handling
   - Type-safe messages
   - Message queuing
   - Rate limiting
   - Error recovery

## Documentation Standards
1. Code Documentation
   - JSDoc for complex functions
   - Type definitions
   - Usage examples
   - WebSocket event documentation

2. Project Documentation
   - Architecture overview
   - Setup instructions
   - API documentation
   - WebSocket protocol documentation