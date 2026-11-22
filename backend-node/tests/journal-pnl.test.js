import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';

process.env.VERCEL = '1';
process.env.SUPABASE_URL = 'https://journal-pnl-fixture.invalid';
process.env.SUPABASE_ANON_KEY = 'fixture-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service';
process.env.SUPABASE_JWT_SECRET = 'fixture-journal-pnl-secret';

const userId = '00000000-0000-4000-8000-000000000001';
const token = jwt.sign({ sub: userId, email: 'fixture@example.com' }, process.env.SUPABASE_JWT_SECRET);
const short = {
  user_id: userId,
  company_name: 'Fixture',
  trade_type: 'EQUITY_INTRADAY',
  direction: 'SHORT',
  status: 'CLOSED_MANUAL',
  broker: 'Dhan',
  exchange: 'NSE',
  quantity: 20,
  sell_price: 150,
  buy_price: 135,
};
const delivery = { ...short, trade_type: 'EQUITY_DELIVERY', direction: 'LONG', entry_date: '2026-02-27' };

const trades = [
  { ...short, id: 1, entry_date: '2026-02-28', exit_date: '2026-02-28' },
  { ...short, id: 2, entry_date: '2026-03-01', exit_date: '2026-03-01' },
  { ...short, id: 3, trade_type: 'EQUITY_DELIVERY', entry_date: '2026-02-28', exit_date: '2026-03-01' },
  { ...delivery, id: 4, exit_date: '2026-02-28' },
  { ...delivery, id: 5, exit_date: '2026-03-01' },
];
globalThis.fetch = async (input) => {
  const url = new URL(input instanceof Request ? input.url : input);
  assert.equal(url.origin, process.env.SUPABASE_URL);
  assert.equal(url.pathname, '/rest/v1/journal_tradejournal');
  const id = url.searchParams.get('id');
  return Response.json(trades.filter((trade) => id === `eq.${trade.id}`));
};

const { default: app } = await import('../dist/index.js');

async function getTrade(id) {
  const response = await app.request(`/api/journal/${id}/`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  return response.json();
}

test('journal estimates preserve prior tariffs and expose legacy delivery shorts as unavailable', async () => {
  assert.equal((await getTrade(1)).pnl, 296.76);
  assert.equal((await getTrade(2)).pnl, 296.77);
  const legacy = await getTrade(3);
  assert.equal(legacy.pnl, null);
  assert.equal(legacy.is_precise_calculation, false);
  assert.equal(legacy.direction, 'SHORT');
  assert.equal((await getTrade(4)).pnl, 279.03);
  assert.equal((await getTrade(5)).pnl, 279.04);
});
