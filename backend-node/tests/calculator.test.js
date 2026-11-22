import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { Hono } from 'hono';
import { calcRoutes } from '../dist/routes/calculator.js';

const app = new Hono();
for (const route of calcRoutes) app.post(route.path, route.handler);

const row = (quantity, buyPrice, sellPrice, ids) => ({ quantity, buyPrice, sellPrice, ...ids });
const post = (data) => app.request('/api/calculate/', { method: 'POST', body: JSON.stringify(data) });
const delivery = { platform: 'dhan', exchange: 'NSE', tradeType: 'equity-delivery' };
const intraday = { ...delivery, tradeType: 'equity-intraday' };

async function calculate(options, transactions) {
  const response = await post({ ...options, transactions });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  return data;
}

test('calculator rejects invalid quantities, prices, exchanges and positions', async () => {
  for (const transactions of [
    [row(-1, 100, 110)], [row('0.5', 100, 110)], [row(0, 100, 110)],
    [row('1.0000000000000001', 100, 110)], [row(1, -100, 110)],
    [row(1, 0, 0)], [row(1, '1e999', 0)], [row(1, 'bogus', 0)], []
  ]) {
    const response = await post({ ...delivery, transactions });
    assert.equal(response.status, 400);
  }
  for (const invalid of [{ exchange: 'other' }, { positionType: 'short' }, { platform: 'other' }, { tradeType: 'other' }]) {
    const response = await post({ ...delivery, ...invalid, transactions: [row(1, 100, 110)] });
    assert.equal(response.status, 400);
  }

  for (const transaction of [row('1e0', '1.00', 0), row('1.0', 0, '1.00')]) {
    const { summary } = await calculate({ ...delivery, platform: 'Dhan', exchange: 'nse' }, [transaction]);
    assert.equal(summary.matchedQuantity, '0');
    assert.equal(summary.openQuantity, '1');
  }
});

test('matched gross and net stay separate from partial and one-sided cash flow', async () => {
  const fixtures = [
    { options: delivery, transactions: [row(10, 100, 0)], gross: '0.00', matched: '0', quantity: '10', side: 'buy' },
    { options: delivery, transactions: [row(5, 0, 110)], gross: '0.00', matched: '0', quantity: '5', side: 'sell' },
    { options: delivery, transactions: [row(10, 100, 0), row(5, 0, 110)], gross: '50.00', matched: '5', quantity: '5', side: 'buy' },
    { options: intraday, transactions: [row(10, 100, 0), row(5, 0, 110)], gross: '50.00', matched: '5', quantity: '5', side: 'buy' },
    { options: { ...intraday, positionType: 'short' }, transactions: [row(10, 110, 0), row(5, 0, 100)], gross: '50.00', matched: '5', quantity: '5', side: 'sell' },
    { options: intraday, transactions: [row(5, 100, 110)], gross: '50.00', matched: '5', quantity: '0', side: '' },
  ];
  for (const item of fixtures) {
    const { summary } = await calculate(item.options, item.transactions);
    assert.equal(summary.grossPnL, item.gross);
    assert.equal(summary.matchedQuantity, item.matched);
    assert.equal(summary.openQuantity, item.quantity);
    assert.equal(summary.openSide, item.side);
    assert.equal((Number(summary.netPnL) + Number(summary.openCashFlow)).toFixed(2), summary.cashFlow);
    assert.equal((Number(summary.netReceivable) - Number(summary.netPayable)).toFixed(2), summary.cashFlow);
    if (item.matched === '0') assert.equal(summary.netPnL, '0.00');
    if (item.quantity === '0') assert.equal(summary.openCashFlow, '0.00');
  }
});

test('intraday STT uses matched quantity and rounded daily VWAP across all executions', async () => {
  const isolated = await calculate(intraday, [row(100, 98, 101)]);
  assert.equal(isolated.charges.stt, '2.00');
  assert.equal((await calculate(intraday, [row(100, 99.79, 99.79)])).charges.stt, '2.00');
  assert.equal((await calculate(intraday, [row(100, 99.80, 99.80)])).charges.stt, '3.00');

  const trades = [row(60, 96, 0), row(40, 100, 0), row(100, 0, 100)];
  assert.equal((await calculate(intraday, trades)).charges.stt, '2.00');
  const partial = await calculate(intraday, [row(10, 200, 0), ...trades]);
  assert.equal(partial.charges.stt, '3.00'); // 100 matched × ₹103.62 VWAP × 0.025%
  assert.equal(partial.summary.openQuantity, '10');
  assert.equal((await calculate({ ...intraday, positionType: 'short' }, [row(100, 145, 0)])).charges.stt, '0.00');
  assert.equal((await calculate({ ...intraday, exchange: 'BSE' }, [row(100, 98, 101)])).charges.stt, '2.00');
});

test('Groww brokerage caps small orders on both sides in delivery and intraday', async () => {
  for (const plan of [delivery, intraday]) {
    for (const [price, expected] of [[100, '5.00'], [199, '9.96'], [200, '10.00'], [201, '10.00']]) {
      const { charges } = await calculate({ ...plan, platform: 'groww' }, [row(1, price, price)]);
      assert.equal(charges.brokerage, expected);
    }
  }
});

test('delivery charges count grouped fills and separate debit instructions', async () => {
  for (const [growwDpRate, lowCharge, standardCharge] of [
    ['standard', '4.13', '23.60'], ['female', '3.84', '23.31']
  ]) {
    const options = { ...delivery, platform: 'groww', growwDpRate };
    assert.equal((await calculate(options, [row(1, 0, 99.99)])).charges.dpCharges, lowCharge);
    const grouped = await calculate(options, [row(1, 0, 40, { sellOrderId: 'same' }), row(1, 0, 60, { sellOrderId: 'same' })]);
    assert.equal(grouped.charges.dpCharges, standardCharge);
    assert.equal(grouped.charges.brokerage, '2.50');
    const separate = await calculate(options, [row(1, 0, 100), row(1, 0, 101)]);
    assert.equal(separate.charges.dpCharges, (Number(standardCharge) * 2).toFixed(2));
  }

  const fees = async (rows) => (await calculate(delivery, rows)).charges.dpCharges;
  assert.equal(await fees([row(1, 0, 40, { sellOrderId: 'a' }), row(1, 0, 60, { sellOrderId: 'a' })]), '14.75');
  assert.equal(await fees([row(1, 0, 40, { debitInstructionId: 'a' }), row(1, 0, 60, { debitInstructionId: 'a' })]), '14.75');
  assert.equal(await fees([row(1, 0, 40), row(1, 0, 60)]), '29.50');
});

test('NSE tariff date distinguishes historical, current and unallocated exchange/IPFT fees', async () => {
  const transactions = [row(10000, 1000, 0)];
  const before = await calculate({ ...delivery, tradeDate: '2026-02-28' }, transactions);
  const current = await calculate({ ...delivery, tradeDate: '2026-03-01' }, transactions);
  assert.equal(before.charges.exchangeCharges, '297.00');
  assert.equal(before.charges.ipft, '10.00');
  assert.equal(current.charges.exchangeCharges, '306.99');
  assert.equal(current.charges.ipft, '0.01');
  assert.equal(before.charges.totalCharges, current.charges.totalCharges);

  const groww = await calculate({ ...delivery, platform: 'groww' }, transactions);
  assert.equal(groww.charges.exchangeCharges, null);
  assert.equal(groww.charges.ipft, null);
  assert.equal(groww.charges.exchangeAndIpft, '307.00');
  const bse = await calculate({ ...delivery, exchange: 'BSE' }, [row(100, 100, 100)]);
  assert.equal(bse.charges.exchangeCharges, '0.75');
});

test('replays the returned breakeven and the adjacent losing tick', async () => {
  const short = { ...intraday, positionType: 'short' };
  const growwBse = { ...intraday, platform: 'groww', exchange: 'BSE' };
  const growwDelivery = { ...delivery, platform: 'groww' };
  const shortEntries = [row(10, 100, 0), row(10, 200, 0)];
  const fixtures = [
    { options: delivery, entries: [row(1, 1, 0)], remaining: 1, price: '15.75', at: '0.00', adjacent: '-0.01' },
    { options: growwBse, entries: [row(1, 200, 0), row(1, 200, 0)], remaining: 2, price: '208.87', at: '0.00', adjacent: '-0.02' },
    { options: delivery, entries: [row(10, 100, 0), row(5, 0, 110)], remaining: 5, price: '96.32' },
    { options: short, entries: [row(10, 110, 0), row(5, 0, 100)], remaining: 5, price: '119.82', at: '0.04', adjacent: '-0.01' },
    { options: short, entries: shortEntries, remaining: 20, price: '149.83', at: '0.05', adjacent: '-0.15' },
    { options: intraday, entries: [row(100, 99.75, 0)], remaining: 100, price: '99.86', at: '0.19', adjacent: '-0.81' },
    { options: short, entries: [row(100, 99.85, 0)], remaining: 100, price: '99.74', at: '0.19', adjacent: '-0.81' },
    { options: growwDelivery, entries: [row(1, 88, 0)], remaining: 1 },
  ];
  for (const item of fixtures) {
    const { summary } = await calculate(item.options, item.entries);
    if (item.price) assert.equal(summary.breakevenPrice, item.price);
    const neighbour = (Number(summary.breakevenPrice) + (item.options.positionType === 'short' ? 0.01 : -0.01)).toFixed(2);
    const actual = await calculate(item.options, [...item.entries, row(item.remaining, 0, summary.breakevenPrice)]);
    const adjacent = await calculate(item.options, [...item.entries, row(item.remaining, 0, neighbour)]);
    if (item.at) assert.equal(actual.summary.netPnL, item.at);
    if (item.adjacent) assert.equal(adjacent.summary.netPnL, item.adjacent);
    assert.ok(Number(actual.summary.netPnL) >= 0);
    assert.ok(Number(adjacent.summary.netPnL) < 0);
  }

  const originalCloses = [row(10, 100, 90), row(10, 200, 180)];
  const forward = await calculate(short, originalCloses);
  const reverse = await calculate(short, [...originalCloses].reverse());
  assert.deepEqual(forward.summary, reverse.summary);
  assert.equal(forward.summary.breakevenMode, 'full');
  assert.equal(forward.summary.breakevenPrice, '149.83');

  const beforeDpJump = await calculate(growwDelivery, [row(1, 88, 0)]);
  assert.ok(Number(beforeDpJump.summary.breakevenPrice) < 100);
  assert.ok(Number((await calculate(growwDelivery, [row(1, 88, 100)])).summary.netPnL) < 0);

  const unreachable = await calculate(short, [row(1, '0.001', 0)]);
  assert.equal(unreachable.summary.breakevenMode, 'unavailable');
  assert.equal(unreachable.summary.breakevenPrice, '0.00');
});

test('breakeven terminates for a valid trade with a quote outside the supported paise range', () => {
  const equityModule = new URL('../dist/calculations/equity.js', import.meta.url);
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', `
    import { EquityCalculator } from ${JSON.stringify(equityModule.href)};
    const result = new EquityCalculator('dhan', 'NSE', 'equity-delivery').calculate_transaction_charges([
      { quantity: '1000000000000000', buyPrice: '1000000000000', sellPrice: '0' },
      { quantity: '999999999999999', buyPrice: '0', sellPrice: '0.01' }
    ]);
    process.stdout.write(result.summary.breakevenMode);
  `], { encoding: 'utf8', timeout: 2000 });
  assert.equal(output, 'unavailable');
});
