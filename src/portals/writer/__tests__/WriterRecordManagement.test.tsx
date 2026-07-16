import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  WriterRecordActionsMenu,
  WriterRenameDialog,
  WriterTrashConfirmDialog,
  WriterTrashPanel,
} from '@/portals/writer/WriterRecordManagement';

describe('Writer record management', () => {
  it('exposes rename and Trash from a visible accessible menu', () => {
    const onRename = vi.fn();
    const onTrash = vi.fn();
    render(
      <WriterRecordActionsMenu
        kind="series"
        label="QA story"
        onRename={onRename}
        onTrash={onTrash}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'More actions for series QA story' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename series' }));
    expect(onRename).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'More actions for series QA story' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move to Trash' }));
    expect(onTrash).toHaveBeenCalledTimes(1);
  });

  it('opens the same actions with contextual keyboard and pointer access', () => {
    render(
      <WriterRecordActionsMenu
        kind="issue"
        label="Issue one"
        onRename={vi.fn()}
        onTrash={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'More actions for issue Issue one' });
    fireEvent.keyDown(trigger, { key: 'F10', shiftKey: true });
    const rename = screen.getByRole('menuitem', { name: 'Rename issue' });
    const trash = screen.getByRole('menuitem', { name: 'Move to Trash' });
    expect(rename).toBeTruthy();

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(trash);
    fireEvent.keyDown(window, { key: 'Home' });
    expect(document.activeElement).toBe(rename);
    fireEvent.keyDown(window, { key: 'End' });
    expect(document.activeElement).toBe(trash);

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.contextMenu(trigger);
    expect(screen.getByRole('menuitem', { name: 'Move to Trash' })).toBeTruthy();
  });

  it('validates and submits a renamed record', () => {
    const onSave = vi.fn();
    render(
      <WriterRenameDialog
        open
        kind="issue"
        initialValue="Issue one"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Issue title' });
    fireEvent.change(input, { target: { value: '  Revised issue  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(onSave).toHaveBeenCalledWith('Revised issue');
  });

  it('shows an empty Trash state and restores a record', () => {
    const { rerender } = render(
      <WriterTrashPanel open records={[]} onClose={vi.fn()} onRestore={vi.fn()} />,
    );
    expect(screen.getByText('Trash is empty')).toBeTruthy();

    const onRestore = vi.fn();
    rerender(
      <WriterTrashPanel
        open
        records={[{ id: 'series-1', kind: 'series', label: 'QA story' }]}
        onClose={vi.fn()}
        onRestore={onRestore}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Restore series QA story' }));
    expect(onRestore).toHaveBeenCalledWith({ id: 'series-1', kind: 'series', label: 'QA story' });
  });

  it('requires an explicit recoverable Trash confirmation', () => {
    const onConfirm = vi.fn();
    render(
      <WriterTrashConfirmDialog
        open
        kind="series"
        label="QA story"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole('alertdialog', { name: 'Move QA story to Trash?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Move to Trash' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('traps rename-dialog focus and restores the opener after Escape', async () => {
    const onClose = vi.fn();
    const opener = document.createElement('button');
    opener.textContent = 'Open rename';
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(
      <WriterRenameDialog
        open
        kind="series"
        initialValue="QA story"
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Series title' });
    await waitFor(() => expect(document.activeElement).toBe(input));

    screen.getByRole('button', { name: 'Save name' }).focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close rename dialog' }));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <WriterRenameDialog
        open={false}
        kind="series"
        initialValue="QA story"
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('keeps a busy confirmation open and focus contained', async () => {
    const onClose = vi.fn();
    render(
      <WriterTrashConfirmDialog
        open
        busy
        kind="issue"
        label="Issue one"
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog.getAttribute('aria-busy')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Keep issue' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Moving…' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('traps focus in Trash and exposes record-specific restore labels', async () => {
    const onClose = vi.fn();
    render(
      <WriterTrashPanel
        open
        records={[{ id: 'issue-1', kind: 'issue', label: 'Issue one' }]}
        onClose={onClose}
        onRestore={vi.fn()}
      />,
    );

    const closeButton = screen.getByRole('button', { name: 'Close Trash' });
    const restoreButton = screen.getByRole('button', { name: 'Restore issue Issue one' });
    await waitFor(() => expect(document.activeElement).toBe(closeButton));

    closeButton.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(restoreButton);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
