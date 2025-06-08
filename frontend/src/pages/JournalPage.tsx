import { useState, useEffect } from "react";
import { useInView } from 'react-intersection-observer';
import { Plus, Filter, Search, Loader2, BarChart3, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TradeCard } from "@/components/journal/TradeCard";
import { TradeFormDialog } from "@/components/journal/TradeFormDialog";
import { JournalAnalytics } from "@/components/journal/JournalAnalytics";
import { TagManager } from "@/components/journal/TagManager";
import { useJournal } from "@/hooks/useJournal";
import { useTradeTags } from "@/hooks/useTradeTags";
import { TradeJournal, TradeJournalCreate, TradeStatus, TradeType } from "@/types/journal";
import type { CalculationError } from "@/types/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

function isTagsArray(tags: any): tags is any[] {
  return Array.isArray(tags);
}

export default function JournalPage() {
  // Infinite scroll sentinel
  const { ref, inView } = useInView();

  // State for form dialog and tabs
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeJournal | null>(null);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("trades");
  const [searchResults, setSearchResults] = useState<TradeJournal[] | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<TradeStatus[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<TradeType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

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
  const { tags, isLoading: isTagsLoading } = useTradeTags();

  // Infinite scroll: fetch next page when sentinel is in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isSearching && !searchQuery) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, isSearching, fetchNextPage, searchQuery]);

  // Handle adding a new trade
  const handleAddTrade = () => {
    setFormMode("add");
    setEditingTrade(null);
    setFormDialogOpen(true);
  };

  // Handle editing a trade
  const handleEditTrade = (trade: TradeJournal) => {
    setFormMode("edit");
    setEditingTrade(trade);
    setFormDialogOpen(true);
  };

  // Handle deleting a trade
  const handleDeleteTrade = async (tradeId: number) => {
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
  };

  // Handle search (client-side filtering only)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    setSearchResults(
      trades.filter(
        (trade) =>
          trade.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (trade.personal_notes && trade.personal_notes.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );
    setIsSearching(false);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setIsSearching(false);
  };

  // Format trade data for form
  const getInitialFormData = (): TradeJournalCreate | undefined => {
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
      };
    }
    return undefined;
  };

  // Render trades
  const renderTrades = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="text-center py-20 text-muted-foreground">
          Failed to load trades. Please try again later.
        </div>
      );
    }

    const list = searchQuery && searchResults !== null ? searchResults : trades;

    if (!list || list.length === 0) {
      return (
        <div className="text-center py-20 text-muted-foreground">
          No trades found. Add your first trade to get started!
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {list.map((trade) => (
          <TradeCard
            key={trade.id}
            trade={trade}
            onEdit={handleEditTrade}
            onDelete={handleDeleteTrade}
          />
        ))}
        {/* Infinite scroll sentinel */}
        {!searchQuery && (hasNextPage || isFetchingNextPage) && (
          <div ref={ref} className="flex justify-center items-center py-4">
            {isFetchingNextPage && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trading Journal</h1>
          <Button onClick={handleAddTrade}>
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
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search trades..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Search
                      className="h-4 w-4 text-muted-foreground cursor-pointer"
                      onClick={handleSearch}
                    />
                  )}
                </div>
              </div>
              {searchQuery && (
                <Button variant="outline" onClick={handleClearSearch}>
                  Clear Search
                </Button>
              )}
              <Button variant="outline" onClick={() => setFilterDialogOpen(true)}>
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>

            {/* Trade list */}
            {renderTrades()}
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
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Trades</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Status Filter */}
            <div>
              <div className="font-medium mb-2">Trade Status</div>
              <div className="flex flex-wrap gap-2">
                {Object.values(TradeStatus).map((status) => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedStatuses.includes(status)}
                      onCheckedChange={(checked) => {
                        setSelectedStatuses((prev) =>
                          checked
                            ? [...prev, status]
                            : prev.filter((s) => s !== status)
                        );
                      }}
                    />
                    {status.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>
            {/* Trade Type Filter */}
            <div>
              <div className="font-medium mb-2">Trade Type</div>
              <div className="flex flex-wrap gap-2">
                {Object.values(TradeType).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        setSelectedTypes((prev) =>
                          checked
                            ? [...prev, type]
                            : prev.filter((t) => t !== type)
                        );
                      }}
                    />
                    {type.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>
            {/* Tag Filter */}
            <div>
              <div className="font-medium mb-2">Tags</div>
              <div className="flex flex-wrap gap-2">
                {isTagsArray(tags) && tags.length > 0 ? (
                  tags.map((tag) => (
                    <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedTagIds.includes(tag.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTagIds((prev) =>
                            checked
                              ? [...prev, tag.id]
                              : prev.filter((id) => id !== tag.id)
                          );
                        }}
                      />
                      <span className="px-2 py-1 rounded" style={{ backgroundColor: tag.color + '22' }}>{tag.name}</span>
                    </label>
                  ))
                ) : (
                  <span className="text-muted-foreground">No tags created yet.</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedStatuses([]);
              setSelectedTypes([]);
              setSelectedTagIds([]);
              setFilterDialogOpen(false);
            }}>
              Clear All
            </Button>
            <Button onClick={() => setFilterDialogOpen(false)}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade form dialog */}
      <TradeFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        initialData={getInitialFormData()}
        tradeId={editingTrade?.id}
        mode={formMode}
        availableTags={isTagsArray(tags) ? tags : []}
      />
    </div>
  );
}