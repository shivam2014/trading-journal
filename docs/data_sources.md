# Data Sources Specification

## Overview
This document outlines all external data sources, APIs, and integrations required for the Stock Trading Journal App, including authentication methods, rate limits, and data structures.

## Broker Integrations

### Trading212 (Primary)
- **Integration Type**: CSV Import + API (when available)
- **Data Format**: 
  ```csv
  Action,Time,ISIN,Ticker,Name,No. of shares,Price per share,Currency,Exchange rate,Total,Currency (converted),Total (converted),ID,Notes
  ```
- **Authentication**: N/A for CSV
- **Rate Limits**: N/A for CSV
- **Implementation Priority**: High (Primary broker)
- **Data Handling**:
  - Parse CSV format
  - Handle partial executions
  - Currency conversion
  - Trade grouping

### Future Broker Integrations
1. **Interactive Brokers**
   - REST API
   - OAuth authentication
   - Real-time data available
   - Comprehensive trading data

2. **TD Ameritrade**
   - REST API
   - OAuth 2.0
   - Real-time streaming
   - Options data support

3. **E*TRADE**
   - REST API
   - OAuth 1.0a
   - Real-time quotes
   - Historical data

## Market Data Sources

### Alpha Vantage
- **Purpose**: Historical price data, technical indicators
- **Endpoint**: `https://www.alphavantage.co/query`
- **Authentication**: API Key
- **Rate Limits**: 5 API calls per minute (free tier)
- **Key Endpoints**:
  ```typescript
  interface AlphaVantageEndpoints {
    TIME_SERIES_DAILY: string;
    TIME_SERIES_INTRADAY: string;
    GLOBAL_QUOTE: string;
    TECHNICAL_INDICATORS: string;
  }
  ```

### Yahoo Finance
- **Purpose**: Real-time quotes, company info
- **Endpoint**: `https://query2.finance.yahoo.com/v8/finance/chart`
- **Authentication**: None required
- **Rate Limits**: Unofficial API, handle with care
- **Current Implementation**: `src/lib/utils/yahoo-finance.ts`
- **Data Structure**:
  ```typescript
  interface YahooFinanceQuote {
    symbol: string;
    price: number;
    volume: number;
    timestamp: number;
    change: number;
    changePercent: number;
  }
  ```

### Polygon.io (Planned)
- **Purpose**: Market data aggregation
- **Endpoint**: `https://api.polygon.io/v2`
- **Authentication**: API Key
- **Rate Limits**: Varies by subscription
- **Key Features**:
  - Real-time trades
  - Historical data
  - Technical indicators
  - News feed

## Currency Exchange Rates

### Open Exchange Rates
- **Purpose**: Real-time currency conversion
- **Endpoint**: `https://openexchangerates.org/api`
- **Authentication**: App ID
- **Rate Limits**: 1,000 requests/month (free tier)
- **Key Endpoints**:
  - Latest rates: `/latest.json`
  - Historical: `/historical/[date].json`
  - Currencies: `/currencies.json`
- **Implementation**:
  ```typescript
  interface ExchangeRateData {
    base: string;
    rates: {
      [currency: string]: number;
    };
    timestamp: number;
  }
  ```

### Fallback: ExchangeRate-API
- **Purpose**: Backup currency conversion
- **Endpoint**: `https://api.exchangerate-api.com/v4`
- **Authentication**: API Key
- **Rate Limits**: 1,500 requests/month (free tier)

## Technical Analysis

### TA-Lib
- **Purpose**: Technical indicator calculations
- **Type**: Local library
- **Language**: C++ with Node.js bindings
- **Installation**: npm package
- **Key Functions**:
  - Pattern recognition
  - Indicator calculations
  - Overlap studies
  - Momentum indicators

### TradingView (Future Integration)
- **Purpose**: Advanced charting
- **Type**: External widget/API
- **Authentication**: API Key
- **Features**:
  - Interactive charts
  - Technical indicators
  - Drawing tools
  - Real-time data

## Data Storage

### PostgreSQL Database
- **Purpose**: Primary data storage
- **Schema**: See `data_schema.md`
- **Key Tables**:
  - trades
  - trade_groups
  - user_preferences
  - technical_patterns

### Redis Cache (Planned)
- **Purpose**: Real-time data caching
- **Data Types**:
  - Currency rates
  - Real-time quotes
  - User sessions

## Implementation Notes

### API Error Handling
```typescript
interface APIError {
  source: string;
  code: string;
  message: string;
  timestamp: number;
  retryable: boolean;
}

const handleAPIError = async (error: APIError) => {
  if (error.retryable) {
    // Implement retry logic
  }
  // Log error and notify user
};
```

### Rate Limiting
```typescript
interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number;
  retryAfter?: number;
}

const rateLimiters = new Map<string, RateLimitConfig>();
```

### Data Validation
- Implement validation for all external data
- Handle missing or malformed data
- Normalize data formats
- Handle timezone differences

### Backup Strategies
1. Local CSV caching
2. Alternative data sources
3. Offline mode support
4. Data reconciliation

## Future Enhancements
1. WebSocket integration for real-time data
2. Additional broker APIs
3. Machine learning data sources
4. News and sentiment analysis
5. Social trading integration

This document will be updated as new data sources are added or existing integrations are modified.