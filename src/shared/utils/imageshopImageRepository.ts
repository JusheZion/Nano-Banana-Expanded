export type ImageshopImageAsset = {
  id: string;
  mimeType: string;
  byteLength: number;
};

export type ImageshopImagePersistence = 'stored' | 'memory-only' | 'missing';

type StoredImageshopImage = ImageshopImageAsset & {
  blob: Blob;
  createdAt: string;
};

const DATABASE_NAME = 'arcs-imageshop-images';
const DATABASE_VERSION = 1;
const IMAGE_STORE = 'images';
const resolvedImageUrls = new Map<string, string>();
const pendingImageUrls = new Map<string, Promise<string | null>>();
const pendingImageReleases = new Set<string>();

function createAssetId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `imageshop_asset_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function openImageshopImageDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error('IndexedDB is unavailable for Imageshop image recovery.'));
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE)) {
        database.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open Imageshop image storage.'));
  });
}

function dataUrlToBlob(imageUrl: string): Blob {
  const match = imageUrl.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) throw new Error('Imageshop generated image is not a valid base64 data URL.');

  const bytes = Uint8Array.from(globalThis.atob(match[2]), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

async function imageUrlToBlob(imageUrl: string): Promise<Blob> {
  if (imageUrl.startsWith('data:')) return dataUrlToBlob(imageUrl);
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Could not read generated image (${response.status}).`);
  return response.blob();
}

export async function saveImageshopImage(
  imageUrl: string,
  assetId = createAssetId(),
): Promise<ImageshopImageAsset> {
  const blob = await imageUrlToBlob(imageUrl);
  const stored: StoredImageshopImage = {
    id: assetId,
    mimeType: blob.type || 'application/octet-stream',
    byteLength: blob.size,
    blob,
    createdAt: new Date().toISOString(),
  };
  const database = await openImageshopImageDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE, 'readwrite');
      transaction.objectStore(IMAGE_STORE).put(stored);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not store Imageshop image.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Imageshop image storage was aborted.'));
    });
  } finally {
    database.close();
  }

  return {
    id: stored.id,
    mimeType: stored.mimeType,
    byteLength: stored.byteLength,
  };
}

async function loadStoredImageshopImageUrl(assetId: string): Promise<string | null> {
  const database = await openImageshopImageDatabase();

  try {
    const stored = await new Promise<StoredImageshopImage | undefined>((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE, 'readonly');
      const request = transaction.objectStore(IMAGE_STORE).get(assetId);
      request.onsuccess = () => resolve(request.result as StoredImageshopImage | undefined);
      request.onerror = () => reject(request.error ?? new Error('Could not restore Imageshop image.'));
    });
    return stored?.blob ? URL.createObjectURL(stored.blob) : null;
  } finally {
    database.close();
  }
}

export async function loadImageshopImageUrl(assetId: string): Promise<string | null> {
  const resolved = resolvedImageUrls.get(assetId);
  if (resolved) return resolved;

  const pending = pendingImageUrls.get(assetId);
  if (pending) return pending;

  const load = loadStoredImageshopImageUrl(assetId)
    .then((imageUrl) => {
      if (imageUrl && pendingImageReleases.delete(assetId)) {
        URL.revokeObjectURL(imageUrl);
        return null;
      }
      if (imageUrl) resolvedImageUrls.set(assetId, imageUrl);
      return imageUrl;
    })
    .finally(() => {
      pendingImageUrls.delete(assetId);
      pendingImageReleases.delete(assetId);
    });
  pendingImageUrls.set(assetId, load);
  return load;
}

export function releaseImageshopImageUrl(assetId: string): void {
  const imageUrl = resolvedImageUrls.get(assetId);
  if (!imageUrl) {
    if (pendingImageUrls.has(assetId)) pendingImageReleases.add(assetId);
    return;
  }
  URL.revokeObjectURL(imageUrl);
  resolvedImageUrls.delete(assetId);
}
