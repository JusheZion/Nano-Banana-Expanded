# Nano Banana Studio: Phase 6 Tasks

- [x] **Data-Driven Architecture**
  - [x] Update components to read `TextureRegistry.json` directly (or via a dynamic import/fetch) rather than hardcoding.
  - [x] Use `ProjectTemplate.json` as the baseline state structure.
- [x] **JSON Serialization (Save/Load)**
  - [x] Implement robust Save/Load for the `elements` array in `comicStore`.
  - [x] Recalculate Geometry/Cover scale for images inside polygons upon load.
- [x] **Undo/Redo System**
  - [x] Integrate `zundo` with Zustand store (`comicStore.ts`).
  - [x] Wire up Undo/Redo keybindings (Cmd+Z / Cmd+Shift+Z) and buttons if necessary.
- [x] **Studio Intelligence (Mock AI Workflow)**
  - [x] Implement "Inclusive Bias Enabled" toggle and "Demographic Focus" text input in Project Settings.
  - [x] Build Prompt Middleware to append string based on settings and generic queries.
  - [x] Add "Mock Generate" button in Asset Library that assigns a random local asset to the selected panel.
  - [x] Verify image persistence after Save, Refresh, and Load.
- [x] **UX Tooltips**
  - [x] Install and configure `@radix-ui/react-tooltip`.
  - [x] Add accessible hover tooltips for all toolbar icons and buttons in `ComicLayout`, `ObjectToolbar`, and `TextToolbar`.
- [x] **Auto-Framing**
  - [x] Add `generateStandardGrid(pageId)` to `comicStore.ts` to auto-populate a page with a 2x3 grid of empty panels.
  - [x] Add a "Standard Grid" button to the UI (e.g. in `ObjectToolbar` or Header) to trigger the generator.

# Phase 7: Dynamic Auto-Layout Engine

- [x] **Data & Layout Architecture**
  - [x] Revert fixed layout templates in `comicStore.ts`.
  - [x] Implement `splitPanel(panelId, direction, slant)` capable of calculating adjacent identical polygons with standard gutter gaps.
- [x] **Boolean Masks for Overlays**
  - [x] Add `exclusionMask` property or automatic SVG logic in `ComicPanel.tsx` to puncture holes behind `ellipse` shaped panels dynamically.
- [x] **UI Integration**
  - [x] Add "Split Horizontally" and "Split Vertically" controls to the selection toolbar.
  - [x] Add a slants variance control.
- [x] **Verification**
  - [x] Test dynamic panel splitting ensuring no overlaps.
  - [x] Test circle masking visual effects.

# Phase 7.5: Dynamic Layout Refinement
- [x] **Geometry Flipping for Slants**
  - [x] Implement mathematical `flipX` and `flipY` in `comicStore.ts` for Polygons (reverses slant cuts dynamically).
- [x] **Ellipse Composition and Resizing**
  - [x] Fix `Transformer` bindings to allow Ellipses to be resized non-uniformly (aspect ratio unlocked).
  - [x] Separate `ComicCanvas` background into its own `<Layer>`.
  - [x] Implement `destination-out` double-pass in `ComicPanel` to draw perfectly cropped borders on boolean hole cut-outs.
- [x] **Panel Rotation**
  - [x] Add `rotation` state to `Panel`.
  - [x] Map `<Group rotation={...}>` in `ComicPanel` and implement rotation controls.

# Phase 8: Multi-Page & Cinematic Layouts
- [x] **State Persistence**
  - [x] Implement Zustand `persist` middleware in `comicStore.ts` for auto-saving to `localStorage`.
- [x] **Page Management System**
  - [x] Update `comicStore.ts` with `addPage`, `removePage`, `duplicatePage`, and `reorderPages` logic.
- [x] **Page Navigator Sidebar**
  - [x] Create `PageNavigator.tsx` sidebar with mini-previews of all pages.
  - [x] Implement DnD (drag-and-drop) logic for reordering. (Using up/down standard ordering via array manipulation for reliability)
- [x] **Vertical Webtoon Canvas**
  - [x] Update `ComicCanvas.tsx` to stack pages vertically with separators.
- [x] **2-Page Spread Mode**
  - [x] Add `layoutMode: 'webtoon' | 'spread'` to `comicStore`.
  - [x] Implement conditional horizontal rendering logic in `ComicCanvas.tsx` for side-by-side splash pages.

# Phase 9: Word Art & Professional Publishing
- [x] **Zoom Controls**
  - [x] Implement Zoom to Fit/Page functionality in ComicCanvas to plan layouts at full scale.
- [x] **Word Art Studio**
  - [x] "Sound Effect" tool (e.g., 'POW', 'BOOM') with warped text and custom comic fonts.
  - [x] Cover Art Logos: Support for text-stroke, multi-layered fills, and outer glows.
- [x] **Word Art Studio: User Feedback**
  - [x] Fix TextToolbar wrapping so stroke controls are visible.
  - [x] Add new Balloon Styles: Fluffy Cloud, Action Starburst, Jagged Scream, Slanted Box.
  - [x] Add new Warp Effects: Circle, Deep Arch.
- [x] **Balloon Refinements**
  - [x] Update thought cloud tail to use shrinking bubbles.
  - [x] Add tailless thought cloud style.
  - [x] Remove tails from jagged scream and action starburst.
  - [x] Add "Double Burst" balloon style.
  - [x] Upgrade SFX Action and Impact templates with default warps and strokes.
- [x] **High-Res Export**
  - [x] Implement `downloadPNG` with `pixelRatio: 3.125` (300 DPI).
  - [x] Integrate `jsPDF` for PDF export mapping 800x1200 to 8.33" x 12.5".
  - [x] Add Export UI to ComicLayout/Header.
  
# Phase 11: Genre Intelligence & Thematic Engine
- [x] **Data Integration**
  - [x] Create `src/modes/comic/data/GenreRegistry.ts` with thematic presets.
  - [x] Update `comicStore.ts`: `currentGenreId` and `setGenre()`.
- [x] **Thematic Logic**
  - [x] Update defaults for new Speech Balloons/Text Boxes based on genre.
  - [x] Apply genre palette (strokeColor, pageBackground).
  - [x] Visual Feedback: Update UI Ribbon accent color.
  - [x] Apply to existing elements (Optional/Confirm prompt).
- [x] **Prompt Middleware Upgrade**
  - [x] Triple-Stack Logic: `[User Prompt] + [Demographic Focus] + [Genre Environmental Bias]`.
- [x] **UI Component**
  - [x] Genre Selector in Top Ribbon/Settings with font/swatch previews grid.
- [x] **Verification**
  - [x] Export tests (JSON persistence).
  - [x] Asset Library Mock AI logging correctly structured prompts.

# Phase 11.5: Custom Theme & Texture Support
- [x] **State Modification**
  - [x] Update `GenreRegistry.ts` `Genre` interface to include `textureId?` and `textureOpacity?`. Add `custom` to `GenreId`.
  - [x] Update `comicStore.ts` to include `customGenre: Genre` and actions for updating it.
- [ ] **UI Implementation**
  - [ ] Add the "Custom" option to the `ComicLayout.tsx` Genre Selector list.
  - [ ] When "Custom" is active, render an inline control panel inside the dropdown to edit Colors, Fonts, and Texture Overlays.
- [ ] **Element Application**
  - [ ] Ensure `applyGenreToAll` applies the genre's `textureId` to all panels.
  - [ ] Ensure `addPanel` initializes new panels with the active genre's `textureId`.
