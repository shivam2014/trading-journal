# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- WebSocket Infrastructure:
  - Robust WebSocket server with auto-reconnection
  - Channel-based subscription system
  - Real-time price and trade updates
  - Pattern detection notifications
  - Authenticated connections with JWT
  - Comprehensive test coverage with mock implementations

- Currency Features:
  - Real-time exchange rate updates via WebSocket
  - Currency conversion service with caching
  - Rate limiting and error recovery
  - Batch conversion support
  - CurrencySelector component with error states

- Technical Analysis:
  - Integration with TA-Lib
  - Real-time pattern detection
  - Multiple technical indicators
  - Interactive charting components
  - Pattern confidence scoring

### Enhanced
- Performance Optimizations:
  - WebSocket connection pooling
  - Exchange rate caching
  - Batch currency conversions
  - Pattern detection optimizations

### Security
- WebSocket authentication
- Rate limiting implementation
- Error handling improvements
- Secure data transmission

### Development Setup
- Testing Framework:
  - WebSocket testing utilities
  - Currency conversion mocks
  - Pattern detection test helpers

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