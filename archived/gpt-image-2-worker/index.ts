export interface Env {
  IMAGESHOP_BUCKET: R2Bucket;
  OPENAI_API_KEY?: string;
}

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

function badRequest(message: string): Response {
  return json({ ok: false, error: message }, { status: 400 });
}

function methodNotAllowed(): Response {
  return json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}

function isHttpUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function readJson<T>(req: Request): Promise<T> {
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('Expected application/json');
  }
  return (await req.json()) as T;
}

async function handleUpload(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return methodNotAllowed();

  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('multipart/form-data')) {
    return badRequest('Expected multipart/form-data');
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return badRequest('Missing file');
  if (!file.type.startsWith('image/')) return badRequest('File must be an image');

  // Avoid gigantic uploads to the Worker.
  const maxBytes = 25 * 1024 * 1024;
  if (file.size > maxBytes) return badRequest('File too large');

  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/jpeg'
          ? 'jpg'
          : 'img';

  const key = `imports/${crypto.randomUUID()}.${ext}`;
  await env.IMAGESHOP_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const url = new URL(req.url);
  url.pathname = `/api/image/ref/${key}`;
  url.search = '';

  return json({ ok: true, url: url.toString(), key });
}

async function handleRef(req: Request, env: Env, key: string): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return methodNotAllowed();
  if (!key) return badRequest('Missing key');

  const obj = await env.IMAGESHOP_BUCKET.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);

  return new Response(req.method === 'HEAD' ? null : obj.body, { headers });
}

type GenerateReq = {
  provider: 'openai';
  model: 'gpt-image-2';
  prompt: string;
  referenceImageUrls: string[];
  aspectRatio: '9:16' | '1:1' | '21:9';
  seed?: number | null;
  context?: 'character' | 'asset';
};

async function fetchBytes(
  url: string,
  timeoutMs: number
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to fetch reference (${res.status})`);
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const ab = await res.arrayBuffer();
    return { bytes: new Uint8Array(ab), contentType };
  } finally {
    clearTimeout(tid);
  }
}

function base64FromBytes(bytes: Uint8Array): string {
  // Use btoa in Workers; bytes->string in chunks to avoid call stack limits.
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function aspectToSize(aspect: GenerateReq['aspectRatio']): string {
  // OpenAI images uses discrete sizes; pick closest match.
  // 1:1 -> 1024x1024, 9:16 -> 1024x1792, 21:9 -> 1792x1024.
  if (aspect === '1:1') return '1024x1024';
  if (aspect === '9:16') return '1024x1792';
  return '1792x1024';
}

async function handleGenerate(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return methodNotAllowed();
  if (!env.OPENAI_API_KEY) return json({ ok: false, error: 'Missing OPENAI_API_KEY' }, { status: 500 });

  let body: GenerateReq;
  try {
    body = await readJson<GenerateReq>(req);
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : 'Invalid JSON');
  }

  if (body.provider !== 'openai' || body.model !== 'gpt-image-2') return badRequest('Unsupported provider/model');
  if (!body.prompt?.trim()) return badRequest('Missing prompt');
  if (!Array.isArray(body.referenceImageUrls)) return badRequest('referenceImageUrls must be an array');

  const refs = body.referenceImageUrls
    .slice(0, 14)
    .filter((u) => typeof u === 'string' && u.trim().length > 0);
  for (const u of refs) {
    if (!isHttpUrl(u)) return badRequest('All referenceImageUrls must be http(s) URLs');
  }

  // Fetch up to 14 references.
  const refTimeoutMs = 60_000;
  const images = await Promise.all(
    refs.map(async (u) => {
      const { bytes, contentType } = await fetchBytes(u, refTimeoutMs);
      return { base64: base64FromBytes(bytes), mimeType: contentType };
    })
  );

  // Use /images/edits when an input image exists; otherwise /images/generations.
  // Note: OpenAI expects multipart/form-data for edits; generations supports JSON.
  // We'll use edits for any refs (first becomes `image`, remainder optional).
  if (images.length > 0) {
    const fd = new FormData();
    fd.set('model', body.model);
    fd.set('prompt', body.prompt);
    fd.set('size', aspectToSize(body.aspectRatio));
    fd.set('n', '1');
    // Convert base64 back to Blob for multipart. (Yes, redundant; but avoids client base64.)
    for (let i = 0; i < images.length; i++) {
      const { base64, mimeType } = images[i];
      const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bin], { type: mimeType });
      // OpenAI param name is `image` (can be repeated as array).
      fd.append('image', blob, `ref-${i}`);
    }

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: fd,
    });

    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      const msg = data?.error?.message || res.statusText || 'OpenAI request failed';
      return json({ ok: false, error: msg }, { status: 502 });
    }

    const b64 = data?.data?.[0]?.b64_json as string | undefined;
    if (!b64) return json({ ok: false, error: 'No image in OpenAI response' }, { status: 502 });
    return json({ ok: true, imageDataUrl: `data:image/png;base64,${b64}` });
  }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: body.model,
      prompt: body.prompt,
      size: aspectToSize(body.aspectRatio),
      n: 1,
    }),
  });

  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || 'OpenAI request failed';
    return json({ ok: false, error: msg }, { status: 502 });
  }

  const b64 = data?.data?.[0]?.b64_json as string | undefined;
  if (!b64) return json({ ok: false, error: 'No image in OpenAI response' }, { status: 502 });
  return json({ ok: true, imageDataUrl: `data:image/png;base64,${b64}` });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/image/upload') return handleUpload(req, env);
    if (url.pathname === '/api/image/generate') return handleGenerate(req, env);
    if (url.pathname.startsWith('/api/image/ref/')) {
      const key = url.pathname.replace('/api/image/ref/', '');
      return handleRef(req, env, key);
    }

    // Fall back to static assets / SPA behavior.
    // The assets binding is automatically provided by Wrangler when `assets.directory` is configured.
    // @ts-expect-error - `env.ASSETS` is injected at runtime by Wrangler.
    const assets = (env as any).ASSETS as { fetch: (r: Request) => Promise<Response> } | undefined;
    if (assets?.fetch) return assets.fetch(req);

    return new Response('Not found', { status: 404 });
  },
};

