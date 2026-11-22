"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
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
import { useLocation, useNavigationType } from "react-router-dom"
import { filtersFromParams } from "@/utils/journalFilterUrlState"
import { withCompanyApiFilters } from "@/utils/journalCompanyFilters"

export default function JournalPage() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const searchRequestIdRef = useRef(0)
  useEffect(() => () => { searchRequestIdRef.current++ }, [])
  // URL-synced filter state
  const { filters, searchQuery, setSearchQuery: setSearchQueryState, updateFilter, resetFilters } = useJournalFilters()
  
  // Local UI state management
  const {
    formDialogOpen,
    editingTrade,
    formMode,
    isSearching,
    searchResults,
    selectedCompany,
    filterDialogOpen,
    activeTab,
    openAddTradeDialog,
    openEditTradeDialog,
    closeFormDialog,
    setIsSearching,
    setSearchResults,
    setSelectedCompany,
    clearSearch: clearLocalSearch,
    openFilterDialog,
    closeFilterDialog,
    setActiveTab,
  } = useJournalState()

  const setSearchQuery = useCallback((query: string) => {
    searchRequestIdRef.current++
    setSearchResults(null)
    setIsSearching(false)
    setSearchQueryState(query)
  }, [setSearchQueryState, setSearchResults, setIsSearching])

  const clearSearch = useCallback(() => {
    searchRequestIdRef.current++
    clearLocalSearch()
    setSearchQueryState('')
  }, [clearLocalSearch, setSearchQueryState])

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
  const { trades, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, deleteTrade } = useJournal(withCompanyApiFilters({
    status: selectedStatuses,
    trade_type: selectedTypes,
    tags: selectedTagIds,
    companies: selectedCompanies,
  }))

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

  const buildSearchFilters = useCallback((source: Partial<JournalFilters>): Partial<JournalFilters> => {
    const searchFilters: Partial<JournalFilters> = {}
    if (source.status?.length) searchFilters.status = source.status
    if (source.trade_type?.length) searchFilters.trade_type = source.trade_type
    if (source.tags?.length) searchFilters.tags = source.tags
    if (source.companies?.length) searchFilters.companies = source.companies
    return withCompanyApiFilters(searchFilters)
  }, [])

  const runSearch = useCallback(async (query: string, searchFilters: Partial<JournalFilters>, requestId: number, quietErrors = false) => {
    try {
      const { searchJournalTrades } = await import("@/services/journalApi")
      const result = await searchJournalTrades(query, searchFilters)
      if (requestId !== searchRequestIdRef.current) return
      if ("error" in result) {
        if (quietErrors) console.error(`Search failed: ${result.detail || result.error}`)
        else toast.error(`Search failed: ${result.detail || result.error}`)
        setSearchResults([])
        return
      }
      const results = result.results || []
      if (!quietErrors && results.length === 0) {
        const hasActiveFilters = Object.values(searchFilters).some(value => Array.isArray(value) ? value.length > 0 : value !== undefined)
        toast.info(hasActiveFilters
          ? `No trades found matching "${query}" in your current filters. Try clearing filters or adjusting your search.`
          : `No trades found matching "${query}".`)
      }
      setSearchResults(results)
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) return
      if (quietErrors) console.error(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      else toast.error(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      setSearchResults([])
    } finally {
      if (requestId === searchRequestIdRef.current) setIsSearching(false)
    }
  }, [setSearchResults, setIsSearching])

  // Handle search - always use server-side search with current filters.
  const handleSearch = useCallback(() => {
    const requestId = ++searchRequestIdRef.current
    if (!searchQuery.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    void runSearch(searchQuery, buildSearchFilters({
      status: selectedStatuses,
      trade_type: selectedTypes,
      tags: selectedTagIds,
      companies: selectedCompanies,
    }), requestId)
  }, [searchQuery, selectedStatuses, selectedTypes, selectedTagIds, selectedCompanies, setSearchResults, setIsSearching, runSearch, buildSearchFilters])

  // Restore only on an actual POP navigation, using that entry's URL as the source of truth.
  useEffect(() => {
    if (navigationType !== "POP") return
    const params = new URLSearchParams(location.search)
    const query = params.get('query') || ''
    const requestId = ++searchRequestIdRef.current
    setSearchResults(null)
    if (!query.trim()) {
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    void runSearch(query, buildSearchFilters(filtersFromParams(params)), requestId)
  }, [location.key, navigationType, location.search, runSearch, buildSearchFilters, setSearchResults, setIsSearching])

  // Handle suggestion selection - always use server-side search with current filters
  const handleSuggestionSelect = useCallback(
    (suggestion: { text: string; type: string }) => {
      setSelectedCompany(suggestion.text)
      setSearchQuery(suggestion.text)
      const requestId = ++searchRequestIdRef.current
      setIsSearching(true)
      void runSearch(suggestion.text, buildSearchFilters({
        status: selectedStatuses,
        trade_type: selectedTypes,
        tags: selectedTagIds,
        companies: selectedCompanies,
      }), requestId)
    },
    [selectedStatuses, selectedTypes, selectedTagIds, selectedCompanies, setSelectedCompany, setSearchQuery, setIsSearching, runSearch, buildSearchFilters],
  )

  // Refresh search results after trade update
  const refreshSearchResults = useCallback(async () => {
    // Only refresh if there's an active search
    if (!searchQuery.trim() || !searchResults) {
      return;
    }
    const requestId = ++searchRequestIdRef.current
    setIsSearching(true)
    // Add a small delay to ensure backend has processed the update
    await new Promise(resolve => setTimeout(resolve, 100));
    if (requestId !== searchRequestIdRef.current) return
    await runSearch(searchQuery, buildSearchFilters({
      status: selectedStatuses,
      trade_type: selectedTypes,
      tags: selectedTagIds,
      companies: selectedCompanies,
    }), requestId, true)
  }, [searchQuery, searchResults, selectedStatuses, selectedTypes, selectedTagIds, selectedCompanies, setIsSearching, runSearch, buildSearchFilters]);

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
