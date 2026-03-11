import React, { useMemo, useCallback } from 'react';
import type { GradientSpec, GradientStop } from '../../../types/gradient';
import { DEFAULT_GRADIENT_SPEC } from '../../../types/gradient';
import { sortStops, applyBrightnessAndAlpha } from '../utils/gradientUtils';
import { PrecisionSlider } from './PrecisionSlider';
import { ACCENT_GOLD_SOLID, TEXT_ON_BLUE } from '../theme/Phase12DesignTokens';

const MAX_STOPS = 8;

function normalizeHex(raw: string): string | null {
  const t = raw.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return '#' + t.toLowerCase();
  if (/^[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[0] + t[0], g = t[1] + t[1], b = t[2] + t[2];
    return '#' + r + g + b;
  }
  return null;
}

const StopHexInput: React.FC<{ value: string; onChange: (hex: string) => void; className?: string; style?: React.CSSProperties }> = ({ value, onChange, className, style }) => {
  const [local, setLocal] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) setLocal(value);
  }, [value]);
  const commit = React.useCallback(() => {
    const hex = normalizeHex(local);
    if (hex) onChange(hex);
    else setLocal(value);
  }, [local, value, onChange]);
  return (
    <input
      ref={inputRef}
      type="text"
      value={local}
      onChange={(e) => {
        const val = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
        setLocal(val);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
      placeholder="#000000"
      className={className}
      style={style}
      aria-label="Hex"
    />
  );
};

export interface GradientBuilderProps {
  value: GradientSpec;
  onChange: (spec: GradientSpec) => void;
  className?: string;
}

function stopToCssColor(stop: GradientStop): string {
  return applyBrightnessAndAlpha(stop.color, stop.brightness ?? 100, stop.alpha ?? 1);
}

function toCssGradient(spec: GradientSpec, width: number, height: number): string {
  const sorted = sortStops(spec.stops);
  const stopsStr = sorted.map(s => `${stopToCssColor(s)} ${s.offset * 100}%`).join(', ');
  if (spec.type === 'linear') {
    const angle = (spec.angle ?? 90) - 90;
    return `linear-gradient(${angle}deg, ${stopsStr})`;
  }
  if (spec.type === 'radial') {
    const cx = ((spec.center?.x ?? 0.5) * 100).toFixed(0);
    const cy = ((spec.center?.y ?? 0.5) * 100).toFixed(0);
    const r = (spec.radiusX ?? 0.5) * Math.max(width, height);
    return `radial-gradient(circle ${r}px at ${cx}% ${cy}%, ${stopsStr})`;
  }
  return `linear-gradient(${(spec.angle ?? 90) - 90}deg, ${stopsStr})`;
}

export const GradientBuilder: React.FC<GradientBuilderProps> = ({ value, onChange, className = '' }) => {
  const spec = useMemo(() => ({ ...DEFAULT_GRADIENT_SPEC, ...value }), [value]);
  const [editingStopIndex, setEditingStopIndex] = React.useState<number | null>(null);

  const addStop = useCallback(
    (atOffset: number) => {
      if (spec.stops.length >= MAX_STOPS) return;
      const sorted = sortStops(spec.stops);
      const prev = sorted.filter(s => s.offset <= atOffset).pop();
      const next = sorted.find(s => s.offset > atOffset);
      const color = prev ? prev.color : next?.color ?? '#888888';
      const newStop: GradientStop = { offset: atOffset, color, brightness: 100, alpha: 1 };
      const nextStops = sortStops([...spec.stops, newStop]);
      onChange({ ...spec, stops: nextStops });
    },
    [spec, onChange]
  );

  const removeStop = useCallback(
    (index: number) => {
      if (spec.stops.length <= 2) return;
      const next = spec.stops.filter((_, i) => i !== index);
      onChange({ ...spec, stops: next });
      if (editingStopIndex === index) setEditingStopIndex(null);
      else if (editingStopIndex != null && editingStopIndex > index) setEditingStopIndex(editingStopIndex - 1);
    },
    [spec, onChange, editingStopIndex]
  );

  const updateStop = useCallback(
    (index: number, patch: Partial<GradientStop>) => {
      const next = spec.stops.map((s, i) => (i === index ? { ...s, ...patch } : s));
      onChange({ ...spec, stops: sortStops(next) });
    },
    [spec, onChange]
  );

  const previewCss = useMemo(() => toCssGradient(spec, 120, 60), [spec]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_ON_BLUE }}>Type</span>
        {(['linear', 'radial', 'rect'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ ...spec, type: t })}
            className="px-2 py-1 text-xs rounded border font-medium capitalize"
            style={{
              borderColor: ACCENT_GOLD_SOLID,
              color: spec.type === t ? ACCENT_GOLD_SOLID : TEXT_ON_BLUE,
              background: spec.type === t ? 'rgba(179,135,40,0.2)' : 'transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {spec.type === 'linear' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider w-16" style={{ color: TEXT_ON_BLUE }}>Angle</span>
          <PrecisionSlider
            min={0}
            max={360}
            step={5}
            value={spec.angle ?? 90}
            onChange={(v) => onChange({ ...spec, angle: v })}
            width={120}
            showPrecisionButtons={true}
            showTicks={false}
          />
          <input
            type="number"
            min={0}
            max={360}
            value={spec.angle ?? 90}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) onChange({ ...spec, angle: Math.max(0, Math.min(360, n)) });
            }}
            className="w-14 text-xs font-mono px-1.5 py-0.5 rounded border bg-black/20 text-right"
            style={{ color: TEXT_ON_BLUE, borderColor: ACCENT_GOLD_SOLID }}
            aria-label="Angle (degrees)"
          />
          <span className="text-xs opacity-80" style={{ color: TEXT_ON_BLUE }}>°</span>
        </div>
      )}

      {/* Preview */}
      <div
        className="w-full h-10 rounded border"
        style={{ background: previewCss, borderColor: ACCENT_GOLD_SOLID }}
        aria-hidden
      />

      {/* Stop strip: click to add */}
      <div>
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: TEXT_ON_BLUE }}>Stops (click bar to add)</p>
        <div
          className="relative h-8 rounded border cursor-crosshair"
          style={{
            background: `linear-gradient(90deg, ${sortStops(spec.stops).map(s => `${stopToCssColor(s)} ${s.offset * 100}%`).join(', ')})`,
            borderColor: ACCENT_GOLD_SOLID,
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            addStop(x);
          }}
        >
          {sortStops(spec.stops).map((stop) => {
            const idx = spec.stops.findIndex(s => s === stop);
            if (idx < 0) return null;
            return (
              <div
                key={idx}
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow cursor-pointer"
                style={{
                  left: `${stop.offset * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: stopToCssColor(stop),
                }}
                onClick={(ev) => { ev.stopPropagation(); setEditingStopIndex(editingStopIndex === idx ? null : idx); }}
                title={`Stop ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* Per-stop controls */}
      {editingStopIndex != null && spec.stops[editingStopIndex] && (
        <div className="border rounded p-2 space-y-2" style={{ borderColor: ACCENT_GOLD_SOLID }}>
          <p className="text-[10px] uppercase" style={{ color: TEXT_ON_BLUE }}>Stop {editingStopIndex + 1}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="color"
              value={spec.stops[editingStopIndex].color}
              onChange={(e) => updateStop(editingStopIndex, { color: e.target.value })}
              className="w-8 h-8 rounded border cursor-pointer bg-transparent"
              style={{ borderColor: ACCENT_GOLD_SOLID }}
            />
            <StopHexInput
              value={spec.stops[editingStopIndex].color}
              onChange={(hex) => updateStop(editingStopIndex, { color: hex })}
              className="w-24 text-xs font-mono px-1 rounded border bg-black/20"
              style={{ color: TEXT_ON_BLUE, borderColor: ACCENT_GOLD_SOLID }}
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <PrecisionSlider
              min={0}
              max={100}
              step={1}
              value={(spec.stops[editingStopIndex].offset ?? 0) * 100}
              onChange={(v) => updateStop(editingStopIndex, { offset: v / 100 })}
              label="Position %"
              width="100%"
              showPrecisionButtons={true}
            />
            <PrecisionSlider
              min={0}
              max={100}
              step={5}
              value={spec.stops[editingStopIndex].brightness ?? 100}
              onChange={(v) => updateStop(editingStopIndex, { brightness: v })}
              label="Brightness"
              width="100%"
              showPrecisionButtons={true}
            />
            <PrecisionSlider
              min={0}
              max={1}
              step={0.05}
              value={spec.stops[editingStopIndex].alpha ?? 1}
              onChange={(v) => updateStop(editingStopIndex, { alpha: v })}
              label="Transparency"
              width="100%"
              showPrecisionButtons={true}
            />
          </div>
          <button
            type="button"
            onClick={() => removeStop(editingStopIndex)}
            disabled={spec.stops.length <= 2}
            className="text-xs px-2 py-1 rounded border border-red-400 text-red-300 disabled:opacity-50"
          >
            Remove stop
          </button>
        </div>
      )}
    </div>
  );
};
