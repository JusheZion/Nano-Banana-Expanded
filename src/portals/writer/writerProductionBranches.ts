import type { PageBeatsJson, WriterProductionDefaultsPayload } from '@/shared/writer/types';

type WriterOutputFormat = NonNullable<WriterProductionDefaultsPayload['output_format']>;

export type WriterAuditModeId =
  | 'continuity'
  | 'emotional_arc'
  | 'character_utilization'
  | 'worldbuilding_density';

export type WriterProductionBranchId =
  | 'visual_prep'
  | 'dialogue'
  | 'exports'
  | 'guided_comics_handoff';

export type WriterProductionOption<T extends string> = {
  id: T;
  label: string;
};

export const WRITER_AUDIT_MODE_OPTIONS: WriterProductionOption<WriterAuditModeId>[] = [
  { id: 'continuity', label: 'Continuity' },
  { id: 'emotional_arc', label: 'Emotional arc' },
  { id: 'character_utilization', label: 'Character utilization' },
  { id: 'worldbuilding_density', label: 'Worldbuilding density' },
];

export const WRITER_PRODUCTION_BRANCH_OPTIONS: WriterProductionOption<WriterProductionBranchId>[] = [
  { id: 'visual_prep', label: 'Visual prep' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'exports', label: 'Exports' },
  { id: 'guided_comics_handoff', label: 'Guided Comics handoff' },
];

export type PageBeatMetadataSummary = {
  characters: string;
  locations: string;
  artStyle: string;
};

export type WriterAuditSummary = {
  id: WriterAuditModeId;
  label: string;
  source: 'pacing_review' | 'canon_check';
  ready: boolean;
  summary: string;
};

export type WriterProductionBranchSummary = {
  id: WriterProductionBranchId;
  label: string;
  ready: boolean;
  summary: string;
  actionLabel: string;
};

export type WriterIssuePackLike = {
  issue_id: string | null;
  exported_at: string;
  series: { title?: string | null; logline?: string | null } | null;
  production_defaults?: Record<string, unknown>;
  issue: {
    issue_number?: number | null;
    title?: string | null;
    synopsis?: string | null;
    author_outline?: { text?: string; mode?: string } | null;
  } | null;
  outline?: { version?: number; outline_json?: unknown } | null;
  shot_plan?: { version?: number; shot_plan_json?: unknown } | null;
  arc_review?: {
    pacing_review?: unknown;
    canon_check?: unknown;
  };
  pages: Array<{
    page_number: number;
    beats_json: PageBeatsJson | Record<string, unknown> | null;
    script_text: string | null;
  }>;
};

export type WriterPreferredExport =
  | {
      kind: 'json';
      label: string;
      filename: string;
      data: unknown;
    }
  | {
      kind: 'text';
      label: string;
      filename: string;
      mime: string;
      body: string;
    };

type PageBeatMetadata = PageBeatsJson & {
  characters?: unknown;
  key_characters?: unknown;
  keyCharacters?: unknown;
  cast?: unknown;
  locations?: unknown;
  key_locations?: unknown;
  keyLocation?: unknown;
  key_location?: unknown;
  artStyle?: unknown;
  art_style?: unknown;
  visual_style?: unknown;
  style?: unknown;
};

function uniqueList(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readListValue(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return uniqueList(raw.flatMap((item) => readListValue(item)));
  }
  if (typeof raw !== 'string') return [];
  return uniqueList(raw.split(/[,;\n]/).map((item) => item.trim()));
}

function readStringValue(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatListSummary(values: string[], emptyLabel: string): string {
  return values.length > 0 ? values.join(', ') : emptyLabel;
}

export function summarizePageBeatMetadata(beatsJson: PageBeatsJson | null | undefined): PageBeatMetadataSummary {
  const metadata = beatsJson as PageBeatMetadata | null | undefined;
  const characters = uniqueList([
    ...readListValue(metadata?.characters),
    ...readListValue(metadata?.key_characters),
    ...readListValue(metadata?.keyCharacters),
    ...readListValue(metadata?.cast),
  ]);
  const locations = uniqueList([
    ...readListValue(metadata?.locations),
    ...readListValue(metadata?.key_locations),
    ...readListValue(metadata?.keyLocation),
    ...readListValue(metadata?.key_location),
  ]);
  const artStyle =
    readStringValue(metadata?.artStyle) ||
    readStringValue(metadata?.art_style) ||
    readStringValue(metadata?.visual_style) ||
    readStringValue(metadata?.style);

  return {
    characters: formatListSummary(characters, 'No characters listed'),
    locations: formatListSummary(locations, 'No locations listed'),
    artStyle: artStyle || 'No art style listed',
  };
}

function readPageBeatsJson(value: PageBeatsJson | Record<string, unknown> | null | undefined): PageBeatsJson | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const panels = (value as { panels?: unknown }).panels;
  return Array.isArray(panels) ? (value as PageBeatsJson) : null;
}

function readNestedRecord(root: unknown, key: string): Record<string, unknown> | null {
  if (!isRecord(root)) return null;
  const value = root[key];
  return isRecord(value) ? value : null;
}

function readSummary(root: unknown, key: string, fallbackKeys: string[] = ['summary']): string {
  const record = readNestedRecord(root, key);
  if (!record) return '';
  for (const fallbackKey of fallbackKeys) {
    const value = readStringValue(record[fallbackKey]);
    if (value) return value;
  }
  return '';
}

export function summarizeWriterAuditModes(args: {
  pacingResult?: unknown;
  canonResult?: unknown;
}): WriterAuditSummary[] {
  const canonSummary = isRecord(args.canonResult) ? readStringValue(args.canonResult.summary) : '';
  const emotionalSummary = readSummary(args.pacingResult, 'emotional_arc');
  const characterSummary = readSummary(args.canonResult, 'character_utilization');
  const worldSummary = readSummary(args.canonResult, 'worldbuilding_density');

  return WRITER_AUDIT_MODE_OPTIONS.map((option) => {
    if (option.id === 'continuity') {
      return {
        ...option,
        source: 'canon_check',
        ready: Boolean(canonSummary),
        summary: canonSummary || 'Run canon check to audit continuity against cast, location, lore, and style facts.',
      };
    }
    if (option.id === 'emotional_arc') {
      return {
        ...option,
        source: 'pacing_review',
        ready: Boolean(emotionalSummary),
        summary: emotionalSummary || 'Run pacing review to summarize emotional progression and revision risks.',
      };
    }
    if (option.id === 'character_utilization') {
      return {
        ...option,
        source: 'canon_check',
        ready: Boolean(characterSummary),
        summary: characterSummary || 'Run canon check to surface underused, overused, or unsupported character usage.',
      };
    }
    return {
      ...option,
      source: 'canon_check',
      ready: Boolean(worldSummary),
      summary: worldSummary || 'Run canon check to identify overloaded or thin worldbuilding pages/settings.',
    };
  });
}

export function summarizeWriterProductionBranches(args: {
  hasOutline: boolean;
  pagesWithBeats: number;
  pagesWithDialogue: number;
  pageCount: number;
  hasShotPlan: boolean;
  outputFormat?: string;
}): WriterProductionBranchSummary[] {
  return WRITER_PRODUCTION_BRANCH_OPTIONS.map((option) => {
    if (option.id === 'visual_prep') {
      return {
        ...option,
        ready: args.hasShotPlan || args.pagesWithBeats > 0,
        summary: args.hasShotPlan
          ? 'Shot plan is ready for visual prep.'
          : args.pagesWithBeats > 0
            ? 'Page beats are ready; generate a shot plan or send selected art context forward.'
            : 'Generate page beats before visual prep.',
        actionLabel: args.hasShotPlan ? 'Open visual prep' : 'Prepare visuals',
      };
    }
    if (option.id === 'dialogue') {
      return {
        ...option,
        ready: args.pagesWithDialogue > 0,
        summary:
          args.pageCount > 0
            ? `${args.pagesWithDialogue}/${args.pageCount} pages have dialogue.`
            : 'Create pages before dialogue production.',
        actionLabel: 'Open dialogue',
      };
    }
    if (option.id === 'exports') {
      return {
        ...option,
        ready: args.hasOutline || args.pagesWithBeats > 0 || args.pagesWithDialogue > 0,
        summary: 'Export issue pack, markdown summary, selected beats, dialogue, and audit text.',
        actionLabel: 'Open exports',
      };
    }
    return {
      ...option,
      ready: args.outputFormat === 'guided_comic_handoff' || args.pagesWithBeats > 0,
      summary:
        args.outputFormat === 'guided_comic_handoff'
          ? 'Preferred output is set to Guided Comics handoff.'
          : 'Download a Guided Comics handoff package after beats are available.',
      actionLabel: 'Prepare handoff',
    };
  });
}

export function buildGuidedComicsHandoffExport(issuePack: WriterIssuePackLike): Record<string, unknown> {
  return {
    source: 'writers-workshop',
    target: 'guided-comics',
    version: 1,
    exported_at: issuePack.exported_at,
    writer_issue_id: issuePack.issue_id,
    series: issuePack.series,
    issue: issuePack.issue,
    production_defaults: issuePack.production_defaults ?? {},
    pages: issuePack.pages.map((page) => {
      const beatsJson = readPageBeatsJson(page.beats_json);
      const metadata = summarizePageBeatMetadata(beatsJson);
      return {
        page_number: page.page_number,
        summary: beatsJson?.one_line_hook ?? '',
        characters: metadata.characters === 'No characters listed' ? [] : metadata.characters.split(/,\s*/),
        locations: metadata.locations === 'No locations listed' ? [] : metadata.locations.split(/,\s*/),
        art_style: metadata.artStyle === 'No art style listed' ? '' : metadata.artStyle,
        panel_beats: beatsJson?.panels ?? [],
        script_text: page.script_text ?? '',
      };
    }),
  };
}

export function formatIssuePackAsMarkdown(issuePack: WriterIssuePackLike): string {
  const lines: string[] = ['# Writers Workshop Issue Pack', ''];
  const issueTitle = readStringValue(issuePack.issue?.title) || 'Untitled issue';
  const seriesTitle = readStringValue(issuePack.series?.title);
  lines.push(`## ${seriesTitle ? `${seriesTitle} - ` : ''}${issueTitle}`, '');
  if (issuePack.issue?.synopsis) lines.push(issuePack.issue.synopsis, '');
  if (issuePack.issue?.author_outline?.text) {
    lines.push('## Author outline', '', issuePack.issue.author_outline.text, '');
  }
  lines.push('## Pages', '');
  for (const page of issuePack.pages) {
    const beatsJson = readPageBeatsJson(page.beats_json);
    const metadata = summarizePageBeatMetadata(beatsJson);
    lines.push(`### Page ${page.page_number}`, '');
    if (beatsJson?.one_line_hook) lines.push(beatsJson.one_line_hook, '');
    lines.push(`- Characters: ${metadata.characters}`);
    lines.push(`- Locations: ${metadata.locations}`);
    lines.push(`- Art style: ${metadata.artStyle}`);
    const panels = beatsJson?.panels ?? [];
    for (const [index, panel] of panels.entries()) {
      lines.push(`- Panel ${panel.index ?? index + 1}: ${panel.action}`);
    }
    if (page.script_text?.trim()) {
      lines.push('', '#### Dialogue', '', page.script_text.trim());
    }
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

function readIssuePackOutputFormat(issuePack: WriterIssuePackLike): WriterOutputFormat {
  const raw = issuePack.production_defaults?.output_format;
  return typeof raw === 'string' &&
    [
      'issue_pack_json',
      'comic_script_markdown',
      'guided_comic_handoff',
      'fountain_screenplay',
      'prose_manuscript',
      'lore_wiki',
    ].includes(raw)
    ? (raw as WriterOutputFormat)
    : 'issue_pack_json';
}

function formatIssuePackAsFountain(issuePack: WriterIssuePackLike): string {
  const lines: string[] = [];
  const title = readStringValue(issuePack.issue?.title) || readStringValue(issuePack.series?.title) || 'Dialogue export';
  lines.push(`Title: ${title}`, '');
  for (const page of issuePack.pages) {
    lines.push(`# Page ${page.page_number}`, '');
    lines.push(page.script_text?.trim() || '[[ no dialogue ]]');
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

function formatIssuePackAsProseManuscript(issuePack: WriterIssuePackLike): string {
  const lines: string[] = ['# Prose Manuscript Export', ''];
  const title = readStringValue(issuePack.issue?.title) || 'Untitled issue';
  const series = readStringValue(issuePack.series?.title);
  lines.push(`# ${series ? `${series}: ` : ''}${title}`, '');
  if (issuePack.issue?.synopsis) lines.push(issuePack.issue.synopsis, '');
  if (issuePack.issue?.author_outline?.text) {
    lines.push('## Author Outline', '', issuePack.issue.author_outline.text, '');
  }
  const outline = isRecord(issuePack.outline?.outline_json) ? issuePack.outline?.outline_json : null;
  const beats = Array.isArray(outline?.page_beats) ? outline.page_beats : [];
  if (beats.length) {
    lines.push('## Story Sequence', '');
    for (const beat of beats) {
      if (!isRecord(beat)) continue;
      const page = typeof beat.page_target === 'number' ? `Page ${beat.page_target}` : 'Scene';
      const summary = readStringValue(beat.summary);
      const turn = readStringValue(beat.emotional_turn);
      lines.push(`- **${page}:** ${summary}${turn ? ` (${turn})` : ''}`);
    }
    lines.push('');
  }
  for (const page of issuePack.pages) {
    const beatsJson = readPageBeatsJson(page.beats_json);
    lines.push(`## Page ${page.page_number}`, '');
    if (beatsJson?.one_line_hook) lines.push(beatsJson.one_line_hook, '');
    const panels = beatsJson?.panels ?? [];
    for (const [index, panel] of panels.entries()) {
      const action = readStringValue(panel.action);
      if (action) lines.push(`${index + 1}. ${action}`);
    }
    if (page.script_text?.trim()) lines.push('', page.script_text.trim());
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

function formatIssuePackAsLoreWiki(issuePack: WriterIssuePackLike): string {
  const characterSet = new Set<string>();
  const locationSet = new Set<string>();
  const styleSet = new Set<string>();
  for (const page of issuePack.pages) {
    const metadata = summarizePageBeatMetadata(readPageBeatsJson(page.beats_json));
    if (metadata.characters !== 'No characters listed') {
      metadata.characters.split(/,\s*/).forEach((item) => characterSet.add(item));
    }
    if (metadata.locations !== 'No locations listed') {
      metadata.locations.split(/,\s*/).forEach((item) => locationSet.add(item));
    }
    if (metadata.artStyle !== 'No art style listed') styleSet.add(metadata.artStyle);
  }

  const lines: string[] = ['# Lore Wiki Export', ''];
  const series = readStringValue(issuePack.series?.title);
  const issue = readStringValue(issuePack.issue?.title);
  if (series || issue) lines.push(`## Source`, '', [series, issue].filter(Boolean).join(' - '), '');
  if (issuePack.issue?.synopsis) lines.push('## Synopsis', '', issuePack.issue.synopsis, '');
  if (issuePack.issue?.author_outline?.text) {
    lines.push('## Author Outline', '', issuePack.issue.author_outline.text, '');
  }
  lines.push('## Characters', '');
  lines.push(...(characterSet.size ? [...characterSet].sort().map((item) => `- ${item}`) : ['- None listed']));
  lines.push('', '## Locations', '');
  lines.push(...(locationSet.size ? [...locationSet].sort().map((item) => `- ${item}`) : ['- None listed']));
  lines.push('', '## Visual Style', '');
  lines.push(...(styleSet.size ? [...styleSet].sort().map((item) => `- ${item}`) : ['- None listed']));
  return `${lines.join('\n').trim()}\n`;
}

export function buildPreferredWriterExport(issuePack: WriterIssuePackLike): WriterPreferredExport {
  switch (readIssuePackOutputFormat(issuePack)) {
    case 'comic_script_markdown':
      return {
        kind: 'text',
        label: 'Download comic script markdown',
        filename: 'writer-issue-pack.md',
        mime: 'text/markdown;charset=utf-8',
        body: formatIssuePackAsMarkdown(issuePack),
      };
    case 'guided_comic_handoff':
      return {
        kind: 'json',
        label: 'Download Guided Comics handoff',
        filename: 'writer-guided-comics-handoff.json',
        data: buildGuidedComicsHandoffExport(issuePack),
      };
    case 'fountain_screenplay':
      return {
        kind: 'text',
        label: 'Download Fountain screenplay',
        filename: 'writer-dialogue.fountain',
        mime: 'text/plain;charset=utf-8',
        body: formatIssuePackAsFountain(issuePack),
      };
    case 'prose_manuscript':
      return {
        kind: 'text',
        label: 'Download prose manuscript',
        filename: 'writer-prose-manuscript.md',
        mime: 'text/markdown;charset=utf-8',
        body: formatIssuePackAsProseManuscript(issuePack),
      };
    case 'lore_wiki':
      return {
        kind: 'text',
        label: 'Download lore wiki',
        filename: 'writer-lore-wiki.md',
        mime: 'text/markdown;charset=utf-8',
        body: formatIssuePackAsLoreWiki(issuePack),
      };
    case 'issue_pack_json':
    default:
      return {
        kind: 'json',
        label: 'Download issue pack JSON',
        filename: 'writer-issue-pack.json',
        data: issuePack,
      };
  }
}
