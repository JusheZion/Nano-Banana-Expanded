export type FontOption = {
  label: string;
  value: string; // CSS font-family value (may be a stack)
};

// Values are CSS font stacks (canvas honors them): the local/system font first so Mac users keep
// the exact look, then a web-loaded fallback (loaded in index.html) so non-Mac viewers and exports
// don't silently drop to a generic. Keep this list small + high-signal.
export const FONT_REGISTRY: FontOption[] = [
  { label: 'Bangers', value: 'Bangers' },
  { label: 'Chalkboard SE', value: '"Chalkboard SE", "Patrick Hand", cursive' },
  { label: 'Cinzel', value: 'Cinzel' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Neue", cursive' },
  { label: 'Comic Neue', value: '"Comic Neue", cursive' },
  { label: 'Courier New', value: '"Courier New", "Courier Prime", monospace' },
  { label: 'Georgia', value: 'Georgia, "Playfair Display", serif' },
  { label: 'Impact', value: 'Impact, Anton, "Arial Narrow", sans-serif' },
  { label: 'Anton', value: 'Anton, Impact, sans-serif' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Orbitron', value: 'Orbitron' },
  { label: 'Patrick Hand', value: '"Patrick Hand", cursive' },
  { label: 'Playfair Display', value: '"Playfair Display"' },
  { label: 'Rajdhani', value: 'Rajdhani' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Share Tech Mono', value: '"Share Tech Mono"' },
  { label: 'Times New Roman', value: '"Times New Roman", Georgia, serif' },
];

export function isKnownFontFamily(fontFamily: string | undefined | null): boolean {
  if (!fontFamily) return false;
  return FONT_REGISTRY.some((f) => f.value === fontFamily);
}

