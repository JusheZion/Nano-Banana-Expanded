import { beforeEach, describe, expect, it } from 'vitest';
import { createImageshopIssueQueue } from '@/portals/storyline/imageshopPagePanelQueue';
import { normalizeImageshopJson } from '@/portals/storyline/imageshopJsonSchemas';
import {
  getCurrentImageshopProductionVersion,
  useImageshopProductionStore,
} from '@/stores/imageshopProductionStore';

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

  it('tracks an explicit current version and supports selection and revert', () => {
    const item = useImageshopProductionStore.getState().addProductionItem({
      label: 'Page 1 Panel 1',
      sourceKind: 'writer-panel',
      sourceId: 'issue-version-page-1-panel-1',
      prompt: 'Flux enters the observatory.',
      promptSections: {
        main: 'Flux enters the observatory.',
      },
    });

    useImageshopProductionStore.getState().addProductionVersion(item.id, {
      imageUrl: 'data:image/png;base64,first',
      seed: 11,
      prompt: 'First pass.',
      kind: 'generated',
    });
    const firstVersionId = useImageshopProductionStore.getState().productionItems[0].versions[0].id;

    useImageshopProductionStore.getState().addProductionVersion(item.id, {
      imageUrl: 'data:image/png;base64,second',
      seed: 22,
      prompt: 'Second pass.',
      kind: 'refined',
    });

    let stored = useImageshopProductionStore.getState().productionItems[0];
    expect(getCurrentImageshopProductionVersion(stored)?.imageUrl).toBe('data:image/png;base64,second');

    useImageshopProductionStore.getState().selectProductionVersion(item.id, firstVersionId);
    stored = useImageshopProductionStore.getState().productionItems[0];
    expect(stored.currentVersionId).toBe(firstVersionId);
    expect(getCurrentImageshopProductionVersion(stored)?.seed).toBe(11);

    useImageshopProductionStore.getState().revertProductionVersion(item.id, firstVersionId);
    stored = useImageshopProductionStore.getState().productionItems[0];
    expect(stored.status).toBe('refined');
    expect(stored.currentVersionId).toBe(firstVersionId);
  });

  it('synchronizes approve and publish actions with the Writer panel queue', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-05T12:00:00.000Z',
      issue: {
        id: 'issue-approval',
        title: 'Approval Queue',
      },
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              action: 'Flux approves the panel.',
            },
          ],
        },
      ],
    });
    const queueItemId = queue.pages[0].panels[0].queueItemId;
    useImageshopProductionStore.getState().setPanelQueue(queue);
    const item = useImageshopProductionStore.getState().addProductionItem({
      label: 'Page 1 Panel 1',
      sourceKind: 'writer-panel',
      sourceId: queueItemId,
      prompt: 'Flux approves the panel.',
      promptSections: {
        main: 'Flux approves the panel.',
      },
    });
    useImageshopProductionStore.getState().addProductionVersion(item.id, {
      imageUrl: 'data:image/png;base64,approved',
      seed: 7,
      prompt: 'Approved pass.',
      kind: 'generated',
    });

    useImageshopProductionStore.getState().approveProductionItem(item.id);
    expect(useImageshopProductionStore.getState().productionItems[0].status).toBe('approved');
    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0].status).toBe('approved');

    useImageshopProductionStore.getState().publishProductionItem(item.id);
    expect(useImageshopProductionStore.getState().productionItems[0].status).toBe('published');
    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0].status).toBe('approved');
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

  it('stores an active Writer page/panel queue and updates panel status', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-01T12:00:00.000Z',
      issue: {
        id: 'issue-store',
        title: 'Store Queue',
        issueNumber: 2,
      },
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              action: 'A character studies a wall of reference images.',
              loreIds: ['lore-wall'],
              referenceIds: ['asset-wall'],
            },
            {
              panelNumber: 2,
              action: 'The panel queue lights up.',
            },
          ],
        },
      ],
    });

    useImageshopProductionStore.getState().setPanelQueue(queue);
    useImageshopProductionStore.getState().selectPanelQueueItem('issue-store-page-1-panel-2');
    useImageshopProductionStore.getState().updatePanelQueueItemStatus('issue-store-page-1-panel-2', 'approved');

    const state = useImageshopProductionStore.getState();
    expect(state.panelQueue?.issueTitle).toBe('Store Queue');
    expect(state.selectedPanelQueueItemId).toBe('issue-store-page-1-panel-2');
    expect(state.panelQueueReadiness).toMatchObject({
      totalPanels: 2,
      readyPanels: 2,
      approvedPanels: 1,
    });
    expect(state.panelQueue?.pages[0].panels[1].status).toBe('approved');
  });

  it('activates the Writer panel queue when importing a Writer issue batch', () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-import',
      exported_at: '2026-06-01T15:30:00.000Z',
      issue: { issue_number: 4, title: 'Import Queue' },
      pages: [
        {
          page_number: 1,
          beats_json: {
            one_line_hook: 'The import becomes a queue.',
            panels: [{ index: 1, action: 'Flux reviews the production queue.' }],
          },
          script_text: null,
        },
      ],
    });

    useImageshopProductionStore.getState().importBatch(batch);

    const state = useImageshopProductionStore.getState();
    expect(state.importedBatches[0].kind).toBe('writer-issue-json');
    expect(state.panelQueue?.issueId).toBe('issue-import');
    expect(state.selectedPanelQueueItemId).toBe('issue-import-page-1-panel-1');
    expect(state.panelQueueReadiness).toMatchObject({
      totalPanels: 1,
      readyPanels: 1,
    });
  });

  it('edits active panel queue references with undo-safe add, replace, and clear actions', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-01T12:00:00.000Z',
      issue: {
        id: 'issue-reference-store',
        title: 'Reference Store',
      },
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              action: 'Flux reviews reference slots.',
              referenceChips: [
                {
                  id: 'character-flux',
                  label: 'Flux identity',
                  lane: 'character-dna',
                  sourceType: 'character',
                  referenceId: 'character-flux',
                },
              ],
            },
          ],
        },
      ],
    });
    const queueItemId = 'issue-reference-store-page-1-panel-1';

    useImageshopProductionStore.getState().setPanelQueue(queue);
    const addResult = useImageshopProductionStore.getState().addPanelQueueReferenceChip(queueItemId, {
      id: 'asset-map',
      label: 'Sky map',
      lane: 'props',
      sourceType: 'asset',
      referenceId: 'asset-map',
    });
    expect(addResult.undo?.previousReferenceChips.map((chip) => chip.id)).toEqual(['character-flux']);
    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0].referenceChips.map((chip) => chip.id)).toEqual([
      'character-flux',
      'asset-map',
    ]);
    expect(useImageshopProductionStore.getState().panelQueueReadiness.referenceChipCount).toBe(2);

    const blockedReplace = useImageshopProductionStore.getState().replacePanelQueueReferenceChips(queueItemId, [], {
      confirmed: false,
    });
    expect(blockedReplace.blockedReason).toBe('confirmation-required');
    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0].referenceChips).toHaveLength(2);

    const replaceResult = useImageshopProductionStore.getState().replacePanelQueueReferenceChips(
      queueItemId,
      [
        {
          id: 'style-board',
          label: 'Issue style board',
          lane: 'style',
          sourceType: 'approved-output',
          referenceId: 'style-board',
        },
      ],
      { confirmed: true },
    );
    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0].referenceChips.map((chip) => chip.id)).toEqual([
      'style-board',
    ]);

    useImageshopProductionStore.getState().restorePanelQueueReferenceChips(replaceResult.undo!);
    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0].referenceChips.map((chip) => chip.id)).toEqual([
      'character-flux',
      'asset-map',
    ]);

    const clearResult = useImageshopProductionStore.getState().clearPanelQueueReferenceChips(queueItemId, {
      confirmed: true,
    });
    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0].referenceChips).toEqual([]);

    useImageshopProductionStore.getState().restorePanelQueueReferenceChips(clearResult.undo!);
    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0].referenceChips.map((chip) => chip.id)).toEqual([
      'character-flux',
      'asset-map',
    ]);
  });

  it('persists manual canon attachments and detachments on the active panel queue', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-05T12:00:00.000Z',
      issue: {
        id: 'issue-canon-store',
        title: 'Canon Store',
      },
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              action: 'Flux finds an unlinked artifact.',
            },
          ],
        },
      ],
    });
    const queueItemId = queue.pages[0].panels[0].queueItemId;
    useImageshopProductionStore.getState().setPanelQueue(queue);

    useImageshopProductionStore.getState().attachPanelQueueCanonChip(queueItemId, {
      id: 'lore-artifact',
      title: 'Helios Key',
      category: 'artifact',
      source: 'obsidian',
      summary: 'The key must always emit a narrow gold ring.',
      provenance: {
        obsidianPath: 'Lore/Artifacts/Helios Key.md',
      },
    });

    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0]).toMatchObject({
      loreIds: ['lore-artifact'],
      canonChips: [expect.objectContaining({ id: 'lore-artifact', title: 'Helios Key' })],
    });

    useImageshopProductionStore.getState().detachPanelQueueCanonChip(queueItemId, 'lore-artifact');
    expect(useImageshopProductionStore.getState().panelQueue?.pages[0].panels[0]).toMatchObject({
      loreIds: [],
      canonChips: [],
    });
  });
});
