import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES,
  normalizeGuidedComicLibraryEntryLayout,
  parseGuidedComicLibraryPreferences,
} from '@/portals/guided-comic/guidedComicLibraryPreferences';

describe('guided comic library preferences', () => {
  it('defaults to the cover gallery entry first', () => {
    expect(DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES.entryLayout).toBe('cover-gallery');
  });

  it('normalizes valid and invalid entry layouts', () => {
    expect(normalizeGuidedComicLibraryEntryLayout('cover-gallery')).toBe('cover-gallery');
    expect(normalizeGuidedComicLibraryEntryLayout('last-series')).toBe('last-series');
    expect(normalizeGuidedComicLibraryEntryLayout('hybrid-shelf')).toBe('hybrid-shelf');
    expect(normalizeGuidedComicLibraryEntryLayout('dashboard')).toBe('cover-gallery');
    expect(normalizeGuidedComicLibraryEntryLayout(undefined)).toBe('cover-gallery');
  });

  it('parses null and malformed payloads to defaults', () => {
    expect(parseGuidedComicLibraryPreferences(null)).toEqual(DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES);
    expect(parseGuidedComicLibraryPreferences('not json')).toEqual(DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES);
    expect(parseGuidedComicLibraryPreferences(JSON.stringify({ version: 2 }))).toEqual(
      DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES,
    );
  });

  it('keeps returned default series cover maps isolated from the exported default', () => {
    const firstDefault = parseGuidedComicLibraryPreferences(null);
    const secondDefault = parseGuidedComicLibraryPreferences(null);

    expect(firstDefault.seriesCoverProjectIds).not.toBe(DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES.seriesCoverProjectIds);
    expect(secondDefault.seriesCoverProjectIds).not.toBe(DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES.seriesCoverProjectIds);
    expect(firstDefault.seriesCoverProjectIds).not.toBe(secondDefault.seriesCoverProjectIds);
    expect(Object.isFrozen(DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES.seriesCoverProjectIds)).toBe(true);
  });

  it('parses a valid payload with series covers and living archive background', () => {
    const parsed = parseGuidedComicLibraryPreferences(
      JSON.stringify({
        version: 1,
        entryLayout: 'last-series',
        seriesCoverProjectIds: {
          'series-1': 'project-1',
          'series-2': 'project-2',
        },
        livingArchiveBackgroundEnabled: true,
      }),
    );

    expect(parsed).toEqual({
      version: 1,
      entryLayout: 'last-series',
      seriesCoverProjectIds: {
        'series-1': 'project-1',
        'series-2': 'project-2',
      },
      livingArchiveBackgroundEnabled: true,
    });
  });

  it('filters non-string series cover project ids', () => {
    const parsed = parseGuidedComicLibraryPreferences(
      JSON.stringify({
        version: 1,
        entryLayout: 'hybrid-shelf',
        seriesCoverProjectIds: {
          keep: 'project-1',
          dropNumber: 42,
          dropNull: null,
          dropObject: { projectId: 'project-2' },
        },
        livingArchiveBackgroundEnabled: 'true',
      }),
    );

    expect(parsed).toEqual({
      version: 1,
      entryLayout: 'hybrid-shelf',
      seriesCoverProjectIds: {
        keep: 'project-1',
      },
      livingArchiveBackgroundEnabled: false,
    });
  });
});
