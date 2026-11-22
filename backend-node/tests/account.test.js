import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';

const aliceId = '00000000-0000-4000-a000-000000000001';
const bobId = '00000000-0000-4000-a000-000000000002';
const secret = 'test-jwt-signing-secret';
Object.assign(process.env, {
  VERCEL: '1',
  SUPABASE_URL: 'https://account-fixture.invalid',
  SUPABASE_ANON_KEY: 'fixture-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-key',
  SUPABASE_JWT_SECRET: secret,
});

const user = (id, username) => ({
  id,
  email: `${username}@users.tradesmart.local`,
  user_metadata: { username: 'changed_metadata' },
  email_confirmed_at: '2024-01-01',
  created_at: '2024-01-01',
});
const alice = user(aliceId, 'alice');
const bob = user(bobId, 'bob');
const callerToken = jwt.sign({ sub: aliceId, email: 'stale_jwt_email@example.com' }, secret, { expiresIn: '1h' });
const callerAuth = `Bearer ${callerToken}`;
const temporaryToken = 'temporary-access-token';
const temporaryAuth = `Bearer ${temporaryToken}`;
const json = (value, status = 200) => Response.json(value, { status });
const authError = (code, status) => Response.json({ code, msg: code }, {
  status,
  headers: { 'X-Supabase-Api-Version': '2024-01-01' },
});

let fixture;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  assert.equal(url.origin, 'https://account-fixture.invalid');
  const auth = request.headers.get('authorization');
  const body = request.body ? await request.json() : null;
  fixture.calls.push({ method: request.method, path: url.pathname, auth, body, scope: url.searchParams.get('scope') });

  if (url.pathname === '/auth/v1/user') {
    const changingPassword = request.method === 'PUT' && body.password;
    assert.equal(auth, changingPassword ? temporaryAuth : callerAuth);
    assert.equal(request.headers.get('apikey'), 'fixture-anon-key');
    if (changingPassword) {
      if (body.current_password !== fixture.password) return authError('invalid_credentials', 400);
      fixture.password = body.password;
    }
    if (request.method === 'PUT' && body.data) {
      fixture.alice = { ...fixture.alice, user_metadata: { ...fixture.alice.user_metadata, ...body.data } };
    }
    return json(fixture.alice);
  }
  if (url.pathname === '/auth/v1/token') {
    assert.equal(url.searchParams.get('grant_type'), 'password');
    assert.equal(body.email, fixture.alice.email);
    if (body.password !== fixture.password) return authError('invalid_credentials', 400);
    return json({
      access_token: temporaryToken,
      refresh_token: 'temporary-refresh-token',
      expires_in: 3600,
      user: fixture.returnedUser || fixture.alice,
    });
  }
  if (url.pathname === '/auth/v1/logout') {
    if (fixture.revokeFailure) return authError(fixture.revokeFailure, 403);
    return new Response(null, { status: 204 });
  }
  if (url.pathname === `/auth/v1/admin/users/${aliceId}`) {
    if (request.method === 'DELETE' && fixture.deleteFailure) return authError('unexpected_failure', 500);
    if (request.method === 'DELETE') fixture.accountDeleted = true;
    return json(fixture.alice);
  }
  if (url.pathname === '/rest/v1/rpc/account_delete_cascade_ready') {
    assert.equal(request.headers.get('apikey'), 'fixture-service-key');
    return json(fixture.cleanupReady);
  }
  assert.fail(`Unexpected fixture request ${request.method} ${url.pathname}`);
};

const { default: app } = await import('../dist/index.js');

test.after(() => { globalThis.fetch = realFetch; });
test.beforeEach(() => {
  fixture = { alice, password: 'old-password', cleanupReady: true, accountDeleted: false, calls: [] };
});

const request = (path, method = 'GET', data) => app.request(path, {
  method,
  headers: { Authorization: callerAuth, 'Content-Type': 'application/json' },
  body: data === undefined ? undefined : JSON.stringify(data),
});
const changePassword = (password, userId) => request('/api/profile/change-password/', 'POST', {
  user_id: userId,
  current_password: password,
  new_password: 'new-password',
  confirm_password: 'new-password',
});
const deleteAccount = (password, userId) => request('/api/profile/delete-account/', 'DELETE', { password, user_id: userId });

test('incorrect and missing passwords block password changes and account deletion', async () => {
  const passwordResponse = await changePassword('wrong-password');
  assert.equal(passwordResponse.status, 400);
  assert.match((await passwordResponse.json()).message, /incorrect/);
  assert.equal((await deleteAccount('wrong-password')).status, 400);
  assert.equal((await deleteAccount()).status, 400);
  assert.equal((await changePassword()).status, 400);
  assert.deepEqual(fixture.calls.map(({ path }) => path), [
    '/auth/v1/user', '/auth/v1/token', '/auth/v1/user', '/auth/v1/token',
  ]);
  assert.equal(fixture.password, 'old-password');
  assert.equal(fixture.accountDeleted, false);
});

test('fresh proof changes the original user through a new grant and revokes that grant after the write', async () => {
  const result = await changePassword('old-password', aliceId);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).temporary_session_revoked, true);
  assert.equal(fixture.password, 'new-password');
  assert.deepEqual(fixture.calls[2], {
    method: 'PUT', path: '/auth/v1/user', auth: temporaryAuth,
    body: { current_password: 'old-password', password: 'new-password' }, scope: null,
  });
  assert.deepEqual(fixture.calls[3], {
    method: 'POST', path: '/auth/v1/logout', auth: temporaryAuth, body: null, scope: 'local',
  });
  assert.equal((await changePassword('old-password')).status, 400);
  assert.equal(fixture.calls[4].auth, callerAuth);
});

test('a failed temporary revoke reports a cleanup warning after a successful password change', async () => {
  fixture.revokeFailure = 'unexpected_failure';
  const response = await changePassword('old-password');
  assert.equal(response.status, 200);
  const { message, temporary_session_revoked } = await response.json();
  assert.equal(fixture.password, 'new-password');
  assert.equal(temporary_session_revoked, false);
  assert.match(message, /Password changed.*temporary verification session/);
});

test('already-revoked temporary grants count as cleaned up', async () => {
  fixture.revokeFailure = 'session_not_found';
  const response = await changePassword('old-password');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).temporary_session_revoked, true);
});

test('confirmation for a different account blocks all three sensitive operations', async () => {
  assert.equal((await changePassword('old-password', bobId)).status, 409);
  assert.equal((await deleteAccount('old-password', bobId)).status, 409);
  assert.equal((await request('/api/auth/revoke-all/', 'POST', { user_id: bobId })).status, 409);
  assert.deepEqual(fixture.calls, []);
});

test('password proof for another UUID or failed temporary-grant revocation blocks mutations', async () => {
  fixture.returnedUser = bob;
  assert.equal((await changePassword('old-password')).status, 502);
  assert.equal((await deleteAccount('old-password')).status, 502);
  fixture.returnedUser = alice;
  fixture.revokeFailure = 'unexpected_failure';
  assert.equal((await deleteAccount('old-password')).status, 502);
  assert.equal(fixture.calls.some(({ method, path }) => method === 'PUT' || path.includes('/admin/') || path.includes('/rpc/')), false);
});

test('deletion requires the cascade migration, targets the caller, and reports provider failure', async () => {
  fixture.cleanupReady = false;
  assert.equal((await deleteAccount('old-password')).status, 503);
  assert.equal(fixture.accountDeleted, false);
  fixture.cleanupReady = true;
  fixture.deleteFailure = true;
  assert.equal((await deleteAccount('old-password')).status, 500);
  assert.equal(fixture.accountDeleted, false);
  fixture.deleteFailure = false;
  const result = await deleteAccount('old-password');
  assert.equal(result.status, 200);
  assert.equal((await result.json()).user_id, aliceId);
  assert.equal(fixture.accountDeleted, true);
  assert.deepEqual(fixture.calls.at(-1).body, { should_soft_delete: false });
});

test('the canonical username comes from the original login email and identity updates are rejected', async () => {
  const profile = await request('/api/profile/');
  assert.equal((await profile.json()).username, 'alice');
  const introspection = await request('/api/auth/introspect/');
  assert.equal((await introspection.json()).user.username, 'alice');
  const rename = await request('/api/profile/', 'PATCH', { username: 'new_username' });
  assert.equal(rename.status, 400);
  const changeEmail = await request('/api/profile/', 'PATCH', { email: 'new_username@example.com' });
  assert.equal(changeEmail.status, 400);
  assert.equal(fixture.calls.some(({ method }) => method === 'PUT'), false);
  const update = await request('/api/profile/', 'PATCH', { first_name: 'First name' });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).profile.username, 'alice');
  assert.deepEqual(fixture.calls.at(-1).body, { data: { first_name: 'First name' } });
});

test('session revocation reports provider rejection and uses the requested scope', async () => {
  const revoke = await request('/api/auth/revoke-all/', 'POST', { user_id: aliceId });
  assert.equal(revoke.status, 200);
  assert.deepEqual(fixture.calls.map(({ auth, scope }) => [auth, scope]), [[callerAuth, 'global']]);
  fixture.revokeFailure = 'unexpected_failure';
  assert.equal((await request('/api/auth/revoke-all/', 'POST')).status, 502);
  assert.equal((await request('/api/auth/logout/', 'POST')).status, 502);
  assert.equal(fixture.calls.at(-1).scope, 'local');
  const security = await request('/api/auth/security-status/');
  assert.equal(security.status, 200);
  assert.equal((await security.json()).active_sessions, null);
});
