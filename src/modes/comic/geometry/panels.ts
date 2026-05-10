import { clampRectToPage, roundRect, type ComicRect, type ComicRectClampOptions, type ComicRectDelta } from './rects';

export type PanelResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export function movePanelRect(rect: ComicRect, delta: ComicRectDelta, options: ComicRectClampOptions = {}): ComicRect {
  return clampRectToPage(
    {
      ...rect,
      x: rect.x + delta.x,
      y: rect.y + delta.y,
    },
    options,
  );
}

export function resizePanelRect(
  rect: ComicRect,
  handle: PanelResizeHandle,
  delta: ComicRectDelta,
  options: ComicRectClampOptions = {},
): ComicRect {
  const minWidth = options.minWidth ?? 0.02;
  const minHeight = options.minHeight ?? 0.02;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  let x = rect.x;
  let y = rect.y;
  let width = rect.width;
  let height = rect.height;

  if (handle.includes('left')) {
    width = Math.max(minWidth, rect.width - delta.x);
    x = right - width;
  }
  if (handle.includes('right')) {
    width = Math.max(minWidth, rect.width + delta.x);
  }
  if (handle.includes('top')) {
    height = Math.max(minHeight, rect.height - delta.y);
    y = bottom - height;
  }
  if (handle.includes('bottom')) {
    height = Math.max(minHeight, rect.height + delta.y);
  }

  return clampRectToPage(roundRect({ x, y, width, height }), { ...options, minWidth, minHeight });
}
