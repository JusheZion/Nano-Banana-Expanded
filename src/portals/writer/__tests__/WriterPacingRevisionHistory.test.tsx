import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';
import {
  WriterPacingRevisionHistory,
  WriterPacingRevisionHistoryLayout,
} from '../WriterPacingRevisionHistory';

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
    archived_at: '2026-07-27T15:45:00.000Z',
    archived_from_status: 'applied',
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
      const viewButtons = screen.getAllByRole('button', {
        name: /View archived revision set \d+ of 2/,
      });
      expect(viewButtons).toHaveLength(2);
      expect(viewButtons[0]!.getAttribute('aria-label')).not.toBe(
        viewButtons[1]!.getAttribute('aria-label'),
      );
      fireEvent.click(viewButtons[0]!);
      expect(onSelect).toHaveBeenCalledWith(newest);
      expect(screen.getAllByText(/Created/)).toHaveLength(2);
      expect(screen.getAllByText(/Archived/).length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText(/Previous status: Applied/)).toHaveLength(2);
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
    expect(screen.getByText(/Created on/)).toBeTruthy();
    expect(screen.getByText(/Archived on/)).toBeTruthy();
    expect(screen.getByText('Previous status: Applied')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to current revision set' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each(['ready', 'partially_ready'] as const)(
    'warns that unfinished %s work becomes read-only before manual archive',
    (status) => {
    const activeSet = archivedFixture({
      status,
      archived_at: undefined,
      archived_from_status: undefined,
    });
    const onArchive = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
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
    expect(confirm).toHaveBeenLastCalledWith(
      'Move this unfinished Revision Set to Revision history? Its unfinished decisions and edits will become read-only. The live outline, Page Beats, and Dialogue will not change.',
    );
    expect(onArchive).toHaveBeenCalledWith(activeSet);
    },
  );

  it('preserves failed-set details as read-only history without calling them unfinished decisions', () => {
    const activeSet = archivedFixture({
      status: 'failed',
      archived_at: undefined,
      archived_from_status: undefined,
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
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
        onArchive={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Archive revision set' }));
    expect(confirm).toHaveBeenLastCalledWith(
      'Move this failed Revision Set to Revision history? Its failure details will be preserved as read-only history. The live outline, Page Beats, and Dialogue will not change.',
    );
    expect(confirm.mock.calls.at(-1)?.[0]).not.toContain('unfinished decisions');
  });

  it('warns that archiving an applied set removes Undo here but preserves version history restoration', () => {
    const activeSet = archivedFixture({
      status: 'applied',
      archived_at: undefined,
      archived_from_status: undefined,
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
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
        onArchive={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Archive revision set' }));
    expect(confirm).toHaveBeenLastCalledWith(
      'Move this applied Revision Set to Revision history? “Undo applied set” will no longer be available here. Outline version history can restore an Outline version, but prior Page Beats, Dialogue, and pacing-created pages will no longer be recoverable through Undo. The live outline, Page Beats, and Dialogue will not change.',
    );
  });

  it('leaves the active set unchanged when manual archive confirmation is cancelled', () => {
    const activeSet = archivedFixture({
      status: 'ready',
      archived_at: undefined,
      archived_from_status: undefined,
    });
    const onArchive = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
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
  });

  it('moves focus into an archived view and restores it to the history disclosure on Back', async () => {
    const user = userEvent.setup();
    const archivedSet = archivedFixture();

    function Harness() {
      const [selectedSet, setSelectedSet] = useState<PacingRevisionSet | null>(null);
      return (
        <WriterPacingRevisionHistory
          workflow="Simple"
          historySets={[archivedSet]}
          selectedSet={selectedSet}
          loading={false}
          error={null}
          onRetry={vi.fn()}
          onSelect={setSelectedSet}
          onClose={() => setSelectedSet(null)}
        />
      );
    }

    render(<Harness />);
    await user.click(screen.getByText('Revision history (1)'));
    await user.click(screen.getByRole('button', { name: 'View archived revision set 1 of 1' }));
    expect(screen.getByRole('heading', { name: 'Archived Pacing Revision Set' }))
      .toBe(document.activeElement);
    await user.click(screen.getByRole('button', { name: 'Back to current revision set' }));
    expect(screen.getByText('Revision history (1)').closest('summary'))
      .toBe(document.activeElement);
  });

  it.each(['Simple', 'Advanced'] as const)(
    'mounts history access through the extracted %s Story Review layout',
    (workflow) => {
      render(
        <WriterPacingRevisionHistoryLayout
          workflow={workflow}
          activeSet={null}
          historySets={[archivedFixture()]}
          selectedSet={null}
          loading={false}
          error={null}
          onRetry={vi.fn()}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        >
          <p>Current workspace</p>
        </WriterPacingRevisionHistoryLayout>,
      );

      expect(screen.getByTestId(`pacing-revision-history-layout-${workflow.toLowerCase()}`))
        .toBeTruthy();
      expect(screen.getByText('Revision history (1)')).toBeTruthy();
      expect(screen.getByText('Current workspace')).toBeTruthy();
    },
  );

  it('human-formats prior lifecycle statuses', () => {
    const selectedSet = archivedFixture({ archived_from_status: 'partially_ready' });
    render(
      <WriterPacingRevisionHistory
        workflow="Simple"
        historySets={[selectedSet]}
        selectedSet={selectedSet}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Previous status: Partially ready')).toBeTruthy();
    expect(screen.queryByText(/partially_ready/)).toBeNull();
  });
});
