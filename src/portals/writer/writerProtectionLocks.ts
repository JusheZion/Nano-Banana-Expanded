export const WRITER_LOCKS_NOTES_KEY = 'writer_locks';

export type WriterLockKey =
  | 'issue.synopsis'
  | 'issue.author_outline'
  | 'issue.outline_instructions'
  | 'issue.production_defaults'
  | 'outline.latest'
  | `page.${string}.beats`
  | `page.${string}.dialogue`;

export type WriterLockEntry = {
  locked: true;
  label: string;
  updatedAt: string;
};

export type WriterLockMap = Partial<Record<WriterLockKey, WriterLockEntry>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isWriterLockKey = (key: string): key is WriterLockKey =>
  key === 'issue.synopsis' ||
  key === 'issue.author_outline' ||
  key === 'issue.outline_instructions' ||
  key === 'issue.production_defaults' ||
  key === 'outline.latest' ||
  /^page\.[^.]+\.(beats|dialogue)$/.test(key);

export function writerPageBeatsLockKey(pageId: string): WriterLockKey {
  return `page.${pageId}.beats`;
}

export function writerPageDialogueLockKey(pageId: string): WriterLockKey {
  return `page.${pageId}.dialogue`;
}

export function describeWriterLockKey(key: WriterLockKey): string {
  if (key === 'issue.synopsis') return 'issue synopsis';
  if (key === 'issue.author_outline') return 'saved author outline';
  if (key === 'issue.outline_instructions') return 'outline instructions';
  if (key === 'issue.production_defaults') return 'production defaults';
  if (key === 'outline.latest') return 'latest generated outline';
  if (key.endsWith('.beats')) return 'page beats';
  if (key.endsWith('.dialogue')) return 'page dialogue';
  return 'story part';
}

export function readWriterLocksFromNotes(notes?: Record<string, unknown> | null): WriterLockMap {
  if (!isRecord(notes)) return {};
  const rawLocks = notes[WRITER_LOCKS_NOTES_KEY];
  if (!isRecord(rawLocks)) return {};

  const locks: WriterLockMap = {};
  for (const [key, rawEntry] of Object.entries(rawLocks)) {
    if (!isWriterLockKey(key) || !isRecord(rawEntry) || rawEntry.locked !== true) continue;
    locks[key] = {
      locked: true,
      label: typeof rawEntry.label === 'string' && rawEntry.label.trim() ? rawEntry.label.trim() : describeWriterLockKey(key),
      updatedAt:
        typeof rawEntry.updatedAt === 'string' && rawEntry.updatedAt.trim()
          ? rawEntry.updatedAt
          : new Date(0).toISOString(),
    };
  }
  return locks;
}

export function isWriterItemLocked(notes: Record<string, unknown> | null | undefined, key: WriterLockKey): boolean {
  return Boolean(readWriterLocksFromNotes(notes)[key]?.locked);
}

export function mergeWriterLockIntoNotes(
  notes: Record<string, unknown> | null | undefined,
  key: WriterLockKey,
  label: string,
  locked: boolean,
  updatedAt = new Date().toISOString(),
): Record<string, unknown> {
  const nextNotes = { ...(isRecord(notes) ? notes : {}) };
  const nextLocks = { ...readWriterLocksFromNotes(nextNotes) };

  if (locked) {
    nextLocks[key] = {
      locked: true,
      label: label.trim() || describeWriterLockKey(key),
      updatedAt,
    };
  } else {
    delete nextLocks[key];
  }

  return {
    ...nextNotes,
    [WRITER_LOCKS_NOTES_KEY]: nextLocks,
  };
}

export function filterUnlockedWriterPageIds(
  pageIds: string[],
  notes: Record<string, unknown> | null | undefined,
  layer: 'beats' | 'dialogue',
): { unlockedPageIds: string[]; lockedPageIds: string[] } {
  const locks = readWriterLocksFromNotes(notes);
  const unlockedPageIds: string[] = [];
  const lockedPageIds: string[] = [];

  for (const pageId of pageIds) {
    const key = layer === 'beats' ? writerPageBeatsLockKey(pageId) : writerPageDialogueLockKey(pageId);
    if (locks[key]?.locked) lockedPageIds.push(pageId);
    else unlockedPageIds.push(pageId);
  }

  return { unlockedPageIds, lockedPageIds };
}
