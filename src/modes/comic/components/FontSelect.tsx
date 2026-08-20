import React from 'react';
import { FONT_REGISTRY, isKnownFontFamily } from '../data/FontRegistry';

interface FontSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  allowCustom?: boolean;
  /** When true, select and custom input are on one row (for ribbon/toolbar). */
  compact?: boolean;
  selectClassName?: string;
  inputClassName?: string;
}

/**
 * Shared font picker for the Comic Studio.
 * - Uses FONT_REGISTRY for known fonts; type to narrow or pick from list.
 * - When allowCustom is true, exposes "Custom…" and a freeform input (inline when compact).
 */
export const FontSelect: React.FC<FontSelectProps> = ({
  value,
  onChange,
  allowCustom = true,
  compact = false,
  selectClassName,
  inputClassName
}) => {
  const current = value || 'Bangers';
  const known = isKnownFontFamily(current);

  /**
   * Sticky "Custom…" mode.
   *
   * Choosing Custom… used to `return` without changing anything, so React re-rendered the select
   * back to the known font and the freeform input — which only appeared when the current font was
   * NOT known — never showed. There was no way to reach a custom font from a known one at all.
   * Latching the choice here shows the input so the user can type, and clears the moment they pick
   * a real font from the list.
   */
  const [customMode, setCustomMode] = React.useState(false);
  const showCustomInput = allowCustom && (!known || customMode);
  const selectValue = showCustomInput ? '__custom' : current;

  return (
    <div className={compact ? 'flex items-center gap-1.5 min-w-0' : 'flex flex-col gap-1'}>
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (allowCustom && next === '__custom') {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(next);
        }}
        className={
          selectClassName ||
          'w-full rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-gold-500/60'
        }
        style={{ fontFamily: current }}
      >
        {FONT_REGISTRY.map((font) => (
          <option
            key={font.value}
            value={font.value}
            className="bg-zinc-900 text-white"
            style={{ fontFamily: font.value }}
          >
            {font.label}
          </option>
        ))}
        {allowCustom && (
          <option value="__custom" className="bg-zinc-900 text-white">
            Custom…
          </option>
        )}
      </select>

      {showCustomInput && (
        <input
          type="text"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className={
            inputClassName ||
            'rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-gold-500/60 min-w-0'
          }
          placeholder='e.g. "Cinzel", serif'
          aria-label="Custom font family"
        />
      )}
    </div>
  );
};

