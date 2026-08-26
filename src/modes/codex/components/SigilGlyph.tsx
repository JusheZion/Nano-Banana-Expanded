import type { SigilDef } from '../data/SigilRegistry';
import { sigilStrokeWidth } from '../utils/sigilRaster';

interface SigilGlyphProps {
  sigil: SigilDef;
  /** Rendered box in px (square). */
  size?: number;
  /** Resolves `currentColor` in the mark's markup. */
  color?: string;
  /**
   * Resolves `var(--sigil-bg)` for the two marks that punch background
   * knockouts. Defaults to transparent, which reads correctly on a plate.
   */
  background?: string;
  className?: string;
}

/**
 * DOM preview of a sigil — used by the palette and any HTML-side surface.
 * The canvas renders sigils through Konva instead; this is deliberately the
 * lightweight path, since `markup` is our own authored SVG, not user input.
 */
export function SigilGlyph({
  sigil,
  size = 24,
  color = 'currentColor',
  background = 'transparent',
  className,
}: SigilGlyphProps) {
  return (
    <svg
      viewBox={sigil.viewBox}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={sigil.name}
      // The marks are line art authored against a styled root; without these
      // the attribute-less paths fall back to SVG's initial fill: black.
      fill="none"
      stroke="currentColor"
      strokeWidth={sigilStrokeWidth(sigil.viewBox)}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={
        {
          color,
          '--sigil-bg': background,
        } as React.CSSProperties
      }
      dangerouslySetInnerHTML={{ __html: sigil.markup }}
    />
  );
}
