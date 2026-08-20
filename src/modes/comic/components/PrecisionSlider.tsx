import React, { useCallback, useMemo } from 'react';
import { ACCENT_GOLD_SOLID, SLIDER_TRACK_GRADIENT, SLIDER_TICK_COLOR } from '../theme/Phase12DesignTokens';

export interface PrecisionSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  valueLabel?: string;
  showTicks?: boolean;
  tickCount?: number;
  snapToTick?: boolean;
  className?: string;
  /** Slider track length (default extended for Phase 15). */
  width?: number | string;
  /** Hide +/- buttons when space is tight. */
  showPrecisionButtons?: boolean;
  /** Optional aria label. */
  'aria-label'?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number, min: number, max: number): number {
  // A non-finite input (an unparseable field, or step 0) would otherwise sail through clamp() as
  // NaN and land in the store, where it becomes a NaN width/opacity that Konva silently refuses to
  // draw and JSON serialises as null.
  if (!Number.isFinite(value)) return clamp(min, min, max);
  if (!Number.isFinite(step) || step <= 0) return clamp(value, min, max);
  const n = Math.round((value - min) / step) * step + min;
  return clamp(n, min, max);
}

export const PrecisionSlider: React.FC<PrecisionSliderProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  label,
  valueLabel,
  showTicks = true,
  tickCount: tickCountProp,
  snapToTick = true,
  className = '',
  width = 140,
  showPrecisionButtons = true,
  'aria-label': ariaLabel,
}) => {
  const tickCount = tickCountProp ?? Math.max(2, Math.round((max - min) / step) + 1);
  const displayValue = snapToTick ? roundToStep(value, step, min, max) : value;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      if (!Number.isFinite(v)) return;
      const next = snapToTick ? roundToStep(v, step, min, max) : clamp(v, min, max);
      onChange(next);
    },
    [min, max, step, snapToTick, onChange]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      if (!Number.isFinite(v)) return;
      if (snapToTick) {
        const next = roundToStep(v, step, min, max);
        if (next !== value) onChange(next);
      }
    },
    [value, min, max, step, snapToTick, onChange]
  );

  const decrement = useCallback(() => {
    const next = roundToStep(displayValue - step, step, min, max);
    if (next !== displayValue) onChange(next);
  }, [displayValue, step, min, max, onChange]);

  const increment = useCallback(() => {
    const next = roundToStep(displayValue + step, step, min, max);
    if (next !== displayValue) onChange(next);
  }, [displayValue, step, min, max, onChange]);

  const ticks = useMemo(() => {
    if (!showTicks || tickCount <= 0) return [];
    return Array.from({ length: tickCount }, (_, i) => (tickCount === 1 ? 0.5 : i / (tickCount - 1)));
  }, [showTicks, tickCount]);

  const styleWidth = typeof width === 'number' ? `${width}px` : width;

  return (
    <div className={`flex flex-col gap-0.5 ${className}`} style={{ minWidth: styleWidth }}>
      {(label != null || valueLabel != null) && (
        <div className="flex justify-between items-center text-[9px] uppercase tracking-wider opacity-80" style={{ color: 'var(--slider-label, #fcf6ba)' }}>
          {label != null && <span>{label}</span>}
          {valueLabel != null && <span>{valueLabel}</span>}
        </div>
      )}
      <div className="flex items-center gap-1">
        {showPrecisionButtons && (
          <button
            type="button"
            onClick={decrement}
            disabled={displayValue <= min}
            className="w-5 h-5 flex items-center justify-center rounded border text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-white/10"
            style={{ borderColor: ACCENT_GOLD_SOLID, color: ACCENT_GOLD_SOLID }}
            aria-label="Decrease"
          >
            −
          </button>
        )}
        <div className="relative flex-1 flex items-center h-6" style={{ width: styleWidth }}>
          {/* Track background (golden-blue gradient) */}
          <div
            className="absolute inset-0 h-2 rounded border pointer-events-none"
            style={{
              background: SLIDER_TRACK_GRADIENT,
              borderColor: ACCENT_GOLD_SOLID,
              borderWidth: 1,
            }}
          />
          {/* Tick marks */}
          {showTicks && ticks.length > 0 && (
            <div className="absolute inset-0 flex justify-between pointer-events-none px-0.5 items-center h-2" aria-hidden>
              {ticks.map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full flex-shrink-0"
                  style={{ height: 6, background: SLIDER_TICK_COLOR }}
                />
              ))}
            </div>
          )}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-label={ariaLabel ?? label}
            className="relative z-10 w-full h-2 rounded cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:bg-[#b38728]
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30
              [&::-webkit-slider-runnable-track]:bg-transparent
              [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/30 [&::-moz-range-thumb]:bg-[#b38728]"
          />
        </div>
        {showPrecisionButtons && (
          <button
            type="button"
            onClick={increment}
            disabled={displayValue >= max}
            className="w-5 h-5 flex items-center justify-center rounded border text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-white/10"
            style={{ borderColor: ACCENT_GOLD_SOLID, color: ACCENT_GOLD_SOLID }}
            aria-label="Increase"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
};
