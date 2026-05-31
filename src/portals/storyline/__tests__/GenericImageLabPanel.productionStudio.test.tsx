import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenericImageLabPanel } from '@/portals/storyline/GenericImageLabPanel';
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
    expect(screen.getByText('Art Style Library')).toBeTruthy();
    expect(screen.getByText('Continuity Lock')).toBeTruthy();
    expect(screen.getByText('JSON Production Batch')).toBeTruthy();
    expect(screen.getByText('Production Dashboard')).toBeTruthy();
    expect(screen.getByText('Refinement Workspace')).toBeTruthy();
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

    expect(await screen.findByText('Observatory arrival')).toBeTruthy();
    expect(useImageshopProductionStore.getState().productionItems[0]).toMatchObject({
      sourceId: 'beat-1',
      status: 'draft',
      prompt: 'Flux arrives at the observatory.',
    });
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
