import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TradeForm } from "./TradeForm";
import { useJournal } from "@/hooks/useJournal";
import { toast } from "sonner";
import { TradeJournalCreate, TradeJournalUpdate, TradeTags } from "@/types/journal";

interface TradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: TradeJournalCreate;
  tradeId?: number;
  mode: "add" | "edit";
  availableTags: TradeTags[];
}

export function TradeFormDialog({
  open,
  onOpenChange,
  initialData,
  tradeId,
  mode,
  availableTags,
}: TradeFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createTrade, updateTrade } = useJournal();

  // Handle form submission
  const handleSubmit = async (data: TradeJournalCreate) => {
    setIsSubmitting(true);

    try {
      if (mode === "add") {
        // Create new trade
        const result = await createTrade.mutateAsync(data);
        if ("error" in result) {
          throw new Error(result.error);
        }
        toast.success("Trade added successfully");
      } else if (mode === "edit" && tradeId) {
        // Update existing trade
        const result = await updateTrade.mutateAsync({
          id: tradeId,
          trade: data as TradeJournalUpdate,
        });
        if ("error" in result) {
          throw new Error(result.error);
        }
        toast.success("Trade updated successfully");
      }

      // Close the dialog on success
      onOpenChange(false);
    } catch (error) {
      toast.error(
        `Failed to ${mode === "add" ? "add" : "update"} trade: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] lg:max-w-[1000px] max-h-[95vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold">
            {mode === "add" ? "Add New Trade" : "Edit Trade"}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {mode === "add"
              ? "Fill in the details below to add a new trade to your journal"
              : "Update the details of your trade below"}
          </DialogDescription>
        </DialogHeader>

        <TradeForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          availableTags={availableTags}
        />
      </DialogContent>
    </Dialog>
  );
}