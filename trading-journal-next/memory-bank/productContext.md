# Trading Journal Project Context

## Project Overview
A comprehensive trading journal application built with Next.js that enables traders to import, analyze, and visualize their trading activities.

## Core Objectives
1. Simplify trade data management and analysis
2. Provide actionable insights through visualization
3. Support multiple data sources and currencies
4. Maintain high performance with real-time updates

## Technical Stack
- Frontend: Next.js 14 with React and TypeScript
- Styling: Tailwind CSS
- Backend: Next.js API Routes
- Database: PostgreSQL
- Real-time Updates: WebSocket/Socket.io
- Deployment: Docker with AWS/Google Cloud

## Project Structure
1. Frontend Layer (src/app/*)
   - Main dashboard
   - Trade management
   - Import interface
   - Settings

2. Core Components (src/components/*)
   - Dashboard components
   - Trade management
   - Layout elements
   - UI components

3. Data Layer
   - Database interface
   - API routes
   - Migration handling

4. Business Logic (src/lib/*)
   - Custom hooks
   - Utilities
   - Services

## Development Status
Currently implementing core features:
- ✅ Basic trade import functionality
- ✅ Trade grouping logic
- ✅ Performance metrics
- 🟡 Currency conversion
- 🟡 Technical analysis
- ⚪️ Authentication
- ⚪️ Docker deployment

## Memory Bank File Purposes
- activeContext.md: Tracks current session state and goals
- progress.md: Documents completed work and next steps
- decisionLog.md: Records key architectural and technical decisions
- productContext.md: Maintains project overview and context (this file)
- systemPatterns.md: Documents identified patterns and best practices

## Future Considerations
1. Scalability
   - Enhanced data processing
   - Additional data sources
   - Extended analytics

2. Maintenance
   - Regular dependency updates
   - Database optimizations
   - Code refactoring guidelines