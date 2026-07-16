import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWriterHotkeys } from '../useWriterHotkeys';

function setup() {
  const callbacks = {
    onWorkspaceTab: vi.fn(),
    onFocusFind: vi.fn(),
    onClearFind: vi.fn(),
    onToggleDock: vi.fn(),
  };
  renderHook(() => useWriterHotkeys({ ...callbacks, dockEnabled: true }));
  return callbacks;
}

describe('useWriterHotkeys', () => {
  it('does not steal find, clear find, or toggle panels while typing', () => {
    const callbacks = setup();
    const input = document.createElement('input');
    document.body.append(input);

    fireEvent.keyDown(input, { key: 'f', metaKey: true });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.keyDown(input, { key: 'h', metaKey: true, shiftKey: true });

    expect(callbacks.onFocusFind).not.toHaveBeenCalled();
    expect(callbacks.onClearFind).not.toHaveBeenCalled();
    expect(callbacks.onToggleDock).not.toHaveBeenCalled();
  });

  it('preserves intentional find shortcuts in the Writer find input', () => {
    const callbacks = setup();
    const findInput = document.createElement('input');
    findInput.dataset.writerFindInput = 'true';
    document.body.append(findInput);

    fireEvent.keyDown(findInput, { key: 'F', ctrlKey: true });
    fireEvent.keyDown(findInput, { key: 'Escape' });

    expect(callbacks.onFocusFind).toHaveBeenCalledOnce();
    expect(callbacks.onClearFind).toHaveBeenCalledOnce();
  });

  it('runs global shortcuts outside editable controls', () => {
    const callbacks = setup();

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'h', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: '2', ctrlKey: true, altKey: true });

    expect(callbacks.onFocusFind).toHaveBeenCalledOnce();
    expect(callbacks.onClearFind).toHaveBeenCalledOnce();
    expect(callbacks.onToggleDock).toHaveBeenCalledOnce();
    expect(callbacks.onWorkspaceTab).toHaveBeenCalledWith('outline');
  });
});
