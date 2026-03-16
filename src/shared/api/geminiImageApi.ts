/**
 * Universal API bridge for Gemini Image (Nano Banana 2 / Pro).
 * Handles reference_images (max 14), seed, aspect ratio, 429 backoff, and safety blocks.
 */

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
  referenceImageUrls: string[];
  seed: number | null;
  aspectRatio: '9:16' | '1:1' | '21:9';
  modelId: OnyxModelId;
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

  let referenceParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  try {
    const refs = options.referenceImageUrls.slice(0, 14).filter(Boolean);
    for (const refUrl of refs) {
      const b64 = await urlToBase64(refUrl);
      referenceParts.push({
        inlineData: { mimeType: 'image/png', data: b64 },
      });
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to encode reference images',
    };
  }

  const seedPart =
    options.seed != null
      ? `\nUse seed: ${options.seed} for consistency.`
      : '';
  const aspectPart = `Aspect ratio: ${options.aspectRatio}.`;
  const fullPrompt = `${options.prompt}\n${aspectPart}${seedPart}`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    ...referenceParts.map((p) => ({ inlineData: p.inlineData })),
    { text: fullPrompt },
  ];

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
