import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterContextMenu } from '@/portals/writer/WriterContextMenu';
import { WriterHelpModal } from '@/portals/writer/WriterHelpModal';

describe('WriterHelpModal accessibility', () => {
  it('moves focus inside, traps Tab, closes on Escape, and restores focus', async () => {
    const onClose = vi.fn();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(
      <WriterHelpModal open title="Writer help" onClose={onClose}>
        <button type="button">Learn more</button>
      </WriterHelpModal>,
    );

    const close = screen.getByRole('button', { name: 'Close help' });
    const learnMore = screen.getByRole('button', { name: 'Learn more' });
    await waitFor(() => expect(document.activeElement).toBe(close));

    learnMore.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(learnMore);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    rerender(
      <WriterHelpModal open={false} title="Writer help" onClose={onClose}>
        <button type="button">Learn more</button>
      </WriterHelpModal>,
    );
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('WriterContextMenu accessibility', () => {
  it('autofocuses and navigates enabled items, then restores focus on Escape', async () => {
    render(
      <WriterContextMenu
        items={[
          { label: 'First', onClick: vi.fn() },
          { label: 'Unavailable', onClick: vi.fn(), disabled: true },
          { label: 'Last', onClick: vi.fn() },
        ]}
      >
        <button type="button">Open target</button>
      </WriterContextMenu>,
    );

    const target = screen.getByRole('button', { name: 'Open target' });
    target.focus();
    fireEvent.contextMenu(target, { clientX: 20, clientY: 30 });

    const first = await screen.findByRole('menuitem', { name: 'First' });
    const last = screen.getByRole('menuitem', { name: 'Last' });
    await waitFor(() => expect(document.activeElement).toBe(first));

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(window, { key: 'Home' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(window, { key: 'End' });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(target);
  });
});
