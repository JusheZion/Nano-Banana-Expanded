import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterOutlineTreatmentReview } from '../WriterOutlineTreatmentReview';

const proposal = {
  title: 'Harbor',
  page_beats: [{ page_target: 1, summary: 'Arrival' }],
};

const session = {
  mode: 'preserve' as const,
  source: {
    pageCount: 1,
    protectedTerms: [],
    beats: [{
      id: 'source-page-1-1',
      ordinal: 1,
      pageTarget: 1,
      text: 'Arrival',
      original: { page_target: 1, summary: 'Arrival' },
    }],
  },
  proposal: {
    title: 'Harbor',
    page_beats: [{ treatment_beat_id: 'result-1', page_target: 1, summary: 'Arrival' }],
  },
  manifest: {
    treatmentMode: 'preserve' as const,
    sourcePageCount: 1,
    proposedPageCount: 1,
    entries: [{
      resultBeatId: 'result-1',
      sourceBeatIds: ['source-page-1-1'],
      changeType: 'unchanged' as const,
      originalPages: [1],
      proposedPage: 1,
      reason: 'Unchanged.',
    }],
  },
};

describe('WriterOutlineTreatmentReview', () => {
  it('keeps a proposal editable and promotes only on explicit confirmation', () => {
    const onMakeOfficial = vi.fn();
    render(
      <WriterOutlineTreatmentReview
        currentOutline={{ title: 'Old Harbor' }}
        proposal={proposal}
        onCancel={vi.fn()}
        onRegenerate={vi.fn()}
        onMakeOfficial={onMakeOfficial}
      />,
    );

    expect(onMakeOfficial).not.toHaveBeenCalled();
    const editor = screen.getByRole('textbox', { name: 'Editable AI outline proposal' });
    fireEvent.change(editor, { target: { value: '{"title":"Edited Harbor","page_beats":[]}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make official' }));
    expect(onMakeOfficial).toHaveBeenCalledWith({ title: 'Edited Harbor', page_beats: [] });
  });

  it('preserves the proposal and reports invalid JSON', () => {
    const onMakeOfficial = vi.fn();
    render(
      <WriterOutlineTreatmentReview
        currentOutline={null}
        proposal={proposal}
        onCancel={vi.fn()}
        onRegenerate={vi.fn()}
        onMakeOfficial={onMakeOfficial}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Editable AI outline proposal' }), { target: { value: '{bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make official' }));
    expect(screen.getByRole('alert').textContent).toMatch(/valid JSON/i);
    expect(onMakeOfficial).not.toHaveBeenCalled();
  });

  it('offers cancel and regenerate without promotion', () => {
    const onCancel = vi.fn();
    const onRegenerate = vi.fn();
    render(
      <WriterOutlineTreatmentReview
        currentOutline={null}
        proposal={proposal}
        onCancel={onCancel}
        onRegenerate={onRegenerate}
        onMakeOfficial={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel proposal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate proposal' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it('can keep the edited proposal as an alternate without promotion', () => {
    const onKeepAlternate = vi.fn();
    const onMakeOfficial = vi.fn();
    render(
      <WriterOutlineTreatmentReview
        currentOutline={null}
        proposal={proposal}
        onCancel={vi.fn()}
        onRegenerate={vi.fn()}
        onKeepAlternate={onKeepAlternate}
        onMakeOfficial={onMakeOfficial}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Keep as alternate' }));
    expect(onKeepAlternate).toHaveBeenCalledWith(proposal);
    expect(onMakeOfficial).not.toHaveBeenCalled();
  });

  it('shows the selected contract and preservation summary in Simple review', () => {
    render(
      <WriterOutlineTreatmentReview
        currentOutline={null}
        proposal={session.proposal}
        session={session}
        workflowMode="simple"
        onCancel={vi.fn()}
        onRegenerate={vi.fn()}
        onMakeOfficial={vi.fn()}
      />,
    );
    expect(screen.getByText('Keep my order')).not.toBeNull();
    expect(screen.getByLabelText('Treatment preservation summary').textContent).toMatch(/1 → 1/);
    expect(screen.getByText('Review details')).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Review before making official' }));
    expect(screen.queryByText('Review changes')).toBeNull();
  });

  it('shows per-change review in Advanced mode', () => {
    render(
      <WriterOutlineTreatmentReview
        currentOutline={null}
        proposal={session.proposal}
        session={session}
        workflowMode="advanced"
        onCancel={vi.fn()}
        onRegenerate={vi.fn()}
        onMakeOfficial={vi.fn()}
      />,
    );
    expect(screen.getByText('Review changes')).not.toBeNull();
    expect(screen.getByText(/source-page-1-1/)).not.toBeNull();
  });

  it('blocks promotion when an edit violates the selected contract', () => {
    const onMakeOfficial = vi.fn();
    render(
      <WriterOutlineTreatmentReview
        currentOutline={null}
        proposal={session.proposal}
        session={session}
        onCancel={vi.fn()}
        onRegenerate={vi.fn()}
        onMakeOfficial={onMakeOfficial}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Editable AI outline proposal' }), {
      target: { value: '{"title":"Harbor","page_beats":[]}' },
    });
    expect(screen.getByRole('alert').textContent).toMatch(/contract violations/i);
    expect((screen.getByRole('button', { name: 'Make official' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Make official' }));
    expect(onMakeOfficial).not.toHaveBeenCalled();
  });

  it('closes with Escape only while not busy', () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <WriterOutlineTreatmentReview
        currentOutline={null}
        proposal={proposal}
        onCancel={onCancel}
        onRegenerate={vi.fn()}
        onMakeOfficial={vi.fn()}
      />,
    );
    fireEvent.keyDown(screen.getByRole('presentation'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    rerender(
      <WriterOutlineTreatmentReview
        currentOutline={null}
        proposal={proposal}
        busy
        onCancel={onCancel}
        onRegenerate={vi.fn()}
        onMakeOfficial={vi.fn()}
      />,
    );
    fireEvent.keyDown(screen.getByRole('presentation'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
