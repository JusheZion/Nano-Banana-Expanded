import type { PageBeatsJson } from '@/shared/writer/types';

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
