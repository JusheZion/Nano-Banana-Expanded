/**
 * One command table, many surfaces.
 *
 * The menu bar, the right-click menu, the keyboard shortcuts and the shortcut
 * help all read from this list. Defining a command once is what stops those
 * surfaces drifting apart — a menu item that quietly does something different
 * from its own shortcut is the classic failure here, and it cannot happen if
 * there is only one definition.
 *
 * Commands are data: `isEnabled` and `run` take a context the portal supplies,
 * so the whole table is testable without mounting the app.
 */

export type CommandGroup = 'file' | 'edit' | 'object' | 'plate' | 'view' | 'help';

export const COMMAND_GROUP_LABELS: Record<CommandGroup, string> = {
  file: 'File',
  edit: 'Edit',
  object: 'Object',
  plate: 'Plate',
  view: 'View',
  help: 'Help',
};

export const COMMAND_GROUP_ORDER: CommandGroup[] = ['file', 'edit', 'object', 'plate', 'view', 'help'];

/** Where a command appears in the right-click menu, if at all. */
export type ContextScope = 'object' | 'canvas' | 'both';

/** What commands can read to decide whether they apply. */
export interface CommandState {
  selectionCount: number;
  clipboardCount: number;
  canUndo: boolean;
  canRedo: boolean;
  plateCount: number;
  objectCount: number;
  /** Whether the selection contains at least one grouped object. */
  hasGroup: boolean;
  /** Whether a vault is connected and read, gating the canon commands. */
  vaultReady: boolean;
}

/** What commands can do. Supplied by the portal; none of it lives here. */
export interface CommandActions {
  newDocument: () => void;
  save: () => void;
  exportPng: () => void;
  exportPdf: () => void;
  undo: () => void;
  redo: () => void;
  cut: () => void;
  copy: () => void;
  paste: () => void;
  duplicate: () => void;
  remove: () => void;
  selectAll: () => void;
  deselect: () => void;
  bringToFront: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  sendToBack: () => void;
  toggleLock: () => void;
  toggleVisible: () => void;
  group: () => void;
  ungroup: () => void;
  addText: () => void;
  addChart: () => void;
  addPlate: () => void;
  removePlate: () => void;
  nextPlate: () => void;
  previousPlate: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  zoomActual: () => void;
  openInsert: () => void;
  openProperties: () => void;
  openLayers: () => void;
  openFiles: () => void;
  openVault: () => void;
  connectVault: () => void;
  refreshVault: () => void;
  showShortcuts: () => void;
}

export type CommandContext = CommandState & CommandActions;

export interface CodexCommand {
  id: string;
  label: string;
  group: CommandGroup;
  /** Canonical form, e.g. `Mod+Shift+Z`. `Mod` is Cmd on macOS, Ctrl elsewhere. */
  shortcut?: string;
  context?: ContextScope;
  /** Defaults to always enabled. */
  isEnabled?: (state: CommandState) => boolean;
  run: (ctx: CommandContext) => void;
  /** Draw a separator above this item in menus. */
  dividerBefore?: boolean;
  destructive?: boolean;
}

const hasSelection = (s: CommandState) => s.selectionCount > 0;

export const CODEX_COMMANDS: CodexCommand[] = [
  // file
  { id: 'file.new', label: 'New Codex', group: 'file', shortcut: 'Mod+Alt+N', run: (c) => c.newDocument() },
  { id: 'file.save', label: 'Save', group: 'file', shortcut: 'Mod+S', run: (c) => c.save() },
  { id: 'file.exportPng', label: 'Export Plate as PNG', group: 'file', shortcut: 'Mod+Shift+E', dividerBefore: true, run: (c) => c.exportPng() },
  { id: 'file.exportPdf', label: 'Export Codex as PDF', group: 'file', run: (c) => c.exportPdf() },
  { id: 'file.connectVault', label: 'Connect Vault', group: 'file', dividerBefore: true, run: (c) => c.connectVault() },
  { id: 'file.refreshVault', label: 'Refresh from Vault', group: 'file', shortcut: 'Mod+Alt+R', isEnabled: (s) => s.vaultReady, run: (c) => c.refreshVault() },

  // edit
  { id: 'edit.undo', label: 'Undo', group: 'edit', shortcut: 'Mod+Z', isEnabled: (s) => s.canUndo, run: (c) => c.undo() },
  { id: 'edit.redo', label: 'Redo', group: 'edit', shortcut: 'Mod+Shift+Z', isEnabled: (s) => s.canRedo, run: (c) => c.redo() },
  { id: 'edit.cut', label: 'Cut', group: 'edit', shortcut: 'Mod+X', context: 'object', dividerBefore: true, isEnabled: hasSelection, run: (c) => c.cut() },
  { id: 'edit.copy', label: 'Copy', group: 'edit', shortcut: 'Mod+C', context: 'object', isEnabled: hasSelection, run: (c) => c.copy() },
  { id: 'edit.paste', label: 'Paste', group: 'edit', shortcut: 'Mod+V', context: 'both', isEnabled: (s) => s.clipboardCount > 0, run: (c) => c.paste() },
  { id: 'edit.duplicate', label: 'Duplicate', group: 'edit', shortcut: 'Mod+D', context: 'object', isEnabled: hasSelection, run: (c) => c.duplicate() },
  { id: 'edit.delete', label: 'Delete', group: 'edit', shortcut: 'Delete', context: 'object', isEnabled: hasSelection, destructive: true, run: (c) => c.remove() },
  { id: 'edit.selectAll', label: 'Select All', group: 'edit', shortcut: 'Mod+A', context: 'canvas', dividerBefore: true, isEnabled: (s) => s.objectCount > 0, run: (c) => c.selectAll() },
  { id: 'edit.deselect', label: 'Deselect', group: 'edit', shortcut: 'Escape', isEnabled: hasSelection, run: (c) => c.deselect() },

  // object
  {
    id: 'object.properties',
    label: 'Properties',
    group: 'object',
    shortcut: 'Enter',
    context: 'object',
    isEnabled: hasSelection,
    run: (c) => c.openProperties(),
  },
  { id: 'object.addText', label: 'Add Text', group: 'object', shortcut: 'T', context: 'canvas', run: (c) => c.addText() },
  { id: 'object.addChart', label: 'Add Chart', group: 'object', shortcut: 'C', context: 'canvas', run: (c) => c.addChart() },
  { id: 'object.bringToFront', label: 'Bring to Front', group: 'object', shortcut: 'Mod+Shift+]', context: 'object', dividerBefore: true, isEnabled: hasSelection, run: (c) => c.bringToFront() },
  { id: 'object.bringForward', label: 'Bring Forward', group: 'object', shortcut: 'Mod+]', context: 'object', isEnabled: hasSelection, run: (c) => c.bringForward() },
  { id: 'object.sendBackward', label: 'Send Backward', group: 'object', shortcut: 'Mod+[', context: 'object', isEnabled: hasSelection, run: (c) => c.sendBackward() },
  { id: 'object.sendToBack', label: 'Send to Back', group: 'object', shortcut: 'Mod+Shift+[', context: 'object', isEnabled: hasSelection, run: (c) => c.sendToBack() },
  {
    id: 'object.group',
    label: 'Group',
    group: 'object',
    shortcut: 'Mod+G',
    context: 'object',
    dividerBefore: true,
    // Two is the smallest thing that can be a group; one object is itself.
    isEnabled: (s) => s.selectionCount > 1,
    run: (c) => c.group(),
  },
  {
    id: 'object.ungroup',
    label: 'Ungroup',
    group: 'object',
    shortcut: 'Mod+Shift+G',
    context: 'object',
    isEnabled: (s) => s.hasGroup,
    run: (c) => c.ungroup(),
  },
  { id: 'object.toggleLock', label: 'Lock / Unlock', group: 'object', shortcut: 'Mod+L', context: 'object', dividerBefore: true, isEnabled: hasSelection, run: (c) => c.toggleLock() },
  { id: 'object.toggleVisible', label: 'Hide / Show', group: 'object', shortcut: 'Mod+Shift+H', context: 'object', isEnabled: hasSelection, run: (c) => c.toggleVisible() },

  // plate
  { id: 'plate.add', label: 'Add Plate', group: 'plate', run: (c) => c.addPlate() },
  { id: 'plate.remove', label: 'Delete Plate', group: 'plate', isEnabled: (s) => s.plateCount > 1, destructive: true, run: (c) => c.removePlate() },
  { id: 'plate.next', label: 'Next Plate', group: 'plate', shortcut: 'Mod+Alt+Right', dividerBefore: true, isEnabled: (s) => s.plateCount > 1, run: (c) => c.nextPlate() },
  { id: 'plate.previous', label: 'Previous Plate', group: 'plate', shortcut: 'Mod+Alt+Left', isEnabled: (s) => s.plateCount > 1, run: (c) => c.previousPlate() },

  // view
  { id: 'view.zoomIn', label: 'Zoom In', group: 'view', shortcut: 'Mod+=', run: (c) => c.zoomIn() },
  { id: 'view.zoomOut', label: 'Zoom Out', group: 'view', shortcut: 'Mod+-', run: (c) => c.zoomOut() },
  { id: 'view.zoomFit', label: 'Fit Plate', group: 'view', shortcut: 'Mod+0', run: (c) => c.zoomFit() },
  { id: 'view.zoomActual', label: 'Actual Size', group: 'view', shortcut: 'Mod+1', run: (c) => c.zoomActual() },
  { id: 'view.insert', label: 'Insert Panel', group: 'view', shortcut: '1', dividerBefore: true, run: (c) => c.openInsert() },
  { id: 'view.properties', label: 'Properties Panel', group: 'view', shortcut: '2', run: (c) => c.openProperties() },
  { id: 'view.layers', label: 'Layers Panel', group: 'view', shortcut: '3', run: (c) => c.openLayers() },
  { id: 'view.files', label: 'Files Panel', group: 'view', shortcut: '4', run: (c) => c.openFiles() },
  { id: 'view.vault', label: 'Vault Panel', group: 'view', shortcut: '5', run: (c) => c.openVault() },

  // help
  { id: 'help.shortcuts', label: 'Keyboard Shortcuts', group: 'help', shortcut: 'Mod+/', run: (c) => c.showShortcuts() },
];

export function commandsInGroup(group: CommandGroup): CodexCommand[] {
  return CODEX_COMMANDS.filter((c) => c.group === group);
}

/** Commands offered on right-click, given whether the click hit an object. */
export function contextCommands(onObject: boolean): CodexCommand[] {
  return CODEX_COMMANDS.filter((c) => {
    if (!c.context) return false;
    if (c.context === 'both') return true;
    return c.context === (onObject ? 'object' : 'canvas');
  });
}

export function isCommandEnabled(command: CodexCommand, state: CommandState): boolean {
  return command.isEnabled ? command.isEnabled(state) : true;
}

export function getCommand(id: string): CodexCommand | undefined {
  return CODEX_COMMANDS.find((c) => c.id === id);
}

/* ------------------------------------------------------------- shortcuts -- */

export interface ShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  del: 'delete',
  right: 'arrowright',
  left: 'arrowleft',
  up: 'arrowup',
  down: 'arrowdown',
};

function normaliseKey(key: string): string {
  const lower = key.toLowerCase();
  return KEY_ALIASES[lower] ?? lower;
}

/**
 * Matches an event against a canonical shortcut string.
 *
 * `Mod` is Cmd on macOS and Ctrl elsewhere, so one definition serves both. The
 * match is strict about modifiers that are *not* named: `Mod+Z` must not fire
 * on `Mod+Shift+Z`, or undo would swallow redo.
 */
export function matchesShortcut(event: ShortcutEvent, shortcut: string, isMac = false): boolean {
  const parts = shortcut.split('+').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return false;

  const key = normaliseKey(parts[parts.length - 1]);
  const mods = new Set(parts.slice(0, -1).map((m) => m.toLowerCase()));

  const modPressed = isMac ? event.metaKey : event.ctrlKey;
  // The other primary modifier must not be held, so Ctrl+Z on a Mac does not
  // also fire a Cmd-defined shortcut.
  const otherMod = isMac ? event.ctrlKey : event.metaKey;

  if (mods.has('mod') !== modPressed) return false;
  if (otherMod) return false;
  if (mods.has('shift') !== event.shiftKey) return false;
  if (mods.has('alt') !== event.altKey) return false;

  const eventKey = normaliseKey(event.key);
  if (eventKey === key) return true;
  // Backspace carries the same intent as Delete on Apple keyboards.
  if (key === 'delete' && eventKey === 'backspace') return true;
  return false;
}

/** Finds the command a key event should run, if any. */
export function commandForEvent(
  event: ShortcutEvent,
  state: CommandState,
  isMac = false,
): CodexCommand | undefined {
  return CODEX_COMMANDS.find(
    (c) => c.shortcut && matchesShortcut(event, c.shortcut, isMac) && isCommandEnabled(c, state),
  );
}

const DISPLAY: Record<string, string> = {
  escape: 'Esc',
  delete: 'Del',
  arrowright: '→',
  arrowleft: '←',
  arrowup: '↑',
  arrowdown: '↓',
};

/** Human-readable shortcut, platform-appropriate. */
export function formatShortcut(shortcut: string, isMac = false): string {
  return shortcut
    .split('+')
    .map((raw) => {
      const part = raw.trim();
      const lower = part.toLowerCase();
      if (lower === 'mod') return isMac ? '⌘' : 'Ctrl';
      if (lower === 'alt') return isMac ? '⌥' : 'Alt';
      if (lower === 'shift') return isMac ? '⇧' : 'Shift';
      const normalised = normaliseKey(part);
      return DISPLAY[normalised] ?? (part.length === 1 ? part.toUpperCase() : part);
    })
    .join(isMac ? '' : '+');
}
