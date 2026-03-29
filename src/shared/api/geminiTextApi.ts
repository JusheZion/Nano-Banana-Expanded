/**
 * Gemini text API (JSON-oriented) for Storyline Director passes.
 * Same API key as image generation; uses a text-capable model.
 */

const TEXT_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'] as const;
const BASE_DELAY_MS = 1000;
const MAX_RETRIES = 4;
const JITTER_MS = 500;
const GEMINI_FETCH_TIMEOUT_MS = 120_000;
const GEMINI_READ_BODY_TIMEOUT_MS = 90_000;

function isModelUnavailableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('no longer available') ||
    m.includes('not found') ||
    m.includes('model') && m.includes('not available')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * JITTER_MS;
  return Math.min(exponential + jitter, 30_000);
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
      () => reject(new Error('Reading text API response timed out')),
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

function isRateLimitResponse(res: Response): boolean {
  return res.status === 429;
}

function extractTextFromResponse(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const o = data as Record<string, unknown>;
  const candidates = o.candidates as Array<{
    content?: { parts?: Array<{ text?: string }> };
  }> | undefined;
  const parts = candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('');
}

export type GenerateGeminiTextResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export interface GenerateGeminiTextOptions {
  systemPrompt: string;
  userPrompt: string;
  /** When true, ask API for JSON MIME type (Gemini 2.x). */
  jsonMode?: boolean;
}

/**
 * Single-turn text generation. Prefer jsonMode for structured director outputs.
 */
export async function generateGeminiText(
  options: GenerateGeminiTextOptions
): Promise<GenerateGeminiTextResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    return { ok: false, error: 'Missing VITE_GEMINI_API_KEY' };
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: options.systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: options.userPrompt }] }],
  };

  if (options.jsonMode) {
    body.generationConfig = {
      responseMimeType: 'application/json',
      temperature: 0.4,
    };
  }

  let lastError: string | null = null;
  try {
    for (const model of TEXT_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
          return {
            ok: false,
            error: isAbortError(netErr)
              ? 'Text request timed out.'
              : netErr instanceof Error
                ? netErr.message
                : 'Network error while calling text API',
          };
        }

        if (isRateLimitResponse(res)) {
          lastError = 'Rate limited. Try again in a moment.';
          if (attempt < MAX_RETRIES) {
            await delay(backoffDelay(attempt));
            continue;
          }
          return { ok: false, error: lastError };
        }

        let data: unknown;
        try {
          data = await readResponseJsonWithTimeout(res, GEMINI_READ_BODY_TIMEOUT_MS);
        } catch (readErr) {
          const msg = readErr instanceof Error ? readErr.message : String(readErr);
          return { ok: false, error: msg };
        }

        if (!res.ok) {
          const errObj = (data as { error?: { message?: string } })?.error;
          const msg =
            errObj?.message && typeof errObj.message === 'string'
              ? errObj.message
              : res.statusText || 'Request failed';

          if (isModelUnavailableError(msg) && model !== TEXT_MODELS[TEXT_MODELS.length - 1]) {
            lastError = msg;
            break; // try next model
          }
          return { ok: false, error: msg };
        }

        const text = extractTextFromResponse(data).trim();
        if (text) {
          return { ok: true, text };
        }
        lastError = 'No text in response';
        if (attempt < MAX_RETRIES) {
          await delay(backoffDelay(attempt));
          continue;
        }
      }
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Text generation failed unexpectedly',
    };
  }

  return { ok: false, error: lastError || 'Unknown error' };
}

export interface GenerateGeminiTextFromImageOptions {
  systemPrompt: string;
  userText: string;
  imageBase64: string;
  mimeType: string;
}

/**
 * Single-turn vision → text (e.g. describe a portrait for a reference prompt).
 * Uses the same models and retry policy as {@link generateGeminiText}.
 */
export async function generateGeminiTextFromImage(
  options: GenerateGeminiTextFromImageOptions
): Promise<GenerateGeminiTextResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    return { ok: false, error: 'Missing VITE_GEMINI_API_KEY' };
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: options.systemPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: options.mimeType, data: options.imageBase64 } },
          { text: options.userText },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 2048,
    },
  };

  let lastError: string | null = null;
  try {
    for (const model of TEXT_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
          return {
            ok: false,
            error: isAbortError(netErr)
              ? 'Text request timed out.'
              : netErr instanceof Error
                ? netErr.message
                : 'Network error while calling text API',
          };
        }

        if (isRateLimitResponse(res)) {
          lastError = 'Rate limited. Try again in a moment.';
          if (attempt < MAX_RETRIES) {
            await delay(backoffDelay(attempt));
            continue;
          }
          return { ok: false, error: lastError };
        }

        let data: unknown;
        try {
          data = await readResponseJsonWithTimeout(res, GEMINI_READ_BODY_TIMEOUT_MS);
        } catch (readErr) {
          const msg = readErr instanceof Error ? readErr.message : String(readErr);
          return { ok: false, error: msg };
        }

        if (!res.ok) {
          const errObj = (data as { error?: { message?: string } })?.error;
          const msg =
            errObj?.message && typeof errObj.message === 'string'
              ? errObj.message
              : res.statusText || 'Request failed';

          if (isModelUnavailableError(msg) && model !== TEXT_MODELS[TEXT_MODELS.length - 1]) {
            lastError = msg;
            break;
          }
          return { ok: false, error: msg };
        }

        const text = extractTextFromResponse(data).trim();
        if (text) {
          return { ok: true, text };
        }
        lastError = 'No text in response';
        if (attempt < MAX_RETRIES) {
          await delay(backoffDelay(attempt));
          continue;
        }
      }
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Vision text generation failed unexpectedly',
    };
  }

  return { ok: false, error: lastError || 'Unknown error' };
}
