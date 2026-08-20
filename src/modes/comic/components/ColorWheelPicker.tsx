import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Pipette } from 'lucide-react';
import { useComicStore } from '../../../stores/comicStore';
import { hexToHsv, hsvToHex } from '../utils/colorUtils';
import { ACCENT_GOLD_SOLID, TEXT_ON_BLUE } from '../theme/Phase12DesignTokens';
import { useShallow } from 'zustand/react/shallow';

declare global {
  interface Window {
    EyeDropper?: new () => { open: (options?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }> };
  }
}

const PICKER_SIZE = 160;

export interface ColorWheelPickerProps {
  value: string;
  onChange: (hex: string) => void;
  onApply?: (hex: string) => void;
  /** Show Favorites and Recently Used rows */
  showSwatches?: boolean;
  className?: string;
}

function drawHueDisk(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const step = 2;
  for (let i = 0; i < 360; i += step) {
    const a1 = ((i - 90) * Math.PI) / 180;
    const a2 = ((i + step - 90) * Math.PI) / 180;
    ctx.fillStyle = hsvToHex(i, 1, 1);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a1, a2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawSVSquare(ctx: CanvasRenderingContext2D, h: number, x: number, y: number, w: number) {
  for (let py = 0; py < w; py++) {
    for (let px = 0; px < w; px++) {
      const s = px / w;
      const v = 1 - py / w;
      ctx.fillStyle = hsvToHex(h, s, v);
      ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
}

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  value,
  onChange,
  onApply,
  showSwatches = true,
  className = '',
}) => {
  const hueRingRef = useRef<HTMLCanvasElement>(null);
  const svRef = useRef<HTMLCanvasElement>(null);
  const {
    colorFavorites,
    colorRecentlyUsed,
    addColorToFavorites,
    removeColorFromFavorites,
    addColorToRecentlyUsed,
  } = useComicStore(
    useShallow((s) => ({
      colorFavorites: s.colorFavorites,
      colorRecentlyUsed: s.colorRecentlyUsed,
      addColorToFavorites: s.addColorToFavorites,
      removeColorFromFavorites: s.removeColorFromFavorites,
      addColorToRecentlyUsed: s.addColorToRecentlyUsed,
    })),
  );

  const hv = useMemo(() => hexToHsv(value), [value]);
  const [h, setH] = React.useState(hv.h);
  const [s, setS] = React.useState(hv.s);
  const [v, setV] = React.useState(hv.v);

  /**
   * The last hex this picker emitted, so we can tell our own echo from a genuine external change.
   *
   * Hex is a lossy round-trip for HSV: every shade of grey is hue 0, and black is saturation 0 too.
   * Without this guard, sliding saturation down to white emitted `#ffffff`, the parent echoed it
   * back, and the effect below re-derived hue 0 — snapping the ring from wherever you were round to
   * red. Sliding back up then gave red instead of the colour you started from.
   */
  const lastEmittedRef = useRef<string | null>(null);

  const emit = useCallback(
    (hex: string) => {
      lastEmittedRef.current = hex;
      onChange(hex);
    },
    [onChange],
  );

  React.useEffect(() => {
    if (lastEmittedRef.current === value) return; // our own value coming back; keep h/s/v intact
    const next = hexToHsv(value);
    setH(next.h);
    setS(next.s);
    setV(next.v);
  }, [value]);

  const cx = PICKER_SIZE / 2;
  const cy = PICKER_SIZE / 2;
  const hueR = PICKER_SIZE / 2 - 2;

  useEffect(() => {
    const canvas = hueRingRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = PICKER_SIZE * dpr;
    canvas.height = PICKER_SIZE * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, PICKER_SIZE, PICKER_SIZE);
    drawHueDisk(ctx, cx, cy, hueR);
  }, [cx, cy, hueR]);

  useEffect(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = PICKER_SIZE;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    drawSVSquare(ctx, h, 0, 0, size);
  }, [h]);

  /**
   * Converts a pointer event into the canvas's LOGICAL coordinate space (0..PICKER_SIZE).
   *
   * The old code multiplied by `canvas.width / rect.width`, which is the device-pixel ratio — but
   * then compared the result against `cx`/`cy`/`PICKER_SIZE`, which are logical units. On any HiDPI
   * display (dpr 2) that doubled every offset: most of the hue ring became unclickable, because the
   * inflated distance failed the `dist > hueR` test, and the saturation/value square saturated at
   * its halfway point so its right and bottom halves did nothing. Dividing by `rect.width` instead
   * normalises against however the canvas is actually laid out, at any zoom or pixel ratio.
   */
  const toLogicalPoint = (
    canvas: HTMLCanvasElement,
    e: React.MouseEvent<HTMLCanvasElement>,
  ): { x: number; y: number } | null => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * PICKER_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * PICKER_SIZE,
    };
  };

  const handleHueClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = hueRingRef.current;
      if (!canvas) return;
      const point = toLogicalPoint(canvas, e);
      if (!point) return;
      const px = point.x - cx;
      const py = point.y - cy;
      const dist = Math.sqrt(px * px + py * py);
      if (dist > hueR) return;
      const angle = Math.atan2(py, px);
      let deg = (angle * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      setH(deg);
      emit(hsvToHex(deg, s, v));
    },
    [cx, cy, hueR, s, v, emit]
  );

  const handleSVClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = svRef.current;
      if (!canvas) return;
      const point = toLogicalPoint(canvas, e);
      if (!point) return;
      const ns = Math.max(0, Math.min(1, point.x / PICKER_SIZE));
      const nv = Math.max(0, Math.min(1, 1 - point.y / PICKER_SIZE));
      setS(ns);
      setV(nv);
      emit(hsvToHex(h, ns, nv));
    },
    [h, emit]
  );

  const currentHex = useMemo(() => hsvToHex(h, s, v), [h, s, v]);
  const isFavorite = colorFavorites.includes(currentHex);
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const supportsEyedropper = typeof window !== 'undefined' && !!window.EyeDropper;

  const [hexInput, setHexInput] = React.useState(currentHex);
  const hexInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (document.activeElement !== hexInputRef.current) setHexInput(currentHex);
  }, [currentHex]);

  const normalizeHex = (raw: string): string | null => {
    const t = raw.trim().replace(/^#/, '');
    if (/^[0-9A-Fa-f]{6}$/.test(t)) return '#' + t.toLowerCase();
    if (/^[0-9A-Fa-f]{3}$/.test(t)) {
      const r = t[0] + t[0], g = t[1] + t[1], b = t[2] + t[2];
      return '#' + r + g + b;
    }
    return null;
  };

  const applyHexInput = React.useCallback(
    (raw: string) => {
      const hex = normalizeHex(raw);
      if (hex) {
        const { h: nh, s: ns, v: nv } = hexToHsv(hex);
        setH(nh);
        setS(ns);
        setV(nv);
        setHexInput(hex);
        onChange(hex);
      }
    },
    [onChange]
  );

  const handleEyedropper = useCallback(async () => {
    if (!supportsEyedropper || eyedropperActive) return;
    setEyedropperActive(true);
    try {
      const dropper = new window.EyeDropper!();
      const { sRGBHex } = await dropper.open();
      const hex = sRGBHex.toLowerCase();
      applyHexInput(hex);
      addColorToRecentlyUsed(hex);
    } catch {
      // User cancelled or API failed
    } finally {
      setEyedropperActive(false);
    }
  }, [supportsEyedropper, eyedropperActive, applyHexInput, addColorToRecentlyUsed]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-start gap-3">
        <canvas
          ref={hueRingRef}
          width={PICKER_SIZE}
          height={PICKER_SIZE}
          className="shrink-0 cursor-crosshair rounded-full border"
          style={{ borderColor: ACCENT_GOLD_SOLID, width: PICKER_SIZE, height: PICKER_SIZE }}
          onClick={handleHueClick}
          aria-label="Hue ring"
        />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <canvas
            ref={svRef}
            width={PICKER_SIZE}
            height={PICKER_SIZE}
            className="cursor-crosshair rounded border shrink-0"
            style={{ width: PICKER_SIZE, height: PICKER_SIZE, borderColor: ACCENT_GOLD_SOLID }}
            onClick={handleSVClick}
            aria-label="Saturation and value"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="w-8 h-8 rounded border shrink-0"
              style={{ backgroundColor: currentHex, borderColor: ACCENT_GOLD_SOLID }}
              aria-hidden
            />
            <input
              ref={hexInputRef}
              type="text"
              value={hexInput}
              onChange={(e) => {
                const val = e.target.value;
                setHexInput(val.startsWith('#') ? val : '#' + val);
              }}
              onBlur={(e) => {
                const raw = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
                const hex = normalizeHex(raw);
                if (hex) applyHexInput(raw);
                else setHexInput(currentHex);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const hex = normalizeHex(hexInput);
                  if (hex) applyHexInput(hexInput);
                  else setHexInput(currentHex);
                  hexInputRef.current?.blur();
                }
              }}
              placeholder="#000000"
              className="w-24 text-xs font-mono px-1.5 py-0.5 rounded border bg-black/20"
              style={{ color: TEXT_ON_BLUE, borderColor: ACCENT_GOLD_SOLID }}
              aria-label="Hex color"
            />
            {onApply && (
              <button
                type="button"
                onClick={() => { onApply(currentHex); addColorToRecentlyUsed(currentHex); }}
                className="text-xs px-2 py-1 rounded border font-medium"
                style={{ borderColor: ACCENT_GOLD_SOLID, color: TEXT_ON_BLUE }}
              >
                Apply
              </button>
            )}
            {supportsEyedropper && (
              <button
                type="button"
                onClick={handleEyedropper}
                disabled={eyedropperActive}
                className="p-1.5 rounded border inline-flex items-center justify-center"
                style={{ borderColor: ACCENT_GOLD_SOLID, color: TEXT_ON_BLUE }}
                title="Pick color from screen"
                aria-label="Pick color from screen"
              >
                <Pipette size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => (isFavorite ? removeColorFromFavorites(currentHex) : addColorToFavorites(currentHex))}
              className="text-xs px-2 py-1 rounded border font-medium"
              style={{ borderColor: ACCENT_GOLD_SOLID, color: TEXT_ON_BLUE }}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              {isFavorite ? '★ Remove' : '☆ Favorites'}
            </button>
          </div>
        </div>
      </div>
      {showSwatches && (
        <>
          {colorFavorites.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-80 mb-1" style={{ color: TEXT_ON_BLUE }}>Favorites</p>
              <div className="flex flex-wrap gap-1">
                {colorFavorites.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onChange(hex)}
                    className="w-6 h-6 rounded border-2 border-white/30 hover:scale-110 transition-transform"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          )}
          {colorRecentlyUsed.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-80 mb-1" style={{ color: TEXT_ON_BLUE }}>Recently Used</p>
              <div className="flex flex-wrap gap-1">
                {colorRecentlyUsed.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onChange(hex)}
                    className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
