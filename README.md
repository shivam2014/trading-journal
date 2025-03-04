# Stock Trading Journal App

A comprehensive trading journal application that allows traders to import their trade history, analyze performance, identify patterns, and gain actionable insights.

## Features

- **Trade Data Import**
  - CSV uploads from Trading212 (with support for more brokers planned)
  - Automated trade data parsing and analysis
  - Real-time trade data syncing (where available)

- **Trade Analysis**
  - Automatic grouping of buy/sell transactions into complete trades
  - Performance metrics calculation (win rate, P&L, risk-reward)
  - Pattern identification in successful/unsuccessful trades
  - Technical chart pattern detection

- **Visualization & Insights**
  - Performance dashboards with overall stats
  - Interactive candlestick charts with volume
  - Pattern annotations and technical indicators
  - Historical analysis by various timeframes

- **Currency Support**
  - Multi-currency support (EUR, PHP, etc.)
  - Real-time currency conversion
  - Dynamic portfolio valuation

- **Accessibility**
  - Responsive design for desktop and mobile
  - Dark theme optimized for traders
  - Automated data processing for minimal manual input

## Tech Stack

- **Frontend**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS
- **Charts**: TBD (Chart.js/D3.js)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **Real-time Updates**: WebSocket/Socket.io
- **Deployment**: Docker with AWS/Google Cloud

## Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```
DATABASE_URL=your_database_url
OPEN_EXCHANGE_RATES_KEY=your_api_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Development Status

Currently implementing core features:
- ✅ Basic trade import functionality
- ✅ Trade grouping logic
- ✅ Performance metrics
- 🟡 Currency conversion
- 🟡 Technical analysis
- ⚪️ Authentication
- ⚪️ Docker deployment

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Technical Documentation](docs/TECHNICAL.md)
- [Dependencies](docs/DEPENDENCIES.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT License](LICENSE)
