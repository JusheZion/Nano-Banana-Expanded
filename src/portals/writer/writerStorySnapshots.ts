export const WRITER_STORY_SNAPSHOTS_NOTES_KEY = 'writer_story_snapshots';

export type WriterStorySnapshot = {
  id: string;
  key: string;
  label: string;
  value: unknown;
  createdAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function readWriterStorySnapshotsFromNotes(
  notes?: Record<string, unknown> | null,
): WriterStorySnapshot[] {
  if (!isRecord(notes)) return [];
  const raw = notes[WRITER_STORY_SNAPSHOTS_NOTES_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): WriterStorySnapshot[] => {
    if (!isRecord(entry)) return [];
    if (typeof entry.id !== 'string' || typeof entry.key !== 'string' || typeof entry.label !== 'string') {
      return [];
    }
    return [
      {
        id: entry.id,
        key: entry.key,
        label: entry.label,
        value: entry.value,
        createdAt:
          typeof entry.createdAt === 'string' && entry.createdAt.trim()
            ? entry.createdAt
            : new Date(0).toISOString(),
      },
    ];
  });
}

export function mergeWriterStorySnapshotIntoNotes(
  notes: Record<string, unknown> | null | undefined,
  snapshot: {
    key: string;
    label: string;
    value: unknown;
    createdAt?: string;
  },
  maxSnapshots = 8,
): Record<string, unknown> {
  const nextNotes = { ...(isRecord(notes) ? notes : {}) };
  const createdAt = snapshot.createdAt ?? new Date().toISOString();
  const nextSnapshot: WriterStorySnapshot = {
    id: `${snapshot.key}-${createdAt}`,
    key: snapshot.key,
    label: snapshot.label,
    value: snapshot.value,
    createdAt,
  };
  const existing = readWriterStorySnapshotsFromNotes(nextNotes).filter(
    (entry) => !(entry.key === snapshot.key && entry.createdAt === createdAt),
  );
  return {
    ...nextNotes,
    [WRITER_STORY_SNAPSHOTS_NOTES_KEY]: [nextSnapshot, ...existing].slice(0, maxSnapshots),
  };
}

export function latestWriterStorySnapshot(
  notes: Record<string, unknown> | null | undefined,
  key: string,
): WriterStorySnapshot | null {
  return readWriterStorySnapshotsFromNotes(notes)
    .filter((snapshot) => snapshot.key === key)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}
