import { describe, expect, it, vi } from 'vitest';
import {
  CODEX_COMMANDS,
  COMMAND_GROUP_ORDER,
  commandForEvent,
  commandsInGroup,
  contextCommands,
  formatShortcut,
  getCommand,
  isCommandEnabled,
  matchesShortcut,
  type CommandContext,
  type CommandState,
  type ShortcutEvent,
} from '../codexCommands';

const state = (partial: Partial<CommandState> = {}): CommandState => ({
  selectionCount: 0,
  clipboardCount: 0,
  canUndo: false,
  canRedo: false,
  plateCount: 1,
  objectCount: 0,
  ...partial,
});

const ev = (partial: Partial<ShortcutEvent> & { key: string }): ShortcutEvent => ({
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...partial,
});

describe('command table', () => {
  it('has no duplicate ids', () => {
    const ids = CODEX_COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate shortcuts, which would make one of them dead', () => {
    const shortcuts = CODEX_COMMANDS.map((c) => c.shortcut).filter(Boolean) as string[];
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it('puts every command in a known group, and no group is empty', () => {
    for (const command of CODEX_COMMANDS) {
      expect(COMMAND_GROUP_ORDER, command.id).toContain(command.group);
    }
    for (const group of COMMAND_GROUP_ORDER) {
      expect(commandsInGroup(group).length, group).toBeGreaterThan(0);
    }
  });

  it('gives every command a label a user could read', () => {
    for (const command of CODEX_COMMANDS) {
      expect(command.label.trim().length, command.id).toBeGreaterThan(0);
      expect(command.label, command.id).not.toMatch(/^[a-z]+\./);
    }
  });

  it('looks a command up by id', () => {
    expect(getCommand('edit.undo')?.label).toBe('Undo');
    expect(getCommand('nope')).toBeUndefined();
  });
});

describe('enablement', () => {
  it('disables selection commands with nothing selected', () => {
    for (const id of ['edit.cut', 'edit.copy', 'edit.duplicate', 'edit.delete', 'object.bringToFront']) {
      expect(isCommandEnabled(getCommand(id)!, state()), id).toBe(false);
    }
  });

  it('enables them once something is selected', () => {
    const s = state({ selectionCount: 2 });
    for (const id of ['edit.cut', 'edit.copy', 'edit.duplicate', 'edit.delete']) {
      expect(isCommandEnabled(getCommand(id)!, s), id).toBe(true);
    }
  });

  it('gates paste on the clipboard, not the selection', () => {
    expect(isCommandEnabled(getCommand('edit.paste')!, state({ selectionCount: 5 }))).toBe(false);
    expect(isCommandEnabled(getCommand('edit.paste')!, state({ clipboardCount: 1 }))).toBe(true);
  });

  it('will not delete the last plate', () => {
    expect(isCommandEnabled(getCommand('plate.remove')!, state({ plateCount: 1 }))).toBe(false);
    expect(isCommandEnabled(getCommand('plate.remove')!, state({ plateCount: 2 }))).toBe(true);
  });

  it('gates undo and redo on history', () => {
    expect(isCommandEnabled(getCommand('edit.undo')!, state())).toBe(false);
    expect(isCommandEnabled(getCommand('edit.undo')!, state({ canUndo: true }))).toBe(true);
    expect(isCommandEnabled(getCommand('edit.redo')!, state({ canRedo: true }))).toBe(true);
  });

  it('treats commands without a guard as always available', () => {
    expect(isCommandEnabled(getCommand('file.save')!, state())).toBe(true);
  });
});

describe('contextCommands', () => {
  it('offers object actions on an object, not on empty canvas', () => {
    const onObject = contextCommands(true).map((c) => c.id);
    expect(onObject).toContain('edit.copy');
    expect(onObject).toContain('object.bringToFront');
    expect(onObject).not.toContain('edit.selectAll');
  });

  it('offers canvas actions on empty canvas, not object actions', () => {
    const onCanvas = contextCommands(false).map((c) => c.id);
    expect(onCanvas).toContain('edit.selectAll');
    expect(onCanvas).toContain('object.addText');
    expect(onCanvas).not.toContain('edit.cut');
  });

  it('offers paste in both, since it applies either way', () => {
    expect(contextCommands(true).map((c) => c.id)).toContain('edit.paste');
    expect(contextCommands(false).map((c) => c.id)).toContain('edit.paste');
  });

  it('never returns a command with no context scope', () => {
    for (const command of [...contextCommands(true), ...contextCommands(false)]) {
      expect(command.context, command.id).toBeDefined();
    }
  });
});

describe('matchesShortcut', () => {
  it('maps Mod to Cmd on macOS and Ctrl elsewhere', () => {
    expect(matchesShortcut(ev({ key: 'z', metaKey: true }), 'Mod+Z', true)).toBe(true);
    expect(matchesShortcut(ev({ key: 'z', ctrlKey: true }), 'Mod+Z', false)).toBe(true);
  });

  it('does not fire a Cmd shortcut from Ctrl on macOS', () => {
    expect(matchesShortcut(ev({ key: 'z', ctrlKey: true }), 'Mod+Z', true)).toBe(false);
  });

  it('will not let undo swallow redo', () => {
    // The whole point of strict modifier matching.
    expect(matchesShortcut(ev({ key: 'z', metaKey: true, shiftKey: true }), 'Mod+Z', true)).toBe(false);
    expect(matchesShortcut(ev({ key: 'z', metaKey: true, shiftKey: true }), 'Mod+Shift+Z', true)).toBe(true);
  });

  it('requires alt only when the shortcut names it', () => {
    expect(matchesShortcut(ev({ key: 'n', metaKey: true, altKey: true }), 'Mod+Alt+N', true)).toBe(true);
    expect(matchesShortcut(ev({ key: 'n', metaKey: true }), 'Mod+Alt+N', true)).toBe(false);
  });

  it('accepts Backspace for Delete, as Apple keyboards send it', () => {
    expect(matchesShortcut(ev({ key: 'Backspace' }), 'Delete')).toBe(true);
    expect(matchesShortcut(ev({ key: 'Delete' }), 'Delete')).toBe(true);
  });

  it('is case-insensitive on the key', () => {
    expect(matchesShortcut(ev({ key: 'Z', metaKey: true }), 'Mod+Z', true)).toBe(true);
  });

  it('handles bare keys with no modifier', () => {
    expect(matchesShortcut(ev({ key: 't' }), 'T')).toBe(true);
    expect(matchesShortcut(ev({ key: 't', metaKey: true }), 'T', true)).toBe(false);
  });

  it('matches named keys', () => {
    expect(matchesShortcut(ev({ key: 'Escape' }), 'Escape')).toBe(true);
    expect(matchesShortcut(ev({ key: 'ArrowRight', metaKey: true, altKey: true }), 'Mod+Alt+Right', true)).toBe(true);
  });
});

describe('commandForEvent', () => {
  it('finds the command for a shortcut and runs the right one', () => {
    const found = commandForEvent(ev({ key: 'd', metaKey: true }), state({ selectionCount: 1 }), true);
    expect(found?.id).toBe('edit.duplicate');
  });

  it('skips a disabled command rather than firing it', () => {
    expect(commandForEvent(ev({ key: 'd', metaKey: true }), state(), true)).toBeUndefined();
  });

  it('returns nothing for an unbound key', () => {
    expect(commandForEvent(ev({ key: 'q', metaKey: true }), state(), true)).toBeUndefined();
  });

  it('every shortcut in the table resolves back to its own command', () => {
    const permissive = state({
      selectionCount: 1, clipboardCount: 1, canUndo: true, canRedo: true, plateCount: 2, objectCount: 1,
    });
    for (const command of CODEX_COMMANDS) {
      if (!command.shortcut) continue;
      const parts = command.shortcut.split('+').map((p) => p.trim());
      const key = parts[parts.length - 1];
      const mods = parts.slice(0, -1).map((m) => m.toLowerCase());
      const found = commandForEvent(
        ev({
          key: key === 'Delete' ? 'Delete' : key === 'Escape' ? 'Escape' : key.replace(/^Right$/, 'ArrowRight').replace(/^Left$/, 'ArrowLeft'),
          metaKey: mods.includes('mod'),
          shiftKey: mods.includes('shift'),
          altKey: mods.includes('alt'),
        }),
        permissive,
        true,
      );
      expect(found?.id, command.id).toBe(command.id);
    }
  });
});

describe('formatShortcut', () => {
  it('uses symbols on macOS and words elsewhere', () => {
    expect(formatShortcut('Mod+Shift+Z', true)).toBe('⌘⇧Z');
    expect(formatShortcut('Mod+Shift+Z', false)).toBe('Ctrl+Shift+Z');
  });

  it('renders named keys legibly', () => {
    expect(formatShortcut('Delete', true)).toBe('Del');
    expect(formatShortcut('Escape', true)).toBe('Esc');
    expect(formatShortcut('Mod+Alt+Right', true)).toBe('⌘⌥→');
  });
});

describe('command execution', () => {
  it('each command calls exactly the action it names', () => {
    const calls: string[] = [];
    const handler = { get: (_: object, key: string) => () => calls.push(key) };
    const ctx = new Proxy({}, handler) as unknown as CommandContext;

    const expected: Record<string, string> = {
      'edit.undo': 'undo',
      'edit.copy': 'copy',
      'edit.paste': 'paste',
      'edit.delete': 'remove',
      'object.sendToBack': 'sendToBack',
      'view.zoomFit': 'zoomFit',
      'help.shortcuts': 'showShortcuts',
    };
    for (const [id, action] of Object.entries(expected)) {
      calls.length = 0;
      getCommand(id)!.run(ctx);
      expect(calls, id).toEqual([action]);
    }
  });

  it('runs without throwing for every command in the table', () => {
    const noop = vi.fn();
    const ctx = new Proxy({}, { get: () => noop }) as unknown as CommandContext;
    for (const command of CODEX_COMMANDS) {
      expect(() => command.run(ctx), command.id).not.toThrow();
    }
  });
});
