import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenericImageLabPanel } from '@/portals/storyline/GenericImageLabPanel';
import { normalizeImageshopJson } from '@/portals/storyline/imageshopJsonSchemas';
import { useImageWorkshopBridge } from '@/stores/imageWorkshopBridge';
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

vi.mock('@/shared/api/arcsPersistence', () => arcsPersistenceMocks);

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
  localStorage.clear();
  sessionStorage.clear();
  useImageWorkshopBridge.setState({
    portalToOpen: null,
    draft: null,
    guidedHandoff: null,
    guidedPanelReturn: null,
  });
  useImageshopProductionStore.setState(useImageshopProductionStore.getInitialState(), true);
  useImageshopSessionStore.setState({
    results: [],
    activeResultId: null,
  });
  arcsPersistenceMocks.saveImportedImageToCharacterVault.mockClear();
  arcsPersistenceMocks.saveImportedImageToAssetVault.mockClear();
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
    expect(screen.getByRole('button', { name: 'Page setup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Batch JSON' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review' })).toBeTruthy();
    expect(screen.queryByText('Art Style Library')).toBeNull();
    expect(screen.queryByText('JSON Production Batch')).toBeNull();
    expect(screen.queryByText('Production Dashboard')).toBeNull();

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

    fireEvent.click(screen.getByRole('button', { name: 'Page setup' }));

    expect(screen.getByRole('button', { name: 'Set generation aspect ratio to Portrait' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Set generation aspect ratio to Square' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Set generation aspect ratio to Cinematic' })).toBeTruthy();
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
    expect(screen.getByText('Flux identity')).toBeTruthy();
    expect(screen.getByText('Output Destinations')).toBeTruthy();
    expect(screen.getByText('Vault save')).toBeTruthy();
    expect(screen.getByText('Writer image map')).toBeTruthy();
    expect(screen.getByText('Guided return')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Load selected panel prompt' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generate selected panel' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Retry selected panel' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Retry unlocks after the selected panel fails.')).toBeTruthy();

    const cockpit = screen.getByText('Writer Pages Cockpit');
    fireEvent.click(screen.getByRole('button', { name: 'Batch JSON' }));
    const legacyBatch = screen.getByText('JSON Production Batch');
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    const dashboard = screen.getByText('Production Dashboard');
    expect(cockpit.compareDocumentPosition(legacyBatch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cockpit.compareDocumentPosition(dashboard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    useImageWorkshopBridge.getState().requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'art',
      returnTarget: 'guided-comic-art',
      sourceLabel: 'Guided Comic Flow · Page 2, Panel 3',
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
    });
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
});
