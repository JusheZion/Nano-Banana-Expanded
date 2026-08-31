import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  CODEX_COMMANDS,
  COMMAND_GROUP_LABELS,
  COMMAND_GROUP_ORDER,
  commandsInGroup,
  contextCommands,
  formatShortcut,
  isCommandEnabled,
  type CodexCommand,
  type CommandContext,
  type CommandGroup,
  type CommandState,
} from '../commands/codexCommands';

interface MenuSurfaceProps {
  state: CommandState;
  ctx: CommandContext;
  isMac: boolean;
}

/**
 * Shared row for both the menu bar and the right-click menu, so a command looks
 * and behaves the same wherever it is reached.
 */
function MenuItemRow({
  command,
  state,
  onRun,
  isMac,
  focused,
  onFocus,
}: {
  command: CodexCommand;
  state: CommandState;
  onRun: (command: CodexCommand) => void;
  isMac: boolean;
  focused: boolean;
  onFocus: () => void;
}) {
  const enabled = isCommandEnabled(command, state);
  return (
    <>
      {command.dividerBefore && <div role="separator" className="my-1 h-px bg-white/10" />}
      <button
        type="button"
        role="menuitem"
        tabIndex={focused ? 0 : -1}
        aria-disabled={!enabled}
        disabled={!enabled}
        onMouseEnter={onFocus}
        onClick={() => enabled && onRun(command)}
        className={[
          'flex w-full items-center justify-between gap-6 rounded px-2.5 py-1.5 text-left text-[12px] transition-colors',
          'focus:outline-none',
          enabled
            ? command.destructive
              ? 'text-rose-200/90 hover:bg-rose-500/20 focus:bg-rose-500/20'
              : 'text-white/85 hover:bg-white/12 focus:bg-white/12'
            : 'cursor-default text-white/25',
          focused && enabled ? (command.destructive ? 'bg-rose-500/20' : 'bg-white/12') : '',
        ].join(' ')}
      >
        <span>{command.label}</span>
        {command.shortcut && (
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/35">
            {formatShortcut(command.shortcut, isMac)}
          </span>
        )}
      </button>
    </>
  );
}

/**
 * Roving-focus list shared by the menu bar dropdowns and the context menu.
 * Arrow keys move, Home/End jump, Escape closes, Enter runs — the behaviour a
 * menu is expected to have, rather than a list of clickable divs.
 */
function MenuList({
  commands,
  state,
  ctx,
  isMac,
  onClose,
  autoFocus = true,
  labelledBy,
}: MenuSurfaceProps & {
  commands: CodexCommand[];
  onClose: () => void;
  autoFocus?: boolean;
  labelledBy?: string;
}) {
  const [focusIndex, setFocusIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const enabledIndexes = useMemo(
    () => commands.map((c, i) => (isCommandEnabled(c, state) ? i : -1)).filter((i) => i >= 0),
    [commands, state],
  );

  // Focus the first enabled item once, on open. Re-running this whenever
  // `enabledIndexes` changes identity — which is every render, since the command
  // list is rebuilt each time — would snap focus back to the top and make arrow
  // navigation impossible.
  const didFocus = useRef(false);
  useEffect(() => {
    if (didFocus.current || !autoFocus || enabledIndexes.length === 0) return;
    didFocus.current = true;
    setFocusIndex(enabledIndexes[0]);
  }, [autoFocus, enabledIndexes]);

  useEffect(() => {
    const node = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[focusIndex];
    node?.focus();
  }, [focusIndex]);

  const step = (delta: number) => {
    if (!enabledIndexes.length) return;
    const position = enabledIndexes.indexOf(focusIndex);
    const next = position < 0 ? 0 : (position + delta + enabledIndexes.length) % enabledIndexes.length;
    setFocusIndex(enabledIndexes[next]);
  };

  return (
    <div
      ref={listRef}
      role="menu"
      aria-labelledby={labelledBy}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
        else if (e.key === 'Home') { e.preventDefault(); setFocusIndex(enabledIndexes[0] ?? 0); }
        else if (e.key === 'End') { e.preventDefault(); setFocusIndex(enabledIndexes[enabledIndexes.length - 1] ?? 0); }
        else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      }}
      className="min-w-[228px] rounded-lg border border-white/15 bg-[#171327] p-1 shadow-2xl shadow-black/60"
    >
      {commands.map((command, i) => (
        <MenuItemRow
          key={command.id}
          command={command}
          state={state}
          isMac={isMac}
          focused={i === focusIndex}
          onFocus={() => setFocusIndex(i)}
          onRun={(c) => {
            onClose();
            c.run(ctx);
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- menu bar -- */

/**
 * The horizontal menu. Open one and the others open on hover, which is what a
 * menu bar does everywhere else; arrow keys move between them.
 */
export function CodexMenuBar({ state, ctx, isMac }: MenuSurfaceProps) {
  const [open, setOpen] = useState<CommandGroup | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const moveGroup = (delta: number) => {
    const i = open ? COMMAND_GROUP_ORDER.indexOf(open) : 0;
    setOpen(COMMAND_GROUP_ORDER[(i + delta + COMMAND_GROUP_ORDER.length) % COMMAND_GROUP_ORDER.length]);
  };

  return (
    <div
      ref={barRef}
      role="menubar"
      aria-label="Codex Studio menu"
      className="flex items-center gap-0.5"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' && open) { e.preventDefault(); moveGroup(1); }
        else if (e.key === 'ArrowLeft' && open) { e.preventDefault(); moveGroup(-1); }
        else if (e.key === 'Escape') { setOpen(null); }
      }}
    >
      {COMMAND_GROUP_ORDER.map((group) => {
        const id = `${baseId}-${group}`;
        return (
          <div key={group} className="relative">
            <button
              id={id}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={open === group}
              onClick={() => setOpen(open === group ? null : group)}
              onMouseEnter={() => open && setOpen(group)}
              className={[
                'rounded px-2.5 py-1 text-[12px] transition-colors focus:outline-none focus:ring-1 focus:ring-white/50',
                open === group ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/8 hover:text-white',
              ].join(' ')}
            >
              {COMMAND_GROUP_LABELS[group]}
            </button>
            {open === group && (
              <div className="absolute left-0 top-full z-50 mt-1">
                <MenuList
                  commands={commandsInGroup(group)}
                  state={state}
                  ctx={ctx}
                  isMac={isMac}
                  labelledBy={id}
                  onClose={() => setOpen(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- context menu -- */

export interface ContextMenuTarget {
  x: number;
  y: number;
  onObject: boolean;
}

/** Right-click menu. Flips near the viewport edge rather than overflowing it. */
export function CodexContextMenu({
  target,
  state,
  ctx,
  isMac,
  onClose,
}: MenuSurfaceProps & { target: ContextMenuTarget; onClose: () => void }) {
  const commands = useMemo(() => contextCommands(target.onObject), [target.onObject]);
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: target.x, top: target.y });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setPosition({
      left: Math.min(target.x, window.innerWidth - rect.width - 8),
      top: Math.min(target.y, window.innerHeight - rect.height - 8),
    });
  }, [target.x, target.y]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

  return (
    <div ref={ref} className="fixed z-[60]" style={position}>
      <MenuList commands={commands} state={state} ctx={ctx} isMac={isMac} onClose={onClose} />
    </div>
  );
}

/* ------------------------------------------------------- shortcuts dialog -- */

/** Generated from the command table, so it cannot describe a shortcut that no longer exists. */
export function CodexShortcutsDialog({ isMac, onClose }: { isMac: boolean; onClose: () => void }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const groups = COMMAND_GROUP_ORDER.map((group) => ({
    group,
    commands: commandsInGroup(group).filter((c) => c.shortcut),
  })).filter((g) => g.commands.length > 0);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6"
      onClick={close}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-[#171327] p-6 shadow-2xl focus:outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-[15px] tracking-[0.12em] text-amber-200/90 uppercase">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close shortcuts"
            className="rounded border border-white/20 px-2 py-1 text-[11px] text-white/70 hover:border-white/40 hover:text-white focus:outline-none focus:ring-1 focus:ring-white/50"
          >
            Esc
          </button>
        </div>

        <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {groups.map(({ group, commands }) => (
            <section key={group}>
              <h3 className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-white/40">
                {COMMAND_GROUP_LABELS[group]}
              </h3>
              <dl className="space-y-1">
                {commands.map((command) => (
                  <div key={command.id} className="flex items-baseline justify-between gap-4">
                    <dt className="text-[12px] text-white/75">{command.label}</dt>
                    <dd className="shrink-0 font-mono text-[10.5px] tabular-nums text-white/45">
                      {formatShortcut(command.shortcut!, isMac)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <p className="mt-5 border-t border-white/10 pt-3 text-[11px] text-white/40">
          Arrow keys nudge the selection by 1px, or 10px with Shift.
          {' '}
          {CODEX_COMMANDS.filter((c) => c.shortcut).length} shortcuts.
        </p>
      </div>
    </div>
  );
}
