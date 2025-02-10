# Implementation Plan for Ticker-Based Trade Grouping

## Changes Required

1. Add new interfaces to `src/types/trade.ts`:
```typescript
interface TickerGroup {
    ticker: string;
    lastTradeDate: Date;
    tradeGroups: TradeGroup[];
    totalRealizedPnL: number;
    totalUnrealizedPnL: number;
    totalDividends: number;
    totalFees: number;
    openPositions: number;
}

// Update UseGroupedTradesResult
interface UseGroupedTradesResult {
    tickerGroups: TickerGroup[];
    groups: TradeGroup[];
    summary: GroupedTradesSummary;
    // ... existing properties remain
}
```

2. Update `useGroupedTrades.ts`:
   - First group trades by ticker
   - Within each ticker group, organize trades into sequences
   - Maintain ticker-level metrics 
   - Sort ticker groups by last trade date
   - Keep individual trade groups for backward compatibility

3. Add new utility functions:
```typescript
function processTradeSequences(trades: Trade[]): TradeGroup[] {
    // Group trades into sequences based on buy/sell pattern
    // Return array of trade groups
}

function createTickerGroup(ticker: string): TickerGroup {
    // Create initial ticker group structure
}

function updateTickerMetrics(tickerGroup: TickerGroup) {
    // Calculate and update ticker-level metrics
}
```

4. Changes to UI needed:
   - Update TradeTable component to show ticker groups
   - Add collapsible sections for each ticker
   - Display ticker-level metrics
   - Show trade sequences within each ticker section

## Implementation Steps

1. Create new TypeScript interface definitions
2. Modify useMemo logic in useGroupedTrades
3. Add helper functions for sequence processing
4. Update UI components to handle new data structure
5. Test with various trade sequences
6. Ensure backward compatibility

## Migration Path

1. Keep existing trade group logic working while adding ticker groups
2. Test extensively with the provided test cases
3. Gradually transition UI to use new ticker-based structure
4. Maintain backward compatibility for any code using existing groups array

## Test Cases

