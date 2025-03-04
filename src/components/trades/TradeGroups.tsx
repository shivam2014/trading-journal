'use client';

import { useState } from 'react';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { TradeGrouping } from './TradeGrouping';
import { TradeGroupList } from './TradeGroupList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Trade } from '@/types/trade';

interface TradeGroupsProps {
  trades: Trade[];
  className?: string;
}

export default function TradeGroups({ trades, className }: TradeGroupsProps) {
  const { preferences } = usePreferences();
  const [activeTab, setActiveTab] = useState<'new' | 'manage'>('new');
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh of lists

  // Handle successful group creation/update
  const handleGroupChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className={className}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'new' | 'manage')}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="new">Create Groups</TabsTrigger>
          <TabsTrigger value="manage">Manage Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <TradeGrouping
            trades={trades}
            defaultCurrency={preferences?.defaultCurrency || 'USD'}
            onGroupCreated={handleGroupChange}
          />
        </TabsContent>

        <TabsContent value="manage">
          <TradeGroupList
            key={refreshKey} // Force refresh when groups are updated
            defaultCurrency={preferences?.defaultCurrency || 'USD'}
            onGroupUpdated={handleGroupChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}