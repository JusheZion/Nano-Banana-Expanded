import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterOutlineTreatmentReview } from '../WriterOutlineTreatmentReview';

const proposal = {
  title: 'Harbor',
  page_beats: [{ page_target: 1, summary: 'Arrival' }],
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
});
