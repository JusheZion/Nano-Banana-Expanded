/**
 * Shared preview frame sizing for Character Studio, Asset Studio, and Storyline Image Lab.
 * Keeps portrait/square/landscape generations readable in the dedicated preview pane.
 */

import type { CSSProperties } from 'react';

export type StudioPreviewAspectId = '9:16' | '1:1' | '21:9';

export function studioPreviewAspectCss(id: StudioPreviewAspectId): string {
  if (id === '21:9') return '21 / 9';
  if (id === '1:1') return '1 / 1';
  return '9 / 16';
}

export type StudioPreviewLayoutMode = 'single' | 'compare' | 'stage' | 'stageCompare';

/** Max height for the framed preview (object-contain inside). */
export function studioPreviewMaxHeightCss(
  id: StudioPreviewAspectId,
  mode: StudioPreviewLayoutMode = 'single'
): string {
  const isCompare = mode === 'compare' || mode === 'stageCompare';
  const isStage = mode === 'stage' || mode === 'stageCompare';

  if (isStage) {
    if (id === '21:9') {
      return isCompare
        ? 'min(28vh, calc(100vh - 22rem))'
        : 'min(36vh, calc(100vh - 18rem))';
    }
    if (id === '1:1') {
      return isCompare
        ? 'min(42vh, calc(100vh - 20rem))'
        : 'min(50vh, calc(100vh - 17rem))';
    }
    return isCompare
      ? 'min(44vh, calc(100vh - 19rem))'
      : 'min(52vh, calc(100vh - 16rem))';
  }

  if (id === '21:9') {
    return isCompare
      ? 'min(44vh, calc(100vh - 15rem))'
      : 'min(58vh, calc(100vh - 11rem))';
  }
  if (id === '1:1') {
    return isCompare
      ? 'min(68vh, calc(100vh - 15rem))'
      : 'min(84vh, calc(100vh - 9rem))';
  }
  return isCompare
    ? 'min(76vh, calc(100vh - 13rem))'
    : 'min(86vh, calc(100vh - 9rem))';
}

/**
 * Preview frame: explicit height (same as max-height) + aspect-ratio + width auto.
 * Browsers then compute width from height and aspect; maxWidth caps overflow in narrow columns.
 * Inner image layer should use absolute inset-0 (not w-full h-full of an undefined-height parent).
 */
export function studioPreviewFrameStyle(
  id: StudioPreviewAspectId,
  mode: StudioPreviewLayoutMode = 'single'
): CSSProperties {
  const mh = studioPreviewMaxHeightCss(id, mode);
  return {
    aspectRatio: studioPreviewAspectCss(id),
    height: mh,
    maxHeight: mh,
    width: 'auto',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    position: 'relative',
  };
}
