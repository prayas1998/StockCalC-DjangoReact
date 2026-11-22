import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

let Hono;
let config;
let RateLimiter;
let rateLimitMiddleware;
let productionApp;
let jwt;
const originalDateNow = Date.now;

before(async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret';
  process.env.VERCEL = '1';

  ({ Hono } = await import('hono'));
  ({ RateLimiter, rateLimitMiddleware } = await import('../dist/middleware/rateLimit.js'));
  ({ default: config } = await import('../dist/config.js'));
  ({ default: jwt } = await import('jsonwebtoken'));
  ({ default: productionApp } = await import('../dist/index.js'));
});

after(() => {
  Date.now = originalDateNow;
});

function createFixture({ authenticated = false, userId = 'fixture-user' } = {}) {
  const app = new Hono();
  if (authenticated) {
    app.use('*', async (c, next) => {
      c.set('userId', userId);
      await next();
    });
  }
  app.use('*', rateLimitMiddleware);
  app.all('/api/*', (c) => c.text('ok'));
  return app;
}

test('enforces the configured anonymous auth limit and expires it at the window boundary', async () => {
  let now = 1_000_000;
  Date.now = () => now;
  const app = createFixture();
  const request = () => app.request('/api/auth/login/', {
    headers: { 'x-forwarded-for': '198.51.100.10' }
  });

  for (let i = 0; i < 10; i += 1) {
    assert.equal((await request()).status, 200);
  }
  assert.equal((await request()).status, 429);

  now += 59_500;
  const retryResponse = await request();
  assert.equal(retryResponse.status, 429);
  assert.equal(retryResponse.headers.get('retry-after'), '1');
  assert.equal((await retryResponse.json()).retry_after, 1);

  now += 500;
  assert.equal((await request()).status, 200);
});

test('classifies tags routes as data operations', async () => {
  const previousDataLimit = config.rateLimiting.dataOperations.anon;
  config.rateLimiting.dataOperations.anon = '1/min';

  try {
    const app = createFixture();
    const request = () => app.request('/api/tags/popular/', {
      headers: { 'x-forwarded-for': '198.51.100.20' }
    });
    assert.equal((await request()).status, 200);
    assert.equal((await request()).status, 429);
  } finally {
    config.rateLimiting.dataOperations.anon = previousDataLimit;
  }
});

test('production app counts signed-out and invalid introspection requests by anonymous IP', async () => {
  const signedOut = await productionApp.request('/api/auth/introspect/', {
    headers: { 'x-forwarded-for': '198.51.100.30' }
  });
  assert.equal(signedOut.status, 400);

  const headers = {
    authorization: 'Bearer invalid-token',
    'x-forwarded-for': '198.51.100.31'
  };
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await productionApp.request('/api/auth/introspect/', { headers })).status, 401);
  }
  const limited = await productionApp.request('/api/auth/introspect/', { headers });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
});

test('production app counts a valid protected request once under its verified user ID', async () => {
  const previousAuthLimit = config.rateLimiting.auth.user;
  config.rateLimiting.auth.user = '1/min';
  const token = jwt.sign({ sub: 'verified-user-once', email: 'fixture@example.com' }, 'test-jwt-secret', {
    algorithm: 'HS256',
    expiresIn: '1h'
  });

  try {
    const headers = { authorization: `Bearer ${token}` };
    assert.equal((await productionApp.request('/api/auth/unknown/', { headers })).status, 404);
    assert.equal((await productionApp.request('/api/auth/unknown/', { headers })).status, 429);
  } finally {
    config.rateLimiting.auth.user = previousAuthLimit;
  }
});

test('uses Node socket peer instead of caller-supplied forwarded headers', async () => {
  const previousVercel = process.env.VERCEL;
  const previousAuthLimit = config.rateLimiting.auth.anon;
  delete process.env.VERCEL;
  config.rateLimiting.auth.anon = '1/min';

  try {
    const app = createFixture();
    const socket = { incoming: { socket: { remoteAddress: '192.0.2.40' } } };
    assert.equal((await app.request('/api/auth/login/', {
      headers: { 'x-forwarded-for': '198.51.100.40' }
    }, socket)).status, 200);
    assert.equal((await app.request('/api/auth/login/', {
      headers: { 'x-forwarded-for': '198.51.100.41' }
    }, socket)).status, 429);
    assert.equal((await app.request('/api/auth/login/', {
      headers: { 'x-forwarded-for': '198.51.100.40' }
    }, { incoming: { socket: { remoteAddress: '192.0.2.41' } } })).status, 200);
  } finally {
    if (previousVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = previousVercel;
    }
    config.rateLimiting.auth.anon = previousAuthLimit;
  }
});

test('reports the actual remaining expiry for a full key or full key capacity', () => {
  let now = 3_000_000;
  Date.now = () => now;
  const limiter = new RateLimiter(1);

  assert.deepEqual(limiter.isAllowed('first', 1, 1_000), { allowed: true });
  now += 500;
  assert.deepEqual(limiter.isAllowed('first', 1, 1_000), { allowed: false, retryAfterMs: 500 });
  assert.deepEqual(limiter.isAllowed('second', 1, 1_000), { allowed: false, retryAfterMs: 500 });
  now += 500;
  assert.deepEqual(limiter.isAllowed('second', 1, 1_000), { allowed: true });
});

test('keeps authenticated category budgets independent', async () => {
  const previousAuthLimit = config.rateLimiting.auth.user;
  const previousDataLimit = config.rateLimiting.dataOperations.user;
  config.rateLimiting.auth.user = '3/min';
  config.rateLimiting.dataOperations.user = '2/min';

  try {
    const app = createFixture({ authenticated: true, userId: 'category-fixture-user' });
    for (let i = 0; i < 2; i += 1) {
      assert.equal((await app.request('/api/journal/')).status, 200);
    }
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await app.request('/api/auth/login/')).status, 200);
    }
    assert.equal((await app.request('/api/auth/login/')).status, 429);
  } finally {
    config.rateLimiting.auth.user = previousAuthLimit;
    config.rateLimiting.dataOperations.user = previousDataLimit;
  }
});

test('reclaims expired keys at capacity without scanning live counters', () => {
  let now = 4_000_000;
  Date.now = () => now;
  const limiter = new RateLimiter(2);

  assert.deepEqual(limiter.isAllowed('first', 1, 1_000), { allowed: true });
  assert.deepEqual(limiter.isAllowed('second', 1, 1_000), { allowed: true });
  assert.deepEqual(limiter.isAllowed('third', 1, 1_000), { allowed: false, retryAfterMs: 1_000 });

  now += 1_000;
  assert.deepEqual(limiter.isAllowed('third', 1, 1_000), { allowed: true });
  assert.deepEqual(limiter.isAllowed('third', 1, 1_000), { allowed: false, retryAfterMs: 1_000 });
});

test('tracks the earliest remaining expiry when a counter has multiple requests', () => {
  let now = 5_000_000;
  Date.now = () => now;
  const limiter = new RateLimiter(2);

  assert.deepEqual(limiter.isAllowed('first', 2, 1_000), { allowed: true });
  now += 200;
  assert.deepEqual(limiter.isAllowed('second', 2, 1_000), { allowed: true });
  now += 100;
  assert.deepEqual(limiter.isAllowed('first', 2, 1_000), { allowed: true });
  now += 200;
  assert.deepEqual(limiter.isAllowed('first', 2, 1_000), { allowed: false, retryAfterMs: 500 });
  assert.deepEqual(limiter.isAllowed('third', 1, 1_000), { allowed: false, retryAfterMs: 700 });

  now += 699;
  assert.deepEqual(limiter.isAllowed('third', 1, 1_000), { allowed: false, retryAfterMs: 1 });
  now += 1;
  assert.deepEqual(limiter.isAllowed('third', 1, 1_000), { allowed: true });
});
