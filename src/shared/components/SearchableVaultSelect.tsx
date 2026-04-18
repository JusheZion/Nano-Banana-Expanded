import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

const MAX_VISIBLE_OPTIONS = 200;

export type SearchableVaultSelectProps = {
  label: string;
  labelClassName?: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
  loading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  inputClassName?: string;
  /** Extra hint under the control (loading / empty vault messages, etc.) */
  helperSlot?: React.ReactNode;
  id?: string;
  /** When Enter is pressed and the list did not consume it (no row picked). */
  onEnterPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  wrapClassName?: string;
};

/**
 * Combobox-style picker: type to filter existing vault names (profiles / collections),
 * click a row to commit. Uses mousedown on options so selection wins over input blur.
 */
export function SearchableVaultSelect({
  label,
  labelClassName = 'block text-sm font-medium text-white/80 mb-1',
  value,
  onChange,
  options,
  loading = false,
  placeholder,
  autoFocus,
  disabled = false,
  inputClassName = 'w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 text-sm placeholder-white/40',
  helperSlot,
  id: idProp,
  onEnterPress,
  wrapClassName = 'relative mb-3',
}: SearchableVaultSelectProps) {
  const reactId = useId();
  const baseId = idProp ?? `vault-search-${reactId.replace(/:/g, '')}`;
  const listboxId = `${baseId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) {
      return options.slice(0, MAX_VISIBLE_OPTIONS);
    }
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, value]);

  const clearBlurTimer = useCallback(() => {
    if (blurCloseTimer.current != null) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearBlurTimer();
    blurCloseTimer.current = setTimeout(() => {
      setOpen(false);
      setActiveIndex(-1);
    }, 180);
  }, [clearBlurTimer]);

  useEffect(() => () => clearBlurTimer(), [clearBlurTimer]);

  const pickOption = useCallback(
    (opt: string) => {
      clearBlurTimer();
      onChange(opt);
      setOpen(false);
      setActiveIndex(-1);
    },
    [clearBlurTimer, onChange]
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || loading) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => (filtered.length === 0 ? -1 : (i + 1) % filtered.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) =>
        filtered.length === 0 ? -1 : i <= 0 ? filtered.length - 1 : i - 1
      );
      return;
    }
    if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        pickOption(filtered[activeIndex]!);
        return;
      }
      onEnterPress?.(e);
    }
  };

  useEffect(() => {
    if (!open) return;
    setActiveIndex((i) => {
      if (filtered.length === 0) return -1;
      if (i < 0) return -1;
      return Math.min(i, filtered.length - 1);
    });
  }, [filtered, open]);

  const showList = open && !loading && options.length > 0;

  return (
    <div className={wrapClassName}>
      <label htmlFor={baseId} className={labelClassName}>
        {label}
      </label>
      <input
        id={baseId}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-busy={loading}
        disabled={disabled}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          clearBlurTimer();
          setOpen(true);
        }}
        onBlur={scheduleClose}
        onKeyDown={onInputKeyDown}
        className={inputClassName}
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/20 bg-zinc-950 py-1 shadow-xl"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-white/45">No matches — keep typing or pick from full list after clearing.</li>
          ) : (
            filtered.map((opt, idx) => (
              <li key={opt} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt}
                  className={`flex w-full px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10 ${
                    idx === activeIndex ? 'bg-amber-500/15' : ''
                  }`}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    pickOption(opt);
                  }}
                >
                  {opt}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {helperSlot != null ? <div className="mt-1">{helperSlot}</div> : null}
    </div>
  );
}
