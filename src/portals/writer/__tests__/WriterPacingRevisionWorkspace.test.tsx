import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';
import { WriterPacingRevisionWorkspace } from '../WriterPacingRevisionWorkspace';

function fixture(): PacingRevisionSet {
  const itemId = crypto.randomUUID();
  const outlineId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    issue_id: crypto.randomUUID(),
    status: 'ready',
    pacing_review_json: {},
    source_outline_json: {},
    proposed_outline_json: {},
    source_fingerprint: 'source',
    progress_json: { total_pages: 1, completed_pages: [1], current_page: null, stopped: false },
    failure_ledger: [{ page_number: 4, reason: 'Malformed model output' }],
    items: [{
      id: itemId,
      revision_set_id: crypto.randomUUID(),
      position: 0,
      title: 'Strengthen the opening',
      rationale: 'The opening stalls.',
      affected_page_numbers: [1],
      generation_status: 'ready',
      changes: [{
        id: outlineId,
        item_id: itemId,
        layer: 'outline',
        target_key: 'outline:op',
        current_value: [{ summary: 'The door stays closed.' }],
        ai_proposal: { proposed_beat: { summary: 'The door bursts open.' } },
        edited_candidate: null,
        decision: 'pending',
        dependency_ids: [],
        reason: 'Start with a stronger turn.',
        source_fingerprint: 'source',
        generation_status: 'ready',
      }, {
        id: crypto.randomUUID(),
        item_id: itemId,
        layer: 'beats',
        target_key: 'page:1',
        page_id: crypto.randomUUID(),
        page_number: 1,
        current_value: { panels: [{ action: 'She waits.' }] },
        ai_proposal: { panels: [{ action: 'She opens the door.' }] },
        edited_candidate: null,
        decision: 'pending',
        dependency_ids: [outlineId],
        reason: 'Make the visual turn immediate.',
        source_fingerprint: 'beats',
        generation_status: 'ready',
      }],
    }],
  };
}

describe('WriterPacingRevisionWorkspace', () => {
  it('shows separate current and proposed panels without raw JSON', () => {
    render(<WriterPacingRevisionWorkspace revisionSet={fixture()} onChange={vi.fn()} onApply={vi.fn()} />);
    expect(screen.getByText('Current live')).toBeTruthy();
    expect(screen.getByText('AI proposal')).toBeTruthy();
    expect(screen.getByTestId('revision-comparison-panels').className).toContain('md:grid-cols-2');
    expect(screen.queryByText(/"target_key"/)).toBeNull();
  });

  it('supports edit, reset, individual decisions, and batch decisions', () => {
    const onChange = vi.fn();
    render(<WriterPacingRevisionWorkspace revisionSet={fixture()} onChange={onChange} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit suggestion' }));
    fireEvent.change(screen.getByLabelText('Edit suggested change'), { target: { value: 'The door explodes inward.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save edit' }));
    expect(onChange).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ edited_candidate: expect.any(Object) }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve change' }));
    expect(onChange).toHaveBeenCalledWith(expect.any(String), { decision: 'approved' });
    fireEvent.click(screen.getByLabelText(/Select Strengthen the opening outline change/));
    fireEvent.click(screen.getByRole('button', { name: /Approve selected/ }));
    expect(onChange).toHaveBeenCalledWith(expect.any(String), { decision: 'approved' });
  });

  it('navigates dependencies and retries failed pages only', () => {
    const onRetryFailed = vi.fn();
    const onNavigateToPage = vi.fn();
    render(<WriterPacingRevisionWorkspace revisionSet={fixture()} onChange={vi.fn()} onApply={vi.fn()} onRetryFailed={onRetryFailed} onNavigateToPage={onNavigateToPage} />);
    fireEvent.click(screen.getByRole('tab', { name: /Page Beats/ }));
    expect(screen.getByRole('note').textContent).toContain('depends on 1 earlier change');
    fireEvent.click(screen.getByRole('button', { name: 'Go to dependency' }));
    expect(screen.getByRole('tab', { name: /Live Outline/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed pages only' }));
    expect(onRetryFailed).toHaveBeenCalledWith([4]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry page 4' }));
    expect(onRetryFailed).toHaveBeenCalledWith([4]);
    fireEvent.click(screen.getByRole('button', { name: 'Open page 4' }));
    expect(onNavigateToPage).toHaveBeenCalledWith(4);
  });
});
