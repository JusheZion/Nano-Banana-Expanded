export type FontOption = {
  label: string;
  value: string; // CSS font-family value (may be a stack)
};

// Keep this list small + high-signal. Add more fonts as you actually load them in `index.html`.
export const FONT_REGISTRY: FontOption[] = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Bangers', value: 'Bangers' },
  { label: 'Orbitron', value: 'Orbitron' },
  { label: 'Roboto', value: 'Roboto' },

  // Common system fonts used across presets/styles
  { label: 'Comic Sans MS', value: '"Comic Sans MS"' },
  { label: 'Chalkboard SE', value: '"Chalkboard SE"' },
  { label: 'Impact', value: 'Impact' },
  { label: 'Courier New', value: '"Courier New"' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: '"Times New Roman"' },

  // Genre preset fonts (loaded via Google Fonts in many setups)
  { label: 'Cinzel', value: 'Cinzel' },
  { label: 'Playfair Display', value: '"Playfair Display"' },
  { label: 'Rajdhani', value: 'Rajdhani' },
  { label: 'Share Tech Mono', value: '"Share Tech Mono"' },
];

export function isKnownFontFamily(fontFamily: string | undefined | null): boolean {
  if (!fontFamily) return false;
  return FONT_REGISTRY.some((f) => f.value === fontFamily);
}

