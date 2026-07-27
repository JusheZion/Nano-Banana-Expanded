import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';
import { WriterPacingRevisionHistory } from '../WriterPacingRevisionHistory';

function archivedFixture(overrides: Partial<PacingRevisionSet> = {}): PacingRevisionSet {
  const setId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  return {
    id: setId,
    issue_id: crypto.randomUUID(),
    status: 'archived',
    pacing_review_json: {},
    source_outline_json: {},
    proposed_outline_json: {},
    source_fingerprint: 'source',
    progress_json: { total_pages: 1, completed_pages: [1], current_page: null, stopped: false },
    failure_ledger: [],
    created_at: '2026-07-26T14:30:00.000Z',
    updated_at: '2026-07-27T15:45:00.000Z',
    items: [{
      id: itemId,
      revision_set_id: setId,
      position: 0,
      title: 'Strengthen the opening',
      rationale: 'The opening stalls.',
      affected_page_numbers: [1],
      generation_status: 'ready',
      changes: [{
        id: crypto.randomUUID(),
        item_id: itemId,
        layer: 'outline',
        target_key: 'outline:opening',
        current_value: [{ summary: 'The door stays closed.' }],
        ai_proposal: { proposed_beat: { summary: 'The door bursts open.' } },
        edited_candidate: null,
        decision: 'approved',
        dependency_ids: [],
        reason: 'Start with a stronger turn.',
        source_fingerprint: 'source',
        generation_status: 'ready',
      }],
    }],
    ...overrides,
  };
}

describe('WriterPacingRevisionHistory', () => {
  it.each(['Simple', 'Advanced'] as const)(
    'provides keyboard-native history access in the %s Story Review layout',
    (workflow) => {
      const newest = archivedFixture({ updated_at: '2026-07-27T15:45:00.000Z' });
      const older = archivedFixture({ updated_at: '2026-07-26T12:00:00.000Z' });
      const onSelect = vi.fn();

      render(
        <WriterPacingRevisionHistory
          workflow={workflow}
          historySets={[newest, older]}
          selectedSet={null}
          loading={false}
          error={null}
          onRetry={vi.fn()}
          onSelect={onSelect}
          onClose={vi.fn()}
        />,
      );

      const summary = screen.getByText('Revision history (2)');
      expect(summary.closest('summary')).toBeTruthy();
      expect(screen.getByTestId(`pacing-revision-history-${workflow.toLowerCase()}`)).toBeTruthy();
      fireEvent.click(summary);
      const viewButtons = screen.getAllByRole('button', { name: 'View archived revision set' });
      expect(viewButtons).toHaveLength(2);
      fireEvent.click(viewButtons[0]!);
      expect(onSelect).toHaveBeenCalledWith(newest);
    },
  );

  it('shows loading, empty, and recoverable error states', () => {
    const { rerender } = render(
      <WriterPacingRevisionHistory
        workflow="Simple"
        historySets={[]}
        selectedSet={null}
        loading
        error={null}
        onRetry={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Revision history (0)'));
    expect(screen.getByRole('status').textContent).toContain('Loading revision history');

    rerender(
      <WriterPacingRevisionHistory
        workflow="Simple"
        historySets={[]}
        selectedSet={null}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('No archived revision sets yet.')).toBeTruthy();

    const onRetry = vi.fn();
    rerender(
      <WriterPacingRevisionHistory
        workflow="Simple"
        historySets={[]}
        selectedSet={null}
        loading={false}
        error="History unavailable."
        onRetry={onRetry}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('History unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry revision history' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('labels an archived selection and returns to the current revision set', () => {
    const selectedSet = archivedFixture();
    const onClose = vi.fn();
    render(
      <WriterPacingRevisionHistory
        workflow="Advanced"
        historySets={[selectedSet]}
        selectedSet={selectedSet}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('status').textContent).toContain(
      'Archived revision set — official story content is unchanged.',
    );
    expect(screen.getByText('Archived')).toBeTruthy();
    expect(screen.getByText(/Archived on/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to current revision set' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('requires explicit confirmation before manually archiving the active set', () => {
    const activeSet = archivedFixture({ status: 'ready' });
    const onArchive = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(
      <WriterPacingRevisionHistory
        workflow="Simple"
        activeSet={activeSet}
        historySets={[]}
        selectedSet={null}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onArchive={onArchive}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Archive revision set' }));
    expect(onArchive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Archive revision set' }));
    expect(confirm).toHaveBeenLastCalledWith(
      'Move this Revision Set to Revision history? This does not change the live outline, Page Beats, or Dialogue.',
    );
    expect(onArchive).toHaveBeenCalledWith(activeSet);
  });
});
