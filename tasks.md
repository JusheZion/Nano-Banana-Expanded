# Nano Banana: Production Roadmap & UX Overhaul

## Phase 10: The "Obsidian Tech" UI Migration

- [ ] **Top Ribbon Architecture**: Consolidate `Library`, `Layers`, `Pages`, `Settings`, and `Export` into a single, collapsible top ribbon.
- [ ] **Iconification**: Replace text-heavy buttons with high-contrast icons.
- [ ] **Universal Tooltips**: Implement Radix UI tooltips for every icon, tool, and button.
- [ ] **Main Hub Update**:
  - [ ] Add 5th photo link on the main page to the Comic Mode Portal.
  - [ ] Collapse the main menu into a vertical icon strip (expands on hover).
- [ ] **Theming**: Apply `#0F0F12` (BG), `#1A1A1E` (Surface), and `#00D1FF` (Cyan Accent) across the app.

## Phase 11: Advanced Canvas & Geometry Logic

- [ ] **Sub-Selection Logic**: Refactor `ComicPanel.tsx` to allow independent manipulation of the image (Content) vs. the Polygon (Frame).
- [ ] **Precision Snapping**: Moving vertices or sides must trigger snap alignment and grid guides in Cyber Cyan.
- [ ] **Global Gutter Slider**: Convert the fixed 16px BSP gutter into a reactive slider in Project Settings.
- [ ] **Page Styling**: Add options for Page Background Color and Background Image inserts.
- [ ] **Asset Expansion**: Allow "Import Image Objects" outside of panels (for custom sound FX and overlays).

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

*Refer to the current codebase to ensure these plans are accurate for our Konva/React/Zustand setup.*
