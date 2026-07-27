import { useState } from 'react';
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

  it('allows Outline approval while child generation failures remain', async () => {
    const revisionSet = fixture();
    const outlineChanges = revisionSet.items.flatMap((item) => item.changes)
      .filter((change) => change.layer === 'outline' && change.generation_status === 'ready');
    const onChange = vi.fn();
    const onApply = vi.fn();

    function ControlledWorkspace() {
      const [controlledSet, setControlledSet] = useState(revisionSet);
      return (
        <WriterPacingRevisionWorkspace
          revisionSet={controlledSet}
          onChange={async (changeId, patch) => {
            onChange(changeId, patch);
            setControlledSet((current) => ({
              ...current,
              items: current.items.map((item) => ({
                ...item,
                changes: item.changes.map((change) =>
                  change.id === changeId ? { ...change, ...patch } : change
                ),
              })),
            }));
          }}
          onApply={onApply}
        />
      );
    }

    render(<ControlledWorkspace />);

    expect(screen.getByText('2 pending · 0 ready to apply · 3 failed or missing layers')).toBeTruthy();
    expect(screen.getByText(/failed or missing layers need attention/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select all in Live Outline' }));
    fireEvent.click(screen.getByRole('button', {
      name: `Approve selected (${outlineChanges.length})`,
    }));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(outlineChanges.length));
    for (const change of outlineChanges) {
      expect(onChange).toHaveBeenCalledWith(change.id, { decision: 'approved' });
    }
    expect(screen.getByText('1 pending · 1 ready to apply · 3 failed or missing layers')).toBeTruthy();
    expect(screen.getByText(/failed or missing layers need attention/)).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
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
    expect(onNavigateToPage).toHaveBeenCalledWith(4, 'beats');
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

  it('shows current remaining, ready, and applied counts instead of historical layer totals', () => {
    const revisionSet = fixture();
    const outline = revisionSet.items[0]!.changes.find((change) => change.layer === 'outline')!;
    const { rerender } = render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Live Outline · 1 remaining' })).toBeTruthy();

    outline.decision = 'approved';
    rerender(
      <WriterPacingRevisionWorkspace
        revisionSet={{ ...revisionSet, items: [...revisionSet.items] }}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Live Outline · 0 remaining · 1 ready' })).toBeTruthy();

    outline.generation_status = 'applied';
    revisionSet.status = 'applied';
    rerender(
      <WriterPacingRevisionWorkspace
        revisionSet={{ ...revisionSet, items: [...revisionSet.items] }}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Live Outline · 0 remaining · 1 applied' })).toBeTruthy();
  });

  it('shows only actual dependency blockers and hides the banner after resolution', () => {
    const revisionSet = fixture();
    const outline = revisionSet.items[0]!.changes.find((change) => change.layer === 'outline')!;
    const { rerender } = render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: /Page Beats/ }));
    expect(screen.getByRole('note').textContent).toContain('1 unresolved dependency');

    outline.decision = 'approved';
    rerender(
      <WriterPacingRevisionWorkspace
        revisionSet={{ ...revisionSet, items: [...revisionSet.items] }}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('renders applied and approved lifecycle comparisons with terminal actions read-only', () => {
    const revisionSet = fixture();
    const outline = revisionSet.items[0]!.changes.find((change) => change.layer === 'outline')!;
    outline.decision = 'approved';
    outline.generation_status = 'applied';
    revisionSet.status = 'applied';
    const rejected = {
      ...outline,
      id: crypto.randomUUID(),
      target_key: 'outline:rejected',
      decision: 'rejected' as const,
      generation_status: 'ready' as const,
      reason: 'Keep the original ending.',
    };
    revisionSet.items[0]!.changes.push(rejected);

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onRetryFailed={vi.fn()}
      />,
    );

    expect(screen.getByText('Before this revision')).toBeTruthy();
    expect(screen.getByText('Applied revision')).toBeTruthy();
    expect(screen.getByText('Applied')).toBeTruthy();
    const appliedAction = screen.getByRole('button', { name: 'All approved changes applied' });
    expect(appliedAction.hasAttribute('disabled')).toBe(true);
    const appliedStatus = screen.getAllByRole('status');
    expect(appliedStatus).toHaveLength(1);
    expect(appliedStatus[0]!.textContent).toBe('All approved changes applied');
    expect(appliedAction.contains(appliedStatus[0]!)).toBe(false);
    expect(appliedAction.parentElement).toBe(appliedStatus[0]!.parentElement);
    expect(screen.queryByRole('button', { name: 'Edit suggestion' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve change' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Keep the original ending/ }));
    expect(screen.getByText('Rejected proposal')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit suggestion' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve change' })).toBeNull();
  });

  it('labels approved waiting proposals and disables Apply when every approved change is applied', () => {
    const revisionSet = fixture();
    const outline = revisionSet.items[0]!.changes.find((change) => change.layer === 'outline')!;
    outline.decision = 'approved';

    const { rerender } = render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText('Current live')).toBeTruthy();
    expect(screen.getByText('Approved proposal')).toBeTruthy();

    outline.generation_status = 'applied';
    rerender(
      <WriterPacingRevisionWorkspace
        revisionSet={{ ...revisionSet, items: [...revisionSet.items] }}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'All approved changes applied' }).hasAttribute('disabled')).toBe(true);
  });

  it('renders page context buttons and routes physical Beats and Dialogue with their destination layers', () => {
    const revisionSet = fixture();
    const beats = revisionSet.items[0]!.changes.find((change) => change.layer === 'beats')!;
    revisionSet.items[0]!.changes.push({
      ...beats,
      id: crypto.randomUUID(),
      layer: 'dialogue',
      target_key: 'page:1:dialogue',
      current_value: 'Wait.',
      ai_proposal: 'Open it.',
      reason: 'Sharpen the exchange.',
    });
    const onNavigateToPage = vi.fn();

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onNavigateToPage={onNavigateToPage}
      />,
    );

    expect(screen.getByText('Affected pages')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open page 1 in Page Beats' }));
    expect(onNavigateToPage).toHaveBeenCalledWith(1, 'outline');

    fireEvent.click(screen.getByRole('tab', { name: /Dialogue/ }));
    expect(screen.getByText('Page 1 · Dialogue')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open page 1 in Dialogue' }));
    expect(onNavigateToPage).toHaveBeenCalledWith(1, 'dialogue');
  });

  it('keeps virtual page navigation local and explains missing virtual previews', () => {
    const revisionSet = fixture();
    const item = revisionSet.items[0]!;
    const beats = item.changes.find((change) => change.layer === 'beats')!;
    item.affected_page_numbers = [1, 2, 3];
    item.changes.push({
      ...beats,
      id: crypto.randomUUID(),
      target_key: 'virtual-page:2',
      page_id: null,
      page_number: 2,
      reason: 'Preview the new bridge page.',
    });
    const onNavigateToPage = vi.fn();
    const onRetryFailed = vi.fn();

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onNavigateToPage={onNavigateToPage}
        onRetryFailed={onRetryFailed}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: /Page Beats/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Open virtual page 2 Page Beats preview' }));
    expect(screen.getByText('Page 2 · Page Beats')).toBeTruthy();
    expect(screen.getByText('Virtual page · will be created on Apply')).toBeTruthy();
    const virtualStatus = screen.getAllByRole('status');
    expect(virtualStatus).toHaveLength(1);
    expect(virtualStatus[0]!.textContent).toBe('Virtual page · will be created on Apply');
    expect(screen.getAllByText('Virtual page · will be created on Apply')).toHaveLength(1);
    expect(onNavigateToPage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open virtual page 3 Page Beats preview' }));
    expect(screen.getByText('Page 3 Page Beats preview has not been generated yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Page Beats for virtual page 3' }));
    expect(onRetryFailed).toHaveBeenCalledWith([{ page: 3, layer: 'beats' }]);
    expect(onNavigateToPage).not.toHaveBeenCalled();
  });

  it('navigates an applied virtual change as its created physical page', () => {
    const revisionSet = fixture();
    const item = revisionSet.items[0]!;
    const beats = item.changes.find((change) => change.layer === 'beats')!;
    item.affected_page_numbers = [1, 2];
    item.changes.push({
      ...beats,
      id: crypto.randomUUID(),
      target_key: 'virtual-page:2',
      page_id: null,
      page_number: 2,
      decision: 'approved',
      generation_status: 'applied',
      reason: 'Applied bridge page.',
    });
    revisionSet.status = 'applied';
    const onNavigateToPage = vi.fn();

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onNavigateToPage={onNavigateToPage}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: /Page Beats/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Open page 2 in Page Beats' }));

    expect(onNavigateToPage).toHaveBeenCalledWith(2, 'beats');
    expect(screen.queryByText('Virtual page · will be created on Apply')).toBeNull();
  });

  it('passes the failed layer when navigating physical failures and keeps virtual failures local', () => {
    const revisionSet = fixture();
    const beats = revisionSet.items[0]!.changes.find((change) => change.layer === 'beats')!;
    revisionSet.items[0]!.affected_page_numbers = [1, 2];
    revisionSet.items[0]!.changes.push({
      ...beats,
      id: crypto.randomUUID(),
      target_key: 'virtual-page:2',
      page_id: null,
      page_number: 2,
    });
    revisionSet.failure_ledger = [
      { page_number: 1, layer: 'dialogue', reason: 'Physical failure' },
      { page_number: 2, layer: 'beats', reason: 'Virtual failure' },
    ];
    const onNavigateToPage = vi.fn();

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onNavigateToPage={onNavigateToPage}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show failed layers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open page 1 for Dialogue' }));
    expect(onNavigateToPage).toHaveBeenCalledWith(1, 'dialogue');

    fireEvent.click(screen.getByRole('button', { name: 'Open page 2 for Page Beats' }));
    expect(screen.getByText('Page 2 · Page Beats')).toBeTruthy();
    expect(onNavigateToPage).toHaveBeenCalledTimes(1);
  });

  it('prunes selected IDs after refresh removes or terminalizes a change', () => {
    const revisionSet = fixture();
    const { rerender } = render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Select Strengthen the opening outline change/));
    expect(screen.getByRole('button', { name: 'Approve selected (1)' })).toBeTruthy();

    revisionSet.items[0]!.changes[0]!.generation_status = 'applied';
    rerender(
      <WriterPacingRevisionWorkspace
        revisionSet={{ ...revisionSet, items: [...revisionSet.items] }}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Approve selected (0)' }).hasAttribute('disabled')).toBe(true);
  });

  it('keeps rejected changes read-only before the Revision Set becomes terminal', () => {
    const revisionSet = fixture();
    const outline = revisionSet.items[0]!.changes.find((change) => change.layer === 'outline')!;
    outline.decision = 'rejected';
    outline.edited_candidate = {
      proposed_beat: { summary: 'The rejected author edit.' },
    };

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText('Rejected proposal')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit suggestion' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reset to AI proposal' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Decide later' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve change' })).toBeNull();
  });

  it.each(['applied', 'discarded'] as const)(
    'removes selection and batch decision chrome from a %s Revision Set',
    (status) => {
      const revisionSet = fixture();
      revisionSet.status = status;
      if (status === 'applied') {
        revisionSet.items[0]!.changes[0]!.decision = 'approved';
        revisionSet.items[0]!.changes[0]!.generation_status = 'applied';
      }

      render(
        <WriterPacingRevisionWorkspace
          revisionSet={revisionSet}
          onChange={vi.fn()}
          onApply={vi.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: 'Select all in Live Outline' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Clear Live Outline selection' })).toBeNull();
      expect(screen.queryByRole('checkbox')).toBeNull();
      expect(screen.queryByTestId('pacing-batch-footer')).toBeNull();
    },
  );

  it('exits a missing virtual preview when a same-layer sidebar change is selected', () => {
    const revisionSet = fixture();
    const item = revisionSet.items[0]!;
    const beats = item.changes.find((change) => change.layer === 'beats')!;
    item.affected_page_numbers = [1, 2];
    item.changes.push({
      ...beats,
      id: crypto.randomUUID(),
      target_key: 'virtual-page:2:outline-only',
      page_id: null,
      page_number: 3,
      reason: 'Authorize future page inference.',
    });

    render(
      <WriterPacingRevisionWorkspace
        revisionSet={revisionSet}
        onChange={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: /Page Beats/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Open virtual page 2 Page Beats preview' }));
    expect(screen.getByText('Page 2 Page Beats preview has not been generated yet.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Make the visual turn immediate/ }));
    expect(screen.queryByText('Page 2 Page Beats preview has not been generated yet.')).toBeNull();
    expect(screen.getByText('Page 1 · Page Beats')).toBeTruthy();
    expect(screen.getByText(/She opens the door\./)).toBeTruthy();
  });
});
