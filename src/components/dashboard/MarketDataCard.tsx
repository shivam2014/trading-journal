'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ChevronUp, ChevronDown, AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { formatCurrency } from '@/lib/utils/format';

interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: Date | null;
}

export function MarketDataCard() {
  const router = useRouter();
  const { preferences } = usePreferences();
  const { info } = useNotifications();
  const [indexQuotes, setIndexQuotes] = useState<MarketQuote[]>([]);
  const [watchlistQuotes, setWatchlistQuotes] = useState<MarketQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('indices');

  const defaultCurrency = preferences?.defaultCurrency || 'USD';

  // Major indices to track
  const indices = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX'];
  
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Fetch major indices data
        const indicesResponse = await fetch(`/api/market-data/quotes?symbols=${indices.join(',')}`);
        if (!indicesResponse.ok) throw new Error('Failed to fetch indices data');
        const indicesData = await indicesResponse.json();
        
        setIndexQuotes(
          indicesData.quotes.map((quote: any) => ({
            symbol: quote.symbol,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            lastUpdated: new Date(quote.timestamp),
          }))
        );

        // Fetch user's watchlist
        const watchlistResponse = await fetch('/api/market-data/watchlist');
        if (!watchlistResponse.ok) throw new Error('Failed to fetch watchlist');
        const watchlistData = await watchlistResponse.json();
        
        if (watchlistData.symbols.length) {
          const symbols = watchlistData.symbols.map((item: any) => item.symbol).join(',');
          const watchlistQuotesResponse = await fetch(`/api/market-data/quotes?symbols=${symbols}`);
          if (!watchlistQuotesResponse.ok) throw new Error('Failed to fetch watchlist quotes');
          const watchlistQuotesData = await watchlistQuotesResponse.json();
          
          setWatchlistQuotes(
            watchlistQuotesData.quotes.map((quote: any) => ({
              symbol: quote.symbol,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              lastUpdated: new Date(quote.timestamp),
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();

    // Set up interval for periodic updates (every 30 seconds)
    const intervalId = setInterval(fetchMarketData, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Handle clicking on a symbol to view more details
  const handleSymbolClick = (symbol: string) => {
    router.push(`/market/${symbol}`);
  };

  // Display add to watchlist info message
  const handleAddToWatchlist = () => {
    info(
      'Watchlist Management',
      'You can manage your watchlist from the Market Watchlist panel',
      { link: '/' }
    );
  };

  const renderQuoteRow = (quote: MarketQuote) => (
    <div
      key={quote.symbol}
      className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
      onClick={() => handleSymbolClick(quote.symbol)}
    >
      <div className="font-medium">{quote.symbol}</div>
      <div className="text-right">
        <div className="font-medium">
          {formatCurrency(quote.price, defaultCurrency)}
        </div>
        <div
          className={`text-xs flex items-center gap-1 ${
            quote.change === 0
              ? 'text-muted-foreground'
              : quote.change > 0
              ? 'text-green-500'
              : 'text-red-500'
          }`}
        >
          {quote.change > 0 ? (
            <ChevronUp className="h-3 w-3" />
          ) : quote.change < 0 ? (
            <ChevronDown className="h-3 w-3" />
          ) : null}
          <span>
            {(quote.changePercent > 0 ? '+' : '') +
              quote.changePercent.toFixed(2) +
              '%'}
          </span>
        </div>
      </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading Market Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 animate-pulse"
              >
                <div className="w-20 h-5 bg-muted rounded"></div>
                <div className="w-24 h-5 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Market Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue={activeTab}
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-2">
            <TabsTrigger value="indices">Major Indices</TabsTrigger>
            <TabsTrigger value="watchlist">My Watchlist</TabsTrigger>
          </TabsList>
          
          <TabsContent value="indices" className="space-y-1">
            {indexQuotes.map(renderQuoteRow)}
            <div className="text-xs text-right text-muted-foreground mt-2">
              Last updated: {indexQuotes.length ? indexQuotes[0].lastUpdated?.toLocaleTimeString() : ''}
            </div>
          </TabsContent>
          
          <TabsContent value="watchlist" className="space-y-1">
            {watchlistQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No symbols in your watchlist</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddToWatchlist}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Symbols
                </Button>
              </div>
            ) : (
              <>
                {watchlistQuotes.map(renderQuoteRow)}
                <div className="text-xs text-right text-muted-foreground mt-2">
                  Last updated: {watchlistQuotes[0]?.lastUpdated?.toLocaleTimeString()}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}