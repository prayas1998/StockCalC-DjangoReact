/**
 * FilterDialog Component
 * Handles trade filtering interface
 */

import React, { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TradeStatus, TradeType, TradeTags } from '@/types/journal';
import { isTagsArray } from '../utils';
import { Filter, X, CheckCircle2, Circle, Tag as TagIcon, TrendingUp } from 'lucide-react';

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStatuses: TradeStatus[];
  selectedTypes: TradeType[];
  selectedTagIds: number[];
  tags: TradeTags[] | any;
  onStatusChange: (statuses: TradeStatus[]) => void;
  onTypeChange: (types: TradeType[]) => void;
  onTagChange: (tagIds: number[]) => void;
  onClearAll: () => void;
}

export const FilterDialog = memo<FilterDialogProps>(({
  open,
  onOpenChange,
  selectedStatuses,
  selectedTypes,
  selectedTagIds,
  tags,
  onStatusChange,
  onTypeChange,
  onTagChange,
  onClearAll,
}) => {
  const handleStatusToggle = (status: TradeStatus, checked: boolean) => {
    const newStatuses = checked
      ? [...selectedStatuses, status]
      : selectedStatuses.filter((s) => s !== status);
    onStatusChange(newStatuses);
  };

  const handleTypeToggle = (type: TradeType, checked: boolean) => {
    const newTypes = checked
      ? [...selectedTypes, type]
      : selectedTypes.filter((t) => t !== type);
    onTypeChange(newTypes);
  };

  const handleTagToggle = (tagId: number, checked: boolean) => {
    const newTagIds = checked
      ? [...selectedTagIds, tagId]
      : selectedTagIds.filter((id) => id !== tagId);
    onTagChange(newTagIds);
  };

  const formatEnumValue = (value: string) => {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusIcon = (status: TradeStatus) => {
    switch (status) {
      case TradeStatus.OPEN:
        return <Circle className="h-4 w-4 text-blue-500" />;
      case TradeStatus.CLOSED_TARGET:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case TradeStatus.CLOSED_STOPLOSS:
        return <X className="h-4 w-4 text-red-500" />;
      case TradeStatus.CLOSED_MANUAL:
        return <CheckCircle2 className="h-4 w-4 text-orange-500" />;
      case TradeStatus.CANCELLED:
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: TradeStatus) => {
    switch (status) {
      case TradeStatus.OPEN:
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case TradeStatus.CLOSED_TARGET:
        return 'bg-green-50 border-green-200 text-green-700';
      case TradeStatus.CLOSED_STOPLOSS:
        return 'bg-red-50 border-red-200 text-red-700';
      case TradeStatus.CLOSED_MANUAL:
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case TradeStatus.CANCELLED:
        return 'bg-gray-50 border-gray-200 text-gray-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const activeFiltersCount = selectedStatuses.length + selectedTypes.length + selectedTagIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-full h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl">Filter Trades</DialogTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-base">Trade Status</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(TradeStatus).map((status) => (
                <label 
                  key={status} 
                  className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                    selectedStatuses.includes(status) 
                      ? getStatusColor(status) + ' shadow-sm' 
                      : 'bg-background border-border hover:bg-muted/30'
                  }`}
                >
                  <Checkbox
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={(checked) => 
                      handleStatusToggle(status, checked as boolean)
                    }
                    className="data-[state=checked]:bg-current data-[state=checked]:border-current"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {getStatusIcon(status)}
                    <span className="text-sm font-medium">{formatEnumValue(status)}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Trade Type Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-base">Trade Type</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(TradeType).map((type) => (
                <label 
                  key={type} 
                  className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                    selectedTypes.includes(type) 
                      ? 'bg-primary/10 border-primary/30 text-primary shadow-sm' 
                      : 'bg-background border-border hover:bg-muted/30'
                  }`}
                >
                  <Checkbox
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={(checked) => 
                      handleTypeToggle(type, checked as boolean)
                    }
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-2 h-2 rounded-full ${
                      type === TradeType.EQUITY_DELIVERY ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    <span className="text-sm font-medium">{formatEnumValue(type)}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Tag Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-base">Tags</h3>
              {selectedTagIds.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {selectedTagIds.length} selected
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {isTagsArray(tags) && tags.length > 0 ? (
                tags.map((tag) => (
                  <label 
                    key={tag.id} 
                    className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                      selectedTagIds.includes(tag.id) 
                        ? 'shadow-sm' 
                        : 'bg-background border-border hover:bg-muted/30'
                    }`}
                    style={{
                      backgroundColor: selectedTagIds.includes(tag.id) ? `${tag.color}15` : undefined,
                      borderColor: selectedTagIds.includes(tag.id) ? `${tag.color}50` : undefined,
                    }}
                  >
                    <Checkbox
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={(checked) => 
                        handleTagToggle(tag.id, checked as boolean)
                      }
                      className="data-[state=checked]:bg-current data-[state=checked]:border-current"
                      style={{
                        '--checkbox-color': selectedTagIds.includes(tag.id) ? tag.color : undefined,
                      } as React.CSSProperties}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm font-medium">{tag.name}</span>
                    </div>
                  </label>
                ))
              ) : (
                <div className="text-center py-8">
                  <TagIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tags created yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create tags in the Tags tab to organize your trades.
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex justify-between gap-3 p-6 pt-4 border-t bg-background/95 backdrop-blur-sm">
          <Button 
            variant="outline" 
            onClick={onClearAll}
            className="flex items-center gap-2"
            disabled={activeFiltersCount === 0}
          >
            <X className="h-4 w-4" />
            Clear All
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          <Button 
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

FilterDialog.displayName = 'FilterDialog';