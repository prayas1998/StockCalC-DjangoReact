import { Transaction } from '@/types/calculator';
import { PositionType, TradeType } from '@/context/CalculatorContext';

/**
 * Formats transactions for API calls, handling the special case of intraday short positions
 * where buyPrice and sellPrice need to be swapped for correct interpretation
 */
export const formatTransactionsForApi = (
  transactions: Transaction[], 
  tradeType: TradeType | string, 
  positionType: PositionType
) => {
  return transactions.map((t) => {
    // For all trade types and positions, send data as-is
    // The backend calculator expects:
    // - buyPrice: Entry price for long trades, Exit price for short trades
    // - sellPrice: Exit price for long trades, Entry price for short trades
    // The frontend form labels guide users to enter the correct values
    return {
      quantity: t.quantity,
      buyPrice: t.buyPrice || "0",
      sellPrice: t.sellPrice || "0",
    };
  });
};

/**
 * Gets the appropriate label for buy/sell price fields based on trade type and position
 */
export const getFieldLabels = (
  isIntraday: boolean,
  positionType: PositionType
) => {
  if (!isIntraday) {
    return {
      buyPriceLabel: 'Buy Price',
      sellPriceLabel: 'Sell Price',
      buyPricePlaceholder: 'Buy Price',
      sellPricePlaceholder: 'Sell Price'
    };
  }

  if (positionType === 'short') {
    return {
      buyPriceLabel: 'Entry Price (Sell)',
      sellPriceLabel: 'Exit Price (Buy)',
      buyPricePlaceholder: 'Entry Price (Sell)',
      sellPricePlaceholder: 'Exit Price (Buy)'
    };
  }

  return {
    buyPriceLabel: 'Entry Price (Buy)',
    sellPriceLabel: 'Exit Price (Sell)',
    buyPricePlaceholder: 'Entry Price (Buy)',
    sellPricePlaceholder: 'Exit Price (Sell)'
  };
};

/**
 * Validates a transaction to ensure it has valid quantity and price values
 */
export const validateTransaction = (transaction: Transaction): boolean => {
  const qty = Number(transaction.quantity);
  const buyPrice = Number(transaction.buyPrice);
  const sellPrice = Number(transaction.sellPrice);
  
  return (
    qty > 0 && 
    (buyPrice > 0 || sellPrice > 0)
  );
};