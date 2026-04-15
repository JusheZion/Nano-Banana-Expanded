/**
 * HQ download for vault / archive images: resolve signed URL → blob → save or zip.
 */
import { zipSync } from 'fflate';
import {
  createFreshSignedArcsUrl,
  isArcsGenerationsStorageUrl,
} from '@/shared/lib/arcsGenerationsUrls';

const FETCH_TIMEOUT_MS = 90_000;

function fetchWithTimeout(input: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { signal: controller.signal }).finally(() => clearTimeout(tid));
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === 'AbortError' || e.message.includes('aborted'));
}

async function fetchHttpImageBlobOnce(url: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  } catch (e) {
    if (isAbortError(e)) throw new Error('Image download timed out');
    throw e;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch reference image (${res.status})`);
  }
  return res.blob();
}

/**
 * Fetch full image bytes for a vault row URL (handles arcs-generations signing + stale 400 retry).
 */
export async function fetchVaultImageBlob(rawUrl: string): Promise<Blob> {
  if (!rawUrl) throw new Error('Missing image URL');
  if (rawUrl.startsWith('blob:')) {
    return fetchHttpImageBlobOnce(rawUrl);
  }
  if (rawUrl.startsWith('data:')) {
    const res = await fetch(rawUrl);
    return res.blob();
  }
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    throw new Error('Unsupported URL type for download');
  }
  if (!isArcsGenerationsStorageUrl(rawUrl)) {
    return fetchHttpImageBlobOnce(rawUrl);
  }

  const signed1 = await createFreshSignedArcsUrl(rawUrl);
  try {
    return await fetchHttpImageBlobOnce(signed1);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes('(400)')) throw e;
  }
  const signed2 = await createFreshSignedArcsUrl(rawUrl);
  return fetchHttpImageBlobOnce(signed2);
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function sanitizeFilenameBase(name: string, fallback: string): string {
  const t = name.trim() || fallback;
  const cleaned = t.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 120) || fallback;
}

function extensionForBlob(blob: Blob): string {
  const m = blob.type?.toLowerCase() ?? '';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  return 'jpg';
}

/** After fetch — use actual blob type for extension. */
export function buildVaultImageFilenameWithBlob(
  parts: { title: string; id: string; seed: number | null | undefined },
  blob: Blob
): string {
  const base = sanitizeFilenameBase(parts.title, 'image');
  const seedPart = parts.seed != null ? `_seed${parts.seed}` : '';
  const shortId = parts.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(-8);
  const ext = extensionForBlob(blob);
  return `${base}${seedPart}_${shortId || 'vault'}.${ext}`;
}

function uniqueZipEntryName(desired: string, used: Set<string>): string {
  if (!used.has(desired)) {
    used.add(desired);
    return desired;
  }
  const dot = desired.lastIndexOf('.');
  const base = dot >= 0 ? desired.slice(0, dot) : desired;
  const ext = dot >= 0 ? desired.slice(dot) : '';
  let n = 2;
  let candidate = `${base}_${n}${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base}_${n}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export type VaultZipItem = {
  rawUrl: string;
  title: string;
  id: string;
  seed: number | null | undefined;
};

export async function buildVaultImagesZip(items: VaultZipItem[]): Promise<Blob> {
  if (items.length === 0) throw new Error('No images to zip');
  const files: { filename: string; blob: Blob }[] = [];
  for (const it of items) {
    const blob = await fetchVaultImageBlob(it.rawUrl);
    const filename = buildVaultImageFilenameWithBlob(
      { title: it.title, id: it.id, seed: it.seed },
      blob
    );
    files.push({ filename, blob });
  }
  const map: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const f of files) {
    const buf = new Uint8Array(await f.blob.arrayBuffer());
    map[uniqueZipEntryName(f.filename, used)] = buf;
  }
  const zipped = zipSync(map, { level: 6 });
  return new Blob([zipped as BlobPart], { type: 'application/zip' });
}
