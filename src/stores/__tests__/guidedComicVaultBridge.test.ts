import { beforeEach, describe, expect, it } from 'vitest';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';

beforeEach(() => {
  useGuidedComicVaultBridge.setState({
    portalToOpen: null,
    pendingTarget: null,
    selection: null,
  });
});

describe('useGuidedComicVaultBridge', () => {
  it('can request a panel art image from Image Vault', () => {
    useGuidedComicVaultBridge.getState().requestVaultSelection({
      type: 'panel-art',
      name: 'page-2-panel-3',
    });

    expect(useGuidedComicVaultBridge.getState().portalToOpen).toBe('reference');
    expect(useGuidedComicVaultBridge.getState().pendingTarget).toEqual({
      type: 'panel-art',
      name: 'page-2-panel-3',
    });
  });

  it('can request an NPC reference from Image Vault', () => {
    useGuidedComicVaultBridge.getState().requestVaultSelection({
      type: 'npc',
      name: 'Alley witness',
    });

    expect(useGuidedComicVaultBridge.getState().portalToOpen).toBe('reference');
    expect(useGuidedComicVaultBridge.getState().pendingTarget).toEqual({
      type: 'npc',
      name: 'Alley witness',
    });
  });

  it('returns a selected vault image to the comic portal', () => {
    useGuidedComicVaultBridge.getState().selectVaultReference({
      type: 'panel-art',
      name: 'page-2-panel-3',
      referenceId: 'vault-image-1',
      imageUrl: 'https://example.com/panel.png',
      sourceType: 'asset',
      sourceLabel: 'Finished panel art',
      displayName: 'Finished panel art',
      collectionName: 'Page renders',
      imageLabel: 'Finished panel art',
    });

    expect(useGuidedComicVaultBridge.getState().portalToOpen).toBe('comic');

    const selection = useGuidedComicVaultBridge.getState().consumeSelection();

    expect(selection).toMatchObject({
      type: 'panel-art',
      name: 'page-2-panel-3',
      imageUrl: 'https://example.com/panel.png',
      sourceLabel: 'Finished panel art',
      displayName: 'Finished panel art',
      collectionName: 'Page renders',
      imageLabel: 'Finished panel art',
    });
  });

  it('returns a selected NPC Vault image to the comic portal', () => {
    useGuidedComicVaultBridge.getState().selectVaultReference({
      type: 'npc',
      name: 'Alley witness',
      referenceId: 'npc-ref-1',
      imageUrl: 'https://example.com/alley-witness.png',
      sourceType: 'npc',
      sourceLabel: 'Alley witness turnaround',
      displayName: 'Alley witness turnaround',
      imageLabel: 'Alley witness turnaround',
    });

    const selection = useGuidedComicVaultBridge.getState().consumeSelection();

    expect(selection).toMatchObject({
      type: 'npc',
      name: 'Alley witness',
      sourceType: 'npc',
      imageUrl: 'https://example.com/alley-witness.png',
      displayName: 'Alley witness turnaround',
      imageLabel: 'Alley witness turnaround',
    });
  });

  it('consumes a selected vault image only once', () => {
    useGuidedComicVaultBridge.getState().selectVaultReference({
      type: 'character',
      name: 'Flux',
      referenceId: 'vault-image-2',
      imageUrl: 'https://example.com/flux.png',
      sourceType: 'character',
      sourceLabel: 'Flux pose',
      displayName: 'Flux pose',
      profileName: 'Flux',
      castName: 'Flux pose',
    });

    expect(useGuidedComicVaultBridge.getState().consumeSelection()?.referenceId).toBe('vault-image-2');
    expect(useGuidedComicVaultBridge.getState().consumeSelection()).toBeNull();
  });
});
