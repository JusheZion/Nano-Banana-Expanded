# Nano Banana: Walkthrough & Roadmap

High-level narrative of where the project is and where it's going. For checklists and technical steps, see **tasks.md** and **implementation_plan.md**.

---

## Current Stack

- **UI**: React 19, Vite 7, Tailwind, Radix UI (e.g. Tooltip), lucide-react icons
- **Canvas**: Konva + react-konva (Stage, Layer, Group, Rect, Line, Image, Transformer, etc.)
- **Snapping**: `snapping.ts` (getSnapLines, getGutterAwareSnapLines, getVertexSnapLines with DiagonalGuide), `geometry-utils.ts` (calculateSlope, isParallel, getGutterSnapPoints)
- **State**: Zustand (`comicStore`) with **zundo** (temporal undo/redo) and **persist** (localStorage)
- **Comic surface**: Multi-page (Webtoon / 2-page spread), 800x1200 logical canvas, BSP-style panel splitting with configurable gutter (0–64px via Settings)

---

## What's Already Done (Phases 1–11)

- **Serialization**: Save/Load JSON; project and custom theme persist in localStorage.
- **Undo/Redo**: Buttons and Cmd+Z / Cmd+Shift+Z; history includes layout and theme.
- **Studio intelligence**: Project Settings (inclusive bias, demographic focus), prompt middleware, Mock AI Generate in Asset Library.
- **Tooltips**: Radix-based Tooltip used across Comic Layout and toolbars.
- **Auto-framing**: BSP-style split (vertical/horizontal/slant), ellipse masking, panel flip/rotate.
- **Multi-page**: PageNavigator, add/remove/duplicate/reorder pages, Webtoon vs Spread.
- **Word art & balloons**: BalloonNode (strokes, warp, 3D extrusion), TextToolbar, shared FontSelect, Custom Theme (palette, font, texture).
- **Export**: High-res PNG/PDF (e.g. 300 DPI) via ComicCanvas.
- **Genre system**: GenreRegistry, Custom Theme with color/texture/font, Apply to All, persistence.
- **Obsidian Tech UI (Phase 10 - COMPLETE)**: Collapsible `TopRibbon` with icon buttons (lucide-react) and Radix tooltips. Obsidian theme applied globally. Non-overlapping right-side `ComicPanelStack` for Pages, Layers, Settings, and Assets. `ObjectToolbar` on full-width row below ribbon. `TextToolbar` split into compact ribbon and expanded options row. All dropdown menus alphabetized A-Z. Main hub sidebar collapses to vertical icon strip (60px) and expands on hover (230px). 5th landing page card navigates to Comic Mode. All landing page cards now navigate to their respective portals. Asset Library synced with 47 images from `public/assets/images/`.
- **Sub-Selection / Content Mode (Phase 11)**: `ComicPanel.tsx` manages `isContentMode` (double-click toggles). When active, the Transformer attaches to the internal image (cyan handles, rotation) instead of the panel frame (gold handles).
- **Precision Snapping (Phase 11)**: **Gutter snapping** is the main win: `getGutterAwareSnapLines()` uses a configurable gutter (store `gutterSize`, 0–64px) so panels snap to consistent gaps during drag. A **Global Gutter Slider** in Settings drives this. H/V and diagonal **alignment guides** (Phase 12: Glitter Gold) appear during vertex/edge drag; they share a single `snapLines` render path.
- **Page Styling (Phase 11)**: Store `pageSettings` (backgroundColor, backgroundImage, bgOpacity). Settings: color picker, opacity slider, "Upload BG" and "Clear background image." Canvas background layer uses these; optional per-page background image with opacity.
- **Floating Overlays (Phase 11)**: `OverlayObject` in store; `FloatingAsset.tsx` (Image + Transformer, content-mode style) renders above panels with no clipping. Overlay layer in `ComicCanvas`; add via Settings "Add overlay (test image)" or future asset drop. Delete selected overlays with Delete key.
- **Phase 12 Design System & Layout (COMPLETE)**: **Design tokens** (`Phase12DesignTokens.ts`): 60/30/10 — Royal Blue Jewel primary, Warm Cream secondary, Glitter Gold accent; text on gold = black, text on blue = gold/cream. **Layout**: Left sidebar (Studio Hub, etc.) removed per annotation; main column is ribbon + toolbars + content. **Top ribbon**: Collapsible; inactive buttons use lighter blue bg and **#80aaff** for icons, button outlines, and vertical section dividers; hover/selection = Pages style (gold). Theme dropdown closes on click-outside and Escape. **Secondary toolbar** (ComicCanvas): Gold gradient bg; inactive = lighter gold; hover/selection = Layers style (royal blue + cream); Split (knife) = royal blue when active. **Right sidebar**: Fixed bottom toolbar (Pages, Layers, Settings, Assets) — icons only, always visible; stack above uses royal blue for text/icons/checkboxes in open panels (Warm Cream content area). **Snap guides**: Glitter Gold. **Video backdrop**: Low-opacity `<video>` behind Stage for future Infinite Comic Scroll.
- **Comic Portal UI transition (Ribbon + Golden-Blue)**:
  - **Menu bar**: Slim top bar (no icons, text-only labels, reduced height) with Golden Gradient background and blue text; vertical dropdowns use Golden Gradient bg and blue text with hover-reverse (blue bg, gold text). Text and Objects menus fixed to reliably toggle their ribbons (onMouseDown fallback).
  - **Ribbons**: Horizontal ribbon area uses Blue Gradient background; icons and labels use gold/cream; hover and selection reverse to gold gradient with dark text; brief labels under every ribbon icon; shadow/lift on press.
  - **Studio/dock**: Studio button and dock tabs (Pages, Layers, Settings, Assets) use Golden-Blue theming (gold when active, blue when inactive) with hover-reverse.
  - **Settings**: New "Ribbon pinned by default" option under Interface; ribbon pin state initializes from `projectSettings.ribbonPinnedDefault`.
  - **Cleanup**: `MainToolStrip.tsx` removed; panel/balloon tools live only in MenuBar + ContextualRibbon. Design tokens: `ACCENT_BLUE_GRADIENT`, `TEXT_BLUE_GRADIENT`, `MENU_BAR_GOLD_GRADIENT` in `Phase12DesignTokens.ts`.
  - **Format ribbon behavior (Text vs Objects)**:
    - **lastFormatCategory** state in `ComicLayout`: when user clicks **Text** or **Objects** in the menu bar, we set `activeMenu` and `lastFormatCategory` ('text' | 'objects'). The **Text** ribbon shows when `activeMenu === 'text'` or when a balloon is selected and `lastFormatCategory === 'text'`. The **Objects** ribbon shows when `activeMenu === 'objects'` or when a panel or balloon is selected and `lastFormatCategory === 'objects'`. So the ribbon that appears matches the last format category the user chose.
    - **Vertical menus (Text & Objects)** now work: every item is clickable; each item switches to the corresponding ribbon and closes the dropdown. **Text** menu: Font & size, Color/stroke/outline, 3D extrusion, Warp, **Padding**, **Alignment** (added). **Objects** menu: **Shape (Rect/Ellipse)**, **Split panel**, **Flip H/V**, **Bring to front / Send to back** (added); plus Fill & border, Shadow, Glow, Texture, Sync style · Flip tail. All items open the Objects or Text ribbon so the user can use the ribbon controls.
  - **Format dialog & right-click context menu**: Right-click on canvas opens **CanvasContextMenu** (balloon → Format text…, Format balloon…, Delete; panel → Format panel…, Delete; empty → Format…, Paste, Add panel, Add balloon). **FormatDialog** is a tabbed modal (Text | Object | Panel); Text tab has font, size, text color; Object/Panel tabs show placeholders. Opened from context menu or from menu bar (Text → Font & size, etc.; Objects → Fill & border, etc.). ComicCanvas uses `onContextMenu` and node names (`panel-*`, `balloon-*`, `page-*`) for hit-testing. **Note:** Which features go on each tab will be planned in a dedicated phase so the full set can be added in one go and avoid constant changes.
- **Phase 12 & 13: Production & Narrative (COMPLETE)**:
  - **Smart balloons**: `BalloonNode.tsx` — interactive draggable tail handle (gold circle when selected); dynamic sizing; styles (Speech oval, Thought cloud, Shout spiky) via `BalloonStyles`. **Tail blending**: Ellipse and rounded-rect (Modern Square) balloons use a **unified body+tail path** so the outline is one continuous stroke with no visible border at the junction.
  - **SFX stickers**: Overlay type `sfx` with optional `text`; SFX dropdown in canvas toolbar (BOOM, ZAP, CRASH, etc.); `FloatingAsset` renders SFX with bold font, gold fill, thick black outline.
  - **Asset Bridge**: Drag from Asset Library onto canvas; drop on panel → set panel image; drop outside panel → `addOverlay` (floating image). Hit-test via `pointInPanel()` in `geometry.ts`.
  - **Z-index**: Panels render first, then balloons + drawings, then overlays — balloons/SFX/overlays always above panels.
  - **Video backdrop**: Opacity set to 20% for Infinite Comic Scroll prep.
  - **Template Engine**: `PanelTemplate` / `PanelTemplateEntry` in store; "Save Blank Panel Template" and "Apply template" in Settings → Panel templates.
  - **Cover Studio**: `ComicPage.isCover`; `setPageCover(pageId, isCover)`; when true, gutter snapping disabled (full-bleed). "Set as Cover" (📖) in PageNavigator per page.
  - **Genre Smart Bias**: `promptMiddleware.generatePrompt` appends `genre.aiBias` when a genre is selected; registry entries have `aiBias` strings.
  - **Auto-save**: `flushAutoSave()` updates `_autoSaveTick`; `ComicLayout` runs `setInterval(30_000)` to persist project state to localStorage every 30 seconds.

---

## What's Next: Remaining Phase 12 Items & Critical Bugs

### Phase 11: Canvas & Geometry — COMPLETE
- Sub-Selection / Content Mode, Precision Snapping (gutter-aware + guides), Global Gutter Slider, Page Styling, Floating Overlays.

### Phase 12: Design System & Layout — COMPLETE
- Design tokens (60/30/10), ribbon/toolbar styling (#80aaff accents, gold hover), Theme close-on-outside, bottom toolbar icons-only, right-panel royal blue styling, snap lines gold, video backdrop.

### Phase 12 (remaining): Typography & Balloons
- **Done**: Tail smart overlap (unified path for oval and modern square; no border at tail junction).
- **Todo**: Shape hot-swap (replace selection), inner-balloon text control/alignment, "Snap Tail to Panel Edge" button, Auto-Fit OFF by default.

### Phase 13: Templates & Genre — COMPLETE
- Template Engine (save/apply blank panel templates), Cover Studio (Set as Cover, disable gutter), Genre Smart Bias (aiBias in promptMiddleware), Auto-save every 30s.

### Priority 1 Bugs
- Undo/Redo: reliable capture of all state changes.
- Insert Image: Asset Library button correctly updating the selected panel.
- Layer panel: visibility and lock toggles correctly wired and reflected in the UI.

---

## Menu & Toolbar Redesign Plan (UX Vision)

*Role: UI/UX designer specializing in office and media design suites. Goal: a single, coherent menu and toolbar system that feels like a professional comic/design studio while keeping the dark blue and gold color scheme.*

### Current State: Where Things Live Today

| Location | Contents |
|----------|----------|
| **Top ribbon** (collapsible) | Collapse, Comic label, Undo/Redo, Theme dropdown, Save/Load JSON, Export PNG/PDF, Zoom (out / % / in / fit), contextual TextToolbar when a balloon is selected, duplicate “Export PDF” CTA at end. |
| **Contextual row 1** (only when panel selected) | ObjectToolbar: panel shape (rect/ellipse), split (H/V/slant), flip, z-order, clone, delete, texture, border/glow. |
| **Contextual row 2** (only when balloon text/shape expanded) | TextToolbar expanded: padding, colors, 3D, warp, font, alignment, shape swap, etc. |
| **Canvas toolbar** (gold bar below ribbon) | “Comic Engine v0.3”, Add Panel, Split (knife), Add Balloon dropdown, Insert Image, SFX dropdown. (Drawing/brush and layout mode live in store; layout toggled from Pages panel.) |
| **Right: fixed bottom bar** | Four icon buttons: Pages, Layers, Settings, Assets. |
| **Right: stack** | When a button is on, a panel opens above the bar (Pages = PageNavigator, Layers = LayerTree, Settings = ProjectSettingsSidebar, Assets = AssetLibrary). |

**Pain points:** Controls are spread across five horizontal strips plus a vertical stack; context switches between “nothing selected,” “panel selected,” and “balloon selected” change which rows appear; Theme is in the ribbon while layout (gutter, templates) is in Settings; Export is repeated; canvas tools (Add Panel, Split, Balloon, SFX) sit in a separate gold bar from object/text tools.

---

### Design Principles

1. **One primary tool strip** — All creation and transformation tools in one predictable horizontal strip (dark blue base, gold for active/hover), so the user always knows where to look.
2. **Context in place, not extra rows** — When a panel or balloon is selected, show **inline** options (e.g. in the same strip or in a small floating toolbar) instead of adding/removing whole rows.
3. **Unified panel dock** — One right-side “Studio” dock with a single tab bar (Pages | Layers | Settings | Assets). One panel visible at a time by default; optional “split” for power users later.
4. **File/Edit/View in a compact menu** — Move project-level actions (Save, Load, Export, Zoom, Theme) into a single **Application menu** (e.g. “Comic” or “Nano Banana”) so the main strip is only about making and editing content.
5. **Consistent dark blue + gold** — All chrome uses the same token set: primary = royal blue (#002366), accent = glitter gold (gradient), text on blue = gold/cream; no competing accent colors in toolbars.

---

### Proposed Architecture

#### 1. Application menu (top-left, single entry)

- **One menu button** (icon + “Comic” or app name) in the top-left, dark blue, gold on hover.
- **Dropdown contains:**
  - **File:** New (future), **Open…**, **Save**, **Save As…** (future), divider, **Export → PNG / PDF**, divider, **Theme / Studio look** (opens current Theme dropdown content in a panel or modal).
  - **Edit:** Undo, Redo, Cut, Copy, Paste (with shortcuts).
  - **View:** Zoom In / Out / Reset / Fit to Screen, **Layout mode:** Webtoon | Spread (moved from Pages panel for discoverability).
- **Result:** Top ribbon can be removed or reduced to this single menu + optional compact zoom/undo strip (see below).

#### 2. Main tool strip (single horizontal bar)

- **One bar** below the application menu (or below a minimal “menu + zoom” line), full width, **dark blue** (`PRIMARY_BG_FLAT`), gold for active/hover.
- **Left side — Creation:**
  - **Add Panel** (primary CTA style).
  - **Split** (knife) as a toggle; when active, cursor and canvas state indicate knife mode.
  - **Add Balloon** — dropdown or popover: Speech & Thought (oval, cloud, etc.) and Word Art & SFX (BOOM, ZAP, …). One click inserts; no need for a second “SFX” dropdown.
  - **Insert Image** — enabled when selection includes at least one panel; else disabled with tooltip “Select a panel.”
  - Optional: **Draw** (brush) toggle + small color/width in strip or in a popover to avoid clutter.
- **Center or right — Contextual (when something is selected):**
  - **Panel selected:** Shape (rect/ellipse), Split H/V/slant, Flip, Order (front/back), Clone, Delete, and optionally a “Style” popover (texture, border, glow). Reuse current ObjectToolbar logic, but **inline in this strip** (icons + small dropdowns), not a separate row.
  - **Balloon selected:** Compact text/shape controls (font, size, color, padding, alignment) **inline** or in one “Balloon” popover; “Expand” can open a side panel or larger popover instead of an extra row.
- **Right end of strip:**
  - **Studio** (or “Panels”) — toggles the right-side dock open/closed; or opens the dock with a default tab (e.g. Pages).

**Result:** No second “gold” toolbar; no contextual rows that appear/disappear. One strip, with the right side adapting to selection.

#### 3. Right-side panel dock (unified)

- **Single fixed column** (e.g. 280–320px), dark blue header row, gold for active tab.
- **Tabs:** **Pages** | **Layers** | **Settings** | **Assets** — one row of tabs; only one content area below. Selecting a tab shows that panel (PageNavigator, LayerTree, ProjectSettingsSidebar, AssetLibrary); no accordion stack.
- **Optional:** Small “pin” or “pop out” to detach as a floating window later.
- **Settings** content stays as today: Layout (gutter), Page background, Panel templates, Overlays, Project settings (bias, demographic), etc. **Theme/Genre** can stay in the Application menu dropdown or be moved into Settings as a “Studio theme” section for consistency.

**Result:** One place for “everything that’s not the canvas or the main tools”; no separate bottom icon bar and no stacking accordion unless we explicitly add “split view” later.

#### 4. Canvas area

- **No toolbar inside the canvas.** The main tool strip is above; the canvas is only Stage + potential floating overlays (e.g. minimal “Snap Tail” or quick actions when a balloon is selected). Video backdrop and Asset Bridge (drag from Assets onto panel or canvas) unchanged.

#### 5. Color and tokens

- **Chrome:** `PRIMARY_BG_FLAT` (#002366) for menu, main strip, and dock header.
- **Accent / active / hover:** `ACCENT_GOLD_GRADIENT` and `TEXT_ON_GOLD` for selected state and primary actions.
- **Inactive icons/text on blue:** `TEXT_ON_BLUE` (#fcf6ba) or `TEXT_ON_BLUE_ALT` (cream).
- **Secondary panels (e.g. Settings content area):** Keep Warm Cream (`SECONDARY_BG`) for readability; headings/labels in dark blue or gold as needed.
- Remove or reduce any cyan (#00D1FF) in toolbars so the only strong accent is gold.

---

### Implementation outline (for future work)

1. **Add Application menu component** — Top-left dropdown with File, Edit, View; wire Save, Load, Export, Theme, Undo, Redo, Zoom, Layout mode. Optionally keep a minimal “quick” row (e.g. Undo, Redo, Zoom %, Fit) next to the menu for muscle memory.
2. **Introduce single Main tool strip** — New component or refactor of TopRibbon + ComicCanvas toolbar: left = Add Panel, Split, Add Balloon (unified), Insert Image, Draw (optional); right = contextual panel/balloon controls + Studio toggle. ObjectToolbar and TextToolbar become **sections** of this strip or popovers triggered from it.
3. **Replace right stack + bottom bar with Tabbed dock** — One component: tab row (Pages, Layers, Settings, Assets) + one content slot. Remove fixed bottom icon bar; “Studio” in the main strip opens the dock or focuses it.
4. **Remove or collapse old UI** — Remove duplicate Export PDF from ribbon; remove contextual rows from ComicLayout (ObjectToolbar row, TextToolbar expanded row); remove gold “Comic Engine” toolbar from ComicCanvas; move layout mode into View menu and/or into Settings.
5. **Tokens and a11y** — Use Phase12DesignTokens everywhere in the new chrome; ensure focus and keyboard flow (menu, strip, dock) and aria labels for the new layout.

---

### Summary

- **Before:** Top ribbon + 0–2 contextual rows + gold canvas toolbar + right accordion stack + fixed bottom icons.
- **After:** Application menu (File / Edit / View) + one dark blue **main tool strip** (creation + contextual tools) + one **tabbed right dock** (Pages | Layers | Settings | Assets). All in **dark blue and gold**.
- **Outcome:** Fewer moving parts, one place for tools, one place for panels, and a clearer mental model for “where do I do X?” for both new and power users.

---

## How to Use These Docs

| File | Use |
|------|-----|
| **tasks.md** | Checklist for Phases 10-13 and Critical Bug-Squash; tick off as you go. |
| **implementation_plan.md** | Where to change code (files, store, components) and how it fits the Konva/React/Zustand setup. |
| **walkthrough.md** | This file: big picture and roadmap for you and future agents. |

Cursor does not auto-update these files; update them (or ask the agent to) as you complete work so the roadmap stays accurate.
