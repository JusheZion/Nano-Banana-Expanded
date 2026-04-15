# Current feature: Storyline Studio — Master Director portal (2026-03-25)

## Summary

- **Replace** mock [`PhotoLab.tsx`](src/portals/PhotoLab.tsx) with [`StorylineStudio`](src/portals/storyline/StorylineStudio.tsx): **row-based** ARCS Office layout (story + director + production libraries | beat timeline + **selected-frame preview** | beat detail ∥ Image Lab), magenta–violet shell via [`STORYLINE_DIRECTOR_BG`](src/shared/theme/Phase12DesignTokens.ts), gold chrome.
- **State:** [`storylineStudioStore`](src/stores/storylineStudioStore.ts) (Zustand + persist `arcs-storyline-studio`); beats omit `data:`/`blob:` images from persist (http(s) only).
- **AI text:** [`geminiTextApi`](src/shared/api/geminiTextApi.ts) (Gemini **3** preview stack: `gemini-3-flash-preview` → `gemini-3.1-flash-lite-preview` → `gemini-3.1-pro-preview`, JSON mode) + [`storylineDirectorPrompts`](src/data/storylineDirectorPrompts.ts) — Script Doctor, Plan beats, post-gen interpolation.
- **AI image:** Per-beat [`generateImage`](src/shared/api/geminiImageApi.ts) with [`buildStorylineReferenceSlots`](src/portals/storyline/buildStorylineReferenceSlots.ts); [`compileVisualPromptForBeat`](src/portals/storyline/compileBeatPrompt.ts) for wardrobe lock.
- **Cast:** Production cast from [`getCharacterAlbums`](src/shared/api/arcsVault.ts); [`linkCastNamesToBeats`](src/portals/storyline/linkCastToBeats.ts) for name detection.
- **UX:** Tooltips (default Radix), ⌘/Ctrl+Enter (story field → Script Doctor; else generate selected beat), Esc closes vault/B-roll menu, timeline keyboard nav when focused.
- **Character Studio neutrality:** [`systemPrompts.ts`](src/data/systemPrompts.ts) + [`characterStudioPrompt.ts`](src/shared/utils/characterStudioPrompt.ts); heritage labels in [`character_studio_spec.ts`](src/data/character_studio_spec.ts) (`African American`, `Black Latino`); persist merge in [`characterStudioStore`](src/stores/characterStudioStore.ts) for legacy labels.

## Phase 1b — Asset vault save + studio promote

- **Save:** [`saveStorySequenceToAssetsVault`](src/shared/api/arcsPersistence.ts) — first beat with any `imageUrl` as cover (upload via `ensurePersistentImageUrl`); `metadata_tags`: `story_sequence_v1` + `source: arcs_storyline_studio`. UI: **Save to Vault** in Storyline header; modal new/existing collection (same rules as Assets Studio library save).
- **Promote:** [`studioImportBridge`](src/stores/studioImportBridge.ts); [`App.tsx`](src/App.tsx) applies `portalToOpen`; Character/Asset studios `consumeImportForTarget` on mount. Beat panel: **Open in Character Studio** / **Open in Assets Studio**.

## Phase 1c — Storyline usability pass

- **Manual cast link controls:** In beat inspector, add explicit character link toggles per beat (selected beat can include/exclude cast members without relying only on name auto-linking).
- **Manual asset link controls:** Add production-asset pool from Asset Vault and per-beat asset link toggles; include linked asset refs in generation slots after cast refs.
- **Beat hover zoom:** Add enlarged image preview on hover for timeline beat cards so users can inspect details without opening another modal.
- **Reference behavior fix:** In beat generation, stop defaulting to full production cast when a beat has no linked cast IDs; send references only for explicitly linked cast to reduce unintended character injection.
- **Per-beat aspect ratio:** add `aspectRatio` to beat state/schema (`9:16` | `1:1` | `21:9`), controls in beat inspector, and pass selected ratio into `generateImage` per beat.
- **Quality tuning:** use `pro` image model for Storyline beat generation to reduce blur/distortion on complex prompts.

## Phase 1d — Reference strength + Generic Image Lab

- **Beat reference strength (none/light/strict):**
  - Add `referenceStrength` to each `StoryBeat` (default `strict`).
  - UI: beat inspector chips for `none` / `light` / `strict`.
  - Generation behavior:
    - `none`: send no cast/assets reference slots; disable strict wardrobe lock lines.
    - `light`: send a reduced subset of linked cast/assets refs (e.g., first identity/style slots) and disable strict wardrobe lock lines (use refs as “soft guidance”).
    - `strict`: send all linked refs and keep strict wardrobe lock behavior.
- **Generic Image Lab panel (in StorylineStudio for now):**
  - References input:
    - Upload local images (up to 14) or paste URLs.
    - Quick-add buttons for “use linked cast/assets from selected beat” and/or “use production cast/assets pool”.
  - Prompt input:
    - Main prompt textarea.
    - Optional **AI prompt helper**: button to refine the prompt into a more generation-ready prompt; toggle between raw vs refined prompt.
  - Generation controls:
    - Aspect ratio selector (9:16 / 1:1 / 21:9).
    - Model set to `pro` by default.
    - Context toggle: `character` vs `asset` (maps to reference slot role labeling).
  - Import into storyline:
    - “Use as selected beat image” (replaces selected beat `imageUrl`, sets seed/status).
    - If no beat selected: “Create new B-roll beat” (or narrative beat) using the generated image.
  - Comic import: included as a later integration step after we confirm the preferred comic insertion behavior.

### Comic image layers/objects — exploration

- **Definitions**
  - **Panel image**: background/art locked to panel shape/clipping (`Panel.imageUrl` in [`comicStore`](src/stores/comicStore.ts)).
  - **Overlay object**: raster “sticker” above panels (characters/props/SFX), independent transform ([`OverlayObject`](src/stores/comicStore.ts), rendered via [`FloatingAsset`](src/modes/comic/components/FloatingAsset.tsx)).
  - **Layer stack**: z-ordering across elements on a page ([`layerOrder`](src/stores/comicStore.ts), [`LayerTree`](src/modes/comic/components/LayerTree.tsx)).
- **Pros (layered objects)**: editable placement/transforms without full re-render; faster iteration; backgrounds vs subjects vs lettering separated; more non-destructive workflows.
- **Cons / costs**: selection, snapping, grouping, undo granularity; export must flatten correctly; sticker/matte artifacts; Konva perf with many large images.
- **Near-term stance:** Storyline → Comic handoff stays **copy/download** until we pick where imports land.
- **Integration options (later)**
  - **A:** Set selected comic panel `imageUrl` (simplest, flattened plate).
  - **B:** `addOverlay` image (uses existing transform tooling).
  - **C:** Panel-internal multi-layer + masks (largest; new schema + renderer).

## Phase 1e — Horizontal-friendly viewing (row panes)

- **Row 1 — Story & production:** Full-width card; grid places storyline + director controls with **wider** story textarea and scrollable **cleaned story** readout; **Production cast** and **Production assets** columns with capped height + scroll.
- **Row 2 — Timeline + preview:** Beat timeline (horizontal scroll) beside a **Selected frame preview** pane that uses the **selected beat’s `aspectRatio`** and `max-height` so **21:9** frames stay readable; timeline cards use **per-beat aspect** (width varies for cinematic beats) and hover zoom matches that aspect.
- **Row 3 — Beat detail | Image Lab:** Two columns on `xl` screens: beat fields (taller narrative/ visual prompt / dialogue textarea where helpful) and [`GenericImageLabPanel`](src/portals/storyline/GenericImageLabPanel.tsx) in its own scroll region.
- **Files:** [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx); Image Lab preview uses chosen lab aspect ratio (not fixed 9:16).

## Phase 2 — Studio preview and compare (planned, approved 2026-03-27)

**Goal:** Dedicated pane for **large** image preview and **compare** across Character Studio, Asset Studio, and Storyline (including Generic Image Lab), honoring portrait (9:16), square (1:1), and landscape (21:9).

**Layout options**

- **A — Stacked / vertical scroll:** Single column on narrow viewports; controls + preview + gallery stack; full-page scroll when content exceeds the viewport.
- **B — Split:** From `lg`/`xl` upward, two columns: **controls** (tabs for prompts / tags / references) + **primary preview** with gallery strip; `min-h-0` flex so the image region gets usable height.

**Recommended:** Responsive **hybrid** — use **B** on large breakpoints and **A** on small screens; add an explicit **Compare** mode (second pane, drawer, or A/B control) so comparisons are not squeezed into the live thumbnail. Align preview aspect with selected output ratio (reuse Storyline Phase 1e selected-frame pattern).

**Primary files:** [`CharacterStudio.tsx`](src/portals/CharacterStudio.tsx), [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx), [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx), [`GenericImageLabPanel.tsx`](src/portals/storyline/GenericImageLabPanel.tsx).

**Implementation (2026-03-27):** Shared helpers [`studioPreviewLayout.ts`](src/shared/utils/studioPreviewLayout.ts) (`studioPreviewAspectCss`, `studioPreviewMaxHeightCss`). Character and Asset studios use an **xl+ split** inside the generation card: scrollable sidebar (thumbnail density, **Compare**, recent/session strips) beside a **large `object-contain` preview** sized to the active aspect ratio (Character: gallery aspect; Asset: effective Gemini aspect). Compare on Asset = first reference slot vs generated. Image Lab uses **lg+** two-column layout with a dedicated large preview column. Beat/timeline preview remains as in Phase 1e.

**Superseded in part by Phase 2b (2026-03-28):** Both studios now use a **viewport-locked 40/60 shell** (see below). The xl sidebar beside the preview is removed in favor of **toolbar-only** controls on the top stage and **recent/session + spatial** in the **bottom ~40%** pane (Asset: spatial gallery moved off the third column).

## Phase 2b — Studio 40/60 split shell (2026-03-28)

**Goal:** Lock Character and Asset studios to the main viewport (**no page scroll** on `studio` / `assets` portals at 1080p): **left 40%** = one scrollable module area + **Live Prompt** (with **PIN**) + **bottom module dock**; **right 60%** = **~60% top** live generation stage (`flex-[3]`, `studioPreviewFrameStyle` **`stage` / `stageCompare`**) + **~40% bottom** scrollable workspace (`flex-[2]`).

**Files**

- [`App.tsx`](src/App.tsx): `studio` / `assets` lazy portals wrapped in `h-full min-h-0 flex flex-col overflow-hidden` (no `space-y-8` on those routes).
- [`AppShell.tsx`](src/components/layout/AppShell.tsx): When `activePortal === 'studio' || 'assets'`, main content uses `overflow-y-hidden` + `min-h-0` so only internal studio regions scroll.
- [`studioPreviewLayout.ts`](src/shared/utils/studioPreviewLayout.ts): `StudioPreviewLayoutMode` includes **`stage`** / **`stageCompare`** with tighter caps for the split right column.
- [`CharacterStudio.tsx`](src/portals/CharacterStudio.tsx): `flex-[0_0_40%]` left column; modules **Refs / DNA / Style**; flat **7×2** reference hub; right column **status** + **`flex-[3]`** generation + **`flex-[2]`** Reference Gallery (poses, recents, session — **flex-wrap**, no horizontal strip).
- [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx): Same shell; modules **Refs / Build / Look** (hub, structural tags, material + cinematic + tags); right column **status** + **`flex-[3]`** Reference Image Generation + **`flex-[2]`** Spatial Expansion Gallery, aspect/camera chips, **flex-wrap** recents/session.

**Verify:** `npm run test -- --run`; `npm run build`; manual at **1920×1080**, **100% zoom** — no document scroll on studio roots; **PIN** expand/collapse; **Compare** + generate; bottom panes scroll internally only.

## Asset Studio — fixed workspace preview + single scroll region (2026-04-14)

**Goal:** In [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx), keep the **Asset workspace** live preview (single or compare) **outside** the vertical scroll region so it stays pinned at the top of the card. Move session chips, recent/session thumbnails, spatial expansion chips, and the bottom generation/save strips into **one** `flex-1 min-h-0 overflow-y-auto` container so controls are always reachable on short viewports (no competing `max-h` middle pane vs fixed bottom bars).

**Tooltips:** Wrap **Clear all** / **Paste first empty** on the reference hub; **This session** thumbnails; **Compact** / **Comfortable** / **Compare** toggles in the workspace footer.

**Verify:** `npm run test -- --run`; `npm run build`; manual Asset Studio — short viewport height, **Compare** on/off — preview stays put; scroll reaches all workspace actions.

## Asset Studio — readability and polish pass (2026-04-14)

**Goal:** Reduce “tiny UI” fatigue: replace pervasive `text-[9px]` / `text-[10px]` with Tailwind `text-xs` / `text-sm` where appropriate; enlarge **Chip** controls; group **Room / Urban / Time / Aspect / Camera** in a bordered card; slightly larger **Recent / This session** thumbnails; improve **Refs / Build / Look** module tabs and **generation status** line legibility; slightly larger hub toolbar buttons.

**Files:** [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx)

**Verify:** `npm run test -- --run`; `npm run build`; spot-check Asset Studio at 100% zoom.

## Asset Studio 2.0 — workspace modes (Phase 1, 2026-04-14)

**State:** [`assetStudioStore`](src/stores/assetStudioStore.ts) — `AssetStudioWorkspaceMode` (`references` | `build` | `prompt` | `output`), `workspaceMode`, `setWorkspaceMode` (persisted in the store’s `partialize`).

**UI:** [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx) — desktop left column: tab strip **References / Build / Prompt / Output**; panel bodies show **reference hub** (References), **Refs / Build / Look** sections (Build, with existing sub-tabs), **Live Prompt** card (Prompt), and a short **Output** hint card (preview and actions stay in the wide right column). **Phone:** `workspaceMode` is set to **prompt** so the stacked flow stays usable.

**Layout:** Left / right split on `md+` is approximately **42% / 58%** (was 60/40).

**Verify:** `npm run test -- --run`; `npm run build`; desktop — switch modes and confirm Build sub-tabs only when Build is active.

## Asset Studio 2.0 — panel extraction + Simple / Advanced (Phases 3–4, 2026-04-14)

**State:** [`assetStudioStore`](src/stores/assetStudioStore.ts) — `AssetStudioBuildDisclosure` (`simple` | `advanced`), `buildDisclosure`, `setBuildDisclosure` (persisted).

**Files:** [`src/portals/asset-studio/`](src/portals/asset-studio/) — shared chips (`assetStudioShared.tsx`); **References** (`AssetStudioReferencesPanel.tsx`); **Build** structural + material (`AssetStudioBuildPanels.tsx`); **Live Prompt** (`AssetStudioLivePromptPanel.tsx`); **Output** hint (`AssetStudioOutputHint.tsx`). [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx) composes these and keeps the right-hand **Asset workspace** column.

**Simple vs Advanced (Build mode, desktop):** **Simple** trims the Build and Look tabs: structural panel shows **roomType** set-dressing only (with structure color ribbon); material panel shows flagship + preset art styles and **camera angle** cinematic only (no tone, no custom styles/snippets in cinematic). **Advanced** restores full sections, per-category “Save as Tag” rows, all set-dressing categories + modifier ribbons, full cinematic suite + library, custom art styles, and Onyx Vault / Prompt Tags blocks unchanged.

**Verify:** `npm run test -- --run`; `npm run build`; toggle **Simple / Advanced** in Build and spot-check Refs / Build / Look sub-tabs.

## Asset Studio 2.0 — phone layout (Phase 5, 2026-04-14)

**Goal:** Narrow viewports: preview first, one workspace panel at a time, larger tap targets, no stacked “everything at once” left column.

**Behavior:**
- **Phone default** `workspaceMode`: **output** (preview + workspace actions first) instead of forcing **prompt**.
- **Workspace tabs** (References / Build / Prompt / Output) visible on **all** breakpoints; each mode shows **only** its panel (no `(phoneCompact || …)` stacking).
- **Output** hint card shows on phone when Output is selected (same copy as desktop).
- **Build** on phone: **Build detail** (Simple/Advanced) + **Refs / Build / Look** sub-tabs match desktop.
- **Column order:** `md+` unchanged; below `md`, **Asset workspace** column is **order-first** (`order-1`), controls column **order-2** so preview leads.
- **Touch:** workspace tab buttons, build sub-tab buttons, and Simple/Advanced use **min-height 44px** on small screens (`sm:` resets for desktop density).
- **Live Prompt** panel on phone uses **flex-1** and drops the tight `max-h` cap so the edit flow can use more vertical space.

**Verify:** `npm run test -- --run`; `npm run build`; narrow viewport or device toolbar — switch workspace tabs; confirm only one left panel; preview above controls.

## Verify

- `npm run test -- --run`; `npm run build`; manual: Storyline Studio → Script Doctor → Plan beats → cast from vault → generate beat → Save to Vault (Supabase) → Open in Character Studio from beat.

---

# Proposed work: Storyline Studio navigation bug + Image Vault downloads (2026-04-15)

## A) Bug: “Open in Character/Assets Studio” buttons do nothing

### Goal
- In `StorylineStudio`, clicking **Open in Character Studio** or **Open in Assets Studio** reliably switches portals and injects the selected beat image into the target studio (as a reference image and/or as the “live” image depending on existing studio import behavior).

### Likely flow (expected)
- `StorylineStudio.tsx` calls `useStudioImportBridge().requestOpenInStudio(target, imageUrl, hint?)`.
- `App.tsx` watches `portalToOpen` and navigates to `studio`/`assets`, then clears the portal request.
- The destination studio (`CharacterStudio.tsx` / `AssetsStudio.tsx`) consumes `consumeImportForTarget(target)` on mount and applies `imageUrl` (+ optional `promptHint`).

### Investigation plan (no edits)
- Reproduce in browser with console open:
  - Verify the buttons are enabled (a beat with `imageUrl` is selected).
  - Click **Open in Character Studio** / **Open in Assets Studio**.
  - Check for console errors and confirm whether `portalToOpen` changes.
- If `portalToOpen` changes but navigation does not:
  - Inspect `AppShell` portal navigation + any guards that could prevent switching.
- If navigation happens but the image does not appear in the destination studio:
  - Inspect `CharacterStudio.tsx` / `AssetsStudio.tsx` import-consume effect and ensure the imported image is applied to the correct place (reference slot, live preview, etc.).

### Fix plan (small edits, incremental tests)
- Make the smallest change that restores:
  - **Portal switch** on click
  - **Imported image application** in the destination studio
- After each edit:
  - Mechanical verify (view edited region)
  - Lint/type check for touched files
  - Browser retest the click flow immediately

### Acceptance criteria
- From Storyline Studio, selecting a beat that has an image and clicking:
  - **Open in Character Studio**: navigates to Character Studio and the beat image is present (imported) with no console errors.
  - **Open in Assets Studio**: navigates to Assets Studio and the beat image is present (imported) with no console errors.

## A2) Storyline Image Lab: reference helper buttons + mixed refs

### User-observed behavior (current)
- In Storyline **Image Lab**:
  - **Use Assets Studio refs** immediately fills the 14 reference tiles from whatever is currently loaded in **Asset Studio** reference slots (no choice UI).
  - **Use Character Studio refs** may appear to do nothing when the Character Studio store has no reference URLs set.
- The above behavior is consistent with the current implementation: it reads `referenceImageUrls` directly from the studio stores and replaces the lab refs array.

### Goals
- Make the buttons **explicit** about what they do and why “nothing happened”:
  - If there are **0** refs in the source studio, show a compact message like “No references in Character Studio yet” + a hint to add refs there (or use Vault picker in future).
- Allow mixing **both** kinds of references:
  - Add **Add Character refs** and **Add Asset refs** actions that **fill first-empty** lab slots without overwriting existing refs.
  - Keep current actions as **Replace with Character refs** / **Replace with Asset refs** (or keep existing labels but add a secondary “Add” row).
- Keep `context` (Character vs Asset) as an explicit toggle for labeling/intent; mixed refs are allowed regardless of context.

### Acceptance criteria
- Clicking Character/Asset helper buttons always produces visible feedback:
  - Either refs are inserted/replaced, or a clear empty-state message appears.
- User can press **Add Character refs** then **Add Asset refs** and end up with both in the lab references array.

## B) Feature: Image Vault downloads (single / selection / whole album)

**Status (2026-04-15):** Implemented — [`vaultImageDownload.ts`](src/shared/lib/vaultImageDownload.ts), modals above, `fflate` in `package.json`. Progress/partial-failure UX from the plan was not implemented (minimal zip + single download).

### Goal
- In Image Vault (Characters + Assets), allow downloading **high-quality image files**:
  - **Single image** (from grid/card)
  - **Selected images** (multi-select within album modal)
  - **All images in album** (one action)

### Constraints / assumptions
- When Supabase Storage is used (`arcs-generations` private bucket), displayed URLs may be **signed** and expire; downloads must use the **resolved** URL (or re-sign on demand).
- For “download many”, browsers require either:
  - multiple user-initiated downloads, or
  - bundling into a `.zip` client-side (preferred UX) using a small zip library.

### Proposed approach (implementation-level)
- **Naming & formats**
  - **Default format**: preserve original if known (prefer `.png` when source is `data:image/png`, else `.jpg`).
  - **Filename template**:
    - Characters (profile modal): `characters/<profile_name>/<id>_<seed?>_<aspect?>.<ext>`
    - Assets (collection modal): `assets/<collection_name>/<id>_<seed?>_<aspect?>.<ext>`
    - Sanitization: replace `/\:*?"<>|` and trim; fallback to `Unnamed`.
- **Single download**
  - Per-image card action **Download HQ**:
    - Resolve to a **fresh fetchable URL** (signed if `arcs-generations`).
    - `fetch` → `Blob` → `URL.createObjectURL(blob)` → `<a download>` click.
- **Multi-download (selected/all)**
  - In each album modal, add lightweight selection state:
    - Toggle select per image; toolbar buttons: **Select all**, **Clear selection**.
    - Actions: **Download selected (.zip)**, **Download all (.zip)**.
  - Zip bundling:
    - Prefer a small client zip library (e.g. `fflate`) to build the `.zip` in-browser.
    - Build zip entries from fetched `Uint8Array` per image with the filename template above.
    - Download as `<album-name>.zip`.
  - UX: show progress line `Zipping (3/18)…`; disable buttons while busy; surface per-image failures in a compact list (but still download partial zip when possible).

### Acceptance criteria
- Single-image downloads save an image file (not a low-res thumbnail) and match what’s displayed.
- Selected/all downloads produce a zip with correct counts and filenames.
- Works both when images are public URLs and when they require signed URL resolution.

## C) Bug: “Failed to fetch reference image” when generating with archived/vault refs

### Symptom
- In **Asset Studio**, selecting an archived/vault image into a reference slot can succeed visually, but when generating, the API returns an error like **“failed to fetch reference image”**.

### Likely root cause
- Supabase Storage signed URLs are **time-limited**. A reference slot can hold a previously-signed URL (or a display URL that was signed earlier) whose token is now stale, resulting in HTTP **400** on fetch during reference encoding.

### Fix plan
- **Core rule:** Never rely on previously-copied signed URLs for generation. Keep **canonical/stable identifiers** in state/DB; signed URLs are ephemeral.
- **Just-in-time signing:**
  - When encoding reference images, if a ref URL is an `arcs-generations` object URL, always resolve it to a **fresh signed URL** immediately before fetch/base64.
- **Retry-on-400 (once):**
  - If the fetch for a reference image returns **400**, re-sign (fresh token) and retry fetch+base64 **one** time before failing that request.
  - Do not log signed URL tokens.
- **Where it applies:** any Gemini image generation entrypoint that encodes refs (Asset Studio, Character Studio, Storyline Image Lab, and any shared helper that calls `urlToBase64WithMime`).

### Acceptance criteria
- With an archived/vault image set as a reference in Asset Studio:
  - Generation succeeds (no “failed to fetch reference image”)
  - No console errors

## D) Feature: Reset UX — Character Studio + Asset Studio (2026-04-15)

**Status (2026-04-15):** **Done:** `resetWorkspaceFreshSlate` on both stores; **Clear workspace** + **Reset to tags** / **Refresh** also `setPromptPanelTab('auto')`. **Section clears:** Character — `clearReferenceSlotsKeepLive`, `clearPromptTagsOnly`, `clearLivePromptOverridesOnly`, `clearDnaModuleSelections`, `clearStyleModuleSelections` + tab toolbars; Asset — `clearStructuralSelections`, `clearLookSelections`, refs/prompt/tags panels; **Reset to tags** / **Refresh** call `clearLivePromptOverridesOnly`.

### Goals
- Make “Refresh / Reset to tags” (or equivalent) **visibly** update the Live Prompt output as intended.
- Add **Clear everything (fresh slate)** and **section-level clears** in BOTH studios.

### “Clear everything (fresh slate)” must clear
- tags (all selected tag chips / structured tag sections)
- all style selections (including libraries/snippets if they count as “style selections”)
- all 14 reference image slots
- prompt overrides (Live Prompt manual override / refinement drafts / any pinned prompt override text)

### “Clear everything” must NOT change
- live image
- seed
- recents / “This session” / history strips

### Proposed store API (both stores)
- **Fresh slate** action: `clearEverythingFreshSlate()` that resets only the allowed fields.
- **Section clears** (minimum set):
  - References: `clearAllReferenceSlots()`
  - Prompt tags: `clearAllPromptTags()` (or per-section clears + “clear all tags”)
  - Major style sections: `clearStyleSelections()` (and optionally per-subsection clears where UI is split into multiple cards)
  - Live Prompt overrides: `clearPromptOverrides()` (manual override + refine drafts)
- Ensure existing “Reset to tags”:
  - sets override text to empty (if that’s the meaning) and
  - triggers recomputation so the visible prompt changes immediately (no stale memoization / derived state).

### UI placement
- In each studio’s left column:
  - a compact **Reset** row near the Live Prompt panel header or workspace tab strip:
    - **Reset to tags**
    - **Clear everything**
  - section-level clears as small buttons in the relevant section headers (Refs, Tags, Build/Look/DNA sections, Live Prompt overrides).

### Verification
- Manual (browser):
  - Set tags + override + refs → verify prompt changes.
  - Click **Reset to tags** → prompt visibly reverts to tag-built output.
  - Click **Clear everything** → tags/styles/refs/overrides cleared; live image + seed + recents unchanged.
  - Section clears only affect their section.

---

# Character Vault Foundation (Ruby & Gold Edition) (2026-03-18)

## Asset Reference Studio alignment (Mar 2026)

- **Reference slots:** Asset Studio uses `REFERENCE_SLOT_GROUPS_ASSET` and `getSlotLabel(index, 'asset')`. [`geminiImageApi.ts`](src/shared/api/geminiImageApi.ts) sends asset-specific slot role labels and environment `subjectOnly` when `context: 'asset'`.
- **Tags:** Era / Location / Scene sections are gated only by **Architectural Lock** (removed live-image lockout and `diversifyStyle`). Per-section **Save as Tag** on Era, Location, and Architectural Detail (replacing the combined dropdown).
- **Prompts:** [`assetGenerationPromptWrappers.ts`](src/shared/utils/assetGenerationPromptWrappers.ts) — environment-appropriate style prefix; empty-of-figures constraint unless vault override. [`buildPrompt.ts`](src/shared/utils/buildPrompt.ts) — `getSurgicalInstructionsFromReferenceSlots(urls, 'asset')`.
- **Taxonomy:** [`asset_tag_library.json`](src/data/asset_tag_library.json) and [`asset_studio_spec.ts`](src/data/asset_studio_spec.ts) preset chips aligned to place/setting workflows.
- **Verify:** `npm run test -- --run`; `npm run build`.

## Navigation (2026-03-18)

- **Image Vault:** Main sidebar + landing card label for the `reference` portal is **Image Vault** (replaces “Character Archive”). `ReferenceAlbum` uses tabs **Characters** / **Assets**.
- **Removed:** **Comics & Story Archive** (`related` portal) — redundant with Asset Vault inside Image Vault; `RelatedAlbum` and `temp_related_album.html` deleted.

## Vault Framing (2026-03-19)

- **Goal:** Bring back per-image thumbnail framing (pan focal point + zoom) inside the **Vault** UI for both **Characters** and **Assets**.
- **Persistence:** Store framing in `metadata_tags.archive_thumbnail = { x, y, scale }`:
  - `x`, `y` are 0–100 (percentage)
  - `scale` is a positive number (1 = default)
- **Read path:** Vault album loaders derive:
  - Characters: `thumbnail_focus_x / thumbnail_focus_y / thumbnail_scale` from `characters.metadata_tags.archive_thumbnail`
  - Assets: `thumbnail_focus_x / thumbnail_focus_y / thumbnail_scale` from `assets.metadata_tags.archive_thumbnail`
- **Write path:** “Framing” UI reuses `ArchiveThumbnailFocusModal` and saves via:
  - `updateCharacterThumbnailFocusDb(id, focus)` for Supabase
  - `updateAssetThumbnailFocusDb(id, focus)` for Supabase
  - local fallbacks when Supabase isn’t configured
- **Rendering:** Vault thumbnails apply framing via:
  - `object-position: "<x>% <y>%"` on the `<img>`
  - `transform: scale(<scale>)` on the `<img>` inside an overflow-hidden frame
- **Surface area:**
  - Cover cards: show framed cover image automatically
  - Modal grids: each item includes a **Framing** action to edit its thumbnail framing

## Goal

Refactor **Character Archive** into a high-fidelity, album-based **Vault** with a Ruby/Gold “Portal” aesthetic, and add a **single-cover-per-profile** system with persistent cover selection (Supabase when configured, local fallback otherwise).

## Non-goals (for this stage)

- No pagination/virtualization (unless performance forces it).
- No asset-side “cover” (characters only for now).
- No new global toast framework (use lightweight in-component feedback).

---

## Stage 1: Ruby Vault Aesthetic (UI)

### Visual tokens (local to Vault or added to `Phase12DesignTokens.ts`)

- **Background canvas**: deep ruby diagonal gradient `#8b0000 → #4a0000`.
- **Structural accents**: gold diagonal gradients `#D4AF37 → #FBBF24` for borders/dividers.
- **Interactive elements**: gold stroke/fill for icons + buttons.
- **Selection state**: high-luminance ruby glow (or shimmering gold highlight).

### Where this lands

- Replace character tab content in `src/portals/ReferenceAlbum.tsx` to render a new Vault UI component (keep Asset Archive as-is).
- Vault must be fully themed *inside its own container* (so it doesn’t depend on global `setTheme('purple')`).

---

## Stage 2: Album System (Profile grouping + cover card)

### Data grouping rules

- Group all character images by `profile_name`.
- Each unique profile renders as **one** “Profile Cover” card in the Vault grid.
- **Default cover fallback**: most recent generation in that profile if no manual cover is set.

### Drill-down interaction

- Clicking a “Profile Cover” card opens a **modal sub-window** that inherits the Ruby/Gold aesthetic.
- The modal shows the full collection for that `profile_name` (images + metadata like name/cast_name/seed when present).

### Cover Selection Engine (Star toggle)

- Each image in the modal has a **Ruby-encrusted Gold Star** control.
  - Inactive: muted gold outline star.
  - Active: solid gold star with ruby gem center `#e0115f` (subtle pulse to indicate active).

---

## Supabase: Schema + queries (single source of truth)

### Schema change (characters table)

Add a boolean column to `public.characters`:

- Column: `is_profile_cover BOOLEAN NOT NULL DEFAULT false`
- Index: partial index for fast per-profile lookup where cover is true

Migration file (new):

- `supabase/migrations/20260318000000_arcs_profile_covers.sql`
  - `ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS is_profile_cover BOOLEAN NOT NULL DEFAULT false;`
  - `CREATE INDEX IF NOT EXISTS idx_characters_profile_cover ON public.characters (profile_name) WHERE is_profile_cover = true;`

### Swap semantics (only one cover per profile)

When user stars an image as cover:

1. Set `is_profile_cover = false` for all rows with the same `profile_name`
2. Set `is_profile_cover = true` for the selected row (`id`)

Notes:
- Implement as two sequential Supabase updates; UI should show “Saving…” during the swap.
- After save, refresh the Vault data source so the cover card updates immediately.

---

## Approved follow-ups (2026-03-18)

- **Seed mode:** UI toggle **Locked** vs **Randomized**; **default Randomized** (new seed each generate unless user locks).
- **Trash:** Deleting the live image (zoom or preview) clears that URL from **Recent** and session **This session** cache.
- **Vault toolbars:** Character + Asset vault modals support rename album, move rows, merge confirm, delete row/album, cast/asset name edit; Asset Archive tab → **Asset Vault** (`AssetVault.tsx`).
- **Studios:** Add “save as existing” combobox behavior for `profile_name` (Character Studio) and `collection_name` (Asset Studio).
  - Search is driven by typing; **Save is only enabled when the typed value exactly matches an existing option** from the dropdown (case-insensitive).
  - If the option is the display key `"Unnamed"`, map it to `NULL` for the Supabase insert (`profile_name` / `collection_name`).
- **Vault framing (move/scale focus):**
  - **Data**: Extend `arcsVault.getCharacterAlbums()` to include `metadata_tags` and parse `metadata_tags.archive_thumbnail` into per-item `thumbnail_focus_x/y/scale` (defaults: 50/50/1).
  - **Render**: In `CharacterVault` (cover cards) and `ProfileVaultModal` (inside cards), apply:
    - `objectPosition: \`${fx}% ${fy}%\``
    - `transform: scale(${scale})`
    - `transformOrigin: \`${fx}% ${fy}%\``
  - **UI**: Add a **Framing** button on:
    - Vault cover cards (to edit the cover image’s focus)
    - Each image card inside `ProfileVaultModal`
  - **Persistence**: Use existing `ArchiveThumbnailFocusModal` save behavior:
    - Supabase: `arcsPersistence.updateCharacterThumbnailFocusDb` → `metadata_tags.archive_thumbnail`
    - Offline: `generationOutputRouter.updateCharacterGenerationThumbnailFocus`
  - **Verify**: Adjust framing → Save → immediately reflected in Vault; refresh persists (Supabase/local).

---

## Reference studios — 60/40 shell + merged workspace (2026-03-28)

- **Split:** Left column `flex-[0_0_60%] max-w-[60%]`; right `flex-[0_0_40%] max-w-[40%]` in `CharacterStudio.tsx` and `AssetsStudio.tsx`.
- **Hub:** No dashed bulk multi-upload row; **Clear all** / **Paste first empty** on the focused-slot toolbar row.
- **Live Prompt:** **Model** and pin/last-prompt controls moved to a shared **footer** under tabs; Edit tab is textarea + snippets only.
- **Right:** One card (**Reference workspace** / **Asset workspace**): preview → scrollable gallery/spatial block → stacked **horizontal tool strips** (thumbnails + Compare; generate/save; Character: age + aspect + camera compact).

---

## Character Studio Panel UX (2026-03-25)

### Scope

- Space optimization across panels (reduce unused height caps and tighten vertical spacing).
- Reference images UX: larger hover preview, Upload/Archive icon buttons, clearer group label for background/setting refs.
- Tags & Style: add Facial Expressions section (preset + custom library with remove) and ensure click-off works.
- Live Prompt: add `Reference Prompt` tab; per-tab Copy; `Reset to tags`; `Refresh` on Prompt tab.
- Onyx Vault: Live Prompt **Edit** tab always shows model + raw override (no password); non-empty override replaces tag-built prompt in [`buildCharacterStudioPromptForApi`](src/shared/utils/buildCharacterStudioPromptForApi.ts).

### Key Files

- `src/portals/CharacterStudio.tsx`
- `src/stores/characterStudioStore.ts`
- `src/data/character_studio_spec.ts`
- `src/shared/constants/referenceSlots.ts`
- `src/components/ui/ArchiveRecallModal.tsx`
- `src/shared/utils/buildCharacterStudioPromptForApi.ts`

### Verification

- Unit tests: `npm run test` (includes `src/shared/utils/__tests__/buildCharacterStudioPromptForApi.test.ts`)
- Lint: `npm run lint` (repo has warnings; no errors)
- Build: `npm run build`
- Manual UI smoke test: verify tabs/buttons/icons/compare split render and behave as expected in Character Studio

## Character Studio: reference toolbar + gallery density (2026-03-25)

### Goals

- Remove repeated per-slot control rows; use **focused slot** + one **Upload / Archive / Clear** toolbar (word labels + icons for scanability).
- **Accordion** DNA groups: one open at a time; opening tracks **focused slot** so the active slot stays visible.
- **Reference Gallery:** consume vertical space with a **pose grid** (larger tiles), **session summary** chips, **empty state**, and **pose actions** (duplicate, push to first empty reference slot, open externally).

### Files

- `src/portals/CharacterStudio.tsx`

### Verification

- `npm run test -- --run`
- `npm run build`
- Manual: click slots to change focus and use toolbar; collapse/expand DNA headers; duplicate pose; fill all 14 refs then “send to slot” should surface error status

## Hybrid fallback strategy (Supabase + localStorage)

### Repository pattern (new helper module)

Create `src/shared/api/arcsVault.ts` with functions:

- `getCharacterAlbums()`:
  - Supabase configured: query `public.characters` and group by `profile_name`
  - Offline: group `getGenerations('character')` by `profileName`
- `getProfileCover(profileName)`:
  - Supabase configured: query for `is_profile_cover=true`, else fallback to:
    - localStorage key `arcs_cover_${profileName}` (store either character `id` when online, or generation `id` when offline)
    - else most recent item in that profile
- `setProfileCover({ profileName, id })`:
  - Supabase configured: perform swap updates
  - Offline: write localStorage mapping `arcs_cover_${profileName} = <generationId>`

### Why store IDs instead of URLs

IDs are stable even if image URLs change (e.g. storage migrations) and avoid duplication of large data URLs in localStorage.

---

## UI components (proposed)

- New: `src/components/ui/CharacterVault.tsx`
  - Renders profile cover grid (album cards)
  - Applies Ruby/Gold portal visuals
  - Opens modal on cover click
- New: `src/components/ui/ProfileVaultModal.tsx`
  - Shows per-profile images grid + metadata
  - Star toggle per image (calls `setProfileCover`)
  - Local “Saving…” indicator (no global toast dependency)
- Update: `src/portals/ReferenceAlbum.tsx`
  - Character tab: render `CharacterVault`
  - Asset tab: keep `AssetArchiveGallery`

---

## Testing & verification (incremental)

- **After migration added**: verify SQL compiles (no-op if column exists).
- **After repo helper**: add a small unit test for cover fallback selection (offline path) OR verify with a minimal in-browser test if no test harness fits.
- **After Vault UI**: browser test:
  - grid renders and matches Ruby/Gold palette
  - clicking a cover opens modal
  - starring an image updates cover (and persists)
  - refresh page → cover persists (Supabase or local fallback)
  - no console errors

---

## Previous feature: Studio UX refinement (2026-03-15)

**Source:** `docs/plans/2026-03-15-studio-ux-refinement-and-polish.md`

**Implemented logic (summary):**

1. **API** — When any reference image is present, prepend subject-only instruction; when `isVaultOverride` + refs, append stronger no-background line (character vs asset via `context`).
2. **Refinement** — Single reference = current live image; prompt = art style + user refinement text; both studios.
3. **UI** — Reference panel (slots only) + scrollable Tags panel; 3-tab prompt; vault edit in center Edit tab; persisted snippets and refinement draft.
4. **Efficiency** — Keyboard shortcuts, last-prompt chip, clear/paste slots, generate again, undo one step.

**Follow-up:** “NEW” describe-from-image (separate API work).

---

## Writers' Workshop (2026-03-29)

### Phase 0 (done)

- SQL: `writer_series`, `writer_issues`, `writer_issue_outlines`, `writer_pages`, `writer_cast`, `writer_locations`, `writer_style_bibles`, `writer_video_shot_plans`; permissive RLS.
- UI: `WriterPortal` — main column Tiffany + gold slant (hub unchanged); tree + tabs; placeholders.
- API reads: `listWriterSeries`, `listWriterIssues`, `listWriterPages`.

### Phase 1 (done)

- Edge Function `writer-tools`: `outline_issue` loads issue + series + cast/locations/style bibles; **Gemini** `generateContent` with `responseMimeType: application/json`; validates with Zod; inserts `writer_issue_outlines` with next `version`.
- Client: `invokeWriterTools`, `listWriterOutlinesForIssue`; Outline tab — target page count, Generate, latest JSON preview; AI run log in dock **Activity** (was a side rail in early shells).
- Config: [`supabase/config.toml`](supabase/config.toml) — `[functions.writer-tools] verify_jwt = true`. Secrets: `GEMINI_API_KEY` (or `GOOGLE_API_KEY`; same value as app `VITE_GEMINI_API_KEY`), optional `GEMINI_MODEL` (default **`gemini-3-flash-preview`**; fallbacks **`gemini-3.1-flash-lite-preview`**, **`gemini-3.1-pro-preview`** — avoids deprecated 1.5 / soon‑retired 2.5).

### Phase 2 (done)

- Edge `writer-tools`: `page_beats` (Gemini JSON → `writer_pages.beats_json`), `draft_dialogue` (→ `script_text`); shared Zod in `src/shared/writer/` + `supabase/functions/_shared/writerSchemas.ts`.
- Client: `WriterPageRow` includes `beats_json`, `script_text`, `updated_at`; `listWriterPages` selects them; **`createWriterPage`** inserts the next `page_number` for an issue. `WriterPortal` — **Add page** in dock **Library → Pages**; selectable page list; **Beats** and **Dialogue** tabs call `invokeWriterTools`, refetch pages, show saved JSON/script.
- Tests: `schemas.test.ts` covers `page_beats` / `draft_dialogue` requests and `pageBeatsJsonSchema`.

### Phase 3 (done)

- Edge: `pacing_review`, `canon_check` — Gemini JSON validated with Zod; results merged into `writer_issues.notes.writer_tool_cache` (`pacing_review` / `canon_check` entries with `at` + `result`).
- Client: `WriterIssueRow.notes` loaded via `listWriterIssues`; **Arc Planner** tab runs both tools and shows last saved JSON.

### Phase 4 (done)

- Edge: `plan_shots_from_issue` — optional `creative_brief`; persists to `writer_video_shot_plans` with next `version`.
- Client: `listWriterShotPlansForIssue`; **Video** tab — generate plan, preview JSON, **Download** shot plan / outline / issue pack.

### Phase 5 (partial, 2026-03-30)

- **Arc Planner:** horizontal **issue spine** (sorted by `issue_number`); chips set `selectedIssueId` (same as Library → Issues selection).
- **Video:** [`shotPlanJsonToCsv`](src/portals/writer/shotPlanCsv.ts) + **Download shot plan CSV**; [`WriterShotStoryboardStrip`](src/portals/writer/WriterShotStoryboardStrip.tsx) (react-konva frame per shot, horizontal scroll).
- Tests: [`shotPlanCsv.test.ts`](src/portals/writer/__tests__/shotPlanCsv.test.ts).

### Phase 6 — Ribbon + dock + Find (done, 2026-03-30)

- **Layout:** [`WriterRibbon`](src/portals/writer/WriterRibbon.tsx) under the workshop header (menu tabs + contextual groups, Find + next/prev, dock toggle). [`WriterStudioDock`](src/portals/writer/WriterStudioDock.tsx) — **Library** (series/issues/pages), **Activity** (AI history), **Shortcuts**; collapsible strip.
- **Find:** [`writerSearch.ts`](src/portals/writer/writerSearch.ts) — `getWriterSearchableText`, `countFindMatches`, `formatArcReviewPlainText` (Arc tab: **one** labeled plain-text blob so match indices align with a single `<pre>`). [`WriterHighlightedText`](src/portals/writer/WriterHighlightedText.tsx) for `<mark>` highlights + active scroll.
- **Input:** [`useWriterHotkeys.ts`](src/portals/writer/useWriterHotkeys.ts) (workspace tabs ⌘1–5, Find, dock toggle, Esc clears find). [`WriterContextMenu.tsx`](src/portals/writer/WriterContextMenu.tsx) for copy / outline JSON / issue pack download.
- **Misc:** Lucide **`PanelRight`** for dock affordance (replaces unavailable `LayoutPanelRight`).

### Phase 6b — UI parity: glass panels + reliable scroll (done, 2026-03-31)

- **Goal:** match the other portals’ “separate frosted panels” look (not one connected cream block with divider lines) and ensure the outline preview is never trapped below the fold.
- **Approach:**
  - Center workspace becomes a **scroll container** (`overflow-y-scroll`, stable gutter) with multiple **glass cards** (`bg-white/15–25`, `backdrop-blur`, `border-white/25–35`) over the Tiffany gradient.
  - “Latest saved outline” preview grows taller and remains independently scrollable inside its card.
  - Ensure the **flex height chain** supports internal scrolling (`AppShell` main wrapper `flex flex-col min-h-0`; `App.tsx` writer wrapper `flex-1 min-h-0`; `WriterPortal` root `flex-1 min-h-0 overflow-hidden`).

### Phase 6c — Help registry + tooltips (done, 2026-03-31)

- **Registry:** [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx) — `WRITER_UI_TIPS` (ribbon/dock/workspace tooltips), `WriterHelpCategoryBody` (modal sections per category), `WriterSectionTip`, `writerHelpCategoryTitle`.
- **Portal:** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — `helpCategory` state; Library/Series/Pages/Issues and workspace tabs use tips; dock **Shortcuts** defers to ribbon **Help**; Supabase-off story card uses short copy + tooltip.
- **Ribbon:** [`WriterRibbon.tsx`](src/portals/writer/WriterRibbon.tsx) — Help tab opens categories; category icons match typed `CatIcon` (no invalid `strokeWidth`).

### Phase 6d — Auth awareness in UI (done, 2026-03-31)

- When Supabase env is configured but **no user session**, show a **dismissible** banner under the workshop header: AI tools need a signed-in JWT; links into **Help → Setup** (opens category modal).
- [`writerTools.ts`](src/shared/api/writerTools.ts) — **401/403** from Edge Functions returns a clear “sign in / session expired” message (in addition to parsing JSON `error` when present).

### Phase 6e — In-app Supabase Auth (email/password) (done, 2026-03-31)

- **Global state:** [`AuthContext.tsx`](src/shared/context/AuthContext.tsx) — `getSession` + `onAuthStateChange`, `signInWithPassword`, `signUpWithPassword` (email confirmation path surfaces “check your email”), `signOut`, `openSignInModal`. Renders [`AuthModal`](src/components/auth/AuthModal.tsx) when `VITE_SUPABASE_*` is set.
- **Shell:** [`AppShell.tsx`](src/components/layout/AppShell.tsx) — bottom account control: **Sign in** (opens modal) vs **initials + Sign out** when a session exists; muted placeholder when Supabase env is missing.
- **Writer:** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) uses `useAuth()` (no duplicate auth listener); banner includes **Sign in here** → same modal.
- **Bootstrap:** [`main.tsx`](src/main.tsx) wraps the app with **`AuthProvider`** inside `ThemeProvider` (with `ProjectProvider`).

### Phase 6f — Writer tools auth refresh optimization (planned, 2026-04-02)

- **Problem:** `invokeWriterTools` currently calls `supabase.auth.refreshSession()` on every tool invocation when a `refresh_token` exists, even if the access token is still fresh. This adds a network round-trip and can race when multiple AI tool calls happen concurrently.
- **Plan:** only refresh when needed:
  - Decode JWT `exp` and refresh only when \(exp - now\) is below a small buffer (e.g. 120s), or when validation indicates it is expired.
  - If multiple calls want refresh at the same time, dedupe with a module-scoped in-flight refresh promise so only one network refresh happens.
  - Keep retry-on-401 behavior, but avoid the unconditional pre-flight refresh.

### Phase 6g — Series library UX + stale series refresh fix (done, 2026-04-02)

- **Problem (refresh):** `refreshIssuesForSeries` closed over `selectedSeriesId` while `runPacingFromRibbon` / `runCanonFromRibbon` used `useCallback([selectedIssueId])` only, so after switching series those callbacks could refresh the wrong series’ issues.
- **Fix:** `refreshIssuesForSeries` is `useCallback` with `[selectedSeriesId]`; ribbon callbacks list `[selectedIssueId, refreshIssuesForSeries]`.
- **Problem (UX):** “Create first series” only appeared when the list was empty, so users could not add another series. Series **title** was not editable in the UI (only logline was saved, and saving required a selected issue).
- **Fix:** **+ Add series** in Library when at least one series exists; **Issue Outline → Story context** includes **Series title** and **Save story context** updates `writer_series.title` + `logline` with only a series selected; issue fields save when an issue is selected.
### Phase 6h — writer-tools token refresh optimization (planned, 2026-04-03)

- **Issue:** [`invokeWriterTools`](src/shared/api/writerTools.ts) currently calls `supabase.auth.refreshSession()` whenever a `refresh_token` exists, even when `getSession()` returns a still-valid access token.
- **Fix strategy:** only refresh when JWT pre-check reports an **expired** token (or on explicit 401 retry path), and keep existing invalid-token guards (`anon` role / wrong issuer / malformed token).
- **Expected impact:** removes one avoidable auth network round-trip from most writer tool invocations and reduces refresh race pressure under concurrent calls.

### Hotfix verification — `invokeWriterTools` refresh behavior (2026-04-04)

- **Request:** verify and fix the report that `invokeWriterTools` unconditionally refreshes auth on every invocation.
- **Verification scope:** [`src/shared/api/writerTools.ts`](src/shared/api/writerTools.ts), especially the preflight auth block around `getSession` → `validateAccessTokenForEdge` → conditional `refreshSession`.
- **Proposed implementation:** no functional change if guard is present; add regression tests to lock expected behavior:
  1. **Fresh token:** `refreshSession` is **not** called and function invocation uses current token.
  2. **Expired token:** `refreshSession` is called once and function invocation uses refreshed token.
- **QA / verify:** run targeted vitest for the new test file, then run lint to confirm no TS/ESLint errors introduced.

### Phase 5+ (backlog)

- Richer cross-issue arc timeline; panel thumbnails / scrubbing in the strip; PDF export.

### Phase 7 — Writers’ Workshop QoL (2026-04-10)

**Goal:** Reduce friction between outline → pages → beats; unify workspace tab order; add guided “next step” hints and a lightweight pipeline strip.

**Backend / contract**

- **`writer_lore_cards`:** `series_id`, `title`, `category`, `body`, `include_in_prompt`, `sort_order` — series worldbuilding; Edge loads rows with `include_in_prompt` for `outline_issue` and `page_beats` (digest capped ~12k chars).
- **`outline_issue`:** `issue_id`, optional `target_page_count` — per-issue outline only (no multi-issue spine in the API; use Arc tab batch pacing/canon for cross-issue tooling).
- **`page_beats_issue`:** `issue_id`, optional `skip_existing`, optional `batch_limit` (1–5; server default 5), optional `batch_offset` (0–500; **when `skip_existing` is false and `page_ids` omitted** — next slice for “regenerate all”). Optional `page_ids` (1–5 UUIDs, unique, issue-scoped): process only those pages in `page_number` order; `has_more` false; `batch_offset` ignored. Optional `director_notes_for_beats`. Response `{ processed, errors, has_more, batch_size, batch_offset?, next_batch_offset? }` (offset fields omitted when using `page_ids`).

**Client**

- **`ensureWriterPagesToCount(issueId, targetCount)`** in `arcsWriterRoom.ts` — inserts missing `writer_pages` rows for 1…N (cap 500).
- **`WriterPortal`:** Issue Outline — **Sync pages to target**, **Generate outline**, **Download outline**, **Delete latest outline**. Beats tab — **Pick pages (max 5)** + **Generate beats for selected**, **Director notes for beats**, **Skip pages that already have beats**, **Generate all beats** (batch 5 + `batch_offset` when not skipping existing), **Cancel after this batch** (multi-round “all” only); **xl** two-column layout (controls | sticky beats preview); per-page **Download / Clear beats**. Dialogue — **Download / Clear dialogue** per page. **Arc tab** — batch arc tools as before; **WriterStudioDock** slightly wider on desktop.
- **Tab order (single source):** `WRITER_WORKSPACE_TAB_ORDER` + `WRITER_WORKSPACE_TAB_LABELS` in `writerSearch.ts`; consumed by `WriterPortal` headings, `WriterRibbon`, and `useWriterHotkeys` (⌥⌘1–7): **Outline → Lore → Beats → Dialogue → Video → Arc → Scripts**.
- **`writerNextStep.ts`:** `getWriterQuickGenerateNextHint` for ribbon AI quick-generate tooltip; **Pipeline** strip under ribbon with per-tab completion heuristics + same hint on wide screens.
- **Help:** `WRITER_UI_TIPS` entries for sync, batch beats, arc batch multi-select; keyboard blurb matches new tab order.

**Verify:** `npm run test -- --run`, `npm run build`; redeploy **`writer-tools`** after pull; manual — sync pages, batch beats, outline per issue, Arc batch pacing/canon.

### Writers — Lore JSON import (planned)

**Goal:** In the **Lore** workspace tab, add a small “Import JSON” tool to bulk-create `writer_lore_cards` from a pasted JSON array, while safely skipping duplicates and assigning deterministic sort order.

**Input format**

- Accept a pasted **JSON array** of objects; each object maps to one lore card.
- Supported keys (tolerant parsing): `title` (required), `category` (optional), `body` (optional), `include_in_prompt` (optional), `sort_order` (ignored on import; re-assigned).
- Whitespace-only strings are treated as empty; `title` must have a non-empty trimmed value.

**Validation + feedback**

- Parse errors show a clear, single-line message and do not write to Supabase.
- Per-card validation errors (e.g. missing title) are collected and shown as a compact summary; invalid rows are skipped.
- Import is disabled when Supabase is not configured or no series is selected.

**Duplicate-skip semantics**

- Define a normalized key: `normalize(category) + '|' + normalize(title)` where normalize = `trim → lower-case → collapse internal whitespace`.
- Skip importing cards whose normalized key already exists among **existing cards in the selected series** (regardless of `include_in_prompt`).
- Also skip duplicates **within the pasted payload** (first wins, subsequent skipped).

**Sorting + `sort_order` assignment**

- The imported set is sorted **by** `category` (normalized) then `title` (normalized) before insertion.
- Assign `sort_order` sequentially as `10, 20, 30, …` starting at `maxExistingSortOrderRoundedUpTo10 + 10` so imported cards append after existing cards.
- After import, refresh lore list (which is already ordered by `sort_order`, then `title`).

**UI / UX**

- Add an “Import JSON” collapsible panel in the Lore tab under the “New card” editor.
- Fields: large textarea for JSON; “Dry run”/Preview stats (optional), and “Import” button.
- On completion, show counts: imported, skipped-duplicate (existing), skipped-duplicate (payload), invalid.

### Phase 7b — Outline coverage + anti-repetition beats (done, 2026-04-11)

**Problem observed:** outlines can save with sparse `page_beats` (fewer than target pages), and page-beats generation may repeat because missing pages fallback to weak outline context.

**Implemented**

- **Edge prompt hardening (`outline_issue`):**
  - Require one `page_beats` entry per page when `target_page_count` is provided.
  - Require `page_target` values spanning `1..target_page_count` (capped by schema max).
  - Instruct model to add bridging beats instead of skipping pages when plot detail is sparse.
- **Edge validation hardening (`outline_issue`):**
  - Validate saved outlines cover target pages; reject sparse outlines with actionable `422` details.
- **Page beats fallback context (`page_beats` / `page_beats_issue`):**
  - Replace “sample first beat” fallback with nearest-anchor context (previous/next outline beats or trailing progression guidance) to avoid repeated page-1 style outputs.
  - Expand prior-page digest to include panel action previews from previous pages for stronger anti-repetition grounding.
  - **Synopsis helper rules:** `notes.synopsis_helper.rules` (Scripts → Rules for the outline, after Save helper to issue notes) is injected into the page-beats user prompt so single-page, batch, and ribbon beats honor the same author constraints as outline generation.
- **Writer UI feedback (`WriterPortal`):**
  - Add an inline warning in Outline tab when latest saved outline has materially fewer `page_beats` than target pages (gap >= 2), with guidance to regenerate outline or provide a fuller arc brief.
  - Add a one-click **Regenerate with coverage boost** action that re-runs `outline_issue` with an appended coverage instruction in **`outline_supplement`** (optional request field; auto-persists into the Outline instructions draft after success). Multi-issue **`arc_brief`** was removed from the API (2026-04-11 simplification on `main`).
  - **Beats-only director notes:** optional `director_notes_for_beats` on `page_beats` / `page_beats_issue` (Zod max 4000) + Beats tab textarea; not sent to `outline_issue`. Edge prompt adds layout-variation and spread guidance; outline prompt nudges distinct consecutive beats when `scene` repeats.

**Verify:** `npm run test -- --run`, `npm run build`; manual writer flow with a sparse synopsis (and optional **Outline instructions for AI**) to confirm per-page outline coverage and reduced repeated page beats.

### Phase 7c — Library page multi-select, clear, delete, exports (done, 2026-04-11)

**Goal:** Restore multi-select on Library → Pages (cap 5) and support batch delete pages, batch clear beats or dialogue, batch download beats/dialogue as one JSON file; single-page download/clear on Beats and Dialogue tabs; download saved outline JSON from Outline preview.

**Client**

- **`arcsWriterRoom.ts`:** `deleteWriterPages`, `clearWriterPagesBeatsJson`, `clearWriterPagesScriptText`.
- **`WriterPortal.tsx`:** checkboxes + toolbar actions (no cap on selection; **Select all pages**); Outline **Download outline**; per-tab actions for current page.
- **`writerHelpRegistry.tsx`:** `pagesLibrary` tip mentions multi-select and batch actions.

**Verify:** `npm run test -- --run`, `npm run build`; manual — select pages, batch clear/download, delete with confirm.

### Phase 7d — Merge `main` (2026-04-11)

**Reconciled:** Arc tab **batch pacing/canon** from `main` with feature-branch Library exports, coverage UI, director notes, and Edge anti-repeat + **`jsonForPrompt` / `PAGE_BEATS_PROMPT_CAPS`**. **`outline_issue`** adds optional **`outline_supplement`** (replaces removed **`arc_brief`** for coverage boost and optional author outline hints).

### Phase 7e — Scripts tab, synopsis helper, edit saved outputs (2026-04-12)

**Workspace:** sixth tab **Scripts & exports** — synopsis worksheet (`notes.synopsis_helper`), build combined synopsis into Issue Outline draft (user still **Save story context** on Outline), copy/download enriched issue pack, edit latest outline / selected page beats & dialogue / latest shot plan with DB save.

**Client:** `writerSynopsisHelper.ts`; `arcsWriterRoom` update helpers for outlines, pages, shot plans, and `notes` on issues.

### Verification

- `npm run test -- --run`, `npm run build`
- Deploy function + set secrets; `supabase db push` for migration; manual Generate outline in app.

### Deploy `writer-tools` (checklist)

1. **CLI + project:** `cd` to repo root (folder containing `supabase/functions/`). Run `supabase login` if you see “Access token not provided”.
2. **Link (once per machine / project):** `supabase link --project-ref <your-reference-id>` (Dashboard → Project Settings → General → Reference ID).
3. **Database:** `supabase db push` (or your usual migration path) so `writer_*` tables and RLS exist before relying on the app.
4. **Upload:** `supabase functions deploy writer-tools`
5. **Secrets:** `supabase secrets set GEMINI_API_KEY="..."` (same value as `VITE_GEMINI_API_KEY`). Optional: `supabase secrets set GEMINI_MODEL="gemini-3-flash-preview"`.

### Supabase Dashboard — Auth URLs (aligns with `verify_jwt` + in-app sign-in)

Do this in the **same** Supabase project as `VITE_SUPABASE_URL` / anon key:

1. **Authentication → URL configuration**
   - **Site URL:** production origin (e.g. `https://your-app.example.com`).
   - **Redirect URLs:** include production origin, and for local dev add `http://localhost:5173` (or whatever port Vite uses) and/or `http://127.0.0.1:5173`.
2. **Authentication → Providers:** enable **Email** (password sign-in / sign-up as needed for your product policy).
3. After deploy, users **sign in inside the app** (sidebar account or Writers’ banner **Sign in here**); the session JWT is what Edge `writer-tools` validates (see JWT note below).

### JWT / signed-in user (`writer-tools`)

1. [`supabase/config.toml`](supabase/config.toml) sets **`verify_jwt = false`** for `writer-tools` so the Functions gateway does not reject valid user JWTs; the **Deno function** validates `Authorization: Bearer <access_token>` via `supabase.auth.getUser(token)` before running tool logic.
2. In the app, use the normal `supabase` client **after** the user signs in with Supabase Auth. `supabase.functions.invoke('writer-tools', { body })` **automatically** sends the session `Authorization` header.
3. **Without the app:** call the function URL with `Authorization: Bearer <user_access_token>` and the `apikey` header set to your **anon** key (see Supabase docs for Edge Function invocation).

### Cloudflare Pages — production SPA (approved)

**Goal:** Host the Vite static build on **Cloudflare Pages**; keep **Supabase** (Postgres, Auth, Edge Functions) as the backend. Same Supabase project as local → production URL only changes where the SPA is served; data stays in Supabase.

**Engineering (repo)**

- **SPA fallback — pick the path that matches your host:**
  - **Workers + `wrangler deploy` (static assets in `wrangler.jsonc`):** Use **`not_found_handling`**: **`single-page-application`** only. **Do not** add **`public/_redirects`** with `/* /index.html 200` — the Workers API rejects it as an **infinite loop** (error **10021**) because it overlaps with SPA asset routing.
  - **Cloudflare Pages only** (build uploads `dist` to Pages, no Wrangler asset deploy): add [`public/_redirects`](public/_redirects) with `/* /index.html 200` so refreshes on client routes work (Vite copies `public/` into `dist/`).

- **Build:** `npm run build` → output directory **`dist`**. Pages dashboard: build command `npm run build`, output `dist`, root `/`.
- **CI guardrail:** **`package.json` must be valid JSON**. A bad merge can append a second copy of the manifest (duplicate keys) and break **`npm ci`** / install with **`EJSONPARSE`** or misleading errors; fix the file, run **`npm install`**, commit **`package-lock.json`**. Repo keeps **`wrangler.jsonc`**, **`wrangler`** + **`@cloudflare/vite-plugin`**, and **`preview` / `deploy`** scripts aligned with the Cloudflare Workers + Vite integration.
- **Cursor Cloud Agent VM:** [`.cursor/environment.json`](.cursor/environment.json) runs **`npm ci`** when the cloud workspace is provisioned so **`node_modules`** is present before agents open a shell. That matches the Vite / ESLint / Vitest / TypeScript toolchain in **`package-lock.json`**; agents can run **`npm run lint`**, **`npm run test`**, and **`npm run build`** without a manual **`npm install`** first (same as a clean checkout with a valid lockfile).
- **Wrangler static assets:** [`wrangler.jsonc`](wrangler.jsonc) **`assets.directory`** = **`dist`** (Vite output) and **`not_found_handling`**: **`single-page-application`**. Cloudflare builds that run **`wrangler versions upload`** after **`npm ci`** must also run **`npm run build`** in the build phase so **`dist/`** exists before deploy.
- Optional: set Cloudflare **environment variable** `NODE_VERSION` = `20` (or `22`) if the default Node fails the build.

**Owner / operator checklist**

- Step-by-step tasks (accounts, Git connect, env vars, Supabase URL config, optional custom domain, troubleshooting): **[`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`](CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md)** in the repo root — work through it in parallel with implementation.

**Environment variables (Cloudflare Pages)**

- Set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (and any other `VITE_*` the app uses) under **Production** and, if needed, **Preview**. Redeploy after adding variables so Vite embeds them at build time.

**Supabase Auth URLs for Cloudflare**

- **Site URL:** the live Pages URL (`https://<project>.pages.dev`) or your custom domain once attached.
- **Redirect URLs:** include that same origin plus local dev (`http://localhost:5173`, etc.). Preview branch URLs (`*.pages.dev`) must be listed if you test auth on previews.

**Not hosted on Cloudflare**

- **`writer-tools`** and other Edge Functions deploy only to **Supabase** (`supabase functions deploy …`). Secrets remain in the Supabase project.

**Approved roadmap (Writers’ Workshop + platform)**

- Cursor plan **Writers’ Workshop UX Roadmap** covers remaining UX (tab bar, arc layout, ribbon format phase A, pages sync, series rename, Google OAuth, RLS hardening). Cloudflare tasks there: `cloudflare-pages-spa`, `cloudflare-env-docs`.

## Portals Wiki (in-app documentation)

**Goal:** Shipholder wiki, organized by portal, calm **magenta / glass / gold-accent** chrome distinct from studio themes; markdown-first with optional screenshots; v1 is **reference**, not a guided tutorial.

**Implementation (shipped):**

- **Portal:** `wiki` in `src/shared/portals.ts`; `WikiPortal.tsx` (hub list, article view, TOC from headings).
- **Content:** `src/content/wiki/manifest.ts` + `wikiImports.ts` + `.md` chapters; `WIKI_APP_DOC_VERSION` / `lastReviewed` in manifest for manual freshness.
- **Markdown:** `react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings` (heading ids must match Writers’ Workshop `writerHelpCategoryWikiHeadingId` strings where used).
- **Theming:** `ThemeContext` id `wiki` → `body.theme-wiki`; `Phase12DesignTokens` wiki tokens; `theme.css` `.wiki-prose`.
- **Navigation:** AppShell **Docs** section; Landing card; `App.tsx` uses `navigatePortal` vs `requestPortalsWiki` for Writers’ help deep-link.
- **Assets:** `public/wiki/screenshots/` — replace placeholders when capturing real UI.
- **Verification:** `npm run build`.

## Supabase — per-user RLS (phase A, 2026-04-06)

**Goal:** Rows in `writer_*`, `characters`, and `assets` are visible and mutable only to the authenticated owner (`auth.uid()`). Anonymous clients (anon key, no user JWT) have no table access. **Storage** tightening for `arcs-generations` is **phase B** (see following section).

**Migration:** [`supabase/migrations/20260406000000_arcs_per_user_rls.sql`](supabase/migrations/20260406000000_arcs_per_user_rls.sql) — adds `owner_id` on `writer_series`, `characters`, `assets`; backfills to earliest `auth.users` row; deletes still-null orphans; `NOT NULL` + `DEFAULT auth.uid()` on inserts; replaces permissive policies with `TO authenticated` policies (writer children scoped via `writer_series.owner_id`).

**Edge Function:** [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) uses **`SUPABASE_ANON_KEY`** and `createClient(..., { global: { headers: { Authorization: \`Bearer ${token}\` }}})` so PostgREST runs as the signed-in user and RLS applies. **Redeploy** after pulling: `supabase functions deploy writer-tools`.

**App:** Vault / archive reads use `getSession()` — Supabase path only when signed in; otherwise local generation archive. (`arcsVault.ts`, `arcsAssetVault.ts`, `arcsArchive.ts`.)

**Verify:** `supabase db push` (or SQL editor) on the project; sign in → workshop + vault work; second account sees empty workshop/vault; `npm run build`.

## Supabase — private `arcs-generations` storage (phase B, 2026-04-07)

**Goal:** Bucket `arcs-generations` is **not** public. Objects live under `{auth.uid()}/…`. Postgres still stores stable **`/object/public/arcs-generations/…`**-shaped URLs; the client resolves them to **`createSignedUrl`** for `<img>` and similar display. Recall / `onSelect` / generation pipelines keep the **canonical** stored URL.

**Migration:** [`supabase/migrations/20260407120000_arcs_generations_private_storage.sql`](supabase/migrations/20260407120000_arcs_generations_private_storage.sql) — `public = false`; storage policies allow authenticated users **SELECT/INSERT/UPDATE/DELETE** only when `split_part(name, '/', 1) = auth.uid()::text`.

**Client:** [`src/shared/lib/arcsGenerationsUrls.ts`](src/shared/lib/arcsGenerationsUrls.ts) (`resolveArcsGenerationsDisplayUrl`, in-memory cache); [`src/shared/hooks/useArcsResolvedSrc.ts`](src/shared/hooks/useArcsResolvedSrc.ts); [`src/components/ui/ArcsStorageImg.tsx`](src/components/ui/ArcsStorageImg.tsx); uploads in [`arcsPersistence.ts`](src/shared/api/arcsPersistence.ts) use `${user.id}/…`. Studios, vault modals, archive galleries, Storyline, and `VaultImageWithFallback` wire display through signing.

**Verify:** `npm run build`; after `supabase db push`, signed-in user sees images; unsigned / wrong user cannot read others’ objects; legacy objects without `userId/` prefix remain inaccessible until migrated.

## Landing page UI intake (copy, grid order, sign-in, motion)

**Before** restructuring Overview / hero / portal cards, fill **[`LANDING_PAGE_UI_INTAKE.md`](LANDING_PAGE_UI_INTAKE.md)** or open **[`docs/LANDING_PAGE_UI_INTAKE.html`](docs/LANDING_PAGE_UI_INTAKE.html)** locally → **Copy for ARCS assistant** → paste into chat so implementation matches your wording and ordering.

**Implemented (2026-04):** [`portalCatalog.ts`](src/shared/portalCatalog.ts), [`LandingPage.tsx`](src/components/LandingPage.tsx), [`AppShell.tsx`](src/components/layout/AppShell.tsx), [`landingHeroRotation.ts`](src/shared/landingHeroRotation.ts), landing CSS/Tailwind animations. **Polish:** mobile home tab label **ARC Hub**; hero subline grammar; **Asset Studio** naming aligned; Writers' landing card photo (`City of Capricorn`).

## Image Vault UI intake (Characters vs Assets)

**Before** a full Image Vault overhaul (`reference` portal: `ReferenceAlbum` → `CharacterVault` / `AssetVault` → modals), fill **[`IMAGE_VAULT_UI_INTAKE.md`](IMAGE_VAULT_UI_INTAKE.md)** or open **[`docs/IMAGE_VAULT_UI_INTAKE.html`](docs/IMAGE_VAULT_UI_INTAKE.html)** locally → **Copy for ARCS assistant** → paste into chat. The form has **two detailed tracks**: **Characters (Ruby)** and **Assets (Amethyst)** plus shared tab/shell fields.

## Mobile web — iPhone & iPad (preparation → implementation)

**Before** changing layouts or `AppShell` for touch:

1. Complete **[`MOBILE_PHASE0_PREPARATION.md`](MOBILE_PHASE0_PREPARATION.md)** — Phase 0 checklist and decision questions (markdown checkboxes + answer blocks).
2. Optionally open **[`docs/MOBILE_PHASE0_INTAKE.html`](docs/MOBILE_PHASE0_INTAKE.html)** in a browser (local file), fill fields, click **Copy for ARCS assistant**, paste into chat.

**After** answers are aligned:

- **Phase 1:** Touch-first **`AppShell`** (no hover-only navigation or account menus).
- **Phase 2:** Global **safe-area / mobile CSS** (`src/styles/theme.css`, viewport meta if needed).
- **Phase 3:** **Portal-by-portal** responsive passes in agreed priority order.
- **Phase 4:** Verification (DevTools device modes + real iPhone/iPad + desktop regression).

Track checklist items in [`tasks.md`](tasks.md) under **Mobile web — iPhone / iPad**.

**Phase 0 locked (2026-04-chat):** Single responsive app; phone ≤767px uses bottom tabs; tablet split view; Comic + Storyline unavailable on phone; Character/Asset on phone omit tagging/reference-gallery UIs and Live Prompt tabs except **Edit** (pinned); production + Supabase redirect URLs include **`https://asset-reference-comics-studio.onyxzion.workers.dev`** and local dev origins; PWA **yes**.

**Implementation status:** `ResponsiveLayoutContext` + `AppShell` phone nav + studio restrictions live; Character + Asset studios finished phone layout/gallery/density parity (2026-04-05). **Phase 2 (2026-04-05):** global mobile CSS in `theme.css` + shell/tab-bar safe-area. **Phase 3 (Writers’ Workshop, 2026-04-05):** `WriterPortal` uses `isPhone` column layout (workspace above dock); `WriterStudioDock` **`phoneLayout`** full-width bottom strip with safe-area; `WriterRibbon` horizontal menu scroll + stacked find row; `WriterContextMenu` touch **long-press** (~520ms) + viewport-clamped menu; phone defaults dock collapsed (expand via ribbon **Panels** or dock bar); `LandingPage` tighter hero on phone. **Next:** Phase 4 device QA (iPad/Safari) + optional Wiki / Photo Lab spot-checks.
