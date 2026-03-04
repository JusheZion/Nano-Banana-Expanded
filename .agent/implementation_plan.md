# Phase 6 Implementation Plan: Serialization, Undo/Redo & Studio Intelligence

Implement JSON Save/Load capabilities for the comic store, complete wiring for the Undo/Redo system, introduce the "Smart Default" AI prompt logic, implement UX hover tooltips for better discoverability, and add an Auto-Framing grid generator.

## User Review Required
> [!IMPORTANT]
> The `comicStore` currently stores elements natively in the `pages` array. The saved JSON will mirror this internal state for now, but wrapped in a metadata object to match the `ProjectTemplate.json` schema. Are there any objections to extending `useComicStore` with `serializeProject` and `loadProject` methods?

## Proposed Changes

### 1. JSON Serialization (Save/Load)
*   #### [MODIFY] `src/stores/comicStore.ts`
    *   Add `serializeProject()`: Extracts the `pages` array and wraps it in the `ProjectTemplate.json` baseline metadata. Triggers a JSON download via a Blob.
    *   Add `loadProject(jsonString)`: Parses JSON, validates it against the schema, and automatically recalculates the "Cover" object-fit image scale for polygon vertices using bounding box math. Replaces the current `pages` array in Zustand.
*   #### [MODIFY] `src/modes/comic/layouts/ComicLayout.tsx`
    *   Add "Save JSON" and "Load JSON" (via an invisible `<input type="file" />`) buttons to the top header toolbar.

### 2. Undo/Redo System
*   #### [MODIFY] `src/stores/comicStore.ts`
    *   Ensure `temporal` from `zundo` tracks all manual modifications to elements accurately.
*   #### [MODIFY] `src/modes/comic/layouts/ComicLayout.tsx`
    *   The Cmd+Z / Cmd+Shift+Z shortcuts are already present, but UX buttons for `Undo` (↶) and `Redo` (↷) will be added to the header toolbar alongside Save/Load.

### 3. Studio Intelligence ("Mock AI" Workflow & Prompt Middleware)
*   #### [NEW] `src/modes/comic/utils/promptMiddleware.ts`
    *   Implement the strict `generatePrompt(userInput, settings)` function handling the "Unless Specified" logic. Identifies baseline terms and appends the bias string if enabled.
*   #### [NEW] `src/modes/comic/components/ProjectSettingsSidebar.tsx`
    *   Create a side panel (similar to AssetLibrary) containing the `inclusiveBiasEnabled` toggle and `demographicFocus` text field.
*   #### [MODIFY] `src/modes/comic/layouts/ComicLayout.tsx`
    *   Add a "Project Settings" toggle to open this new sidebar.
*   #### [MODIFY] `src/modes/comic/components/AssetLibrary.tsx`
    *   Add a bold **"Mock AI Generate"** button at the top. On click, it will read the selected panel's prompt (or use a placeholder), pass it through middleware, log the constructed prompt, and apply a random asset to the panel to verify the workflow.

### 4. UX Tooltips
*   #### [MODIFY] `package.json`
    *   Install `@radix-ui/react-tooltip`.
*   #### [NEW] `src/components/ui/Tooltip.tsx`
    *   Create a reusable wrapper component for the Radix Tooltip primitives, styled with Tailwind for a cinematic glassmorphic look.
*   #### [MODIFY] `src/modes/comic/layouts/ComicLayout.tsx` & Toolbars
    *   Wrap toolbar icons and buttons (`↶ Undo`, `Save JSON`, `Add Panel`, etc.) in the new `<Tooltip>` component to replace standard `title` attributes.

### 5. Auto-Framing
*   #### [MODIFY] `src/stores/comicStore.ts`
    *   Add `generateStandardGrid: (pageId: string) => void`. This function will wipe the current panels on the page and instantiate a 2x3 grid of empty generic `rect` panels evenly spaced out across the 800x1200 logical canvas.
*   #### [MODIFY] `src/modes/comic/components/ObjectToolbar.tsx`
    *   Add a "Grid Generator" icon/button that calls `generateStandardGrid(currentPageId)`. Ensure this has an accompanying Tooltip.

## Verification Plan

### Manual Verification
1.  **Serialization cycle**:
    *   Run `npm run dev` and open the Comic Studio.
    *   Draw a polygon, mock generate an image, and modify image scale/offsets.
    *   Click **Save JSON** to download the project.
    *   Refresh the browser page to clear the state.
    *   Click **Load JSON** and select the downloaded file. Confirm the generated image reappears with correct polygon clipping and math.
2.  **Undo/Redo check**:
    *   Move elements and use the new UI buttons and Cmd+Z/Cmd+Shift+Z to step forward and backward.
3.  **Prompt Logic check**:
    *   Change the Demographic Focus string in settings. Include a generic prompt, hit Mock Generate. Confirm the console logs the correctly appended Prompt.

### Phase 7: Dynamic Auto-Layout Engine
A smart algorithmic system to automatically partition the canvas, reshape adjacent panels dynamically to prevent overlapping, and boolean-mask complex shapes.

*   #### [MODIFY] `src/stores/comicStore.ts`
    *   **Algorithmic Slicing (BSP Tree Pattern):** Introduce a `splitPanel(panelId, direction, slant)` method. When a user clicks "Split Panel", it divides the selected panel into two. 
    *   **Identical Slopes:** The `slant` argument computes matching mathematical offsets on the polygon shared edges, ensuring perfectly parallel gaps (gutters).
    *   **Circle Exclusions:** Add logic to manage SVG masking. Circular panels will automatically punch a "hole" (via `clip-path` or `<mask id="...">`) out of the rectangular backing panels to simulate complex panel-in-panel architecture.
*   #### [MODIFY] `src/modes/comic/engine/ComicPanel.tsx`
    *   Apply the SVG mask dynamically if the panel is underneath an exclusion layer.
*   #### [MODIFY] `src/modes/comic/layouts/ComicLayout.tsx` & `ObjectToolbar.tsx`
    *   Remove legacy template buttons. 
### Phase 7.5: Dynamic Layout Refinement
Based on user feedback, the following refinements will be made to the Layout Engine:

*   #### [MODIFY] `src/stores/comicStore.ts`
    *   **Geometry Flipping for Slants:** Instead of adding "reverse" buttons for slants, implement mathematical `flipX` and `flipY` in `toggleFlip` specifically for Polygons. This calculates the mirrored coordinates of the polygon's vertices around its bounding box center, instantly reversing the direction of geometric cuts.
    *   **Panel Rotation:** Add an optional `rotation` property to the `Panel` interface.

*   #### [MODIFY] `src/modes/comic/components/ObjectToolbar.tsx`
    *   Activate the `toggleFlip` functionality for Panels (it currently only affects balloons).
    *   Add a "Rotate" button that increments the Panel's rotation by 15 or 90 degrees.

*   #### [MODIFY] `src/modes/comic/engine/ComicCanvas.tsx`
    *   **Background Layer Separation:** Move the white `background-rect` down into a separate `<Layer name="layer-background">`. This allows the comic elements layer to use advanced compositing without punching holes straight through to the DOM background.

*   #### [MODIFY] `src/modes/comic/components/ComicPanel.tsx`
    *   **Ellipse Composition Math:** Replace the opaque halo with a two-pass true SVG composite:
        1.  **Border Pass:** Render a slightly larger `destination-out` or `source-atop` stroke pass to mathematically erase the intersecting panels beneath it, leaving a perfect border *only* where the ellipse actually overlaps another panel.
        2.  **Fill Pass:** Render the gap as a `source-over` white fill to cover up the interior, producing a flawless "cut out" look.
    *   **Aspect Ratio Unlocking:** Ensure the `Transformer` attached to ellipses allows independent X/Y scaling instead of uniform scaling.
### Phase 8: Multi-Page & Cinematic Layouts
The next evolution of the Comic Engine transforms the single-canvas experience into a scrolling Webtoon or multi-page comic book suite.

*   #### [x] `src/stores/comicStore.ts`
    *   **Page Management:** Add functions for `addPage`, `removePage`, `duplicatePage`, and `reorderPages`.
    *   **Vertical Stacking:** Introduce a `layoutMode` state.
    *   **State Persistence:** Integrate Zustand `persist` middleware for auto-saving project layout and metadata to `localStorage`.
*   #### [x] `src/modes/comic/components/PageNavigator.tsx`
    *   **Thumbnail Sidebar:** Build a collapsible right-hand sidebar showing previews of all pages in the current project.

### Phase 9: Word Art & Professional Publishing
*   #### [x] High-Res PNG & PDF Export
    *   **Implementation:** Modified `ComicCanvas.tsx` to utilize `stageRef.current.toDataURL` with specific clipping boxes (`x, y, width, height`) for each page individually.
    *   **Resolution Engine:** Set the `pixelRatio` to precisely `3.125` relative to the base 800x1200 scale to yield true 2500x3750 pixel (300 DPI) output.
    *   **PDF Compiler:** Imported `jspdf` to stitch the high-res 300 DPI image buffers into an 8.33" x 12.5" print-ready standard document.
    *   **Action Logic:** Add simple up/down/duplicate/delete methods mapped to array manipulation in Zustand.
*   #### [x] `src/modes/comic/engine/ComicCanvas.tsx`
    *   **Infinite Scrolling:** Refactor the `Stage` rendering logic to iterate over `pages`.
    *   **Coordinate Math:** Translate Webtoon (vertical) and Spread (side-by-side) offsets automatically so interactions like Knife slicing, marquee selection, and drawing automatically target the correct page geometry.

*Please review this plan. Are there any specific features you'd like to prioritize for Phase 8?*

### Phase 9: Word Art & Professional Publishing

*   #### [NEW] Zoom Controls Interface
    *   **Context:** While infinite canvas scrolling helps navigation, users need macro-level overviews of their layouts.
    *   **UI Additions (`ComicLayout` / `ComicCanvas`):** Add a persistent floating "Zoom Toolbar" in the bottom-right corner of the canvas view.
    *   **Controls:** It should include buttons for: 
        *   `-` (Zoom Out)
        *   `+` (Zoom In)
        *   `100%` (Reset to Actual Size)
        *   `Fit Width` (Scales the Stage conceptually so the 800px or 1600px width matches the viewport dimensions window)
    *   **State (`comicStore`):** Add `zoomLevel` (default `1.0`) to the Zustand store.
    *   **Coordinate Math:** All pointer interactions (`handleStageMouseDown`, `handleStageMouseMove`, etc.) explicitly need to be refactored to multiply relative Konva positions by `(1 / zoomLevel)` so that drawing, selection, and slicing match visual positions regardless of scale.

### Word Art Studio & Sound Effects
**Goal:** Introduce professional comic-style text rendering (sound effects, logos) with powerful styling options like strokes, double-outlines, outer glows, and path warping.

To maintain simplicity and leverage existing systems, we will extend the `BalloonInstance` (which already powers our TextToolbar and canvas drag/drop) to support Word Art properties.

#### Store (`src/types/balloon.ts` & `src/stores/comicStore.ts`)
1. Extend `BalloonInstance` and `BalloonOverrides` with:
   - `textStroke?: string`
   - `textStrokeWidth?: number`
   - `secondaryTextStroke?: string` (for double outlines)
   - `secondaryTextStrokeWidth?: number`
   - `textWarp?: 'none' | 'arcUp' | 'arcDown' | 'wave'`
2. Add new `BalloonStyleId` presets such as `sound_effect_action` (no bubble, bold font, heavy stroke) and `sound_effect_impact` (warped text, high spikes if backing used).

#### Rendering (`src/modes/comic/components/BalloonNode.tsx`)
1. Refactor the `Text` rendering block.
2. If multiple strokes are needed (e.g. `textStroke` and `secondaryTextStroke`), render multiple `Text` nodes overlaid on top of each other from thickest to thinnest stroke, and finally the `fill` text, to circumvent Konva's drawing-stroke-over-fill limitations.
3. If `textWarp` is not `'none'`, render a `TextPath` node instead of `Text`, computing a simple SVG path based on the warp type and text boundaries.

#### UI (`src/modes/comic/components/TextToolbar.tsx`)
1. Enhance the `TextToolbar` to include a "Word Art" tab or section if a Sound Effect style is selected, or just add stroke/glow controls for all text.
2. Add a sub-menu for 'Warp Effect'.
3. Allow setting the primary and secondary stroke colors.
*   #### [NEW] Word Art Studio
    *   **Sound Effect Tool:** Implement a specialized text tool (like 'POW', 'BOOM') with Konva `TextPath` or similar warping text node, plus custom comic fonts.
    *   **Cover Art Logos:** Enhance generic Text editing by enabling text-stroke properties, multi-layered fills, and outer glows on selected text.

### Word Art Studio & Balloons: User Feedback
**Goal:** Address user feedback regarding toolbar placement, lack of diverse balloon shapes, and requests for specific text warp effects (like Follow Path) and intensity controls.

#### UI (`src/modes/comic/layouts/ComicLayout.tsx` & Toolbars)
1. Rather than fighting screen space at the bottom, wrap `ObjectToolbar` and `TextToolbar` in a static/responsive absolute container positioned on the **Left Side** (`top-20 left-4`, flex column) right below the main header Menu.
2. Update the Toolbars to remove their existing absolute bottom-center positioning so they sit naturally in the new left-sided flex container, preventing overlap.

#### Store (`src/types/balloon.ts` & `src/modes/comic/data/BalloonStyles.ts`)
1. Extend `BalloonStyleId` to include new shapes: `cloud_fluffy`, `starburst_action`, `scream_jagged`, `box_slanted`.
2. Update `BALLOON_STYLES` to include these new presets.
3. Add `circle` and `arch` variants to the `textWarp` override type.
4. Add `textWarpIntensity?: number` and `textLetterSpacing?: number` to `BalloonOverrides`.

#### Rendering (`src/modes/comic/components/BalloonNode.tsx`)
1. Enhance the `renderBody` function to draw SVG `<Path>` for the new balloon types algorithmically based on `w` and `h` instead of just primitive shapes.
2. Expand the `warpPathData` hook to generate circular paths for the `circle` warp effect and deeper arcs for `arch` variations, taking `textWarpIntensity` into account.
3. Add `letterSpacing` support to `<Text>` and `<TextPath>`.
4. Ensure the Konva `Transformer` for balloons has `rotateEnabled={true}` and `rotateAnchorOffset={30}` so the rotation handle is prominently visible and accessible even when `resizeEnabled` is disabled.

#### Toolbars (`src/modes/comic/components/TextToolbar.tsx`)
1. Add slider inputs for "Warp Intensity" and "Letter Spacing" in the TextToolbar.

### Balloon Refinements
**Goal:** Address user feedback regarding specific balloon shapes, tails, and SFX templates.

#### Store (`src/types/balloon.ts` & `src/modes/comic/data/BalloonStyles.ts`)
1. Add `cloud_fluffy_no_tail` and `double_burst` to `BalloonStyleId`.
2. Update `BalloonStyles.ts`:
   - Set `hasTail: false` for `starburst_action` and `scream_jagged`.
   - Add `cloud_fluffy_no_tail` and `double_burst` objects.
   - Update `sound_effect_action` with `textWarp: 'wave'`, `textStroke: '#000000'`, `textStrokeWidth: 4`.
   - Update `sound_effect_impact` with `textWarp: 'arch'`, `textStroke: '#ffffff'`, `textStrokeWidth: 3`, `secondaryTextStroke: '#000000'`, `secondaryTextStrokeWidth: 5`.

#### Rendering (`src/modes/comic/components/BalloonNode.tsx`)
1. Update `renderTail` to draw 3 shrinking circles when `tailStyle === 'bubbles'`. The bubbles should interpolate between the balloon edge and the tail tip.
2. Update `renderBody` to support `double_burst`. Draw a large outer burst and a slightly smaller inner burst (filled with white or the primary fill) using `Path`.

*   #### [x] High-Res Export
    *   **Export Engine:** Update the `exportTrigger` logic to calculate the full pixel dimensions of all pages and output a 300 DPI PNG. Combine with an external library (like `jspdf`) if PDF export is required.

*   #### [x] Genre Intelligence & Thematic Engine
    *   **One-Click Themes:** Built `GenreRegistry` and integrated `currentGenreId` into `comicStore`. Implemented UI dropdown in `ComicLayout` that overwrites global backgrounds, default bounds, default fonts, and injects thematic bias explicitly into the AI generation parameter stack via `promptMiddleware`.

*   #### [NEW] Custom Theme & Texture Support
    *   **Store modifications:** We will extend the `GenreRegistry` by adding an option for the user to select and configure a totally custom palette and explicitly inject a `Texture Overlay` using the existing `TextureRegistry`.
    *   **UI Controls:** We'll upgrade the `Genre Selector` under the Theme menu. When "Custom" is active, it will unveil color pickers and sliders right within the dropdown menu, so the user can easily swap backgrounds, glowing panels, borders, fonts, and choose a pattern fill (e.g. halftone dots, manga screentones) that propagates across all objects globally when the generic "Apply to All" button is clicked.
