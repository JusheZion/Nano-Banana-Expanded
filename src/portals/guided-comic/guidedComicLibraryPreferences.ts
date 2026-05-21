export const GUIDED_COMIC_LIBRARY_PREFERENCES_STORAGE_KEY = 'arcs.guidedComicLibraryPreferences.v1';

export type GuidedComicLibraryEntryLayout = 'cover-gallery' | 'last-series' | 'hybrid-shelf';

export type GuidedComicLibraryPreferences = {
  version: 1;
  entryLayout: GuidedComicLibraryEntryLayout;
  seriesCoverProjectIds: Record<string, string>;
  livingArchiveBackgroundEnabled: boolean;
};

type ReadonlyGuidedComicLibraryPreferences = Readonly<Omit<GuidedComicLibraryPreferences, 'seriesCoverProjectIds'>> & {
  readonly seriesCoverProjectIds: Readonly<Record<string, string>>;
};

export const DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES: ReadonlyGuidedComicLibraryPreferences = Object.freeze({
  version: 1,
  entryLayout: 'cover-gallery',
  seriesCoverProjectIds: Object.freeze({}),
  livingArchiveBackgroundEnabled: false,
});

function createDefaultGuidedComicLibraryPreferences(): GuidedComicLibraryPreferences {
  return {
    ...DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES,
    seriesCoverProjectIds: {},
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function normalizeGuidedComicLibraryEntryLayout(value: unknown): GuidedComicLibraryEntryLayout {
  if (value === 'cover-gallery' || value === 'last-series' || value === 'hybrid-shelf') return value;
  return 'cover-gallery';
}

export function parseGuidedComicLibraryPreferences(raw: string | null): GuidedComicLibraryPreferences {
  if (!raw) return createDefaultGuidedComicLibraryPreferences();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainRecord(parsed) || parsed.version !== 1 || !isPlainRecord(parsed.seriesCoverProjectIds)) {
      return createDefaultGuidedComicLibraryPreferences();
    }

    const seriesCoverProjectIds = Object.fromEntries(
      Object.entries(parsed.seriesCoverProjectIds).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );

    return {
      version: 1,
      entryLayout: normalizeGuidedComicLibraryEntryLayout(parsed.entryLayout),
      seriesCoverProjectIds,
      livingArchiveBackgroundEnabled: parsed.livingArchiveBackgroundEnabled === true,
    };
  } catch {
    return createDefaultGuidedComicLibraryPreferences();
  }
}

export function readGuidedComicLibraryPreferences(): GuidedComicLibraryPreferences {
  if (typeof window === 'undefined') return createDefaultGuidedComicLibraryPreferences();

  try {
    return parseGuidedComicLibraryPreferences(window.localStorage.getItem(GUIDED_COMIC_LIBRARY_PREFERENCES_STORAGE_KEY));
  } catch {
    return createDefaultGuidedComicLibraryPreferences();
  }
}

export function writeGuidedComicLibraryPreferences(preferences: GuidedComicLibraryPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(GUIDED_COMIC_LIBRARY_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Local preference writes are best-effort; storage may be unavailable or full.
  }
}
