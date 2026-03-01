import type {
  BrokerType,
  PositionType,
  TradeType,
} from "@/context/CalculatorContext";
import { calculateCharges } from "@/pages/Tools/ChargesUtils";

export interface NetCashflowInput {
  buyValue: number;
  sellValue: number;
  buySideCharges: number;
  sellSideCharges: number;
}

export interface NetCashflowBreakdown {
  buyValue: number;
  sellValue: number;
  buySideCharges: number;
  sellSideCharges: number;
  netPayable: number;
  netReceivable: number;
}

interface DirectionalTradeValuesInput {
  tradeEntryValue: number;
  tradeExitValue: number;
  tradeType: TradeType;
  positionType: PositionType;
  broker: BrokerType;
}

interface BuySellLegChargesInput {
  buyValue: number;
  sellValue: number;
  exchange: string;
  broker: BrokerType;
  tradeType: TradeType;
  totalCharges?: number;
}

const toSafeNumber = (value: number): number => {
  return Number.isFinite(value) ? value : 0;
};

const toPaise = (value: number): number => {
  return Math.round(toSafeNumber(value) * 100);
};

const fromPaise = (value: number): number => {
  return value / 100;
};

const isIntradayShortTrade = ({
  tradeType,
  positionType,
  broker,
}: {
  tradeType: TradeType;
  positionType: PositionType;
  broker: BrokerType;
}): boolean => {
  return (
    tradeType === "equity-intraday" &&
    broker === "Dhan" &&
    positionType === "short"
  );
};

export function computeNetCashflow({
  buyValue,
  sellValue,
  buySideCharges,
  sellSideCharges,
}: NetCashflowInput): NetCashflowBreakdown {
  const buyValuePaise = toPaise(buyValue);
  const sellValuePaise = toPaise(sellValue);
  const buySideChargesPaise = toPaise(buySideCharges);
  const sellSideChargesPaise = toPaise(sellSideCharges);

  const netPayablePaise = buyValuePaise + buySideChargesPaise;
  const netReceivablePaise = sellValuePaise - sellSideChargesPaise;

  return {
    buyValue: fromPaise(buyValuePaise),
    sellValue: fromPaise(sellValuePaise),
    buySideCharges: fromPaise(buySideChargesPaise),
    sellSideCharges: fromPaise(sellSideChargesPaise),
    netPayable: fromPaise(netPayablePaise),
    netReceivable: fromPaise(netReceivablePaise),
  };
}

export function deriveDirectionalBuySellValues({
  tradeEntryValue,
  tradeExitValue,
  tradeType,
  positionType,
  broker,
}: DirectionalTradeValuesInput): { buyValue: number; sellValue: number } {
  const entryValue = toSafeNumber(tradeEntryValue);
  const exitValue = toSafeNumber(tradeExitValue);

  if (isIntradayShortTrade({ tradeType, positionType, broker })) {
    return {
      buyValue: exitValue,
      sellValue: entryValue,
    };
  }

  return {
    buyValue: entryValue,
    sellValue: exitValue,
  };
}

export function deriveBuySellLegCharges({
  buyValue,
  sellValue,
  exchange,
  broker,
  tradeType,
  totalCharges,
}: BuySellLegChargesInput): {
  buySideCharges: number;
  sellSideCharges: number;
} {
  const safeBuyValue = toSafeNumber(buyValue);
  const safeSellValue = toSafeNumber(sellValue);

  const buySideChargeTotal = calculateCharges(
    safeBuyValue,
    0,
    exchange,
    broker,
    tradeType
  ).totalCharges;
  const sellSideChargeTotal = calculateCharges(
    0,
    safeSellValue,
    exchange,
    broker,
    tradeType
  ).totalCharges;
  const fullTradeChargeTotal = calculateCharges(
    safeBuyValue,
    safeSellValue,
    exchange,
    broker,
    tradeType
  ).totalCharges;

  const expectedTotalPaise = toPaise(
    totalCharges === undefined ? fullTradeChargeTotal : totalCharges
  );
  const buySideChargesPaise = toPaise(buySideChargeTotal);
  const sellSideChargesPaise = toPaise(sellSideChargeTotal);
  const roundingDeltaPaise =
    expectedTotalPaise - (buySideChargesPaise + sellSideChargesPaise);

  return {
    buySideCharges: fromPaise(buySideChargesPaise),
    sellSideCharges: fromPaise(sellSideChargesPaise + roundingDeltaPaise),
  };
}
