import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PinnedHelpTooltip } from '@/shared/components/Tooltip';

describe('PinnedHelpTooltip timer ownership', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('cancels a pending hover timer when the tooltip subtree unmounts', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <PinnedHelpTooltip title="Prompt help" variant="character">
        Helpful details
      </PinnedHelpTooltip>,
    );
    const wrapper = screen.getByRole('button', { name: 'Help: Prompt help' }).parentElement;
    expect(wrapper).toBeTruthy();

    fireEvent.mouseEnter(wrapper!);
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
