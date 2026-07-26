import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  canonCheckResultSchema,
  draftDialogueResultSchema,
  guidedComicAssistResultSchema,
  ideaAssistResultSchema,
  issueOutlineSchema,
  outlineClassificationPreviewResultSchema,
  outlineTreatmentPatchResultSchema,
  outlineTreatmentPreviewResultSchema,
  pacingRevisionPlanSchema,
  pacingRegenerationPreviewResultSchema,
  pacingReviewResultSchema,
  pageBeatsJsonSchema,
  shotPlanJsonSchema,
  WRITER_PAGE_BEATS_EDGE_INVOCATION_MAX,
  WRITER_PAGE_BEATS_ISSUE_MAX,
  writerToolsRequestSchema,
} from '../_shared/writerSchemas.ts';
import {
  buildOutlineTreatmentPrompt,
  getOutlineTreatmentConsistencyErrors,
} from './outlineTreatmentPrompt.ts';
import {
  applyOutlineTreatmentPatches,
  normalizeOutlineTreatmentPatchResult,
} from './outlineTreatmentPatch.ts';
import { getTreatmentCoverageErrors } from './outlineTreatmentCoverage.ts';
import {
  generatePageBeatsJsonWithMalformedRetry,
  PAGE_BEATS_GEMINI_RESPONSE_SCHEMA,
} from './pageBeatsStructuredOutput.ts';
import {
  buildPacingRevisionOutlinePreview,
  buildPacingRevisionOutlinePrompt,
} from './pacingRevisionPrompt.ts';
import {
  persistPacingRevisionOutlinePreview,
  projectPacingRevisionFailureLedger,
  type PacingRevisionChildLayer,
  type PacingRevisionFailure,
} from './pacingRevisionPersistence.ts';
import {
  generateValidatedPacingRevisionPageCandidate,
  pacingRevisionPageResponseSchema,
} from './pacingRevisionPageCandidate.ts';

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Same response shape for all Gemini catch paths; adds setup hints when Google rejects the key. */
function llmFailureResponse(msg: string): Response {
  let details = msg;
  if (/api key/i.test(msg) && /invalid|not valid|expired|permission denied/i.test(msg)) {
    details +=
      ' — The workshop Edge Function reads GEMINI_API_KEY from Supabase project secrets, not from your app .env. Run: supabase secrets set GEMINI_API_KEY=<your key> (same key as https://aistudio.google.com/apikey), linked to this project. Retry the outline; redeploy is usually unnecessary.';
  } else if (/unexpected model name format|invalid.*model/i.test(msg)) {
    details +=
      ' — Check Supabase secret GEMINI_MODEL: use one id only (e.g. gemini-2.0-flash), no models/ prefix, no quotes. Unset it to use the function default, then redeploy writer-tools.';
  }
  return Response.json(
    { success: false, error: 'LLM request failed', details },
    { status: 502, headers: corsHeaders },
  );
}

function asJsonObject(n: unknown): Record<string, unknown> {
  if (n && typeof n === 'object' && !Array.isArray(n)) return { ...(n as Record<string, unknown>) };
  return {};
}

function mergeWriterToolCache(
  notes: unknown,
  key: 'pacing_review' | 'canon_check',
  result: unknown,
): Record<string, unknown> {
  const prev = asJsonObject(notes);
  const cache = asJsonObject(prev.writer_tool_cache);
  cache[key] = { at: new Date().toISOString(), result };
  prev.writer_tool_cache = cache;
  return prev;
}

function readWriterToolCache(notes: unknown): Record<string, unknown> {
  return asJsonObject(asJsonObject(notes).writer_tool_cache);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function normalizePacingRevisionSourceBeats(outline: unknown) {
  const record = asJsonObject(outline);
  const rawBeats = Array.isArray(record.page_beats) ? record.page_beats : [];
  return Promise.all(rawBeats.flatMap((rawBeat, index) => {
    const beat = asJsonObject(rawBeat);
    const summary = typeof beat.summary === 'string' ? beat.summary.trim() : '';
    if (!summary) return [];
    const scene = typeof beat.scene === 'string' ? beat.scene.trim() : '';
    const emotionalTurn = typeof beat.emotional_turn === 'string' ? beat.emotional_turn.trim() : '';
    const text = [
      scene ? `Scene: ${scene}` : '',
      summary,
      emotionalTurn ? `Emotional turn: ${emotionalTurn}` : '',
    ].filter(Boolean).join('\n');
    const ordinal = index + 1;
    const pageTarget = typeof beat.page_target === 'number' && Number.isInteger(beat.page_target)
      ? beat.page_target
      : undefined;
    return [sha256Hex(`${ordinal}\u0000${text}`).then((digest) => ({
      id: `beat_${digest.slice(0, 24)}`,
      ordinal,
      ...(pageTarget ? { page_target: pageTarget } : {}),
      text,
    }))];
  }));
}

type WriterVisualReferenceKind = 'character' | 'location' | 'prop';
type WriterVisualReferenceSource = 'character_vault' | 'asset_vault';

type WriterVisualReference = {
  id: string;
  source: WriterVisualReferenceSource;
  sourceId: string;
  sourceLabel: string;
  label: string;
  kind: WriterVisualReferenceKind;
  imageUrl: string;
  note?: string;
};

type IssueRow = {
  id: string;
  series_id: string;
  issue_number: number;
  title: string | null;
  status: string;
  synopsis: string | null;
  notes: Record<string, unknown>;
  writer_series: {
    id: string;
    title: string;
    logline: string | null;
    genre: string | null;
    tone: string | null;
    target_demographic: string | null;
    notes?: Record<string, unknown>;
  } | null;
};

type WriterProductionDefaultsPayload = {
  medium_type?: 'comic' | 'book' | 'screenplay' | 'video' | 'wiki';
  narrative_scope?: 'single_issue' | 'multi_issue_arc' | 'book' | 'episode' | 'shared_universe';
  comic_panel_density?: 'sparse' | 'standard' | 'dense';
  art_style?: string;
  character_consistency?: 'standard' | 'strict';
  output_format?:
    | 'issue_pack_json'
    | 'comic_script_markdown'
    | 'guided_comic_handoff'
    | 'fountain_screenplay'
    | 'prose_manuscript'
    | 'lore_wiki';
  strict_canon?: boolean;
  no_video_assumptions?: boolean;
};

const DEFAULT_PRODUCTION_DEFAULTS: Required<WriterProductionDefaultsPayload> = {
  medium_type: 'comic',
  narrative_scope: 'single_issue',
  comic_panel_density: 'standard',
  art_style: 'consistent comic-book line art',
  character_consistency: 'strict',
  output_format: 'issue_pack_json',
  strict_canon: true,
  no_video_assumptions: true,
};

function readProductionDefaultsPayload(notes: Record<string, unknown> | undefined): WriterProductionDefaultsPayload {
  if (!notes || typeof notes !== 'object') return {};
  const raw = notes.production_defaults;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  return {
    ...(typeof o.medium_type === 'string' ? { medium_type: o.medium_type as WriterProductionDefaultsPayload['medium_type'] } : {}),
    ...(typeof o.narrative_scope === 'string' ? { narrative_scope: o.narrative_scope as WriterProductionDefaultsPayload['narrative_scope'] } : {}),
    ...(typeof o.comic_panel_density === 'string'
      ? { comic_panel_density: o.comic_panel_density as WriterProductionDefaultsPayload['comic_panel_density'] }
      : {}),
    ...(typeof o.art_style === 'string' ? { art_style: o.art_style } : {}),
    ...(typeof o.character_consistency === 'string'
      ? { character_consistency: o.character_consistency as WriterProductionDefaultsPayload['character_consistency'] }
      : {}),
    ...(typeof o.output_format === 'string'
      ? { output_format: o.output_format as WriterProductionDefaultsPayload['output_format'] }
      : {}),
    ...(typeof o.strict_canon === 'boolean' ? { strict_canon: o.strict_canon } : {}),
    ...(typeof o.no_video_assumptions === 'boolean' ? { no_video_assumptions: o.no_video_assumptions } : {}),
  };
}

function resolveProductionDefaultsPayload(
  issue: IssueRow,
  requestDefaults?: WriterProductionDefaultsPayload,
): Required<WriterProductionDefaultsPayload> {
  return {
    ...DEFAULT_PRODUCTION_DEFAULTS,
    ...readProductionDefaultsPayload(issue.writer_series?.notes),
    ...readProductionDefaultsPayload(issue.notes),
    ...(requestDefaults ?? {}),
  };
}

function buildProductionDefaultsPromptBlock(defaults: Required<WriterProductionDefaultsPayload>): string {
  return [
    'Production defaults:',
    `Primary medium: ${defaults.medium_type}`,
    `Narrative scope: ${defaults.narrative_scope}`,
    `Comic panel density: ${defaults.comic_panel_density}`,
    `Art style: ${defaults.art_style}`,
    `Character consistency: ${defaults.character_consistency}`,
    `Preferred output format: ${defaults.output_format}`,
    `Strict canon: ${defaults.strict_canon ? 'yes' : 'no'}`,
    `No video assumptions: ${defaults.no_video_assumptions ? 'yes' : 'no'}`,
    defaults.no_video_assumptions && defaults.medium_type === 'comic'
      ? 'Do not translate comic pages into video, trailer, camera-shot, animation, or runtime language unless this request is explicitly visual planning.'
      : '',
    defaults.strict_canon
      ? 'Treat included lore, cast, locations, style bibles, and author outline as hard continuity constraints; ask or leave gaps explicit instead of inventing canon.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function extractAuthorOutlineForPrompt(notes: Record<string, unknown> | undefined): string {
  if (!notes || typeof notes !== 'object') return '';
  const raw = notes.author_outline;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  const o = raw as Record<string, unknown>;
  const text = typeof o.text === 'string' ? o.text.trim() : '';
  if (!text) return '';
  const modeRaw = typeof o.mode === 'string' ? o.mode : 'structure';
  const mode =
    modeRaw === 'preserve' || modeRaw === 'structure' || modeRaw === 'expand'
      ? modeRaw
      : 'structure';
  const instruction =
    mode === 'preserve'
      ? 'Preserve the author outline order, named events, outcomes, and causal chain as strictly as possible. Do not replace the story; only map it into production-ready page_beats.'
      : mode === 'expand'
        ? 'Use the author outline as the required story spine. Add connective tissue, transitions, escalation, and page-level staging only where the source is sparse.'
        : 'Restructure the author outline into clean production beats while preserving its events, intent, order, and named details.';
  const cap = 16_000;
  const body = text.length <= cap ? text : `${text.slice(0, cap)}\n…(truncated)`;
  return [
    `Author-provided outline source (notes.author_outline, mode: ${mode}):`,
    instruction,
    body,
  ].join('\n');
}

/** Public API ids that work with AI Studio keys; preview ids last (may 400 "unexpected model name" on some keys). */
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const OUTLINE_TREATMENT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const PACING_REVISION_PAGE_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro-preview',
] as const;

/** Strip secrets mistakes: whitespace, quotes, accidental `models/` prefix. */
function normalizeGeminiModelId(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  let t = raw.trim();
  if (!t) return null;
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  if (t.toLowerCase().startsWith('models/')) {
    t = t.slice('models/'.length).trim();
  }
  return t || null;
}

function extractTextFromGeminiResponse(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const o = data as Record<string, unknown>;
  const candidates = o.candidates as
    | Array<{ content?: { parts?: Array<{ text?: string }> } }>
    | undefined;
  const parts = candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('');
}

function shouldTryNextGeminiModel(msg: string): boolean {
  const m = msg.toLowerCase();
  if (m.includes('not found') || m.includes('not available') || m.includes('no longer available')) return true;
  if (m.includes('unexpected model name format')) return true;
  if (m.includes('invalid') && m.includes('model')) return true;
  return false;
}

function parseJsonFromGeminiText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) return JSON.parse(fence[1].trim()) as unknown;
    throw new Error('Model returned text that is not valid JSON');
  }
}

/** Gemini generateContent with JSON MIME type (aligned with app `geminiTextApi.ts`). */
async function callGeminiJson(args: {
  system: string;
  user: string;
  preferredModel: string;
  apiKey: string;
  userParts?: GeminiContentPart[];
  /** Lower = stick closer to prompt (default 0.65). */
  temperature?: number;
  /** Gemini 2.5 thinking tokens; 0 prioritizes deterministic low-latency transforms. */
  thinkingBudget?: number;
  /** Optional Gemini structured-output schema for deterministic JSON shape. */
  responseSchema?: Record<string, unknown>;
  /** Bound the upstream model call so the Edge Function can persist a recoverable failure. */
  requestTimeoutMs?: number;
}): Promise<unknown> {
  const modelsToTry = [
    args.preferredModel,
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== args.preferredModel),
  ];

  let lastErr = '';
  for (const model of modelsToTry) {
    const body = {
      systemInstruction: { parts: [{ text: args.system }] },
      contents: [{ role: 'user', parts: [{ text: args.user }, ...(args.userParts ?? [])] }],
      generationConfig: {
        responseMimeType: 'application/json',
        ...(args.responseSchema ? { responseSchema: args.responseSchema } : {}),
        temperature: args.temperature ?? 0.65,
        ...(args.thinkingBudget !== undefined && model.startsWith('gemini-2.5-')
          ? { thinkingConfig: { thinkingBudget: args.thinkingBudget } }
          : {}),
      },
    };
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${args.apiKey}`;
    const requestTimeoutMs = args.requestTimeoutMs ?? 90_000;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch (error) {
      const name = error && typeof error === 'object' && 'name' in error
        ? String((error as { name: unknown }).name)
        : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${Math.ceil(requestTimeoutMs / 1000)} seconds`);
      }
      throw error;
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      lastErr = 'Invalid JSON from Gemini';
      continue;
    }
    if (!res.ok) {
      const errObj = (data as { error?: { message?: string } })?.error;
      const msg = errObj?.message && typeof errObj.message === 'string' ? errObj.message : res.statusText;
      lastErr = `Gemini HTTP ${res.status}: ${msg}`;
      if (shouldTryNextGeminiModel(msg) && model !== modelsToTry[modelsToTry.length - 1]) continue;
      throw new Error(lastErr);
    }
    const text = extractTextFromGeminiResponse(data).trim();
    if (!text) {
      lastErr = 'Gemini: empty completion';
      continue;
    }
    try {
      return parseJsonFromGeminiText(text);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      throw new Error(lastErr);
    }
  }
  throw new Error(lastErr || 'Gemini request failed');
}

const LORE_CARDS_PROMPT_CAP = 12_000;
const LORE_IMPORT_METADATA_RE = /<!--\s*ARCS_LORE_IMPORT_METADATA\s*\n[\s\S]*?\n-->/g;

function stripLoreImportMetadata(body: string): string {
  return body.replace(LORE_IMPORT_METADATA_RE, '').trim();
}

/** Series lore cards (writer_lore_cards) for outline / page_beats context. */
async function fetchLoreCardsDigest(supabase: SupabaseAdmin, seriesId: string): Promise<string> {
  const { data, error } = await supabase
    .from('writer_lore_cards')
    .select('title, category, body, sort_order')
    .eq('series_id', seriesId)
    .eq('include_in_prompt', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });
  if (error || !data?.length) return '';
  const rows = data as Array<{ title?: string; category?: string; body?: string; sort_order?: number }>;
  const blocks = rows.map((r) => {
    const t = (r.title ?? '').trim() || '(untitled)';
    const cat = (r.category ?? '').trim() || 'general';
    const b = stripLoreImportMetadata((r.body ?? '').trim());
    return b ? `### ${t} (${cat})\n${b}` : `### ${t} (${cat})\n(no body)`;
  });
  let s = `Series lore cards (reference — stay consistent; do not contradict without story reason):\n\n${blocks.join('\n\n')}`;
  if (s.length > LORE_CARDS_PROMPT_CAP) {
    s = `${s.slice(0, LORE_CARDS_PROMPT_CAP)}\n\n…(truncated; add or shorten lore cards in Workshop → Lore)`;
  }
  return s;
}

function buildOutlineUserPrompt(args: {
  issue: IssueRow;
  targetPages?: number;
  cast: unknown[];
  locations: unknown[];
  styleBibles: unknown[];
  loreCardsDigest?: string;
  productionDefaults: Required<WriterProductionDefaultsPayload>;
  /** Optional author instructions appended after synopsis (coverage boost, tone, etc.). */
  supplement?: string;
}): string {
  const s = args.issue.writer_series;
  const seriesBlock = s
    ? JSON.stringify(
        {
          title: s.title,
          logline: s.logline,
          genre: s.genre,
          tone: s.tone,
          target_demographic: s.target_demographic,
        },
        null,
        2,
      )
    : '{}';
  const synopsisTrim = (args.issue.synopsis ?? '').trim();
  const authorOutlineBlock = extractAuthorOutlineForPrompt(args.issue.notes);
  return [
    `Create a comic issue outline as JSON only.`,
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`.trim(),
    `Status: ${args.issue.status}`,
    `Synopsis: ${args.issue.synopsis ?? '(none)'}`,
    synopsisTrim
      ? `If synopsis is not "(none)", premise and page_beats MUST align with it.`
      : '',
    buildProductionDefaultsPromptBlock(args.productionDefaults),
    authorOutlineBlock
      ? `${authorOutlineBlock}\nThe generated outline MUST use this author outline as the source structure. Do not invent a different plot when source beats are provided.`
      : '',
    args.supplement?.trim()
      ? `Author instructions (follow unless they contradict the synopsis):\n${args.supplement.trim()}`
      : '',
    `Series context:\n${seriesBlock}`,
    args.targetPages ? `Target approximate page count for pacing: ${args.targetPages}.` : '',
    `Writer cast (reference):\n${JSON.stringify(args.cast, null, 2)}`,
    `Locations:\n${JSON.stringify(args.locations, null, 2)}`,
    `Style bibles:\n${JSON.stringify(args.styleBibles, null, 2)}`,
    args.loreCardsDigest?.trim() ? `${args.loreCardsDigest.trim()}\n` : '',
    '',
    'Return JSON matching this shape:',
    '{',
    '  "title": string (optional),',
    '  "premise": string (optional),',
    '  "acts": [ { "name"?, "goal"?, "summary"? } ] (optional),',
    '  "page_beats": [ { "page_target"?: number, "scene"?: string, "summary": string, "emotional_turn"?: string } ] (optional),',
    '  "notes": string (optional)',
    '}',
    'Each page_beats entry must include a non-empty "summary".',
    args.targetPages
      ? `Coverage rule: when target_page_count is ${args.targetPages}, include page_beats that cover the full 1..${args.targetPages} progression. Prefer one beat per page (or as close as possible) with distinct plot advancement.`
      : 'Coverage rule: provide enough page_beats to map the issue from opening through ending, not just a handful of broad beats.',
    'Do not leave middle pages as implicit blanks. If exact page numbers are uncertain, still provide sequential page_target values that span the issue.',
    'Avoid repeated summaries across adjacent page_beats; each beat must introduce a new development, escalation, reveal, or consequence.',
    'When consecutive page_beats share the same location, make each summary specify a different story beat, camera/staging idea, or new information — not three near-identical council-table moments.',
    'If the author wants a double-page spread, encode it in page_beats: e.g. page N summary starts with "Spread with page N+1:" and page N+1 summary references "right half of spread with page N" so panel generation can split left/right.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function loadIssueRow(supabase: SupabaseAdmin, issueId: string): Promise<IssueRow | null> {
  const { data: issue, error: issueErr } = await supabase
    .from('writer_issues')
    .select('id, series_id, issue_number, title, status, synopsis, notes')
    .eq('id', issueId)
    .is('deleted_at', null)
    .single();
  if (issueErr || !issue) return null;
  const { data: series } = await supabase
    .from('writer_series')
    .select('id, title, logline, genre, tone, target_demographic, notes')
    .eq('id', issue.series_id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!series) return null;
  return {
    ...(issue as Omit<IssueRow, 'writer_series' | 'notes'>),
    notes: asJsonObject((issue as { notes?: unknown }).notes),
    writer_series: series
      ? {
          ...series,
          notes: asJsonObject((series as { notes?: unknown }).notes),
        }
      : null,
  };
}

type OutlinePageBeat = {
  page_target?: number;
  summary?: string;
  scene?: string;
  emotional_turn?: string;
};

/** Scripts tab → synopsis helper → "Rules for the outline" (notes.synopsis_helper.rules). */
function extractSynopsisHelperRulesForPageBeats(notes: Record<string, unknown> | undefined): string | undefined {
  if (!notes || typeof notes !== 'object') return undefined;
  const helper = notes.synopsis_helper;
  if (!helper || typeof helper !== 'object' || Array.isArray(helper)) return undefined;
  const raw = (helper as Record<string, unknown>).rules;
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  const cap = 2000;
  return t.length <= cap ? t : `${t.slice(0, cap)}\n…(truncated)`;
}

function extractOutlineBeatContextForPage(outlineJson: unknown, pageNumber: number): string {
  if (!outlineJson || typeof outlineJson !== 'object') return '(no issue outline saved yet)';
  const o = outlineJson as {
    page_beats?: OutlinePageBeat[];
  };
  const arr = o.page_beats;
  if (!Array.isArray(arr) || arr.length === 0) {
    return `Outline has no page_beats array. Outline keys: ${Object.keys(o as object).join(', ')}`;
  }

  const withTargets = arr
    .filter((b): b is OutlinePageBeat & { page_target: number } => typeof b.page_target === 'number')
    .sort((a, b) => a.page_target - b.page_target);

  const match = arr.find((b) => b.page_target === pageNumber);
  if (match) {
    const parts: string[] = [];

    const prevSequential = [...withTargets].reverse().find((b) => b.page_target === pageNumber - 1);
    if (prevSequential) {
      parts.push(
        [
          `Continuity (page ${prevSequential.page_target} — already happened; do not repeat its key actions or restage the same story beat on this page):`,
          JSON.stringify(prevSequential, null, 2),
        ].join('\n'),
      );
    }

    parts.push(`Exact outline beat for this page:\n${JSON.stringify(match, null, 2)}`);

    const nextSequential = withTargets.find((b) => b.page_target === pageNumber + 1);
    if (nextSequential) {
      parts.push(
        [
          `CRITICAL — Reserved for page ${nextSequential.page_target} only. Do not depict, resolve, or foreclose the following beat in these panels (no full beat, no closing beat, no character exits that belong here):`,
          JSON.stringify(nextSequential, null, 2),
          `End this page after the beat above is complete; leave the reserved beat's story moves for page ${nextSequential.page_target}.`,
        ].join('\n'),
      );
    }

    return parts.join('\n\n');
  }

  if (withTargets.length > 0) {
    const prev = [...withTargets].reverse().find((b) => b.page_target < pageNumber);
    const next = withTargets.find((b) => b.page_target > pageNumber);
    if (prev && next) {
      return [
        `No exact outline beat for page ${pageNumber}. Bridge between these outline beats without repeating prior pages:`,
        `Previous (${prev.page_target}): ${JSON.stringify(prev, null, 2)}`,
        `Next (${next.page_target}): ${JSON.stringify(next, null, 2)}`,
      ].join('\n');
    }
    if (prev) {
      return [
        `No exact outline beat for page ${pageNumber}. Continue progression beyond the nearest prior beat:`,
        `Previous (${prev.page_target}): ${JSON.stringify(prev, null, 2)}`,
      ].join('\n');
    }
    if (next) {
      return [
        `No exact outline beat for page ${pageNumber}. Build toward the nearest upcoming beat:`,
        `Next (${next.page_target}): ${JSON.stringify(next, null, 2)}`,
      ].join('\n');
    }
  }

  const mappedIndex = Math.min(arr.length - 1, Math.max(0, pageNumber - 1));
  const mappedBeat = arr[mappedIndex];
  const previousBeat = mappedIndex > 0 ? arr[mappedIndex - 1] : null;
  const nextBeat = mappedIndex < arr.length - 1 ? arr[mappedIndex + 1] : null;
  return [
    `Outline page_beats are sparse or missing page_target values. Use this sequence window for page ${pageNumber}:`,
    `Mapped beat (index ${mappedIndex + 1}/${arr.length}): ${JSON.stringify(mappedBeat, null, 2)}`,
    previousBeat ? `Previous beat: ${JSON.stringify(previousBeat, null, 2)}` : '',
    nextBeat ? `Next beat: ${JSON.stringify(nextBeat, null, 2)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildPageBeatsUserPrompt(args: {
  page: { page_number: number; beats_json: unknown; script_text: string | null };
  issue: IssueRow;
  cast: unknown[];
  locations: unknown[];
  styleBibles: unknown[];
  latestOutline: unknown;
  priorPagesDigest: string;
  directorNotesForBeats?: string;
  loreCardsDigest?: string;
  visualReferenceDigest?: string;
  visualReferenceImagesLoaded?: string[];
  visualReferenceImagesSkipped?: string[];
  productionDefaults: Required<WriterProductionDefaultsPayload>;
}): string {
  const outlineBeatContext = extractOutlineBeatContextForPage(args.latestOutline, args.page.page_number);
  const outlineBeat =
    outlineBeatContext.length <= PAGE_BEATS_PROMPT_CAPS.outlineBeat
      ? outlineBeatContext
      : `${outlineBeatContext.slice(0, PAGE_BEATS_PROMPT_CAPS.outlineBeat)}\n…(truncated)`;
  const directorTrim = args.directorNotesForBeats?.trim();
  const synopsisRules = extractSynopsisHelperRulesForPageBeats(args.issue.notes);
  return [
    `Create panel-by-panel beats for ONE comic book page as JSON.`,
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`,
    `Synopsis: ${args.issue.synopsis ?? '(none)'}`,
    buildProductionDefaultsPromptBlock(args.productionDefaults),
    synopsisRules
      ? `Author rules for this issue (from Scripts → synopsis helper, notes.synopsis_helper.rules; apply on every page-beats call including batch):\n${synopsisRules}`
      : '',
    `This page number: ${args.page.page_number}`,
    `Prior pages context (most recent first; do NOT repeat):\n${args.priorPagesDigest || '(none)'}`,
    `Existing beats_json (may be null): ${jsonForPrompt(args.page.beats_json ?? null, PAGE_BEATS_PROMPT_CAPS.existingBeats)}`,
    `Existing script_text preview: ${(args.page.script_text ?? '').slice(0, 500) || '(none)'}`,
    `Issue outline context for this page:\n${outlineBeat}`,
    directorTrim
      ? `Author / director notes for THIS page-beats pass only (honor unless they conflict with synopsis):\n${directorTrim}`
      : '',
    `Cast:\n${jsonForPrompt(args.cast, PAGE_BEATS_PROMPT_CAPS.cast)}`,
    `Locations:\n${jsonForPrompt(args.locations, PAGE_BEATS_PROMPT_CAPS.locations)}`,
    `Style bibles:\n${jsonForPrompt(args.styleBibles, PAGE_BEATS_PROMPT_CAPS.styleBibles)}`,
    args.loreCardsDigest?.trim()
      ? `Series lore cards (reference only; use for texture and consistency):\n${args.loreCardsDigest.trim()}`
      : '',
    args.visualReferenceDigest?.trim()
      ? [
          'Issue visual references (hard visual canon from attached vault images):',
          jsonForPrompt(args.visualReferenceDigest.trim(), PAGE_BEATS_PROMPT_CAPS.visualReferences),
          args.visualReferenceImagesLoaded && args.visualReferenceImagesLoaded.length > 0
            ? `Attached image parts loaded for: ${args.visualReferenceImagesLoaded.join(', ')}`
            : 'No image parts were loaded; use the text labels and URLs as reference records.',
          args.visualReferenceImagesSkipped && args.visualReferenceImagesSkipped.length > 0
            ? `Image parts skipped: ${args.visualReferenceImagesSkipped.join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    '',
    'Return JSON:',
    '{ "page_number_ref": number (optional), "one_line_hook": string (optional), "characters": string[], "locations": string[], "art_style": string, "panels": [ { "index"?: number, "action": string (required), "composition"?: string, "emotion"?: string, "dialogue_placeholder"?: string, "sfx"?: string } ] }',
    'Must have at least one panel; every panel needs non-empty "action".',
    `Set "art_style" to this exact resolved production default unless the page has a more specific saved style bible instruction: ${JSON.stringify(args.productionDefaults.art_style)}.`,
    'Set "characters" to the character names who appear on this page. Pull names only from the exact outline beat, synopsis/source outline/helper cast text, cast rows, or lore cards. If no source-grounded character appears, return an empty array.',
    'Set "locations" to the page settings/locations. Pull values only from the outline beat scene, synopsis/source outline/helper locations text, location rows, or lore cards. If no source-grounded setting appears, return an empty array.',
    'When Issue visual references include a matching character, location, or prop, use that reference as canon for appearance, costume, silhouette, materials, colors, and design language. Do not invent or redesign attached vault references.',
    'If a visually referenced character, location, or prop appears on this page, use the exact reference label in characters, locations, panel action, or composition as appropriate.',
    'Do not invent new character names, species, factions, buildings, rooms, or settings just to fill characters/locations metadata.',
    'Hard constraint: advance the story; do not re-state page 1 beats on later pages.',
    'When the outline context includes "Reserved for page N only", those events must not appear in this page\'s panels — stop one beat earlier.',
    'When the outline context includes "Continuity (page P — already happened)", do not repeat that beat\'s key actions; depict only the current page\'s outline beat.',
    'Do not reuse key actions from prior pages. If outline context is sparse, infer the next logical development from the nearest outline beats plus prior-page digest.',
    'Flesh out concrete visual specifics in each panel (props, blocking, lighting, background detail, character business) — not generic talking-head repeats when the scene continues across pages.',
    'Vary layout across panels on this page: mix wide, medium, close-up, unusual crops, Dutch angle, silhouette, over-shoulder, POV, inset panels, or asymmetric grid when it serves the beat. State approximate panel shape in composition when helpful (e.g. "tall narrow strip", "full-width horizontal band", "large hero panel + small reaction strip").',
    'If the author notes a double-page spread, describe which content sits on this page (left vs right) and reference the gutter explicitly in composition for that page.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildDraftDialogueUserPrompt(args: {
  page: { page_number: number; beats_json: unknown; script_text: string | null };
  issue: IssueRow;
  cast: unknown[];
  styleBibles: unknown[];
  dialogueStyle: 'comic_script' | 'screenplay_light';
  productionDefaults: Required<WriterProductionDefaultsPayload>;
}): string {
  const beatsStr = args.page.beats_json
    ? JSON.stringify(args.page.beats_json, null, 2)
    : '(no beats yet — write dialogue from issue context and cast only)';
  const styleNote =
    args.dialogueStyle === 'screenplay_light'
      ? 'Use light screenplay formatting (CHARACTER: line). Plain text inside script_text.'
      : 'Use comic-style lettering cues where helpful (e.g. CHARACTER: word balloon). Plain text only.';
  return [
    `Write dialogue and short captions for ONE comic page. Output JSON only: one key "script_text" (string, use newlines between lines).`,
    styleNote,
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`,
    `Synopsis: ${args.issue.synopsis ?? '(none)'}`,
    buildProductionDefaultsPromptBlock(args.productionDefaults),
    `Page number: ${args.page.page_number}`,
    `Panel beats JSON:\n${beatsStr}`,
    `Prior script (you may replace):\n${(args.page.script_text ?? '').slice(0, 4000) || '(empty)'}`,
    `Cast (use names consistently):\n${JSON.stringify(args.cast, null, 2)}`,
    `Style bibles:\n${JSON.stringify(args.styleBibles, null, 2)}`,
    'Return exactly: { "script_text": string }',
  ].join('\n');
}

function buildPacingRegenerationPreviewUserPrompt(args: {
  issue: IssueRow;
  pages: Array<{ id: string; page_number: number; beats_json: unknown; script_text: string | null }>;
  latestOutline: unknown;
  pacingReview: unknown;
  includeBeats: boolean;
  includeDialogue: boolean;
  cast: unknown[];
  locations: unknown[];
  styleBibles: unknown[];
  loreCardsDigest?: string;
  productionDefaults: Required<WriterProductionDefaultsPayload>;
}): string {
  return [
    'Preview pacing-driven replacements for selected comic pages. Output JSON only. Do not mention persistence.',
    'The caller will show current vs proposed content and will only save explicitly accepted proposals.',
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`,
    `Synopsis: ${args.issue.synopsis ?? '(none)'}`,
    buildProductionDefaultsPromptBlock(args.productionDefaults),
    `Preview requested for page beats: ${args.includeBeats ? 'yes' : 'no'}`,
    `Preview requested for dialogue: ${args.includeDialogue ? 'yes' : 'no'}`,
    `Latest pacing review:\n${jsonForPrompt(args.pacingReview ?? null, 6000)}`,
    `Latest outline:\n${jsonForPrompt(args.latestOutline ?? null, 9000)}`,
    `Selected pages with current saved content:\n${jsonForPrompt(args.pages, 16000)}`,
    `Cast:\n${jsonForPrompt(args.cast, PAGE_BEATS_PROMPT_CAPS.cast)}`,
    `Locations:\n${jsonForPrompt(args.locations, PAGE_BEATS_PROMPT_CAPS.locations)}`,
    `Style bibles:\n${jsonForPrompt(args.styleBibles, PAGE_BEATS_PROMPT_CAPS.styleBibles)}`,
    args.loreCardsDigest?.trim()
      ? `Series lore cards (hard continuity constraints when strict canon is enabled):\n${args.loreCardsDigest.trim()}`
      : '',
    '',
    'Return exactly this shape:',
    args.includeBeats && !args.includeDialogue
      ? '{ "pages": [ { "page_id": string, "page_number": number, "reason"?: string, "proposed_beats_json": pageBeatsJson } ] }'
      : !args.includeBeats && args.includeDialogue
        ? '{ "pages": [ { "page_id": string, "page_number": number, "reason"?: string, "proposed_script_text": string } ] }'
        : '{ "pages": [ { "page_id": string, "page_number": number, "reason"?: string, "proposed_beats_json": pageBeatsJson, "proposed_script_text": string } ] }',
    'Rules:',
    '- Include exactly one object for each selected page id.',
    '- Echo page_id and page_number exactly from the selected pages.',
    '- If page beats were requested, proposed_beats_json must satisfy the page beats schema with non-empty panels[].action.',
    '- If dialogue was requested, proposed_script_text must be plain text suitable for a comic script.',
    '- Omit every proposal field that was not requested. Do not generate the unrequested child layer.',
    '- Respect pacing review cut/add/rebalance guidance while preserving author outline, lore, cast names, locations, and production defaults.',
    '- Keep proposals concise enough for direct review; do not include markdown fences.',
  ]
    .filter(Boolean)
    .join('\n');
}

function summarizePageBeatActions(beatsJson: unknown): string {
  const panels = (beatsJson as { panels?: unknown } | null)?.panels;
  if (!Array.isArray(panels) || panels.length === 0) return '(no panel beats)';
  const actions = panels
    .map((p) => {
      const action = (p as { action?: unknown } | null)?.action;
      return typeof action === 'string' ? action.trim() : '';
    })
    .filter(Boolean);
  if (actions.length === 0) return '(panel actions missing)';
  return actions.slice(0, 4).join(' | ');
}

function buildPagesDigest(
  pages: Array<{ page_number: number; beats_json: unknown; script_text: string | null }>,
): string {
  return JSON.stringify(
    pages.map((p) => ({
      page_number: p.page_number,
      panel_count: Array.isArray((p.beats_json as { panels?: unknown })?.panels)
        ? ((p.beats_json as { panels: unknown[] }).panels.length)
        : null,
      beat_preview: summarizePageBeatActions(p.beats_json),
      script_preview: (p.script_text ?? '').slice(0, 280),
    })),
    null,
    2,
  );
}

/** Caps JSON blobs in prompts to avoid huge strings (memory / CPU → Supabase HTTP 546 WORKER_LIMIT). */
function jsonForPrompt(value: unknown, maxChars: number): string {
  try {
    const s = JSON.stringify(value, null, 2);
    if (s.length <= maxChars) return s;
    return `${s.slice(0, maxChars)}\n…(truncated; prompt size cap)`;
  } catch {
    return String(value).slice(0, maxChars);
  }
}

const PAGE_BEATS_PROMPT_CAPS = {
  cast: 8000,
  locations: 4000,
  styleBibles: 8000,
  visualReferences: 6000,
  /** Prior full beats_json when regenerating; large panels blow past Edge limits if unbounded. */
  existingBeats: 14_000,
  outlineBeat: 6000,
} as const;

const WRITER_VISUAL_REFERENCES_NOTES_KEY = 'writer_visual_references';
const WRITER_VISUAL_REFERENCE_IMAGE_LIMIT = 6;
const WRITER_VISUAL_REFERENCE_MAX_BYTES = 4_000_000;
const ARCS_GENERATIONS_BUCKET = 'arcs-generations';

type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const VALID_VISUAL_REFERENCE_KINDS = new Set<WriterVisualReferenceKind>(['character', 'location', 'prop']);
const VALID_VISUAL_REFERENCE_SOURCES = new Set<WriterVisualReferenceSource>(['character_vault', 'asset_vault']);

function sanitizeVisualReferenceText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function defaultVisualReferenceKind(source: WriterVisualReferenceSource): WriterVisualReferenceKind {
  return source === 'character_vault' ? 'character' : 'prop';
}

function readIssueVisualReferences(notes: Record<string, unknown>): WriterVisualReference[] {
  const raw = asJsonObject(notes)[WRITER_VISUAL_REFERENCES_NOTES_KEY];
  if (!Array.isArray(raw)) return [];

  const refs: WriterVisualReference[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const sourceRaw = sanitizeVisualReferenceText(row.source);
    if (!VALID_VISUAL_REFERENCE_SOURCES.has(sourceRaw as WriterVisualReferenceSource)) continue;
    const source = sourceRaw as WriterVisualReferenceSource;
    const sourceId = sanitizeVisualReferenceText(row.source_id ?? row.sourceId);
    const label = sanitizeVisualReferenceText(row.label);
    const imageUrl = sanitizeVisualReferenceText(row.image_url ?? row.imageUrl);
    if (!sourceId || !label || !imageUrl) continue;

    const id = sanitizeVisualReferenceText(row.id) || `${source}:${sourceId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const kindRaw = sanitizeVisualReferenceText(row.kind);
    refs.push({
      id,
      source,
      sourceId,
      sourceLabel: sanitizeVisualReferenceText(row.source_label ?? row.sourceLabel) || sourceId,
      label,
      kind: VALID_VISUAL_REFERENCE_KINDS.has(kindRaw as WriterVisualReferenceKind)
        ? (kindRaw as WriterVisualReferenceKind)
        : defaultVisualReferenceKind(source),
      imageUrl,
      note: sanitizeVisualReferenceText(row.note) || undefined,
    });
  }
  return refs;
}

function buildIssueVisualReferenceDigest(refs: WriterVisualReference[]): string {
  if (refs.length === 0) return '';
  return refs
    .map((ref, index) => {
      const role =
        ref.kind === 'character'
          ? 'Character design'
          : ref.kind === 'location'
            ? 'Location or set design'
            : 'Prop or asset design';
      return [
        `${index + 1}. ${role}: ${ref.label}`,
        `Source: ${ref.source === 'character_vault' ? 'Character Vault' : 'Asset Vault'} / ${ref.sourceLabel}`,
        `Image URL: ${ref.imageUrl}`,
        ref.note ? `Note: ${ref.note}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function base64FromArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function extractArcsGenerationsObjectPath(imageUrl: string): string | null {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();
  const match = trimmed.match(/\/storage\/v1\/object\/(?:public|sign)\/arcs-generations\/([^?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function isFreshSignedArcsUrl(url: string): boolean {
  return /\/object\/sign\/arcs-generations\//.test(url) && url.includes('token=');
}

function isObjectNotFoundStorageError(err: { message?: string } | null | undefined): boolean {
  const message = (err?.message ?? '').toLowerCase();
  return message.includes('not found') || message.includes('does not exist');
}

async function createSignedVisualReferenceUrl(
  supabase: SupabaseAdmin,
  imageUrl: string,
): Promise<string> {
  if (!imageUrl || isFreshSignedArcsUrl(imageUrl)) return imageUrl;
  const path = extractArcsGenerationsObjectPath(imageUrl);
  if (!path) return imageUrl;

  const first = await supabase.storage.from(ARCS_GENERATIONS_BUCKET).createSignedUrl(path, 3600);
  if (first.data?.signedUrl && !first.error) return first.data.signedUrl;

  if (!isObjectNotFoundStorageError(first.error) || path.includes('/')) return imageUrl;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return imageUrl;

  const nested = `${uid}/${path}`;
  const second = await supabase.storage.from(ARCS_GENERATIONS_BUCKET).createSignedUrl(nested, 3600);
  if (second.data?.signedUrl && !second.error) return second.data.signedUrl;
  return imageUrl;
}

async function fetchVisualReferenceImageParts(
  supabase: SupabaseAdmin,
  refs: WriterVisualReference[],
): Promise<{ parts: GeminiContentPart[]; loaded: string[]; skipped: string[] }> {
  const parts: GeminiContentPart[] = [];
  const loaded: string[] = [];
  const skipped: string[] = [];

  for (const ref of refs.slice(0, WRITER_VISUAL_REFERENCE_IMAGE_LIMIT)) {
    try {
      const imageUrl = await createSignedVisualReferenceUrl(supabase, ref.imageUrl);
      const res = await fetch(imageUrl);
      if (!res.ok) {
        skipped.push(`${ref.label} (${res.status})`);
        continue;
      }
      const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
      if (!mimeType.startsWith('image/')) {
        skipped.push(`${ref.label} (not an image)`);
        continue;
      }
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > WRITER_VISUAL_REFERENCE_MAX_BYTES) {
        skipped.push(`${ref.label} (image too large)`);
        continue;
      }
      parts.push({
        text: `Visual reference image for ${ref.kind}: ${ref.label}. Use this as canon; do not redesign it.`,
      });
      parts.push({ inlineData: { mimeType, data: base64FromArrayBuffer(buffer) } });
      loaded.push(ref.label);
    } catch (e) {
      skipped.push(`${ref.label} (${e instanceof Error ? e.message : 'fetch failed'})`);
    }
  }

  if (refs.length > WRITER_VISUAL_REFERENCE_IMAGE_LIMIT) {
    skipped.push(`${refs.length - WRITER_VISUAL_REFERENCE_IMAGE_LIMIT} extra reference(s) over image cap`);
  }
  return { parts, loaded, skipped };
}

function pageHasPanelBeats(beatsJson: unknown): boolean {
  const panels = (beatsJson as { panels?: unknown } | null)?.panels;
  return Array.isArray(panels) && panels.length > 0;
}

async function executeSinglePageBeats(
  supabase: SupabaseAdmin,
  page: { id: string; issue_id: string; page_number: number; beats_json: unknown; script_text: string | null },
  issueRow: IssueRow,
  geminiModel: string,
  geminiKey: string,
  directorNotesForBeats?: string,
  productionDefaults?: Required<WriterProductionDefaultsPayload>,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const sid = issueRow.series_id;
  const [castRes, locRes, bibleRes, outlineRes, priorPagesRes, loreDigest] = await Promise.all([
    supabase.from('writer_cast').select('*').eq('series_id', sid),
    supabase.from('writer_locations').select('*').eq('series_id', sid),
    supabase.from('writer_style_bibles').select('*').eq('series_id', sid),
    supabase
      .from('writer_issue_outlines')
      .select('outline_json')
      .eq('issue_id', page.issue_id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('writer_pages')
      .select('page_number, beats_json, script_text')
      .eq('issue_id', page.issue_id)
      .lt('page_number', page.page_number)
      .order('page_number', { ascending: false })
      .limit(5),
    fetchLoreCardsDigest(supabase, sid),
  ]);
  const system =
    'You are a comics writer\'s room assistant. Output only valid JSON. No markdown fences. Each panel beat must be a clear visual direction.';
  const priorPagesDigest = buildPagesDigest((priorPagesRes.data as any[]) ?? []);
  const visualReferences = readIssueVisualReferences(issueRow.notes);
  const visualReferenceDigest = buildIssueVisualReferenceDigest(visualReferences);
  const visualReferenceImages = await fetchVisualReferenceImageParts(supabase, visualReferences);
  const userPrompt = buildPageBeatsUserPrompt({
    page,
    issue: issueRow,
    cast: castRes.data ?? [],
    locations: locRes.data ?? [],
    styleBibles: bibleRes.data ?? [],
    latestOutline: outlineRes.data?.outline_json ?? null,
    priorPagesDigest,
    directorNotesForBeats,
    loreCardsDigest: loreDigest,
    visualReferenceDigest,
    visualReferenceImagesLoaded: visualReferenceImages.loaded,
    visualReferenceImagesSkipped: visualReferenceImages.skipped,
    productionDefaults: productionDefaults ?? resolveProductionDefaultsPayload(issueRow),
  });
  let beatsJson: unknown;
  try {
    beatsJson = await generatePageBeatsJsonWithMalformedRetry(
      (temperature) => callGeminiJson({
        system,
        user: userPrompt,
        userParts: visualReferenceImages.parts,
        preferredModel: geminiModel,
        apiKey: geminiKey,
        temperature,
        responseSchema: PAGE_BEATS_GEMINI_RESPONSE_SCHEMA,
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
  const beatsParsed = pageBeatsJsonSchema.safeParse(beatsJson);
  if (!beatsParsed.success) {
    return { ok: false, message: beatsParsed.error.message };
  }
  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from('writer_pages')
    .update({ beats_json: beatsParsed.data, updated_at: now })
    .eq('id', page.id);
  if (upErr) {
    return { ok: false, message: upErr.message };
  }
  return { ok: true, data: beatsParsed.data };
}

function getOutlinePageBeatsCount(outlineJson: unknown): number {
  if (!outlineJson || typeof outlineJson !== 'object') return 0;
  const arr = (outlineJson as { page_beats?: unknown }).page_beats;
  return Array.isArray(arr) ? arr.length : 0;
}

function buildPacingReviewUserPrompt(args: {
  issue: IssueRow;
  outlineJson: unknown;
  pages: Array<{ page_number: number; beats_json: unknown; script_text: string | null }>;
  scriptPages: number;
  outlineBeats: number;
  /** Author planning target from client (Outline tab); omit when not sent. */
  targetPages: number | null;
}): string {
  const targetLine =
    args.targetPages != null
      ? `Author planning target (Outline tab): ${args.targetPages} pages.`
      : 'Author planning target: not provided — treat script length as the baseline unless the outline implies a different intended length.';

  return [
    `Analyze comic issue pacing. Output JSON only (no markdown).`,
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`,
    `Synopsis: ${args.issue.synopsis ?? '(none)'}`,
    '',
    'Measured counts (trust these exact numbers — echo them in length_alignment):',
    `- script_pages: ${args.scriptPages} (rows in this issue’s script/page table)`,
    `- outline_beats: ${args.outlineBeats} (entries in outline page_beats array, if any)`,
    `- ${targetLine}`,
    '',
    `Latest outline JSON:\n${JSON.stringify(args.outlineJson ?? {}, null, 2).slice(0, 12000)}`,
    `Per-page digest (panel counts + script previews):\n${buildPagesDigest(args.pages)}`,
    '',
    'Reconcile the three lengths: planning target (if any), outline beat map, and actual script pages. Editorial judgment — aim for strong pacing (score 10) as a goal, not a formula.',
    '',
    'Return JSON shape:',
    '{',
    '  "overall_pacing": string (required),',
    '  "score_1_to_10"?: number,',
    '  "strengths"?: string[],',
    '  "risks"?: string[],',
    '  "emotional_arc"?: { "summary": string, "risks"?: string[], "suggestions"?: string[] },',
    '  "page_level_notes"?: [ { "page_number": number, "note": string } ],',
    '  "suggestions"?: string[],',
    '  "length_alignment": {',
    '      "target_pages"?: number,',
    '      "script_pages": number (MUST match measured script_pages),',
    '      "outline_beats": number (MUST match measured outline_beats),',
    '',
    '      "recommended_pages": { "exact": number } OR { "min": number, "max": number },',
    '      "recommended_action"?: "change_target" | "cut_beats" | "add_beats" | "keep_target",',
    '',
    '      "suggested_page_delta": number (signed: positive = add pages, negative = trim pages; estimate toward score-10 pacing),',
    '      "suggested_beat_delta"?: number (optional, same sign convention for outline beats),',
    '',
    '      "cut_suggestions"?: string[] (concrete beat-level edits to reduce length),',
    '      "add_suggestions"?: string[] (concrete beat-level additions to increase length),',
    '      "assumptions"?: string[] (panel density / spreads / silent beats assumptions),',
    '',
    '      "rationale": string (explain the recommendation and how it improves pacing)',
    '    }',
    '}',
    '',
    'Length recommendation rules (must follow):',
    '- Always include length_alignment.',
    '- Always include recommended_pages derived from the outline (editorial judgment, not a formula).',
    '- If target_pages is provided and differs from recommended_pages: set recommended_action and include either cut_suggestions or add_suggestions (or recommend changing the target).',
    '- Use the measured script_pages and outline_beats exactly.',
    '- Include emotional_arc when the issue has enough story material: summarize the emotional progression, risks, and concrete revision suggestions.',
  ].join('\n');
}

function buildCanonCheckUserPrompt(args: {
  issue: IssueRow;
  cast: unknown[];
  locations: unknown[];
  styleBibles: unknown[];
  outlineJson: unknown;
  pages: Array<{ page_number: number; beats_json: unknown; script_text: string | null }>;
}): string {
  return [
    `Check this comic issue against series bible / cast / tone for canon and consistency. Output JSON only.`,
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`,
    `Synopsis: ${args.issue.synopsis ?? '(none)'}`,
    `Cast:\n${JSON.stringify(args.cast, null, 2).slice(0, 8000)}`,
    `Locations:\n${JSON.stringify(args.locations, null, 2).slice(0, 4000)}`,
    `Style bibles:\n${JSON.stringify(args.styleBibles, null, 2).slice(0, 8000)}`,
    `Outline:\n${JSON.stringify(args.outlineJson ?? {}, null, 2).slice(0, 8000)}`,
    `Page scripts (truncated):\n${buildPagesDigest(args.pages)}`,
    '',
    'Return JSON:',
    '{',
    '  "summary": string (required),',
    '  "violations"?: [ { "severity": "low"|"medium"|"high", "detail": string, "suggestion"?: string } ],',
    '  "aligned_elements"?: string[],',
    '  "character_utilization"?: { "summary": string, "underused"?: string[], "overused"?: string[], "suggestions"?: string[] },',
    '  "worldbuilding_density"?: { "summary": string, "dense_pages"?: number[], "thin_pages"?: number[], "suggestions"?: string[] }',
    '}',
    'Audit requirements:',
    '- Treat continuity as canon alignment: named facts, page beats, dialogue, cast/location/style bible consistency.',
    '- Character utilization should call out source-grounded cast usage patterns only; do not invent unseen characters.',
    '- Worldbuilding density should identify overloaded or under-described pages/settings using outline/page/source text only.',
  ].join('\n');
}

function buildShotPlanUserPrompt(args: {
  issue: IssueRow;
  outlineJson: unknown;
  pages: Array<{ page_number: number; beats_json: unknown; script_text: string | null }>;
  creativeBrief?: string;
  productionDefaults: Required<WriterProductionDefaultsPayload>;
}): string {
  const brief = args.creativeBrief?.trim()
    ? `Director / creative brief:\n${args.creativeBrief.trim()}\n`
    : '';
  return [
    `Create a shot list for adapting this comic issue to motion (trailers, animatic, or live-action planning). Output JSON only.`,
    brief,
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`,
    buildProductionDefaultsPromptBlock(args.productionDefaults),
    args.productionDefaults.no_video_assumptions && args.productionDefaults.medium_type === 'comic'
      ? 'Visual planning note: this is a comic-first storyboard/image planning context. Use panel, page, spread, and image-reference language unless the author explicitly changed the medium to video.'
      : '',
    `Outline:\n${JSON.stringify(args.outlineJson ?? {}, null, 2).slice(0, 10000)}`,
    `Pages:\n${buildPagesDigest(args.pages)}`,
    '',
    'Return JSON:',
    '{',
    '  "title"?: string,',
    '  "shots": [',
    '    { "shot_index": number (1-based order), "scene_ref"?: string, "shot_type"?: string,',
    '      "description": string (required), "duration_seconds"?: number, "audio_notes"?: string }',
    '  ]',
    '}',
    'At least one shot; descriptions must be filmable.',
  ].join('\n');
}

function buildIdeaAssistUserPrompt(args: {
  issue: IssueRow;
  prompt: string;
  includeLeft: boolean;
  includeMiddle: boolean;
  includeRight: boolean;
  contextLeft?: string;
  contextMiddle?: string;
  contextRight?: string;
  pageNumber?: number | null;
}): string {
  const s = args.issue.writer_series;
  const seriesBlock = s
    ? JSON.stringify(
        {
          title: s.title,
          logline: s.logline,
          genre: s.genre,
          tone: s.tone,
          target_demographic: s.target_demographic,
        },
        null,
        2,
      )
    : '{}';

  const blocks: string[] = [];
  if (args.includeLeft && args.contextLeft?.trim()) {
    blocks.push(`LEFT COLUMN DIGEST:\n${args.contextLeft.trim()}`);
  }
  if (args.includeMiddle && args.contextMiddle?.trim()) {
    blocks.push(`MIDDLE COLUMN DIGEST:\n${args.contextMiddle.trim()}`);
  }
  if (args.includeRight && args.contextRight?.trim()) {
    blocks.push(`RIGHT COLUMN DIGEST:\n${args.contextRight.trim()}`);
  }

  return [
    `You are a senior comics story editor + writers' room partner.`,
    `Help the author with brainstorming, rewrites, continuity checks, and craft — but do not claim database facts that are not in the provided context.`,
    '',
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`,
    `Status: ${args.issue.status}`,
    `Synopsis: ${args.issue.synopsis ?? '(none)'}`,
    args.pageNumber != null ? `Focused page number (if provided): ${args.pageNumber}` : '',
    `Series context:\n${seriesBlock}`,
    '',
    `Author request:\n${args.prompt.trim()}`,
    '',
    blocks.length ? `Context (may be partial/truncated on the client):\n\n${blocks.join('\n\n')}` : 'Context: (none provided)',
    '',
    'Output JSON only (no markdown fences). Return keys:',
    '{',
    '  "answer_markdown": string (required; Markdown is OK inside the string),',
    '  "title"?: string,',
    '  "bullets"?: string[],',
    '  "next_steps"?: string[],',
    '  "risks"?: string[]',
    '}',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function guidedComicActionLabel(action: string): string {
  return action.replace(/_/g, ' ');
}

function guidedComicActionGuidance(action: string): string[] {
  switch (action) {
    case 'improve_premise':
      return [
        'Phase 1 story intake: act as a co-writer expanding rough intent.',
        'Offer a stronger premise without judging structure, pacing, hook, midpoint, climax, or readiness.',
      ];
    case 'suggest_conflict_stakes_ending':
      return [
        'Phase 1 story intake: generate possible conflicts, stakes, and ending directions from the rough brief.',
        'Do not critique missing outline beats or imply the user has failed to provide structure.',
      ];
    case 'suggest_character_dynamics':
      return [
        'Phase 1 story intake: suggest character relationships, tensions, alliances, or emotional dynamics.',
        'Return suggestions and optional storyForm replacements only; do not evaluate pacing or readiness.',
      ];
    case 'generate_story_foundation':
      return [
        'Phase 1 story intake: build a helpful story foundation from premise, characters, setting, conflict, and ending goal.',
        'Do not include pacingNotes or readiness critique. First help create structure before evaluating structure.',
      ];
    case 'generate_issue_outline':
      return [
        'Phase 2 outline generation: create editable structural beats for opening hook, rising action, midpoint, climax, ending beat, and page estimate if useful.',
        'This is generation, not grading. Avoid readiness language unless the user later asks for review.',
      ];
    case 'review_readiness':
    case 'find_export_gaps':
    case 'suggest_layout_pacing':
      return [
        'Phase 3 readiness review: offer optional editorial assistance against existing outline/page structure.',
        'Keep the tone collaborative and avoid grading language.',
      ];
    default:
      return [];
  }
}

function buildGuidedComicAssistUserPrompt(args: {
  action: string;
  context: unknown;
  selectedPageNumber?: number;
  selectedPanelId?: string;
}): string {
  const actionGuidance = guidedComicActionGuidance(args.action);
  return [
    `You are a senior comics story editor helping inside a beginner-friendly Guided Comic Flow.`,
    `Reuse Writers' Workshop craft standards, but keep the answer lightweight and directly applicable to the guided local draft.`,
    `Do not generate images, export files, modify routes, or assume database state. Do not place dialogue or captions onto images.`,
    `Never ask to overwrite user text. Return preview suggestions only; the client will ask for confirmation before applying.`,
    '',
    `Requested guided action: ${guidedComicActionLabel(args.action)}.`,
    args.selectedPageNumber ? `Selected page number: ${args.selectedPageNumber}.` : '',
    args.selectedPanelId ? `Selected panel id: ${args.selectedPanelId}.` : '',
    ...actionGuidance,
    '',
    `Guided comic context JSON:\n${JSON.stringify(args.context, null, 2)}`,
    '',
    'Output JSON only (no markdown fences). Return any useful keys from this shape:',
    '{',
    '  "title"?: string,',
    '  "summary"?: string,',
    '  "suggestions"?: string[],',
    '  "replacements"?: {',
    '    "setupForm"?: { "premise"?: string, "genre"?: string, "tone"?: string },',
    '    "storyForm"?: { "premise"?: string, "mainCharacters"?: string, "conflict"?: string, "setting"?: string, "endingGoal"?: string },',
    '    "artDirection"?: { "continuityNotes"?: string, "artStyle"?: string, "renderingStyle"?: string, "colorMood"?: string, "lighting"?: string }',
    '  },',
    '  "outlineBeats"?: [ { "id"?: string, "title"?: string, "description": string } ],',
    '  "pageUpdates"?: [ { "pageNumber": number, "summary"?: string, "panelCount"?: string, "keyCharacters"?: string, "keyLocation"?: string, "panelBeats"?: string[], "layoutTemplate"?: "auto"|"three-panel"|"three-panel-wide-top"|"three-panel-wide-bottom"|"four-panel"|"six-panel-grid"|"splash", "layoutIntent"?: "feature"|"wide"|"tall"|"normal" } ],',
    '  "pacingNotes"?: string[],',
    '  "referenceNeeds"?: [ { "type": "character"|"location"|"npc"|"prop"|"style", "name": string, "reason"?: string } ],',
    '  "dialogueNotes"?: string[],',
    '  "narrationNotes"?: string[]',
    '}',
    '',
    'For selected-page or selected-panel actions, only include updates for the selected target.',
    'Layout templates must be one of the listed layoutTemplate values. Layout intent must be one of feature, wide, tall, or normal. Use "three-panel-wide-bottom" for two panels over one wide rectangle; do not recommend layouts or intents the client cannot select.',
    'For dialogue/narration, return notes only; do not write full balloon placement instructions.',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_API_KEY');
    const geminiModel =
      normalizeGeminiModelId(Deno.env.get('GEMINI_MODEL')) ?? DEFAULT_GEMINI_MODEL;

    if (!supabaseUrl || !anonKey) {
      return Response.json(
        {
          success: false,
          error: 'Server misconfigured: Supabase URL or anon key missing',
          details:
            'Edge Functions need SUPABASE_ANON_KEY (auto-injected on Supabase hosting). DB calls use the caller JWT so RLS applies.',
        },
        { status: 500, headers: corsHeaders },
      );
    }
    if (!geminiKey) {
      return Response.json(
        {
          success: false,
          error: 'Server misconfigured: GEMINI_API_KEY not set',
          details: 'Set the same Google AI key you use for VITE_GEMINI_API_KEY: supabase secrets set GEMINI_API_KEY=...',
        },
        { status: 500, headers: corsHeaders },
      );
    }

    // Auth: we validate JWT here because verify_jwt is disabled in config.toml.
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice('bearer '.length).trim() : '';
    if (!token) {
      return Response.json(
        { success: false, error: 'Missing JWT', details: 'Send Authorization: Bearer <access_token>' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await req.json().catch(() => null);
    const parsedReq = writerToolsRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      return Response.json(
        { success: false, error: 'Invalid request', details: parsedReq.error.message },
        { status: 400, headers: corsHeaders },
      );
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return Response.json(
        { success: false, error: 'Invalid JWT', details: authErr.message },
        { status: 401, headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'pacing_revision_outline_preview') {
      const { issue_id } = parsedReq.data;
      const issue = await loadIssueRow(supabase, issue_id);
      if (!issue) {
        return Response.json(
          { success: false, error: 'Issue not found' },
          { status: 404, headers: corsHeaders },
        );
      }
      const cachedPacingReview = asJsonObject(readWriterToolCache(issue.notes).pacing_review);
      const pacingReview = cachedPacingReview.result;
      if (pacingReview == null) {
        return Response.json(
          {
            success: false,
            error: 'Run Pacing Review first',
            details: 'Create Revision Set requires a saved Pacing Review for this issue.',
          },
          { status: 409, headers: corsHeaders },
        );
      }
      const { data: outlineRow, error: outlineError } = await supabase
        .from('writer_issue_outlines')
        .select('id, outline_json')
        .eq('issue_id', issue_id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (outlineError) {
        return Response.json(
          { success: false, error: 'Failed to load the Live Outline', details: outlineError.message },
          { status: 500, headers: corsHeaders },
        );
      }
      if (!outlineRow?.outline_json) {
        return Response.json(
          { success: false, error: 'Live Outline not found' },
          { status: 409, headers: corsHeaders },
        );
      }
      const sourceBeats = await normalizePacingRevisionSourceBeats(outlineRow.outline_json);
      if (sourceBeats.length === 0) {
        return Response.json(
          { success: false, error: 'Live Outline has no page beats' },
          { status: 409, headers: corsHeaders },
        );
      }
      const sourcePageCount = Math.max(
        sourceBeats.length,
        ...sourceBeats.map((beat) => beat.page_target ?? 0),
      );
      const promptInput = {
        treatmentMode: 'structure' as const,
        sourcePageCount,
        allowedPageRange: {
          min: Math.max(1, Math.floor(sourcePageCount * 0.9)),
          max: Math.min(200, Math.max(sourcePageCount, Math.ceil(sourcePageCount * 1.1))),
        },
        sourceBeats,
        protectedTerms: [] as string[],
        pacingReview,
      };
      let planJson: unknown;
      try {
        planJson = await callGeminiJson({
          system: [
            'You are a careful comics pacing editor.',
            'Return a preview-only revision plan as valid JSON.',
            'Never return a replacement outline.',
          ].join(' '),
          user: buildPacingRevisionOutlinePrompt(promptInput),
          preferredModel: OUTLINE_TREATMENT_GEMINI_MODEL,
          apiKey: geminiKey,
          temperature: 0.35,
          thinkingBudget: 0,
        });
      } catch (error) {
        return llmFailureResponse(error instanceof Error ? error.message : String(error));
      }
      const normalizedPlan = normalizeOutlineTreatmentPatchResult(planJson);
      const parsedPlan = pacingRevisionPlanSchema.safeParse(normalizedPlan);
      if (!parsedPlan.success) {
        return Response.json(
          {
            success: false,
            error: 'Pacing revision plan failed validation',
            details: parsedPlan.error.message,
          },
          { status: 422, headers: corsHeaders },
        );
      }
      const preview = buildPacingRevisionOutlinePreview(parsedPlan.data, promptInput);
      if (preview.outlineChanges.length === 0) {
        return Response.json(
          {
            success: false,
            error: 'Pacing Review produced no usable outline changes',
            details: 'The deterministic validator rejected every proposed change.',
          },
          { status: 422, headers: corsHeaders },
        );
      }
      const proposedOutline = {
        ...asJsonObject(outlineRow.outline_json),
        ...preview.patch.proposal,
      };
      const sourceFingerprint = await sha256Hex(JSON.stringify(outlineRow.outline_json));
      const affectedPages = [...new Set(
        preview.items.flatMap((item) => item.affected_page_numbers),
      )].sort((a, b) => a - b);
      const revisionSetId = crypto.randomUUID();
      const itemIdByModelId = new Map(
        preview.items.map((item) => [item.item_id, crypto.randomUUID()]),
      );
      const now = new Date().toISOString();
      const revisionSetRow = {
        id: revisionSetId,
        issue_id,
        source_outline_id: outlineRow.id,
        status: 'partially_ready',
        pacing_review_json: pacingReview,
        source_outline_json: outlineRow.outline_json,
        proposed_outline_json: proposedOutline,
        source_fingerprint: sourceFingerprint,
        progress_json: {
          total_pages: affectedPages.length,
          completed_pages: [],
          current_page: null,
          stopped: false,
        },
        failure_ledger: [],
        created_at: now,
        updated_at: now,
      };
      const itemRows = preview.items.map((item, position) => ({
        id: itemIdByModelId.get(item.item_id)!,
        revision_set_id: revisionSetId,
        position,
        title: item.title,
        rationale: item.rationale,
        affected_page_numbers: item.affected_page_numbers,
        generation_status: 'pending',
        created_at: now,
        updated_at: now,
      }));
      const outlineChangeRows = preview.outlineChanges.map((change) => ({
        id: crypto.randomUUID(),
        item_id: itemIdByModelId.get(change.item_id)!,
        layer: 'outline',
        target_key: change.target_key,
        page_id: null,
        page_number: change.page_number,
        current_value: change.current_value,
        ai_proposal: change.ai_proposal,
        edited_candidate: null,
        decision: 'pending',
        dependency_ids: [],
        reason: change.reason,
        source_fingerprint: sourceFingerprint,
        generation_status: 'ready',
        applied_at: null,
        created_at: now,
        updated_at: now,
      }));
      const persistence = await persistPacingRevisionOutlinePreview(
        supabase,
        revisionSetRow,
        itemRows,
        outlineChangeRows,
      );
      if (!persistence.ok) {
        return Response.json(
          {
            success: false,
            error: persistence.stage === 'set'
              ? 'Failed to create Revision Set'
              : 'Failed to save the Revision Set',
            details: persistence.error,
          },
          { status: 500, headers: corsHeaders },
        );
      }
      const hydratedItems = itemRows.map((item) => ({
        ...item,
        changes: outlineChangeRows.filter((change) => change.item_id === item.id),
      }));
      return Response.json(
        {
          success: true,
          mode: 'pacing_revision_outline_preview',
          issue_id,
          data: { ...revisionSetRow, items: hydratedItems },
        },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'pacing_revision_page_preview') {
      const {
        revision_set_id,
        page_id,
        include_beats,
        include_dialogue,
      } = parsedReq.data;
      const includeBeats = include_beats !== false;
      const includeDialogue = include_dialogue !== false;
      if (!includeBeats && !includeDialogue) {
        return Response.json(
          { success: false, error: 'Nothing selected for preview' },
          { status: 400, headers: corsHeaders },
        );
      }
      const { data: revisionSet, error: setError } = await supabase
        .from('writer_pacing_revision_sets')
        .select('id, issue_id, status, pacing_review_json, proposed_outline_json, progress_json, failure_ledger')
        .eq('id', revision_set_id)
        .maybeSingle();
      if (setError || !revisionSet) {
        return Response.json(
          { success: false, error: 'Revision Set not found', details: setError?.message },
          { status: 404, headers: corsHeaders },
        );
      }
      if (['applied', 'discarded', 'applying'].includes(revisionSet.status)) {
        return Response.json(
          { success: false, error: 'Revision Set is not editable' },
          { status: 409, headers: corsHeaders },
        );
      }
      const issue = await loadIssueRow(supabase, revisionSet.issue_id);
      if (!issue) {
        return Response.json(
          { success: false, error: 'Issue not found' },
          { status: 404, headers: corsHeaders },
        );
      }
      const { data: page, error: pageError } = await supabase
        .from('writer_pages')
        .select('id, issue_id, page_number, beats_json, script_text')
        .eq('id', page_id)
        .eq('issue_id', revisionSet.issue_id)
        .maybeSingle();
      if (pageError || !page) {
        return Response.json(
          { success: false, error: 'Page not found in this issue', details: pageError?.message },
          { status: 404, headers: corsHeaders },
        );
      }
      const { data: itemRows, error: itemError } = await supabase
        .from('writer_pacing_revision_items')
        .select('id, affected_page_numbers, generation_status')
        .eq('revision_set_id', revision_set_id)
        .contains('affected_page_numbers', [page.page_number])
        .order('position', { ascending: true });
      if (itemError) {
        return Response.json(
          { success: false, error: 'Failed to load Revision Items', details: itemError.message },
          { status: 500, headers: corsHeaders },
        );
      }
      const item = (itemRows ?? []).find((candidate: { generation_status: string }) =>
        candidate.generation_status !== 'locked'
      );
      if (!item) {
        return Response.json(
          {
            success: false,
            error: (itemRows ?? []).length ? 'Affected Revision Item is locked' : 'No Revision Item owns this page',
          },
          { status: 409, headers: corsHeaders },
        );
      }
      type ExistingPageChange = {
        id: string;
        layer: string;
        target_key: string;
        generation_status: string;
        ai_proposal: unknown;
        edited_candidate: unknown;
      };
      const requestedLayers: PacingRevisionChildLayer[] = [
        ...(includeBeats ? ['beats' as const] : []),
        ...(includeDialogue ? ['dialogue' as const] : []),
      ];
      const { data: existingChanges, error: existingChangesError } = await supabase
        .from('writer_pacing_revision_changes')
        .select('id, layer, target_key, generation_status, ai_proposal, edited_candidate')
        .eq('item_id', item.id);
      if (existingChangesError) {
        return Response.json(
          { success: false, error: 'Failed to load existing page candidates', details: existingChangesError.message },
          { status: 500, headers: corsHeaders },
        );
      }
      const existingPageChange = (layer: PacingRevisionChildLayer) =>
        (existingChanges ?? []).find((entry: ExistingPageChange) =>
          entry.layer === layer && entry.target_key === `page:${page.id}`
        ) as ExistingPageChange | undefined;
      const beatsChange = existingPageChange('beats');
      const dialogueChange = existingPageChange('dialogue');
      const beatsUnlocked = beatsChange?.generation_status !== 'locked';
      const dialogueUnlocked = dialogueChange?.generation_status !== 'locked';
      if ((includeBeats && !beatsUnlocked) || (includeDialogue && !dialogueUnlocked)) {
        return Response.json(
          { success: false, error: 'Selected page layer is locked' },
          { status: 409, headers: corsHeaders },
        );
      }
      let pageHasReadyBeats = Boolean(
        beatsChange && ['ready', 'applied'].includes(beatsChange.generation_status)
      );
      let pageHasReadyDialogue = Boolean(
        dialogueChange && ['ready', 'applied'].includes(dialogueChange.generation_status)
      );
      const effectiveBeatsCandidate = beatsChange?.edited_candidate ?? beatsChange?.ai_proposal;
      if (includeDialogue && !includeBeats && (!pageHasReadyBeats || effectiveBeatsCandidate == null)) {
        return Response.json(
          {
            success: false,
            error: 'Page Beats candidate is required before Dialogue',
            details: 'Generate or restore the Page Beats child change, then retry Dialogue.',
          },
          { status: 409, headers: corsHeaders },
        );
      }
      const promptPage = includeDialogue && !includeBeats
        ? { ...page, beats_json: effectiveBeatsCandidate }
        : page;
      const sid = issue.series_id;
      const [castRes, locRes, bibleRes, loreDigest] = await Promise.all([
        supabase.from('writer_cast').select('*').eq('series_id', sid),
        supabase.from('writer_locations').select('*').eq('series_id', sid),
        supabase.from('writer_style_bibles').select('*').eq('series_id', sid),
        fetchLoreCardsDigest(supabase, sid),
      ]);
      const prompt = buildPacingRegenerationPreviewUserPrompt({
        issue,
        pages: [promptPage],
        latestOutline: revisionSet.proposed_outline_json,
        pacingReview: revisionSet.pacing_review_json,
        includeBeats,
        includeDialogue,
        cast: castRes.data ?? [],
        locations: locRes.data ?? [],
        styleBibles: bibleRes.data ?? [],
        loreCardsDigest: loreDigest,
        productionDefaults: resolveProductionDefaultsPayload(issue),
      });
      let candidate: {
        page_id: string;
        page_number: number;
        reason?: string;
        proposed_beats_json?: unknown;
        proposed_script_text?: string;
      };
      try {
        candidate = await generateValidatedPacingRevisionPageCandidate(
          (temperature) => callGeminiJson({
            system: [
              'You are a comics editor generating one preview-only pacing revision page.',
              'Output valid JSON only. Never modify saved content.',
            ].join(' '),
            user: prompt,
            preferredModel: PACING_REVISION_PAGE_GEMINI_MODEL,
            apiKey: geminiKey,
            temperature,
            responseSchema: pacingRevisionPageResponseSchema(includeBeats, includeDialogue),
            requestTimeoutMs: 75_000,
          }),
          (value) => {
            const parsed = pacingRegenerationPreviewResultSchema.parse(value);
            if (parsed.pages.length !== 1) throw new Error('Exactly one page candidate is required');
            const onlyPage = parsed.pages[0]!;
            if (onlyPage.page_id !== page.id || onlyPage.page_number !== page.page_number) {
              throw new Error('Page candidate does not match the requested page');
            }
            if (includeBeats && !onlyPage.proposed_beats_json) {
              throw new Error('Page Beats candidate is required');
            }
            if (includeDialogue && !onlyPage.proposed_script_text?.trim()) {
              throw new Error('Dialogue candidate is required');
            }
            return onlyPage;
          },
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const ledger = Array.isArray(revisionSet.failure_ledger)
          ? revisionSet.failure_ledger
          : [];
        const requestedFailures = [
          ...(includeBeats
            ? [{ page_number: page.page_number, item_id: item.id, layer: 'beats' as const, reason }]
            : []),
          ...(includeDialogue
            ? [{ page_number: page.page_number, item_id: item.id, layer: 'dialogue' as const, reason }]
            : []),
        ];
        await supabase
          .from('writer_pacing_revision_sets')
          .update({
            status: 'partially_ready',
            failure_ledger: projectPacingRevisionFailureLedger({
              ledger: ledger as PacingRevisionFailure[],
              pageNumber: page.page_number,
              requestedLayers,
              readyLayers: [
                ...(pageHasReadyBeats ? ['beats' as const] : []),
                ...(pageHasReadyDialogue ? ['dialogue' as const] : []),
              ],
              newFailures: requestedFailures,
            }),
          })
          .eq('id', revision_set_id);
        return Response.json(
          { success: false, error: 'Page candidate failed', details: reason },
          { status: 422, headers: corsHeaders },
        );
      }
      const outlineDependencyIds = (existingChanges ?? [])
        .filter((entry: { layer: string }) => entry.layer === 'outline')
        .map((entry: { id: string }) => entry.id);
      const now = new Date().toISOString();
      const changeRows: Array<Record<string, unknown>> = [];
      let beatsChangeId: string | null = beatsChange?.id ?? null;
      if (includeBeats && beatsUnlocked && candidate.proposed_beats_json) {
        beatsChangeId = beatsChange?.id ?? crypto.randomUUID();
        pageHasReadyBeats = true;
        changeRows.push({
          id: beatsChangeId,
          item_id: item.id,
          layer: 'beats',
          target_key: `page:${page.id}`,
          page_id: page.id,
          page_number: page.page_number,
          current_value: page.beats_json,
          ai_proposal: candidate.proposed_beats_json,
          edited_candidate: null,
          decision: 'pending',
          dependency_ids: outlineDependencyIds,
          reason: candidate.reason?.trim() || 'Pacing-aligned Page Beats revision.',
          source_fingerprint: await sha256Hex(JSON.stringify(page.beats_json)),
          generation_status: 'ready',
          applied_at: null,
          created_at: now,
          updated_at: now,
        });
      }
      if (includeDialogue && dialogueUnlocked && candidate.proposed_script_text) {
        pageHasReadyDialogue = true;
        changeRows.push({
          id: dialogueChange?.id ?? crypto.randomUUID(),
          item_id: item.id,
          layer: 'dialogue',
          target_key: `page:${page.id}`,
          page_id: page.id,
          page_number: page.page_number,
          current_value: page.script_text,
          ai_proposal: candidate.proposed_script_text,
          edited_candidate: null,
          decision: 'pending',
          dependency_ids: beatsChangeId ? [beatsChangeId] : outlineDependencyIds,
          reason: candidate.reason?.trim() || 'Pacing-aligned Dialogue revision.',
          source_fingerprint: await sha256Hex(JSON.stringify(page.script_text)),
          generation_status: 'ready',
          applied_at: null,
          created_at: now,
          updated_at: now,
        });
      }
      const { data: persistedChanges, error: changesError } = await supabase
        .from('writer_pacing_revision_changes')
        .upsert(changeRows, { onConflict: 'item_id,layer,target_key' })
        .select('*');
      if (changesError) {
        return Response.json(
          { success: false, error: 'Failed to save page candidates', details: changesError.message },
          { status: 500, headers: corsHeaders },
        );
      }
      await supabase
        .from('writer_pacing_revision_items')
        .update({ generation_status: pageHasReadyBeats && pageHasReadyDialogue ? 'ready' : 'pending' })
        .eq('id', item.id);
      const progress = asJsonObject(revisionSet.progress_json);
      const priorCompletedPages = (Array.isArray(progress.completed_pages) ? progress.completed_pages : [])
        .filter((value): value is number => typeof value === 'number');
      const pageIsComplete = pageHasReadyBeats && pageHasReadyDialogue;
      const completedPages = (pageIsComplete
        ? [...new Set([...priorCompletedPages, page.page_number])]
        : priorCompletedPages.filter((value) => value !== page.page_number)
      ).sort((a, b) => a - b);
      const totalPages = typeof progress.total_pages === 'number' ? progress.total_pages : completedPages.length;
      const failureLedger = projectPacingRevisionFailureLedger({
        ledger: (Array.isArray(revisionSet.failure_ledger)
          ? revisionSet.failure_ledger
          : []) as PacingRevisionFailure[],
        pageNumber: page.page_number,
        requestedLayers,
        readyLayers: [
          ...(pageHasReadyBeats ? ['beats' as const] : []),
          ...(pageHasReadyDialogue ? ['dialogue' as const] : []),
        ],
      });
      await supabase
        .from('writer_pacing_revision_sets')
        .update({
          status: completedPages.length >= totalPages && failureLedger.length === 0 ? 'ready' : 'partially_ready',
          progress_json: {
            ...progress,
            completed_pages: completedPages,
            current_page: null,
          },
          failure_ledger: failureLedger,
        })
        .eq('id', revision_set_id);
      return Response.json(
        {
          success: true,
          mode: 'pacing_revision_page_preview',
          issue_id: revisionSet.issue_id,
          page_id,
          data: {
            page_number: page.page_number,
            changes: persistedChanges ?? changeRows,
          },
        },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'outline_treatment_preview') {
      const {
        issue_id,
        treatment_mode,
        source_page_count,
        allowed_page_range,
        source_beats,
        protected_terms = [],
      } = parsedReq.data;
      const issue = await loadIssueRow(supabase, issue_id);
      if (!issue) {
        return Response.json(
          { success: false, error: 'Issue not found' },
          { status: 404, headers: corsHeaders },
        );
      }

      const promptInput = {
        treatmentMode: treatment_mode,
        sourcePageCount: source_page_count,
        allowedPageRange: allowed_page_range,
        sourceBeats: source_beats,
        protectedTerms: protected_terms,
      };
      let treatmentJson: unknown;
      try {
        treatmentJson = await callGeminiJson({
          system: [
            'You are a careful comics outline editor.',
            'Obey the requested treatment contract exactly and return valid JSON only.',
          ].join(' '),
          user: buildOutlineTreatmentPrompt(promptInput),
          preferredModel: OUTLINE_TREATMENT_GEMINI_MODEL,
          apiKey: geminiKey,
          temperature: treatment_mode === 'preserve' ? 0.2 : treatment_mode === 'structure' ? 0.45 : 0.65,
          thinkingBudget: 0,
        });
      } catch (e) {
        return llmFailureResponse(e instanceof Error ? e.message : String(e));
      }

      const initial = outlineTreatmentPatchResultSchema.safeParse(
        normalizeOutlineTreatmentPatchResult(treatmentJson),
      );
      if (!initial.success) {
        return Response.json(
          { success: false, error: 'Outline treatment preview failed validation', details: initial.error.message },
          { status: 422, headers: corsHeaders },
        );
      }
      const coverageErrors = getTreatmentCoverageErrors(initial.data, promptInput);
      if (coverageErrors.length) {
        return Response.json(
          {
            success: false,
            error: 'Outline treatment did not review the complete outline',
            details: coverageErrors,
          },
          { status: 422, headers: corsHeaders },
        );
      }
      const applied = {
        ...applyOutlineTreatmentPatches(initial.data, promptInput),
        overall_assessment: initial.data.overall_assessment,
        section_reviews: initial.data.section_reviews,
      };
      const result = outlineTreatmentPreviewResultSchema.safeParse(applied);
      if (!result.success) {
        return Response.json(
          { success: false, error: 'Outline treatment preview failed validation', details: result.error.message },
          { status: 422, headers: corsHeaders },
        );
      }
      const consistencyErrors = getOutlineTreatmentConsistencyErrors(result.data, promptInput);
      if (consistencyErrors.length) {
        return Response.json(
          {
            success: false,
            error: 'Outline treatment preview returned an inconsistent deterministic result',
            details: consistencyErrors,
          },
          { status: 422, headers: corsHeaders },
        );
      }

      return Response.json(
        { success: true, mode: 'outline_treatment_preview', data: result.data },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'guided_comic_assist') {
      const { action, context, selectedPageNumber, selectedPanelId } = parsedReq.data;
      const system =
        'You are a comics writers’ room assistant embedded in a guided comic workflow. Output only valid JSON. No markdown fences. Be concise, practical, and safe.';
      const userPrompt = buildGuidedComicAssistUserPrompt({
        action,
        context,
        selectedPageNumber,
        selectedPanelId,
      });

      let guidedJson: unknown;
      try {
        guidedJson = await callGeminiJson({
          system,
          user: userPrompt,
          preferredModel: geminiModel,
          apiKey: geminiKey,
          temperature: 0.5,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return llmFailureResponse(msg);
      }

      const guidedParsed = guidedComicAssistResultSchema.safeParse(guidedJson);
      if (!guidedParsed.success) {
        return Response.json(
          { success: false, error: 'Guided comic assist failed validation', details: guidedParsed.error.message },
          { status: 422, headers: corsHeaders },
        );
      }

      return Response.json(
        {
          success: true,
          mode: 'guided_comic_assist',
          data: guidedParsed.data,
        },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'outline_issue') {
      const { issue_id, target_page_count, outline_supplement, production_defaults, save = true } = parsedReq.data;

      const row = await loadIssueRow(supabase, issue_id);
      if (!row) {
        return Response.json(
          { success: false, error: 'Issue not found' },
          { status: 404, headers: corsHeaders },
        );
      }
      const seriesId = row.series_id;

      const [castRes, locRes, bibleRes, loreDigest] = await Promise.all([
        supabase.from('writer_cast').select('*').eq('series_id', seriesId),
        supabase.from('writer_locations').select('*').eq('series_id', seriesId),
        supabase.from('writer_style_bibles').select('*').eq('series_id', seriesId),
        fetchLoreCardsDigest(supabase, seriesId),
      ]);

      const system =
        'You are a comics writer\'s room assistant. Output only valid JSON. No markdown fences. Be concise but specific.';

      const userPrompt = buildOutlineUserPrompt({
        issue: row,
        targetPages: target_page_count,
        cast: castRes.data ?? [],
        locations: locRes.data ?? [],
        styleBibles: bibleRes.data ?? [],
        loreCardsDigest: loreDigest,
        productionDefaults: resolveProductionDefaultsPayload(row, production_defaults),
        supplement: outline_supplement,
      });

      let llmJson: unknown;
      try {
        llmJson = await callGeminiJson({
          system,
          user: userPrompt,
          preferredModel: geminiModel,
          apiKey: geminiKey,
          temperature: 0.65,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return llmFailureResponse(msg);
      }

      const outlineParsed = issueOutlineSchema.safeParse(llmJson);
      if (!outlineParsed.success) {
        return Response.json(
          {
            success: false,
            error: 'Outline failed validation',
            details: outlineParsed.error.message,
          },
          { status: 422, headers: corsHeaders },
        );
      }

      if (!save) {
        return Response.json(
          { success: true, mode: 'outline_issue', data: outlineParsed.data },
          { headers: corsHeaders },
        );
      }

      const { data: maxRow } = await supabase
        .from('writer_issue_outlines')
        .select('version')
        .eq('issue_id', issue_id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (typeof maxRow?.version === 'number' ? maxRow.version : 0) + 1;

      const { data: inserted, error: insErr } = await supabase
        .from('writer_issue_outlines')
        .insert({
          issue_id,
          version: nextVersion,
          outline_json: outlineParsed.data,
          source_mode: 'outline_issue',
        })
        .select('id, version')
        .single();

      if (insErr || !inserted) {
        return Response.json(
          { success: false, error: 'Failed to save outline', details: insErr?.message },
          { status: 500, headers: corsHeaders },
        );
      }

      return Response.json(
        {
          success: true,
          mode: 'outline_issue',
          data: outlineParsed.data,
          outline_id: inserted.id,
          version: inserted.version,
        },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'outline_classification_preview') {
      const system = [
        'You classify passages from a comic outline. Output only valid JSON.',
        'Never rewrite, summarize, merge, or omit passage text. Return suggestions keyed only by the supplied id.',
      ].join(' ');
      const userPrompt = [
        'Assign each passage to title, premise, act, page_beat, notes, or unassigned.',
        'Use unassigned when uncertain. reason must be 240 characters or fewer.',
        JSON.stringify({ passages: parsedReq.data.passages }),
        'Return: {"suggestions":[{"id":string,"assignment":string,"act_name"?:string,"page_target"?:number,"reason":string}]}',
      ].join('\n');

      let classificationJson: unknown;
      try {
        classificationJson = await callGeminiJson({
          system,
          user: userPrompt,
          preferredModel: geminiModel,
          apiKey: geminiKey,
          temperature: 0.15,
        });
      } catch (e) {
        return llmFailureResponse(e instanceof Error ? e.message : String(e));
      }

      const result = outlineClassificationPreviewResultSchema.safeParse(classificationJson);
      if (!result.success) {
        return Response.json(
          { success: false, error: 'Outline classification failed validation', details: result.error.message },
          { status: 422, headers: corsHeaders },
        );
      }
      const requestIds = new Set(parsedReq.data.passages.map((passage) => passage.id));
      const responseIds = result.data.suggestions.map((suggestion) => suggestion.id);
      if (new Set(responseIds).size !== responseIds.length || responseIds.some((id) => !requestIds.has(id))) {
        return Response.json(
          { success: false, error: 'Outline classification returned invalid passage ids' },
          { status: 422, headers: corsHeaders },
        );
      }
      return Response.json(
        { success: true, mode: 'outline_classification_preview', data: result.data },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'page_beats') {
      const { page_id, director_notes_for_beats, production_defaults } = parsedReq.data;
      const { data: page, error: pageErr } = await supabase
        .from('writer_pages')
        .select('id, issue_id, page_number, beats_json, script_text')
        .eq('id', page_id)
        .single();
      if (pageErr || !page) {
        return Response.json(
          { success: false, error: 'Page not found', details: pageErr?.message },
          { status: 404, headers: corsHeaders },
        );
      }
      const issueRow = await loadIssueRow(supabase, page.issue_id);
      if (!issueRow) {
        return Response.json({ success: false, error: 'Issue not found' }, { status: 404, headers: corsHeaders });
      }
      const result = await executeSinglePageBeats(
        supabase,
        page,
        issueRow,
        geminiModel,
        geminiKey,
        director_notes_for_beats,
        resolveProductionDefaultsPayload(issueRow, production_defaults),
      );
      if (!result.ok) {
        if (/api key|GEMINI|Google|quota|429/i.test(result.message)) {
          return llmFailureResponse(result.message);
        }
        return Response.json(
          { success: false, error: 'Page beats failed', details: result.message },
          { status: 422, headers: corsHeaders },
        );
      }
      return Response.json(
        { success: true, mode: 'page_beats', data: result.data, page_id },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'page_beats_issue') {
      const {
        issue_id,
        skip_existing,
        batch_limit,
        batch_offset,
        director_notes_for_beats,
        page_ids,
        production_defaults,
      } = parsedReq.data;
      const issueRow = await loadIssueRow(supabase, issue_id);
      if (!issueRow) {
        return Response.json({ success: false, error: 'Issue not found' }, { status: 404, headers: corsHeaders });
      }
      const { data: allPages, error: pagesErr } = await supabase
        .from('writer_pages')
        .select('id, issue_id, page_number, beats_json, script_text')
        .eq('issue_id', issue_id)
        .order('page_number', { ascending: true });
      if (pagesErr) {
        return Response.json(
          { success: false, error: 'Failed to load pages', details: pagesErr.message },
          { status: 500, headers: corsHeaders },
        );
      }
      const rows = (allPages ?? []) as Array<{
        id: string;
        issue_id: string;
        page_number: number;
        beats_json: unknown;
        script_text: string | null;
      }>;
      if (rows.length === 0) {
        return Response.json(
          {
            success: false,
            error: 'No pages for this issue',
            details: 'Sync pages from target count or add pages in the Library, then retry.',
          },
          { status: 400, headers: corsHeaders },
        );
      }
      const skip = skip_existing === true;
      const candidates = rows.filter((p) => !skip || !pageHasPanelBeats(p.beats_json));
      const limit = Math.min(
        Math.max(1, batch_limit ?? WRITER_PAGE_BEATS_ISSUE_MAX),
        WRITER_PAGE_BEATS_EDGE_INVOCATION_MAX,
      );

      let batch: typeof rows;
      let has_more: boolean;
      let sliceStart = 0;
      const usingPageIds = Boolean(page_ids && page_ids.length > 0);

      if (usingPageIds) {
        const unique = [...new Set(page_ids!)];
        if (unique.length > WRITER_PAGE_BEATS_ISSUE_MAX) {
          return Response.json(
            {
              success: false,
              error: 'Too many page_ids',
              details: `At most ${WRITER_PAGE_BEATS_ISSUE_MAX} pages per request.`,
            },
            { status: 400, headers: corsHeaders },
          );
        }
        const idSet = new Set(unique);
        const selected = rows.filter((p) => idSet.has(p.id));
        if (selected.length !== unique.length) {
          return Response.json(
            {
              success: false,
              error: 'Invalid page_ids',
              details: 'Every id must belong to this issue.',
            },
            { status: 400, headers: corsHeaders },
          );
        }
        selected.sort((a, b) => a.page_number - b.page_number);
        const eligible = selected.filter((p) => !skip || !pageHasPanelBeats(p.beats_json));
        batch = eligible.slice(0, WRITER_PAGE_BEATS_EDGE_INVOCATION_MAX);
        has_more = batch.length < eligible.length;
        sliceStart = 0;
      } else {
        sliceStart = skip ? 0 : Math.min(Math.max(0, batch_offset ?? 0), candidates.length);
        batch = candidates.slice(sliceStart, sliceStart + limit);
        has_more = sliceStart + batch.length < candidates.length;
      }
      const processed: number[] = [];
      const errors: { page_number: number; message: string }[] = [];
      for (const page of batch) {
        const r = await executeSinglePageBeats(
          supabase,
          page,
          issueRow,
          geminiModel,
          geminiKey,
          director_notes_for_beats,
          resolveProductionDefaultsPayload(issueRow, production_defaults),
        );
        if (r.ok) {
          processed.push(page.page_number);
        } else {
          errors.push({ page_number: page.page_number, message: r.message });
          if (/api key|GEMINI|Google|quota|429/i.test(r.message)) {
            return llmFailureResponse(r.message);
          }
        }
      }
      return Response.json(
        {
          success: true,
          mode: 'page_beats_issue',
          issue_id,
          data: {
            processed,
            errors,
            has_more,
            batch_size: batch.length,
            ...(usingPageIds
              ? {}
              : {
                  batch_offset: skip ? undefined : sliceStart,
                  next_batch_offset: skip ? undefined : sliceStart + batch.length,
                }),
          },
        },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'draft_dialogue') {
      const { page_id, style, production_defaults } = parsedReq.data;
      const { data: page, error: pageErr } = await supabase
        .from('writer_pages')
        .select('id, issue_id, page_number, beats_json, script_text')
        .eq('id', page_id)
        .single();
      if (pageErr || !page) {
        return Response.json(
          { success: false, error: 'Page not found', details: pageErr?.message },
          { status: 404, headers: corsHeaders },
        );
      }
      const issueRow = await loadIssueRow(supabase, page.issue_id);
      if (!issueRow) {
        return Response.json({ success: false, error: 'Issue not found' }, { status: 404, headers: corsHeaders });
      }
      const sid = issueRow.series_id;
      const [castRes, bibleRes] = await Promise.all([
        supabase.from('writer_cast').select('*').eq('series_id', sid),
        supabase.from('writer_style_bibles').select('*').eq('series_id', sid),
      ]);
      const dialogueStyle = style ?? 'comic_script';
      const system =
        'You are a comics writer\'s room assistant. Output only valid JSON with key "script_text". No markdown fences.';
      const userPrompt = buildDraftDialogueUserPrompt({
        page,
        issue: issueRow,
        cast: castRes.data ?? [],
        styleBibles: bibleRes.data ?? [],
        dialogueStyle,
        productionDefaults: resolveProductionDefaultsPayload(issueRow, production_defaults),
      });
      let diaJson: unknown;
      try {
        diaJson = await callGeminiJson({
          system,
          user: userPrompt,
          preferredModel: geminiModel,
          apiKey: geminiKey,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return llmFailureResponse(msg);
      }
      const diaParsed = draftDialogueResultSchema.safeParse(diaJson);
      if (!diaParsed.success) {
        return Response.json(
          { success: false, error: 'Dialogue failed validation', details: diaParsed.error.message },
          { status: 422, headers: corsHeaders },
        );
      }
      const now = new Date().toISOString();
      const { error: upErr } = await supabase
        .from('writer_pages')
        .update({ script_text: diaParsed.data.script_text, updated_at: now })
        .eq('id', page_id);
      if (upErr) {
        return Response.json(
          { success: false, error: 'Failed to save script', details: upErr.message },
          { status: 500, headers: corsHeaders },
        );
      }
      return Response.json(
        { success: true, mode: 'draft_dialogue', data: diaParsed.data, page_id },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'pacing_regeneration_preview') {
      const { issue_id, page_ids, include_beats, include_dialogue, production_defaults } = parsedReq.data;
      const includeBeats = include_beats !== false;
      const includeDialogue = include_dialogue !== false;
      if (!includeBeats && !includeDialogue) {
        return Response.json(
          { success: false, error: 'Nothing selected for preview', details: 'Choose beats, dialogue, or both.' },
          { status: 400, headers: corsHeaders },
        );
      }
      const issueRow = await loadIssueRow(supabase, issue_id);
      if (!issueRow) {
        return Response.json({ success: false, error: 'Issue not found' }, { status: 404, headers: corsHeaders });
      }
      const { data: pageRows, error: pagesErr } = await supabase
        .from('writer_pages')
        .select('id, issue_id, page_number, beats_json, script_text')
        .eq('issue_id', issue_id)
        .in('id', page_ids);
      if (pagesErr) {
        return Response.json(
          { success: false, error: 'Failed to load pages', details: pagesErr.message },
          { status: 500, headers: corsHeaders },
        );
      }
      const pages = ((pageRows ?? []) as Array<{
        id: string;
        issue_id: string;
        page_number: number;
        beats_json: unknown;
        script_text: string | null;
      }>).sort((a, b) => a.page_number - b.page_number);
      if (pages.length !== page_ids.length) {
        return Response.json(
          { success: false, error: 'Invalid page_ids', details: 'Every page id must belong to this issue.' },
          { status: 400, headers: corsHeaders },
        );
      }
      const sid = issueRow.series_id;
      const [castRes, locRes, bibleRes, outlineRes, loreDigest] = await Promise.all([
        supabase.from('writer_cast').select('*').eq('series_id', sid),
        supabase.from('writer_locations').select('*').eq('series_id', sid),
        supabase.from('writer_style_bibles').select('*').eq('series_id', sid),
        supabase
          .from('writer_issue_outlines')
          .select('outline_json')
          .eq('issue_id', issue_id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
        fetchLoreCardsDigest(supabase, sid),
      ]);
      const pacingReview = readWriterToolCache(issueRow.notes)?.pacing_review ?? null;
      const userPrompt = buildPacingRegenerationPreviewUserPrompt({
        issue: issueRow,
        pages,
        latestOutline: outlineRes.data?.outline_json ?? null,
        pacingReview,
        includeBeats,
        includeDialogue,
        cast: castRes.data ?? [],
        locations: locRes.data ?? [],
        styleBibles: bibleRes.data ?? [],
        loreCardsDigest: loreDigest,
        productionDefaults: resolveProductionDefaultsPayload(issueRow, production_defaults),
      });
      let previewJson: unknown;
      try {
        previewJson = await callGeminiJson({
          system:
            'You are a comics editor generating preview-only replacement page beats and dialogue. Output only valid JSON. No markdown fences.',
          user: userPrompt,
          preferredModel: geminiModel,
          apiKey: geminiKey,
          temperature: 0.45,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return llmFailureResponse(msg);
      }
      const previewParsed = pacingRegenerationPreviewResultSchema.safeParse(previewJson);
      if (!previewParsed.success) {
        return Response.json(
          {
            success: false,
            error: 'Pacing regeneration preview failed validation',
            details: previewParsed.error.message,
          },
          { status: 422, headers: corsHeaders },
        );
      }
      return Response.json(
        {
          success: true,
          mode: 'pacing_regeneration_preview',
          data: previewParsed.data,
          issue_id,
        },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'pacing_review') {
      const { issue_id, target_page_count: clientTargetPages } = parsedReq.data;
      const row = await loadIssueRow(supabase, issue_id);
      if (!row) {
        return Response.json({ success: false, error: 'Issue not found' }, { status: 404, headers: corsHeaders });
      }
      const { data: pageRows } = await supabase
        .from('writer_pages')
        .select('page_number, beats_json, script_text')
        .eq('issue_id', issue_id)
        .order('page_number', { ascending: true });
      const { data: outlineRow } = await supabase
        .from('writer_issue_outlines')
        .select('outline_json')
        .eq('issue_id', issue_id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      const outlineJson = outlineRow?.outline_json ?? null;
      const scriptPages = pageRows?.length ?? 0;
      const outlineBeats = getOutlinePageBeatsCount(outlineJson);
      const targetPages =
        typeof clientTargetPages === 'number' && clientTargetPages >= 1 && clientTargetPages <= 500
          ? clientTargetPages
          : null;
      const system = 'You are a comics editor focused on pacing and readability. Output only valid JSON. No markdown fences.';
      const userPrompt = buildPacingReviewUserPrompt({
        issue: row,
        outlineJson,
        pages: pageRows ?? [],
        scriptPages,
        outlineBeats,
        targetPages,
      });
      let pacingJson: unknown;
      try {
        pacingJson = await callGeminiJson({
          system,
          user: userPrompt,
          preferredModel: geminiModel,
          apiKey: geminiKey,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return llmFailureResponse(msg);
      }
      const pacingParsed = pacingReviewResultSchema.safeParse(pacingJson);
      if (!pacingParsed.success) {
        return Response.json(
          { success: false, error: 'Pacing review failed validation', details: pacingParsed.error.message },
          { status: 422, headers: corsHeaders },
        );
      }
      const mergedNotes = mergeWriterToolCache(row.notes, 'pacing_review', pacingParsed.data);
      const nowIso = new Date().toISOString();
      const { error: paceErr } = await supabase
        .from('writer_issues')
        .update({ notes: mergedNotes, updated_at: nowIso })
        .eq('id', issue_id);
      if (paceErr) {
        return Response.json(
          { success: false, error: 'Failed to save pacing review', details: paceErr.message },
          { status: 500, headers: corsHeaders },
        );
      }
      return Response.json(
        { success: true, mode: 'pacing_review', data: pacingParsed.data, issue_id },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'canon_check') {
      const { issue_id } = parsedReq.data;
      const row = await loadIssueRow(supabase, issue_id);
      if (!row) {
        return Response.json({ success: false, error: 'Issue not found' }, { status: 404, headers: corsHeaders });
      }
      const sid = row.series_id;
      const [castRes, locRes, bibleRes, pageRes, outlineRes] = await Promise.all([
        supabase.from('writer_cast').select('*').eq('series_id', sid),
        supabase.from('writer_locations').select('*').eq('series_id', sid),
        supabase.from('writer_style_bibles').select('*').eq('series_id', sid),
        supabase
          .from('writer_pages')
          .select('page_number, beats_json, script_text')
          .eq('issue_id', issue_id)
          .order('page_number', { ascending: true }),
        supabase
          .from('writer_issue_outlines')
          .select('outline_json')
          .eq('issue_id', issue_id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const system =
        'You are a continuity and canon editor for serialized comics. Output only valid JSON. No markdown fences.';
      const userPrompt = buildCanonCheckUserPrompt({
        issue: row,
        cast: castRes.data ?? [],
        locations: locRes.data ?? [],
        styleBibles: bibleRes.data ?? [],
        outlineJson: outlineRes.data?.outline_json ?? null,
        pages: pageRes.data ?? [],
      });
      let canonJson: unknown;
      try {
        canonJson = await callGeminiJson({
          system,
          user: userPrompt,
          preferredModel: geminiModel,
          apiKey: geminiKey,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return llmFailureResponse(msg);
      }
      const canonParsed = canonCheckResultSchema.safeParse(canonJson);
      if (!canonParsed.success) {
        return Response.json(
          { success: false, error: 'Canon check failed validation', details: canonParsed.error.message },
          { status: 422, headers: corsHeaders },
        );
      }
      const mergedCanon = mergeWriterToolCache(row.notes, 'canon_check', canonParsed.data);
      const nowCanon = new Date().toISOString();
      const { error: canonErr } = await supabase
        .from('writer_issues')
        .update({ notes: mergedCanon, updated_at: nowCanon })
        .eq('id', issue_id);
      if (canonErr) {
        return Response.json(
          { success: false, error: 'Failed to save canon check', details: canonErr.message },
          { status: 500, headers: corsHeaders },
        );
      }
      return Response.json(
        { success: true, mode: 'canon_check', data: canonParsed.data, issue_id },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'plan_shots_from_issue') {
      const { issue_id, creative_brief, production_defaults } = parsedReq.data;
      const row = await loadIssueRow(supabase, issue_id);
      if (!row) {
        return Response.json({ success: false, error: 'Issue not found' }, { status: 404, headers: corsHeaders });
      }
      const { data: pageRows } = await supabase
        .from('writer_pages')
        .select('page_number, beats_json, script_text')
        .eq('issue_id', issue_id)
        .order('page_number', { ascending: true });
      const { data: outlineRow } = await supabase
        .from('writer_issue_outlines')
        .select('outline_json')
        .eq('issue_id', issue_id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      const system =
        'You are a director\'s assistant for storyboards and shot planning. Output only valid JSON. No markdown fences.';
      const userPrompt = buildShotPlanUserPrompt({
        issue: row,
        outlineJson: outlineRow?.outline_json ?? null,
        pages: pageRows ?? [],
        creativeBrief: creative_brief,
        productionDefaults: resolveProductionDefaultsPayload(row, production_defaults),
      });
      let shotsJson: unknown;
      try {
        shotsJson = await callGeminiJson({
          system,
          user: userPrompt,
          preferredModel: geminiModel,
          apiKey: geminiKey,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return llmFailureResponse(msg);
      }
      const shotsParsed = shotPlanJsonSchema.safeParse(shotsJson);
      if (!shotsParsed.success) {
        return Response.json(
          { success: false, error: 'Shot plan failed validation', details: shotsParsed.error.message },
          { status: 422, headers: corsHeaders },
        );
      }
      const { data: maxShot } = await supabase
        .from('writer_video_shot_plans')
        .select('version')
        .eq('issue_id', issue_id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextShotVer = (typeof maxShot?.version === 'number' ? maxShot.version : 0) + 1;
      const { data: insertedShot, error: shotInsErr } = await supabase
        .from('writer_video_shot_plans')
        .insert({
          issue_id,
          version: nextShotVer,
          shot_plan_json: shotsParsed.data,
        })
        .select('id, version')
        .single();
      if (shotInsErr || !insertedShot) {
        return Response.json(
          { success: false, error: 'Failed to save shot plan', details: shotInsErr?.message },
          { status: 500, headers: corsHeaders },
        );
      }
      return Response.json(
        {
          success: true,
          mode: 'plan_shots_from_issue',
          data: shotsParsed.data,
          issue_id,
          shot_plan_id: insertedShot.id,
          version: insertedShot.version,
        },
        { headers: corsHeaders },
      );
    }

    if (parsedReq.data.mode === 'idea_assist') {
      const {
        issue_id,
        prompt,
        include_left: includeLeftIn,
        include_middle: includeMiddleIn,
        include_right: includeRightIn,
        context_left,
        context_middle,
        context_right,
        page_id: pageId,
      } = parsedReq.data;

      const includeLeft = includeLeftIn !== false;
      const includeMiddle = includeMiddleIn !== false;
      const includeRight = includeRightIn !== false;

      const row = await loadIssueRow(supabase, issue_id);
      if (!row) {
        return Response.json({ success: false, error: 'Issue not found' }, { status: 404, headers: corsHeaders });
      }

      let focusPageNumber: number | null | undefined = undefined;
      if (pageId) {
        const { data: pageRow, error: pageErr } = await supabase
          .from('writer_pages')
          .select('id, issue_id, page_number')
          .eq('id', pageId)
          .maybeSingle();
        if (pageErr) {
          return Response.json(
            { success: false, error: 'Failed to load page', details: pageErr.message },
            { status: 500, headers: corsHeaders },
          );
        }
        if (!pageRow || pageRow.issue_id !== issue_id) {
          return Response.json(
            { success: false, error: 'Invalid page_id for this issue' },
            { status: 400, headers: corsHeaders },
          );
        }
        focusPageNumber = typeof pageRow.page_number === 'number' ? pageRow.page_number : null;
      }

      const system =
        'You are a comics writers’ room assistant. Output only valid JSON. No markdown fences. Be specific and actionable.';
      const userPrompt = buildIdeaAssistUserPrompt({
        issue: row,
        prompt,
        includeLeft,
        includeMiddle,
        includeRight,
        contextLeft: context_left,
        contextMiddle: context_middle,
        contextRight: context_right,
        pageNumber: focusPageNumber,
      });

      let ideaJson: unknown;
      try {
        ideaJson = await callGeminiJson({
          system,
          user: userPrompt,
          preferredModel: geminiModel,
          apiKey: geminiKey,
          temperature: 0.55,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return llmFailureResponse(msg);
      }

      const ideaParsed = ideaAssistResultSchema.safeParse(ideaJson);
      if (!ideaParsed.success) {
        return Response.json(
          { success: false, error: 'Idea assist failed validation', details: ideaParsed.error.message },
          { status: 422, headers: corsHeaders },
        );
      }

      return Response.json(
        {
          success: true,
          mode: 'idea_assist',
          data: ideaParsed.data,
          issue_id,
          ...(pageId ? { page_id: pageId } : {}),
        },
        { headers: corsHeaders },
      );
    }

    return Response.json({ success: false, error: 'Unsupported mode' }, { status: 400, headers: corsHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ success: false, error: 'Internal error', details: msg }, { status: 500, headers: corsHeaders });
  }
});
