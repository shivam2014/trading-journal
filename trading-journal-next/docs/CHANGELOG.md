# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Real-time Updates:
  - WebSocket server implementation
  - Authenticated WebSocket connections
  - Channel-based subscriptions
  - Live trade updates
  - Real-time price updates
  - Connection management with auto-reconnect
  - WebSocket hooks for React components
  - Comprehensive test coverage for WebSocket features

- Authentication system:
  - User registration and login
  - Social authentication (Google, GitHub)
  - JWT-based session management
  - Protected routes and API endpoints
  - User roles and permissions
  - Authentication middleware
  - Custom hooks for auth management
  - Sign in and registration pages

- Technical Analysis functionality:
  - Integration with TA-Lib for indicators and patterns
  - Technical analysis service with caching
  - Pattern detection for common candlestick patterns
  - Multiple technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands)
  - REST API endpoints for analysis
  - TechnicalAnalysis React component
  - Comprehensive test coverage for technical analysis features

- Currency conversion functionality:
  - Currency service with caching and batch conversion support
  - REST API endpoints for currency conversion
  - React Query integration for data fetching and caching
  - CurrencySelector component with loading and error states
  - Support for real-time exchange rates via OpenExchangeRates API

### Enhanced
- Server Infrastructure:
  - Custom server setup for WebSocket support
  - Combined HTTP and WebSocket server
  - Graceful shutdown handling
  - Environment-specific configurations
  - Server-side TypeScript support

- Database schema:
  - Added user authentication models
  - Implemented relations between users and trades
  - Added user preferences table
  - Enhanced trade data model with broker information

- Trade import functionality:
  - Improved CSV parsing with progress tracking
  - Better validation using Zod
  - Enhanced error handling and reporting
  - Support for Trading212 CSV format
  - User-specific trade imports

### Security
- Implemented JWT-based authentication
- Added CSRF protection
- Secure password hashing
- Rate limiting on authentication endpoints
- Protected routes and API endpoints
- Role-based access control
- WebSocket connection authentication

### Development Setup
- Testing Framework:
  - Jest configuration with React Testing Library
  - WebSocket testing utilities
  - Mock implementations for external services
  - Authentication test utilities
  - Test coverage requirements

- Code Quality Tools:
  - ESLint with TypeScript support
  - Prettier code formatting
  - Husky pre-commit hooks
  - Lint-staged configuration

- Development Environment:
  - Docker configuration
  - PostgreSQL and Redis services
  - Development workflow scripts
  - Environment variable management
  - Custom server configuration

### Planned
- Enhanced trade grouping
- Portfolio analysis features
- Mobile responsiveness improvements
- Advanced charting capabilities
- Trade strategy backtesting

## [0.1.0] - Initial Release

### Added
- Basic Next.js project setup
- Trade data import functionality
- Simple trade grouping
- Basic performance metrics
- Initial database integration
- Basic UI components

### Components
- Dashboard with equity curve
- Trade table with basic functionality
- CSV import interface
- Basic navigation

### Dependencies
- Next.js 15.1.6
- React 19.0.0
- TypeScript 5
- Chart.js integration
- Database connectors
- CSV parsing utilities