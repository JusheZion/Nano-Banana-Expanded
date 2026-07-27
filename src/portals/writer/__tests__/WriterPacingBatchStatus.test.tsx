import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WriterPacingBatchStatus } from '../WriterPacingBatchStatus';

describe('WriterPacingBatchStatus', () => {
  it('announces Simple Workflow Pacing batch progress accessibly', () => {
    render(
      <WriterPacingBatchStatus
        batchBusy
        batchMode="pacing_review"
        batchLabel="2/5"
        error={null}
      />,
    );

    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Pacing 2/5');
  });

  it('renders the batch attention summary as an alert', () => {
    render(
      <WriterPacingBatchStatus
        batchBusy={false}
        batchMode={null}
        batchLabel=""
        error="2 Pacing Reviews saved. 1 item needs attention."
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain(
      'Pacing needs attention. 2 Pacing Reviews saved. 1 item needs attention.',
    );
  });

  it('keeps a single-review pacing error visible when no batch is running', () => {
    render(
      <WriterPacingBatchStatus
        batchBusy={false}
        batchMode={null}
        batchLabel=""
        error="The Pacing Review timed out."
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('The Pacing Review timed out.');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does not announce canon batch progress as Pacing progress', () => {
    render(
      <WriterPacingBatchStatus
        batchBusy
        batchMode="canon_check"
        batchLabel="1/3"
        error={null}
      />,
    );

    expect(screen.queryByRole('status')).toBeNull();
  });
});
