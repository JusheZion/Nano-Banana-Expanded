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

## How to Use These Docs

| File | Use |
|------|-----|
| **tasks.md** | Checklist for Phases 10-13 and Critical Bug-Squash; tick off as you go. |
| **implementation_plan.md** | Where to change code (files, store, components) and how it fits the Konva/React/Zustand setup. |
| **walkthrough.md** | This file: big picture and roadmap for you and future agents. |

Cursor does not auto-update these files; update them (or ask the agent to) as you complete work so the roadmap stays accurate.
