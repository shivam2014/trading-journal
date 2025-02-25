# System Dependencies and Knowledge Graph

## Component Relationships

```mermaid
graph TB
    subgraph Frontend
        Dashboard[Dashboard page]
        Trades[Trades page]
        Import[Import page]
        Settings[Settings page]
    end

    subgraph Components
        EquityChart[EquityChart]
        StatsGrid[StatsGrid]
        TradeTable[TradeTable]
        TradeFilters[TradeFilters]
        ImportTrades[ImportTrades]
    end

    subgraph Hooks
        useTradeProcessing[useTradeProcessing]
        useGroupedTrades[useGroupedTrades]
        useTradeStats[useTradeStats]
        useTradeGroupMetrics[useTradeGroupMetrics]
    end

    subgraph API
        TradesAPI[/api/trades]
        StatsAPI[/api/stats]
        MigrationsAPI[/api/migrations]
    end

    subgraph Utils
        YahooFinance[yahoo-finance.ts]
        Format[format.ts]
        TickerMapping[ticker-mapping.ts]
    end

    %% Frontend Dependencies
    Dashboard --> EquityChart
    Dashboard --> StatsGrid
    Trades --> TradeTable
    Trades --> TradeFilters
    Import --> ImportTrades

    %% Component Dependencies
    EquityChart --> useTradeStats
    StatsGrid --> useTradeStats
    TradeTable --> useGroupedTrades
    TradeFilters --> useGroupedTrades
    ImportTrades --> TradesAPI

    %% Hook Dependencies
    useTradeProcessing --> TradesAPI
    useGroupedTrades --> useTradeProcessing
    useTradeStats --> useTradeProcessing
    useTradeGroupMetrics --> useGroupedTrades

    %% API Dependencies
    TradesAPI --> YahooFinance
    YahooFinance --> TickerMapping
    TradesAPI --> Format
```

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph Input
        IF[Import File]
        MA[Manual Addition]
    end

    subgraph Processing
        VP[Validation & Processing]
        TG[Trade Grouping]
        MC[Metrics Calculation]
    end

    subgraph Storage
        DB[(Database)]
    end

    subgraph Output
        EC[Equity Chart]
        TT[Trade Table]
        SG[Stats Grid]
    end

    IF --> VP
    MA --> VP
    VP --> DB
    DB --> TG
    TG --> MC
    MC --> EC
    MC --> SG
    TG --> TT
```

## Critical Code Paths

```mermaid
graph TD
    subgraph Trade Import
        A[Import File] -->|Validation| B[Parse Data]
        B -->|Processing| C[Store Trades]
        C -->|Update| D[Refresh Views]
    end

    subgraph Performance Calculation
        E[Fetch Trades] -->|Group| F[Calculate Metrics]
        F -->|Aggregate| G[Update Stats]
        G -->|Render| H[Display Charts]
    end

    subgraph Real-time Updates
        I[Price Update] -->|Fetch| J[Yahoo Finance]
        J -->|Process| K[Update Trade]
        K -->|Recalculate| L[Update UI]
    end
```

## Module Interface Map

```mermaid
classDiagram
    class Trade {
        +string id
        +string symbol
        +number entry_price
        +number exit_price
        +number quantity
        +string direction
        +Date entry_date
        +Date exit_date
        +number pnl
        +number fees
        +string? notes
    }

    class TradeGroup {
        +Trade[] trades
        +calculateMetrics()
        +getStats()
    }

    class TradeProcessor {
        +processTrades()
        +groupTrades()
        +calculateStats()
    }

    class YahooFinance {
        +fetchHistoricalPrices()
        +fetchCurrentPrice()
        +validateSymbol()
    }

    Trade -- TradeGroup
    TradeGroup -- TradeProcessor
    TradeProcessor -- YahooFinance
```

## Key API Interfaces

```mermaid
graph LR
    subgraph External APIs
        YF[Yahoo Finance API]
    end

    subgraph Internal APIs
        TA[Trades API]
        SA[Stats API]
        MA[Migrations API]
    end

    subgraph Database
        DB[(PostgreSQL)]
    end

    YF -->|Market Data| TA
    TA -->|CRUD| DB
    SA -->|Read| DB
    MA -->|Manage| DB
```

## Development Workflow

```mermaid
graph LR
    subgraph Development
        CD[Code Changes]
        TU[Unit Tests]
        IT[Integration Tests]
    end

    subgraph Deployment
        ST[Staging]
        PR[Production]
    end

    CD -->|Validate| TU
    TU -->|Pass| IT
    IT -->|Success| ST
    ST -->|Verify| PR
```

This knowledge graph provides a comprehensive view of:
1. Component relationships and dependencies
2. Data flow through the system
3. Critical code paths and their interactions
4. Module interfaces and their connections
5. API architecture and database interactions
6. Development and deployment workflow

Use this documentation to:
- Understand system architecture
- Track dependencies between components
- Identify potential bottlenecks
- Plan feature implementations
- Guide code reviews
- Assist in debugging