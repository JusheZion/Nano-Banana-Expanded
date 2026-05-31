#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const TEXT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro-preview',
];

const ARCS_GENERATIONS_BUCKET = 'arcs-generations';
const SIGNED_TTL_SEC = 3600;
const FETCH_TIMEOUT_MS = 120_000;
const READ_TIMEOUT_MS = 90_000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    out: path.join('exports', 'vault-prompts', new Date().toISOString().slice(0, 10)),
    input: null,
    limit: null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = argv[++i];
    else if (arg === '--input') args.input = argv[++i];
    else if (arg === '--limit') args.limit = Number.parseInt(argv[++i], 10);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.limit != null && (!Number.isFinite(args.limit) || args.limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/export-vault-prompts.mjs [--out exports/vault-prompts/YYYY-MM-DD]
  node scripts/export-vault-prompts.mjs --input vault-records.json

Sources:
  1. --input JSON with records shaped like:
     [{ "source": "character", "id": "...", "title": "...", "imageUrl": "..." }]

  2. Supabase tables when VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and
     SUPABASE_ACCESS_TOKEN are available in the environment.

Output:
  prompts.json and prompts.md in the output directory.
`);
}

async function readEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const eq = trimmed.indexOf('=');
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

async function loadEnv() {
  const files = ['.env', '.env.local'];
  const merged = {};
  for (const file of files) {
    Object.assign(merged, await readEnvFile(path.join(repoRoot, file)));
  }
  return { ...merged, ...process.env };
}

function extractObjectPath(imageUrl) {
  const match = imageUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/arcs-generations\/([^?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

async function createSupabaseClient(env) {
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const accessToken = env.SUPABASE_ACCESS_TOKEN;
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });

  return client;
}

async function fetchSupabaseVaultRows(client) {
  const records = [];
  const characterSelect =
    'id, image_url, profile_name, cast_name, name, seed, created_at, is_profile_cover, metadata_tags';
  const assetSelect = 'id, image_url, collection_name, asset_name, name, seed, created_at, metadata_tags';

  const { data: characters, error: characterError } = await client
    .from('characters')
    .select(characterSelect)
    .order('created_at', { ascending: true });
  if (characterError) throw new Error(`characters query failed: ${characterError.message}`);

  for (const row of characters ?? []) {
    records.push({
      source: 'character',
      id: row.id,
      title: row.cast_name || row.name || row.profile_name || 'Character reference',
      group: row.profile_name || null,
      imageUrl: row.image_url,
      seed: row.seed ?? null,
      createdAt: row.created_at ?? null,
      metadata: row.metadata_tags ?? null,
    });
  }

  const { data: assets, error: assetError } = await client
    .from('assets')
    .select(assetSelect)
    .order('created_at', { ascending: true });
  if (assetError) throw new Error(`assets query failed: ${assetError.message}`);

  for (const row of assets ?? []) {
    records.push({
      source: 'asset',
      id: row.id,
      title: row.asset_name || row.name || row.collection_name || 'Asset reference',
      group: row.collection_name || null,
      imageUrl: row.image_url,
      seed: row.seed ?? null,
      createdAt: row.created_at ?? null,
      metadata: row.metadata_tags ?? null,
    });
  }

  return records;
}

function normalizeInputRecord(raw, index) {
  const source = String(raw.source || raw.vault || raw.kind || 'unknown').toLowerCase();
  const imageUrl = raw.imageUrl || raw.image_url || raw.url || raw.src;
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error(`Input record ${index + 1} is missing imageUrl/image_url/url/src`);
  }
  return {
    source,
    id: String(raw.id || `${source}-${index + 1}`),
    title: String(raw.title || raw.name || raw.label || `${source} ${index + 1}`),
    group: raw.group || raw.profileName || raw.profile_name || raw.collectionName || raw.collection_name || null,
    imageUrl,
    seed: raw.seed ?? null,
    createdAt: raw.createdAt || raw.created_at || null,
    metadata: raw.metadata || raw.metadata_tags || null,
  };
}

async function readInputRecords(inputPath) {
  const fullPath = path.resolve(repoRoot, inputPath);
  const raw = await fs.readFile(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : parsed.records;
  if (!Array.isArray(rows)) {
    throw new Error('--input JSON must be an array or an object with a records array');
  }
  return rows.map(normalizeInputRecord);
}

async function readBodyWithTimeout(res) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Reading image body timed out')), READ_TIMEOUT_MS);
    res
      .arrayBuffer()
      .then((buffer) => {
        clearTimeout(timer);
        resolve(Buffer.from(buffer));
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function signArcsImageUrl(client, imageUrl) {
  if (!client) return imageUrl;
  if (/\/object\/sign\/arcs-generations\//.test(imageUrl) && imageUrl.includes('token=')) {
    return imageUrl;
  }

  const objectPath = extractObjectPath(imageUrl);
  if (!objectPath) return imageUrl;

  const first = await client.storage
    .from(ARCS_GENERATIONS_BUCKET)
    .createSignedUrl(objectPath, SIGNED_TTL_SEC);
  if (first.data?.signedUrl && !first.error) return first.data.signedUrl;

  return imageUrl;
}

async function imageToInlineData(record, client) {
  if (record.imageUrl.startsWith('data:')) {
    const match = /^data:([^;]+);base64,(.+)$/s.exec(record.imageUrl);
    if (!match) throw new Error('Invalid data URL');
    return { mimeType: match[1] || 'image/jpeg', base64: match[2] };
  }

  if (!/^https?:\/\//i.test(record.imageUrl)) {
    throw new Error(`Unsupported image URL for ${record.id}`);
  }

  const signedUrl = await signArcsImageUrl(client, record.imageUrl);
  const res = await fetchWithTimeout(signedUrl);
  if (!res.ok) throw new Error(`Image fetch failed for ${record.id}: ${res.status}`);
  const buffer = await readBodyWithTimeout(res);
  const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  return { mimeType, base64: buffer.toString('base64') };
}

function systemPromptForSource(source) {
  if (source === 'character') {
    return [
      'You convert a character reference image into a reusable image-generation prompt.',
      'Describe only visible traits. Do not invent identity, backstory, ethnicity, lore, or names.',
      'Capture face, hair, body silhouette, outfit, accessories, color palette, pose, lighting, and art style.',
      'Write polished prompt-library text. Plain text only. No markdown.',
    ].join(' ');
  }
  if (source === 'npc' || source === 'supporting_reference') {
    return [
      'You convert a supporting character or NPC reference image into a reusable image-generation prompt.',
      'Describe only visible traits and scene-useful visual details. Do not invent backstory or lore.',
      'Capture role impression, silhouette, clothing, colors, expression, pose, lighting, and art style.',
      'Write polished prompt-library text. Plain text only. No markdown.',
    ].join(' ');
  }
  return [
    'You convert an environment, prop, object, or asset reference image into a reusable image-generation prompt.',
    'Describe only visible details. Do not invent people, animals, brands, readable signage, story, or lore.',
    'Capture subject, materials, shape language, color palette, scale cues, camera angle, lighting, and art style.',
    'Write polished prompt-library text. Plain text only. No markdown.',
  ].join(' ');
}

function userTextForRecord(record) {
  const context = [
    `Vault source: ${record.source}`,
    `Title: ${record.title}`,
    record.group ? `Group: ${record.group}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `${context}\n\nReturn one reusable image-generation prompt, 80-180 words. End with a short consistency note beginning with "Consistency notes:"`;
}

function extractTextFromGemini(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => (typeof part.text === 'string' ? part.text : '')).join('').trim();
}

async function callGeminiVision(record, inlineData, env) {
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY or GEMINI_API_KEY');

  const body = {
    systemInstruction: { parts: [{ text: systemPromptForSource(record.source) }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: inlineData.mimeType, data: inlineData.base64 } },
          { text: userTextForRecord(record) },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 2048,
    },
  };

  let lastError = null;
  for (const model of TEXT_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      lastError = data?.error?.message || `${res.status} ${res.statusText}`;
      if (res.status === 404 || String(lastError).toLowerCase().includes('not found')) continue;
      throw new Error(`Gemini request failed for ${record.id}: ${lastError}`);
    }
    const text = extractTextFromGemini(data);
    if (text) return { prompt: text, model };
    lastError = 'No text in Gemini response';
  }

  throw new Error(`Gemini request failed for ${record.id}: ${lastError || 'unknown error'}`);
}

function tagsForRecord(record, prompt) {
  const tags = new Set([record.source]);
  if (record.group) tags.add(String(record.group));
  const lower = prompt.toLowerCase();
  for (const term of [
    'portrait',
    'full-body',
    'armor',
    'cloak',
    'robe',
    'city',
    'interior',
    'exterior',
    'vehicle',
    'prop',
    'weapon',
    'jewelry',
    'cinematic',
    'stylized',
  ]) {
    if (lower.includes(term)) tags.add(term);
  }
  return [...tags];
}

function toPromptEntry(record, generated) {
  const prompt = generated.prompt.trim();
  return {
    id: `${record.source}-${record.id}`,
    source: record.source,
    title: record.title,
    group: record.group,
    prompt,
    tags: tagsForRecord(record, prompt),
    source_image_url: record.imageUrl,
    vault_id: record.id,
    seed: record.seed,
    created_at: record.createdAt,
    generated_at: new Date().toISOString(),
    model: generated.model,
    prompt_type: 'reverse_engineered_image_prompt_v1',
  };
}

function markdownForEntries(entries) {
  const lines = [
    '# Vault Prompt Export',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total prompts: ${entries.length}`,
    '',
  ];

  for (const entry of entries) {
    lines.push(`## ${entry.title}`);
    lines.push('');
    lines.push(`- Source: ${entry.source}`);
    if (entry.group) lines.push(`- Group: ${entry.group}`);
    lines.push(`- Vault ID: ${entry.vault_id}`);
    if (entry.seed != null) lines.push(`- Seed: ${entry.seed}`);
    lines.push(`- Model: ${entry.model}`);
    lines.push(`- Tags: ${entry.tags.join(', ')}`);
    lines.push('');
    lines.push(entry.prompt);
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

async function writeOutputs(outDir, entries) {
  const fullOut = path.resolve(repoRoot, outDir);
  await fs.mkdir(fullOut, { recursive: true });
  await fs.writeFile(path.join(fullOut, 'prompts.json'), `${JSON.stringify(entries, null, 2)}\n`);
  await fs.writeFile(path.join(fullOut, 'prompts.md'), markdownForEntries(entries));
  return fullOut;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnv();
  const client = await createSupabaseClient(env);

  const sourceRecords = args.input
    ? await readInputRecords(args.input)
    : client
      ? await fetchSupabaseVaultRows(client)
      : [];

  const records = sourceRecords
    .filter((record) => record.imageUrl)
    .slice(0, args.limit ?? sourceRecords.length);

  if (records.length === 0) {
    throw new Error(
      'No vault records found. Provide --input records.json, or set SUPABASE_ACCESS_TOKEN for authenticated Supabase vault rows.'
    );
  }

  if (args.dryRun) {
    console.log(JSON.stringify({ count: records.length, records }, null, 2));
    return;
  }

  const entries = [];
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    process.stdout.write(`[${i + 1}/${records.length}] ${record.source}: ${record.title}\n`);
    const inlineData = await imageToInlineData(record, client);
    const generated = await callGeminiVision(record, inlineData, env);
    entries.push(toPromptEntry(record, generated));
  }

  const outDir = await writeOutputs(args.out, entries);
  console.log(`Wrote ${entries.length} prompts to ${outDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
