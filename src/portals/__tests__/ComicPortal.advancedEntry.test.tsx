import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComicPortal } from '@/portals/ComicPortal';

vi.mock('@/modes/comic/pages/ComicEditor', () => ({
  ComicEditor: () => <div>Advanced Comic Creator workspace</div>,
}));

vi.mock('@/portals/guided-comic/GuidedComicFlow', () => ({
  GuidedComicFlow: () => <div>Guided Comic Creator flow</div>,
}));

describe('ComicPortal direct Advanced Studio entry', () => {
  it('opens the Advanced Comic Creator workspace when requested by shell navigation', () => {
    render(<ComicPortal onNavigatePortal={vi.fn()} advancedStudioRequestKey={1} />);

    expect(screen.getByText('Advanced Comic Creator workspace')).toBeTruthy();
    expect(screen.queryByText('Guided Comic Creator flow')).toBeNull();
  });
});
