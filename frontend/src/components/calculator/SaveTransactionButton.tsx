import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SaveTransactionButtonProps } from "@/types/calculator";

const SaveTransactionButton = ({
  user,
  transactions,
  platform,
  exchange,
  tradeType,
  setAuthDialogOpen,
  handleSaveTransactions,
  isSaving
}: SaveTransactionButtonProps) => {
  const hasValidationErrors = transactions.some(t => 
    !t.quantity || Number(t.quantity) <= 0 || 
    ((Number(t.buyPrice) <= 0 || t.buyPrice === "") && 
     (Number(t.sellPrice) <= 0 || t.sellPrice === ""))
  );

  const canSaveTransactions = !!user && 
                            !!transactions[0]?.companyName?.trim() &&
                            !hasValidationErrors;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span> {/* Wrapper to make tooltip work with disabled button */}
            <Button
              onClick={() => {
                if (!user) {
                  setAuthDialogOpen(true);
                  return;
                }
                
                if (canSaveTransactions) {
                  handleSaveTransactions(user, setAuthDialogOpen);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!canSaveTransactions || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Transactions"}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {!user 
            ? "Please log in to save a transaction." 
            : !transactions[0]?.companyName?.trim() 
              ? "Please add a company name." 
              : hasValidationErrors
                ? "Please fix validation errors."
                : "Save your transaction details"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SaveTransactionButton; 