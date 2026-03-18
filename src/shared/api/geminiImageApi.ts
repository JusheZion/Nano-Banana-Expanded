/**
 * Universal API bridge for Gemini Image (Nano Banana 2 / Pro).
 * Handles reference_images (max 14), seed, aspect ratio, 429 backoff, and safety blocks.
 * Reference slots 0–3: identity, 4–9: style, 10–13: composition; role labels are sent as text before each group.
 */

import { getSlotRole } from '@/shared/constants/referenceSlots';

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * JITTER_MS;
  return Math.min(exponential + jitter, 30_000);
}

/** Convert data URL or blob URL to base64 string (no data URL prefix). */
export async function urlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    if (!base64) throw new Error('Invalid data URL');
    return base64;
  }
  if (url.startsWith('blob:')) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (!base64) reject(new Error('Failed to read blob as base64'));
        else resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  throw new Error('Unsupported URL type; use data: or blob:');
}

export interface GenerateImageOptions {
  prompt: string;
  /** Up to 14 slots; index = slot (0–3 identity, 4–9 style, 10–13 composition). Pad to 14 with '' for unused. */
  referenceImageUrls: string[];
  seed: number | null;
  aspectRatio: '9:16' | '1:1' | '21:9';
  modelId: OnyxModelId;
  /** When true, user prompt came from vault override (not tag-built); add stronger anti-background instruction. */
  isVaultOverride?: boolean;
  /** For vault-override suffix wording. */
  context?: 'character' | 'asset';
}

export type GenerateImageResult =
  | { ok: true; imageDataUrl: string }
  | { ok: false; blocked: true; reason: 'safety' }
  | { ok: false; error: string };

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
    return { ok: false, error: 'Missing VITE_GEMINI_API_KEY' };
  }

  const model = getGeminiModelId(options.modelId);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const padded = Array.from({ length: 14 }, (_, i) => options.referenceImageUrls[i] ?? '');
  const roleLabels: Record<string, string> = {
    identity:
      '[Character DNA – face, skin, body type, hair, tattoos, likeness. Use this person as the subject.]',
    style:
      '[Wardrobe DNA – reproduce the complete visible outfit from these images: every garment, color, pattern, and accessory. Put this exact clothing on the character from Character DNA. Do not invent a different outfit or fantasy costume unless the text prompt explicitly demands it.]',
    composition:
      '[Atmospheric DNA – lighting, mood, and environment only; do not replace the outfit from Wardrobe DNA.]',
  };

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  try {
    let lastRole: string | null = null;
    for (let i = 0; i < padded.length; i++) {
      const refUrl = padded[i];
      if (!refUrl) continue;
      const role = getSlotRole(i);
      if (role !== lastRole) {
        parts.push({ text: roleLabels[role] + '\n' });
        lastRole = role;
      }
      const b64 = await urlToBase64(refUrl);
      parts.push({ inlineData: { mimeType: 'image/png', data: b64 } });
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to encode reference images',
    };
  }

  const hasAnyRef = padded.some((u) => u);
  const subjectOnly =
    hasAnyRef
      ? 'Reference workflow: Character DNA images define WHO (face, body, hair). Wardrobe DNA images define WHAT THEY WEAR—match that clothing faithfully, not a stylized hybrid. Atmospheric DNA affects lighting/setting only. Ignore backgrounds behind people in refs unless the prompt asks for that setting.\n\n'
      : '';
  const vaultExtra =
    options.isVaultOverride && hasAnyRef
      ? options.context === 'asset'
        ? '\n\nIgnore any background or setting in the reference images; generate only the environment or subject as described in the prompt.'
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
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (isRateLimitResponse(res)) {
      lastError = 'Rate limited. Try again in a moment.';
      if (attempt < MAX_RETRIES) {
        await delay(backoffDelay(attempt));
        continue;
      }
      return { ok: false, error: lastError };
    }

    const data = await res.json().catch(() => ({}));
    if (parseSafetyBlock(data)) {
      return { ok: false, blocked: true, reason: 'safety' };
    }

    if (!res.ok) {
      const msg = (data.error?.message as string) || res.statusText || 'Request failed';
      return { ok: false, error: msg };
    }

    const candidates = data.candidates as Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }> | undefined;
    const part = candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (part?.inlineData?.data) {
      const mime = part.inlineData.mimeType || 'image/png';
      const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
      return { ok: true, imageDataUrl: dataUrl };
    }

    lastError = 'No image in response';
    break;
  }

  return { ok: false, error: lastError || 'Unknown error' };
}
