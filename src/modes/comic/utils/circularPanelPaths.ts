/**
 * SVG path builders for circular panel primitives.
 * Spec: (0,0) is center; r = radius. Angles in degrees; 0° = positive x, counterclockwise (math convention).
 * Konva uses y-down, so we use path strings that produce the correct visual (arcs upward = top half).
 */

/** Half-circle: arches upward. Path relative to center (0,0). r = radius. */
export function getHalfCirclePath(r: number): string {
  return `M -${r} 0 A ${r} ${r} 0 0 0 ${r} 0 Z`;
}

/** Quarter-circle: bottom-right quadrant. Path from (0,0) to (r,0) to (0,r). */
export function getQuarterCirclePath(r: number): string {
  return `M 0 0 L ${r} 0 A ${r} ${r} 0 0 1 0 ${r} Z`;
}

/**
 * Dynamic sector: central angle α in degrees (1–360).
 * Path: M 0 0 L r 0 A r r 0 [largeArc] 1 [endX] [endY] Z
 * End: endX = r*cos(α°), endY = -r*sin(α°) for math convention (y-up); Konva y-down so we use endY = r*sin(α°) for 0°=right, 90°=down.
 */
export function getSectorPath(r: number, angleDeg: number): string {
  const α = Math.max(1, Math.min(360, angleDeg));
  const rad = (α * Math.PI) / 180;
  const endX = r * Math.cos(rad);
  const endY = r * Math.sin(rad); // Konva y-down: 90° = down
  const largeArc = α > 180 ? 1 : 0;
  return `M 0 0 L ${r} 0 A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`;
}
