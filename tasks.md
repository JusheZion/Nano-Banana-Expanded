# Nano Banana: Production Roadmap & UX Overhaul

## Phase 10: The "Obsidian Tech" UI Migration

- [x] **Top Ribbon Architecture**: Consolidate `Library`, `Layers`, `Pages`, `Settings`, and `Export` into a single, collapsible top ribbon (`TopRibbon.tsx`).
- [x] **Iconification**: Replace text-heavy buttons with high-contrast icons (lucide-react) across TopRibbon, TextToolbar, and ObjectToolbar.
- [x] **Universal Tooltips**: Implement Radix UI tooltips for every icon, tool, and button.
- [x] **Main Hub Update**:
  - [x] Add 5th photo link on the main page to the Comic Mode Portal.
  - [x] Collapse the main menu into a vertical icon strip (expands on hover).
- [x] **Asset Library Sync**: Added 32 missing images from `public/assets/images/` to the Asset Library. Landing page cards now navigate to their respective portals.
- [x] **Theming**: Apply `#0F0F12` (BG), `#1A1A1E` (Surface), and `#00D1FF` (Cyan Accent) across the app.
- [x] **Stacking Side Panels**: Non-overlapping, collapsible right-side panel stack (`ComicPanelStack.tsx`) for Pages, Layers, Settings, and Assets with embedded mode.
- [x] **Contextual Toolbars**: ObjectToolbar and TextToolbar rendered on full-width rows below ribbon instead of overlapping/clipping. TextToolbar split into compact ribbon variant and expanded options row.
- [x] **Alphabetized Menus**: All dropdown menus sorted A-Z (fonts, textures, balloon styles, warp effects, fill modes, genres).

## Phase 11: Advanced Canvas & Geometry Logic — COMPLETE

- [x] **Sub-Selection (Content Mode)**: `ComicPanel.tsx` owns `isContentMode`, toggled via double-click; Transformer attaches to image (cyan) or frame (gold).
- [x] **Precision Snapping (Gutter-Aware)**: `getGutterAwareSnapLines()` and `getVertexSnapLines()` take `gutter` from store; snap to sibling edges and one gutter-width away. Store `gutterSize` (0–64px).
- [x] **Alignment Guides**: H/V and diagonal cyan guides during vertex/edge drag; docspace edge preview; single `snapLines` render path for panel + vertex drag.
- [x] **Global Gutter Slider**: Settings → Layout → "Global Gutter" slider (0–64px); updates `gutterSize`; snapping uses it everywhere.
- [x] **Page Styling**: Store `pageSettings` (backgroundColor, backgroundImage, bgOpacity). Settings: color picker, opacity slider, "Upload BG", "Clear background image." Canvas background Rect + optional Image per page.
- [x] **Asset Expansion (Floating Overlays)**: `OverlayObject` type; `FloatingAsset.tsx` (Image + Transformer, no panel clip); overlay layer in ComicCanvas; add/update/remove overlays; "Add overlay (test image)" in Settings; Delete key removes selected overlay.

## Phase 12: Professional Typography & Balloon Suite

- [ ] **Shape Hot-Swapping**: Selecting a new balloon shape replaces the current selection instead of creating a new one.
- [ ] **Inner-Balloon Control**:
  - [ ] Select, scale, and shift text boxes inside balloons independently.
  - [ ] Add Text Alignment (Left, Center, Right, Top, Bottom).
- [ ] **Tail Intelligence**:
  - [ ] Implement "Smart Overlap" to hide seams where tails connect to bodies.
  - [ ] Add "Snap Tail Cleanly" button to auto-align tails to nearest panel edge.
- [ ] **Defaults**: Set `Auto-Fit` to **OFF** by default for all new text/balloons.

## Phase 13: Project Management & Templates

- [ ] **Template Engine**: Add "Save Blank Panel Template" feature.
- [ ] **Cover Studio**: Implement a specific workflow for "Save/Design Cover Page."
- [ ] **Genre Polish**: Finalize the "Smart Bias" prompt stacking for all 10+ genres in the registry.

## Critical Bug-Squash List (Priority 1)

- [ ] **Undo/Redo Stability**: Fix intermittent failures; ensure 100% state capture for all manipulations.
- [ ] **Insert Image Fix**: Resolve unresponsive "Insert Image" button in the Asset Library.
- [ ] **Layer Checkboxes**: Fix unresponsive visibility/lock toggles in the Layer menu.

---

## Phase 14: Settings & Performance (Future)

- [ ] **Snap Sensitivity Slider**: Add a slider to Settings to adjust the magnetic "pull" of guides.
- [ ] **High-Performance Toggle**: Option to disable heavy guidelines for complex multi-page spreads.
- [ ] **Export Preview**: Add a quick low-res preview modal before triggering the 300DPI export.

*Refer to the current codebase to ensure these plans are accurate for our Konva/React/Zustand setup.*
