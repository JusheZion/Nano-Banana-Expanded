import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type WriterContextMenuItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type Props = {
  children: React.ReactNode;
  items: WriterContextMenuItem[];
};

const LONG_PRESS_MS = 520;

export const WriterContextMenu: React.FC<Props> = ({ children, items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const openAt = useCallback(
    (x: number, y: number, opener?: HTMLElement | null) => {
      const usable = items.some((i) => !i.disabled);
      if (!usable) return;
      openerRef.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      setPos({ x, y });
      setOpen(true);
    },
    [items],
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const usable = items.some((i) => !i.disabled);
      if (!usable) return;
      e.preventDefault();
      openAt(e.clientX, e.clientY, e.target instanceof HTMLElement ? e.target : null);
    },
    [items, openAt],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const usable = items.some((i) => !i.disabled);
      if (!usable) return;
      clearLongPress();
      const startX = e.clientX;
      const startY = e.clientY;
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        openAt(startX, startY);
      }, LONG_PRESS_MS);
    },
    [items, openAt, clearLongPress],
  );

  const endLongPressTrack = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const el = menuRef.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const pad = 8;
    setMenuPos({
      x: Math.max(pad, Math.min(pos.x, window.innerWidth - w - pad)),
      y: Math.max(pad, Math.min(pos.y, window.innerHeight - h - pad)),
    });
  }, [open, pos.x, pos.y]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (restoreFocus = false) => {
      setOpen(false);
      if (restoreFocus) openerRef.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      const available = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
      );
      if (available.length === 0) return;
      e.preventDefault();
      const current = available.indexOf(document.activeElement as HTMLButtonElement);
      let next = 0;
      if (e.key === 'End') next = available.length - 1;
      else if (e.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % available.length;
      else if (e.key === 'ArrowUp') next = current < 0 ? available.length - 1 : (current - 1 + available.length) % available.length;
      available[next]?.focus();
    };
    const onWindowClick = () => close();
    window.addEventListener('click', onWindowClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onWindowClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerUp={endLongPressTrack}
      onPointerCancel={endLongPressTrack}
      onPointerLeave={endLongPressTrack}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col touch-manipulation"
    >
      {children}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[200] min-w-[180px] max-w-[min(100vw-1rem,280px)] rounded-lg border border-black/20 bg-[#F5F5DC] py-1 shadow-xl text-black"
          style={{ left: menuPos.x, top: menuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setOpen(false);
                }
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-black/10 disabled:opacity-40 disabled:pointer-events-none"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
