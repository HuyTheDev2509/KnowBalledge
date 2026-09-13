// Server data access and offline imports only. Never use NEXT_PUBLIC_ credentials.
export function redisConfigured() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (Boolean(url) !== Boolean(token)) throw new Error('Set both Redis REST URL and token.');
  return Boolean(url && token);
}

/** @param {(string | number)[]} command */
export async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis is not configured.');
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:') throw new Error('Redis REST requires HTTPS.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    redirect: 'error',
  });
  // Provider errors can contain command arguments; keep them out of logs and UI.
  if (!response.ok) throw new Error('Match storage is temporarily unavailable. Please retry.');
  const data = await response.json();
  if (data.error) throw new Error('Match storage could not complete the request. Please retry.');
  return data.result;
}
