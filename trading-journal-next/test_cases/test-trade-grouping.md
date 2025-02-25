# Testing Trade Group Implementation

## Test Cases

### 1. Sequential Trade Groups
Test a simple sequence where one group completes before another begins:

```json
[
  {
    "ticker": "AAPL",
    "action": "BUY",
    "shares": 10,
    "price": 150,
    "timestamp": "2024-01-01T10:00:00Z"
  },
  {
    "ticker": "AAPL",
    "action": "SELL",
    "shares": 10,
    "price": 155,
    "timestamp": "2024-01-02T10:00:00Z"
  },
  {
    "ticker": "AAPL",
    "action": "BUY",
    "shares": 5,
    "price": 160,
    "timestamp": "2024-01-03T10:00:00Z"
  },
  {
    "ticker": "AAPL",
    "action": "SELL",
    "shares": 5,
    "price": 165,
    "timestamp": "2024-01-04T10:00:00Z"
  }
]
```

Expected result: Two separate groups, each with its own complete buy-sell cycle.

### 2. Partial Position Closing
Test handling of partially closed positions:

```json
[
  {
    "ticker": "TSLA",
    "action": "BUY",
    "shares": 10,
    "price": 200,
    "timestamp": "2024-01-01T10:00:00Z"
  },
  {
    "ticker": "TSLA",
    "action": "SELL",
    "shares": 5,
    "price": 220,
    "timestamp": "2024-01-02T10:00:00Z"
  }
]
```

Expected result: One group with status "PARTIALLY_CLOSED" and percentClosed = 50.

### 3. Multiple Buy Orders Before Selling
Test accumulation of positions:

```json
[
  {
    "ticker": "MSFT",
    "action": "BUY",
    "shares": 5,
    "price": 300,
    "timestamp": "2024-01-01T10:00:00Z"
  },
  {
    "ticker": "MSFT",
    "action": "BUY",
    "shares": 5,
    "price": 310,
    "timestamp": "2024-01-02T10:00:00Z"
  },
  {
    "ticker": "MSFT",
    "action": "SELL",
    "shares": 10,
    "price": 320,
    "timestamp": "2024-01-03T10:00:00Z"
  }
]
```

Expected result: One group containing all trades that closes completely.

### 4. Dividend Handling
Test proper association of dividends with active positions:

```json
[
  {
    "ticker": "KO",
    "action": "BUY",
    "shares": 100,
    "price": 50,
    "timestamp": "2024-01-01T10:00:00Z"
  },
  {
    "ticker": "KO",
    "action": "DIVIDEND",
    "shares": 100,
    "price": 0.44,
    "timestamp": "2024-01-15T10:00:00Z"
  },
  {
    "ticker": "KO",
    "action": "SELL",
    "shares": 100,
    "price": 52,
    "timestamp": "2024-01-30T10:00:00Z"
  }
]
```

Expected result: One group containing both the trades and the dividend payment.

## How to Test

1. Clear existing data:
   - Go to Settings
   - Use "Clear All Data" option

2. Import test data:
   - Go to Import page
   - Paste one of the test case JSON blocks
   - Click Import

3. Verify results:
   - Go to Trades page
   - Check that trades are grouped correctly according to the expected results
   - Verify group statuses (OPEN, CLOSED, PARTIALLY_CLOSED)
   - Check that metrics (realized P&L, percentClosed) are calculated correctly
   - For dividend tests, verify that dividends are associated with the correct group

## Additional Verifications

1. Check that group sorting works:
   - Groups should be sorted by most recent trade timestamp
   - Within groups, trades should be sorted chronologically

2. Verify group metrics:
   - netShares should reflect current position size
   - realizedPnL should only include closed trades
   - percentClosed should accurately reflect portion sold

3. Test edge cases:
   - Multiple positions in same ticker
   - Positions with different strategies
   - Positions with different sessions
   - Dividend payments during partially closed positions

If all test cases pass, the trade grouping implementation is working as expected.