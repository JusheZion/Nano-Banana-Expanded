import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenericImageLabPanel } from '@/portals/storyline/GenericImageLabPanel';
import { hashImageshopGenerationPrompt } from '@/portals/storyline/imageshopGenerationRequest';
import { normalizeImageshopJson } from '@/portals/storyline/imageshopJsonSchemas';
import { buildImageshopProductionBoard } from '@/portals/storyline/imageshopProductionBoard';
import {
  type GuidedImageWorkshopHandoff,
  useImageWorkshopBridge,
} from '@/stores/imageWorkshopBridge';
import { useCharacterStudioStore } from '@/stores/characterStudioStore';
import { useImageshopProductionStore } from '@/stores/imageshopProductionStore';
import { useImageshopSessionStore } from '@/stores/imageshopSessionStore';
import { getGenerations } from '@/shared/utils/generationOutputRouter';

const arcsPersistenceMocks = vi.hoisted(() => ({
  saveImportedImageToCharacterVault: vi.fn(async () => ({
    ok: true,
    id: 'character-save-id',
    imageUrl: 'data:image/png;base64,character-cloud-save',
  })),
  saveImportedImageToAssetVault: vi.fn(async () => ({
    ok: true,
    id: 'asset-save-id',
    imageUrl: 'data:image/png;base64,asset-cloud-save',
  })),
}));

const geminiTextMocks = vi.hoisted(() => ({
  generateGeminiText: vi.fn(async (input: { userPrompt: string }) => {
    void input;
    return {
      ok: true as const,
      text: JSON.stringify({ refinedPrompt: 'Refined composed Imageshop prompt.' }),
    };
  }),
}));

const geminiImageMocks = vi.hoisted(() => ({
  generateImage: vi.fn(),
  referenceUrlToBase64WithMimeRetry: vi.fn(),
}));

const imageRepositoryMocks = vi.hoisted(() => ({
  saveImageshopImage: vi.fn(),
  loadImageshopImageUrl: vi.fn<(assetId: string) => Promise<string | null>>(async () => null),
  releaseImageshopImageUrl: vi.fn(),
}));

vi.mock('@/shared/api/arcsPersistence', () => arcsPersistenceMocks);

vi.mock('@/shared/api/geminiTextApi', () => geminiTextMocks);

vi.mock('@/shared/api/geminiImageApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/geminiImageApi')>();
  return {
    ...actual,
    generateImage: geminiImageMocks.generateImage,
    referenceUrlToBase64WithMimeRetry: geminiImageMocks.referenceUrlToBase64WithMimeRetry,
  };
});

vi.mock('@/shared/utils/imageshopImageRepository', () => imageRepositoryMocks);

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock('@/portals/storyline/ImageshopImportPanel', () => ({
  ImageshopImportPanel: () => <div data-testid="imageshop-import-panel" />,
}));

vi.mock('@/shared/api/arcsVault', () => ({
  getCharacterAlbums: vi.fn(async () => []),
}));

vi.mock('@/shared/api/arcsAssetVault', () => ({
  getAssetAlbums: vi.fn(async () => []),
}));

vi.mock('@/components/ui/ArcsStorageImg', () => ({
  ArcsStorageImg: ({ alt = '', className = '' }: { alt?: string; className?: string }) => (
    <img alt={alt} className={className} />
  ),
}));

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:imageshop-test-url'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  localStorage.clear();
  sessionStorage.clear();
  useImageWorkshopBridge.setState({
    portalToOpen: null,
    draft: null,
    guidedHandoff: null,
    guidedPanelReturn: null,
    writerImageMapReturn: null,
  });
  useImageshopProductionStore.setState(useImageshopProductionStore.getInitialState(), true);
  useImageshopSessionStore.setState({
    results: [],
    activeResultId: null,
  });
  useCharacterStudioStore.setState({
    referenceImageUrls: [],
  });
  arcsPersistenceMocks.saveImportedImageToCharacterVault.mockClear();
  arcsPersistenceMocks.saveImportedImageToAssetVault.mockClear();
  geminiTextMocks.generateGeminiText.mockClear();
  geminiImageMocks.generateImage.mockReset();
  geminiImageMocks.generateImage.mockResolvedValue({
    ok: true,
    imageDataUrl: 'data:image/png;base64,generated-panel',
  });
  geminiImageMocks.referenceUrlToBase64WithMimeRetry.mockReset();
  geminiImageMocks.referenceUrlToBase64WithMimeRetry.mockImplementation(async (url: string) => ({
    base64: btoa(url),
    mimeType: 'image/png',
  }));
  imageRepositoryMocks.saveImageshopImage.mockReset();
  imageRepositoryMocks.saveImageshopImage.mockResolvedValue({
    id: 'imageshop-test-asset',
    mimeType: 'image/png',
    byteLength: 15,
  });
  imageRepositoryMocks.loadImageshopImageUrl.mockClear();
  imageRepositoryMocks.releaseImageshopImageUrl.mockClear();
});

describe('GenericImageLabPanel production studio shell', () => {
  it('renders the Imageshop production studio controls without requiring a generated image', () => {
    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    expect(screen.getByText('Generation Mode')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Video Beats' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Comic Pages' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compose' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Page setup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Batch JSON' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review' })).toBeTruthy();
    const mainPrompt = screen.getByPlaceholderText('Describe the image you want...');
    const referenceTray = screen.getByText('References');
    expect(mainPrompt.compareDocumentPosition(referenceTray) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const generateAction = screen.getByRole('button', { name: 'Generate current Imageshop prompt' });
    const advancedDirection = screen.getByLabelText('Avoid List');
    expect(generateAction.compareDocumentPosition(advancedDirection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Import external image')).toBeNull();
    expect(screen.queryByText('Art Style Library')).toBeNull();
    expect(screen.queryByText('JSON Production Batch')).toBeNull();
    expect(screen.queryByText('Production Dashboard')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByTestId('imageshop-import-panel')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Page setup' }));
    expect(screen.getByText('Art Style Library')).toBeTruthy();
    expect(screen.getByText('Continuity Lock')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Batch JSON' }));
    expect(screen.getByText('JSON Production Batch')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByText('Production Dashboard')).toBeTruthy();
    expect(screen.getByText('Refinement Workspace')).toBeTruthy();
  });

  it('scopes repeated Imageshop commands and explains disabled actions', () => {
    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Generate current Imageshop prompt' })).toBeTruthy();
    expect(screen.getByText('Add a prompt before generating.')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Describe the image you want...'), {
      target: { value: 'Blue hero.' },
    });
    expect(screen.getByText('Preflight blocked')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Generate current Imageshop prompt' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Page setup' }));

    expect(screen.getByRole('button', { name: 'Set generation aspect ratio to Portrait' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Set generation aspect ratio to Square' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Set generation aspect ratio to Cinematic' })).toBeTruthy();
  });

  it('sends the composed comic-page request to the AI prompt helper', async () => {
    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Comic Pages' }));
    fireEvent.change(screen.getByPlaceholderText('Describe the image you want...'), {
      target: { value: 'Flux opens a brass observatory door in a low-angle wide comic panel.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'AI prompt helper' }));

    await waitFor(() => expect(geminiTextMocks.generateGeminiText).toHaveBeenCalledTimes(1));
    expect(geminiTextMocks.generateGeminiText.mock.calls[0]?.[0]?.userPrompt).toContain(
      'Generation mode: Comic Pages',
    );
    expect(geminiTextMocks.generateGeminiText.mock.calls[0]?.[0]?.userPrompt).toContain(
      'Page type: Single Comic Page',
    );
  });

  it('uses the displayed standalone preflight prompt for provider execution and persistence', async () => {
    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Comic Pages' }));
    fireEvent.change(screen.getByPlaceholderText('Describe the image you want...'), {
      target: {
        value: 'Flux opens a brass observatory door beneath a rotating star map.',
      },
    });
    fireEvent.change(screen.getByLabelText('Avoid List'), {
      target: { value: 'no blurry faces, no unreadable lettering' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate current Imageshop prompt' }));

    await waitFor(() => expect(geminiImageMocks.generateImage).toHaveBeenCalledTimes(1));
    const providerPrompt = geminiImageMocks.generateImage.mock.calls[0][0].prompt;
    const result = useImageshopSessionStore.getState().results[0];
    const version = useImageshopProductionStore.getState().productionItems[0].versions[0];
    const displayedPrompt = screen
      .getByText('Composed generation prompt')
      .parentElement?.querySelectorAll('p')[1]?.textContent;

    expect(displayedPrompt).toBe(providerPrompt);
    expect(providerPrompt).toContain('Generation mode: Comic Pages');
    expect(providerPrompt).toContain('Avoid list: no blurry faces, no unreadable lettering');
    expect(providerPrompt).toContain('Page type: Single Comic Page');
    expect(result.prompt).toBe(providerPrompt);
    expect(version.prompt).toBe(providerPrompt);
  });

  it('does not persist production history while the user types a prompt', () => {
    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    setItem.mockClear();

    fireEvent.change(screen.getByPlaceholderText('Describe the image you want...'), {
      target: { value: 'Flux enters a luminous clockwork observatory.' },
    });

    expect(setItem).not.toHaveBeenCalledWith('arcs-imageshop-production-v1', expect.any(String));
    setItem.mockRestore();
  });

  it('keeps a successful generated result visible when binary persistence exceeds quota', async () => {
    imageRepositoryMocks.saveImageshopImage.mockRejectedValueOnce(
      new DOMException('The quota has been exceeded.', 'QuotaExceededError'),
    );

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Describe the image you want...'), {
      target: { value: 'Flux enters a luminous clockwork observatory beneath a rotating star map.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate current Imageshop prompt' }));

    await waitFor(() => expect(geminiImageMocks.generateImage).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(useImageshopSessionStore.getState().results[0]?.imageUrl).toBe(
        'data:image/png;base64,generated-panel',
      ),
    );
    expect(useImageshopSessionStore.getState().results[0]?.imagePersistence).toBe('memory-only');
    expect(useImageshopProductionStore.getState().productionItems[0]?.versions[0]?.imageUrl).toBe(
      'data:image/png;base64,generated-panel',
    );
    expect(screen.getByText(/will not survive a reload/i)).toBeTruthy();
  });

  it('hydrates persisted session and production images from the shared binary asset', async () => {
    imageRepositoryMocks.loadImageshopImageUrl.mockResolvedValue('blob:restored-imageshop-result');
    useImageshopSessionStore.setState({
      results: [
        {
          id: 'restored-session-result',
          imageUrl: '',
          imageAsset: {
            id: 'restored-shared-asset',
            mimeType: 'image/png',
            byteLength: 32,
          },
          seed: 42,
          prompt: 'Restored prompt',
          aspectRatio: '1:1',
          context: 'character',
          modelId: 'pro',
          generatedAt: '2026-06-06T12:00:00.000Z',
        },
      ],
      activeResultId: 'restored-session-result',
    });
    const item = useImageshopProductionStore.getState().addProductionItem({
      label: 'Restored item',
      sourceKind: 'manual',
      prompt: 'Restored prompt',
      promptSections: { main: 'Restored prompt' },
    });
    useImageshopProductionStore.getState().addProductionVersion(item.id, {
      imageUrl: '',
      imageAsset: {
        id: 'restored-shared-asset',
        mimeType: 'image/png',
        byteLength: 32,
      },
      seed: 42,
      prompt: 'Restored prompt',
      kind: 'generated',
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(useImageshopSessionStore.getState().results[0].imageUrl).toBe(
        'blob:restored-imageshop-result',
      ),
    );
    await waitFor(() =>
      expect(
        useImageshopProductionStore.getState().productionItems[0].versions[0].imageUrl,
      ).toBe('blob:restored-imageshop-result'),
    );

    act(() => {
      useImageshopSessionStore.getState().clearResults();
      useImageshopProductionStore.getState().clearProductionItems();
    });
    await waitFor(() =>
      expect(imageRepositoryMocks.releaseImageshopImageUrl).toHaveBeenCalledWith(
        'restored-shared-asset',
      ),
    );
  });

  it('scopes recoverable session result commands', () => {
    useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,session-result',
      seed: 42,
      prompt: 'Saved Imageshop result',
      aspectRatio: '1:1',
      context: 'character',
      modelId: 'pro',
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Remove session result 1' })).toBeTruthy();
  });

  it('reveals comic page configuration after switching to Comic Pages mode', () => {
    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    expect(screen.queryByText('Comic Page Configuration')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Comic Pages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page setup' }));

    expect(screen.getByText('Comic Page Configuration')).toBeTruthy();
    expect(screen.getByText('Page Type')).toBeTruthy();
    expect(screen.getByText('Layout Template')).toBeTruthy();
    expect(screen.getByText('Border Style')).toBeTruthy();
  });

  it('imports pasted JSON into dashboard production items before generation', async () => {
    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Batch JSON' }));
    fireEvent.change(screen.getByPlaceholderText('Paste JSON here, then click "Import pasted JSON".'), {
      target: {
        value: JSON.stringify({
          title: 'Smoke issue',
          beats: [
            {
              id: 'beat-1',
              title: 'Observatory arrival',
              prompt: 'Flux arrives at the observatory.',
              characters: ['Flux'],
              environment: 'Sky Observatory',
            },
          ],
        }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import pasted JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));

    expect(await screen.findByText('Observatory arrival')).toBeTruthy();
    expect(useImageshopProductionStore.getState().productionItems[0]).toMatchObject({
      sourceId: 'beat-1',
      status: 'draft',
      prompt: 'Flux arrives at the observatory.',
    });
  });

  it('renders imported Writer pages as the first generation cockpit before legacy batch surfaces', async () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-cockpit',
      exported_at: '2026-06-01T16:00:00.000Z',
      series: { title: 'Twovestellium' },
      issue: { issue_number: 6, title: 'The Observatory Door' },
      pages: [
        {
          id: 'writer-page-1',
          page_number: 1,
          beats_json: {
            one_line_hook: 'Flux reaches the observatory.',
            characters: ['Flux'],
            locations: ['Sky Observatory'],
            art_style: 'ornate celestial comic',
            panels: [
              {
                id: 'writer-panel-1',
                index: 1,
                action: 'Flux opens a brass iris door.',
                composition: 'Low angle with the astrolabe in the foreground.',
                dialogue_placeholder: 'This place remembers us.',
                sfx: 'KRRRNNG',
                lore_ids: ['lore-flux'],
                reference_ids: ['character-flux-cover'],
                canon: [
                  {
                    id: 'lore-flux',
                    title: 'Flux',
                    category: 'character',
                    source: 'obsidian',
                    summary: 'Gold eyes, cobalt coat, white comet badge.',
                    source_path: 'Characters/Flux.md',
                  },
                ],
                references: [
                  {
                    id: 'character-flux-cover',
                    label: 'Flux identity',
                    lane: 'character-dna',
                    source_type: 'character',
                    image_url: 'https://example.test/flux.png',
                  },
                ],
              },
            ],
          },
          script_text: null,
        },
      ],
    });
    useImageshopProductionStore.getState().importBatch(batch);

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    expect(screen.getByText('Writer Pages Cockpit')).toBeTruthy();
    expect(screen.getByText('The Observatory Door')).toBeTruthy();
    expect(screen.getByText('Panel Queue')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select Page 1 Panel 1' })).toBeTruthy();
    expect(screen.getAllByText('Flux opens a brass iris door.').length).toBeGreaterThan(0);
    expect(screen.getByText('Context Inspector')).toBeTruthy();
    expect(screen.getByText('Canon used')).toBeTruthy();
    expect(screen.getAllByText('Flux').length).toBeGreaterThan(0);
    expect(screen.getByText('Reference lanes')).toBeTruthy();
    expect(screen.getByText('Character DNA')).toBeTruthy();
    expect(screen.getAllByText('Flux identity').length).toBeGreaterThan(0);
    expect(screen.getByText('Output Destinations')).toBeTruthy();
    expect(screen.getByText('Vault save')).toBeTruthy();
    expect(screen.getByText('Writer image map')).toBeTruthy();
    expect(screen.getByText('Guided return')).toBeTruthy();
    expect(screen.getByText('Prompt preflight')).toBeTruthy();
    expect(screen.getByText('Ready to generate')).toBeTruthy();
    expect(screen.getAllByText('Writer JSON').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lore').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vault').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Page Config').length).toBeGreaterThan(0);
    expect(screen.getByText('1 reference')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Load selected panel prompt' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Generate selected panel' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Retry selected panel' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Retry unlocks after the selected panel fails.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generate page' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generate all drafts' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pause batch' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resume batch' })).toBeTruthy();

    const cockpit = screen.getByText('Writer Pages Cockpit');
    const cockpitGrid = cockpit.closest('section')?.firstElementChild;
    expect(cockpitGrid?.className).toContain('lg:grid-cols-2');
    expect(cockpitGrid?.className).toContain('2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]');
    expect(cockpitGrid?.className).not.toContain('minmax(14rem');
    fireEvent.click(screen.getByRole('button', { name: 'Batch JSON' }));
    const legacyBatch = screen.getByText('JSON Production Batch');
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    const dashboard = screen.getByText('Production Dashboard');
    expect(cockpit.compareDocumentPosition(legacyBatch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cockpit.compareDocumentPosition(dashboard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('preserves a successful panel when a page batch pauses and retries the failed panel', async () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-batch-recovery',
      exported_at: '2026-06-05T17:00:00.000Z',
      issue: { title: 'Batch Recovery' },
      pages: [
        {
          id: 'writer-page-batch-recovery',
          page_number: 1,
          beats_json: {
            panels: [
              {
                id: 'writer-panel-batch-1',
                index: 1,
                action: 'Flux opens the brass observatory door beneath a rotating field of stars.',
              },
              {
                id: 'writer-panel-batch-2',
                index: 2,
                action: 'Flux raises the glowing compass while the observatory chamber turns around her.',
              },
            ],
          },
        },
      ],
    });
    useImageshopProductionStore.getState().importBatch(batch);
    geminiImageMocks.generateImage
      .mockResolvedValueOnce({
        ok: true,
        imageDataUrl: 'data:image/png;base64,panel-one',
      })
      .mockResolvedValueOnce({
        ok: false,
        error: 'Image request timed out. Try again.',
        diagnostic: {
          errorClass: 'timeout',
          message: 'Image request timed out. Try again.',
          retryable: true,
          suggestedAction: 'retry',
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        imageDataUrl: 'data:image/png;base64,panel-two-retry',
      });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Generate page' }));

    await waitFor(() => expect(screen.getByText('Batch paused with 1 generated and 1 failed.')).toBeTruthy());
    const panelsAfterFailure = useImageshopProductionStore.getState().panelQueue?.pages[0]?.panels ?? [];
    expect(panelsAfterFailure.map((panel) => panel.status)).toEqual(['generated', 'failed']);
    expect(useImageshopSessionStore.getState().results[0]).toMatchObject({
      imageUrl: 'data:image/png;base64,panel-one',
      attempt: expect.objectContaining({
        queueItemId: 'issue-batch-recovery-page-1-panel-1',
        promptHash: expect.stringMatching(/^fnv1a-/),
        referenceCount: 0,
        retryCount: 0,
      }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry smaller refs' }));

    await waitFor(() => expect(screen.getByText('Batch completed with 2 generated, 0 failed, and 0 skipped.')).toBeTruthy());
    const panelsAfterRetry = useImageshopProductionStore.getState().panelQueue?.pages[0]?.panels ?? [];
    expect(panelsAfterRetry.map((panel) => panel.status)).toEqual(['generated', 'generated']);
    expect(geminiImageMocks.generateImage).toHaveBeenCalledTimes(3);
    expect((screen.getByRole('button', { name: 'Retry failed panels' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Retry smaller refs' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('uses the exact composed selected-panel prompt for provider execution and provenance', async () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-request-contract',
      exported_at: '2026-06-06T20:00:00.000Z',
      issue: { title: 'Request Contract' },
      pages: [
        {
          id: 'writer-page-request-contract',
          page_number: 1,
          beats_json: {
            panels: [
              {
                id: 'writer-panel-request-contract',
                index: 1,
                action: 'Flux opens a brass observatory door beneath a rotating star map.',
                composition: 'Low-angle wide panel with an astrolabe in the foreground.',
                characters: ['Flux'],
                locations: ['Sky Observatory'],
                art_style: 'ornate celestial comic',
              },
            ],
          },
        },
      ],
    });
    useImageshopProductionStore.getState().importBatch(batch);

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Avoid List'), {
      target: { value: 'no blurry faces, no unreadable lettering' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate selected panel' }));

    await waitFor(() => expect(geminiImageMocks.generateImage).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        useImageshopProductionStore
          .getState()
          .productionItems.find(
            (item) => item.sourceId === 'issue-request-contract-page-1-panel-1',
          )?.versions,
      ).toHaveLength(1),
    );
    const providerPrompt = geminiImageMocks.generateImage.mock.calls[0][0].prompt;
    const result = useImageshopSessionStore.getState().results[0];
    const state = useImageshopProductionStore.getState();
    const queueItemId = 'issue-request-contract-page-1-panel-1';
    const linkedItems = state.productionItems.filter((item) => item.sourceId === queueItemId);
    const linkedItem = linkedItems[0];
    const version = linkedItem?.versions[0];
    const board = buildImageshopProductionBoard(state.panelQueue!, state.productionItems);

    expect(providerPrompt).toContain('Generation mode: Comic Pages');
    expect(providerPrompt).toContain('Avoid list: no blurry faces, no unreadable lettering');
    expect(providerPrompt).toContain('Art style instructions: ornate celestial comic');
    expect(providerPrompt).toContain('Page type: Single Comic Page');
    expect(result.prompt).toBe(providerPrompt);
    expect(result.provenance?.prompt.composed).toBe(providerPrompt);
    expect(version?.prompt).toBe(providerPrompt);
    expect(version?.provenance?.prompt.composed).toBe(providerPrompt);
    expect(linkedItems).toHaveLength(1);
    expect(linkedItem).toMatchObject({
      sourceKind: 'writer-panel',
      sourceId: queueItemId,
      label: 'Page 1 Panel 1',
      status: 'generated',
      currentVersionId: version?.id,
    });
    expect(state.productionItems.some((item) => item.label.startsWith('Imageshop item'))).toBe(false);
    expect(state.panelQueue?.pages[0].panels[0].status).toBe('generated');
    expect(result.provenance?.sourcePanelId).toBe(queueItemId);
    expect(board.pages[0].panels[0]).toMatchObject({
      queueItemId,
      productionItemId: linkedItem.id,
      currentVersionId: version?.id,
      status: 'generated',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send image map to Writers Workshop' }));
    expect(useImageWorkshopBridge.getState().writerImageMapReturn?.pages[0].panels[0]).toMatchObject({
      queue_item_id: queueItemId,
      image_url: result.imageUrl,
      status: 'generated',
      version_id: version?.id,
      prompt: providerPrompt,
    });
  });

  it('uses the exact composed batch prompt for provider execution, hashes, and provenance', async () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-batch-request-contract',
      exported_at: '2026-06-06T20:30:00.000Z',
      issue: { title: 'Batch Request Contract' },
      pages: [
        {
          id: 'writer-page-batch-request-contract',
          page_number: 1,
          beats_json: {
            panels: [
              {
                id: 'writer-panel-batch-request-contract',
                index: 1,
                action: 'Flux raises a glowing compass while the observatory rotates around her.',
                composition: 'Centered medium-wide panel with strong radial motion.',
                characters: ['Flux'],
                locations: ['Sky Observatory'],
                art_style: 'ornate celestial comic',
              },
            ],
          },
        },
      ],
    });
    useImageshopProductionStore.getState().importBatch(batch);

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Avoid List'), {
      target: { value: 'no blurry faces, no unreadable lettering' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate page' }));

    await waitFor(() => expect(geminiImageMocks.generateImage).toHaveBeenCalledTimes(1));
    const providerPrompt = geminiImageMocks.generateImage.mock.calls[0][0].prompt;
    const result = useImageshopSessionStore.getState().results[0];

    expect(providerPrompt).toContain('Generation mode: Comic Pages');
    expect(providerPrompt).toContain('Avoid list: no blurry faces, no unreadable lettering');
    expect(providerPrompt).toContain('Art style instructions: ornate celestial comic');
    expect(providerPrompt).toContain('Page type: Single Comic Page');
    expect(result.prompt).toBe(providerPrompt);
    expect(result.provenance?.prompt.composed).toBe(providerPrompt);
    expect(result.attempt?.promptHash).toBe(hashImageshopGenerationPrompt(providerPrompt));
  });

  it('blocks the provider and marks the matching queue chip when reference preparation fails', async () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-reference-failure',
      exported_at: '2026-06-06T20:00:00.000Z',
      issue: { title: 'Reference Failure' },
      pages: [
        {
          page_number: 1,
          beats_json: {
            panels: [
              {
                index: 1,
                action: 'Flux opens the observatory door while holding a brass compass.',
                references: [
                  {
                    id: 'observatory-reference',
                    label: 'Sky Observatory',
                    lane: 'environment',
                    source_type: 'asset',
                    image_url: 'https://example.test/observatory.png',
                  },
                  {
                    id: 'flux-reference',
                    label: 'Flux identity',
                    lane: 'character-dna',
                    source_type: 'character',
                    image_url: 'https://example.test/flux.png',
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    useImageshopProductionStore.getState().importBatch(batch);
    geminiImageMocks.referenceUrlToBase64WithMimeRetry.mockImplementation(async (url: string) => {
      if (url.includes('observatory')) throw new Error('Failed to fetch reference image (404)');
      return { base64: btoa(url), mimeType: 'image/png' };
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Generate selected panel' }));

    await waitFor(() =>
      expect(screen.getByText('Reference preparation failed: Sky Observatory.')).toBeTruthy(),
    );
    expect(geminiImageMocks.generateImage).not.toHaveBeenCalled();
    expect(
      useImageshopProductionStore
        .getState()
        .panelQueue?.pages[0].panels[0].referenceChips.map((chip) => ({
          id: chip.id,
          status: chip.signedUrlStatus,
          failureKind: chip.preparationFailureKind,
        })),
    ).toEqual([
      {
        id: 'observatory-reference',
        status: 'failed',
        failureKind: 'fetch',
      },
      {
        id: 'flux-reference',
        status: 'ready',
        failureKind: undefined,
      },
    ]);
  });

  it('sends prepared references to Gemini in lane order with explicit provider instructions', async () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-reference-roles',
      exported_at: '2026-06-06T20:30:00.000Z',
      issue: { title: 'Reference Roles' },
      pages: [
        {
          page_number: 1,
          beats_json: {
            panels: [
              {
                index: 1,
                action: 'Flux enters the observatory beneath a field of rotating stars.',
                references: [
                  {
                    id: 'environment-reference',
                    label: 'Sky Observatory',
                    lane: 'environment',
                    source_type: 'asset',
                    image_url: 'https://example.test/observatory.png',
                  },
                  {
                    id: 'character-reference',
                    label: 'Flux identity',
                    lane: 'character-dna',
                    source_type: 'character',
                    image_url: 'https://example.test/flux.png',
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    useImageshopProductionStore.getState().importBatch(batch);

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Generate selected panel' }));

    await waitFor(() => expect(geminiImageMocks.generateImage).toHaveBeenCalledTimes(1));
    expect(
      geminiImageMocks.generateImage.mock.calls[0][0].preparedReferenceImages.map(
        (reference: { id: string; providerInstruction: string }) => ({
          id: reference.id,
          providerInstruction: reference.providerInstruction,
        }),
      ),
    ).toEqual([
      {
        id: 'character-reference',
        providerInstruction:
          '[Character DNA: preserve identity, face, body, hair, skin, and distinguishing features.]',
      },
      {
        id: 'environment-reference',
        providerInstruction:
          '[Environment: preserve location, architecture, geography, layout, and spatial relationships.]',
      },
    ]);
  });

  it('retries a failed panel with the recorded reference removed from request and provenance', async () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-reference-retry',
      exported_at: '2026-06-06T21:00:00.000Z',
      issue: { title: 'Reference Retry' },
      pages: [
        {
          page_number: 1,
          beats_json: {
            panels: [
              {
                index: 1,
                action: 'Flux studies the brass astrolabe inside the rotating observatory.',
                references: [
                  {
                    id: 'failed-environment',
                    label: 'Broken Observatory',
                    lane: 'environment',
                    source_type: 'asset',
                    image_url: 'https://example.test/broken-observatory.png',
                  },
                  {
                    id: 'ready-character',
                    label: 'Flux identity',
                    lane: 'character-dna',
                    source_type: 'character',
                    image_url: 'https://example.test/flux.png',
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    useImageshopProductionStore.getState().importBatch(batch);
    geminiImageMocks.referenceUrlToBase64WithMimeRetry.mockImplementation(async (url: string) => {
      if (url.includes('broken-observatory')) {
        throw new Error('Failed to fetch reference image (404)');
      }
      return { base64: btoa(url), mimeType: 'image/png' };
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Generate page' }));
    await waitFor(() => expect(screen.getByText('Batch paused with 0 generated and 1 failed.')).toBeTruthy());
    expect(geminiImageMocks.generateImage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry without failed refs' }));

    await waitFor(() => expect(geminiImageMocks.generateImage).toHaveBeenCalledTimes(1));
    const providerInput = geminiImageMocks.generateImage.mock.calls[0][0];
    const result = useImageshopSessionStore.getState().results[0];
    expect(providerInput.preparedReferenceImages.map((reference: { id: string }) => reference.id)).toEqual([
      'ready-character',
    ]);
    expect(providerInput.prompt).not.toContain('Broken Observatory');
    expect(result.provenance?.references.map((reference) => reference.id)).toEqual(['ready-character']);
    expect(result.attempt).toMatchObject({
      strategy: 'without-failed-refs',
      referenceIds: ['ready-character'],
    });
  });

  it('surfaces vault reference lanes for imported Writer panels', () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-reference-lanes',
      exported_at: '2026-06-01T21:00:00.000Z',
      issue: { title: 'Reference Lane Smoke' },
      pages: [
        {
          id: 'writer-page-reference-lanes',
          page_number: 1,
          beats_json: {
            one_line_hook: 'Flux enters the observatory.',
            characters: ['Flux'],
            locations: ['Sky Observatory'],
            panels: [
              {
                id: 'writer-panel-reference-lanes',
                index: 1,
                action: 'Flux steps through the brass iris door.',
                composition: 'Wide panel showing the observatory chamber.',
                reference_ids: ['char-flux', 'asset-observatory', 'npc-witness', 'char-missing-flux'],
              },
            ],
          },
        },
      ],
    });
    useImageshopProductionStore.getState().importBatch(batch);

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[
          {
            vaultCharacterId: 'char-flux',
            profileName: 'Flux Profile',
            castName: 'Flux',
            displayName: 'Flux Solara',
            imageUrl: 'https://example.test/flux.png',
            tagSummary: 'silver coat',
          },
        ]}
        productionAssets={[
          {
            vaultAssetId: 'asset-observatory',
            collectionName: 'Sky Observatory',
            assetName: 'Brass iris door',
            imageUrl: 'https://example.test/observatory.png',
          },
        ]}
        productionSupportingRefs={[
          {
            supportingRefId: 'npc-witness',
            label: 'Alley Witness',
            imageUrl: 'https://example.test/witness.png',
            createdAt: 1710000000000,
          },
        ]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    expect(screen.getByText('Reference lanes')).toBeTruthy();
    expect(screen.getAllByText('Character DNA').length).toBeGreaterThan(0);
    expect(screen.getByText('Flux Solara')).toBeTruthy();
    expect(screen.getByText('Brass iris door')).toBeTruthy();
    expect(screen.getByText('Alley Witness')).toBeTruthy();
    expect(screen.getByText('Missing references')).toBeTruthy();
    expect(screen.getByText('Resolve char-missing-flux in Character Studio')).toBeTruthy();
  });

  it('attaches prompt-safe Obsidian canon from Writer context and reports vault label conflicts', () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-obsidian-canon',
      exported_at: '2026-06-05T12:00:00.000Z',
      series: { id: 'series-1', title: 'Twovestellium' },
      issue: { title: 'Obsidian Canon Smoke' },
      pages: [
        {
          id: 'writer-page-obsidian-canon',
          page_number: 1,
          beats_json: {
            characters: ['Flux'],
            panels: [
              {
                id: 'writer-panel-obsidian-canon',
                index: 1,
                action: 'Flux enters the observatory.',
                lore_ids: ['lore-flux'],
                references: [
                  {
                    id: 'lore-flux',
                    label: 'Flux Alternate',
                    lane: 'character-dna',
                    source_type: 'character',
                    reference_id: 'lore-flux',
                    image_url: 'https://example.test/flux.png',
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    useImageshopProductionStore.getState().importBatch(batch);

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        writerLoreCards={[
          {
            id: 'lore-flux',
            seriesId: 'series-1',
            title: 'Flux',
            category: 'character',
            body: [
              '> Gold eyes, cobalt coat, and a white comet badge.',
              '',
              'Private drafting notes should stay out of the prompt.',
              '',
              '<!-- ARCS_LORE_IMPORT_METADATA',
              JSON.stringify({
                source: 'obsidian',
                sourcePath: 'Characters/Flux.md',
                importDate: '2026-06-01T12:00:00.000Z',
                updatedAt: '2026-06-01T12:00:00.000Z',
                summary: 'Gold eyes, cobalt coat, and a white comet badge.',
              }),
              '-->',
            ].join('\n'),
            includeInPrompt: true,
          },
        ]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Flux').length).toBeGreaterThan(0);
    expect(screen.getByText('Obsidian')).toBeTruthy();
    expect(screen.getByText('Characters/Flux.md')).toBeTruthy();
    expect(
      screen.getByText('Canon "Flux" conflicts with vault reference label "Flux Alternate".'),
    ).toBeTruthy();
    expect(screen.getByText('Preflight blocked')).toBeTruthy();
    expect(screen.getByText('1 canon conflict must be resolved before generation.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Generate selected panel' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Load selected panel prompt' }));

    const continuity = useImageshopProductionStore.getState().promptWorkspace.continuity;
    expect(continuity).toContain('Gold eyes, cobalt coat, and a white comet badge.');
    expect(continuity).not.toContain('ARCS_LORE_IMPORT_METADATA');
    expect(continuity).not.toContain('Private drafting notes');
  });

  it('restores session results and saves the current output to the NPC Vault without regeneration', async () => {
    useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,session-result',
      seed: 42,
      prompt: 'Saved Imageshop result',
      aspectRatio: '1:1',
      context: 'character',
      modelId: 'pro',
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    expect(await screen.findByText('Session results')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save to Vault' }));

    await waitFor(() => {
      expect(screen.getByText('Saved to NPC Vault as "Imageshop result".')).toBeTruthy();
    });
    expect(getGenerations('supporting_reference')[0]).toMatchObject({
      url: 'data:image/png;base64,session-result',
      seed: 42,
      supportingLabel: 'Imageshop result',
    });
  });

  it('saves the current output to the Character Vault through the existing vault helper', async () => {
    useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,character-result',
      seed: 101,
      prompt: 'Character Imageshop result',
      aspectRatio: '1:1',
      context: 'character',
      modelId: 'pro',
      provenance: {
        source: 'imageshop-panel-queue',
        sourceQueueId: 'writer-issue-series-1',
        sourcePanelId: 'issue-1-page-1-panel-1',
        capturedAt: '2026-06-05T12:00:00.000Z',
        writer: {
          seriesId: 'series-1',
          issueTitle: 'Obsidian Canon Smoke',
          pageNumber: 1,
          panelNumber: 1,
        },
        generation: {
          model: 'pro',
          aspectRatio: '1:1',
          destination: 'production-version',
        },
        prompt: {
          composed: 'Character Imageshop result',
          sections: {
            main: 'Character Imageshop result',
          },
        },
        canon: [
          {
            id: 'lore-flux',
            title: 'Flux',
            category: 'character',
            source: 'obsidian',
            summary: 'Gold eyes, cobalt coat, and a white comet badge.',
            provenance: {
              obsidianPath: 'Characters/Flux.md',
              writerLoreCardId: 'lore-flux',
            },
          },
        ],
        references: [],
      },
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    await screen.findByText('Session results');
    fireEvent.click(screen.getByRole('button', { name: 'Character Vault' }));
    fireEvent.change(screen.getByLabelText('Profile name'), {
      target: { value: 'Flux Prime' },
    });
    fireEvent.change(screen.getByLabelText('Cast name (optional)'), {
      target: { value: 'Flux' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save to Vault' }));

    await waitFor(() => {
      expect(screen.getByText('Saved to Character Vault as "Flux Prime".')).toBeTruthy();
    });
    expect(arcsPersistenceMocks.saveImportedImageToCharacterVault).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: 'data:image/png;base64,character-result',
        baseName: 'Flux Prime',
        profileName: 'Flux Prime',
        castName: 'Flux',
        seed: 101,
        processing: expect.objectContaining({
          generationProvenance: expect.objectContaining({
            sourcePanelId: 'issue-1-page-1-panel-1',
            canon: [
              expect.objectContaining({
                id: 'lore-flux',
                source: 'obsidian',
              }),
            ],
          }),
        }),
      }),
    );
    expect(getGenerations('character')[0]).toMatchObject({
      url: 'data:image/png;base64,character-cloud-save',
      seed: 101,
      profileName: 'Flux Prime',
      castName: 'Flux',
    });
  });

  it('saves the current output to the Asset Vault through the existing vault helper', async () => {
    useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,asset-result',
      seed: 202,
      prompt: 'Asset Imageshop result',
      aspectRatio: '21:9',
      context: 'asset',
      modelId: 'pro',
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    await screen.findByText('Session results');
    fireEvent.click(screen.getByRole('button', { name: 'Asset Vault' }));
    fireEvent.change(screen.getByLabelText('Collection name'), {
      target: { value: 'Sky Observatory' },
    });
    fireEvent.change(screen.getByLabelText('Asset name (optional)'), {
      target: { value: 'Main Dome' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save to Vault' }));

    await waitFor(() => {
      expect(screen.getByText('Saved to Asset Vault collection "Sky Observatory".')).toBeTruthy();
    });
    expect(arcsPersistenceMocks.saveImportedImageToAssetVault).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: 'data:image/png;base64,asset-result',
        baseName: 'Sky Observatory',
        collectionName: 'Sky Observatory',
        assetName: 'Main Dome',
        seed: 202,
      }),
    );
    expect(getGenerations('asset')[0]).toMatchObject({
      url: 'data:image/png;base64,asset-cloud-save',
      seed: 202,
      collectionName: 'Sky Observatory',
      assetName: 'Main Dome',
    });
  });

  it('downloads the current generated output without rerunning generation', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,download-result',
      seed: 303,
      prompt: 'Download Imageshop result',
      aspectRatio: '9:16',
      context: 'character',
      modelId: 'pro',
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    await screen.findByText('Session results');
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Downloaded the current generated image.')).toBeTruthy();
    clickSpy.mockRestore();
  });

  it('keeps the Guided Comic Flow panel return action wired after restoring a generated result', async () => {
    const guidedHandoff: GuidedImageWorkshopHandoff = {
      source: 'guided-comic',
      currentStep: 'art',
      returnTarget: 'guided-comic-art',
      sourceLabel: 'Guided Comic Flow · Page 2, Panel 3',
      workspace: {
        projectId: 'guided-project-7',
        writerIssueId: 'writer-issue-7',
      },
      panelId: 'page-2-panel-3',
      pageNumber: 2,
      panelNumber: 3,
      panelBeat: 'Flux finds the engine.',
      characters: [
        {
          name: 'flux',
          displayName: 'Flux',
          imageUrl: 'https://example.com/flux.png',
          sourceType: 'character',
        },
      ],
      locations: [],
      npcs: [],
    };
    useImageWorkshopBridge.getState().requestGuidedComicHandoff(guidedHandoff);
    useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,guided-return',
      seed: 77,
      prompt: 'Guided panel result',
      aspectRatio: '9:16',
      context: 'character',
      modelId: 'pro',
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    await screen.findByText(/Loaded panel from Guided Comic Flow/i);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Send back to Guided Comic Flow' }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Send back to Guided Comic Flow' })[0]);

    expect(useImageWorkshopBridge.getState().portalToOpen).toBe('comic');
    expect(useImageWorkshopBridge.getState().guidedPanelReturn).toMatchObject({
      panelId: 'page-2-panel-3',
      pageNumber: 2,
      panelNumber: 3,
      imageUrl: 'data:image/png;base64,guided-return',
      seed: 77,
      workspace: {
        projectId: 'guided-project-7',
        writerIssueId: 'writer-issue-7',
      },
    });
  });

  it('injects approved production item versions as production references', async () => {
    const item = useImageshopProductionStore.getState().addProductionItem({
      label: 'Approved Sky Observatory',
      sourceKind: 'comic-page',
      prompt: 'Approved environment plate.',
      promptSections: {
        main: 'Approved environment plate.',
      },
    });
    useImageshopProductionStore.getState().addProductionVersion(item.id, {
      imageUrl: 'data:image/png;base64,approved-reference',
      seed: 9,
      prompt: 'Approved environment plate.',
      kind: 'generated',
    });
    useImageshopProductionStore.getState().updateProductionItemStatus(item.id, 'approved');

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Comic Pages' }));
    fireEvent.change(screen.getByPlaceholderText('Describe the image you want...'), {
      target: { value: 'Use production continuity.' },
    });

    expect(await screen.findByText(/Approved production reference/i)).toBeTruthy();
    expect(screen.getAllByText(/Approved Sky Observatory/i).length).toBeGreaterThan(0);
  });

  it('exposes unified output destinations with preview-aware labels', async () => {
    useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,output-destinations',
      seed: 91,
      prompt: 'Output destination test.',
      aspectRatio: '9:16',
      context: 'character',
      modelId: 'pro',
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Save preview to Character Vault' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save preview to Asset Vault' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save preview to NPC Vault' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Assign preview to selected beat' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create a new beat from preview' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export Imageshop production JSON' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export Writer image map' })).toBeTruthy();
  });

  it('revokes an owned uploaded reference URL when the reference is removed', () => {
    vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:owned-reference-remove');
    const revokeObjectURL = vi.mocked(URL.revokeObjectURL);

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Upload$/), {
      target: {
        files: [new File(['reference'], 'reference.png', { type: 'image/png' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove reference' }));

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:owned-reference-remove');
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('revokes owned uploaded reference URLs when references are cleared', () => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce('blob:owned-reference-clear-one')
      .mockReturnValueOnce('blob:owned-reference-clear-two');
    const revokeObjectURL = vi.mocked(URL.revokeObjectURL);

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Upload$/), {
      target: {
        files: [
          new File(['reference-one'], 'reference-one.png', { type: 'image/png' }),
          new File(['reference-two'], 'reference-two.png', { type: 'image/png' }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:owned-reference-clear-one');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:owned-reference-clear-two');
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('revokes owned uploaded reference URLs when studio references replace them', () => {
    vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:owned-reference-replace');
    const revokeObjectURL = vi.mocked(URL.revokeObjectURL);
    useCharacterStudioStore.setState({
      referenceImageUrls: ['https://example.test/character-reference.png'],
    });

    render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Upload$/), {
      target: {
        files: [new File(['reference'], 'reference.png', { type: 'image/png' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Replace with Character refs' }));

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:owned-reference-replace');
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('revokes owned reference and page-background URLs on unmount', async () => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce('blob:owned-reference-unmount')
      .mockReturnValueOnce('blob:owned-page-background-unmount');
    const revokeObjectURL = vi.mocked(URL.revokeObjectURL);

    const { unmount } = render(
      <GenericImageLabPanel
        selectedBeat={null}
        productionCast={[]}
        productionAssets={[]}
        productionSupportingRefs={[]}
        onUseAsSelectedBeat={vi.fn()}
        onCreateNewBeat={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Upload$/), {
      target: {
        files: [new File(['reference'], 'reference.png', { type: 'image/png' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Comic Pages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page setup' }));
    expect(await screen.findByText('Art Style Library')).toBeTruthy();
    const pageBackgroundInput = screen.getByText('Upload page background').querySelector('input');
    expect(pageBackgroundInput).toBeInstanceOf(HTMLInputElement);
    fireEvent.change(pageBackgroundInput as HTMLInputElement, {
      target: {
        files: [new File(['background'], 'background.png', { type: 'image/png' })],
      },
    });

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:owned-reference-unmount');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:owned-page-background-unmount');
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
