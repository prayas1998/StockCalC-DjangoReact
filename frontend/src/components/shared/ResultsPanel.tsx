import React from 'react';
import { formatCurrency, Charges } from '@/pages/Tools/ChargesUtils';

interface ResultsPanelProps {
  title: string;
  results: Array<{
    label: string;
    value: string;
    className?: string;
    style?: React.CSSProperties;
  }>;
  charges: Charges;
  exchange: string;
  breakevenPrice?: number;
  showChargesBreakdown?: boolean;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  title,
  results,
  charges,
  exchange,
  breakevenPrice,
  showChargesBreakdown = true
}) => {
  return (
    <div className="mt-6 p-4 border rounded-md bg-secondary/20">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <div className="space-y-2">
        {results.map((result, index) => (
          <div key={index} className={`flex justify-between ${result.className || ''}`} style={result.style}>
            <span>{result.label}:</span>
            <span className="font-medium">{result.value}</span>
          </div>
        ))}
        
        {/* Breakeven Price Display */}
        {typeof breakevenPrice === 'number' && (
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Breakeven Exit Price:</span>
            <span>{formatCurrency(breakevenPrice)}</span>
          </div>
        )}
        
        {/* Charges Breakdown */}
        {showChargesBreakdown && (
          <div className="pt-2 mt-2 border-t">
            <div className="text-sm font-medium mb-1">Charges Breakdown</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brokerage:</span>
                <span>{formatCurrency(charges.brokerage)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">STT:</span>
                <span>{formatCurrency(charges.stt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange:</span>
                <span>{formatCurrency(charges.exchangeCharges)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST:</span>
                <span>{formatCurrency(charges.gst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stamp Duty:</span>
                <span>{formatCurrency(charges.stampDuty)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SEBI Fee:</span>
                <span>{formatCurrency(charges.sebiCharges)}</span>
              </div>
              {exchange === "NSE" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IPFT:</span>
                  <span>{formatCurrency(charges.ipft)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};