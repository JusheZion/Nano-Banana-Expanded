import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { updateAssetThumbnailFocusDb, updateCharacterThumbnailFocusDb } from '@/shared/api/arcsPersistence';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  updateAssetGenerationThumbnailFocus,
  updateCharacterGenerationThumbnailFocus,
} from '@/shared/utils/generationOutputRouter';
import { ArcsStorageImg } from '@/components/ui/ArcsStorageImg';

const PREVIEW_W = 280;
const PREVIEW_H = 380;
/** Pixels before a press counts as a drag (avoids accidental nudge on click). */
const DRAG_THRESHOLD_PX = 6;
/** How much object-position % changes when dragging across the full preview width/height. */
const PAN_SENSITIVITY = 120;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type Props = {
  context: 'character' | 'asset';
  item: {
    id: string;
    image_url: string;
    name?: string | null;
    cast_name?: string | null;
    thumbnail_focus_x?: number | null;
    thumbnail_focus_y?: number | null;
    thumbnail_scale?: number | null;
  };
  onClose: () => void;
  onSaved: () => void;
};

export function ArchiveThumbnailFocusModal({ context, item, onClose, onSaved }: Props) {
  const [x, setX] = useState(item.thumbnail_focus_x ?? 50);
  const [y, setY] = useState(item.thumbnail_focus_y ?? 50);
  const [scale, setScale] = useState(item.thumbnail_scale ?? 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isDraggingFocal, setIsDraggingFocal] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragActiveRef = useRef(false);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const xRef = useRef(x);
  const yRef = useRef(y);
  xRef.current = x;
  yRef.current = y;
  /** Focal + pointer at start of this drag (after threshold); pan is relative to this. */
  const panAnchorRef = useRef<{ fx: number; fy: number; cx: number; cy: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const endFocalDrag = useCallback(() => {
    pointerDownRef.current = null;
    dragActiveRef.current = false;
    panAnchorRef.current = null;
    setIsDraggingFocal(false);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    dragActiveRef.current = false;
    setIsDraggingFocal(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!e.buttons || !pointerDownRef.current) return;
    const origin = pointerDownRef.current;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const dist = Math.hypot(dx, dy);
    if (!dragActiveRef.current) {
      if (dist < DRAG_THRESHOLD_PX) return;
      dragActiveRef.current = true;
      setIsDraggingFocal(true);
      panAnchorRef.current = {
        fx: xRef.current,
        fy: yRef.current,
        cx: e.clientX,
        cy: e.clientY,
      };
    }
    const el = previewRef.current;
    const anchor = panAnchorRef.current;
    if (!el || !anchor) return;
    const r = el.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    const dcx = e.clientX - anchor.cx;
    const dcy = e.clientY - anchor.cy;
    const nx = clamp(anchor.fx - (dcx / w) * PAN_SENSITIVITY, 0, 100);
    const ny = clamp(anchor.fy + (dcy / h) * PAN_SENSITIVITY, 0, 100);
    setX(Math.round(nx * 10) / 10);
    setY(Math.round(ny * 10) / 10);
  };

  const handlePointerUp = () => {
    endFocalDrag();
  };

  const handleSave = async () => {
    setErr(null);
    const focus = { x, y, scale };
    setSaving(true);
    try {
      if (isSupabaseConfigured()) {
        const r =
          context === 'character'
            ? await updateCharacterThumbnailFocusDb(item.id, focus)
            : await updateAssetThumbnailFocusDb(item.id, focus);
        if (!r.ok) {
          setErr(r.error ?? 'Save failed');
          return;
        }
      } else {
        const ok =
          context === 'character'
            ? updateCharacterGenerationThumbnailFocus(item.id, focus)
            : updateAssetGenerationThumbnailFocus(item.id, focus);
        if (!ok) {
          setErr('Could not update this entry in browser storage.');
          return;
        }
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const displayName = item.name ?? item.cast_name ?? 'Character';

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thumb-focus-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-[#0f0f14] shadow-2xl shadow-[#5F368E]/20 p-6 space-y-4">
        <h2 id="thumb-focus-title" className="text-lg font-bold text-[#D4AF37] tracking-wide">
          Adjust archive framing
        </h2>
        <p className="text-sm text-white/70">
          <span className="text-white font-medium">{displayName}</span> —{' '}
          <strong className="text-white/90">Click and drag</strong> to{' '}
          <em className="text-white/85">pan</em> framing (the view shifts with your drag, it does not
          jump to where you clicked). Use the scale slider to zoom.
        </p>

        <div
          ref={previewRef}
          className={`mx-auto overflow-hidden rounded-xl border-2 border-[#5F368E]/40 bg-black touch-none select-none ${
            isDraggingFocal ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ width: PREVIEW_W, height: PREVIEW_H }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <ArcsStorageImg
            src={item.image_url}
            alt=""
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
            style={{
              objectPosition: `${x}% ${y}%`,
              transform: `scale(${scale})`,
              transformOrigin: `${x}% ${y}%`,
            }}
          />
          <div
            className="pointer-events-none absolute w-6 h-6 border-2 border-[#00FFC2] rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(0,255,194,0.5)]"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-hidden
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between text-xs text-[#D4AF37]/80">
            <span>Scale</span>
            <span className="font-mono text-white/90">{scale.toFixed(2)}×</span>
          </label>
          <input
            type="range"
            min={0.55}
            max={2.2}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-[#D4AF37]"
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-white/50">
          <span>
            Focus {x.toFixed(1)}%, {y.toFixed(1)}%
          </span>
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setX(50);
              setY(50);
              setScale(1);
            }}
            className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 text-sm"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#FBF5D4] text-[#1a1a1e] font-bold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save framing'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
