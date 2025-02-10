'use client';

import type { TradeFilters as ITradeFilters } from '@/types/trade';

interface TradeFiltersProps {
  filters: ITradeFilters;
  onFilterChange: (filters: Partial<ITradeFilters>) => void;
}

export function TradeFilters({ filters, onFilterChange }: TradeFiltersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Symbol Filter */}
      <div>
        <label
          htmlFor="symbols"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Symbols
        </label>
        <input
          type="text"
          id="symbols"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          placeholder="e.g., AAPL, MSFT"
          value={filters.symbols?.join(', ') || ''}
          onChange={(e) => {
            const symbols = e.target.value
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
            onFilterChange({ symbols: symbols.length > 0 ? symbols : undefined });
          }}
        />
      </div>

      {/* Strategy Filter */}
      <div>
        <label
          htmlFor="strategy"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Strategy
        </label>
        <input
          type="text"
          id="strategy"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          placeholder="Enter strategy"
          value={filters.strategy || ''}
          onChange={(e) => onFilterChange({ strategy: e.target.value || undefined })}
        />
      </div>

      {/* Session Filter */}
      <div>
        <label
          htmlFor="session"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Session
        </label>
        <input
          type="text"
          id="session"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          placeholder="Enter session"
          value={filters.session || ''}
          onChange={(e) => onFilterChange({ session: e.target.value || undefined })}
        />
      </div>

      {/* Status Filter */}
      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Status
        </label>
        <select
          id="status"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={filters.status || ''}
          onChange={(e) => onFilterChange({ 
            status: (e.target.value || undefined) as ITradeFilters['status']
          })}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="PARTIALLY_CLOSED">Partially Closed</option>
        </select>
      </div>

      {/* Group Type Filter */}
      <div>
        <label
          htmlFor="groupType"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Group By
        </label>
        <select
          id="groupType"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={filters.groupType || 'strategy'}
          onChange={(e) => onFilterChange({ 
            groupType: (e.target.value || undefined) as ITradeFilters['groupType']
          })}
        >
          <option value="strategy">Strategy</option>
          <option value="session">Session</option>
          <option value="manual">Manual Groups</option>
        </select>
      </div>

      {/* Date Range */}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Date Range
        </label>
        <div className="mt-1 grid grid-cols-2 gap-4">
          <input
            type="date"
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={filters.startDate?.toISOString().split('T')[0] || ''}
            onChange={(e) => onFilterChange({ 
              startDate: e.target.value ? new Date(e.target.value) : undefined
            })}
          />
          <input
            type="date"
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={filters.endDate?.toISOString().split('T')[0] || ''}
            onChange={(e) => onFilterChange({ 
              endDate: e.target.value ? new Date(e.target.value) : undefined
            })}
          />
        </div>
      </div>
    </div>
  );
}