# Nano Banana: Walkthrough & Roadmap

High-level narrative of where the project is and where it's going. For checklists and technical steps, see **tasks.md** and **implementation_plan.md**.

---

## Current Stack

- **UI**: React 19, Vite 7, Tailwind, Radix UI (e.g. Tooltip), lucide-react icons
- **Canvas**: Konva + react-konva (Stage, Layer, Group, Rect, Line, Image, Transformer, etc.)
- **Snapping**: `snapping.ts` (getSnapLines, getGutterAwareSnapLines, getVertexSnapLines with DiagonalGuide), `geometry-utils.ts` (calculateSlope, isParallel, getGutterSnapPoints)
- **State**: Zustand (`comicStore`) with **zundo** (temporal undo/redo) and **persist** (localStorage)
- **Comic surface**: Multi-page (Webtoon / 2-page spread), 800x1200 logical canvas, BSP-style panel splitting with 16px gutter

---

## What's Already Done (Phases 1-10, Phase 11 started)

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
- **Sub-Selection / Content Mode (Phase 11)**: `ComicPanel.tsx` now manages `isContentMode` as internal state, toggled via **double-click** on a selected panel. When active, the Konva Transformer attaches to the internal image (cyan handles, rotation enabled) instead of the panel group (gold handles). Deselecting auto-resets to frame mode.
- **Precision Snapping (Phase 11)**: `getGutterAwareSnapLines()` adds virtual snap targets one gutter-width (16px) from every sibling edge, so panels snap into consistent gutters during drag. Vertex/edge snapping via `getVertexSnapLines()` also enhanced with **diagonal ray-casting**: edge slopes from all siblings are computed via `calculateSlope()` / `isParallel()` from `geometry-utils.ts`, and matching angles project dashed Cyber Cyan (#00D1FF) guide lines on the canvas overlay layer.

---

## What's Next: Phases 11-13 & Critical Bugs

### Phase 11: Canvas & Geometry (in progress)
- ~~Sub-Selection / Content Mode~~ (done): Double-click toggles frame vs. content transform.
- ~~Precision Snapping~~ (done): Gutter-aware panel snapping + diagonal ray-casting for vertex alignment.
- Remaining: Global Gutter Slider, Page Background Color/Image, Import Image Objects outside panels (SFX/overlays).

### Phase 12: Typography & Balloons
Shape hot-swap, inner-balloon text control and alignment, tail smart overlap and "Snap Tail to Panel Edge," and Auto-Fit OFF by default.

### Phase 13: Templates & Genre
Save/load blank panel templates, Cover Studio workflow, and final pass on Smart Bias for all genres in the registry.

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
