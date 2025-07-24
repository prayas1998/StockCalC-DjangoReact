"use client"

import type React from "react"

import { memo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TradeStatus, TradeType, type TradeTags, type TradeJournal } from "@/types/journal"
import { isTagsArray } from "../utils"
import { CompanyFilterSection } from "./CompanyFilterSection"
import { Filter, X, CheckCircle2, Circle, TagIcon, TrendingUp, Activity, Target, Building2 } from "lucide-react"

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStatuses: TradeStatus[]
  selectedTypes: TradeType[]
  selectedTagIds: number[]
  selectedCompanies: string[]
  tags: TradeTags[] | unknown
  trades: TradeJournal[]
  onStatusChange: (statuses: TradeStatus[]) => void
  onTypeChange: (types: TradeType[]) => void
  onTagChange: (tagIds: number[]) => void
  onCompanyChange: (companies: string[]) => void
  onClearAll: () => void
}

export const FilterDialog = memo<FilterDialogProps>(
  ({
    open,
    onOpenChange,
    selectedStatuses,
    selectedTypes,
    selectedTagIds,
    selectedCompanies,
    tags,
    trades,
    onStatusChange,
    onTypeChange,
    onTagChange,
    onCompanyChange,
    onClearAll,
  }) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    const handleStatusToggle = (status: TradeStatus, checked: boolean) => {
      const newStatuses = checked ? [...selectedStatuses, status] : selectedStatuses.filter((s) => s !== status)
      onStatusChange(newStatuses)
    }

    const handleTypeToggle = (type: TradeType, checked: boolean) => {
      const newTypes = checked ? [...selectedTypes, type] : selectedTypes.filter((t) => t !== type)
      onTypeChange(newTypes)
    }

    const handleTagToggle = (tagId: number, checked: boolean) => {
      const newTagIds = checked ? [...selectedTagIds, tagId] : selectedTagIds.filter((id) => id !== tagId)
      onTagChange(newTagIds)
    }

    const formatEnumValue = (value: string) => {
      return value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())
    }

    const getStatusIcon = (status: TradeStatus) => {
      switch (status) {
        case TradeStatus.OPEN:
          return <Circle className="h-3.5 w-3.5 text-blue-500" />
        case TradeStatus.CLOSED_TARGET:
          return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        case TradeStatus.CLOSED_STOPLOSS:
          return <X className="h-3.5 w-3.5 text-red-500" />
        case TradeStatus.CLOSED_MANUAL:
          return <CheckCircle2 className="h-3.5 w-3.5 text-orange-500" />
        case TradeStatus.CANCELLED:
          return <X className="h-3.5 w-3.5 text-gray-500" />
        default:
          return <Circle className="h-3.5 w-3.5" />
      }
    }

    const getStatusColor = (status: TradeStatus) => {
      switch (status) {
        case TradeStatus.OPEN:
          return "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300"
        case TradeStatus.CLOSED_TARGET:
          return "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700/50 dark:text-green-300"
        case TradeStatus.CLOSED_STOPLOSS:
          return "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700/50 dark:text-red-300"
        case TradeStatus.CLOSED_MANUAL:
          return "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700/50 dark:text-orange-300"
        case TradeStatus.CANCELLED:
          return "bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800/50 dark:border-gray-700/50 dark:text-gray-300"
        default:
          return "bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800/50 dark:border-gray-700/50 dark:text-gray-300"
      }
    }

    const activeFiltersCount =
      selectedStatuses.length + selectedTypes.length + selectedTagIds.length + selectedCompanies.length

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] w-full max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <DialogTitle>Filter Trades</DialogTitle>
              </div>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="status" className="flex-1 flex flex-col min-h-0">
            <div className="border-b px-6">
              <TabsList className="w-full h-auto py-2 bg-transparent gap-2 justify-start">
                <TabsTrigger
                  value="status"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md px-3 py-1.5 h-auto text-xs"
                >
                  <Activity className="h-3.5 w-3.5 mr-1.5" />
                  Status
                  {selectedStatuses.length > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary/10 border-primary/20"
                    >
                      {selectedStatuses.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="type"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md px-3 py-1.5 h-auto text-xs"
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                  Type
                  {selectedTypes.length > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary/10 border-primary/20"
                    >
                      {selectedTypes.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="company"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md px-3 py-1.5 h-auto text-xs"
                >
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  Company
                  {selectedCompanies.length > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary/10 border-primary/20"
                    >
                      {selectedCompanies.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="tags"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md px-3 py-1.5 h-auto text-xs"
                >
                  <TagIcon className="h-3.5 w-3.5 mr-1.5" />
                  Tags
                  {selectedTagIds.length > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary/10 border-primary/20"
                    >
                      {selectedTagIds.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: "calc(90vh - 200px)" }}>
              <div ref={contentRef} className="p-6">
                <TabsContent value="status" className="m-0">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(TradeStatus).map((status) => (
                      <label
                        key={status}
                        className={`flex items-center gap-2 cursor-pointer p-2 rounded-md border transition-colors ${
                          selectedStatuses.includes(status)
                            ? getStatusColor(status)
                            : "bg-background border-border hover:bg-muted/30"
                        }`}
                      >
                        <Checkbox
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={(checked) => handleStatusToggle(status, checked as boolean)}
                          className="data-[state=checked]:bg-current data-[state=checked]:border-current"
                        />
                        <div className="flex items-center gap-1.5 flex-1">
                          {getStatusIcon(status)}
                          <span className="text-xs font-medium">{formatEnumValue(status)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="type" className="m-0">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(TradeType).map((type) => (
                      <label
                        key={type}
                        className={`flex items-center gap-2 cursor-pointer p-2 rounded-md border transition-colors ${
                          selectedTypes.includes(type)
                            ? "bg-primary/10 border-primary/30 text-primary dark:bg-primary/20 dark:border-primary/40 dark:text-primary-foreground"
                            : "bg-background border-border hover:bg-muted/30"
                        }`}
                      >
                        <Checkbox
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={(checked) => handleTypeToggle(type, checked as boolean)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="flex items-center gap-1.5 flex-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              type === TradeType.EQUITY_DELIVERY ? "bg-blue-500" : "bg-green-500"
                            }`}
                          />
                          <span className="text-xs font-medium">{formatEnumValue(type)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="company" className="m-0">
                  <CompanyFilterSection
                    selectedCompanies={selectedCompanies}
                    trades={trades}
                    onCompanyChange={onCompanyChange}
                  />
                </TabsContent>

                <TabsContent value="tags" className="m-0">
                  {isTagsArray(tags) && tags.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {(tags as TradeTags[]).map((tag) => (
                        <label
                          key={tag.id}
                          className={`flex items-center gap-2 cursor-pointer p-2 rounded-md border transition-colors ${
                            selectedTagIds.includes(tag.id)
                              ? "shadow-sm"
                              : "bg-background border-border hover:bg-muted/30"
                          }`}
                          style={{
                            backgroundColor: selectedTagIds.includes(tag.id) ? `${tag.color}15` : undefined,
                            borderColor: selectedTagIds.includes(tag.id) ? `${tag.color}50` : undefined,
                          }}
                        >
                          <Checkbox
                            checked={selectedTagIds.includes(tag.id)}
                            onCheckedChange={(checked) => handleTagToggle(tag.id, checked as boolean)}
                            className="data-[state=checked]:bg-current data-[state=checked]:border-current"
                            style={
                              {
                                "--checkbox-color": selectedTagIds.includes(tag.id) ? tag.color : undefined,
                              } as React.CSSProperties
                            }
                          />
                          <div className="flex items-center gap-1.5 flex-1">
                            <div
                              className="w-2.5 h-2.5 rounded-full border border-white/20"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-xs font-medium">{tag.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">No tags available</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="flex-shrink-0 flex justify-between gap-3 px-6 py-4 border-t">
            <Button
              variant="outline"
              onClick={onClearAll}
              className="text-xs h-9 bg-transparent"
              disabled={activeFiltersCount === 0}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Clear All
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-destructive/10 text-destructive"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            <Button onClick={() => onOpenChange(false)} className="text-xs h-9">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  },
)

FilterDialog.displayName = "FilterDialog"
