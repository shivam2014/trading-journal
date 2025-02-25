# Design Specification

## Overview
The Stock Trading Journal App follows a modern, dark-themed design optimized for traders, with clear data visualization and intuitive navigation.

## Color Scheme

### Primary Colors
- Background: `#121212` (Dark background)
- Text: `#FFFFFF` (White text)
- Profit: `#22C55E` (Green for gains)
- Loss: `#EF4444` (Red for losses)
- Accent: `#3B82F6` (Blue for interactive elements)

### Secondary Colors
- Surface: `#1E1E1E` (Cards/Panels background)
- Border: `#333333` (Subtle borders)
- Muted Text: `#9CA3AF` (Secondary text)
- Hover: `#2563EB` (Interactive element hover)
- Chart Grid: `#262626` (Chart backgrounds)

## Typography

- Primary Font: System UI fonts (SF Pro, Segoe UI, etc.)
- Monospace: For numerical data and code
- Heading Sizes:
  - H1: 24px (2rem)
  - H2: 20px (1.5rem)
  - H3: 16px (1.25rem)
  - Body: 14px (1rem)

## Layout Structure

### Header
- Logo/App name (left)
- Navigation links (center)
- User settings/profile (right)
- Dark theme consistent with overall design

### Main Dashboard
1. **Top Stats Bar**
   - Win Rate
   - Total P&L
   - Number of Trades
   - Average Win/Loss

2. **Primary Chart Section**
   - Equity curve chart
   - Volume indicators
   - Technical pattern overlays
   - Timeframe selector

3. **Trade Analysis Grid**
   - Performance metrics
   - Pattern statistics
   - Recent trades
   - Open positions

### Trade Management
1. **Import Section**
   - Drag-and-drop zone for CSV
   - Broker selection
   - Import progress indicator
   - Validation status

2. **Trade Table**
   - Sortable columns
   - Grouping indicators
   - Profit/Loss highlighting
   - Action buttons

### Settings Panel
- Currency preference selector
- Broker API configuration
- Display preferences
- Account settings

## Responsive Design

### Desktop (>1024px)
- Full multi-column layout
- Expanded charts
- Detailed statistics
- Side-by-side panels

### Tablet (768px-1024px)
- Stacked layout
- Collapsible sections
- Scrollable tables
- Optimized charts

### Mobile (<768px)
- Single column layout
- Hamburger menu
- Essential stats
- Simplified charts

## Interactive Elements

### Buttons
- Primary: Solid blue background
- Secondary: Outlined style
- Danger: Red background
- Success: Green background

### Charts
- Tooltips on hover
- Zoom controls
- Time period selector
- Pattern highlight toggles

### Tables
- Sortable headers
- Filterable columns
- Row expansion
- Action menus

## Loading States
- Skeleton loaders for data
- Progress indicators
- Smooth transitions
- Loading overlays

## Error States
- Clear error messages
- Recovery actions
- Fallback UI
- User guidance

## Animations
- Subtle transitions (200-300ms)
- Loading spinners
- Chart animations
- Hover effects

## Accessibility
- ARIA labels
- Keyboard navigation
- High contrast ratios
- Screen reader support

## Implementation Notes

### Current Components
The existing React components will be modified to match this design specification:

1. **Layout Components**
   - `Navigation.tsx`: Update with new color scheme
   - `Sidebar.tsx`: Enhance with responsive design
   - `PageHeader.tsx`: Add new stats display

2. **Dashboard Components**
   - `DashboardContent.tsx`: Implement new grid layout
   - `EquityChart.tsx`: Update styling and add patterns
   - `StatsGrid.tsx`: Enhance with new metrics

3. **Trade Components**
   - `TradeTable.tsx`: Add new columns and filtering
   - `ImportTrades.tsx`: Improve UX for CSV upload
   - `TradeGroup.tsx`: Update grouping visualization

### New Components Needed
1. Technical Analysis Display
2. Currency Selector
3. Pattern Detection Overlay
4. Advanced Filtering Panel
5. Real-time Updates Indicator

### CSS Implementation
- Continue using Tailwind CSS
- Create custom utility classes for repeated patterns
- Implement dark theme using CSS variables
- Ensure consistent spacing and sizing

### Chart Library Integration
- Implement Chart.js or D3.js with custom styling
- Create reusable chart components
- Ensure responsive behavior
- Add technical indicator overlays

## Development Priorities
1. Implement core layout and navigation
2. Set up dark theme and color system
3. Develop main dashboard components
4. Create responsive trade management interface
5. Add technical analysis features
6. Implement currency handling
7. Enhance with real-time updates

This design specification serves as a living document and will be updated as the project evolves.