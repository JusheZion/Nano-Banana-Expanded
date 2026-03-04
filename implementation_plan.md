# Nano Banana: Implementation Plan (Phases 10–13 & Critical Bugs)

This plan aligns with `tasks.md` and the current stack: **React**, **Konva/react-konva**, **Zustand** (with zundo + persist), **Radix UI**, **Tailwind**. Key entry points: `ComicLayout.tsx`, `comicStore.ts`, `ComicPanel.tsx`, `ComicCanvas.tsx`, `LayerTree.tsx`, `AssetLibrary.tsx`, `LandingPage.tsx`, `AppShell.tsx`.

---

## Phase 10: The "Obsidian Tech" UI Migration

### Top Ribbon Architecture
- **Target**: `src/modes/comic/layouts/ComicLayout.tsx`
- Consolidate Library, Layers, Pages, Settings, Export into one header strip.
- Add state (e.g. `ribbonCollapsed: boolean`) and a toggle; use CSS (e.g. `overflow-hidden`, `max-height`) or conditional render for collapse.
- Existing toggles: `setIsLibraryOpen`, `setIsLayerTreeOpen`, `setIsPageNavOpen`, `setIsSettingsOpen`; keep these, group under one ribbon UI.

### Iconification
- **Target**: `ComicLayout.tsx`, `ObjectToolbar.tsx`, `TextToolbar.tsx`, `AppShell.tsx` / `LandingPage.tsx`
- Replace text labels with `lucide-react` (or existing) icons; keep tooltips for accessibility.
- Preserve or add `aria-label` / Tooltip content for every icon.

### Universal Tooltips
- **Existing**: `src/components/ui/Tooltip.tsx` (Radix); already used in ComicLayout and toolbars.
- **Action**: Audit all comic-mode and main-hub buttons/controls; wrap any remaining in `<Tooltip>`.

### Main Hub Update
- **Target**: `src/components/LandingPage.tsx`, `src/components/layout/AppShell.tsx`
- Add 5th photo/card link that routes to Comic Mode Portal (same route as existing comic entry; ensure `setActivePortal('comic')` or equivalent).
- Main menu: refactor to a vertical icon strip that expands on hover (e.g. `group hover:w-...` or state + transition).

### Theming
- **Target**: `src/styles/theme.css`, `tailwind.config.js`, and any component-level bg/surface/accent classes.
- Define or reuse CSS variables: e.g. `--bg: #0F0F12`, `--surface: #1A1A1E`, `--accent: #00D1FF`.
- Apply across comic layout, sidebars, and main hub; ensure contrast for text and focus states.

---

## Phase 11: Advanced Canvas & Geometry Logic

### Sub-Selection Logic (Frame vs Content)
- **Target**: `src/modes/comic/components/ComicPanel.tsx`, `src/stores/comicStore.ts`
- **Ref**: `.agent/sub-selection-spec.md`
- Refactor panel into Konva `<Group>` hierarchy: Frame (clip + stroke), Content (image), so the Transformer can attach to either.
- Store: add or use `mode: 'layout' | 'content'` and selection state so "Content Mode" selects the inner image node; ensure `updatePanel` applies to image transform (e.g. `imageOffsetX`, `imageOffsetY`, `imageScale`) when in content mode.
- Coordinate conversion: use `getRelativePointerPosition()` or invert group transform when dragging/scaling the content node.

### Precision Snapping
- **Target**: `src/modes/comic/utils/snapping.ts`, `ComicCanvas.tsx` / `ComicPanel.tsx` (drag/transform handlers)
- Existing: `getSnapLines`, `getVertexSnapLines` used in panel drag. Extend to vertex/side moves (e.g. when editing polygon points or resizing).
- Render snap guides (e.g. Konva `Line` or overlay divs) in Cyber Cyan (`#00D1FF` or theme variable) when within snap threshold.

### Global Gutter Slider
- **Target**: `src/stores/comicStore.ts`, `src/modes/comic/components/ProjectSettingsSidebar.tsx`
- Replace hardcoded `gap = 16` in `splitPanel` with a store value (e.g. `bspGutter: number`); add slider in Project Settings and pass into `splitPanel`.

### Page Styling
- **Target**: `src/stores/comicStore.ts` (`ComicPage.background`), `ComicCanvas.tsx` (page background rect/layer)
- `ComicPage` already has `background: string`. Add optional `backgroundImage?: string` and `backgroundImageScale` / position if needed.
- UI: expose in Project Settings or a Page-level panel (e.g. when a page is selected) for background color and image URL.

### Asset Expansion (Import Outside Panels)
- **Target**: `src/modes/comic/components/AssetLibrary.tsx`, `src/stores/comicStore.ts`
- Support adding "image objects" (e.g. new type or panel-like entity without clip) to a page, for SFX/overlays. Options: (a) new `overlays` or `decals` array on `ComicPage`, or (b) panels with `shapeType: 'rect'` and no clip, rendered above/below as needed. Store and `layerOrder` must support them; canvas must render and make them selectable/draggable.

---

## Phase 12: Professional Typography & Balloon Suite

### Shape Hot-Swapping
- **Target**: `src/modes/comic/components/TextToolbar.tsx` (or balloon-shape selector), `src/stores/comicStore.ts`
- When user selects a different balloon shape (e.g. from BALLOON_STYLES), call `updateBalloon(..., { styleId: newId })` (and merge style defaults) instead of adding a new balloon. Ensure one balloon is selected and the control is "change shape" not "add balloon."

### Inner-Balloon Control
- **Target**: `src/modes/comic/components/BalloonNode.tsx`, `src/types/balloon.ts`, `src/stores/comicStore.ts`
- Allow selecting the text node inside the balloon (e.g. double-click or "Edit Text" mode) and attach Transformer to it; store text position/scale/alignment per balloon (e.g. `textOffsetX`, `textOffsetY`, `textScale`, `textAlign`, `verticalAlign`).
- **Text Alignment**: Add UI in TextToolbar for horizontal (left/center/right) and vertical (top/bottom/center); persist in balloon overrides and apply in BalloonNode.

### Tail Intelligence
- **Target**: `src/modes/comic/components/BalloonNode.tsx` (renderTail, renderBody)
- **Smart Overlap**: Use clip or composite so the tail-body junction doesn’t show a seam (e.g. draw tail under body with same fill, or mask).
- **Snap Tail to Panel Edge**: Add a button that, given current balloon and page panels, computes nearest panel edge and sets tail tip (e.g. `tailX`, `tailY` or equivalent in overrides) to that edge.

### Defaults: Auto-Fit OFF
- **Target**: `src/stores/comicStore.ts` (`addBalloon`)
- Change default `autoSize` from `true` to `false` for newly created balloons.

---

## Phase 13: Project Management & Templates

### Template Engine (Save Blank Panel Template)
- **Target**: `src/stores/comicStore.ts`, `ComicLayout.tsx` or Project Settings
- Add `savePanelTemplate()`: serialize current page’s panel layout (and optionally styles) to a JSON template; store in state or download. Add "Load Template" to apply a template to current page (replace or merge panels).

### Cover Studio
- **Target**: New flow or mode (e.g. "Cover" page type or first-page special handling)
- "Save/Design Cover Page" could: mark a page as cover, apply different aspect ratio or export preset, and/or open a dedicated cover layout UI. Implement per product decision (single page vs. multi-page export).

### Genre Polish (Smart Bias)
- **Target**: `src/modes/comic/utils/promptMiddleware.ts`, `src/modes/comic/data/GenreRegistry.ts`
- Ensure all genres in GENRE_REGISTRY have `aiBias` and that `generatePrompt` (or equivalent) stacks: user prompt + demographic focus (if enabled) + genre aiBias. Verify for 10+ genres; add any missing entries.

---

## Critical Bug-Squash List (Priority 1)

### Undo/Redo Stability
- **Target**: `src/stores/comicStore.ts` (zundo `temporal` middleware)
- Ensure every state-mutating action is called via the store’s `set` so zundo’s `partialize` includes all relevant slices (pages, projectSettings, layoutMode, currentGenreId, customGenre, etc.). Test: draw, cut, add/delete/move panels and balloons, then Undo/Redo repeatedly; no lost or duplicate elements.

### Insert Image Fix
- **Target**: `src/modes/comic/components/AssetLibrary.tsx`
- Locate the "Insert Image" (or equivalent) button and its handler; ensure it correctly gets selected panel, applies image URL to `updatePanel(..., { imageUrl })`, and that the panel id and page id are valid. Add defensive checks and console logs if needed to trace failures.

### Layer Checkboxes (Visibility / Lock)
- **Target**: `src/modes/comic/components/LayerTree.tsx`, `src/stores/comicStore.ts`
- `toggleLayerVisibility` and `toggleLayerLock` already exist in the store. Verify LayerTree passes correct `pageId` and `elementId` to these actions and that the UI state (e.g. checked state) is derived from store (panels/balloons/drawings `isVisible`, `isLocked`). Fix any wrong id or missing re-render.

---

*This plan is accurate for the Konva/React/Zustand setup as of the current codebase. Update as implementation evolves.*
