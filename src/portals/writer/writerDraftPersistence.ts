export const WRITER_DRAFTS_NOTES_KEY = 'writer_drafts';

export type WriterDraftKey = 'outline_instructions' | 'beats_director_notes' | 'visual_creative_brief';

export type WriterDraftEntry = {
  value: string;
  updatedAt: string;
};

export type WriterDraftMap = Partial<Record<WriterDraftKey, WriterDraftEntry>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isWriterDraftKey = (key: string): key is WriterDraftKey =>
  key === 'outline_instructions' || key === 'beats_director_notes' || key === 'visual_creative_brief';

export function readWriterDraftsFromNotes(notes?: Record<string, unknown> | null): WriterDraftMap {
  if (!isRecord(notes)) return {};
  const rawDrafts = notes[WRITER_DRAFTS_NOTES_KEY];
  if (!isRecord(rawDrafts)) return {};

  const drafts: WriterDraftMap = {};
  for (const [key, rawEntry] of Object.entries(rawDrafts)) {
    if (!isWriterDraftKey(key) || !isRecord(rawEntry)) continue;
    const rawValue = rawEntry.value;
    if (typeof rawValue !== 'string') continue;
    drafts[key] = {
      value: rawValue,
      updatedAt:
        typeof rawEntry.updatedAt === 'string' && rawEntry.updatedAt.trim()
          ? rawEntry.updatedAt
          : new Date(0).toISOString(),
    };
  }
  return drafts;
}

export function mergeWriterDraftIntoNotes(
  notes: Record<string, unknown> | null | undefined,
  key: WriterDraftKey,
  value: string,
  updatedAt = new Date().toISOString(),
): Record<string, unknown> {
  const nextNotes = { ...(isRecord(notes) ? notes : {}) };
  return {
    ...nextNotes,
    [WRITER_DRAFTS_NOTES_KEY]: {
      ...readWriterDraftsFromNotes(nextNotes),
      [key]: {
        value,
        updatedAt,
      },
    },
  };
}

export function mergeWriterDraftsIntoNotes(
  notes: Record<string, unknown> | null | undefined,
  drafts: Partial<Record<WriterDraftKey, string>>,
  updatedAt = new Date().toISOString(),
): Record<string, unknown> {
  let nextNotes = { ...(isRecord(notes) ? notes : {}) };
  for (const [key, value] of Object.entries(drafts)) {
    if (!isWriterDraftKey(key) || typeof value !== 'string') continue;
    nextNotes = mergeWriterDraftIntoNotes(nextNotes, key, value, updatedAt);
  }
  return nextNotes;
}
