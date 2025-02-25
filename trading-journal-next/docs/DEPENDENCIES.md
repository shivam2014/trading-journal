# Dependencies Documentation

## Current Dependencies Analysis

### Core Framework
- `next`: ^15.1.6 (Next.js framework)
- `react`: ^19.0.0
- `react-dom`: ^19.0.0
- `typescript`: ^5 (Development)

### UI Components and Styling
- `@headlessui/react`: ^2.2.0 (UI components)
- `@heroicons/react`: ^2.2.0 (Icons)
- `tailwindcss`: ^3.4.1 (CSS framework)
- `classnames`: ^2.5.1 (CSS class utilities)
- `clsx`: ^2.1.1 (CSS class utilities)
- `framer-motion`: ^12.4.1 (Animations)
- `sonner`: ^1.7.4 (Toast notifications)

### Data Visualization
- `chart.js`: ^4.4.7
- `react-chartjs-2`: ^5.3.0

### Data Management
- `@neondatabase/serverless`: ^0.10.4 (Database)
- `@vercel/postgres`: ^0.10.0 (Database)
- `csv-parse`: ^5.6.0 (CSV parsing)
- `date-fns`: ^4.1.0 (Date utilities)

### API Integration
- `cross-fetch`: ^4.1.0 (HTTP requests)
- `yahoo-finance2`: ^2.13.3 (Market data)
- `ws`: ^8.18.0 (WebSocket)
- `isomorphic-ws`: ^5.0.0 (WebSocket)

## Required Additional Dependencies

### Technical Analysis
```json
{
  "dependencies": {
    "technicalindicators": "^3.1.0",
    "trading-signals": "^3.7.0",
    "talib.js": "^1.4.6"
  }
}
```

### Currency Support
```json
{
  "dependencies": {
    "currency.js": "^2.0.4",
    "exchange-rates-api": "^1.1.0"
  }
}
```

### Data Management
```json
{
  "dependencies": {
    "zod": "^3.22.4",
    "prisma": "^5.7.1",
    "@prisma/client": "^5.7.1",
    "swr": "^2.2.4"
  },
  "devDependencies": {
    "prisma-cli": "^1.0.0"
  }
}
```

### Authentication
```json
{
  "dependencies": {
    "next-auth": "^5.0.0",
    "@auth/prisma-adapter": "^1.0.12",
    "bcryptjs": "^2.4.3",
    "jose": "^5.2.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"
  }
}
```

### Testing
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "msw": "^2.0.11",
    "cypress": "^13.6.1"
  }
}
```

### Development Tools
```json
{
  "devDependencies": {
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "prettier": "^3.1.1",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0"
  }
}
```

## Installation Instructions

1. Install new production dependencies:
```bash
npm install technicalindicators trading-signals talib.js currency.js exchange-rates-api zod prisma @prisma/client swr next-auth @auth/prisma-adapter bcryptjs jose
```

2. Install new development dependencies:
```bash
npm install -D prisma-cli @types/bcryptjs jest @testing-library/react @testing-library/jest-dom @testing-library/user-event msw cypress husky lint-staged prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

## Configuration Requirements

### Prisma
```bash
npx prisma init
```

### Jest
Create `jest.config.js`:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

### ESLint
Update `.eslintrc.json`:
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"]
}
```

### Prettier
Create `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### Husky
```bash
npx husky install
npx husky add .husky/pre-commit "npm run lint-staged"
```

Create `lint-staged.config.js`:
```javascript
module.exports = {
  '**/*.(ts|tsx)': () => 'npm run tsc --noEmit',
  '**/*.(ts|tsx|js)': (filenames) => [
    `npm run lint --fix ${filenames.join(' ')}`,
    `npm run prettier --write ${filenames.join(' ')}`
  ]
}
```

## Environment Variables
Add to `.env.local`:
```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
OPEN_EXCHANGE_RATES_APP_ID="your-app-id"
```

This document should be updated whenever dependencies are added, removed, or updated.