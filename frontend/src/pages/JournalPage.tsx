import { useEffect, useCallback } from "react";
import { Plus, BarChart3, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TradeFormDialog } from "@/components/journal/TradeFormDialog";
import { JournalAnalytics } from "@/components/journal/JournalAnalytics";
import { TagManager } from "@/components/journal/TagManager";
import { TradesList } from "@/components/journal/components/TradesList";
import { SearchAndFilters } from "@/components/journal/components/SearchAndFilters";
import { FilterDialog } from "@/components/journal/components/FilterDialog";
import { useJournal } from "@/hooks/useJournal";
import { useTradeTags } from "@/hooks/useTradeTags";
import { useJournalState } from "@/components/journal/hooks/useJournalState";
import { TradeJournal, TradeJournalCreate } from "@/types/journal";
import { isTagsArray } from "@/components/journal/utils";
import { toast } from "sonner";

export default function JournalPage() {
  // Centralized state management
  const {
    formDialogOpen,
    editingTrade,
    formMode,
    searchQuery,
    isSearching,
    searchResults,
    filterDialogOpen,
    selectedStatuses,
    selectedTypes,
    selectedTagIds,
    activeTab,
    openAddTradeDialog,
    openEditTradeDialog,
    closeFormDialog,
    setSearchQuery,
    setIsSearching,
    setSearchResults,
    clearSearch,
    openFilterDialog,
    closeFilterDialog,
    setSelectedStatuses,
    setSelectedTypes,
    setSelectedTagIds,
    clearAllFilters,
    setActiveTab,
  } = useJournalState();

  // Get journal data and mutations
  const {
    trades,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    deleteTrade,
  } = useJournal({
    status: selectedStatuses,
    trade_type: selectedTypes,
    tags: selectedTagIds,
  });

  // Get tags
  const { tags } = useTradeTags();

  // Handle deleting a trade with confirmation
  const handleDeleteTrade = useCallback(async (tradeId: number) => {
    if (window.confirm("Are you sure you want to delete this trade?")) {
      try {
        const result = await deleteTrade.mutateAsync(tradeId);
        if ("error" in result) {
          throw new Error(result.error);
        }
        toast.success("Trade deleted successfully");
      } catch (error) {
        toast.error(
          `Failed to delete trade: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }, [deleteTrade]);

  // Handle search (client-side filtering)
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    // Filter trades based on search query
    const filteredTrades = trades.filter(
      (trade) =>
        trade.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trade.personal_notes && trade.personal_notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    setSearchResults(filteredTrades);
    setIsSearching(false);
  }, [searchQuery, trades, setSearchResults, setIsSearching]);

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
        tags: editingTrade.tags.map(tag => tag.id),
        broker: editingTrade.broker,
        exchange: editingTrade.exchange,
      };
    }
    return undefined;
  }, [formMode, editingTrade]);

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trading Journal</h1>
          <Button onClick={openAddTradeDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Trade
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="trades" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="tags">
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
              onOpenFilter={openFilterDialog}
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
        tags={tags}
        onStatusChange={setSelectedStatuses}
        onTypeChange={setSelectedTypes}
        onTagChange={setSelectedTagIds}
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
      />
    </div>
  );
}