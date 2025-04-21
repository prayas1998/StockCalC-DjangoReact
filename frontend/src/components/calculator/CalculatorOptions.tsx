import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CalculatorOptionsProps } from "@/types/calculator";

const CalculatorOptions = ({
  exchange,
  setExchange,
  tradeType,
  setTradeType,
  instrumentType,
  setInstrumentType,
}: CalculatorOptionsProps) => {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium mb-4 block">
          Trade Type
        </Label>
        <ToggleGroup
          type="single"
          value={tradeType}
          onValueChange={(value) => value && setTradeType(value)}
          className="justify-start"
        >
          <ToggleGroupItem value="equity-delivery" className="text-sm">
            Equity - delivery
          </ToggleGroupItem>
          <ToggleGroupItem value="equity-intraday" className="text-sm">
            Equity - intraday
          </ToggleGroupItem>
          <ToggleGroupItem value="fno" className="text-sm">
            F&O
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap gap-8 items-start">
        <div>
          <Label className="text-base font-medium mb-4 block">
            Exchange
          </Label>
          <ToggleGroup
            type="single"
            value={exchange}
            onValueChange={(value) => value && setExchange(value)}
            className="justify-start"
          >
            <ToggleGroupItem value="NSE" className="text-sm">
              NSE
            </ToggleGroupItem>
            <ToggleGroupItem value="BSE" className="text-sm">
              BSE
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {tradeType === "fno" && (
          <div>
            <Label className="text-base font-medium mb-4 block">
              Instrument Type
            </Label>
            <ToggleGroup
              type="single"
              value={instrumentType}
              onValueChange={(value) =>
                value && setInstrumentType(value)
              }
              className="justify-start"
            >
              <ToggleGroupItem value="future" className="text-sm">
                Future
              </ToggleGroupItem>
              <ToggleGroupItem value="option" className="text-sm">
                Option
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculatorOptions; 