export type SessionIdentity = { userId: string; accessToken: string };

type StoredSession = { access_token?: string; user?: { id?: string } };

export function getSessionStorageKey(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
}

export function readStoredSession(storageKey: string): StoredSession | null {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  } catch {
    return null;
  }
}

function sessionId(accessToken: string): string | undefined {
  try {
    const encodedClaims = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(encodedClaims));
    return typeof claims.session_id === 'string' ? claims.session_id : undefined;
  } catch {
    return undefined;
  }
}

export async function forgetRevokedSession(storageKey: string, revoked: SessionIdentity, onCleared: () => void): Promise<boolean> {
  const clear = () => {
    const stored = readStoredSession(storageKey);
    if (stored) {
      if (stored.user?.id !== revoked.userId) return false;
      if (stored.access_token !== revoked.accessToken) {
        const revokedId = sessionId(revoked.accessToken);
        if (!revokedId || !stored.access_token || sessionId(stored.access_token) !== revokedId) return false;
      }
    }

    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}-code-verifier`);
    onCleared();
    return true;
  };

  // Use the Supabase SDK's lock so a refresh or sign-in cannot race the identity check.
  return navigator.locks ? navigator.locks.request(`lock:${storageKey}`, clear) : clear();
}
