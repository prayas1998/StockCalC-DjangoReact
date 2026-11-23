import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';

process.env.VERCEL = '1';
process.env.SUPABASE_URL = 'https://journal-fixture.invalid';
process.env.SUPABASE_ANON_KEY = 'fixture-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service';
process.env.SUPABASE_JWT_SECRET = 'fixture-journal-secret';

const owner = '00000000-0000-4000-8000-000000000001';
const otherOwner = '00000000-0000-4000-8000-000000000002';
const sign = (sub) => jwt.sign({ sub, email: `fixture-${sub}@example.com` }, process.env.SUPABASE_JWT_SECRET);
const ownerToken = sign(owner);
const otherToken = sign(otherOwner);
const usersByToken = new Map([[ownerToken, owner], [otherToken, otherOwner]]);

const buy = {
  company_name: 'Example',
  trade_type: 'EQUITY_DELIVERY',
  quantity: 1,
  buy_price: 100,
  stop_loss: 90,
  target_price: 110,
  entry_date: '2026-01-01',
  status: 'OPEN',
  direction: 'LONG',
  broker: 'Dhan',
  exchange: 'NSE'
};
const tags = [
  { id: 1, user_id: owner, name: 'Example Tag', color: '#112233' },
  { id: 2, user_id: otherOwner, name: 'Other Tag', color: '#334455' },
  { id: 3, user_id: owner, name: 'Extra Tag', color: '#445566' },
  { id: 4, user_id: owner, name: 'Last Tag', color: '#556677' }
];
const trades = [
  ...[1, 2, 3].map((id) => ({
    ...buy,
    id,
    company_name: id === 3 ? 'Acme, Inc.' : buy.company_name,
    personal_notes: 'Example stock',
    user_id: owner,
    ...(id === 3 ? { status: 'CLOSED_TARGET', exit_date: '2026-01-02' } : {}),
    journal_tradejournaltags: (id === 3 ? [tags[0], tags[2], tags[3]] : [tags[0]])
      .map((tag) => ({ tag_id: tag.id, journal_tradetags: tag }))
  })),
  {
    ...buy,
    id: 4,
    user_id: otherOwner,
    company_name: 'Other fixture',
    journal_tradejournaltags: [{ tag_id: 2, journal_tradetags: tags[1] }]
  }
];
const calls = [];
let rpcResult;
let rowCap = 2;
globalThis.fetch = async (input, options) => {
  const request = new Request(input, options);
  const url = new URL(request.url);
  const caller = usersByToken.get(request.headers.get('authorization')?.replace('Bearer ', ''));
  const call = { caller, url, method: request.method };
  calls.push(call);
  if (url.origin !== process.env.SUPABASE_URL || !caller) {
    return Response.json({ code: '42501', message: 'Mock RLS rejected a missing JWT' }, { status: 401 });
  }

  const resource = url.pathname.split('/').at(-1);
  if (url.pathname.includes('/rpc/')) {
    assert.equal(request.method, 'POST');
    call.body = await request.json();
    if (resource !== 'journal_trades_with_tags') return rpcResult(caller, resource, call.body);
    assert.ok(request.headers.get('prefer').split(',').map((value) => value.trim()).includes('count=exact'));
    assert.equal(url.searchParams.has('id'), false);
  }

  let rows;
  if (resource === 'journal_tradejournal' || resource === 'journal_trades_with_tags') {
    rows = trades.filter((trade) => trade.user_id === caller);
    if (resource === 'journal_trades_with_tags') {
      rows = rows.filter((trade) => call.body.p_tag_ids.every((id) =>
        trade.journal_tradejournaltags.some((tag) => tag.tag_id === id && tag.journal_tradetags.user_id === caller)));
    }
    const select = url.searchParams.get('select');
    if (!select.includes('journal_tradejournaltags')) {
      rows = rows.map(({ journal_tradejournaltags, ...trade }) => trade);
    } else if (select.includes('!inner')) {
      assert.ok(url.searchParams.has('journal_tradejournaltags.tag_id'));
    } else {
      rows = rows.map((trade) => ({ ...trade, journal_tradejournaltags: trade.journal_tradejournaltags.slice(0, rowCap) }));
    }
  } else if (resource === 'journal_tradetags') {
    rows = tags.filter((tag) => tag.user_id === caller);
  } else {
    assert.equal(resource, 'journal_tradejournaltags');
    rows = trades.flatMap((trade) => trade.journal_tradejournaltags.map((relation, index) => ({
      id: 10 * trade.id + index,
      trade_id: trade.id,
      ...relation
    }))).filter((relation) => relation.journal_tradetags.user_id === caller);
  }

  for (const [key, value] of url.searchParams) {
    if (value.startsWith('eq.')) {
      const expected = value.slice(3);
      if (key === 'journal_tradejournaltags.tag_id') {
        rows = rows.filter((trade) => trade.journal_tradejournaltags.some((relation) => String(relation.tag_id) === expected));
      } else if (key.includes('.')) {
        assert.equal(expected, caller);
      } else {
        rows = rows.filter((row) => String(row[key]) === expected);
      }
    } else if (key === 'id' && value.startsWith('gt.')) {
      rows = rows.filter((row) => row.id > Number(value.slice(3)));
    } else if (value.startsWith('in.(')) {
      const contents = value.slice(4, -1);
      const choices = key === 'company_name' ? JSON.parse(`[${contents}]`) : contents.split(',');
      rows = rows.filter((row) => choices.includes(String(row[key])));
    } else if (value.startsWith('ilike.%')) {
      rows = rows.filter((row) => row[key].toLowerCase().includes(value.slice(7, -1).toLowerCase()));
    }
  }

  const by = url.searchParams.get('order')?.split(',') ?? [];
  rows.sort((a, b) => {
    for (const entry of by) {
      const [field, direction] = entry.split('.');
      if (a[field] === b[field]) continue;
      return (a[field] < b[field] ? -1 : 1) * (direction === 'desc' ? -1 : 1);
    }
    return 0;
  });
  const count = rows.length;
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const limit = Math.min(rowCap, Number(url.searchParams.get('limit') ?? rowCap));
  rows = rows.slice(offset, offset + limit);
  return Response.json(rows, { headers: { 'content-range': `${offset}-${offset + rows.length - 1}/${count}` } });
};

const { default: app } = await import('../dist/index.js');

function request(path, token = ownerToken, method = 'GET', body) {
  return app.request(path, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

async function json(path, expected = 200, token = ownerToken, method = 'GET', body) {
  const response = await request(path, token, method, body);
  assert.equal(response.status, expected, path);
  return response.json();
}

test('signed-out journal and tag reads return JSON 401 before contacting Supabase', async () => {
  const previousCalls = calls.length;
  for (const path of ['/api/journal/', '/api/journal/analytics/', '/api/journal/1/', '/api/tags/popular/']) {
    assert.equal((await json(path, 401, null)).category, 'authentication');
  }
  assert.equal(calls.length, previousCalls);
});

test('static journal and popular tag routes dispatch and read all rows across the mock REST cap', async () => {
  const analytics = await json('/api/journal/analytics/');
  assert.equal(analytics.total_trades, 3);
  assert.equal(analytics.tag_performance.length, 3);
  assert.equal((await json('/api/journal/search/?q=Example')).count, 3);
  assert.equal((await json('/api/journal/suggestions/?q=Example'))[0].text, 'Example');
  for (const route of ['tag_analytics', 'tag-analytics']) {
    const result = await json(`/api/journal/${route}/?tag_name=example+tag`);
    assert.equal(result.total_trades_with_tag, 3);
  }
  assert.deepEqual((await json('/api/tags/popular/')).map((tag) => tag.id), [1, 3, 4]);
  assert.ok(calls.filter(({ url }) => url.searchParams.get('id')?.startsWith('gt.')).length > 10);
});

test('numeric journal details and lists use the caller JWT and keep owner and missing rows distinct', async () => {
  assert.deepEqual((await json('/api/journal/?page_size=1&tags=1')).results.map(({ id }) => id), [1]);
  assert.equal((await json('/api/journal/1/')).tags[0].id, 1);
  assert.equal((await json('/api/journal/4/', 404)).category, 'not_found');
  assert.equal((await json('/api/journal/4/', 200, otherToken)).company_name, 'Other fixture');
  assert.equal((await json('/api/journal/analytics/', 200, otherToken)).total_trades, 1);
  assert.deepEqual((await json('/api/tags/')).map((tag) => tag.id), [1, 3, 4]);
  assert.equal((await json('/api/tags/1/')).user_id, owner);
  assert.equal((await json('/api/tags/2/', 404)).category, 'not_found');
  assert.deepEqual((await json('/api/tags/', 200, otherToken)).map((tag) => tag.id), [2]);
  assert.equal((await request('/api/journal/not-an-id/')).status, 404);
});

test('company filters keep comma-containing company names exact in list and search', async () => {
  const exactCompany = 'company=Acme%2C+Inc.';
  const list = await json(`/api/journal/?${exactCompany}`);
  assert.deepEqual(list.results.map(({ company_name }) => company_name), ['Acme, Inc.']);
  const search = await json(`/api/journal/search/?q=Acme&${exactCompany}`);
  assert.deepEqual(search.results.map(({ company_name }) => company_name), ['Acme, Inc.']);
  assert.equal((await json(`/api/journal/?${exactCompany}&company=Example`)).count, 3);
  assert.equal((await json('/api/journal/?companies=Example,Unknown')).count, 2);
});

test('list pages respect a REST cap of seven, a page maximum of 100, and all-tag filtering', async () => {
  const previousLength = trades.length;
  const previousCap = rowCap;
  rowCap = 7;
  try {
    for (let id = 1000; id < 1120; id++) {
      const selectedTags = id === 1119 ? [tags[0], tags[0]] : [tags[0], tags[0], tags[2]];
      trades.push({
        ...buy, id, user_id: owner, company_name: 'Bulk',
        entry_date: id % 2 ? '2026-01-03' : '2026-01-02',
        journal_tradejournaltags: selectedTags.map((tag) => ({ tag_id: tag.id, journal_tradetags: tag }))
      });
    }
    trades.push({ ...trades.at(-2), id: 1200, user_id: otherOwner });

    const bulk = '/api/journal/?company=Bulk';
    const first = await json(`${bulk}&page_size=10`);
    const second = await json(`${bulk}&page_size=10&page=2`);
    assert.equal(first.count, 120);
    assert.deepEqual(first.results.map(({ id }) => id), [1001, 1003, 1005, 1007, 1009, 1011, 1013, 1015, 1017, 1019]);
    assert.deepEqual(second.results.map(({ id }) => id), [1021, 1023, 1025, 1027, 1029, 1031, 1033, 1035, 1037, 1039]);
    assert.equal(new URL(first.next).searchParams.get('page'), '2');

    const tagged = `${bulk}&tags=1,3&tags=1&page_size=140`;
    const taggedFirst = await json(tagged);
    const taggedSecond = await json(`${tagged}&page=2`);
    assert.equal(taggedFirst.count, 119);
    assert.equal(taggedFirst.results.length, 100);
    assert.equal(taggedSecond.results.length, 19);
    assert.equal(taggedSecond.next, null);
    const ids = new Set([...taggedFirst.results, ...taggedSecond.results].map(({ id }) => id));
    assert.equal(ids.size, 119);
    assert.equal(ids.has(1119), false);
    assert.equal(ids.has(1200), false);
    const reads = calls.filter(({ url }) => url.pathname.endsWith('/rpc/journal_trades_with_tags'));
    assert.deepEqual(reads.at(-1).body.p_tag_ids, [1, 3]);
  } finally {
    trades.splice(previousLength);
    rowCap = previousCap;
  }
});

test('journal and tag mutations pass only validated input to the owner-scoped RPCs', async () => {
  rpcResult = (caller, resource, input) => {
    assert.equal(caller, owner);
    assert.equal(resource, 'journal_save_trade');
    assert.equal(input.p_trade_id, null);
    assert.deepEqual(input.p_trade, buy);
    assert.deepEqual(input.p_tag_ids, [1]);
    return Response.json({ id: 11, ...buy, tags: [1], user_id: owner, updated_at: '2026-01-01', journal_tradejournaltags: [] });
  };
  const trade = await json('/api/journal/', 201, ownerToken, 'POST', { ...buy, tags: [1], user_id: otherOwner });
  assert.deepEqual(trade, { id: 11, ...buy, tags: [1] });

  const previousCalls = calls.length;
  assert.equal((await json('/api/journal/', 400, ownerToken, 'POST', { ...buy, tags: [1.5] })).category, 'validation');
  assert.equal((await json('/api/journal/', 400, ownerToken, 'POST', {
    ...buy, direction: 'SHORT', sell_price: 100, buy_price: null, target_price: null, stop_loss: null
  })).category, 'validation');
  assert.equal(calls.length, previousCalls);

  rpcResult = (caller, resource, input) => {
    assert.equal(caller, owner);
    assert.equal(resource, 'journal_save_trade');
    assert.deepEqual(input, { p_trade_id: '1', p_trade: { buy_price: 120 }, p_tag_ids: null });
    return Response.json({ code: 'PT400', message: 'Target price must be greater than entry price' }, { status: 400 });
  };
  assert.match((await json('/api/journal/1/', 400, ownerToken, 'PATCH', { buy_price: 120 })).message, /Target price/);

  rpcResult = (caller, resource, input) => {
    assert.equal(caller, owner);
    assert.equal(resource, 'journal_save_tag');
    assert.deepEqual(input, { p_tag_id: '2', p_tag: { name: 'Mine' } });
    return Response.json(null);
  };
  assert.equal((await json('/api/tags/2/', 404, ownerToken, 'PATCH', { name: ' Mine ' })).category, 'not_found');
});

test('general and dedicated status patches validate using the locked RPC and preserve response shapes', async () => {
  rpcResult = (caller, resource, input) => {
    assert.equal(caller, owner);
    assert.equal(resource, 'journal_save_trade');
    assert.deepEqual(input, { p_trade_id: '1', p_trade: { status: buy.status }, p_tag_ids: null });
    return Response.json({ ...trades[0], tags: [1], updated_at: '2026-01-02' });
  };
  const accepted = await json('/api/journal/1/update_status/', 200, ownerToken, 'PATCH', { status: buy.status, tags: [3] });
  assert.equal(accepted.status, buy.status);
  assert.equal(accepted.user_id, owner);
  assert.equal(accepted.updated_at, '2026-01-02');
  assert.deepEqual(accepted.tags.map(({ id }) => id), [1]);
  assert.equal(accepted.unrealized_pnl, null);
  assert.equal('journal_tradejournaltags' in accepted, false);

  rpcResult = (caller, resource, input) => {
    assert.equal(caller, owner);
    assert.equal(resource, 'journal_save_trade');
    assert.deepEqual(input, { p_trade_id: '1', p_trade: { status: 'CLOSED_TARGET' }, p_tag_ids: null });
    return Response.json({ code: 'PT400', message: 'Exit date is required for closed trades' }, { status: 400 });
  };
  for (const path of ['/api/journal/1/', '/api/journal/1/update_status/']) {
    const rejected = await json(path, 400, ownerToken, 'PATCH', { status: 'CLOSED_TARGET' });
    assert.equal(rejected.message, 'Exit date is required for closed trades');
  }
});
