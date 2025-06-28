"use client"

/**
 * FilterDialog Component
 * Handles trade filtering interface with compact expandable design
 */

import type React from "react"
import { memo, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TradeStatus, TradeType, type TradeTags } from "@/types/journal"
import { isTagsArray } from "../utils"
import { Filter, X, CheckCircle2, Circle, TagIcon, TrendingUp, Activity, Target } from "lucide-react"

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStatuses: TradeStatus[]
  selectedTypes: TradeType[]
  selectedTagIds: number[]
  tags: TradeTags[] | any
  onStatusChange: (statuses: TradeStatus[]) => void
  onTypeChange: (types: TradeType[]) => void
  onTagChange: (tagIds: number[]) => void
  onClearAll: () => void
}

export const FilterDialog = memo<FilterDialogProps>(
  ({
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
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    // Force scroll area recalculation when accordion items expand/collapse
    useEffect(() => {
      if (!open || !scrollAreaRef.current || !contentRef.current) return

      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      if (!scrollElement) return

      // Create a ResizeObserver to watch for content size changes
      const resizeObserver = new ResizeObserver(() => {
        // Force scroll area to recalculate its bounds
        requestAnimationFrame(() => {
          if (scrollElement) {
            // Trigger a scroll event to force recalculation
            scrollElement.dispatchEvent(new Event('scroll'))
          }
        })
      })

      // Observe the content container for size changes
      resizeObserver.observe(contentRef.current)

      // Also add a mutation observer to catch accordion state changes
      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'data-state' || mutation.attributeName === 'style')) {
            // Delay to allow animation to progress
            setTimeout(() => {
              if (scrollElement) {
                scrollElement.dispatchEvent(new Event('scroll'))
              }
            }, 100)
          }
        })
      })

      // Observe accordion content elements for state changes
      const accordionContents = contentRef.current.querySelectorAll('[data-radix-accordion-content]')
      accordionContents.forEach(content => {
        mutationObserver.observe(content, { 
          attributes: true, 
          attributeFilter: ['data-state', 'style'] 
        })
      })

      return () => {
        resizeObserver.disconnect()
        mutationObserver.disconnect()
      }
    }, [open])

    // Additional effect to handle scroll restoration after accordion animations
    useEffect(() => {
      if (!open) return

      const handleTransitionEnd = () => {
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
          if (scrollElement) {
            // Force a layout recalculation
            scrollElement.style.overflow = 'hidden'
            scrollElement.offsetHeight // Force reflow
            scrollElement.style.overflow = ''
          }
        }
      }

      // Listen for CSS transition end events on accordion content
      const accordionElements = document.querySelectorAll('[data-radix-accordion-content]')
      accordionElements.forEach(element => {
        element.addEventListener('transitionend', handleTransitionEnd)
      })

      return () => {
        accordionElements.forEach(element => {
          element.removeEventListener('transitionend', handleTransitionEnd)
        })
      }
    }, [open, selectedStatuses.length, selectedTypes.length, selectedTagIds.length])
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
          return "bg-blue-50 border-blue-200 text-blue-700"
        case TradeStatus.CLOSED_TARGET:
          return "bg-green-50 border-green-200 text-green-700"
        case TradeStatus.CLOSED_STOPLOSS:
          return "bg-red-50 border-red-200 text-red-700"
        case TradeStatus.CLOSED_MANUAL:
          return "bg-orange-50 border-orange-200 text-orange-700"
        case TradeStatus.CANCELLED:
          return "bg-gray-50 border-gray-200 text-gray-700"
        default:
          return "bg-gray-50 border-gray-200 text-gray-700"
      }
    }

    const activeFiltersCount = selectedStatuses.length + selectedTypes.length + selectedTagIds.length

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] w-full max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold">Filter Trades</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Refine your trade results</p>
              </div>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 overflow-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div ref={contentRef} className="px-6 py-4 space-y-4">
              <Accordion type="multiple" defaultValue={[]} className="space-y-2">
                {/* Trade Status Section */}
                <AccordionItem value="status" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="font-medium">Trade Status</span>
                      {selectedStatuses.length > 0 && (
                        <Badge variant="outline" className="ml-auto mr-2 text-xs">
                          {selectedStatuses.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-1 gap-2">
                      {Object.values(TradeStatus).map((status) => (
                        <label
                          key={status}
                          className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-md border transition-all duration-200 hover:shadow-sm ${
                            selectedStatuses.includes(status)
                              ? getStatusColor(status) + " shadow-sm"
                              : "bg-background border-border hover:bg-muted/30"
                          }`}
                        >
                          <Checkbox
                            checked={selectedStatuses.includes(status)}
                            onCheckedChange={(checked) => handleStatusToggle(status, checked as boolean)}
                            className="data-[state=checked]:bg-current data-[state=checked]:border-current"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            {getStatusIcon(status)}
                            <span className="text-sm font-medium">{formatEnumValue(status)}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Trade Type Section */}
                <AccordionItem value="type" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium">Trade Type</span>
                      {selectedTypes.length > 0 && (
                        <Badge variant="outline" className="ml-auto mr-2 text-xs">
                          {selectedTypes.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-1 gap-2">
                      {Object.values(TradeType).map((type) => (
                        <label
                          key={type}
                          className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-md border transition-all duration-200 hover:shadow-sm ${
                            selectedTypes.includes(type)
                              ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                              : "bg-background border-border hover:bg-muted/30"
                          }`}
                        >
                          <Checkbox
                            checked={selectedTypes.includes(type)}
                            onCheckedChange={(checked) => handleTypeToggle(type, checked as boolean)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                type === TradeType.EQUITY_DELIVERY ? "bg-blue-500" : "bg-green-500"
                              }`}
                            />
                            <span className="text-sm font-medium">{formatEnumValue(type)}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Tags Section */}
                <AccordionItem value="tags" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <TagIcon className="h-4 w-4 text-primary" />
                      <span className="font-medium">Tags</span>
                      {selectedTagIds.length > 0 && (
                        <Badge variant="outline" className="ml-auto mr-2 text-xs">
                          {selectedTagIds.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {isTagsArray(tags) && tags.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {tags.map((tag) => (
                          <label
                            key={tag.id}
                            className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-md border transition-all duration-200 hover:shadow-sm ${
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
                            <div className="flex items-center gap-2 flex-1">
                              <div
                                className="w-2.5 h-2.5 rounded-full border border-white/20"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="text-sm font-medium">{tag.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                          <TagIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No tags available</p>
                        <p className="text-xs text-muted-foreground mt-1">Create tags to organize your trades</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-shrink-0 flex justify-between gap-3 px-6 py-4 border-t bg-muted/20">
            <Button
              variant="outline"
              onClick={onClearAll}
              className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 bg-transparent"
              disabled={activeFiltersCount === 0}
            >
              <X className="h-4 w-4" />
              Clear All
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-destructive/20 text-destructive">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
            >
              <Target className="h-4 w-4" />
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  },
)

FilterDialog.displayName = "FilterDialog"
