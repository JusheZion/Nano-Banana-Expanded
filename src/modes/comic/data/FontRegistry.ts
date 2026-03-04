export type FontOption = {
  label: string;
  value: string; // CSS font-family value (may be a stack)
};

// Keep this list small + high-signal. Add more fonts as you actually load them in `index.html`.
export const FONT_REGISTRY: FontOption[] = [
  { label: 'Bangers', value: 'Bangers' },
  { label: 'Chalkboard SE', value: '"Chalkboard SE"' },
  { label: 'Cinzel', value: 'Cinzel' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS"' },
  { label: 'Courier New', value: '"Courier New"' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Impact', value: 'Impact' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Orbitron', value: 'Orbitron' },
  { label: 'Playfair Display', value: '"Playfair Display"' },
  { label: 'Rajdhani', value: 'Rajdhani' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Share Tech Mono', value: '"Share Tech Mono"' },
  { label: 'Times New Roman', value: '"Times New Roman"' },
];

export function isKnownFontFamily(fontFamily: string | undefined | null): boolean {
  if (!fontFamily) return false;
  return FONT_REGISTRY.some((f) => f.value === fontFamily);
}

