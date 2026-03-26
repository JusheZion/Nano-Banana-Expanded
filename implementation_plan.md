# Current feature: Character Vault Foundation (Ruby & Gold Edition) (2026-03-18)

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

## Character Studio Panel UX (2026-03-25)

### Scope

- Space optimization across panels (reduce unused height caps and tighten vertical spacing).
- Reference images UX: larger hover preview, Upload/Archive icon buttons, clearer group label for background/setting refs.
- Tags & Style: add Facial Expressions section (preset + custom library with remove) and ensure click-off works.
- Live Prompt: add `Reference Prompt` tab; per-tab Copy; `Reset to tags`; `Refresh` on Prompt tab.
- Onyx Vault: keep logic but disable unlock/edit UI until production via feature flag.

### Key Files

- `src/portals/CharacterStudio.tsx`
- `src/stores/characterStudioStore.ts`
- `src/data/character_studio_spec.ts`
- `src/shared/constants/referenceSlots.ts`
- `src/components/ui/ArchiveRecallModal.tsx`
- `src/shared/utils/buildCharacterStudioPromptForApi.ts`

### Feature Flag

- `VITE_ENABLE_ONYX_VAULT`: when not `'true'`, vault unlock UI is hidden/disabled and vault override is ignored for prompt compilation/generation.

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
