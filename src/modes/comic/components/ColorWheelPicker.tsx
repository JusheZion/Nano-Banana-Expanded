import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { hexToHsv, hsvToHex } from '../utils/colorUtils';
import { ACCENT_GOLD_SOLID, TEXT_ON_BLUE } from '../theme/Phase12DesignTokens';

const PAD = 4;
const RING_WIDTH = 12;
const HUE_SIZE = 44;
const SV_SIZE = 120;

export interface ColorWheelPickerProps {
  value: string;
  onChange: (hex: string) => void;
  onApply?: (hex: string) => void;
  /** Show Favorites and Recently Used rows */
  showSwatches?: boolean;
  className?: string;
}

function drawHueRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ringW: number) {
  const inner = r - ringW;
  const step = 2;
  for (let i = 0; i < 360; i += step) {
    const a1 = ((i - 90) * Math.PI) / 180;
    const a2 = ((i + step - 90) * Math.PI) / 180;
    ctx.fillStyle = hsvToHex(i, 1, 1);
    ctx.beginPath();
    ctx.moveTo(cx + inner * Math.cos(a1), cy + inner * Math.sin(a1));
    ctx.arc(cx, cy, inner, a1, a2);
    ctx.arc(cx, cy, r, a2, a1, true);
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
  const { colorFavorites, colorRecentlyUsed, addColorToFavorites, removeColorFromFavorites, addColorToRecentlyUsed } = useComicStore();

  const hv = useMemo(() => hexToHsv(value), [value]);
  const [h, setH] = React.useState(hv.h);
  const [s, setS] = React.useState(hv.s);
  const [v, setV] = React.useState(hv.v);
  React.useEffect(() => {
    const next = hexToHsv(value);
    setH(next.h);
    setS(next.s);
    setV(next.v);
  }, [value]);

  const cx = HUE_SIZE / 2;
  const cy = HUE_SIZE / 2;
  const ringR = HUE_SIZE / 2 - 2;
  const innerR = ringR - RING_WIDTH;

  useEffect(() => {
    const canvas = hueRingRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = HUE_SIZE * dpr;
    canvas.height = HUE_SIZE * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, HUE_SIZE, HUE_SIZE);
    drawHueRing(ctx, cx, cy, ringR, RING_WIDTH);
  }, [cx, cy, ringR]);

  useEffect(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = SV_SIZE;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    drawSVSquare(ctx, h, 0, 0, size);
  }, [h]);

  const handleHueClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = hueRingRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX - cx;
      const py = (e.clientY - rect.top) * scaleY - cy;
      const dist = Math.sqrt(px * px + py * py);
      if (dist < innerR || dist > ringR) return;
      const angle = Math.atan2(py, px);
      let deg = (angle * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      setH(deg);
      onChange(hsvToHex(deg, s, v));
    },
    [cx, innerR, ringR, s, v, onChange]
  );

  const handleSVClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = svRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const px = (e.clientX - rect.left) * scale;
      const py = (e.clientY - rect.top) * scale;
      const ns = Math.max(0, Math.min(1, px / SV_SIZE));
      const nv = Math.max(0, Math.min(1, 1 - py / SV_SIZE));
      setS(ns);
      setV(nv);
      onChange(hsvToHex(h, ns, nv));
    },
    [h, onChange]
  );

  const currentHex = useMemo(() => hsvToHex(h, s, v), [h, s, v]);
  const isFavorite = colorFavorites.includes(currentHex);

  const [hexInput, setHexInput] = React.useState(currentHex);
  React.useEffect(() => {
    setHexInput(currentHex);
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

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-start gap-3">
        <canvas
          ref={hueRingRef}
          width={HUE_SIZE}
          height={HUE_SIZE}
          className="shrink-0 cursor-crosshair rounded-full border"
          style={{ borderColor: ACCENT_GOLD_SOLID, width: HUE_SIZE, height: HUE_SIZE }}
          onClick={handleHueClick}
          aria-label="Hue ring"
        />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <canvas
            ref={svRef}
            width={SV_SIZE}
            height={SV_SIZE}
            className="cursor-crosshair rounded border shrink-0"
            style={{ width: SV_SIZE, height: SV_SIZE, borderColor: ACCENT_GOLD_SOLID }}
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
              type="text"
              value={hexInput}
              onChange={(e) => {
                const val = e.target.value;
                setHexInput(val.startsWith('#') ? val : '#' + val);
                const hex = normalizeHex(val.startsWith('#') ? val : '#' + val);
                if (hex) {
                  const { h: nh, s: ns, v: nv } = hexToHsv(hex);
                  setH(nh);
                  setS(ns);
                  setV(nv);
                  onChange(hex);
                }
              }}
              onBlur={(e) => {
                const hex = normalizeHex(e.target.value);
                if (hex) {
                  setHexInput(hex);
                } else {
                  setHexInput(currentHex);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const hex = normalizeHex(hexInput);
                  if (hex) applyHexInput(hexInput);
                  else setHexInput(currentHex);
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
