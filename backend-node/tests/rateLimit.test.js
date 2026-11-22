import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';

let Hono;
let config;
let RateLimiter;
let rateLimitMiddleware;
let productionApp;
let introspectionApp;
let authRoutes;
let jwt;
const fixtureSigningSecret = 'rate-limit-fixture-signing-secret';
const verifiedUsers = new Map();
let verificationUnavailable = false;
let verificationUserMissing = false;
let verificationRequestCount = 0;
const originalDateNow = Date.now;
const originalFetch = globalThis.fetch;
const { privateKey: providerFixturePrivateKey, publicKey: providerFixturePublicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1'
});

before(async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_fixture';
  process.env.VERCEL = '1';

  globalThis.fetch = async (input, options) => {
    verificationRequestCount += 1;
    const request = new Request(input, options);
    const url = new URL(request.url);
    assert.equal(url.pathname, '/auth/v1/user');
    assert.equal(request.headers.get('apikey'), 'sb_publishable_fixture');
    if (verificationUnavailable) {
      return Response.json({ code: 'unexpected_failure' }, { status: 503 });
    }
    if (verificationUserMissing) return Response.json({ code: 'user_not_found' }, { status: 404 });
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const userId = verifiedUsers.get(token);
    if (!userId) return Response.json({ code: 'bad_jwt' }, { status: 401 });
    const decoded = jwt.decode(token, { complete: true });
    if (decoded?.header.alg === 'ES256') {
      let claims;
      try {
        claims = jwt.verify(token, providerFixturePublicKey, { algorithms: ['ES256'] });
      } catch {
        return Response.json({ code: 'bad_jwt' }, { status: 401 });
      }
      if (typeof claims === 'string' || claims.sub !== userId) {
        return Response.json({ code: 'bad_jwt' }, { status: 401 });
      }
    }
    return Response.json({ id: userId, email: 'fixture@example.com', user_metadata: {} });
  };

  ({ Hono } = await import('hono'));
  ({ RateLimiter, rateLimitMiddleware } = await import('../dist/middleware/rateLimit.js'));
  ({ default: config } = await import('../dist/config.js'));
  ({ default: jwt } = await import('jsonwebtoken'));
  ({ default: productionApp } = await import('../dist/index.js'));
  ({ authRoutes } = await import('../dist/routes/auth.js'));
  const introspectionRoute = authRoutes.find(({ path }) => path === '/api/auth/introspect/');
  introspectionApp = new Hono();
  introspectionApp.get(introspectionRoute.path, introspectionRoute.handler);
});

after(() => {
  Date.now = originalDateNow;
  globalThis.fetch = originalFetch;
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
  const previousAnonymousLimit = config.rateLimiting.auth.anon;
  config.rateLimiting.auth.anon = '1/min';
  try {
    const signedOut = await productionApp.request('/api/auth/introspect/', {
      headers: { 'x-forwarded-for': '198.51.100.30' }
    });
    assert.equal(signedOut.status, 400);
    assert.equal((await productionApp.request('/api/auth/introspect/', {
      headers: { 'x-forwarded-for': '198.51.100.30' }
    })).status, 429);

    const headers = {
      authorization: 'Bearer invalid-token',
      'x-forwarded-for': '198.51.100.31'
    };
    assert.equal((await productionApp.request('/api/auth/introspect/', { headers })).status, 401);
    const limited = await productionApp.request('/api/auth/introspect/', { headers });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  } finally {
    config.rateLimiting.auth.anon = previousAnonymousLimit;
  }
});

test('pre-auth IP/category budget bounds provider lookups while preserving anonymous failures', async () => {
  const previousPreVerifyLimit = config.rateLimiting.auth.preVerifyIp.auth;
  const previousAnonymousLimit = config.rateLimiting.auth.anon;
  config.rateLimiting.auth.preVerifyIp.auth = '2/min';
  config.rateLimiting.auth.anon = '1/min';
  const forged = jwt.sign({ sub: 'forged-subject', email: 'fixture@example.com' }, 'wrong-signing-secret', {
    algorithm: 'HS256',
    expiresIn: '1h'
  });
  const headers = {
    authorization: `Bearer ${forged}`,
    'x-forwarded-for': '198.51.100.32'
  };
  const requestsBefore = verificationRequestCount;

  try {
    assert.equal((await productionApp.request('/api/auth/introspect/', { headers })).status, 401);
    assert.equal(verificationRequestCount, requestsBefore + 1);
    assert.equal((await productionApp.request('/api/auth/introspect/', { headers })).status, 429);
    assert.equal(verificationRequestCount, requestsBefore + 2);
    assert.equal((await productionApp.request('/api/auth/introspect/', { headers })).status, 429);
    assert.equal(verificationRequestCount, requestsBefore + 2);
  } finally {
    config.rateLimiting.auth.preVerifyIp.auth = previousPreVerifyLimit;
    config.rateLimiting.auth.anon = previousAnonymousLimit;
  }
});

test('production app counts a valid protected request once under its verified user ID', async () => {
  const previousAuthLimit = config.rateLimiting.auth.user;
  const previousPreVerifyLimit = config.rateLimiting.auth.preVerifyIp.auth;
  config.rateLimiting.auth.user = '2/min';
  config.rateLimiting.auth.preVerifyIp.auth = '10/min';
  const token = jwt.sign({ sub: 'verified-user-once', email: 'fixture@example.com' }, fixtureSigningSecret, {
    algorithm: 'HS256',
    expiresIn: '1h'
  });
  verifiedUsers.set(token, 'verified-user-once');

  try {
    const headers = {
      authorization: `Bearer ${token}`,
      'x-forwarded-for': '198.51.100.33'
    };
    const requestsBefore = verificationRequestCount;
    assert.equal((await productionApp.request('/api/auth/unknown/', { headers })).status, 404);
    assert.equal(verificationRequestCount, requestsBefore + 1);

    verificationUserMissing = true;
    try {
      assert.equal((await productionApp.request('/api/auth/unknown/', { headers })).status, 401);
      assert.equal(verificationRequestCount, requestsBefore + 2);
    } finally {
      verificationUserMissing = false;
    }

    const concurrent = await Promise.all(Array.from({ length: 4 }, () =>
      productionApp.request('/api/auth/unknown/', { headers })
    ));
    assert.deepEqual(concurrent.map(({ status }) => status).sort(), [404, 429, 429, 429]);
    assert.equal(verificationRequestCount, requestsBefore + 3);

    const newToken = jwt.sign({
      sub: 'verified-user-once',
      email: 'fixture@example.com',
      nonce: 'new-token-after-quota'
    }, fixtureSigningSecret, { algorithm: 'HS256', expiresIn: '1h' });
    verifiedUsers.set(newToken, 'verified-user-once');
    assert.equal((await productionApp.request('/api/auth/unknown/', {
      headers: { ...headers, authorization: `Bearer ${newToken}` }
    })).status, 429);
    assert.equal(verificationRequestCount, requestsBefore + 4);

    const otherUserToken = jwt.sign({
      sub: 'other-user-shared-ip',
      email: 'other@example.com'
    }, fixtureSigningSecret, { algorithm: 'HS256', expiresIn: '1h' });
    verifiedUsers.set(otherUserToken, 'other-user-shared-ip');
    assert.equal((await productionApp.request('/api/auth/unknown/', {
      headers: { ...headers, authorization: `Bearer ${otherUserToken}` }
    })).status, 404);
    assert.equal(verificationRequestCount, requestsBefore + 5);
  } finally {
    config.rateLimiting.auth.user = previousAuthLimit;
    config.rateLimiting.auth.preVerifyIp.auth = previousPreVerifyLimit;
  }
});

test('verifies project tokens before protected routes and preserves introspection claims', async () => {
  const userId = 'verified-user-once';
  const token = jwt.sign({ sub: userId, email: 'fixture@example.com' }, fixtureSigningSecret, { expiresIn: '1h' });
  verifiedUsers.set(token, userId);

  const protectedResponse = await productionApp.request('/api/auth/unknown/', {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(protectedResponse.status, 404);
  assert.doesNotMatch(await protectedResponse.text(), /sb_secret_fixture/);

  const introspection = await introspectionApp.request('/api/auth/introspect/', {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(introspection.status, 200);
  const body = await introspection.json();
  assert.equal(body.valid, true);
  assert.equal(body.user.id, userId);
  assert.equal(body.token_info.issuer, 'supabase');
  assert.ok(Number.isFinite(Date.parse(body.token_info.issued_at)));
  assert.ok(Number.isFinite(Date.parse(body.token_info.expires_at)));
});

test('accepts project-signed ES256 tokens and rejects unknown signatures and mismatched subjects', async () => {
  const userId = 'asymmetric-fixture-user';
  const signed = (sub, key = providerFixturePrivateKey) => jwt.sign({ sub }, key, {
    algorithm: 'ES256',
    expiresIn: '1h'
  });
  const accepted = signed(userId);
  verifiedUsers.set(accepted, userId);
  const response = await productionApp.request('/api/auth/introspect/', {
    headers: { authorization: `Bearer ${accepted}` }
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.id, userId);

  const { privateKey: otherPrivateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const unknownSignature = signed(userId, otherPrivateKey);
  verifiedUsers.set(unknownSignature, userId);
  assert.equal((await productionApp.request('/api/auth/introspect/', {
    headers: { authorization: `Bearer ${unknownSignature}` }
  })).status, 401);

  const mismatchedSubject = signed('claimed-subject');
  verifiedUsers.set(mismatchedSubject, userId);
  assert.equal((await productionApp.request('/api/auth/introspect/', {
    headers: { authorization: `Bearer ${mismatchedSubject}` }
  })).status, 401);
});

test('rejects malformed and expired tokens before contacting project auth', async () => {
  const requestsBefore = verificationRequestCount;
  const malformed = await productionApp.request('/api/auth/unknown/', {
    headers: { authorization: 'Bearer invalid-token' }
  });
  assert.equal(malformed.status, 401);
  assert.equal(verificationRequestCount, requestsBefore);

  const expired = jwt.sign({ sub: 'expired-user' }, fixtureSigningSecret, { expiresIn: -1 });
  const response = await productionApp.request('/api/auth/unknown/', {
    headers: { authorization: `Bearer ${expired}` }
  });
  assert.equal(response.status, 401);
  assert.equal(verificationRequestCount, requestsBefore);

  const malformedPayload = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from('not-json').toString('base64url')}.AA`;
  const decodeFailure = await productionApp.request('/api/auth/unknown/', {
    headers: { authorization: `Bearer ${malformedPayload}` }
  });
  assert.equal(decodeFailure.status, 401);
  assert.equal(verificationRequestCount, requestsBefore);
});

test('rejects decoded claims when the project auth endpoint rejects the token', async () => {
  const forged = jwt.sign({ sub: 'verified-user-once', email: 'fixture@example.com' }, 'other-fixture-secret');
  const response = await introspectionApp.request('/api/auth/introspect/', {
    headers: { authorization: `Bearer ${forged}` }
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { valid: false, error: 'Invalid token' });
});

test('fails closed without exposing keys when project verification is unavailable', async () => {
  verificationUnavailable = true;
  try {
    const token = jwt.sign({ sub: 'temporarily-unverifiable' }, fixtureSigningSecret, { expiresIn: '1h' });
    const headers = { authorization: `Bearer ${token}` };
    const protectedResponse = await productionApp.request('/api/auth/unknown/', { headers });
    assert.equal(protectedResponse.status, 503);
    assert.doesNotMatch(await protectedResponse.text(), /sb_(?:secret|publishable)_fixture/);

    const introspection = await introspectionApp.request('/api/auth/introspect/', { headers });
    assert.equal(introspection.status, 503);
    assert.deepEqual(await introspection.json(), {
      valid: false,
      error: 'Authentication service unavailable'
    });
  } finally {
    verificationUnavailable = false;
  }
});

test('preserves production introspection responses for deleted users and provider outages', async () => {
  const requestsBefore = verificationRequestCount;
  const token = jwt.sign({ sub: 'deleted-user' }, fixtureSigningSecret, { expiresIn: '1h' });
  verificationUserMissing = true;
  try {
    const missing = await productionApp.request('/api/auth/introspect/', {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { valid: false, error: 'User not found' });
    const requestsAfterMissingUser = verificationRequestCount;
    assert.equal(requestsAfterMissingUser, requestsBefore + 1);
    verificationUserMissing = false;
    verificationUnavailable = true;
    const unavailable = await productionApp.request('/api/auth/introspect/', {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { valid: false, error: 'Authentication service unavailable' });
    assert.equal(verificationRequestCount, requestsAfterMissingUser + 1);
  } finally {
    verificationUserMissing = false;
    verificationUnavailable = false;
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
