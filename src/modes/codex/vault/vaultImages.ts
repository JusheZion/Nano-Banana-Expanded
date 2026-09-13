/**
 * Turning a vault image into something the canvas can draw.
 *
 * The parsed note carries a real `File` for every embed it could resolve, but
 * Konva needs a URL. Object URLs are the only option that does not copy the
 * bytes: a data URI for a portrait would be megabytes of base64 in every saved
 * document, and localStorage would not survive two of them.
 *
 * That makes the URL session-scoped, which is why an image object stores its
 * *binding* — note path and embed reference — and never the URL. On the next
 * session the vault is read again and the URL is minted again, exactly as a
 * text binding is re-resolved. An unconnected vault leaves the object empty
 * rather than broken.
 */
import type { ObsidianLoreEntry, ObsidianLoreImage } from '@/portals/writer/obsidianLoreImport';

/** `notePath|reference` → the object URL currently standing for it. */
const urls = new Map<string, { url: string; file: File }>();

function key(notePath: string, reference: string): string {
  return `${notePath}|${reference}`;
}

/** Embeds this note resolved to a real file, in the order they appear. */
export function boundableImages(entry: ObsidianLoreEntry): ObsidianLoreImage[] {
  return (entry.images ?? []).filter((image) => image.status === 'resolved' && !!image.file);
}

/** The embed a binding names, or undefined when it is no longer in the note. */
export function findImage(
  entry: ObsidianLoreEntry,
  reference: string,
): ObsidianLoreImage | undefined {
  return boundableImages(entry).find((image) => image.reference === reference);
}

/**
 * A drawable URL for one embed, stable across calls.
 *
 * Re-reading the vault produces fresh `File` objects for the same images, so
 * the cache is keyed by note and reference and the old URL is revoked when the
 * file behind it changes. Without that, every refresh would leak one blob per
 * bound image for the life of the tab.
 */
export function imageUrl(notePath: string, image: ObsidianLoreImage): string | null {
  if (!image.file) return null;
  const id = key(notePath, image.reference);
  const held = urls.get(id);
  if (held) {
    if (held.file === image.file) return held.url;
    URL.revokeObjectURL(held.url);
  }
  const url = URL.createObjectURL(image.file);
  urls.set(id, { url, file: image.file });
  return url;
}

/** Releases every minted URL. For disconnecting a vault. */
export function releaseImageUrls(): void {
  for (const { url } of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Reads intrinsic image dimensions with an abortable lifecycle. Keeping the
 * DOM Image event wiring here prevents late callbacks from outliving the
 * document or component that requested a placement.
 */
export function probeImageDimensions(
  src: string,
  signal?: AbortSignal,
): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      image.src = '';
      reject(new DOMException('Image probe cancelled.', 'AbortError'));
    };

    if (signal?.aborted) {
      abort();
      return;
    }
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      cleanup();
      resolve(dimensions);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Image dimensions could not be read.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    image.src = src;
  });
}

/** How many URLs are held. Tests only. */
export function heldImageUrlCount(): number {
  return urls.size;
}
