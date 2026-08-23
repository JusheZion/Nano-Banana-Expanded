import { describe, expect, it } from 'vitest';
import { clampAxisValue, radarGeometry } from '../chartGeometry';
import type { CodexChartObject } from '../../types/codexObjects';

function chart(partial: Partial<CodexChartObject> = {}): CodexChartObject {
  return {
    id: 'c1',
    kind: 'chart',
    chartKind: 'radial',
    axes: [
      { label: 'A', value: 100 },
      { label: 'B', value: 100 },
      { label: 'C', value: 100 },
    ],
    max: 100,
    stroke: '#fff',
    fill: '#fff',
    track: '#333',
    labelColor: '#888',
    fontFamily: 'Cinzel',
    fontSize: 11,
    showLabels: true,
    showValues: true,
    x: 0,
    y: 0,
    width: 400,
    height: 400,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    ...partial,
  } as CodexChartObject;
}

describe('clampAxisValue', () => {
  it('keeps values inside 0..max', () => {
    expect(clampAxisValue(50, 100)).toBe(50);
    expect(clampAxisValue(-20, 100)).toBe(0);
    expect(clampAxisValue(180, 100)).toBe(100);
  });

  it('survives non-finite input rather than propagating NaN into geometry', () => {
    expect(clampAxisValue(Number.NaN, 100)).toBe(0);
    expect(clampAxisValue(Number.POSITIVE_INFINITY, 100)).toBe(100);
  });

  it('treats a zero max as 1 so it cannot divide by zero', () => {
    expect(clampAxisValue(5, 0)).toBe(1);
  });
});

describe('radarGeometry', () => {
  it('produces one vertex and one label per axis', () => {
    const geo = radarGeometry(chart());
    expect(geo.vertices).toHaveLength(3);
    expect(geo.labels).toHaveLength(3);
    expect(geo.spokes).toHaveLength(3);
    expect(geo.polygon).toHaveLength(6); // x,y per vertex
  });

  it('draws four grid rings', () => {
    const geo = radarGeometry(chart());
    expect(geo.rings).toHaveLength(4);
    for (const ring of geo.rings) expect(ring).toHaveLength(6);
  });

  it('starts the first axis at twelve o’clock', () => {
    const geo = radarGeometry(chart());
    const [first] = geo.vertices;
    expect(first.x).toBeCloseTo(200, 5); // horizontally centred
    expect(first.y).toBeLessThan(200); // above centre
  });

  it('places a full-value vertex further out than a half-value one', () => {
    const geo = radarGeometry(
      chart({
        axes: [
          { label: 'A', value: 100 },
          { label: 'B', value: 50 },
          { label: 'C', value: 50 },
        ],
      }),
    );
    const centre = { x: 200, y: 200 };
    const dist = (p: { x: number; y: number }) => Math.hypot(p.x - centre.x, p.y - centre.y);
    expect(dist(geo.vertices[0])).toBeGreaterThan(dist(geo.vertices[1]));
  });

  it('collapses a zero-value axis onto the centre', () => {
    const geo = radarGeometry(
      chart({
        axes: [
          { label: 'A', value: 0 },
          { label: 'B', value: 100 },
          { label: 'C', value: 100 },
        ],
      }),
    );
    expect(geo.vertices[0].x).toBeCloseTo(200, 5);
    expect(geo.vertices[0].y).toBeCloseTo(200, 5);
  });

  it('returns empty geometry below three axes rather than drawing nonsense', () => {
    const geo = radarGeometry(chart({ axes: [{ label: 'A', value: 50 }] }));
    expect(geo.vertices).toHaveLength(0);
    expect(geo.polygon).toHaveLength(0);
    expect(geo.rings).toHaveLength(0);
  });

  it('never emits NaN coordinates', () => {
    const geo = radarGeometry(
      chart({ axes: [
        { label: 'A', value: Number.NaN },
        { label: 'B', value: 40 },
        { label: 'C', value: 90 },
      ] }),
    );
    for (const n of geo.polygon) expect(Number.isFinite(n)).toBe(true);
  });
});
