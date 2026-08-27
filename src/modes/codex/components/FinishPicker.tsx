import { SIGIL_FINISHES } from '../data/sigilFinishes';

interface FinishPickerProps {
  value: string;
  onChange: (id: string) => void;
  /** Shown under the swatches; omit for the compact form. */
  label?: string;
  /** Optional action, e.g. applying the finish to the current selection. */
  action?: { label: string; onClick: () => void; disabled?: boolean };
}

/**
 * Picks how marks are painted. Used twice: in the Insert tab, where it sets the
 * finish new marks are placed with, and in Properties, where it repaints the
 * selection.
 */
export function FinishPicker({ value, onChange, label, action }: FinishPickerProps) {
  const active = SIGIL_FINISHES.find((f) => f.id === value);

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {SIGIL_FINISHES.map((finish) => (
          <button
            key={finish.id}
            type="button"
            onClick={() => onChange(finish.id)}
            title={`${finish.name} — ${finish.description}`}
            aria-label={`Finish: ${finish.name}`}
            aria-pressed={value === finish.id}
            className={[
              'h-7 w-7 rounded-full border transition-transform focus:outline-none focus:ring-1 focus:ring-white/60',
              value === finish.id
                ? 'border-white/80 scale-110'
                : 'border-white/20 hover:border-white/50',
            ].join(' ')}
            style={{ background: finish.swatch }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-white/45">{active?.name ?? 'Custom'}</span>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className="rounded border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-white/70 transition-colors hover:border-white/40 hover:text-white disabled:opacity-35 focus:outline-none focus:ring-1 focus:ring-white/50"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
