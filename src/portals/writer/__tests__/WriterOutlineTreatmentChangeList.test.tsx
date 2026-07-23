import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterOutlineTreatmentChangeList } from '../WriterOutlineTreatmentChangeList';

const entries = [
  {
    resultBeatId: 'combined-1',
    sourceBeatIds: ['source-page-1-1', 'source-page-2-2'],
    changeType: 'combined' as const,
    originalPages: [1, 2],
    proposedPage: 1,
    reason: 'Tighten pacing.',
  },
  {
    resultBeatId: 'added-1',
    sourceBeatIds: [],
    changeType: 'added' as const,
    originalPages: [],
    proposedPage: 2,
    reason: 'Connect scenes.',
  },
];

describe('WriterOutlineTreatmentChangeList', () => {
  it('shows source/result mapping and exposes non-color rejection controls', () => {
    const onReject = vi.fn();
    render(<WriterOutlineTreatmentChangeList entries={entries} onReject={onReject} />);
    expect(screen.getByText(/source-page-1-1, source-page-2-2/)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Restore source beat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove added beat' }));
    expect(onReject).toHaveBeenNthCalledWith(1, 'combined-1');
    expect(onReject).toHaveBeenNthCalledWith(2, 'added-1');
  });

  it('filters changes by explicit labels', () => {
    render(<WriterOutlineTreatmentChangeList entries={entries} onReject={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Added' }));
    expect(screen.queryByText('Tighten pacing.')).toBeNull();
    expect(screen.getByText('Connect scenes.')).not.toBeNull();
  });
});
