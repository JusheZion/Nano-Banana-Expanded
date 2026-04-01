import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { WRITERS_GOLD_SLANT } from '@/shared/theme/Phase12DesignTokens';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export const WriterHelpModal: React.FC<Props> = ({ open, title, onClose, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="writer-help-title"
        className="w-full max-w-xl max-h-[min(85vh,680px)] flex flex-col rounded-2xl border border-white/40 bg-white/92 backdrop-blur-xl shadow-2xl shadow-teal-950/30 text-black"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 px-4 py-3 border-b border-black/10 shrink-0"
          style={{ background: WRITERS_GOLD_SLANT }}
        >
          <h2 id="writer-help-title" className="text-sm font-black tracking-tight text-black pr-2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-black/70 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 shrink-0"
            aria-label="Close help"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 text-[13px] leading-relaxed text-black/85 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
};
