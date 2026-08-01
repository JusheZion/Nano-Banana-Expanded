# Advanced Comic Creator — QA Report

**Date:** 2026-08-01
**Scope:** The **Advanced Comic Creator** portal only (the Konva canvas editor: pages, panels, image import/fill, drag/resize/snap, speech balloons, narration/text, save/export). The rest of ARCS was out of scope.
**Method:** Live user-facing sweep (driven in-browser, signed into the `appdemo1220` demo account) + a 4-way parallel source-code audit that root-caused each behavior to `file:line`.
**Environment:** Deployed build at `asset-reference-comics-studio.onyxzion.workers.dev`; code at repo root, `src/modes/comic/**`.

---

## Executive summary

Your reported problem is **real and fully root-caused** — you were not doing anything wrong. Importing an image and getting it to center/fill, and manipulating objects with handles/snap, are genuinely broken or missing controls in this portal. Beyond that, the sweep surfaced a cluster of issues in the two things you'll do most (placing art and typing dialogue), plus a few **data-loss risks** worth fixing *before* you invest real assembly work.

**Totals:** ~30 distinct issues. **2 data-loss**, ~14 blocker/major, ~14 minor/polish, + 4 dead-code cleanups.

**The 3 things you personally hit, explained:**
- **"Couldn't center or fill the page with the picture."** The **page-background image** path has *no* fit/center/position controls at all — it's hard-stretched to the page and can't be moved. And **panel images** default to "cover" with the reframe/zoom controls hidden, so the crop is locked dead-center. (See IMG-1, IMG-2, IMG-3.)
- **"The drag handles were off."** New panels **spawn half off the left edge of the page**, so the object and its handles sit partly in the dead black area beside the page. The handles themselves are fine; the *placement* is wrong. (See PAN-1.)
- **"The grid/snap fought me."** The canvas actually *does* snap to page-center and edges — but it draws **no guide line** when it does, and the guide lines it does draw are computed by a different function that disagrees with where the panel actually locks. So centering "works" but gives you zero feedback, which feels broken. (See PAN-2.)

---

## ⚠️ Fix FIRST — data-loss risks (before you assemble anything)

| ID | Issue | File:line | Why it matters |
|----|-------|-----------|----------------|
| **SYS-3** | **Save drops groups & templates.** `serializeProject` never writes `groupsByPage` or `templates`; `loadProject` never restores them. | `src/stores/comicStore.ts:1308-1344` | Group elements, save, reload → everything ungrouped, saved panel templates gone. |
| **IMG-8** | **Imported images stored as base64 in localStorage with no error handling.** Every "Import image"/"Upload BG" writes full-res bytes into persisted state; `localStorage.setItem` has no try/catch. | `ComicLayout.tsx:133-142`, `ProjectSettingsSidebar.tsx:30-35`, `comicStore.ts:1580,1593-1605` | A couple of large images blow the ~5 MB quota → autosave silently fails → **work lost on reload, no warning.** |
| **SYS-5** | `loadProject` leaves `currentPageId`/`selectedElementIds` pointing at the old project's IDs. | `comicStore.ts:1333-1337` | After Open…, no page is active; Layers/ribbon show empty until you manually click a page. |

---

## Your reported area #1 — Image import, fill & centering

| ID | Sev | Issue | File:line |
|----|-----|-------|-----------|
| **IMG-1** | Major | **Page background image is one GLOBAL image, hard-stretched to 800×1200, `listening=false`, with NO fit/cover/center/position/offset control and no handles.** Same image is painted on *every* page. Only an opacity slider + Clear exist. | `ComicCanvas.tsx:507-541`; `comicStore.ts:139`; `ProjectSettingsSidebar.tsx:119-159` |
| **IMG-2** | Major | **Panel "cover" images can't be reframed.** Focus X/Y + zoom sliders render *only* for `decal` fill mode; `imageFocusX/Y` is never written, so the crop is permanently locked to dead-center. | `ObjectToolbar.tsx:344-366`; `ComicPanel.tsx:132-133` |
| **IMG-3** | Major | **Double-click "content mode" panning silently reverts.** The drag writes `imageOffsetX/Y`, but cover/contain/center/stretch read `imageFocusX/Y` — so you drag to reframe, release, and it snaps back. | `ComicPanel.tsx:699-707` vs `136-157` |
| **IMG-4** | Major | Overlay images are force-squashed into a 120×120 **square** (aspect ignored). | `FloatingAsset.tsx:87-93` |
| **IMG-5** | Minor | **"Add overlay (test image)" is a leftover dev button** pointing at `https://via.placeholder.com/120` (a service defunct since 2024) → adds an invisible, broken overlay. Should be removed from production Settings. | `ProjectSettingsSidebar.tsx:205` |
| **IMG-6** | Major* | Background & overlay images bypass `useArcsResolvedSrc` (only panels resolve signed storage URLs) → an image set from a generated/library asset renders blank while the same asset works in a panel. Latent today (BG upload uses data URLs). | `ComicCanvas.tsx:79`; `FloatingAsset.tsx:26` |
| **IMG-7** | Minor | Dropped overlay lands ~60px up-left of the cursor (center offset applied twice). Overlay `zIndex` is stored but never used for stacking. | `ComicCanvas.tsx:474-475`, `:637` |
| **IMG-9** | Minor | `center` fill mode ignores zoom (`imageScale` hard-coded to 1). | `ComicPanel.tsx:153-157` |

---

## Your reported area #2 — Panels, placement, drag & snap

| ID | Sev | Issue | File:line |
|----|-----|-------|-----------|
| **PAN-1** | Blocker | **New "Add Panel" spawns half off the left page edge** (`lastCanvasPosition.x − 100`, no clamping in the store). A correct centered path exists (`handleAddPanelAtCenter`) but the toolbar/ribbon buttons don't use it. | `comicStore.ts:659-684`; `MenuBar.tsx:164-166`; `ContextualRibbon.tsx:206-208` |
| **PAN-2** | Major | **Snap gives no/incorrect visual feedback.** Panel position snaps to page-center & edges via `getGutterAwareSnapLines`, but the gold guide-line overlay is computed by a *different* function (`getSnapLines`) that doesn't know about center/edge and recomputes from the already-snapped position → no line when you center, and lines that disagree with the lock point. | `ComicCanvas.tsx:573` vs `utils/snapping.ts:41-42` |
| **PAN-3** | Major | **Edge/wall dragging is broken at any zoom ≠ 100%.** `ComicPanel` never reads `zoomLevel`; it uses raw screen-pixel pointer coords as logical coords, so at 2× zoom edges move at 2× speed and never snap. | `ComicPanel.tsx:861,875-899` |
| **PAN-4** | Major | Vertex/edge drag has **no page clamping** — you can push panel geometry off-page (negative/oversized vertices) and later whole-panel drags misbehave on stale width/height. | `ComicPanel.tsx:798-810, 869-907` |
| **PAN-5** | Major | **Knife only cuts polygon panels** — rectangles (all image panels) and ellipse/half/quarter/sector are silently skipped with no feedback. | `ComicCanvas.tsx:285-286` |
| **PAN-6** | Minor | Knife-split halves keep the parent's stale width/height (bbox not recomputed) → post-cut drags jump. | `ComicCanvas.tsx:295-297` |
| **PAN-7** | Minor | Half/quarter/sector panels use full-ellipse hit-testing → image drops target the wrong region. | `geometry/geometry.ts:102-108` |
| **PAN-8** | Minor | Polygon drag-guide midpoints offset by non-zero bbox origin → guide lines sit slightly off the panel. | `ComicCanvas.tsx:573` |
| **NOTE** | — | `InteractionLayer.tsx` is a 9-line empty stub (dead). There are **two separate snap engines** — `geometry/snapping.ts` (Guided auto-layout only, lacks center/edge candidates) and `utils/snapping.ts` (interactive canvas). Consolidating them would remove a class of divergence bugs. | — |

---

## Your core task — Speech balloons & narration text

| ID | Sev | Issue | File:line |
|----|-----|-------|-----------|
| **BAL-1** | Blocker | **Editing dialogue is a native single-line `window.prompt()`.** No on-canvas editor, **no multi-line** (can't type a line break in narration), blocks the whole app, and `onDblClick`-only (no `onDblTap` → no editing on a tablet). | `BalloonNode.tsx:702-705` |
| **BAL-2** | Major | **Bold button does nothing** — Konva ignores `fontWeight`; weight must go through `fontStyle`. Italic/underline work; bold+italic is impossible. | `BalloonNode.tsx:85,179`; `ContextualRibbon.tsx:400` |
| **BAL-3** | Major | **Applying a balloon style to an existing balloon doesn't add/remove the tail** (`overrides.hasTail` is dead; `hasTail` is a top-level field). Switch a narration box to "Round Speech" → no tail appears. | `BalloonRibbonContent.tsx:112-118` |
| **BAL-4** | Major | **Thought Cloud, Radio/Phone, and Shout all render as an identical plain oval**; non-"bubbles" tail styles (spiky/curved/straight) all draw the same tail. The distinct balloon kinds aren't visually distinct. | `BalloonNode.tsx:444-601, 603-678` |
| **BAL-5** | Major | Speech/Thought ribbon buttons spawn **every** balloon at a fixed `400,600` → they stack exactly on top of each other. | `BalloonRibbonContent.tsx:94` |
| **BAL-6** | Minor | Font-size dropdown shows `16` for fresh balloons though they render larger (two size controls disagree). | `TextToolbar.tsx:312,334` |
| **BAL-7** | Minor | Web fonts load async with no `document.fonts.ready` redraw → new text paints in a fallback font until you nudge it. | `index.html:14`; (no redraw hook) |
| **BAL-8** | Minor | Font registry offers fonts that aren't web-loaded (Chalkboard SE = Mac-only, Comic Sans, Impact) → silent fallback off-Mac / on export. | `FontRegistry.ts:9-21` |
| **BAL-9** | Minor | Duplicate tail-drag handle rendered twice sharing one ref. | `BalloonNode.tsx:767-793 & 1035-1056` |

---

## Menus, layers, save/export

| ID | Sev | Issue | File:line |
|----|-----|-------|-----------|
| **SYS-1** | Major | **Objects menu → "Split panel", "Flip H/Flip V", "Bring to front/Send to back" are no-ops** (they only switch the ribbon). The real actions exist and work from the ObjectToolbar/ribbon — the menu items just aren't wired. | `MenuBar.tsx:410-412` |
| **SYS-2** | Major | **Layer reorder can't cross bands.** Panels always render beneath balloons/drawings; overlays always on top — regardless of `layerOrder`. LayerTree presents one unified reorderable list and Bring-to-Front/Send-to-Back edit it, but the canvas ignores cross-band moves. | `ComicCanvas.tsx:550-614, 633-637` |
| **SYS-4** | Minor | Save also drops the active theme/genre (`currentGenreId`, `customGenre`). | `comicStore.ts:1308-1318` |
| **SYS-6** | Major | **Undo is polluted by selection changes** — clicking a different object creates an undo step, so Ctrl+Z first reverts *selection* instead of your edit. | `comicStore.ts:291,297-308` |
| **SYS-7** | Minor | Text menu "Warp", "Padding", "Alignment" all open the same generic FormatDialog tab (illusory granularity). | `MenuBar.tsx:399-401` |
| **SYS-8** | Minor | "Export as PNG" exports only the **current page** (PDF exports all) but the label doesn't say so. | `ComicCanvas.tsx:387-406`; `MenuBar.tsx:279` |
| **SYS-9** | Cleanup | Dead/unused components: `InteractionLayer.tsx`, `ApplicationMenu.tsx` (stale duplicate of MenuBar), `TopRibbon.tsx`, and the exported `TabbedDock` component. Edits to these have no effect — a maintenance trap. | (each file) |

---

## ✅ Verified WORKING (so you know what's solid)

- Login/access, portal load, and the dock tabs (Pages / Layers / Settings / Assets) all switch correctly.
- Adding panels/balloons/text boxes; selecting them; balloon tail controls; the contextual ribbons.
- **Edit menu** (undo/redo/cut/copy/paste), **View** (zoom/fit, Webtoon/Spread), and most of **Panel/Balloon/Text** menus are wired and functional.
- **AssetLibrary drag-to-canvas works** (correctly accounts for zoom + layout offset); local image import and "Insert Image" work.
- Panel `cover/contain/stretch/decal` fill *math* is geometrically correct (the problem is the hidden reframe UI, IMG-2).
- **Export**: crop/scale math is correct at any zoom (constant 2500×3750); **PDF exports all pages** incl. spreads at correct size.
- **Page add / delete / reorder / duplicate / set-as-cover** all work and are covered by undo; delete is guarded against removing the last page.
- Page background color, per-page background, overlays, and balloon fonts *are* saved (only groups/templates/theme are dropped — SYS-3/SYS-4).

---

## Suggested fix order

1. **Data-loss first:** SYS-3 (save groups/templates), IMG-8 (localStorage quota guard), SYS-5 (load resets currentPageId).
2. **Your daily workflow:** BAL-1 (real multiline text editor), IMG-1/IMG-2/IMG-3 (background fit/position + panel reframe UI), PAN-1 (clamp Add Panel on-page), PAN-2 (snap feedback).
3. **Styling correctness:** BAL-2/3/4/5 (bold, tail toggle, distinct balloon shapes, don't stack), SYS-1 (wire Objects menu), SYS-2 (cross-band z-order), SYS-6 (undo selection noise), PAN-3/4 (zoom-correct edge drag + clamp), PAN-5 (knife on rects).
4. **Polish & cleanup:** remaining minors + SYS-9 dead code.
