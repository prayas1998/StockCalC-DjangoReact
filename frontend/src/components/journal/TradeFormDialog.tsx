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
import { useFormValidationErrors } from "@/hooks/useFormValidationErrors";

interface TradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: TradeJournalCreate;
  tradeId?: number;
  mode: "add" | "edit";
  availableTags: TradeTags[];
  onTradeUpdated?: () => void; // Callback to refresh search results
}

export function TradeFormDialog({
  open,
  onOpenChange,
  initialData,
  tradeId,
  mode,
  availableTags,
  onTradeUpdated,
}: TradeFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createTrade, updateTrade } = useJournal();
  const { validationErrors, setErrorsFromResponse, clearAllErrors } = useFormValidationErrors();

  // Handle form submission
  const handleSubmit = async (data: TradeJournalCreate) => {
    setIsSubmitting(true);

    try {
      if (mode === "add") {
        // Create new trade
        await createTrade.mutateAsync(data);
        // Only close on success - errors will be caught below
        onOpenChange(false);
      } else if (mode === "edit" && tradeId) {
        // Update existing trade
        await updateTrade.mutateAsync({
          id: tradeId,
          trade: data as TradeJournalUpdate,
        });
        // Refresh search results if callback provided
        if (onTradeUpdated) {
          onTradeUpdated();
        }
        // Only close on success - errors will be caught below
        onOpenChange(false);
      }
    } catch (error: unknown) {
      
      // Handle validation errors by setting field-level errors
      const errorMessage = (error as { message?: string })?.message;
      if (errorMessage && setErrorsFromResponse(errorMessage)) {
        // Validation errors were set, don't show toast
      } else {
        // Non-validation error, show toast
        toast.error(`Failed to ${mode === "add" ? "add" : "update"} trade: ${errorMessage || 'Unknown error'}`);
      }
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
          validationErrors={validationErrors}
          onFieldChange={clearAllErrors}
        />
      </DialogContent>
    </Dialog>
  );
}