# Comic Object Schema Audit

Date: 2026-05-09

## Purpose

This is a behavior-preserving audit of the current Advanced Comics Studio / Comic Portal object and editor state model. It documents the fields that exist today, where they are rendered or serialized, where contracts are unclear, and how current fields could map to future canonical object fields.

This document does not authorize refactors. No implementation behavior, schema, geometry, adapter, renderer, store, bridge, save/load, export, or Guided Flow logic should be changed from this audit alone.

## Files inspected

- `src/modes/comic/components/ComicPanel.tsx`
- `src/modes/comic/engine/ComicCanvas.tsx`
- `src/modes/comic/components/BalloonNode.tsx`
- `src/modes/comic/components/FloatingAsset.tsx`
- `src/modes/comic/components/LayerTree.tsx`
- `src/modes/comic/layouts/ComicLayout.tsx`
- `src/stores/comicStore.ts`
- `src/stores/guidedComicLayoutBridge.ts`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicLayoutPlan.ts`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `src/portals/guided-comic/guidedComicAi.ts`
- `src/types/balloon.ts`
- `src/types/gradient.ts`

## Current Advanced Studio state model

The primary persisted Advanced Studio model is in `useComicStore`.

### Store-level fields

- `projectSettings`: `inclusiveBiasEnabled`, `demographicFocus`, `ribbonPinnedDefault`, `defaultPageBackgroundColor`
- `gutterSize`
- `pageSettings`: `backgroundColor`, `backgroundImage`, `bgOpacity`
- `pages`: `ComicPage[]`
- `currentPageId`
- `currentGenreId`
- `customGenre`
- `layoutMode`: `webtoon | spread`
- `zoomLevel`
- `selectedElementIds`
- `clipboard`: panels, balloons, and drawings only
- `mode`: `layout | content | lettering`
- `exportFormat`: `png | pdf | null`
- `contextMenu`: open state, screen position, context type, target ids, page-local position
- `placePanelAtNextClick`
- `placePanelShape`: `polygon | ellipse`
- `lastCanvasPosition`
- `templates`: saved blank panel templates
- `_autoSaveTick`
- `colorFavorites`
- `colorRecentlyUsed`
- `groupsByPage`: page id -> arrays of grouped element ids
- `textBoxEditBalloonId`: UI-only text box edit target
- drawing and knife mode fields: `isDrawingMode`, `brushColor`, `brushWidth`, `isKnifeMode`

### Page fields

`ComicPage` currently contains:

- `id`
- `panels: Panel[]`
- `balloons: BalloonInstance[]`
- `drawings: Drawing[]`
- `overlays?: OverlayObject[]`
- `background`
- `layerOrder: string[]`
- `isCover?`

Important current split: panels, balloons, and drawings are resolved through `layerOrder` in `ComicCanvas` and `LayerTree`. Floating overlays are stored on `page.overlays` and rendered after the main comic elements, but they are not currently included in `layerOrder` or `LayerTree` resolution.

## Current panel object fields

Defined by `Panel` in `src/stores/comicStore.ts`.

### Identity and shape

- `id`
- `type: 'panel'`
- `shapeType: 'rect' | 'polygon' | 'ellipse' | 'halfCircle' | 'quarterCircle' | 'sector'`
- `points?`: relative polygon/custom points
- `centralAngle?`: sector angle in degrees

### Transform and bounds

- `x`
- `y`
- `width`
- `height`
- `rotation?`
- `flipX?`
- `flipY?`

### Image and prompt

- `imageUrl?`
- `prompt?`
- `imageFillMode?: 'cover' | 'contain' | 'stretch' | 'center' | 'decal'`
- `imageOffsetX?`
- `imageOffsetY?`
- `imageScale?`
- `imageFocusX?`
- `imageFocusY?`

### Visibility, lock, and style

- `isLocked?`
- `isVisible?`
- `strokeColor?`
- `fillGradient?`
- `strokeGradient?`
- `textureId?`
- `textureOpacity?`

### Effects

- `shadowBlur?`
- `shadowOffsetX?`
- `shadowOffsetY?`
- `shadowOpacity?`
- `shadowColor?`
- `glowColor?`
- `glowBlur?`
- `glowSpread?`
- `glowOpacity?`

### Panel rendering notes

- `ComicPanel` derives mask and clipping geometry from `shapeType`, `points`, `width`, `height`, and `centralAngle`.
- `imageUrl` is resolved through `useArcsResolvedSrc`, loaded with `useImage`, and rendered inside a clipped `Group`.
- Image placement is computed from `imageFillMode`, `imageScale`, `imageOffsetX/Y`, `imageFocusX/Y`, and the current shape bounding box.
- Polygon panels use direct point editing and edge dragging.
- Circular path panels use custom SVG path helpers for half-circle, quarter-circle, and sector rendering.
- Panel transform is stored by flattening Konva scale back into `width`/`height` or scaled polygon `points`, then persisting `rotation`.
- `splitPanel` creates two polygon panels and currently clears `imageUrl` on the split results.

## Current balloon object fields

Defined by `BalloonInstance`, `BalloonOverrides`, and `BalloonStyle` in `src/types/balloon.ts`.

### Balloon identity, style, and bounds

- `id`
- `type: 'balloon'`
- `x`
- `y`
- `width`
- `height`
- `rotation?`
- `styleId`
- `fontFamily?`

### Tail and pointer

- `hasTail`
- `tailBasePoint`
- `tailTip`
- `overrides?.tailFlip`

Current rendering primarily uses `tailTip`, body dimensions, style tail behavior, and `tailFlip`. `tailBasePoint` exists on the object but is not the main rendered tail geometry driver in `BalloonNode`.

### Text and typography

- `text`
- `autoSize?`
- `padding?`
- `overrides?.fontFamily`
- `overrides?.fontSize`
- `overrides?.textColor`
- `overrides?.textColorGradient`
- `overrides?.textStroke`
- `overrides?.textStrokeWidth`
- `overrides?.secondaryTextStroke`
- `overrides?.secondaryTextStrokeWidth`
- `overrides?.textWarp`
- `overrides?.textWarpIntensity`
- `overrides?.textLetterSpacing`
- `overrides?.fontWeight`
- `overrides?.fontStyle`
- `overrides?.textDecoration`
- `overrides?.textAlignHorizontal`
- `overrides?.textAlignVertical`
- `textBox?`
- `overrides?.textBox`

### Visibility, lock, and flip

- `flipX?`
- `flipY?`
- `isSelected?`
- `isLocked?`
- `isVisible?`

`isSelected` is injected during render by `ComicCanvas`; it is not part of the durable object identity contract in the same way as `isLocked` or `isVisible`.

### Balloon style and effects

- `overrides?.fill`
- `overrides?.stroke`
- `overrides?.strokeWidth`
- `overrides?.fillGradient`
- `overrides?.strokeGradient`
- `shadowBlur?`
- `shadowOffsetX?`
- `shadowOffsetY?`
- `shadowOpacity?`
- `shadowColor?`
- `glowColor?`
- `glowBlur?`
- `glowSpread?`
- `glowOpacity?`
- `textureId?`
- `textureOpacity?`
- `overrides?.text3DExtrusion`
- `overrides?.text3DExtrusionColor`
- `overrides?.text3DExtrusionAngle`

### Balloon style definitions

`BalloonStyle` currently defines:

- `id`
- `label`
- `kind`
- `fill`
- `stroke`
- `strokeWidth`
- `fontFamily`
- `fontSize`
- `textColor`
- `hasTail`
- `tailStyle`
- `cornerRadius?`
- `spikiness?`
- default text warp/stroke/3D fields

Supported style ids currently include speech, thought, shout, narration, cloud, starburst, scream, double burst, and floating text variants.

## Current image and asset object fields

### Panel image fields

Panel images are embedded directly on `Panel`:

- `imageUrl?`
- `imageFillMode?`
- `imageOffsetX?`
- `imageOffsetY?`
- `imageScale?`
- `imageFocusX?`
- `imageFocusY?`
- `prompt?`

Panel images are not separate Advanced Studio layer objects today.

### Floating overlay fields

Defined by `OverlayObject` in `src/stores/comicStore.ts` and rendered by `FloatingAsset`.

- `id`
- `type: 'image' | 'sfx'`
- `src`
- `text?`
- `x`
- `y`
- `rotation`
- `scaleX`
- `scaleY`
- `zIndex`

Current notes:

- `FloatingAsset` uses a fixed visual size for image overlays.
- SFX overlays render text with fixed font defaults.
- Overlay transforms persist `x`, `y`, `rotation`, `scaleX`, and `scaleY`.
- `zIndex` exists on the object but current canvas rendering maps overlays in array order after main comic elements.
- Overlays are not currently part of `clipboard`, `layerOrder`, or `LayerTree`.

### Drawing fields

Defined by `Drawing` in `src/stores/comicStore.ts`.

- `id`
- `type: 'drawing'`
- `points`
- `stroke`
- `strokeWidth`
- `isLocked?`
- `isVisible?`

Drawings are part of `layerOrder`, layer visibility/lock, delete, copy, paste, and undo snapshots.

### Guided panel art image fields

Guided Flow local panel art uses `PanelArtImageState`:

- `imageUrl`
- `source: 'imageshop' | 'vault' | 'upload' | 'paste'`
- `returnedAt`
- `prompt?`
- `sourceLabel?`

Guided-to-Advanced handoff narrows this into `GuidedComicLayoutPanelImage`:

- `panelId`
- `imageUrl`
- `prompt?`
- `returnedAt?`
- `source?`

## Current transform fields

### Shared object transform pattern

Current transform fields are spread across object types instead of a shared `transform` object.

- Panels: `x`, `y`, `width`, `height`, `rotation?`, `flipX?`, `flipY?`
- Balloons: `x`, `y`, `width`, `height`, `rotation?`, `flipX?`, `flipY?`
- Balloon text box: `offsetX?`, `offsetY?`, `scaleX?`, `scaleY?`
- Overlays: `x`, `y`, `rotation`, `scaleX`, `scaleY`
- Drawings: no explicit object-level transform; geometry is encoded as `points`
- Guided layout panels: normalized `x`, `y`, `w`, `h`, `order`, plus optional `locked`

### Konva transform storage pattern

- Panel and balloon transforms reset Konva node scale to `1` and persist the result into dimensions and rotation.
- Overlay transforms reset local node scale to `1` but persist only the latest Konva transform scale values into `scaleX`/`scaleY`.
- Panel image content edit mode uses image node drag/scale to update `imageOffsetX`, `imageOffsetY`, and `imageScale`.
- Balloon text box edit mode stores text-specific offset and scale inside `overrides.textBox`.

## Current layer fields

### Page layer order

- `ComicPage.layerOrder: string[]` stores element ids from back to front.
- `ComicCanvas` renders panel ids first, then non-panel ids, even though both sets are derived from `layerOrder`.
- `LayerTree` reverses `layerOrder` for the UI so frontmost entries appear at the top.

### Per-object layer flags

- Panels: `isLocked?`, `isVisible?`
- Balloons: `isLocked?`, `isVisible?`
- Drawings: `isLocked?`, `isVisible?`
- Overlays: no current `isLocked` or `isVisible` fields

### Groups

- `groupsByPage: Record<string, string[][]>`
- Each group is an array of element ids.
- Groups are page-scoped and separate from `ComicPage`.
- `LayerTree` renders one group row using a group member id as the sortable row id.
- Group move behavior is applied in `updatePanel` and `updateBalloon` when a grouped member receives position updates.

## Current mask and shape fields

### Panel shape and mask fields

- `shapeType`
- `points?`
- `centralAngle?`
- `width`
- `height`

`ComicPanel` maps these into:

- polygon line path from `points`
- ellipse clip and stroke from `width`/`height`
- half-circle path from `getHalfCirclePath`
- quarter-circle path from `getQuarterCirclePath`
- sector path from `getSectorPath` and `centralAngle`
- default rectangle path when no special shape applies

The same `renderClipPath` function drives panel image clipping and texture clipping.

### Balloon shape fields

Balloon body shape is style-driven, not a generic shape object:

- `styleId`
- `BalloonStyle.kind`
- `BalloonStyle.tailStyle`
- `BalloonStyle.cornerRadius?`
- `BalloonStyle.spikiness?`
- `hasTail`
- `tailTip`
- `overrides.tailFlip`

`BalloonNode` contains hand-built body and tail geometry for cloud, rounded rectangle, slanted box, bursts, ellipse speech, whisper, thought, and generic ellipse-like styles.

## Current serialization shape

### Zustand persistence

The persisted store key is `arcs-comic`. The storage adapter migrates from legacy `nano-banana-comic` when `arcs-comic` is empty.

`partialize` persists:

- `pages`
- `projectSettings`
- `gutterSize`
- `pageSettings`
- `layoutMode`
- `currentGenreId`
- `customGenre`
- `templates`
- `_autoSaveTick`
- `colorFavorites`
- `colorRecentlyUsed`
- `groupsByPage`

The persist `merge` overlays persisted state on the current defaults and ensures `projectSettings.defaultPageBackgroundColor` exists.

### Manual project export/import

`serializeProject()` downloads JSON shaped as:

```json
{
  "version": "2.0",
  "type": "comic-project",
  "projectSettings": {},
  "gutterSize": 16,
  "pageSettings": {},
  "pages": []
}
```

`loadProject(jsonString)` parses JSON and, when `type === 'comic-project'` and `pages` exists:

- merges `projectSettings`
- replaces `pages`
- optionally restores `gutterSize`
- optionally merges `pageSettings`
- clears undo/redo history

Manual import is triggered through `ComicLayout` with a `.json` file input and `FileReader.readAsText`.

### Export output

`triggerExport('png' | 'pdf')` sets `exportFormat`. `ComicCanvas` observes that flag and:

- clears selection
- waits briefly for React to flush
- uses `stageRef.current.toDataURL(...)`
- PNG exports the current page only at 800x1200 with `pixelRatio: 3.125 / zoomLevel`
- PDF exports every page into `jsPDF` portrait pages sized `8.33 x 12.5` inches
- clears `exportFormat` after export

### Guided Flow draft/library storage

Guided Flow draft key: `arcs.guidedComicFlowDraft.v1`.

`GuidedComicDraftState` stores:

- `version`
- `savedAt`
- `activeIndex`
- setup/story/art direction forms
- `outlineBeats`
- `pageCards`
- `characterReferences`
- `locationReferences`
- `npcReferences`
- `selectedPanelId`
- `panelArtStatuses`
- `panelArtImages`
- `pageLayoutTemplates`
- `pageLayoutGeometry`

Guided project library key: `arcs.guidedComicProjectLibrary.v1`.

`GuidedComicProjectLibrary` stores:

- `version`
- `activeProjectId`
- `updatedAt`
- `projects[]`

The library snapshot intentionally uses `unknown` for several dynamic guided structures, then casts back to local draft types in `GuidedComicFlow`.

## Current Guided-to-Advanced handoff payload

Defined by `GuidedComicLayoutHandoff` in `src/stores/guidedComicLayoutBridge.ts`.

```ts
type GuidedComicLayoutHandoff = {
  source: 'guided-comic';
  target: 'advanced-comics-studio';
  pageNumber: number;
  layoutTemplate: GuidedComicLayoutTemplate;
  panelCount: number;
  orderedPanelIds: string[];
  panelGeometry: GuidedComicPanelGeometry[];
  panelArtImages: Record<string, GuidedComicLayoutPanelImage>;
  panelBeats?: GuidedComicLayoutPanelBeat[];
  requestedAt: string;
};
```

`GuidedComicPanelGeometry` is normalized page geometry:

- `panelId`
- `x`
- `y`
- `w`
- `h`
- `order`
- `locked?`
- `imageId?`
- `imageUrl?`
- `imageFit?: 'cover' | 'contain' | 'stretch'`
- `imageFocusX?`
- `imageFocusY?`
- `imageZoom?`

`GuidedComicFlow.openPageInAdvancedStudio()` builds the handoff from current layout geometry, panel art images, and panel beats, then calls `requestLayoutHandoff()` and opens Advanced Studio.

`ComicEditor` consumes the handoff once on mount and calls `replaceCurrentPageWithGuidedLayout(payload)`.

`replaceCurrentPageWithGuidedLayout()` maps normalized guided geometry into 800x1200 Advanced Studio panels:

- new Advanced panel ids are generated with `crypto.randomUUID()`
- shape is set to `rect`
- `x`, `y`, `width`, and `height` come from normalized guided geometry or template fallback
- `imageUrl` comes from `panelArtImages`
- `prompt` comes from panel beat text or image prompt
- `imageFillMode` comes from `imageFit` or defaults to `cover`
- `imageScale` comes from `imageZoom` or defaults to `1`
- `imageFocusX/Y` are copied when provided
- imported panels become the page `layerOrder`
- existing balloons and drawings are cleared on the target page
- existing overlays are preserved

## Current unclear contracts and `any` usage

The following `any` usages are present in the inspected comic/editor surfaces and mark areas where object contracts are not yet fully typed.

### Store middleware and overrides

- `src/stores/comicStore.ts`
  - `undoMiddleware(config: any)`
  - middleware `set: any`, `store: any`, and `partial: any`
  - `sourceOverrides: any` in `syncBalloonStyle`

Reason: custom Zustand middleware and balloon override spreading are not typed end-to-end.

### Canvas events and Konva traversal

- `src/modes/comic/engine/ComicCanvas.tsx`
  - `stageRef = useRef<any>(null)`
  - stage pointer handlers receive `e: any`
  - context-menu DOM/Konva parent traversal uses `node: any` and `p: any`
  - `ComicPanel` and `BalloonNode` callbacks use `e: any`

Reason: Konva event and node traversal types are not wrapped in a local editor event type.

### Panel rendering and geometry interaction

- `src/modes/comic/components/ComicPanel.tsx`
  - selection/drag callback event types use `any`
  - Konva refs use `useRef<any>`
  - `getClientRect(config?: any)`
  - canvas clip function context is `ctx: any`
  - edge drag stores temporary `startPos` and `startPoints` through `(e.target as any).setAttr/getAttr`
  - `dragBoundFunc` uses `this: any`
  - hover mutation casts target to `any`

Reason: Konva node refs, scene function context, and temporary drag metadata are not modeled as local types.

### Balloon rendering

- `src/modes/comic/components/BalloonNode.tsx`
  - `onSelect` event uses `any`
  - Konva refs use `useRef<any>`
  - `getClientRect(config?: any)`
  - `baseProps: any` in render prop construction

Reason: dynamic Konva props for mixed Rect/Ellipse/Path/Text rendering are assembled without a shared prop type.

### Floating overlays

- `src/modes/comic/components/FloatingAsset.tsx`
  - `onSelect(e?: any)`
  - Konva refs use `useRef<any>`

Reason: overlay Konva events and refs are not typed.

### Toolbar and dialog-adjacent usage found during scan

- `src/modes/comic/components/ObjectToolbar.tsx`
  - `imageFillMode: e.target.value as any`
- `src/modes/comic/components/TextToolbar.tsx`
  - `handleOverrides(newOverrides: Record<string, any>)`

Reason: UI controls build partial object updates without a narrow field/value discriminated type.

### Guided library and AI dynamic snapshots

- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
  - several snapshot substructures are `unknown` rather than exact local types
- `src/portals/guided-comic/guidedComicAi.ts`
  - reference maps, panel statuses, and panel art images use `unknown`

Reason: snapshot/library and AI context boundaries intentionally accept dynamic persisted or assistant-produced structures.

## Compatibility map to future canonical fields

This map is a documentation proposal only. It should be used to design additive adapters before any migration or refactor.

| Current field or group | Current owner | Proposed future canonical field | Notes for compatibility |
|---|---|---|---|
| `Panel.id`, `BalloonInstance.id`, `Drawing.id`, `OverlayObject.id` | Object records | `object.id` | Preserve existing ids for save/load; generated ids may remain UUIDs. |
| `type: 'panel' | 'balloon' | 'drawing'` and overlay `type` | Object records | `object.kind` plus subtype | Avoid conflating overlay `type: 'image' | 'sfx'` with top-level object kind. |
| `Panel.shapeType` | Panel | `panel.shape.kind` | Map `rect`, `polygon`, `ellipse`, `halfCircle`, `quarterCircle`, `sector` directly. |
| `Panel.points` | Panel polygon | `panel.shape.points` | Keep relative point semantics. |
| `Panel.centralAngle` | Sector panel | `panel.shape.centralAngle` | Preserve degree units and 1-360 clamp. |
| Panel `x`, `y`, `width`, `height`, `rotation`, `flipX`, `flipY` | Panel | `object.transform.{x,y,width,height,rotation,flipX,flipY}` | Existing transform is flattened from Konva scale. |
| Balloon `x`, `y`, `width`, `height`, `rotation`, `flipX`, `flipY` | Balloon | `object.transform.{x,y,width,height,rotation,flipX,flipY}` | Preserve `autoSize` interaction with width/height. |
| Overlay `x`, `y`, `rotation`, `scaleX`, `scaleY` | Overlay | `object.transform.{x,y,rotation,scaleX,scaleY}` | Overlay size is currently implicit/fixed by renderer. |
| Drawing `points` | Drawing | `drawing.geometry.points` | No object transform exists today. |
| `imageUrl`, `imageFillMode`, `imageOffsetX/Y`, `imageScale`, `imageFocusX/Y` | Panel | `panel.image.{url,fit,offsetX,offsetY,scale,focusX,focusY}` | Preserve direct panel image embedding before introducing image objects. |
| `prompt` | Panel / guided image | `object.metadata.prompt` or `panel.image.prompt` | Currently stores panel beat or generation prompt. |
| `strokeColor`, `fillGradient`, `strokeGradient`, `textureId`, `textureOpacity` | Panel | `panel.appearance.{strokeColor,fillGradient,strokeGradient,texture}` | Maintain current gradient shape from `GradientSpec`. |
| Panel shadow/glow fields | Panel | `object.effects.{shadow,glow}` | Convert flat fields without changing defaults. |
| Balloon `styleId` | Balloon | `balloon.style.id` | Style definitions should remain available by id for old saves. |
| Balloon `hasTail`, `tailBasePoint`, `tailTip`, `overrides.tailFlip` | Balloon | `balloon.tail.{enabled,base,tip,flip}` | Note current rendering uses `tailTip` more than `tailBasePoint`. |
| Balloon `text`, `fontFamily`, `autoSize`, `padding`, typography overrides | Balloon | `balloon.text.{content,style,autoSize,padding}` | Preserve override precedence: instance/overrides/style default. |
| Balloon `textBox` and `overrides.textBox` | Balloon | `balloon.text.transform` | Normalize duplicate storage, but read both for compatibility. |
| Balloon fill/stroke/gradient/texture/effects overrides | Balloon | `balloon.appearance` and `balloon.effects` | Preserve `overrides` as legacy source until adapter is proven. |
| `isLocked`, `isVisible` | Panel, balloon, drawing | `object.layer.{locked,visible}` | Overlays currently lack these fields. |
| `ComicPage.layerOrder` | Page | `page.layers.order` | Preserve back-to-front ordering; document panel-first render exception before changing. |
| `groupsByPage` | Store | `page.layers.groups` | Current groups live outside pages; adapter must merge by page id. |
| `OverlayObject.zIndex` | Overlay | `object.layer.zIndex` | Currently not authoritative for render order. |
| `ComicPage.background`, global `pageSettings` | Page/store | `page.background` and `document.pageDefaults` | Current global page settings can override page background rendering. |
| `PanelTemplateEntry` | Store templates | `template.panels[].shape/transform` | Templates intentionally omit id/image/prompt. |
| `GuidedComicPanelGeometry.{x,y,w,h}` | Guided Flow | `layoutPanel.normalizedBounds` | Preserve normalized 0-1 coordinate space. |
| `GuidedComicPanelGeometry.imageFit/focus/zoom` | Guided Flow | `layoutPanel.imagePlacement` | Map into Advanced panel image fields on import. |
| `GuidedComicLayoutHandoff` | Bridge | `handoff.layoutPage` | Keep one-shot consume semantics. |
| Manual export JSON `{version,type,projectSettings,gutterSize,pageSettings,pages}` | Store | `ComicProjectDocument` | Future versions must continue reading version `2.0`. |
| Persisted `arcs-comic` partialized store | Zustand | `ComicEditorPersistedState` | Keep legacy `nano-banana-comic` migration until explicitly retired. |

## Audit notes for future work

- Additive adapters should read the current flat fields and expose canonical grouped fields without rewriting stored objects.
- Any future object union should include panels, balloons, drawings, and overlays, but overlays need careful migration because they are not currently in `layerOrder`.
- Do not normalize `layerOrder` until the panel-first render behavior in `ComicCanvas` is explicitly reproduced or intentionally changed with UI proof.
- Do not remove `BalloonOverrides`; it is the current persistence location for many text, tail, style, and effect settings.
- Do not assume Guided normalized geometry and Advanced pixel geometry are interchangeable. The current bridge intentionally converts normalized 0-1 values into 800x1200 panel rectangles.
- Save/load compatibility needs both manual project JSON and Zustand `arcs-comic` persistence coverage.
- Export verification is UI/rendering verification, not just schema verification, because export captures the Konva stage.
