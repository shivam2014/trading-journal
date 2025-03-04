'use client';

import { useState, useCallback } from 'react';
import { useTradeGroups } from '@/lib/hooks/useTradeGroups';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/date';
import type { Trade, GroupingOptions } from '@/types/trade';

interface TradeGroupingProps {
  trades: Trade[];
  defaultCurrency: string;
  onGroupCreated?: () => void;
}

export function TradeGrouping({ 
  trades, 
  defaultCurrency,
  onGroupCreated 
}: TradeGroupingProps) {
  const { toast } = useToast();
  const {
    groups,
    isLoading,
    createGroups,
    updateGroup,
    deleteGroup,
    fetchGroups,
    calculateAggregateMetrics,
  } = useTradeGroups({
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
    onSuccess: () => {
      onGroupCreated?.();
      toast({
        title: "Success",
        description: "Trade groups created successfully",
      });
    },
  });

  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [groupingOptions, setGroupingOptions] = useState<GroupingOptions>({
    strategy: 'ticker',
    minTrades: 2,
  });
  const [showDialog, setShowDialog] = useState(false);

  // Handle trade selection
  const toggleTradeSelection = (tradeId: string) => {
    const newSelected = new Set(selectedTrades);
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId);
    } else {
      newSelected.add(tradeId);
    }
    setSelectedTrades(newSelected);
  };

  // Handle group creation
  const handleCreateGroups = async () => {
    if (selectedTrades.size === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select trades to group",
      });
      return;
    }

    try {
      await createGroups(Array.from(selectedTrades), groupingOptions);
      setShowDialog(false);
      setSelectedTrades(new Set());
    } catch (error) {
      // Error handled by useTradeGroups
    }
  };

  return (
    <div className="space-y-4">
      {/* Trade Selection Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Trade Groups</CardTitle>
            <CardDescription>Select trades to group together</CardDescription>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            disabled={selectedTrades.size === 0}
          >
            Create Group
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedTrades.has(trade.id)}
                      onChange={() => toggleTradeSelection(trade.id)}
                      className="h-4 w-4"
                    />
                  </TableCell>
                  <TableCell>{trade.ticker}</TableCell>
                  <TableCell>{trade.action}</TableCell>
                  <TableCell>{trade.quantity.toString()}</TableCell>
                  <TableCell>
                    {formatCurrency(trade.price.toNumber(), defaultCurrency)}
                  </TableCell>
                  <TableCell>{formatDate(trade.timestamp)}</TableCell>
                </TableRow>
              ))}
              {trades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No trades available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Group Creation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Trade Group</DialogTitle>
            <DialogDescription>
              Select grouping options and create a new trade group
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="grouping-strategy">Grouping Strategy</Label>
              <Select
                value={groupingOptions.strategy}
                onValueChange={(value) =>
                  setGroupingOptions((prev) => ({ ...prev, strategy: value as 'ticker' | 'date' }))
                }
              >
                <SelectTrigger id="grouping-strategy">
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ticker">By Symbol</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="min-trades">Minimum Trades</Label>
              <Input
                id="min-trades"
                type="number"
                value={groupingOptions.minTrades}
                onChange={(e) =>
                  setGroupingOptions((prev) => ({
                    ...prev,
                    minTrades: parseInt(e.target.value) || 2,
                  }))
                }
                min={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroups} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Groups"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}