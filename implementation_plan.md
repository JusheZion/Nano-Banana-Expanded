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

*This plan is accurate for the Konva/React/Zustand setup as of the current codebase. Update as implementation evolves.*
