import { Card } from "@/components/ui/card";
import type { CalculationResultsProps } from "@/types/calculator";

const CalculationResults = ({
  calculationState,
  formatCurrency,
  exchange,
}: CalculationResultsProps) => {
  
  // Find the breakeven price regardless of property name casing
  const getBreakevenPrice = () => {
    if (!calculationState.result?.summary) return null;
    
    const summary = calculationState.result.summary as Record<string, any>;
    // Check all possible variations of the property name
    const possibleNames = ['breakevenPrice', 'breakeven_price', 'breakevenPrice', 'breakeven_price', 'BreakevenPrice'];
    
    for (const name of possibleNames) {
      if (name in summary) {
        return summary[name];
      }
    }
    
    // If we still can't find it, try to find any key containing 'breakeven'
    const key = Object.keys(summary).find(k => 
      k.toLowerCase().includes('breakeven') || k.toLowerCase().includes('break_even')
    );
    
    if (key) {
      return summary[key];
    }
    
    // Fallback calculation if breakeven price is not provided
    if (summary.totalBuyValue && summary.totalQuantity && calculationState.result?.charges?.totalCharges) {
      try {
        const buyValue = parseFloat(summary.totalBuyValue);
        const charges = parseFloat(calculationState.result.charges.totalCharges || "0");
        const quantity = parseFloat(summary.totalQuantity);
        
        if (quantity > 0) {
          const calculatedBreakeven = (buyValue + charges) / quantity;
          return calculatedBreakeven.toFixed(2);
        }
      } catch (error) {
        console.error("Error calculating fallback breakeven price:", error);
      }
    }
    
    return null;
  }
  
  const breakEvenPrice = getBreakevenPrice();
  return (
    <Card className="p-6 glass mt-8">
      {calculationState.error && (
        <div className="p-4 mb-4 text-red-500 bg-red-50 rounded-lg">
          Error: {calculationState.error}
        </div>
      )}
      

      <div className="space-y-6">
        <div>
          <div className="text-sm text-muted-foreground">Turnover</div>
          <div className="text-2xl font-bold">
            {formatCurrency(
              calculationState.result?.summary.turnover || 0
            )}
          </div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground">Gross P&L</div>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(
              calculationState.result?.summary.grossPnL ?? 0
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-6">
            <div className="text-lg font-semibold">Charges</div>
            <div className="text-lg font-semibold">
              {formatCurrency(
                calculationState.result?.charges.totalCharges ?? 0
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-base font-medium">Brokerage</h4>
                <span>
                  {formatCurrency(
                    calculationState.result?.charges.brokerage ?? 0
                  )}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-base font-medium mb-3">
                Other Charges
              </h4>
              <div className="space-y-3">
                {/* Standard charges */}
                {[
                  {
                    key: "stt",
                    label: "Securities Transaction Tax (STT)",
                  },
                  { key: "exchangeCharges", label: "Exchange Charges" },
                  { key: "sebiFee", label: "SEBI Turnover Fees" },
                  { key: "gst", label: "GST" },
                  { key: "stampDuty", label: "Stamp Duty" },
                  { key: "dpCharges", label: "DP Charges" },
                  ...(exchange === "NSE"
                    ? [{ key: "ipft", label: "IPFT" }]
                    : []), // Conditional IPFT
                ].map(({ key, label }) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span>
                      {formatCurrency(
                        calculationState.result?.charges[
                          key as keyof typeof calculationState.result.charges
                        ] ?? 0
                      )}
                    </span>
                  </div>
                ))}
                
                {/* Breakeven Price - Always show if result exists */}
                <div className="flex justify-between pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-primary">Breakeven Price</span>
                  <span className="font-medium text-primary">
                    {calculationState.result 
                      ? (breakEvenPrice 
                          ? formatCurrency(breakEvenPrice) 
                          : formatCurrency("0"))
                      : "Calculating..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-muted-foreground">Net P&L</div>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(calculationState.result?.summary.netPnL ?? 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CalculationResults;  