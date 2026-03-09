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

## Phase 12: Design System & Layout (Master Implementation) — COMPLETE

- [x] **Design Tokens**: `Phase12DesignTokens.ts` — Royal Blue Jewel (primary), Warm Cream (secondary), Glitter Gold (accent); TEXT_ON_GOLD, TEXT_ON_BLUE, PRIMARY_BG_LIGHT, etc.
- [x] **Layout**: Left sidebar (Studio Hub menu) removed; single main column (ribbon + toolbars + content). Right stack + fixed bottom toolbar (Pages, Layers, Settings, Assets) — icons only.
- [x] **Top Ribbon**: Inactive = lighter blue bg; **#80aaff** for icons, button outlines, vertical dividers; hover/selection = gold (Pages style). Theme dropdown closes on click-outside and Escape. COMIC/collapse tooltips and hover feedback.
- [x] **Secondary Toolbar (ComicCanvas)**: Gold gradient bg; inactive = lighter gold; hover/selection = Layers style (royal blue + cream). Add Panel, Split, Add Balloon, Insert Image styled; Split = royal blue when active.
- [x] **Right Sidebar**: Open panel content = Warm Cream bg, royal blue text/icons/checkboxes (PageNavigator, LayerTree, ProjectSettingsSidebar). Bottom toolbar = icons only, gold when active.
- [x] **Snap Guides**: Glitter Gold (H/V and diagonal). Video backdrop element behind Stage for future Infinite Comic Scroll.

## Phase 12 (remaining): Professional Typography & Balloon Suite

- [x] **Shape Hot-Swapping**: Selecting a new balloon shape replaces the current selection instead of creating a new one.
- [ ] **Inner-Balloon Control**:
  - [ ] Select, scale, and shift text boxes inside balloons independently.
  - [x] Add Text Alignment (Left, Center, Right, Top, Bottom).
- [x] **Tail Intelligence (Smart Overlap)**: Unified body+tail path for ellipse and rounded-rect balloons so the border does not show at the tail junction; draggable tail handle when balloon is selected.
- [x] **Snap Tail Cleanly**: Add button to auto-align tails to nearest panel edge.
- [x] **Defaults**: Set `Auto-Fit` to **OFF** by default for all new text/balloons.

## Phase 13: Project Management & Templates — COMPLETE

- [x] **Template Engine**: "Save Blank Panel Template" and "Apply template" in Settings → Panel templates; `PanelTemplate` / `saveBlankPanelTemplate` / `applyTemplate` in store.
- [x] **Cover Studio**: "Set as Cover" (📖) per page in PageNavigator; `isCover` on `ComicPage` disables gutter snapping for full-bleed.
- [x] **Genre Polish**: Smart Bias (`aiBias`) in GenreRegistry; `promptMiddleware.generatePrompt` appends it when genre is selected.
- [x] **Auto-Save**: Project state (including balloons and overlays) persists to localStorage every 30 seconds via `flushAutoSave()` in ComicLayout.

## Critical Bug-Squash List (Priority 1)

- [x] **Undo/Redo Stability**: State capture fixed: panel/vertex/edge drags now batch into one undo step via zundo pause/resume; first move pushes pre-drag state, subsequent moves skip history; drag end resumes. `captureUndoCheckpoint()` added for future use. Redo stack cleared on new action (zundo default).
- [x] **Insert Image Fix**: Menu bar and ribbon "Insert Image" now work: use current page and selected panels or add new panel with placeholder image; menu button uses onMouseDown so click fires before dropdown close. Asset Library has explicit "Insert Image" button (inserts first asset).
- [x] **Layer Checkboxes**: Visibility (eye) and Lock (padlock) toggles fixed: onPointerDown/onClick stopPropagation so DnD sortable does not capture; type="button" and aria-labels added. Store `toggleLayerVisibility` / `toggleLayerLock` already updated panels/balloons/drawings; UI now reflects immediately.

---

## Phase 14: Advanced Geometry & UI Refinement
*Focus: Precision paneling, UX feedback, and layout mechanics.*

### Panel Geometry & Tools
- [x] **Position on Click:** New panels spawn centered on cursor. Store `placePanelAtNextClick`; Menu/Ribbon "Add Panel" sets it; next stage click adds panel at page-local coords (zoom-aware). Context menu "Add panel" uses `pageLocalX/pageLocalY` for right-click position.
- [x] **Half-Circle & Quarter-Circle:** Panel primitives with SVG path specs (half: arches upward; quarter: bottom-right quadrant). ObjectToolbar buttons; Path rendering with shadow/glow/stroke; clip paths for image/texture.
- [x] **Sector panel:** `shapeType: 'sector'`, `centralAngle` (1–360°). Path from spec: M 0 0 L r 0 A r r 0 [largeArc] 1 [endX] [endY] Z. ObjectToolbar Sector button.
- [x] **Sector angle UI:** Panel dropdown shows "Sector angle" with −15° / +15° when a sector is selected. Drag handle on canvas (gold circle on arc): drag to wipe angle; undo batching via temporal pause/resume.
- [x] **Panel shape UX:** Panel menu: "Add panel (rectangle)" / "Add panel (circle)" with "click canvas to place" label; "Add panel at center"; "Panel shape (selected)" section (Rectangle, Circle/Ellipse, Half-circle, Quarter-circle, Sector). Right-click on panel → "Change shape" (same options). Place-panel hint banner when active: "Click on the canvas to place the new panel (circle)." Ribbon: "Add Panel" (rectangle) + "Add circle" with tooltips. Store `placePanelShape` and `setPlacePanelAtNextClick(active, shape?)`.
- [x] **Rotate handle:** Transformer rotate handle enabled for all panels (rectangle, ellipse, circle, half/quarter/sector, polygon). Rotation persisted in `onTransformEnd` to `panel.rotation`; node rotation reset so layout stays in sync.

### Core Systems
- [x] Debug and restore robust Undo/Redo functionality across all canvas actions (see Critical Bug-Squash).
- [ ] Implement the "Group Tool" to consolidate layers and synchronized object movement.

### UI/UX Aesthetic Overhaul
- [x] **Top Bar Slimming:** Remove icons from "File, Edit, View...", reduce font size, and decrease bar height.
- [x] **Ribbon Labels:** Add micro-text labels beneath each ribbon icon for clarity.
- [x] **Interaction Design:** Remove static outlines/dividers; implement a "Shadow Effect" (lift animation) on button press.
- [x] **Hover States:** Add "clickable" animations for all toolbar buttons on mouse-over.
- [x] **Theming:** Apply Golden Gradient to icons/text on blue backgrounds; apply Blue Gradient to ribbon backgrounds.
- [x] **Vertical Menus:** Swap backgrounds to Golden Gradient and text/icons to Blue Gradient.

### Format Dialog & Right-Click Context Menu
- [x] **Right-click context menu on canvas:** Hit-test (panel / balloon / empty); open context menu at pointer with Format…, Paste, Add panel/balloon, Delete as appropriate.
- [x] **Tabbed Format dialog:** Modal with Text | Object | Panel | Image tabs; Text tab has font, size, text color; Object/Panel tabs placeholder; Image tab shows asset grid — click to set panel image (when panel context) or page background (when empty). Opened from context menu or from menu bar.
- [x] **Insert image via right-click:** "Insert image…" on context menu for panel and empty; opens Format dialog on Image tab with mini asset library.
- [ ] **Format dialog tab content (planned phase):** Plan and implement full feature set per tab (Text: padding, stroke, 3D, warp, alignment; Object: fill, border, shadow, glow, texture; Panel: same object-style controls) in one go to avoid constant churn.

---

## Phase 15: High-Fidelity Color & Typography
*Focus: Creative expression through advanced gradients and WordArt.*

### Advanced Color System
- [ ] Build a robust Color Wheel with "Favorites" and "Recently Used" slots.
- [ ] **Gradient Engine:** Implement Linear (Angle/Directional), Radial, and Rectangular gradients.
- [ ] **Property Controls:** Add individual sliders for brightness, transparency, and stop-position for each color in a gradient.
- [ ] **Universal Application:** Map gradients to WordArt, Panels, Balloons, and Objects.

### Input Hardware (Sliders)
- [ ] Extend slider lengths and add visible tick marks.
- [ ] Implement "Snap-to-Tick" functionality.
- [ ] Integrate `+/-` precision controls for all vertical menu sliders.

### WordArt & Warp Engine
- [ ] **Style Gallery:** Create a preset library (3D, Glowing, Drop Shadow, Multi-color Gradients).
- [ ] **Objectification:** Treat text blocks as standard objects (allowing text-wrap and free-transform).
- [ ] **Path Warping:** Implement the following warp profiles:
    - Arch (Up/Down), Circular, Wavy, Button.
    - Square/Triangle/Cascade/Slant/Fade (Up/Down).
- [ ] Create a modular "Placeholder" slot for future custom warp algorithms.