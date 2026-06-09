import type { SynopsisHelperParts } from '@/portals/writer/writerSynopsisHelper';

export const WRITER_VISUAL_REFERENCES_NOTES_KEY = 'writer_visual_references';

export type WriterVisualReferenceKind = 'character' | 'location' | 'prop';
export type WriterVisualReferenceSource = 'character_vault' | 'asset_vault';

export type WriterVisualReference = {
  id: string;
  source: WriterVisualReferenceSource;
  sourceId: string;
  sourceLabel: string;
  label: string;
  kind: WriterVisualReferenceKind;
  imageUrl: string;
  note?: string;
  linkedAt?: string;
};

const VALID_KINDS = new Set<WriterVisualReferenceKind>(['character', 'location', 'prop']);
const VALID_SOURCES = new Set<WriterVisualReferenceSource>(['character_vault', 'asset_vault']);

function asNotesObject(notes: Record<string, unknown> | undefined): Record<string, unknown> {
  return notes && typeof notes === 'object' && !Array.isArray(notes) ? notes : {};
}

function sanitizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readKind(value: unknown, fallback: WriterVisualReferenceKind): WriterVisualReferenceKind {
  return typeof value === 'string' && VALID_KINDS.has(value as WriterVisualReferenceKind)
    ? (value as WriterVisualReferenceKind)
    : fallback;
}

function readSource(value: unknown): WriterVisualReferenceSource | null {
  return typeof value === 'string' && VALID_SOURCES.has(value as WriterVisualReferenceSource)
    ? (value as WriterVisualReferenceSource)
    : null;
}

function defaultKindForSource(source: WriterVisualReferenceSource): WriterVisualReferenceKind {
  return source === 'character_vault' ? 'character' : 'prop';
}

function referenceId(source: WriterVisualReferenceSource, sourceId: string): string {
  return `${source}:${sourceId}`;
}

export function readWriterVisualReferencesFromNotes(
  notes: Record<string, unknown> | undefined,
): WriterVisualReference[] {
  const raw = asNotesObject(notes)[WRITER_VISUAL_REFERENCES_NOTES_KEY];
  if (!Array.isArray(raw)) return [];

  const refs: WriterVisualReference[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const source = readSource(row.source);
    const sourceId = sanitizeText(row.source_id ?? row.sourceId);
    const label = sanitizeText(row.label);
    const imageUrl = sanitizeText(row.image_url ?? row.imageUrl);
    if (!source || !sourceId || !label || !imageUrl) continue;

    const id = sanitizeText(row.id) || referenceId(source, sourceId);
    if (seen.has(id)) continue;
    seen.add(id);
    refs.push({
      id,
      source,
      sourceId,
      sourceLabel: sanitizeText(row.source_label ?? row.sourceLabel) || sourceId,
      label,
      kind: readKind(row.kind, defaultKindForSource(source)),
      imageUrl,
      note: sanitizeText(row.note) || undefined,
      linkedAt: sanitizeText(row.linked_at ?? row.linkedAt) || undefined,
    });
  }
  return refs;
}

function serializeReference(ref: WriterVisualReference): Record<string, unknown> {
  return {
    id: ref.id,
    source: ref.source,
    source_id: ref.sourceId,
    source_label: ref.sourceLabel,
    label: ref.label,
    kind: ref.kind,
    image_url: ref.imageUrl,
    ...(ref.note?.trim() ? { note: ref.note.trim() } : {}),
    linked_at: ref.linkedAt ?? new Date().toISOString(),
  };
}

export function mergeWriterVisualReferenceIntoNotes(
  notes: Record<string, unknown> | undefined,
  ref: Omit<WriterVisualReference, 'id' | 'linkedAt'> & { id?: string; linkedAt?: string },
): Record<string, unknown> {
  const nextRef: WriterVisualReference = {
    ...ref,
    id: ref.id || referenceId(ref.source, ref.sourceId),
    linkedAt: ref.linkedAt ?? new Date().toISOString(),
  };
  const existing = readWriterVisualReferencesFromNotes(notes);
  const refs = [nextRef, ...existing.filter((item) => item.id !== nextRef.id)];
  return {
    ...asNotesObject(notes),
    [WRITER_VISUAL_REFERENCES_NOTES_KEY]: refs.map(serializeReference),
  };
}

export function removeWriterVisualReferenceFromNotes(
  notes: Record<string, unknown> | undefined,
  referenceIdToRemove: string,
): Record<string, unknown> {
  const refs = readWriterVisualReferencesFromNotes(notes).filter((ref) => ref.id !== referenceIdToRemove);
  return {
    ...asNotesObject(notes),
    [WRITER_VISUAL_REFERENCES_NOTES_KEY]: refs.map(serializeReference),
  };
}

export function buildWriterVisualReferenceDigest(refs: WriterVisualReference[]): string {
  if (refs.length === 0) return '';
  return refs
    .map((ref) => {
      const role =
        ref.kind === 'character'
          ? 'Character design'
          : ref.kind === 'location'
            ? 'Location or set design'
            : 'Prop or asset design';
      return [
        `- ${role}: ${ref.label}`,
        `  Source: ${ref.source === 'character_vault' ? 'Character Vault' : 'Asset Vault'} / ${ref.sourceLabel}`,
        `  Image: ${ref.imageUrl}`,
        ref.note ? `  Note: ${ref.note}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
}

function appendUniqueLine(existing: string, line: string): string {
  const t = line.trim();
  if (!t) return existing;
  const lines = existing
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const hasLine = lines.some((part) => part.toLowerCase() === t.toLowerCase());
  return hasLine ? existing : [...lines, t].join('\n');
}

export function mergeVisualReferencesIntoSynopsisParts(
  parts: SynopsisHelperParts,
  refs: WriterVisualReference[],
): SynopsisHelperParts {
  return refs.reduce<SynopsisHelperParts>((next, ref) => {
    if (ref.kind === 'character') {
      return {
        ...next,
        castGoals: appendUniqueLine(
          next.castGoals,
          `${ref.label} - visual reference attached from ${ref.sourceLabel}. Use this design as canon.`,
        ),
      };
    }
    if (ref.kind === 'location') {
      return {
        ...next,
        locations: appendUniqueLine(
          next.locations,
          `${ref.label} - visual reference attached from ${ref.sourceLabel}. Use this set design as canon.`,
        ),
      };
    }
    return {
      ...next,
      rules: appendUniqueLine(
        next.rules,
        `${ref.label} - prop/asset visual reference attached from ${ref.sourceLabel}. Use this design when it appears.`,
      ),
    };
  }, parts);
}
