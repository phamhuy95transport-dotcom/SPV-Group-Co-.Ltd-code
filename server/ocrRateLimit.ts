interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requests = new Map<string, RateLimitEntry>();

/**
 * A small in-memory guard for local/Vercel instances. It is intentionally not
 * described as authentication; production must also enforce Firebase Auth or a
 * gateway rule before exposing billable AI endpoints.
 */
export const allowOcrRequest = (clientKey: string): { allowed: boolean; retryAfterSeconds?: number } => {
  const now = Date.now();
  const key = clientKey || 'unknown';
  const existing = requests.get(key);

  if (!existing || existing.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }
  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { allowed: true };
};

export const getRequestClientKey = (headers: Record<string, string | string[] | undefined>, fallback?: string): string => {
  const forwarded = headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() || fallback || 'unknown';
};
