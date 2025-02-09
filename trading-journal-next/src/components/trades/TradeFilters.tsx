import { useState, useCallback } from 'react';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { TradeFilters as ITradeFilters } from '@/types/trade';

interface TradeFiltersProps {
  onFilterChange: (filters: ITradeFilters) => void;
  alwaysOpen?: boolean;
}

type TradeAction = NonNullable<ITradeFilters['action']>;
type TradeStatus = NonNullable<ITradeFilters['status']>;

export function TradeFilters({ onFilterChange, alwaysOpen = false }: TradeFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<ITradeFilters>({});

  const handleFilterChange = useCallback((newFilters: Partial<ITradeFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    // Remove undefined or empty string values
    Object.keys(updatedFilters).forEach(key => {
      if (updatedFilters[key as keyof ITradeFilters] === undefined || 
          updatedFilters[key as keyof ITradeFilters] === '') {
        delete updatedFilters[key as keyof ITradeFilters];
      }
    });
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  }, [filters, onFilterChange]);

  const clearFilters = useCallback(() => {
    setFilters({});
    onFilterChange({});
  }, [onFilterChange]);

  const activeFiltersCount = Object.keys(filters).length;
  const showFilters = alwaysOpen || isOpen;

  return (
    <div className="relative">
      {!alwaysOpen && (
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {showFilters && (
        <div className={`${alwaysOpen ? '' : 'absolute left-0 z-10 mt-2 w-full lg:w-auto'} rounded-lg bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {activeFiltersCount > 0 && alwaysOpen && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear all filters
              </button>
            )}

            <div className="w-40">
              <input
                type="text"
                id="symbol"
                value={filters.symbol || ''}
                onChange={(e) => handleFilterChange({ symbol: e.target.value || undefined })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700 dark:placeholder:text-gray-500 dark:focus:ring-primary-500 sm:text-sm sm:leading-6"
                placeholder="Symbol..."
              />
            </div>

            <div className="w-40">
              <select
                id="action"
                value={filters.action || ''}
                onChange={(e) => handleFilterChange({
                  action: (e.target.value || undefined) as TradeAction | undefined
                })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700 dark:focus:ring-primary-500 sm:text-sm sm:leading-6"
              >
                <option value="">All actions</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
                <option value="DIVIDEND">Dividend</option>
                <option value="INTEREST">Interest</option>
              </select>
            </div>

            <div className="w-40">
              <select
                id="status"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({
                  status: (e.target.value || undefined) as TradeStatus | undefined
                })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700 dark:focus:ring-primary-500 sm:text-sm sm:leading-6"
              >
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
                <option value="PARTIALLY_CLOSED">Partially Closed</option>
              </select>
            </div>

            <div className="w-40">
              <input
                type="date"
                id="startDate"
                value={filters.startDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleFilterChange({
                  startDate: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700 dark:focus:ring-primary-500 sm:text-sm sm:leading-6"
                placeholder="Start Date"
              />
            </div>

            <div className="w-40">
              <input
                type="date"
                id="endDate"
                value={filters.endDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleFilterChange({
                  endDate: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700 dark:focus:ring-primary-500 sm:text-sm sm:leading-6"
                placeholder="End Date"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}