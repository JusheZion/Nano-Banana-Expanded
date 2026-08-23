import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

export interface WriterMenuOption {
  id: string;
  label: string;
  meta?: string;
  searchText?: string;
}

interface WriterSearchableMenuProps {
  label: string;
  value: string | null;
  onChange: (next: string | null) => void;
  options: WriterMenuOption[];
  disabled?: boolean;
  placeholder: string;
  ariaLabel: string;
}

export const WriterSearchableMenu = memo(function WriterSearchableMenu({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  ariaLabel,
}: WriterSearchableMenuProps) {
  const selected = options.find((option) => option.id === value) ?? null;
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  useEffect(() => {
    setQuery(selected?.label ?? '');
  }, [selected?.label]);

  useEffect(
    () => () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    [],
  );

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || selected?.label === query) return options.slice(0, 12);
    return options
      .filter((option) => `${option.label} ${option.meta ?? ''} ${option.searchText ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [options, query, selected?.label]);

  const pick = useCallback(
    (option: WriterMenuOption | null) => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      onChange(option?.id ?? null);
      setQuery(option?.label ?? '');
      setOpen(false);
      setActiveIndex(-1);
    },
    [onChange],
  );

  return (
    <label className="relative flex min-w-0 flex-col gap-1 text-[10px] font-black uppercase tracking-wide text-black/65">
      {label}
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open && !disabled}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIndex >= 0 && activeIndex < filteredOptions.length
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        disabled={disabled}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (!event.target.value.trim()) onChange(null);
        }}
        onFocus={() => {
          if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => {
            setOpen(false);
            setActiveIndex(-1);
            setQuery(selected?.label ?? '');
          }, 160);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
            setQuery(selected?.label ?? '');
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) =>
              filteredOptions.length === 0 ? -1 : (index + 1) % filteredOptions.length,
            );
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) =>
              filteredOptions.length === 0 ? -1 : index <= 0 ? filteredOptions.length - 1 : index - 1,
            );
            return;
          }
          if (event.key === 'Enter' && open && activeIndex >= 0 && activeIndex < filteredOptions.length) {
            event.preventDefault();
            pick(filteredOptions[activeIndex]!);
          }
        }}
        placeholder={placeholder}
        className="min-w-0 rounded-md border border-black/15 bg-white px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-black placeholder:text-black/35 disabled:opacity-45"
      />
      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-[90] mt-1 max-h-48 overflow-y-auto rounded-lg border border-black/15 bg-white py-1 text-left shadow-xl">
          {value ? (
            <button
              type="button"
              className="flex min-h-11 w-full px-2.5 py-2 text-left text-[11px] font-bold normal-case tracking-normal text-black/65 hover:bg-black/5 sm:min-h-9"
              onMouseDown={(event) => {
                event.preventDefault();
                pick(null);
              }}
            >
              Clear selection
            </button>
          ) : null}
          <div id={listboxId} role="listbox" aria-label={`${label} options`}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.id}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-label={option.meta ? `${option.label}: ${option.meta}` : option.label}
                  aria-selected={option.id === value}
                  className={`flex min-h-11 w-full flex-col justify-center px-2.5 py-1.5 text-left normal-case tracking-normal hover:bg-amber-50 sm:min-h-9 ${
                    index === activeIndex ? 'bg-amber-100' : ''
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(option);
                  }}
                >
                  <span className="truncate text-xs font-black text-black">{option.label}</span>
                  {option.meta ? (
                    <span className="truncate text-[10px] font-semibold text-black/60">{option.meta}</span>
                  ) : null}
                </button>
              ))
            ) : (
              <p role="status" className="px-2.5 py-2 text-[11px] font-semibold normal-case tracking-normal text-black/65">
                No matches.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </label>
  );
});
