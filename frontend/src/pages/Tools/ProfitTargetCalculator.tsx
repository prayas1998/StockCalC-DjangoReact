import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { formatCurrency, Charges } from "./ChargesUtils";

interface ProfitTargetCalculatorProps {
  selectedBroker: 'Dhan' | 'Groww';
  selectedTradeType: 'equity-delivery' | 'equity-intraday';
  targetBuyPrice: string;
  targetQuantity: string;
  targetProfitPercentage: string;
  targetResult: {
    sellingPrice: number;
    grossProfit: number;
    netProfit: number;
    charges: Charges;
  } | null;
  onChange: (field: string, value: string) => void;
  onCalculate: () => void;
  exchange: string;
}

const ProfitTargetCalculator: React.FC<ProfitTargetCalculatorProps> = ({
  selectedBroker,
  selectedTradeType,
  targetBuyPrice,
  targetQuantity,
  targetProfitPercentage,
  targetResult,
  onChange,
  onCalculate,
  exchange
}) => {
  return (
    <Card className="p-6 bg-card shadow-sm" aria-disabled={selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww'} style={selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww' ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Profit Target Calculator</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Calculate the required selling price to achieve your target profit percentage after all charges.
      </p>
      <div className="space-y-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="text"
            placeholder="Enter quantity"
            value={targetQuantity}
            onChange={e => onChange('targetQuantity', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="buyPrice">Buy Price Per Share</Label>
          <Input
            id="buyPrice"
            type="text"
            placeholder="Enter buy price"
            value={targetBuyPrice}
            onChange={e => onChange('targetBuyPrice', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="profitPercentage">Target Profit Percentage</Label>
          <Input
            id="profitPercentage"
            type="text"
            placeholder="Enter percentage (e.g. 5 for 5%)"
            value={targetProfitPercentage}
            onChange={e => onChange('targetProfitPercentage', e.target.value)}
            className="mt-1"
          />
        </div>
        <Button 
          onClick={onCalculate}
          className="w-full mt-2"
        >
          Calculate Target Price
        </Button>
      </div>
      {targetResult && (
        <div className="mt-6 p-4 border rounded-md bg-secondary/20">
          <h3 className="font-semibold text-lg mb-2">Results</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-primary font-semibold">
              <span>Required Selling Price:</span>
              <span>{formatCurrency(targetResult.sellingPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gross Profit:</span>
              <span className="font-medium">{formatCurrency(targetResult.grossProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Charges:</span>
              <span className="font-medium">{formatCurrency(targetResult.charges.totalCharges)}</span>
            </div>
            <div className="flex justify-between text-primary font-semibold">
              <span>Net Profit:</span>
              <span>{formatCurrency(targetResult.netProfit)}</span>
            </div>
            <div className="pt-2 mt-2 border-t">
              <div className="text-sm font-medium mb-1">Charges Breakdown</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brokerage:</span>
                  <span>{formatCurrency(targetResult.charges.brokerage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">STT:</span>
                  <span>{formatCurrency(targetResult.charges.stt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exchange:</span>
                  <span>{formatCurrency(targetResult.charges.exchangeCharges)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST:</span>
                  <span>{formatCurrency(targetResult.charges.gst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stamp Duty:</span>
                  <span>{formatCurrency(targetResult.charges.stampDuty)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SEBI Fee:</span>
                  <span>{formatCurrency(targetResult.charges.sebiCharges)}</span>
                </div>
                {exchange === "NSE" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IPFT:</span>
                    <span>{formatCurrency(targetResult.charges.ipft)}</span>
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

export default ProfitTargetCalculator; 