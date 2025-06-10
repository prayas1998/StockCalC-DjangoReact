import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { formatCurrency, Charges } from "./ChargesUtils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

interface NetPLCalculatorProps {
  selectedBroker: 'Dhan' | 'Groww';
  selectedTradeType: 'equity-delivery' | 'equity-intraday';
  positionType: 'long' | 'short';
  profitBuyPrice: string;
  profitQuantity: string;
  profitSellPrice: string;
  profitResult: {
    grossProfit: number;
    netProfit: number;
    profitPercentage: number;
    isProfit: boolean;
    charges: Charges;
    breakevenPrice?: number;
  } | null;
  onChange: (field: string, value: string) => void;
  onCalculate: () => void;
  exchange: string;
}

const NetPLCalculator: React.FC<NetPLCalculatorProps> = ({
  selectedBroker,
  selectedTradeType,
  positionType,
  profitBuyPrice,
  profitQuantity,
  profitSellPrice,
  profitResult,
  onChange,
  onCalculate,
  exchange
}) => {
  return (
    <Card className="p-6 bg-card shadow-sm" aria-disabled={selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww'} style={selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww' ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Net P&L Calculator</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Calculate your net profit or loss after all charges based on your entry and exit prices.
      </p>
      {selectedTradeType === 'equity-intraday' && selectedBroker === 'Dhan' && (
        <div className="mb-4 flex items-center gap-2">
          <Label className="mb-0">Position:</Label>
          <Select value={positionType} onValueChange={val => onChange('positionType', val)}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="long">Long Position</SelectItem>
              <SelectItem value="short">Short Position</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-4">
        <div>
          <Label htmlFor="profitQuantity">Quantity</Label>
          <Input
            id="profitQuantity"
            type="text"
            placeholder="Enter quantity"
            value={profitQuantity}
            onChange={e => onChange('profitQuantity', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="profitBuyPrice">Entry Price Per Share</Label>
          <Input
            id="profitBuyPrice"
            type="text"
            placeholder="Enter entry price"
            value={profitBuyPrice}
            onChange={e => onChange('profitBuyPrice', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="sellPrice">Exit Price Per Share</Label>
          <Input
            id="sellPrice"
            type="text"
            placeholder="Enter exit price"
            value={profitSellPrice}
            onChange={e => onChange('profitSellPrice', e.target.value)}
            className="mt-1"
          />
        </div>
        <Button 
          onClick={onCalculate}
          className="w-full mt-2"
          variant={profitSellPrice && profitBuyPrice && parseFloat(profitSellPrice) < parseFloat(profitBuyPrice) ? "destructive" : "default"}
        >
          {profitSellPrice && profitBuyPrice && parseFloat(profitSellPrice) < parseFloat(profitBuyPrice) 
            ? "Calculate Net Loss" 
            : "Calculate Net Profit"}
        </Button>
      </div>
      {profitResult && (
        <div className="mt-6 p-4 border rounded-md bg-secondary/20">
          <h3 className="font-semibold text-lg mb-2">Results</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Gross {profitResult.isProfit ? "Profit" : "Loss"}:</span>
              <span className="font-medium">{formatCurrency(Math.abs(profitResult.grossProfit))}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Charges:</span>
              <span className="font-medium">{formatCurrency(profitResult.charges.totalCharges)}</span>
            </div>
            <div className="flex justify-between font-semibold" style={{ color: positionType === 'long' ? '#16a34a' : '#dc2626' }}>
              <span>Net {profitResult.isProfit ? "Profit" : "Loss"}:</span>
              <span className={profitResult.isProfit ? "text-primary" : "text-destructive"}>
                {formatCurrency(Math.abs(profitResult.netProfit))} ({profitResult.profitPercentage.toFixed(2)}%)
              </span>
            </div>
            {/* Breakeven Price Display */}
            {typeof profitResult.breakevenPrice === 'number' && (
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Breakeven Exit Price:</span>
                <span>{formatCurrency(profitResult.breakevenPrice)}</span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t">
              <div className="text-sm font-medium mb-1">Charges Breakdown</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brokerage:</span>
                  <span>{formatCurrency(profitResult.charges.brokerage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">STT:</span>
                  <span>{formatCurrency(profitResult.charges.stt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exchange:</span>
                  <span>{formatCurrency(profitResult.charges.exchangeCharges)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST:</span>
                  <span>{formatCurrency(profitResult.charges.gst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stamp Duty:</span>
                  <span>{formatCurrency(profitResult.charges.stampDuty)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SEBI Fee:</span>
                  <span>{formatCurrency(profitResult.charges.sebiCharges)}</span>
                </div>
                {exchange === "NSE" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IPFT:</span>
                    <span>{formatCurrency(profitResult.charges.ipft)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default NetPLCalculator; 