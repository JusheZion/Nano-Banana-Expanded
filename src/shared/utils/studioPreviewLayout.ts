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

/** Max height for the framed preview (object-contain inside). */
export function studioPreviewMaxHeightCss(
  id: StudioPreviewAspectId,
  mode: 'single' | 'compare' = 'single'
): string {
  if (id === '21:9') {
    return mode === 'compare'
      ? 'min(44vh, calc(100vh - 15rem))'
      : 'min(58vh, calc(100vh - 11rem))';
  }
  if (id === '1:1') {
    return mode === 'compare'
      ? 'min(68vh, calc(100vh - 15rem))'
      : 'min(84vh, calc(100vh - 9rem))';
  }
  return mode === 'compare'
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
  mode: 'single' | 'compare' = 'single'
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
