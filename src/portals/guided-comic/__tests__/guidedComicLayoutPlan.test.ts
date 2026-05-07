import { describe, expect, it } from 'vitest';
import {
  getGuidedComicExistingPanelBeats,
  getGuidedComicLayoutGridStyle,
  getGuidedComicLayoutPanels,
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
});
