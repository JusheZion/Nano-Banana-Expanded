import React, { useState } from 'react';
import { Tooltip } from '@/shared/components/Tooltip';
import { ACCENT_GOLD_GRADIENT } from '@/shared/theme/Phase12DesignTokens';
import type { SetDressingCategory } from '@/data/asset_studio_spec';

export const goldTextStyle: React.CSSProperties = {
  background: ACCENT_GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

export const chipInactive =
  'bg-white/5 border border-white/20 hover:border-amber-500/50';

export function Chip({
  label,
  active,
  onClick,
  tooltip,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tooltip?: string;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={`group px-3.5 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-200 border ${active ? 'text-black hover:text-violet-300 border-amber-600/80 shadow-[0_0_10px_rgba(191,149,63,0.4)]' : chipInactive}`}
      style={active ? { background: ACCENT_GOLD_GRADIENT } : undefined}
    >
      {active ? (
        label
      ) : (
        <span className="inline-block" style={goldTextStyle}>
          {label}
        </span>
      )}
    </button>
  );
  if (!tooltip) return button;
  return (
    <Tooltip variant="asset" content={tooltip} side="top">
      {button}
    </Tooltip>
  );
}

export function ChipWithOptionalRemove({
  label,
  active,
  onClick,
  isCustom,
  onRemove,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  isCustom: boolean;
  onRemove?: () => void;
}) {
  return (
    <span className={isCustom ? 'inline-flex items-center gap-0.5' : undefined}>
      <Chip label={label} active={active} onClick={onClick} />
      {isCustom && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/20 text-xs leading-none"
          aria-label="Remove custom tag"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function MultiChip({
  options,
  selected,
  onToggle,
  libraryOptions,
  onRemoveLibrary,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  libraryOptions?: readonly string[];
  onRemoveLibrary?: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <ChipWithOptionalRemove
          key={opt}
          label={opt}
          active={selected.includes(opt)}
          onClick={() => onToggle(opt)}
          isCustom={!!libraryOptions?.includes(opt)}
          onRemove={libraryOptions?.includes(opt) ? () => onRemoveLibrary?.(opt) : undefined}
        />
      ))}
    </div>
  );
}

export function SectionAddToLibrary({
  categories,
  onSave,
}: {
  categories: { id: string; label: string }[];
  onSave: (categoryId: string, value: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [input, setInput] = useState('');
  const handleSave = () => {
    if (input.trim() && categoryId) {
      onSave(categoryId, input.trim());
      setInput('');
    }
  };
  return (
    <div className="flex gap-2 mt-2 flex-wrap items-center">
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="bg-black/40 text-white border border-white/20 rounded px-2 py-2 text-sm min-w-0 flex-1 basis-24"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Add custom..."
        className="flex-1 min-w-0 bg-black/40 text-white placeholder-white/40 px-2 py-2 rounded text-sm border border-white/10"
      />
      <button
        type="button"
        onClick={handleSave}
        className="px-3 py-2.5 rounded-lg text-black text-sm font-bold border border-amber-600/50"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        Save as Tag
      </button>
    </div>
  );
}

export function SetDressingRow({
  category,
  presets,
  selected,
  library,
  onToggle,
  onRemoveLibrary,
}: {
  category: SetDressingCategory;
  presets: readonly string[];
  selected: string[];
  library: string[];
  onToggle: (v: string) => void;
  onRemoveLibrary?: (value: string) => void;
}) {
  const allOptions = [...presets, ...library];
  const label = category.replace(/([A-Z])/g, ' $1').trim();
  return (
    <div>
      <h3 className="text-sm mb-2 inline-block font-semibold" style={goldTextStyle}>{label}</h3>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((opt) => (
          <ChipWithOptionalRemove
            key={opt}
            label={opt}
            active={selected.includes(opt)}
            onClick={() => onToggle(opt)}
            isCustom={library.includes(opt)}
            onRemove={library.includes(opt) ? () => onRemoveLibrary?.(opt) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
