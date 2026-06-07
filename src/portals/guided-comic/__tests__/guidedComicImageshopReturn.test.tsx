import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { GuidedComicFlow } from '@/portals/guided-comic/GuidedComicFlow';
import {
  GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY,
  createGuidedComicProject,
  type GuidedComicProject,
  type GuidedComicProjectSnapshot,
} from '@/portals/guided-comic/guidedComicProjectLibrary';
import { useImageWorkshopBridge } from '@/stores/imageWorkshopBridge';

const GUIDED_COMIC_DRAFT_STORAGE_KEY = 'arcs.guidedComicFlowDraft.v1';

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];
  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve() {}
}

function makeSnapshot(options: {
  seriesTitle: string;
  issueTitle: string;
  writerIssueId: string;
  pageNumbers: number[];
  activePageNumber: number;
  selectedPanelId: string;
}): GuidedComicProjectSnapshot {
  return {
    writerIssueId: options.writerIssueId,
    setupForm: {
      seriesTitle: options.seriesTitle,
      issueTitle: options.issueTitle,
      issueNumber: '1',
      targetPageCount: String(options.pageNumbers.length),
      genre: 'Adventure',
      tone: 'Cinematic',
      layoutMarginMode: 'safe',
      layoutGutterMode: 'standard',
      premise: `${options.issueTitle} premise.`,
    },
    storyForm: {
      premise: `${options.issueTitle} story.`,
      mainCharacters: 'Mara',
      conflict: 'The signal is unstable.',
      setting: 'Astral City',
      endingGoal: 'Restore the signal.',
    },
    outlineBeats: [],
    pageCards: options.pageNumbers.map((pageNumber) => ({
      pageNumber,
      summary: `${options.issueTitle} page ${pageNumber}`,
      panelCount: '2',
      keyCharacters: 'Mara',
      keyLocation: 'Astral City',
      expanded: pageNumber === options.activePageNumber,
      panelBeats: [`Page ${pageNumber} opening.`, `Page ${pageNumber} turn.`],
    })),
    characterReferences: {},
    locationReferences: {},
    npcReferences: {},
    characterPrep: {},
    locationPrep: {},
    propPrep: {},
    panelArtStatuses: {},
    panelArtImages: {},
    pageLayoutTemplates: {},
    pageLayoutIntents: {},
    pageLayoutGeometry: Object.fromEntries(
      options.pageNumbers.map((pageNumber) => [
        pageNumber,
        [
          {
            panelId: `page-${pageNumber}-panel-2`,
            panelNumber: 2,
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            columnSpan: 1,
            rowSpan: 1,
            intent: 'normal',
          },
        ],
      ]),
    ),
    writerDialogueSeeds: {},
    editableDialogueSeeds: {},
    promotedBalloonSeeds: {},
    artDirection: {
      artStyle: 'Graphic novel',
      defaultAspectRatio: 'Match panel layout',
      renderingStyle: 'Clean comic ink',
      colorMood: 'Blue and gold',
      lighting: 'Dramatic',
      continuityNotes: '',
      excludeTextFromImages: true,
    },
    currentStep: 'art',
    selectedPanelId: options.selectedPanelId,
    activePageNumber: options.activePageNumber,
    workspaceMode: 'panel-focus',
  };
}

function makeProject(
  projectId: string,
  snapshot: GuidedComicProjectSnapshot,
  updatedAt: string,
): GuidedComicProject {
  return createGuidedComicProject(snapshot, {
    projectId,
    createdAt: updatedAt,
    updatedAt,
  });
}

function queueImageshopReturn(workspace: { projectId: string | null; writerIssueId: string | null }) {
  const panelReturn = {
    source: 'guided-comic',
    returnTarget: 'guided-comic-art',
    workspace,
    panelId: 'page-2-panel-2',
    pageNumber: 2,
    panelNumber: 2,
    imageUrl: 'data:image/png;base64,imageshop-return',
    seed: 44,
    prompt: 'Mara restores the astral signal.',
    returnedAt: '2026-06-07T12:30:00.000Z',
  } as const;
  useImageWorkshopBridge.setState({
    portalToOpen: 'comic',
    guidedPanelReturn: panelReturn,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  useImageWorkshopBridge.setState({
    portalToOpen: null,
    draft: null,
    guidedHandoff: null,
    guidedPanelReturn: null,
    writerImageMapReturn: null,
  });
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Guided Comic Imageshop return restoration', () => {
  it('switches to the originating saved issue and reopens its returned panel in focus mode', async () => {
    const targetSnapshot = makeSnapshot({
      seriesTitle: 'Target Series',
      issueTitle: 'Target Issue',
      writerIssueId: 'writer-target',
      pageNumbers: [1, 2],
      activePageNumber: 1,
      selectedPanelId: 'page-1-panel-1',
    });
    const otherSnapshot = makeSnapshot({
      seriesTitle: 'Other Series',
      issueTitle: 'Other Issue',
      writerIssueId: 'writer-other',
      pageNumbers: [1],
      activePageNumber: 1,
      selectedPanelId: 'page-1-panel-1',
    });
    const targetProject = makeProject('target-project', targetSnapshot, '2026-06-07T11:00:00.000Z');
    const otherProject = makeProject('other-project', otherSnapshot, '2026-06-07T12:00:00.000Z');
    window.localStorage.setItem(
      GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeProjectId: otherProject.projectId,
        updatedAt: otherProject.updatedAt,
        projects: [targetProject, otherProject],
      }),
    );
    queueImageshopReturn({
      projectId: targetProject.projectId,
      writerIssueId: 'writer-target',
    });

    render(
      <GuidedComicFlow
        onNavigatePortal={vi.fn()}
        onOpenAdvancedStudio={vi.fn()}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Page 2, Panel 2' })).toBeTruthy();
    const returnNavigation = screen.getByRole('navigation', { name: 'Comic Library return navigation' });
    expect(within(returnNavigation).getByText('Target Series #1: Target Issue')).toBeTruthy();
    expect(screen.getByAltText('Assigned art for page 2, panel 2')).toBeTruthy();
    expect(screen.getAllByText('Ready').length).toBeGreaterThan(0);
    await waitFor(() => {
      const recoveryDraft = JSON.parse(window.localStorage.getItem(GUIDED_COMIC_DRAFT_STORAGE_KEY) ?? '{}');
      expect(recoveryDraft.writerIssueId).toBe('writer-target');
      expect(recoveryDraft.pageLayoutGeometry['2'][0].imageUrl).toBe(
        'data:image/png;base64,imageshop-return',
      );
    });
  });

  it('keeps a newer recovery draft when returning to its saved project identity', async () => {
    const savedSnapshot = makeSnapshot({
      seriesTitle: 'Recovery Series',
      issueTitle: 'Saved Issue',
      writerIssueId: 'writer-recovery',
      pageNumbers: [1],
      activePageNumber: 1,
      selectedPanelId: 'page-1-panel-1',
    });
    const recoverySnapshot = makeSnapshot({
      seriesTitle: 'Recovery Series',
      issueTitle: 'Unsaved Recovery Issue',
      writerIssueId: 'writer-recovery',
      pageNumbers: [1, 2],
      activePageNumber: 1,
      selectedPanelId: 'page-1-panel-1',
    });
    const project = makeProject('recovery-project', savedSnapshot, '2026-06-07T11:00:00.000Z');
    window.localStorage.setItem(
      GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeProjectId: project.projectId,
        updatedAt: project.updatedAt,
        projects: [project],
      }),
    );
    window.localStorage.setItem(
      GUIDED_COMIC_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-06-07T12:00:00.000Z',
        activeIndex: 4,
        ...recoverySnapshot,
      }),
    );
    queueImageshopReturn({
      projectId: project.projectId,
      writerIssueId: 'writer-recovery',
    });

    render(
      <GuidedComicFlow
        onNavigatePortal={vi.fn()}
        onOpenAdvancedStudio={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Page 2, Panel 2' })).toBeTruthy();
    });
    expect(screen.getByAltText('Assigned art for page 2, panel 2')).toBeTruthy();
  });
});
