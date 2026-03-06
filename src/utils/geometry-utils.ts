/**
 * Calculates the slope of a line between two points.
 * Returns null for vertical lines to avoid division by zero.
 */
export const calculateSlope = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    if (Math.abs(p2.x - p1.x) < 0.001) return null; // Vertical line
    return (p2.y - p1.y) / (p2.x - p1.x);
  };
  
  /**
   * Checks if two slopes are nearly parallel within a degree tolerance.
   */
  export const isParallel = (m1: number | null, m2: number | null, tolerance = 0.05) => {
    if (m1 === null && m2 === null) return true; // Both vertical
    if (m1 === null || m2 === null) return false; // One vertical, one not
    return Math.abs(m1 - m2) < tolerance;
  };
  
  /**
   * Calculates 'Virtual Snap Points' by offsetting adjacent panel edges 
   * by the global gutter width.
   */
  export const getGutterSnapPoints = (adjacentPanels: any[], gutter: number) => {
    const points: number[] = [];
    adjacentPanels.forEach(panel => {
      // For every side of an adjacent panel, create a snap point one gutter-width away
      panel.vertices.forEach((v: any) => {
        points.push(v.x + gutter, v.x - gutter);
        points.push(v.y + gutter, v.y - gutter);
      });
    });
    return points;
  };