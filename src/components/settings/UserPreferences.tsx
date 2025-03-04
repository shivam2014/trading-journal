import { usePreferences } from '@/lib/hooks/usePreferences';
import { toast } from 'sonner';

export function UserPreferences() {
  const {
    preferences,
    isLoading,
    error,
    updateTheme,
    updateDefaultCurrency,
    updatePreferences,
  } = usePreferences();

  if (isLoading) {
    return (
      <div className="animate-pulse" data-testid="loading-skeleton">
        <div className="h-8 w-48 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading preferences: {error.message}
      </div>
    );
  }

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    try {
      await updateTheme(theme);
      toast.success('Theme updated successfully');
    } catch (error) {
      toast.error('Failed to update theme');
    }
  };

  const handleCurrencyChange = async (currency: string) => {
    try {
      await updateDefaultCurrency(currency);
      toast.success('Default currency updated successfully');
    } catch (error) {
      toast.error('Failed to update currency');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Theme</h3>
        <div className="mt-2 space-x-2">
          {['light', 'dark', 'system'].map((theme) => (
            <button
              key={theme}
              onClick={() => handleThemeChange(theme as 'light' | 'dark' | 'system')}
              className={`px-4 py-2 rounded-md ${
                preferences?.theme === theme
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium">Default Currency</h3>
        <select
          value={preferences?.defaultCurrency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className="mt-2 block w-full max-w-xs rounded-md bg-gray-700 border-gray-600 focus:border-primary focus:ring-primary"
        >
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="JPY">JPY (¥)</option>
          <option value="AUD">AUD ($)</option>
          <option value="CAD">CAD ($)</option>
          <option value="CHF">CHF (Fr)</option>
          <option value="CNY">CNY (¥)</option>
          <option value="INR">INR (₹)</option>
        </select>
      </div>

      <div>
        <h3 className="text-lg font-medium">Chart Preferences</h3>
        <div className="mt-2 space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showVolume"
              className="rounded bg-gray-700 border-gray-600 text-primary focus:ring-primary"
              checked={preferences?.chartPreferences?.showVolume as boolean}
              onChange={(e) =>
                updatePreferences({
                  chartPreferences: {
                    ...preferences?.chartPreferences,
                    showVolume: e.target.checked,
                  },
                })
              }
            />
            <label htmlFor="showVolume" className="ml-2">
              Show Volume
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}