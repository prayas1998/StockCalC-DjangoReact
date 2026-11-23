import { Context, Next } from 'hono';
import { createHash } from 'node:crypto';
import config from '../config.js';

interface RequestNode {
  timestamp: number;
  next?: RequestNode;
}

interface Counter {
  head?: RequestNode;
  tail?: RequestNode;
  count: number;
  windowMs: number;
}

interface Expiry {
  key: string;
  expiresAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

// This is a per-process ceiling. It does not coordinate Vercel instances.
export class RateLimiter {
  private counters = new Map<string, Counter>();
  private expiries: Expiry[] = [];
  private expiryIndex = new Map<string, number>();
  private pending = new Map<string, number>();

  constructor(private readonly maxKeys = 10_000) {}

  isAllowed(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    this.removeExpiredCounters(now);

    let counter = this.counters.get(key);
    if (counter) {
      this.removeExpiredRequests(counter, now);
      if (counter.count === 0) {
        this.counters.delete(key);
        this.removeExpiryAt(this.expiryIndex.get(key)!);
        counter = undefined;
      }
    }

    if (!counter) {
      if (this.counters.size >= this.maxKeys) {
        return { allowed: false, retryAfterMs: this.nextExpiryDelay(now) };
      }
      counter = { count: 0, windowMs };
      this.counters.set(key, counter);
    }

    if (counter.count >= limit) {
      return { allowed: false, retryAfterMs: this.nextExpiryDelayFor(key, now) };
    }

    const node = { timestamp: now };
    if (counter.tail) {
      counter.tail.next = node;
    } else {
      counter.head = node;
    }
    counter.tail = node;
    counter.count += 1;
    this.updateExpiry(key, counter.tail.timestamp + counter.windowMs);
    return { allowed: true };
  }

  canConsume(key: string, limit: number): RateLimitResult {
    const now = Date.now();
    this.removeExpiredCounters(now);
    const counter = this.counters.get(key);
    if (!counter) return { allowed: true };

    this.removeExpiredRequests(counter, now);
    if (counter.count === 0) {
      this.counters.delete(key);
      this.removeExpiryAt(this.expiryIndex.get(key)!);
      return { allowed: true };
    }

    if (counter.count >= limit) {
      return { allowed: false, retryAfterMs: this.nextExpiryDelayFor(key, now) };
    }
    return { allowed: true };
  }

  reservePending(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const current = this.canConsume(key, limit);
    if (!current.allowed) return current;

    const committed = this.counters.get(key)?.count ?? 0;
    const pending = this.pending.get(key) ?? 0;
    if (committed + pending >= limit) {
      return { allowed: false, retryAfterMs: this.nextExpiryDelayFor(key, now) || windowMs };
    }
    if (!this.pending.has(key) && this.pending.size >= this.maxKeys) {
      return { allowed: false, retryAfterMs: this.nextExpiryDelay(now) || windowMs };
    }

    this.pending.set(key, pending + 1);
    return { allowed: true };
  }

  releasePending(key: string): void {
    const pending = this.pending.get(key);
    if (pending === undefined) return;
    if (pending <= 1) {
      this.pending.delete(key);
    } else {
      this.pending.set(key, pending - 1);
    }
  }

  private removeExpiredCounters(now: number): void {
    while (this.expiries[0]?.expiresAt <= now) {
      const { key } = this.removeExpiryAt(0);
      this.counters.delete(key);
    }
  }

  private removeExpiredRequests(counter: Counter, now: number): void {
    while (counter.head && counter.head.timestamp + counter.windowMs <= now) {
      counter.head = counter.head.next;
      counter.count -= 1;
    }
  }

  private nextExpiryDelayFor(key: string, now: number): number {
    const counter = this.counters.get(key);
    const expiresAt = counter?.head ? counter.head.timestamp + counter.windowMs : undefined;
    return expiresAt === undefined ? 0 : Math.max(0, expiresAt - now);
  }

  private nextExpiryDelay(now: number): number {
    const expiresAt = this.expiries[0]?.expiresAt;
    return expiresAt === undefined ? 0 : Math.max(0, expiresAt - now);
  }

  private updateExpiry(key: string, expiresAt: number): void {
    const index = this.expiryIndex.get(key);
    if (index === undefined) {
      this.expiries.push({ key, expiresAt });
      const insertedIndex = this.expiries.length - 1;
      this.expiryIndex.set(key, insertedIndex);
      this.siftUp(insertedIndex);
      return;
    }

    const previousExpiry = this.expiries[index].expiresAt;
    this.expiries[index].expiresAt = expiresAt;
    if (expiresAt < previousExpiry) {
      this.siftUp(index);
    } else {
      this.siftDown(index);
    }
  }

  private removeExpiryAt(index: number): Expiry {
    const removed = this.expiries[index];
    const last = this.expiries.pop()!;
    this.expiryIndex.delete(removed.key);

    if (index < this.expiries.length) {
      this.expiries[index] = last;
      this.expiryIndex.set(last.key, index);
      this.siftDown(index);
      this.siftUp(this.expiryIndex.get(last.key)!);
    }

    return removed;
  }

  private siftUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.expiries[parent].expiresAt <= this.expiries[index].expiresAt) break;
      this.swap(parent, index);
      index = parent;
    }
  }

  private siftDown(index: number): void {
    for (;;) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.expiries.length && this.expiries[left].expiresAt < this.expiries[smallest].expiresAt) {
        smallest = left;
      }
      if (right < this.expiries.length && this.expiries[right].expiresAt < this.expiries[smallest].expiresAt) {
        smallest = right;
      }
      if (smallest === index) break;
      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(left: number, right: number): void {
    [this.expiries[left], this.expiries[right]] = [this.expiries[right], this.expiries[left]];
    this.expiryIndex.set(this.expiries[left].key, left);
    this.expiryIndex.set(this.expiries[right].key, right);
  }
}

const rateLimiter = new RateLimiter();
const verifiedTokens = new Map<string, { userId: string; expiresAt: number }>();
const verifiedTokenCacheLimit = 10_000;

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function rememberVerifiedToken(token: string, userId: string, expiresAt: number): void {
  const hash = tokenHash(token);
  if (!verifiedTokens.has(hash) && verifiedTokens.size >= verifiedTokenCacheLimit) {
    const oldestHash = verifiedTokens.keys().next().value;
    if (oldestHash) verifiedTokens.delete(oldestHash);
  }
  verifiedTokens.set(hash, { userId, expiresAt });
}

function getKnownVerifiedUserId(token: string): string | undefined {
  const hash = tokenHash(token);
  const entry = verifiedTokens.get(hash);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    verifiedTokens.delete(hash);
    return undefined;
  }

  // Refresh insertion order so old token mappings are evicted first at capacity.
  verifiedTokens.delete(hash);
  verifiedTokens.set(hash, entry);
  return entry.userId;
}

function getClientIp(c: Context): string {
  // Vercel's edge must overwrite/sanitize forwarded headers; see RATE_LIMITING.md.
  if (process.env.VERCEL === '1') {
    return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown';
  }

  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming;
  return incoming?.socket?.remoteAddress || 'unknown';
}

function getCategory(pathSegments: string[]): 'auth' | 'data' | 'general' {
  if (pathSegments.includes('auth')) return 'auth';
  if (['calculate', 'journal', 'profile', 'tags'].some((segment) => pathSegments.includes(segment))) return 'data';
  return 'general';
}

function getConfiguredLimit(category: 'auth' | 'data' | 'general', authenticated: boolean): string {
  if (category === 'auth') return authenticated ? config.rateLimiting.auth.user : config.rateLimiting.auth.anon;
  if (category === 'data') return authenticated ? config.rateLimiting.dataOperations.user : config.rateLimiting.dataOperations.anon;
  return authenticated ? config.rateLimiting.general.user : config.rateLimiting.general.anon;
}

const unitToMs: Record<string, number> = {
  sec: 1000,
  min: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000
};

function parseLimit(rateLimit: string): { limit: number; windowMs: number } {
  const [limitValue, windowUnit] = rateLimit.split('/');
  return {
    limit: Number.parseInt(limitValue, 10),
    windowMs: unitToMs[windowUnit] || 60 * 1000
  };
}

function rejectRateLimited(c: Context, result: RateLimitResult, limit: number, windowMs: number) {
  const retryAfter = Math.max(1, Math.ceil((result.retryAfterMs ?? windowMs) / 1000));
  c.header('Retry-After', String(retryAfter));
  return c.json({
    error: true,
    error_id: `rl_${Date.now()}`,
    category: 'rate_limit',
    message: `Too many requests. Rate limit: ${limit}`,
    retry_after: retryAfter,
    throttle_type: 'RateLimitMiddleware',
    endpoint_type: 'api',
    timestamp: Date.now()
  }, 429);
}

export const preAuthRateLimitMiddleware = async (c: Context, next: Next) => {
  if (c.req.path === '/api/health-check/') {
    await next();
    return;
  }

  const authorization = c.req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    await next();
    return;
  }

  const pathSegments = c.req.path.split('/').filter(Boolean);
  const category = getCategory(pathSegments);
  const token = authorization.substring(7);
  let reservationKey: string | undefined;
  const knownUserId = getKnownVerifiedUserId(token);
  if (knownUserId) {
    const userLimit = parseLimit(getConfiguredLimit(category, true));
    const knownUserKey = `rate_limit_${category}_user_${knownUserId}`;
    const userBudget = rateLimiter.reservePending(knownUserKey, userLimit.limit, userLimit.windowMs);
    if (!userBudget.allowed) {
      return rejectRateLimited(c, userBudget, userLimit.limit, userLimit.windowMs);
    }
    reservationKey = knownUserKey;
  }

  const ip = getClientIp(c);
  const categoryLimit = parseLimit(config.rateLimiting.auth.preVerifyIp[category]);
  const categoryKey = `rate_limit_preverify_${category}_${ip}`;
  const categoryBudget = rateLimiter.isAllowed(categoryKey, categoryLimit.limit, categoryLimit.windowMs);
  if (!categoryBudget.allowed) {
    if (reservationKey) rateLimiter.releasePending(reservationKey);
    return rejectRateLimited(c, categoryBudget, categoryLimit.limit, categoryLimit.windowMs);
  }

  if (reservationKey) c.set('preAuthUserReservationKey', reservationKey);

  await next();
};

export const rateLimitMiddleware = async (c: Context, next: Next) => {
  const pathSegments = c.req.path.split('/').filter(Boolean);
  const userId = c.get('userId');
  const isAuthenticated = !!userId;
  const category = getCategory(pathSegments);
  const rateLimit = getConfiguredLimit(category, isAuthenticated);

  const identity = isAuthenticated ? `user_${userId}` : `anon_${getClientIp(c)}`;
  const key = `rate_limit_${category}_${identity}`;
  const { limit, windowMs } = parseLimit(rateLimit);
  const result = rateLimiter.isAllowed(key, limit, windowMs);
  releasePreAuthUserReservation(c);

  if (!result.allowed) {
    return rejectRateLimited(c, result, limit, windowMs);
  }

  await next();
};

export function releasePreAuthUserReservation(c: Context): void {
  const key = c.get('preAuthUserReservationKey');
  if (typeof key !== 'string') return;
  rateLimiter.releasePending(key);
  c.set('preAuthUserReservationKey', undefined);
}
