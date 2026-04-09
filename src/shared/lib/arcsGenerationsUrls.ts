/**
 * Private bucket `arcs-generations`: resolve stored public-style URLs to short-lived signed URLs.
 * DB rows keep the stable object/public URL shape; display uses signing.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const ARCS_GENERATIONS_BUCKET = 'arcs-generations';

const SIGNED_TTL_SEC = 3600;
const CACHE_BUFFER_MS = 120_000;

type CacheEntry = { url: string; expiresAt: number };
const urlCache = new Map<string, CacheEntry>();

/** Extract object path within `arcs-generations` from a Supabase Storage URL, or null. */
export function extractArcsGenerationsObjectPath(imageUrl: string): string | null {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();
  const m = trimmed.match(/\/storage\/v1\/object\/(?:public|sign)\/arcs-generations\/([^?#]+)/i);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function isArcsGenerationsStorageUrl(url: string): boolean {
  return extractArcsGenerationsObjectPath(url) != null;
}

function isFreshSignedArcsUrl(url: string): boolean {
  return /\/object\/sign\/arcs-generations\//.test(url) && url.includes('token=');
}

/**
 * Returns a URL suitable for <img src> — signed when the input targets our private bucket.
 */
export async function resolveArcsGenerationsDisplayUrl(
  client: SupabaseClient,
  imageUrl: string
): Promise<string> {
  if (!imageUrl) return imageUrl;
  if (isFreshSignedArcsUrl(imageUrl)) return imageUrl;

  const path = extractArcsGenerationsObjectPath(imageUrl);
  if (!path) return imageUrl;

  const now = Date.now();
  const hit = urlCache.get(imageUrl);
  if (hit && hit.expiresAt > now) return hit.url;

  const { data, error } = await client.storage
    .from(ARCS_GENERATIONS_BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SEC);

  if (error || !data?.signedUrl) return imageUrl;

  urlCache.set(imageUrl, {
    url: data.signedUrl,
    expiresAt: now + SIGNED_TTL_SEC * 1000 - CACHE_BUFFER_MS,
  });
  return data.signedUrl;
}

export async function resolveArcsGenerationsDisplayUrls(
  client: SupabaseClient,
  imageUrls: readonly string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(imageUrls.filter(Boolean))];
  const out = new Map<string, string>();
  await Promise.all(
    unique.map(async (u) => {
      const resolved = await resolveArcsGenerationsDisplayUrl(client, u);
      out.set(u, resolved);
    })
  );
  return out;
}

/** Test-only: clear in-memory signed URL cache. */
export function __clearArcsGenerationsUrlCacheForTests(): void {
  urlCache.clear();
}
