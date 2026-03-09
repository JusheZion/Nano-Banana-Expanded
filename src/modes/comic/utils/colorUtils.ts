/**
 * Phase 15: Color conversion for color wheel (HSV <-> Hex).
 */

/** HSV: H 0-360, S 0-1, V 0-1 */
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s, v };
}

/** HSV to RGB (0-1), then to hex */
export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return '#' + [R, G, B].map(n => n.toString(16).padStart(2, '0')).join('');
}

export function normalizeHex(hex: string): string {
  const h = hex.replace(/^#/, '');
  if (h.length === 3) return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return h.length === 6 ? '#' + h : '#000000';
}
