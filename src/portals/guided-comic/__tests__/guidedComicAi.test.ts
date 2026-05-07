import { describe, expect, it } from 'vitest';
import {
  applyGuidedComicAiResult,
  buildGuidedComicAiContext,
  getGuidedComicPacingChecks,
  type GuidedComicAiDraft,
} from '@/portals/guided-comic/guidedComicAi';
import type { GuidedComicAssistResult } from '@/shared/writer/types';

function makeDraft(overrides: Partial<GuidedComicAiDraft> = {}): GuidedComicAiDraft {
  return {
    currentStep: 'pages',
    setupForm: {
      seriesTitle: 'Astral City',
      issueTitle: 'Gate of the First Sun',
      issueNumber: '1',
      targetPageCount: '3',
      genre: 'Sci-fi',
      tone: 'Cinematic',
      premise: '',
    },
    storyForm: {
      premise: 'A city wakes beneath twin suns.',
      mainCharacters: 'Mara, Sol',
      conflict: 'The gate is unstable.',
      setting: 'Orbital city',
      endingGoal: '',
    },
    artDirection: {
      artStyle: 'clean line art',
      defaultAspectRatio: 'Match panel layout',
      renderingStyle: 'inked',
      colorMood: 'warm gold',
      lighting: 'sunrise',
      continuityNotes: '',
      excludeTextFromImages: true,
    },
    outlineBeats: [
      { id: 'opening-hook', title: 'Opening Hook', description: 'Mara discovers the gate.', locked: false },
      { id: 'rising-conflict', title: 'Rising Conflict', description: '', locked: false },
      { id: 'midpoint-turn', title: 'Midpoint Turn', description: '', locked: false },
      { id: 'climax', title: 'Climax', description: 'Mara seals the gate.', locked: false },
      { id: 'ending-beat', title: 'Ending Beat', description: '', locked: false },
    ],
    pageCards: [
      {
        pageNumber: 1,
        summary: 'Mara finds the gate.',
        panelCount: '4',
        keyCharacters: 'Mara',
        keyLocation: 'Gate',
        expanded: true,
        panelBeats: ['Wide shot', 'Close-up', 'Close-up', 'Close-up'],
      },
      {
        pageNumber: 2,
        summary: '',
        panelCount: '4',
        keyCharacters: '',
        keyLocation: '',
        expanded: false,
        panelBeats: [],
      },
    ],
    characterReferences: { Mara: [{ imageUrl: 'mara.png', displayName: 'Mara' }] },
    locationReferences: {},
    npcReferences: {},
    panelArtStatuses: {},
    panelArtImages: {},
    pageLayoutTemplates: {},
    selectedPageNumber: 2,
    selectedPanelId: 'page-2-panel-1',
    ...overrides,
  };
}

describe('guided comic AI helpers', () => {
  it('builds compact guided context with selected page and reference counts', () => {
    const context = buildGuidedComicAiContext(makeDraft());

    expect(context.selectedPage?.pageNumber).toBe(2);
    expect(context.referenceCounts).toEqual({ characters: 1, locations: 0, npcs: 0 });
    expect(context.pageCards).toHaveLength(2);
  });

  it('normalizes AI context panel beats to the selected panel count', () => {
    const context = buildGuidedComicAiContext(
      makeDraft({
        selectedPageNumber: 1,
        selectedPanelId: 'page-1-panel-3',
        pageCards: [
          {
            pageNumber: 1,
            summary: 'Mara enters the gate.',
            panelCount: '3',
            keyCharacters: 'Mara',
            keyLocation: 'Gate',
            expanded: true,
            panelBeats: ['Wide gate', 'Mara reacts', 'Crosses threshold', 'Old fourth beat'],
          },
        ],
      }),
    );

    expect(context.pageCards[0]?.panelCount).toBe('3');
    expect(context.pageCards[0]?.panelBeats).toEqual(['Wide gate', 'Mara reacts', 'Crosses threshold']);
    expect(context.selectedPage?.panelBeats).toEqual(['Wide gate', 'Mara reacts', 'Crosses threshold']);
    expect(context.selectedPanel).toMatchObject({
      id: 'page-1-panel-3',
      pageNumber: 1,
      panelNumber: 3,
      beatText: 'Crosses threshold',
    });
  });

  it('omits image data from guided AI context', () => {
    const hugeImage = `data:image/png;base64,${'a'.repeat(200_000)}`;
    const context = buildGuidedComicAiContext(
      makeDraft({
        characterReferences: { Mara: [{ imageUrl: hugeImage, displayName: 'Mara reference' }] },
        panelArtImages: {
          'page-1-panel-1': {
            imageUrl: hugeImage,
            prompt: 'Mara stands before the gate.',
          },
        },
      }),
    );

    const serialized = JSON.stringify(context);

    expect(serialized).not.toContain('data:image');
    expect(serialized).not.toContain('a'.repeat(1000));
    expect(serialized.length).toBeLessThan(20_000);
  });

  it('applies replacement suggestions only to empty fields by default', () => {
    const draft = makeDraft();
    const result: GuidedComicAssistResult = {
      title: 'Story foundation',
      replacements: {
        setupForm: { premise: 'A stronger setup premise.' },
        storyForm: {
          premise: 'Do not replace this existing premise.',
          endingGoal: 'Seal the gate and leave a sunrise cliffhanger.',
        },
      },
    };

    const applied = applyGuidedComicAiResult(draft, result, { mode: 'empty-only' });

    expect(applied.setupForm.premise).toBe('A stronger setup premise.');
    expect(applied.storyForm.premise).toBe('A city wakes beneath twin suns.');
    expect(applied.storyForm.endingGoal).toBe('Seal the gate and leave a sunrise cliffhanger.');
  });

  it('can explicitly replace non-empty fields after confirmation', () => {
    const draft = makeDraft();
    const result: GuidedComicAssistResult = {
      title: 'Conflict',
      replacements: {
        storyForm: { conflict: 'The gate is collapsing into the city.' },
      },
    };

    const applied = applyGuidedComicAiResult(draft, result, { mode: 'replace-confirmed' });

    expect(applied.storyForm.conflict).toBe('The gate is collapsing into the city.');
  });

  it('regenerates only the selected page when requested', () => {
    const draft = makeDraft();
    const result: GuidedComicAssistResult = {
      title: 'Selected page',
      pageUpdates: [
        { pageNumber: 1, summary: 'Should not apply.', panelCount: '3', panelBeats: ['A'] },
        { pageNumber: 2, summary: 'Mara crosses the gate bridge.', panelCount: '2', panelBeats: ['Wide bridge', 'Hand on rail'] },
      ],
    };

    const applied = applyGuidedComicAiResult(draft, result, {
      mode: 'replace-confirmed',
      selectedPageNumber: 2,
      selectedOnly: true,
    });

    expect(applied.pageCards[0].summary).toBe('Mara finds the gate.');
    expect(applied.pageCards[1].summary).toBe('Mara crosses the gate bridge.');
    expect(applied.pageCards[1].panelBeats).toEqual(['Wide bridge', 'Hand on rail']);
  });

  it('uses an AI panel count when applying AI beats to a default four-panel page', () => {
    const draft = makeDraft({
      pageCards: [
        {
          pageNumber: 1,
          summary: '',
          panelCount: '4',
          keyCharacters: '',
          keyLocation: '',
          expanded: true,
          panelBeats: [],
        },
      ],
    });
    const result: GuidedComicAssistResult = {
      title: 'Three-panel page plan',
      pageUpdates: [
        {
          pageNumber: 1,
          summary: 'Mara crosses the threshold.',
          panelCount: '3',
          panelBeats: ['Wide gate', 'Mara reacts', 'Wide bottom reveal'],
        },
      ],
    };

    const applied = applyGuidedComicAiResult(draft, result, { mode: 'empty-only' });

    expect(applied.pageCards[0]?.panelCount).toBe('3');
    expect(applied.pageCards[0]?.panelBeats).toEqual(['Wide gate', 'Mara reacts', 'Wide bottom reveal']);
  });

  it('preserves a user-selected panel count over extra AI panel beats', () => {
    const draft = makeDraft({
      pageCards: [
        {
          pageNumber: 1,
          summary: 'Mara crosses the threshold.',
          panelCount: '3',
          keyCharacters: '',
          keyLocation: '',
          expanded: true,
          panelBeats: ['Existing 1', 'Existing 2', 'Existing 3'],
        },
      ],
    });
    const result: GuidedComicAssistResult = {
      title: 'Panel beats',
      pageUpdates: [
        {
          pageNumber: 1,
          panelCount: '4',
          panelBeats: ['New 1', 'New 2', 'New 3', 'New 4'],
        },
      ],
    };

    const applied = applyGuidedComicAiResult(draft, result, { mode: 'empty-only' });

    expect(applied.pageCards[0]?.panelCount).toBe('3');
    expect(applied.pageCards[0]?.panelBeats).toEqual(['Existing 1', 'Existing 2', 'Existing 3']);
  });

  it('maps outline beat suggestions by id without dropping existing beats', () => {
    const draft = makeDraft();
    const result: GuidedComicAssistResult = {
      title: 'Outline',
      outlineBeats: [
        { id: 'rising-conflict', title: 'Rising Conflict', description: 'Sol warns Mara the city will fracture.' },
      ],
    };

    const applied = applyGuidedComicAiResult(draft, result, { mode: 'empty-only' });

    expect(applied.outlineBeats[0].description).toBe('Mara discovers the gate.');
    expect(applied.outlineBeats[1].description).toBe('Sol warns Mara the city will fracture.');
  });

  it('reports deterministic pacing and reference checks', () => {
    const checks = getGuidedComicPacingChecks(buildGuidedComicAiContext(makeDraft()));

    expect(checks.some((check) => check.id === 'opening-hook' && check.status === 'ready')).toBe(true);
    expect(checks.some((check) => check.id === 'midpoint-turn' && check.status === 'needs-work')).toBe(true);
    expect(checks.some((check) => check.id === 'missing-locations' && check.status === 'needs-work')).toBe(true);
    expect(checks.some((check) => check.id === 'repeated-panel-types' && check.status === 'needs-work')).toBe(true);
  });
});
