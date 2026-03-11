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

## Phase 14 Prep: Ribbon Migration, Menu Activation & Golden-Blue Theming

*Objective: Complete Comic Portal UI transition, activate menu interactivity, apply Golden-Blue design system. State management must remain modular for Phase 14 (advanced geometry, Undo/Redo).*

### Task A: Ribbon Migration & Menu Activation

#### 1. Menu fix — Text and Object vertical menus unresponsive
- **Target**: `src/modes/comic/components/MenuBar.tsx`
- **Cause (hypothesis)**: Clicks may not be reaching the button (Tooltip wrapper, z-index, or event order). Alternatively `activeMenu` is set but ribbon visibility logic or re-render fails.
- **Actions**:
  - Ensure the **Text** and **Objects** menu buttons call `open('text')` / `open('objects')` on click. Add an `onMouseDown` fallback that also calls `open(id)` so the ribbon toggles even if `onClick` is delayed or swallowed.
  - Ensure `useCloseOnOutside` does not close the dropdown in a way that resets `activeMenu` before the parent has re-rendered (only `setOpenMenu(null)` on outside click; do not call `onActiveMenuChange(null)` on outside click for Text/Objects so the ribbon stays visible until user picks another menu).
  - Optional: For Text and Objects only, treat as **ribbon toggles**: first click opens ribbon and shows dropdown; clicking the same button again closes dropdown but can keep ribbon visible; or make “click = toggle ribbon only” with no dropdown for a simpler mental model.
- **Verification**: Click “Text” → contextual ribbon shows Text ribbon content; click “Objects” → shows Objects ribbon content; no duplicate toolbars.

#### 2. Logic migration (controls in ribbons)
- **Target**: `ContextualRibbon.tsx`, `ObjectToolbar.tsx`, `TextToolbar.tsx`
- **Current state**: `ObjectToolbar` and `TextToolbar` are already used only inside `ContextualRibbon` (Panel ribbon, Text ribbon, Objects ribbon). No remaining usage in `ComicLayout` or `ComicCanvas`.
- **Actions**:
  - Confirm no other instances of `ObjectToolbar` / `TextToolbar` outside `ContextualRibbon`.
  - Ensure Panel ribbon (when Panel menu or panel selected) shows full panel tools: Add Panel, Split H/V/slant, Knife, Draw, Insert Image (already present).
  - Ensure Text ribbon shows `TextToolbar` (format-text) when a balloon is selected; when none selected, show “Select a balloon…” (already present).
  - Ensure Objects ribbon shows `ObjectToolbar` for panels and `TextToolbar` (format-objects) for balloons (already present).
- **Cleanup**: No floating toolbar components remain in the layout; the only “legacy” reference is `MainToolStrip.tsx`, which is **not** currently rendered in `ComicLayout`. Option: remove `MainToolStrip` from the tree and keep the file for potential future use, or delete it if the single-strip design is fully replaced by MenuBar + ContextualRibbon.

#### 3. State management (Phase 14–ready)
- **Target**: `ComicLayout.tsx`, `comicStore.ts`
- Keep `activeMenu` and ribbon visibility in layout state; avoid hard-coding menu IDs so Phase 14 can add new ribbon sections (e.g. geometry/angle controls) without refactors. Prefer a single source of truth for “which ribbon is visible” (e.g. `activeMenu` + selection).

---

### Task B: Visual Theming (Golden-Blue System)

#### 1. Design tokens
- **Target**: `src/modes/comic/theme/Phase12DesignTokens.ts`
- **Add**:
  - `ACCENT_BLUE_GRADIENT`: horizontal ribbon background (e.g. `linear-gradient(135deg, #002366 0%, #003580 50%, #002366 100%)` or similar).
  - `TEXT_BLUE_GRADIENT`: for text/icons on gold (e.g. `linear-gradient(135deg, #002366 0%, #80aaff 100%)` or solid `#002366` for readability).
  - Optionally `MENU_BAR_GOLD_GRADIENT` if different from `ACCENT_GOLD_GRADIENT` (e.g. slightly subtler for top bar).

#### 2. Top menu bar (File, Edit, View…)
- **Target**: `src/modes/comic/components/MenuBar.tsx`, `ComicLayout.tsx` (header)
- **Changes**:
  - **Slim**: Reduce header height (e.g. `h-12` → `h-9` or `h-10`), reduce font size (e.g. `text-sm` → `text-xs`), remove icons from menu labels (File, Edit, View, Panel, Balloon, Text, Objects) so only text + chevron remain.
  - **Background**: Golden Gradient (use `ACCENT_GOLD_GRADIENT` or new token).
  - **Text**: Blue Gradient or solid dark blue (`TEXT_BLUE_GRADIENT` / `#002366`) for labels.
  - Ensure Studio button and dock tabs follow the same token set (gold bg when active, blue text when inactive).

#### 3. Ribbons (horizontal strip below menu)
- **Target**: `src/modes/comic/components/ContextualRibbon.tsx`
- **Changes**:
  - **Background**: Blue Gradient (`ACCENT_BLUE_GRADIENT`).
  - **Icons and text inside ribbon**: Golden Gradient or gold-tint (`ACCENT_GOLD_GRADIENT` for active, gold/cream for inactive).
  - **Labels**: Add a short text label under every ribbon icon (e.g. “Add Panel”, “Split”, “Knife”, “Font”, “Color”…) so each control is icon + label. Use a small font (e.g. `text-[10px]`) and gold/cream color.

#### 4. Vertical menus (dropdowns from File, Edit, View, Panel, Balloon, Text, Objects)
- **Target**: `src/modes/comic/components/MenuBar.tsx` (dropdown panels)
- **Changes**:
  - **Background**: Golden Gradient.
  - **Text and icons inside dropdown**: Blue Gradient or solid dark blue for readability.

#### 5. Interactions (buttons and controls)
- **Target**: `MenuBar.tsx`, `ContextualRibbon.tsx`, `ObjectToolbar.tsx`, `TextToolbar.tsx`, `TabbedDock.tsx` (header/tabs)
- **Changes**:
  - **Replace static outlines**: Use a **shadow/lift** effect on press (e.g. `active:shadow-lg active:scale-[0.98]` or `transform translateY(1px)` on `:active`).
  - **Hover**: Add hover animations (e.g. `transition-all duration-150`, `hover:brightness-110` or light background shift) for all toolbar and menu buttons.
  - Ensure focus states remain for a11y (focus-visible ring).

---

### File checklist (no placeholders)

| File | Task A (Ribbon/Menu) | Task B (Theming) |
|------|----------------------|------------------|
| `MenuBar.tsx` | Fix Text/Objects click; optional close-on-outside behavior | Slim bar; gold bg; blue text; vertical menus gold bg + blue text; hover/press |
| `ContextualRibbon.tsx` | Confirm visibility when `activeMenu === 'text'|'objects'` | Blue gradient bg; labels under icons; gold icons/text; hover/press |
| `ComicLayout.tsx` | — | Header height/slim if applied at layout level |
| `Phase12DesignTokens.ts` | — | Add blue gradient, text-on-gold gradient |
| `ObjectToolbar.tsx` | — | Labels under icons; golden/blue styling; hover/press |
| `TextToolbar.tsx` | — | Labels where missing; golden/blue styling; hover/press |
| `TabbedDock.tsx` (if used in header) | — | Gold/blue tabs; hover/press |

---

---

## Format Dialog & Right-Click Context Menu (Design / Advice)

**User goal**: Vertical menu options that don’t perform an immediate action (e.g. “Font & size”, “Fill & border”) should open a **popup/dialog** where the user can change formatting. One **tabbed** dialog can cover Text, Object, Panel, etc. A **right-click context menu** on the canvas (on an object or empty space) should offer a shortcut into that same dialog.

### Why this helps

- **Clicks have somewhere to go**: Menu items like “Font & size” or “Shadow” don’t just “switch ribbon”; they open a dedicated place to change settings, matching common desktop UX.
- **Ribbon + dialog**: Ribbon stays for quick, visible controls; the dialog is for deeper or multi-property formatting and for users who prefer menu/right-click.
- **One dialog, many entry points**: A single tabbed modal (e.g. “Format”) with tabs “Text” | “Object” | “Panel” | etc. can be opened from:
  - Vertical menu: e.g. **Text → Font & size** → open dialog with **Text** tab active.
  - Vertical menu: **Objects → Fill & border** → open dialog with **Object** tab active.
  - Right-click on balloon → **Format text…** or **Format balloon…** → same dialog, correct tab.
  - Right-click on panel → **Format panel…** → same dialog, Panel tab.
  - Right-click on empty space → **Format…** or **Paste** / page options; **Format…** opens dialog (e.g. last-used tab or “Object”).

### Feasibility and scope

- **Not difficult** with the current stack (React, Zustand, existing ribbon controls). Main work is UI layout and wiring store updates.
- **Suggested pieces**:
  1. **FormatDialog** (or `FormatPanelModal`): One modal component, rendered in a portal. Props: `open`, `onClose`, `initialTab?: 'text' | 'object' | 'panel'`, optional `targetId` (e.g. selected balloon/panel) so the dialog knows what to edit. Tabs switch content; each tab can reuse or mirror the same controls as in the ribbons (font dropdown, size, color, fill, shadow, etc.) so behavior stays consistent.
  2. **Context menu**: `onContextMenu` on the canvas (or stage wrapper). `preventDefault()`, then show a small absolute-positioned menu. Items: “Format text…”, “Format object…”, “Paste”, “Add panel”, etc., depending on hit target (balloon vs panel vs empty). “Format…” items call a single opener, e.g. `openFormatDialog({ tab: 'text' })`.
  3. **State**: e.g. `formatDialogOpen: boolean`, `formatDialogTab: 'text' | 'object' | 'panel'`, optional `formatDialogTargetPageId` / `formatDialogTargetBalloonId` / `formatDialogTargetPanelId` so the dialog reads/writes the right entity from the store.

### Implementation order (suggested)

1. Add **right-click context menu** on canvas (hit-test: balloon / panel / empty) with a few items, e.g. “Format…”, “Paste”, and “Add balloon” / “Add panel” where relevant.
2. Add **Format dialog** with a single tab (e.g. Text) and wire it to the store; open it from the context menu and from one vertical menu item (e.g. Text → Font & size).
3. Add more tabs (Object, Panel) and more menu/context entries that open the dialog with the right tab.
4. Optionally add a toolbar button (e.g. “Format”) that opens the same dialog.

---

## Phase 15: Advanced Color, Gradient Engine & WordArt Warp

*Objective: Pro color wheel with Favorites/Recently Used, multi-stop gradient builder (linear/radial/rect), application to panels/balloons/text; extended sliders with ticks and +/-; WordArt warp profiles with a pluggable customWarp slot. Undo/redo and requestAnimationFrame for live previews.*

### 1. Advanced Color & Gradient Engine

#### 1.1 Color Wheel
- **Target**: New component `ColorWheelPicker.tsx` (or use iro.js if preferred; dependency in `package.json`). Alternatively a custom canvas-based wheel: hue ring (angle) + saturation/brightness square or triangle.
- **Favorites**: Store `colorFavorites: string[]` (hex, max e.g. 12) in comicStore or a dedicated slice; persist via zustand persist. UI: row of swatches; click to select; "Add to Favorites" adds current color.
- **Recently Used**: Store `colorRecentlyUsed: string[]` (max e.g. 16), push on every color apply, persist. Show as a second row of swatches.
- **Integration**: Used inside Format dialog (Text / Object / Panel tabs) and wherever fill/stroke/text color is set. On apply, call store action to add to recently used and optionally favorites.

#### 1.2 Gradient Builder UI
- **Types**: Linear (angle or start/end points), Radial (center + radius), Rectangular (bounding box). Store representation: e.g. `GradientSpec { type: 'linear'|'radial'|'rect', angle?: number, start?: Point, end?: Point, center?: Point, radiusX?, radiusY?, stops: GradientStop[] }`.
- **GradientStop**: `{ offset: number (0–1), color: string, brightness?: number (0–100), alpha?: number (0–1) }`. Stops sorted by `offset` before rendering (per user guide).
- **UI**: Gradient type tabs or dropdown; for linear: angle slider or 2D handles; for radial/rect: center + radius/rect controls. A **strip** showing stops with draggable thumbs for position; click strip to add stop; each stop has a small color swatch that opens ColorWheelPicker, and inline sliders for Brightness (0–100%), Transparency (0–1), Position (0–100%). Delete button per stop (minimum 2 stops).
- **Preview**: Use `requestAnimationFrame` or a throttled `useEffect` to update a small canvas/div preview when stops or type change; no blocking.

#### 1.3 Konva application
- **Panel**: `ComicPanel.tsx` — if `panel.fillGradient` (or `panel.fill` is gradient spec), set `fillLinearGradientStartPoint`, `fillLinearGradientEndPoint`, `fillLinearGradientColorStops` (or radial equivalents). Konva expects color stops as `[offset, color, offset, color, ...]`; build from `stops` sorted by offset; apply brightness/alpha to each color before passing.
- **Balloon**: `BalloonNode.tsx` — same for body fill and optionally stroke (Konva stroke gradient support is limited; may need filled duplicate shape for stroke gradient). Balloon overrides: e.g. `fillGradient?: GradientSpec`, `textColorGradient?: GradientSpec`.
- **Text**: Balloon text and any standalone text: Konva `Text`/`TextPath` support `fillLinearGradient*`; pass gradient color stops for `fill` when `textColorGradient` is set.
- **Store**: Extend `Panel`, `BalloonOverrides` (and shared types) with optional `fillGradient?: GradientSpec`, `strokeGradient?: GradientSpec`, `textColorGradient?: GradientSpec`. When present, render with gradient; else fall back to existing `fill`/`stroke`/`textColor`.

#### 1.4 Undo/redo
- All gradient stop add/remove/reorder and property changes (brightness, transparency, position) must go through store actions that are part of the zundo temporal history (e.g. `updatePanel`, `updateBalloon`). No direct setState that bypasses store.

---

### 2. WordArt & Path-Warping Engine

#### 2.1 Warp math (source of truth)
- **Arch**: Map character index to angle; position and rotation from radius. Example: `angle = (i / len - 0.5) * amount`, `x = centerX + radius * sin(angle)`, `y = radius - radius * cos(angle)`, `rotation = angle`. Use for both arch up and arch down (flip sign or offset).
- **Other profiles**: Circular (distribute along circle arc), Wavy (sine wave), Button (bulge), Square/Triangle/Cascade/Slant/Fade: define mapping from character index to (x, y, rotation). Centralize in a single module e.g. `src/modes/comic/utils/warpProfiles.ts`.

#### 2.2 Warp profile library
- **Target**: `warpProfiles.ts` exports: `WARP_PROFILES: Record<string, WarpProfile>` and a function `applyWarp(text, profileId, options): { char, x, y, rotation }[]`. Options include `amount`, `radius`, `width`, `height` (from balloon or WordArt bounds).
- **Profiles to implement**: Arch Up, Arch Down, Circular, Wavy, Button, Square, Triangle, Cascade, Slant, Fade Up, Fade Down. Each profile implements a single function `(charIndex, totalChars, options) => { x, y, rotation }`.
- **Placeholder slot**: Export `registerCustomWarp(id: string, fn: WarpFn)`. Internal registry; `applyWarp` checks registry first. Enables future custom warp algorithms without changing core.

#### 2.3 BalloonNode integration
- **Current**: BalloonNode uses `textWarp` + `warpPathData` (SVG path string) and Konva `TextPath`. Existing: arcUp, arcDown, wave, circle, arch.
- **Enhancement**: Either (a) keep path-based warping and add more path generators for new profiles, or (b) switch to character-by-character positioning using the warp math output: render each character as a `Text` node with x, y, rotation. (b) is required for true "map each character to (x,y,rotation)" and for custom warps. Option (b): build an array of character nodes from `applyWarp()`; render with `Group` containing multiple `Text` nodes. This matches the user's "map text characters along vector paths" and allows customWarp to return arbitrary positions.
- **Data model**: Extend `textWarp` to include new profile ids (e.g. `'square'|'triangle'|'cascade'|'slant'|'fadeUp'|'fadeDown'`). Keep `textWarpIntensity` (and optional `textWarpRadius` etc.) for amount/radius.

#### 2.4 Objectification (text as object)
- **Scope**: "Treat text blocks as standard objects (free-transform)" can mean: balloon text has its own transform (position/scale/rotation) stored on the balloon and editable via Transformer when in "text edit" mode. Already partially there (text alignment, position inside balloon). Full objectification: make the balloon text a separate transformable Group (with Transformer when selected in a "text object" mode). Lower priority if time-boxed; can be Phase 15 follow-up.

---

### 3. Slider Precision (UI)

#### 3.1 Reusable PrecisionSlider component
- **Target**: New `src/components/ui/PrecisionSlider.tsx` (or under `src/modes/comic/components/`).
- **Props**: `min`, `max`, `step`, `value`, `onChange`, `label?`, `showTicks?: boolean`, `tickCount?`, `snapToTick?: boolean`, `integerStep?: number` (for +/- buttons). Optional `valueLabel` (e.g. "50%").
- **Extended length**: Default width e.g. 120px–160px for vertical menu sliders (or full width of parent). Use CSS/Tailwind; ensure all formatting sliders in ObjectToolbar, TextToolbar, ProjectSettingsSidebar, FormatDialog use this component.
- **Tick marks**: When `showTicks`, render small divs (e.g. 2px×6px, `rgba(255,215,0,0.4)`) at regular intervals along the track. Match styling: `.gradient-slider-track` (deep blue bg, gold border) and `.slider-tick` from user's CSS reference.
- **Snap-to-tick**: When `snapToTick` is true, on mouse/touch end or when releasing drag, round value to nearest tick (derived from step or tickCount).
- **+ / - buttons**: Two buttons beside the slider; each click changes value by `step` (or 1 for integer). Clamp to min/max. Ensure undo: value changes go through store so zundo captures them.

#### 3.2 Where to use
- **ObjectToolbar**: Replace every `input type="range"` with `PrecisionSlider` (stroke, shadow, glow, texture opacity, etc.).
- **TextToolbar**: Same for padding, warp intensity, stroke width, shadow/glow sliders.
- **ProjectSettingsSidebar**: Gutter, background opacity.
- **FormatDialog**: Any new sliders in Text/Object/Panel tabs (font size, brightness, transparency, gradient stop position, etc.).
- **ComicLayout**: Any range input (e.g. zoom) if present.

---

### 4. Workflow & Styling

- **requestAnimationFrame**: Use for real-time gradient preview and warp preview (e.g. in Format dialog or a small live preview panel). Throttle or rAF-driven state updates so UI stays fluid.
- **Undo/redo**: Every gradient stop change and warp parameter change must be applied via `updatePanel` / `updateBalloon` (or dedicated gradient/warp actions that go through the same store set), so zundo records history.
- **Golden-Blue theme**: Gradient slider track: `linear-gradient(to right, #1a2a44, #2a4a7c)`, border `var(--golden-gradient-primary)` or Phase12DesignTokens gold, border-radius 4px. Tick marks: 2px×6px, `rgba(255,215,0,0.4)`. Use design tokens in `PrecisionSlider` and Gradient Builder.

---

### 5. File checklist (Phase 15)

| File / Area | Responsibility |
|-------------|----------------|
| `implementation_plan.md` | This section. |
| `tasks.md` | Phase 15 checklist (color wheel, gradient, sliders, warp). |
| `src/components/ui/PrecisionSlider.tsx` (or comic/components) | Extended slider, ticks, snap, +/-. |
| `src/modes/comic/components/ColorWheelPicker.tsx` | Color wheel + Favorites + Recently Used. |
| `src/modes/comic/components/GradientBuilder.tsx` | Type selector, stop strip, per-stop sliders, preview. |
| `src/modes/comic/utils/warpProfiles.ts` | All warp algorithms + `registerCustomWarp`. |
| `src/modes/comic/utils/gradientUtils.ts` | Sort stops, build Konva color stop array, apply brightness/alpha. |
| `src/stores/comicStore.ts` | `colorFavorites`, `colorRecentlyUsed`, `GradientSpec` on Panel/Balloon; actions. |
| `src/types/balloon.ts` / Panel type | `fillGradient`, `strokeGradient`, `textColorGradient`; extended `textWarp` ids. |
| `BalloonNode.tsx` | Apply gradient to fill/stroke/text; use warpProfiles for character layout when not path-based. |
| `ComicPanel.tsx` | Apply panel fillGradient (and stroke if supported). |
| `FormatDialog.tsx` | Color wheel + gradient builder in Object/Panel/Text tabs; PrecisionSlider. |
| `ObjectToolbar.tsx`, `TextToolbar.tsx`, `ProjectSettingsSidebar.tsx` | Replace range inputs with PrecisionSlider. |

---

## Integrity & stability sprint (non-functional)

### Undo/redo (zundo + persist)
- **Cause:** `temporal({ partialize })` stores partial state; `applyState(nextState)` without merge drops keys → redo/multi-undo break.
- **Fix:** Patch `node_modules/zundo/dist/index.js` so `undo`/`redo` call `applyState({ ...userGet(), ...nextState })` (plus existing `rawSetState` wiring). **Persistence:** `patch-package` + `"postinstall": "patch-package"`; patch at `patches/zundo+2.3.0.patch` (regenerate with `npx patch-package zundo` if zundo is upgraded).
- **loadProject:** Call `useComicStore.temporal.getState().clear()` after successful load.

### Layer tree toggles
- **Cause:** `useSortable` `listeners` on the whole row capture pointer → eye/lock clicks start drag instead of toggling.
- **Fix:** `LayerTree.tsx` — `setNodeRef` + `attributes` on row only; `{...listeners}` on a grip `<button>` (e.g. `GripVertical`) so only the handle initiates drag.

### Insert Image (Asset Library + ribbon)
- **Cause:** `onClick` lost when parent closes/blurs (dropdown/stack).
- **Fix:** `onMouseDown` + `preventDefault`/`stopPropagation` on MenuBar already; add same for Asset Library button and ContextualRibbon `RibbonButton` (optional `onMouseDown` prop).

---

## Phase 16: Home Ribbon, Office-Style Formatting & WordArt (Agent Onboarding)

*Objective: Rename File → Home and populate with high-frequency tools; deepen right-click and Format dialog to Word/PowerPoint-style; expand WordArt with MS Office–inspired presets and Transform paths.*

**Source of truth:** `tasks.md` Phase 16 (to be added), this section. Review `walkthrough.md` for canvas architecture (ComicLayout, ContextualRibbon, FormatDialog, CanvasContextMenu, BalloonNode, warp).

---

### Task 1: The "Home" Ribbon Transformation

#### 1.1 Rename File → Home
- **Target**: `src/modes/comic/components/MenuBar.tsx`
- **Change**: Replace the first menu: `menuWithDropdown('file', 'File', ...)` → `menuWithDropdown('home', 'Home', ...)`.
- **Target**: `src/modes/comic/components/ContextualRibbon.tsx`
- **Change**: `MenuId` is imported from MenuBar; add `'home'` to the type in `MenuBar.tsx` (`MenuId = 'home' | 'file' | 'edit' | ...` → make it `'home'` and remove `'file'`). In ContextualRibbon, replace `showFileRibbon = props.activeMenu === 'file'` with `showHomeRibbon = props.activeMenu === 'home'`.
- **Target**: `src/modes/comic/layouts/ComicLayout.tsx`
- **Change**: Any `activeMenu === 'file'` or initial/default that referred to File → use `'home'` so the Home ribbon shows when Home menu is active.

#### 1.2 Populate Home Ribbon (high-frequency tools)
- **Target**: `ContextualRibbon.tsx` — the block that currently renders `showFileRibbon` (Save, PNG, PDF) becomes the **Home** ribbon with the following **groups** (separated by vertical dividers):

| Group | Contents | Notes |
|-------|----------|--------|
| **History** | Undo, Redo | Reuse existing `onUndo`/`onRedo`; same onMouseDown pattern as Edit ribbon. |
| **Clipboard** | Copy, Cut, Paste | Add props `onCopy`, `onCut`, `onPaste` from ComicLayout (already passed to MenuBar). |
| **Typography** | Font dropdown, Font size, Bold, Italic, Underline | Font/size: reuse `FontSelect` + number or dropdown; B/I/U: new toggles that call `updateBalloon(..., overrides: { fontWeight, fontStyle, textDecoration })`. Show when balloon selected or when `activeMenu === 'home'` with “Select text…” placeholder. |
| **Dynamic Formatting** | Color Wheel shortcut | One button that opens Format dialog on the tab appropriate to selection: if balloon selected → Text tab (focus color); if panel selected → Panel tab (fill/line); else Object tab. Reuse `onOpenFormatDialog` and optionally new callback e.g. `onOpenFormatDialogWithContext()`. |
| **Layout** | Add Square Panel, Split Horizontal, Split Vertical | “Add Square” = existing Add Panel (rectangle); Split H/V = existing split buttons (disable when no panel selected). |
| **Assets** | Insert Image | Existing Insert Image button (onMouseDown). |
| **Balloons** | Round Speech, Modern Square, Thought Balloon | Quick-insert: three buttons that call `addBalloon(pageId, { ...defaults, styleId: 'speech_round' | 'speech_rounded_rectangle' | 'thought_cloud', hasTail: true, tailBasePoint, tailTip })` at last canvas position or center. Use BALLOON_STYLES to get default dimensions; tail logic already in BalloonNode. |
| **Organization** | Layer Front, Layer Back, Group, Clone | Layer: reuse store `bringToFront`/`sendToBack` (already in ObjectToolbar). Group: wire to “Group Tool” (tasks.md Phase 14 — if not implemented, show disabled with tooltip “Group coming soon”). Clone: reuse `cloneElement` from store (ObjectToolbar already has Clone). |

- **ComicLayout**: Ensure `onCopy`, `onCut`, `onPaste` are passed to `ContextualRibbon` (they are already on MenuBar; add to ContextualRibbon props and wire to same store actions).
- **Typography (B/I/U)**: Extend balloon overrides in `src/types/balloon.ts` if needed: `fontWeight?: 'bold' | 'normal'`, `fontStyle?: 'italic' | 'normal'`, `textDecoration?: 'underline' | 'none'`. Apply in `BalloonNode` when rendering text (Konva Text supports these).

#### 1.3 File checklist (Task 1)
- `MenuBar.tsx`: Rename File → Home (`'home'`), keep dropdown content (Open, Save, Export, Theme) under Home.
- `ContextualRibbon.tsx`: `showHomeRibbon`; implement Home ribbon groups (History, Clipboard, Typography, Color shortcut, Layout, Assets, Balloons, Organization). Add props for copy/cut/paste and format-dialog context-open.
- `ComicLayout.tsx`: Pass copy/cut/paste to ContextualRibbon; ensure `activeMenu === 'home'` used everywhere `'file'` was.
- `balloon.ts` (types): Optional `fontWeight`, `fontStyle`, `textDecoration` in overrides.
- `BalloonNode.tsx`: Apply fontWeight, fontStyle, textDecoration to Text/TextPath nodes.

---

### Task 2: Office-Style Formatting Dialogs & Menus

#### 2.1 Right-click context menu (deep, Word/PPT-style)
- **Target**: `src/modes/comic/components/CanvasContextMenu.tsx`
- **Current**: Flat list: Format text…, Format balloon…, Delete (balloon); Format panel…, Insert image…, Change shape…, Delete (panel); Format…, Paste, Add panel, Add balloon (empty).
- **Change**: Structure as **submenus** where appropriate (e.g. “Format” → “Format text…”, “Format balloon…”; “Add” → “Add panel”, “Add balloon”). Options must **change by selection**:
  - **Panel**: Format panel…, Insert image…, Change shape (submenu: Rectangle, Circle, …), Order → Bring to front / Send to back, Group (disabled if not implemented), Clone, Delete.
  - **Balloon**: Format text…, Format balloon…, Order → …, Clone, Delete.
  - **Image** (e.g. overlay or panel content): Format image… (opens Format dialog Image tab), Order, Clone, Delete.
  - **Empty**: Format… (opens dialog on last-used or Object tab), Paste, Add panel, Add balloon (optionally submenu).
- **Implementation**: Use nested `<div>` or a small submenu component (e.g. hover or click to expand). Position submenus to the right of parent item; same Golden-Blue styling. Reuse `closeContextMenu`, `handleFormat`, `handlePaste`, `handleDelete`, `handleAddPanel`, `handleAddBalloon`; add handlers for Order (bringToFront/sendToBack), Clone (cloneElement).

#### 2.2 Format dialog: tabbed navigation (Fill & Line, Effects, Text Box, Size & Properties)
- **Target**: `src/modes/comic/components/FormatDialog.tsx`
- **Current**: Tabs are “Text | Object | Panel | Image”.
- **Change (option A — rename/organize existing tabs):** Keep four top-level tabs but **rename and group content** to match Office:
  - **Fill & Line**: Merge current Panel fill/line + Object fill/stroke into one tab (or keep Panel/Object but label sections “Fill & Line” inside). Content: fill (solid + gradient), line/border (solid + gradient), ColorWheelPicker, GradientBuilder. For Text tab, “Fill & Line” can mean text color + stroke/outline.
  - **Effects**: Shadow, glow, texture, reflection (placeholder if needed). Reuse ObjectToolbar/TextToolbar logic (shadowBlur, shadowColor, etc.).
  - **Text Box**: Font, size, Bold/Italic/Underline, alignment, padding, warp. Current Text tab content lives here.
  - **Size & Properties**: Position (x, y), size (width, height), rotation, lock aspect ratio. Useful for panel/balloon/overlay. Read from selected panel/balloon; write via `updatePanel`/`updateBalloon`.
- **Change (option B — keep Text/Object/Panel/Image, add sub-tabs):** Each tab can have inner tabs (e.g. Panel → Fill & Line | Effects | Size & Properties). More complex; recommend Option A with four top-level tabs renamed as above and content reorganized.
- **UI/UX**: Professional borders, subtle shadows (e.g. `shadow-2xl`, `border border-white/15`), ARCS Golden-Blue theme (already using ACCENT_BLUE_GRADIENT, TEXT_ON_BLUE). Ensure all sections use Phase12DesignTokens; add subtle inner shadow or border on content areas if desired.

#### 2.3 File checklist (Task 2)
- `CanvasContextMenu.tsx`: Deep menu with submenus (Format, Add, Order, Change shape); context-specific items for panel/balloon/image/empty; Order and Clone actions.
- `FormatDialog.tsx`: Reorganize tabs to Fill & Line, Effects, Text Box, Size & Properties (or equivalent); apply Golden-Blue borders/shadows; ensure ColorWheelPicker/GradientBuilder and PrecisionSlider used throughout.

---

### Task 3: Microsoft-Inspired WordArt System

#### 3.1 Reference and scope
- **Reference**: Microsoft Office WordArt: Transform (Arch Up/Down, Circle, Button, Wave, etc.), Reflection, Glow, 3D rotation/bevel, and standard Transform paths.
- **Current codebase**: `BalloonNode.tsx` uses `textWarp` + path-based `warpPathData` (arcUp, arcDown, wave, circle, arch). Types: `textWarp?: 'none' | 'arcUp' | 'arcDown' | 'wave' | 'circle' | 'arch'`; `textWarpIntensity`. Phase 15 plan has `warpProfiles.ts` and character-by-character positioning.

#### 3.2 WordArt expansion
- **Transform paths (Office-like)**: Extend `src/modes/comic/utils/warpProfiles.ts` (create if missing) with profiles: **Arch Up**, **Arch Down**, **Circle**, **Button** (bulge), **Wave**, **Square**, **Triangle**, **Cascade**, **Slant**, **Fade**. Map to existing path-based warps where possible (arcUp, arcDown, wave, circle, arch); add new math for Button, Square, Triangle, Cascade, Slant, Fade per Phase 15 warp math. Expose in UI as “Transform” dropdown in TextToolbar and Format dialog Text Box section.
- **Presets**: **Reflection** (mirror below text, optional opacity/offset), **Glow** (shadowBlur + shadowColor, already partially in balloon overrides), **3D** (extrusion/depth — already mentioned in walkthrough for balloons). Add preset chips or dropdown in Format dialog “Effects” and/or Text Box: “Reflection”, “Glow”, “3D”, “Transform: Arch/Circle/Button/…”.
- **Interface**: WordArt “gallery” optional: a row of preset cards (e.g. “Arch Up”, “Circle”, “Wave”, “3D”, “Glow”) that apply the corresponding overrides to selected balloon text. Main interface: Transform dropdown (all path types) + Reflection toggle/slider + Glow (blur/color) + 3D (depth/angle) in Format dialog and TextToolbar.
- **Types**: Extend `balloon.ts` overrides: `textWarp` (add new ids: `'button'|'square'|'triangle'|'cascade'|'slant'|'fade'`), `textReflection?: boolean | { opacity, offset }`, `textGlow?: { blur, color }`, `text3D?: { depth, angle }` (or reuse existing 3D fields). BalloonNode and warpProfiles must apply these when rendering.

#### 3.3 File checklist (Task 3)
- `src/modes/comic/utils/warpProfiles.ts`: Implement or extend with all Office-style transform paths; `applyWarp(text, profileId, options)`; `registerCustomWarp` placeholder.
- `src/types/balloon.ts`: New `textWarp` ids; optional `textReflection`, `textGlow`, `text3D` in overrides.
- `BalloonNode.tsx`: Use warpProfiles for character or path layout; apply reflection (duplicate text + flip/opacity), glow (shadow), 3D (extrusion).
- `TextToolbar.tsx` & `FormatDialog.tsx`: Transform dropdown (full list), Reflection/Glow/3D controls; WordArt preset gallery (optional).
- `implementation_plan.md` Phase 15 §2 (WordArt): Align with this Phase 16 Task 3 so warp engine and UI are consistent.

---

### Implementation order (Phase 16)

1. **Task 1 (Home Ribbon)** — Rename File→Home, then add History/Clipboard to Home ribbon, then Typography (Font/size/B/I/U), then Color shortcut, Layout, Assets, Balloons, Organization. Test after each group.
2. **Task 2 (Format & context menu)** — Deep context menu first (submenus, context-aware); then Format dialog tab rename/reorg (Fill & Line, Effects, Text Box, Size & Properties) and visual polish.
3. **Task 3 (WordArt)** — warpProfiles + new transform paths, then Reflection/Glow/3D presets, then UI (Transform dropdown + presets in Format dialog and TextToolbar).

---

*This plan is accurate for the Konva/React/Zustand setup as of the current codebase. Update as implementation evolves.*
