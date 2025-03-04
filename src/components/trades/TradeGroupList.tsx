'use client';

import { useState, useEffect } from 'react';
import { useTradeGroups } from '@/lib/hooks/useTradeGroups';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils/format';
import { formatDate, formatDateRange } from '@/lib/utils/date';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TradeGroupListProps {
  defaultCurrency: string;
  onGroupUpdated?: () => void;
}

export function TradeGroupList({
  defaultCurrency,
  onGroupUpdated,
}: TradeGroupListProps) {
  const { toast } = useToast();
  const {
    groups,
    isLoading,
    fetchGroups,
    updateGroup,
    deleteGroup,
    calculateAggregateMetrics,
  } = useTradeGroups({
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const [filters, setFilters] = useState({
    status: '',
    ticker: '',
    timeframe: '',
  });

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  // Load groups on mount
  useEffect(() => {
    fetchGroups(filters);
  }, [fetchGroups, filters]);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    const newOpen = new Set(openGroups);
    if (newOpen.has(groupId)) {
      newOpen.delete(groupId);
    } else {
      newOpen.add(groupId);
    }
    setOpenGroups(newOpen);
  };

  // Handle group selection
  const toggleGroupSelection = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  // Handle notes update
  const handleNotesUpdate = async (groupId: string) => {
    if (!editingNotes[groupId]) return;

    try {
      await updateGroup(groupId, { notes: editingNotes[groupId] });
      setEditingNotes(prev => ({ ...prev, [groupId]: '' }));
      onGroupUpdated?.();
    } catch (error) {
      // Error handled by useTradeGroups
    }
  };

  // Handle group deletion
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      onGroupUpdated?.();
      toast({
        title: "Success",
        description: "Trade group deleted successfully",
      });
    } catch (error) {
      // Error handled by useTradeGroups
    }
  };

  // Calculate aggregate metrics for selected groups
  const selectedMetrics = calculateAggregateMetrics(
    groups.filter(g => selectedGroups.has(g.group.id))
  );

  // Loading state
  if (isLoading && !groups.length) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={filters.status}
          onValueChange={(value) => 
            setFilters(prev => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by symbol"
          value={filters.ticker}
          onChange={(e) => 
            setFilters(prev => ({ ...prev, ticker: e.target.value }))
          }
          className="w-[180px]"
        />
      </div>

      {/* Selected Groups Summary */}
      {selectedGroups.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Selected Groups Summary</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedGroups(new Set())}
            >
              Clear Selection
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold">
                {(selectedMetrics.winRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Profit Factor</div>
              <div className="text-2xl font-bold">
                {selectedMetrics.profitFactor.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total P&L</div>
              <div className="text-2xl font-bold">
                {formatCurrency(selectedMetrics.realizedPnl, defaultCurrency)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
              <div className="text-2xl font-bold">
                {selectedMetrics.totalTrades}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Groups List */}
      <div className="space-y-4">
        {groups.map(({ group, metrics }) => (
          <Card key={group.id} className="p-4">
            <Collapsible
              open={openGroups.has(group.id)}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedGroups.has(group.id)}
                    onChange={() => toggleGroupSelection(group.id)}
                    className="mt-1.5 h-4 w-4"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{group.ticker}</h4>
                      <Badge variant={group.status === 'OPEN' ? 'default' : 'secondary'}>
                        {group.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateRange(group.entryDate, group.exitDate || new Date())}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(metrics.realizedPnl, defaultCurrency)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metrics.winningTrades} / {metrics.totalTrades} trades
                    </div>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {openGroups.has(group.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="mt-4 space-y-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Win Rate</div>
                      <div className="text-lg font-medium">
                        {(metrics.winRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Profit Factor</div>
                      <div className="text-lg font-medium">
                        {metrics.profitFactor.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Average Win</div>
                      <div className="text-lg font-medium">
                        {formatCurrency(metrics.averageWin, defaultCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Average Loss</div>
                      <div className="text-lg font-medium">
                        {formatCurrency(metrics.averageLoss, defaultCurrency)}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        placeholder="Add notes..."
                        value={editingNotes[group.id] || group.notes || ''}
                        onChange={(e) =>
                          setEditingNotes(prev => ({
                            ...prev,
                            [group.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => handleNotesUpdate(group.id)}
                        disabled={!editingNotes[group.id]}
                      >
                        Update
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => 
                        updateGroup(group.id, {
                          status: group.status === 'OPEN' ? 'CLOSED' : 'OPEN',
                        })
                      }
                    >
                      {group.status === 'OPEN' ? 'Close Group' : 'Reopen Group'}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          Delete Group
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Trade Group</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this trade group? This action
                            cannot be undone. The individual trades will remain in your
                            trade log.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {groups.length === 0 && (
          <Card className="p-6">
            <div className="text-center text-muted-foreground">
              <p>No trade groups found</p>
              <p className="text-sm">Create a group to get started</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}