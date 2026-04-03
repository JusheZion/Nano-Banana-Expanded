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

- [x] **2026-03-28:** Character + Asset: **60/40** split; hub **Clear all** / **Paste first empty** on focused slot row; Live Prompt **footer** (model compact); **merged** right workspace (preview + scroll + bottom strips)
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
- [x] Onyx Vault: removed from left Tags panel; Live Prompt Edit has no password gate (2026-03-27)
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

## Storyline Studio — Master Director (Mar 25, 2026) — PHASE 1 COMPLETE

- [x] Replace PhotoLab mock with StorylineStudio (row-based workspace, tokens, Zustand persist)
- [x] Gemini text API + director prompts (script doctor, beats, interpolation)
- [x] Beat timeline, B-roll insert menu, per-beat generate/redo, export JSON
- [x] Production cast from Image Vault; name→beat linking; reference slot packing
- [x] Neutral Character Studio prompts + heritage label migration in spec/store
- [x] Unit tests: storyline helpers (`linkCastNamesToBeats`, parse JSON, reference slots)
- [x] Save story sequence to Supabase Asset Vault (`saveStorySequenceToAssetsVault`, `story_sequence_v1` metadata) + Save to Vault modal
- [x] Promote beat: `studioImportBridge` + App portal switch; Character/Asset studio consume import; “Open in Character/Assets Studio” on beat panel
- [x] Tests: `storySequencePayload`, `studioImportBridge`
- [x] Phase 1c UX: manual per-beat cast linking checkboxes, timeline beat hover zoom preview, and generation refs limited to explicitly linked cast
- [x] Per-beat aspect ratio selector (9:16 / 1:1 / 21:9) wired through beat schema/store and generation API
- [x] Asset links for beats: production assets pool from Asset Vault + per-beat asset link checkboxes; generation uses linked cast + linked assets refs
- [x] Storyline generation quality pass: switch beat generation model from flash to pro

## Phase 2 — Studio preview / compare (2026-03-27) — COMPLETE (initial pass)

- [x] Character Studio: xl+ split in Reference Image Generation — sidebar (thumbs, Compare, strips) + large aspect-aware preview; compare uses selected aspect
- [x] Asset Studio: same pattern + Compare (first ref slot vs generated)
- [x] Generic Image Lab: lg+ split — controls column + large preview column ([`studioPreviewLayout.ts`](src/shared/utils/studioPreviewLayout.ts))
- [x] Verify: `npm run test -- --run`, `npm run build`; manual spot-check 9:16 / 1:1 / 21:9 in studios + Image Lab

## Phase 2b — Studio 40/60 viewport-locked shell (2026-03-28) — COMPLETE

- [x] `App.tsx` + `AppShell.tsx`: `h-full` / `min-h-0` / `overflow-hidden` chain for `studio` + `assets`; main content `overflow-y-hidden` on those portals
- [x] `studioPreviewLayout.ts`: `stage` / `stageCompare` modes for split-pane preview caps
- [x] Character Studio: 40% left (hub + DNA + Style modules, dock, Live Prompt + PIN), 60% right (`flex-[3]` stage + `flex-[2]` gallery workspace, flex-wrap recents)
- [x] Asset Studio: 40% left (hub + structural + material, dock, Live Prompt + PIN), 60% right (`flex-[3]` stage + `flex-[2]` spatial + session chips + flex-wrap recents); root `h-full min-h-0 overflow-hidden`
- [x] Docs: `implementation_plan.md` Phase 2b; this checklist; `walkthrough.md` entry
- [x] Verify: `npm run test -- --run`, `npm run build`; manual 1920×1080 — no page scroll, internal scroll only

## Writers' Workshop (2026-03-29)

- [x] Phase 0: `writer_*` migration, design tokens, `WriterPortal` shell, nav + routing + landing card
- [x] Phase 1: `writer-tools` Edge Function (`outline_issue`), shared Zod schemas + tests, `listWriterOutlinesForIssue`, Outline tab UI + AI history rail
- [x] Phase 2: `page_beats` / `draft_dialogue` + UI (`arcsWriterRoom` page fields, `WriterPortal` Beats/Dialogue tabs, schema tests)
- [x] Phase 3: `pacing_review` / `canon_check` + UI (notes.writer_tool_cache)
- [x] Phase 4: `plan_shots_from_issue`, Video tab, JSON exports + Konva stub
- [x] Phase 5 (slice): Arc Planner **issue spine** chips; shot plan **CSV** export; **Konva** storyboard strip (`WriterShotStoryboardStrip`, `shotPlanCsv` + test)
- [x] Phase 6 (UX, 2026-03-30): **Ribbon** (`WriterRibbon`) + **right dock** Library / Activity / Shortcuts (`WriterStudioDock`); **Find in view** + match nav (`writerSearch`, `WriterHighlightedText`); **hotkeys** (`useWriterHotkeys`); **context menu** (`WriterContextMenu`); monospace + text size; **Arc** tab uses one combined **Review output** block so Find indices match highlights (`formatArcReviewPlainText`)
- [x] Phase 6b (UI parity, 2026-03-31): Writer workspace uses **glassmorphism panels** (separate cards, not one cream block) over the **Tiffany gradient**; main workspace is **scrollable** so “Latest saved outline” is always reachable (even with DevTools open)
- [x] Phase 6c (help UX, 2026-03-31): **`writerHelpRegistry`** — `WRITER_UI_TIPS`, help **categories** (modal sections), **`WriterSectionTip`**; **`WriterPortal`** wired to **`onOpenHelpCategory`**; library/dock/workspace guidance moved to tooltips where noted; **`WriterRibbon`** Help tiles type-safe icons
- [x] Phase 6d (auth UX, 2026-03-31): Dismissible **sign-in for AI** banner when Supabase env is set but **no session**; **`writerTools`** maps **401/403** to a clear JWT / sign-in message; **`implementation_plan.md`** Writers section aligned (Library dock / Activity, Phase 6c–6d)
- [x] Phase 6e (auth, 2026-03-31): **`AuthProvider`** + **`AuthModal`** (email/password); **`AppShell`** account sign-in / sign-out; **`WriterPortal`** uses **`useAuth`** + banner **Sign in here**; **`implementation_plan.md`** deploy checklist + Dashboard Auth URLs
- [x] Phase 6f (writer-tools JWT, 2026-03-31): **`invokeWriterTools`** — **`getSession()`** + optional **`refreshSession`** when expiring; explicit **`Authorization: Bearer <user access_token>`** on **`functions.invoke`** (avoids anon-key **`Bearer`** fallback); gateway **`verify_jwt`** workaround: **`config.toml`** **`verify_jwt = false`** + in-function **`getUser(token)`** validation
- [x] Phase 6g (Cloudflare prep, 2026-04-01): **`implementation_plan.md`** — **Cloudflare Pages** section + owner pointer to **`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`**; **`public/_redirects`** (`/*` → `/index.html` **`200`**); Supabase Auth / JWT docs in plan aligned with current **`writer-tools`** config
- [x] Phase 6h (writer-tools refresh optimization, 2026-04-03): **`invokeWriterTools`** now refreshes only when the JWT is expired (no unconditional refresh on every invocation), keeps 401 refresh+retry behavior, and resolves Writer lint errors by including `refreshIssuesForSeries` in ribbon callback dependencies.

## Future / Backlog

- Image Vault (characters/assets) & any remaining archive UIs: read from Supabase when configured (fallback to localStorage).
- Optional: Supabase Storage bucket `arcs-generations` creation and RLS if not already present.
- [ ] Phase 1d: Beat reference strength (none/light/strict) to control how strongly cast/assets constrain generation.
- [x] Phase 1d: Generic Image Lab panel (upload refs + prompt + AI prompt helper + generate + import into storyline beats).
