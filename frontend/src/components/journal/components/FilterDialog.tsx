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
import { TradeStatus, TradeType, TradeTags } from '@/types/journal';
import { isTagsArray } from '../utils';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filter Trades</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Status Filter */}
          <div>
            <div className="font-medium mb-3">Trade Status</div>
            <div className="grid grid-cols-1 gap-3">
              {Object.values(TradeStatus).map((status) => (
                <label 
                  key={status} 
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                >
                  <Checkbox
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={(checked) => 
                      handleStatusToggle(status, checked as boolean)
                    }
                  />
                  <span className="text-sm">{formatEnumValue(status)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Trade Type Filter */}
          <div>
            <div className="font-medium mb-3">Trade Type</div>
            <div className="grid grid-cols-1 gap-3">
              {Object.values(TradeType).map((type) => (
                <label 
                  key={type} 
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                >
                  <Checkbox
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={(checked) => 
                      handleTypeToggle(type, checked as boolean)
                    }
                  />
                  <span className="text-sm">{formatEnumValue(type)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tag Filter */}
          <div>
            <div className="font-medium mb-3">Tags</div>
            <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto">
              {isTagsArray(tags) && tags.length > 0 ? (
                tags.map((tag) => (
                  <label 
                    key={tag.id} 
                    className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                  >
                    <Checkbox
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={(checked) => 
                        handleTagToggle(tag.id, checked as boolean)
                      }
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm">{tag.name}</span>
                    </div>
                  </label>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No tags created yet.
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClearAll}>
            Clear All
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

FilterDialog.displayName = 'FilterDialog';