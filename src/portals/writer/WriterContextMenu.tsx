import React, { useCallback, useEffect, useRef, useState } from 'react';

export type WriterContextMenuItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type Props = {
  children: React.ReactNode;
  items: WriterContextMenuItem[];
};

export const WriterContextMenu: React.FC<Props> = ({ children, items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    const usable = items.some((i) => !i.disabled);
    if (!usable) return;
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }, [items]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      onContextMenu={onContextMenu}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col"
    >
      {children}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[200] min-w-[180px] rounded-lg border border-black/20 bg-[#F5F5DC] py-1 shadow-xl text-black"
          style={{ left: pos.x, top: pos.y }}
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
