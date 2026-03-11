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
- [x] **Oval tail mouth:** Narrowed tail base (angular half-width `delta`) on ellipse/whisper balloons so the tail starts thinner, matching rounded-rect style.
- [x] **Snap Tail Cleanly**: Add button to auto-align tails to nearest panel edge.
- [x] **Flip tail on Balloon ribbon:** Flip tail button (icon + label) in Balloon ribbon Tail group (next to Snap to edge) when a balloon with a tail is selected; also remains in Objects ribbon shape row.
- [x] **Defaults**: Set `Auto-Fit` to **OFF** by default for all new text/balloons.

## Phase 13: Project Management & Templates — COMPLETE

- [x] **Template Engine**: "Save Blank Panel Template" and "Apply template" in Settings → Panel templates; `PanelTemplate` / `saveBlankPanelTemplate` / `applyTemplate` in store.
- [x] **Cover Studio**: "Set as Cover" (📖) per page in PageNavigator; `isCover` on `ComicPage` disables gutter snapping for full-bleed.
- [x] **Genre Polish**: Smart Bias (`aiBias`) in GenreRegistry; `promptMiddleware.generatePrompt` appends it when genre is selected.
- [x] **Auto-Save**: Project state (including balloons and overlays) persists to localStorage every 30 seconds via `flushAutoSave()` in ComicLayout.

## Critical Bug-Squash List (Priority 1)

- [x] **Undo/Redo Stability**: State capture fixed: panel/vertex/edge drags now batch into one undo step via zundo pause/resume; first move pushes pre-drag state, subsequent moves skip history; drag end resumes. `captureUndoCheckpoint()` added for future use. Redo stack cleared on new action (zundo default).
- [x] **Undo/Redo — REBUILT (no zundo)**: Removed zundo/temporal entirely. **undoMiddleware** wraps persist’s `set`: before each mutation, pushes a JSON snapshot of `pages`, settings, `selectedElementIds`, etc. `comicUndo`/`comicRedo` pop stacks and `setState` the slice. **undoPause/undoResume** batch panel drags (same places ComicPanel used temporal pause). `loadProject` calls `undoClear()`. Dependency **zundo** removed; patch-package postinstall removed.
- [x] **MenuBar handleMenuBlockLeave**: Fixed `Uncaught TypeError: Failed to execute 'contains' on 'Node'` — guard with `related instanceof Node` before `dropdownRef.current?.contains(related)`.
- [x] **Insert Image Fix**: Menu bar and ribbon "Insert Image" use onMouseDown so action fires before dropdown/blur closes UI. Asset Library has dedicated "Insert Image" button (onMouseDown + `handleAssetClick(ASSETS[0])`). Ribbon `RibbonButton` supports optional `onMouseDown` for the same pattern.
- [x] **Layer Checkboxes**: Visibility/Lock fixed by moving `@dnd-kit` `listeners` off the row onto a grip handle only (`GripVertical`), so eye/padlock clicks are not captured as drag starts. Store toggles unchanged.

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
- [x] **Tabbed Format dialog:** Modal with Text | Object | Panel | Image tabs; Text tab has font, size, text color; Object/Panel tabs have fill, gradient, stroke + ColorWheelPicker; Panel tab has **Fill** and **Line (border)** sections with parity (solid + gradient each), hex input, favorites; Image tab shows asset grid. Opened from context menu or from menu bar.
- [x] **Panel tab Fill/Line parity:** Clear Fill vs Line (border) sections; both support solid color (ColorWheelPicker + favorites) and gradient (GradientBuilder). Panel stroke gradient applied in ComicPanel (`panelStrokeProps`).
- [x] **Hex and numeric inputs:** ColorWheelPicker and GradientBuilder stop color accept typed hex (apply on valid/blur/Enter); GradientBuilder angle has number input (0–360°) alongside slider.
- [x] **Format dialog color UX:** Hex fields no longer duplicate characters (commit on blur/Enter only; sync from value only when input not focused). Eyedropper uses Pipette icon (lucide-react); color wheel same size as S/V square (160×160), full disk (no hole). Min-height on color sections so picker is visible. Eyedropper (Pipette) when supported (e.g. Chrome).
- [x] **Insert image via right-click:** "Insert image…" on context menu for panel and empty; opens Format dialog on Image tab with mini asset library.
- [ ] **Format dialog tab content (planned phase):** Plan and implement full feature set per tab (Text: padding, stroke, 3D, warp, alignment; Object: shadow, glow, texture; Panel: same) in one go to avoid constant churn.

---

## Phase 15: Color Systems & Typography Warp
*Focus: Advanced Gradient Engine, Pro Color Wheel, WordArt Warp System, Slider Precision.*

### 1. Advanced Color & Gradient Engine
- [x] **Color Wheel:** High-fidelity picker (custom canvas HSV: hue ring + S/V square) with Golden-Blue styling.
- [x] **Favorites & Recently Used:** Persistent slots (store colorFavorites, colorRecentlyUsed + persist); add/select from UI.
- [x] **Gradient Builder:** UI for Linear (angle), Radial, and Rectangular gradients; type selector, stop strip (click to add), per-stop color + Position/Brightness/Transparency (PrecisionSlider).
- [x] **Multi-Stop Control:** Add/remove color stops; sort by offset before render (gradientUtils.sortStops).
- [x] **Property Sliders (per stop):** Brightness (0–100%), Transparency (0–1), Position (0–100%) via PrecisionSlider.
- [x] **Application:** Gradients applied to Panel fill (ComicPanel), Balloon fill and text (BalloonNode); Format dialog Text/Object/Panel tabs: ColorWheelPicker + GradientBuilder; undo/redo via store.

### 2. WordArt & Path-Warping Engine
- [ ] **Objectification:** Convert text into WordArt Objects (manipulable like paths; scope as time allows).
- [ ] **Warp Profiles:** Library mapping text characters along paths: Arch (Up/Down), Circular, Wavy, Button, Square, Triangle, Cascade, Slant, Fade (use warp math source of truth).
- [ ] **Placeholder Slot:** Architecture for `customWarp` to be plugged in later (`registerCustomWarp`).
- [ ] **Style Gallery (optional):** Presets for 3D, Glowing, Drop Shadow, Multi-color Gradients.

### 3. Slider Precision (UI)
- [x] **Extended Sliders:** Increase physical length of all formatting sliders (e.g. 120–160px in menus).
- [x] **Tick Marks & Snap-to-Tick:** Visible tick marks (Golden-Blue style); snap value to tick when enabled.
- [x] **Precision Buttons:** Add `+` and `−` to every slider in vertical menus for 1-unit (or step) increments.
- [x] **Reusable Component:** `PrecisionSlider` used in ObjectToolbar, TextToolbar, ProjectSettingsSidebar, FormatDialog.

---

## Phase 16: Home Ribbon, Office-Style Formatting & WordArt (Agent Onboarding)
*Focus: Home ribbon with high-frequency tools; Word/PPT-style context menus and Format dialog; MS Office–inspired WordArt.*

### 1. Home Ribbon Transformation
- [x] **Rename File → Home:** Menu bar first menu "File" → "Home"; ribbon and layout use `activeMenu === 'home'`.
- [x] **Revise:** Undo / Redo in Home ribbon (reuse existing handlers).
- [x] **Clipboard:** Copy / Cut / Paste in Home ribbon; wire from ComicLayout to ContextualRibbon.
- [x] **Font:** Font selection, Font size, Bold, Italic, Underline in Home ribbon (balloon overrides; apply in BalloonNode).
- [x] **Color:** Color Wheel shortcut button (context-aware: opens Format dialog on Text/Panel/Object tab by selection).
- [x] **Panels:** Add Square Panel, Split H, Split V in Home ribbon.
- [x] **Images:** Insert Image in Home ribbon.
- [x] **Balloons:** Quick-insert Round Speech, Modern Square, Thought Balloon (with tail) from Home ribbon.
- [x] **Layout:** Layer Front/Back, Group (disabled), Clone in Home ribbon.

### 2. Office-Style Formatting & Menus
- [ ] **Right-click context menu (deep):** Submenus (Format, Add, Order, Change shape); options change by selection (Panel vs Text vs Image vs Empty); Order (Bring to front / Send to back), Clone.
- [ ] **Format dialog tabs:** Reorganize/rename to Fill & Line, Effects, Text Box, Size & Properties; professional borders, subtle shadows, ARCS Golden-Blue theme throughout.

### 3. Microsoft-Inspired WordArt
- [ ] **Transform paths:** Office-style profiles (Arch Up/Down, Circle, Button, Wave, Square, Triangle, Cascade, Slant, Fade) in warpProfiles; expose in Transform dropdown.
- [ ] **Presets:** Reflection, Glow, 3D; preset chips or gallery in Format dialog and TextToolbar.
- [ ] **WordArt UI:** Transform dropdown (full list), Reflection/Glow/3D controls; optional WordArt preset gallery.