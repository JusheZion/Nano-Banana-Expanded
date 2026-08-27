import type { SigilDef } from '../data/SigilRegistry';
import { buildSigilSvg, type SigilAppearance } from '../utils/sigilRaster';

interface SigilGlyphProps {
  sigil: SigilDef;
  /** Rendered box in px (square). */
  size?: number;
  /** Flat tint, used when no `appearance` is given. */
  color?: string;
  /**
   * Resolves `var(--sigil-bg)` for the two marks that punch background
   * knockouts. Defaults to transparent, which reads correctly on a plate.
   */
  background?: string;
  /** Full paint description — gradient and relief as well as tint. */
  appearance?: SigilAppearance;
  className?: string;
}

/**
 * DOM preview of a sigil, for the palette and any HTML-side surface.
 *
 * Goes through `buildSigilSvg`, the same builder the canvas rasterises, so a
 * mark in the palette is painted exactly as it will land on the plate. Keeping
 * one builder is why the palette picked up gradients and relief for free.
 */
export function SigilGlyph({
  sigil,
  size = 24,
  color = '#d8b45a',
  background = 'transparent',
  appearance,
  className,
}: SigilGlyphProps) {
  const app: SigilAppearance = appearance ?? { tint: color, background };
  const svg = buildSigilSvg(sigil, app, size);

  return (
    <span
      className={className}
      role="img"
      aria-label={sigil.name}
      style={{ display: 'inline-flex', width: size, height: size }}
      // Authored SVG from our own registry, not user input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
