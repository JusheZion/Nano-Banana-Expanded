/**
 * Gradient → Konva prop translation for codex nodes.
 *
 * `CodexFrameObject.fillGradient`, `strokeGradient`, `CodexTextObject.gradient`
 * and `CodexPlate.backgroundGradient` all carry a `GradientSpec`, but Konva
 * takes gradients as a spread of flat props rather than an object, and the prop
 * names differ per channel. This is the single place that mapping lives.
 *
 * Geometry conventions match `modes/comic` (BalloonNode) deliberately, so a
 * gradient authored in one mode reads the same in the other:
 *   - linear: `angle` in degrees, 0 = right, 90 = down; `start`/`end` in px win
 *     over `angle` when both are present.
 *   - radial: `center` and `radiusX` are fractions of the box, not px.
 *   - rect: Konva has no rect gradient, so it degrades to a corner-to-corner
 *     linear one.
 */
import type { GradientSpec } from '@/modes/comic/types/gradient';
import { linearGradientPoints, toKonvaColorStops } from '@/modes/comic/utils/gradientUtils';

export type GradientChannel = 'fill' | 'stroke';

/** Konva gradient props; keys vary by channel and gradient type. */
export type KonvaGradientProps = Record<string, unknown>;

function hasStops(spec: GradientSpec | undefined): spec is GradientSpec {
  return !!spec && Array.isArray(spec.stops) && spec.stops.length > 0;
}

/**
 * Returns the Konva props for one gradient, or `null` when there is nothing to
 * draw. Callers spread the result and fall back to their flat colour on `null`,
 * so an empty or absent gradient never blanks a shape.
 */
export function gradientProps(
  spec: GradientSpec | undefined,
  width: number,
  height: number,
  channel: GradientChannel = 'fill',
): KonvaGradientProps | null {
  if (!hasStops(spec)) return null;

  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const stops = toKonvaColorStops(spec.stops);
  const p = channel; // 'fill' | 'stroke' — Konva prop prefix

  if (spec.type === 'radial') {
    const cx = (spec.center?.x ?? 0.5) * w;
    const cy = (spec.center?.y ?? 0.5) * h;
    const r = Math.max(1, (spec.radiusX ?? 0.5) * Math.max(w, h));
    return {
      [`${p}RadialGradientStartPoint`]: { x: cx, y: cy },
      [`${p}RadialGradientEndPoint`]: { x: cx, y: cy },
      [`${p}RadialGradientStartRadius`]: 0,
      [`${p}RadialGradientEndRadius`]: r,
      [`${p}RadialGradientColorStops`]: stops,
    };
  }

  if (spec.type === 'linear' && spec.start && spec.end) {
    return {
      [`${p}LinearGradientStartPoint`]: spec.start,
      [`${p}LinearGradientEndPoint`]: spec.end,
      [`${p}LinearGradientColorStops`]: stops,
    };
  }

  if (spec.type === 'linear') {
    const { start, end } = linearGradientPoints(spec.angle ?? 90, w, h);
    return {
      [`${p}LinearGradientStartPoint`]: start,
      [`${p}LinearGradientEndPoint`]: end,
      [`${p}LinearGradientColorStops`]: stops,
    };
  }

  // 'rect' — no Konva equivalent; degrade to corner-to-corner linear.
  return {
    [`${p}LinearGradientStartPoint`]: spec.start ?? { x: 0, y: 0 },
    [`${p}LinearGradientEndPoint`]: spec.end ?? { x: w, y: h },
    [`${p}LinearGradientColorStops`]: stops,
  };
}

/** Convenience for the common case: gradient if present, flat colour otherwise. */
export function fillProps(
  spec: GradientSpec | undefined,
  flat: string | undefined,
  width: number,
  height: number,
): KonvaGradientProps {
  return gradientProps(spec, width, height, 'fill') ?? { fill: flat };
}
