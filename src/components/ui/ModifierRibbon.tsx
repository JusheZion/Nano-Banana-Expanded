import React, { useRef } from 'react';
import {
  CHARACTER_STUDIO_CHIP_ACTIVE,
  ASSET_STUDIO_AMETHYST_TEXT,
} from '@/shared/theme/Phase12DesignTokens';

export type MaterialType = 'matte' | 'gloss' | 'glow';

export interface ModifierRibbonProps {
  categoryLabel: string;
  selectedColor: string;
  material: MaterialType;
  tagLabel?: string;
  onColorChange: (hex: string) => void;
  onMaterialChange: (m: MaterialType) => void;
  variant?: 'emerald' | 'amethyst';
}

const MATERIAL_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: 'matte', label: 'Matte' },
  { value: 'gloss', label: 'Gloss' },
  { value: 'glow', label: 'Glow' },
];

export const ModifierRibbon: React.FC<ModifierRibbonProps> = ({
  categoryLabel,
  selectedColor,
  material,
  tagLabel,
  onColorChange,
  onMaterialChange,
  variant = 'emerald',
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const activeStyle =
    variant === 'emerald'
      ? { background: CHARACTER_STUDIO_CHIP_ACTIVE }
      : { background: ASSET_STUDIO_AMETHYST_TEXT };

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1"
      role="group"
      aria-label={categoryLabel}
    >
      {/* Color swatch: click to open native color picker */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="h-7 w-7 shrink-0 rounded-md border border-white/20 shadow-inner"
          style={{ backgroundColor: selectedColor }}
          title={`Pick color for ${categoryLabel}`}
          aria-label={`Color for ${categoryLabel}`}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={selectedColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="sr-only"
          aria-hidden
        />
      </div>

      {/* Material toggles */}
      <div className="flex items-center gap-0.5 rounded-lg bg-black/20 p-0.5">
        {MATERIAL_OPTIONS.map(({ value, label }) => {
          const isActive = material === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onMaterialChange(value)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-black'
                  : 'text-white/60 hover:text-white/80'
              }`}
              style={isActive ? activeStyle : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Optional tag */}
      {tagLabel != null && tagLabel !== '' && (
        <span className="text-xs text-white/50">{tagLabel}</span>
      )}
    </div>
  );
};
