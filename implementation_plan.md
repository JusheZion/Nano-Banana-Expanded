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

## Verify

- `npm run test -- --run`; `npm run build`; manual: Storyline Studio → Script Doctor → Plan beats → cast from vault → generate beat → Save to Vault (Supabase) → Open in Character Studio from beat.

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

### Phase 5+ (backlog)

- Richer cross-issue arc timeline; panel thumbnails / scrubbing in the strip; PDF export.

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

- Add SPA fallback: [`public/_redirects`](public/_redirects) with:

  ```text
  /*    /index.html   200
  ```

  so client-side routes survive browser refresh (Vite copies `public/` into `dist/`).

- **Build:** `npm run build` → output directory **`dist`**. Pages dashboard: build command `npm run build`, output `dist`, root `/`.
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
