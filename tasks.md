# ARCS Tasks

Checklist for current and upcoming phases. Update as work completes.

## ARCS Universal API Bridge & Data Persistence (Mar 2026) — COMPLETE

- [x] Semantic ID util + DB schema + Supabase client
- [x] Stores: referenceImageUrls, selectedOnyxModelId, generationStatus
- [x] Gemini API module: request/response, 429 backoff, safety
- [x] Onyx model selector in both studios (vault-unlocked)
- [x] Status breadcrumb + Gemstone Pulse (CSS vars, button, cycle)
- [x] Wire Generate to API (prompt, 9:16, reference_images)
- [x] Import Image multi-slot (up to 14) → reference_images
- [x] Save flow to DB (semantic ID, metadata_tags, seed)
- [x] Session cache (last 10) + Recent UI
- [x] Asset Expansion seed+1; portal switch state
- [x] Update walkthrough.md
- [x] Archive recall modal: browse albums (profile/collection), inject chosen image into reference slot (Character + Asset Studio)

## Studio UX refinement & polish (Mar 15, 2026) — IN PROGRESS / MOSTLY DONE

- [x] Prompt: subject-only prefix + `isVaultOverride` + context (character/asset) in `geminiImageApi.ts`
- [x] Stores: `refinementPromptOverride`, `previousLiveImageUrl`/`Seed`, `lastUsedPrompt`, `promptSnippets`, `galleryDensity`, `clearAllReferenceSlots`
- [x] Character + Asset: split Reference vs Tags panels; remove top bulk upload; Clear all / Paste first empty
- [x] 3-tab Live Prompt (Auto / Edit / Refine), pin-help `?`, refinement flow + suggest chips, NEW disabled
- [x] Shortcuts ⌘/Ctrl+Enter (Generate), Escape; Last prompt chip; snippets; Generate again; Undo last gen
- [x] Gallery density toggle; hover zoom refs + live image; loading “Working…”; empty states
- [ ] Image-describe API for Refine tab “NEW” (follow-up per plan §8)

## Character Archive thumbnail framing (Mar 16, 2026) — COMPLETE

- [x] DB columns + migration; localStorage `thumbnailFocus` on character generations
- [x] Gallery cards use focal + scale; **Framing** modal + save
- [x] Fallback Supabase select if thumbnail columns missing

## Character Vault Foundation (Ruby & Gold Edition) (Mar 18, 2026) — PLANNED

- [x] Add Supabase migration: `characters.is_profile_cover boolean default false` + partial index by `profile_name`
- [x] Add Vault repository helper (`src/shared/api/arcsVault.ts`) for albums + cover selection (Supabase + local fallback)
- [x] Build Ruby/Gold `CharacterVault` album grid (one card per `profile_name`)
- [x] Build `ProfileVaultModal` drill-down with per-image Ruby-encrusted star toggle
- [x] Wire cover swap update (set all false, set clicked true) + inline “Saving…” UX
- [x] Vault framing: cover cards + modal cards use `metadata_tags.archive_thumbnail` (characters + assets); **Framing** action in both modals
- [x] Browser test: cover selection persists + framing saves + no console errors
- [x] Update `walkthrough.md` with changes, files touched, and verification steps

## Studio seed + trash cleanup (Mar 18, 2026) — COMPLETE

- [x] **Seed mode** (default **Randomized**): `seedMode` on Character + Asset stores; UI toggle; `pickGenerationSeed` for Generate / Alternate / Refine / Expand Setting
- [x] **Zoom + live trash**: deleting live image removes matching **Recent** + **This session** cache entries; revokes `blob:` URLs

## Supabase: persist imported images (blob → Storage) (Mar 18, 2026) — COMPLETE

- [x] `ensurePersistentImageUrl` in `arcsPersistence.ts` (upload `blob:` + `data:` before insert)
- [x] `VaultImageWithFallback` for vault/modal thumbnails when URL fails
- [x] **2026-03-19:** Refuse DB insert if URL is still `blob:` after upload; save local archive only after successful Supabase save (persistent URL); migration `20260319000000_arcs_generations_storage_bucket.sql`

## Navigation: Image Vault + remove Comics & Story Archive (Mar 18, 2026) — COMPLETE

- [x] Remove `related` portal, `RelatedAlbum.tsx`, `temp_related_album.html`; update `portals.ts`, `App.tsx`, `AppShell`, `portals-prefetch`, `LandingPage` grid
- [x] Rename sidebar + landing card **Character Archive** → **Image Vault**; `ReferenceAlbum` tabs **Characters** / **Assets**

## Vault toolbars (Mar 18, 2026) — COMPLETE

- [x] Character Vault: search + refresh; modal toolbar — rename profile, delete album, move image (merge + last-item warns), cast name, delete image, cover star; `arcsVault` mutations + local `generationOutputRouter` helpers
- [x] Asset Vault (`AssetVault` + `CollectionVaultModal`): collection grid, search/refresh, rename/move/delete + asset name edit; `arcsAssetVault.ts`
- [x] Studios: Character save-as-existing combobox (`profile_name`)
- [x] Studios: Asset save-as-existing combobox (`collection_name`)

## Asset Reference Studio alignment (Mar 2026) — COMPLETE

- [x] Asset reference slot taxonomy + `getSlotLabel`/`getSlotRole` context; Gemini asset role labels and `subjectOnly`
- [x] `getSurgicalInstructionsFromReferenceSlots(..., 'asset')`; remove tag lockout except Architectural Lock; remove `diversifyStyle`
- [x] `SectionAddToLibrary` on Era, Location, Architectural; `assetGenerationPromptWrappers` + default scene constraints unless vault override
- [x] `asset_tag_library.json` + `asset_studio_spec.ts` taxonomy; tests + build; walkthrough / implementation_plan notes

## Debug instrumentation cleanup (Mar 21, 2026) — COMPLETE

- [x] Removed ingest `fetch` / `#region agent log` from `CharacterStudio.tsx` (save handler), `arcsPersistence.ts`, `generationOutputRouter.ts`; repo grep clean; `npm run test -- --run` passes

## Character Studio Panel UX (Mar 25, 2026) — COMPLETE

- [x] Add facial expressions tags + permanent art-style tag constants (`character_studio_spec.ts`)
- [x] Store: persist facial expression selection + library (`characterStudioStore.ts`)
- [x] Single-source Generate prompt: `buildCharacterStudioPromptForApi` helper + unit tests
- [x] Live Prompt: new `Reference Prompt` tab; per-tab copy; Reset to tags; Refresh on Prompt tab
- [x] Onyx Vault: removed from left Tags panel; gated Edit-tab unlock behind `VITE_ENABLE_ONYX_VAULT`
- [x] Tags & Style: Facial Expressions section (preset + custom add/remove + click-off)
- [x] Cinematic Suite: remove left-side angle controls (right panel is canonical)
- [x] Reference images: Upload/Archive icon buttons + larger hover preview; rename “Atmospheric DNA” → “Background/Setting”
- [x] Archive recall modal: stronger selected-frame highlight (`selectedUrl`)
- [x] Reference Image Generation: inline Compare split toggle (Reference vs Generated) + stronger hover zoom
- [x] Space optimization: remove hard max-height cap on reference slots card; tighten spacing
- [x] Verify: `npm run test`, `npm run lint` (warnings only), `npm run build`, browser smoke test

## Character Studio reference toolbar + gallery (Mar 25, 2026) — COMPLETE

- [x] Reference images: focused slot + shared Upload / Archive / Clear toolbar; DNA accordion (one group expanded; sync with focused slot)
- [x] Reference Gallery: session summary chips; larger pose grid + empty state; pose actions (duplicate, first empty ref slot, open tab)
- [x] Verify: `npm run test -- --run`, `npm run build`

## Future / Backlog

- Image Vault (characters/assets) & any remaining archive UIs: read from Supabase when configured (fallback to localStorage).
- Optional: Supabase Storage bucket `arcs-generations` creation and RLS if not already present.
