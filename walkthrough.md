# Nano Banana: Walkthrough & Roadmap

High-level narrative of where the project is and where it's going. For checklists and technical steps, see **tasks.md** and **implementation_plan.md**.

---

## Current Stack

- **UI**: React 19, Vite 7, Tailwind, Radix UI (e.g. Tooltip), lucide-react icons
- **Canvas**: Konva + react-konva (Stage, Layer, Group, Rect, Line, Image, Transformer, etc.)
- **Snapping**: `snapping.ts` (getSnapLines, getGutterAwareSnapLines, getVertexSnapLines with DiagonalGuide), `geometry-utils.ts` (calculateSlope, isParallel, getGutterSnapPoints)
- **State**: Zustand (`comicStore`) with **persist** (localStorage) and **explicit undo/redo** (snapshot stack middleware—no zundo)
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

### Phase 14: Panel Geometry & Circular Primitives
- **Position on Click:** "Add Panel" from menu or ribbon sets `placePanelAtNextClick`; next click on canvas adds a 200×200 polygon centered at cursor (page-local, zoom-aware). Right-click → Add panel uses `contextMenu.pageLocalX/pageLocalY` to center the new panel.
- **Panel shape & place-panel UX (Mar 2025):** Store: `placePanelShape` ('polygon' | 'ellipse'), `setPlacePanelAtNextClick(active, shape?)`. **Menu Bar → Panel:** "Add panel" section: "Add panel (rectangle) — click canvas to place", "Add panel (circle) — click canvas to place", "Add panel at center"; "Panel shape (selected)": Rectangle, Circle/Ellipse, Half-circle, Quarter-circle, Sector (all apply to selected panels). **Right-click panel:** "Change shape" block with same five options; `updatePanel(pageId, panelId, { shapeType })`. **ComicLayout:** When `placePanelAtNextClick` is true, blue banner: "Click on the canvas to place the new panel (circle)." **ContextualRibbon:** "Add Panel" (rectangle) + "Add circle" with tooltips "Add rectangle — click on canvas to place" / "Add circle — click on canvas to place". Add-at-center uses page center (800×1200 → 400,600) for a 200×200 panel.
- **Half-Circle, Quarter-Circle, Sector:** **Halo & borders:** Halos now use **sceneFunc** (stroke offset boundary + destination-out inner punch), matching the ellipse pipeline so borders flow neatly. **Half-circle** orientation fixed: panel path uses SVG sweep 0 (top semicircle); halo uses `arc(..., Math.PI, 0, true)` so the ring aligns with the curved edge. Gap on straight edges (chord/radials) is not drawn by design. (half: M -r 0 A r r 0 0 0 r 0 Z; quarter: M 0 0 L r 0 A r r 0 0 1 0 r Z; sector: M 0 0 L r 0 A r r 0 [largeArc] 1 [endX] [endY] Z). ObjectToolbar shape buttons; ComicPanel renders via Konva Path (fill, shadow, glow, stroke, clip). Sector has `centralAngle` (1–360°).
- **Sector angle controls:** Panel dropdown shows "Sector angle" with −15° / +15° when a sector is selected. On canvas, a gold drag handle on the sector arc allows wiping the angle in real time; undo batching applied.
- **Rotate handle:** All panels (rectangle, ellipse, circle, half/quarter/sector, polygon) show the Konva Transformer rotate handle when selected. `ComicPanel.tsx`: `rotateEnabled={true}` on the Transformer; `onTransformEnd` reads `node.rotation()`, resets node scale/rotation, and passes `rotation` into `onChange()` so `panel.rotation` is persisted and applied on the Group.

### Phase 15: Color Systems & Typography Warp (In Progress)
- **Implementation plan:** `implementation_plan.md` has a full Phase 15 section: Color Wheel + Favorites/Recently Used, Gradient Builder (linear/radial/rect, multi-stop, per-stop brightness/transparency/position), Konva application to panels/balloons/text, WordArt warp profiles + `registerCustomWarp` placeholder, slider precision.
- **Tasks:** `tasks.md` Phase 15 reorganized into: (1) Advanced Color & Gradient Engine, (2) WordArt & Path-Warping Engine, (3) Slider Precision.
- **PrecisionSlider (done):** New `PrecisionSlider.tsx` in comic components: extended track (default 140px), Golden-Blue track gradient, optional tick marks, snap-to-tick, optional +/- buttons. Used in ObjectToolbar, TextToolbar, ProjectSettingsSidebar.
- **Color & Gradient (done):** **ColorWheelPicker**: custom canvas HSV (hue ring + S/V square), hex input, Apply + Favorites/Recently Used rows; **GradientBuilder**: type (linear/radial/rect), angle for linear, stop strip (click to add), per-stop color + Position/Brightness/Transparency (PrecisionSlider), preview. **Store**: `colorFavorites` (max 12), `colorRecentlyUsed` (max 16), `addColorToFavorites`, `removeColorFromFavorites`, `addColorToRecentlyUsed` (persisted). **Types**: `src/types/gradient.ts` (GradientSpec, GradientStop); Panel and BalloonOverrides have `fillGradient`, `strokeGradient`, `textColorGradient`. **gradientUtils**: sortStops, toKonvaColorStops, applyBrightnessAndAlpha, linearGradientPoints. **ComicPanel**: panel background uses `panelFillProps` (linear/radial gradient or solid). **BalloonNode**: body uses `bodyFillProps`, text uses `textFillProps` (solid or textColorGradient). **FormatDialog**: Text tab (ColorWheelPicker + GradientBuilder for text color/gradient), Object tab (fill, fill gradient, stroke + ColorWheelPicker), Panel tab (border color, fill gradient). Remaining Phase 15: WordArt warp profile library + customWarp slot.

### Priority 1 Bugs (Fixed)
- **Undo/Redo**: Panel, vertex, and edge drags now record one undo step per gesture (zundo pause on drag start, resume on first move to push pre-drag state, pause for remaining moves, resume on drag end). Redo stack clears on new action (zundo default). Store has `captureUndoCheckpoint()` for optional batch commits. **Mar 2025:** Undo/redo buttons and Cmd+Z / Cmd+Shift+Z again invoke temporal API directly via stable callbacks in `ComicLayout` (no optional guard so clicks always call `undo()`/`redo()`).
- **Format dialog Panel tab:** When a panel is selected, the Panel tab now resolves the panel by (1) explicit `panelId`/`pageId` from context menu, (2) selected panel on current page, (3) selected panel on any page — so Border color and Fill gradient controls show instead of "Select a panel to format…".
- **Format Panel tab UX (Fill / Line parity):** Panel tab reorganized into two clearly labeled sections: **Fill** (Solid fill + Fill gradient, with ColorWheelPicker favorites/recent) and **Line (border)** (Solid line + Line gradient, same options). Both sections use the same controls for consistency. Panel border can now use **stroke gradient** (ComicPanel `panelStrokeProps` from `panel.strokeGradient`); fill and line both support gradients and favorites.
- **Format dialog color & gradient:** Hex input in ColorWheelPicker and GradientBuilder no longer duplicates characters: commit to parent only on blur/Enter; sync from `value` only when the input is not focused. GradientBuilder stop hex and angle number input unchanged. **Eyedropper**: Pipette icon (lucide-react) when `window.EyeDropper` is supported; same behavior as before. **Color wheel**: Same size as S/V square (160×160), full disk (no hole) via `drawHueDisk`; both pickers use `PICKER_SIZE`. Format dialog color sections have min-height so the picker is visible.
- **Balloon tail:** Oval (speech_round, whisper_dashed) tail mouth narrowed so the tail starts thinner (`delta` clamped smaller in `unifiedEllipseTailPath`). **Flip tail** control remains in Objects ribbon shape row and is now also in the **Balloon** ribbon Tail group (next to Snap to edge) when a balloon with a tail is selected.
- **Undo/Redo (zundo + persist) — BUG STILL PERSISTS:** Undo worked once then stopped; redo never worked. A repair was attempted (see **“Undo/Redo repair attempt”** below). The bug still persists and remains to be fixed. Undo/Redo remain only on the **Edit** ribbon (removed from View).
- **MenuBar handleMenuBlockLeave**: Fixed `Uncaught TypeError: Failed to execute 'contains' on 'Node'` (red "2" in console). Guard with `related instanceof Node` before `dropdownRef.current?.contains(related)` so menu leave does not throw when `relatedTarget` is not a Node.
- **Insert Image**: Menu bar and contextual ribbon "Insert Image" work with onMouseDown; when no panel is selected they add a new panel with placeholder image. Asset Library has a dedicated "Insert Image" button that inserts the first asset (or new panel if nothing selected).
- **Layer panel**: Visibility (eye) and Lock (padlock) toggles now respond: pointer/click events stopPropagation so the sortable drag sensor does not capture; store toggles already updated `isVisible`/`isLocked`; UI re-renders from `currentPage` in useMemo.

---

### Undo/Redo — restored (Mar 2025)

**Root cause:** With `temporal({ partialize })`, each history entry is a **partial** snapshot. Undo/redo called `applyState(nextState)` directly on the store. That replaced the live state with only the partial object, dropping keys not in the snapshot (or leaving inconsistent persist slice). Redo then failed or multi-step undo broke because `futureStates`/`pastStates` no longer matched reality.

**Fix:**
1. **Shallow-merge before apply** in `node_modules/zundo/dist/index.js`: `applyState({ ...userGet(), ...nextState })` in both `undo` and `redo` so partial snapshots merge into current state instead of replacing it.
2. **`loadProject`** in `comicStore.ts` calls `useComicStore.temporal.getState().clear()` after loading so history does not span projects.
3. **Patch persistence:** `patch-package` is installed; `package.json` has `"postinstall": "patch-package"`. The canonical diff is `patches/zundo+2.3.0.patch` (includes `rawSetState` + shallow-merge on undo/redo). Every `npm install` reapplies it automatically. To refresh the patch after editing `node_modules/zundo` again: `npx patch-package zundo` (may need to run outside sandbox if temp install hits permission errors).

**Layer tree / Insert Image:** Layer row no longer spreads sortable `listeners` on the whole row—only the grip handle is draggable, so eye/lock buttons respond. Asset Library includes an explicit Insert Image button using `onMouseDown` (same pattern as MenuBar). ContextualRibbon Insert Image also uses `onMouseDown` via optional `RibbonButton` prop.

**Undo stack push fix (debugged):** Initial middleware pushed only when `past[past.length-1] !== snap` **before** `set`. Auto-save’s functional updater often left the undo slice unchanged, so the “before” snapshot never changed and **no further pushes** occurred after the first. **Fix:** call `set(partial)` first, then if `undoSnapshotSlice(get())` **after** differs from **before**, push the pre-update snapshot. That records real edits and ignores no-op slice changes.

**Undo/Redo clicks “unoperable” (follow-up):** Not a patch permission issue—the patch was already present in `node_modules/zundo`. Causes were (1) **Edit menu / Application menu** using `onClick` while `useCloseOnOutside` closes on **mousedown**, so the dropdown closed before `click` fired—same fix as Insert Image: **onMouseDown** + `preventDefault`/`stopPropagation` for Undo/Redo in MenuBar, ApplicationMenu, ContextualRibbon Edit ribbon, and TopRibbon. (2) **Keyboard:** listener registered with **capture phase** (`addEventListener(..., true)`). **Do not** add `undo`/`redo` to the keyboard `useEffect` dependency array—doing so changed the array length across HMR/renders and triggered React’s “dependency array changed size” error, breaking the effect. Handler calls **`comicUndo()` / `comicRedo()`** directly (stable imports). (3) **applyState merge:** zundo patch uses **functional update** `applyState((current) => Object.assign({}, current, nextState))` so partial snapshots merge without passing `userGet()` actions into `setState`.

---

### Undo/Redo repair attempt (superseded by merge fix above)

Steps taken to try to fix undo/redo (Edit ribbon, Edit menu, ⌘Z / ⌘⇧Z):

1. **Centralized undo/redo in the store**
   - **File:** `src/stores/comicStore.ts`
   - **Change:** After the store creation, added exported helpers `comicUndo()` and `comicRedo()` that call `useComicStore.temporal.getState().undo()` and `.redo()` so all UI paths use the same API.

2. **Layout callbacks**
   - **File:** `src/modes/comic/layouts/ComicLayout.tsx`
   - **Change:** Imported `comicUndo` and `comicRedo` from the store; `undo` and `redo` callbacks now call `comicUndo()` and `comicRedo()`. These are passed to MenuBar, ContextualRibbon, and used in the keyboard shortcut handler (⌘Z / ⌘⇧Z).

3. **Zundo patch (bypass temporal wrapper in undo/redo)**
   - **File:** `node_modules/zundo/dist/index.js` (not in git; must be re-applied after `npm install` or zundo upgrade)
   - **Change:** In `temporalStateCreator`, added a fourth parameter `rawSetState` (the store’s original `setState` saved before the temporal wrapper is installed). In `undo` and `redo`, state is applied via `applyState(nextState)` where `applyState = rawSetState || userSet`, so undo/redo no longer go through the wrapped set that calls `temporalHandleSet` (which was corrupting pastStates and clearing futureStates). In `configWithTemporal`, `originalSetState = store.setState` is captured before replacing it, and passed into `temporalStateCreator(..., originalSetState)`.

4. **Removed Undo/Redo from View ribbon**
   - **File:** `src/modes/comic/components/ContextualRibbon.tsx`
   - **Change:** Removed the Undo and Redo buttons from the View ribbon so they only appear on the Edit ribbon.

**File changes summary**

| File | Change |
|------|--------|
| `src/stores/comicStore.ts` | Added `comicUndo()` and `comicRedo()` that call temporal API. |
| `src/modes/comic/layouts/ComicLayout.tsx` | Use `comicUndo`/`comicRedo` for undo/redo callbacks and keyboard shortcuts. |
| `node_modules/zundo/dist/index.js` | Patched so undo/redo use original setState (not the wrapper). |
| `src/modes/comic/components/ContextualRibbon.tsx` | Removed Undo/Redo from View ribbon. |

**Result:** The undo/redo bug still persists (e.g. undo only works once, redo not working). Next steps could include: verifying the zundo patch is present after install; testing with persist disabled; or trying an alternative undo approach (e.g. different middleware or manual history).

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
