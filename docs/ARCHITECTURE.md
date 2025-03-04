# Trading Journal Next.js Application Architecture

## Project Overview

A comprehensive trading journal application built with Next.js that enables users to track, analyze, and visualize their trading activities.

## Core Features

1. Trade Management
   - Import trades from various sources
   - View and filter trade history
   - Group trades by different criteria
   - Demo trade generation for testing

2. Analytics & Visualization
   - Equity curve charting
   - Performance statistics grid
   - Trade metrics calculation
   - Real-time data processing

3. Settings & Configuration
   - Application preferences
   - Data import/export options
   - Database management

## System Architecture

### Frontend Layer (Next.js)
- **Page Components** (`src/app/*`)
  - Main dashboard (`page.tsx`)
  - Trade management (`trades/page.tsx`)
  - Import interface (`import/page.tsx`)
  - Settings (`settings/page.tsx`)

- **Core Components** (`src/components/*`)
  - Dashboard components (charts, stats)
  - Trade table and filters
  - Layout elements (navigation, sidebar)
  - UI components

### Data Layer
- **Database Interface** (`src/lib/db/*`)
  - Database configuration
  - Connection management
  - Migration handling

- **API Routes** (`src/app/api/*`)
  - Trade management endpoints
  - Statistics calculation
  - Database operations
  - Demo data generation

### Business Logic Layer (`src/lib/*`)
- **Hooks** (`src/lib/hooks/*`)
  - Trade processing and grouping
  - Statistics calculation
  - Data fetching and caching

- **Utilities** (`src/lib/utils/*`)
  - Data formatting
  - External API integration (Yahoo Finance)
  - Ticker symbol mapping

## Data Flow

1. User Actions
   - Import trades → API endpoints → Database
   - View trades → Hooks → Components
   - Filter/Group → Client-side processing → UI updates

2. Data Processing
   - Raw trade data → Processing hooks → Grouped/Filtered results
   - Trade metrics → Stats calculation → Dashboard visualization

3. External Integration
   - Market data fetching (Yahoo Finance)
   - Data import from trading platforms

## Security & Performance

1. Data Integrity
   - Unique constraints on trades
   - Data validation at API level
   - Safe database migrations

2. Performance Optimization
   - Client-side data processing
   - Efficient trade grouping
   - Lazy loading and pagination

## Future Considerations

1. Scalability
   - Enhanced data processing
   - Additional data sources
   - Extended analytics

2. Maintenance
   - Regular dependency updates
   - Database optimizations
   - Code refactoring guidelines