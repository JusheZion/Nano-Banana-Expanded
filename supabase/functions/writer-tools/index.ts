import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  canonCheckResultSchema,
  draftDialogueResultSchema,
  issueOutlineSchema,
  pacingReviewResultSchema,
  pageBeatsJsonSchema,
  shotPlanJsonSchema,
  WRITER_PAGE_BEATS_ISSUE_MAX,
  writerToolsRequestSchema,
} from '../_shared/writerSchemas.ts';

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
  } | null;
};

/** Public API ids that work with AI Studio keys; preview ids last (may 400 "unexpected model name" on some keys). */
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
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
  /** Lower = stick closer to prompt (default 0.65). */
  temperature?: number;
}): Promise<unknown> {
  const body = {
    systemInstruction: { parts: [{ text: args.system }] },
    contents: [{ role: 'user', parts: [{ text: args.user }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: args.temperature ?? 0.65,
    },
  };

  const modelsToTry = [
    args.preferredModel,
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== args.preferredModel),
  ];

  let lastErr = '';
  for (const model of modelsToTry) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${args.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
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
    const b = (r.body ?? '').trim();
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
  return [
    `Create a comic issue outline as JSON only.`,
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`.trim(),
    `Status: ${args.issue.status}`,
    `Synopsis: ${args.issue.synopsis ?? '(none)'}`,
    synopsisTrim
      ? `If synopsis is not "(none)", premise and page_beats MUST align with it.`
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
    .single();
  if (issueErr || !issue) return null;
  const { data: series } = await supabase
    .from('writer_series')
    .select('id, title, logline, genre, tone, target_demographic')
    .eq('id', issue.series_id)
    .maybeSingle();
  return {
    ...(issue as Omit<IssueRow, 'writer_series' | 'notes'>),
    notes: asJsonObject((issue as { notes?: unknown }).notes),
    writer_series: series,
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

  const match = arr.find((b) => b.page_target === pageNumber);
  if (match) {
    return `Exact outline beat for this page:\n${JSON.stringify(match, null, 2)}`;
  }

  const withTargets = arr
    .filter((b): b is OutlinePageBeat & { page_target: number } => typeof b.page_target === 'number')
    .sort((a, b) => a.page_target - b.page_target);
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
    '',
    'Return JSON:',
    '{ "page_number_ref": number (optional), "one_line_hook": string (optional), "panels": [ { "index"?: number, "action": string (required), "composition"?: string, "emotion"?: string, "dialogue_placeholder"?: string, "sfx"?: string } ] }',
    'Must have at least one panel; every panel needs non-empty "action".',
    'Hard constraint: advance the story; do not re-state page 1 beats on later pages.',
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
    `Page number: ${args.page.page_number}`,
    `Panel beats JSON:\n${beatsStr}`,
    `Prior script (you may replace):\n${(args.page.script_text ?? '').slice(0, 4000) || '(empty)'}`,
    `Cast (use names consistently):\n${JSON.stringify(args.cast, null, 2)}`,
    `Style bibles:\n${JSON.stringify(args.styleBibles, null, 2)}`,
    'Return exactly: { "script_text": string }',
  ].join('\n');
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
  /** Prior full beats_json when regenerating; large panels blow past Edge limits if unbounded. */
  existingBeats: 14_000,
  outlineBeat: 6000,
} as const;

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
  });
  let beatsJson: unknown;
  try {
    beatsJson = await callGeminiJson({
      system,
      user: userPrompt,
      preferredModel: geminiModel,
      apiKey: geminiKey,
    });
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

function buildPacingReviewUserPrompt(args: {
  issue: IssueRow;
  outlineJson: unknown;
  pages: Array<{ page_number: number; beats_json: unknown; script_text: string | null }>;
}): string {
  return [
    `Analyze comic issue pacing. Output JSON only (no markdown).`,
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`,
    `Synopsis: ${args.issue.synopsis ?? '(none)'}`,
    `Latest outline JSON:\n${JSON.stringify(args.outlineJson ?? {}, null, 2).slice(0, 12000)}`,
    `Per-page digest (panel counts + script previews):\n${buildPagesDigest(args.pages)}`,
    '',
    'Return JSON shape:',
    '{',
    '  "overall_pacing": string (required),',
    '  "score_1_to_10"?: number,',
    '  "strengths"?: string[],',
    '  "risks"?: string[],',
    '  "page_level_notes"?: [ { "page_number": number, "note": string } ],',
    '  "suggestions"?: string[]',
    '}',
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
    '  "aligned_elements"?: string[]',
    '}',
  ].join('\n');
}

function buildShotPlanUserPrompt(args: {
  issue: IssueRow;
  outlineJson: unknown;
  pages: Array<{ page_number: number; beats_json: unknown; script_text: string | null }>;
  creativeBrief?: string;
}): string {
  const brief = args.creativeBrief?.trim()
    ? `Director / creative brief:\n${args.creativeBrief.trim()}\n`
    : '';
  return [
    `Create a shot list for adapting this comic issue to motion (trailers, animatic, or live-action planning). Output JSON only.`,
    brief,
    `Issue: #${args.issue.issue_number} ${args.issue.title ?? ''}`,
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

    if (parsedReq.data.mode === 'outline_issue') {
      const { issue_id, target_page_count, outline_supplement } = parsedReq.data;

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

    if (parsedReq.data.mode === 'page_beats') {
      const { page_id, director_notes_for_beats } = parsedReq.data;
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
        WRITER_PAGE_BEATS_ISSUE_MAX,
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
        batch = selected.filter((p) => !skip || !pageHasPanelBeats(p.beats_json));
        has_more = false;
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
      const { page_id, style } = parsedReq.data;
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

    if (parsedReq.data.mode === 'pacing_review') {
      const { issue_id } = parsedReq.data;
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
      const system = 'You are a comics editor focused on pacing and readability. Output only valid JSON. No markdown fences.';
      const userPrompt = buildPacingReviewUserPrompt({
        issue: row,
        outlineJson: outlineRow?.outline_json ?? null,
        pages: pageRows ?? [],
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
      const { issue_id, creative_brief } = parsedReq.data;
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

    return Response.json({ success: false, error: 'Unsupported mode' }, { status: 400, headers: corsHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ success: false, error: 'Internal error', details: msg }, { status: 500, headers: corsHeaders });
  }
});
