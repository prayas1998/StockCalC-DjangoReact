import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const { outputFiles } = await build({
  stdin: {
    contents: `
      export * from './src/pages/Tools/ChargesUtils';
      export * from './src/pages/Tools/BreakEven';
      export * from './src/services/calculators/PositionSizingCalculatorService';
      export * from './src/services/calculators/NetPLCalculatorService';
      export * from './src/services/calculators/ProfitTargetCalculatorService';
      export { positionTypeForTrade } from './src/utils/transactionUtils';
    `,
    resolveDir: new URL('..', import.meta.url).pathname,
  },
  tsconfig: new URL('../tsconfig.app.json', import.meta.url).pathname,
  bundle: true,
  format: 'esm',
  write: false,
});

const {
  calculatePositionCharges,
  positionTypeForTrade,
  calculateBreakevenPrice,
  NetPLCalculatorService,
  ProfitTargetCalculatorService,
  PositionSizingCalculatorService,
} = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

const intraday = 'equity-intraday';
const delivery = 'equity-delivery';

test('Tools apply the capped Groww brokerage below, at and above ₹200', () => {
  for (const tradeType of [intraday, delivery]) {
    for (const [price, fee] of [[100, 5], [199, 9.96], [200, 10], [201, 10]]) {
      assert.equal(calculatePositionCharges(1, price, price, 'NSE', 'Groww', tradeType, 'long').brokerage, fee);
    }
  }
});

test('position sizing uses the correct stop-side taxes for long and short risk', () => {
  const params = { riskMode: 'amount', capital: 100000, riskAmount: 6030, riskPercent: 0,
    entryPrice: 15000, tradeType: intraday, broker: 'Dhan', exchange: 'NSE' };
  const long = PositionSizingCalculatorService.calculatePositionSize({ ...params, stopLoss: 9000, positionType: 'long' });
  const short = PositionSizingCalculatorService.calculatePositionSize({ ...params, stopLoss: 21000, positionType: 'short' });
  assert.equal(long.quantity, 1);
  assert.equal(short.quantity, 1);
  assert.equal(long.actualRiskAmount, 6012.39);
  assert.equal(short.actualRiskAmount, 6020.10);

  const exact = PositionSizingCalculatorService.calculatePositionSize(
    { ...params, entryPrice: 10.01, stopLoss: 10.06, riskAmount: 0.05, positionType: 'short' },
  );
  assert.equal(exact.quantity, 1);
  assert.equal(exact.actualRiskAmount, 0.05);

  const fractionalBudget = PositionSizingCalculatorService.calculatePositionSize(
    { ...params, entryPrice: 0.02, stopLoss: 0.03, riskAmount: 0.29, positionType: 'short' },
  );
  assert.equal(fractionalBudget.quantity, 29);
  assert.equal(fractionalBudget.actualRiskAmount, 0.29);

  const insufficient = PositionSizingCalculatorService.calculatePositionSize(
    { ...params, riskAmount: 6019, stopLoss: 21000, positionType: 'short' },
  );
  assert.equal(insufficient.type, 'INSUFFICIENT_RISK');
  assert.equal(insufficient.minimumRequirements.risk, 6020.10);

  const switched = PositionSizingCalculatorService.calculatePositionSize(
    { ...params, tradeType: delivery, stopLoss: 9000, positionType: 'short' },
  );
  assert.deepEqual(switched, PositionSizingCalculatorService.calculatePositionSize(
    { ...params, tradeType: delivery, stopLoss: 9000, positionType: 'long' },
  ));
});

test('Tools round matched intraday STT to paise before rounding to rupees', () => {
  assert.equal(calculatePositionCharges(100, 99.79, 99.79, 'NSE', 'Dhan', intraday, 'long').stt, 2);
  assert.equal(calculatePositionCharges(100, 99.80, 99.80, 'NSE', 'Dhan', intraday, 'long').stt, 3);
});

test('Tools breakeven quotes replay as profitable and their adjacent tick loses', () => {
  for (const item of [
    { entryPrice: 1, quantity: 1, exchange: 'NSE', broker: 'Dhan', tradeType: delivery, positionType: 'long', price: 15.75 },
    { entryPrice: 98, quantity: 100, exchange: 'NSE', broker: 'Dhan', tradeType: intraday, positionType: 'long', price: 98.10 },
    { entryPrice: 99.75, quantity: 100, exchange: 'NSE', broker: 'Dhan', tradeType: intraday, positionType: 'long', price: 99.86 },
    { entryPrice: 99.85, quantity: 100, exchange: 'NSE', broker: 'Dhan', tradeType: intraday, positionType: 'short', price: 99.74 },
    { entryPrice: 100, quantity: 1, exchange: 'NSE', broker: 'Groww', tradeType: intraday, positionType: 'short', price: 94.25 },
    { entryPrice: 88, quantity: 1, exchange: 'BSE', broker: 'Groww', tradeType: delivery, positionType: 'long' },
  ]) {
    const { entryPrice, quantity, exchange, broker, tradeType, positionType } = item;
    const params = { entryPrice, quantity, exchange, broker, tradeType, positionType };
    const quote = calculateBreakevenPrice(quantity, entryPrice, exchange, broker, tradeType, positionType);
    if (item.price) assert.equal(quote, item.price);
    const adjacent = Number((quote + (positionType === 'short' ? 0.01 : -0.01)).toFixed(2));
    assert.ok(NetPLCalculatorService.calculateNetPL({ ...params, exitPrice: quote }).netProfit >= -1e-9);
    assert.ok(NetPLCalculatorService.calculateNetPL({ ...params, exitPrice: adjacent }).netProfit < -1e-9);
    assert.equal(ProfitTargetCalculatorService.calculateTargetPrice(params).sellingPrice, quote);
  }
  assert.equal(calculateBreakevenPrice(1, 0.001, 'NSE', 'Dhan', intraday, 'short'), 0);
  assert.equal(calculateBreakevenPrice(1, 0.29, 'NSE', 'Dhan', intraday, 'short'), 0.29);
  for (const side of ['long', 'short']) {
    assert.equal(calculateBreakevenPrice(1, 1e14, 'NSE', 'Dhan', intraday, side), 0);
  }
});

test('Tools profit targets replay at the first qualifying tick', () => {
  const params = { entryPrice: 100, quantity: 1, exchange: 'NSE', broker: 'Groww', tradeType: intraday };
  for (const positionType of ['long', 'short']) {
    const trade = { ...params, positionType };
    const target = ProfitTargetCalculatorService.calculateTargetPrice({ ...trade, profitPercentage: 5 });
    const adjacent = Number((target.sellingPrice + (positionType === 'short' ? 0.01 : -0.01)).toFixed(2));
    assert.ok(target.netProfit >= 5);
    assert.ok(NetPLCalculatorService.calculateNetPL({ ...trade, exitPrice: adjacent }).netProfit < 5);
  }
});

test('calculator direction resets when switching a short position to delivery', () => {
  const short = positionTypeForTrade(intraday, 'short');
  const deliverySide = positionTypeForTrade(delivery, short);
  assert.equal(short, 'short');
  assert.equal(deliverySide, 'long');
  assert.equal(positionTypeForTrade(intraday, deliverySide), 'long');
});
