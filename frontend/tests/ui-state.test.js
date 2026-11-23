import test from 'node:test';
import assert from 'node:assert/strict';
import { filtersFromParams, filtersToParams } from '../src/utils/journalFilterUrlState.ts';
import { withCompanyApiFilters } from '../src/utils/journalCompanyFilters.ts';
import { isLatestCalculation } from '../src/utils/calculationRequest.ts';

test('journal URL round trip retains companies, search, and other filters', () => {
  const filters = {
    status: ['OPEN'],
    trade_type: ['EQUITY_DELIVERY'],
    tags: [4, 9],
    companies: ['Acme, Inc', 'North Star'],
    is_profitable: false,
    start_date: '2026-01-01',
    end_date: '2026-02-01',
  };
  const params = filtersToParams(filters, 'Acme');
  assert.deepEqual(filtersFromParams(params), filters);
  assert.deepEqual(params.getAll('company'), ['Acme, Inc', 'North Star']);
  assert.equal(params.get('query'), 'Acme');
  assert.deepEqual(filtersFromParams(new URLSearchParams('companies=Acme+Ltd%2CNorth+Star')).companies, ['Acme Ltd', 'North Star']);
  assert.deepEqual(withCompanyApiFilters({ companies: ['Acme, Inc'] }), { company: ['Acme, Inc'] });
  assert.deepEqual(withCompanyApiFilters({ companies: ['Acme Ltd'] }), { company: ['Acme Ltd'], companies: ['Acme Ltd'] });
});

test('new calculator request invalidates a late success or error from an older request', () => {
  const oldInputs = { platform: 'dhan', exchange: 'NSE', tradeType: 'delivery', transactions: [], positionType: 'long' };
  const currentInputs = { ...oldInputs, transactions: [{ id: 'new' }] };
  const clearedInputs = { ...oldInputs, transactions: [{ quantity: '0', buyPrice: '0', sellPrice: '0' }] };
  assert.equal(isLatestCalculation(1, 2, oldInputs, oldInputs), false);
  assert.equal(isLatestCalculation(2, 2, oldInputs, currentInputs), false);
  assert.equal(isLatestCalculation(2, 2, oldInputs, clearedInputs), false);
  assert.equal(isLatestCalculation(2, 2, currentInputs, currentInputs), true);
});
