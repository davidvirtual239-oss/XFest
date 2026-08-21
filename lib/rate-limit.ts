/**
 * Rate limit minimo en memoria (suficiente para el MVP en una instancia).
 * En produccion multi-region: reemplazar por Upstash Redis o la tabla
 * public.rate_limits de Supabase con un RPC atomico.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}
