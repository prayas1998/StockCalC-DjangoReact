/**
 * TradeCard Component - Refactored
 * Displays individual trade information with expand/collapse functionality
 */

import React, { useState, memo } from "react";
import { format } from "date-fns";
import { Edit, Trash2, ChevronDown, ChevronUp, AlertTriangle, Tag as TagIcon, StickyNote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TradeJournal, TradeStatus } from "@/types/journal";
import { formatCurrency } from "@/lib/utils";
import { 
  getStatusColor, 
  formatTradeStatus,
  isTradeProfit,
  getTradeTypeDisplayText,
  calculateTradeDuration,
  calculatePnLPercentage,
  formatPercentage
} from "./utils";

interface TradeCardProps {
  trade: TradeJournal;
  onEdit: (trade: TradeJournal) => void;
  onDelete: (tradeId: number) => void;
}

export const TradeCard = memo<TradeCardProps>(({ trade, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Calculate derived values
  const statusColor = getStatusColor(trade.status);
  const isProfit = isTradeProfit(trade);
  const tradeDuration = calculateTradeDuration(trade.entry_date, trade.exit_date);
  const tradeTypeText = getTradeTypeDisplayText(trade.trade_type, trade.direction);
  // Use backend calculated percentage if available, otherwise calculate on frontend
  const pnlPercentage = trade.pnl_percentage ?? calculatePnLPercentage(trade);

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    onDelete(trade.id);
    setShowDeleteModal(false);
  };

  // Format dates safely
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">{trade.company_name}</h3>
              <Badge className={statusColor}>
                {formatTradeStatus(trade.status)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {tradeTypeText}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* P&L Display */}
              {trade.status === TradeStatus.OPEN ? (
                <div className="font-semibold text-muted-foreground">
                  --
                </div>
              ) : trade.pnl !== undefined && (
                <div className={`font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                  <div>{formatCurrency(trade.pnl)}</div>
                  {pnlPercentage !== null && (
                    <div className="text-xs opacity-75">
                      ({pnlPercentage >= 0 ? '+' : ''}{formatPercentage(pnlPercentage, 2)})
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(trade)}
                aria-label="Edit trade"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="text-destructive hover:text-destructive"
                aria-label="Delete trade"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? "Collapse details" : "Expand details"}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Quick Info Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Quantity:</span>
              <div className="font-medium">{trade.quantity.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Entry Price:</span>
              <div className="font-medium">{formatCurrency(trade.buy_price)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Entry Date:</span>
              <div className="font-medium">{formatDate(trade.entry_date)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <div className="font-medium">{tradeDuration} days</div>
            </div>
          </div>


          {/* Tags */}
          {trade.tags && trade.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <TagIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {trade.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-xs"
                    style={{ 
                      backgroundColor: tag.color + '15',
                      borderColor: tag.color + '50'
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Expanded Details */}
          {expanded && (
            <>
              <Separator className="my-4" />
              
              <div className="space-y-4">
                {/* Price Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {trade.sell_price && (
                    <div>
                      <span className="text-muted-foreground text-sm">Exit Price:</span>
                      <div className="font-medium">{formatCurrency(trade.sell_price)}</div>
                    </div>
                  )}
                  {trade.stop_loss && (
                    <div>
                      <span className="text-muted-foreground text-sm">Stop Loss:</span>
                      <div className="font-medium text-red-600">{formatCurrency(trade.stop_loss)}</div>
                    </div>
                  )}
                  {trade.target_price && (
                    <div>
                      <span className="text-muted-foreground text-sm">Target:</span>
                      <div className="font-medium text-green-600">{formatCurrency(trade.target_price)}</div>
                    </div>
                  )}
                </div>

                {/* Trade Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted-foreground text-sm">Trade Type:</span>
                    <div className="font-medium">{trade.trade_type.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">Broker:</span>
                    <div className="font-medium">{trade.broker}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">Exchange:</span>
                    <div className="font-medium">{trade.exchange}</div>
                  </div>
                </div>

                {/* Exit Date */}
                {trade.exit_date && (
                  <div>
                    <span className="text-muted-foreground text-sm">Exit Date:</span>
                    <div className="font-medium">{formatDate(trade.exit_date)}</div>
                  </div>
                )}


                {/* Personal Notes */}
                {trade.personal_notes && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground text-sm">Notes:</span>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                      {trade.personal_notes}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {trade.status === TradeStatus.OPEN && trade.stop_loss && trade.sell_price && trade.sell_price <= trade.stop_loss && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive text-sm">
                      Current price is at or below stop loss level
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trade</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this trade for <strong>{trade.company_name}</strong>?</p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

TradeCard.displayName = 'TradeCard';