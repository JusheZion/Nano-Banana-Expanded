# ARCS: Walkthrough & Roadmap

High-level narrative of where the project is and where it's going. For checklists and technical steps, see **tasks.md** and **implementation_plan.md**.

**Cursor:** Implementation plans and to-dos are in `.cursor/plans/`; agents can use them via Plan Mode. Use Review → Find Issues and Source Control → Agent Review to validate changes. Docs: [Planning](https://docs.cursor.com/agent/planning), [Review](https://cursor.com/docs/agent/review).

**Studio UX refinement (2026-03-15):** See `docs/plans/2026-03-15-studio-ux-refinement-and-polish.md`. **Verify:** `npm run build`; in Character Studio and Asset Studio test Reference panel (per-slot only, Clear all, Paste), Live Prompt tabs (Prompt / Edit / Refine), Refine with live image, ⌘+Enter generate, Undo last gen, gallery density. **Files:** `geminiImageApi.ts`, `characterStudioStore.ts`, `assetStudioStore.ts`, `Tooltip.tsx` (`PinnedHelpTooltip`), `CharacterStudio.tsx`, `AssetsStudio.tsx`.

**Character Archive thumbnail framing (2026-03-16):** Per-card **Framing** opens a modal: **click-drag to pan** focal (no snap-to-cursor); scale slider; Save writes **`metadata_tags.archive_thumbnail`** `{x,y,scale}` on Supabase (no extra columns / schema-cache issues). **localStorage** archive still uses `thumbnailFocus` on `StoredGeneration`. Optional migration `20260316000000_character_thumbnail_focus.sql` unused by app. **Files:** `ArchiveThumbnailFocusModal.tsx`, `CinematicGallery.tsx`, `arcsArchive.ts`, `arcsPersistence.ts`.

**ARCS migration:** Work is done on branch `arcs-migration` in the worktree at `.worktrees/arcs-migration` (or in main after merge). **ARCS rebrand and portal restructure (complete):** (1) **Rebrand:** Product label "ARCS" in AppShell and landing hero; ARCS Golden-Blue design tokens live in `src/shared/theme/Phase12DesignTokens.ts` (single source of truth); AppShell and LandingPage use them; DESIGN.md documents ARCS alongside Jewel-Tone. (2) **Restructure:** `src/shared/` holds theme, context (ThemeContext, ProjectContext), shared components (Tooltip, CopyButton, HeroHeader), and shared utils (PromptCompiler, geometry-utils); path alias `@/` points at `src/`. All portal entries live under `src/portals/` including `ComicPortal.tsx` (wraps ComicEditor); `Portal` type is centralized in `src/shared/portals.ts`. (3) **Code-splitting:** Portals are lazy-loaded via `React.lazy`; nav hover triggers prefetch (`portals-prefetch.ts`) so first click is fast. **Future:** Dual-studio (TBD — e.g. two studio modes or split view; define in a later spec). **Next phase:** WordArt expansion per Phase 16 (Transform dropdown, Reflection/Glow/3D, preset gallery).

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
- **ARCS rebrand & restructure (COMPLETE)**: Shared design tokens in `src/shared/theme/Phase12DesignTokens.ts`; hub and Comic use ARCS Golden-Blue; `src/shared/` for context, shared UI, shared utils; `src/portals/ComicPortal.tsx`; central `Portal` type; lazy-loaded portals with prefetch on nav hover.
- **Phase 12 Design System & Layout (COMPLETE)**: **Design tokens** (`Phase12DesignTokens.ts`, re-exported from shared): 60/30/10 — Royal Blue Jewel primary, Warm Cream secondary, Glitter Gold accent; text on gold = black, text on blue = gold/cream. **Layout**: Left sidebar (Studio Hub, etc.) removed per annotation; main column is ribbon + toolbars + content. **Top ribbon**: Collapsible; inactive buttons use lighter blue bg and **#80aaff** for icons, button outlines, and vertical section dividers; hover/selection = Pages style (gold). Theme dropdown closes on click-outside and Escape. **Secondary toolbar** (ComicCanvas): Gold gradient bg; inactive = lighter gold; hover/selection = Layers style (royal blue + cream); Split (knife) = royal blue when active. **Right sidebar**: Fixed bottom toolbar (Pages, Layers, Settings, Assets) — icons only, always visible; stack above uses royal blue for text/icons/checkboxes in open panels (Warm Cream content area). **Snap guides**: Glitter Gold. **Video backdrop**: Low-opacity `<video>` behind Stage for future Infinite Comic Scroll.
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
- **Phase 16 — Home Ribbon (partial):** **File → Home:** First menu renamed to "Home"; `MenuId` is now `'home' | 'edit' | ...`. **Home ribbon** (when Home menu is active) includes: **Revise** (Undo, Redo), **Clipboard** (Copy, Cut, Paste), **Font** (FontSelect, font size 10–36, Bold, Italic, Underline — balloon overrides; applied in BalloonNode via `fontWeight`, `fontStyle`, `textDecoration`), **Color** (one button opens Format dialog on Text/Panel/Object tab by selection), **Panels** (Add Square, Split H, Split V), **Images** (Insert Image), **Balloons** (quick-insert Round Speech, Modern Square, Thought Balloon with tail at last canvas position or center), **Layout** (Bring to front, Send to back, Group disabled, Clone). Save/PNG/PDF remain at the end of the Home ribbon. Balloon overrides: `fontWeight`, `fontStyle`, `textDecoration` in `BalloonOverrides`; Konva Text/TextPath receive these in BalloonNode.

---

## QoL / Additions not in initial task list

- **Full-size image modal with zoom:** Character Studio and Asset Studio show a "View full size" (Expand) button on the live result; clicking opens a full-screen modal with zoom in/out (25%–400%), reset, and close. Same UX in both studios. **Delete (trash):** Live image panel and zoom modal have a trash icon (lower right of panel; in zoom toolbar) to clear the current image. Asset Studio has the same.
- **Generate Alternate (Character Studio):** Button "Generate Alternate" next to "Generate Character" runs generation with prompt suffix "Alternate pose, same character" so you can get alternate poses/variants; requires at least one reference or current live image. Result appears in the live area; use "Save New Pose" to add to the Reference Gallery.
- **Reference Gallery poses:** Right panel lists saved poses in a grid; click a pose to set it as the live image and select it for "Save Edited Profile". Each pose card has a trash icon (lower right) to delete. "Add Character Pose" adds an empty pose slot; generate or paste an image then "Save New Pose" or "Save Edited Profile" to fill it.
- **Art style with reference images:** When reference images are present, the generation prompt is prefixed with "Render in this art style: &lt;artStyleLabel&gt;." so the model applies the selected style (e.g. 3D/CGI animated) to the output.
- **Home ribbon group labels:** Section labels (Revise, Clipboard, Font, Color, Panels, Images, Balloons, Layout) added above each button group for clarity.
- **Font size dropdown in Home ribbon:** Preset sizes 10–36 when a balloon is selected (replaces typing in a bare number).
- **“Select text” placeholder:** When no balloon is selected, Font group shows “Select text” instead of empty controls.
- **Clone icon:** Using `CopyPlus` (lucide-react) for Clone in Home ribbon (Clone not available in lucide).
- **Custom tag deletion:** Character Studio and Asset Studio support deleting custom (library) tags. Each custom tag chip shows a small “×” control; clicking it removes the tag from that category’s library and from the current selection. Stores: `removeWardrobeOption`, `removeHeritageOption`, `removeGenderOption`, `removePhysicalOption`, `removeCinematicOption`, `removeCustomStyle` (Character); `removeEraStyleOption`, `removeLocationTypeOption`, `removeArchitecturalDetailOption`, `removeSetDressingOption`, `removeCinematicOption`, `removeCustomStyle` (Asset). Preset options from spec are not deletable.

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

### Phase 16: ARCS Office UI Shell (Mar 2026)

 - **ARCS jewel-tone sidebar (hub):** Added `SIDEBAR_JEWEL_GRADIENT` to `Phase12DesignTokens.ts` to match the original hub art direction (gold at top → magenta/indigo mid → deep purple at bottom). `AppShell.tsx` now uses this gradient for the left vertical menu background instead of the flatter royal-blue ribbon gradient, and sidebar typography was updated to high-contrast white (with a black “A” monogram on the gold tile) so labels and headers read cleanly across the full gradient.
- **Top ribbon compaction:** `TopRibbon.tsx` header height reduced from `h-16` to `h-12` when expanded and from `h-12` to `h-9` when collapsed, shrinking the horizontal bar by roughly 25% while keeping existing padding and icon sizes. Undo/Redo, Theme, Save/Load, Export, and Zoom controls all remain in a single row; no structural changes were required.
- **Home ribbon category overlay:** `ContextualRibbon.tsx` Home ribbon groups (Revise, Clipboard, Font, Color, Panels, Images, Balloons, Layout, Project) were refactored from single-row label+controls into compact two-row stacks: each category label now sits above its button row (`flex flex-col` wrappers). This more closely matches the Microsoft Office ribbon pattern and frees vertical room for the controls while keeping labels readable.
- **Branding audit:** User-facing “Nano Banana” labels were replaced with ARCS across the app: `AppShell` tagline (“ARCS Expansion”), `RelatedAlbum` and temp portal HTML headers (“ARCS Expanded”), `index.html` title (“ARCS Expanded”), export filenames in `ComicCanvas` (`ARCS_Page_*`, `ARCS_ComicBook_*`), and persist key in `comicStore` (`arcs-comic`, with comment for migrating from `nano-banana-comic`). Docs updated: `DESIGN.md`, `README_tooltip_fix.md`, `project_type.md`, and `walkthrough.md` titles/references. `implementation_plan.md` and `tasks.md` were left unchanged per project workflow.
- **WordArt / Transform warp:** Extended text warp with Office-style profiles. `src/types/balloon.ts`: added `TextWarpId` (none, arcUp, arcDown, wave, circle, arch, button, square, triangle, cascade, slant, fade). `BalloonNode.tsx`: path math for button, square, triangle, cascade, slant, fade in `warpPathData`. `TextToolbar.tsx`: Transform dropdown lists all profiles. `FormatDialog.tsx`: Text tab has "Transform (WordArt)" select and intensity slider. Format dialog tab rename (Fill & Line, Effects, etc.) left for later.
- **Group tool:** Store: `groupsByPage: Record<string, string[][]>` (per-page groups of element ids), persisted and in undo slice. `createGroup(pageId, elementIds)`, `ungroup(pageId, elementId)`, `getGroupMembers(pageId, elementId)`. Creating a group removes those ids from any existing group; ungroup removes the group containing the element. `updatePanel` / `updateBalloon` apply the same position delta to all members of the group when one is dragged. `removeElement` and `duplicatePage` update or remap groups. Home ribbon Layout: Group (enabled when 2+ selected), Ungroup (enabled when selection is exactly one group). Fixed two stray `TEXT_ON_BLUE` references in `AppShell.tsx` (user avatar/tooltip) so build passes.
- **Portal rebrand:** Sidebar and landing page cards updated to new names: Studio → **Reference Character Studio**, Reference Album → **Character Archive**, Related / Story Sequence Viewer → **Comics & Story Archive**, Photo Lab → **Storyline Studio**, Comic Mode → **Comic Studio**. In-portal headers updated: `CharacterStudio.tsx` (REFERENCE CHARACTER / STUDIO), `CinematicGallery.tsx` (CHARACTER / ARCHIVE), `RelatedAlbum.tsx` and `temp_related_album.html` (Comics & Story Archive), `PhotoLab.tsx` (Storyline Studio in header bar), `temp_ref_album.html` (Character Archive). **Assets Studio** is planned as a new portal and not yet implemented.
- **Format dialog tabs (plan §2.1):** Tabs renamed and reorganized to **Fill & Line**, **Effects**, **Text Box**, **Size & Properties**. Fill & Line: balloon fill/stroke or panel fill/border. Effects: shadow, glow, 3D text extrusion. Text Box: font, size, text color, gradient, Transform (WordArt). Size & Properties: balloon width/height/rotation; panel image picker. Menu, ribbon, and context menu open the dialog with the appropriate new tab id. Default initial tab is Fill & Line.
- **Independent text/balloon (plan §2.3):** `TextBoxTransform` (offsetX, offsetY, scaleX, scaleY) added to `balloon.ts` (BalloonOverrides and BalloonInstance). BalloonNode wraps all text/TextPath content in a `Group` with position and scale from `effectiveTextBox`; hit-testing still selects the balloon. Store: `textBoxEditBalloonId` and `setTextBoxEditBalloonId` (UI-only). "Text box" ribbon button (Layout section) toggles text-box edit mode for the single selected balloon; in that mode a cyan Transformer attaches to the text Group (resize only), and on drag/transform end values are persisted to `overrides.textBox`. Main body Transformer is hidden while in text-box edit mode.
- **Format dialog & ribbon QoL:** (1) **GradientBuilder:** Clicking the gradient bar near an existing stop (within 6%) now selects that stop instead of adding a new one. (2) **Format dialog draggable:** Header (title bar) is a drag handle; dialog can be moved so the workspace stays visible. (3) **Page background:** White (#ffffff) no longer forced to dark; canvas and new pages respect chosen color. **Default page background** added to Project Settings (Page Background): "Default for new pages" (projectSettings.defaultPageBackgroundColor, default #ffffff) and "Current canvas color" (pageSettings.backgroundColor). New pages use default; persist merge ensures defaultPageBackgroundColor for older saves. (4) **Home ribbon:** Category headers centered over each section, font size 10px (was 8px), bold; ribbon container min-height increased by 25% (5rem → 6.25rem) and applied to all ribbons.
- **Free-floating text box:** New balloon style `floating_text` (transparent fill, no tail) for standalone text. **Insert Text Box** added: Text menu (first item), right-click empty (with Add panel / Add balloon), Home ribbon Font (first button), Text ribbon (first button). Insertion position clamped to page bounds (800×1200) so the 250×150 box and "Text..." always stay on the workspace. Same formatting as balloon text (font, size, color, gradient, warp, 3D, alignment, text-box edit).
- **Bug fixes:** (1) **Persist migration:** Store key changed from `nano-banana-comic` to `arcs-comic`; custom storage via `createJSONStorage` now reads from `arcs-comic` and, if empty, from `nano-banana-comic`, then writes to `arcs-comic` so existing user projects are restored and migrated. (2) **Insert image from empty:** Right-click empty → "Insert image…" opens Format dialog on Size & Properties; when no balloon/panel is selected but a page exists, the tab shows **Page background image** (asset grid); choosing an image calls `setPageSettings({ backgroundImage })`. `setPageSettings` restored in FormatDialog.

### Phase 15: Color Systems & Typography Warp (In Progress)
- **Implementation plan:** `implementation_plan.md` has a full Phase 15 section: Color Wheel + Favorites/Recently Used, Gradient Builder (linear/radial/rect, multi-stop, per-stop brightness/transparency/position), Konva application to panels/balloons/text, WordArt warp profiles + `registerCustomWarp` placeholder, slider precision.
- **Tasks:** `tasks.md` Phase 15 reorganized into: (1) Advanced Color & Gradient Engine, (2) WordArt & Path-Warping Engine, (3) Slider Precision.
- **PrecisionSlider (done):** New `PrecisionSlider.tsx` in comic components: extended track (default 140px), Golden-Blue track gradient, optional tick marks, snap-to-tick, optional +/- buttons. Used in ObjectToolbar, TextToolbar, ProjectSettingsSidebar.
- **Color & Gradient (done):** **ColorWheelPicker**: custom canvas HSV (hue ring + S/V square), hex input, Apply + Favorites/Recently Used rows; **GradientBuilder**: type (linear/radial/rect), angle for linear, stop strip (click to add), per-stop color + Position/Brightness/Transparency (PrecisionSlider), preview. **Store**: `colorFavorites` (max 12), `colorRecentlyUsed` (max 16), `addColorToFavorites`, `removeColorFromFavorites`, `addColorToRecentlyUsed` (persisted). **Types**: `src/types/gradient.ts` (GradientSpec, GradientStop); Panel and BalloonOverrides have `fillGradient`, `strokeGradient`, `textColorGradient`. **gradientUtils**: sortStops, toKonvaColorStops, applyBrightnessAndAlpha, linearGradientPoints. **ComicPanel**: panel background uses `panelFillProps` (linear/radial gradient or solid). **BalloonNode**: body uses `bodyFillProps`, text uses `textFillProps` (solid or textColorGradient). **FormatDialog**: Text tab (ColorWheelPicker + GradientBuilder for text color/gradient), Object tab (fill, fill gradient, stroke + ColorWheelPicker), Panel tab (border color, fill gradient). Remaining Phase 15: WordArt warp profile library + customWarp slot.

### Twin Studio & Object Logic Sprint (Mar 2026)

- **Semi-circle bug:** When scaling or translating a half-circle panel (especially when overlapping another panel), the panel could jump to the page edge. Fixed by: (1) Overriding the Group’s `getClientRect` in `ComicPanel.tsx` for half-circle, quarter-circle, and sector so the **visible** bounding box is used (e.g. half-circle: width 2r, height r). (2) Clamping position in `onTransformEnd` so the panel’s visible area stays within page (0–800, 0–1200). (3) In `dragBoundFunc`, using visible bounds for half/quarter/sector and clamping drag position to page.
- **Group/Ungroup access:** Group and Ungroup are available from: Edit ribbon (after Undo/Redo); Panel ribbon (after Insert Image); Balloon ribbon (leading the row); Text ribbon (leading the row); Home ribbon Layout section (unchanged); Objects ribbon / ObjectToolbar (after Front/Back); Vertical Objects menu in MenuBar (after “Bring to front / Send to back”); Canvas right-click context menu (when 2+ selected and overlap or within 20px → Group; when 1 selected and in a group → Ungroup); Layer panel right-click (same logic). Shared helper `elementsOverlapOrNear(page, ids)` in `snapping.ts` (20px threshold).
- **Layer tree for groups:** Groups appear as **one row** in the layer list (e.g. "Group (2)") with an expand/collapse chevron. Expanded state shows member rows (panel/balloon/drawing) indented underneath. Reordering a group row moves all members together via new store action `reorderGroup(pageId, groupMemberId, overId)`. Clicking the group row selects all members; right-click on the group row opens the layer context menu (Group/Ungroup). Build: top-level items = ungrouped elements + one row per group (id = frontmost member in `layerOrder`); no recursion (flat list of nodes).
- **Asset Tag Library:** `src/data/asset_tag_library.json` added with categories: Environment (Architecture, Lighting, Setting), Props (Materials, State, Category). For use by Assets Studio and shared prompt builder.
- **Twin Studio:** Universal Generation Engine (`useGenerationEngine.ts`) by context type; system prompts (`systemPrompts.ts`); Character Studio uses hook for left panel; new Assets Studio portal (3-column layout, asset tags, purple); portal `assets` in App/AppShell/LandingPage/prefetch; output routing stub (`generationOutputRouter.ts` — localStorage per context). **TDD:** Unit tests for `useGenerationEngine` (character vs asset tag library and system prompt) in `src/shared/hooks/__tests__/useGenerationEngine.test.ts`; integration tests for output routing (asset gens not in character list, character gens not in asset list) in `src/shared/utils/__tests__/generationOutputRouter.test.ts`. `npm run test` runs vitest (jsdom).
- **Implementation plan:** `implementation_plan.md` updated with “Twin Studio & Object Logic Sprint”: Universal Generation Engine, Assets Studio portal, output routing, system prompts, grouping UX, layer tree (groups as one item + tree), semi-circle fix, and Testing Data & Development (unit test for tag library by URL, integration test for output routing, layer tree recursion check). Twin Studio (shared hook + Assets Studio portal) and Layer tree group display are planned next.

### Reference Character Studio: Finalized Build (Mar 2026)

- **UI identity:** Emerald-to-Black gradient (`from-emerald-900` to `black`), Gold gradient (`from-yellow-400` to `yellow-600`) for active chips, borders, and accents. Two-column layout: left scrollable control panel (380px), right Live Image panel with actions and footer.
- **Design tokens:** `Phase12DesignTokens.ts` — added `CHARACTER_STUDIO_BG`, `CHARACTER_STUDIO_BG_TAILWIND`, `CHARACTER_STUDIO_ACCENT`, `CHARACTER_STUDIO_CHIP_ACTIVE`.
- **Spec data:** `src/data/character_studio_spec.ts` — Art Style (flagship + 9 library styles), Heritage (29), Gender (14), Surgical Physical (Body, Tone/Structure, Details, Hair), Wardrobe (9 categories with presets), Cinematic (Angle, Shot, Lighting, Tone, Location). DNA weighted heritage: African-American, Blatino.
- **Store:** `src/stores/characterStudioStore.ts` — Zustand + persist (`arcs-character-studio`). State: tags, dnaLock, artStyleId, customStyles, wardrobeLibraries, wardrobeSelections, cinematic, vaultUnlocked, vaultPromptOverride, ageModifier, poses, physicalSelections, heritageSelection, genderSelection, currentLiveImageUrl. Actions for all sections and unlockVault (password "onyx").
- **Prompt build:** `src/shared/utils/characterStudioPrompt.ts` — `buildCharacterStudioPrompt(tags, manualInput, dna, extraParts)`, `applyDnaWeights()` for 1/N when unselected and +15% African-American/Blatino.
- **Character Studio UI:** `src/portals/CharacterStudio.tsx` — Left panel: Art Style Engine (flagship + library chips, Custom Style input + Save as Tag), DNA Engine (Heritage, Gender chips), Surgical Physical (multi-select chips per category), Wardrobe Engine (9 sub-categories with presets; category dropdown + input + Save as Tag at bottom of section), Cinematic Suite (Angle, Lighting, Tone, Location), Onyx Vault (password to editable textarea), Prompt Tags (HybridTagBar). All custom-tag buttons use same gold gradient style (Save as Tag). Right panel: Live Image area, Age modifier slider, Add Character Pose, Import Image, Live Prompt (compiled + Copy), footer: Generate Character, Save New Character, Save New Pose, Save Edited Pose, Cast in Story (disabled when no saved stories).
- **Character Archive:** `src/components/ui/CinematicGallery.tsx` — Replaced mock items with `getGenerations('character')` from `generationOutputRouter`; empty state message when no character references.
- **Cast in Story:** `src/shared/utils/storyPhotoCollections.ts` — `getStoryPhotoCollections()`, `addCharacterRefToStory(storyId, url)`, `ensureStoryExists(id, name)`. Storage key `arcs-story-photo-collections`. Cast in Story button opens modal to pick a story and add current character image to that story's characterRefs; button faded when no stories.
- **Verification:** Open Reference Character Studio; confirm theme and sections; select tags and check Live Prompt; unlock Onyx Vault with "onyx" and edit override; Generate Character (mock), Save New Character, then open Character Archive to see image; Cast in Story disabled until stories exist in storage (future: sync from comic project list).

### Reference Character Studio: Master Build v4.0

- **Visual identity:** Emerald highlight gradient background (`CHARACTER_STUDIO_BG_V4`: linear-gradient to bottom right #022c22 → #064e3b → #10b981 → #d1fae5). Metallic gold accents (`CHARACTER_STUDIO_GOLD_METALLIC`) for active chips, progress bars, Onyx unlock button, and primary footer buttons; no flat orange/yellow.
- **Import Image and DNA overwrite:** Dedicated Import Image upload zone with Tooltip: "For best results, upload images with a single subject. AI will edit out secondary figures." When an image is uploaded, DNA Engine and Surgical Physical sections are disabled and faded (uploaded subject is absolute reference). **Diversify Likeness** checkbox: when checked, re-enables DNA and Physical tags; uploaded image used for pose/composition only, tags define appearance.
- **Right-side Reference Gallery:** Vertical panel (280px) on the far right with Age Modifier (slider 0–100), Aspect Ratio (Portrait 9:16, Square 1:1, Cinematic 21:9), and Camera Angle. Copy: "New generations here are derived from the official Full Body Reference."
- **Cinematic Suite:** Shot tags removed from spec and UI. Official Reference prompt always includes strict rules: "head-to-toe, full body length", "one person, solo" (`appendOfficialReferenceRules` in characterStudioPrompt). Default aspect ratio 9:16.
- **Store:** Added `diversifyLikeness`, `aspectRatio` ('9:16' | '1:1' | '21:9'), `setDiversifyLikeness`, `setAspectRatio`. Age modifier range 0–100. Cinematic no longer has `shot` key.
- **Footer:** Pill-shaped buttons (`rounded-full`): Generate Character | Save New Character | Save New Pose | Save Edited Profile | Cast in Story. Generate uses metallic gold; others bordered.
- **Verification:** Upload image → DNA/Surgical fade; check Diversify Likeness → sections re-enable; change Aspect Ratio and Age; confirm Live Prompt includes full body and one person solo; pill-shaped footer and Save Edited Profile label.
- **Panel layout refinements (Mar 2026):** **Live Prompt:** Height increased (outer `min-h-[480px]`, inner prompt area `min-h-[420px]`) so the box is clearly taller. **Gap:** Removed `mt-[100px]` from Reference Image Generation so the space between Live Prompt and Reference Image Generation uses the center column’s `gap-3` (12px), matching the gap between the gold header bar and the three panels below. **Reference Image Generation:** Added `min-h-[280px]` and kept `flex-1` so the panel keeps usable height and doesn’t get squeezed. **Import Image (left) panel:** Height set to match Reference Gallery — `h-[calc(85vh+100px)]` — so the left and right panels align in height. File: `src/portals/CharacterStudio.tsx`.

### Asset Reference Studio (Mar 2026)

- **Twin layout:** Asset Reference Studio mirrors Reference Character Studio: three-column layout (Left: Tags/Inputs, Middle: Live Prompt + Live Generation/Vault, Right: Spatial Expansion Gallery), same button styling (pill-shaped footer, metallic gold accents), same logic flow (Onyx Vault password "onyx", Copy Live Prompt).
- **Visual identity:** Amethyst gradient background (`ASSET_STUDIO_BG`: linear-gradient to bottom right #2e1065 → #5b21b6 → #8b5cf6 → #ede9fe). Same gold gradient as Comic and Reference Character Studios (`ACCENT_GOLD_GRADIENT`) for header strip, active chips, borders, and footer buttons. Header title uses `ASSET_STUDIO_AMETHYST_TEXT`.
- **Import & spatial lock:** "Import Asset/Setting" upload zone at top of left panel. When an image is uploaded, Setting and Location sections (Era/Style, Location Type, Architectural Detail, Scene Setting & Props) are disabled and faded; "Diversify Style" checkbox re-enables them (composition/layout from image, era and materials from tags).
- **Left panel:** Art Style (flagship + library + Custom Style + Save as Tag), Era/Style, Location Type, Architectural Detail (with single category dropdown + custom tag input + Save as Tag for Era/Location/Architectural), **Scene Setting & Props** (Room Type, Furniture, Lighting Fixtures, Surface Textures, Specific Props — dropdown + input + Save as Tag at bottom of section), Cinematic Suite, Onyx Vault, Prompt Tags. **Architectural Lock** toggle next to Live Prompt (same pattern as DNA Lock); when ON, Setting/Location sections fade and placeholder shows "ARCH LOCKED".
- **Right panel — Spatial Expansion Gallery:** Room Expansion (alphabetized options), Urban Expansion, Time/Season, **Aspect Ratio** (Portrait 9:16, Square 1:1, Cinematic 21:9), **Camera Angle** (Low, High, Bird's Eye, Dutch). Selections feed into Live Prompt.
- **Seed consistency:** `currentGenerationSeed` in both studios; set on Generate, persisted with saved generations (`StoredGeneration.seed`); Live Prompt appends "Use seed: &lt;n&gt; for consistency with the reference image." Character Archive (CinematicGallery) shows seed when present.
- **Save as Tag:** All custom-tag buttons (Art Style, Era/Location/Architectural dropdown, Scene Setting & Props, Cinematic; and Character Studio Wardrobe/DNA/Cinematic) use the same styling: gold gradient background, black text, rounded-lg, border-amber-600/50. **Prompt Tags** in Asset Studio use `HybridTagBar` with `variant="amethyst"` (violet chip theme).
- **Footer pills:** Generate Asset | Save New Asset | Expand Setting | Add to Library | Cast in Story. Save/Add pass `currentGenerationSeed` into `saveGeneration`.
- **Files:** `src/shared/theme/Phase12DesignTokens.ts`, `src/data/asset_studio_spec.ts` (ROOM_TYPE_TAGS, Scene Setting & Props), `src/stores/assetStudioStore.ts`, `src/shared/utils/assetStudioPrompt.ts`, `src/portals/AssetsStudio.tsx`, `src/components/HybridTagBar.tsx` (variant), `src/shared/utils/generationOutputRouter.ts` (seed).

### ARCS Universal API Bridge & Data Persistence (Mar 2026)

- **Semantic IDs & DB:** `src/shared/utils/semanticId.ts` — `generateSemanticId('CHAR'|'ASST', baseName, existingIds)` for `CHAR_[NAME]_01` / `ASST_[NAME]_01` with increment on conflict. Supabase client in `src/shared/lib/supabase.ts`; migration `supabase/migrations/20260314000000_arcs_characters_assets.sql` for `characters` and `assets` tables (id text PK, created_at timestamptz, metadata_tags JSONB, seed bigint, image_url, name). `.env.example` documents `VITE_SUPABASE_*` and `VITE_GEMINI_API_KEY`.
- **Stores:** Both studios: `referenceImageUrls` (max 14), `selectedOnyxModelId` ('flash'|'pro'), `generationStatus`, `generationStatusMessage`; actions for reference slots and `setGenerationStatus`. Persisted: referenceImageUrls, selectedOnyxModelId.
- **Gemini API bridge:** `src/shared/api/geminiImageApi.ts` — `generateImage({ prompt, referenceImageUrls, seed, aspectRatio, modelId })`; models `gemini-3.1-flash-image-preview` (Nano Banana 2) and `gemini-3-pro-image-preview` (Nano Banana Pro); exponential backoff with jitter on 429; safety block detection; returns `{ ok, imageDataUrl }` or `{ blocked: true }` or `{ error }`.
- **Onyx Vault:** When unlocked (password "onyx"), model selector: Nano Banana 2 (Speed) / Nano Banana Pro (Detail) in both Character and Asset studios.
- **Status breadcrumb & Gemstone Pulse:** Status line cycles "Scanning DNA/Architecture..." → "Contacting Onyx Vault..." → "Crystallizing Render..." during generation; safety message: "Prompt restricted by safety filters. Please adjust and try again." Generate button becomes pulsing gem (Emerald in Character, Amethyst in Asset); CSS vars `--gem-emerald`, `--gem-amethyst` in `theme.css` and `GEM_EMERALD`/`GEM_AMETHYST` in Phase12DesignTokens.
- **Generate wired to API:** Character: 9:16 aspect, prompt with "full body, solo subject"; Asset: store aspect ratio; both use reference_image slots (up to 14) and selected Onyx model; non-blocking async.
- **Import Image multi-slot:** Up to 14 reference images per studio; thumbnails with remove; new image appends to `referenceImageUrls` and sets current live; API receives filled slots.
- **Save to DB:** `src/shared/api/arcsPersistence.ts` — `saveCharacterToDb(store)`, `saveAssetToDb(store)` with semantic ID, `metadata_tags` from store state, seed, image upload to Supabase Storage (bucket `arcs-generations`) when data URL; fallback when Supabase not configured. Save New Character/Asset still call `saveGeneration` (localStorage) and optionally persist to DB.
- **Session cache:** `src/shared/utils/generationSessionCache.ts` — last 10 generations per context; `addCachedGeneration` on generate success and save; "Recent" strip in both studios (thumbnails, click to set live image and seed).
- **Asset Expansion:** Expand Setting uses `seed + 1` (primary reference seed + 1) for architectural consistency; spatial/room/urban/time options appended to prompt; result shown as live image and cached with expansion seed.
- **Portal switch:** No re-fetch or clear on Character ↔ Asset switch; each store persists independently; generation window and state preserved.

### ARCS v11.0 — Archive-Driven Generation & Multi-Category Modifiers (Complete, Mar 2026)

- **Design:** `docs/plans/2026-03-15-archive-driven-generation-modifiers-design.md` (approved).
- **Implementation plan:** `docs/plans/2026-03-15-archive-driven-generation-modifiers.md` (11 tasks).
- **Summary:** Dual-layer naming and album grouping (Supabase migration, persistence, Archive UI by profile_name/collection_name) done. ModifierRibbon (color + Matte/Gloss/Glow) for Character and Asset studios with prompt fusion [Color] [Material] [Tag] done. 14 labeled reference slots (Physicality, Hairstyle, Clothing, Aesthetic) and Archive recall modal to inject saved image into slot done. Global reset modifiers, Gemstone pulse (Emerald/Amethyst during pending), and tab/portal state preservation verified.
- **Archive recall modal (Task 8 — done):** `src/shared/api/arcsArchive.ts`: `getCharactersGroupedByProfile()` and `getAssetsGroupedByCollection()` (Supabase when configured, else `getGenerations` grouped by profileName/collectionName). `ArchiveRecallModal.tsx`: browse albums (section = profile/collection name), grid of image cards; on image click injects URL into reference slot and closes. Character Studio and Asset Studio "Archive" buttons open modal for that slot; `onSelect` calls `store.setReferenceImageAt(slotIndex, url)` and closes.

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
4. **File/Edit/View in a compact menu** — Move project-level actions (Save, Load, Export, Zoom, Theme) into a single **Application menu** (e.g. “Comic” or “ARCS”) so the main strip is only about making and editing content.
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
