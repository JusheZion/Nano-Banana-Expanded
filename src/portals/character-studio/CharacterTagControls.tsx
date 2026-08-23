import { memo, useState, type CSSProperties } from 'react';
import { ACCENT_GOLD_GRADIENT } from '@/shared/theme/Phase12DesignTokens';

const goldTextStyle: CSSProperties = {
  background: ACCENT_GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export const Chip = memo(function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button type="button" onClick={onClick} className={`group px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 border ${active ? 'text-black hover:text-emerald-400 border-amber-600/80 shadow-[0_0_10px_rgba(191,149,63,0.4)]' : 'bg-white/5 border border-white/20 hover:border-amber-500/50'}`} style={active ? { background: ACCENT_GOLD_GRADIENT } : undefined}>
      {active ? label : <span className="inline-block" style={goldTextStyle}>{label}</span>}
    </button>
  );
});

interface ChipWithOptionalRemoveProps extends ChipProps {
  isCustom: boolean;
  onRemove?: () => void;
}

export const ChipWithOptionalRemove = memo(function ChipWithOptionalRemove({ label, active, onClick, isCustom, onRemove }: ChipWithOptionalRemoveProps) {
  return (
    <span className={isCustom ? 'inline-flex items-center gap-0.5' : undefined}>
      <Chip label={label} active={active} onClick={onClick} />
      {isCustom && onRemove ? (
        <button type="button" onClick={(event) => { event.stopPropagation(); onRemove(); }} className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/20 text-xs leading-none" aria-label="Remove custom tag">×</button>
      ) : null}
    </span>
  );
});

interface MultiChipProps {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  libraryOptions?: readonly string[];
  onRemoveLibrary?: (value: string) => void;
}

export const MultiChip = memo(function MultiChip({ options, selected, onToggle, libraryOptions, onRemoveLibrary }: MultiChipProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isCustom = Boolean(libraryOptions?.includes(option));
        return <ChipWithOptionalRemove key={option} label={option} active={selected.includes(option)} onClick={() => onToggle(option)} isCustom={isCustom} onRemove={isCustom ? () => onRemoveLibrary?.(option) : undefined} />;
      })}
    </div>
  );
});

interface SectionAddToLibraryProps {
  categories: Array<{ id: string; label: string }>;
  onSave: (categoryId: string, value: string) => void;
}

export function SectionAddToLibrary({ categories, onSave }: SectionAddToLibraryProps) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [input, setInput] = useState('');
  const handleSave = () => {
    if (!input.trim() || !categoryId) return;
    onSave(categoryId, input.trim());
    setInput('');
  };

  return (
    <div className="flex gap-2 mt-2 flex-wrap items-center">
      <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="bg-black/40 text-white border border-white/20 rounded px-2 py-1.5 text-xs min-w-0 flex-1 basis-24">
        {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
      </select>
      <input type="text" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleSave(); } }} placeholder="Add custom..." className="flex-1 min-w-0 bg-black/40 text-white placeholder-white/40 px-2 py-1.5 rounded text-xs border border-white/10" />
      <button type="button" onClick={handleSave} className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50" style={{ background: ACCENT_GOLD_GRADIENT }}>Save as Tag</button>
    </div>
  );
}
