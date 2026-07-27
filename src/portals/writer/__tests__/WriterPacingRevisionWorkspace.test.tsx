import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    failure_ledger: [
      { page_number: 4, layer: 'beats', reason: 'Beats failed' },
      { page_number: 4, layer: 'dialogue', reason: 'Dialogue failed' },
    ],
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

  it('scopes select all, clear, counts, and batch decisions to the active tab', async () => {
    const revisionSet = fixture();
    const firstOutline = revisionSet.items[0]!.changes.find((change) => change.layer === 'outline')!;
    revisionSet.items[0]!.changes.push({
      ...firstOutline,
      id: crypto.randomUUID(),
      target_key: 'outline:second-turn',
      reason: 'Strengthen the second turn.',
      ai_proposal: { proposed_beat: { summary: 'The second door opens.' } },
    });
    const outlineIds = revisionSet.items.flatMap((item) => item.changes)
      .filter((change) => change.layer === 'outline')
      .map((change) => change.id);
    const beatsId = revisionSet.items.flatMap((item) => item.changes)
      .find((change) => change.layer === 'beats')!.id;
    const onChange = vi.fn().mockResolvedValue(undefined);

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={onChange}
        onApply={vi.fn()}
      />,
    );

    const selectAllOutline = screen.getByRole('button', { name: 'Select all in Live Outline' });
    expect(selectAllOutline.hasAttribute('disabled')).toBe(false);
    fireEvent.click(selectAllOutline);
    expect(screen.getByRole('button', { name: 'Approve selected (2)' }).hasAttribute('disabled')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Clear Live Outline selection' }));
    expect(screen.getByRole('button', { name: 'Approve selected (0)' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Select all in Live Outline' }));

    fireEvent.click(screen.getByRole('tab', { name: /Page Beats/ }));
    expect(screen.getByRole('button', { name: 'Approve selected (0)' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Select all in Page Beats' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve selected (1)' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith(beatsId, { decision: 'approved' });
    for (const outlineId of outlineIds) {
      expect(onChange).not.toHaveBeenCalledWith(outlineId, { decision: 'approved' });
    }
    fireEvent.click(screen.getByRole('tab', { name: /Live Outline/ }));
    expect(screen.getByRole('button', { name: 'Approve selected (2)' }).hasAttribute('disabled')).toBe(false);
  });

  it('excludes non-ready active-tab changes from select all and batch counts', () => {
    const revisionSet = fixture();
    const firstOutline = revisionSet.items[0]!.changes.find((change) => change.layer === 'outline')!;
    const staleOutline = {
      ...firstOutline,
      id: crypto.randomUUID(),
      target_key: 'outline:stale-turn',
      reason: 'Regenerate the stale turn.',
      generation_status: 'stale' as const,
    };
    revisionSet.items[0]!.changes.push(staleOutline);

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select all in Live Outline' }));

    expect(screen.getByRole('button', { name: 'Approve selected (1)' })).toBeTruthy();
    const outlineCheckboxes = screen.getAllByRole('checkbox', {
      name: 'Select Strengthen the opening outline change',
    });
    expect(outlineCheckboxes).toHaveLength(2);
    expect(outlineCheckboxes[1]!.hasAttribute('disabled')).toBe(true);
    expect((outlineCheckboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it('disables all active-tab selection mutation while busy', () => {
    const revisionSet = fixture();
    const firstOutline = revisionSet.items[0]!.changes.find((change) => change.layer === 'outline')!;
    revisionSet.items[0]!.changes.push({
      ...firstOutline,
      id: crypto.randomUUID(),
      target_key: 'outline:second-ready-turn',
      reason: 'Strengthen the second ready turn.',
    });

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        busy
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    for (const buttonName of [
      'Select all in Live Outline',
      'Clear Live Outline selection',
      'Approve selected (0)',
      'Reject selected (0)',
    ]) {
      expect(screen.getByRole('button', { name: buttonName }).hasAttribute('disabled')).toBe(true);
    }
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox.hasAttribute('disabled')).toBe(true);
    }
  });

  it('labels the header count as failed or missing layers', () => {
    render(<WriterPacingRevisionWorkspace revisionSet={fixture()} onChange={vi.fn()} onApply={vi.fn()} />);
    expect(screen.getByText('2 pending · 0 ready to apply · 3 failed or missing layers')).toBeTruthy();
  });

  it('collapses failure details without hiding recovery or Outline independence', () => {
    const onRetryFailed = vi.fn();
    render(
      <WriterPacingRevisionWorkspace
        revisionSet={fixture()}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onRetryFailed={onRetryFailed}
      />,
    );

    expect(screen.getByText('Page Beats and Dialogue failures do not prevent Outline approval.')).toBeTruthy();
    const disclosure = screen.getByRole('button', { name: 'Show failed layers' });
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('pacing-recovery-list')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry all failed layers' }));
    expect(onRetryFailed).toHaveBeenCalled();

    fireEvent.click(disclosure);
    const recoveryList = screen.getByTestId('pacing-recovery-list');
    expect(recoveryList).toBeTruthy();
    expect(screen.getByRole('alert').contains(recoveryList)).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide failed layers' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps batch actions in a persistent sidebar footer', () => {
    render(<WriterPacingRevisionWorkspace revisionSet={fixture()} onChange={vi.fn()} onApply={vi.fn()} />);
    expect(screen.getByTestId('pacing-batch-footer').className).toContain('sticky');
    expect(screen.getByTestId('pacing-batch-footer').className).toContain('bottom-0');
    expect(screen.getByTestId('pacing-revision-item-list').className).toContain('overflow-y-auto');
  });

  it('navigates dependencies and retries individual or batched failed layers', () => {
    const onRetryFailed = vi.fn();
    const onNavigateToPage = vi.fn();
    render(<WriterPacingRevisionWorkspace revisionSet={fixture()} onChange={vi.fn()} onApply={vi.fn()} onRetryFailed={onRetryFailed} onNavigateToPage={onNavigateToPage} />);
    fireEvent.click(screen.getByRole('tab', { name: /Page Beats/ }));
    expect(screen.getByRole('note').textContent).toContain('depends on 1 earlier change');
    fireEvent.click(screen.getByRole('button', { name: 'Go to dependency' }));
    expect(screen.getByRole('tab', { name: /Live Outline/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Show failed layers' }));
    expect(screen.getByTestId('pacing-recovery-list').className).toContain('max-h-80');
    fireEvent.click(screen.getByRole('button', { name: 'Retry all failed layers' }));
    expect(onRetryFailed).toHaveBeenCalledWith([
      { page: 1, layer: 'dialogue' },
      { page: 4, layer: 'beats' },
      { page: 4, layer: 'dialogue' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry Page Beats for page 4' }));
    expect(onRetryFailed).toHaveBeenCalledWith([{ page: 4, layer: 'beats' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry Dialogue for page 4' }));
    expect(onRetryFailed).toHaveBeenCalledWith([{ page: 4, layer: 'dialogue' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Open page 4 for Page Beats' }));
    expect(onNavigateToPage).toHaveBeenCalledWith(4);
  });

  it('expands a legacy page-only failure into only the missing layer', () => {
    const legacySet = fixture();
    legacySet.failure_ledger = [{ page_number: 1, reason: 'Legacy page failure' }];
    const onRetryFailed = vi.fn();
    render(<WriterPacingRevisionWorkspace revisionSet={legacySet} onChange={vi.fn()} onApply={vi.fn()} onRetryFailed={onRetryFailed} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show failed layers' }));
    expect(screen.queryByRole('button', { name: 'Retry Page Beats for page 1' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Dialogue for page 1' }));
    expect(onRetryFailed).toHaveBeenCalledWith([{ page: 1, layer: 'dialogue' }]);
  });

  it('offers an individual retry for a missing child layer without a ledger entry', () => {
    const incompleteSet = fixture();
    incompleteSet.failure_ledger = [];
    const onRetryFailed = vi.fn();
    render(<WriterPacingRevisionWorkspace revisionSet={incompleteSet} onChange={vi.fn()} onApply={vi.fn()} onRetryFailed={onRetryFailed} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show failed layers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry Dialogue for page 1' }));
    expect(onRetryFailed).toHaveBeenCalledWith([{ page: 1, layer: 'dialogue' }]);
    expect(screen.getByText('Candidate has not been generated yet.')).toBeTruthy();
  });
});
