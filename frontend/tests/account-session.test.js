import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient, isAuthRetryableFetchError, isAuthSessionMissingError } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';
import { forgetRevokedSession, getSessionStorageKey, readStoredSession } from '../src/lib/authSession.ts';

const url = 'https://account-fixture.invalid';
const storageKey = getSessionStorageKey(url);
const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};

Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

function session(userId, sessionId = `session-${userId}`, revision = 1) {
  return {
    access_token: `header.${Buffer.from(JSON.stringify({ session_id: sessionId, revision })).toString('base64url')}.signature`,
    refresh_token: `refresh-token-${userId}`,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId },
  };
}

for (const failure of ['session_not_found', 'network']) {
  test(`local cleanup succeeds without a second provider request after ${failure}`, async () => {
    values.clear();
    let networkCalls = 0;
    const client = createClient(url, 'fixture-anon-key', {
      auth: { storage, storageKey, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: async (input) => {
          networkCalls += 1;
          assert.match(input, /\/auth\/v1\/logout\?scope=local$/);
          return failure === 'network'
            ? new Response(null, { status: 503 })
            : Response.json({ error_code: 'session_not_found' }, { status: 403 });
        },
      },
    });
    const original = session('alice');
    storage.setItem(storageKey, JSON.stringify(original));
    storage.setItem(`${storageKey}-code-verifier`, 'fixture-code-verifier');
    storage.setItem('auth_token', original.access_token);
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private-journal'], ['alice-only']);
    let currentSession = (await client.auth.getSession()).data.session;
    assert.equal(currentSession.user.id, 'alice');

    // The locked provider client keeps the local identity on both kinds of error.
    const { error } = await client.auth.signOut({ scope: 'local' });
    assert.equal(failure === 'network' ? isAuthRetryableFetchError(error) : isAuthSessionMissingError(error), true);
    assert.equal(readStoredSession(storageKey).user.id, 'alice');

    assert.equal(await forgetRevokedSession(storageKey, { userId: 'alice', accessToken: original.access_token }, () => {
      currentSession = null;
      storage.removeItem('auth_token');
      queryClient.clear();
    }), true);
    assert.equal((await client.auth.getSession()).data.session, null);
    assert.equal(networkCalls, 1);
    assert.equal(currentSession, null);
    assert.equal(storage.getItem('auth_token'), null);
    assert.equal(storage.getItem(`${storageKey}-code-verifier`), null);
    assert.equal(queryClient.getQueryData(['private-journal']), undefined);
  });
}

test('an account switch while waiting for the SDK lock preserves the new account', async () => {
  values.clear();
  const original = session('alice');
  storage.setItem(storageKey, JSON.stringify(original));
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: async (name, callback) => {
      assert.equal(name, `lock:${storageKey}`);
      storage.setItem(storageKey, JSON.stringify(session('bob')));
      return callback();
    } },
  });
  try {
    assert.equal(await forgetRevokedSession(storageKey, { userId: 'alice', accessToken: original.access_token }, () => {
      assert.fail('Cleared the new account application state');
    }), false);
    assert.equal(readStoredSession(storageKey).user.id, 'bob');
  } finally {
    delete navigator.locks;
  }
});


test('a refreshed token from the revoked session can be cleared', async () => {
  const original = session('alice');
  const refreshed = session('alice', 'session-alice', 2);
  storage.setItem(storageKey, JSON.stringify(refreshed));
  let cleared = false;
  assert.equal(await forgetRevokedSession(storageKey, { userId: 'alice', accessToken: original.access_token }, () => {
    cleared = true;
  }), true);
  assert.equal(cleared, true);
  assert.equal(readStoredSession(storageKey), null);
});

test('a new sign-in for the same owner survives delayed cleanup of the previous session', async () => {
  const original = session('alice');
  const replacement = session('alice', 'replacement-session');
  storage.setItem(storageKey, JSON.stringify(replacement));
  assert.equal(await forgetRevokedSession(storageKey, { userId: 'alice', accessToken: original.access_token }, () => {
    assert.fail('Cleared a replacement session for the same user');
  }), false);
  assert.equal(readStoredSession(storageKey).access_token, replacement.access_token);
});
