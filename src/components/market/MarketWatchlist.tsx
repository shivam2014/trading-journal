'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { WebSocketMessageType, webSocketService } from '@/lib/services/websocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, XCircle, ArrowUpIcon, ArrowDownIcon, AlertCircleIcon, Bookmark, BookmarkCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { WebSocketPriceUpdatePayload, WebSocketPatternDetectedPayload } from '@/lib/services/websocket';
import type { QuoteData } from '@/lib/services/yahoo-finance';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { formatCurrency } from '@/lib/utils/format';

interface WatchlistSymbol {
  symbol: string;
  name: string | null;
  lastPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  patterns: PatternNotification[];
}

interface PatternNotification {
  name: string;
  patternType: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  timestamp: Date;
}

export default function MarketWatchlist() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const { preferences } = usePreferences();
  
  const [watchlist, setWatchlist] = useState<WatchlistSymbol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const defaultCurrency = preferences?.defaultCurrency || 'USD';
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (session?.accessToken) {
      webSocketService.initialize(session.accessToken);
      
      const handleAuth = (payload: { success: boolean }) => {
        setIsConnected(payload.success);
        
        if (payload.success) {
          toast({
            title: "Connected to market data",
            description: "You'll receive real-time price updates.",
          });
        }
      };
      
      const handleError = (payload: { error: string }) => {
        toast({
          variant: "destructive",
          title: "Connection error",
          description: payload.error,
        });
      };
      
      // Register event listeners
      webSocketService.on(WebSocketMessageType.AUTH, handleAuth);
      webSocketService.on(WebSocketMessageType.ERROR, handleError);
      
      // Clean up
      return () => {
        webSocketService.off(WebSocketMessageType.AUTH, handleAuth);
        webSocketService.off(WebSocketMessageType.ERROR, handleError);
      };
    }
  }, [session, toast]);
  
  // Fetch user's watchlist
  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch('/api/market-data/watchlist');
        
        if (!response.ok) {
          throw new Error('Failed to fetch watchlist');
        }
        
        const data = await response.json();
        
        // Initialize watchlist with loading state for each symbol
        setWatchlist(data.symbols.map((item: any) => ({
          symbol: item.symbol,
          name: item.name,
          lastPrice: null,
          priceChange: null,
          priceChangePercent: null,
          lastUpdated: null,
          isLoading: true,
          patterns: [],
        })));
        
        // Subscribe to each symbol
        data.symbols.forEach((item: any) => {
          subscribeToSymbol(item.symbol);
        });
      } catch (error) {
        console.error('Error fetching watchlist:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your watchlist",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWatchlist();
  }, [session, toast]);
  
  // Subscribe to price updates for a symbol
  const subscribeToSymbol = useCallback((symbol: string) => {
    if (!isConnected) return;
    
    const handlePriceUpdate = (payload: WebSocketPriceUpdatePayload) => {
      setWatchlist(prev => 
        prev.map(item => 
          item.symbol === symbol
            ? {
                ...item,
                lastPrice: payload.price,
                priceChange: payload.change,
                priceChangePercent: payload.changePercent,
                lastUpdated: new Date(payload.timestamp),
                isLoading: false,
              }
            : item
        )
      );
    };
    
    const handlePatternDetected = (payload: WebSocketPatternDetectedPayload) => {
      if (payload.patterns.length === 0) return;
      
      // Add new patterns to the symbol
      setWatchlist(prev => 
        prev.map(item => {
          if (item.symbol === symbol) {
            const newPatterns = payload.patterns.map(p => ({
              name: p.name,
              patternType: p.patternType,
              confidence: p.confidence,
              timestamp: new Date(),
            }));
            
            // Only keep the 5 most recent patterns
            const allPatterns = [...newPatterns, ...item.patterns]
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .slice(0, 5);
            
            return {
              ...item,
              patterns: allPatterns,
            };
          }
          return item;
        })
      );
      
      // Show a toast notification for high-confidence patterns
      const highConfidencePatterns = payload.patterns
        .filter(p => p.confidence > 0.7)
        .map(p => p.name);
      
      if (highConfidencePatterns.length > 0) {
        toast({
          title: `${symbol}: Pattern(s) detected`,
          description: highConfidencePatterns.join(', '),
          duration: 5000,
        });
      }
    };
    
    // Subscribe to symbol updates
    webSocketService.subscribe(`symbol:${symbol}`);
    
    // Register event listeners
    webSocketService.on(`${WebSocketMessageType.PRICE_UPDATE}:${symbol}`, handlePriceUpdate);
    webSocketService.on(`${WebSocketMessageType.PATTERN_DETECTED}:${symbol}`, handlePatternDetected);
    
    // Return cleanup function
    return () => {
      webSocketService.unsubscribe(`symbol:${symbol}`);
      webSocketService.off(`${WebSocketMessageType.PRICE_UPDATE}:${symbol}`, handlePriceUpdate);
      webSocketService.off(`${WebSocketMessageType.PATTERN_DETECTED}:${symbol}`, handlePatternDetected);
    };
  }, [isConnected, toast]);
  
  // Add symbol to watchlist
  const addSymbol = async () => {
    if (!newSymbol.trim() || isAdding) return;
    
    try {
      setIsAdding(true);
      
      // Validate symbol before adding (check if it exists)
      const validateResponse = await fetch(`/api/market-data/validate?symbol=${newSymbol.trim()}`);
      if (!validateResponse.ok) {
        throw new Error('Invalid symbol');
      }
      
      const validationData = await validateResponse.json();
      
      // Add symbol to watchlist
      const response = await fetch('/api/market-data/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol: newSymbol.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add symbol');
      }
      
      // Add to local state with loading status
      setWatchlist(prev => [
        ...prev,
        {
          symbol: newSymbol.trim(),
          name: validationData.name || null,
          lastPrice: null,
          priceChange: null,
          priceChangePercent: null,
          lastUpdated: null,
          isLoading: true,
          patterns: [],
        }
      ]);
      
      // Subscribe to the new symbol
      subscribeToSymbol(newSymbol.trim());
      
      // Clear input
      setNewSymbol('');
      
      toast({
        title: "Symbol added",
        description: `${newSymbol.trim()} added to your watchlist`,
      });
    } catch (error) {
      console.error('Error adding symbol:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add symbol to watchlist",
      });
    } finally {
      setIsAdding(false);
    }
  };
  
  // Remove symbol from watchlist
  const removeSymbol = async (symbol: string) => {
    try {
      const response = await fetch(`/api/market-data/watchlist?symbol=${symbol}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove symbol');
      }
      
      // Remove from local state
      setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
      
      // Unsubscribe from symbol
      webSocketService.unsubscribe(`symbol:${symbol}`);
      
      toast({
        title: "Symbol removed",
        description: `${symbol} removed from your watchlist`,
      });
    } catch (error) {
      console.error('Error removing symbol:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove symbol from watchlist",
      });
    }
  };
  
  // View symbol details
  const viewSymbolDetails = (symbol: string) => {
    router.push(`/market/${symbol}`);
  };
  
  // Render loading state
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
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className="flex items-center justify-between p-2 animate-pulse"
              >
                <div className="w-20 h-5 bg-muted rounded"></div>
                <div className="w-24 h-5 bg-muted rounded"></div>
                <div className="w-16 h-5 bg-muted rounded"></div>
                <div className="w-10 h-8 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Market Watchlist</span>
          <span>
            {isConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Connecting...
              </Badge>
            )}
          </span>
        </CardTitle>
        
        <div className="flex gap-2">
          <Input
            placeholder="Add symbol (e.g. AAPL)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
            className="flex-1"
          />
          <Button 
            onClick={addSymbol} 
            disabled={isAdding || !newSymbol.trim()}
            size="icon"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {watchlist.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <BookmarkCheck className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>Your watchlist is empty.</p>
            <p className="text-sm">Add symbols to track prices in real-time.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {watchlist.map((item) => (
              <div 
                key={item.symbol}
                className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer"
                onClick={() => viewSymbolDetails(item.symbol)}
              >
                <div className="flex flex-col">
                  <div className="font-medium flex items-center gap-1">
                    {item.symbol}
                    {item.patterns.length > 0 && (
                      <AlertCircleIcon className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.name || 'Loading...'}
                  </div>
                </div>
                
                {item.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin opacity-70" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(item.lastPrice || 0, defaultCurrency)}
                      </div>
                      
                      <div className={`text-xs flex items-center gap-1 ${
                        item.priceChange === 0 ? 'text-muted-foreground' :
                        item.priceChange && item.priceChange > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {item.priceChange && item.priceChange > 0 ? (
                          <ArrowUpIcon className="h-3 w-3" />
                        ) : item.priceChange && item.priceChange < 0 ? (
                          <ArrowDownIcon className="h-3 w-3" />
                        ) : null}
                        {item.priceChangePercent !== null && (
                          <span>
                            {(item.priceChangePercent > 0 ? '+' : '') + 
                              item.priceChangePercent.toFixed(2) + '%'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSymbol(item.symbol);
                      }}
                      className="opacity-20 hover:opacity-100"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Pattern Notifications */}
        {watchlist.some(item => item.patterns.length > 0) && (
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium mb-2">Recent Patterns</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {watchlist
                .flatMap(item => 
                  item.patterns.map(pattern => ({
                    symbol: item.symbol,
                    ...pattern,
                  }))
                )
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, 10)
                .map((pattern, idx) => (
                  <div 
                    key={`${pattern.symbol}-${pattern.name}-${idx}`}
                    className="flex items-center justify-between p-2 text-sm rounded bg-accent/50"
                  >
                    <div>
                      <span className="font-medium">{pattern.symbol}:</span> {pattern.name}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      pattern.patternType === 'bullish' ? 'bg-green-100 text-green-800' :
                      pattern.patternType === 'bearish' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {pattern.patternType.charAt(0).toUpperCase() + pattern.patternType.slice(1)}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}