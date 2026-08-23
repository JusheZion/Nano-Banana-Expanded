import Konva from 'konva';
import type { CodexBaseObject } from '../types/codexObjects';

/**
 * Shared shadow / glow / blur props for every Konva node on a plate.
 *
 * Shadow and glow are both Konva's shadow: glow is simply an unoffset shadow,
 * so only one can be expressed natively at a time — glow wins when both are
 * set, matching how the comic engine treats them.
 *
 * Blur is different in kind: it needs `filters` plus a cached node, so the
 * caller must call `applyBlurCache` after mount and on size change.
 */
export function nodeEffectProps(object: CodexBaseObject): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  if (object.glow && object.glow.blur > 0) {
    props.shadowColor = object.glow.color;
    props.shadowBlur = object.glow.blur;
    props.shadowOpacity = object.glow.opacity;
    props.shadowOffset = { x: 0, y: 0 };
  } else if (object.shadow && (object.shadow.blur > 0 || object.shadow.opacity > 0)) {
    props.shadowColor = object.shadow.color;
    props.shadowBlur = object.shadow.blur;
    props.shadowOpacity = object.shadow.opacity;
    props.shadowOffset = { x: object.shadow.offsetX, y: object.shadow.offsetY };
  }

  if (object.blur && object.blur > 0) {
    props.filters = [Konva.Filters.Blur];
    props.blurRadius = object.blur;
  }

  return props;
}

/**
 * Konva can only run filters on a cached node. Call this whenever blur or the
 * node's size changes; it clears the cache when blur is off so unblurred
 * objects stay live (uncached nodes redraw without re-rasterising).
 */
export function applyBlurCache(node: Konva.Node | null, blur: number | undefined): void {
  if (!node) return;
  if (blur && blur > 0) {
    node.cache();
  } else if (node.isCached()) {
    node.clearCache();
  }
}
