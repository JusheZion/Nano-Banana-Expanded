import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArchiveRestore, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';
import { ACCENT_GOLD_GRADIENT } from '@/shared/theme/Phase12DesignTokens';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const useDialogFocus = (
  open: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  initialFocusRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  escapeDisabled = false,
) => {
  const onCloseRef = useRef(onClose);
  const escapeDisabledRef = useRef(escapeDisabled);

  useEffect(() => {
    onCloseRef.current = onClose;
    escapeDisabledRef.current = escapeDisabled;
  }, [escapeDisabled, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      const initialFocus = initialFocusRef.current;
      if (initialFocus && !initialFocus.matches(':disabled')) initialFocus.focus();
      else containerRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !escapeDisabledRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) {
        event.preventDefault();
        containerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !containerRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !containerRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [containerRef, initialFocusRef, open]);
};

export type WriterRecordKind = 'series' | 'issue';

type ActionsMenuProps = {
  kind: WriterRecordKind;
  label: string;
  contextTargetId?: string;
  disabled?: boolean;
  onRename: () => void;
  onTrash: () => void;
};

export const WriterRecordActionsMenu: React.FC<ActionsMenuProps> = ({
  kind,
  label,
  contextTargetId,
  disabled = false,
  onRename,
  onTrash,
}) => {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!contextTargetId) return;
    const target = document.getElementById(contextTargetId);
    if (!target) return;
    const openFromContext = (event: Event) => {
      event.preventDefault();
      setOpen(true);
    };
    const openFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
      event.preventDefault();
      setOpen(true);
    };
    target.addEventListener('contextmenu', openFromContext);
    target.addEventListener('keydown', openFromKeyboard);
    return () => {
      target.removeEventListener('contextmenu', openFromContext);
      target.removeEventListener('keydown', openFromKeyboard);
    };
  }, [contextTargetId]);

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 190;
      setMenuPosition({
        left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
        top: Math.min(rect.bottom + 6, window.innerHeight - 104),
      });
    }
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
      if (items.length === 0) return;
      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex =
        event.key === 'Home' ? 0
          : event.key === 'End' ? items.length - 1
          : event.key === 'ArrowUp' ? (currentIndex <= 0 ? items.length - 1 : currentIndex - 1)
          : currentIndex < 0 || currentIndex === items.length - 1 ? 0 : currentIndex + 1;
      items[nextIndex]?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const runAction = (action: () => void) => {
    setOpen(false);
    triggerRef.current?.focus();
    action();
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={`More actions for ${kind} ${label}`}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        title={`Open ${kind} actions. Right-click or press Shift+F10 for the same menu.`}
        onClick={() => setOpen((current) => !current)}
        onContextMenu={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-black/15 bg-white/70 text-black/70 transition hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none sm:min-h-9 sm:min-w-9"
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open && typeof document !== 'undefined' ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`${kind === 'series' ? 'Series' : 'Issue'} actions`}
          className="fixed z-[280] min-w-[190px] overflow-hidden rounded-lg border border-black/20 bg-[#F5F5DC] py-1 text-black shadow-xl"
          style={menuPosition}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onRename)}
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:bg-black/10 motion-reduce:transition-none"
          >
            <Pencil size={14} aria-hidden />
            Rename {kind}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onTrash)}
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-red-900 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:bg-red-100 motion-reduce:transition-none"
          >
            <Trash2 size={14} aria-hidden />
            Move to Trash
          </button>
        </div>,
        document.body,
      ) : null}
    </div>
  );
};

type RenameDialogProps = {
  open: boolean;
  kind: WriterRecordKind;
  initialValue: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (value: string) => void;
};

export const WriterRenameDialog: React.FC<RenameDialogProps> = ({
  open,
  kind,
  initialValue,
  busy = false,
  error,
  onClose,
  onSave,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
  }, [initialValue, open]);

  useDialogFocus(open, dialogRef, inputRef, onClose, busy);

  useEffect(() => {
    if (!open) return;
    const selectFrame = window.requestAnimationFrame(() => inputRef.current?.select());
    return () => window.cancelAnimationFrame(selectFrame);
  }, [open]);

  if (!open) return null;

  const normalized = value.trim();

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <form
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          if (normalized) onSave(normalized);
        }}
        className="w-full max-w-md rounded-xl border border-black/20 bg-[#F5F5DC] p-5 text-black shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/60">Story Library</p>
            <h2 id={titleId} className="mt-1 font-serif text-2xl font-semibold">
              Rename {kind}
            </h2>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close rename dialog"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-40 motion-reduce:transition-none sm:min-h-10 sm:min-w-10"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <label className="mt-4 block text-xs font-black uppercase tracking-wide text-black/65">
          {kind === 'series' ? 'Series title' : 'Issue title'}
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={!normalized || Boolean(error)}
            className="mt-1.5 w-full rounded-lg border border-black/20 bg-white px-3 py-2.5 text-sm font-semibold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          />
        </label>
        {!normalized ? <p className="mt-2 text-xs font-semibold text-red-800">Enter a title before saving.</p> : null}
        {error ? (
          <p id={errorId} role="alert" className="mt-2 text-xs font-semibold text-red-800">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-11 rounded-md border border-black/20 bg-white/70 px-4 text-xs font-black uppercase tracking-wide transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-40 motion-reduce:transition-none sm:min-h-10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !normalized}
            className="min-h-11 rounded-md px-4 text-xs font-black uppercase tracking-wide shadow-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:opacity-40 motion-reduce:transition-none sm:min-h-10"
            style={{ background: ACCENT_GOLD_GRADIENT }}
          >
            {busy ? 'Saving…' : 'Save name'}
          </button>
        </div>
      </form>
    </div>
  );
};

type TrashConfirmDialogProps = {
  open: boolean;
  kind: WriterRecordKind;
  label: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const WriterTrashConfirmDialog: React.FC<TrashConfirmDialogProps> = ({
  open,
  kind,
  label,
  busy = false,
  onClose,
  onConfirm,
}) => {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useDialogFocus(open, dialogRef, cancelRef, onClose, busy);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[225] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy}
        className="w-full max-w-md rounded-xl border border-black/20 bg-[#F5F5DC] p-5 text-black shadow-2xl"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-800">Recoverable action</p>
        <h2 id={titleId} className="mt-1 font-serif text-2xl font-semibold">
          Move {label} to Trash?
        </h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-black/68">
          {kind === 'series'
            ? 'The series will be hidden, but its issues, pages, outlines, lore, beats, dialogue, and generated work will remain intact.'
            : 'The issue will be hidden, but its pages, outlines, beats, dialogue, shot plans, and generated work will remain intact.'}
        </p>
        <p className="mt-2 text-xs font-semibold text-black/60">
          You can undo immediately or restore it later from Recoverable Trash.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-11 rounded-md border border-black/20 bg-white/70 px-4 text-xs font-black uppercase tracking-wide transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-40 motion-reduce:transition-none sm:min-h-10"
          >
            Keep {kind}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="min-h-11 rounded-md border border-red-800/30 bg-red-100 px-4 text-xs font-black uppercase tracking-wide text-red-950 transition-colors hover:bg-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-40 motion-reduce:transition-none sm:min-h-10"
          >
            {busy ? 'Moving…' : 'Move to Trash'}
          </button>
        </div>
      </section>
    </div>
  );
};

export type WriterTrashRecord = {
  id: string;
  kind: WriterRecordKind;
  label: string;
  detail?: string;
};

type TrashPanelProps = {
  open: boolean;
  records: WriterTrashRecord[];
  loading?: boolean;
  busyId?: string | null;
  error?: string | null;
  onClose: () => void;
  onRestore: (record: WriterTrashRecord) => void;
};

export const WriterTrashPanel: React.FC<TrashPanelProps> = ({
  open,
  records,
  loading = false,
  busyId,
  error,
  onClose,
  onRestore,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useDialogFocus(open, dialogRef, closeRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[215] flex justify-end bg-black/35 backdrop-blur-sm">
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={loading}
        className="flex h-full w-full max-w-md flex-col border-l border-black/20 bg-[#F5F5DC] text-black shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/15 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/60">Recoverable storage</p>
            <h2 id={titleId} className="mt-1 font-serif text-2xl font-semibold">Trash</h2>
            <p id={descriptionId} className="mt-1 text-xs font-semibold leading-relaxed text-black/65">
              Restore a series or issue with its saved work intact. Permanent deletion is handled manually outside the app.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close Trash"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 motion-reduce:transition-none sm:min-h-10 sm:min-w-10"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <p role="status" className="text-sm font-semibold text-black/65">Loading Trash…</p> : null}
          {error ? <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-900">{error}</p> : null}
          {!loading && !error && records.length === 0 ? (
            <div className="border-l-2 border-emerald-700 bg-emerald-50/70 px-4 py-3">
              <p className="text-sm font-black">Trash is empty</p>
              <p className="mt-1 text-xs font-semibold text-black/65">Items moved here will remain recoverable.</p>
            </div>
          ) : null}
          <div className="space-y-2">
            {records.map((record) => (
              <article key={`${record.kind}-${record.id}`} className="border-l-2 border-black/25 bg-white/60 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wide text-black/55">{record.kind}</p>
                    <p className="truncate text-sm font-black">{record.label}</p>
                    {record.detail ? <p className="mt-0.5 text-xs font-semibold text-black/60">{record.detail}</p> : null}
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() => onRestore(record)}
                    aria-label={`Restore ${record.kind} ${record.label}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-black/20 bg-white px-3 text-xs font-black uppercase tracking-wide transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-40 motion-reduce:transition-none sm:min-h-10"
                  >
                    <ArchiveRestore size={15} aria-hidden />
                    {busyId === record.id ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
