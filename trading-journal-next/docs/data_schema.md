# Database Schema Specification

## Overview
This document outlines the database schema for the Stock Trading Journal App. The application uses PostgreSQL as the primary database.

## Tables

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### trades
```sql
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    broker_trade_id VARCHAR(255),
    action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
    ticker VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(20,8),
    total_amount DECIMAL(20,8) NOT NULL,
    converted_currency VARCHAR(3),
    converted_amount DECIMAL(20,8),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, broker_trade_id)
);

CREATE INDEX idx_trades_user_ticker ON trades(user_id, ticker);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
```

### trade_groups
```sql
CREATE TABLE trade_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    ticker VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
    entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_date TIMESTAMP WITH TIME ZONE,
    initial_quantity DECIMAL(20,8) NOT NULL,
    remaining_quantity DECIMAL(20,8) NOT NULL,
    average_entry_price DECIMAL(20,8) NOT NULL,
    average_exit_price DECIMAL(20,8),
    realized_pnl DECIMAL(20,8),
    currency VARCHAR(3) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trade_groups_user ON trade_groups(user_id);
CREATE INDEX idx_trade_groups_status ON trade_groups(status);
```

### trade_group_entries
```sql
CREATE TABLE trade_group_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_group_id UUID REFERENCES trade_groups(id),
    trade_id UUID REFERENCES trades(id),
    quantity DECIMAL(20,8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trade_group_entries_group ON trade_group_entries(trade_group_id);
```

### technical_patterns
```sql
CREATE TABLE technical_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_group_id UUID REFERENCES trade_groups(id),
    pattern_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    entry_pattern BOOLEAN DEFAULT false,
    exit_pattern BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_technical_patterns_trade_group ON technical_patterns(trade_group_id);
```

### user_preferences
```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    default_currency VARCHAR(3) DEFAULT 'USD',
    theme VARCHAR(20) DEFAULT 'dark',
    chart_preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### exchange_rates
```sql
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL,
    quote_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(20,8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(base_currency, quote_currency, timestamp)
);

CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(base_currency, quote_currency, timestamp);
```

## Type Definitions

### TypeScript Interfaces

```typescript
interface Trade {
    id: string;
    userId: string;
    brokerTradeId: string;
    action: 'BUY' | 'SELL';
    ticker: string;
    name?: string;
    quantity: number;
    price: number;
    currency: string;
    exchangeRate?: number;
    totalAmount: number;
    convertedCurrency?: string;
    convertedAmount?: number;
    timestamp: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface TradeGroup {
    id: string;
    userId: string;
    ticker: string;
    status: 'OPEN' | 'CLOSED';
    entryDate: Date;
    exitDate?: Date;
    initialQuantity: number;
    remainingQuantity: number;
    averageEntryPrice: number;
    averageExitPrice?: number;
    realizedPnl?: number;
    currency: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface TechnicalPattern {
    id: string;
    tradeGroupId: string;
    patternType: string;
    confidence: number;
    entryPattern: boolean;
    exitPattern: boolean;
    timestamp: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
}

interface UserPreferences {
    id: string;
    userId: string;
    defaultCurrency: string;
    theme: string;
    chartPreferences: Record<string, any>;
    notificationSettings: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
```

## Migrations

Current migrations are stored in `src/app/api/migrations/` and include:
- Initial schema creation
- Add unique constraint to trades
- Add technical patterns table
- Add exchange rates table

## Relationships

1. User -> Trades: One-to-Many
2. User -> Trade Groups: One-to-Many
3. Trade Group -> Trades: Many-to-Many (through trade_group_entries)
4. Trade Group -> Technical Patterns: One-to-Many
5. User -> Preferences: One-to-One

## Indexes

Key indexes are created for:
- User lookups
- Trade filtering by ticker
- Date-based queries
- Trade group status filtering
- Exchange rate lookups

## Constraints

1. Trade actions must be 'BUY' or 'SELL'
2. Trade group status must be 'OPEN' or 'CLOSED'
3. Unique constraint on broker_trade_id per user
4. Foreign key constraints for referential integrity
5. Not null constraints on required fields

## Future Enhancements

1. Partitioning for trades table by date
2. Archival strategy for historical data
3. Additional indexes based on query patterns
4. Cache layer for frequently accessed data
5. Audit logging for changes

This schema will evolve as new features are added to the application.