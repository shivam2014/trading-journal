import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface UserPreferences {
  defaultCurrency: string;
  theme: 'light' | 'dark' | 'system';
  chartPreferences: Record<string, any>;
  notificationSettings: Record<string, any>;
}

export function usePreferences() {
  const queryClient = useQueryClient();

  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery<UserPreferences>({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      const response = await fetch('/api/settings/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      return response.json();
    },
  });

  const { mutateAsync: updatePreferences } = useMutation({
    mutationFn: async (newPreferences: Partial<UserPreferences>) => {
      try {
        const response = await fetch('/api/settings/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newPreferences),
        });

        if (!response.ok) {
          throw new Error('Failed to update preferences');
        }

        const updatedPreferences = await response.json();
        return updatedPreferences;
      } catch (error) {
        console.error('Error updating preferences:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
  };
}