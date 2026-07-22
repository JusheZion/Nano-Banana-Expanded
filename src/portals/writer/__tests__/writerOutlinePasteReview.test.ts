import { describe, expect, it } from 'vitest';
import { formatOutlineAsText, parseOutlineText } from '../writerExportFormats';
import {
  analyzeOutlinePaste,
  assignOutlinePassages,
} from '../writerOutlinePasteReview';

describe('analyzeOutlinePaste', () => {
  it('returns unknown prose verbatim as deterministic unassigned text', () => {
    const result = analyzeOutlinePaste('TITLE: Twove\nAct III - Return\nClosing reflection without a label');

    expect(result.passages.map((passage) => passage.text)).toEqual([
      'TITLE: Twove',
      'Act III - Return',
      'Closing reflection without a label',
    ]);
    expect(result.passages.at(-1)).toMatchObject({
      assignment: 'unassigned',
      provenance: 'deterministic',
    });
    expect(result.requiresReview).toBe(true);
  });

  it('keeps every prose-only line as a separate unassigned passage', () => {
    const result = analyzeOutlinePaste('Opening reflection.\nA second paragraph follows.');

    expect(result.passages).toMatchObject([
      { text: 'Opening reflection.', startLine: 1, endLine: 1, assignment: 'unassigned' },
      { text: 'A second paragraph follows.', startLine: 2, endLine: 2, assignment: 'unassigned' },
    ]);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: 'unassigned',
      passageIds: result.passages.map((passage) => passage.id),
    }));
  });

  it('recognizes Roman-numeral Acts with copied dash variants', () => {
    const result = analyzeOutlinePaste([
      'ACTS:',
      'Act I - Opening',
      'Act II – Conjunction',
      '**Act III — Return**',
    ].join('\n'));

    expect(result.passages.slice(1)).toMatchObject([
      { assignment: 'act', actName: 'Act I' },
      { assignment: 'act', actName: 'Act II' },
      { assignment: 'act', actName: 'Act III' },
    ]);
    expect(result.proposedOutline).toEqual(parseOutlineText([
      'ACTS:',
      'Act I - Opening',
      'Act II – Conjunction',
      '**Act III — Return**',
    ].join('\n')));
  });

  it('recognizes numbered page beats and explicit Page headings', () => {
    const result = analyzeOutlinePaste([
      'PAGE BEATS:',
      '1\tOpening image: The story begins.',
      '- Page 2 — Threshold: The heroes depart.',
      'Page 3 — Return: The circle closes.',
    ].join('\n'));

    expect(result.passages.filter((passage) => passage.pageTarget).map((passage) => ({
      assignment: passage.assignment,
      pageTarget: passage.pageTarget,
    }))).toEqual([
      { assignment: 'page_beat', pageTarget: 1 },
      { assignment: 'page_beat', pageTarget: 2 },
      { assignment: 'page_beat', pageTarget: 3 },
    ]);
    expect(result.proposedOutline.page_beats).toEqual([
      { page_target: 1, scene: 'Opening image', summary: 'The story begins.' },
      { page_target: 2, scene: 'Threshold', summary: 'The heroes depart.' },
      { page_target: 3, scene: 'Return', summary: 'The circle closes.' },
    ]);
  });

  it('warns about duplicate page assignments', () => {
    const result = analyzeOutlinePaste('1. Opening image\nPage 1 — Repeated opening');
    const pagePassages = result.passages.filter((passage) => passage.pageTarget === 1);

    expect(result.warnings).toContainEqual({
      code: 'duplicate_page',
      message: 'Page 1 is assigned more than once.',
      passageIds: pagePassages.map((passage) => passage.id),
    });
    expect(result.requiresReview).toBe(true);
  });

  it('warns about gaps between assigned pages', () => {
    const result = analyzeOutlinePaste('1. Opening image\n3. Closing image');

    expect(result.warnings).toContainEqual({
      code: 'page_gap',
      message: 'Missing page targets: 2.',
      passageIds: result.passages.map((passage) => passage.id),
    });
  });

  it('reports the highest valid explicit page as the inferred page count', () => {
    expect(analyzeOutlinePaste('1. Opening\n12) Closing').inferredPageCount).toBe(12);
    expect(analyzeOutlinePaste('A story with no page markers.').inferredPageCount).toBeNull();
  });

  it('preserves known parser output for fully recognized text', () => {
    const text = [
      'TITLE: Twove',
      'PREMISE: Two souls collide across timelines.',
      'ACTS:',
      'Act I — Opening',
      'The characters cross the threshold.',
      'PAGE BEATS:',
      '- Page 1 — Campfire: The story begins.',
    ].join('\n');

    expect(analyzeOutlinePaste(text).proposedOutline).toEqual(parseOutlineText(text));
  });

  it('preserves separate goal and summary fields in canonical Act list items', () => {
    const text = formatOutlineAsText({
      acts: [{
        name: 'Act 1',
        goal: 'Establish stakes',
        summary: 'Pony wakes in the Virtualverse.',
      }],
    });

    expect(analyzeOutlinePaste(text).proposedOutline).toEqual(parseOutlineText(text));
    expect(analyzeOutlinePaste(text).proposedOutline.acts).toEqual([{
      name: 'Act 1',
      goal: 'Establish stakes',
      summary: 'Pony wakes in the Virtualverse.',
    }]);
  });

  it('accounts for every non-empty source line exactly once without changing its text', () => {
    const text = [
      '  TITLE: Twove  ',
      '',
      'ACTS:',
      'Act I — Opening',
      '  Summary with meaningful surrounding spaces.  ',
      '',
      'Unlabeled epilogue.',
    ].join('\n');
    const result = analyzeOutlinePaste(text);
    const nonEmptyLines = text
      .split('\n')
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => line.trim().length > 0);

    expect(result.passages.map((passage) => passage.text)).toEqual(nonEmptyLines.map(({ line }) => line));
    expect(result.passages.flatMap((passage) => {
      const coveredLines = [];
      for (let line = passage.startLine; line <= passage.endLine; line += 1) coveredLines.push(line);
      return coveredLines;
    })).toEqual(nonEmptyLines.map(({ lineNumber }) => lineNumber));
    expect(analyzeOutlinePaste(text).passages.map((passage) => passage.id)).toEqual(
      result.passages.map((passage) => passage.id),
    );
  });
});

describe('assignOutlinePassages', () => {
  it('immutably assigns Notes, Act metadata, and sequential Page Beat numbers', () => {
    const diagnostic = analyzeOutlinePaste([
      'Keep this as a note.',
      'This is the second movement.',
      'Opening beat.',
      'Closing beat.',
    ].join('\n'));
    const [note, act, opening, closing] = diagnostic.passages;

    const withNote = assignOutlinePassages(diagnostic, [note.id], 'notes');
    const withAct = assignOutlinePassages(withNote, [act.id], 'act', { actName: 'Act II' });
    const assigned = assignOutlinePassages(withAct, [opening.id, closing.id], 'page_beat', {
      firstPageTarget: 7,
    });

    expect(diagnostic.passages.every((passage) => passage.assignment === 'unassigned')).toBe(true);
    expect(assigned.passages).toMatchObject([
      { assignment: 'notes', provenance: 'user' },
      { assignment: 'act', provenance: 'user', actName: 'Act II' },
      { assignment: 'page_beat', provenance: 'user', pageTarget: 7 },
      { assignment: 'page_beat', provenance: 'user', pageTarget: 8 },
    ]);
    expect(assigned.proposedOutline).toMatchObject({
      acts: [{ name: 'Act II', summary: 'This is the second movement.' }],
      page_beats: [
        { page_target: 7, summary: 'Opening beat.' },
        { page_target: 8, summary: 'Closing beat.' },
      ],
      notes: ['Keep this as a note.'],
    });
    expect(assigned.inferredPageCount).toBe(8);
    expect(assigned.requiresReview).toBe(false);
  });
});
