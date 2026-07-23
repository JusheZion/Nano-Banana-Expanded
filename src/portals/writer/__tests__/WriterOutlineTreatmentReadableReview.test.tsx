import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterOutlineTreatmentReadableReview } from '../WriterOutlineTreatmentReadableReview';
import type { TreatmentProposalSession } from '../writerOutlineTreatmentValidation';

const draft = {
  title: 'Harbor',
  premise: 'A beginning.',
  acts: [{ name: 'Act I', summary: 'Arrival.' }],
  page_beats: [
    { treatment_beat_id: 'source-1', page_target: 1, summary: 'Page 1\tOpening.' },
    { treatment_beat_id: 'edit-2', page_target: 2, summary: 'A clearer middle.' },
    { treatment_beat_id: 'source-3', page_target: 3, summary: 'Page 3\\tEnding.' },
  ],
};

const session: TreatmentProposalSession = {
  mode: 'structure',
  source: {
    pageCount: 3,
    protectedTerms: [],
    beats: [
      { id: 'source-1', ordinal: 1, pageTarget: 1, text: 'Opening', original: { page_target: 1, summary: 'Page 1\tOpening.' } },
      { id: 'source-2', ordinal: 2, pageTarget: 2, text: 'Middle', original: { page_target: 2, summary: 'Page 2\tMiddle.' } },
      { id: 'source-3', ordinal: 3, pageTarget: 3, text: 'Ending', original: { page_target: 3, summary: 'Page 3\tEnding.' } },
    ],
    outline: draft,
  },
  proposal: draft,
  manifest: {
    treatmentMode: 'structure',
    sourcePageCount: 3,
    proposedPageCount: 3,
    entries: [
      { resultBeatId: 'source-1', sourceBeatIds: ['source-1'], changeType: 'unchanged', originalPages: [1], proposedPage: 1, reason: 'Retained.' },
      { resultBeatId: 'edit-2', sourceBeatIds: ['source-2'], changeType: 'language_polished', originalPages: [2], proposedPage: 2, reason: 'Clarify the middle.' },
      { resultBeatId: 'source-3', sourceBeatIds: ['source-3'], changeType: 'unchanged', originalPages: [3], proposedPage: 3, reason: 'Retained.' },
    ],
  },
  operationNotices: [{
    operationId: 'reject-3',
    status: 'rejected',
    code: 'source_event_mismatch',
    message: 'The original beat was retained.',
    sourceBeatIds: ['source-3'],
    proposed: { summary: 'An unrelated ending.' },
  }],
};

describe('WriterOutlineTreatmentReadableReview', () => {
  it('shows chronological human-readable changes without JSON or internal ids', () => {
    render(<WriterOutlineTreatmentReadableReview draft={draft} session={session} onChange={vi.fn()} />);

    expect(screen.getAllByText('Page 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Page 3').length).toBeGreaterThan(0);
    const proposedWording = screen.getAllByLabelText('Proposed wording with changes highlighted');
    expect(proposedWording[0]?.textContent).toBe('A clearer middle.');
    expect(proposedWording[1]?.textContent).toBe('An unrelated ending.');
    expect(screen.getByText(/original wording was retained/i)).not.toBeNull();
    expect(document.body.textContent).not.toContain('source-2');
    expect(document.body.textContent).not.toContain('"page_beats"');
    expect(document.body.textContent).not.toContain('\\t');
  });

  it('hides unchanged change cards until requested', () => {
    render(<WriterOutlineTreatmentReadableReview draft={draft} session={session} onChange={vi.fn()} />);
    expect(screen.queryByText('Unchanged', { selector: 'span' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show unchanged pages' }));
    expect(screen.getAllByText('Unchanged', { selector: 'span' })).toHaveLength(2);
  });

  it('navigates to and edits the matching page summary', () => {
    const onChange = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    render(<WriterOutlineTreatmentReadableReview draft={draft} session={session} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Page 2 summary' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Page 2 summary' }), {
      target: { value: 'Edited middle.' },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      page_beats: expect.arrayContaining([
        expect.objectContaining({ page_target: 2, summary: 'Edited middle.' }),
      ]),
    }));
  });
});
