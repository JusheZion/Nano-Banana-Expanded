/**
 * Universal API bridge for Gemini Image (Nano Banana 2 / Pro).
 * Handles reference_images (max 14), seed, aspect ratio, 429 backoff, and safety blocks.
 * Character: slots 0–3 identity, 4–9 style, 10–13 composition.
 * Asset: 0–3 site/exterior, 4–6 interior/spatial, 7–10 materials/finishes, 11–13 light/atmosphere.
 */

import type { AssetReferenceSlotRole, ReferenceSlotRole } from '@/shared/constants/referenceSlots';
import { getSlotRole } from '@/shared/constants/referenceSlots';
import {
  createFreshSignedArcsUrl,
  isArcsGenerationsStorageUrl,
} from '@/shared/lib/arcsGenerationsUrls';

const CHARACTER_ROLE_LABELS: Record<ReferenceSlotRole, string> = {
  identity:
    '[Character DNA – face, skin, body type, hair, tattoos, likeness. Use this person as the subject.]',
  style:
    '[Wardrobe DNA – reproduce the complete visible outfit from these images: every garment, color, pattern, and accessory. Put this exact clothing on the character from Character DNA. Do not invent a different outfit or fantasy costume unless the text prompt explicitly demands it.]',
  composition:
    '[Atmospheric DNA – lighting, mood, and environment only; do not replace the outfit from Wardrobe DNA.]',
};

const ASSET_ROLE_LABELS: Record<AssetReferenceSlotRole, string> = {
  siteExterior:
    '[Site & exterior – building shell, façade, landscape, street context, scale. Anchor geography and massing.]',
  interiorSpatial:
    '[Interior & spatial – room volumes, layout, circulation, sightlines. When site/exterior references are also present, interiors must plausibly belong inside that shell and match its design line.]',
  materialsFinishes:
    '[Materials & finishes – surfaces, fixtures, furniture/prop massing, palette. Keep decor and materials coherent across references.]',
  lightAtmosphere:
    '[Light & atmosphere – time of day, weather, mood, atmospheric effects. No figures unless the text prompt requests them.]',
};

const MODELS = {
  flash: 'gemini-3.1-flash-image-preview',
  pro: 'gemini-3-pro-image-preview',
} as const;

export type OnyxModelId = keyof typeof MODELS;

export function getGeminiModelId(onyxModelId: OnyxModelId): string {
  return MODELS[onyxModelId];
}

const BASE_DELAY_MS = 1000;
const MAX_RETRIES = 4;
const JITTER_MS = 500;

/** Reference image download (http/blob); avoid hanging the UI forever. */
const REFERENCE_FETCH_TIMEOUT_MS = 90_000;
/** Gemini generateContent; large payloads can be slow but must not spin forever. */
const GEMINI_FETCH_TIMEOUT_MS = 180_000;
/** After headers arrive, `res.json()` can still hang on a slow/stalled body. */
const GEMINI_READ_BODY_TIMEOUT_MS = 120_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === 'AbortError' || e.message.includes('aborted'));
}

async function readResponseJsonWithTimeout(res: Response, timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tid = setTimeout(
      () => reject(new Error('Reading image API response timed out')),
      timeoutMs
    );
    res
      .json()
      .then((data) => {
        clearTimeout(tid);
        resolve(data);
      })
      .catch((e) => {
        clearTimeout(tid);
        reject(e);
      });
  });
}

function backoffDelay(attempt: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * JITTER_MS;
  return Math.min(exponential + jitter, 30_000);
}

/** Raw base64 payload for Gemini inlineData (no data: prefix). */
export function readBlobAsImageBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (!base64) reject(new Error('Failed to read image as base64'));
      else resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Convert data URL, blob URL, or http(s) URL to base64 string (no data URL prefix). */
export async function urlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    if (!base64) throw new Error('Invalid data URL');
    return base64;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    let res: Response;
    try {
      res = await fetchWithTimeout(url, undefined, REFERENCE_FETCH_TIMEOUT_MS);
    } catch (e) {
      if (isAbortError(e)) {
        throw new Error('Reference image download timed out');
      }
      throw e;
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch reference image (${res.status})`);
    }
    const blob = await res.blob();
    const b64 = await readBlobAsImageBase64(blob);
    return b64;
  }
  if (url.startsWith('blob:')) {
    try {
      const res = await fetchWithTimeout(url, undefined, REFERENCE_FETCH_TIMEOUT_MS);
      const blob = await res.blob();
      return readBlobAsImageBase64(blob);
    } catch (e) {
      if (isAbortError(e)) {
        throw new Error('Reference image (blob) load timed out');
      }
      throw e;
    }
  }
  throw new Error('Unsupported URL type; use data: or blob:');
}

/** Base64 + MIME for vision / multimodal APIs (data URL, blob URL, or http(s)). */
export async function urlToBase64WithMime(url: string): Promise<{ base64: string; mimeType: string }> {
  if (url.startsWith('data:')) {
    const mimeMatch = /^data:([^;]+);base64,/.exec(url);
    const mimeType = mimeMatch?.[1]?.trim() || 'image/jpeg';
    const base64 = url.split(',')[1];
    if (!base64) throw new Error('Invalid data URL');
    return { base64, mimeType };
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    let res: Response;
    try {
      res = await fetchWithTimeout(url, undefined, REFERENCE_FETCH_TIMEOUT_MS);
    } catch (e) {
      if (isAbortError(e)) {
        throw new Error('Reference image download timed out');
      }
      throw e;
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch reference image (${res.status})`);
    }
    const blob = await res.blob();
    const base64 = await readBlobAsImageBase64(blob);
    return { base64, mimeType: blob.type || 'image/jpeg' };
  }
  if (url.startsWith('blob:')) {
    try {
      const res = await fetchWithTimeout(url, undefined, REFERENCE_FETCH_TIMEOUT_MS);
      const blob = await res.blob();
      const base64 = await readBlobAsImageBase64(blob);
      return { base64, mimeType: blob.type || 'image/jpeg' };
    } catch (e) {
      if (isAbortError(e)) {
        throw new Error('Reference image (blob) load timed out');
      }
      throw e;
    }
  }
  throw new Error('Unsupported URL type; use data:, blob:, or http(s)');
}

export interface GenerateImageOptions {
  prompt: string;
  /** Up to 14 slots (character or asset banding; see referenceSlots). Pad to 14 with '' for unused. */
  referenceImageUrls: string[];
  /** Pre-encoded Imageshop references with explicit provider semantics. */
  preparedReferenceImages?: ReadonlyArray<{
    id: string;
    providerInstruction: string;
    base64: string;
    mimeType: string;
  }>;
  seed: number | null;
  aspectRatio: '9:16' | '1:1' | '21:9';
  modelId: OnyxModelId;
  /** When true, user prompt came from vault override (not tag-built); add stronger anti-background instruction. */
  isVaultOverride?: boolean;
  /** For vault-override suffix wording. */
  context?: 'character' | 'asset';
}

export type GeminiImageErrorClass =
  | 'missing-key'
  | 'safety'
  | 'quota-rate-limit'
  | 'timeout'
  | 'reference-fetch'
  | 'reference-size'
  | 'no-image'
  | 'unsupported-payload'
  | 'network'
  | 'unknown';

export type GeminiImageDiagnostic = {
  errorClass: GeminiImageErrorClass;
  message: string;
  retryable: boolean;
  suggestedAction:
    | 'configure-key'
    | 'edit-prompt'
    | 'retry-later'
    | 'retry'
    | 'retry-without-failed-refs'
    | 'retry-smaller-refs'
    | 'change-payload'
    | 'inspect-error';
};

export type GenerateImageResult =
  | { ok: true; imageDataUrl: string }
  | { ok: false; blocked: true; reason: 'safety'; diagnostic: GeminiImageDiagnostic }
  | { ok: false; error: string; diagnostic: GeminiImageDiagnostic };

export function classifyGeminiImageFailure(message: string): GeminiImageDiagnostic {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes('vite_gemini_api_key') || normalized.includes('missing api key')) {
    return {
      errorClass: 'missing-key',
      message,
      retryable: false,
      suggestedAction: 'configure-key',
    };
  }
  if (normalized.includes('safety') || normalized.includes('blocked by')) {
    return {
      errorClass: 'safety',
      message,
      retryable: false,
      suggestedAction: 'edit-prompt',
    };
  }
  if (
    normalized.includes('rate limit') ||
    normalized.includes('rate-limit') ||
    normalized.includes('quota') ||
    normalized.includes('resource exhausted') ||
    normalized.includes('429')
  ) {
    return {
      errorClass: 'quota-rate-limit',
      message,
      retryable: true,
      suggestedAction: 'retry-later',
    };
  }
  if (
    normalized.includes('reference') &&
    (normalized.includes('fetch') || normalized.includes('download') || normalized.includes('load timed out'))
  ) {
    return {
      errorClass: 'reference-fetch',
      message,
      retryable: true,
      suggestedAction: 'retry-without-failed-refs',
    };
  }
  if (
    normalized.includes('payload') &&
    (normalized.includes('size') || normalized.includes('too large') || normalized.includes('exceeds'))
  ) {
    return {
      errorClass: 'reference-size',
      message,
      retryable: true,
      suggestedAction: 'retry-smaller-refs',
    };
  }
  if (normalized.includes('timed out') || normalized.includes('timeout') || normalized.includes('aborted')) {
    return {
      errorClass: 'timeout',
      message,
      retryable: true,
      suggestedAction: 'retry',
    };
  }
  if (normalized.includes('no image')) {
    return {
      errorClass: 'no-image',
      message,
      retryable: true,
      suggestedAction: 'retry',
    };
  }
  if (
    normalized.includes('unsupported') ||
    normalized.includes('invalid payload') ||
    normalized.includes('invalid argument')
  ) {
    return {
      errorClass: 'unsupported-payload',
      message,
      retryable: false,
      suggestedAction: 'change-payload',
    };
  }
  if (
    normalized.includes('network') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('connection')
  ) {
    return {
      errorClass: 'network',
      message,
      retryable: true,
      suggestedAction: 'retry',
    };
  }
  return {
    errorClass: 'unknown',
    message,
    retryable: false,
    suggestedAction: 'inspect-error',
  };
}

function imageFailure(message: string): Extract<GenerateImageResult, { ok: false; error: string }> {
  return {
    ok: false,
    error: message,
    diagnostic: classifyGeminiImageFailure(message),
  };
}

export async function referenceUrlToBase64WithMimeRetry(
  url: string
): Promise<{ base64: string; mimeType: string }> {
  if (!isArcsGenerationsStorageUrl(url)) {
    return urlToBase64WithMime(url);
  }

  const signed1 = await createFreshSignedArcsUrl(url);
  try {
    return await urlToBase64WithMime(signed1);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes('(400)')) throw e;
  }

  const signed2 = await createFreshSignedArcsUrl(url);
  return await urlToBase64WithMime(signed2);
}

function isRateLimitResponse(res: Response): boolean {
  return res.status === 429;
}

function parseSafetyBlock(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const o = body as Record<string, unknown>;
  const promptFeedback = o.promptFeedback as Record<string, unknown> | undefined;
  if (promptFeedback?.blockReason) return true;
  const candidates = o.candidates as Array<Record<string, unknown>> | undefined;
  if (candidates?.[0]?.finishReason === 'SAFETY') return true;
  return false;
}

/**
 * Call Gemini image API with exponential backoff on 429 and safety detection.
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    return imageFailure('Missing VITE_GEMINI_API_KEY');
  }

  const model = getGeminiModelId(options.modelId);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const padded = Array.from({ length: 14 }, (_, i) => options.referenceImageUrls[i] ?? '');
  const genContext = options.context ?? 'character';

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  try {
    if (options.preparedReferenceImages) {
      for (const reference of options.preparedReferenceImages) {
        parts.push({ text: `${reference.providerInstruction}\n` });
        parts.push({
          inlineData: {
            mimeType: reference.mimeType,
            data: reference.base64,
          },
        });
      }
    } else {
      let lastRole: string | null = null;
      for (let i = 0; i < padded.length; i++) {
        const refUrl = padded[i];
        if (!refUrl) continue;
        const role =
          genContext === 'asset'
            ? getSlotRole(i, 'asset')
            : getSlotRole(i, 'character');
        if (role !== lastRole) {
          const label =
            genContext === 'asset'
              ? ASSET_ROLE_LABELS[role as AssetReferenceSlotRole]
              : CHARACTER_ROLE_LABELS[role as ReferenceSlotRole];
          parts.push({ text: label + '\n' });
          lastRole = role;
        }
        const { base64, mimeType } = await referenceUrlToBase64WithMimeRetry(refUrl);
        parts.push({ inlineData: { mimeType, data: base64 } });
      }
    }
  } catch (e) {
    return imageFailure(e instanceof Error ? e.message : 'Failed to encode reference images');
  }

  const hasAnyRef =
    (options.preparedReferenceImages?.length ?? 0) > 0 || padded.some((u) => u);
  const subjectOnlyCharacter =
    hasAnyRef
      ? 'Reference workflow: Character DNA images define WHO (face, body, hair). Wardrobe DNA images define WHAT THEY WEAR—match that clothing faithfully, not a stylized hybrid. Atmospheric DNA affects lighting/setting only. Ignore backgrounds behind people in refs unless the prompt asks for that setting.\n\n'
      : '';
  const subjectOnlyAsset =
    hasAnyRef
      ? 'Reference workflow: Site & exterior references anchor the place and building. Interior references define rooms and layout—when both exterior and interior references exist, interior spaces must read as part of the same structure and design line. Materials references lock surfaces and decor. Light/atmosphere references set time and mood. Do not add people or living animals unless the text prompt explicitly requests them.\n\n'
      : '';
  const subjectOnly = genContext === 'asset' ? subjectOnlyAsset : subjectOnlyCharacter;
  const vaultExtra =
    options.isVaultOverride && hasAnyRef
      ? genContext === 'asset'
        ? '\n\nThe written prompt is primary. Use reference images to align setting, materials, and spatial logic unless the prompt explicitly contradicts them.'
        : '\n\nIgnore any background or setting in the reference images; generate only the character as described in the prompt.'
      : '';
  const seedPart =
    options.seed != null
      ? `\nUse seed: ${options.seed} for consistency.`
      : '';
  const aspectPart = `Aspect ratio: ${options.aspectRatio}.`;
  const fullPrompt = `${subjectOnly}${options.prompt}${vaultExtra}\n${aspectPart}${seedPart}`;
  parts.push({ text: fullPrompt });

  const body = {
    contents: [{ role: 'user', parts }],
  };

  let lastError: string | null = null;
  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let res: Response;
      try {
        res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
          GEMINI_FETCH_TIMEOUT_MS
        );
      } catch (netErr) {
        return imageFailure(
          isAbortError(netErr)
            ? 'Image request timed out. Try again, or use fewer or smaller reference images.'
            : netErr instanceof Error
              ? netErr.message
              : 'Network error while calling image API',
        );
      }

      if (isRateLimitResponse(res)) {
        lastError = 'Rate limited. Try again in a moment.';
        if (attempt < MAX_RETRIES) {
          await delay(backoffDelay(attempt));
          continue;
        }
        return imageFailure(lastError);
      }

      let data: unknown;
      try {
        data = await readResponseJsonWithTimeout(res, GEMINI_READ_BODY_TIMEOUT_MS);
      } catch (readErr) {
        const msg = readErr instanceof Error ? readErr.message : String(readErr);
        if (msg.includes('timed out')) {
          return imageFailure(msg);
        }
        data = {};
      }
      if (parseSafetyBlock(data)) {
        return {
          ok: false,
          blocked: true,
          reason: 'safety',
          diagnostic: classifyGeminiImageFailure('Blocked by safety filters.'),
        };
      }

      if (!res.ok) {
        const msg =
          (data as any)?.error?.message && typeof (data as any).error?.message === 'string'
            ? ((data as any).error.message as string)
            : res.statusText || 'Request failed';
        return imageFailure(msg);
      }

      const candidates = (data as any).candidates as
        | Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>
        | undefined;
      const part = candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (part?.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
        return { ok: true, imageDataUrl: dataUrl };
      }

      lastError = 'No image in response';
      break;
    }
  } catch (e) {
    return imageFailure(e instanceof Error ? e.message : 'Image generation failed unexpectedly');
  }

  return imageFailure(lastError || 'Unknown error');
}
