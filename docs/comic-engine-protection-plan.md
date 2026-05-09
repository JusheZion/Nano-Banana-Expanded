# Comic Engine Protection Plan

## Purpose

This document protects the existing Advanced Comics Studio / Comic Portal behavior before any schema, geometry, adapter, or engine modernization work begins.

The current comic editor contains hard-won behavior across panels, balloons, layers, masks, transforms, image preservation, save/load, export, and Guided Flow handoff. Future modernization must wrap and prove that behavior before replacing it.

## Non-Negotiable Preservation Rules

- Do not delete, replace, simplify, or rewrite existing panel, balloon, layer, mask, export, image-preservation, or transform logic unless the replacement is first proven in the UI.
- Keep legacy functions and rendering paths available until side-by-side behavior has been manually verified.
- Add shared types, adapters, or geometry helpers beside the current implementation first.
- Route Guided Flow through shared adapters gradually, with focused tests around the bridge contract.
- Treat UI proof as required for replacements that affect Konva rendering, clipping, dragging, resizing, transforms, layer order, exports, or persisted project compatibility.
- Preserve current save/load compatibility. New schemas must read existing project files and preserve older fields unless a migration is explicitly designed and verified.
- Preserve the Advanced Comics Studio escape hatch from Guided Flow.

## Protected Current Surfaces

### `src/modes/comic/engine/ComicCanvas.tsx`

Protect stage selection, page targeting, drag/drop, drawing, knife/split flow, snapping overlays, export triggers, PNG current-page export, PDF all-page export, zoom-aware export capture, and integration with panels, balloons, overlays, and layer order.

### `src/modes/comic/components/ComicPanel.tsx`

Protect panel rendering, panel shape behavior, clipping and masking, border rendering, image fill modes, focus/zoom, image preservation when shape or size changes, drag/resize/rotate transforms, polygon vertex behavior, circular path panels, gradient/texture handling, and content edit mode.

Protected panel behavior includes rectangle/rect panels, polygon/custom panels where present, ellipse/oval/circle panels, half-circle panels, quarter-circle panels, sector panels, curved-path panel behavior, panel splitting, snapping, locking, visibility, and panel image clipping.

### `src/modes/comic/components/BalloonNode.tsx`

Protect balloon body rendering, style-specific paths, balloon tails and pointers, tail flip/snap behavior, text rendering, text box transform behavior, text sizing, alignment, warp/WordArt behavior, stroke/fill/gradient/texture/shadow/glow effects, drag/resize/rotate transforms, lock/visibility handling, and selection transformer behavior.

### `src/modes/comic/components/LayerTree.tsx`

Protect layer selection sync, front-to-back ordering, drag reorder, visibility toggles, lock toggles, grouped layer display, expanded group children, group reorder behavior, and z-order rendering expectations.

### `src/stores/comicStore.ts`

Protect the persisted comic state shape, panel/balloon/drawing/page mutations, undo snapshot behavior, layer order behavior, group behavior, save/load serialization, export state, panel templates, split panel logic, balloon tail snapping, and Guided-to-Advanced page replacement.

### `src/stores/guidedComicLayoutBridge.ts`

Protect the one-shot Guided Flow layout handoff contract, synchronous consume-and-clear behavior, 800x1200 Advanced Studio target mapping, selected panel image preservation, panel prompt/beat preservation, and image focus/zoom metadata.

### `src/portals/guided-comic/GuidedComicFlow.tsx`

Protect the existing Guided Flow to Advanced Comics Studio handoff path, the visible Advanced Studio escape hatch, local draft behavior, layout preview state, panel art image state, and existing Imageshop return/handoff assumptions.

## Modernization Path

1. Add shared types and adapters around the current working implementation.
2. Build new schema and geometry utilities beside the existing system first.
3. Keep current rendering and store mutation paths active while adapters are introduced.
4. Route Guided Flow through shared adapters gradually.
5. Add focused tests around any adapter or bridge contract before touching UI routing.
6. Manually verify side-by-side UI behavior before switching a production path.
7. Keep legacy functions available until replacement behavior is verified in the UI.
8. Remove old code only after the replacement has passed the removal gate below.

## Removal gate

Before deleting, replacing, or bypassing existing comic engine logic, the implementer must provide evidence for all applicable items:

- The old behavior and new behavior were exercised side-by-side in the UI.
- The regression checklist below was completed for the affected area.
- Existing project save/load still works with older saved project JSON.
- Export output still preserves clipping, masks, borders, layer order, images, and balloons.
- Guided-to-Advanced handoff still imports the intended page, panel images, prompts, focus, zoom, and layout geometry.
- Focused tests were added or updated for any changed schema, adapter, bridge, or store behavior.
- `npm run build` and `npm run lint` were run unless the change is explicitly documentation-only.
- Any skipped verification is documented with the reason and risk.

No removal is allowed when UI behavior has only been inferred from code inspection.

## Regression checklist

Use this checklist before and after any comic engine modernization that affects the listed area.

### Panels

- [ ] Create a rectangle/rect panel.
- [ ] Create an ellipse/oval/circle panel.
- [ ] Create a half-circle panel.
- [ ] Create a quarter-circle panel.
- [ ] Create a sector panel and adjust sector angle where controls are available.
- [ ] Create or preserve polygon/custom panel behavior where present.
- [ ] Change an existing panel between supported shapes without losing its image.
- [ ] Drag a panel.
- [ ] Resize a panel.
- [ ] Rotate a panel.
- [ ] Split a panel horizontally.
- [ ] Split a panel vertically.
- [ ] Split a panel with slant controls where available.
- [ ] Confirm snapping guides still appear and panel movement remains stable.
- [ ] Confirm panel borders render correctly for each supported shape.
- [ ] Confirm panel fill gradients still render.
- [ ] Confirm panel textures still render.
- [ ] Confirm panel lock prevents editing.
- [ ] Confirm panel visibility hides and restores the panel without deleting state.

### Image Preservation, Masks, and Clipping

- [ ] Add an image to a panel.
- [ ] Change panel shape while preserving `imageUrl`.
- [ ] Resize panel while preserving image assignment.
- [ ] Rotate panel while preserving image assignment.
- [ ] Change image fill mode where controls are available.
- [ ] Adjust image focus X/Y where controls are available.
- [ ] Adjust image zoom/scale where controls are available.
- [ ] Confirm image clipping matches the visible panel shape.
- [ ] Confirm masks/clipping work for rectangle, ellipse/circle, circular-path, sector, and polygon/custom panels where present.
- [ ] Confirm Guided-imported panel images survive Advanced Studio edits.

### Balloons

- [ ] Create a round speech balloon.
- [ ] Create a rounded rectangle / modern square balloon.
- [ ] Create a thought/cloud balloon.
- [ ] Create a shout/spiky balloon.
- [ ] Create narration and floating text styles where available.
- [ ] Edit balloon text.
- [ ] Resize balloon body.
- [ ] Drag balloon body.
- [ ] Rotate balloon body.
- [ ] Move or edit balloon tail/pointer.
- [ ] Flip balloon tail where available.
- [ ] Snap balloon tail to panel edge where available.
- [ ] Confirm curved, straight, spiky, and bubble tail behavior where present.
- [ ] Change text size and confirm it stays positioned inside the balloon.
- [ ] Change horizontal and vertical text alignment.
- [ ] Edit text box transform offset/scale.
- [ ] Apply text warp / WordArt behavior.
- [ ] Apply text stroke and secondary stroke.
- [ ] Apply fill, border, gradient, texture, shadow, and glow effects.
- [ ] Confirm lock prevents editing.
- [ ] Confirm visibility hides and restores the balloon without deleting state.

### Layers

- [ ] Select a panel from the layer tree and confirm canvas selection sync.
- [ ] Select a balloon from the layer tree and confirm canvas selection sync.
- [ ] Drag reorder layers and confirm canvas z-order changes.
- [ ] Toggle visibility for panels, balloons, and drawings.
- [ ] Toggle lock for panels, balloons, and drawings.
- [ ] Create a group where available.
- [ ] Expand and collapse grouped layer rows.
- [ ] Reorder a group and confirm all group members preserve relative order.
- [ ] Ungroup and confirm elements remain on the canvas.
- [ ] Confirm hidden or locked layers persist through save/load.

### Save/Load

- [ ] Save/export project JSON through the existing project serialization path.
- [ ] Load the saved project JSON.
- [ ] Confirm panels preserve shape, position, size, rotation, points, images, fill mode, focus, zoom, borders, gradients, textures, lock, and visibility.
- [ ] Confirm balloons preserve style, text, tail, text box transform, alignment, warp, effects, lock, and visibility.
- [ ] Confirm layer order is preserved.
- [ ] Confirm groups are preserved.
- [ ] Confirm page settings are preserved.
- [ ] Confirm panel templates are preserved where present.
- [ ] Confirm older project JSON remains load-compatible.

### Export

- [ ] Export current page as PNG.
- [ ] Export all pages as PDF.
- [ ] Confirm exported output uses the intended 800x1200 page framing.
- [ ] Confirm images remain clipped to panel masks in export.
- [ ] Confirm borders render in export.
- [ ] Confirm balloons and tails render in export.
- [ ] Confirm text sizing and positioning render in export.
- [ ] Confirm layer order in export matches the canvas.
- [ ] Confirm hidden layers stay hidden in export.
- [ ] Confirm locked layers still render but remain non-editable in the UI.

### Guided-to-Advanced Handoff

- [ ] Open Guided Comic Flow.
- [ ] Assign panel art images to a guided page.
- [ ] Open the page in Advanced Comics Studio.
- [ ] Confirm the handoff consumes once and does not duplicate on remount.
- [ ] Confirm imported panels map to the 800x1200 Advanced Studio page.
- [ ] Confirm panel count matches the guided page.
- [ ] Confirm panel images are preserved.
- [ ] Confirm panel prompts or beats are preserved where expected.
- [ ] Confirm image fit, focus, and zoom metadata are preserved.
- [ ] Confirm layer order is initialized correctly.
- [ ] Confirm the Advanced Comics Studio escape hatch remains visible from Guided Flow.
- [ ] Confirm returning to Guided Flow does not destroy the guided draft.

## Future Verification Commands

For documentation-only changes, use targeted file and phrase checks.

For any future engine, schema, adapter, geometry, bridge, or UI behavior change, run the relevant subset of:

```bash
npm run test -- guidedComicLayoutBridge guidedComicLayoutImport
npm run build
npm run lint
```

Also perform manual Browser UI checks for any change that affects Konva rendering, drag/resize behavior, clipping, masks, export output, layer ordering, balloon editing, or Guided-to-Advanced handoff.

## Operator Notes

- This plan is a protection artifact, not a modernization implementation.
- Do not treat this document as permission to change schemas, geometry, rendering, or persistence.
- When future work introduces adapters, keep them additive until UI proof confirms they preserve the current behavior.
- If a replacement cannot be proven in the UI, keep the existing implementation path active.
