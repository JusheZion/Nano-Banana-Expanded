import { describe, expect, it } from 'vitest';
import type { GradientSpec } from '@/modes/comic/types/gradient';
import { fillProps, gradientProps } from '../codexGradient';

const linear: GradientSpec = {
  type: 'linear',
  angle: 90,
  stops: [
    { offset: 0, color: '#000000' },
    { offset: 1, color: '#ffffff' },
  ],
};

describe('gradientProps', () => {
  it('returns null when there is no gradient, so callers keep their flat colour', () => {
    expect(gradientProps(undefined, 100, 100)).toBeNull();
  });

  it('returns null for a gradient with no stops rather than blanking the shape', () => {
    expect(gradientProps({ type: 'linear', stops: [] }, 100, 100)).toBeNull();
  });

  it('maps a linear gradient to Konva fill props', () => {
    const props = gradientProps(linear, 200, 100)!;
    expect(props).toHaveProperty('fillLinearGradientStartPoint');
    expect(props).toHaveProperty('fillLinearGradientEndPoint');
    expect(props.fillLinearGradientColorStops).toEqual([
      0,
      'rgba(0,0,0,1)',
      1,
      'rgba(255,255,255,1)',
    ]);
  });

  it('prefixes stroke props when asked for the stroke channel', () => {
    const props = gradientProps(linear, 200, 100, 'stroke')!;
    expect(props).toHaveProperty('strokeLinearGradientColorStops');
    expect(props).not.toHaveProperty('fillLinearGradientColorStops');
  });

  it('honours explicit start/end points over the angle', () => {
    const props = gradientProps(
      { ...linear, start: { x: 5, y: 6 }, end: { x: 7, y: 8 } },
      200,
      100,
    )!;
    expect(props.fillLinearGradientStartPoint).toEqual({ x: 5, y: 6 });
    expect(props.fillLinearGradientEndPoint).toEqual({ x: 7, y: 8 });
  });

  it('treats radial centre and radius as fractions of the box, matching modes/comic', () => {
    const props = gradientProps(
      { type: 'radial', center: { x: 0.5, y: 0.5 }, radiusX: 0.5, stops: linear.stops },
      200,
      100,
    )!;
    expect(props.fillRadialGradientStartPoint).toEqual({ x: 100, y: 50 });
    expect(props.fillRadialGradientStartRadius).toBe(0);
    expect(props.fillRadialGradientEndRadius).toBe(100); // 0.5 * max(200,100)
  });

  it('degrades a rect gradient to corner-to-corner linear, since Konva has no rect gradient', () => {
    const props = gradientProps({ type: 'rect', stops: linear.stops }, 200, 100)!;
    expect(props.fillLinearGradientStartPoint).toEqual({ x: 0, y: 0 });
    expect(props.fillLinearGradientEndPoint).toEqual({ x: 200, y: 100 });
  });

  it('survives a zero-sized box rather than emitting NaN geometry', () => {
    const props = gradientProps(linear, 0, 0)!;
    const start = props.fillLinearGradientStartPoint as { x: number; y: number };
    expect(Number.isFinite(start.x)).toBe(true);
    expect(Number.isFinite(start.y)).toBe(true);
  });

  it('carries stop alpha and brightness through', () => {
    const props = gradientProps(
      { type: 'linear', stops: [{ offset: 0, color: '#ffffff', alpha: 0.5, brightness: 50 }] },
      10,
      10,
    )!;
    expect(props.fillLinearGradientColorStops).toEqual([0, 'rgba(128,128,128,0.5)']);
  });
});

describe('fillProps', () => {
  it('falls back to the flat colour when no gradient is set', () => {
    expect(fillProps(undefined, '#123456', 10, 10)).toEqual({ fill: '#123456' });
  });

  it('never returns both a flat fill and a gradient — Konva would ignore one', () => {
    const props = fillProps(linear, '#123456', 10, 10);
    expect(props.fill).toBeUndefined();
    expect(props).toHaveProperty('fillLinearGradientColorStops');
  });
});
