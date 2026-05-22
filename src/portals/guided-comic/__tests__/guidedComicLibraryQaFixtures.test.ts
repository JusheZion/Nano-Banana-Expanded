import { describe, expect, it } from 'vitest';
import { getGuidedComicCompletedIssueCount, getGuidedComicLibrarySeriesGroups } from '../guidedComicLibraryView';
import {
  getGuidedComicLibraryQaFixture,
  normalizeGuidedComicLibraryQaFixtureName,
} from '../guidedComicLibraryQaFixtures';

describe('guided comic library QA fixtures', () => {
  it('normalizes only supported fixture names', () => {
    expect(normalizeGuidedComicLibraryQaFixtureName('empty')).toBe('empty');
    expect(normalizeGuidedComicLibraryQaFixtureName('many')).toBe('many');
    expect(normalizeGuidedComicLibraryQaFixtureName('missing-covers')).toBe('missing-covers');
    expect(normalizeGuidedComicLibraryQaFixtureName('production')).toBeNull();
    expect(normalizeGuidedComicLibraryQaFixtureName(null)).toBeNull();
  });

  it('returns an empty fixture without synthetic saved projects', () => {
    expect(getGuidedComicLibraryQaFixture('empty')).toBeNull();
  });

  it('builds a many-series fixture with many issues and completed projects', () => {
    const fixture = getGuidedComicLibraryQaFixture('many');

    expect(fixture).not.toBeNull();
    expect(fixture?.projects.length).toBeGreaterThan(20);
    expect(getGuidedComicCompletedIssueCount(fixture?.projects ?? [])).toBeGreaterThan(0);

    const groups = getGuidedComicLibrarySeriesGroups(fixture?.projects ?? []);
    expect(groups.length).toBeGreaterThanOrEqual(8);
    expect(groups.some((group) => group.projects.length >= 12)).toBe(true);
    expect(groups.some((group) => group.coverImageUrl)).toBe(true);
    expect(groups.some((group) => group.projects.some((project) => Object.keys(project.snapshot.panelArtImages).length === 0))).toBe(
      true,
    );
  });

  it('builds a missing-covers fixture that exercises placeholder covers', () => {
    const fixture = getGuidedComicLibraryQaFixture('missing-covers');
    const groups = getGuidedComicLibrarySeriesGroups(fixture?.projects ?? []);

    expect(fixture?.projects.length).toBeGreaterThan(0);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group) => group.coverImageUrl === null)).toBe(true);
    expect(fixture?.projects.every((project) => Object.keys(project.snapshot.panelArtImages).length === 0)).toBe(true);
  });
});
