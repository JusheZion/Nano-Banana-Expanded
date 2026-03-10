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

/**
 * Closed rect path (CCW) for halo skirts along straight edges.
 * x,y top-left, w,h positive.
 */
function rectPath(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Half-circle halo: getHalfCirclePath arc closes along y=0. Arc sweep 0 0 0 from (-r,0) to (r,0)
 * bulges through (0,-r) in y-down coords = toward top of panel — interior is y<=0 near center.
 * Chord at y=0 is the bottom of that disk; exterior along the flat is y>0.
 * If your panels show the flat on top instead, flip skirt to rectPath(-R,-band,2R,band).
 */
export function getHalfCircleHaloOuterPath(outerR: number, bandDepth: number): string {
  const arc = `M -${outerR} 0 A ${outerR} ${outerR} 0 0 0 ${outerR} 0 Z`;
  // Skirt on exterior side of chord only (below y=0 when arc bulges up)
  const skirt = rectPath(-outerR, 0, 2 * outerR, bandDepth);
  return `${arc} ${skirt}`;
}

export function getHalfCircleHaloInnerPath(innerR: number, bandDepth: number): string {
  const arc = `M -${innerR} 0 A ${innerR} ${innerR} 0 0 0 ${innerR} 0 Z`;
  const skirt = rectPath(-innerR, 0, 2 * innerR, bandDepth);
  return `${arc} ${skirt}`;
}

/** Half-circle with skirt on -y side (exterior above chord when arc bulges down). */
export function getHalfCircleHaloOuterPathFlip(outerR: number, bandDepth: number): string {
  const arc = `M -${outerR} 0 A ${outerR} ${outerR} 0 0 0 ${outerR} 0 Z`;
  const skirt = rectPath(-outerR, -bandDepth, 2 * outerR, bandDepth);
  return `${arc} ${skirt}`;
}

export function getHalfCircleHaloInnerPathFlip(innerR: number, bandDepth: number): string {
  const arc = `M -${innerR} 0 A ${innerR} ${innerR} 0 0 0 ${innerR} 0 Z`;
  const skirt = rectPath(-innerR, -bandDepth, 2 * innerR, bandDepth);
  return `${arc} ${skirt}`;
}

/**
 * Quarter-circle in first quadrant (Konva y-down): edges on x-axis [0,r] and y-axis [0,r].
 * Outward from those edges is -y and -x respectively.
 */
export function getQuarterCircleHaloOuterPath(outerR: number, bandDepth: number): string {
  const arc = `M 0 0 L ${outerR} 0 A ${outerR} ${outerR} 0 0 1 0 ${outerR} Z`;
  const skirtAlongX = rectPath(0, -bandDepth, outerR, bandDepth);
  const skirtAlongY = rectPath(-bandDepth, 0, bandDepth, outerR);
  return `${arc} ${skirtAlongX} ${skirtAlongY}`;
}

export function getQuarterCircleHaloInnerPath(innerR: number, bandDepth: number): string {
  const arc = `M 0 0 L ${innerR} 0 A ${innerR} ${innerR} 0 0 1 0 ${innerR} Z`;
  const skirtAlongX = rectPath(0, -bandDepth, innerR, bandDepth);
  const skirtAlongY = rectPath(-bandDepth, 0, bandDepth, innerR);
  return `${arc} ${skirtAlongX} ${skirtAlongY}`;
}

/**
 * Sector: skirts that extend into the wedge (+x,+y) were covering the panel. Use arc-only
 * paths like the original so the ring matches the arc at least; straight radials stay thin
 * unless we add stroke-only lines later.
 */
export function getSectorHaloOuterPath(outerR: number, angleDeg: number, _bandDepth: number): string {
  return getSectorPath(outerR, angleDeg);
}

export function getSectorHaloInnerPath(innerR: number, angleDeg: number, _bandDepth: number): string {
  return getSectorPath(innerR, angleDeg);
}
