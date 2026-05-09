import { describe, expect, it } from 'vitest';
import {
  createGuidedComicStarterLayout,
  getConstrainedGuidedComicPanelGeometry,
  getGuidedComicExistingPanelBeats,
  getGuidedComicLayoutGridStyle,
  getGuidedComicLayoutPanels,
  getGuidedComicSafeMarginPanelGeometry,
  getSnappedGuidedComicPanelGeometry,
  syncGuidedComicLayoutGeometry,
} from '@/portals/guided-comic/guidedComicLayoutPlan';

describe('guided comic layout planning', () => {
  it('only returns beats for panels that exist on the page', () => {
    const beats = getGuidedComicExistingPanelBeats({
      panelCount: '2',
      panelBeats: ['Opening shot', 'Reaction beat', 'Old extra beat', 'Another old beat'],
    });

    expect(beats).toEqual(['Opening shot', 'Reaction beat']);
  });

  it('creates blank beat slots for existing panels without forcing old extra panels to render', () => {
    const beats = getGuidedComicExistingPanelBeats({
      panelCount: '3',
      panelBeats: ['Opening shot'],
    });

    expect(beats).toEqual(['Opening shot', '', '']);
  });

  it('lets establishing and reveal beats occupy larger layout space in auto layout', () => {
    const panels = getGuidedComicLayoutPanels(
      {
        pageNumber: 4,
        panelCount: '4',
        panelBeats: [
          'Wide establishing shot of the city under storm clouds.',
          'Close-up reaction from Flux.',
          'Huge reveal as the portal opens.',
          'Quiet dialogue beat.',
        ],
      },
      'auto',
    );

    expect(panels).toHaveLength(4);
    expect(panels[0]).toMatchObject({ panelNumber: 1, columnSpan: 2, intent: 'wide' });
    expect(panels[2]).toMatchObject({ panelNumber: 3, columnSpan: 2, rowSpan: 2, intent: 'feature' });
  });

  it('uses the real panel count instead of the template slot count', () => {
    const panels = getGuidedComicLayoutPanels(
      {
        pageNumber: 2,
        panelCount: '5',
        panelBeats: ['One', 'Two', 'Three', 'Four', 'Five'],
      },
      'three-panel',
    );

    expect(panels.map((panel) => panel.panelNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it('chooses non-uniform grid tracks for auto pages with many panels', () => {
    expect(getGuidedComicLayoutGridStyle('auto', 6)).toEqual({
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gridAutoRows: 'minmax(96px, 1fr)',
    });
  });

  it('supports a two-over-one-wide three-panel template', () => {
    const panels = getGuidedComicLayoutPanels(
      {
        pageNumber: 1,
        panelCount: '3',
        panelBeats: ['Reaction left', 'Reaction right', 'Wide reveal across the bottom', 'Old extra beat'],
      },
      'three-panel-wide-bottom',
    );

    expect(panels).toHaveLength(3);
    expect(panels.map((panel) => panel.panelNumber)).toEqual([1, 2, 3]);
    expect(panels[0]).toMatchObject({ columnSpan: 1, rowSpan: 1 });
    expect(panels[1]).toMatchObject({ columnSpan: 1, rowSpan: 1 });
    expect(panels[2]).toMatchObject({ columnSpan: 2, rowSpan: 1, intent: 'wide' });
    expect(getGuidedComicLayoutGridStyle('three-panel-wide-bottom', 3)).toEqual({
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gridAutoRows: 'minmax(128px, 1fr)',
    });
  });

  it('creates normalized starter geometry for the selected panel count', () => {
    const geometry = createGuidedComicStarterLayout(
      {
        pageNumber: 3,
        panelCount: '3',
        panelBeats: ['Wide establishing shot', 'Reaction', 'Large reveal'],
      },
      'three-panel-wide-bottom',
    );

    expect(geometry).toEqual([
      { panelId: 'page-3-panel-1', x: 0.04, y: 0.04, w: 0.452, h: 0.299, order: 0 },
      { panelId: 'page-3-panel-2', x: 0.508, y: 0.04, w: 0.452, h: 0.299, order: 1 },
      { panelId: 'page-3-panel-3', x: 0.04, y: 0.356, w: 0.92, h: 0.604, order: 2 },
    ]);
  });

  it('uses safe margins and standard gutters for default starter geometry', () => {
    const geometry = createGuidedComicStarterLayout(
      {
        pageNumber: 3,
        panelCount: '3',
        panelBeats: ['Reaction left', 'Reaction right', 'Wide reveal'],
      },
      'three-panel-wide-bottom',
      { marginMode: 'safe', gutterMode: 'standard' },
    );

    expect(geometry).toEqual([
      { panelId: 'page-3-panel-1', x: 0.04, y: 0.04, w: 0.452, h: 0.299, order: 0 },
      { panelId: 'page-3-panel-2', x: 0.508, y: 0.04, w: 0.452, h: 0.299, order: 1 },
      { panelId: 'page-3-panel-3', x: 0.04, y: 0.356, w: 0.92, h: 0.604, order: 2 },
    ]);
  });

  it('can create full-bleed starter geometry with thin dividers', () => {
    const geometry = createGuidedComicStarterLayout(
      {
        pageNumber: 5,
        panelCount: '2',
        panelBeats: ['Left image', 'Right image'],
      },
      'auto',
      { marginMode: 'full-bleed', gutterMode: 'thin' },
    );

    expect(geometry).toEqual([
      { panelId: 'page-5-panel-1', x: 0, y: 0, w: 0.497, h: 1, order: 0 },
      { panelId: 'page-5-panel-2', x: 0.503, y: 0, w: 0.497, h: 1, order: 1 },
    ]);
  });

  it('preserves user-edited geometry while syncing to the selected panel count', () => {
    const geometry = syncGuidedComicLayoutGeometry(
      {
        pageNumber: 2,
        panelCount: '3',
        panelBeats: ['One', 'Two', 'Three'],
      },
      [
        { panelId: 'page-2-panel-1', x: 0.1, y: 0.1, w: 0.4, h: 0.3, order: 0 },
        { panelId: 'page-2-panel-2', x: 0.55, y: 0.1, w: 0.35, h: 0.3, order: 1 },
        { panelId: 'page-2-panel-3', x: 0.1, y: 0.5, w: 0.8, h: 0.4, order: 2 },
        { panelId: 'page-2-panel-4', x: 0.1, y: 0.9, w: 0.8, h: 0.1, order: 3 },
      ],
      'auto',
    );

    expect(geometry).toEqual([
      { panelId: 'page-2-panel-1', x: 0.1, y: 0.1, w: 0.4, h: 0.3, order: 0 },
      { panelId: 'page-2-panel-2', x: 0.55, y: 0.1, w: 0.35, h: 0.3, order: 1 },
      { panelId: 'page-2-panel-3', x: 0.1, y: 0.5, w: 0.8, h: 0.4, order: 2 },
    ]);
  });

  it('constrains moved and resized panels to page bounds and minimum size', () => {
    expect(
      getConstrainedGuidedComicPanelGeometry({
        panelId: 'page-1-panel-1',
        x: -0.2,
        y: 0.95,
        w: 0.04,
        h: 0.04,
        order: 0,
      }),
    ).toEqual({
      panelId: 'page-1-panel-1',
      x: 0,
      y: 0.88,
      w: 0.12,
      h: 0.12,
      order: 0,
    });
  });

  it('snaps panel edges to margins and neighboring gutter guides', () => {
    const snapped = getSnappedGuidedComicPanelGeometry(
      { panelId: 'page-1-panel-1', x: 0.043, y: 0.039, w: 0.3, h: 0.2, order: 0 },
      [{ panelId: 'page-1-panel-2', x: 0.4, y: 0.04, w: 0.3, h: 0.2, order: 1 }],
    );

    expect(snapped).toMatchObject({ x: 0.04, y: 0.04 });
  });

  it('snaps near all safe margin edges before touching page bounds', () => {
    const snapped = getSnappedGuidedComicPanelGeometry(
      { panelId: 'page-1-panel-1', x: 0.022, y: 0.058, w: 0.956, h: 0.884, order: 0 },
      [],
    );

    expect(snapped).toMatchObject({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 });
  });

  it('can inset edited panels into the printable safe margin', () => {
    expect(
      getGuidedComicSafeMarginPanelGeometry({
        panelId: 'page-1-panel-1',
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        order: 0,
      }),
    ).toEqual({
      panelId: 'page-1-panel-1',
      x: 0.04,
      y: 0.04,
      w: 0.92,
      h: 0.92,
      order: 0,
    });
  });
});
