import { calculatePositionCharges, type Charges } from '@/pages/Tools/ChargesUtils';
import { calculateBreakevenPrice, MIN_PRICE } from '@/pages/Tools/BreakEven';

export interface ProfitTargetParams {
  entryPrice: number;
  quantity: number;
  profitPercentage?: number;
  exchange: string;
  broker: 'Dhan' | 'Groww';
  tradeType: 'equity-delivery' | 'equity-intraday';
  positionType: 'long' | 'short';
}

export interface ProfitTargetResult {
  sellingPrice: number;
  grossProfit: number;
  netProfit: number;
  charges: Charges;
  breakevenPrice: number;
}

export class ProfitTargetCalculatorService {
  static calculateTargetPrice(params: ProfitTargetParams): ProfitTargetResult | null {
    const { entryPrice, quantity, profitPercentage = 0, exchange, broker, tradeType, positionType } = params;
    if (!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) return null;

    const short = tradeType === 'equity-intraday' && positionType === 'short';
    const entryValue = entryPrice * quantity;
    const breakevenPrice = calculateBreakevenPrice(quantity, entryPrice, exchange, broker, tradeType, positionType);
    const targetNetProfit = entryValue * (short ? Math.min(profitPercentage, 100) : profitPercentage) / 100;
    const targetPrice = targetNetProfit > 0
      ? calculateBreakevenPrice(quantity, entryPrice, exchange, broker, tradeType, positionType, targetNetProfit)
      : breakevenPrice;
    const sellingPrice = short && !targetPrice && targetNetProfit > 0 ? MIN_PRICE : targetPrice;
    const charges = calculatePositionCharges(quantity, entryPrice, sellingPrice, exchange, broker, tradeType, positionType);
    const grossProfit = Number((quantity * (short ? entryPrice - sellingPrice : sellingPrice - entryPrice)).toFixed(2));
    const netProfit = Number((grossProfit - charges.totalCharges).toFixed(2));

    return { sellingPrice, grossProfit, netProfit, charges, breakevenPrice };
  }
}
