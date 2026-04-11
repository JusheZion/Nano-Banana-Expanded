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
- [x] Phase 6g (Cloudflare prep, 2026-04-01): **`implementation_plan.md`** — **Cloudflare Pages** section + owner pointer to **`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`**; SPA: **`wrangler.jsonc`** **`not_found_handling`** for Workers (see 2026-04-05 note: no **`_redirects`** with Workers); Supabase Auth / JWT docs aligned with **`writer-tools`**
- [x] **2026-04-04:** **`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`** — troubleshooting row for **`npm ci`** “no **package-lock.json**”: set Pages **Root directory** to repo root (empty/`/`) so install runs where **`package-lock.json`** lives; confirm lockfile exists on the built commit
- [x] **2026-04-04:** **Cloudflare CI** — repaired **merge-corrupted `package.json`** on branch (invalid JSON / duplicated content), restored **Wrangler** tooling (`wrangler.jsonc`, `wrangler` + `@cloudflare/vite-plugin`, `vite.config` plugin, `preview`/`deploy` scripts), regenerated **`package-lock.json`**
- [x] **2026-04-05:** **package-lock.json** was again **merge-corrupted** (invalid JSON mid-file); **`npm ci`** failed on Cloudflare and locally. Regenerated lockfile (**`rm package-lock.json && npm install`**); verified **`npm ci`** + **`npm run build`**. Documented in checklist + walkthrough; commit + push **`main`** for CI.
- [x] **2026-04-11:** **Cursor cloud environment** — added [`.cursor/environment.json`](.cursor/environment.json) with **`install`**: **`npm ci`** so cloud agents get **`node_modules`** (Vite, ESLint, Vitest, TypeScript, Wrangler) without running **`npm install`** manually; verified **`npm run lint`**, **`npm run test`**, **`npm run build`** after **`npm ci`**.
- [x] **2026-04-05:** **Wrangler deploy** — removed **`public/_redirects`** (`/* /index.html 200`) to fix Cloudflare API **10021** (infinite loop) when **`not_found_handling`**: **`single-page-application`** is set; docs updated for Workers vs Pages.
- [x] **2026-04-04:** **Wrangler deploy** — [`wrangler.jsonc`](wrangler.jsonc) **`assets.directory`** = **`dist`** (fixes *missing required `directory` property* on **`wrangler versions upload`**); deduped **`package.json`** again if merge reintroduced duplicate root; checklist **D4b** + troubleshooting for **build before Wrangler**
- [x] **2026-04-04:** **Merge-corruption cleanup** — WriterPortal / writerTools / writerHelpRegistry / vite.config / writerTools.test repaired; **`npm run build`** passes
- [x] **2026-04-04:** **Docs + push** — Checklist **Merge conflicts after a PR** + **`EJSONPARSE`** row; walkthrough; pushed to **`origin/main`** (GitHub → Cloudflare if project watches **`main`**)
- [x] **2026-04-02:** `invokeWriterTools` refresh optimization — avoid unconditional `refreshSession()` (only near-expiry) + dedupe concurrent refresh; Edge `page_beats` prompt includes prior-page digest to reduce repeated beats; removed debug instrumentation after verification

## Writers' Workshop QoL — batch beats, sync pages, arc MVP, UX pipeline (2026-04-10)

- [x] Edge + shared Zod: `outline_issue` + `arc_brief` / `arc_issue_count`; `page_beats_issue` with `skip_existing`, `batch_limit`; `writer-tools` sequential batch handler + `has_more`
- [x] Client: `ensureWriterPagesToCount`; `WriterPortal` — sync pages, arc fields, outline-all, batch beats + cancel; shared tab order / hotkeys / ribbon; pipeline strip + `writerNextStep` hints
- [x] Tests: `schemas.test.ts` for extended `outline_issue` and `page_beats_issue`
- [x] Docs: `implementation_plan.md` Phase 7; this checklist; `walkthrough.md` entry
- [x] UX: **Arc length (for AI)** vs batch count — inline hint + **`Outline all in series (N in Library)`** + **`arcIssueCountHint`** / updated tooltips (`WriterPortal`, `writerHelpRegistry`)
- [x] Library → Issues: **`Add issue #N`** always when series selected (was hidden after first issue); outline panel **Open Library → Issues** link + help copy
- [x] Edge **`outline_issue`**: arc spine prompt includes **part k of N** (ordered by issue #) + anti-hallucination rules so batch outline slices the author spine per issue
- [ ] Operator: `supabase functions deploy writer-tools` on hosted project after deploy (required for arc prompt fix)

## Writers' Workshop bugfixes (Apr 2026)

- [x] Fix stale `selectedSeriesId` in ribbon pacing/canon: `refreshIssuesForSeries` is `useCallback` keyed on `selectedSeriesId`; `runPacingFromRibbon` / `runCanonFromRibbon` depend on it
- [x] Library: **+ Add series** when you already have at least one series (was only “Create first series” on empty list)
- [x] Issue Outline → Story context: **Series title** field + save `title` via `updateWriterSeries`; **Save story context** works with only a series selected (issue fields optional); series logline no longer requires an issue to edit
- [x] Phase 6h (writer-tools refresh optimization, 2026-04-03): **`invokeWriterTools`** now refreshes only when the JWT is expired (no unconditional refresh on every invocation), keeps 401 refresh+retry behavior, and resolves Writer lint errors by including `refreshIssuesForSeries` in ribbon callback dependencies.
- [x] Phase 6i (writer-tools verification hardening, 2026-04-04): verified `invokeWriterTools` is not unconditionally refreshing and added regression tests for fresh-token/no-refresh vs expired-token/refresh paths.

## Supabase — per-user RLS phase A (2026-04-06)

- [x] Migration `20260406000000_arcs_per_user_rls.sql`: `owner_id` + strict authenticated RLS on `writer_*`, `characters`, `assets`
- [x] `writer-tools`: user-scoped Supabase client (anon key + `Authorization: Bearer <JWT>`); repair corrupted `page_beats` `Promise.all`
- [x] Vault / archive: session-gated Supabase reads; `characterVaultUsesSupabase` / `assetVaultUsesSupabase` use session not “any row exists”
- [x] Operator: `supabase db push` + `supabase functions deploy writer-tools` on hosted project (2026-04-06)
- [x] Operator smoke-test: two accounts isolated + signed-out vault local fallback (2026-04-06)
- [x] Phase B: private `arcs-generations` bucket + per-user object paths + signed URLs for display (`20260407120000_arcs_generations_private_storage.sql`, `arcsGenerationsUrls.ts`, `ArcsStorageImg`, vault/archive/storyline/studios). **Operator:** `supabase db push` applied on linked hosted project (migration `20260407120000_arcs_generations_private_storage.sql`). Legacy root-level objects still need re-upload or move to `{userId}/…` if any remain.

## Portals Wiki — in-app documentation (2026-04)

- [x] Portal id `wiki`: routing, lazy chunk, prefetch, Landing + AppShell Docs nav (no auth gate for wiki v1)
- [x] Theme: `theme-wiki` on `body`, calm canvas + `.wiki-prose`, wiki design tokens
- [x] Content: `src/content/wiki/` manifest + markdown chapters + `wikiImports.ts`; optional screenshots under `public/wiki/screenshots/`
- [x] Markdown pipeline: react-markdown, remark-gfm, rehype-slug, rehype-autolink-headings (TOC / anchors)
- [x] Writers’ Workshop: help registry wiki heading ids + `onOpenPortalsWiki` / modal footer
- [x] Build verification: `npm run build` passes after wiki work

## Mobile web — iPhone / iPad (2026-04)

### Phase 0 — Preparation (before code)

- [x] Read **[`MOBILE_PHASE0_PREPARATION.md`](MOBILE_PHASE0_PREPARATION.md)** and answer questions (in-file or via **[`docs/MOBILE_PHASE0_INTAKE.html`](docs/MOBILE_PHASE0_INTAKE.html)** → **Copy for ARCS assistant**)
- [x] Submitted answers in chat (2026-04-05): one app / two profiles; **phone** bottom tabs; **tablet** split; Comic + Storyline **hidden on phone**; Character + Asset **phone** — no tag-gallery/reference gallery strips, Live Prompt **Edit only** + forced pin; Home + Writer priority; PWA yes; prod `asset-reference-comics-studio.onyxzion.workers.dev`

### Phase 1+ (after Phase 0 approved — implementation)

- [x] Touch-first **`AppShell`** — phone bottom nav + tap account sheet; md+ sidebar with hover-expand when `prefersHoverSidebar`; block **Comic** / **Storyline** on phone (`App.tsx` + `LandingPage`)
- [x] PWA shell: `manifest.webmanifest`, viewport-fit / web-app meta (`index.html`)
- [x] Global safe-area / mobile CSS pass (**`theme.css`**: `--safe-*` / `--app-vh`, `html`/`body`/`#root` min-height + iOS `-webkit-fill-available`, `color-scheme: dark`, **`background-attachment: scroll`** on ≤767px for main theme; **`.app-safe-x`** / **`.min-h-app-viewport`**; **`AppShell`**: horizontal safe-area + `min-h-0`; phone **tab bar** honors left/right safe-area)
- [x] Studios **phone compact** pass: **`CharacterStudio.tsx`** + **`AssetsStudio.tsx`** (stacked columns, hide module tablist + prompt tabs on phone, hide recent/session galleries + thumbnail density on phone, keep **Compare**)
- [x] **`WriterPortal`** Phase 3 — `isPhone` column workspace + **`WriterStudioDock`** bottom dock / collapse bar; **`WriterRibbon`** scrollable tabs + full-width find row; **`WriterContextMenu`** long-press + clamped position; **`LandingPage`** hero/padding on phone; `writerWikiAnchors.test.ts` — `/// <reference types="node" />` for `tsc -b`
- [x] **`AppShell` (2026-04-05 / 2026-04-07):** Desktop **Portals Wiki** after **Overview**; **`NavItem` `aria-label`**; phone top bar **`fixed`** **`z-[49]`**, **`main` `padding-top`**, **44×44**; header **sibling of `main`**, **last** in shell; **`bg-black/60`** (no blur), **`translateZ(0)`**, **`isolate`**; avatar **`stopPropagation`** on **`pointerdown`**; **More** menu **Sign out** fallback when signed in
- [ ] **Other portals** — optional spot-check (Wiki, Photo Lab) if issues show in Phase 4
- [ ] Verify: real **iPad Air / iPad Pro / Safari** matrix + desktop regression (G1: owner does not rely on desktop emulation alone)

## Landing page UI intake (2026-04)

- [x] Added **[`LANDING_PAGE_UI_INTAKE.md`](LANDING_PAGE_UI_INTAKE.md)** + **[`docs/LANDING_PAGE_UI_INTAKE.html`](docs/LANDING_PAGE_UI_INTAKE.html)** (linked from `implementation_plan.md`)
- [x] Implemented intake: [`portalCatalog.ts`](src/shared/portalCatalog.ts) (order, copy, accents, icons, `HUB_HOME_LABEL`, `getPortalIcon`), [`LandingPage.tsx`](src/components/LandingPage.tsx) (hero, door **Open** + **IN**, account strip, rotating hero backdrop, cards), [`AppShell.tsx`](src/components/layout/AppShell.tsx) (ARC Hub + glitter nav icons; mobile tabs use catalog icons), [`tailwind.config.js`](tailwind.config.js) + [`theme.css`](src/styles/theme.css) (landing animations)
- [x] Polish: hero subline grammar (**to** create); mobile home tab uses **`HUB_HOME_LABEL`** (ARC Hub); **Asset Studio** card title matches nav; Writers' card uses **`City of Capricorn`** backdrop

## Image Vault UI intake (Characters vs Assets)

- [x] Added **[`IMAGE_VAULT_UI_INTAKE.md`](IMAGE_VAULT_UI_INTAKE.md)** + **[`docs/IMAGE_VAULT_UI_INTAKE.html`](docs/IMAGE_VAULT_UI_INTAKE.html)** (linked from `implementation_plan.md`) — **Ruby (profiles)** and **Amethyst (collections)** sections + shared tab shell
- [ ] Optional: fill intake → paste before Image Vault / `ReferenceAlbum` overhaul

## Future / Backlog

- Image Vault (characters/assets) & any remaining archive UIs: read from Supabase when configured (fallback to localStorage).
- Optional: Supabase Storage bucket `arcs-generations` creation and RLS if not already present.
- [ ] Phase 1d: Beat reference strength (none/light/strict) to control how strongly cast/assets constrain generation.
- [x] Phase 1d: Generic Image Lab panel (upload refs + prompt + AI prompt helper + generate + import into storyline beats).
