import { describe, expect, it } from 'vitest';
import type { WriterIssueRow, WriterPageRow } from '@/shared/api/arcsWriterRoom';
import type { IssueOutline } from '@/shared/writer/types';
import {
  createWriterIssueDraftFromGuidedStoryFoundation,
  buildGuidedWriterToolRequest,
  getGuidedWriterPageBeatBatchOffsets,
  mapWriterDialogueToGuidedDialogueSeeds,
  mapWriterIssueToGuidedStoryFoundation,
  mapWriterOutlineToGuidedOutlineBeats,
  mapWriterOutlineToGuidedPageCards,
  mapWriterPagesToGuidedPageCards,
  mergeWriterOutlineIntoGuidedPageCards,
  mergeWriterPagesIntoGuidedPageCards,
} from '../writersWorkshopBridge';

function makeWriterPage(
  overrides: Partial<Pick<WriterPageRow, 'id' | 'issue_id' | 'page_number' | 'beats_json' | 'script_text'>> = {},
): Pick<WriterPageRow, 'id' | 'issue_id' | 'page_number' | 'beats_json' | 'script_text'> {
  return {
    id: 'page-1',
    issue_id: 'issue-1',
    page_number: 1,
    beats_json: null,
    script_text: null,
    ...overrides,
  };
}

describe('writersWorkshopBridge', () => {
  it('builds direct writer-tools requests for linked Guided Comics issue actions', () => {
    expect(
      buildGuidedWriterToolRequest('outline', {
        issueId: '550e8400-e29b-41d4-a716-446655440000',
        targetPageCount: 12,
        outlineSupplement: 'Emphasize visual set pieces.',
      }),
    ).toEqual({
      mode: 'outline_issue',
      issue_id: '550e8400-e29b-41d4-a716-446655440000',
      target_page_count: 12,
      outline_supplement: 'Emphasize visual set pieces.',
    });
    expect(
      buildGuidedWriterToolRequest('pacing', {
        issueId: '550e8400-e29b-41d4-a716-446655440000',
        targetPageCount: 12,
      }),
    ).toEqual({
      mode: 'pacing_review',
      issue_id: '550e8400-e29b-41d4-a716-446655440000',
      target_page_count: 12,
    });
    expect(
      buildGuidedWriterToolRequest('page-beats', {
        issueId: '550e8400-e29b-41d4-a716-446655440000',
        batchLimit: 5,
        batchOffset: 10,
      }),
    ).toEqual({
      mode: 'page_beats_issue',
      issue_id: '550e8400-e29b-41d4-a716-446655440000',
      skip_existing: false,
      batch_limit: 5,
      batch_offset: 10,
    });
    expect(
      buildGuidedWriterToolRequest('dialogue', {
        issueId: '550e8400-e29b-41d4-a716-446655440000',
        pageId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      }),
    ).toEqual({
      mode: 'draft_dialogue',
      page_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      style: 'comic_script',
    });
  });

  it('plans page-beat issue batches within the writer-tools batch cap', () => {
    expect(getGuidedWriterPageBeatBatchOffsets(12, 5)).toEqual([0, 5, 10]);
    expect(getGuidedWriterPageBeatBatchOffsets(0, 5)).toEqual([]);
    expect(getGuidedWriterPageBeatBatchOffsets(3, 5)).toEqual([0]);
  });

  it('creates Writers Workshop issue metadata from Guided Comic story foundation without requiring persistence', () => {
    const draft = createWriterIssueDraftFromGuidedStoryFoundation({
      seriesTitle: 'Astral City',
      issueTitle: 'Gate of the First Sun',
      issueNumber: '3',
      targetPageCount: '6',
      genre: 'Sci-fi',
      tone: 'Cinematic',
      premise: 'A city wakes under twin suns.',
      characters: 'Mara, Sol',
      setting: 'Orbital city',
      conflict: 'The gate is unstable.',
      endingGoal: 'Seal the gate before dawn.',
    });

    expect(draft).toEqual({
      title: 'Gate of the First Sun',
      issueNumber: 3,
      synopsis: [
        'A city wakes under twin suns.',
        'Characters: Mara, Sol',
        'Setting: Orbital city',
        'Conflict: The gate is unstable.',
        'Ending goal: Seal the gate before dawn.',
      ].join('\n\n'),
      notes: {
        guidedComic: {
          seriesTitle: 'Astral City',
          genre: 'Sci-fi',
          tone: 'Cinematic',
          targetPageCount: 6,
          storyFoundation: {
            premise: 'A city wakes under twin suns.',
            characters: 'Mara, Sol',
            setting: 'Orbital city',
            conflict: 'The gate is unstable.',
            endingGoal: 'Seal the gate before dawn.',
          },
        },
      },
    });
  });

  it('maps linked Writers Workshop issue metadata back into a Guided Comic story foundation', () => {
    const issue: WriterIssueRow = {
      id: 'writer-issue-1',
      series_id: 'series-1',
      issue_number: 4,
      title: 'Rain Over Star Pier',
      status: 'draft',
      synopsis: 'A detective follows a signal through a flooded spaceport.',
      notes: {
        guidedComic: {
          seriesTitle: 'Star Pier',
          genre: 'Mystery',
          tone: 'Noir',
          targetPageCount: 8,
          storyFoundation: {
            premise: 'A detective follows a signal through a flooded spaceport.',
            characters: 'Iris, Vale',
            setting: 'Flooded spaceport',
            conflict: 'The signal is a trap.',
            endingGoal: 'Reveal who sent the signal.',
          },
        },
      },
      created_at: '2026-05-11T12:00:00.000Z',
    };

    const foundation = mapWriterIssueToGuidedStoryFoundation(issue, {
      outline: {
        title: 'Rain Over Star Pier',
        premise: 'Iris discovers the signal is coming from her missing partner.',
      },
    });

    expect(foundation).toEqual({
      writerIssueId: 'writer-issue-1',
      seriesTitle: 'Star Pier',
      issueTitle: 'Rain Over Star Pier',
      issueNumber: '4',
      targetPageCount: '8',
      genre: 'Mystery',
      tone: 'Noir',
      premise: 'Iris discovers the signal is coming from her missing partner.',
      characters: 'Iris, Vale',
      setting: 'Flooded spaceport',
      conflict: 'The signal is a trap.',
      endingGoal: 'Reveal who sent the signal.',
    });
  });

  it('maps accepted Writers Workshop outline page beats into Guided page cards', () => {
    const outline: IssueOutline = {
      title: 'Gate of the First Sun',
      premise: 'A city wakes under twin suns.',
      page_beats: [
        {
          page_target: 1,
          scene: 'Orbital Gate',
          summary: 'Mara discovers the gate is already awake.',
          emotional_turn: 'awe',
        },
        {
          page_target: 2,
          summary: 'Sol warns that the gate is pulling the city out of orbit.',
          emotional_turn: 'dread',
        },
        {
          page_target: 4,
          summary: 'Mara seals the gate by choosing the city over escape.',
          emotional_turn: 'resolve',
        },
      ],
    };

    const cards = mapWriterOutlineToGuidedPageCards(outline, {
      targetPageCount: 4,
      defaultPanelCount: 3,
    });

    expect(cards.map((card) => card.pageNumber)).toEqual([1, 2, 3, 4]);
    expect(cards[0]).toMatchObject({
      pageNumber: 1,
      panelCount: '3',
      keyLocation: 'Orbital Gate',
      summary: 'Mara discovers the gate is already awake.\n\nTurn: awe',
      expanded: true,
      panelBeats: [],
    });
    expect(cards[2].summary).toBe('');
    expect(cards[3].summary).toBe('Mara seals the gate by choosing the city over escape.\n\nTurn: resolve');
  });

  it('maps Writers Workshop outline structure into Guided outline beats', () => {
    const beats = mapWriterOutlineToGuidedOutlineBeats({
      acts: [
        { name: 'Opening', summary: 'Mara finds the gate.' },
        { name: 'Pressure', goal: 'Keep the city in orbit.' },
        { name: 'Turn', summary: 'The gate wants a pilot.' },
        { name: 'Climax', summary: 'Mara chooses the city.' },
        { name: 'Aftermath', summary: 'Dawn arrives.' },
      ],
      page_beats: [{ summary: 'Fallback page beat should not be needed.' }],
    });

    expect(beats).toEqual([
      { id: 'opening-hook', title: 'Opening Hook', description: 'Mara finds the gate.', locked: false },
      { id: 'rising-conflict', title: 'Rising Conflict', description: 'Keep the city in orbit.', locked: false },
      { id: 'midpoint-turn', title: 'Midpoint Turn', description: 'The gate wants a pilot.', locked: false },
      { id: 'climax', title: 'Climax', description: 'Mara chooses the city.', locked: false },
      { id: 'ending-beat', title: 'Ending Beat', description: 'Dawn arrives.', locked: false },
    ]);
  });

  it('merges Writers Workshop outline page cards without overwriting local Guided page edits', () => {
    const merged = mergeWriterOutlineIntoGuidedPageCards(
      [
        {
          pageNumber: 1,
          summary: 'User-edited page summary.',
          panelCount: '5',
          keyCharacters: 'Mara',
          keyLocation: 'User location',
          expanded: false,
          panelBeats: ['User panel beat'],
        },
        {
          pageNumber: 3,
          summary: 'Local-only bridge page.',
          panelCount: '2',
          keyCharacters: '',
          keyLocation: '',
          expanded: true,
          panelBeats: ['Keep this'],
        },
      ],
      [
        {
          pageNumber: 1,
          summary: 'Imported outline summary.',
          panelCount: '3',
          keyCharacters: '',
          keyLocation: 'Imported location',
          expanded: true,
          panelBeats: [],
        },
        {
          pageNumber: 2,
          summary: 'Imported second page.',
          panelCount: '3',
          keyCharacters: '',
          keyLocation: 'Second location',
          expanded: true,
          panelBeats: [],
        },
      ],
    );

    expect(merged).toEqual([
      {
        pageNumber: 1,
        summary: 'User-edited page summary.',
        panelCount: '5',
        keyCharacters: 'Mara',
        keyLocation: 'User location',
        expanded: false,
        panelBeats: ['User panel beat'],
      },
      {
        pageNumber: 2,
        summary: 'Imported second page.',
        panelCount: '3',
        keyCharacters: '',
        keyLocation: 'Second location',
        expanded: true,
        panelBeats: [],
      },
      {
        pageNumber: 3,
        summary: 'Local-only bridge page.',
        panelCount: '2',
        keyCharacters: '',
        keyLocation: '',
        expanded: true,
        panelBeats: ['Keep this'],
      },
    ]);
  });

  it('maps Writers Workshop page beats into Guided panel beats while preserving existing page settings', () => {
    const pages = [
      makeWriterPage({
        beats_json: {
          page_number_ref: 1,
          one_line_hook: 'Mara enters the gate.',
          panels: [
            {
              index: 1,
              action: 'Wide shot of the gate opening above the city.',
              composition: 'wide establishing panel',
              emotion: 'awe',
              dialogue_placeholder: 'MARA: It is awake.',
            },
            {
              index: 2,
              action: 'Sol reaches for the failing controls.',
              sfx: 'KRAK',
            },
          ],
        },
      }),
    ];

    const cards = mapWriterPagesToGuidedPageCards(pages, {
      defaultPanelCount: 4,
      existingCards: [
        {
          pageNumber: 1,
          summary: 'User-edited page summary.',
          panelCount: '5',
          keyCharacters: 'Mara, Sol',
          keyLocation: 'Orbital Gate',
          expanded: false,
          panelBeats: ['Old beat'],
        },
      ],
    });

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      pageNumber: 1,
      summary: 'User-edited page summary.',
      panelCount: '5',
      keyCharacters: 'Mara, Sol',
      keyLocation: 'Orbital Gate',
      expanded: false,
    });
    expect(cards[0].panelBeats).toEqual([
      'Panel 1: Wide shot of the gate opening above the city. Composition: wide establishing panel. Emotion: awe. Dialogue: MARA: It is awake.',
      'Panel 2: Sol reaches for the failing controls. SFX: KRAK.',
    ]);
  });

  it('creates new Guided page cards from Writers Workshop page beats when no local card exists', () => {
    const cards = mapWriterPagesToGuidedPageCards([
      makeWriterPage({
        id: 'page-2',
        page_number: 2,
        beats_json: {
          one_line_hook: 'Sol buys Mara one more minute.',
          panels: [{ index: 1, action: 'Sol braces the control tower door.' }],
        },
      }),
    ]);

    expect(cards).toEqual([
      {
        pageNumber: 2,
        summary: 'Sol buys Mara one more minute.',
        panelCount: '1',
        keyCharacters: '',
        keyLocation: '',
        expanded: true,
        panelBeats: ['Panel 1: Sol braces the control tower door.'],
      },
    ]);
  });

  it('merges Writers Workshop page beats into Guided cards while keeping local-only pages', () => {
    const merged = mergeWriterPagesIntoGuidedPageCards(
      [
        {
          pageNumber: 1,
          summary: 'Local summary.',
          panelCount: '4',
          keyCharacters: 'Mara',
          keyLocation: 'Gate',
          expanded: false,
          panelBeats: ['Old beat'],
        },
        {
          pageNumber: 3,
          summary: 'Local-only page.',
          panelCount: '2',
          keyCharacters: '',
          keyLocation: '',
          expanded: true,
          panelBeats: ['Keep local beat'],
        },
      ],
      [
        makeWriterPage({
          page_number: 1,
          beats_json: {
            one_line_hook: 'Writer summary should not replace local summary.',
            panels: [{ index: 1, action: 'Writer beat replaces old panel beats.' }],
          },
        }),
        makeWriterPage({
          id: 'page-2',
          page_number: 2,
          beats_json: {
            one_line_hook: 'New writer page.',
            panels: [{ index: 1, action: 'New writer beat.' }],
          },
        }),
      ],
    );

    expect(merged.map((card) => card.pageNumber)).toEqual([1, 2, 3]);
    expect(merged[0]).toMatchObject({
      pageNumber: 1,
      summary: 'Local summary.',
      panelCount: '4',
      expanded: false,
      panelBeats: ['Panel 1: Writer beat replaces old panel beats.'],
    });
    expect(merged[2]).toMatchObject({
      pageNumber: 3,
      summary: 'Local-only page.',
      panelBeats: ['Keep local beat'],
    });
  });

  it('extracts dialogue seeds from Writers Workshop comic script pages', () => {
    const seeds = mapWriterDialogueToGuidedDialogueSeeds([
      makeWriterPage({
        id: 'writer-page-1',
        script_text: [
          'PANEL 1',
          'MARA: It is awake.',
          'CAPTION: Dawn splits the city.',
          '',
          'PANEL 2',
          'SOL: Run.',
        ].join('\n'),
        beats_json: {
          panels: [
            { index: 1, action: 'Mara looks up at the gate.' },
            { index: 2, action: 'Sol grabs her hand.' },
          ],
        },
      }),
    ]);

    expect(seeds).toEqual([
      {
        pageId: 'writer-page-1',
        pageNumber: 1,
        scriptText: 'PANEL 1\nMARA: It is awake.\nCAPTION: Dawn splits the city.\n\nPANEL 2\nSOL: Run.',
        panelSeeds: [
          {
            panelNumber: 1,
            beatText: 'Mara looks up at the gate.',
            dialogueText: 'MARA: It is awake.\nCAPTION: Dawn splits the city.',
          },
          {
            panelNumber: 2,
            beatText: 'Sol grabs her hand.',
            dialogueText: 'SOL: Run.',
          },
        ],
      },
    ]);
  });
});
