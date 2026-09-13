import { useCallback, useEffect, useRef } from 'react';
import type { ObsidianLoreEntry, ObsidianLoreImage } from '@/portals/writer/obsidianLoreImport';
import { makeImageObject, useCodexStore } from '@/stores/codexStore';
import type { CodexObject, CodexPlate } from '../types/codexObjects';
import { resolveImageSrc } from '../vault/vaultBinding';
import { probeImageDimensions } from '../vault/vaultImages';

interface VaultImagePlacementOptions {
  documentId: string;
  plate: CodexPlate | undefined;
  selected: CodexObject[];
  placeCentre: (size: number) => { x: number; y: number };
  applyPatches: (entries: Array<{ id: string; patch: Partial<CodexObject> }>) => void;
  addObject: (object: CodexObject, plateId?: string) => void;
  flash: (message: string) => void;
}

/**
 * Owns the asynchronous lifecycle for putting a vault image on a plate.
 * Placement remains tied to the document and plate that initiated it, and a
 * document switch or unmount cancels the pending browser image probe.
 */
export function useVaultImagePlacement({
  documentId,
  plate,
  selected,
  placeCentre,
  applyPatches,
  addObject,
  flash,
}: VaultImagePlacementOptions) {
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), [documentId]);

  return useCallback((entry: ObsidianLoreEntry, image: ObsidianLoreImage) => {
    controllerRef.current?.abort();
    const src = resolveImageSrc(entry, image.reference);
    if (!src) {
      flash('That picture could not be read from the vault.');
      return;
    }
    const binding = {
      notePath: entry.sourcePath,
      field: image.reference,
      mode: 'live' as const,
      resolvedAt: new Date().toISOString(),
    };

    const existing = selected.find((object) => object.kind === 'image');
    if (existing) {
      applyPatches([{ id: existing.id, patch: { src, binding } }]);
      flash(`Picture bound to “${image.fileName || image.reference}”.`);
      return;
    }

    if (!plate) return;
    const targetPlateId = plate.id;
    const width = Math.min(420, plate.width * 0.5);
    const position = placeCentre(width);
    const controller = new AbortController();
    controllerRef.current = controller;

    void probeImageDimensions(src, controller.signal)
      .then(({ width: naturalWidth, height: naturalHeight }) => {
        const current = useCodexStore.getState().doc;
        if (current.id !== documentId
          || !current.plates.some((candidate) => candidate.id === targetPlateId)) return;
        const height = Math.round(width * naturalHeight / Math.max(1, naturalWidth));
        addObject(makeImageObject({
          ...position,
          width,
          height,
          src,
          name: image.fileName || image.reference,
          binding,
        }), targetPlateId);
        flash(`Placed “${image.fileName || image.reference}”.`);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          flash('That picture could not be read from the vault.');
        }
      })
      .finally(() => {
        if (controllerRef.current === controller) controllerRef.current = null;
      });
  }, [documentId, plate, selected, placeCentre, applyPatches, addObject, flash]);
}
