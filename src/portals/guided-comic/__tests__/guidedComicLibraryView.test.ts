import { describe, expect, it } from 'vitest';
import {
  GUIDED_COMIC_LIVING_ARCHIVE_UNLOCK_COUNT,
  getGuidedComicCompletedIssueCount,
  getGuidedComicLibrarySeriesGroups,
  getGuidedComicProjectCoverImageUrl,
  getGuidedComicSeriesKey,
  getGuidedComicSeriesTitle,
  isGuidedComicLivingArchiveUnlocked,
} from '@/portals/guided-comic/guidedComicLibraryView';
import {
  createGuidedComicProject,
  type GuidedComicProject,
  type GuidedComicProjectSnapshot,
} from '@/portals/guided-comic/guidedComicProjectLibrary';

function makeSnapshot(overrides: Partial<GuidedComicProjectSnapshot> = {}): GuidedComicProjectSnapshot {
  return {
    setupForm: {
      seriesTitle: 'Astral City',
      issueTitle: 'Gate of the First Sun',
      issueNumber: '1',
      targetPageCount: '22',
      genre: 'Sci-fi',
      tone: 'Cinematic',
      premise: 'Setup premise.',
    },
    storyForm: {
      premise: 'Story premise.',
      mainCharacters: 'Mara, Sol',
      conflict: 'The gate is unstable.',
      setting: 'Orbital city',
      endingGoal: 'Seal the gate.',
    },
    outlineBeats: [],
    pageCards: [],
    characterReferences: {},
    locationReferences: {},
    npcReferences: {},
    panelArtStatuses: {},
    panelArtImages: {},
    pageLayoutTemplates: {},
    artDirection: {
      artStyle: 'clean line art',
      defaultAspectRatio: 'Match panel layout',
      renderingStyle: 'inked',
      colorMood: 'warm gold',
      lighting: 'sunrise',
      continuityNotes: '',
      excludeTextFromImages: true,
    },
    currentStep: 'pages',
    selectedPanelId: null,
    ...overrides,
  };
}

function makeProject(
  overrides: Partial<GuidedComicProjectSnapshot> & {
    projectId: string;
    createdAt: string;
    updatedAt: string;
  },
): GuidedComicProject {
  const snapshot = makeSnapshot(overrides);
  return createGuidedComicProject(snapshot, {
    projectId: overrides.projectId,
    createdAt: overrides.createdAt,
    updatedAt: overrides.updatedAt,
  });
}

describe('guided comic library view helpers', () => {
  it('normalizes titles and keys', () => {
    expect(getGuidedComicSeriesTitle('  The   Neon\nArchive  ')).toBe('The Neon Archive');
    expect(getGuidedComicSeriesTitle(null)).toBe('Untitled series');
    expect(getGuidedComicSeriesKey('  The   Neon\nArchive!!!  ')).toBe('the-neon-archive');
    expect(getGuidedComicSeriesKey(null)).toBe('untitled-series');
  });

  it('groups issue-level projects into series containers, including one-shot series', () => {
    const issueTwo = makeProject({
      projectId: 'astral-2',
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-03T10:00:00.000Z',
      setupForm: {
        ...makeSnapshot().setupForm,
        seriesTitle: 'Astral City',
        issueTitle: 'Second Light',
        issueNumber: '2',
      },
    });
    const oneShot = makeProject({
      projectId: 'oneshot-1',
      createdAt: '2026-05-02T10:00:00.000Z',
      updatedAt: '2026-05-04T10:00:00.000Z',
      setupForm: {
        ...makeSnapshot().setupForm,
        seriesTitle: 'Signal One-Shot',
        issueTitle: 'Only Signal',
        issueNumber: '1',
      },
    });
    const issueOne = makeProject({
      projectId: 'astral-1',
      createdAt: '2026-05-01T09:00:00.000Z',
      updatedAt: '2026-05-01T12:00:00.000Z',
      setupForm: {
        ...makeSnapshot().setupForm,
        seriesTitle: '  Astral   City ',
        issueTitle: 'First Light',
        issueNumber: '1',
      },
    });

    const groups = getGuidedComicLibrarySeriesGroups([issueTwo, oneShot, issueOne]);

    expect(groups.map((group) => group.seriesKey)).toEqual(['signal-one-shot', 'astral-city']);
    expect(groups[0]).toMatchObject({
      seriesTitle: 'Signal One-Shot',
      defaultCoverProject: oneShot,
      lastUpdatedProject: oneShot,
      premise: 'Story premise.',
    });
    expect(groups[1].projects.map((project) => project.projectId)).toEqual(['astral-1', 'astral-2']);
    expect(groups[1].defaultCoverProject).toBe(issueOne);
    expect(groups[1].lastUpdatedProject).toBe(issueTwo);
  });

  it('derives cover image candidates from panelArtImages with imageUrl', () => {
    const project = makeProject({
      projectId: 'cover-image-url',
      createdAt: '2026-05-01T09:00:00.000Z',
      updatedAt: '2026-05-01T09:00:00.000Z',
      panelArtImages: {
        'page-1-panel-1': { imageUrl: 'https://example.com/panel-1.png' },
      },
    });

    expect(getGuidedComicProjectCoverImageUrl(project)).toBe('https://example.com/panel-1.png');
    expect(getGuidedComicLibrarySeriesGroups([project])[0].coverImageUrl).toBe('https://example.com/panel-1.png');
  });

  it('derives cover image candidates from url fallback', () => {
    const project = makeProject({
      projectId: 'cover-url',
      createdAt: '2026-05-01T09:00:00.000Z',
      updatedAt: '2026-05-01T09:00:00.000Z',
      panelArtImages: {
        'page-1-panel-1': { imageUrl: '   ' },
        'page-1-panel-2': { url: 'https://example.com/panel-2.png' },
      },
    });

    expect(getGuidedComicProjectCoverImageUrl(project)).toBe('https://example.com/panel-2.png');
  });

  it('treats malformed panelArtImages as empty cover candidates', () => {
    const project = makeProject({
      projectId: 'malformed-cover',
      createdAt: '2026-05-01T09:00:00.000Z',
      updatedAt: '2026-05-01T09:00:00.000Z',
      panelArtImages: null as unknown as GuidedComicProjectSnapshot['panelArtImages'],
    });

    expect(getGuidedComicProjectCoverImageUrl(project)).toBeNull();
    expect(getGuidedComicLibrarySeriesGroups([project])[0].coverImageUrl).toBeNull();
  });

  it('counts completed issues from export-stage snapshots', () => {
    const pagesProject = makeProject({
      projectId: 'pages',
      createdAt: '2026-05-01T09:00:00.000Z',
      updatedAt: '2026-05-01T09:00:00.000Z',
      currentStep: 'pages',
    });
    const exportProject = makeProject({
      projectId: 'export',
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
      currentStep: 'export',
    });

    expect(getGuidedComicCompletedIssueCount([pagesProject, exportProject])).toBe(1);
  });

  it('unlocks the living archive only after enough completed issues', () => {
    const completedProjects = Array.from({ length: GUIDED_COMIC_LIVING_ARCHIVE_UNLOCK_COUNT }, (_, index) =>
      makeProject({
        projectId: `export-${index + 1}`,
        createdAt: `2026-05-01T1${index}:00:00.000Z`,
        updatedAt: `2026-05-01T1${index}:00:00.000Z`,
        currentStep: 'export',
      }),
    );

    expect(isGuidedComicLivingArchiveUnlocked(completedProjects.slice(0, GUIDED_COMIC_LIVING_ARCHIVE_UNLOCK_COUNT - 1))).toBe(
      false,
    );
    expect(isGuidedComicLivingArchiveUnlocked(completedProjects)).toBe(true);
  });
});
