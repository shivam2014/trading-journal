'use client';

import { useState } from 'react';
import { useTrades } from '@/lib/hooks/useTrades';
import TradeTable from '@/components/trades/TradeTable';
import TradeGroups from '@/components/trades/TradeGroups';
import ImportTrades from '@/components/trades/ImportTrades';
import PageHeader from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function TradesPage() {
  const [selectedTab, setSelectedTab] = useState<'trades' | 'groups'>('trades');
  
  const {
    trades,
    isLoading,
    error,
    clearTrades,
  } = useTrades({
    onError: (error) => toast.error(error.message),
  });

  const handleClearTrades = async () => {
    try {
      await clearTrades();
      toast.success('Trades cleared successfully');
    } catch (error) {
      console.error('Failed to clear trades:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Trades"
        description="Manage and analyze your trades"
        actions={
          <div className="flex gap-4">
            <ImportTrades />
            <button
              onClick={handleClearTrades}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Clear Trades
            </button>
          </div>
        }
      />

      {error ? (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error.message}
        </div>
      ) : (
        <Tabs
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as 'trades' | 'groups')}
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="trades">Individual Trades</TabsTrigger>
            <TabsTrigger value="groups">Trade Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="mt-6">
            <TradeTable
              trades={trades}
              isLoading={isLoading}
              className="mt-4"
            />
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <TradeGroups
              trades={trades}
              className="mt-4"
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}