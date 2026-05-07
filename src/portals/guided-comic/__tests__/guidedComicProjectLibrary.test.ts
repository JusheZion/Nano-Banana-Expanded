import { describe, expect, it } from 'vitest';
import {
  GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY,
  createGuidedComicProject,
  createGuidedComicProjectLibrary,
  deleteGuidedComicProject,
  duplicateGuidedComicProject,
  getGuidedComicProjectDisplayName,
  isGuidedComicProjectSnapshotDirty,
  parseGuidedComicProjectLibrary,
  renameGuidedComicProject,
  upsertGuidedComicProject,
  type GuidedComicProjectSnapshot,
} from '@/portals/guided-comic/guidedComicProjectLibrary';

function makeSnapshot(overrides: Partial<GuidedComicProjectSnapshot> = {}): GuidedComicProjectSnapshot {
  return {
    setupForm: {
      seriesTitle: 'Astral City',
      issueTitle: 'Gate of the First Sun',
      issueNumber: '3',
      targetPageCount: '22',
      genre: 'Sci-fi',
      tone: 'Cinematic',
      premise: 'A city awakens under twin suns.',
    },
    storyForm: {
      premise: 'A city awakens under twin suns.',
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

describe('guided comic project library', () => {
  it('uses the expected storage key for the local project library', () => {
    expect(GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY).toBe('arcs.guidedComicProjectLibrary.v1');
  });

  it('creates a named project from the current guided flow snapshot', () => {
    const snapshot = makeSnapshot();
    const project = createGuidedComicProject(snapshot, {
      projectId: 'project-1',
      createdAt: '2026-05-06T12:00:00.000Z',
      updatedAt: '2026-05-06T12:00:00.000Z',
    });

    expect(project).toMatchObject({
      projectId: 'project-1',
      seriesTitle: 'Astral City',
      issueTitle: 'Gate of the First Sun',
      issueNumber: '3',
      createdAt: '2026-05-06T12:00:00.000Z',
      updatedAt: '2026-05-06T12:00:00.000Z',
    });
    expect(project.snapshot.currentStep).toBe('pages');
    expect(project.snapshot.storyForm.mainCharacters).toBe('Mara, Sol');
  });

  it('migrates one current snapshot into an active project library', () => {
    const library = createGuidedComicProjectLibrary(makeSnapshot(), {
      projectId: 'migrated-draft',
      now: '2026-05-06T12:05:00.000Z',
    });

    expect(library.version).toBe(1);
    expect(library.activeProjectId).toBe('migrated-draft');
    expect(library.projects).toHaveLength(1);
    expect(library.projects[0].snapshot.currentStep).toBe('pages');
  });

  it('parses a valid library and rejects malformed storage payloads', () => {
    const library = createGuidedComicProjectLibrary(makeSnapshot(), {
      projectId: 'project-1',
      now: '2026-05-06T12:10:00.000Z',
    });

    expect(parseGuidedComicProjectLibrary(JSON.stringify(library))?.activeProjectId).toBe('project-1');
    expect(parseGuidedComicProjectLibrary('not json')).toBeNull();
    expect(parseGuidedComicProjectLibrary(JSON.stringify({ version: 2, projects: [] }))).toBeNull();
  });

  it('updates, renames, duplicates, and deletes projects without mutating the original library', () => {
    const original = createGuidedComicProjectLibrary(makeSnapshot(), {
      projectId: 'project-1',
      now: '2026-05-06T12:15:00.000Z',
    });
    const renamed = renameGuidedComicProject(original, 'project-1', {
      seriesTitle: 'Renamed Series',
      issueTitle: 'Renamed Issue',
      issueNumber: '4',
      updatedAt: '2026-05-06T12:16:00.000Z',
    });
    const duplicate = duplicateGuidedComicProject(renamed.projects[0], {
      projectId: 'project-2',
      createdAt: '2026-05-06T12:17:00.000Z',
      updatedAt: '2026-05-06T12:17:00.000Z',
    });
    const withDuplicate = upsertGuidedComicProject(renamed, duplicate, true);
    const deleted = deleteGuidedComicProject(withDuplicate, 'project-1');

    expect(original.projects[0].seriesTitle).toBe('Astral City');
    expect(renamed.projects[0].seriesTitle).toBe('Renamed Series');
    expect(duplicate.projectId).toBe('project-2');
    expect(duplicate.seriesTitle).toBe('Renamed Series Copy');
    expect(withDuplicate.activeProjectId).toBe('project-2');
    expect(deleted.projects.map((project) => project.projectId)).toEqual(['project-2']);
    expect(deleted.activeProjectId).toBe('project-2');
  });

  it('detects unsaved changes by comparing the active snapshot to the saved project', () => {
    const saved = createGuidedComicProject(makeSnapshot(), {
      projectId: 'project-1',
      createdAt: '2026-05-06T12:20:00.000Z',
      updatedAt: '2026-05-06T12:20:00.000Z',
    });
    const changedSnapshot = makeSnapshot({
      storyForm: {
        ...saved.snapshot.storyForm,
        conflict: 'The gate is stable now.',
      },
    });

    expect(isGuidedComicProjectSnapshotDirty(saved.snapshot, saved)).toBe(false);
    expect(isGuidedComicProjectSnapshotDirty(changedSnapshot, saved)).toBe(true);
  });

  it('builds readable display names with untitled fallbacks', () => {
    expect(getGuidedComicProjectDisplayName(createGuidedComicProject(makeSnapshot()))).toBe(
      'Astral City #3: Gate of the First Sun',
    );
    expect(
      getGuidedComicProjectDisplayName(
        createGuidedComicProject(
          makeSnapshot({
            setupForm: {
              ...makeSnapshot().setupForm,
              seriesTitle: '',
              issueTitle: '',
              issueNumber: '',
            },
          }),
        ),
      ),
    ).toBe('Untitled guided comic');
  });
});
