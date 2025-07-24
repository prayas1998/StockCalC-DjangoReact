"use client"

import { useCallback, useMemo } from "react"
import { Plus, BarChart3, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TradeFormDialog } from "@/components/journal/TradeFormDialog"
import { JournalAnalytics } from "@/components/journal"
import { TagManager } from "@/components/journal/TagManager"
import { TradesList } from "@/components/journal/components/TradesList"
import { SearchAndFilters } from "@/components/journal/components/SearchAndFilters"
import { FilterDialog } from "@/components/journal/components/FilterDialog"
import { useJournal } from "@/hooks/useJournal"
import { useTradeTags } from "@/hooks/useTradeTags"
import { useJournalState } from "@/components/journal/hooks/useJournalState"
import { useJournalFilters } from "@/hooks/useJournalFilters"
import type { TradeJournalCreate, TradeStatus, TradeType, JournalFilters } from "@/types/journal"
import { isTagsArray } from "@/components/journal/utils"
import { toast } from "sonner"

export default function JournalPage() {
  // URL-synced filter state
  const { filters, updateFilter, resetFilters } = useJournalFilters()
  
  // Local UI state management
  const {
    formDialogOpen,
    editingTrade,
    formMode,
    searchQuery,
    isSearching,
    searchResults,
    selectedCompany,
    filterDialogOpen,
    activeTab,
    openAddTradeDialog,
    openEditTradeDialog,
    closeFormDialog,
    setSearchQuery,
    setIsSearching,
    setSearchResults,
    setSelectedCompany,
    clearSearch,
    openFilterDialog,
    closeFilterDialog,
    setActiveTab,
  } = useJournalState()

  // Extract filter values from URL-synced filters with proper typing
  const selectedStatuses = useMemo(() => {
    const status = filters.status
    if (Array.isArray(status)) return status as TradeStatus[]
    if (status) return [status] as TradeStatus[]
    return [] as TradeStatus[]
  }, [filters.status])

  const selectedTypes = useMemo(() => {
    const tradeType = filters.trade_type
    if (Array.isArray(tradeType)) return tradeType as TradeType[]
    if (tradeType) return [tradeType] as TradeType[]
    return [] as TradeType[]
  }, [filters.trade_type])

  const selectedTagIds = useMemo(() => {
    return filters.tags || []
  }, [filters.tags])

  const selectedCompanies = useMemo(() => {
    return filters.companies || []
  }, [filters.companies])

  // Filter update handlers that sync to URL
  const setSelectedStatuses = useCallback((statuses: TradeStatus[]) => {
    updateFilter('status', statuses)
  }, [updateFilter])

  const setSelectedTypes = useCallback((types: TradeType[]) => {
    updateFilter('trade_type', types)
  }, [updateFilter])

  const setSelectedTagIds = useCallback((tagIds: number[]) => {
    updateFilter('tags', tagIds)
  }, [updateFilter])

  const setSelectedCompanies = useCallback((companies: string[]) => {
    updateFilter('companies', companies)
  }, [updateFilter])

  const clearAllFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  // Get journal data and mutations
  const { trades, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, deleteTrade } = useJournal({
    status: selectedStatuses,
    trade_type: selectedTypes,
    tags: selectedTagIds,
    companies: selectedCompanies,
  })

  // Get tags
  const { tags } = useTradeTags()

  // Handle deleting a trade with confirmation
  const handleDeleteTrade = useCallback(
    async (tradeId: number) => {
      try {
        const result = await deleteTrade.mutateAsync(tradeId)
        if ("error" in result) {
          throw new Error(result.error)
        }
        toast.success("Trade deleted successfully")
      } catch (error) {
        toast.error(`Failed to delete trade: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    },
    [deleteTrade],
  )

  // Handle search - always use server-side search with current filters
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    try {
      // Always use server-side search, but pass current filters to backend
      const { searchJournalTrades } = await import("@/services/journalApi")
      
      // Build filter parameters to send to backend
      const searchFilters: Partial<JournalFilters> = {}
      if (selectedStatuses.length > 0) searchFilters.status = selectedStatuses
      if (selectedTypes.length > 0) searchFilters.trade_type = selectedTypes
      if (selectedTagIds.length > 0) searchFilters.tags = selectedTagIds
      if (selectedCompanies.length > 0) searchFilters.companies = selectedCompanies
      
      const result = await searchJournalTrades(searchQuery, searchFilters)

      if ("error" in result) {
        toast.error(`Search failed: ${result.detail || result.error}`)
        setSearchResults([])
      } else {
        const results = result.results || []
        if (results.length === 0) {
          const hasActiveFilters = selectedStatuses.length > 0 || selectedTypes.length > 0 || selectedTagIds.length > 0 || selectedCompanies.length > 0
          if (hasActiveFilters) {
            toast.info(`No trades found matching "${searchQuery}" in your current filters. Try clearing filters or adjusting your search.`)
          } else {
            toast.info(`No trades found matching "${searchQuery}".`)
          }
        }
        setSearchResults(results)
      }
    } catch (error) {
      toast.error(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, selectedStatuses, selectedTypes, selectedTagIds, selectedCompanies, setSearchResults, setIsSearching])

  // Handle suggestion selection - always use server-side search with current filters
  const handleSuggestionSelect = useCallback(
    async (suggestion: { text: string; type: string }) => {
      setSelectedCompany(suggestion.text)
      setSearchQuery(suggestion.text)

      setIsSearching(true)

      try {
        // Always use server-side search, but pass current filters to backend
        const { searchJournalTrades } = await import("@/services/journalApi")
        
        // Build filter parameters to send to backend
        const searchFilters: Partial<JournalFilters> = {}
        if (selectedStatuses.length > 0) searchFilters.status = selectedStatuses
        if (selectedTypes.length > 0) searchFilters.trade_type = selectedTypes
        if (selectedTagIds.length > 0) searchFilters.tags = selectedTagIds
        if (selectedCompanies.length > 0) searchFilters.companies = selectedCompanies
        
        const result = await searchJournalTrades(suggestion.text, searchFilters)

        if ("error" in result) {
          toast.error(`Search failed: ${result.detail || result.error}`)
          setSearchResults([])
        } else {
          const results = result.results || []

          // Don't apply additional filtering - the backend already handles the search properly
          // The backend's 3-tier scoring system will prioritize exact matches appropriately
          
          if (results.length === 0) {
            const hasActiveFilters = selectedStatuses.length > 0 || selectedTypes.length > 0 || selectedTagIds.length > 0 || selectedCompanies.length > 0
            if (hasActiveFilters) {
              toast.info(`No trades found for "${suggestion.text}" in your current filters. Try clearing filters or adjusting your search.`)
            } else {
              toast.info(`No trades found for "${suggestion.text}".`)
            }
          }

          setSearchResults(results)
        }
      } catch (error) {
        toast.error(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [selectedStatuses, selectedTypes, selectedTagIds, selectedCompanies, setSelectedCompany, setSearchQuery, setIsSearching, setSearchResults],
  )

  // Refresh search results after trade update
  const refreshSearchResults = useCallback(async () => {
    // Only refresh if there's an active search
    if (!searchQuery.trim() || !searchResults) {
      return;
    }

    // Add a small delay to ensure backend has processed the update
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Always use server-side search to get fresh results with current filters
      const { searchJournalTrades } = await import("@/services/journalApi");
      
      // Build filter parameters to send to backend
      const searchFilters: Partial<JournalFilters> = {}
      if (selectedStatuses.length > 0) searchFilters.status = selectedStatuses
      if (selectedTypes.length > 0) searchFilters.trade_type = selectedTypes
      if (selectedTagIds.length > 0) searchFilters.tags = selectedTagIds
      if (selectedCompanies.length > 0) searchFilters.companies = selectedCompanies
      
      const result = await searchJournalTrades(searchQuery, searchFilters);

      if ("error" in result) {
        console.error(`Search refresh failed: ${result.detail || result.error}`);
      } else {
        setSearchResults(result.results || []);
      }
    } catch (error) {
      console.error(`Search refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [searchQuery, searchResults, selectedStatuses, selectedTypes, selectedTagIds, selectedCompanies, setSearchResults]);

  // Format trade data for form
  const getInitialFormData = useCallback((): TradeJournalCreate | undefined => {
    if (formMode === "edit" && editingTrade) {
      return {
        company_name: editingTrade.company_name,
        trade_type: editingTrade.trade_type,
        quantity: editingTrade.quantity,
        buy_price: editingTrade.buy_price,
        direction: editingTrade.direction,
        sell_price: editingTrade.sell_price,
        stop_loss: editingTrade.stop_loss,
        target_price: editingTrade.target_price,
        entry_date: editingTrade.entry_date,
        exit_date: editingTrade.exit_date,
        status: editingTrade.status,
        personal_notes: editingTrade.personal_notes,
        tags: editingTrade.tags.map((tag) => tag.id),
        broker: editingTrade.broker,
        exchange: editingTrade.exchange,
      }
    }
    return undefined
  }, [formMode, editingTrade])

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold break-words leading-tight pb-1">
              <span className="bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent inline-block">
                Trading Journal
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 break-words">
              Track, analyze, and refine your trading strategies for continuous improvement.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button
              onClick={openAddTradeDialog}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Trade
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="trades" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-background/50 border border-border/50 rounded-lg shadow-sm backdrop-blur-sm">
            <TabsTrigger
              value="trades"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-primary/5 transition-all duration-200"
            >
              Trades
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-primary/5 transition-all duration-200"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="tags"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-primary/5 transition-all duration-200"
            >
              <Tag className="h-4 w-4 mr-2" />
              Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="space-y-4">
            {/* Search and filters */}
            <SearchAndFilters
              searchQuery={searchQuery}
              isSearching={isSearching}
              onSearchQueryChange={setSearchQuery}
              onSearch={handleSearch}
              onClearSearch={clearSearch}
              onSuggestionSelect={handleSuggestionSelect}
              onOpenFilter={openFilterDialog}
              activeFiltersCount={
                selectedStatuses.length + selectedTypes.length + selectedTagIds.length + selectedCompanies.length
              }
              tags={Array.isArray(tags) ? tags : []}
              filteredTradesCount={trades?.length}
            />

            {/* Trade list */}
            <TradesList
              trades={trades}
              searchResults={searchResults}
              searchQuery={searchQuery}
              isLoading={isLoading}
              isError={isError}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onEditTrade={openEditTradeDialog}
              onDeleteTrade={handleDeleteTrade}
              onFetchNextPage={fetchNextPage}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <JournalAnalytics />
          </TabsContent>

          <TabsContent value="tags">
            <TagManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Filter Dialog */}
      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={closeFilterDialog}
        selectedStatuses={selectedStatuses}
        selectedTypes={selectedTypes}
        selectedTagIds={selectedTagIds}
        selectedCompanies={selectedCompanies}
        tags={tags}
        trades={trades}
        onStatusChange={setSelectedStatuses}
        onTypeChange={setSelectedTypes}
        onTagChange={setSelectedTagIds}
        onCompanyChange={setSelectedCompanies}
        onClearAll={clearAllFilters}
      />

      {/* Trade form dialog */}
      <TradeFormDialog
        open={formDialogOpen}
        onOpenChange={closeFormDialog}
        initialData={getInitialFormData()}
        tradeId={editingTrade?.id}
        mode={formMode}
        availableTags={isTagsArray(tags) ? tags : []}
        onTradeUpdated={refreshSearchResults}
      />
    </div>
  )
}
