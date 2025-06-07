import { useState } from "react";
import { format } from "date-fns";
import { Edit, Trash2, ChevronDown, ChevronUp, AlertTriangle, Tag as TagIcon, StickyNote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TradeJournal, TradeStatus } from "@/types/journal";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface TradeCardProps {
  trade: TradeJournal;
  onEdit: (trade: TradeJournal) => void;
  onDelete: (tradeId: number) => void;
}

export function TradeCard({ trade, onEdit, onDelete }: TradeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Calculate progress percentage for target price
  const calculateTargetProgress = () => {
    if (!trade.target_price || !trade.buy_price) return 0;
    
    // For open trades, use current price or buy price
    const currentPrice = trade.sell_price || trade.buy_price;
    
    // Calculate how far we've moved toward the target
    const priceMovement = currentPrice - trade.buy_price;
    const targetMovement = trade.target_price - trade.buy_price;
    
    // Calculate percentage (capped at 100%)
    const percentage = (priceMovement / targetMovement) * 100;
    return Math.min(Math.max(0, percentage), 100);
  };

  // Get status badge color
  const getStatusColor = (status: TradeStatus) => {
    switch (status) {
      case TradeStatus.OPEN:
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case TradeStatus.CLOSED_TARGET:
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case TradeStatus.CLOSED_STOPLOSS:
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      case TradeStatus.CLOSED_MANUAL:
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case TradeStatus.CANCELLED:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  // Format trade type for display
  const formatTradeType = (type: string) => {
    return type.replace("_", " ");
  };

  // Format status for display
  const formatStatus = (status: TradeStatus) => {
    return status.replace("_", " ");
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Card Header */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{trade.company_name}</h3>
              <Badge variant="outline" className={getStatusColor(trade.status)}>
                {formatStatus(trade.status)}
              </Badge>
              {trade.tags && trade.tags.map((tag) => (
                <span key={tag.id} className="flex items-center ml-1 px-2 py-1 rounded bg-muted/40 text-xs gap-1" style={{ backgroundColor: tag.color + '33' }}>
                  <TagIcon className="h-3 w-3" style={{ color: tag.color }} />
                  {tag.name}
                </span>
              ))}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatTradeType(trade.trade_type)} • {trade.quantity} shares
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className={`text-lg font-semibold ${trade.pnl && trade.pnl > 0 ? 'text-green-500' : trade.pnl && trade.pnl < 0 ? 'text-red-500' : ''}`}>
              {trade.status === TradeStatus.OPEN
                ? trade.unrealized_pnl
                  ? formatCurrency(trade.unrealized_pnl)
                  : "--"
                : trade.pnl
                  ? formatCurrency(trade.pnl)
                  : "--"}
            </div>
            <div className="text-xs text-muted-foreground">
              {trade.status === TradeStatus.OPEN ? "Unrealized P&L" : "P&L"}
            </div>
          </div>
        </div>

        {/* Card Summary - Compact, with Entry/Exit dates and prices */}
        <div className="px-4 pb-2 flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-4">
            <span className="italic text-xs text-muted-foreground">
              Entry: {format(new Date(trade.entry_date), "MMM d, yyyy")}
            </span>
            <span className="italic text-xs text-muted-foreground">
              Exit: {trade.exit_date ? format(new Date(trade.exit_date), "MMM d, yyyy") : "--"}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 mt-1">
            <span>
              <span className="text-muted-foreground">Entry Price:</span> {formatCurrency(trade.buy_price)}
            </span>
            <span>
              <span className="text-muted-foreground">SL:</span> {trade.stop_loss ? formatCurrency(trade.stop_loss) : "--"}
            </span>
            <span>
              <span className="text-muted-foreground">Target:</span> {trade.target_price ? formatCurrency(trade.target_price) : "--"}
            </span>
            {(trade.status === TradeStatus.CLOSED_MANUAL || trade.status === TradeStatus.CANCELLED) && trade.sell_price ? (
              <span>
                <span className="text-muted-foreground">Exit Price:</span> {formatCurrency(trade.sell_price)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Target Progress (for open trades) */}
        {trade.status === TradeStatus.OPEN && trade.target_price && (
          <div className="px-4 pb-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Progress to Target</span>
              <span>
                {trade.buy_price && trade.target_price
                  ? `${formatCurrency(trade.buy_price)} → ${formatCurrency(trade.target_price)}`
                  : ""}
              </span>
            </div>
            <Progress value={calculateTargetProgress()} className="h-2" />
          </div>
        )}

        {/* Expand/Collapse Button */}
        <div className="px-4 py-2 flex justify-between items-center border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs flex items-center gap-1 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" /> Less Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> More Details
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(trade)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteModal(true)}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="px-4 py-3 border-t bg-muted/30">
            {/* Notes */}
            {trade.personal_notes && trade.personal_notes.trim() !== "" && (
              <>
                <Separator className="my-3" />
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">Notes</h4>
                </div>
                <p className="text-sm whitespace-pre-line ml-6">{trade.personal_notes}</p>
              </>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trade</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-base">Are you sure you want to delete this trade?</p>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { onDelete(trade.id); setShowDeleteModal(false); }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}