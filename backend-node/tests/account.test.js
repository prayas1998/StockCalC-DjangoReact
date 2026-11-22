import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';

const aliceId = '00000000-0000-4000-a000-000000000001';
const bobId = '00000000-0000-4000-a000-000000000002';
const fixtureSigningSecret = 'test-jwt-signing-secret';
Object.assign(process.env, {
  VERCEL: '1',
  SUPABASE_URL: 'https://account-fixture.invalid',
  SUPABASE_ANON_KEY: 'fixture-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-key',
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
const callerToken = jwt.sign({ sub: aliceId, email: 'stale_jwt_email@example.com', aal: 'aal2' }, fixtureSigningSecret, { expiresIn: '1h' });
const callerAuth = `Bearer ${callerToken}`;
const lowerAssuranceToken = jwt.sign({ sub: aliceId, email: 'stale_jwt_email@example.com', aal: 'aal1' }, fixtureSigningSecret, { expiresIn: '1h' });
const lowerAssuranceAuth = `Bearer ${lowerAssuranceToken}`;
const temporaryToken = 'temporary-access-token';
const temporaryAuth = `Bearer ${temporaryToken}`;
const json = (value, status = 200) => Response.json(value, { status });
const authError = (code, status) => Response.json({ code, message: code }, {
  status,
  headers: { 'X-Supabase-Api-Version': '2024-01-01' },
});
const legacyAuthError = (errorCode, status) => Response.json({
  code: status, error_code: errorCode, msg: 'Legacy provider error',
}, { status });

let fixture;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  assert.equal(url.origin, 'https://account-fixture.invalid');
  const auth = request.headers.get('authorization');
  const body = request.body ? await request.json() : null;
  const call = { method: request.method, path: url.pathname, auth, body, scope: url.searchParams.get('scope') };

  if (url.pathname === '/auth/v1/user') {
    if (request.method === 'GET') {
      fixture.verificationCalls.push(call);
      assert.equal(auth, fixture.callerAuth);
      assert.equal(request.headers.get('apikey'), 'fixture-anon-key');
      return json(fixture.alice);
    }
    fixture.calls.push(call);
    const changingPassword = request.method === 'PUT' && body.password;
    assert.equal(auth, fixture.callerAuth);
    assert.equal(request.headers.get('apikey'), 'fixture-anon-key');
    if (changingPassword) {
      assert.equal(request.headers.get('X-Supabase-Api-Version'), '2024-01-01');
      if (fixture.mfaEnabled && auth !== callerAuth) return authError('insufficient_aal', 401);
      if (fixture.requiresFreshSignIn) return legacyAuthError('reauthentication_needed', 400);
      if (fixture.providerChecksCurrentPassword && body.current_password !== fixture.password) return authError('current_password_invalid', 400);
      fixture.password = body.password;
    }
    if (request.method === 'PUT' && body.data) {
      fixture.alice = { ...fixture.alice, user_metadata: { ...fixture.alice.user_metadata, ...body.data } };
    }
    return json(fixture.alice);
  }
  fixture.calls.push(call);
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
    const failure = auth === temporaryAuth ? fixture.temporaryRevokeFailure : fixture.callerRevokeFailure;
    if (failure) return authError(failure, 403);
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
  fixture = {
    alice, callerAuth, password: 'old-password', providerChecksCurrentPassword: true,
    cleanupReady: true, accountDeleted: false, calls: [], verificationCalls: [],
  };
});

const request = (path, method = 'GET', data) => app.request(path, {
  method,
  headers: { Authorization: fixture.callerAuth, 'Content-Type': 'application/json' },
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
  fixture.providerChecksCurrentPassword = false;
  const passwordResponse = await changePassword('wrong-password');
  assert.equal(passwordResponse.status, 400);
  assert.match((await passwordResponse.json()).message, /incorrect/);
  assert.equal((await deleteAccount('wrong-password')).status, 400);
  assert.equal((await deleteAccount()).status, 400);
  assert.equal((await changePassword()).status, 400);
  assert.deepEqual(fixture.calls.map(({ path }) => path), [
    '/auth/v1/token', '/auth/v1/token',
  ]);
  assert.equal(fixture.password, 'old-password');
  assert.equal(fixture.accountDeleted, false);
});

test('an MFA-enrolled account can change its password from the verified AAL2 caller session', async () => {
  fixture.mfaEnabled = true;
  const response = await changePassword('old-password', aliceId);
  assert.equal(response.status, 200);
  assert.equal(fixture.password, 'new-password');
  assert.equal(fixture.calls.find(({ method }) => method === 'PUT').auth, callerAuth);
});

test('a verified password grant never replaces the original caller for the write', async () => {
  const result = await changePassword('old-password', aliceId);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), {
    password_changed: true,
    temporary_session_revoked: true,
    caller_session_revoked: true,
    message: 'Password changed. Sign in with your new password.',
  });
  assert.equal(fixture.password, 'new-password');
  assert.deepEqual(fixture.calls[1], {
    method: 'PUT', path: '/auth/v1/user', auth: callerAuth,
    body: { current_password: 'old-password', password: 'new-password' }, scope: null,
  });
  assert.deepEqual(fixture.calls.slice(2), [
    { method: 'POST', path: '/auth/v1/logout', auth: temporaryAuth, body: null, scope: 'local' },
    { method: 'POST', path: '/auth/v1/logout', auth: callerAuth, body: null, scope: 'local' },
  ]);
  const verifiedCount = fixture.verificationCalls.length;
  assert.equal((await changePassword('old-password')).status, 400);
  assert.equal(fixture.calls[4].path, '/auth/v1/token');
  assert.ok(fixture.verificationCalls.length > verifiedCount);
});

test('password proof does not bypass the provider’s MFA or recent sign-in policy', async () => {
  fixture.mfaEnabled = true;
  fixture.callerAuth = lowerAssuranceAuth;
  const insufficientAssurance = await changePassword('old-password');
  assert.equal(insufficientAssurance.status, 403);
  assert.match((await insufficientAssurance.json()).message, /Complete multi-factor authentication/);

  fixture.callerAuth = callerAuth;
  fixture.requiresFreshSignIn = true;
  const oldSession = await changePassword('old-password');
  assert.equal(oldSession.status, 403);
  assert.match((await oldSession.json()).message, /Sign in again/);
  assert.equal(fixture.password, 'old-password');
  assert.deepEqual(fixture.calls.filter(({ path }) => path === '/auth/v1/logout').map(({ auth }) => auth), [temporaryAuth, temporaryAuth]);
});

test('successful password changes report temporary and caller cleanup failures independently', async () => {
  fixture.temporaryRevokeFailure = 'unexpected_failure';
  const temporaryFailure = await changePassword('old-password');
  assert.equal(temporaryFailure.status, 200);
  assert.deepEqual(await temporaryFailure.json(), {
    password_changed: true,
    temporary_session_revoked: false,
    caller_session_revoked: true,
    message: 'Password changed. Session cleanup could not be confirmed. Sign in with your new password and sign out all sessions.',
  });
  assert.equal(fixture.password, 'new-password');

  fixture.password = 'old-password';
  fixture.temporaryRevokeFailure = undefined;
  fixture.callerRevokeFailure = 'unexpected_failure';
  const callerFailure = await changePassword('old-password');
  assert.equal(callerFailure.status, 200);
  assert.equal(fixture.password, 'new-password');
  const result = await callerFailure.json();
  assert.equal(result.password_changed, true);
  assert.equal(result.temporary_session_revoked, true);
  assert.equal(result.caller_session_revoked, false);
  assert.match(result.message, /Session cleanup could not be confirmed/);
});

test('already-revoked temporary grants count as cleaned up', async () => {
  fixture.temporaryRevokeFailure = 'session_not_found';
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
  fixture.temporaryRevokeFailure = 'unexpected_failure';
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
  fixture.callerRevokeFailure = 'unexpected_failure';
  assert.equal((await request('/api/auth/revoke-all/', 'POST')).status, 502);
  assert.equal((await request('/api/auth/logout/', 'POST')).status, 502);
  assert.equal(fixture.calls.at(-1).scope, 'local');
  const security = await request('/api/auth/security-status/');
  assert.equal(security.status, 200);
  assert.equal((await security.json()).active_sessions, null);
});
