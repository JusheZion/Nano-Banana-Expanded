import { beforeEach, describe, expect, it } from 'vitest';
import { useImageshopProductionStore } from '@/stores/imageshopProductionStore';

beforeEach(() => {
  localStorage.clear();
  useImageshopProductionStore.setState(useImageshopProductionStore.getInitialState(), true);
});

describe('useImageshopProductionStore', () => {
  it('tracks generation mode, prompt sections, and comic page config', () => {
    const store = useImageshopProductionStore.getState();

    store.setGenerationMode('comic-pages');
    store.updatePromptSection('main', 'A splash page reveal.');
    store.updatePageConfig({ pageType: 'splash-page', includeSfx: true });

    const state = useImageshopProductionStore.getState();
    expect(state.generationMode).toBe('comic-pages');
    expect(state.promptWorkspace.main).toBe('A splash page reveal.');
    expect(state.pageConfig.pageType).toBe('splash-page');
    expect(state.pageConfig.includeSfx).toBe(true);
  });

  it('adds production items, updates status, and stores generated versions', () => {
    const item = useImageshopProductionStore.getState().addProductionItem({
      label: 'Page 1 Panel 1',
      sourceKind: 'comic-page',
      prompt: 'A hero enters the observatory.',
      promptSections: {
        main: 'A hero enters the observatory.',
      },
    });

    useImageshopProductionStore.getState().updateProductionItemStatus(item.id, 'generated');
    useImageshopProductionStore.getState().addProductionVersion(item.id, {
      imageUrl: 'data:image/png;base64,abc',
      seed: 7,
      prompt: 'A hero enters the observatory.',
      kind: 'generated',
    });

    const stored = useImageshopProductionStore.getState().productionItems[0];
    expect(stored.status).toBe('generated');
    expect(stored.versions).toHaveLength(1);
    expect(stored.versions[0]).toMatchObject({
      imageUrl: 'data:image/png;base64,abc',
      seed: 7,
      kind: 'generated',
    });
    expect(useImageshopProductionStore.getState().selectedProductionItemId).toBe(item.id);
  });

  it('imports a batch and preserves saved art styles', () => {
    useImageshopProductionStore.getState().saveArtStyle({
      name: 'Amares Style',
      description: 'Soft celestial fantasy.',
      prompt: 'Amares fantasy, soft glow, ornate shapes.',
    });

    useImageshopProductionStore.getState().importBatch({
      id: 'batch-1',
      kind: 'story-beat-json',
      title: 'Chapter 1',
      importedAt: '2026-05-31T00:00:00.000Z',
      artStyles: [
        {
          id: 'imported-noir',
          name: 'Imported Noir',
          description: 'Shadow-heavy noir comic look.',
          prompt: 'Noir ink, sharp shadows, restrained color.',
        },
      ],
      selectedArtStyleId: 'imported-noir',
      items: [
        {
          sourceId: 'beat-1',
          sourceKind: 'story-beat',
          label: 'Beat 1',
          prompt: 'A quiet discovery.',
          promptSections: {
            main: 'A quiet discovery.',
          },
        },
      ],
    });

    const state = useImageshopProductionStore.getState();
    expect(state.savedArtStyles.some((style) => style.name === 'Amares Style')).toBe(true);
    expect(state.savedArtStyles.some((style) => style.name === 'Imported Noir')).toBe(true);
    expect(state.selectedArtStyleId).toBe('imported-noir');
    expect(state.productionItems[0]).toMatchObject({
      batchId: 'batch-1',
      label: 'Beat 1',
      status: 'draft',
    });
  });

  it('saves the current comic page configuration as a reusable layout template', () => {
    useImageshopProductionStore.getState().updatePageConfig({
      pageType: 'double-page-spread',
      layoutTemplateId: 'wide-top',
      panelStyle: {
        gutterWidth: 20,
      },
    });

    const template = useImageshopProductionStore.getState().saveLayoutTemplate('Wide Observatory Spread');

    expect(template.name).toBe('Wide Observatory Spread');
    expect(template.pageConfig.pageType).toBe('double-page-spread');
    expect(template.pageConfig.panelStyle.gutterWidth).toBe(20);
    expect(useImageshopProductionStore.getState().savedLayoutTemplates[0].id).toBe(template.id);
    expect(useImageshopProductionStore.getState().pageConfig.layoutTemplateId).toBe(template.id);
  });
});
