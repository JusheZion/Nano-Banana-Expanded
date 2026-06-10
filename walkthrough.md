# ARCS: Walkthrough & Roadmap

## Guided Comic Flow - page navigation and intent-aware layout previews - 2026-05-05

### What changed
- Added a sticky page navigator for the **Pages** and **Layout** steps.
- The navigator can be hidden or shown and jumps directly to the selected page card/layout preview.
- Pages now render only the panel beat editors that exist according to the page `panelCount`.
- Layout previews now render only existing panels instead of fixed template slot counts.
- Panel beat editors were expanded from single-line inputs to resizeable textareas.
- Layout previews now use an intent-aware planning helper so beats such as establishing shots, wide action, tall motion, or reveal moments can occupy larger preview space.
- Advanced Studio page handoff now uses the same existing-panel plan as the Layout preview.

### Files touched
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicLayoutPlan.ts`
- `src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts`
- `walkthrough.md`

### Implementation notes
- New helper module `guidedComicLayoutPlan.ts` centralizes:
  - active panel count parsing and clamping,
  - existing panel beat slicing/filling,
  - layout panel planning,
  - layout grid style selection,
  - simple beat-intent inference for `feature`, `wide`, `tall`, and `normal` panels.
- `getGuidedComicExistingPanelBeats(page)` returns exactly the panel slots implied by `page.panelCount`, filling missing text with blank strings without rendering old extra beats.
- `getGuidedComicLayoutPanels(page, templateId)` is now used by:
  - Layout preview rendering,
  - Layout -> Advanced Studio handoff,
  - panel art queue generation,
  - local page/art summaries.
- Existing manual template choices still exist, but previews are less uniformly forced because individual panels can span rows/columns based on beat wording.
- Page navigator state is local UI state only and is not persisted into the guided draft.
- No routing, ComicEditor, AI-generation, Supabase schema, or portal architecture changes were made.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/guidedComicVaultBridge.test.ts`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Manual browser QA is still recommended for:
  - hiding/showing the navigator,
  - jumping between pages in Pages and Layout,
  - changing panel count down/up and confirming old extra beats do not render,
  - confirming Layout preview sizes feel appropriate for representative beat wording.

### Risks or caveats
- Beat-intent sizing is heuristic and local; wording like “wide”, “establishing”, “reveal”, “vertical”, or “fall” affects preview span, but it is not a full layout engine.
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains, especially around the Comic portal bundle.

### Operator follow-up
- Browser-test the Pages and Layout steps on a draft with several pages and mixed panel counts.

### Next steps
- Consider exposing manual per-panel size controls if the heuristic layout preview is helpful but needs operator override.

## Guided Comic Flow - complete reference handoff with NPC support - 2026-05-04

### What changed
- Completed the Guided Comic Flow reference handoff path for character, location/asset, and NPC references.
- Visual Prep now supports adding NPC references from NPC Vault with a user-entered NPC label.
- NPC reference rows render the same ordered thumbnail strip and per-reference remove action as character/location rows.
- Guided Comic Flow now persists `npcReferences` alongside existing `characterReferences` and `locationReferences`.
- Guided Comic Flow Imageshop handoffs now include all selected character, location/asset, and NPC references.
- Imageshop now consumes guided handoffs through a shared preload helper that preserves the full reference list while loading the first 14 image URLs into the existing Imageshop reference slots.
- Guided reference labels now prefer cast name / image label as the primary label, with profile/collection name as the secondary group label when available.

### Files touched
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/stores/imageWorkshopBridge.ts`
- `src/stores/guidedComicVaultBridge.ts`
- `src/components/ui/NpcVault.tsx`
- `src/portals/ReferenceAlbum.tsx`
- `src/stores/__tests__/imageWorkshopBridge.test.ts`
- `src/stores/__tests__/guidedComicVaultBridge.test.ts`
- `walkthrough.md`

### Implementation notes
- Reference state now has three ordered maps:
  - `characterReferences: Record<string, ReferenceImage[]>`
  - `locationReferences: Record<string, ReferenceImage[]>`
  - `npcReferences: Record<string, ReferenceImage[]>`
- `ReferenceImage` remains the shared local shape for guided references:
  - `referenceId`
  - `imageUrl`
  - `displayName`
  - `profileName`
  - `collectionName`
  - `sourceLabel`
  - `imageLabel`
  - `castName`
- The guided vault bridge now supports target/source type `npc`.
- `NpcVault` can return a selected local NPC Vault image to Guided Comic Flow when the pending guided target is `npc`.
- `ReferenceAlbum` opens the NPC Vault tab automatically for NPC guided picks.
- `GuidedImageWorkshopHandoff` now includes `npcs: GuidedImageWorkshopReference[]` in addition to `characters` and `locations`.
- `getGuidedImageWorkshopPreload` returns:
  - `allReferences`: every reference in the handoff,
  - `slotUrls`: the first 14 reference image URLs for the existing Imageshop slots,
  - `context`: `character` when character refs exist, otherwise `asset`.
- Art-step handoffs now use the full guided reference maps, not only the currently selected panel terms.
- No routing, ComicEditor, AI-generation, or Supabase schema changes were made.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Manual browser QA is still recommended for:
  - adding an NPC reference from Visual Prep,
  - returning from NPC Vault to Guided Comic Flow,
  - opening Imageshop from Visual Prep and Art,
  - confirming the first 14 refs preload into Imageshop slots when more than 14 refs exist.

### Risks or caveats
- Imageshop still has 14 visible reference slots. Handoffs carry all references, but only the first 14 image URLs are preloaded into the current slot UI.
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains, especially around the Comic portal bundle.

### Operator follow-up
- Browser-test the NPC reference pick and Imageshop preload flow with a draft that has multiple character, location/asset, and NPC references.

### Next steps
- Consider a future Imageshop UI affordance for viewing overflow guided references beyond the first 14 slots.

## Imageshop - session-safe generated results and Save / Export panel - 2026-05-04

### What changed
- Generated Image Lab results are now stored in an Imageshop session cache.
- Returning to Imageshop restores the active session result automatically when no local preview is loaded.
- The generated result preview now includes a compact **Session results** strip for recovering recent generated images from the current browser session.
- The generated-result save UI is now labeled **Save / Export** and includes:
  - Save to NPC Vault
  - Save to Character Vault
  - Save to Asset Vault
  - Download
- Imported/processed images no longer require Process again before saving when a processed image already exists.

### Files touched
- `src/stores/imageshopSessionStore.ts`
- `src/stores/__tests__/imageshopSessionStore.test.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/ImageshopImportPanel.tsx`
- `walkthrough.md`

### Implementation notes
- `useImageshopSessionStore` persists up to eight generated Image Lab results in `sessionStorage` under `arcs-imageshop-session-v1`.
- Each session result stores:
  - `imageUrl`
  - `seed`
  - `prompt`
  - `aspectRatio`
  - `context`
  - `modelId`
  - `generatedAt`
  - optional `sourceLabel`
- New generations are added to the session cache and made active immediately.
- Selecting a session thumbnail restores the preview, seed, prompt, context, and aspect ratio.
- Removing the active session thumbnail clears the current preview and allows the next cached result to restore.
- Generated Character/Asset saves continue to reuse the existing vault persistence helpers, and NPC saves continue to use the local supporting-reference archive.
- Import saves keep using the frozen processing snapshot metadata from the generated preview; changing options only means Process again is needed to update pixels, not to save the existing image.
- No routing, ComicEditor, AI auto-generation, or Supabase schema changes were made.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/stores/__tests__/imageshopSessionStore.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Manual browser QA is recommended for generating two results, navigating away, returning to Imageshop, selecting a session thumbnail, saving to each vault target, and downloading.

### Risks or caveats
- Session cache uses browser `sessionStorage`; very large generated data URLs can still hit browser quota, but failures are isolated to recovery cache persistence and do not block the live generated preview.
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains, especially around the Comic portal bundle.

## Guided Comic Flow - prevent duplicate vault reference append - 2026-05-04

### What changed
- Fixed a Visual Prep issue where one vault image pick could append twice to a character/location reference strip.

### Files touched
- `src/stores/guidedComicVaultBridge.ts`
- `src/stores/__tests__/guidedComicVaultBridge.test.ts`

### Implementation notes
- Root cause: `consumeSelection` cleared the guided vault bridge selection on a queued microtask.
- In React dev rendering, the consuming effect can run again before that microtask clears the selection.
- Multi-reference append made this visible as duplicate thumbnails.
- `consumeSelection` now clears `selection` synchronously before returning the consumed value.
- Added a regression test that consumes the same selection twice and verifies the second consume returns `null`.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Existing duplicate thumbnails in the local guided draft may need manual removal once; new picks should append only once.

### Risks or caveats
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains, especially around the Comic portal bundle.

## Guided Comic Flow - Layout preview resolves vault image URLs - 2026-05-04

### What changed
- Fixed Layout step panel previews that showed panels as **Ready** while the image itself failed to display.
- Layout panel art now uses the same vault-aware image rendering path as the vault and Visual Prep thumbnails.

### Files touched
- `src/portals/guided-comic/GuidedComicFlow.tsx`

### Implementation notes
- Root cause: Layout preview used a raw `<img src={panelImage.imageUrl}>`.
- Vault images can be stored as ARCS/Supabase generation URLs that need display-time resolution before an `<img>` can load them.
- Replaced the raw image with `VaultImageWithFallback`, which resolves private `arcs-generations` URLs and shows a clear unavailable state if loading fails.
- No routing, ComicEditor, AI, or Supabase schema changes were made.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Manual browser QA is recommended on the current draft: revisit Layout and confirm Ready panels now show the same images that appear in the vault.

### Risks or caveats
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains, especially around the Comic portal bundle.

## Guided Comic Flow - multiple vault references per character/location - 2026-05-03

### What changed
- Guided Comic Flow Visual Prep now supports multiple selected vault references per character or location row.
- Each new vault pick appends to the row instead of replacing the previous image.
- Selected references render as a compact horizontal thumbnail strip with tight spacing.
- Each thumbnail includes:
  - image preview
  - truncated display label
  - optional profile/collection group label
  - per-reference remove action
- Visual Prep and Art Imageshop handoffs now pass all selected references in their saved order.

### Files touched
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes
- `characterReferences` and `locationReferences` now use ordered arrays:
  - `Record<string, ReferenceImage[]>`
- `ReferenceImage` includes:
  - `referenceId`
  - `imageUrl`
  - `displayName`
  - `profileName`
  - `collectionName`
  - `sourceLabel`
  - `imageLabel`
  - `castName`
- Older local guided drafts with a single reference object are normalized into one-item arrays on read.
- Removing a thumbnail removes only that array item; no reordering UI was added.
- No AI call, routing change, ComicEditor change, or Supabase schema change was added.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Manual browser QA is still recommended for adding/removing multiple references from Character Vault and Asset Vault rows, then opening Imageshop to confirm every image loads.

### Risks or caveats
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains, especially around the Comic portal bundle.

## Guided Comic Flow - clearer vault reference labels - 2026-05-03

### What changed
- Guided Comic Flow vault selection now keeps the vault grouping name separate from the selectable image label.
- In guided-pick mode, Character Vault modal cards show:
  - primary: cast name, then image name fallback
  - secondary: profile name
- In guided-pick mode, Asset Vault modal cards show:
  - primary: asset/image label
  - secondary: collection name
- Visual Prep selected references now prefer the selected image display name/cast name instead of only the page-card character or location term.

### Files touched
- `src/stores/guidedComicVaultBridge.ts`
- `src/stores/__tests__/guidedComicVaultBridge.test.ts`
- `src/components/ui/CharacterVault.tsx`
- `src/components/ui/AssetVault.tsx`
- `src/components/ui/ProfileVaultModal.tsx`
- `src/components/ui/CollectionVaultModal.tsx`
- `src/portals/guided-comic/GuidedComicFlow.tsx`

### Implementation notes
- Guided vault selections now carry:
  - `displayName`
  - `profileName`
  - `collectionName`
  - `imageLabel`
  - `castName`
  - existing `imageUrl`, `referenceId`, `sourceType`, and `sourceLabel`
- `profileName` / `collectionName` remain the grouping source.
- `displayName` is the primary user-facing selected-reference label.
- Existing storage/routing/database schemas were not changed.
- Multi-reference support was not added.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Manual browser QA is still recommended for picking one Character Vault image and one Asset Vault image from Guided Comic Flow Visual Prep.

### Risks or caveats
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains, especially around the Comic portal bundle.

## Illustrator's Imageshop - save generated Image Lab results to vault - 2026-05-03

### What changed
- Generated Image Lab results now show a **Save generated image to vault** panel directly below the generated preview actions.
- Users can save the current generated result to:
  - **NPC Vault**
  - **Character Vault**
  - **Asset Vault**
- The save panel stays inside Imageshop; it does not navigate to Character Studio, Asset Studio, or another portal.
- When a generated result came from Guided Comic Flow, **Send back to Guided Comic Flow** remains available next to the existing beat actions.

### Files touched
- `src/portals/storyline/GenericImageLabPanel.tsx`

### Implementation notes
- Character saves reuse `saveImportedImageToCharacterVault`.
- Asset saves reuse `saveImportedImageToAssetVault`.
- NPC saves reuse the existing local `saveGeneration('supporting_reference', ...)` path.
- Character and Asset targets reuse `SearchableVaultSelect` so users can type a new profile/collection or choose an existing one.
- Successful Character/Asset saves update the local recent-generation archive through `saveGeneration` plus `addRecentFromCharacter` / `addRecentFromAsset`.
- The vault persistence metadata includes:
  - `source: "imageshop_generated"`
  - generation prompt
  - aspect ratio
  - Imageshop context
  - model id
  - Guided Comic panel identifiers when the result came from the Guided Comic Flow Art step
- No automatic generation, routing change, or ComicEditor behavior change was added.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/shared/api/__tests__/arcsPersistence.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Manual browser QA is still recommended for saving one generated result into each vault target.

### Risks or caveats
- Character and Asset remote saves still depend on the existing Supabase authentication and storage paths used by imported Imageshop results.
- If Supabase is unavailable, Character and Asset generated-result saves fall back to the existing local recent-generation archive.
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains, especially around the Comic portal bundle.

### Next steps
- Browser QA the Save generated image panel with a freshly generated result.
- Confirm Guided Comic Flow handoff users can both save to vault and send the same result back to the selected panel.

## Guided Comic Flow - panel art assignment without Imageshop requirement - 2026-05-03

### What changed
- The Guided Comic Flow **Art** step now lets users assign finished art directly to a selected panel without requiring a new Imageshop generation.
- Added four panel image source actions in the selected-panel area:
  - **Generate in Imageshop**
  - **Use from Image Vault**
  - **Upload image**
  - **Paste image**
- Existing Imageshop handoff and return behavior remains intact. Imageshop is now one source option rather than the only path.
- Assigned panel art is shown immediately in the Art step and continues to drive the Layout step previews and Advanced Studio page handoff.

### Files touched
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/stores/guidedComicVaultBridge.ts`
- `src/stores/guidedComicLayoutBridge.ts`
- `src/components/ui/CharacterVault.tsx`
- `src/portals/ReferenceAlbum.tsx`
- `src/stores/__tests__/guidedComicVaultBridge.test.ts`
- `src/stores/__tests__/guidedComicLayoutBridge.test.ts`

### Implementation notes
- `PanelArtImageState.source` now supports:
  - `imageshop`
  - `vault`
  - `upload`
  - `paste`
- A shared `assignPanelArtImage` helper attaches the image to `panelArtImages[panelId]`, sets `returnedAt`, selects the panel, and marks `panelArtStatuses[panelId] = 'ready'`.
- The existing guided draft persistence stores these assigned images through the current `panelArtImages` draft field.
- The guided vault bridge now supports a `panel-art` target type so Image Vault can return an image directly into a panel slot.
- `ReferenceAlbum` routes `panel-art` picks to the asset side by default, while Character Vault and Asset Vault can both provide images for the panel-art target.
- Upload and paste use local data URLs in the guided draft. No Supabase write was added.
- Paste is user initiated through a focused paste target and `onPaste`; the app does not programmatically read clipboard contents.
- `GuidedComicLayoutPanelImage.source` now accepts non-Imageshop sources so page handoff to Advanced Studio can carry uploaded, pasted, or vault-selected panel images.
- ComicEditor behavior and routing architecture were not changed.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts`
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Manual browser QA is still recommended for:
  - assigning from Image Vault into a panel,
  - uploading a local image,
  - pasting an image,
  - confirming Layout step previews update from each source.

### Risks or caveats
- Uploaded and pasted images are persisted as data URLs in the existing guided draft; very large files could increase localStorage pressure.
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains, especially around the Comic portal bundle.

### Operator follow-up
- None required for Supabase or routing.

### Next steps
- Browser QA the new panel image source actions end to end.
- Consider adding size guidance or compression for uploaded/pasted panel images if localStorage pressure becomes visible.

## Character and Asset Studio - recent thumbnail tooltip crash fix - 2026-05-03

### What changed
- Investigated a blank-screen crash after saving from Character Reference Studio to Character Vault.
- User-provided console showed React minified error `#185`, with the stack pointing into the shared `Tooltip` bundle.
- The post-save path creates a new **Recent (saved)** thumbnail. Those thumbnails were wrapped in Radix-backed `Tooltip` components.
- Replaced Radix `Tooltip` wrappers around recent saved/session thumbnails with native `title` attributes in Character Studio and Assets Studio.

### Files touched
- `src/portals/CharacterStudio.tsx`
- `src/portals/AssetsStudio.tsx`

### Implementation notes
- The UI still exposes hover labels through native browser tooltips.
- This keeps the recent thumbnail affordance while removing the Radix tooltip state machine from the post-save render path.
- The same pattern was applied in Assets Studio proactively because it had the same recent-thumbnail-with-tooltip structure.

### Verification
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -b`
- Focused tests for related bridge/persistence paths passed before the follow-up patch.
- `git diff --check`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `/Users/apoaaron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

### Outstanding issues
- Manual retry of Character Vault save in the browser is still the best confirmation that the blank-screen crash is gone.

### Risks or caveats
- The exact minified stack could not be source-mapped inside this session, but the stack pointed to the Tooltip chunk and the affected UI path was removed.
- Existing ESLint baseline remains at 67 warnings, 0 errors.
- Existing Vite large chunk warning remains.

### Operator follow-up
- Reproduce the original Character Vault save flow once after reload. The image should save and the app should remain on the studio UI instead of clearing to the landing background.

### Next steps
- If a React `#185` console error still appears, capture the updated stack after this tooltip removal.

**Illustrator’s Imageshop — import, process, save to vault (2026-04-21):** Added **Import external image** block in [`GenericImageLabPanel.tsx`](src/portals/storyline/GenericImageLabPanel.tsx) via [`ImageshopImportPanel.tsx`](src/portals/storyline/ImageshopImportPanel.tsx). Users pick a file (max 20 MB), set optional retouch, art style (from [`ART_STYLE_LIBRARY`](src/data/character_studio_spec.ts) or none), extra style notes, author notes, and aspect ratio (`9:16` / `1:1` / `21:9`). **Process** calls [`generateImage`](src/shared/api/geminiImageApi.ts) with the file as the first reference image and prompt from [`buildImageshopImportPrompt`](src/portals/storyline/imageshopImportPrompt.ts). **Save to vault** targets **NPC Vault** (local [`saveGeneration`](src/shared/utils/generationOutputRouter.ts) `supporting_reference`), **Character Vault**, or **Asset Vault** — Character/Asset use [`saveImportedImageToCharacterVault`](src/shared/api/arcsPersistence.ts) / [`saveImportedImageToAssetVault`](src/shared/api/arcsPersistence.ts) when Supabase is configured (with [`SearchableVaultSelect`](src/shared/components/SearchableVaultSelect.tsx) for profile/collection), plus local archive + [`addRecentFromCharacter`](src/shared/utils/recentGenerations.ts) / [`addRecentFromAsset`](src/shared/utils/recentGenerations.ts) on success; otherwise local-only `saveGeneration`. Copy explains generative retouch is not dedicated upscaling. **Verify:** `npm run test -- --run`, `npm run build` (**102** tests).

**Writers’ Workshop — Cockpit tab + Idea assist (2026-04-21):** Added **`cockpit`** workspace surface in [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — 3 read-only columns with per-column view selectors (outline/beats/dialogue/arc/lore/video/scripts-style synopsis helper), **hideable Idea assist** strip (include left/middle/right digests + focus control for optional `page_id`), Find integration via `cockpitFindText` in [`writerSearch.ts`](src/portals/writer/writerSearch.ts), and **non-destructive output actions** (copy / append to outline supplement draft + beats/dialogue drafts). Client invokes `writer-tools` **`idea_assist`** via [`invokeWriterTools`](src/shared/api/writerTools.ts) with capped digests; response JSON is validated with [`ideaAssistResultSchema`](src/shared/writer/schemas.ts). Pipeline strip now marks **Cockpit** “done” only when the full pipeline artifacts exist (outline + beats coverage + dialogue coverage + lore + shot plan + pacing/canon cache). **Operator:** if deploying Edge changes, run **`supabase functions deploy writer-tools`**. **Verify:** `npm run test -- --run`, `npm run build` (2026-04-21 — **98** tests passed); optional manual browser smoke Cockpit + Idea assist + Find + append/copy.

**WriterPortal — Pacing review: always recommend ideal length (2026-04-21):** Updated `length_alignment` from “optional deltas” into a **required** editorial length recommendation. [`src/shared/writer/schemas.ts`](src/shared/writer/schemas.ts) and [`supabase/functions/_shared/writerSchemas.ts`](supabase/functions/_shared/writerSchemas.ts) now require `length_alignment` on `pacingReviewResultSchema` and expand it with `recommended_pages` (exact or `min/max`), optional `recommended_action` when a target is provided, plus optional `cut_suggestions` / `add_suggestions` and `assumptions`, alongside existing measured counts and suggested deltas. [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) — pacing prompt and contract updated so the model must always return `length_alignment` and provide a concrete recommendation (and fit-to-target guidance when targets differ); validation will fail the tool call if missing. [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — removed Arc tab **Length explorer** UI; the Arc panel now displays the saved **Length recommendation** block (recommended pages + action + cut/add suggestions when present). [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx) — removed length explorer tips; updated pacing copy to reflect required recommendation output. **Verify:** `npm run test -- --run`, `npm run build`.

**Studio tags + Asset “Clear workspace” strip (2026-04-18):** Shared camera vocabulary in [`asset_studio_spec.ts`](src/data/asset_studio_spec.ts): **`STUDIO_CAMERA_ANGLE_OPTIONS`** (Eye level, Low, High, Wide-angle, Over-the-shoulder, Macro, Bird's Eye, Dutch, POV) powers both **`CINEMATIC_OPTIONS.angle`** and **`SPATIAL_GALLERY_CAMERA_ANGLE_OPTIONS`** (single source). Asset **tone** presets expanded (Neutral, Ominous, Tense, etc.); **location** adds transit/warehouse/rural-countryside; **room** adds Classroom, Corridor, Lobby, Stairwell; time/season **`Fog / mist`** (persist migrates legacy **`Fog`**). [`character_studio_spec.ts`](src/data/character_studio_spec.ts) imports the same angles; **lighting** adds Practicals and Soft natural; tone aligned with Asset. [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx) — **`CAMERA_ANGLE_CHIP_TOOLTIP`** explains angle vs shot scale; always-visible **Clear workspace** on the preview row (`resetWorkspaceFreshSlate` + `setPromptPanelTab('auto')`); on phone, compact **Clear** label + **`aria-label`**. [`assetStudioStore.ts`](src/stores/assetStudioStore.ts) persist **merge** maps old **`Fog`** → **`Fog / mist`** and **`Rural`** → **`Rural / countryside`** in location lists. **Verify:** `npm run build`, `npm run test -- --run`.

**Vault save — searchable profile/collection (2026-04-17):** [`SearchableVaultSelect.tsx`](src/shared/components/SearchableVaultSelect.tsx) replaces HTML `datalist`: typing filters the list; **click a row** to fill the field (mousedown avoids blur races); **ArrowDown/ArrowUp/Enter** when the list is open. **Character Studio** always loads `getCharacterAlbums()`; **Save new character** is hybrid (type a new profile or pick a row); **Save edited profile** still requires an exact existing profile. **Asset Studio** uses one picker for both **Save new asset** and **Add to library** — new accepts any non-empty collection name while still surfacing existing collections; library still requires an exact match; albums load on every save open. **Illustrator’s Imageshop** (`StorylineStudio`) **Save story to Asset Vault** uses the same hybrid for **New collection** and exact-match for **Existing collection**, with `loadVaultCollections()` when the modal opens. **Verify:** `npm run test -- --run`, `npm run build`; manual: new vs library modes, type new name vs pick row.

**Character Studio — Live Prompt Refine + Reference workspace (2026-04-17):** [`CharacterStudio.tsx`](src/portals/CharacterStudio.tsx) — **Refine** tab: **NEW / Refine / Insert snippet** moved to a **shrink-0** top row; suggest chips live in a **short scroll** region with a hint line; textarea uses **flex-1** with smaller min height; pinned tab area wrapped in **flex-1 min-h-0**; Live Prompt card **max-h** raised to `min(48vh,420px)`. **Reference workspace:** compare panes use **pointer-events-none** on hover-zoom image wrappers and **pointer-events-auto** on the **Expand** control cluster; **fullscreen modal** recomputes display width from **natural dimensions × fit-to-viewport × zoom** (resize-aware), **top-aligned** scroll body, **sticky** toolbar, **Fit** resets zoom to 100% of fit, zoom-out floor **0.15**. **Preview row:** removed second **Pose** column (**Live + one pose**); **More poses** strip uses `poses.slice(1)` when `length > 1`; tiles use **`dualSlotFrameStyle`** **280×497**. **Verify:** `npm run test -- --run`, `npm run build`; browser: Refine tab actions visible, Expand + zoom modal, two large preview tiles.

**Illustrator’s Imageshop — naming pass + beat delete affordance (2026-04-17):** Renamed portal `lab` UI copy from **Image Workshop** to **Illustrator’s Imageshop** across nav/landing + Writers’ handoff + wiki docs. Updated supporting vault copy to **NPC Vault** in [`ReferenceAlbum.tsx`](src/portals/ReferenceAlbum.tsx) and wiki. Added a visible **Delete beat** trash button with tooltip on each beat card in the Imageshop timeline (so delete is discoverable without hunting in Beat Detail). **Files:** [`portalCatalog.ts`](src/shared/portalCatalog.ts), [`AppShell.tsx`](src/components/layout/AppShell.tsx), [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx), [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx), [`ReferenceAlbum.tsx`](src/portals/ReferenceAlbum.tsx), wiki (`src/content/wiki/*`). **Verify:** `npm run lint` (0 errors); browser: open Imageshop and confirm per-beat delete button + tooltip appear.

**WriterPortal — page edit drafts effect dependencies (2026-04-16):** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — the effect that seeds `beatsEditDraft` / `dialogueEditDraft` from the selected page now depends on `selectedPage?.id`, `selectedPage?.beats_json`, and `selectedPage?.script_text` instead of `[selectedPage]`. That avoids resetting local edits whenever `setPages` replaces row object references (e.g. batch beats runs) while `beats_json` stays `null` or unchanged. **Verify:** edit beats/dialogue on a page with null beats, trigger a pages refresh that does not change that row’s fields — drafts stay intact; switching pages or updating server fields still re-syncs drafts.

**Image Workshop — debug instrumentation removed (2026-04-16):** Removed temporary `fetch` calls to the local NDJSON ingest endpoint and `#region agent log` blocks from [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx) (`handleOpenStudioFromDraft`), [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) (`openImageWorkshopFromWriter`), and [`studioImportBridge.ts`](src/stores/studioImportBridge.ts) (`consumeImportForTarget`, `clearActiveImportForTarget`, `requestReturnToSourceIfNeeded`). Renamed `clearActiveImportForTarget`’s unused `reason` parameter to `_reason` after log removal. **Verify:** `rg '7621/ingest|edc323' src` is empty; `npm run lint` (0 errors).

**Warning remediation pass (2026-04-16):** Audited the repo warning baseline and reduced `npm run lint` from **79 warnings** to **61 warnings** while keeping **0 errors** throughout. Resolved all touched Image Workshop UI hook warnings in [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx), [`CharacterStudio.tsx`](src/portals/CharacterStudio.tsx), [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx), and [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx). Also removed two stale lint suppressions in [`ProjectContext.tsx`](src/shared/context/ProjectContext.tsx) and [`ThemeContext.tsx`](src/shared/context/ThemeContext.tsx), converted low-risk `prefer-const` bindings in [`buildCharacterStudioPromptForApi.ts`](src/shared/utils/buildCharacterStudioPromptForApi.ts), [`BalloonNode.tsx`](src/modes/comic/components/BalloonNode.tsx), [`ComicPanel.tsx`](src/modes/comic/components/ComicPanel.tsx), and [`comicStore.ts`](src/stores/comicStore.ts), and added [`warning_remediation_notes.md`](warning_remediation_notes.md) documenting all fixed and intentionally retained warnings with rationale. **Verify:** `npm run lint`.

**Image Workshop — Writer handoff + Visual Prep routing (2026-04-16):** Added a deterministic bridge from Writers' Workshop into Image Workshop. [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) now opens Image Workshop from the current outline, selected page, or latest shot plan. The new planner [`imageWorkshopPlanning.ts`](src/portals/storyline/imageWorkshopPlanning.ts) inspects Writer context plus lore-card titles and routes items into three groups: **Matched from vault**, **Quick refs**, and **Needs studio**. [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx) renders a **Visual Prep** queue with actions to add matched refs to production libraries, seed Image Lab prompts, or open Character / Asset Studio with source metadata. [`imageWorkshopBridge.ts`](src/stores/imageWorkshopBridge.ts) carries writer handoffs into portal `lab`, while [`studioImportBridge.ts`](src/stores/studioImportBridge.ts) now preserves origin metadata and supports return-to-origin after studio saves. [`GenericImageLabPanel.tsx`](src/portals/storyline/GenericImageLabPanel.tsx) accepts seeded prompts from Visual Prep. [`CharacterStudio.tsx`](src/portals/CharacterStudio.tsx) and [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx) now accept prompt-only imports and can navigate back to Image Workshop after save, updating the originating beat when one exists. Product framing copy was aligned in [`ReferenceAlbum.tsx`](src/portals/ReferenceAlbum.tsx), [`portalCatalog.ts`](src/shared/portalCatalog.ts), and wiki content for portal `lab`. **Verify:** `npm run test -- --run src/portals/storyline/__tests__/imageWorkshopPlanning.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/studioImportBridge.test.ts`; additional repo-wide `npm run build` / lint checks follow below.

**Cloudflare Workers Builds — explicit Wrangler config (2026-04-16):** [`package.json`](package.json) — **`deploy`** and **`preview`** pass **`--config ./wrangler.jsonc`**; added **`cf:versions-upload`** (`wrangler versions upload --config ./wrangler.jsonc`) for dashboard **Version command**. [`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`](CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md) **D4e** — copy-paste: Deploy **`npx wrangler deploy --config ./wrangler.jsonc`**, Version **`npm run cf:versions-upload`**. **Verify:** `npm run build`, `npm run cf:versions-upload` (needs Cloudflare auth). **Operator:** paste those commands into Workers **Settings → Build** (cannot be done from this agent).

**Image Workshop — Image Lab fix + portal trim (2026-04-15):** [`GenericImageLabPanel.tsx`](src/portals/storyline/GenericImageLabPanel.tsx) — default **raw** prompt drives generation; **`effectivePrompt`** resolves refined vs raw so **Generate** no longer asks for a prompt when the textarea is filled. Friendlier copy when **`VITE_GEMINI_API_KEY`** is absent (browser build env; same key as Character/Asset studios). [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx) — removed storyline column, Script Doctor, Plan beats, beat interval, director settings; header **IMAGE WORKSHOP**; production cast/assets row only; empty timeline hint updated. Removed dead **Script Doctor / Plan beats** handlers. **Verify:** `npm run build`.

**Git — `main` synced with GitHub (2026-04-15):** Uncommitted Asset/Character studio + store + docs work was committed on **`cursor/asset-studio-workspace-ui-32da`** (`e4f103b`), then merged into **`main`** after fast-forward to **`origin/main`** (remote feature branch was already removed post–PR #17). Merge conflict in [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx): kept the production **`references` → `leftModule` hub** sync from **`main`**; omitted temporary **localhost** debug ingest from the feature branch. Pushed **`main`** (`9a74c72` → `6a23bb8`). **Cloudflare:** publish with **`npm run deploy`** (after `npm run build`) or your dashboard pipeline so the Worker serves the new **`dist/`** bundle. **Supabase:** this sync had **no** new migrations or Edge changes; deploy functions/DB only when those files change.

**Docs + Cloudflare deploy (2026-04-15):** Aligned [`tasks.md`](tasks.md) (Storyline Image Lab ref fixes → **complete**; Git/Cloudflare section; studio reset → **complete**), [`implementation_plan.md`](implementation_plan.md) (**Operational state** — GitHub **`main`**, Worker name, Supabase scope). Ran **`npm run deploy`** (`tsc` + Vite + **`wrangler deploy`**). **Worker:** **`asset-reference-comics-studio`** — **https://asset-reference-comics-studio.onyxzion.workers.dev** — **Version ID** `8e255995-c5f6-482b-8e2f-90cc7e1c240c` (Wrangler 4.80.0). **Verify:** hard refresh / incognito on that URL; optional hero version string in-app. **Note:** upload included stray **`.DS_Store`** under **`dist/`**; remove from `public/` / clear before deploy if undesired.

**Image Vault HQ downloads + studio reset UX (2026-04-15):** **Download HQ** per vault card; **ZIP** selection checkboxes + **Download all** / **Selected (N)** in [`ProfileVaultModal.tsx`](src/components/ui/ProfileVaultModal.tsx) and [`CollectionVaultModal.tsx`](src/components/ui/CollectionVaultModal.tsx). Shared helpers [`vaultImageDownload.ts`](src/shared/lib/vaultImageDownload.ts) (`fetchVaultImageBlob`, arcs 400 retry, `fflate` `zipSync`) + exported [`createFreshSignedArcsUrl`](src/shared/lib/arcsGenerationsUrls.ts). **Studios:** `resetWorkspaceFreshSlate()` + **Clear workspace**; **Reset to tags** / **Refresh** / **Clear overrides** use `clearLivePromptOverridesOnly()` + `setPromptPanelTab('auto')`. **Section clears:** [`characterStudioStore.ts`](src/stores/characterStudioStore.ts) / [`assetStudioStore.ts`](src/stores/assetStudioStore.ts) + UI in [`CharacterStudio.tsx`](src/portals/CharacterStudio.tsx), [`AssetStudioReferencesPanel.tsx`](src/portals/asset-studio/AssetStudioReferencesPanel.tsx), [`AssetStudioBuildPanels.tsx`](src/portals/asset-studio/AssetStudioBuildPanels.tsx), [`AssetStudioLivePromptPanel.tsx`](src/portals/asset-studio/AssetStudioLivePromptPanel.tsx). **Verify:** `npm run build`, `npm run test -- --run`.

**Gemini image generation — signed reference URL fix + Storyline Image Lab mixed refs (2026-04-15):** Fixed the likely cause of **“Failed to fetch reference image”** when using Vault/Archive images as reference slots by resolving private `arcs-generations` storage URLs to **fresh signed URLs** right before encoding refs for Gemini (in [`geminiImageApi.ts`](src/shared/api/geminiImageApi.ts): `resolveReferenceUrlForFetch` → `resolveArcsGenerationsDisplayUrl`, then `urlToBase64WithMime`). Updated Storyline **Image Lab** helpers in [`GenericImageLabPanel.tsx`](src/portals/storyline/GenericImageLabPanel.tsx): split into **Replace with Character/Asset refs** (existing behavior) and **Add Character/Asset refs** (fills first-empty so you can mix both), plus a clear **notice** when a source studio has no refs so clicks never feel like “nothing happened”. **Verify:** `npm run test -- --run src/stores/__tests__/studioImportBridge.test.ts`, `npm run build`, `ReadLints` clean for touched files. Manual verification of the original fetch error requires at least one saved Vault/Archive image to select as a reference.

**Asset Studio 2.0 — Phase 5: phone layout (2026-04-14):** Phone no longer stacks **References + Build + Prompt** in one scroll; **`workspaceMode`** gates **one** left panel at a time (same as desktop). Default on phone is **`output`** (preview + right-column actions first). **Workspace** tabs show on all breakpoints. **Output** hint visible on phone when Output is selected. Below `md`, **Asset workspace** column is **first** in the flex order (preview leads). **Build** on phone includes **Simple/Advanced** and **Refs / Build / Look** sub-tabs. Tab buttons use **min-h-[44px]** on small screens. [`AssetStudioLivePromptPanel`](src/portals/asset-studio/AssetStudioLivePromptPanel.tsx) uses more vertical space on phone (`flex-1`, no tight `max-h`). **Verify:** `npm run test -- --run`, `npm run build`.

**Asset Studio 2.0 — Phases 3–4: panels + Simple/Advanced (2026-04-14):** Persisted **`buildDisclosure`** (`simple` | `advanced`) in [`assetStudioStore`](src/stores/assetStudioStore.ts). Left column modules live under [`src/portals/asset-studio/`](src/portals/asset-studio/) — `assetStudioShared` (chips), `AssetStudioReferencesPanel`, `AssetStudioBuildPanels` (structural + material), `AssetStudioLivePromptPanel`, `AssetStudioOutputHint`. [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx) ~1520 lines (was ~2400+). Desktop **Build** mode: **Build detail** bar toggles Simple (trimmed Build/Look: room-type set dressing + structure ribbon; art style presets + angle only; hides per-section Save-as-tag and advanced cinematic extras) vs Advanced (full parity with previous UI). **Verify:** `npm run test -- --run`, `npm run build`.

**Vault images — debug instrumentation removed (2026-04-14):** Removed temporary NDJSON/fetch debug hooks from [`arcsGenerationsUrls.ts`](src/shared/lib/arcsGenerationsUrls.ts), [`useArcsResolvedSrc.ts`](src/shared/hooks/useArcsResolvedSrc.ts), and [`VaultImageWithFallback.tsx`](src/components/ui/VaultImageWithFallback.tsx). **Kept:** `createSignedUrlWithUserFolderFallback` (legacy `uid/` path retry) and migration [`20260414100000_arcs_generations_legacy_root_select.sql`](supabase/migrations/20260414100000_arcs_generations_legacy_root_select.sql) for root-level storage reads. **Verify:** `npx tsc --noEmit`.

**Writer page beats — outline vs page split (2026-04-14):** Page-beats generation only passed the **exact** `page_target` beat, so the model often **folded the next outline beat into the same page** and the **following page paraphrased**. **`extractOutlineBeatContextForPage`** in [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) now adds (1) **Continuity** from `page_target - 1` (do not repeat on this page), (2) **CRITICAL — Reserved for page N+1** with the next beat’s JSON when the next outline page is consecutive, and **`buildPageBeatsUserPrompt`** reinforces those rules. **Operator:** **`supabase functions deploy writer-tools`**.

**Asset Studio 2.0 — workspace modes Phase 1 (2026-04-14):** [`assetStudioStore`](src/stores/assetStudioStore.ts) adds persisted **`workspaceMode`** (`references` | `build` | `prompt` | `output`) and **`setWorkspaceMode`**. [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx) — desktop left column has a **Workspace** tab strip; **References** shows the reference hub; **Build** shows the existing **Refs / Build / Look** sections (sub-tab bar only in Build); **Prompt** holds the **Live Prompt** card (scroll area above it holds reference/build content only); **Output** shows a short hint (preview + generation remain in the right column). **Phone** default **`output`** (see Phase 5 above). Main row split is ~**42% / 58%** on `md+`. Fixed JSX structure: root content `div` closes before modals; flex row stays open for both columns. **Verify:** `npm run test -- --run`, `npm run build`.

**Asset Studio — workspace layout + tooltips (2026-04-14):** In [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx), the **Asset workspace** card now keeps the **live preview** (single or compare) in a **non-scrolling** top pane and puts session chips, recent/session thumbnails, spatial expansion chips, and the thumbnail/compare + generate/save action rows in **one** vertically scrollable region below it. This removes the `max-h` middle stack that could leave bottom controls overlapping or unreachable in tight vertical space. Added `Tooltip` copy for **Clear all**, **Paste first empty**, **This session** thumbnails, **Compact** / **Comfortable**, and **Compare**. **Verify:** `npm run test -- --run`, `npm run build`; manual Asset Studio at a short window height — scroll reaches all workspace buttons.

**Asset Studio — readability polish (2026-04-14):** Same file — bumped control and label sizes from very small fixed pixel classes to **`text-xs` / `text-sm`** across the workspace, hub, Live Prompt footer, and chips; **Chip** component uses **`text-sm`** and slightly larger padding; **Room–Camera** controls sit in a **rounded bordered card** for clearer grouping; **Recent / This session** thumbnails use **11×11 / 14×14** (was 10/12); **Refs / Build / Look** tabs and **status** line use larger type; hub **Upload / Archive / Clear** buttons have slightly larger hit targets. **Verify:** `npm run test -- --run`, `npm run build`.

**Writer — Lore JSON import (2026-04-14):** Added Lore tab **Import JSON** panel to bulk-create `writer_lore_cards` from a pasted JSON array. Import validates array/object rows, requires non-empty `title`, supports optional `category`/`body`/`include_in_prompt`, skips duplicates by normalized `(category,title)` against existing series cards and within payload, sorts by normalized `category → title`, and assigns `sort_order` sequentially (step 10) starting after the current max. **File:** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx). **Verify:** `npm run build`, `npm run test -- --run`.

**Writer — series lore cards (2026-04-14):** Migration [`20260414000000_writer_lore_cards.sql`](supabase/migrations/20260414000000_writer_lore_cards.sql) adds **`writer_lore_cards`** + RLS. [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts) CRUD; **Lore** tab in [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx); [`writer-tools`](supabase/functions/writer-tools/index.ts) injects digest into outline + page beats. Shortcuts **⌥⌘1–7**. **Verify:** `npm run test -- --run`, `npm run build`. **Operator:** **`supabase db push`** + **`supabase functions deploy writer-tools`**.

**Git — merge `origin/main` (2026-04-14):** Resolved divergent **`main`** vs **`origin/main`**: combined local writer work (**`page_ids`**, **`batch_offset`**, director notes, two-column Beats, Library bulk helpers) with upstream. **`supabase/functions/tsconfig.tsbuildinfo`** conflict fixed by taking upstream artifact (valid incremental cache). **Verify:** `npx tsc --noEmit`, `npm run test -- --run src/shared/writer/__tests__/schemas.test.ts`. **Next:** `git push origin main` when ready; redeploy **`writer-tools`** if Edge code changed.

**Writer beats batch cap + picks + clear AI fields (2026-04-11):** **`page_beats_issue`** max **5** pages per request (`WRITER_PAGE_BEATS_ISSUE_MAX` in [`schemas.ts`](src/shared/writer/schemas.ts)); optional **`page_ids`** for a targeted batch; optional **`batch_offset`** when regenerating all without skip. Edge [`writer-tools/index.ts`](supabase/functions/writer-tools/index.ts). **UI** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — checkboxes (max 5) + **Generate beats for selected**; **Generate all beats** loops with 5 per round; **Delete latest outline**; download/clear beats per page via Library APIs. API [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts) — `deleteLatestWriterOutline`, bulk clears. **Verify:** `npm run test -- --run`, `npm run build`; deploy **`writer-tools`**.

**Writer — Beats tab layout + wider Library dock (2026-04-13):** **Page Beats** uses an **`xl` two-column grid**: controls and **Director notes for beats** on the left, **Beats for selected page** JSON in a **sticky** right column with taller preview on desktop. **WriterStudioDock** desktop width **260–380px** (was ~240–320). **Files:** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx), [`WriterStudioDock.tsx`](src/portals/writer/WriterStudioDock.tsx). **Verify:** `npm run build`.

**Writer page beats — HTTP 546 / WORKER_LIMIT (2026-04-11):** Supabase returns **546** when an Edge Function hits **worker limits** (memory / CPU). **`page_beats`** built an unbounded user prompt (full `cast`, `locations`, `styleBibles`, entire **`beats_json`** on regenerate). After a large outline + heavy existing panels, that could exceed limits. **Fix:** [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) — **`jsonForPrompt`** + **`PAGE_BEATS_PROMPT_CAPS`** (same ballpark as pacing/canon slices: cast 8k, locations 4k, style bibles 8k, existing beats 14k, outline beat 6k). **Operator:** **`supabase functions deploy writer-tools`**.

**Writer — batch beats stop + Library select all (2026-04-13):** With **Skip pages that already have beats** **off**, **`page_beats_issue`** always took **`candidates.slice(0, limit)`** on the full ordered list, so the same first 5 pages regenerated forever and **`has_more`** stayed true. **Fix:** optional **`batch_offset`** (when skip is false) in [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts); response includes **`next_batch_offset`**; [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) sends and advances offset. **Library → Pages:** removed **5-page** multi-select cap; **Select all pages** + **Clear selection**; selection clears when switching issue. **Verify:** `npm run test -- --run`, `npm run build`. **Operator:** **`supabase functions deploy writer-tools`**.

**Writer — beats visibility with synopsis helper (2026-04-12):** On **Scripts & exports**, the synopsis helper no longer hides which pages have saved panel beats. **Panel beats (this issue)** shows **N / total** and a row of page chips (green dot = has `beats_json` panels); clicking a chip switches to the **Beats** tab, selects that page, and expands **Library**. **Library → Pages** list rows also show the same green / empty dot next to each page label plus a one-line legend. **Files:** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx). **Verify:** `npm run test -- --run`.

**Writer — page beats include synopsis helper rules (2026-04-13):** **Scripts → Rules for the outline** is stored in **`notes.synopsis_helper.rules`** but was **not** passed into the **`page_beats`** / **`page_beats_issue`** prompt, so batch runs ignored author rules (e.g. no repeating beats). **Fix:** [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) — **`extractSynopsisHelperRulesForPageBeats`** + block in **`buildPageBeatsUserPrompt`** (cap 2k chars). Help: [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx) **`beatsTab`** / **`scriptsTab`**. **Verify:** `npm run build`. **Operator:** **`supabase functions deploy writer-tools`**.

**Writer — Generate all beats batch limit (2026-04-13):** The app sent **`batch_limit: 8`** while **`writer-tools`** validates **`batch_limit`** with Zod **max 5**, so **Generate all beats** failed immediately with **Invalid request** (max 5). **Fix:** cap **`batch_limit`** at **5** in [`src/shared/writer/schemas.ts`](src/shared/writer/schemas.ts) and [`supabase/functions/_shared/writerSchemas.ts`](supabase/functions/_shared/writerSchemas.ts); default/clamp batch size to **5** in [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts); client uses **`WRITER_PAGE_BEATS_ISSUE_MAX`** in [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx); tooltip [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx) says **5** per batch. **Verify:** `npm run test -- --run`, `npm run build`. **Operator:** **`supabase functions deploy writer-tools`**.

**Cursor cloud VM — preinstall Node deps (2026-04-11):** Added [`.cursor/environment.json`](.cursor/environment.json) with **`install`**: **`npm ci`**. New cloud workspaces run a clean install from **`package-lock.json`** so **`eslint`**, **`vitest`**, **`typescript`**, **`vite`**, **`wrangler`**, and app dependencies are on disk before the first terminal command. **Verify:** after provisioning, run **`npm run lint`**, **`npm run test`**, **`npm run build`** without **`npm install`**. **Cloudflare / Supabase:** this file does not deploy the app; keep Cloudflare build + env vars per [`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`](CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md), and apply Supabase migrations / function deploys from the checklist and [`tasks.md`](tasks.md) (e.g. **`supabase db push`**, **`supabase functions deploy writer-tools`**) when schema or Edge code changes.
**Writer workspace shortcuts + File → Scripts (2026-04-12):** Workspace tab hotkeys use **⌥⌘1–6** (Mac) / **Alt+Ctrl+1–6** so they do not fight browser **⌘1–9** tab switching. **File** ribbon adds **Scripts & exports** (opens Scripts tab and switches ribbon to Home). Tooltips via [`writerWorkspaceShortcuts.ts`](src/portals/writer/writerWorkspaceShortcuts.ts).

**Writer Scripts tab + synopsis helper + manual edits (2026-04-12):** New workspace tab **Scripts & exports** (`scripts` in [`writerSearch.ts`](src/portals/writer/writerSearch.ts), ⌘6). [`writerSynopsisHelper.ts`](src/portals/writer/writerSynopsisHelper.ts) builds labeled synopsis text from worksheet fields stored in **`notes.synopsis_helper`**. [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts) — **`updateWriterIssue` accepts `notes`**, **`updateWriterIssueOutlineJson`**, **`updateWriterPageBeatsJson`**, **`updateWriterPageScriptText`**, **`updateWriterVideoShotPlanJson`**. [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — synopsis helper UI, issue pack object (synopsis, outline, shot plan, pages with full `script_text`, pacing/canon cache), copy/download, JSON/text editors with save. Tests: [`writerSynopsisHelper.test.ts`](src/portals/writer/__tests__/writerSynopsisHelper.test.ts). Help + wiki keyboard row updated. **Verify:** `npm run test -- --run`, `npm run build`. **Supabase:** ensure authenticated users can `update` `writer_issue_outlines`, `writer_pages`, `writer_video_shot_plans` under your RLS (same as inserts for those tools).

**Writer page beats — HTTP 546 / WORKER_LIMIT (2026-04-11):** Supabase returns **546** when an Edge Function hits **worker limits** (memory / CPU). **`page_beats`** built an unbounded user prompt (full `cast`, `locations`, `styleBibles`, entire **`beats_json`** on regenerate). After a large outline + heavy existing panels, that could exceed limits. **Fix:** [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) — **`jsonForPrompt`** + **`PAGE_BEATS_PROMPT_CAPS`** (cast 8k, locations 4k, style bibles 8k, existing beats 14k, outline context 6k). Rich outline context + director notes remain; large outline context is truncated to the cap. **Operator:** **`supabase functions deploy writer-tools`**.

**Writers’ Arc tab + outline simplification (2026-04-11):** Removed **multi-issue arc outline** from Issue Outline (arc spine textarea, arc length, **Outline all in series**) and dropped **`arc_brief` / `arc_issue_count`** from **`outline_issue`**. **Arc tab** — **Batch arc tools**: checkboxes + **Select all** / **Clear** / **Library issue only**, then **Run pacing on selected** / **Run canon on selected**. Optional **`outline_supplement`** (max 8k) on **`outline_issue`** replaces ad-hoc arc payload for **Generate outline** and **coverage boost** (UI draft, not saved on the issue row). **Verify:** `npm run test -- --run`, `npm run build`. **Operator:** **`supabase functions deploy writer-tools`**.

**Writer Library — page batch actions + exports (2026-04-11):** [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts) — **`deleteWriterPages`**, **`clearWriterPagesBeatsJson`**, **`clearWriterPagesScriptText`**. [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — Library → Pages checkboxes (max **5** selected), batch delete/clear/download; Outline **Download outline**; Beats/Dialogue per-page download/clear. **`pagesLibrary`** tip.

**Writer beats — director notes + layout prompts (2026-04-11):** Optional **`director_notes_for_beats`** on **`page_beats`** / **`page_beats_issue`**. Edge + UI: varied panels, detail, spreads; **`outline_issue`** nudges distinct consecutive beats. **Director notes for beats** textarea on Beats tab.

**Writer outline coverage boost (2026-04-11):** Warning when saved outline has fewer **`page_beats`** than target pages; **Regenerate with coverage boost** appends a coverage line via **`outline_supplement`** (merged with optional author notes in the Outline tab draft). Previously used removed **`arc_brief`**; now aligned with simplified **`outline_issue`** contract.

**Writer outlines + page-beats anti-repeat (2026-04-11):** Dense per-page **`page_beats`** in **`outline_issue`** prompt; **`page_beats`** uses bridging outline context + prior-page **`beat_preview`** (up to 5 prior pages).

**Supabase Edge Functions — IDE TypeScript (2026-04-10):** Added [`supabase/functions/tsconfig.json`](supabase/functions/tsconfig.json) with **`paths`** mapping **`https://esm.sh/@supabase/supabase-js@2.49.1`** and **`npm:zod@3.24.2`** to **`node_modules`** (Deno URL/npm specifiers are valid at deploy time but unknown to Node-style TS). [`deno-global.d.ts`](supabase/functions/deno-global.d.ts) stubs **`Deno.serve`** / **`Deno.env`** for editor checks only. Root [`tsconfig.json`](tsconfig.json) **`references`** the functions project so the language service loads it. **Verify:** `npx tsc -p supabase/functions/tsconfig.json --noEmit`, `npx tsc -b --noEmit`; reload TS server if the editor is stale.

**Writer arc batch UX (2026-04-10):** Renamed **Issues in arc** → **Arc length (for AI)** with inline note that batch outline uses **Library issue count**; button **`Outline all in series (N in Library)`**; new **`arcIssueCountHint`** + clearer **`outlineAllIssues`** / **`arcBriefOutline`** tooltips in [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx) and [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx).

**Library → Issues — add issue always visible (2026-04-10):** **`Add issue #N`** now shows whenever a series is selected (not only when the list was empty), matching **Add page** behavior—fixes “no way to add a second issue.” [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — shared **`handleAddWriterIssue`**, expands dock on create; Issue Outline hint includes **Open Library → Issues** jump link. **`issuesStoryContext`** tooltip updated in [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx). **Verify:** `npm run build`.

**Multi-issue arc outline prompt (2026-04-10):** [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) — loads series issues ordered by **`issue_number`**, computes **part k of N** per request, and replaces the vague arc line with explicit instructions: take **only** the spine slice for that part, do not invent plots for other issues, divide the spine into N segments if unlabeled. Placeholder + **`arcBriefOutline`** tip nudge authors to label Issue 1/2… in the spine. **Operator:** redeploy **`writer-tools`** for live behavior.

**Arc spine — deterministic section split (2026-04-11):** Same Edge file — **`lineArcHeaderNumber` / `extractLabeledArcSection` / `resolveArcBriefForIssue`** parse line-start headings (`Issue 2`, `2. text`, `#3 —`, `This is number one`, `This is number 4`, etc.). When a section matches **comic issue #** or **arc part index**, only that block is sent to Gemini as **AUTHORITATIVE SPINE**; otherwise full text + “add headings” hint. Lower **temperature (0.35)** when any arc text is present; stronger system instruction. **Operator:** **`supabase functions deploy writer-tools`**.

**Writers’ Workshop QoL (2026-04-10):** Batch page beats and page sync. **Edge** [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) — `page_beats_issue` (sequential batches, `has_more`); `outline_issue` prompt accepts optional **`arc_brief`** / **`arc_issue_count`** via [`writerSchemas.ts`](supabase/functions/_shared/writerSchemas.ts). **Shared Zod** [`src/shared/writer/schemas.ts`](src/shared/writer/schemas.ts) + tests [`schemas.test.ts`](src/shared/writer/__tests__/schemas.test.ts). **API** [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts) — **`ensureWriterPagesToCount`**. **UI** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — Sync pages, arc textarea + issue count, outline all issues, beats batch + skip-existing + cancel; **Pipeline** strip + [`writerNextStep.ts`](src/portals/writer/writerNextStep.ts); tab order from [`writerSearch.ts`](src/portals/writer/writerSearch.ts) (ribbon + [`useWriterHotkeys.ts`](src/portals/writer/useWriterHotkeys.ts)). **Copy** [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx). **Docs** [`implementation_plan.md`](implementation_plan.md) Writers Phase 7; [`tasks.md`](tasks.md) QoL section. **Verify:** `npm run test -- --run`, `npm run build`; operator redeploy **`writer-tools`**.

**Landing page UI intake (2026-04-05):** Added **[`LANDING_PAGE_UI_INTAKE.md`](LANDING_PAGE_UI_INTAKE.md)** — markdown worksheet (hero copy, visuals, portal grid order, sidebar labels, sign-in placement, motion toggles, references). Added **[`docs/LANDING_PAGE_UI_INTAKE.html`](docs/LANDING_PAGE_UI_INTAKE.html)** — local form with **Copy for ARCS assistant** (markdown for chat). Linked from **[`implementation_plan.md`](implementation_plan.md)** (**Landing page UI intake**) and **[`tasks.md`](tasks.md)**.

**Image Vault UI intake (2026-04-05):** Added **[`IMAGE_VAULT_UI_INTAKE.md`](IMAGE_VAULT_UI_INTAKE.md)** and **[`docs/IMAGE_VAULT_UI_INTAKE.html`](docs/IMAGE_VAULT_UI_INTAKE.html)** — detailed intake with **Characters (Ruby / profiles)** and **Assets (Amethyst / collections)** plus **shared** tab shell fields, cross-cutting consistency, and references; **Copy for ARCS assistant** for Cursor. Linked from **[`implementation_plan.md`](implementation_plan.md)** and **[`tasks.md`](tasks.md)**. **Next:** Fill before overhauling [`ReferenceAlbum.tsx`](src/portals/ReferenceAlbum.tsx), [`CharacterVault.tsx`](src/components/ui/CharacterVault.tsx), [`AssetVault.tsx`](src/components/ui/AssetVault.tsx), vault modals.

**Landing page UI — implementation (2026-04-05):** Stakeholder intake applied in code — [`src/shared/portalCatalog.ts`](src/shared/portalCatalog.ts) (portal order, card/subtitle copy, nav labels incl. **ARC Hub** / **Wiki ARC Portal**, accent hex per portal, Lucide icons, `getPortalIcon` for shell); [`src/components/LandingPage.tsx`](src/components/LandingPage.tsx) (hero lines + subline, **v2.4.1** badge, rotating full-page backdrop from [`landingHeroRotation.ts`](src/shared/landingHeroRotation.ts), parallax hero image, door CTA **Open** + **IN**, Create account, account strip **Secure Login/Save Your Work**, portal cards with colored borders + glitter icon wells + stagger; `prefers-reduced-motion` skips aurora pulse + card entrance); [`src/components/layout/AppShell.tsx`](src/components/layout/AppShell.tsx) (desktop nav from catalog + glitter icon wells; mobile bottom tabs use `getPortalIcon`); [`tailwind.config.js`](tailwind.config.js) keyframes **`pulse-slow`**, **`landing-aurora`**, **`landing-card-in`**; [`src/styles/theme.css`](src/styles/theme.css) **`.landing-hero-aurora`**. **Verify:** `npm run build`.

**Landing page UI — polish (same session):** Hero subline grammar (**to** create); mobile first tab label **`HUB_HOME_LABEL`** (**ARC Hub**); **Asset Studio** card title aligned with sidebar nav; Writers' Workshop card **`cardImageUrl`** (`City of Capricorn`); wiki [`home.md`](src/content/wiki/home.md) table updated.

**Live site vs GitHub (2026-04-05):** Pushing **`main`** updates the repo only. The production Worker ([`wrangler.jsonc`](wrangler.jsonc)) serves **`dist/`** from the last **`npm run deploy`** (or **`npx wrangler deploy`** after **`npm run build`**). This repo has **no** GitHub Actions workflow for deploy — confirm in **Cloudflare → Workers & Pages** that a build ran for your commit, or deploy from your machine with **`wrangler login`**. After a successful deploy, the hero shows version **v2.4.1** so you can confirm the new JS bundle is live (hard refresh or incognito if needed).

**CI / Vitest (2026-04-10):** [`writerTools.test.ts`](src/shared/api/__tests__/writerTools.test.ts) — Supabase mocks moved into **`vi.hoisted()`** so the **`vi.mock('@/shared/lib/supabase')`** factory does not reference `const` mocks before initialization (fixes **`Cannot access 'getSessionMock' before initialization`**). **`npm run test`** → 79 passed.

**Landing hero images — wire rotation into [`landingHeroRotation.ts`](src/shared/landingHeroRotation.ts) (reference):**

1. **Add files** under [`public/assets/images/hero/`](public/assets/images/hero/) (JPG, PNG, or WebP). Prefer filenames without spaces; if you use spaces, encode them in the URL as `%20` (e.g. `My%20Shot.jpg`).
2. **Do not** point at **`dist/`** or **`node_modules/`** in code. Only **`public/`** is the source of truth: Vite copies it to the site root, and production builds place the same assets under `dist/` automatically.
3. **Edit** [`src/shared/landingHeroRotation.ts`](src/shared/landingHeroRotation.ts): append each image as a string in **`LANDING_HERO_ROTATION_URLS`**, using paths from the web root, e.g. `'/assets/images/hero/hero-night.webp'`. The landing hero and the soft full-page backdrop both read from this list (see [`LandingPage.tsx`](src/components/LandingPage.tsx)).
4. **Optional:** set **`LANDING_HERO_FALLBACK_URL`** to your default slide (also used if the rotation array were empty).
5. **Verify:** `npm run dev` → open **ARC Hub** home; images advance about every **14 seconds**. Parallax on the hero follows the mouse unless **`prefers-reduced-motion`** is on.

On-disk copy of these steps: [`public/assets/images/hero/README.txt`](public/assets/images/hero/README.txt).

**Supabase — private `arcs-generations` + signed URLs (phase B, 2026-04-07):** Migration [`20260407120000_arcs_generations_private_storage.sql`](supabase/migrations/20260407120000_arcs_generations_private_storage.sql) makes the bucket private and scopes `storage.objects` policies to `auth.uid()` as the first path segment. Client: [`arcsGenerationsUrls.ts`](src/shared/lib/arcsGenerationsUrls.ts), [`useArcsResolvedSrc`](src/shared/hooks/useArcsResolvedSrc.ts), [`ArcsStorageImg`](src/components/ui/ArcsStorageImg.tsx); [`arcsPersistence.ts`](src/shared/api/arcsPersistence.ts) uploads under `${user.id}/…`. UI: Character/Asset studios, `ArchiveRecallModal`, `CinematicGallery`, `AssetArchiveGallery`, `ArchiveThumbnailFocusModal`, `StorylineStudio`, `GenericImageLabPanel`, `VaultImageWithFallback`; **CharacterStudio** pose “open in new tab” uses `resolveArcsGenerationsDisplayUrl` with a narrowed `raw` URL (fixes `tsc`). **Remote:** **`supabase db push`** applied successfully on the linked project; `NOTICE` lines about policies that do not exist are normal when dropping old policy names. **Verify:** `npm run build`; signed-in app — vault/archive/studio images load via signed URLs; recall still injects stable DB URLs. **No** `writer-tools` redeploy required for storage (Phase A Edge deploy unchanged for Phase B).

**AppShell — mobile account chrome + More → Sign out (2026-04-07):** [`AppShell.tsx`](src/components/layout/AppShell.tsx) — Phone **`header`** is **`main`** sibling and **last child** of the shell (paint order / compositor); **no `backdrop-blur`** on that bar (solid **`bg-black/60`**), **`isolate`**, **`translateZ(0)`** for a stable layer; signed-in avatar **`onPointerDown` `stopPropagation`** + **`aria-label="Account menu"`**. **Fallback:** **More** sheet includes **Sign out** when **Supabase** is configured and **`user`** is set so you are not blocked if the top avatar stays flaky on WebKit. **`main`** still reserves **`padding-top`** for the fixed bar. **Verify:** `npm run build`; iPhone — avatar opens sheet **or** More → Sign out.

**Git + Supabase ops — RLS phase A applied (2026-04-06):** Committed **`feat(security): Add per-user RLS, wiki portal, mobile shell`** and pushed **`main`** to **`JusheZion/Nano-Banana-Expanded`**. **`supabase db push`** applied **`20260406000000_arcs_per_user_rls.sql`** on the linked hosted project; **`supabase functions deploy writer-tools`** succeeded (CLI warned Docker not running). **Next operator check:** two-account isolation + signed-out vault local fallback ([`tasks.md`](tasks.md) smoke-test checkbox).

**Supabase per-user RLS — phase A (2026-04-06):** New migration [`20260406000000_arcs_per_user_rls.sql`](supabase/migrations/20260406000000_arcs_per_user_rls.sql) adds **`owner_id`** to **`writer_series`**, **`characters`**, **`assets`**, backfills/deletes orphans, **`DEFAULT auth.uid()`**, and replaces permissive RLS with **`authenticated`**-only policies (writer child tables via join to series owner). [`writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) now uses **`SUPABASE_ANON_KEY`** + per-request **`Authorization: Bearer <access_token>`** so RLS applies; fixed merge-corrupted **`page_beats`** **`Promise.all`**. Client: [`arcsVault.ts`](src/shared/api/arcsVault.ts), [`arcsAssetVault.ts`](src/shared/api/arcsAssetVault.ts), [`arcsArchive.ts`](src/shared/api/arcsArchive.ts) — Supabase vault/recall paths only when **`getSession()`** has a user; unsigned users keep **localStorage** archive; vault mutation helpers treat **`session != null`** as “cloud vault” (not “any row returned”). **Verify:** `npm run build`; two accounts isolated; signed-out vault uses local generations.

**Mobile Phase 3 — Writers’ Workshop + Home (2026-04-05):** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — **`useResponsiveLayout`**, **`flex-col`** main row on phone (workspace then dock), extra bottom padding in workspace scroll (`pb-28`) for dock + app tab bar; **`useEffect`** collapses dock when **`isPhone`** (open via ribbon **View → Panels** or collapsed dock bar). [`WriterStudioDock.tsx`](src/portals/writer/WriterStudioDock.tsx) — **`phoneLayout`**: full-width **`max-h-[min(42vh,420px)]`** panel, **`border-t`**, tab labels visible, collapse control **`⌄`**, **`env(safe-area-inset-bottom)`** padding; collapsed phone = full-width tap strip. [`WriterRibbon.tsx`](src/portals/writer/WriterRibbon.tsx) — ribbon tab row **`overflow-x-auto`**; tool row **`flex-col`** on phone with bordered **Find** row; find input **`flex-1 min-w-0`**. [`WriterContextMenu.tsx`](src/portals/writer/WriterContextMenu.tsx) — **`pointerType === 'touch'`** long-press opens menu; **`useLayoutEffect`** clamps **`fixed`** menu to viewport; **`touch-manipulation`**. [`LandingPage.tsx`](src/components/LandingPage.tsx) — phone **`p-4`**, shorter hero, **`text-4xl`** title.**Verify:** `npm run build`. [`writerWikiAnchors.test.ts`](src/content/wiki/writerWikiAnchors.test.ts) — top-of-file **`/// <reference types="node" />`** so **`tsc -b`** resolves **`node:fs`** without widening **`tsconfig.app`** `types`.

**Mobile Phase 2 — global CSS + safe areas (2026-04-05):** [`theme.css`](src/styles/theme.css) — `:root` **`--safe-*`** and **`--app-vh`** (`100dvh` + `100vh` fallback); **`html`** `color-scheme: dark`, text-size-adjust, iOS **`-webkit-fill-available`** height support; **`body`** / **`#root`** chained **`min-height`** for viewport fill; **`@media (max-width: 767px)`** sets main (non-wiki) **`background-attachment: scroll`** instead of **fixed** (iOS jank); utilities **`.app-safe-x`**, **`.min-h-app-viewport`**. [`AppShell.tsx`](src/components/layout/AppShell.tsx) — root flex **`app-safe-x`**, **`min-h-0`**; phone bottom **`nav`** uses **`max(0.25rem, env(safe-area-inset-left/right))`**. **`index.html`** already **`viewport-fit=cover`**. **Verify:** `npm run build`.

**Portals Wiki (in-app documentation, 2026-04-05):** Public **Docs → Portals Wiki** portal (`wiki` in [`src/shared/portals.ts`](src/shared/portals.ts)): [`WikiPortal.tsx`](src/portals/WikiPortal.tsx) renders markdown from [`src/content/wiki/`](src/content/wiki/) (`manifest.ts`, `wikiImports.ts`, chapter `.md` files) with **react-markdown** + remark-gfm + rehype-slug + rehype-autolink-headings; **`body.theme-wiki`** + **`.wiki-prose`** in [`src/styles/theme.css`](src/styles/theme.css); tokens in [`Phase12DesignTokens`](src/shared/theme/Phase12DesignTokens.ts). **Navigation:** [`AppShell`](src/components/layout/AppShell.tsx) Docs section, [`LandingPage`](src/components/LandingPage.tsx) card, [`App.tsx`](src/App.tsx) lazy route + **`navigatePortal`** vs **`requestPortalsWiki`** (Writers’ Workshop help jumps). **Screenshots:** [`public/wiki/screenshots/`](public/wiki/screenshots/) (placeholders + README). **Writer cross-links:** [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx) + modal footer. **Verify:** `npm run build`. **Lint note:** `npm run lint` may still report pre-existing issues in `supabase/functions/writer-tools/index.ts`.

**Mobile web — Asset Studio phone parity (2026-04-05):** [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx) — main row uses **`flex-col md:flex-row`** with **`w-full md:flex-[0_0_60%]`** left column (matches Character Studio); **Recent / This session** thumbnail gallery hidden when **`phoneCompact`**; **Thumbnails** density (**Compact** / **Comfortable**) hidden on phone, **Compare** kept; empty-state copy on phone no longer mentions **Recent**. **`npm run build`** passes.

**Mobile web Phase 0 prep (2026-04-05):** Added **[`MOBILE_PHASE0_PREPARATION.md`](MOBILE_PHASE0_PREPARATION.md)** — consolidated pre-implementation checklist (goals, scope, UX, technical, auth, deployment, testing, PWA, audit table) and answer placeholders. Added **[`docs/MOBILE_PHASE0_INTAKE.html`](docs/MOBILE_PHASE0_INTAKE.html)** — local browser form with **Copy for ARCS assistant** (markdown blob for chat). Linked from **[`implementation_plan.md`](implementation_plan.md)** and **[`tasks.md`](tasks.md)** (Mobile web section). **Next:** You fill intake → paste answers → then Phase 1 (`AppShell` touch-first).

**Workers deploy: remove `_redirects` vs SPA in `wrangler.jsonc` (2026-04-05):** Cloudflare **`npx wrangler deploy`** failed after a successful Vite build with **`Invalid _redirects configuration`** / **infinite loop** (**10021**) because **`public/_redirects`** had **`/* /index.html 200`** while **`wrangler.jsonc`** already sets **`assets.not_found_handling`**: **`single-page-application`**. **Fix:** removed [`public/_redirects`](public/_redirects); SPA refresh is handled by Wrangler only. Checklist **C2**, troubleshooting row, and [`implementation_plan.md`](implementation_plan.md) **Cloudflare Pages** section updated (Workers vs Pages). **Verify:** `npm run build`; redeploy — Wrangler should pass validation.

**package-lock.json merge corruption → `npm ci` EUSAGE (2026-04-05):** **`package-lock.json`** had invalid JSON from a bad merge (duplicate **`node_modules/zod`** block; a second copy of the lockfile root starting at **`"name": "nano-banana-expanded"`** spliced **inside** **`node_modules/zustand`**). **`npm ci`** then fails with *can only install with an existing package-lock.json* (npm treats an unparseable lockfile like a missing one). **Fix:** removed lockfile and ran **`npm install`** to regenerate; **`npm ci`** + **`npm run build`** pass. Checklist troubleshooting row updated ([`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`](CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md)). **Push** the new **`package-lock.json`** to **`main`** so Cloudflare’s install step succeeds.

**Cloudflare Workers + Git — Build command must not be None (2026-04-04):** Dashboard screenshots showed **Build command: None** while **Deploy** runs **`npx wrangler deploy`** — **`dist/`** is never produced in CI, so builds fail or never match GitHub. Checklist **D4d** documents: **`npm ci && npm run build`** as Build command; **`VITE_*`** for static-asset Workers belong on **build** env, not Worker secrets.

**Pushed to GitHub (2026-04-04):** **`main`** — merge-conflict playbook (**`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`**) + walkthrough entries; **`npm run build`** verified locally. Cloudflare should rebuild from **`main`** if the project is Git-connected; optional local publish: **`npx wrangler login`** then **`npm run deploy`**.

**Docs — merge conflicts vs JSON errors (2026-04-04):** [`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`](CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md) — new section **Merge conflicts after a PR** (why `<<<<<<<` markers break `package.json` / Cloudflare; do not “Accept both”; validate with `node -e JSON.parse(...)` + `npm run build`); troubleshooting row for **`EJSONPARSE`** after merge.

**Merge-corruption repair + green `npm run build` (2026-04-04):** Removed bad-merge duplicates and broken JSX/TS: [`vite.config.ts`](vite.config.ts) — duplicate `cloudflare` import; [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx) — duplicate `seriesLibrary` key + orphan string; [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — extra `useCallback` closers on pacing/canon ribbons, second `refreshIssuesForSeries`, merged **Series logline** / **Save story context** block, duplicate `onClick` on empty-state **Create first series**; [`writerTools.ts`](src/shared/api/writerTools.ts) — merged duplicate refresh + 401-retry branches into one `refreshSessionDeduped` path; [`writerTools.test.ts`](src/shared/api/__tests__/writerTools.test.ts) — JWT helper uses **`btoa`** / base64url instead of **`Buffer`** (no Node types in `tsc -b`). **Verify:** `npm run build` (pass).

**Cloudflare Workers deploy — Wrangler `assets.directory` + valid `package.json` (2026-04-04):** Cloudflare log showed **`npx wrangler versions upload`** failing with *`assets` … missing the required `directory` property*. **Fix:** [`wrangler.jsonc`](wrangler.jsonc) — set **`assets.directory`** to **`dist`** (keep **`not_found_handling`**: **`single-page-application`**). **`package.json`** was **merge-duplicated** (invalid JSON / second root object starting at a second `"name"`); restored a **single** manifest (includes **`zod`**). **Operator:** Dashboard **build** must run **`npm run build`** before Wrangler deploy so **`dist/`** exists (logs that only show `npm clean-install` then Wrangler need a build command). **Docs:** [`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`](CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md) — **D4b**, troubleshooting row, **E2** bullet; [`implementation_plan.md`](implementation_plan.md) — Wrangler static assets note. **Verify:** `npm run build`, `npm run test -- --run`.

**Cloudflare Pages — npm ci + invalid package.json (2026-04-04):** **`main`** had a **merge-corrupted `package.json`** (duplicate JSON appended; **`npm`** would **`EJSONPARSE`** — and CI can surface confusing install errors). **Fix in repo:** single valid **`package.json`**, restore **`@cloudflare/vite-plugin`** + **`wrangler`**, **`wrangler.jsonc`**, `vite.config.ts` **`cloudflare()`** plugin, **`preview`/`deploy`** scripts; **`npm install`** → updated **`package-lock.json`**. Checklist table row updated for this case. **Verify:** `npm run build`, `npm run test -- --run`; push to **`main`** and retry Cloudflare (still ensure Pages **Root directory** = repo root if you saw the lockfile-only message).

**Writers' Workshop — series create/rename + refresh fix (2026-04-02):** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — **Library → Series** shows **+ Add series** whenever Supabase is on and you already have series (not only the empty-state **Create first series**). **Issue Outline → Story context** adds **Series title** and persists it with **Save story context** via `updateWriterSeries` (`title` + `logline`); save is enabled with only a **series** selected so you can rename before picking an issue; series logline field no longer requires a selected issue. **`refreshIssuesForSeries`** is **`useCallback([selectedSeriesId])`** so ribbon **`runPacingFromRibbon` / `runCanonFromRibbon`** always call the current series refresh. [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx) — Series tooltip mentions **+ Add series**. **Verify:** `npm run test -- --run`, `npm run build`; browser — add second series; rename series on Outline tab → Save → Library list updates.

**Cloudflare Pages + implementation plan (2026-04-01):** [`implementation_plan.md`](implementation_plan.md) — new **Cloudflare Pages — production SPA (approved)** section (build output `dist`, `VITE_*` on Pages, Auth URL alignment, Edge Functions stay on Supabase); pointer to owner checklist [`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`](CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md). **JWT docs** updated to match [`supabase/config.toml`](supabase/config.toml) (`verify_jwt = false` + in-function `getUser` validation). Added [`public/_redirects`](public/_redirects) (`/*` → `/index.html` `200`) for SPA refresh on Pages. **Verify:** `npm run build` — confirm `dist/_redirects` exists.

**writer-tools refresh optimization + page beats context (2026-04-02):** [`writerTools.ts`](src/shared/api/writerTools.ts) — stop unconditional `refreshSession()` on every `invokeWriterTools` call; refresh only when the access token is expired / near-expiry (buffer window) and dedupe concurrent refresh via one in-flight promise. [`writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) — `page_beats` prompt includes a short digest of prior pages (last 2) with an explicit “do not repeat earlier pages” constraint to reduce repetitive beats across pages. **Cleanup:** removed temporary debug ingest instrumentation from `writerTools.ts` and `WriterPortal.tsx` after verification. **Verify:** `npm run test -- --run`.

**writer-tools refresh regression verification (2026-04-04):** Confirmed the reported issue is already fixed in [`invokeWriterTools`](src/shared/api/writerTools.ts): auth refresh is conditional and only runs when the token is expired / near-expiry or after a 401 retry path; fresh JWTs skip unnecessary refresh. Added targeted regression coverage in [`writerTools.test.ts`](src/shared/api/__tests__/writerTools.test.ts) for (1) fresh-token no-refresh path and (2) expired-token preflight refresh path, asserting the `Authorization` header token passed to `functions.invoke`. **Note:** `package.json` merge corruption was repaired separately; run **`npm run test -- --run`** locally (Vitest may load the Cloudflare Vite plugin — use full permissions if the sandbox blocks Wrangler log dirs).

**writer-tools refresh optimization + QA cleanup (2026-04-03):** Verified issue in [`invokeWriterTools`](src/shared/api/writerTools.ts): it refreshed auth on every call whenever `refresh_token` existed, even when `getSession()` returned a valid token. Updated flow to compute `needsRefresh` from `validateAccessTokenForEdge` and call `supabase.auth.refreshSession()` **only** when pre-check reports **expired**; malformed/wrong-issuer/anon tokens still fail fast with clear auth details, and the existing 401 refresh+retry path stays intact. Also fixed Writers lint blockers in [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) by including `refreshIssuesForSeries` in `runPacingFromRibbon` / `runCanonFromRibbon` callback deps. **Verify:** `npm run lint` (0 errors, warnings only), `npm run test` (72/72), `npm run build` (pass).

**Cloudflare Pages + implementation plan (2026-04-01):** [`implementation_plan.md`](implementation_plan.md) — new **Cloudflare Pages — production SPA (approved)** section (build output `dist`, `VITE_*` on Pages, Auth URL alignment, Edge Functions stay on Supabase); pointer to owner checklist [`CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`](CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md). **JWT docs** updated to match [`supabase/config.toml`](supabase/config.toml) (`verify_jwt = false` + in-function `getUser` validation). Added [`public/_redirects`](public/_redirects) (`/*` → `/index.html` `200`) for SPA refresh on Pages. **Verify:** `npm run build` — confirm `dist/_redirects` exists.

**writer-tools 401 — refresh + JWT checks (2026-03-31):** [`writerTools.ts`](src/shared/api/writerTools.ts) — `refreshSession()` **before** each `writer-tools` call when a refresh token exists (stale `access_token` in localStorage often still “looks fine” but the Edge gateway returns **401**). On **401**, one automatic **refresh + retry**. Decode JWT payload to catch **`role: anon`** or **`iss`** mismatch vs `VITE_SUPABASE_URL` (wrong project / leftover storage) with an explicit **details** string. **Verify:** `npm run test -- --run`, `npm run build`; sign in → Generate page beats.

**writer-tools 401 — user JWT on invoke (2026-03-31):** [`writerTools.ts`](src/shared/api/writerTools.ts) — before **`functions.invoke('writer-tools')`**, load **`auth.getSession()`**; if there is no **`access_token`**, return the existing sign-in hint (do not call the function with the SDK’s anon-key fallback). If the session expires within **~2 minutes**, **`refreshSession()`** first. Pass **`headers: { Authorization: \`Bearer ${accessToken}\` }`** so the Edge gateway always receives a **user** JWT when the app has a session (Supabase’s internal fetch otherwise uses **`Bearer <anon>`** when session is missing, which **`verify_jwt`** rejects as **401**). **Verify:** `npm run test -- --run`, `npm run build`; browser — sign in → Network **`writer-tools`** request **`Authorization`** is a long JWT (not the short anon key).

**Supabase Auth in-app + deploy docs (2026-03-31):** [`AuthContext.tsx`](src/shared/context/AuthContext.tsx) + [`AuthModal.tsx`](src/components/auth/AuthModal.tsx) — email/password **sign-in** and **sign-up** (email-confirmation message when applicable). [`main.tsx`](src/main.tsx) wraps **`AuthProvider`** (inside `ThemeProvider`). [`AppShell.tsx`](src/components/layout/AppShell.tsx) — sidebar bottom **Sign in** / **initials + Sign out**; placeholder when Supabase env unset. [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — **`useAuth()`**; amber banner **Sign in here** opens the same modal. [`.env.example`](.env.example) — Auth URL notes. [`implementation_plan.md`](implementation_plan.md) — **Phase 6e** + **Deploy writer-tools** checklist adds **`db push`** step and **Dashboard → Authentication** (Site URL, redirect URLs, Email provider) aligned with **`verify_jwt`**. **Verify:** `npm run test -- --run`, `npm run build`; browser — Sign in modal, session persists, writer-tools after login.

**Writers' Workshop — auth banner + writer-tools errors (2026-03-31):** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — when **Supabase env** is configured but **`getSession()` has no user**, a **dismissible** amber bar explains that **writer-tools** needs a **JWT**; **Help → Setup** opens the setup category modal; dismissing is per session until the user signs in (then the banner hides and dismiss resets). [`writerTools.ts`](src/shared/api/writerTools.ts) — **401/403** from the Edge Function returns an explicit **sign in / session expired** message (JSON body still preferred when present). [`implementation_plan.md`](implementation_plan.md) — Writers **Phase 6c/6d**; Phase 1/2/5 wording uses **Library dock** / **Activity** instead of legacy sidebar/rail. **Verify:** `npm run test -- --run`, `npm run build`; browser — configured Supabase, no login → banner; with session → no banner.

**Writers' Workshop — Help registry + section tooltips (2026-03-31):** Single source for ribbon/dock copy in [`writerHelpRegistry.tsx`](src/portals/writer/writerHelpRegistry.tsx) (`WRITER_UI_TIPS`, categorized **`WriterHelpCategoryBody`**, **`WriterSectionTip`**). [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) opens help by **`WriterHelpCategoryId`** (`helpCategory` / `onOpenHelpCategory`); **Series** header uses contextual tooltip (Supabase / empty / loaded); **Pages** + **Issues** use registry tips; **dock** shortcuts panel points to ribbon **Help**; **Issue Outline** when Supabase is off: short amber line + **ℹ** with full setup text; **Latest saved outline**, **Beats**, **Dialogue**, **Arc**, **Video**, and **Review output** use **ℹ** tooltips instead of long lead paragraphs; **beatsNeedPage** for empty-page prompts. [`WriterRibbon.tsx`](src/portals/writer/WriterRibbon.tsx): category tiles render Lucide icons without **`strokeWidth`** on the narrowed `CatIcon` type (fixes `tsc`). **Verify:** `npm run build`; browser — Ribbon → Help opens category modals; workspace tabs show **ℹ** help.

**Writers' Workshop — Help ribbon + cleaner chrome (2026-03-31):** Removed the **status strip** between header and ribbon (Ready / AI disabled / env hints). **Issue Outline** no longer shows the long **workflow** card, **Step 1** callout, or **Outline / AI tools** card — that copy lives under **Ribbon → Help** (topics as buttons) opening a **modal** ([`WriterHelpModal.tsx`](src/portals/writer/WriterHelpModal.tsx), [`writerHelpContent.tsx`](src/portals/writer/writerHelpContent.tsx)). **[`WriterRibbon.tsx`](src/portals/writer/WriterRibbon.tsx):** **Help** tab with `HelpCircle` icon. **Library → Issues:** inline hint replaced by **tooltip** on info icon next to **Issues**. Collapsed dock hint is a small **tooltip** button (`HelpCircle`) instead of an amber banner. **Verify:** browser — no gold status band under title; Help opens modals; Issues ℹ️ tooltip; outline tab is mostly forms + preview.

**Writers' Workshop — center column + outline preview (2026-03-31):** [`WriterContextMenu.tsx`](src/portals/writer/WriterContextMenu.tsx) — wrap main content with **`flex-1 min-h-0 min-w-0 flex-col`** so the workspace column grows and the **Library dock** no longer sits in the middle of a wide empty strip. [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — **Issue Outline** uses **`w-full min-w-0`** (drop **`max-w-4xl mx-auto`**); **`xl` grid** puts **Latest saved outline** in a **sticky, scrollable** right **aside** next to the form; outline tab title merged into the first glass card (no duplicate empty heading card). **Verify:** browser — main content fills space left of dock; on wide screens outline JSON is visible beside Story context; **`npm run build`**.

**Writers' Workshop — glass panels + scroll (2026-03-31):** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — split the center workspace into **separate frosted-glass cards** (parity with other portals) so the **Tiffany gradient** shows through; make the main workspace column **always vertically scrollable** (even when DevTools reduces viewport height) so the **Latest saved outline** block is reachable. [`WriterRibbon.tsx`](src/portals/writer/WriterRibbon.tsx) + [`WriterStudioDock.tsx`](src/portals/writer/WriterStudioDock.tsx) — subtle glass treatment for the top ribbon and right dock. [`AppShell.tsx`](src/components/layout/AppShell.tsx) + [`App.tsx`](src/App.tsx) — ensure the flex height chain is correct so Writer portal can scroll internally. **Verify:** `npm run build`; browser — Writers’ Workshop → Issue Outline → Generate outline → scroll to “Latest saved outline” with DevTools open, confirm scrollbars appear and panels look distinct.

**Writers' Workshop — Story context form (2026-03-30):** [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts) — **`updateWriterIssue`**, **`updateWriterSeries`**; [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — **Issue Outline** tab **Story context** card (issue title, synopsis, series logline) + **Save story context** before **Generate outline**. **Verify:** `npm run test -- --run`, `npm run build`; select issue → edit fields → Save → Generate outline uses saved text.

**Writers' Workshop — Library bootstrap (2026-03-31):** [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts) — **`createWriterSeries`**, **`createWriterIssue`**; [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — **Library** panel **Create first series** / **Add issue #N** when lists are empty; amber hint on **Issue Outline** when no issue selected (migration creates tables, not rows). **Verify:** empty DB → create series + issue → **Generate outline** enables.

**Writers' Workshop — Phase 6 UX (2026-03-30):** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — **ribbon** ([`WriterRibbon.tsx`](src/portals/writer/WriterRibbon.tsx)) + **right dock** Library / Activity / Shortcuts ([`WriterStudioDock.tsx`](src/portals/writer/WriterStudioDock.tsx)); **Find** + highlights ([`writerSearch.ts`](src/portals/writer/writerSearch.ts), [`WriterHighlightedText.tsx`](src/portals/writer/WriterHighlightedText.tsx)); **hotkeys** ([`useWriterHotkeys.ts`](src/portals/writer/useWriterHotkeys.ts)); **context menu** ([`WriterContextMenu.tsx`](src/portals/writer/WriterContextMenu.tsx)). **Arc** tab: pacing + canon shown in one **Review output** block via [`formatArcReviewPlainText`](src/portals/writer/writerSearch.ts) so Find matches the visible text. **Fix:** `WriterRibbon` uses Lucide **`PanelRight`** (build: `LayoutPanelRight` missing). **Verify:** `npm run test -- --run`, `npm run build`; browser — dock, Find next/prev, ⌘1–5, context menu.

**Writers' Workshop — Phase 5 slice (2026-03-30):** [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — **Arc Planner** adds scrollable **issue spine** chips; **Video** adds **Download shot plan CSV** ([`shotPlanCsv.ts`](src/portals/writer/shotPlanCsv.ts)) and [`WriterShotStoryboardStrip`](src/portals/writer/WriterShotStoryboardStrip.tsx) (Konva frames per shot). Tests: [`shotPlanCsv.test.ts`](src/portals/writer/__tests__/shotPlanCsv.test.ts). **Verify:** `npm run test -- --run`, `npm run build`.

**Writers' Workshop — Phase 3–4 (2026-03-29):** Edge [`writer-tools`](supabase/functions/writer-tools/index.ts) adds **`pacing_review`** and **`canon_check`** (saved under `writer_issues.notes.writer_tool_cache`), and **`plan_shots_from_issue`** → `writer_video_shot_plans`. Client: [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts) — `notes` on issues, `listWriterShotPlansForIssue`; [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — **Arc Planner** + **Video** tabs, JSON downloads, Konva placeholder. **Verify:** `npm run test -- --run`, `npm run build`; **`supabase functions deploy writer-tools`**.

**Writers' Workshop — Phase 2 (2026-03-29):** Edge [`writer-tools`](supabase/functions/writer-tools/index.ts) adds **`page_beats`** and **`draft_dialogue`** (Gemini → `writer_pages.beats_json` / `script_text`). Client [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts) loads those columns; [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx) — click a page in the tree, **Page Beats** / **Dialogue** tabs invoke tools and refetch. Tests in [`schemas.test.ts`](src/shared/writer/__tests__/schemas.test.ts). **Verify:** `npm run test -- --run`, `npm run build`; redeploy **`supabase functions deploy writer-tools`** after pulling.

**Writers' Workshop — Phase 0–1 (2026-03-29):** Migration [`supabase/migrations/20260329000000_writer_room.sql`](supabase/migrations/20260329000000_writer_room.sql) adds `writer_*` tables. Portal [`WriterPortal.tsx`](src/portals/writer/WriterPortal.tsx): Tiffany workspace + gold header, series/issues/pages tree, tabs; **Issue Outline** tab calls [`invokeWriterTools`](src/shared/api/writerTools.ts) → Edge Function [`supabase/functions/writer-tools/index.ts`](supabase/functions/writer-tools/index.ts) (`outline_issue`, **Gemini** `generateContent` + JSON MIME, Zod via [`src/shared/writer/schemas.ts`](src/shared/writer/schemas.ts) + Deno copy [`_shared/writerSchemas.ts`](supabase/functions/_shared/writerSchemas.ts)). Reads: [`arcsWriterRoom.ts`](src/shared/api/arcsWriterRoom.ts). **Deploy:** `supabase secrets set GEMINI_API_KEY=...` (same key as `VITE_GEMINI_API_KEY`), optional `GEMINI_MODEL` (default `gemini-3-flash-preview`; fallbacks include `gemini-3.1-flash-lite-preview`, `gemini-3.1-pro-preview`), `supabase functions deploy writer-tools` from repo root after `supabase login` + `supabase link`; apply migration. **Auth:** `verify_jwt` is on — call `invoke` only with a logged-in Supabase session (anon key + user JWT). **Verify:** `npm run test -- --run`, `npm run build`; browser — Writers' Workshop → pick issue → Generate outline (needs live Supabase + function + key).

**Character Studio frame sizes (2026-03-28, updated 2026-04-17):** **Live + one pose** tiles use fixed **280×497px** (`dualSlotFrameStyle` in [`CharacterStudio.tsx`](src/portals/CharacterStudio.tsx)) with **`maxWidth: 100%`** and **`flex-wrap`** so narrow panes wrap instead of squashing. **Reference hub** slots are **60×106px**; **more poses** strip thumbs match **60×106**. **Verify:** `npm run build`; browser — REFERENCE CHARACTER STUDIO hub + workspace row.

**Studio 60/40 + unified workspace (2026-03-28):** Character and Asset studios use **60% left / 40% right** (`flex-[0_0_60%]` / `flex-[0_0_40%]`). **Reference hub:** removed bulk “add to next empty slots” row; **Clear all** / **Paste first empty** sit on the **focused slot** row with Upload / Archive / Clear. **Live Prompt:** title-only header; **Copy**, **Refresh** (Prompt tab when pinned), **Reset to tags**, **Pin**, **Last prompt**, compact **Model** select, and lock (**DNA LOCK** / **ARCH LOCK**) share one **bottom bar**; model removed from Edit body. **Right column:** single **workspace** card — **large preview** on top, **scrollable** middle (Character: session summary + recents + pose grid + age/aspect/camera as compact strips or scroll; Asset: session + recents + Room/Urban/Time/Aspect/Camera in scroll), **bottom tool strips** (thumbnails + Compare; generation/save actions; Character adds framing strip). **Files:** `CharacterStudio.tsx`, `AssetsStudio.tsx`. **Verify:** `npm run build`; browser — split, merged panel, prompt footer, hub row.

**Studio 40/60 split + viewport lock (2026-03-28):** Superseded by **60/40 + unified workspace** above; viewport lock in [`App.tsx`](src/App.tsx) / [`AppShell.tsx`](src/components/layout/AppShell.tsx) unchanged.

**Character compare preview — pillarboxing fix (2026-03-28):** Compare/single frames again use **`height` = `maxHeight`** in [`studioPreviewFrameStyle`](src/shared/utils/studioPreviewLayout.ts) so the **9:16 / 1:1 / 21:9** box has a real size. Image layer is **`absolute inset-0`** (no `w-full`/`h-full` filling a wide flex column), so **`object-contain`** fills the frame without spurious **side bars** or vertical clipping. Compare portrait cap **76vh**. **Verify:** Character Studio, Compare on, Portrait.

**Character Reference Image Generation — preview / compare / hover (2026-03-28):** [`studioPreviewFrameStyle`](src/shared/utils/studioPreviewLayout.ts) now sets **`maxHeight` + `aspectRatio` + `height: auto`** (no duplicate fixed `height`) so the frame tracks portrait/square/cinematic without stretching wide. **Compare** uses **`lg:flex-row`**, each pane **`lg:max-w-[min(100%,calc(50%-0.5rem))]`**, and slightly lower compare **`max-height`**. Hover zoom scales an **inner** `flex` wrapper at **1.12** with `cursor-zoom-in`; overlays use **`z-20`**. Preview column **`overflow-y-auto overflow-x-hidden`** and extra bottom padding. **Verify:** `npm run test -- --run`, `npm run build`; Character Studio — single + compare + hover.

**Phase 2 preview panes (2026-03-27):** Added [`studioPreviewLayout.ts`](src/shared/utils/studioPreviewLayout.ts) for shared **CSS aspect + max-height** tuning. **Character Studio** Reference Image Generation: **xl+** two-column layout (scrollable left: density, Compare, recent/session; right: large **`object-contain`** preview) with preview frame following **gallery aspect ratio** (9:16 / 1:1 / 21:9). Compare split stacks on narrow viewports (`md:flex-row`). **Asset Studio** matches with **Compare** = first populated reference slot vs live generated image; preview uses **effective** output aspect. **Storyline Generic Image Lab**: **lg+** split — prompts/refs/controls in a capped-width column, **Large preview** column with aspect-aware frame and empty-state placeholder. **Verify:** `npm run test -- --run`, `npm run build`.

**Onyx Edit without password + Phase 2 plan (2026-03-27):** Character and Asset studios no longer gate **Live Prompt → Edit** (or Asset sidebar **The Onyx Vault**) on a vault password. **Model** and **raw prompt override** are always available; **tags** still compile the prompt when the override is empty. [`buildCharacterStudioPromptForApi`](src/shared/utils/buildCharacterStudioPromptForApi.ts) uses a non-empty `vaultPromptOverride` as the compiled base (no `vaultUnlocked`). **`isVaultOverride`** for image generation follows non-empty override text in both studios. **`implementation_plan.md`:** new **Phase 2 — Studio preview and compare** (large portrait/landscape preview, options A/B, recommended responsive hybrid). **`tasks.md`:** Phase 2 checklist (planned). **Verify:** `npm run test -- --run src/shared/utils/__tests__/buildCharacterStudioPromptForApi.test.ts`, `npm run build`; manual — Edit tab opens without password; empty override → tag path; filled override → generation uses override.

**Character Studio gallery → prompt + refs (2026-03-26, updated):** [`buildCharacterStudioPromptForApi`](src/shared/utils/buildCharacterStudioPromptForApi.ts) **merges the live preview URL** into the 14 API reference slots when it is missing from the grid (first empty slot, or slot 0 if every slot is full), so selecting a **pose with an image** affects generation the same way as filling refs on the left. **Session framing** includes output aspect, age (with an explicit **neutral** line at slider 0), named pose labels, and an extra line for **unnamed** active gallery poses (`selectedGalleryPoseActive`). UI labels: **Generate image** (main API), **Alternate pose**, **Add empty pose card**, **Run again (same settings)**. Save dialog: **Enter** submits when focus is outside inputs; **Escape** cancels. [`ArchiveRecallModal`](src/components/ui/ArchiveRecallModal.tsx): **Escape** closes. **Verify:** `npm run test -- --run src/shared/utils/__tests__/buildCharacterStudioPromptForApi.test.ts`, `npm run build`; Reference prompt tab should list `Session framing:` and reflect gallery controls.

**Storyline row layout + horizontal preview (2026-03-26):** Reflowed [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx) into **three stacked rows**: (1) story, director settings, and production cast/assets in a full-width grid with readable cleaned-story text; (2) beat timeline next to a **Selected frame preview** that respects the selected beat’s **aspect ratio** (comfortable **21:9** viewing); timeline cards use **per-beat aspect** and wider cards for cinematic beats, with hover zoom matching that aspect; (3) **Beat detail** and **Image Lab** side-by-side on wide screens. [`GenericImageLabPanel.tsx`](src/portals/storyline/GenericImageLabPanel.tsx) result preview uses the lab’s aspect ratio (not a fixed 9:16 crop). **`implementation_plan.md`** includes Phase **1e** and a **Comic layers/objects** appendix. **Verify:** `npm run build`; manual Storyline — switch aspect on a beat, confirm preview and timeline thumb update.

**Storyline Generic Image Lab (2026-03-26):** Added an “Image Lab” panel inside [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx) for general image creation: upload images (file picker), paste from clipboard, and optionally refine the prompt with Gemini (AI prompt helper). Generation uses the same `generateImage` pipeline with reference slots + per-lab aspect ratio, and then you can `Use as selected beat image` or `Create new B-roll beat`. Also added reference-slot packing fix so linked assets land in composition/background slots via [`buildStorylineReferenceSlots`](src/portals/storyline/buildStorylineReferenceSlots.ts). **Verify:** `npm run test -- --run src/portals/storyline/__tests__/storylineHelpers.test.ts src/shared/utils/__tests__/storySequencePayload.test.ts` and `npm run build`.

**Storyline asset links + quality pass (2026-03-26):** Added **Production assets** to Storyline (left panel, Asset Vault picker) and per-beat **Asset links for this beat** checkboxes, parallel to cast links. Beat generation now composes reference slots from **linked cast first + linked assets second** via [`buildStorylineReferenceSlots`](src/portals/storyline/buildStorylineReferenceSlots.ts). Added `linkedVaultAssetIds` and `productionAssets` to storyline state/types/persist ([`storylineTypes.ts`](src/portals/storyline/storylineTypes.ts), [`storylineStudioStore.ts`](src/stores/storylineStudioStore.ts)); story export payload now includes asset links and production assets ([`storySequencePayload.ts`](src/shared/utils/storySequencePayload.ts), [`arcsPersistence.ts`](src/shared/api/arcsPersistence.ts)). To address blur/distortion, Storyline beat generation now uses Gemini image **`pro`** model. **Verify:** `npm run test -- --run src/portals/storyline/__tests__/storylineHelpers.test.ts src/shared/utils/__tests__/storySequencePayload.test.ts`, `npm run build`.

**Storyline UX follow-up (2026-03-26):** Added **manual cast linking per beat** in [`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx) (right-panel checkboxes under “Cast links for this beat”), so you can explicitly include/exclude characters for a frame. Updated beat generation to pass reference slots from **linked cast only** (no automatic “all cast” fallback when nothing is linked), reducing unintended character insertion. Added **hover zoom preview** on timeline beat thumbnails for easier visual inspection. Added **per-beat aspect ratio** controls (`9:16`, `1:1`, `21:9`) in beat detail; stored on each beat and passed to `generateImage`. Beat schema/persistence updated in [`storylineTypes.ts`](src/portals/storyline/storylineTypes.ts), [`storylineStudioStore.ts`](src/stores/storylineStudioStore.ts), and story export payload in [`storySequencePayload.ts`](src/shared/utils/storySequencePayload.ts). **Verify:** `npm run test -- --run src/shared/utils/__tests__/storySequencePayload.test.ts src/portals/storyline/__tests__/storylineHelpers.test.ts`, `npm run build`.

**Storyline Studio — Master Director (2026-03-25):** Replaced the mock Photo Lab with a full **Storyline Studio** portal ([`StorylineStudio.tsx`](src/portals/storyline/StorylineStudio.tsx), still lazy-loaded as [`PhotoLab`](src/portals/PhotoLab.tsx)). **Layout:** left panel (story textarea, Script Doctor + Plan beats, beat interval, director toggles, production cast from Image Vault), center (horizontal beat timeline with B-roll `+` menu, Gemstone Pulse on generate), right (selected beat fields, generate/redo, interpolation readout). **State:** [`storylineStudioStore`](src/stores/storylineStudioStore.ts) persist key `arcs-storyline-studio` (beats omit `data:`/`blob:` images; http(s) URLs only). **AI:** [`geminiTextApi`](src/shared/api/geminiTextApi.ts) (Gemini 3 preview stack for text + JSON) + [`storylineDirectorPrompts`](src/data/storylineDirectorPrompts.ts); per-beat [`generateImage`](src/shared/api/geminiImageApi.ts). **Tokens:** `STORYLINE_DIRECTOR_BG`, `STORYLINE_MAGENTA_TEXT`, `GEM_MAGENTA` in [`Phase12DesignTokens.ts`](src/shared/theme/Phase12DesignTokens.ts). **Shortcuts:** ⌘/Ctrl+Enter in story field → Script Doctor; else → generate selected beat; Esc closes modals; timeline focus → arrows/Home/End. **Character Studio:** [`systemPrompts.ts`](src/data/systemPrompts.ts) and [`characterStudioPrompt.ts`](src/shared/utils/characterStudioPrompt.ts) no longer prioritize specific ethnicities; [`character_studio_spec.ts`](src/data/character_studio_spec.ts) renames `African American` / `Black Latino`; [`characterStudioStore`](src/stores/characterStudioStore.ts) merge migrates legacy heritage strings. **App:** `lab` portal theme → `purple`. **Vault + promote (Phase 1b):** [`saveStorySequenceToAssetsVault`](src/shared/api/arcsPersistence.ts) writes `assets` with `metadata_tags.story_sequence_v1` + `source: arcs_storyline_studio`; payload builder [`storySequencePayload.ts`](src/shared/utils/storySequencePayload.ts). **Save to Vault** modal (new vs existing collection, matches Assets Studio). **[`studioImportBridge`](src/stores/studioImportBridge.ts):** Storyline **Open in Character/Assets Studio** → [`App.tsx`](src/App.tsx) switches portal; [`CharacterStudio.tsx`](src/portals/CharacterStudio.tsx) / [`AssetsStudio.tsx`](src/portals/AssetsStudio.tsx) consume import on mount (`queueMicrotask` clear for Strict Mode). **Verify:** `npm run test -- --run`, `npm run build`; manual Storyline flow + vault save + promote.

**Spatial expansion UX (2026-03-21):** When **Onyx Vault / Refine** overrides the prompt, the compiled prompt now still appends **Spatial expansion** (Room / Urban / Time) and **Output aspect ratio** so the right panel affects **Generate Asset** and matches the live preview. **Expand Setting** skips a duplicate `spatial expansion:` clause when the base prompt already includes one. Short helper copy under **Spatial Expansion Gallery** explains **Expand Setting** (new shot from live preview) vs **Generate Asset** (full prompt + references, often a variation). **Files:** `AssetsStudio.tsx`.

**Asset toolbar tooltips (2026-03-21):** Radix **Tooltip** (`variant="asset"`) on seed mode, **Generate Asset**, **Generate again**, **Undo**, **Save New Asset**, **Expand Setting**, **Add to Library**, **Cast in Story**; optional `tooltip` on **Chip** for spatial gallery (Room/Urban/Time, aspect, camera). **Files:** `AssetsStudio.tsx`.

**Archive refs + Character generate (2026-03-21):** Archive picks often arrive as `data:` while `urlToBase64` can still hit a **`blob:`** reference—stale **`blob:`** URLs restored from persisted studio state (invalid after reload) in other slots. **Fix:** `merge` + `partialize` strip `blob:` from `referenceImageUrls` in **character** and **asset** stores; **`generateImage`** wraps the API `fetch` in try/catch so failures return `{ ok: false }` instead of leaving the UI stuck in **pending**; **CharacterStudio** generate / alternate / refine handlers use try/catch. **Verify:** hard refresh once, pick archive ref, generate. **Files:** `characterStudioStore.ts`, `assetStudioStore.ts`, `geminiImageApi.ts`, `CharacterStudio.tsx`.

**Character Studio Panel UX (2026-03-25):** Implemented the “Character Studio Panel UX” plan to reduce wasted space and improve reference/tag/prompt workflows. **Reference images:** per-slot Upload/Archive are now icon buttons, hover preview is larger, and the last slot group label reads **Background/Setting** (formerly “Atmospheric DNA”). **Archive recall modal:** selected frame now has a stronger highlight via a new `selectedUrl` prop. **Tags & Style:** new **Facial Expressions** section (preset + custom add/remove; click-off supported) and removed left-side Cinematic `angle` chips so the right panel is canonical. **Live Prompt:** added a new `Reference Prompt` tab (read-only generate prompt), added Copy + Reset controls across tabs, and a Prompt-tab Refresh button. **Onyx Vault:** left-panel unlock removed; unlock/edit UI is gated behind `VITE_ENABLE_ONYX_VAULT` and vault overrides are ignored when disabled. **Reference Image Generation:** added inline Compare split view (Reference vs Generated) and stronger hover zoom. **Files:** `CharacterStudio.tsx`, `characterStudioStore.ts`, `character_studio_spec.ts`, `buildCharacterStudioPromptForApi.ts`, `referenceSlots.ts`, `ArchiveRecallModal.tsx`. **Verify:** `npm run test`, `npm run lint` (warnings only), `npm run build`, and manual browser smoke test (tabs/buttons/icons/compare toggle present and functional).

**Character Studio reference toolbar + gallery light table (2026-03-25):** Follow-up UX from recommendations. **Reference images:** DNA groups are **accordions** (one expanded at a time; focusing a slot auto-expands its group). Per-slot Upload/Archive rows are replaced by a **shared toolbar** (Upload / Archive / Clear) for the **focused** slot; thumbnails are slightly larger with focus ring; quick **×** remains on hover. **Reference Gallery:** **session summary chips** (pose, aspect, camera, age), **taller pose cards** with `min-h`/`max-h` tuned for a light-table feel, **empty state** when there are no poses, and per-pose actions **Duplicate**, **send to first empty reference slot** (`ImagePlus`), **open in new tab**, plus existing delete. **Files:** `CharacterStudio.tsx`. **Verify:** `npm run test -- --run`; `npm run build`; browser — focus slots + toolbar, accordion groups, pose actions, full-slot error message.

**Generate stuck on status rotation (2026-03-21):** If **`await fetch`** or **`await res.json()`** never completes, `generationStatus` stays **`pending`** and status breadcrumbs loop forever. **Fix:** **`fetchWithTimeout`** (AbortController) for reference URLs and Gemini POST; **`readResponseJsonWithTimeout`** for the response body; user-facing timeout messages. **Files:** `geminiImageApi.ts`.

**Character-only “infinite working” (2026-03-21):** Symptoms matched the main thread **never reaching** `generateImage` (e.g. **synchronous** multi‑MB **`JSON.stringify`** on every Zustand persist `setState`, which Character pays more often due to **poses + refs**). **Fix:** Omit oversized **`data:`** reference URLs and **`data:`/`blob:`** pose **`imageUrl`** from **persisted** JSON only (RAM unchanged); use **`useCharacterStudioStore.getState()`** when building refs so the handler is not stuck on a stale **`referenceImageUrls` slice**; treat **`refUrlsForApi.some(Boolean)`** as “has refs”; add **unexpected-result** error branch. **Files:** `characterStudioStore.ts`, `CharacterStudio.tsx`, `assetStudioStore.ts` (same data-URL persist cap).

**Asset Reference Studio alignment (2026-03-21):** Environment-first **14-slot** groups (site/exterior, interior/spatial, materials/finishes, light/atmosphere) in UI and Gemini reference labels; **Architectural Lock** is the only tag fade; removed **Diversify Style**; **Save as Tag** rows on Era, Location, and Architectural Detail; generate/expand use [`assetGenerationPromptWrappers`](src/shared/utils/assetGenerationPromptWrappers.ts) + asset surgical lines + default no-people/no-animals unless **Onyx vault** override; [`asset_tag_library.json`](src/data/asset_tag_library.json) and [`asset_studio_spec.ts`](src/data/asset_studio_spec.ts) retuned for settings/locations. **Verify:** `npm run test -- --run`; `npm run build`.

High-level narrative of where the project is and where it's going. For checklists and technical steps, see **tasks.md** and **implementation_plan.md**.

**Cursor:** Implementation plans and to-dos are in `.cursor/plans/`; agents can use them via Plan Mode. Use Review → Find Issues and Source Control → Agent Review to validate changes. Docs: [Planning](https://docs.cursor.com/agent/planning), [Review](https://cursor.com/docs/agent/review).

**Studio UX refinement (2026-03-15):** See `docs/plans/2026-03-15-studio-ux-refinement-and-polish.md`. **Verify:** `npm run build`; in Character Studio and Asset Studio test Reference panel (per-slot only, Clear all, Paste), Live Prompt tabs (Prompt / Edit / Refine), Refine with live image, ⌘+Enter generate, Undo last gen, gallery density. **Files:** `geminiImageApi.ts`, `characterStudioStore.ts`, `assetStudioStore.ts`, `Tooltip.tsx` (`PinnedHelpTooltip`), `CharacterStudio.tsx`, `AssetsStudio.tsx`.

**Character Archive thumbnail framing (2026-03-16):** Per-card **Framing** opens a modal: **click-drag to pan** focal (no snap-to-cursor); scale slider; Save writes **`metadata_tags.archive_thumbnail`** `{x,y,scale}` on Supabase (no extra columns / schema-cache issues). **localStorage** archive still uses `thumbnailFocus` on `StoredGeneration`. Optional migration `20260316000000_character_thumbnail_focus.sql` unused by app. **Files:** `ArchiveThumbnailFocusModal.tsx`, `CinematicGallery.tsx`, `arcsArchive.ts`, `arcsPersistence.ts`.

**Imported image → Supabase (2026-03-18):** `saveCharacterToDb` / `saveAssetToDb` only uploaded **`data:`** URLs to Storage; **imported** live images use **`blob:`** URLs (`URL.createObjectURL`), which were written to `image_url` and broke after refresh. **`arcsPersistence.ts`** now runs **`ensurePersistentImageUrl`**: uploads both **`data:`** and **`blob:`** to `arcs-generations`, stores the public URL. **`VaultImageWithFallback`** (`VaultImageWithFallback.tsx`) used in Character/Asset vault grids + modals shows an **Image unavailable** placeholder when a URL fails (e.g. legacy `blob:` rows).

**Storage upload hardening (2026-03-19):** If Storage upload still fails, the app **no longer inserts** a `blob:` URL into Postgres (that always breaks after refresh). Save returns a clear error pointing at bucket **`arcs-generations`** and policies. **Studios** only call `saveGeneration` / session cache **after** a successful DB save so the local archive gets the **public** URL, not the ephemeral `blob:`. New migration: `supabase/migrations/20260319000000_arcs_generations_storage_bucket.sql` (creates bucket + read/insert policies). **Repair:** delete or re-save rows whose `image_url` still starts with `blob:`.

**Image Vault framing (2026-03-19):** Brought back per-image thumbnail **Framing** (focus + zoom) inside the **Image Vault** for both **Characters** and **Assets**. Vault cover cards and modal grids now render `metadata_tags.archive_thumbnail` as `object-position` + `scale`, and both modals expose a **Framing…** action that reuses `ArchiveThumbnailFocusModal` (now supports `context: 'character' | 'asset'`). Asset vault loader now maps `assets.metadata_tags.archive_thumbnail` into `thumbnail_focus_*` fields (and local asset generations support `thumbnailFocus`). **Files:** `ArchiveThumbnailFocusModal.tsx`, `ProfileVaultModal.tsx`, `CollectionVaultModal.tsx`, `CharacterVault.tsx`, `AssetVault.tsx`, `arcsAssetVault.ts`, `generationOutputRouter.ts`. **Verify:** open Image Vault → Characters → open a profile → Framing… → Save → refresh vault (or hard reload) and confirm the same framing persists; repeat for Assets.

**Navigation (2026-03-18):** Removed redundant **Comics & Story Archive** portal (`related`): deleted `RelatedAlbum.tsx` and `temp_related_album.html`; dropped `related` from `Portal` type, `App.tsx`, `AppShell` nav, `portals-prefetch.ts`, and Overview grid card. Main menu + landing **Character Archive** label renamed to **Image Vault**. `ReferenceAlbum` tabs relabeled **Characters** / **Assets**.

**Character Vault Foundation — Ruby & Gold Edition (2026-03-18):** Character Archive is being refactored into an album-based **Vault**.

- **UI**: New Ruby/Gold Vault chrome (deep ruby diagonal gradient, gold gradient dividers, gold icon/button logic) with album cover cards per `profile_name`.
- **Album logic**: `profile_name` groups all images; Vault grid shows one **Profile Cover** card per group. Clicking opens a modal that displays all images for that profile.
- **Cover selection**: Each image in the modal has a Ruby-encrusted star toggle. When selected, it becomes the profile cover (single source of truth).
- **Persistence**:
  - **Supabase**: `public.characters.is_profile_cover boolean default false` with a partial index by `profile_name` where cover is true; cover selection uses “swap” semantics (clear all covers for the profile, then set the clicked row true).
  - **Offline**: localStorage fallback key `arcs_cover_${profileName}` stores the chosen id; if none exists, fall back to newest item.

**Files added/updated:**

- **Migration**: `supabase/migrations/20260318000000_arcs_profile_covers.sql`
- **Repository helper**: `src/shared/api/arcsVault.ts` (+ unit tests `src/shared/api/__tests__/arcsVault.test.ts`)
- **Vault UI**: `src/components/ui/CharacterVault.tsx`, `src/components/ui/ProfileVaultModal.tsx`
- **Portal wiring**: `src/portals/ReferenceAlbum.tsx` now uses `CharacterVault` for the character tab (Asset Archive unchanged)

**Verification (automated):**

- `npm run test -- src/shared/api/__tests__/arcsVault.test.ts` (cover selection fallback tests)
- `npm run build` (TypeScript + Vite production build)
- `npm run lint` (now advisory; warnings only)

**Manual smoke test (pending):**

- Open **Character Archive** → confirm Ruby/Gold Vault renders and shows one card per profile.
- Click a profile → modal opens; click star on an image → “Saving to Vault…” appears and cover updates.
- Refresh page → cover persists (Supabase when configured, local fallback otherwise).

**Regression fix (2026-03-18):** If Supabase env vars are present but the `characters` table returns **zero rows** (or query fails), Vault now **falls back to localStorage** so previously saved local archives don’t appear “deleted.” File: `src/shared/api/arcsVault.ts`.

**Vault toolbars (2026-03-18):** Character **Profile Vault** modal adds **Rename profile**, **Delete album**, **Refresh**, per-image **Move to profile** (merge confirmation + “Don’t ask again” in `arcs_vault_merge_confirm_skip`), **last image** warning, **Edit cast name**, **Delete image**. Grid: **Search profiles**, **Refresh vault**. Asset tab uses **Asset Vault** (amethyst grid) + **Collection Vault** modal with the same patterns (merge skip key `arcs_asset_vault_merge_confirm_skip`). **API:** `arcsVault.ts` (rename/move/delete/cast), `arcsAssetVault.ts`, local mutations in `generationOutputRouter.ts`. **Verify:** rename/move/delete on Supabase and local-only archives; merge dialog when moving into an existing album.

**Character studio save-as-existing (2026-03-19):** `CharacterStudio` “Save Edited Profile” modal now loads existing `profile_name` options from `arcsVault.getCharacterAlbums()`, provides a type-to-search dropdown, and enables **Save** only when the typed value matches an existing option (case-insensitive exact match). Selecting `"Unnamed"` maps to `NULL` `profile_name` for Supabase inserts (and enables the same vault fallback behavior offline). **File:** `src/portals/CharacterStudio.tsx`. **Verify:** open modal, type an existing name to enable Save; type a non-existing name keeps Save disabled; confirm `"Unnamed"` works.

**Asset studio save-as-existing (2026-03-19):** `AssetsStudio` “Add to Library” modal now loads existing `collection_name` options from `arcsAssetVault.getAssetAlbums()`, provides a type-to-search dropdown, and enables **Save** only when the typed value matches an existing option (case-insensitive exact match). Selecting `"Unnamed"` maps to `NULL` `collection_name` for Supabase inserts. **File:** `src/portals/AssetsStudio.tsx`. **Verify:** open Add to Library, type an existing collection to enable Save; type a non-existing value keeps Save disabled; confirm `"Unnamed"` works.

**Studio seed + trash (2026-03-18):** **Randomized** is the default seed mode (new seed per generate / alternate / refine / expand). Users can switch to **Locked** to reuse the current seed. **Trash** on the live image (Character + Asset Studio, including zoom modal) removes that image from **Recent** generations and the in-memory **This session** strip, and revokes `blob:` object URLs. **Files:** `generationSeed.ts`, `characterStudioStore.ts`, `assetStudioStore.ts`, `CharacterStudio.tsx`, `AssetsStudio.tsx`, `recentGenerations.ts` (`removeRecentByImageUrl`), `generationSessionCache.ts` (`removeCachedGenerationByUrl`). **Verify:** toggle Locked → repeated generates share seed; Randomized → seeds differ; trash removes thumbnail from Recent + session row.

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

## Illustrator’s Imageshop workflow + UX polish (2026-04-17)

### What changed

- **Portal header naming**: `StorylineStudio` header now reads **Illustrator’s Imageshop** (instead of “IMAGE WORKSHOP”).
- **NPC Vault (real)**:
  - Added a new local archive context `supporting_reference` (system prompts + localStorage routing).
  - Implemented `NpcVault` UI and wired it into Image Vault’s third tab (now truly browsable/usable).
  - Added an **NPC Vault** production lane inside Imageshop and per-beat **NPC links** (alongside cast/assets).
  - Added **Save to NPC Vault** from Beat Detail to persist a selected beat image for later reuse.
- **Discoverability**:
  - Added tooltips for Visual Prep actions to reduce “dead affordance” confusion.
- **Image Lab landscape preview**:
  - Cinematic (21:9) preview sizing adjusted so wide frames are more usable.
- **Beat Detail ergonomics**:
  - Added `datalist` suggestions for camera `shot/angle/movement` while preserving free-text typing.
- **Camera POV guidance**:
  - Added a “POV-only workflow hint” plus a one-click preset inserter to reduce identity/style drift.

### Files touched

- `src/portals/storyline/StorylineStudio.tsx`
- `src/stores/storylineStudioStore.ts`
- `src/portals/storyline/storylineTypes.ts`
- `src/portals/storyline/buildStorylineReferenceSlots.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/data/systemPrompts.ts`
- `src/shared/utils/generationOutputRouter.ts`
- `src/shared/utils/generationSessionCache.ts`
- `src/components/ui/NpcVault.tsx` (new)
- `src/portals/ReferenceAlbum.tsx`
- Tests:
  - `src/portals/storyline/__tests__/storylineHelpers.test.ts`
  - `src/shared/utils/__tests__/storySequencePayload.test.ts`

### Verification evidence

- **Lint**: `npm run lint` → **0 errors** (warnings baseline unchanged).
- **Build**: `npm run build` → **PASS**.

### Manual smoke test (recommended)

- Open **Illustrator’s Imageshop** (lab portal):
  - Add cast + assets + NPC refs.
  - Link NPC refs to a beat and generate.
  - Save a beat image to NPC Vault, then open **Image Vault → NPC Vault** and confirm it appears.

---

## Writers’ Workshop — batch dialogue + text exports (2026-04-21)

### What changed

- **Batch dialogue (chunks of 5):** In Writers’ Workshop Library → Pages multi-select actions, added **Generate dialogue (batch)** which processes the selected pages in **chunks of 5**, defaulting to **skip pages that already have dialogue**. Includes a progress label and **Cancel after this chunk**.
- **Text exports:** Added deterministic “standard text format” exports alongside JSON:
  - Outline: `.txt` and `.md`
  - Beats bundle (selected pages): `.txt` and `.md`
  - Dialogue bundle (selected pages): `.txt` and `.fountain`

### Files touched

- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerExportFormats.ts` (new)

### Verification evidence

- **Tests**: `npm run test -- --run` → **PASS**
- **Build**: `npm run build` → **PASS**

### Manual verification (still required)

- Writers’ Workshop:
  - Select all pages → run **Generate dialogue (batch)** → confirm it runs 5 at a time, and Cancel stops scheduling further chunks
  - Export Outline `.txt` + `.md`
  - Export selected beats `.txt` + `.md`
  - Export selected dialogue `.txt` + `.fountain`
  - Confirm no console errors

---

## Documentation — Master instructional manual (2026-04-23)

### What changed

- Added a repo-root master manual: **`INSTRUCTIONAL_MANUAL.md`**.
- Manual is organized **by portal** and includes cross-portal “golden path” workflows for:
  - comics
  - single illustrations
  - video planning + image generation pass

### Notes

- This complements the in-app **Portals Wiki** (Docs portal): Wiki is reference; the manual is end-to-end workflow guidance.

---

## Character Studio — Archive → Live + GPT worker archived (2026-04-25)

### What changed

- **Character Studio:** Clicking a populated **reference slot** thumbnail now also sets the **Live** frame, so Archive-picked images can be sent Live and used by **Live Prompt → Reference Prompt → Describe live image**.
- **GPT Image 2 Worker POC:** Disabled it without deleting:
  - Moved the Worker implementation to `archived/gpt-image-2-worker/`
  - Removed `"main": "worker/index.ts"` and the R2 bucket binding from `wrangler.jsonc`

### Verification

- **Unit tests:** `npm test -- --run` → PASS
- **Build:** `npm run build` → PASS

---

## Asset Studio — Live Prompt parity with Character Studio (2026-04-25)

### What changed

- Asset Studio Live Prompt now includes:
  - Tabs: **Prompt / Reference Prompt / Edit / Refine** (desktop)
  - **Reference Prompt** tab with **Describe live image** (Gemini vision) using the current **Live** frame

### Verification

- **Unit tests:** `npm test -- --run` → PASS
- **Build:** `npm run build` → PASS

---

## Image Vault — album grid last-in-row tile polish (2026-04-26)

### What changed

- Tweaked vault album card layering so the hover/focus action strip behaves consistently across grid wraps (especially cards at the **end of a row**).

### Verification

- **Tests:** `npm test -- --run` → PASS
- **Build:** `npm run build` → PASS

### Manual verification (recommended)

- Image Vault → open a profile/collection album with multiple images → resize until wrapping changes → confirm the **last tile in each row** still shows the **full icon action strip** and **bottom footer banner**.

---

## Guided Comic Flow Imageshop return header - 2026-05-05

### What changed

- Added a compact sticky Guided Comic Flow return header inside Illustrator's Imageshop when Imageshop is opened from the guided comic bridge.
- The header provides:
  - left return controls with "Back to Comic Creator", "Loaded from Guided Comic Flow", and optional page/panel context;
  - centered Imageshop title/subtitle copy;
  - right-side Save / Export entry point plus a guided send-back action only when a generated panel image can actually be returned.
- Added a bridge action for returning to the comic portal without generating or sending an image.

### Files touched

- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/stores/imageWorkshopBridge.ts`
- `src/stores/__tests__/imageWorkshopBridge.test.ts`
- `walkthrough.md`

### Implementation notes

- Guided context is detected from the existing `consumeGuidedComicHandoff()` payload and stored locally as `guidedHandoffContext` after the one-shot bridge is consumed.
- Page/panel sublabel text is derived from optional `pageNumber` and `panelNumber` on the guided handoff.
- The Back button calls `returnToGuidedComicFlow()`, which only sets `portalToOpen: 'comic'`; it does not create a guided panel return, call AI, or mutate the guided draft.
- The guided draft's originating step remains the persisted Guided Comic Flow state because the Imageshop return path only navigates back through the existing portal bridge.
- The header is not rendered when no guided handoff was consumed.

### Verification

- `npm test -- imageWorkshopBridge.test.ts` - PASS
- `npm run build` - PASS; Vite still reports the existing large `ComicPortal` chunk warning.
- `npm run lint` - PASS with 67 existing warnings in unrelated files; no lint errors.

### Outstanding issues

- No manual browser screenshot check was run in this pass.

### Risks or caveats

- The header send-back button is intentionally limited to guided Art panel handoffs with page/panel metadata and an image, because non-panel guided handoffs do not have a safe no-mutation return target for attaching an image.

### Operator follow-up

- In the browser, open Guided Comic Flow -> Art -> Generate/Replace in Imageshop and confirm the sticky header remains visible while scrolling and Back returns to Comic Creator without sending an image.

### Next steps

- None.

---

## Guided Comic Flow page navigator rail placement - 2026-05-05

### What changed

- Moved the Guided Comic Flow page navigator out of the main workflow card and into the existing right-side vertical guided navigation rail.
- The navigator now appears only on the Pages and Layout steps, below the guided step list and above the rail's lower controls.
- Replaced the former sticky horizontal main-content navigator with a compact vertical list of `Page 1`, `Page 2`, etc.
- Added active page highlighting from page button clicks and visible page detection.
- Added a compact `Show pages` / `Hide pages` toggle in the right rail.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts`
- `walkthrough.md`

### Implementation notes

- `shouldRenderGuidedPageNavigator()` centralizes the rule that the navigator only renders for `pages` or `layout` when page cards exist.
- When the navigator is hidden, only the small rail toggle remains; the vertical page list is conditionally not rendered, so it has no layout or interaction footprint.
- Page cards and layout preview articles now expose `data-guided-page-number` for active-page tracking.
- `IntersectionObserver` updates the active page as page cards/layout previews become visible; clicking a page also sets the active page before calling the existing `scrollIntoView()` jump.
- Guided draft persistence, `pageCards`, layout preview state, routing, and `ComicEditor` were left unchanged.

### Verification

- `npm test -- guidedComicPageNavigator.test.ts` - RED first because `shouldRenderGuidedPageNavigator` did not exist, then PASS after implementation.
- `npm run build` - PASS; Vite still reports the existing large `ComicPortal` chunk warning.
- `npm run lint` - PASS with 67 existing warnings in unrelated files; no lint errors.
- `git diff --check` - PASS.

### Outstanding issues

- No manual browser screenshot check was run in this pass.

### Risks or caveats

- The rail is only present at the existing `xl` breakpoint because this patch deliberately did not introduce a new navigation system or render the navigator outside the right rail.

### Operator follow-up

- In the browser, check Pages and Layout at desktop width: confirm the navigator sits in the right rail, the hidden state leaves only the small toggle, and page jumps do not overlap the editor/previews.

### Next steps

- None.

---

## Guided Comic Flow Advanced Studio access clarity - 2026-05-05

### What changed

- Kept a single global Guided Comic Flow blank-editor action in the existing right-side vertical rail: `Open blank Advanced Studio`.
- Removed duplicate blank Advanced Studio buttons from non-rail guided workflow surfaces to reduce confusion with guided page import.
- Kept the Layout page-card handoff action labeled distinctly as `Send this page to Advanced Studio`.
- Exported the Advanced Studio workflow return step list for focused verification.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/modes/comic/pages/ComicEditor.tsx`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `walkthrough.md`

### Implementation notes

- `ADVANCED_STUDIO_ACTION_LABELS.openBlank` is used only for the rail button that calls `onOpenAdvancedStudio` directly and does not request a guided layout handoff.
- `ADVANCED_STUDIO_ACTION_LABELS.sendPage` is used only inside each Layout page card and still calls `openPageInAdvancedStudio(page)`, which requests the existing guided layout handoff before opening `ComicEditor`.
- The vertical rail remains the global blank Advanced Studio access point and is scrollable so the button remains reachable even when rail content grows.
- `GUIDED_WORKFLOW_STEPS` remains the source for the Advanced Studio Workflow menu return options: Setup, Story, Pages, Visual Prep, Art, Layout, Export.
- Routing architecture, guided draft persistence, `ComicEditor` behavior, and the layout handoff bridge were preserved.

### Verification

- `npm test -- guidedComicAdvancedStudioAccess.test.ts` - RED first because the exported labels/step list did not exist, then PASS after implementation.
- `npm test -- guidedComicAdvancedStudioAccess.test.ts guidedComicPageNavigator.test.ts guidedComicLayoutBridge.test.ts` - PASS.
- `npm run build` - PASS; Vite still reports the existing large `ComicPortal` chunk warning.
- `npm run lint` - PASS with 67 existing warnings in unrelated files; no lint errors.
- `git diff --check` - PASS.

### Outstanding issues

- No manual browser screenshot check was run in this pass.

### Risks or caveats

- The global blank Advanced Studio action now intentionally lives in the existing vertical rail only, to avoid duplicate blank-editor CTAs competing with the page handoff button.

### Operator follow-up

- In the browser, confirm the rail button opens a blank Advanced Studio from several guided steps, and confirm a Layout page card's `Send this page to Advanced Studio` still imports that page content.

### Next steps

- None.

---

## Guided Comic review comments: compact navigator and resolved art images - 2026-05-05

### What changed

- Changed the right-rail page navigator buttons from `Page 1`, `Page 2`, etc. to compact numeric buttons while preserving accessible `aria-label` text like `Page 1`.
- Increased the Guided Comic Flow right rail height by moving it from `top-24` to `top-6`, making the rail use more of the available viewport height.
- Updated the selected Art step assigned-image preview to use `VaultImageWithFallback`, matching the storage URL resolver used elsewhere in the app.
- Updated Advanced Comics Studio comic panels to resolve ARCS storage URLs before passing them to `useImage`, so guided page handoff images can load in Konva panels.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts`
- `src/modes/comic/components/ComicPanel.tsx`
- `walkthrough.md`

### Implementation notes

- `getGuidedPageNavigatorButtonLabel()` now returns only the page number for the visible button label.
- The page navigator remains in the right rail only and still conditionally renders only for Pages/Layout.
- The Art step image issue came from a raw `<img>` path that bypassed the existing private `arcs-generations` signed URL resolver.
- The Advanced Studio image issue came from `ComicPanel` passing the stored raw URL directly to `useImage`; it now uses `useArcsResolvedSrc()` first.

### Verification

- `npm test -- guidedComicPageNavigator.test.ts guidedComicAdvancedStudioAccess.test.ts guidedComicLayoutBridge.test.ts` - PASS.
- `npm run build` - PASS; Vite still reports the existing large `ComicPortal` chunk warning.
- `npm run lint` - PASS with 67 existing warnings in unrelated files; no lint errors.
- `git diff --check` - PASS.
- Browser DOM check on `http://localhost:5173/`: confirmed the rail page buttons render as numeric labels, the first Layout preview image resolves to a signed `arcs-generations` URL, the selected Art image resolves to a signed `arcs-generations` URL, and opening `Send this page to Advanced Studio` produced no browser console errors.

### Outstanding issues

- Browser screenshot capture timed out in the in-app browser tool, so this pass did not attach a fresh visual screenshot.

### Risks or caveats

- Advanced Studio stores the original guided image URL in panel state, then resolves it at render time. This preserves stable draft data while allowing the current render session to use a signed display URL.

### Operator follow-up

- In the browser, visually confirm Advanced Studio panel fills now show the guided images after `Send this page to Advanced Studio`.

### Next steps

- None.

---

## Guided Imageshop header overlap fix - 2026-05-05

### What changed

- Adjusted the Guided Comic Flow return header inside Illustrator's Imageshop so the left return controls, center title, and right actions use normal wrapping layout instead of an absolutely centered title.
- Kept the compact sticky header behavior and existing guided return/send-back actions unchanged.

### Files touched

- `src/portals/storyline/GenericImageLabPanel.tsx`
- `walkthrough.md`

### Implementation notes

- The previous header placed the center title with `absolute left-1/2`, which could overlap the return controls and `Save / Export` action inside narrow embedded Imageshop panels.
- The header now uses `flex-wrap` with three flexible regions:
  - left guided return/context controls,
  - center Imageshop title/subtitle,
  - right save/send-back actions.
- Text-heavy header elements now truncate or wrap through their own layout region rather than painting over neighboring controls.
- No routing, ComicEditor, image generation, or guided draft mutation behavior was changed.

### Verification

- `git diff --check` - PASS.
- `npm run build` - PASS; Vite still reports the existing large `ComicPortal` chunk warning.
- `npm run lint` - PASS with 67 existing warnings in unrelated files; no lint errors.
- Browser check attempted on `http://localhost:5173/`, but the reloaded current tab no longer had the guided Imageshop header context available to inspect visually.

### Outstanding issues

- A live guided Imageshop browser screenshot should still be checked once the app is back in the same guided handoff state shown in the review comment.

### Risks or caveats

- On very narrow panels, the header may become two compact rows instead of forcing all controls into one row. This is intentional to prevent overlap while keeping the header small.

### Operator follow-up

- Reopen Imageshop from Guided Comic Flow and visually confirm the sticky return header does not overlap in the embedded panel.

### Next steps

- None.

---

## Guided Art to Imageshop ready-generation bridge - 2026-05-05

### What changed

- Improved the Guided Comic Flow Art step handoff so `Generate in Imageshop` and `Replace in Imageshop` open Imageshop with a richer panel-generation workspace.
- Added reusable bridge helpers for guided panel prompt construction, reference overflow tracking, and layout-intent-to-Imageshop aspect ratio selection.
- Updated Imageshop guided handoff consumption to apply the generated prompt and mapped aspect ratio immediately, without auto-generating an image.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/stores/imageWorkshopBridge.ts`
- `src/stores/__tests__/imageWorkshopBridge.test.ts`
- `walkthrough.md`

### Implementation notes

- `GuidedImageWorkshopHandoff` now supports `panelLayout`, carrying the selected panel's layout template, inferred intent, column span, and row span from `getGuidedComicLayoutPanels()`.
- `buildGuidedImageWorkshopPrompt()` builds an editable Imageshop prompt with page/panel label, panel beat objective, page context, page key characters/location, character/location/NPC reference labels, panel layout intent/span, art direction settings, continuity notes, and an explicit no-text instruction.
- `getGuidedImageWorkshopAspectRatio()` maps guided layout signals to existing Imageshop ratios:
  - `wide` or wider column span -> `21:9`
  - `tall` or `feature` -> `9:16`
  - `normal` or square span -> `1:1`
  - explicit `aspectRatioHint` wins when provided
  - otherwise falls back to recognizable art-direction aspect text, then the prior portrait default
- `getGuidedImageWorkshopPreload()` still preserves all references while preloading only the first 14 slot URLs, and now also returns `overflowReferences` so Imageshop can tell the user when additional references remain in the handoff.
- Imageshop now sets its initial aspect ratio from the guided handoff when loading an Art-step panel.
- Existing return behavior, `Send back to Guided Flow`, `Save / Export`, session result recovery, upload/vault/paste assignment, routing, and ComicEditor behavior were preserved.

### Verification

- `npm test -- imageWorkshopBridge.test.ts` - RED first with missing helper/overflow behavior, then PASS after implementation.
- `npm test -- imageWorkshopBridge.test.ts guidedComicLayoutPlan.test.ts` - PASS, 18 tests.
- `npm run build` - PASS; Vite still reports the existing large `ComicPortal` chunk warning.
- `npm run lint` - PASS with 67 existing warnings in unrelated files; no lint errors.
- `git diff --check` - PASS.

### Outstanding issues

- No manual browser flow was completed for this pass because the current browser tab was not already in a reproducible guided Art-to-Imageshop handoff state.

### Risks or caveats

- Reference preloading still honors the existing 14-slot Imageshop UI limit; additional references are preserved in the handoff and surfaced through the load notice, but they are not shown as extra slot controls.

### Operator follow-up

- In the browser, open a guided Art panel with a wide/tall/normal layout and confirm Imageshop starts with the expected prompt, reference slots, overflow notice when applicable, and aspect ratio selection.

### Next steps

- None.

---

## ARCS Image Vault UI/UX modernization - 2026-05-05

### What changed

- Restyled the Image Vault portal shell to align more closely with Guided Comic Flow's darker ARCS creative-workspace language.
- Added shared vault UI chrome for guided-mode context, compact/large preview mode toggles, reusable image action buttons, and full-image open links.
- Reworked character, asset, and NPC vault browsing surfaces to support compact and large preview modes.
- Changed vault collection/profile thumbnails and modal image cards toward `object-contain` preview behavior so reference images are easier to inspect without aggressive cropping.
- Moved per-image actions into bottom image-card overlay bars across character, asset, and NPC item cards.
- Added Guided Comic Flow page/panel metadata to panel-art vault requests so guided vault mode can show the originating page/panel when available.

### Files touched

- `src/components/ui/VaultChrome.tsx`
- `src/portals/ReferenceAlbum.tsx`
- `src/components/ui/CharacterVault.tsx`
- `src/components/ui/AssetVault.tsx`
- `src/components/ui/ProfileVaultModal.tsx`
- `src/components/ui/CollectionVaultModal.tsx`
- `src/components/ui/NpcVault.tsx`
- `src/stores/guidedComicVaultBridge.ts`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- `VaultChrome.tsx` now centralizes:
  - `GuidedVaultModePanel`
  - `VaultViewModeToggle`
  - `VaultActionIconButton`
  - `VaultOpenLink`
  - guided panel-target parsing and target-type labels
- Guided mode now displays the requested reference type, the target name, and Page/Panel labels for panel-art requests when those values are present.
- Character and asset album grids now use the same compact/large preview mode pattern as the item modals.
- Profile and collection modal cards now keep actions in the image overlay:
  - guided pick/use
  - ZIP selection
  - download
  - favorite/profile cover where applicable
  - framing
  - metadata/name edit
  - move
  - copy URL
  - open full image
  - delete
- NPC Vault cards now use the same bottom action-bar pattern for guided pick, copy, open, and delete, while preserving the existing full preview modal.
- The guided vault bridge change is additive: `pageNumber` and `panelNumber` are optional and existing selections remain compatible.

### Verification

- `npm test -- guidedComicVaultBridge.test.ts` - PASS, 5 tests.
- `npm run build` - PASS; Vite still reports the existing large `ComicPortal` chunk warning.
- `npm run lint` - PASS with 67 existing warnings in unrelated files; no lint errors.
- `git diff --check` - PASS.
- Browser check on `http://localhost:5173/`: opened Reference Vault, confirmed `ARCS Image Vault`, `Character Vault`, `Compact`, and `Large` controls render; opened the Aries profile modal and confirmed modal action controls include `Download HQ image`, `Copy image URL`, and `Open full image`.

### Outstanding issues

- Browser console still contains pre-existing nested-button warnings from the Storyline timeline surface; they were not from the refactored vault surface and were not addressed in this pass.
- I did not perform a full guided-mode browser walkthrough from Guided Comic Flow into Vault selection, only a structural DOM/load check of the Reference Vault and profile modal.

### Risks or caveats

- The action bars intentionally use compact icon buttons, so discoverability depends on browser titles/ARIA labels and the visual grouping. A later pass could add a small overflow menu for very narrow cards if the icon row feels dense.
- The future history/variants/version-comparison systems are only prepared for structurally through shared chrome and action grouping; no generated-history data model or batch action backend was added.

### Operator follow-up

- From Guided Comic Flow, test character, location, NPC, and panel-art vault picks end-to-end to confirm the highlighted guided action bar feels obvious in each context.

### Next steps

- None.

---

## ARCS Image Vault UX stabilization cleanup - 2026-05-05

### What changed

- Performed a restraint-focused cleanup of the latest Image Vault UI pass after browser review showed the cards had become too overlay-heavy and visually noisy.
- Restored image-first album cards by moving profile/collection text below or beside thumbnails instead of over the artwork.
- Reworked compact mode into dense thumbnail rows with text beside the image, keeping thumbnails recognizable while reducing visible metadata.
- Removed persistent image-covering action overlays from character, asset, and NPC item cards.
- Collapsed secondary action trays to zero height and disabled pointer events until hover, focus, or selection, preventing invisible controls from occupying layout or blocking interaction.
- Restored portal-specific color identity: Character Vault returns to a dark red/gold palette, Asset Vault returns to emerald/gold, and NPC Vault keeps a separate darker supporting-reference palette.
- Made modal Fit/Wide behavior more distinct: Fit uses fewer/larger cards and full-image visibility, while Wide uses more cinematic landscape-oriented cards with cover-style scanning.

### Files touched

- `src/portals/ReferenceAlbum.tsx`
- `src/components/ui/CharacterVault.tsx`
- `src/components/ui/AssetVault.tsx`
- `src/components/ui/ProfileVaultModal.tsx`
- `src/components/ui/CollectionVaultModal.tsx`
- `src/components/ui/NpcVault.tsx`
- `walkthrough.md`

### Implementation notes

- Character and asset album cards now use `object-cover` in fixed image frames so covers fill the card instead of leaving large dead space.
- Large album cards use an image block plus a separate metadata footer; compact album cards use a thumbnail-plus-details layout.
- Profile and collection modal cards now keep only primary controls visible in the card body:
  - guided use action when guided context exists
  - ZIP selection
  - cover star for Character Vault items
- Secondary maintenance actions remain available but are progressively disclosed below the metadata body:
  - download
  - framing
  - metadata edit
  - move
  - copy
  - open full image
  - delete
- Hidden trays use `max-h-0`, `opacity-0`, and `pointer-events-none`, then expand on hover/focus/selected state.
- Removed the inert `Click image for actions` helper copy.
- NPC Vault now follows the same non-overlapping card pattern, while preserving its existing preview modal and guided NPC selection behavior.

### Verification

- `npm run build` - PASS; Vite still reports the existing large chunk warning.
- `npm run lint` - PASS with 67 existing warnings in unrelated files; no lint errors.
- `git diff --check` - PASS.
- Browser check on `http://localhost:5173/`: opened Reference Vault, toggled compact mode, opened the Aries profile modal, confirmed the stale `Click image for actions` text is gone, and confirmed the modal still exposes ZIP, cover star, `Wide view`, and full-image open behavior.

### Outstanding issues

- The modal still has a large amount of empty space when an album contains only one image; that is calmer than the previous clutter, but a future pass could center or constrain sparse albums more elegantly.

### Risks or caveats

- Compact thumbnails now prioritize recognition and density with `object-cover`, so extreme portraits may crop edges in compact browsing. Fit mode remains the full-image visibility path.
- Secondary actions are intentionally less visible until hover/focus/selection; this improves scanning but slightly reduces immediate discoverability.

### Operator follow-up

- Manually inspect a large multi-image album in Character and Asset Vault to confirm hover/focus action reveal feels discoverable without clutter.

### Next steps

- None.

---

## ARCS Image Vault modal view-mode follow-up - 2026-05-05

### What changed

- Tightened the follow-up Image Vault profile/collection modal behavior after browser comments identified subject framing and view-mode clarity issues.
- Replaced the single Fit/Wide toggle button with a two-option segmented control so the active modal width mode is visible instead of implied by an action label.
- Made compact modal Fit and Wide modes meaningfully different:
  - Fit compact uses smaller thumbnail rows for denser browsing.
  - Wide compact uses wider row cards with larger thumbnails.
- Adjusted cover-mode image focus fallback so wide and compact crops bias upward when no custom thumbnail focus has been stored, keeping character faces/upper bodies more centered.
- Reduced album-grid name clipping by moving compact card `Open` controls out of the title row and allowing profile/collection names to wrap instead of always truncating.

### Files touched

- `src/components/ui/CharacterVault.tsx`
- `src/components/ui/AssetVault.tsx`
- `src/components/ui/ProfileVaultModal.tsx`
- `src/components/ui/CollectionVaultModal.tsx`
- `walkthrough.md`

### Implementation notes

- Profile and collection modals now render separate `Fit` and `Wide` buttons, each with its own selected styling.
- Wide compact modal cards now use a larger `minmax(380px, 1fr)` grid and `150px` thumbnail column, while Fit compact remains denser with `minmax(260px, 1fr)` and `108px` thumbnails.
- Wide/compact `object-cover` images use a `38%` vertical focus fallback when stored focus is missing or still at the old default `50%`.
- Large Fit mode still preserves full-image visibility with `object-contain`; Large Wide mode still uses `object-cover` for frame-filling scans.
- Character and asset album compact titles now use wrapping text and put the `Open` button below the title block, avoiding avoidable name clipping such as `Firepit Crew`.

### Verification

- `npm run build` - PASS; Vite still reports the existing large chunk warning.
- `npm run lint` - PASS with 67 existing warnings in unrelated files; no lint errors.
- `git diff --check` - PASS.
- Browser check on `http://localhost:5173/`: opened Reference Vault, confirmed `Firepit Crew` appears as full text in the compact album card DOM, opened the Flux profile modal, confirmed separate `Fit` and active `Wide` controls render, and confirmed the old `Wide view`/`Fit view` action-label pattern is gone.

### Outstanding issues

- Some individual images may still need manual thumbnail focus tuning through the existing framing tool if their subject is unusually off-center. This pass improves the fallback behavior but does not infer faces or rewrite saved focus metadata.

### Risks or caveats

- The upward `38%` fallback is intentionally conservative. It improves portrait/character crops, but abstract/generated images with important lower-frame details may still benefit from manual framing.

### Operator follow-up

- In the browser, inspect Flux in Wide + Large and Wide + Compact and manually adjust any specific image whose stored focus should override the new fallback.

### Next steps

- None.

## ARCS Image Vault fill and surface polish follow-up - 2026-05-06

### What changed

- Fixed profile/collection modal image cards so all modal view combinations use frame-filling image presentation instead of leaving persistent side gutters in Fit + Large.
- Restored more premium visual depth to the Image Vault shell with gold highlight gradients at the top of the vault header.
- Strengthened portal-specific color identity:
  - Character Vault uses a deeper ruby red gradient with reflective highlight layers.
  - Asset Vault uses a moss green gradient with reflective highlight layers.
  - NPC Vault keeps its distinct supporting-reference palette while also receiving the shared gold header treatment.

### Files touched

- `src/components/ui/ProfileVaultModal.tsx`
- `src/components/ui/CollectionVaultModal.tsx`
- `src/components/ui/CharacterVault.tsx`
- `src/components/ui/AssetVault.tsx`
- `src/portals/ReferenceAlbum.tsx`
- `walkthrough.md`

### Implementation notes

- Profile and collection modal card images now use `object-cover` across Fit, Wide, Compact, and Large modes. Fit/Wide now describe modal width/layout rather than switching between contained and filled image rendering.
- Existing object-position fallback behavior remains in place, so default cover-mode crops still bias upward when saved thumbnail focus is missing or still at the old `50%` default.
- `ReferenceAlbum` now provides each vault tab with a `headerBackground` gradient, allowing the shared vault header to keep the gold reflective top treatment while preserving tab-specific base colors.
- Character and Asset Vault page bodies now add top gold sheen overlays and diagonal reflective highlights over their ruby/moss base gradients.

### Verification

- `npm run build` - PASS; Vite still reports the existing large chunk warning.
- `npm run lint` - PASS with 67 existing warnings and 0 errors.
- `git diff --check` - PASS.

### Outstanding issues

- Browser visual verification still needs a final manual glance after the dev server refreshes to confirm the new image-fill mode visually matches the requested screenshots.

### Risks or caveats

- Using `object-cover` everywhere in the profile/collection modal trades full-image visibility for artwork-first frame filling. Manual thumbnail focus controls remain the way to correct unusual source images with important edge content.

### Operator follow-up

- Inspect a profile modal in Fit + Large and Wide + Large to confirm the cards now fill their frames without purple/empty side gutters.

### Next steps

- None.

---

## ARCS Image Vault density and interaction polish - 2026-05-06

### What changed

- Performed a focused refinement pass on the current Image Vault direction without redesigning the vault.
- Reduced compact card height moderately across Character Vault, Asset Vault, profile/collection modals, and NPC Vault.
- Added restrained card hover polish:
  - subtle upward lift
  - faint gold edge glow
  - soft shadow elevation
  - slightly stronger selected/active emphasis in profile and collection modals
- Improved title handling so long fantasy/sci-fi names use two-line clamps instead of harsh one-line truncation in key browsing surfaces.
- Softened the Character Vault ruby center glow so the red/gold identity remains warm but less fatiguing behind cards.
- Added shared vault layout helper presets as a first step toward future image-size/density sliders while preserving the current Compact/Large and Fit/Wide controls.

### Files touched

- `src/components/ui/VaultChrome.tsx`
- `src/components/ui/CharacterVault.tsx`
- `src/components/ui/AssetVault.tsx`
- `src/components/ui/ProfileVaultModal.tsx`
- `src/components/ui/CollectionVaultModal.tsx`
- `src/components/ui/NpcVault.tsx`
- `src/portals/ReferenceAlbum.tsx`
- `walkthrough.md`

### Implementation notes

- `VaultChrome.tsx` now exports:
  - `VAULT_CARD_INTERACTION` for consistent restrained hover treatment.
  - `getVaultAlbumLayout(mode)` for Character/Asset album grid, card, frame, title, and metadata sizing.
  - `getVaultModalLayout(mode, size)` for profile/collection modal grid, card, image frame, title, and action spacing.
- Compact album cards now use `min-h-[112px]` and `96px` thumbnail columns instead of the previous `124px` / `104px` sizing.
- Compact modal cards now use `min-h-[104px]` for Fit and `min-h-[116px]` for Wide, down from the previous `116px` / `132px`.
- NPC compact cards now use `min-h-[96px]` and `88px` thumbnails, with labels moving from one-line truncation to a two-line clamp.
- Character Vault gradients were darkened/desaturated in the central red range while keeping ruby/gold identity and top sheen.

### Verification

- `npm run build` - PASS; Vite still reports the existing large chunk warning.
- `npm run lint` - PASS with 67 existing warnings and 0 errors.
- `git diff --check` - PASS.
- Browser check on `http://localhost:5173/`:
  - Opened Reference Vault and switched Character Vault to Compact.
  - Confirmed the Aries compact card class includes `min-h-[112px]`, `grid-cols-[96px_minmax(0,1fr)]`, and `hover:-translate-y-0.5`.
  - Opened the Flux profile modal and confirmed compact modal cards include the smaller `min-h-[104px]` layout and the shared hover treatment.

### Outstanding issues

- The current UI still exposes discrete Compact/Large and Fit/Wide toggles. The helper presets make a future slider migration cleaner, but this pass intentionally did not add visible sliders to avoid cluttering the refined toolbar.

### Risks or caveats

- Two-line title clamps improve readability but can still hide the tail end of very long names. This is intentional to preserve card alignment and browsing rhythm.
- Compact mode is slightly denser now; if specific albums feel too tight after real browsing, the shared presets can be adjusted in one place.

### Operator follow-up

- Manually scan a few long-name albums in Compact and Large modes to confirm the two-line clamp feels balanced.

### Next steps

- None.

---

## Reconstructed backfill: Guided Comic AI, project library, and portal protection - 2026-05-07

### What changed

- Reconstructed from git commit `8be8af4` (`fix: normalize guided comic panel counts and layout handoff`) and available session evidence.
- Added protected portal gating around the main authenticated work surfaces:
  - Studio,
  - Asset Studio,
  - Reference Vault,
  - Imageshop,
  - Comic Creator,
  - Writers' Workshop.
- Added shared protected-portal helpers and tests so portal protection can be reasoned about outside `App.tsx`.
- Expanded Guided Comic Flow with a local comic project library:
  - saved guided project snapshots,
  - active project tracking,
  - save, save-as, rename, duplicate, delete, and project switching,
  - migration from the single recovery draft into a saved project library entry.
- Added Guided Comic AI support that uses the Writers' Workshop writer-tools path:
  - setup/premise improvement,
  - story and outline support,
  - page and panel beat suggestions,
  - visual prep/reference notes,
  - panel prompt/camera guidance,
  - layout pacing and template recommendations,
  - export readiness and gap review.
- Added schemas and shared writer types for `guided_comic_assist` requests and results.
- Strengthened Guided Comic Flow page and panel count handling:
  - panel counts are derived from the active page state,
  - AI page updates only apply suggested panel counts when the current page is still using default/generated panel beats,
  - layout template recommendations are constrained to known supported template ids.
- Expanded Layout handoff metadata:
  - handoff includes page number, selected layout template, panel count, ordered panel ids, and panel art images,
  - tests cover guided layout bridge/import behavior.
- Added project-library and guided-AI tests.

### Files touched

- `src/App.tsx`
- `src/components/auth/ProtectedPortalGate.tsx`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicAi.ts`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `src/portals/guided-comic/guidedComicLayoutPlan.ts`
- `src/portals/guided-comic/__tests__/guidedComicAi.test.ts`
- `src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts`
- `src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts`
- `src/shared/auth/protectedPortals.ts`
- `src/shared/auth/__tests__/protectedPortals.test.ts`
- `src/shared/writer/schemas.ts`
- `src/shared/writer/types.ts`
- `src/shared/writer/__tests__/schemas.test.ts`
- `supabase/functions/_shared/writerSchemas.ts`
- `supabase/functions/writer-tools/index.ts`
- `src/stores/guidedComicLayoutBridge.ts`
- `src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `src/stores/__tests__/guidedComicLayoutImport.test.ts`
- `src/stores/comicStore.ts`
- `src/stores/imageWorkshopBridge.ts`

### Implementation notes

- Guided Comic Flow still remained in the existing Comic Creator portal rather than becoming a new routed portal.
- The project library uses browser-local persistence, separate from the recovery draft, and keeps the active saved project explicit.
- AI suggestions are preview-first and parsed through shared schemas before being accepted into local guided draft state.
- The guided AI context compacts long strings and omits image data/URLs where appropriate so large local image payloads are not sent as raw prompt context.
- Supported layout ids at this stage included `auto`, `three-panel`, `three-panel-wide-top`, `three-panel-wide-bottom`, `four-panel`, `six-panel-grid`, and `splash`.
- Writer-tools schema updates were mirrored in the Supabase function shared schema and writer-tools function so the client and function stayed aligned.

### Verification

- Evidence comes from commit `8be8af4` and the tests added in that commit.
- Later recovery verification in this session ran `npm run test -- guidedComicLayoutPlan guidedComicLayoutBridge guidedComicLayoutImport` and passed 3 test files / 18 tests.
- Later build verification in this session ran `npm run build` and passed; Vite still reported existing large chunk warnings.

### Outstanding issues

- This is a reconstructed backfill, not a perfect chat transcript. Exact intermediate QA comments and small implementation detours may be missing.

### Risks or caveats

- The project library and AI assist surfaces added a large amount of state and UI behavior to `GuidedComicFlow.tsx`; future work should be careful not to add parallel state paths for the same guided draft/project concepts.
- Browser-local saved projects remain local to the browser storage.

### Operator follow-up

- Continue treating the Current Comic library panel and local recovery draft as distinct but related persistence surfaces.
- When changing Guided AI response shape, update both shared schemas and writer-tools function schemas.

### Next steps

- Use the newer May 9 guided layout/framing section for the next state of the Layout editor work.

---

## Guided Comic Flow editable layout, framing, and QA repairs - 2026-05-09

### What changed

- Reconstructed from current uncommitted diff, current chat QA, and Browser Use DOM checks after the missing walkthrough gap was discovered.
- Reworked Guided Comic Flow Layout from fixed template selection into an editable guided layout canvas:
  - each guided page now stores normalized panel rectangles with panel id, order, geometry, lock/image fields, and image framing metadata,
  - starter templates now seed editable geometry instead of acting as the final layout authority,
  - panels can be moved and resized inside the page bounds with minimum size enforcement,
  - panel geometry snaps to page edges, safe margins, gutters, and nearby panel edges,
  - changing a layout no longer silently changes the selected panel count.
- Added Step 1 layout defaults for safe margin and gutter behavior:
  - safe margins are the default,
  - full-bleed and thin-gutter options remain available for comic styles that intentionally use the whole page.
- Added visual panel image framing controls:
  - fit modes: cover, contain, stretch,
  - zoom control,
  - 3x3 focal point control,
  - framing data persists with the guided page geometry and is used in Layout previews.
- Updated Layout-to-Advanced Studio handoff so it sends the edited rectangles and image framing data instead of only a template id.
- Updated Advanced Studio import behavior so guided pages open with the edited guided geometry, margins/gutters, panel images, and framing metadata.
- Repaired Guided Comic Flow library controls:
  - Save As and Rename now use in-app metadata dialogs instead of browser prompt flows,
  - Save, Save As, Rename, Duplicate, New, Delete, and project switching remain in the Current Comic panel.
- Improved Art step usability:
  - added Previous panel / Next panel controls in the right-side panel menu,
  - made panel status buttons visibly reflect the selected status,
  - moved the active panel workspace controls out of the main content hover area and into the right rail.
- Improved Layout step usability:
  - moved panel image framing out of each page layout card into a single right-rail inspector,
  - clicking, dragging, or resizing a layout panel now also sets that panel's page as active so the inspector stays synced,
  - adjusted responsive breakpoints so the inspector rail docks from `lg` width upward and no longer falls below the long page list at the tested 1191px width.
- Added Browser Use / in-app browser access notes to `AGENTS.md` so future agents can use the Node REPL Browser Use bridge for `http://127.0.0.1:5173/` QA.

### Files touched

- `AGENTS.md`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicLayoutPlan.ts`
- `src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts`
- `src/stores/guidedComicLayoutBridge.ts`
- `src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `src/stores/__tests__/guidedComicLayoutImport.test.ts`
- `src/stores/comicStore.ts`
- `src/modes/comic/components/ComicPanel.tsx`
- `src/modes/comic/components/ObjectToolbar.tsx`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `walkthrough.md`

### Implementation notes

- Guided layout state remains local React/local draft state; this work did not add Supabase writes or route-level architecture changes.
- `guidedComicLayoutPlan.ts` now owns the starter geometry, safe-margin geometry, snap behavior, panel constraints, and geometry sync helpers.
- Guided page geometry is kept in `pageLayoutGeometry`, keyed by page number, and is synchronized against current page cards/templates/settings so page count remains authoritative.
- Image framing metadata is stored on guided panel geometry as `imageFit`, `imageFocusX`, `imageFocusY`, and `imageZoom`.
- The Layout right rail is now `lg:sticky` with an internal scroll area so the framing inspector remains available while the user works down the layout page list.
- Advanced Studio guided import converts normalized guided rectangles into canvas rectangles and applies the guided image fit/focus/zoom metadata to imported panels.
- Browser Use is available through the Codex Node REPL `js` tool with the `iab` backend; future browser QA should read the Browser Use skill first and then bootstrap from `browser-client.mjs`.

### Verification

- `npm run build` - PASS; Vite still reports the existing large chunk warning for `ComicPortal` and other large bundles.
- `npm run test -- guidedComicLayoutPlan guidedComicLayoutBridge guidedComicLayoutImport` - PASS; 3 test files and 18 tests passed. Vitest reported inspector port `9229` unavailable and used `9230` instead.
- Browser DOM QA on `http://127.0.0.1:5173/`:
  - confirmed the Layout step renders a single `Panel image framing` inspector in the Layout rail,
  - confirmed clicking a different layout panel updates the inspector heading to that panel,
  - confirmed the Layout inspector is present after reload.
- User QA reported persistence, Advanced Studio handoff, panel counts, and library safety checks passed before the 1191px responsive issue was found.

### Outstanding issues

- Manual visual QA should recheck the Layout step at the exact 1191px width after the `lg` breakpoint fix to confirm the framing panel no longer drops below the page list.
- Browser screenshot capture through Browser Use timed out during earlier checks, so the most recent browser verification is DOM-based rather than screenshot-based.

### Risks or caveats

- `GuidedComicFlow.tsx` is now carrying a lot of guided workflow behavior. Future changes should stay scoped and should consider extracting helpers only when it reduces real complexity.
- Docking the inspector at `lg` keeps controls accessible at the tested width, but it also means the layout canvas gives up some horizontal space sooner than before. This is intentional to keep the framing controls usable.

### Operator follow-up

- Reload the local app and recheck Step 6 Layout around 1191px wide.
- Spot check one page with assigned art and one page needing art to confirm the right-rail framing inspector remains readable and correctly synced.

### Next steps

- Continue with UI refinement or the next portal once the responsive Layout rail is visually confirmed.

---

## Comic Engine Protection Plan - 2026-05-09

### What changed

- Added a documentation-only protection plan for Advanced Comics Studio / Comic Portal modernization work.
- Defined non-negotiable preservation rules for existing panel, balloon, layer, mask, image-preservation, transform, save/load, export, and Guided-to-Advanced handoff behavior.
- Added a removal gate requiring side-by-side UI proof before existing comic engine logic can be deleted, replaced, simplified, or bypassed.
- Added a regression checklist covering panels, image preservation, masks/clipping, balloons, layers, save/load, export, and Guided-to-Advanced handoff.

### Files touched

- `docs/comic-engine-protection-plan.md`
- `walkthrough.md`

### Implementation notes

- This was intentionally limited to documentation and walkthrough maintenance.
- No source code, schema, geometry utility, adapter, store, bridge, renderer, routing, or runtime behavior was changed.
- Future modernization should add shared types/adapters beside the current implementation, keep legacy paths available, and remove old code only after the protection checklist and UI proof gate are satisfied.

### Verification

- `git diff -- docs/comic-engine-protection-plan.md walkthrough.md` - PASS; only the walkthrough diff was shown because the new protection plan file is untracked until staged.
- `git status --short` - PASS; changed files were limited to `walkthrough.md` and `docs/comic-engine-protection-plan.md`.
- `rg -n "Removal gate|Regression checklist|Guided-to-Advanced|image preservation" docs/comic-engine-protection-plan.md` - PASS; required protection phrases were present.

### Outstanding issues

- None.

### Risks or caveats

- The checklist is a guardrail for future implementation work. It does not itself verify current runtime behavior.

### Operator follow-up

- Use `docs/comic-engine-protection-plan.md` before any comic engine schema, geometry, adapter, or renderer modernization.

### Next steps

- Future engine work should start by adding shared types/adapters around the existing implementation, then prove behavior in focused tests and the UI before any removal.

---

## Comic Object Schema Audit - 2026-05-09

### What changed

- Added a documentation-only audit of the current Advanced Comics Studio / Comic Portal object and editor state model.
- Documented current panel, balloon, image/asset, transform, layer, mask/shape, serialization, export, and Guided-to-Advanced handoff fields.
- Identified current `any` usage where object contracts are unclear, especially Konva refs/events, store middleware, balloon override spreading, and UI update payloads.
- Added a compatibility map from current flat fields to proposed future canonical field groups for later adapter work.

### Files touched

- `docs/comic-object-schema-audit.md`
- `walkthrough.md`

### Implementation notes

- This was intentionally limited to documentation and walkthrough maintenance.
- No source code, schema, geometry utility, adapter, store, bridge, renderer, routing, save/load, export, or runtime behavior was changed.
- The audit records that overlays currently live in `page.overlays` and render above main comic elements, while `LayerTree` and `layerOrder` currently focus on panels, balloons, and drawings.
- The audit records that Guided Flow layout geometry is normalized and converted into 800x1200 Advanced Studio panel rectangles during handoff.

### Verification

- `rg -n "Current panel object fields|Current balloon object fields|Compatibility map|Current Guided-to-Advanced handoff payload|Current unclear contracts" docs/comic-object-schema-audit.md` - PASS; all required audit sections were present.
- `git diff -- docs/comic-object-schema-audit.md walkthrough.md` - PASS; the tracked diff was limited to walkthrough updates, with the new audit doc still untracked until staged.
- `git status --short` - PASS; changed files were documentation-only: `walkthrough.md`, `docs/comic-engine-protection-plan.md`, and `docs/comic-object-schema-audit.md`.

### Outstanding issues

- None.

### Risks or caveats

- This audit proposes future canonical field names for planning only. It does not migrate or validate runtime behavior.
- Current uncommitted documentation changes from the previous protection-plan task remain in the worktree and were preserved.

### Operator follow-up

- Use `docs/comic-object-schema-audit.md` with `docs/comic-engine-protection-plan.md` before designing comic schema adapters or geometry utilities.

### Next steps

- Future schema work should start with additive adapters that read current fields and expose canonical groups without changing persisted objects or rendering paths.

---

## Canonical Comic Object Types - 2026-05-09

### What changed

- Added shared canonical comic type modules beside the current Advanced Comics Studio implementation without wiring them into existing runtime store or renderer paths.
- Added canonical object, geometry, serialization, and editor-state shapes for panels, balloons, text, assets, transforms, normalized/absolute rects, page geometry, layers, and serialized comic page/document state.
- Added runtime type guards for canonical panel, balloon, text, and asset objects.
- Added legacy compatibility helpers to normalize existing flat Advanced Studio objects/pages into the canonical sidecar shape and serialize normalized pages back toward the legacy store shape.
- Added focused unit coverage for the new guards and legacy normalization/serialization helpers.

### Files touched

- `src/modes/comic/types/comicGeometry.ts`
- `src/modes/comic/types/comicObjects.ts`
- `src/modes/comic/types/comicSerialization.ts`
- `src/modes/comic/types/comicEditorState.ts`
- `src/modes/comic/types/__tests__/comicObjects.test.ts`
- `walkthrough.md`

### Implementation notes

- The implementation follows `docs/comic-engine-protection-plan.md` and `docs/comic-object-schema-audit.md`: shared types and adapters were added beside the current implementation first, with no replacement of `comicStore`, `ComicCanvas`, `ComicPanel`, `BalloonNode`, `LayerTree`, Guided Flow handoff, save/load, export, or rendering logic.
- Canonical objects use a new `kind` discriminator while preserving legacy `type` values so overlays can remain compatible with existing `type: 'image' | 'sfx'` records.
- `normalizeLegacyComicObject` preserves the original flat fields and adds canonical grouped fields such as `geometry`, `transform`, and `image`.
- `normalizeLegacyComicPage` builds canonical `objects` and `layers` while preserving the original page arrays and `layerOrder`; overlays that are not part of `layerOrder` are appended as generated layers rather than mutating the legacy order.
- `serializeComicPageForLegacyStore` removes canonical sidecar fields and emits the legacy arrays back out for compatibility if a future adapter needs the reverse direction.

### Verification

- `npm run test -- src/modes/comic/types/__tests__/comicObjects.test.ts` - RED first; failed because `../comicObjects` did not exist yet.
- `npm run test -- src/modes/comic/types/__tests__/comicObjects.test.ts` - PASS after implementation; 1 file, 3 tests.
- `npm run test -- src/modes/comic/types/__tests__/comicObjects.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/portals/guided-comic/__tests__` - PASS; 8 files, 42 tests.
- `npm run build` - PASS; Vite reported the existing large chunk-size warning for built assets.
- `npm run lint` - PASS with 0 errors and 67 warnings in pre-existing areas such as Konva `any` usage and React hook dependency warnings; no new warnings were reported for the added comic type modules.

### Outstanding issues

- None.

### Risks or caveats

- The new canonical types and helpers are intentionally not connected to runtime behavior yet. Future work must keep using the protection-plan removal gate before replacing store, renderer, export, or Guided-to-Advanced paths.
- The helper layer does not attempt to resolve current ambiguous Konva/event `any` usage documented in the audit.

### Operator follow-up

- Preserve this as an additive sidecar layer until focused UI proof and save/load/export compatibility checks justify routing live behavior through it.

### Next steps

- Future schema work can start by routing narrow bridge or serialization tests through these helpers before touching Advanced Studio runtime paths.

---

## Shared Comic Geometry Utility Layer - 2026-05-09

### What changed

- Added a shared comic geometry utility layer beside the current Advanced Comics Studio implementation.
- Added normalized rect conversion, clamping, panel move/resize helpers, margin/gutter snapping, overlap detection, and starter layout generation utilities.
- Added focused unit tests covering every requested utility.

### Files touched

- `src/modes/comic/geometry/rects.ts`
- `src/modes/comic/geometry/panels.ts`
- `src/modes/comic/geometry/layoutTemplates.ts`
- `src/modes/comic/geometry/snapping.ts`
- `src/modes/comic/geometry/collision.ts`
- `src/modes/comic/geometry/normalization.ts`
- `src/modes/comic/geometry/__tests__/geometry.test.ts`
- `walkthrough.md`

### Implementation notes

- This is an additive utility layer only. No existing Advanced Studio panel, snapping, rendering, save/load, export, bridge, or store logic was replaced or imported into the new path.
- Persistence-facing geometry uses normalized `x`, `y`, `width`, and `height` values. `normalizeRect` and `denormalizeRect` are the explicit conversion points between normalized persistence coordinates and absolute page pixels for rendering/editing.
- Layout templates are starter presets only. `generateLayoutFromTemplate` and `generateLayoutFromAiIntent` return editable normalized panel rects and do not lock final layouts.
- The default normalized margin/gutter values mirror the existing guided layout math (`0.04` margin and `0.017` gutter) without routing Guided Flow or Advanced Studio through this new utility layer.

### Verification

- `npm run test -- src/modes/comic/geometry/__tests__/geometry.test.ts` - RED first; failed because the new geometry modules did not exist yet.
- `npm run test -- src/modes/comic/geometry/__tests__/geometry.test.ts` - PASS after implementation; 1 file, 9 tests.
- `npm run test -- --run src/modes/comic/geometry` - PASS; 1 file, 9 tests.
- `npm run build` - PASS; Vite reported the existing large chunk-size warning for built assets.
- `npm run lint` - PASS with 0 errors and 67 warnings in pre-existing areas; no new warnings were reported for the added geometry utility files.

### Outstanding issues

- None.

### Risks or caveats

- The new geometry utilities are not runtime-integrated yet. Future work must still prove side-by-side UI behavior before replacing existing Advanced Studio geometry, snapping, resize, export, or persistence paths.

### Operator follow-up

- Keep future migrations narrow: route tests or adapters through this geometry layer first, then manually verify the protected comic engine surfaces before changing runtime behavior.

### Next steps

- Future adapter work can use these helpers to normalize panel geometry at boundaries while preserving the current Advanced Studio editing implementation.

---

## Guided Comic Normalized Layout State - 2026-05-09

### What changed

- Updated Guided Comic Flow layout planning to consume the shared normalized comic geometry utilities for starter layouts, clamping, and snapping.
- Carried `pageLayoutGeometry` through the Guided AI draft/apply path so per-page panel rectangles remain stored as normalized geometry while preserving the existing guided layout shape.
- Preserved user-selected panel counts when applying AI suggestions; AI panel counts now only apply when a page is empty/default.
- Allowed AI suggestions to use only valid layout template IDs or valid layout intents, with invalid template IDs normalized back to `auto`.
- Mapped valid AI layout intents into starter geometry and preserved existing panel image/framing metadata by panel ID when geometry changes.
- Kept the existing Guided-to-Advanced handoff behavior intact by preserving the current `GuidedComicPanelGeometry` `x`/`y`/`w`/`h` adapter shape.

### Files touched

- `src/portals/guided-comic/guidedComicLayoutPlan.ts`
- `src/portals/guided-comic/guidedComicAi.ts`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts`
- `src/portals/guided-comic/__tests__/guidedComicAi.test.ts`
- `src/modes/comic/geometry/snapping.ts`
- `src/shared/writer/types.ts`
- `src/shared/writer/schemas.ts`
- `supabase/functions/_shared/writerSchemas.ts`
- `supabase/functions/writer-tools/index.ts`
- `walkthrough.md`

### Implementation notes

- `guidedComicLayoutPlan.ts` now adapts shared `generateLayoutFromTemplate`, `generateLayoutFromAiIntent`, `clampRectToPage`, `snapRectToMargins`, and `snapRectToGutters` output into the existing Guided Flow geometry type instead of introducing a new runtime editor contract.
- `normalizeGuidedComicLayoutTemplateId` and `normalizeGuidedComicLayoutIntent` constrain AI-provided layout data before it can affect guided page state.
- `applyGuidedComicAiResult` now updates `pageLayoutTemplates` and `pageLayoutGeometry` together, while keeping selected panel counts stable for non-default pages and filling/trimming beats to the active panel count.
- `copyPanelMediaMetadata` carries existing panel media fields across starter-geometry replacement so layout changes do not discard generated panel art or framing values.
- Writer schema/tool prompts now expose `layoutIntent` as the bounded AI-facing recommendation path.
- The shared snapper now supports snapping both opposing edges on one axis when a rectangle already matches safe margins, which preserves current guided safe-margin expectations while keeping the behavior in the shared utility layer.

### Verification

- `npm run test -- src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/portals/guided-comic/__tests__/guidedComicAi.test.ts` - RED first; failed before implementation because the new layout helpers did not exist and AI application still reset a five-panel page to three panels.
- `npm run test -- src/modes/comic/geometry/__tests__/geometry.test.ts src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/portals/guided-comic/__tests__/guidedComicAi.test.ts` - PASS; 3 files, 38 tests.
- `npm run test -- src/portals/guided-comic/__tests__ src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/modes/comic/geometry/__tests__/geometry.test.ts` - PASS; 8 files, 53 tests.
- `npm run build` - PASS after removing one unused import; Vite reported the existing large chunk-size warning for built assets.
- `npm run lint` - PASS with 0 errors and 67 existing warnings in pre-existing areas.

### Outstanding issues

- Manual browser click-through for selecting 3, 4, 5, and 6 panels was not run in this pass. The focused automated tests cover panel-count consistency, AI count preservation, valid template normalization, layout intent mapping, and Guided-to-Advanced bridge coverage.

### Risks or caveats

- Advanced Comics Studio runtime behavior remains intentionally unchanged. This pass only routes Guided Flow planning/state application through shared normalized geometry adapters.
- AI layout suggestions still generate starter geometry, not locked final layouts.

### Operator follow-up

- If a visual QA pass is needed, open Guided Comic Flow and manually select 3, 4, 5, and 6 panels, then apply AI layout suggestions on edited pages to confirm the UI matches the automated count-preservation coverage.

### Next steps

- Future work can continue narrowing Guided Flow state toward `ComicPageGeometry` directly once the adapter path is visually verified and the Advanced Studio boundary remains protected.

---

## Guided Comic Beginner Rectangular Layout Editor - 2026-05-09

### What changed

- Tightened the Guided Comic Flow Layout step into a beginner-friendly rectangular editor surface over the shared normalized geometry model.
- Added shared Guided layout adapter helpers for moving and resizing panels through `movePanelRect`/`resizePanelRect`, snapping to shared margin/gutter guides, clamping to page bounds, and enforcing minimum panel size.
- Added a starter-regeneration helper that preserves panel media/framing metadata while resetting rectangles to the selected starter preset.
- Updated the Layout canvas pointer-edit path to use the shared geometry-backed move/resize helpers instead of inline rectangle math.
- Kept panel count authoritative by regenerating only the selected page's current panel slots and preserving existing panel IDs.
- Kept panel numbers visible over assigned images as well as empty panels.
- Kept Guided-to-Advanced handoff on the existing rectangular `GuidedComicPanelGeometry` adapter so Advanced Studio receives exact edited normalized rectangles and panel images without weakening existing Advanced Studio shape behavior.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicLayoutPlan.ts`
- `src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts`
- `walkthrough.md`

### Implementation notes

- `moveGuidedComicPanelGeometry` and `resizeGuidedComicPanelGeometry` are the new component-facing edit helpers; they adapt the existing `GuidedComicPanelGeometry` shape to shared normalized rect utilities, then return the existing Guided geometry shape for state and handoff compatibility.
- `createGuidedComicStarterLayoutWithExistingMetadata` regenerates starter rectangles while carrying `locked`, `imageId`, `imageUrl`, `imageFit`, `imageFocusX`, `imageFocusY`, and `imageZoom` for matching panel IDs.
- `GuidedComicFlow` now uses these helpers for drag/resize and the reset starter action, so assigned art and framing survive starter regeneration and layout edits.
- Guided Flow still exposes only rectangular panels. Oval/circle/custom shapes remain Advanced Studio-only features.
- No Advanced Studio panel shape code, object toolbar code, canvas code, or store shape behavior was removed or weakened.

### Verification

- `npm run test -- src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts` - RED first; failed because the new move/resize/regenerate helpers did not exist yet.
- `npm run test -- src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts` - PASS after implementation; 1 file, 20 tests.
- `npm run test -- src/portals/guided-comic/__tests__ src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/modes/comic/geometry/__tests__/geometry.test.ts` - PASS; 8 files, 56 tests.
- Manual browser QA on `http://127.0.0.1:5173/` - PARTIAL PASS: opened Guided Comic Flow Layout, confirmed Page 1 showed 3 panels with assigned images, resized panel 1 larger, moved panel 2, and confirmed all three panel image markers remained in the DOM and screenshot.
- `npm run build` - PASS; Vite reported the existing large chunk-size warning for built assets.
- `npm run lint` - PASS with 0 errors and 67 existing warnings in pre-existing areas.
- `git diff --check` - PASS.

### Outstanding issues

- Manual browser automation could not complete the final click through the native `window.confirm` handoff dialog into Advanced Studio; the click opened the blocking confirmation and the browser automation session timed out. The Advanced Studio geometry/image import path remains covered by the focused `guidedComicLayoutImport` tests.

### Risks or caveats

- The Layout editor is intentionally rectangular-only. Shape editing remains in Advanced Studio.
- The handoff confirmation is still useful for users, but it can block the in-app browser automation flow unless the dialog is accepted manually.

### Operator follow-up

- For full visual sign-off, manually click **Send this page to Advanced Studio**, accept the confirmation dialog, and compare the opened Advanced Studio panel positions/images against the edited Guided Layout page.

### Next steps

- Consider adding a test-friendly confirmation abstraction later if repeated browser automation needs to click through the handoff without changing the user-facing confirmation behavior.

---

## Guided Flow to Advanced Studio Exact Handoff - 2026-05-10

### What changed

- Strengthened the Guided Comic Flow to Advanced Studio handoff payload so exact edited Guided Layout geometry travels with the bridge payload instead of relying on template reconstruction.
- Added additive bridge fields for `pageId`, AI `layoutIntent`, normalized panel rectangles, assigned image IDs, and rectangular panel shape defaults while preserving the existing `layoutTemplate`, `orderedPanelIds`, `panelGeometry`, `panelArtImages`, and `panelBeats` compatibility fields.
- Updated Guided Flow's Advanced Studio send action to include deterministic guided page IDs, normalized panel rects, panel order, panel count, image IDs/URLs, optional AI layout intent, and rectangular shape defaults.
- Added `pageLayoutIntents` to Guided Flow draft/project/AI state so AI-provided layout intent can be preserved into the handoff when present.
- Updated Advanced Studio import logic in `comicStore` to prefer `normalizedPanelRects` first, then existing `panelGeometry`, then the legacy template-only fallback.
- Kept legacy template-only import behavior available until manual testing confirms the new payload path end-to-end.

### Files touched

- `src/stores/guidedComicLayoutBridge.ts`
- `src/stores/comicStore.ts`
- `src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `src/stores/__tests__/guidedComicLayoutImport.test.ts`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicAi.ts`
- `src/portals/guided-comic/__tests__/guidedComicAi.test.ts`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `walkthrough.md`

### Implementation notes

- `guidedPanelImportEntries` is the new import adapter in `comicStore`; it sorts incoming exact rects by panel order and maps normalized coordinates to the native 800x1200 Advanced Studio page size.
- Advanced import now uses exact normalized rects when present and does not regenerate panels from the selected template in that path.
- Legacy `layoutRectsForTemplate` fallback remains in place for old payloads with no exact geometry.
- Guided Flow still sends rectangular panel defaults only; no oval/circle/custom Guided Flow shape path was added.
- Assigned image URLs remain the Advanced Studio-compatible image source. Image IDs are carried in the handoff payload for traceability but are not written onto `Panel` because `comicStore.Panel` does not currently define an image ID field.

### Verification

- `npm run test -- src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` - RED first; failed because the new 4-panel edited payload was still imported using template geometry.
- `npm run test -- src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` - PASS after implementation; 2 files, 7 tests.
- `npm run test -- src/portals/guided-comic/__tests__/guidedComicAi.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` - PASS; 3 files, 19 tests.
- `npm run test -- src/portals/guided-comic/__tests__ src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/modes/comic/geometry/__tests__/geometry.test.ts` - PASS; 8 files, 59 tests.
- `npm run build` - PASS; Vite reported the existing large chunk-size warning for built assets.
- `npm run lint` - PASS with 0 errors and 67 existing warnings in pre-existing areas.
- Browser access check - PASS: Browser runtime listed both Chrome and Codex In-app Browser, and both opened `http://127.0.0.1:5173/` with title `ARCS Expanded`.

### Outstanding issues

- Full manual visual handoff comparison in Advanced Studio was not rerun in this pass. The exact import behavior is covered by focused store tests for 3-panel edited geometry, 4-panel edited geometry, image preservation, panel count preservation, panel order, and legacy template-only fallback.

### Risks or caveats

- `imageId` is payload metadata only until `comicStore.Panel` grows a compatible image ID field.
- Existing Advanced Studio shape behavior remains untouched; Guided Flow still hands off rectangular panels only.

### Operator follow-up

- With browser access restored, manually run the full visual handoff once: edit a 3-panel Guided Layout page, send it to Advanced Studio, accept the confirmation, and compare Advanced Studio panel positions/images against the Guided canvas.

### Next steps

- After manual proof, consider documenting the new payload as the preferred handoff contract and keep the legacy fallback as a guarded compatibility path.

---

## Advanced Comics Studio Regression Pass - 2026-05-10

### What changed

- Added a focused Advanced Comics Studio regression result document with pass/fail notes, automation coverage, browser access status, manual coverage, known gaps, and the explicit legacy-code hold.
- Added focused `comicStore` regression tests for project serialization/load compatibility, panel image preservation across shape and geometry updates, panel geometry serialization, balloon text/tail serialization, and legacy saved page loading.
- Ran a manual in-app browser pass through Guided Comic Flow into Advanced Studio and confirmed the imported page opened with 3 panels and visible panel images.
- Documented that the modernization is not clean enough for legacy-code removal because the full canvas manipulation checklist was only partially completed manually.

### Files touched

- `docs/comic-engine-regression-results.md`
- `src/stores/__tests__/comicStoreSerialization.test.ts`
- `walkthrough.md`

### Implementation notes

- The new focused store test stubs the browser download path used by `serializeProject` so the generated comic project JSON can be inspected without triggering jsdom navigation behavior.
- Serialization coverage now explicitly checks panel image fields, panel geometry fields, layer order, balloon text, balloon tail points, and balloon overrides.
- Legacy load coverage intentionally uses an older project-shaped payload without newer page fields to verify that existing `loadProject` compatibility continues to preserve panels, images, balloons, and layer order.
- Browser automation confirmed the in-app Browser path works for this repo. External Chrome was visible through Computer Use, but tab switching/navigation remained unreliable in this pass, so Chrome was not used as the source of manual sign-off.

### Verification

- `npm run test -- src/stores/__tests__/comicStoreSerialization.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/modes/comic/types/__tests__/comicObjects.test.ts` - PASS; 3 files, 11 tests.
- `npm run build` - PASS; Vite reported the existing large chunk-size warning for built assets.
- `npm run lint` - PASS with 0 errors and 67 existing warnings in pre-existing areas.
- Manual in-app browser check - PASS for opening ARCS Expanded, opening Comic Creator, sending Guided Flow page 1 to Advanced Studio, and visually confirming Advanced Studio showed `Page 1` with `3 Panels` and imported panel images.

### Outstanding issues

- Full manual canvas interaction remains incomplete: page creation, Advanced Studio image insertion, panel drag/resize, shape switching, balloon creation/editing, tail dragging, layer reorder, save/reload, and export still need a clean manual UI pass.
- External Chrome access is improved enough to inspect Chrome, but not reliable enough yet for this repo's local-app manual regression flow.

### Risks or caveats

- Store/import tests cover the key data-preservation risks, but they do not replace the remaining UI-level Konva canvas regression checks.
- Legacy compatibility code must remain until the manual checklist is clean.

### Operator follow-up

- Complete the remaining manual Advanced Studio checklist with direct UI control or a more reliable low-level canvas automation path.

### Next steps

- After the manual pass is clean, update `docs/comic-engine-regression-results.md` with final pass notes before considering any legacy compatibility removal.

---

## Guided Layout Progressive Disclosure - 2026-05-10

### What changed

- Added progressive disclosure to the Guided Comic Flow Layout step so the page now clearly presents Simple, Edit, and Advanced Studio levels.
- Added the required product copy: "Start with a layout, then adjust it." and "Use Advanced Studio for custom shapes, lettering, overlays, and final polish."
- Added Simple layout controls for choosing panel count, choosing a starter preset, making the selected panel bigger, making the selected panel wider, applying safe margins, resetting the selected starter layout, and regenerating the starter layout.
- Kept Edit mode as the rectangular drag/resize surface with panel numbers, basic labels, snapping behavior, page bounds, minimum-size enforcement, and image-preserving geometry edits.
- Kept Advanced Studio visible as the power-user path for custom shapes, masks, overlays, balloons, lettering, freeform composition, and final export polish.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `walkthrough.md`

### Implementation notes

- Advanced Studio code and shape behavior were not removed, hidden, or weakened.
- The new Simple/Edit toggle only changes the Guided Layout control surface; the underlying shared geometry and handoff data remain the same.
- Simple quick-size actions use the existing guided geometry sync and snapping helpers, so updated rectangles stay within the page model and preserve panel metadata/images.
- The panel count selector reuses the existing `updatePagePanelCount` path so Guided UI sections continue to share the selected count.
- Reset and Regenerate are intentionally starter-layout actions in Guided Flow; freeform/custom composition remains in Advanced Studio.

### Verification

- `npm run test -- src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` - RED first; failed as expected before implementation because `GUIDED_LAYOUT_DISCLOSURE_COPY` was undefined.
- `npm run test -- src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` - PASS; 1 file, 3 tests.
- `npm run test -- src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` - PASS; 4 files, 30 tests.
- `npm run build` - PASS; Vite reported the existing large chunk-size warning for built assets.
- `npm run lint` - PASS with 0 errors and 67 existing warnings in pre-existing areas.
- Manual in-app browser smoke check - PASS for opening ARCS Expanded, opening Comic Creator, confirming the Guided layout level copy, confirming Simple quick controls, switching to Edit mode, and confirming Advanced Studio remains visible from the Guided Flow shell.

### Outstanding issues

- None for this progressive-disclosure pass.

### Risks or caveats

- Simple `Reset layout` and `Regenerate layout` both rebuild from the selected starter preset today; the labels separate beginner intent while keeping the existing starter-template behavior.
- Guided Flow still only edits rectangular panels. Oval/circle/custom panel shapes, masks, overlays, balloons, lettering, and advanced export polish remain Advanced Studio responsibilities.

### Operator follow-up

- None.

### Next steps

- Keep any future Guided Layout additions layered over the shared geometry adapters so Advanced Studio continues to receive exact edited rectangles and images.

---

## Comic Portal QA Subagent Assignment and Results - 2026-05-11

### What changed

- Recorded the non-human QA pass for the Comic Portal, Guided Comic Flow, Guided-to-Advanced handoff, comic store compatibility, and regression documentation.
- Split QA responsibility into subagent-friendly tracks and kept canvas-heavy visual checks in a separate human-style QA list.
- No runtime implementation files were changed as part of this QA coordination pass.

### Files touched

- `walkthrough.md`

### QA performed

- Automated QA subagent ran focused comic tests plus build and lint.
- Guided Flow static QA subagent inspected panel count preservation, Simple/Edit progressive disclosure, Simple control wiring, rectangular-only Edit behavior, image metadata preservation, and Advanced Studio entry visibility.
- Guided-to-Advanced handoff/store QA subagent inspected payload shape, import priority, geometry/image/order preservation, template fallback behavior, and store compatibility.
- Documentation QA subagent inspected `docs/comic-engine-regression-results.md`, `docs/comic-engine-protection-plan.md`, `docs/comic-object-schema-audit.md`, and recent walkthrough entries for regression coverage and remaining gaps.

### Results

- Automated focused QA: PASS. `npm run test -- src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/stores/__tests__/comicStoreSerialization.test.ts` passed with 5 files and 33 tests.
- Build: PASS. `npm run build` completed successfully with the existing Vite large chunk warning.
- Lint: PASS with warnings. `npm run lint` completed with 0 errors and 67 existing warnings.
- Guided Flow static QA: PASS. Code inspection and focused tests confirmed preserved panel counts, required progressive disclosure copy, wired Simple controls, rectangular-only Edit drag/resize behavior, image metadata preservation, and retained Advanced Studio entry points.
- Guided-to-Advanced handoff/store QA: PASS with caveats. Tests and inspection confirmed normalized rectangles, panel count, order, image URLs, template metadata, AI intent when present, shape defaults, and legacy fallback paths. Caveats remain for product/manual confirmation: `imageId` is present in the handoff payload but Advanced Studio currently imports image URL fields, and the store targets the current Advanced page before using payload `pageId`.
- Documentation QA: PASS with recommended follow-up. Regression documentation is usable, but should later add a clearer protection-checklist coverage matrix, explicit automation-boundary notes, and a visible "legacy removal blocked pending full manual UI pass" status.

### Human-style QA list

- Create a Guided Comic draft and visually confirm the full step flow feels coherent.
- Select 3, 4, 5, and 6 panels and confirm every visible Guided UI section reflects the selected count.
- In Guided Layout Simple mode, select panels and use bigger, wider, reset, and regenerate controls.
- In Guided Layout Edit mode, drag panels, resize panels, and confirm snapping, bounds, and minimum size.
- Assign images to panels, then resize/move panels and confirm images remain attached.
- Send edited 3-panel, 4-panel, and 6-panel Guided pages to Advanced Studio and visually compare positions/images/order.
- Confirm whether Advanced Studio must preserve `imageId`, not only image URL.
- Confirm whether imported Guided `pageId` should replace/select a page or intentionally import into the current Advanced page.
- In Advanced Studio, create a page, add panel images, move panels, resize panels, and change panel shapes.
- Confirm images remain intact after rectangle, oval/circle, and custom shape changes.
- Create balloons, edit balloon text, resize balloons, and move balloon tails/pointers.
- Verify layer tree selection and ordering through visible UI interaction.
- Test overlays, masks, and freeform composition if supported in the current UI.
- Save/reload a project if supported and confirm panels/images/balloons/layers persist.
- Export if supported and visually inspect output.
- Check desktop and narrower viewport layouts for overlapping controls or unreadable labels.
- Update `docs/comic-engine-regression-results.md` after the manual pass with final pass/fail notes.

### Outstanding issues

- Human-style Advanced Studio canvas QA remains pending and is now explicitly separated from subagent/static/automated QA.
- Legacy compatibility code should remain in place until the human-style QA pass is clean.

### Risks or caveats

- Subagent QA can prove store, serialization, import, and static UI wiring, but it does not replace human visual confirmation of Konva canvas drag/resize, shape editing, layer reorder, save/reload UX, or export output.
- Documentation recommendations were captured here, but `docs/comic-engine-regression-results.md` was not updated in this prompt.

### Operator follow-up

- Complete the human-style QA list above.
- After manual QA, update `docs/comic-engine-regression-results.md` with pass/fail notes and any known issues.

### Next steps

- If human QA finds regressions, patch them without removing legacy compatibility helpers until the regression pass is clean.

---

## Guided Story AI Phase Separation - 2026-05-11

### What changed

- Restructured Guided Comic Flow Step 2 so story help is presented as Story Intake, Outline Generation, then optional Readiness Review.
- Reframed Step 2 copy so AI acts as a co-writer first and structure checks stay quiet until an outline exists.
- Changed the Step 2 AI assist buttons to intake/co-writing actions: Expand premise, Generate possible conflicts, Suggest character dynamics, and Generate story foundation.
- Moved Generate issue outline into the new Outline Generation section and exposed editable outline beat textareas for opening hook, rising conflict, midpoint turn, climax, and ending beat.
- Replaced the early "Guided readiness checks" sidebar framing with softer "Outline development" / "Story pacing assistant" language.
- Replaced Step 2 pacing badges from "Ready" / "Gap" to "Detected" / "Develop" when review is available.
- Added a `suggest_character_dynamics` guided comic assist action to the shared writer contract and Supabase edge-function schema.
- Updated writer-tools guided comic prompt guidance so story intake actions avoid pacing/readiness critique, outline generation creates structure without grading, and review actions remain optional editorial assistance.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `src/shared/writer/__tests__/schemas.test.ts`
- `src/shared/writer/schemas.ts`
- `src/shared/writer/types.ts`
- `supabase/functions/_shared/writerSchemas.ts`
- `supabase/functions/writer-tools/index.ts`
- `walkthrough.md`

### Implementation notes

- Pacing checks are still computed locally, but they are only sent to writer-tools for review-oriented actions after an outline exists.
- Story intake actions no longer include `pacingChecks` in the AI request context, preventing foundation generation from immediately critiquing hook, midpoint, climax, or page balance.
- `hasGuidedComicOutlineDraft` centralizes the outline-exists gate used by the Step 2 sidebar and tests.
- Existing Guided Flow state remains local; no Advanced Studio behavior, routing, or handoff logic was changed.
- The in-app browser already had a draft with outline content, so the smoke check verified the post-outline assistant state. The pre-outline inactive state is covered by focused tests.

### Verification

- `npm run test -- src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/shared/writer/__tests__/schemas.test.ts src/portals/guided-comic/__tests__/guidedComicAi.test.ts` - PASS; 3 files, 45 tests.
- `npm run build` - PASS; Vite reported the existing large ComicPortal chunk warning.
- `npm run lint` - PASS with 0 errors and 67 existing warnings.
- Manual in-app browser smoke check at `http://localhost:5173/` - PASS for Step 2 showing "Build the story in phases", "Phase 1 - Story Intake", "Phase 1 co-writer", the new intake AI buttons, "Phase 2 - Outline Generation", and "Generate issue outline"; the old "Guided readiness checks", "Ready", and "Gap" strings were not visible in the Step 2 snapshot.

### Outstanding issues

- None known for this UX restructuring pass.

### Risks or caveats

- The new `suggest_character_dynamics` action is accepted by the shared schemas and writer-tools prompt builder, but live AI behavior still depends on the deployed Supabase function using this updated code.
- Step 2 now has more visible structure; future polish may tune spacing once the user has tried the flow with an empty draft and a partially completed draft.

### Operator follow-up

- Try Step 2 from an empty/new guided draft to confirm the inactive "Outline development" sidebar feels calm before any outline exists.

### Next steps

- If the live writer-tools function is deployed separately, deploy the Supabase function update before expecting `suggest_character_dynamics` to work in a hosted environment.

---

## Writer Tools Function Deployment for Guided Story UX - 2026-05-11

### What changed

- Deployed the updated Supabase Edge Function `writer-tools` so the live function includes the Guided Comic Flow Step 2 story-intake prompt guidance and the new `suggest_character_dynamics` action schema.
- Verified the deployed function is active in the linked Supabase project.

### Files touched

- `walkthrough.md`

### Implementation notes

- Deployment used the linked Supabase project ref `vxclogwiytxjolisnakd`.
- The local function config keeps `[functions.writer-tools] verify_jwt = false`, matching the existing project setup.
- The deploy uploaded `supabase/functions/writer-tools/index.ts` and `supabase/functions/_shared/writerSchemas.ts`.
- Supabase CLI version used: `2.75.0`.

### Verification

- Checked current Supabase CLI deploy help before deploying: `supabase functions deploy --help`.
- Deployed with `supabase functions deploy writer-tools --project-ref vxclogwiytxjolisnakd --use-api` - PASS.
- Verified with `supabase functions list --project-ref vxclogwiytxjolisnakd` - PASS; `writer-tools` is `ACTIVE`, version `44`, updated at `2026-05-11 11:10:23 UTC`.

### Outstanding issues

- None known for the function deployment.

### Risks or caveats

- This was a function deployment only. No database migrations or Supabase table/RLS changes were made.

### Operator follow-up

- Re-test Guided Comic Flow Step 2 AI actions against the live function if authenticated writer-tools calls are available in the browser session.

### Next steps

- If live AI behavior still feels evaluative, tune the deployed prompt guidance in `supabase/functions/writer-tools/index.ts` and redeploy `writer-tools`.

---

## Guided Comics / Writers Workshop Bridge Direction - 2026-05-11

### What changed

- Added a product and implementation direction document clarifying that Guided Comics should not reinvent the Writers Workshop writing workflow.
- Defined Writers Workshop as the primary system for outline generation/refinement, page beat generation, dialogue drafting, and pacing/page-count revision.
- Defined Guided Comics as the bridge from narrative structure into comic pages, panel beats, visual references, image prompts, layout intent, and Advanced Studio handoff.
- Captured a target Step 2A-2E structure: Story Foundation, Outline, Page Planning, Page Beats, and Dialogue.
- Captured the recommendation to use existing writer-tools modes (`outline_issue`, `page_beats`, `page_beats_issue`, `draft_dialogue`, `pacing_review`) before expanding `guided_comic_assist` further.

### Files touched

- `docs/guided-comics-writers-workshop-bridge-plan.md`
- `walkthrough.md`

### Implementation notes

- This was a planning/architecture guardrail update, not a runtime implementation change.
- The document recommends creating a small tested bridge layer before further Guided Comic Step 2 UI expansion.
- The proposed bridge should convert Writers Workshop issue metadata, outline JSON, page beats JSON, and dialogue into Guided Comic page cards, panel beats, and visual/panel metadata.
- The document preserves current architecture constraints: no Advanced Studio changes, no routing changes, and no forced database dependency for the local beginner flow.

### Verification

- Inspected Writers Workshop surfaces in `src/portals/writer/WriterPortal.tsx`, `src/portals/writer/writerNextStep.ts`, `src/shared/writer`, and `supabase/functions/writer-tools/index.ts`.
- Confirmed Writers Workshop already owns mature outline, page beats, dialogue, and pacing workflows.
- Added `docs/guided-comics-writers-workshop-bridge-plan.md` and verified the file exists.
- Verified this walkthrough section landed with `rg -n "Guided Comics / Writers Workshop Bridge Direction" walkthrough.md`.

### Outstanding issues

- The bridge layer is not implemented yet.
- Guided Comic Step 2 still has recent local phased-story UX changes; future work should converge it toward Writers Workshop reuse rather than expanding another parallel writing workflow.

### Risks or caveats

- Further Guided Comics writing UI work should be paused until the bridge contract is designed, or the product may continue duplicating Writers Workshop in a weaker form.

### Operator follow-up

- Decide whether Guided Comics should create/select a Writers Workshop issue automatically or only when the user opts into deeper writing tools.
- Decide whether Guided Comics should store a persistent `writerIssueId` in its local project/library snapshot.

### Next steps

- Implement `src/portals/guided-comic/writersWorkshopBridge.ts` with tests for mapping Writers Workshop outline/page beat/dialogue outputs into Guided Comic page cards and panel beats.

---

## Guided Comics Bridge Decisions and Open-Question Form Preference - 2026-05-11

### What changed

- Updated the Guided Comics / Writers Workshop bridge plan to replace open questions with answered product decisions.
- Captured that Guided Comics must remain local-first and must not silently auto-create Writers Workshop issues.
- Captured that Guided Comics should store an optional persistent `writerIssueId` in local draft/library snapshots while keeping Guided Comics and Writers Workshop as separate source-of-truth domains.
- Captured that accepted Writers Workshop dialogue should become panel/page narrative metadata and optional Advanced Studio balloon seed metadata.
- Captured that Guided Comics should call existing writer-tools modes directly whenever possible so normal comic creation stays inside the unified Guided workflow.
- Added a global preference memory note: future AI-generated documents with unresolved open questions should also include a fillable answer form in chat.

### Files touched

- `docs/guided-comics-writers-workshop-bridge-plan.md`
- `walkthrough.md`
- Global memory note: `/Users/apoaaron/.codex/memories/extensions/ad_hoc/notes/20260511T090127-0400-fillable-open-questions.md`

### Implementation notes

- The bridge plan now treats Writers Workshop as an additive power-up rather than a required detour.
- Persistent writer database state is additive for long-term story management, continuity, exports, issue libraries, collaboration/sync, and deeper Writers Workshop workflows.
- A beginner should be able to enter a premise, generate an outline, generate page beats, generate dialogue, create comic pages, and experiment locally without understanding Writers Workshop issue persistence.
- The global memory note instructs future agents to surface document open questions in chat as copy/paste-friendly forms with suitable input types and blocker/non-blocker labels.

### Verification

- Updated `docs/guided-comics-writers-workshop-bridge-plan.md`.
- Added the global memory note at `/Users/apoaaron/.codex/memories/extensions/ad_hoc/notes/20260511T090127-0400-fillable-open-questions.md`.
- Verified this walkthrough section with `rg -n "Guided Comics Bridge Decisions and Open-Question Form Preference" walkthrough.md`.

### Outstanding issues

- Existing generated documents may still contain unresolved open questions from earlier work. They were not audited in this prompt.

### Risks or caveats

- The global memory note is an ad hoc memory update request; it records the preference for future sessions, but it does not rewrite already-generated docs unless explicitly requested.

### Operator follow-up

- If there are other existing project documents you want checked for unresolved open questions, request an audit and I should produce a fillable form for any findings.

### Next steps

- Use the answered bridge decisions when implementing the `writersWorkshopBridge.ts` adapter.

---

## Guided Comics / Writers Workshop Bridge Adapter - 2026-05-11

### What changed

- Added the first tested bridge adapter for moving Writers Workshop outputs into Guided Comics without changing the visible Guided Flow or Advanced Studio behavior.
- Created `writersWorkshopBridge.ts` to convert accepted issue outlines into Guided page cards, convert writer page beats into Guided panel beat text, and extract dialogue seed metadata from comic script pages.
- Added optional `writerIssueId` persistence to Guided Comic draft/project snapshots so local Guided Comics can remember a linked Writers Workshop issue while staying local-first.
- Added tests for outline-to-page-card mapping, page-beat-to-panel-beat mapping, dialogue seed extraction, and project-library preservation of the optional writer link.

### Files touched

- `src/portals/guided-comic/writersWorkshopBridge.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- This is an adapter slice only. It does not create Writers Workshop issues, does not call Supabase from Guided Comics, and does not replace existing Guided Comic or Advanced Studio runtime logic.
- `mapWriterOutlineToGuidedPageCards` respects the requested page count, keeps missing pages as empty editable cards, and maps outline scene/summary/emotional turn into starter Guided page card fields.
- `mapWriterPagesToGuidedPageCards` preserves existing Guided page settings such as user-edited summaries, panel count, characters, locations, and expansion state while replacing panel beat text with accepted Writers Workshop page beats.
- `mapWriterDialogueToGuidedDialogueSeeds` extracts panel-numbered dialogue from comic script text and pairs it with matching writer page beat action text for future panel/page metadata or Advanced Studio balloon seed usage.
- `writerIssueId` is optional and nullable in snapshots/drafts so beginner local-first workflows still work without Writers Workshop persistence.

### Verification

- Red test confirmed the new bridge module was missing before implementation.
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts` passed.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only.
- Verified this walkthrough section landed with `rg -n "Guided Comics / Writers Workshop Bridge Adapter" walkthrough.md`.

### Outstanding issues

- The bridge adapter is not wired into the Guided Comic UI yet.
- No automatic or user-triggered Writers Workshop issue selection/creation UI was added in this slice.
- Dialogue seed metadata is prepared by the adapter but is not yet attached to Guided page/panel state or Advanced Studio handoff payloads.

### Risks or caveats

- `GuidedComicFlow.tsx` already contains other local Step 2 UX edits in the current worktree; this slice only added the `writerIssueId` draft/snapshot plumbing in that file.
- Future bridge UI work should continue to keep Guided Comics and Writers Workshop as separate source-of-truth domains connected by tested adapters.

### Operator follow-up

- Decide the first visible bridge entry point: likely offering Writers Workshop after outline generation, pacing review, page beats, dialogue generation, or explicit "Use Writers Workshop".
- When UI wiring begins, preserve the local-first path and never silently create a Writers Workshop issue.

### Next steps

- Wire the bridge adapter into Guided Comic Step 2/Pages flows behind explicit user actions.
- Add tests for preserving local page/panel edits when importing or refreshing Writers Workshop outline, page beat, and dialogue data.

---

## Guided Comics / Writers Workshop Bridge Phase 2 Completion - 2026-05-11

### What changed

- Completed Phase 2 of the Guided Comics / Writers Workshop bridge plan by expanding the bridge adapter to cover the remaining story foundation and Writer issue metadata contract.
- Added tested conversion from Guided Comic story foundation fields into a Writers Workshop issue draft shape containing title, issue number, synopsis, and Guided metadata notes.
- Added tested conversion from a linked Writers Workshop issue row plus optional outline JSON back into a Guided Comic story foundation shape.
- Updated the bridge plan document with an implementation status section marking Phase 1 and Phase 2 complete and identifying Phase 3 as the next boundary.

### Files touched

- `src/portals/guided-comic/writersWorkshopBridge.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `docs/guided-comics-writers-workshop-bridge-plan.md`
- `walkthrough.md`

### Implementation notes

- The new bridge helpers are pure adapters. They do not create database records, call Supabase, or require a linked Writers Workshop issue to use Guided Comics.
- `createWriterIssueDraftFromGuidedStoryFoundation` packages local Guided story intake into a Writer issue draft shape that can be used later by explicit Phase 3 create/link UI.
- `mapWriterIssueToGuidedStoryFoundation` reads `notes.guidedComic` metadata when present and prefers an accepted outline premise over older issue synopsis text.
- This completes the Phase 2 conversion list from the plan: Guided story foundation, Writer issue metadata, Writer outline JSON, Writer page beats JSON, Writer dialogue text, and Guided page card/panel beat outputs.

### Verification

- Red test confirmed the story foundation and Writer issue metadata bridge helpers were missing before implementation.
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts` passed.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only.
- Verified this walkthrough section landed with `rg -n "Guided Comics / Writers Workshop Bridge Phase 2 Completion" walkthrough.md`.

### Outstanding issues

- Phase 3 is not implemented yet: there is still no Guided UI to select, create, open, or import from a linked Writers Workshop issue.
- The bridge adapter is not wired into Step 2/Pages UI actions yet.

### Risks or caveats

- The current implementation intentionally keeps Guided Comics and Writers Workshop as separate source-of-truth domains. Future UI wiring should sync through the adapter rather than merging mutable state directly.

### Operator follow-up

- For Phase 3, add explicit user-controlled bridge actions such as "Continue locally", "Use Writers Workshop outline", and "Import latest Writer issue beats".
- Preserve the rule that Guided Comics must not silently auto-create a Writers Workshop issue.

### Next steps

- Begin Phase 3 by designing the explicit Guided UI entry points for selecting or creating a linked Writer issue.
- Add tests for preserving local page/panel edits when importing refreshed Writer issue data through those UI actions.

---

## Guided Comics / Writers Workshop Bridge Phase 3 Completion - 2026-05-11

### What changed

- Completed Phase 3 of the Guided Comics / Writers Workshop bridge plan.
- Added an explicit Writers Workshop bridge panel to Guided Comic Step 2 with user-controlled actions: `Continue locally`, `Use Writers Workshop outline`, `Import latest Writer issue beats`, and `Open linked issue in Writers Workshop`.
- Added UI for loading existing Writer series/issues, linking a selected issue, and creating a linked Writer issue from the Guided story foundation.
- Added import behavior for the latest linked Writer issue outline, page beats, and dialogue seeds.
- Added a one-shot Writer Portal handoff store so opening a linked issue from Guided Comics can select that issue in Writers Workshop without changing routes.
- Updated Writer Portal to consume the linked issue handoff and preserve a requested issue selection when its issue list refreshes.
- Updated the bridge plan document to mark Phase 3 complete and identify Phase 4 as the next boundary.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/writersWorkshopBridge.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `src/portals/writer/WriterPortal.tsx`
- `src/stores/writerWorkshopBridge.ts`
- `src/stores/__tests__/writerWorkshopBridge.test.ts`
- `docs/guided-comics-writers-workshop-bridge-plan.md`
- `walkthrough.md`

### Implementation notes

- The Phase 3 bridge remains local-first and opt-in. Guided Comics does not silently create Writer issues.
- Creating a linked Writer issue is an explicit button action. It creates/uses a Writer series, creates the issue, stores Guided story foundation metadata in issue notes, updates synopsis/title, and ensures Writer page rows exist up to the Guided target page count.
- Importing from a linked issue uses the shared adapter and merge helpers so local Guided page summaries, panel counts, characters, locations, expansion state, and local-only pages are preserved.
- Dialogue imports are stored as `writerDialogueSeeds` in Guided draft/project snapshots for later panel/page metadata or Advanced Studio balloon seed work.
- The bridge panel shows Writers Workshop as an optional power-up, not a required detour.
- Browser smoke testing intentionally avoided create/import actions because those would write persisted Writer data or modify the current Guided draft.

### Verification

- Red tests confirmed the new outline-beat adapter, merge helpers, bridge action copy, and Writer Portal handoff store were missing before implementation.
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts` passed.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only.
- Manual in-app browser smoke check at `http://localhost:5173/` confirmed Guided Comic Step 2 renders the Phase 3 bridge controls, expands the Writer series/issue selector, and enables import/open actions once an issue is selected.
- Verified this walkthrough section landed with `rg -n "Guided Comics / Writers Workshop Bridge Phase 3 Completion" walkthrough.md`.

### Outstanding issues

- Phase 4 is not implemented yet: Guided Comics does not yet call `outline_issue`, `page_beats`, `page_beats_issue`, `draft_dialogue`, or `pacing_review` directly for linked Writer issues.
- Imported dialogue seeds are persisted in Guided snapshots but not yet surfaced as editable page/panel dialogue UI or Advanced Studio balloon seed payloads.

### Risks or caveats

- Writer issue creation depends on existing Supabase/Writers Workshop table permissions. If the database is not configured or RLS blocks inserts/updates, the UI reports an error and Guided Comics remains local-first.
- The linked issue handoff selects the Writer issue after navigating to Writers Workshop, but it does not change browser URL routing or create a deep link.

### Operator follow-up

- Manually test create/import against a disposable Writer issue when ready, since those actions intentionally mutate persisted Writer data and were not exercised in the browser smoke test.
- Continue to avoid silent Writer issue creation in later phases.

### Next steps

- Begin Phase 4 by wiring linked-issue actions to existing writer-tools modes directly from Guided Comics.
- Add focused tests for direct writer-tools action eligibility and import preservation after generated outline/page beats/dialogue refresh.

---

## Guided Comics / Writers Workshop Bridge Phase 4 Completion - 2026-05-11

### What changed

- Completed Phase 4 of the Guided Comics / Writers Workshop bridge plan.
- Added direct Guided Comic actions for running linked Writers Workshop writer-tools modes without requiring repeated portal switching.
- Added tested request builders for `outline_issue`, `pacing_review`, `page_beats_issue`, and `draft_dialogue` so Guided Comics can call the same underlying modes as Writers Workshop.
- Added safe page-beat batching for linked issues using the shared `WRITER_PAGE_BEATS_ISSUE_MAX` limit.
- Added a Phase 4 bridge UI section in Guided Comic Step 2 with actions for generating a Writer outline, running pacing review, generating page beats, and drafting selected-page dialogue.
- Updated the bridge plan document to mark Phase 4 implemented and identify Phase 5 as the next implementation boundary.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/writersWorkshopBridge.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `docs/guided-comics-writers-workshop-bridge-plan.md`
- `walkthrough.md`

### Implementation notes

- Phase 4 remains opt-in and linked-issue based. Guided Comics still does not silently create Writer issues.
- `buildGuidedWriterToolRequest` centralizes the payload shapes Guided Comics uses for the existing writer-tools modes.
- `getGuidedWriterPageBeatBatchOffsets` keeps `page_beats_issue` calls inside the shared batch limit while covering the full target page count.
- The Guided Step 2 Phase 4 controls stay disabled until a Writer issue is selected or linked.
- Running outline, page-beat, or dialogue generation imports the refreshed linked issue data back into Guided Comics through the existing bridge adapter.
- Running pacing review leaves Guided content unchanged because pacing notes are stored on the Writer issue side.
- No Advanced Studio panel, shape, image, balloon, or export behavior was changed.

### Verification

- Red tests confirmed the Phase 4 writer-tools request helpers and Guided UI action labels were missing before implementation.
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts` passed.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only.
- Manual in-app browser smoke check at `http://localhost:5173/` confirmed the Phase 4 controls render in Guided Comic Step 2 and remain safely disabled when no linked Writer issue is selected.

### Outstanding issues

- The Phase 4 generation buttons were not clicked during browser smoke testing because they call Edge Functions and mutate linked Writer issue content.
- Dialogue seeds are still stored as Guided metadata and are not yet surfaced as editable page/panel dialogue UI or Advanced Studio balloon seed payloads.

### Risks or caveats

- Direct writer-tools actions depend on the same Supabase function availability, database permissions, and linked Writer issue state as Writers Workshop.
- If a linked issue has missing Writer pages, Guided Comics attempts to create pages up to the target page count before page-beat or dialogue generation.

### Operator follow-up

- Test Phase 4 actions against a disposable linked Writer issue before using them on production story data.
- Confirm generated outline/page beats/dialogue import cleanly after each action in a live Supabase-backed browser session.

### Next steps

- Begin Phase 5 by turning accepted story structure, page beats, and dialogue seeds into richer visual storytelling metadata for references, panel prompts, layout intent, and Advanced Studio handoff.

---

## Guided Comics / Writers Workshop Bridge Phase 5 Completion - 2026-05-18

### What changed

- Completed Phase 5 of the Guided Comics / Writers Workshop bridge plan.
- Added a tested visual storytelling metadata adapter that turns Guided page cards, panel beats, layout panel plans, and optional Writer dialogue seeds into page/panel visual metadata.
- Enriched Guided-to-Imageshop panel handoffs with visual storytelling prompts, dialogue context for final lettering, and reference needs.
- Added a visible Art step "Visual storytelling bridge" panel so the selected panel shows the composed visual prompt and dialogue seed context before opening Imageshop.
- Extended Guided-to-Advanced layout handoffs with optional `visualStoryMetadata`.
- Preserved the Phase 5 metadata on imported Advanced Studio panels as optional Guided metadata without changing geometry, images, panel shape behavior, balloons, layer order, or export behavior.
- Updated the bridge plan document to mark Phase 5 implemented and identify editable dialogue/balloon seed refinement as the next boundary.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/writersWorkshopBridge.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `src/stores/imageWorkshopBridge.ts`
- `src/stores/__tests__/imageWorkshopBridge.test.ts`
- `src/stores/guidedComicLayoutBridge.ts`
- `src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `src/stores/comicStore.ts`
- `src/stores/__tests__/guidedComicLayoutImport.test.ts`
- `docs/guided-comics-writers-workshop-bridge-plan.md`
- `walkthrough.md`

### Implementation notes

- `buildGuidedComicVisualPageMetadata` derives reference needs from page key characters/locations, merges matching Writer dialogue seeds by panel number, and keeps layout intent per panel.
- Imageshop prompt construction now includes visual prompt context, dialogue context, and reference needs while preserving the existing no-lettering/no-embedded-text instruction.
- Advanced Studio receives the exact existing layout geometry and panel images as before; Phase 5 only adds optional metadata fields to imported panels.
- The added panel metadata is intended for later dialogue editing, balloon seed, and export polish work. It does not auto-create balloons or change Advanced Studio composition behavior.

### Verification

- Red tests confirmed the Phase 5 visual metadata helper, Imageshop prompt fields, and Advanced Studio metadata preservation were missing before implementation.
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` passed.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only.
- Manual in-app browser smoke check at `http://localhost:5173/` confirmed the Guided Comic Art step renders the `Visual storytelling bridge` panel and keeps the existing Imageshop action available.

### Outstanding issues

- Imported dialogue seeds are now part of visual/Advanced metadata, but there is still no dedicated editable dialogue UI on Guided page/panel cards.
- Phase 5 does not yet promote dialogue into actual Advanced Studio balloon objects; that remains a deliberate later step after manual QA.

### Risks or caveats

- The metadata handoff is additive. Future code should continue treating these fields as optional so legacy Guided and Advanced Studio payloads keep working.
- Live writer-tools generation was not required for this slice; Phase 5 works with already-imported or locally edited Guided page/panel data.

### Operator follow-up

- Manually test a disposable linked Writer issue that has imported dialogue seeds, then send a page to Advanced Studio and confirm the optional metadata is present in serialized panel data if needed.

### Next steps

- Add editable dialogue seed controls in Guided Comics.
- Add an explicit Advanced Studio balloon seed promotion path after manual QA confirms the metadata contract.

---

## Editable Dialogue Seeds and Balloon Seed Refinement - 2026-05-18

### What changed

- Added the next bridge phase: editable dialogue seeds plus explicit Advanced Studio balloon seed metadata promotion.
- Added typed editable dialogue seed helpers that split imported Writer dialogue into per-panel lines with page/panel association, order, speaker, narration/dialogue kind, source attribution, original text, editable text, and status.
- Added local editorial status support for `generated`, `edited`, `accepted`, and `rejected` dialogue seeds.
- Added soft dialogue density analysis for dense dialogue, high text load, possible crowding, narration/dialogue imbalance, and suggestions to reduce dialogue or split a panel.
- Added accepted-only balloon seed promotion metadata via `Promote to Advanced Studio Balloon Seeds`.
- Extended Guided draft/project snapshots to persist editable dialogue seeds and promoted balloon seeds locally.
- Extended Guided-to-Advanced layout handoff payloads with promoted `balloonSeeds`.
- Preserved promoted balloon seeds on imported Advanced Studio pages without creating balloon objects or altering existing panel geometry, images, shapes, export, or balloon behavior.
- Added Guided Art step UI for editing, accepting, rejecting, manually adding, regenerating, and promoting dialogue seeds while keeping final lettering in Advanced Studio.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/writersWorkshopBridge.ts`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts`
- `src/stores/guidedComicLayoutBridge.ts`
- `src/stores/__tests__/guidedComicLayoutBridge.test.ts`
- `src/stores/comicStore.ts`
- `src/stores/__tests__/guidedComicLayoutImport.test.ts`
- `docs/guided-comics-writers-workshop-bridge-plan.md`
- `walkthrough.md`

### Implementation notes

- Guided Comics remains an editorial staging and visual planning layer. It does not auto-place balloons, finalize lettering, or perform page composition.
- Writer imports do not silently overwrite existing editable dialogue seeds. Fresh imports initialize editable seeds only when a page does not already have local editable seeds.
- Explicit dialogue regeneration for a linked Writer issue clears that page's editable/promoted dialogue seed staging before importing the regenerated Writer dialogue.
- Only accepted editable seeds are promoted into balloon seed metadata.
- Rejected seeds remain local editorial state and are excluded from density/promotion output.
- Advanced Studio import stores promoted balloon seeds as page metadata only; `page.balloons` remains empty during Guided layout import unless a separate Advanced Studio action creates actual balloons later.

### Verification

- Red tests confirmed the editable dialogue helpers, density indicators, accepted-only balloon seed promotion, snapshot persistence, and Advanced Studio page metadata preservation were missing before implementation.
- `PATH=/usr/local/bin:$PATH npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` passed.
- `PATH=/usr/local/bin:$PATH npm run build` passed.
- `PATH=/usr/local/bin:$PATH npm run lint` passed with existing warnings only.
- Browser smoke check passed against `http://127.0.0.1:5173/`: Guided Art rendered the `Editable dialogue seeds` surface, `Add local seed`, disabled `Regenerate page dialogue`, and `Promote to Advanced Studio Balloon Seeds`; browser console reported no errors. Mutation-heavy linked Writer/local draft QA remains a human-style follow-up to avoid altering the loaded comic during smoke verification.

### Outstanding issues

- Advanced Studio does not yet expose a UI for consuming promoted balloon seed metadata; it only preserves the metadata safely.
- Full linked Writer issue mutation QA should be run against a disposable issue before using regeneration/promotion on important story data.

### Risks or caveats

- Editable dialogue staging is intentionally lightweight and should not grow into a full script editor inside Guided Comics.
- Future work should keep Advanced Studio responsible for balloon layout, tails, typography, overlap resolution, and final export polish.

### Operator follow-up

- Manually QA linked Writer issue regeneration, local-only manual seed editing, accepted/rejected persistence, mixed narration/dialogue panels, and Guided-to-Advanced metadata handoff with a disposable project.

### Next steps

- Add an Advanced Studio affordance to review promoted balloon seed metadata and optionally create editable balloon drafts under explicit user control.

---

## Guided Comic Flow UI Overlap Regression Fix - 2026-05-18

### What changed

- Fixed Guided Comic Flow layout overlap where long story/Writer bridge controls could visually push under the story preview rail and fixed guided-step sidebar.
- Added containment to the main Guided content column and primary action panel so child controls cannot bleed into neighboring layout tracks.
- Added shrink/truncate behavior to long Comic Library and Writer issue selects.
- Added `min-w-0`, wrapping, and centered multi-line button text to the Writers Workshop bridge and Writer tools button grids.
- Added break-word handling to long story preview text and linked Writer target labels.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- This is a layout-only regression fix. It does not change Guided draft state, Writer issue linking, AI actions, panel geometry, Advanced Studio import, or export behavior.
- The fix keeps the existing desktop two-column Guided workspace and fixed right step rail, but prevents long labels, selects, and button rows from forcing the content column wider than its grid lane.

### Verification

- `PATH=/usr/local/bin:$PATH npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` passed.
- `PATH=/usr/local/bin:$PATH npm run lint` passed with existing warnings only.
- `PATH=/usr/local/bin:$PATH npm run build` passed.
- Browser verification against `http://127.0.0.1:5173/` at a `2048x1152` viewport confirmed the Story step renders the Phase 3 Writer bridge, Writer selectors, story preview rail, and fixed guided-step sidebar in separate horizontal lanes.
- Browser layout measurements confirmed the Phase 3 section and Writer selects clear the story preview rail, and the story preview rail clears the fixed guided-step sidebar.

### Outstanding issues

- None found in the verified Story step overlap path.

### Risks or caveats

- The browser runtime available in this session supported DOM/layout measurement but not viewport screenshot capture; verification used DOM snapshots, console logs, and bounding-box measurements.
- Other Guided steps with unusually long imported text should still be spot-checked during the next human-style QA pass.

### Operator follow-up

- Recheck the pages called out in the screenshot with the user's real draft data after pulling this change into the active app session.

### Next steps

- Continue using overflow and bounding-box checks when adding new Guided cards, especially around the fixed step sidebar and story preview rail.

---

## Writers Workshop Link vs Import UX Clarification - 2026-05-18

### What changed

- Clarified the Guided Comics Writers Workshop bridge so users can tell that linking a Writer issue only connects the draft, while importing is the separate action that copies saved outline/page beats/dialogue into Guided Comics.
- Renamed the primary bridge action from `Use Writers Workshop outline` to `Choose Writer issue`.
- Renamed `Import latest Writer issue beats` to `Import outline/page beats`.
- Renamed the selected issue action to `Link issue only`.
- Added explicit bridge copy explaining that linking connects and importing copies saved Writer structure.
- Added a post-link next-step panel with three clear choices:
  - `Import outline/page beats`
  - `Generate missing page beats`
  - `Open linked issue in Writers Workshop`
- Updated the post-link status message so it says no page or panel beats were imported yet.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `walkthrough.md`

### Implementation notes

- This is a UX-copy and action-surfacing change only. It does not change the underlying bridge adapter, import behavior, Writer generation behavior, local draft persistence, or Advanced Studio handoff.
- The post-link panel reuses the existing import and page-beat generation handlers, so it does not introduce a parallel import path.
- The new copy is exported as `GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY` and covered by the existing Guided Comic bridge/access test.

### Verification

- `PATH=/usr/local/bin:$PATH npm run test -- --run src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed.
- `PATH=/usr/local/bin:$PATH npm run lint` passed with existing warnings only.
- `PATH=/usr/local/bin:$PATH npm run build` passed.
- Browser smoke check against `http://127.0.0.1:5173/` confirmed the Story step renders the clearer bridge summary, `Choose Writer issue`, `Import outline/page beats`, `Open linked issue in Writers Workshop`, and `Generate page beats` with no console errors.

### Outstanding issues

- None for the link/import explanation path.

### Risks or caveats

- The post-link next-step panel appears only after `writerIssueId` is set. Users who have merely selected an issue but not clicked `Link issue only` still need to link before seeing the post-link choices.

### Operator follow-up

- In human QA, link a disposable Writer issue and confirm the new status message makes it clear that no page or panel beats were imported until the user explicitly imports or generates them.

### Next steps

- Consider adding a lightweight import result summary that distinguishes outline rows, page rows, panel beats, and dialogue seeds after import completes.

---

## Guided AI Action Progress Indicators - 2026-05-18

### What changed

- Added a shared `GuidedProgressButton` for long-running Guided Comic AI and Writers Workshop bridge actions.
- Added an animated indeterminate fill across loading buttons so users can see that an AI/Writer action is still active.
- Added an elapsed timer to loading labels, such as `Loading... 0:00`, `Generating... 0:42`, `Importing... 1:15`, and `Drafting... 0:08`.
- Applied the progress treatment to:
  - Guided AI writing assist buttons.
  - Story outline generation.
  - Writer issue loading.
  - Writer outline/page beat import.
  - Writer issue creation.
  - Post-link `Generate missing page beats`.
  - Phase 4 Writer tool actions.
  - Guided AI preview regeneration.
- Added `aria-busy` to active loading buttons for assistive technology.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/styles/theme.css`
- `walkthrough.md`

### Implementation notes

- The progress indicator is intentionally indeterminate because the current Writer/AI APIs do not expose granular progress events.
- The elapsed timer resets when the action completes or the loading state clears.
- This is a UX feedback change only. It does not change the underlying AI calls, Writer tool requests, import behavior, local persistence, or Advanced Studio handoff.

### Verification

- `PATH=/usr/local/bin:$PATH npm run test -- --run src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed.
- `PATH=/usr/local/bin:$PATH npm run lint` passed with existing warnings only.
- `PATH=/usr/local/bin:$PATH npm run build` passed.
- Browser smoke check against `http://localhost:5173/` confirmed the Story step renders 11 Guided progress-enabled AI/Writer buttons and the progress CSS pseudo-element is present.
- Browser interaction check on the safe `Choose Writer issue` action confirmed the active button entered `data-loading="true"`, showed `Loading... 0:00`, and set `aria-busy="true"` with no console errors.

### Outstanding issues

- None for the visible loading feedback layer.

### Risks or caveats

- The fill is not a true percentage-complete indicator. It signals active work and elapsed time until the backend/API returns.
- If a backend request hangs indefinitely, the timer will continue counting; a future pass could add timeout messaging or retry/cancel controls.

### Operator follow-up

- During human QA, run a longer Writer generation and confirm the elapsed timer remains visible for the full wait.

### Next steps

- Consider adding per-action timeout guidance such as “Still working...” after 60 seconds and “This is taking longer than usual” after several minutes.

---

## Guided Reference Character Vault Target Gate Fix - 2026-05-19

### What changed

- Fixed the Guided Comic Image Vault handoff path so Character Vault profile images can show the `Use for guided flow` action for any active guided reference target.
- Added a regression test covering the screenshot path: a Guided Comic `location`/asset-style reference target is active, the user opens a Character Vault profile, and the profile image card still exposes the guided action.

### Files touched

- `src/components/ui/CharacterVault.tsx`
- `src/components/ui/__tests__/CharacterVault.guided.test.tsx`
- `walkthrough.md`

### Implementation notes

- Root cause: `CharacterVault` only passed `guidedSelectionTarget` into `ProfileVaultModal` for `character` and `panel-art` targets. If Guided Comic was matching a `location` reference and the user switched to Character Vault or opened a profile image, the shared pending target still existed, but the profile modal suppressed the guided action.
- The fix keeps the existing one-shot guided vault bridge behavior and only removes the overly narrow Character Vault target gate.
- `AssetVault` already allowed any active guided target, so this brings Character Vault in line with the broader Image Vault behavior.

### Verification

- `npm run test -- --run src/components/ui/__tests__/CharacterVault.guided.test.tsx` passed.
- `npm run test -- --run src/stores/__tests__/guidedComicVaultBridge.test.ts` passed.
- `npm run lint` passed with 0 errors and the existing warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- Browser smoke check opened `http://127.0.0.1:5173/` in a fresh in-app browser tab and confirmed the ARCS app title loads as `ARCS Expanded`.

### Outstanding issues

- None for the missing guided action on Character Vault profile cards.

### Risks or caveats

- This allows a user to intentionally choose a Character Vault image for a location/asset guided reference target after switching tabs. That is broader than the auto-routed default tab, but it matches the existing Asset Vault permissive behavior and preserves user choice.

### Operator follow-up

- In manual QA, from Guided Comic Visual Prep, click `Add reference` for an environment/asset row, switch to Characters if needed, open a profile, and confirm `Use for guided flow` appears on the image card and returns the selected image to Guided Comic.

### Next steps

- Consider applying the same broad target support to NPC Vault if supporting-reference images should be selectable for character/location/panel-art targets too.

---

## Guided Visual Prep Reference Readability and Imageshop Prompt Sync - 2026-05-19

### What changed

- Expanded Guided Comic Visual Prep reference rows so long missing-reference names get a wider label column and can wrap to two lines instead of being forced into a short truncation.
- Shortened the empty reference strip copy and row action label to reduce horizontal pressure in the Visual Prep reference matcher.
- Added a guided Imageshop prompt rebuild path that filters the prompt’s character/location/NPC reference labels from the active Imageshop reference slots.
- Added a stronger reference-style instruction to guided Imageshop prompts so generated panel art is explicitly told to match the active reference images’ style, rendering, palette, lighting, and design language.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/stores/imageWorkshopBridge.ts`
- `src/stores/__tests__/imageWorkshopBridge.test.ts`
- `walkthrough.md`

### Implementation notes

- Visual Prep rows now use shared exported constants for the row grid, name text, empty labels, and action label. The desktop row gives the name column `minmax(190px,260px)`, keeps the reference strip flexible, and narrows the action column to `minmax(104px,124px)`.
- Visual Prep names now use `line-clamp-2` plus `break-words` so titles such as “Non-divine First Contact” remain readable without taking over the row.
- Imageshop now tracks whether the prompt is still guided-reference-linked. Guided art handoffs enable tracking; manually editing the prompt, seeding a prompt, or restoring a session result turns tracking off so user-authored prompt edits are preserved.
- While tracking is enabled, reference-slot changes rebuild the guided prompt with only active slot URLs. Removing a reference therefore removes that reference label from the generated prompt text.
- The prompt helper uses the original guided handoff as the source of truth for known reference labels and filters those labels by active slot URL. Arbitrary manually added URLs can still influence generation as reference images, but they do not invent new guided labels.

### Verification

- `npm run test -- --run src/stores/__tests__/imageWorkshopBridge.test.ts` passed.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` passed.
- `npm run test -- --run src/stores/__tests__/imageWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` passed with 20 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- `git diff --check` passed.
- Browser smoke check reloaded `http://127.0.0.1:5173/`, confirmed title `ARCS Expanded`, confirmed root content rendered, and found no captured console errors.

### Outstanding issues

- None for the annotated Visual Prep row readability and guided Imageshop prompt-sync behavior.

### Risks or caveats

- Active-reference prompt filtering only knows how to label URLs that came from the guided handoff. User-uploaded or pasted images still participate as reference images, but the prompt text cannot name them unless they were part of the guided reference payload.
- The style-match instruction improves generation guidance, but final image style fidelity still depends on the image model and the quality/consistency of the supplied references.

### Operator follow-up

- In manual QA, open Guided Comic Visual Prep on a project with long missing-reference names and confirm the row names wrap cleanly while the `Add ref` button remains compact.
- In Imageshop, open a guided art handoff with multiple references, remove one slot, and confirm the prompt text drops that reference label unless the prompt has already been manually edited.

### Next steps

- Consider showing a subtle “prompt linked to active refs” indicator in Imageshop if users need clearer feedback about when automatic prompt syncing is active.

---

## Page-First Guided Comic Production Workspace Shell - 2026-05-19

### What changed

- Added the first page-first production workspace shell above the existing Guided Comic Flow wizard without removing the old guided UI.
- Added a compact Issue Pages navigator that lets users select pages directly and see production status labels: `needs beats`, `needs dialogue`, `needs art`, `layout ready`, and `ready for Advanced Studio`.
- Added a selected-page production view that renders the chosen page’s panel layout, panel numbers, assigned panel art when present, beat snippets, status chips, and the existing Advanced Studio page handoff action.
- Added a focused panel workspace that opens when a panel is selected and shows page/panel number, editable panel beat, dialogue seed editing, assigned art preview, reference context chips, and existing panel image actions.
- Preserved the old Guided Flow sections below the new shell so manual QA can compare the new page-first workflow before any old scroll-heavy UI is retired.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `walkthrough.md`

### Implementation notes

- The new shell reuses existing local Guided Comic state and handlers instead of introducing a new engine or store: page cards, page summaries, panel beats, editable dialogue seeds, writer dialogue seed fallback, panel art images/statuses, layout geometry, Visual Prep metadata, vault assignment, upload, paste, Imageshop handoff, and Advanced Studio page handoff.
- Added exported production selectors, `getGuidedProductionPageStatus` and `getGuidedProductionPagePanels`, so page status and selected-page panel derivation are testable without rendering the full portal.
- Panel focus actions intentionally call the existing handlers: `requestPanelArtVaultImage`, `handlePanelArtUpload`, `focusPanelPasteTarget`, `openImageshopWithSelectedPanel`, `updatePanelArtStatus`, and page-to-studio handoff remains `openPageInAdvancedStudio`.
- The production shell uses a responsive layout that stacks or reduces columns before the existing Guided Flow right rail can squeeze the page preview. Browser QA caught an early collapsed preview, so the shell now only uses the three-column workspace at wider viewports and keeps the page preview at stable dimensions.
- This pass incorporated the frontend-app-builder direction as an app/workspace surface rather than a landing page: focused navigation, stable panel geometry, domain-specific controls, compact status scanning, and direct page/panel actions.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` passed with 8 tests after the new selector tests were implemented.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` passed with 35 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- Browser QA in the in-app browser at `http://127.0.0.1:5173/` confirmed the Guided Comic Flow renders, the Issue Pages navigator shows mixed page statuses, the page preview has usable dimensions, clicking page 1 panel 1 opens Panel Focus, and the Panel Focus actions for vault, upload, paste, Imageshop, mark ready, next panel, and Advanced Studio are present. No browser console errors were captured.

### Outstanding issues

- The old scroll-heavy Guided Flow sections are still visible below the new shell by design. They should not be collapsed, hidden, or retired until manual QA confirms the new workspace is better.

### Risks or caveats

- This is a shell and workflow reorganization layer, not a full retirement of the old wizard. Some deeper workflows may still send users into the legacy sections while the page-first surface matures.
- Dialogue is still treated as metadata/seeds only in the focused panel workspace. No automatic final balloons were created in this pass.

### Operator follow-up

- Manually QA the new default mental model: Issue -> Page -> Panel. Confirm users can select pages, focus panels, assign art, edit beat/dialogue seeds, move to the next panel, and hand the selected page to Advanced Studio without hunting through the old vertical flow.
- Compare the new shell against the old Guided Flow sections before deciding which legacy sections can be collapsed, hidden, or retired.

### Next steps

- Add richer readiness summaries around characters, assets/locations, art style, and layout intent once the shell has been manually validated.
- Consider making the old guided sections collapsible after manual QA proves the new page-first workspace covers the primary production loop.

---

## Page-First Guided Comic Workspace UX Refinement - 2026-05-19

### What changed

- Refined the new Page-First Production Workspace so it reads more clearly as the central Guided Comics production surface.
- Added reference readiness into production page status logic with a new `needs references` state.
- Shortened the ready-for-studio navigator label to `Advanced-ready` while preserving the internal handoff meaning.
- Made the Issue Pages navigator sticky at desktop widths so page switching remains available while working through the selected page workspace.
- Added a compact workflow phase strip for `Story Foundation`, `Outline`, `Page Plan`, and `Production Workspace` to make the new mental model visible without exposing a giant writing dashboard.
- Added selected-page summary cards for page beats, dialogue seeds, and reference readiness near the page preview.
- Expanded Panel Focus with style continuity context, missing-reference messaging, `Previous panel`, `Next panel`, and a clearer `Mark panel complete` action.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `walkthrough.md`

### Implementation notes

- The `needs references` state is derived from existing Visual Prep reference maps rather than a new storage layer. Page status only blocks on missing references when reference maps or NPC names are supplied to the production status helper.
- `getGuidedProductionMissingReferences` was added as a testable helper for page-level character, location, and NPC readiness.
- The selected-page workspace now surfaces beat/dialogue/reference summaries above the page preview so users can understand the current page without searching old vertical sections.
- Panel Focus still uses existing image and handoff handlers. No Advanced Studio panel geometry, balloon, mask, clipping, layer, export, or save/load behavior was changed.
- Earlier workflow phases are represented as a compact production path strip only. The old Guided Flow implementation remains below the shell until manual QA approves collapse or retirement.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` passed with 35 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- `git diff --check` passed.
- Browser QA at `http://localhost:5173/` confirmed the Page-First shell renders the production path strip, Issue Pages navigator, page beat summary, dialogue summary, reference readiness summary, `Advanced-ready` label, `needs references` status, and a usable page 1 panel button rectangle.

### Outstanding issues

- The in-app browser viewport repeatedly collapsed to a 1x1 surface during deeper coordinate interaction, so this pass did not complete a reliable browser click-through check from page preview panel to Panel Focus after the latest refinement.
- The old Guided Flow sections remain visible below the shell by design.

### Risks or caveats

- `needs references` is page-level because the current visual metadata reference needs are page-level in the Writers Workshop bridge. If future metadata becomes truly panel-specific, the production status helper should be narrowed to panel-level readiness.
- Panel Focus still treats dialogue as seeds/metadata. It does not create final balloons automatically.

### Operator follow-up

- Manually QA panel click-through in the normal browser viewport: select a page, click a panel, confirm Panel Focus shows beat, dialogue, references, style continuity, image state, previous/next panel controls, Imageshop, vault, upload, paste, and Advanced Studio handoff.
- After manual QA, decide which old vertical sections should become collapsed behind Story Foundation, Outline, Page Plan, and Production Workspace.

### Next steps

- Add a first-class production-mode toggle or collapse behavior once manual QA confirms the new shell is the preferred central workflow.
- Consider moving reference readiness from page-level to panel-level if future visual metadata begins differentiating panel-specific references.

---

## Comic Production Prep Workspace - 2026-05-19

### What changed

- Added the first dedicated Comic Production Prep workspace between narrative generation and page/panel production.
- Added Character Prep cards sourced from story/page character names with fields for role summary, visual description, costume notes, continuity notes, art style notes, recurring expressions/moods, visual tags, reference images, and ready state.
- Added Location + Environment Prep cards sourced from story/page locations with fields for setting summary, mood/tone, environment notes, lighting/time-of-day notes, recurring visual motifs, reference images, and ready state.
- Added Prop / Asset Continuity support with addable recurring prop cards, reference images, continuity notes, style notes, reuse tracking, and ready state.
- Added Visual Style Direction controls in the prep layer using the existing `artDirection` state so overall art style, rendering style, color/mood, lighting, and continuity notes remain reusable.
- Added production readiness counts with supportive “ready for production” language.
- Added prep upload support for character, location, and prop references.
- Added prop vault-target support so Asset Vault selections can return into prop prep without changing existing panel art, character, location, or NPC flows.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `src/stores/guidedComicVaultBridge.ts`
- `src/components/ui/VaultChrome.tsx`
- `src/stores/imageWorkshopBridge.ts`
- `src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `src/stores/__tests__/imageWorkshopBridge.test.ts`
- `walkthrough.md`

### Implementation notes

- Production Prep metadata is additive and persists through the guided recovery draft and project-library snapshot via `characterPrep`, `locationPrep`, and `propPrep`.
- The prep layer reuses existing reference maps where possible: character and location prep use `characterReferences` and `locationReferences`; prop prep owns its own reference list because recurring props were not previously represented as first-class guided references.
- `buildGuidedProductionPrepContext` creates continuity text from character prep, location prep, prop prep, and project-wide art direction.
- Panel Focus now shows prepared continuity context when available.
- Imageshop handoffs now accept optional `props` references and `productionPrepContext`. Prompt generation includes prop references and production-prep continuity, and active-reference prompt rebuilding filters prop references along with character/location/NPC references.
- Advanced Studio handoff remains behavior-preserving. Prep context is appended to guided visual prompt metadata sent through the existing `visualStoryMetadata` field rather than changing panel, balloon, mask, clipping, layer, export, or save/load internals.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts` passed with 64 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- `git diff --check` passed.
- Browser QA at `http://127.0.0.1:5173/` confirmed Guided Comic Flow renders, Comic Production Prep appears, and the Character Prep, Location + Environment Prep, Visual Style Direction, Prop / Asset Continuity, and Page production workspace labels are present. The temporary browser viewport override was reset after QA.

### Outstanding issues

- Manual QA should still exercise the full reference assignment loop for prop prep through Asset Vault, including returning the selected vault asset to Guided Comics.
- This first version does not infer prop names from scripts automatically; props are addable manually.

### Risks or caveats

- Prop references are stored in `propPrep` rather than the existing location reference map. This avoids overloading locations but means future shared reference tooling may need to include props explicitly.
- Advanced Studio receives prep continuity as visual prompt metadata only. The protected Advanced Studio runtime was intentionally not refactored.

### Operator follow-up

- Manually QA: upload a character reference, assign a character from vault, prepare a location, add a prop, assign a vault asset to the prop, open Imageshop, and confirm the prompt includes prop references and production-prep continuity.
- Manually QA: send a page to Advanced Studio and confirm existing panel images, geometry, balloons, masks, and exports continue to behave as before.

### Next steps

- Add first-class panel-specific prop detection once script or visual metadata can identify props per panel.
- Consider making Production Prep the default “readying” step while collapsing older Visual Prep sections after manual QA.

---

## Guided Comics Production Workspace Layout Stabilization - 2026-05-19

### What changed

- Stabilized the Page-First Production Workspace layout so the issue page navigator, selected page/panel workspace, and guided controls no longer overlap.
- Removed the desktop dependency on the old fixed right guided-step rail by hiding that fixed rail and removing the `xl:pr-80` page padding that was forcing the center workspace into awkward widths.
- Moved guided-step/current-comic controls into the production workspace as a normal-flow right column.
- Locked desktop production layout to explicit columns:
  - left: Issue Pages navigator
  - center: selected page workspace plus panel focus workspace
  - right: guided-step/current-comic controls
- Added explicit grid placement for the issue page rail, center page workspace, panel focus workspace, and right guided-control rail so CSS auto-placement cannot reorder the columns.
- Kept the issue page navigator in normal layout flow with internal scrolling and sticky desktop behavior.
- Kept the center workspace prioritized with `min-w-0`, contained cards, stable page preview sizing, and the panel focus editor below the selected page workspace.
- Kept medium/narrow responsive behavior in normal flow: the right production rail hides and the existing compact guided-step nav remains available.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- This was a layout stabilization pass only. No new production features were added.
- Existing page selection, panel focus, beat editing, dialogue editing, image assignment, vault actions, Imageshop handoff, and Advanced Studio handoff logic were preserved.
- The old fixed guided-step aside remains in the component tree but is now `hidden`; the active desktop guided controls are rendered inside the production workspace grid.
- The production workspace now uses `xl:grid-cols-[260px_minmax(0,1fr)_240px]` and `2xl:grid-cols-[280px_minmax(720px,1fr)_260px]`, with explicit column/row starts for the left, center, and right areas.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/stores/__tests__/guidedComicLayoutBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts` passed with 64 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- `git diff --check` passed.
- Browser QA at `http://127.0.0.1:5173/` measured the desktop production columns at 1440px wide and confirmed:
  - the fixed legacy rail is not visible,
  - the Issue Pages rail sits in the left column,
  - the guided controls sit in the right column,
  - no overlap between the page rail, center panel workspace, panel focus workspace, or right rail.
- Browser QA selected page 1, page 3, and page 10 from the page navigator and confirmed the selected page heading changed correctly and the panel preview stayed in the center workspace without being covered by side rails.
- Browser QA opened panel focus and confirmed the panel beat textarea, image preview, and actions for vault, upload, paste, Imageshop, mark complete, previous panel, and next panel are present.
- Browser QA at 1024px wide confirmed the right production rail hides, the compact guided-step nav appears, and the page rail and panel focus workspace do not overlap.

### Outstanding issues

- None for the overlap/layout stabilization pass.

### Risks or caveats

- The hidden legacy fixed rail still exists in JSX for now. It can be removed after manual QA confirms the in-grid guided controls fully replace it on desktop.
- The right rail is intentionally narrower and secondary; some library controls are simplified there compared with the older fixed rail, while full controls remain available in the compact/mobile control area and old Guided Flow below.

### Operator follow-up

- Manual QA should visually confirm page 1, page 3, and page 10 on the user’s normal desktop viewport and resize widths, especially any viewport near the `xl` breakpoint.

### Next steps

- After manual QA, consider deleting the hidden legacy fixed rail and consolidating the remaining duplicated mobile/desktop guided controls.

---

## Guided Comics Focus Choreography Mode Isolation - 2026-05-20

### What changed

- Refactored Guided Comic Flow around explicit creative focus modes instead of simultaneous dashboard exposure.
- Added workspace modes for `issue-lightbox`, `story-prep`, `page-production`, and `panel-focus`.
- Added a local reopen preference for `last-active`, `issue-lightbox`, or `page-production`, and persisted the active page/workspace mode through local draft and comic library snapshots.
- Turned Issue Lightbox into a page-first re-entry hub with a compact page rail, current page preview, current page context, and direct actions to enter Page Production or resume the selected panel.
- Reworked Page Production so the comic page/page layout owns the center workspace, with prep surfaces, old guided-step dashboards, and production metadata walls gated out of the mode.
- Replaced the old phase-chip production header with a compact `Issue / Page / Panel` creative breadcrumb and a small Page Production mode marker.
- Added an immersive Panel Focus workspace that centers the selected panel, shows only panel beat/dialogue/image/reference/style/review controls, and includes Previous, Next, Return to page, and Pull back to issue momentum controls.
- Routed step navigation through a mode-aware helper so moving from prep steps into art/layout/export changes the workspace mode instead of leaving the old story dashboard visible.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts`
- `walkthrough.md`

### Implementation notes

- Existing Guided Comic local state remains local React/localStorage state; no routing, portal type, Supabase, or ComicEditor changes were introduced.
- Existing Advanced Studio handoff labels and contracts were preserved; the Page Production action still sends the selected page through the existing guided layout bridge.
- Existing Imageshop, Image Vault, upload, paste, panel image assignment, panel statuses, dialogue editing, layout geometry, and balloon seed state are preserved.
- `getGuidedComicWorkspaceMode()` is the central mode-selection helper. It keeps empty projects in Story/Prep, maps prep steps to `story-prep`, maps art/layout/export to `page-production`, and lets explicit Issue/Page/Panel requests own the screen once pages exist.
- `activePageNumber` and `workspaceMode` now persist into the recovery draft and saved project snapshots so the default reopen behavior can resume the last active creative state.
- `normalizeGuidedComicWorkspaceMode()` and `normalizeGuidedComicReopenPreference()` are exported for focused unit coverage.
- Old hidden production focus/dashboard surfaces were kept non-rendered or hidden rather than deleting related functionality during this UX refactor phase.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` passed with 15 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- Browser QA via the in-app browser at `http://127.0.0.1:5173/` confirmed:
  - the app loads with title `ARCS Expanded` and no relevant console errors,
  - Comic Creator opens the guided flow,
  - Story/Prep shows Production Prep while production modes are not stacked underneath,
  - clicking Art enters Page Production and hides Comic Production Prep, the old Guided Flow hero, old phase chips, and old guided-step production controls,
  - Page Production shows the `Issue / Page / Panel` breadcrumb, compact page rail, selected page workspace, page context disclosure, panel previews, and Advanced Studio handoff,
  - clicking a page panel enters Panel Focus,
  - Panel Focus hides the page rail, Production Prep, and Page Production workspace while showing only selected-panel beat, dialogue, image, reference/style, review, and momentum controls,
  - Pull back to issue enters Issue Lightbox without rendering production prep, page workspace, or panel focus at the same time.
- Browser screenshot capture was attempted through the in-app Browser runtime, but `Page.captureScreenshot` timed out in this session. DOM snapshots and interaction checks were used for rendered QA evidence instead.
- The temporary dev server started for QA on `http://127.0.0.1:5173/` was stopped afterward.

### Outstanding issues

- None for the Phase 1 focus-mode isolation pass.

### Risks or caveats

- This is still a large `GuidedComicFlow.tsx` component. The refactor intentionally avoided a ComicEditor or portal architecture rewrite, so follow-up cleanup should extract mode surfaces only after manual QA confirms the new choreography.
- Visual screenshot evidence could not be captured from the in-app browser due to the Browser runtime screenshot timeout, even though DOM and interaction validation succeeded.

### Operator follow-up

- Manual QA should visually confirm the feel of Issue Lightbox, Page Production, and Panel Focus on the user’s normal desktop viewport and the deployed environment after the next deployment.
- Pay special attention to whether the Page Production center page now feels dominant enough and whether the Issue page rail is quiet enough for large issues.

### Next steps

- Phase 2 can further tune page scale, animation timing, reduced-motion behavior, and inspector density now that simultaneous surface exposure is gated by mode.

---

## Guided Comics Focus Choreography Visual Polish Pass - 2026-05-20

### What changed

- Added a subtle focus-entry animation and shared lit comic stage styling for Issue Lightbox, Page Production, and Panel Focus.
- Rebalanced Page Production from a dashboard-like multi-column workspace into a calmer comic-stage layout with a narrow page-number rail and a visually dominant center page.
- Enlarged and elevated the production comic page so the page canvas is the first visual object in the workspace instead of being surrounded by competing metadata.
- Converted the in-panel production status label into a compact status dot to avoid visual collisions with panel labels while preserving status visibility.
- Reworked Panel Focus into a more cinematic two-column editing view at the app's real desktop content width, with the selected panel dominant and a compact sticky inspector beside it.
- Applied the same focus-surface treatment to Issue Lightbox so the overview feels like a re-entry lens instead of a permanent dashboard.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/styles/theme.css`
- `walkthrough.md`

### Implementation notes

- This pass stayed visual and structural. No Advanced Studio, Imageshop, Image Vault, panel geometry, save/load, export, routing, Supabase, or ComicEditor contracts were changed.
- The Page Production split now starts at the `lg` breakpoint because the live app shell reduces the usable content width enough that the earlier `xl` split left the page rail full-width and pushed the comic page below the fold.
- The page rail now behaves as quiet navigation: page number, status dot, accessible title/label, and selected-state glow rather than repeated page metadata.
- The production panel cards were moved below the stage as a secondary strip so the page remains the hero and panel-by-panel work still stays reachable.
- Panel Focus now uses a large dark stage plus a sticky contextual inspector so beat, dialogue, reference, continuity, and panel actions support the selected panel without competing with it.
- The new focus animation respects `prefers-reduced-motion` by disabling transform-based entry motion for users who request reduced motion.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` passed with 15 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- Browser QA through the in-app browser at `http://localhost:5174/` confirmed:
  - the local app loads as `ARCS Expanded` with no relevant console errors,
  - Story/Prep remains compact and does not stack production/panel surfaces underneath,
  - clicking `Step 5 Art` enters Page Production,
  - Page Production shows a narrow page rail and a large center comic stage in the first viewport,
  - the compact status dot avoids the previous in-panel label collision,
  - clicking a panel enters Panel Focus,
  - Panel Focus shows the selected panel as the dominant object with the contextual inspector beside it,
  - prep, page rail, and page-production workspace surfaces are not simultaneously exposed in Panel Focus.

### Outstanding issues

- None for this visual polish pass.

### Risks or caveats

- This pass was verified against the current local draft content. Manual QA should still inspect richer pages with final/generated art to confirm the enlarged stage framing remains strong.
- The deployed Workers site has not been updated by this pass yet.

### Operator follow-up

- After deployment, repeat the Page Production and Panel Focus visual QA on the deployed site.
- Confirm the page feels dominant enough across the user's normal desktop viewport and any narrower laptop widths near the `lg` breakpoint.

### Next steps

- Continue with finer motion choreography timing, additional inspector density tuning, and eventual removal of old hidden dashboard JSX once manual QA confirms the new focus states are stable.

---

## Guided Comics Panel Momentum Focus Pass - 2026-05-20

### What changed

- Refined Panel Focus around page-local creative momentum instead of issue-wide production accounting.
- Added a compact panel strip inside the cinematic panel stage so creators can move across the current page's panels without returning to the page dashboard.
- Added a cinematic frame treatment for the selected panel preview, including subtle inset focus shading that preserves the panel as the dominant object.
- Reduced explanatory helper copy in the Panel Focus header and replaced it with compact status chips for moment position, art status, and layout intent.
- Updated the visible Panel Focus momentum controls to show current-page sequencing, such as `1/4`, instead of the full issue panel queue, such as `1/88`.
- Kept previous/next momentum inside the visible Panel Focus inspector scoped to the current page, while preserving the older global queue helper for hidden legacy surfaces.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/styles/theme.css`
- `walkthrough.md`

### Implementation notes

- This pass did not introduce new persistence, routing, Advanced Studio, Imageshop, Image Vault, panel geometry, save/load, export, or ComicEditor changes.
- `selectedProductionPagePanelIndex` now tracks the focused panel's index within the selected page's production panels.
- `selectProductionPagePanelByOffset()` moves Panel Focus through panels on the current page only, matching the Page -> Panel -> Next Panel creative loop.
- The new panel strip uses existing `GuidedProductionPanel` state, including `panelId`, `panelNumber`, `status`, and `imageUrl`; it does not create a new panel data model.
- New CSS helpers `guided-panel-cinema-frame` and `guided-panel-strip` live in `src/styles/theme.css` beside the prior focus-stage helpers.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` passed with 15 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- Browser QA through the in-app browser at `http://localhost:5174/` confirmed:
  - Comic Creator opens without relevant console errors,
  - `Step 5 Art` enters Page Production,
  - clicking page 1 panel 1 enters Panel Focus,
  - Panel Focus shows `Moment 1/4` and visible panel momentum `1/4`,
  - the previous issue-wide `1/88` visible momentum leak is gone,
  - the current page panel strip shows panels 1-4,
  - Production Prep and Page Production workspace surfaces are not simultaneously visible inside Panel Focus.
- Browser screenshot evidence was captured for Page Production and Panel Focus during the QA pass.

### Outstanding issues

- None for this panel momentum pass.

### Risks or caveats

- The panel strip was validated with the current local draft's placeholder panel art. Manual QA should also inspect pages with generated art to confirm thumbnail contrast and cropping remain polished.
- The deployed Workers site has not been updated by this pass yet.

### Operator follow-up

- After deployment, verify Page Production -> Panel Focus -> Next panel -> Return to page on the deployed site.

### Next steps

- Continue reducing old hidden dashboard JSX once the new mode surfaces are manually approved.
- Consider a later keyboard/motion pass for arrow-key panel navigation and more explicit zoom/pullback choreography, if desired.

---

## Guided Comics Hub Entry Copy Alignment - 2026-05-20

### What changed

- Updated the home hub Comic Creator card subtitle so the entry point now describes the new Guided Comics focus flow instead of the older panel/balloon canvas framing.
- Updated the Advanced Studio Workflow dropdown heading from `Guided Comic Flow` to `Guided Comics focus flow` so return links from the power-user editor also use the new focus-state language.
- Verified the deployed Workers bundle already contains the Page Production and Panel Focus UX updates, including `CINEMATIC PANEL FOCUS`, `MOMENT 1/4`, and `PANEL MOMENTUM 1/4`.

### Files touched

- `src/shared/portalCatalog.ts`
- `src/modes/comic/components/MenuBar.tsx`
- `walkthrough.md`

### Implementation notes

- This was a copy/routing-context alignment pass only. No portal routing, Guided Comic state, Advanced Studio behavior, Imageshop behavior, Image Vault behavior, geometry, save/load, or export contracts changed.
- The hub subtitle now reads: `Guided Comics: Issue Lightbox, Page Production, and cinematic Panel Focus`.
- The prior deployed-site confusion was not caused by a stale deploy. Browser and bundle checks confirmed the deployed app was current; the new UX appears once the user enters the Page Production/Panel Focus path.

### Verification

- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- Browser QA through the in-app browser confirmed the local hub at `http://localhost:5174/` shows the new Comic Creator subtitle and no longer shows `Create Customizable Panels & Balloons Using Your Images`.
- Bundle inspection confirmed the deployed `ComicPortal` asset includes the new Panel Focus strings and CSS class names.
- Browser QA on `https://asset-reference-comics-studio.onyxzion.workers.dev/` confirmed:
  - Comic Creator opens Page Production,
  - clicking a page panel opens Panel Focus,
  - Panel Focus shows `CINEMATIC PANEL FOCUS`, `MOMENT 1/4`, and visible panel momentum `1/4`,
  - the old issue-wide `1/88` momentum leak is absent,
  - Production Prep and the Page Production workspace are not simultaneously visible in Panel Focus.

### Outstanding issues

- None for this hub entry copy alignment pass.

### Risks or caveats

- The updated hub copy is local until the next deployment.
- The deployed browser screenshot attempt timed out in the Browser runtime, so deployed verification used DOM/text evidence rather than screenshot evidence.

### Operator follow-up

- Deploy this small hub-copy pass when ready so the deployed hub entry matches the already-deployed Guided Comics UX.

### Next steps

- If users still miss the new UX, consider adding a first-run Page Production resume action or a compact in-flow cue from Story/Prep into Page Production once page cards exist.

---

## Guided Comics Story Prep Focus Re-entry Strip - 2026-05-20

### What changed

- Added a compact `Continue in focus mode` strip to Story/Prep when page cards already exist.
- The strip gives creators three direct doors into the new focus choreography:
  - `Issue Lightbox`
  - `Page Production`
  - `Panel Focus`
- The strip appears above Production Prep, so creators who re-enter Story/Prep can immediately see the new Page/Panel production workspace without hunting through step navigation.
- The strip uses the currently selected page and panel context, for example `Page 1 / Panel 1 is ready for the production workspace.`

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- This pass did not add routing, persistence, portal types, Supabase state, ComicEditor changes, or new bridge contracts.
- `focusReentryStrip` reuses the existing focus-mode actions: `openIssueLightbox()`, `openPageProduction()`, and `selectProductionPanel()`.
- The strip only renders in `story-prep` mode and only when `pageCards.length > 0`, preserving the lightweight prep experience for brand-new comics.
- Page Production and Panel Focus still own the screen after activation; Production Prep does not remain visible after entering those modes.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` passed with 15 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large creative-portal chunk warning remains.
- Browser QA through the in-app browser at `http://localhost:5174/` confirmed:
  - Story/Prep renders the `CONTINUE IN FOCUS MODE` strip when page cards exist,
  - the strip shows `Issue Lightbox`, `Page Production`, and `Panel Focus`,
  - clicking `Page Production` opens the Page Production workspace,
  - Production Prep is hidden after entering Page Production,
  - clicking a page panel opens `CINEMATIC PANEL FOCUS`,
  - the Page Production workspace is hidden after entering Panel Focus,
  - no relevant console errors were captured.

### Outstanding issues

- None for this focus re-entry strip pass.

### Risks or caveats

- The strip was verified with the current local recovery draft. Manual QA should confirm the copy feels right on projects with different selected page/panel state.
- The deployed Workers site has not been updated with this pass yet.

### Operator follow-up

- Deploy this pass when ready so the hub-copy update and Story/Prep focus on-ramp land together.

### Next steps

- If the new focus flow still feels too hidden, consider making `Issue Lightbox` the default visual re-entry for saved comics with pages while preserving the user's explicit reopen preference.

---

## Guided Comics Focus Choreography UX Polish Plan Adjustment - 2026-05-20

### What changed

- Added a focused implementation plan for the remaining Guided Comics focus choreography polish work.
- Folded in the previous agent's source plan for the `Issue Lightbox -> Page Production -> Panel Focus` creative rhythm.
- Updated the refactor direction to explicitly use `frontend-house-style` as the design gate before visible UI passes.
- Updated the refactor direction to explicitly use `ui-critic` as the review gate after React/CSS UI changes and before declaring a visual pass complete.
- Added the previous plan's UX resource stack to the continuation doc: `superpowers:brainstorming`, `build-web-apps:frontend-app-builder`, `react-best-practices`, `browser`, and `frontend-testing-debugging`.
- Reframed the remaining work into gated phases: full-flow manual QA, safe React structure cleanup, safe legacy dashboard JSX cleanup, saved-comic re-entry decision, transition/motion polish, responsive/content stress QA, and regression coverage.

### Files touched

- `docs/plans/2026-05-20-guided-comics-focus-choreography-ux-polish.md`
- `walkthrough.md`

### Implementation notes

- This was a planning/documentation adjustment only. No Guided Comics runtime, CSS, routing, portal type, ComicEditor, Supabase/schema, Imageshop, Image Vault, Advanced Studio, save/load, export, panel geometry, shapes, balloons, or image preservation behavior changed.
- The new plan keeps the current focus modes as the core choreography: `story-prep`, `issue-lightbox`, `page-production`, and `panel-focus`.
- The plan makes the intended hierarchy explicit: Panel Focus should prioritize the selected panel, Page Production should prioritize the page/stage, Issue Lightbox should prioritize page-first re-entry, and Story/Prep should keep production on-ramps visible only when page cards exist.
- The plan preserves the previous agent's default reopen direction: last active creative state by default, with Issue Lightbox as the safest fallback when last active state is missing and page cards exist.
- The `ui-critic` gate is positioned after actual UI implementation changes rather than approving this documentation-only pass.

### Verification

- Targeted file check confirmed the new plan file exists.
- Targeted walkthrough check confirmed this section was appended to `walkthrough.md`.

### Outstanding issues

- The full deployed manual QA flow is still pending: Story/Prep -> Issue Lightbox -> Page Production -> Panel Focus -> Next Panel -> Return to Page -> Pull Back to Issue.

### Risks or caveats

- The plan has not yet removed legacy JSX or changed saved-comic default re-entry behavior. Those remain implementation decisions for a later pass.

### Operator follow-up

- Use the new plan as the checklist for the next Guided Comics UI polish implementation pass.
- Run `ui-critic` after the next React/CSS change, ideally with local browser evidence or screenshots.

### Next steps

- Start with the full-flow manual QA pass before deleting any hidden legacy dashboard JSX.

---

## Guided Comics Full-Flow UX QA and Focus Repair Pass - 2026-05-20

### What changed

- Ran a QA-first Guided Comics focus choreography pass against the authenticated local app.
- Verified the full creative rhythm: Story/Prep -> Issue Lightbox -> Page Production -> Panel Focus -> Next Panel -> Return to Page -> Pull Back to Issue.
- Removed hidden legacy Page Production JSX blocks that still contained the old hidden panel-focus workspace and old hidden guided-controls dashboard.
- Updated visible Panel Focus momentum controls from `Previous` / `Next` to `Previous panel` / `Next panel`.
- Shortened Page Production page-rail accessible labels so the rail exposes concise page/status names instead of full page-summary metadata walls.
- Kept prepared visual continuity context available in the visible Panel Focus reference/style drawer after removing the hidden legacy copy.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- This pass stayed inside the existing Guided Comics focus modes: `story-prep`, `issue-lightbox`, `page-production`, and `panel-focus`.
- No portal type, routing, ComicEditor, Supabase/schema, Advanced Studio, Imageshop, Image Vault, save/load, export, panel geometry, shapes, balloons, or image-preservation contracts changed.
- The removed JSX was already hidden with `className="hidden"` and duplicated behavior now owned by the visible focus-mode surfaces.
- The Page Production rail still looks compact and numeric, but its accessible button names now follow `Select page N (status)` instead of including long page summaries.
- The `.agent` -> `.agents` rename remains user-owned and was not reverted or modified by this pass.

### Verification

- Browser QA used the in-app Browser plugin against `http://127.0.0.1:5173/`, which had an active signed-in session.
- `http://127.0.0.1:5174/` was checked first but was blocked by the expected `Sign in to continue` gate, so it was not used for the full flow.
- Browser QA confirmed:
  - Story/Prep renders the focus re-entry strip and Comic Production Prep.
  - Issue Lightbox renders without Page Production, Panel Focus, or Production Prep stacked underneath.
  - Page Production renders without Issue Lightbox, Panel Focus, or Production Prep.
  - Panel Focus renders without Page Production, Issue Lightbox, or Production Prep.
  - `Next panel` moves from Page 1 Panel 1 to Page 1 Panel 2 and updates `Moment 2/3`.
  - `Return to page` restores Page Production while preserving Panel 2 context.
  - `Pull back to issue` restores Issue Lightbox and shows `Resume Panel 2`.
  - Page Production rail labels no longer include long page summaries.
  - No relevant browser console errors or warnings were captured during the QA loop.
- Browser screenshot capture was attempted but `Page.captureScreenshot` timed out in the Browser runtime again, so this pass used DOM snapshots, interaction checks, and console logs for rendered evidence.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts` passed with 15 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large `ComicPortal` chunk warning remains.

### Outstanding issues

- None for this focus-repair pass.

### Risks or caveats

- Browser visual screenshots could not be captured because the Browser runtime screenshot command timed out.
- This pass did not perform deployed-site QA; only the local authenticated app was exercised.
- Story/Prep intentionally still contains the full Production Prep surface because that is the prep mode owner.

### Operator follow-up

- Repeat the same full-flow QA after deployment.
- If screenshots are required for sign-off, capture them outside the current Browser runtime or retry in a fresh browser session.

### Next steps

- Continue with responsive/content stress QA for generated art, long dialogue, many pages, and missing references.

## Guided Comics Comic Library Entry Spec and Checklist Plan - 2026-05-21

### What changed

- Captured the approved Comic Library entry direction as a formal design spec.
- Added a pass-by-pass implementation checklist so future status reports can clearly say what changed visually, what changed under the hood, what should now be visible, what was verified, and what remains pending.
- Defined the new entry rhythm as `Series Cover Gallery -> Series Focus -> Issue Cover Gallery -> Issue Lightbox -> Page Production -> Panel Focus`.
- Preserved the existing issue-level focus choreography after an issue is selected: `Issue Lightbox -> Page Production -> Panel Focus`.
- Documented that the portal should use a blue/gold studio tabletop identity while keeping covers as physical comic-cover objects rather than rounded UI cards.
- Documented the rule that every guided comic, including one-shots, must belong to a series container through `seriesTitle`.

### Files touched

- `docs/superpowers/specs/2026-05-21-guided-comics-comic-library-entry-design.md`
- `docs/superpowers/plans/2026-05-21-guided-comics-comic-library-entry.md`
- `walkthrough.md`

### Implementation notes

- This was a planning/documentation pass only. No runtime React, CSS, persistence, routing, portal type, ComicEditor, Supabase/schema, Advanced Studio, Imageshop, Image Vault, save/load, export, panel geometry, shapes, balloons, or image-preservation behavior changed.
- The plan keeps the current Guided Comic Library as the issue-level source of truth and derives series groups from existing `seriesTitle` metadata.
- The plan introduces local-only preferences for portal entry layout, selected series cover, and the later living-archive background state.
- The first implementation pass is intentionally non-visual: it adds helper tests and helper modules for grouping saved comics into series, deriving cover image candidates, and counting completed/export-stage issues for the archive unlock.
- The visible passes are split into Series Cover Gallery, Series Focus, Issue Cover Gallery, issue workflow handoff, motion/reduced-motion, and full QA/regression.
- The checklist is intended to be copied into future progress reports so the user can tell where implementation stands even when a pass does not immediately produce a visible UI change.

### Verification

- Reviewed the existing `GuidedComicFlow.tsx` project-library state, saved-comic switching, metadata dialog, and current Issue Lightbox/Page Production/Panel Focus gates before writing the plan.
- Reviewed `guidedComicProjectLibrary.ts` and `guidedComicProjectLibrary.test.ts` to keep the plan compatible with the existing local project library contract.
- Ran a placeholder scan against the new spec and plan with `rg -n "TBD|TODO|implement later|fill in|Similar to|appropriate error handling|add validation|Write tests for the above" ...`; no matches were found.
- Self-review caught and corrected an initial coverage gap: cover image candidate helpers and completed-issue counting are now explicit in Pass 1.

### Outstanding issues

- None for the planning pass.

### Risks or caveats

- The `.superpowers/brainstorm/` visual companion artifacts are untracked session files and were not treated as durable project documentation.
- The plan intentionally defers the full animated living panel-collage background until cover selection, panel-image sourcing, reduced motion, and legibility rules are safe.
- The implementation will touch `GuidedComicFlow.tsx`, which is already large; the plan offsets this by placing grouping and preference logic into small helper modules first.

### Operator follow-up

- Review the spec and checklist plan before implementation begins.
- Choose execution mode for implementation: subagent-driven pass-by-pass execution or inline execution in this thread.

### Next steps

- Start with Pass 1: Library Data Foundation.
- Use the checklist in `docs/superpowers/plans/2026-05-21-guided-comics-comic-library-entry.md` as the status tracker after each pass.

## Guided Comics Comic Library Entry Foundation and First UI Pass - 2026-05-21

### What changed

- Implemented the first substantial Comic Library Entry pass using subagents for the independent foundation work.
- Added library view helpers for grouping saved guided comics into series by `seriesTitle`, normalizing series titles/keys, deriving cover image candidates from existing panel art, and counting completed/export-stage issues for the later archive-background unlock.
- Added local-only Comic Library entry preferences for `Cover Gallery`, `Last Series`, and `Hybrid Shelf`, including safe parsing, SSR-safe localStorage reads/writes, and immutable default preference handling.
- Added a local Comic Library entry stage inside `GuidedComicFlow.tsx` without changing the existing issue workspace modes.
- Added the first visible cover-led entry flow:
  - Series Cover Gallery.
  - Series Focus.
  - Issue Cover Gallery.
  - Blank `Start New Series` cover.
  - Blank `Start New Issue` cover.
  - Compact entry layout preference selector.
  - Issue workspace return strip with `All Series` and `Choose Issue`.
- Revised the first UI pass after review so the entry reads less like a dashboard: recent issues now render as mini cover objects, Series Focus metadata is treated as studio notes, placeholder covers use varied seeded palettes, and cover hover feedback no longer uses translate motion.

### Checklist progress

- [x] Pass 1: Library Data Foundation.
- [x] Pass 2: Local Preferences.
- [x] Pass 3: Entry Gate Wiring.
- [x] Pass 4: Series Cover Gallery.
- [x] Pass 5: Series Focus.
- [x] Pass 6: Issue Cover Gallery.
- [x] Pass 7: Issue Workflow Handoff.
- [x] Pass 8: Motion And Reduced Motion baseline for this pass.
- [x] Pass 9: QA And Regression baseline for this pass.
- [ ] Future polish: stronger morph/parallax choreography between cover states.
- [ ] Future polish: fuller pre-rendered tabletop/background asset treatment.
- [ ] Future polish: living archive panel-collage unlock after four completed issues.
- [ ] Future QA: responsive/mobile and deployed-site validation.

### Files touched

- `src/portals/guided-comic/guidedComicLibraryView.ts`
- `src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts`
- `src/portals/guided-comic/guidedComicLibraryPreferences.ts`
- `src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- The new Comic Library entry layer is local UI state only and is separate from `GuidedComicWorkspaceMode`; the existing issue modes remain `story-prep`, `issue-lightbox`, `page-production`, and `panel-focus`.
- Series are derived from existing saved guided comic projects rather than a new schema or portal type.
- One-shot comics still appear under a series container because grouping is based on `seriesTitle`.
- Opening an issue uses the existing saved-comic switching path, then enters the existing issue workflow.
- Starting a new issue uses the selected series title and the next issue number while keeping the user in the existing Story/Prep issue workflow.
- `All Series` and `Choose Issue` are now visible from the issue workspace so users can return to cover browsing after opening an issue.
- No Supabase/schema, ComicEditor, routing, Advanced Studio, Imageshop, Image Vault, save/load, export, panel geometry, shapes, balloons, or image-preservation contracts were intentionally changed.

### Verification

- Subagent implementation and review:
  - Pass 1 helper worker added the library view helpers and tests.
  - Pass 2 helper worker added the preferences helpers and tests.
  - Spec-compliance review approved the foundation helpers.
  - Code-quality review requested defensive handling for malformed `panelArtImages` and immutable default preference coverage.
  - Workers added those fixes; focused re-review approved them.
  - UI integration worker added the first visible entry flow.
  - Spec/UI review requested a visible return path from issue workspace and reduced dashboard-like treatments.
  - A focused repair added the return strip, mini cover recent issues, studio-note metadata, varied placeholder covers, and reduced-motion-safe hover behavior; focused re-review approved it.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts` passed with 12 tests.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts` passed with 27 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed. The existing large `ComicPortal` chunk warning remains.
- Browser QA against `http://127.0.0.1:5173/` in an authenticated session confirmed:
  - Comic Creator opens to the Series Gallery by default.
  - Series covers and the blank `Start New Series` cover render.
  - Clicking a series opens Series Focus.
  - `Choose Issue` opens the selected series Issue Gallery.
  - Clicking an issue enters the existing issue workspace.
  - The issue workspace shows `All Series` and `Choose Issue`.
  - `All Series` returns to the Series Gallery without leaving issue workflow scaffolding visible.
  - Changing the entry layout preference to `Last Series` opens Series Focus, then changing back to `Cover Gallery` restores the gallery.
  - No framework overlay markers such as internal server error, failed compile, uncaught, reference error, type error, or Vite plugin error were found.

### Outstanding issues

- None blocking for this implementation pass.

### Risks or caveats

- The entry layer is still an initial implementation of the tabletop metaphor. It now uses a CSS-backed desk/tabletop treatment, but a future pass should replace or enhance this with a stronger pre-rendered workspace background if desired.
- Morph/parallax transitions are present only as baseline cover-state movement and reduced-motion-safe hover feedback; richer choreography remains a future polish pass.
- The living archive collage unlock is supported by completed-issue counting helpers but the animated collage itself is intentionally deferred.
- Browser QA was local only; deployed-site QA was not performed.

### Operator follow-up

- Visually inspect the new Comic Library entry screen and decide whether the tabletop treatment is strong enough for the next iteration or should move immediately to a generated/pre-rendered background asset.
- Continue using the checklist status in future pass reports so visual and non-visual work stays easy to track.

### Next steps

- Run responsive QA for the new library entry layer.
- Add richer cover transition choreography if the current baseline interaction feels too static.
- Design and implement the eventual living archive background unlock after the cover library is stable.

## Guided Comics Comic Library Polish and QA Pass - 2026-05-21

### What changed

- Committed and pushed the completed Comic Library Entry baseline to `origin/main` with commit `1012134` (`feat: add guided comics cover library entry`).
- Added a narrow `.gitignore` rule for `.superpowers/brainstorm/*/state/` so durable brainstorm HTML remains trackable while transient `server.pid` / `server-stopped` files stay out of git.
- Strengthened the Comic Library tabletop layer with shared CSS for:
  - the desk/background surface,
  - sharper comic-cover object treatment,
  - paper-like blank covers for new series/issues,
  - baseline stage choreography for Series Gallery, Series Focus, Issue Gallery, and issue workspace return.
- Reduced remaining app-shell feel in the entry header by replacing the larger preference block with a compact `Library View` control.
- Improved cover-grid responsiveness by using auto-fitting cover columns for both series and issue galleries.
- Addressed `ui-critic` findings by:
  - preventing decorative cover sheen from washing out cover art/text,
  - removing blur from stage transitions,
  - strengthening the issue-workspace return strip into clearer library navigation,
  - improving focus affordance and labeling for the library view selector.

### Checklist status

- [x] Commit current Comic Library Entry baseline.
- [x] Push baseline to `origin/main`.
- [x] Preserve durable `.superpowers/brainstorm/*/content/*.html`.
- [x] Ignore transient `.superpowers/brainstorm/*/state/`.
- [x] Improve tabletop illusion without adding new assets or schema.
- [x] Keep blue/gold as lighting and identity rather than making blank covers blue/gold panels.
- [x] Add baseline cover-state choreography.
- [x] Respect `prefers-reduced-motion`.
- [x] Run `ui-critic` review and apply top-impact fixes.
- [x] Run focused Vitest, lint, and build.
- [x] Browser QA the main library path locally.
- [x] Browser QA desktop and tablet widths.
- [x] Browser QA narrow/mobile re-entry through compact navigation.
- [~] Empty-library/no-saved-series QA: the blank `Start New Series` cover was observed earlier in the live local session, but the final browser session contained existing saved series.
- [~] Many-series/many-issues QA: helper coverage and responsive grid behavior were verified structurally; the live browser session only exposed the currently saved local library, not an injected fixture.
- [~] Missing-cover QA: existing saved series with missing/placeholder covers rendered through the placeholder cover path.

### Files touched

- `.gitignore`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/styles/theme.css`
- `walkthrough.md`

### Implementation notes

- This pass did not add new Guided Comic modes, portal types, routes, Supabase state, or ComicEditor changes.
- The new motion is CSS-only and scoped to the library entry layer. It uses opacity/scale/translate without blur after review feedback, and disables animation under `prefers-reduced-motion`.
- The shared `.guided-library-cover` treatment keeps cover content above decorative layers so real art and placeholder text remain readable.
- The issue workspace return strip is now sticky and more navigational, preserving the user’s ability to return to `All Series` or `Choose Issue` without altering the underlying issue workflow.

### Verification

- Before baseline commit:
  - `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts` passed with 27 tests.
  - `npm run lint` passed with 0 errors and the existing 67-warning baseline.
  - `npm run build` passed with the existing large `ComicPortal` chunk warning.
- After polish changes:
  - `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts` passed with 27 tests.
  - `npm run lint` passed with 0 errors and the existing 67-warning baseline.
  - `npm run build` passed with the existing large `ComicPortal` chunk warning.
- Browser QA against `http://127.0.0.1:5173/` confirmed:
  - Comic Creator opens to the `Cover Table` / Series Gallery.
  - Series Focus opens from a cover.
  - `Choose Issue` opens the Issue Gallery.
  - An existing issue opens into the current Guided issue workflow.
  - `All Series` returns to the cover library.
  - `Choose Issue` from the issue workspace returns to the issue cover gallery.
  - Desktop (`1440x900`) and tablet (`820x900`) viewport checks preserved `Cover Table`, saved series, and blank cover markers.
  - Narrow viewport (`390x820`) re-entry worked through the compact navigation `More` / `Comic Creator` path.
  - Browser console error log was empty.

### Outstanding issues

- Screenshot capture in the in-app browser timed out after viewport switching, so final QA evidence was DOM/interaction based rather than screenshot-based.

### Risks or caveats

- The existing issue workflow still shows Story/Prep production surfaces when opening a saved issue whose saved state resolves there; this pass preserved that contract rather than changing issue-mode re-entry behavior.
- The final live browser QA used the user’s current saved local library. A fuller many-series/many-issues visual fixture pass remains useful once we have a safe browser-storage seeding path or a dedicated test harness.

### Operator follow-up

- Review the live tabletop look visually and decide whether to keep the CSS-light desk for now or replace it with a generated/pre-rendered studio tabletop asset in the next visual pass.
- Run deployed-site QA after the next deploy, especially for saved libraries with many cover images.

### Next steps

- Add a safe local QA fixture or storybook-style harness for many-series/many-issue gallery states.
- Continue polishing cover-object choreography once the entry layer is visually approved.
- Revisit saved-comic issue re-entry behavior separately from the cover-library entry pass.

## Guided Comics Comic Library Task Tracker Sync - 2026-05-21

### What changed

- Updated `docs/superpowers/plans/2026-05-21-guided-comics-comic-library-entry.md` so its original pass checklist reflects the completed Comic Library implementation and polish work.
- Marked completed implementation passes as `[x]`.
- Marked partially completed/deferred areas as `[~]` instead of treating them as fully complete.
- Left the Living Archive affordance open because completed-issue counting exists, but the locked/unlocked background UI was intentionally deferred.
- Left broad deployed QA and Advanced Studio/Imageshop/Image Vault/save/load/export regression open because the last pass verified the Comic Library path locally, not the full product regression matrix.

### Files touched

- `docs/superpowers/plans/2026-05-21-guided-comics-comic-library-entry.md`
- `walkthrough.md`

### Verification

- `rg -n "Pass 1: Library Data Foundation|Status note: entry-layout preference helpers|Guided Comics Comic Library Task Tracker Sync" docs/superpowers/plans/2026-05-21-guided-comics-comic-library-entry.md walkthrough.md`
- `git status --short`

### Outstanding issues

- The formal plan still has open items for Living Archive UI, richer morph/parallax choreography, deployed QA, many-series fixture QA, and broad regression checks.

### Risks or caveats

- This was a documentation/task-tracker sync only; no app behavior changed.

### Operator follow-up

- Use the formal plan and the latest walkthrough checklist together: `[x]` means completed, `[~]` means partially complete with an explicit status note, and `[ ]` remains future work.

### Next steps

- Continue with either a commit for the current polish/docs delta or a dedicated QA fixture pass for many-series/many-issue states.

## Guided Comics Comic Library QA Fixture Pass - 2026-05-21

### What changed

- Added a dev-only Comic Library QA fixture path for repeatable local browser checks without overwriting real saved comics.
- Supported query-string fixtures:
  - `?guidedComicLibraryFixture=many`
  - `?guidedComicLibraryFixture=missing-covers`
  - `?guidedComicLibraryFixture=empty`
- Added synthetic library generation for:
  - many series,
  - many issues in one series,
  - completed issues,
  - missing cover images,
  - empty library / blank-cover start state.
- Added a persistent in-app QA note when a fixture is active: `Local QA fixture: ... Real saved comics are not overwritten.`
- Skipped Comic Library localStorage writes while a QA fixture is active so fixture browsing does not replace the user’s real saved library.
- Corrected the fixture page-card shape to match the existing Guided Comic flow expectations (`panelCount`, `keyCharacters`, `keyLocation`, `expanded`, and `panelBeats`) after browser QA exposed a runtime blank-screen failure from an under-shaped fixture.
- Updated the formal Comic Library plan status note so fixture QA is no longer listed as merely structural.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicLibraryQaFixtures.ts`
- `src/portals/guided-comic/__tests__/guidedComicLibraryQaFixtures.test.ts`
- `docs/superpowers/plans/2026-05-21-guided-comics-comic-library-entry.md`
- `walkthrough.md`

### Implementation notes

- The fixture path is guarded by `import.meta.env.DEV` and query-string detection, so it is a local QA tool rather than a production feature.
- `many` exercises eight series, a twelve-issue series, generated cover data URLs, missing covers, and export-stage completed issue counts.
- `missing-covers` exercises placeholder cover rendering by omitting cover images for every synthetic issue.
- `empty` returns no synthetic projects so the blank `Start New Series` cover can be checked without clearing real browser storage.
- The fixture uses the existing project-library shape and existing issue-opening path; it does not introduce a new portal type, route, schema, Supabase state, or ComicEditor behavior.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryQaFixtures.test.ts` passed with 31 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- Browser QA against `http://127.0.0.1:5173/` confirmed:
  - `?guidedComicLibraryFixture=many` shows the QA banner, `Blue Meridian`, `Panel Saints`, `12 issues`, and `Start New Series`.
  - `?guidedComicLibraryFixture=missing-covers` shows the QA banner, placeholder series covers, and `Start New Series` without image-cover markers.
  - `?guidedComicLibraryFixture=empty` shows the QA banner and `Start New Series` without synthetic series.
  - Browser console error log was empty after fixture checks.

### Outstanding issues

- Full deployed QA remains open.
- Broad Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, and image-preservation regression remains open.
- Richer morph/parallax choreography and Living Archive UI remain future work.

### Risks or caveats

- The QA fixtures are development-only and query-string driven; they are meant for local verification, not user-facing production workflows.
- Fixture browsing is intentionally in-memory. Saving while a fixture is active changes the in-memory fixture session but does not persist the fixture library to the real saved Comic Library.

### Operator follow-up

- Use `http://127.0.0.1:5173/?guidedComicLibraryFixture=many` for dense gallery QA.
- Use `http://127.0.0.1:5173/?guidedComicLibraryFixture=missing-covers` for placeholder-cover QA.
- Use `http://127.0.0.1:5173/?guidedComicLibraryFixture=empty` for blank-library QA.

### Next steps

- Run the broad product regression matrix when ready.
- Continue with richer cover transition choreography or Living Archive UI once the library entry layer is visually approved.

## Guided Comics Living Archive Unlock Affordance - 2026-05-22

### What changed

- Added the Comic Library Living Archive affordance inside the existing Cover Table header.
- Added a quiet locked state below four completed export-stage issues: `Living Archive locked - 0/4 complete`.
- Added an unlocked `Living Archive` background toggle once four or more completed issues exist.
- Added a restrained static archive background wash when the toggle is enabled, using completed issue cover candidates at low opacity instead of a full animated collage.
- Added a pure helper and regression coverage for the four-completed-issue unlock threshold.
- Updated the dev-only `many` QA fixture so it has at least four export-stage issues and can exercise the unlocked archive path.
- Updated the formal Comic Library plan to mark the Living Archive affordance as implemented while keeping richer morph/parallax and full collage work deferred.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicLibraryView.ts`
- `src/portals/guided-comic/guidedComicLibraryQaFixtures.ts`
- `src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts`
- `src/portals/guided-comic/__tests__/guidedComicLibraryQaFixtures.test.ts`
- `docs/superpowers/plans/2026-05-21-guided-comics-comic-library-entry.md`
- `walkthrough.md`

### Implementation notes

- The pass stays inside the existing Guided Comics `comic` portal and existing Comic Library entry surface.
- The unlock uses `getGuidedComicCompletedIssueCount` / `isGuidedComicLivingArchiveUnlocked`; completed issues are still defined as saved projects whose snapshot `currentStep` is `export`.
- `livingArchiveBackgroundEnabled` was already part of the local preferences shape; this pass wires it into the UI and keeps it disabled if the library drops below the unlock threshold.
- The background is intentionally decorative and low-contrast. It does not change project data, route state, Supabase schema, ComicEditor, Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, or image preservation.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryQaFixtures.test.ts` passed with 17 tests.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryQaFixtures.test.ts` passed with 32 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- Browser QA was attempted through the in-app browser, but localhost navigation was blocked by the browser client with `net::ERR_BLOCKED_BY_CLIENT`, so locked/unlocked archive states still need manual or refreshed-browser QA.

### Outstanding issues

- Manual/browser QA for the Living Archive locked and unlocked visual states remains open because the in-app browser could not navigate to local dev URLs in this session.
- Full deployed QA remains open.
- Broad Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, and image-preservation regression remains open.
- Richer morph/parallax choreography and the full animated Living Archive collage remain future work.

### Risks or caveats

- The archive background is a static, low-opacity wash only; it is not the final animated collage.
- The unlocked state depends on export-stage saved issues. Drafts that have not reached `export` do not count.
- The dev-only `many` fixture now intentionally creates four completed issues in its first synthetic series to support unlock QA.

### Operator follow-up

- Re-run local browser QA after refreshing the browser bridge:
  - `http://127.0.0.1:5173/?guidedComicLibraryFixture=empty` should show the locked state.
  - `http://127.0.0.1:5173/?guidedComicLibraryFixture=many` should show the unlocked `Living Archive` toggle and switch to `Background on` when clicked.

### Next steps

- Complete the manual/browser QA for the Living Archive states.
- Continue with richer cover transition choreography only after the archive affordance is visually accepted.

## Guided Comics Cover Motion Refinement - 2026-05-22

### What changed

- Refined Comic Library cover movement so series covers, recent issue covers, issue covers, blank covers, and the selected series hero cover share a reusable motion system.
- Added `guided-library-cover-motion` CSS with transform variables for cover-specific rest and hover/focus states.
- Added subtle lift, depth, sheen movement, and shadow response on hover/focus to make covers feel like physical objects on the desk.
- Enriched the stage-entry keyframes for Series Gallery, Series Focus, and Issue Gallery with shallow perspective/rotation so state changes read as covers moving through space.
- Preserved `prefers-reduced-motion` behavior by disabling cover transitions/transforms and stage animations when reduced motion is requested.
- Updated the formal Comic Library plan to stop listing richer cover lift/parallax as deferred.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/styles/theme.css`
- `docs/superpowers/plans/2026-05-21-guided-comics-comic-library-entry.md`
- `walkthrough.md`

### Implementation notes

- The pass is visual-only and stays inside the existing Guided Comics `comic` portal and Comic Library entry layer.
- Cover transforms are still supplied per cover from the existing render loops, but CSS now owns the transition timing, hover/focus lift, shine, and reduced-motion behavior.
- No project data, routes, Supabase/schema state, ComicEditor behavior, Advanced Studio behavior, Imageshop behavior, Image Vault behavior, save/load, export, geometry, shapes, balloons, or image preservation paths were changed.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryQaFixtures.test.ts` passed with 32 tests.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run dev -- --host 127.0.0.1` started successfully and `curl -I http://127.0.0.1:5173/` returned HTTP 200.
- Browser QA against `http://127.0.0.1:5173/?guidedComicLibraryFixture=many` confirmed:
  - Comic Creator opened to `Cover Table`.
  - The `many` fixture showed `Blue Meridian` and `Panel Saints`.
  - Nine visible cover objects had the `guided-library-cover-motion` class.
  - The first cover had computed 3D transform output and transition properties for `transform`, `border-color`, `box-shadow`, and `filter`.
  - Browser console error log was empty after the check.

### Outstanding issues

- Full deployed QA remains open.
- Broad Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, and image-preservation regression remains open.
- The full animated Living Archive collage remains future work.

### Risks or caveats

- This pass verifies motion classes and DOM/computed style state, not subjective visual sign-off from screenshots or design review.
- The local dev server was stopped after browser QA.

### Operator follow-up

- Manually hover/focus covers in Series Gallery, Series Focus, and Issue Gallery to approve the feel of the lift/parallax timing.
- Manually verify reduced-motion mode if OS-level motion settings are part of the acceptance pass.

### Next steps

- Complete deployed QA and the broad regression matrix when ready.

## Guided Comics Library Closure Gates - 2026-05-22

### What changed

- Closed Pass 2 by wiring selected series cover persistence through the existing local Comic Library preferences instead of leaving `seriesCoverProjectIds` as an unused stored field.
- Updated series grouping so `getGuidedComicLibrarySeriesGroups` accepts persisted series cover selections, exposes `selectedCoverProject` and `coverProject`, falls back safely when a stored project id is stale, and uses the selected issue cover image when available.
- Added an Issue Gallery control for `Use as series cover`, a disabled `Current series cover` state, a visible `Series cover` badge, and a Series Focus note showing which issue supplies the current cover.
- Closed the remaining internal Pass 6 partial marker by adding Issue Gallery current-issue and last-updated metadata to issue cover cards.
- Closed Pass 8 by replacing the static Living Archive wash with a reduced-opacity animated cover collage made from completed issue covers.
- Preserved reduced-motion behavior by disabling the archive rail animation under `prefers-reduced-motion`.
- Updated the Comic Library plan so Pass 2, Pass 8, and Pass 9 no longer remain partial because of completed or operator-owned items.

### Files touched

- `src/portals/guided-comic/guidedComicLibraryView.ts`
- `src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/styles/theme.css`
- `docs/superpowers/plans/2026-05-21-guided-comics-comic-library-entry.md`
- `walkthrough.md`

### Implementation notes

- The selected-cover preference remains local browser state only through `arcs.guidedComicLibraryPreferences.v1`; no Supabase/schema changes were made.
- The selected-cover UI stays inside the existing Comic Library Issue Gallery and does not add a new portal type, route, workspace mode, or `ComicEditor` dependency.
- The Living Archive collage uses already-derived completed issue cover URLs and remains decorative/background-only so it does not interfere with cover selection or issue workflow navigation.
- No Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, or image preservation surfaces were intentionally changed.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryQaFixtures.test.ts` passed with 3 files and 19 tests.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryQaFixtures.test.ts` passed with 6 files and 43 tests.
- `git diff --check` passed.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- Browser QA against `http://127.0.0.1:5173/?guidedComicLibraryFixture=many` confirmed:
  - Comic Creator opens to `Cover Table`.
  - Selecting a Blue Meridian issue as series cover shows `Series cover` and `Current series cover`.
  - Reloading the app preserves the selected Blue Meridian cover state.
  - Issue cards show `Current issue` and updated-date metadata.
  - Turning on `Living Archive` renders `.guided-library-living-archive-collage`.
  - The archive collage contains 2 animated rails and 12 cover images, with `guidedLibraryArchiveDriftPrimary` computed on the first rail.
  - Browser console error log was empty after the check.

### Outstanding issues

- None for Pass 2 selected-cover persistence or Pass 8 animated collage implementation.
- Full deployed QA and broad Advanced Studio/Imageshop/Image Vault/save/load/export regression are operator QA, not remaining implementation blockers for this pass.

### Risks or caveats

- Selected cover persistence is intentionally browser-local. Clearing local storage resets the selected series cover map.
- If a persisted selected-cover project id no longer exists, the series group safely falls back to the default first issue cover.
- Browser QA used the dev-only `many` fixture; production saved-project data should follow the same local preference path but still needs operator QA.

### Operator follow-up

- Perform deployed and broad regression QA as the operator acceptance pass.

### Next steps

- None for Pass 2, Pass 8, or Pass 9 closure.

## Guided Comics Issue Workspace Return Nav Condensing - 2026-05-23

### What changed

- Condensed the Comic Library return strip shown above the Guided Comics issue workspace.
- Replaced the tall bordered/shadowed `section` with a slim sticky breadcrumb `nav`.
- Kept the essential escape hatches visible: `All Series` and `Choose Issue`.
- Reduced the visual weight so the Page Production workspace remains the dominant surface.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- The change is presentation-only inside the existing Guided Comics Comic Library return navigation.
- No route, portal type, Supabase/schema, ComicEditor, Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, or image preservation behavior was changed.

### Verification

- `git diff --check` passed.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- Browser QA at `http://localhost:5174/` confirmed:
  - Opening Comic Creator and `Open Current Issue` shows the compact `Comic Library return navigation`.
  - The return nav is a `NAV` element with no box shadow, only a bottom divider, and approximately 41px height in the tested viewport.
  - `All Series` and `Choose Issue` remain available.
  - Page Production remains visible below the condensed nav.
  - Browser console error log was empty.

### Outstanding issues

- None.

### Risks or caveats

- The nav remains visible rather than fully hidden so users can still recover back to the library without losing workspace context.

### Operator follow-up

- None.

### Next steps

- None.

## Guided Comics Page Context Data Gating - 2026-05-23

### What changed

- Updated the Page Production `Page context` block so it only appears when there is real page context to show.
- Stopped treating the starter panel beats (`Panel 1: Establishing shot`, `Panel 2: Character moment`, etc.) as real page context.
- Removed empty/filler context cards from the starter state:
  - `No dialogue seeds staged yet.`
  - `Character, location, and NPC references are ready for this page.`
- Kept real context visible when custom panel beats, actual dialogue seeds, missing references, or requested/ready references exist.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- The change is scoped to the existing Guided Comics Page Production workspace.
- No route, portal type, Supabase/schema, ComicEditor, Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, or image preservation behavior was changed.
- The prior compact Comic Library return nav change remains preserved in the same working tree.

### Verification

- `git diff --check` passed.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- Browser QA at `http://localhost:5174/` confirmed:
  - Page Production remained visible.
  - The starter/default `Page context` block no longer rendered.
  - `Panel 1: Establishing shot` was not visible as page-context text.
  - `No dialogue seeds staged yet.` was not visible.
  - The prior fake ready reference message was not visible.
  - Browser console error log was empty.

### Outstanding issues

- None.

### Risks or caveats

- The Page Context section is intentionally hidden for starter/default pages. It will reappear only once the page has meaningful context data.

### Operator follow-up

- None.

### Next steps

- None.

## Guided Comics Page Context Source And Backcloth Refinement - 2026-05-23

### What changed

- Refined the Page Production `Page context` area so any rendered context now explains where it comes from and where it is used.
- Changed context cards into flatter source rows instead of large rounded/pill-like cards.
- Added source labels for:
  - `Beats`: made in Pages or Panel Focus, used by layout and Advanced Studio handoff.
  - `Dialogue`: made from dialogue seeds, used by balloon prep and Panel Focus.
  - `References`: made in Visual Prep, used by Imageshop and page handoff.
- Made the production backcloth more visible behind the comic page with a flatter stage surface and a quiet `Page backcloth` label.
- Reduced the comic page frame radius from the larger pill-like treatment to a smaller `rounded-md` frame.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- The previous data-gating remains in place: default starter beats still do not count as meaningful context.
- The change is scoped to the existing Guided Comics Page Production workspace.
- No route, portal type, Supabase/schema, ComicEditor, Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, or image preservation behavior was changed.
- The prior compact Comic Library return nav and Page Context data-gating changes remain preserved in the same working tree.

### Verification

- `git diff --check` passed.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- Browser QA at `http://localhost:5174/` confirmed:
  - Page Production remained visible.
  - The default starter beat summary string was not visible in Page Context.
  - Source copy for real context was present when context rendered.
  - `Page backcloth` was visible.
  - `.guided-comic-stage` existed with `0px` border radius.
  - `All Series` and `Choose Issue` remained available.
  - Browser console error log was empty.

### Outstanding issues

- None.

### Risks or caveats

- The source labels are intentionally concise to keep the production workspace dense.

### Operator follow-up

- None.

### Next steps

- None.

## Guided Comics Production Workspace Cleanup - 2026-05-23

### What changed

- Reworked the Guided Comics Page Production workspace into a canvas-first page workspace.
- Removed the vertical page-number rail from Page Production and replaced it with compact previous/next controls plus a page selector.
- Replaced the large pill breadcrumb chrome in Page Production and Panel Focus with compact text breadcrumbs.
- Removed the duplicate bottom panel status cards from Page Production.
- Added direct page-level panel actions:
  - Select a panel without leaving the page workspace.
  - Send the selected panel to Imageshop.
  - Upload panel art from the page workspace.
  - Assign selected panel art from the Vault through the shared panel-art vault request path.
- Exposed page-level layout controls in the production workbar:
  - Layout preset selector.
  - Make selected panel bigger.
  - Make selected panel wider.
  - Apply safe margins.
- Added visible panel resize handles for the selected page-production panel, backed by the existing layout geometry editing helpers.
- Added a concise info note explaining that Writers' Workshop imports populate page/panel beats while Visual Prep references travel with the selected panel into Imageshop.
- Reworked Panel Focus into a portrait-first canvas with bottom workbar controls instead of the previous right-side vertical inspector.
- Removed the Panel Focus thumbnail/number strip.
- Kept panel beat editing, dialogue seed editing, Imageshop, Vault, Upload, Paste, panel review status, return-to-page, and pull-back-to-issue actions available from the new bottom controls.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- The implementation stays inside the existing Guided Comics flow and existing `comic` portal surface.
- No new portal type was added.
- No Supabase/schema changes were made.
- `ComicEditor` was not refactored or modified.
- Advanced Studio, Imageshop, Image Vault, save/load, export, geometry helpers, shapes, balloons, and image preservation were not intentionally changed.
- The page-level Imageshop helper now accepts a target panel so page-workspace panel actions can hand off the correct panel without relying on a stale selected-panel render.
- The page-level Vault helper now accepts a target panel while preserving the existing selected-panel behavior for Panel Focus.
- The selected panel uses the existing `startLayoutPanelEdit` / resize geometry path, so resized production panels continue feeding the existing layout geometry state and Advanced Studio handoff.
- The earlier uncommitted compact Comic Library return nav, Page Context data gating, source labeling, and backcloth refinements remain preserved.

### Verification

- `git diff --check` passed.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- Browser QA at `http://localhost:5174/` confirmed:
  - Page Production shows compact `ISSUE / PAGE 1 / PANEL 1` breadcrumb text instead of the large pill chrome.
  - The vertical `Pages` rail is gone.
  - Duplicate `NEEDS ART` panel status cards are gone.
  - Page Production still shows the page backcloth and panel frames.
  - Page Production exposes `Make selected bigger`, `Make selected wider`, `Apply safe margins`, `Focus panel`, `Imageshop`, `Vault`, and `Upload`.
  - The Writers' Workshop / Visual Prep info note is visible in the production workbar.
  - Panel Focus uses a portrait `2 / 3` frame.
  - Panel Focus no longer has the right inspector `aside`.
  - Panel Focus no longer has the numbered thumbnail strip.
  - Panel Focus exposes visible Imageshop, Vault, Upload, and Paste actions under the canvas.
  - Panel Focus still exposes the panel beat editor and dialogue seed action.
  - Browser console error log was empty.

### Outstanding issues

- None.

### Risks or caveats

- The page-production canvas is intentionally smaller than the prior oversized version so the bottom workbar is reachable in the first viewport.
- The selected panel resize handles are compact and use the existing geometry behavior; precision editing remains better suited to the dedicated Layout step and Advanced Studio.

### Operator follow-up

- Review the smaller page-production canvas scale in a wide desktop viewport and decide whether it should become slightly larger once the bottom workbar is further condensed.

### Next steps

- Continue polishing the production workbar if the next QA pass asks for more density or different grouping.

## Guided Comics Panel Focus Full-Height Side Workspace - 2026-05-23

### What changed

- Reworked Panel Focus from a portrait canvas with bottom controls into a three-column desktop workspace.
- Made the portrait panel canvas the center of the workspace and sized it against the visible viewport height.
- Moved panel image actions, page/panel beat editing, and dialogue seeds into a left-side vertical tool stack.
- Moved panel momentum, review status, and reference/style context into a right-side vertical tool stack.
- Kept narrow layouts responsive by showing the panel canvas first, followed by the tool stacks.
- Changed Panel Focus momentum and review controls to stack vertically on desktop so the side rail reads as a tool column instead of a cramped toolbar.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- The change stays inside the existing Guided Comics flow and existing `comic` portal surface.
- No new portal type was added.
- No Supabase/schema changes were made.
- `ComicEditor` was not refactored or modified.
- Advanced Studio, Imageshop, Image Vault, save/load, export, geometry helpers, shapes, balloons, and image preservation were not intentionally changed.
- Existing Panel Focus actions were preserved: Imageshop, Vault, Upload, Paste, beat editing, dialogue seed editing, previous/next panel, review status, return-to-page, and pull-back-to-issue.
- The desktop grid uses side rails with their own max-height and overflow so tools can scroll without shrinking the central panel canvas.

### Verification

- `git diff --check` passed.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- Browser QA at `http://localhost:5174/` with a 1488x998 desktop viewport confirmed:
  - Panel Focus renders as three columns with left tools, center canvas, and right tools.
  - The center panel frame remains a portrait `2 / 3` frame.
  - The measured center panel frame was 493px by 740px, using most of the visible workspace height.
  - Panel image, page/panel beat, dialogue, panel momentum, and reference/style controls all remain visible.
  - The page reported one panel stage and one panel focus frame.
  - The browser QA console error check returned an empty error list.

### Outstanding issues

- None.

### Risks or caveats

- The desktop QA used an explicit 1488x998 viewport override to match the user's wide-screen browser evidence.
- Further polishing may still be needed if the user wants the issue/cover workspace added next; this pass only changes Panel Focus.

### Operator follow-up

- Review the side-rail density in the live app and decide whether any rail sections should collapse by default after the core workspace shape is approved.

### Next steps

- Continue with the issue/cover properties workspace if the next pass targets the missing series -> issue/cover -> page -> panel workflow layer.

## GitHub Actions Cloudflare Worker Deploy - 2026-05-24

### What changed

- Added a repo-owned GitHub Actions workflow for Cloudflare Worker deploys.
- The workflow runs on pushes to `main` and can also be started manually with `workflow_dispatch`.
- The workflow installs dependencies with `npm ci`, builds the app with `npm run build`, verifies that `CLOUDFLARE_API_TOKEN` is present, then deploys with `npx wrangler deploy --config ./wrangler.jsonc`.
- Updated the Cloudflare deployment checklist with a GitHub Actions option and the required repository secret.
- Updated `tasks.md` so the deploy automation record no longer depends only on hidden Cloudflare dashboard configuration.

### Files touched

- `.github/workflows/deploy-cloudflare-worker.yml`
- `CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes

- The workflow uses the existing `wrangler.jsonc` Worker name and static assets configuration.
- The workflow intentionally fails before deploy if the GitHub secret `CLOUDFLARE_API_TOKEN` is missing, preventing a quiet stale-site state.
- The workflow does not add Supabase deploy steps and does not change app runtime code.
- No new portal type, Supabase/schema changes, or ComicEditor changes were made.

### Verification

- `git diff --check` passed.
- Workflow file was inspected directly after creation.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.

### Outstanding issues

- The GitHub repository still needs the `CLOUDFLARE_API_TOKEN` Actions secret before the workflow can deploy successfully.

### Risks or caveats

- The first push after this workflow lands will run the workflow. If the secret is missing, the run should fail with the explicit token error added in the workflow.
- If Cloudflare later requires account disambiguation for the token, add the account to Wrangler configuration or a repository secret in a follow-up pass.

### Operator follow-up

- Add `CLOUDFLARE_API_TOKEN` in GitHub repository settings under Secrets and variables -> Actions.
- After the secret is present, manually run the `Deploy Cloudflare Worker` workflow once or push a small follow-up commit to confirm the deploy path.

### Next steps

- Watch the first GitHub Actions run after push and verify the live Worker serves the new bundle.

## Cloudflare Builds Deploy Path Correction - 2026-05-24

### What changed

- Removed the redundant GitHub Actions Cloudflare deploy workflow.
- Updated the Cloudflare deployment checklist to clarify that Cloudflare-managed Workers Builds API token names are not token values to paste into GitHub.
- Updated `tasks.md` to record the active deploy path as Cloudflare Workers Builds connected to `JusheZion/Nano-Banana-Expanded` on `main`.
- Kept the repo-side Wrangler scripts and Cloudflare build/deploy commands aligned with the existing Worker setup.

### Files touched

- `.github/workflows/deploy-cloudflare-worker.yml`
- `CLOUDFLARE_DEPLOYMENT_CHECKLIST_USER.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes

- The GitHub Actions workflow was removed because the Cloudflare dashboard already shows the Worker connected to the GitHub repo with Cloudflare-managed build credentials.
- The Cloudflare API still reports no deploy hooks and no `builds/workers` records for this Worker, but Worker deployment/version records do show fresh deployments.
- The current canonical Worker target remains `https://asset-reference-comics-studio.onyxzion.workers.dev/`.
- No app runtime code, Supabase/schema files, or ComicEditor files were changed.

### Verification

- Cloudflare API reported the latest Worker deployment as version `158`, created `2026-05-24T13:38:49Z`, after the GitHub pushes.
- Live browser QA on `https://asset-reference-comics-studio.onyxzion.workers.dev/` confirmed the deployed Panel Focus workspace:
  - `Comic Creator -> Untitled series -> Open Current Issue -> Focus panel`
  - Three-column side-rail layout was present.
  - Center panel frame measured 493px by 740px.
  - Center panel frame retained `2 / 3` aspect ratio.
  - `Panel image`, `Page / panel beat`, `Dialogue`, `Panel momentum`, and `Reference and style context` were present.

### Outstanding issues

- The user may still be looking at Page Production or another URL/domain when expecting the Panel Focus side-rail changes.

### Risks or caveats

- Cloudflare's dashboard Build connection and API deployment records do not expose the same shape of data; deployment/version records are the reliable evidence seen in this pass.

### Operator follow-up

- Use the Cloudflare dashboard build/retry controls for future deploy failures.
- If the live UI appears stale, verify the exact URL and click `Focus panel` from Page Production before assuming the bundle is stale.

### Next steps

- If automatic deploys fail again, inspect the Cloudflare build log for the commit SHA and compare it with `git rev-parse origin/main`.

## Guided Comics Page Production Tall Workspace - 2026-05-24

### What changed

- Reworked the Guided Comics Page Production workspace reached from `Comic Creator -> series -> Open Current Issue -> Page Production` so the page-level canvas is a tall portrait workspace instead of reading as a widescreen/landscape backcloth.
- Moved page layout controls into a left vertical rail beside the page canvas.
- Moved selected-panel status and panel actions into a right vertical rail beside the page canvas.
- Removed the wide bottom workbar from Page Production so the central page remains the dominant working surface.
- Tightened the desktop height calculation so the page-level workspace fits inside the visible viewport without clipping the bottom of the stage at the tested desktop size.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- The changed surface is Page Production, not Panel Focus.
- The page canvas keeps a `2 / 3` portrait aspect ratio and now sits between vertical tool rails on xl desktop layouts.
- Page layout tools remain local to Guided Comics and continue to use the existing layout helpers.
- Panel actions still call the existing Focus Panel, Imageshop, Vault, and Upload paths.
- This pass did not add a new portal type, Supabase/schema changes, a ComicEditor refactor, or changes to Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, or image preservation.

### Verification

- `git diff --check`
- `npm run build` passed with the existing large chunk warning.
- `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.
- Local browser QA at `http://localhost:5174/` followed the user path:
  - `Comic Creator -> Untitled series -> Open Current Issue -> Page Production`
  - Page Production stage used CSS grid with three desktop columns.
  - Page canvas measured 473px by 710px at a 1375px by 998px viewport.
  - Page canvas retained a 1.5 height-to-width ratio, matching the `2 / 3` portrait page.
  - Stage bottom landed at 995px in a 998px viewport, so the page-level workspace no longer spills below the visible screen at that tested size.
  - `PAGE LAYOUT` and `PANEL ACTIONS` rails were visible.
  - Browser console check returned no errors.
- Commit `3f578fdd0b09afd713e5f68f15bf6e67a5b68435` was pushed to `main`.
- Cloudflare API check after the push still reported the latest Worker deployment as `2026-05-24T15:38:08Z`, before this commit, so the live site had not updated yet.
- Manual `npx wrangler deploy --config ./wrangler.jsonc` was attempted after approval but failed because `CLOUDFLARE_API_TOKEN` is not set in the local environment.

### Outstanding issues

- None for this page-level portrait workspace pass.

### Risks or caveats

- The live Cloudflare site will not show this change until Cloudflare Workers Builds deploys the pushed commit or an operator runs Wrangler with a real `CLOUDFLARE_API_TOKEN`.
- Smaller responsive widths still stack the rails around the page canvas rather than forcing the three-column desktop arrangement.

### Operator follow-up

- In Cloudflare, rerun the connected build for the latest `main` commit or confirm why the Git push did not trigger a new build.
- If using local deploy instead, export a real `CLOUDFLARE_API_TOKEN` in the shell and rerun `npx wrangler deploy --config ./wrangler.jsonc`.
- After deploy, hard-refresh the live Worker if the older page-level view is still cached in the browser.

### Next steps

- If the deployed site still appears stale after the next Cloudflare build, compare the live bundle against the pushed commit SHA and inspect the Cloudflare build log.

## Guided Comics Issue Cover Workspace And Panel Image Framing - 2026-05-24

### What changed

- Added an Issue / Cover workspace to the existing Guided Comics issue flow so reopening an issue now follows `Series -> Issue / Cover Workspace -> Page Workspace -> Panel Workspace`.
- Added issue setup controls for series title, issue title, issue number, page count, genre, and tone inside the cover workspace.
- Added Writers' Workshop sync controls in the cover workspace for creating/linking a Writer issue, importing latest page beats, and generating/updating page beats.
- Added a portrait cover design canvas with cover source actions for Imageshop, Vault, Upload, Paste, and using existing panel art.
- Added production readiness checks for cover art, pages, references, and Writer link state.
- Added cover direction fields for art style and continuity notes so series logo, issue logo, character/reference locks, and motifs can be captured before page production.
- Persisted the issue cover image in Guided Comic draft/project snapshots and made Comic Library cover selection prefer the explicit issue cover before falling back to panel art.
- Added Guided Image Vault support for assigning a selected vault image as the issue cover.
- Added Panel Focus image framing controls for assigned panel art: cover/contain/stretch fit, zoom up to 3x, focus grid, and drag-to-reframe support.
- Updated page and issue previews to respect stored panel image fit, focus, and zoom values.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicProjectLibrary.ts`
- `src/portals/guided-comic/guidedComicLibraryView.ts`
- `src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts`
- `src/stores/guidedComicVaultBridge.ts`
- `src/components/ui/VaultChrome.tsx`
- `walkthrough.md`

### Implementation notes

- The new cover layer is an additional workspace mode inside the existing Guided Comics flow, not a new portal type.
- Opening the current issue from the series library now lands on `issue-cover` instead of jumping straight to page production.
- Writer page-beat import still uses the existing `importLatestLinkedWriterIssue`, `runGuidedWriterToolAction('page-beats')`, and bridge mapping/merge path.
- Cover images are local Guided Comic snapshot state only; no Supabase tables, migrations, or schema changes were added.
- The cover Vault path reuses the existing Guided Comic vault bridge with a new `cover` target label.
- Panel image framing is stored on existing layout geometry fields and does not change Advanced Studio, ComicEditor, save/load/export contracts, shapes, balloons, or image preservation.

### Verification

- `git diff --check`
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` passed: 4 files, 25 tests.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts src/stores/__tests__/guidedComicVaultBridge.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` passed: 5 files, 31 tests.
- Local browser QA at `http://localhost:5174/` followed:
  - `Comic Creator -> Untitled series -> Open Current Issue`
  - Confirmed the Issue / Cover workspace opened first.
  - Confirmed `Page Workspace`, `Panel Workspace`, `Advanced Studio`, `Writers' Workshop sync`, page-beat import/update controls, `Production readiness`, and `Cover source` controls were visible.
  - Confirmed cover source buttons were visible in the viewport at a 1375px by 998px viewport.
  - Confirmed `Page Workspace` still opened the tall page-level workspace with `Page backcloth`, `Advanced Studio`, and Imageshop controls.
  - Confirmed `Focus panel` still opened Panel Focus and exposed `Image framing`, cover/contain/stretch, zoom, focus grid, and the drag-to-reframe hint.
  - Browser console check returned no errors.
- QA screenshots were captured locally:
  - `/private/tmp/guided-cover-workspace-qa.png`
  - `/private/tmp/guided-panel-framing-qa.png`

### Outstanding issues

- Imageshop can be launched from the cover workspace with Guided references, but a generated Imageshop result does not yet have a dedicated return target that assigns directly into `issueCoverImage`.

### Risks or caveats

- Panel image framing controls are active for assigned panel images; the local browser fixture used for QA showed the controls on a placeholder/no-art panel.
- Smaller responsive widths will stack the cover workspace rails instead of keeping the three-column desktop bench.

### Operator follow-up

- After deployment, verify the live path `Comic Creator -> series -> Open Current Issue` lands on the Issue / Cover workspace before entering Page Workspace.
- If a dedicated Imageshop-to-cover return path is needed, add it as a narrow follow-up without changing the broader Imageshop or ComicEditor contracts.

### Next steps

- Deploy the pushed commit through the existing Cloudflare Workers Builds path and verify the live Worker shows the new cover workspace.

## Guided Comics Writer Beat Import Visibility Fix - 2026-05-24

### What changed

- Added visible `Writer-imported beats` fields to the Page Workspace left rail.
- Added an editable Page beat textarea plus editable Panel beat textareas for every active panel on the page.
- Reworded the old vague Writer import helper copy so it points to the actual fields shown directly below it.
- Made the Writers' Workshop import bridge count actual usable saved panel beats, not just Writer page rows.
- Made the Writer beat parser tolerate common edited beat aliases such as `summary`, `description`, `beat`, `visual`, `notes`, and `dialogue` by normalizing them into the expected `action`/`dialogue_placeholder` shape before mapping into Guided Comics.
- Updated the import success message to report Writer page rows, usable panel-beat count, pages with usable panel beats, dialogue seeds, and whether no saved panel beats were found.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/writersWorkshopBridge.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `walkthrough.md`

### Implementation notes

- Root cause: the import status was row-count oriented. It could say Writer pages were imported even when `writer_pages.beats_json` contained no valid saved panel beats for Guided Comics to render.
- A second UX issue compounded the bug: Page Workspace had explanatory copy about page/panel beat fields, but the actual editable beat fields were not visible there; the clearest field was in Panel Focus.
- The bridge still uses the existing Writer Workshop `writer_pages.beats_json` path and existing Guided `pageCards` state.
- No new portal type, Supabase/schema changes, ComicEditor refactor, Advanced Studio changes, Imageshop changes, Image Vault rewrites, save/load/export changes, geometry changes, shapes, balloons, or image preservation changes were introduced.

### Verification

- `git diff --check`
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts` passed: 2 files, 24 tests.
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` passed: 4 files, 38 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.
- Local browser QA at `http://localhost:5174/` followed:
  - `Comic Creator -> Untitled series -> Open Current Issue -> Page Workspace`
  - Confirmed `Writer-imported beats` appears.
  - Confirmed `Page beat`, `Panel 1 beat`, `Panel 2 beat`, `Panel 3 beat`, and `Panel 4 beat` fields appear in Page Workspace.
  - Confirmed the old vague copy no longer appears.
  - Confirmed no browser console errors.
- Browser screenshot capture timed out twice through the in-app browser, so DOM snapshot evidence was used for the rendered QA proof.

### Outstanding issues

- This pass did not query the user's live Writer issue rows directly, so it cannot say whether their current Writer issue has empty, invalid, or valid `beats_json`; the UI will now report that distinction in the import message.

### Risks or caveats

- Page Workspace is denser because the Writer-imported beat fields are now visible there. This is intentional to remove ambiguity about where imported beats landed.

### Operator follow-up

- Re-run `Import latest page beats` on the linked Guided issue.
- If the message says `0 saved panel beats`, run `Generate / update page beats` first, then import again.
- If the message reports unreadable beat JSON, inspect the relevant Writer page rows or regenerate those page beats.

### Next steps

- After this is committed and deployed, verify the live site with a Writer issue that has known saved `writer_pages.beats_json.panels` data.

## Guided Comics Indexed Writer Beat Import Normalization - 2026-05-24

### What changed

- Made the Guided Comics Writer import bridge treat semantic Writer beat collections as panel beats even when the collection is not literally named `panels`.
- Added normalization for `panels`, `panel_beats`, `panelBeats`, `beats`, `indices`, `indexed_beats`, `indexedBeats`, `page_beats`, `pageBeats`, and top-level numeric beat maps.
- Converted string beats and numeric-keyed beat records into the existing Guided `panels[].action` shape before validation.
- Preserved existing alias handling for edited Writer beat objects, including `summary`, `description`, `beat`, `visual`, `notes`, and `dialogue`.
- Updated import stats so indexed semantic beat payloads count as usable saved panel beats instead of being reported as empty.

### Files touched

- `src/portals/guided-comic/writersWorkshopBridge.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `walkthrough.md`

### Implementation notes

- Root cause: Guided's bridge previously normalized panel beat objects only after finding a top-level `panels` array. Writer payloads that represented panel beats as indexed beat collections could be semantically correct but invisible to Guided because they never entered the `PageBeatsJson` parser.
- The fix stays in the existing bridge layer and still maps into the same local Guided `pageCards.panelBeats` state used by the Page Workspace and Panel Focus views.
- No new portal type, Supabase/schema changes, ComicEditor refactor, Advanced Studio changes, Imageshop changes, Image Vault rewrites, save/load/export changes, geometry changes, shapes, balloons, or image preservation changes were introduced.

### Verification

- `git diff --check`
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed: 1 file, 20 tests.
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts` passed: 4 files, 40 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.

### Outstanding issues

- This pass did not inspect live Writer rows directly. It fixes the bridge so indexed semantic beat payloads import correctly when present.

### Risks or caveats

- The importer is now intentionally more tolerant of Writer payload labels. If a future Writer payload uses one of these semantic keys for non-panel data, it may be treated as panel beat data and then either imported or reported as invalid.

### Operator follow-up

- Re-run `Import latest page beats` on the linked Guided issue after deployment.
- If the Writer issue already has indexed beat payloads under `beats` or `indices`, they should now populate the Page Workspace and Panel Focus beat fields.

### Next steps

- If live import still reports no saved panel beats after this deploy, inspect the actual `writer_pages.beats_json` shape for that issue and add one targeted normalizer/test for that shape.

## Guided Comics Writer Issue Link Safety and Cleanup - 2026-05-24

### What changed

- Made Guided Comics link existing Writer issues instead of failing when the selected series already has the requested issue number.
- Added a safer Cover Workspace Writer sync flow:
  - `Load / choose Writer issue` loads existing Writer issues without creating a new one.
  - `Link selected Writer issue` links the selected existing issue.
  - `Create missing Writer issue` is now the explicit creation path.
  - `Delete selected Writer issue` removes an accidentally created Writer issue after confirmation.
- Added a persistent `Save` button and saved/unsaved status pill to the issue-workspace top strip so save is visible from Cover, Page, and Panel workspaces.
- Added Writer issue delete support to Writers' Workshop issue lists with a small trash action per issue.
- Added the shared `deleteWriterIssue` API helper, relying on the existing `writer_issues` cascade relationships for pages, beats, dialogue, outlines, and shot plans.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/writer/WriterPortal.tsx`
- `src/shared/api/arcsWriterRoom.ts`
- `walkthrough.md`

### Implementation notes

- Root cause: the Cover Workspace used a single `Create / link Writer issue` action that looked like a linker but could create a new Writer issue. If the Guided issue number was reused, the earlier implementation could also hit the `writer_issues` unique constraint instead of linking the existing row.
- The create path now checks local and refreshed Writer issue lists for an existing `(series_id, issue_number)` match and links that existing issue before reporting an error.
- Deletion is intentionally confirmed and scoped to existing Writer issue rows. No Supabase schema, RLS, or migration changes were introduced.
- This pass does not alter ComicEditor, Advanced Studio, Imageshop, Image Vault, save/load/export, geometry, shapes, balloons, or image preservation behavior.

### Verification

- `git diff --check`
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts` passed: 2 files, 29 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.
- Browser QA at `http://localhost:5174/?writer-beat-import-qa=1` confirmed:
  - persistent top-strip `Save` button and unsaved status appear in the issue workspace.
  - Cover Workspace Writer sync shows `Load / choose Writer issue`, `Link selected Writer issue`, `Create missing Writer issue`, and `Delete selected Writer issue`.

### Outstanding issues

- The operator still needs to delete any duplicate live Writer issues manually using the new trash/delete controls after this deploy.

### Risks or caveats

- Deleting a Writer issue removes dependent Writer pages, beats, dialogue, outlines, and shot plans through existing database cascades. The confirmation copy states this before deletion.

### Operator follow-up

- After deployment, open Writers' Workshop or the Guided Cover Workspace, load the relevant Writer issues, and delete any accidental duplicate issues.

### Next steps

- Re-test the live Guided Cover Workspace link flow against the real Writer series: load existing issues first, link the intended issue, then import or generate page beats.

## Guided and Writer Series / Issue Delete Tools - 2026-05-24

### What changed

- Added Guided Comic Portal delete tools:
  - `Delete Series` in Series Focus and Issue Gallery removes every saved local Guided issue in that series.
  - `Delete Issue` on each Issue Gallery card removes that saved local Guided comic issue.
  - Existing workspace-level delete now reuses the same local Guided issue deletion path.
- Added Writers' Workshop delete tools:
  - Series rows now expose a trash action that deletes the Writer series.
  - Issue rows retain the trash action for deleting individual Writer issues.
- Added `deleteWriterSeries` to the shared Writer API helper layer.
- Kept all delete actions behind browser confirmation prompts that describe dependent data removal.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/writer/WriterPortal.tsx`
- `src/shared/api/arcsWriterRoom.ts`
- `walkthrough.md`

### Implementation notes

- Guided deletes are local Comic Library deletes only. They update the saved browser library and active project selection without changing Supabase.
- Writer deletes use existing Supabase table relationships and database cascades. No schema, RLS, or migration changes were introduced.
- Deleting a Writer series removes its dependent Writer issues/pages/outlines/lore/location/style/shot-plan data through existing database cascades.
- No ComicEditor, Advanced Studio, Imageshop, Image Vault, save/load/export, geometry, shapes, balloons, or image preservation changes were introduced.

### Verification

- `git diff --check`
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed: 3 files, 38 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.
- Browser QA at `http://localhost:5174/?writer-beat-import-qa=1` confirmed Guided Issue Gallery shows `Delete Series` and `Delete Issue`.
- Browser QA could not visually confirm Writers' Workshop row-level delete buttons because the local browser state had no Writer series rows; the TypeScript build verified the row controls compile.

### Outstanding issues

- Live cleanup still needs to be performed by the operator after deployment, using the new delete controls.

### Risks or caveats

- Writer series deletion is intentionally broad because it deletes the whole Writer series and dependent rows. The confirmation prompt states this before the delete runs.
- Guided series deletion removes only local Guided Comic Library projects from the browser; it does not delete linked Writer rows unless the operator uses the Writers' Workshop delete tools separately.

### Operator follow-up

- After deployment, use Guided Comic Portal to remove unwanted local Guided series/issues.
- Use Writers' Workshop to remove duplicate Writer series/issues from Supabase.

### Next steps

- Re-check the live cleanup flow after deployment with real Writer rows and confirm the duplicate issues can be removed without leaving the selected Guided issue linked to a deleted Writer row.

## Guided Vault Return to Panel Fix - 2026-05-25

### What changed

- Fixed the Guided Comic Portal Image Vault return path so selecting `Use for guided flow` from the Vault returns to the active issue workspace and panel focus instead of falling back to the Comic Library / series selection screen.
- Preserved the original Guided Vault request metadata in the bridge so returned panel-art selections keep their `pageNumber` and `panelNumber`.
- Restored the active page before assigning the selected Vault image to the panel.
- Added a regression test for preserving Guided panel target metadata during a Vault selection.

### Files touched

- `src/stores/guidedComicVaultBridge.ts`
- `src/stores/__tests__/guidedComicVaultBridge.test.ts`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`

### Implementation notes

- `selectVaultReference` now merges the selected Vault image payload with the pending Guided target when the target type/name match. This keeps page and panel context centralized in the bridge rather than requiring every Vault surface to remember every Guided target field.
- The Guided Vault selection consumer now calls `setLibraryStage('issue-workspace')` for returned panel art, cover art, and visual-prep references.
- Panel-art returns parse `page-N-panel-M` as a fallback when the explicit page metadata is unavailable, then reopen `panel-focus` and assign the selected image through the existing `assignPanelArtImage` path.
- No new portal type, Supabase/schema changes, ComicEditor refactor, Advanced Studio changes, Imageshop changes, geometry changes, or image preservation changes were introduced.

### Verification

- Added failing regression coverage first, then fixed it:
  - `npm run test -- --run src/stores/__tests__/guidedComicVaultBridge.test.ts` failed before the bridge fix because the returned selection dropped `pageNumber` and `panelNumber`.
  - `npm run test -- --run src/stores/__tests__/guidedComicVaultBridge.test.ts` passed after the fix: 1 file, 6 tests.
- `npm run test -- --run src/stores/__tests__/guidedComicVaultBridge.test.ts src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts` passed: 4 files, 30 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.
- `git diff --check` passed.
- Browser QA at `http://localhost:5174/?writer-beat-import-qa=1` confirmed:
  - Comic Creator opened to the QA library.
  - Opening the current issue showed the issue workspace and panel workspace controls.
  - From `Page 1, Panel 1`, clicking `Vault` opened the Asset Vault in Guided Mode for `Page 1, Panel 1`.
  - Opening a Vault collection and clicking `Use for guided flow` returned to `Page 1, Panel 1`, showed the assigned panel image, marked the panel `Ready`, exposed `Save`, and did not fall back to the series screen.
  - Browser console check reported 0 errors/warnings during the flow.
  - Screenshot capture timed out in the browser bridge, so the proof for this pass is DOM/state-based rather than screenshot-based.

### Outstanding issues

- None for this Vault return bug.

### Risks or caveats

- The selected Vault image still requires the user to click `Save` to persist into the saved Comic Library entry, matching the existing save model. The local recovery draft updates immediately through the existing draft save effect.

### Operator follow-up

- After deployment, verify the live panel workspace by selecting any existing Vault image through `Use for guided flow` and clicking `Save` once the returned panel image is visible.

### Next steps

- Continue the next pass with the remaining Guided workflow items: cover workspace access polish, Writer beat import semantics, and panel image fit/position handles.

## Guided Page Panel Direct Move Drag - 2026-05-25

### What changed

- Added direct drag-to-move behavior for panels in the Guided Comics Page Production workspace.
- Reused the existing `startLayoutPanelEdit(..., 'move')` and `moveGuidedComicPanelGeometry` path instead of adding a second geometry model.
- Added a small drag-target guard so dragging starts from ordinary panel content, while panel action buttons, form controls, sliders, and resize handles remain usable as controls.
- Kept the existing Layout workspace body-drag behavior but applied the same drag-target guard there as well.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts`
- `walkthrough.md`

### Implementation notes

- The root cause was not missing geometry math. The shared move helper already existed and the Layout workspace already used it.
- The Page Production panel body only selected panels and exposed resize handles, so users could resize from the corners but could not grab the body to move the panel.
- Page Production panel cards now start a move edit from `onPointerDown` when the pointer target is regular panel content.
- The drag guard prevents nested buttons and editable controls from triggering movement, preserving Imageshop, Upload, resize handles, and text/form interactions.
- `touchAction: 'none'` is applied to draggable panel cards so pointer drags are not swallowed by default touch/scroll behavior.
- No new portal type, Supabase/schema changes, ComicEditor refactor, Advanced Studio changes, Imageshop changes, Image Vault changes, save/load/export changes, shape/balloon changes, or image preservation changes were introduced.

### Verification

- Added failing regression coverage first:
  - `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts` failed because `shouldStartGuidedPanelMoveDrag` did not exist yet.
- After implementation:
  - `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts` passed: 1 file, 8 tests.
  - `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicLayoutPlan.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts` passed: 3 files, 37 tests.
  - `git diff --check` passed.
  - `npm run build` passed with the existing large `ComicPortal` chunk warning.
  - `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.
- Browser QA at `http://localhost:5174/?writer-beat-import-qa=1` confirmed:
  - Opened Comic Creator, opened the QA issue, and entered Page Workspace.
  - The first Page Production panel reported `cursor: move` and `touch-action: none`.
  - A direct drag on `Select page 1, panel 1` moved the panel about 62px right and 36px down without using a resize handle.
  - Browser console check reported 0 errors/warnings during the flow.

### Outstanding issues

- None for direct page-panel movement.

### Risks or caveats

- Panel body dragging now begins immediately on pointer down in Page Production. Nested action buttons are guarded, but any future interactive element placed inside a panel should either be a native interactive element or use `data-guided-panel-drag-exempt="true"`.

### Operator follow-up

- After deployment, verify on the live site by opening Page Workspace and dragging a panel from its body, not the corner handle.

### Next steps

- Continue with the remaining Guided Comics QoL item for image fit/position handles when image and panel aspect ratios differ.

## Guided Library Delete Tools on Visible Shelves - 2026-05-25

### What changed

- Exposed Guided delete controls on the visible Comic Library entry surfaces:
  - Recent issue cards in the Hybrid Shelf now show a `Delete` issue button.
  - Series cards in the Series Gallery now show a `Delete Series` button.
- Kept the existing delete controls in Series Focus, Issue Gallery, and the issue workspace.
- Added accessible delete-label helpers so visible card buttons announce the specific issue or series they delete.
- Updated the series delete handler so it can delete a specific series card directly instead of only deleting the currently selected series.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/guidedComicLibraryView.ts`
- `src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts`
- `walkthrough.md`

### Implementation notes

- Root cause: the previous delete pass added controls to Series Focus and Issue Gallery, but the user-visible Hybrid Shelf / Cover Table entry view still rendered recent issues and series covers as large open-only cards.
- Recent issue cards were changed from one all-in button into an `article` with a dedicated open button and a separate delete button, avoiding nested buttons.
- Series gallery cards were changed from one all-in button into an `article` with a dedicated open button and a separate `Delete Series` button.
- Existing confirmation prompts and local Guided Comic Library deletion logic are reused. No Supabase/schema change was made.
- No new portal type, ComicEditor refactor, Advanced Studio change, Imageshop change, Image Vault change, save/load/export change, geometry change, shapes/balloons change, or image preservation change was introduced.

### Verification

- Added failing regression coverage first:
  - `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts` failed because `getGuidedComicDeleteIssueLabel` and `getGuidedComicDeleteSeriesLabel` did not exist yet.
- After implementation:
  - `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts` passed: 2 files, 19 tests.
  - `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts` passed: 3 files, 25 tests.
  - `git diff --check` passed.
  - `npm run build` passed with the existing large `ComicPortal` chunk warning.
  - `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.
- Browser QA at `http://localhost:5174/?writer-beat-import-qa=1` confirmed:
  - Cover Table renders a series-card `Delete Series` control in the visible Series Gallery.
  - Switching Library View to `Hybrid Shelf` renders the `Recent issue stack`.
  - Hybrid Shelf shows a recent issue delete control with an accessible name like `Delete issue #1`.
  - Hybrid Shelf still shows the visible series-card `Delete Series` control.
  - Browser console check reported 0 errors/warnings during the flow.

### Outstanding issues

- None for the missing visible Guided delete controls.

### Risks or caveats

- Delete buttons still require browser confirmation before removing local Guided Comic Library data.
- Guided delete controls delete local Guided Comic Library entries only; Writer Workshop deletes remain separate.

### Operator follow-up

- After deployment, verify the live Cover Table in both Series Gallery and Hybrid Shelf views and delete any unwanted local Guided series/issues from those visible controls.

### Next steps

- Continue with the remaining Guided Comics QoL item for image fit/position handles when image and panel aspect ratios differ.

## Guided Writer Beat Reimport Refresh - 2026-05-25

### What changed

- Fixed linked Writers Workshop reimports so updated Writer outline/page-beat text refreshes the visible Guided Comics page and panel beat fields.
- Added an explicit Writer-text refresh mode to the bridge merge helpers instead of relying on the older fill-empty-only behavior.
- Updated the Guided import action to use the refresh mode when importing the latest linked Writer issue.
- Added regression coverage for both updated Writer outline summaries and updated Writer page/panel beats.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/writersWorkshopBridge.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `walkthrough.md`

### Implementation notes

- Root cause: the Writer bridge had two different merge semantics. Saved Writer page rows refreshed panel beats, but imported outline/page summaries reused existing Guided text when those fields were non-empty. That meant a linked issue could report a successful import while the visible Guided page beat text stayed stale.
- `refreshImportedText` now lets the import path treat Writer outline summaries and Writer page beat summaries as the current source of truth for text refreshes.
- Writer page-beat imports still refresh imported panel beats by default, and they now avoid clearing existing Guided panel beats when the imported Writer row has no usable panel beat payload.
- Local production metadata remains preserved during refresh: panel count, key characters, key location, expansion state, and local-only pages are kept.
- No Supabase/schema changes, no new portal type, no ComicEditor refactor, and no Advanced Studio, Imageshop, Image Vault, save/load, export, geometry, shapes, balloons, or image preservation changes were introduced.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed: 1 file, 22 tests.
- `npm run test -- --run src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts` passed: 2 files, 31 tests.
- `git diff --check` passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.

### Outstanding issues

- None for the linked Writer beat reimport refresh bug.

### Risks or caveats

- Reimporting a linked Writer issue now intentionally refreshes Guided text fields from Writer data. Operators should treat the Writer issue as the source of truth before pressing import.
- Manual Guided-only page or panel text can still be overwritten by a later linked Writer reimport, which matches the requested update behavior for linked books.

### Operator follow-up

- After deployment, update a linked issue's page/beat text in Writers Workshop, run Import/Update in Guided Comics, and verify the Guided page and panel beat fields show the revised Writer text.

### Next steps

- Continue with the remaining Guided Comics QoL item for image fit/position handles when image and panel aspect ratios differ.

## Writers Workshop Narrative Production Shell Pass - 2026-05-26

### What changed

- Reframed the Writers Workshop top shell as a compact `Narrative Production System` command band instead of a simple title plus separate desktop pipeline strip.
- Added persistent production status in the header: current series, issue, selected page, completed stages, page/beat/dialogue/lore/shot/audit counts, active tab, and the next quick-generate action.
- Replaced the desktop horizontal pipeline chip row with a left-side `Production map` rail that exposes Foundation, Structure, Canon, Beats, Dialogue, Visual, Audit, and Export stages with done/current states.
- Kept a compact horizontal stage strip on phone layouts so mobile keeps production orientation without introducing a desktop rail.
- Replaced the repeated glass-card tab heading with a slimmer workspace header that reports the current phase, issue, page, and readiness count.

### Files touched

- `src/portals/writer/WriterPortal.tsx`
- `walkthrough.md`

### Implementation notes

- This was a shell-first UX pass only. It did not change Supabase schemas, writer tool APIs, bridge contracts, persistence behavior, or the existing tab bodies.
- The existing `WriterRibbon` and `WriterStudioDock` contracts were preserved so the pass stays low-risk and can be followed by a targeted ribbon-density/inspector pass.
- Stage readiness is derived from existing local state: selected series/issue, latest outline, lore card count, page beat coverage, dialogue coverage, latest shot plan, and cached pacing/canon review results.
- The desktop production rail maps stages back to the existing writer tabs instead of adding a new workflow router.

### Verification

- `npm run test -- --run src/portals/writer/__tests__/writerSynopsisHelper.test.ts src/portals/writer/__tests__/shotPlanCsv.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/shared/api/__tests__/writerTools.test.ts` passed: 4 files, 7 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing warning baseline: 67 warnings, 0 errors.
- Chrome DevTools MCP was confirmed live, and the correct local repo app loaded at `http://127.0.0.1:5174/`.
- DevTools console check after reload showed only the existing PWA meta warning: `apple-mobile-web-app-capable` is deprecated in favor of `mobile-web-app-capable`.

### Outstanding issues

- Full visual inspection of the signed-in Writers Workshop workspace was blocked in the isolated DevTools Chrome profile by the protected portal sign-in gate.

### Risks or caveats

- The full ribbon is still present and still consumes meaningful vertical height. This pass reduces navigation duplication and adds hierarchy, but a later pass should compact the ribbon or move more tab-specific controls into contextual inspectors.
- The new production stages are derived from the current comic/issue-oriented writer model; medium/scope metadata for books, screenplays, shared universes, and lore systems is still a planned follow-up.

### Operator follow-up

- In an authenticated browser profile, open Writers Workshop and verify the command band, production map, workspace header, and mobile stage strip with real writer data.

### Next steps

- Implement the next UX pass: Foundation Hub fields for medium type and narrative scope, stored in existing notes metadata before any schema expansion.
- Follow with a ribbon-density pass that makes the writer workspace feel less like a generic AI dashboard and more like a production editor.

## Vault Prompt Export Utility - 2026-05-26

### What changed

- Added a standalone non-UI exporter for turning existing vault image records into prompt-library files.
- The exporter writes both `prompts.json` and `prompts.md` to an output directory, defaulting to `exports/vault-prompts/YYYY-MM-DD`.
- The exporter supports two input paths:
  - `--input vault-records.json` for pre-collected Character/Asset/NPC vault records.
  - Authenticated Supabase reads from `characters` and `assets` when `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_ACCESS_TOKEN` are available.
- Prompt generation uses Gemini vision with source-specific instructions for character, NPC/supporting reference, and asset/environment records.

### Files touched

- `scripts/export-vault-prompts.mjs`
- `walkthrough.md`

### Implementation notes

- No app UI, portal routing, vault components, or persistence contracts were changed.
- The script normalizes records into prompt-library entries with `id`, `source`, `title`, `group`, `prompt`, `tags`, `source_image_url`, `vault_id`, `seed`, `created_at`, `generated_at`, `model`, and `prompt_type`.
- The script can sign private `arcs-generations` storage URLs when a Supabase client is available, then sends inline image data to Gemini.
- Character and Asset cloud vault rows are protected by the app sign-in/session model. An unauthenticated read using the local `.env` returned zero rows; the alternate `.env.sh` key was invalid.
- The in-app browser loaded `http://127.0.0.1:5174/` successfully, but the Reference Vault was behind the sign-in gate, so actual prompt generation could not run yet.
- NPC Vault records remain local-only through `arcs_generations_supporting_reference`, so they need either an exported input JSON or a signed-in visible app/session path before the script can include them.

### Verification

- `node scripts/export-vault-prompts.mjs --help` passed and printed usage/output instructions.
- `node --check scripts/export-vault-prompts.mjs` passed.
- Read-only Supabase checks were attempted:
  - `.env` project: `characters` count 0 and `assets` count 0 without authenticated session.
  - `.env.sh` project: invalid API key.
- Browser check: local app loaded at `http://127.0.0.1:5174/` with title `ARCS Expanded`, but the vault page showed `Sign in to continue`.

### Outstanding issues

- `prompts.json` and `prompts.md` have not been generated yet because no authenticated vault rows or exported vault-record input JSON were available in this session.

### Risks or caveats

- The generated prompts are reverse-engineered descriptions, not guaranteed originals.
- Large vaults may incur Gemini API cost/rate-limit delays because each image is processed individually.
- NPC prompt export requires local NPC records to be supplied through an input JSON or another authenticated/exported app path.

### Operator follow-up

- Provide an authenticated vault source before running the exporter:
  - Set `SUPABASE_ACCESS_TOKEN` for the current user and run `node scripts/export-vault-prompts.mjs`, or
  - Export visible vault records into a JSON array with `source`, `id`, `title`, and `imageUrl`, then run `node scripts/export-vault-prompts.mjs --input vault-records.json`.

### Next steps

- After authenticated records are available, run the exporter and verify the generated `prompts.json` and `prompts.md` contents before importing them into the separate prompt-library app.

## Vault Prompt Pack Generation - 2026-05-27

### What changed

- Used the signed-in in-app browser session to extract a fresh vault record pack for prompt generation.
- Generated the final prompt-library export files:
  - `exports/vault-prompts/2026-05-27/prompts.json`
  - `exports/vault-prompts/2026-05-27/prompts.md`
  - `exports/vault-prompts/2026-05-27/vault-records.json`
- The final export contains 89 reverse-engineered prompts:
  - 67 Character Vault prompts.
  - 22 Asset Vault prompts.
  - 0 NPC Vault prompts because the signed-in NPC Vault showed no saved NPC references.

### Files touched

- `exports/vault-prompts/2026-05-27/prompts.json`
- `exports/vault-prompts/2026-05-27/prompts.md`
- `exports/vault-prompts/2026-05-27/vault-records.json`
- `walkthrough.md`

### Implementation notes

- The in-app browser was signed in as `hayronivy@gmail.com`, and the Reference Vault was visible.
- A temporary local receiver on `127.0.0.1:5189` captured authenticated vault records from the app context, then was stopped after use.
- A temporary query-gated export hook was briefly added to `ReferenceAlbum.tsx` to let the signed-in app resolve fresh private `arcs-generations` URLs and POST records locally; the hook was removed before completion, so no lasting app UI or runtime export hook remains.
- The first browser-DOM crawl collected 87 rendered unique image URLs, but the final authenticated app-context export correctly captured the database-backed total of 89 records.
- The generated prompt entries include signed `source_image_url` values from the export moment. These are useful for traceability shortly after export but should be treated as expiring references rather than permanent public image URLs.

### Verification

- `node scripts/export-vault-prompts.mjs --input exports/vault-prompts/2026-05-27/vault-records.json --out exports/vault-prompts/2026-05-27` completed successfully and wrote 89 prompts.
- JSON verification confirmed `prompts.json` contains 89 entries: 67 `character` and 22 `asset`.
- Markdown verification confirmed `prompts.md` contains 89 prompt sections.
- File-size check showed:
  - `prompts.json`: about 1.1 MB.
  - `prompts.md`: about 102 KB.
  - `vault-records.json`: about 1.0 MB.

### Outstanding issues

- NPC Vault contributed no prompts because the current signed-in NPC Vault had `References: 0`.

### Risks or caveats

- These are reverse-engineered prompts generated from images, not guaranteed original prompts.
- The `source_image_url` fields are signed storage URLs and may expire; importers should rely primarily on prompt text, title, source, group, and vault id unless a future pass replaces those URLs with durable image references.

### Operator follow-up

- Import `exports/vault-prompts/2026-05-27/prompts.json` into the prompt-library app.
- Review `exports/vault-prompts/2026-05-27/prompts.md` manually for any wording that should be normalized before broader reuse.

### Next steps

- If NPC references are added later, rerun the exporter or provide an NPC-only `vault-records.json` to generate a supplemental NPC prompt pack.

## Writers Workshop Synopsis And Canon Flow Reorder - 2026-05-27

### What changed

- Reordered the Writers Workshop workspace flow around the way the author is actually using it: `Outline -> Synopsis -> Canon -> Beats -> Dialogue -> Video -> Arc -> Cockpit`.
- Moved the former Scripts surface forward as `Synopsis helper` so the author/source outline can be entered before AI generation starts filling narrative gaps.
- Reframed the Lore workspace as a `Canon gate` with explicit pre-lore and post-lore actions.
- Added an AI-assisted lore gap helper that suggests missing canon cards before outline/page-beat regeneration.
- Added a visible generation contract in the Canon tab that explains that outline and beat generation use included canon cards, and that comic/video assumptions should be made explicit rather than repeatedly typed by the user.
- Moved the Cockpit concept to the end of the production flow as a late-stage comparison/review workspace.

### Files touched

- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/WriterRibbon.tsx`
- `src/portals/writer/writerNextStep.ts`
- `src/portals/writer/writerSearch.ts`
- `walkthrough.md`

### Implementation notes

- No backend, schema, routing, or persistence changes were made in this pass.
- Lore cards marked `Include in AI prompts` already feed outline and page-beat generation; this pass makes that behavior more visible and action-oriented.
- `runLoreGapAssist` reuses the existing `idea_assist` writer-tools endpoint. It includes series logline, issue synopsis/source text, included lore cards, saved outline, and latest pacing/canon review as context.
- AI lore suggestions are non-persisted until the user copies them or appends them into the lore card body.
- The Synopsis helper still uses the existing issue notes/synopsis helper structure and can continue to build an Issue Outline draft.
- The top production map now has nine stages: Foundation, Synopsis, Canon, Structure, Beats, Dialogue, Visual, Audit, and Cockpit.

### Verification

- `npm run test -- --run src/portals/writer/__tests__/writerSynopsisHelper.test.ts src/portals/writer/__tests__/shotPlanCsv.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/shared/api/__tests__/writerTools.test.ts` passed: 4 files, 7 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing baseline of 67 warnings and 0 errors.
- `git diff --check` passed.
- In-app browser QA at `http://localhost:5174/` confirmed the authenticated Writers Workshop flow shows `OUTLINE`, `SYNOPSIS`, `CANON`, `BEATS`, `DIALOGUE`, `VIDEO`, `ARC`, `COCKPIT`, and the Canon tab shows `PRE-LORE INTAKE`, `Suggest missing lore`, `Post-lore canon check`, `GENERATION CONTRACT`, `OUTLINE USES CANON`, `BEATS USE CANON`, `NO VIDEO ASSUMPTIONS`, and `VISUAL DETAILS EXPLICIT`.

### Outstanding issues

- Saved production defaults for comic medium, average panels/page, art style, character consistency, and strict canon behavior have not been implemented yet.

### Risks or caveats

- The lore gap assistant can suggest draft lore but does not persist new canon automatically.
- The post-lore canon check still runs the existing canon review; it does not yet automatically enforce missing lore fields across all generated output.
- The Cockpit is repositioned in the flow, but its internal feature set is still the existing compare/assist surface.

### Operator follow-up

- Continue using Synopsis helper for author/source outline input before regenerating outlines or beats.
- Add or include Canon cards before generation when character appearance, school/building design, devices, species/race/gender, factions, or world rules must remain stable.

### Next steps

- Add saved production defaults to the existing writer notes/metadata layer for comic vs video, target panels per page, art style, character consistency, strict canon/lore toggles, and prompt/export behavior.
- Append those production defaults into outline, page-beat, dialogue, and visual-planning generation contexts so users do not have to repeatedly type "comic book, not video" or panel-density instructions.

## Writers Workshop Pacing Apply Plan - 2026-05-31

### What changed

- Added a durable Writers Workshop Narrative Production System tracker at `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`.
- Added the same high-level tracker pointer/status to `tasks.md` so the separate tasklist stays visible outside chat.
- Incorporated the unresolved outline-intake issue into the plan/checklist as partial work: Synopsis helper is now early, but a dedicated author-outline intake/import surface is still pending.
- Added the pacing recommendation apply path to the Arc tab:
  - `Stage plan` applies the recommended page target, creates or trims affected page rows, appends pacing instructions into the outline supplement, and selects affected pages for follow-up regeneration.
  - `Apply + regenerate outline` does the same and immediately calls `outline_issue` with the pacing supplement and recommended target.
- Trimming pages is confirmable because it deletes page rows above the recommended target, including their saved page beats and dialogue.

### Files touched

- `src/portals/writer/WriterPortal.tsx`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes

- The first pacing-apply slice is intentionally conservative. It updates target/page-row structure and regenerates the outline when requested, but it does not silently overwrite existing page beats or dialogue.
- When pacing expands the issue, newly created page rows are selected for later batch beat/dialogue generation.
- When pacing condenses the issue, rows above the recommended target are deleted only after confirmation.
- When pacing keeps the same page count but suggests beat rebalancing, existing pages are selected for follow-up regeneration.
- The generated outline supplement captures target length, direction, page/beat deltas, rationale, add/cut suggestions, and a reminder to regenerate affected page beats/dialogue after outline changes.

### Verification

- `npm run test -- --run src/portals/writer/__tests__/writerSynopsisHelper.test.ts src/portals/writer/__tests__/shotPlanCsv.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/shared/api/__tests__/writerTools.test.ts` passed: 4 files, 7 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing 67-warning baseline and 0 errors.
- `git diff --check` passed.
- In-app browser QA at `http://127.0.0.1:5174/` confirmed the signed-in Writers Workshop Arc tab shows `Length recommendation`, `Apply recommendation`, `Stage plan`, `Apply + regenerate outline`, and `Pacing review`.

### Outstanding issues

- The author-outline confusion is only tracked, not solved. A first-class source-outline intake/import area is still needed.
- Pacing apply does not yet include a preview-safe downstream wizard that regenerates or overwrites affected page beats/dialogue.

### Risks or caveats

- `Apply + regenerate outline` makes a real AI writer-tools call and saves a new outline version.
- Page trimming deletes rows above the recommended target after confirmation; there is no diff/undo workflow in this pass.
- Existing beats/dialogue on retained pages are not automatically rewritten.

### Operator follow-up

- Review the new task tracker before the next Writers Workshop pass and keep its checkbox state synchronized after each pass.
- Use `Stage plan` first when you want to inspect the generated outline supplement before saving a new AI outline.

### Next steps

- Add the dedicated author-outline intake/import surface.
- Add a downstream pacing-apply wizard that previews affected outline/page-beat/dialogue changes before overwriting saved content.
- Add production defaults for comic vs video, panel density, art style, character consistency, and strict canon behavior.

## Writers Workshop Author Outline Intake - 2026-05-31

### What changed

- Added first-class author outline intake to the Synopsis helper tab.
- The new intake saves the user's source outline separately from issue synopsis under `writer_issues.notes.author_outline`.
- Added Preserve / Structure / Expand modes so the author can choose how strictly AI should follow the source outline during generation.
- Updated Cockpit/Synopsis digest context and issue-pack exports to include the author outline source.
- Updated the Lore gap helper context so missing-lore suggestions can inspect both issue synopsis and the author outline.
- Updated `writer-tools` outline generation so `outline_issue` reads `notes.author_outline` and injects it into the outline prompt as required source structure.
- Updated the Writers Workshop Narrative Production System tracker and `tasks.md` so the outline confusion item is marked complete for paste/draft workflows, with file upload/import and hierarchy editing still pending.

### Files touched

- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerSynopsisHelper.ts`
- `src/portals/writer/__tests__/writerSynopsisHelper.test.ts`
- `supabase/functions/writer-tools/index.ts`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes

- No database schema changes were made. Author outlines use the existing JSON notes column on `writer_issues`.
- `notes.author_outline` stores `text`, `mode`, and `updated_at`.
- Preserve mode tells AI to keep author order, named events, outcomes, and causal chain as strictly as possible.
- Structure mode tells AI to organize the source outline into production beats while preserving events and intent.
- Expand mode tells AI to use the outline as the required story spine and add connective tissue only where sparse.
- The author outline does not overwrite `writer_issues.synopsis`; synopsis remains short pitch/context, while author outline is now the source structure.

### Verification

- `npm run test -- --run src/portals/writer/__tests__/writerSynopsisHelper.test.ts src/portals/writer/__tests__/shotPlanCsv.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/shared/api/__tests__/writerTools.test.ts` passed: 4 files, 8 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing 67-warning baseline and 0 errors.
- `git diff --check` passed.
- In-app browser QA at `http://127.0.0.1:5174/` confirmed the signed-in Writers Workshop Synopsis tab shows `Author outline intake`, `notes.author_outline`, Preserve / Structure / Expand modes, `Generation contract`, and `Save author outline`.

### Outstanding issues

- File upload/import for outlines is not implemented yet.
- Editable hierarchy/tree organization for pasted outlines is not implemented yet.
- The downstream pacing-apply wizard for preview-safe beat/dialogue regeneration remains pending.

### Risks or caveats

- `outline_issue` prompt behavior changed in the Supabase Edge Function. Deploy `writer-tools` before expecting production Supabase calls to honor `notes.author_outline`.
- The current UI supports pasted/drafted outlines, not `.docx`, `.txt`, `.md`, or JSON upload.

### Operator follow-up

- Deploy `writer-tools` with `supabase functions deploy writer-tools` after merging this pass.
- Try generating an outline with Preserve mode using a known source outline and verify the saved `page_beats` keep the intended story sequence.

### Next steps

- Add file upload/import for `.txt`, `.md`, and JSON outlines.
- Add an editable hierarchy tree for author outlines before AI generation.
- Add production defaults for comic/video distinction, average panels per page, art style, and character consistency.

## Writers Workshop Foundation Hub Production Defaults - 2026-05-31

### What changed

- Added Foundation Hub production defaults to the Writers Workshop Outline workspace.
- Added editable defaults for primary medium type, narrative scope, comic panel density, art style, character consistency, strict canon, and no-video-assumptions behavior.
- Persisted the defaults through existing JSON metadata instead of a schema change:
  - series-level defaults use `writer_series.notes.production_defaults`;
  - issue-level defaults use `writer_issues.notes.production_defaults`;
  - issue values override series values when both are present.
- Added a tested production-defaults helper for reading, resolving, serializing, and formatting the defaults.
- Extended writer-tools request schemas and client payloads so resolved production defaults are sent to outline, page-beat, batch page-beat, dialogue, and shot/visual planning calls.
- Updated the Supabase `writer-tools` Edge Function prompts so production defaults are injected into outline, page-beat, dialogue, and visual planning contexts.
- Added production defaults to Cockpit/Synopsis/Video digests, lore-gap context, and issue-pack exports.
- Updated the Lore generation-contract copy now that saved production defaults exist.
- Updated `tasks.md` and the formal Writers Workshop Narrative Production System tracker to mark the Foundation Hub/defaults injection slice complete, with explicit output-format defaults still pending.

### Files touched

- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerProductionDefaults.ts`
- `src/portals/writer/__tests__/writerProductionDefaults.test.ts`
- `src/shared/api/arcsWriterRoom.ts`
- `src/shared/writer/types.ts`
- `src/shared/writer/schemas.ts`
- `src/shared/writer/__tests__/schemas.test.ts`
- `supabase/functions/_shared/writerSchemas.ts`
- `supabase/functions/writer-tools/index.ts`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes

- No database migration or new table/column was added.
- The UI saves issue defaults when an issue is selected; if only a series is selected, it saves series defaults.
- The client still sends the resolved defaults on generation requests so current UI state is honored immediately, and the Edge Function also resolves saved series/issue notes as a fallback.
- Comic-first defaults preserve the user's repeated instruction that the system should not assume video/trailer output unless visual planning explicitly asks for it.
- `production_defaults` is intentionally a small snake-case payload in the writer-tools request contract so it can travel to the Edge Function without exposing UI-only state names.

### Verification

- `npm run test -- --run src/portals/writer/__tests__/writerProductionDefaults.test.ts src/portals/writer/__tests__/writerSynopsisHelper.test.ts src/shared/writer/__tests__/schemas.test.ts src/shared/api/__tests__/writerTools.test.ts` passed: 4 files, 37 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.

### Outstanding issues

- Explicit output-format defaults remain pending until the export branch is designed.
- File upload/import for author outlines and editable hierarchy/tree controls remain pending from the prior pass.

### Risks or caveats

- `writer-tools` must be redeployed before production Supabase Edge calls honor the new production defaults prompt block.
- If a user edits defaults in the UI but does not save them, the current client sends them with immediate generation calls, but a future reload will restore the last saved series/issue notes defaults.

### Operator follow-up

- Deploy `writer-tools` with `supabase functions deploy writer-tools` after merging this pass.
- Test one comic outline generation and one page-beats generation with strict canon/no-video-assumptions enabled to confirm outputs stay comic-first.

### Next steps

- Add explicit export/output-format defaults once the export branch is designed.
- Add the downstream pacing-apply preview wizard for page-beat/dialogue regeneration.
- Continue with hierarchy support: arc -> book/issue/episode -> chapter/page/scene -> beat.

## Writers Workshop Output Format Defaults - 2026-05-31

### What changed

- Added an explicit preferred output/export format to Foundation Hub production defaults.
- Stored the new value as `output_format` under the existing `notes.production_defaults` metadata contract, preserving the no-migration approach from the Foundation Hub pass.
- Added Foundation Hub UI options for Issue pack JSON, comic script markdown, Guided Comics handoff, Fountain screenplay, prose manuscript, and lore wiki output.
- Routed `output_format` through production-default payloads, client schemas, shared writer types, and the mirrored Supabase Edge schema.
- Updated the Supabase `writer-tools` production-default resolver and prompt block so saved issue/series defaults still inject preferred output format when the client does not send the current draft.
- Kept issue-pack exports consistent by ensuring the older Outline-tab issue-pack download uses the full `issuePackObject`, including production defaults.
- Updated the formal Writers Workshop Narrative Production System tracker and `tasks.md`.

### Files touched

- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerProductionDefaults.ts`
- `src/portals/writer/__tests__/writerProductionDefaults.test.ts`
- `src/shared/writer/types.ts`
- `src/shared/writer/schemas.ts`
- `src/shared/writer/__tests__/schemas.test.ts`
- `supabase/functions/_shared/writerSchemas.ts`
- `supabase/functions/writer-tools/index.ts`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes

- No database schema changes were made.
- `output_format` is advisory production context for generation and export packaging; it does not remove the existing per-button export formats.
- Issue-level production defaults continue to override series-level defaults through the existing resolver.
- The Edge Function and client schemas must stay mirrored for `writerProductionDefaultsPayloadSchema`.

### Verification

- `npm run test -- --run src/portals/writer/__tests__/writerProductionDefaults.test.ts src/portals/writer/__tests__/writerSynopsisHelper.test.ts src/shared/writer/__tests__/schemas.test.ts src/shared/api/__tests__/writerTools.test.ts` passed: 4 files, 37 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with the existing 67-warning baseline and 0 errors.
- `git diff --check` passed.
- In-app browser QA at `http://127.0.0.1:5174/` confirmed the Writers Workshop loaded with title `ARCS Expanded`; Foundation Hub rendered the `Preferred export` select with Issue pack JSON, comic script markdown, Guided Comics handoff, Fountain screenplay, prose manuscript, and lore wiki options; Outline/Synopsis tab switching worked and returned to Foundation Hub.
- Screenshot capture through the in-app browser timed out, so no screenshot artifact was saved for this pass.

### Outstanding issues

- Hierarchical structure support remains pending.
- File upload/import and editable hierarchy controls for author outlines remain pending.
- Preview-safe downstream pacing regeneration for page beats/dialogue remains pending.

### Risks or caveats

- `writer-tools` must be redeployed before production Supabase Edge calls honor `output_format` from saved notes fallback.
- Preferred output format currently travels as prompt/export metadata; it does not automatically change which download button a user clicks.

### Operator follow-up

- Deploy `writer-tools` with `supabase functions deploy writer-tools` after merging this pass.
- Manually verify saving a non-default preferred export value in a signed-in browser session once Supabase auth is available.

### Next steps

- Continue with hierarchy support: arc -> book/issue/episode -> chapter/page/scene -> beat.
- Add the downstream pacing-apply preview wizard for page-beat/dialogue regeneration.

## Writers Workshop Narrative Production System Completion Pass - 2026-05-31

### What changed

- Completed the requested two-pass Writers Workshop completion slice in one integrated implementation pass, with subagent lanes used for schema/page-beat metadata, hierarchy helpers, and production branch/audit helpers before coordinator integration.
- Added page-level metadata to stored page beats: `characters: string[]`, `locations: string[]`, and `art_style: string`, while leaving the existing `panels` payload unchanged.
- Updated the `writer-tools` page-beat prompt so generated page beats must include source-grounded `characters`, source-grounded `locations`, and resolved production-default `art_style`; missing source-grounded names/settings must be empty arrays rather than invented values.
- Added hierarchy import/tree support inside the existing Synopsis helper surface, using `notes.hierarchy_tree` with no database migration.
- Added paste and file import for `.txt`, `.md`, `.markdown`, and JSON hierarchy source; imported content normalizes into `arc -> book/issue/episode -> chapter/page/scene -> beat` nodes and renders as a saved tree preview.
- Added page-beat metadata visibility on the Beats tab for the selected page.
- Added dynamic selected-page beat editing controls in the existing Beats JSON editor: insert, remove, merge, split, move up, and move down. These controls only rewrite the `panels` array and preserve page-level `characters`, `locations`, and `art_style` unless the JSON is edited directly.
- Added preview-safe pacing regeneration support in the Arc tab by showing queued affected pages, their current beat/dialogue state, and explicit follow-up actions before beat/dialogue regeneration.
- Expanded audit contracts and prompts for emotional arc, character utilization, and worldbuilding density in addition to continuity/canon review.
- Added expanded audit entry cards and production branch cards for visual prep, dialogue, exports, and Guided Comics handoff inside existing Writers Workshop surfaces.
- Updated `tasks.md` and the formal Narrative Production System plan to reflect the completed and remaining items.

### Files touched

- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerHierarchy.ts`
- `src/portals/writer/writerProductionBranches.ts`
- `src/portals/writer/__tests__/writerHierarchy.test.ts`
- `src/portals/writer/__tests__/writerProductionBranches.test.ts`
- `src/shared/writer/types.ts`
- `src/shared/writer/schemas.ts`
- `src/shared/writer/__tests__/schemas.test.ts`
- `supabase/functions/_shared/writerSchemas.ts`
- `supabase/functions/writer-tools/index.ts`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes

- No database migration was added; hierarchy data is stored under existing issue `notes.hierarchy_tree`, and page metadata stays inside existing `writer_pages.beats_json`.
- The app and Supabase shared schemas remain mirrored for page-beat metadata and expanded audit output validation.
- The dynamic beat controls operate on the local JSON draft first; the user must still press `Save beats to database` to persist.
- The selected-page regeneration path remains the existing `Generate page beats` action, now with the richer metadata contract.
- The pacing preview now prevents silent downstream overwrites by showing affected pages and requiring explicit beat/dialogue regeneration. It does not yet produce a non-persisting LLM diff of proposed replacement text before saving.
- Production branch cards are navigation/output-context surfaces; they group existing visual prep, dialogue, export, and Guided Comics handoff paths rather than adding a new portal.

### Verification

- `npm run test -- --run src/shared/writer/__tests__/schemas.test.ts src/portals/writer/__tests__/writerHierarchy.test.ts src/portals/writer/__tests__/writerProductionBranches.test.ts src/portals/writer/__tests__/writerProductionDefaults.test.ts src/portals/writer/__tests__/writerSynopsisHelper.test.ts src/shared/api/__tests__/writerTools.test.ts` passed: 6 files, 47 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `git diff --check` passed.
- Authenticated in-app browser QA at `http://127.0.0.1:5174/` confirmed the signed-in Writers Workshop loaded as `ARCS Expanded`, selected a real issue, and showed:
  - Synopsis helper hierarchy import, `.txt/.md/JSON` file import, and saved hierarchy tree preview.
  - Beats tab page metadata for characters, locations, and art style.
  - Beats JSON editor controls for insert, remove, merge, split, move up, and move down.
  - Arc expanded audits for continuity, emotional arc, character utilization, and worldbuilding density.
  - Video production branches for visual prep, dialogue, exports, and Guided Comics handoff.
- Browser screenshot capture timed out, so no screenshot artifact was saved for this pass.

### Outstanding issues

- True proposed LLM diff preview for replacement page beats/dialogue before persistence remains a follow-up.
- Full ribbon compaction remains future polish; this pass groups more secondary actions but does not redesign the ribbon.
- `writer-tools` must be redeployed before production Edge calls honor the new page-beat metadata and expanded audit prompt/schema behavior.

### Risks or caveats

- Existing legacy page beats without metadata remain valid; the selected page metadata strip will show empty-state labels until pages are regenerated or manually edited.
- Generated metadata is only as source-grounded as the outline/synopsis/cast/location/lore data supplied to the Edge Function.
- The hierarchy tree currently imports/saves normalized structure and previews it; direct node-by-node editing beyond re-import/paste editing is not implemented.

### Operator follow-up

- Deploy `writer-tools` with `supabase functions deploy writer-tools` after merging this pass.
- Regenerate a small set of page beats in a signed-in production-like environment and confirm saved `beats_json` includes `characters`, `locations`, and `art_style`.
- Run one pacing review and one canon check after redeploy to confirm the expanded audit branches save in `notes.writer_tool_cache`.

### Next steps

- Add non-persisting preview endpoints or client staging for proposed beat/dialogue replacements before applying pacing-driven regeneration.
- Decide whether the hierarchy tree needs direct node rename/reorder controls beyond import/paste editing.
- Continue ribbon density polish once the production branch surfaces settle.

## Writers Workshop Production Branch Hardening - 2026-05-31

### What changed

- Proceeded with the second pass by hardening the already-visible audit and production branch surfaces.
- Added pure production-branch helpers that summarize expanded audit readiness for continuity, emotional arc, character utilization, and worldbuilding density.
- Added pure branch-readiness helpers for visual prep, dialogue, exports, and Guided Comics handoff.
- Added issue-pack markdown export formatting.
- Added a portable `writer-guided-comics-handoff.json` export shape that packages Writers Workshop pages with page summaries, `characters`, `locations`, `art_style`, panel beats, and dialogue for Guided Comics intake.
- Updated the Arc tab expanded audit cards so they show saved/missing state plus a readable summary rather than only a raw review cache indicator.
- Updated the Video tab production branch cards so each branch shows readiness, focused action copy, and direct actions for Imageshop, issue-pack JSON, issue-pack Markdown, and Guided Comics handoff JSON.
- Added the same issue-pack Markdown and Guided Comics handoff export actions to the Synopsis helper `Copy & download` panel.
- Updated `tasks.md` and the formal Narrative Production System plan with the second-pass branch hardening status.

### Files touched

- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerProductionBranches.ts`
- `src/portals/writer/__tests__/writerProductionBranches.test.ts`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes

- No database migration or routing change was added.
- The Guided Comics handoff is a portable export artifact, not an automatic import into Guided Comics. This preserves the existing source-of-truth boundary between Writers Workshop and Guided Comics.
- The export helper accepts persisted `beats_json` records conservatively and only emits page-beat metadata when a `panels` array is present.
- The Arc audit cards still run the existing `pacing_review` or `canon_check` modes; the second pass makes their expanded saved branches readable in the UI.

### Verification

- `npm run test -- --run src/portals/writer/__tests__/writerProductionBranches.test.ts src/shared/writer/__tests__/schemas.test.ts` passed: 2 files, 40 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `git diff --check` passed.
- Authenticated in-app browser QA at `http://127.0.0.1:5174/` confirmed:
  - Arc expanded audit cards render readable pacing/canon summary states.
  - Video production branch cards render readiness badges and direct actions for `Imageshop`, `JSON`, `Markdown`, and `Handoff JSON`.
  - Synopsis helper `Copy & download` renders `Download issue pack .md` and `Download Guided Comics handoff`.

### Outstanding issues

- True non-persisting LLM diff preview for replacement page beats/dialogue before persistence remains a follow-up from the prior pass.

### Risks or caveats

- `writer-guided-comics-handoff.json` is a structured export for downstream use. It does not yet call a Guided Comics import action directly.
- Branch readiness is derived from current saved rows and cached outputs; stale cached audit data can still appear ready until a fresh pacing/canon run updates it.

### Operator follow-up

- After `writer-tools` redeploy, run fresh pacing/canon checks and confirm expanded audit summaries populate the readiness cards from live Edge output.
- Decide whether Guided Comics should add a first-class importer for `writer-guided-comics-handoff.json`.

### Next steps

- Run final lint, diff check, and authenticated browser QA for the second-pass branch actions.

## How to Use These Docs

| File | Use |
|------|-----|
| **tasks.md** | Checklist for Phases 10-13 and Critical Bug-Squash; tick off as you go. |
| **implementation_plan.md** | Where to change code (files, store, components) and how it fits the Konva/React/Zustand setup. |
| **walkthrough.md** | This file: big picture and roadmap for you and future agents. |

Cursor does not auto-update these files; update them (or ask the agent to) as you complete work so the roadmap stays accurate.

## Imageshop Production Studio Tracker - 2026-05-31

### What changed

- Created a durable Imageshop Production Studio implementation tracker with a seven-pass estimate and an agent-updatable checklist.
- Captured the implementation constraints for keeping the work inside the existing Imageshop / `lab` portal, preserving current bridge contracts, avoiding Supabase schema changes for v1, and leaving ComicEditor untouched.
- Added a verification matrix that future agents can use to record automated and manual checks as each pass lands.

### Files touched

- `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`
- `walkthrough.md`

### Implementation notes

- This was a documentation/tracker pass only. It did not implement the seven Imageshop production-studio passes yet.
- The tracker marks the document creation and verification-matrix setup items complete, while leaving Passes 1-7 unchecked for future implementation.
- The tracker explicitly preserves existing Imageshop session recovery, Guided Comic Flow handoff, vault save/export behavior, routing, Supabase schema, and ComicEditor boundaries.

### Verification

- `rg -n "Imageshop Production Studio Implementation Tracker|Pass 1: Production state foundation|Agent Checklist|Verification Matrix" docs/superpowers/plans/2026-05-31-imageshop-production-studio.md` confirmed the tracker title, first pass, checklist, and verification matrix landed.
- `rg -n "Imageshop Production Studio Tracker - 2026-05-31" walkthrough.md` confirmed the walkthrough entry landed.
- `git status --short` confirmed the new tracker file and walkthrough modification are present. It also showed existing unrelated modifications to `src/portals/writer/WriterPortal.tsx`, `src/portals/writer/writerProductionBranches.ts`, and `src/portals/writer/__tests__/writerProductionBranches.test.ts`, which were not touched by this pass.

### Outstanding issues

- The actual Imageshop production-studio implementation remains pending across the seven listed passes.

### Risks or caveats

- None for runtime behavior because no application code changed.

### Operator follow-up

- Future implementation agents should update the tracker after each pass and append a scoped `walkthrough.md` entry for each meaningful implementation delta.

### Next steps

- Begin Pass 1: production state foundation.

## Imageshop Production Studio Implementation - 2026-05-31

### What changed

- Implemented the seven-pass Imageshop Production Studio plan inside the existing Imageshop / `lab` portal.
- Added a local production state store for generation mode, structured prompt workspace, saved art styles, continuity settings, comic page config, saved layout templates, imported batches, production items, statuses, and generated/refined versions.
- Added structured prompt composition with video/comic mode awareness, negative prompt, character/environment/art style/camera/continuity sections, reference metadata injection, comic page settings, continuity strength, locked continuity, and Character Bible Mode.
- Added JSON import/export support for Story Beat JSON, Comic Page JSON, and exported ARCS Imageshop configs, including normalized batch production items, reusable export JSON, saved art style definitions, and the selected art style.
- Closed follow-up audit gaps by adding the named `Single Comic Page` page type, injecting approved/published production item versions back into prompt composition as production references, and preserving art style libraries through ARCS export/import round trips.
- Expanded the Imageshop UI with:
  - Video Beats / Comic Pages mode selector.
  - Resizable multi-section prompt workspace.
  - Art Style Library with built-in styles and saved custom styles.
  - Continuity Lock controls and 0-100 continuity strength.
  - Comic page configuration, page types, panel text/SFX/page-number toggles, border designer, gutter controls, page background URL/upload, and saved custom layout templates.
  - JSON Production Batch import/export and sequential Generate Batch action.
  - Production Dashboard with Draft, Generated, Refined, Approved, and Published status filters/actions.
  - Refinement Workspace with prompt edit, region edit, character/face/costume/lighting/color/dialogue correction, and surgical Continuity Correction source/target fields.
- Preserved existing generated-result session recovery, Save / Export, Character Vault, Asset Vault, NPC Vault, Guided Comic Flow handoff, and Guided Comic panel return wiring.
- Updated the Imageshop production tracker so Passes 1-7 and automated verification are marked complete, while signed-in manual browser checks remain explicitly unchecked because auth blocked them.

### Files touched

- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/imageshopPromptComposer.ts`
- `src/portals/storyline/imageshopJsonSchemas.ts`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `src/portals/storyline/__tests__/imageshopPromptComposer.test.ts`
- `src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts`
- `src/stores/imageshopProductionStore.ts`
- `src/stores/__tests__/imageshopProductionStore.test.ts`
- `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`
- `walkthrough.md`

### Implementation notes

- No routing, Supabase schema, or ComicEditor changes were introduced.
- The new production store persists local Imageshop production state under `arcs-imageshop-production-v1`; existing generated-result recovery remains in `arcs-imageshop-session-v1`.
- Video Beats mode preserves the raw-prompt path unless the user enables structured production controls. Comic Pages mode composes the structured production prompt.
- Reference metadata injection uses current Guided Comic handoff metadata where available, while manual/reference slot URLs still participate as named Imageshop slot references.
- Region edit and continuity correction are implemented as structured prompt workflows over the existing generation API because no true region-edit API is exposed in the current repo.
- Sequential batch generation processes dashboard production items and records output versions under each item.
- Page background upload uses a local object URL for the current browser session.

### Verification

- `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/imageshopSessionStore.test.ts` passed: 6 files, 34 tests.
- `npm run test` passed: 49 files, 292 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- `git diff --check` passed.
- In-app browser opened `http://127.0.0.1:5173/` and confirmed the app title `ARCS Expanded`, but protected portal QA stopped at the Supabase sign-in gate.
- Disposable QA sign-up was attempted through the app auth UI; the first `example.com` email was rejected as invalid, and the follow-up Gmail-style address was blocked by Supabase email rate limiting.
- Chrome-profile QA was also attempted against `http://127.0.0.1:5173/`, but the available Chrome profile was not signed into ARCS and stopped at the same sign-in gate.
- Because the browser sessions remained unauthenticated, signed-in manual checks for Guided Comic Flow -> Imageshop -> return-art and Save / Export were not completed in-browser. Focused bridge/component tests now cover Guided Comic Flow panel return wiring and session-result Save / Export to the NPC Vault/local archive path without regeneration.

### Outstanding issues

- Signed-in browser QA remains operator QA once a valid session is available, but the previously weak return/save paths now have automated component/bridge coverage.
- True pixel/region editing is not implemented because the current repo exposes prompt/image generation, not a dedicated region-edit API.
- Batch generation is sequential and intentionally conservative; no parallel rate-limit strategy was added.

### Risks or caveats

- The expanded UI is intentionally broad and functional, but it significantly increases `GenericImageLabPanel.tsx` size. Future polish should split the production controls into child components once behavior settles.
- Local object URLs for uploaded page backgrounds are session-local and are not durable exports unless replaced with a hosted/stored URL.
- Fake/local auth bypass was not added to app code; protected portal behavior remains intact.

### Operator follow-up

- Sign in with a valid Supabase user and manually verify:
  - Guided Comic Flow -> Imageshop -> generated panel return.
  - Save / Export to Character Vault, Asset Vault, NPC Vault, and Download.
  - Import JSON -> Generate Batch -> status update -> Export JSON.
- Consider splitting Imageshop production subpanels into focused components after product behavior is accepted.

### Next steps

- Perform signed-in browser QA and update the tracker checkboxes for the remaining manual verification items.

## Imageshop Production Studio Resumed QA Attempt - 2026-06-01

### What changed

- Rechecked the current tracker state after the goal was resumed.
- Started the local dev server on `http://127.0.0.1:5173/` and connected the in-app browser to the app.
- Confirmed the app loads as `ARCS Expanded`, but selecting the Illustrator's Imageshop card still routes to the protected `Sign in to continue` gate.
- Updated the Imageshop production tracker to record this fresh resumed QA attempt.

### Files touched

- `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`
- `walkthrough.md`

### Implementation notes

- No application code changed in this resumed QA attempt.
- The two remaining unchecked tracker items still require a valid signed-in ARCS/Supabase browser session:
  - Guided Comic Flow -> Imageshop -> return-art path manually verified.
  - Save / Export to Character Vault, Asset Vault, NPC Vault, and Download manually verified.

### Verification

- In-app browser opened `http://127.0.0.1:5173/` and reported title `ARCS Expanded`.
- In-app browser DOM snapshot showed the protected `Sign in to continue` screen after opening Illustrator's Imageshop.
- `git status --short --untracked-files=all` was clean before the tracker/walkthrough update.

### Outstanding issues

- Signed-in browser QA remains blocked until a valid authenticated session is available.

### Risks or caveats

- Automated coverage remains the strongest available evidence for the return/save paths, but it is not a substitute for the explicitly requested signed-in manual verification checklist items.

### Operator follow-up

- Sign in with a valid ARCS/Supabase account and manually verify the two remaining tracker checkboxes.

### Next steps

- Once signed in, run the manual Guided Comic Flow return-art and Save / Export checks, then update the tracker checkboxes and append a final walkthrough entry.

## Imageshop Production Studio Auth QA Retry - 2026-06-01

### What changed

- Re-audited the remaining Imageshop tracker checkboxes and local auth setup.
- Searched project docs, `.agents`, source, and Supabase config for a documented QA account or supported test auth path.
- Attempted one fresh disposable Supabase email/password sign-up using the configured `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Updated the Imageshop production tracker with the fresh auth evidence.

### Files touched

- `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`
- `walkthrough.md`

### Implementation notes

- No application code changed in this retry.
- The local `.env` contains only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GEMINI_API_KEY`; no service-role key or documented QA credential is available.
- The new disposable Supabase user was created, but Supabase returned `needsConfirmation: true` and no session, so it cannot be used to unlock the protected browser routes without email confirmation.

### Verification

- `git status --short --untracked-files=all` showed only the existing tracker/walkthrough modifications before this update.
- `rg` over project docs/source found ordinary Supabase email/password auth and no documented QA account.
- Supabase sign-up returned `ok: true`, `needsConfirmation: true`, `hasSession: false`, and `hasUser: true`.

### Outstanding issues

- Signed-in browser QA remains blocked until a valid authenticated ARCS/Supabase session is available.

### Risks or caveats

- A disposable unconfirmed Supabase user now exists in the auth project, but it has no usable session and was not used for app QA.

### Operator follow-up

- Provide or use a confirmed ARCS/Supabase account in the browser session, then manually verify:
  - Guided Comic Flow -> Imageshop -> generated panel return.
  - Save / Export to Character Vault, Asset Vault, NPC Vault, and Download.

### Next steps

- Retry the signed-in browser checks once a confirmed account or active browser session is available.

## Imageshop Production Studio Signed-In Save Export QA - 2026-06-01

### What changed

- Retried the Imageshop QA path after the in-app browser session became authenticated as `hayronivy@gmail.com`.
- Generated a real Imageshop smoke-test image from the prompt `QA smoke test: a small golden compass on a clean studio table, crisp lighting, no text.`
- Manually verified the signed-in Save / Export controls for Download, NPC Vault, Character Vault, and Asset Vault.
- Updated the Imageshop production tracker to mark the Save / Export manual verification checkbox complete.

### Files touched

- `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`
- `walkthrough.md`

### Implementation notes

- No application code changed in this QA pass.
- Character Vault was verified with profile `Imageshop QA Character 20260601` and cast name `Imageshop QA`.
- Asset Vault was verified with collection `Imageshop QA Assets 20260601` and asset name `Golden Compass Smoke Test`.
- NPC Vault was verified with the default `Imageshop result` label.
- Download was verified by the visible success notice `Downloaded the current generated image.`

### Verification

- In-app browser loaded `ARCS Expanded` signed in as `hayronivy@gmail.com`.
- Imageshop opened without the protected sign-in gate.
- Image generation completed and exposed the `Save / Export` panel.
- Download showed `Downloaded the current generated image.`
- NPC Vault save showed `Saved to NPC Vault as "Imageshop result".`
- Character Vault save showed `Saved to Character Vault as "Imageshop QA Character 20260601".`
- Asset Vault save showed `Saved to Asset Vault collection "Imageshop QA Assets 20260601".`

### Outstanding issues

- Guided Comic Flow -> Imageshop -> return-art manual QA remains unchecked.
- The in-app browser control bridge became unresponsive while opening Comic Creator after the Save / Export checks, timing out on DOM and screenshot commands. Closing/reopening a clean in-app tab also timed out waiting for the browser webview to attach.

### Risks or caveats

- The Save / Export checks created real QA artifacts in the signed-in user's Character and Asset vaults.

### Operator follow-up

- Reopen or restart the in-app browser, then manually verify Guided Comic Flow -> Imageshop -> generated panel return.

### Next steps

- Once the browser bridge is responsive again, open Comic Creator, start or select a guided comic, use the panel Imageshop action, and click `Send back to Guided Flow` after generation.

## Imageshop Guided Comic Return QA And Draft Restore Fix - 2026-06-01

### What changed

- Fixed the Guided Comic Flow restore order so a newer unsaved local guided draft is restored over an older Comic Library snapshot.
- This preserves page cards and panel queues when Comic Creator remounts after sending generated art back from Imageshop.
- Manually verified the signed-in Guided Comic Flow -> Imageshop -> return-art path.
- Updated the Imageshop production tracker to mark the Guided Comic Flow return-art manual verification checkbox complete.

### Files touched

- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`
- `walkthrough.md`

### Implementation notes

- The bug appeared when returning from Imageshop to Comic Creator: Comic Creator remounted from the saved Comic Library project snapshot, which could be older than the unsaved local guided draft. That made the Art step show `0 panels`, so the returned panel image had no visible panel queue to attach to.
- The fix compares the local guided draft `savedAt` timestamp with the active Comic Library project `updatedAt`; if the local draft is newer, it becomes the initial restored draft while preserving the existing library and active project id.
- No Supabase schema, route, or ComicEditor changes were introduced.

### Verification

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed: 4 files, 40 tests.
- Signed-in browser QA:
  - Opened Comic Creator as `hayronivy@gmail.com`.
  - Opened current issue and Page 1 / Panel 1 panel focus.
  - Clicked `Imageshop` from the panel image controls.
  - Confirmed Imageshop loaded `Page 1, Panel 1` with the Guided Comic Flow prompt.
  - Generated panel art and clicked `Send back to Guided Comic Flow`.
  - Reopened Page 1 / Panel 1 and confirmed status `Ready`, image framing controls enabled, and `Assigned art for page 1, panel 1` visible.

### Outstanding issues

- None for the Imageshop Evolution Plan tracker.

### Risks or caveats

- The manual QA created real signed-in Imageshop and Guided Comic local/browser artifacts in the current account/session.

### Operator follow-up

- None.

### Next steps

- None.

## Writers Workshop Completion Pass - 2026-06-01

### What changed

- Added an archived accountability plan at `docs/superpowers/plans/2026-06-01-writers-workshop-completion-and-verification.md`.
- Reconciled the stale handoff against the current repo state: output-format defaults, author-outline import, and hierarchy-tree storage were already implemented after the handoff was generated.
- Added a preferred-export resolver for all saved `notes.production_defaults.output_format` values:
  - `issue_pack_json`
  - `comic_script_markdown`
  - `guided_comic_handoff`
  - `fountain_screenplay`
  - `prose_manuscript`
  - `lore_wiki`
- Added primary preferred-export buttons to the Video production-branch export card and the Scripts export panel while preserving the explicit JSON, markdown, and Guided Comics handoff downloads.
- Added editable saved hierarchy tree controls in Synopsis helper:
  - title editing,
  - node kind editing,
  - sibling move up/down,
  - delete,
  - reset edits,
  - explicit save back to `notes.hierarchy_tree`.
- Added preview-safe downstream pacing regeneration:
  - new `pacing_regeneration_preview` writer-tools mode,
  - shared app and Supabase Edge schemas for preview requests/results,
  - Edge function prompt and validation path that returns proposals without saving,
  - Arc UI action to generate preview-only AI replacements for affected pages,
  - current vs proposed diff display,
  - explicit per-page Apply beats / Apply dialogue / Apply both actions.
- Deployed the updated Supabase Edge Function `writer-tools`.
- Updated `tasks.md` and the active Writers Workshop tracker to reflect the repo-authoritative completion state and the one live-AI verification blocker.

### Files touched

- `docs/superpowers/plans/2026-06-01-writers-workshop-completion-and-verification.md`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `tasks.md`
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerHierarchy.ts`
- `src/portals/writer/writerProductionBranches.ts`
- `src/portals/writer/__tests__/writerHierarchy.test.ts`
- `src/portals/writer/__tests__/writerProductionBranches.test.ts`
- `src/shared/writer/schemas.ts`
- `src/shared/writer/types.ts`
- `src/shared/writer/__tests__/schemas.test.ts`
- `supabase/functions/_shared/writerSchemas.ts`
- `supabase/functions/writer-tools/index.ts`
- `walkthrough.md`

### Implementation notes

- No database migration was added. Production defaults, author outline data, and hierarchy data continue to use existing notes metadata.
- Preferred exports are resolved from the issue-pack object and do not remove any existing explicit export buttons.
- The preview regeneration mode intentionally does not update `writer_pages`. Only accepted UI proposals call existing page update helpers.
- `writer-tools` validates the preview result with `pacingRegenerationPreviewResultSchema` before returning it to the client.
- Build verification dirtied `supabase/functions/tsconfig.tsbuildinfo`; it was restored because it is generated verification output, not part of this feature.

### Verification

- Baseline targeted tests before implementation: `npm run test -- --run src/portals/writer/__tests__/writerProductionDefaults.test.ts src/portals/writer/__tests__/writerHierarchy.test.ts src/portals/writer/__tests__/writerProductionBranches.test.ts src/shared/writer/__tests__/schemas.test.ts src/shared/api/__tests__/writerTools.test.ts` - PASS, 5 files / 48 tests.
- TDD red checks:
  - preferred export resolver test failed before `buildPreferredWriterExport` existed.
  - hierarchy edit helper test failed before edit helpers existed.
  - pacing preview schema test failed before the new discriminated-union mode existed.
- Targeted tests after implementation: `npm run test -- --run src/shared/writer/__tests__/schemas.test.ts src/portals/writer/__tests__/writerHierarchy.test.ts src/portals/writer/__tests__/writerProductionBranches.test.ts src/shared/api/__tests__/writerTools.test.ts` - PASS, 4 files / 48 tests.
- Full tests: `npm run test` - PASS, 49 files / 298 tests.
- Build: `npm run build` - PASS with the existing large chunk warning.
- Lint: `npm run lint` - PASS with 0 errors and the existing 67-warning baseline.
- Whitespace: `git diff --check` - PASS.
- Supabase before deploy: `supabase functions list` showed `writer-tools` ACTIVE version 45, updated `2026-05-11 21:48:03 UTC`.
- Supabase deploy: `supabase functions deploy writer-tools --project-ref vxclogwiytxjolisnakd --use-api` - PASS.
- Supabase after deploy: `supabase functions list --project-ref vxclogwiytxjolisnakd` showed `writer-tools` ACTIVE version 46, updated `2026-06-01 05:45:41 UTC`.
- Browser QA at `http://127.0.0.1:5174/`:
  - app title loaded as `ARCS Expanded`;
  - DOM snapshot worked and showed the signed-out landing page;
  - Writers Workshop card interaction worked and opened the protected `Sign in to continue` gate;
  - screenshot capture timed out with `Page.captureScreenshot`, reproducing the in-app browser screenshot timeout issue.

### Outstanding issues

- Signed-in live AI generation calls for outline, beats, dialogue, and shot plan were not run because the current in-app browser session is signed out at the protected Writers Workshop route.

### Risks or caveats

- The new preview-only Edge mode has schema and build coverage, but live AI output quality still needs signed-in verification against real issue/page data.
- Browser screenshot evidence remains unavailable in this session because the in-app browser screenshot command timed out even though DOM and interaction checks worked.

### Operator follow-up

- Sign in with a valid ARCS/Supabase account, then run live AI calls for:
  - `outline_issue`,
  - `page_beats` or `page_beats_issue`,
  - `draft_dialogue`,
  - `plan_shots_from_issue`,
  - and the new `pacing_regeneration_preview`.
- Confirm the live outputs honor production defaults, author outline, hierarchy source, page metadata, and preferred output-format guidance.

### Next steps

- Complete signed-in live AI verification once a valid browser session is available.

## Writers Workshop Live Browser Verification - 2026-06-01

### What changed

- Re-ran authenticated in-app browser QA on `http://127.0.0.1:5174/` after the user made the browser session available.
- Verified live AI generation calls against a temporary `Codex Live AI Verification` issue:
  - outline generation,
  - page beats,
  - dialogue,
  - shot plan,
  - pacing review,
  - and preview-only pacing regeneration replacements.
- Verified the new UI surfaces in the browser:
  - preferred-export action on Video production branches,
  - hierarchy import and editable saved-tree controls in Synopsis helper,
  - preview-safe current/proposed replacement UI with explicit apply buttons.
- Deleted the temporary verification issue after the live QA pass.
- Updated the completion plan, active Writers Workshop tracker, and task checklist to remove the previous signed-out live-AI blocker.

### Files touched

- `docs/superpowers/plans/2026-06-01-writers-workshop-completion-and-verification.md`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes

- The temporary issue used a small two-page verification synopsis so live generation could be tested without overwriting the main `The Blackening` issue.
- Browser QA confirmed:
  - `outline_issue` saved `Outline · v1`;
  - `page_beats` saved valid Page 1 panel JSON;
  - `draft_dialogue` saved Page 1 script text;
  - `plan_shots_from_issue` saved a valid `shots` array;
  - `pacing_review` saved structured pacing output;
  - `pacing_regeneration_preview` returned preview-only current/proposed beat/dialogue replacements and exposed `Apply beats`, `Apply dialogue`, and `Apply both`.
- The preview replacement pass did not apply proposed replacements, preserving the preview-safe contract.
- The temporary issue was deleted through the app after the live calls completed; the app returned to Issue 1 afterward.

### Verification

- Browser DOM inspection: authenticated Writers Workshop loaded with `Fabula Coniunctio Oppositorum · Issue 1: The Blackening`.
- Browser console check: no captured console errors before live QA.
- Browser screenshot: viewport screenshot succeeded after authenticated retry.
- Live AI calls: outline, page beats, dialogue, shot plan, pacing review, and preview-only pacing regeneration all returned successful UI evidence.
- Cleanup: temporary `Codex Live AI Verification` issue was no longer present after deletion; `Add issue #2` was visible again.

### Outstanding issues

- None for the six-pass Writers Workshop completion plan.

### Risks or caveats

- The live QA consumed real Supabase/Gemini calls in the authenticated project.
- The earlier signed-out screenshot timeout was reproduced before this pass; the authenticated retry succeeded, so future agents should start browser QA from an authenticated Writers Workshop route and fall back to DOM evidence if screenshot capture stalls.

### Operator follow-up

- None.

### Next steps

- Continue future polish separately, especially the non-blocking ribbon/workspace density reduction noted in `tasks.md`.
## Imageshop PR bugfixes - 2026-05-31

### What changed
- Fixed refinement prompt staging so selecting/staging a production item no longer advances a draft item to `generated` before image generation actually succeeds.
- Fixed uploaded page-background replacements so the previous `blob:` background URL is revoked before the new object URL is stored.

### Files touched
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `implementation_plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- `stageRefinementPrompt` now only updates the prompt workspace and preserves the selected production item's existing lifecycle status.
- `handlePageBackgroundFile` captures the new object URL once, revokes only the prior `blob:` URL, and stores the new URL through the existing page-config merge path.

### Verification
- `npx eslint src/portals/storyline/GenericImageLabPanel.tsx`
- `npm run build`
- `git diff --check`

### Outstanding issues
- None.

### Risks or caveats
- Manual browser QA was not run; the changes are limited to callback logic and were verified by lint/build checks.

### Operator follow-up
- None.

### Next steps
- None.

## Obsidian Lore Import for Writers Workshop - 2026-06-01

### What changed
- Added an Obsidian import pipeline for Writers Workshop lore cards.
- Added a Canon gate import panel with file selection, folder selection, Universe Operating System type filtering, preview rows, entry deselection, duplicate actions, warning display, and import result counts.
- Added image-aware lore import behavior for `.png`, `.jpg`, `.jpeg`, `.webp`, and `.gif` files referenced by Obsidian embeds such as `![[image.png]]` and `![[Assets/Characters/Kron/kron-reference.png]]`.
- Preserved imported note metadata without a database migration by storing a hidden structured import block inside the existing lore card body.
- Updated lore prompt digests on the client and Supabase Edge function so hidden import metadata and image storage URLs are stripped before text generation.
- Synced the Writers Workshop task tracker and active plan docs.

### Files touched
- `src/portals/writer/obsidianLoreImport.ts`
- `src/portals/writer/__tests__/obsidianLoreImport.test.ts`
- `src/portals/writer/WriterPortal.tsx`
- `src/shared/api/arcsPersistence.ts`
- `supabase/functions/writer-tools/index.ts`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `docs/superpowers/plans/2026-06-01-writers-workshop-completion-and-verification.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The parser reads `name` or `title` from frontmatter when present, otherwise falls back to the Markdown filename.
- `type`, `category`, or `kind` frontmatter maps to the lore category and supports broader taxonomy entries such as character, species, faction, organization, location, event, discipline, artifact, and concept.
- Markdown body content is preserved, including headings such as Overview, Relationships, Abilities, Biography, History, Visual References, and Notes.
- Obsidian internal links are preserved in the Markdown body and also collected into structured `linkedLoreReferences` when they match existing or imported lore titles.
- Embedded image references are resolved relative to the note folder, by selected path, or by unique filename. Unresolved image embeds produce warnings and do not block the note import.
- Confirmed imports upload resolved image files through the existing `arcs-generations` storage path. Stored image URLs are kept in the lore import metadata as visual references.
- Duplicate notes default to skip when a matching title already exists; the preview lets the user choose skip, overwrite, merge, or create duplicate. Merge preserves existing app-specific fields and app-field markers while updating the imported lore body.
- Imported metadata includes source path, import date, updated date, summary, properties, tags, matched references, and images. Generation text uses `stripLoreImportMetadataFromBody` so image URLs are not forced into prompts unless a future reference-asset flow explicitly selects them.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/obsidianLoreImport.test.ts` passed: 1 file, 7 tests.
- `npm run build` passed.
- `npm run lint` passed with 0 errors and 68 existing warnings.
- In-app browser QA on `http://127.0.0.1:5174/` verified the Canon tab rendered the Obsidian import panel, file/folder buttons, type filter, and no captured console errors.

### Outstanding issues
- Full browser import confirmation with a native file picker was not automated; parser, duplicate handling, and image reference behavior are covered by Vitest.

### Risks or caveats
- Storing rich import metadata in lore card bodies avoids a migration, but future database schema work could move this into first-class columns.
- Image storage requires the user to be signed in and the existing `arcs-generations` storage policies to allow uploads. Failed image uploads become warnings while the lore text can still import.

### Operator follow-up
- Deploy `supabase/functions/writer-tools` before expecting hosted generation to strip Obsidian import metadata from lore prompt digests.

### Next steps
- Add a future reference-asset selection flow if generation should explicitly attach imported lore images to image-capable model calls.

## Obsidian Lore Import Guide and QA Plan - 2026-06-01

### What changed
- Added a user/operator guide for the Writers Workshop Obsidian Lore Import workflow.
- Added a repeatable QA plan for manual and automated validation of the Obsidian import feature.
- Updated the active Writers Workshop trackers to explicitly reference the guide and QA plan.

### Files touched
- `docs/writers-workshop-obsidian-lore-import-guide.md`
- `docs/superpowers/plans/2026-06-01-obsidian-lore-import-qa-plan.md`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `docs/superpowers/plans/2026-06-01-writers-workshop-completion-and-verification.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The guide covers supported file types, recommended Obsidian frontmatter, property mapping, import steps, preview meanings, duplicate choices, image behavior, generation behavior, troubleshooting, and operator notes.
- The QA plan creates a concrete fixture with `Kron.md`, `Stellar Academy.md`, `Moon Gate.md`, a resolved PNG image, and an intentionally unresolved image note.
- The QA plan separates automated parser/build/lint checks from manual native-file-picker, folder import, Supabase persistence, duplicate action, prompt digest, and existing workflow regression checks.
- The QA plan explicitly calls out the currently unproven native picker and real Supabase image-upload paths so they are not mistaken for completed QA.

### Verification
- `git diff --check` was run after the docs were added.

### Outstanding issues
- Manual end-to-end QA with a real Obsidian folder remains pending until the QA plan is executed.

### Risks or caveats
- The guide and QA plan document the current implementation shape, including metadata-in-body storage. If the lore schema later gains first-class metadata/assets tables, both docs should be updated.

### Operator follow-up
- Execute `docs/superpowers/plans/2026-06-01-obsidian-lore-import-qa-plan.md` against a disposable series before treating the Obsidian import as fully end-to-end verified.

### Next steps
- None for documentation.

## Twovestellium Obsidian Vault Parser QA - 2026-06-01

### What changed
- Tested the Obsidian lore importer against the user-provided vault at `reference/Twovestellium Universe Obsidian Vault/`.
- Added parser support for capitalized Obsidian frontmatter keys such as `Type`, `Species`, `Faction`, and `Timeline`.
- Added parser support for frontmatter keys with spaces or slashes, such as `Threat Level`, `First Appearance`, and `Symbols/Logos`.
- Added folder-based category inference for notes without explicit type/category metadata, such as `Characters/Kron.md` and `Characters/Finn.md`.
- Added exclusion for notes under `Templates/` and files named like `Character Template.md` during folder imports.
- Added an optional reference-vault Vitest file that runs when the local Twovestellium vault exists and skips cleanly when absent.
- Updated the Obsidian import guide, QA plan, active Writers Workshop tracker, and tasks checklist with these real-vault findings.

### Files touched
- `src/portals/writer/obsidianLoreImport.ts`
- `src/portals/writer/__tests__/obsidianLoreImport.test.ts`
- `src/portals/writer/__tests__/obsidianLoreImport.referenceVault.test.ts`
- `docs/writers-workshop-obsidian-lore-import-guide.md`
- `docs/superpowers/plans/2026-06-01-obsidian-lore-import-qa-plan.md`
- `docs/superpowers/plans/2026-05-31-writers-workshop-narrative-production-system.md`
- `docs/superpowers/plans/2026-06-01-writers-workshop-completion-and-verification.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The local vault currently contains four content notes and three template notes.
- Parser QA confirmed the import set is `Kron`, `Finn`, `Glimm`, and `Institute of Divination & Occultivation`.
- Parser QA confirmed `Character Template`, `Factions Template`, and `Species Template` are excluded.
- `Kron` and `Finn` infer `character` from the `Characters/` folder because their notes do not provide explicit type/category metadata.
- `Glimm` maps capitalized `Type: Species` to category `species`.
- `Institute of Divination & Occultivation` maps `Type: Academic` to category `academic` and preserves `Symbols/Logos`.
- No image QA was possible from this vault yet because it currently contains no image files and no embedded image references.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/obsidianLoreImport.test.ts` first failed on the real-vault cases before the parser fix.
- `npm run test -- --run src/portals/writer/__tests__/obsidianLoreImport.test.ts` passed after the parser fix: 1 file, 9 tests.
- `npm run test -- --run src/portals/writer/__tests__/obsidianLoreImport.test.ts src/portals/writer/__tests__/obsidianLoreImport.referenceVault.test.ts` passed: 2 files, 10 tests.
- `npm run build` passed.
- `npm run lint` passed with 0 errors and 68 existing warnings.

### Outstanding issues
- Native browser file-picker import, Supabase persistence, duplicate action UI, and real image upload QA are still pending from the full QA plan.
- This vault does not yet exercise image resolution or unresolved image warning behavior.

### Risks or caveats
- `Type: Academic` is preserved as category `academic` rather than remapped to `organization`; this keeps the author-provided type value intact.
- The optional reference-vault test depends on an untracked local folder and intentionally skips when that folder is absent.

### Operator follow-up
- Add at least one embedded image reference and image file to the vault before running the image-storage portion of the QA plan.

### Next steps
- Run native file-picker and Supabase persistence QA in a disposable series when ready.

## Cloudflare deploy syntax fix - 2026-06-01

### What changed
- Fixed the TypeScript parser failure reported by the Cloudflare deploy log for `src/portals/storyline/GenericImageLabPanel.tsx`.
- Removed two stray branch-label lines and the duplicated old callback body that had been committed inside `handlePageBackgroundFile`.
- Preserved the newer page-background object URL cleanup path so replacing an uploaded `blob:` background still revokes the previous blob URL before storing the new one.

### Files touched
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `walkthrough.md`

### Implementation notes
- The failing deployed commit was on `origin/main` after fetch; local `main` had initially been stale and still built cleanly.
- The bad region was a malformed conflict-resolution artifact around the page-background upload callback, including plain text labels `codex-writers-output-format-defaults` and `main`.
- The fix is intentionally limited to restoring valid callback syntax and keeping the existing cleanup behavior.

### Verification
- `npm run build` passed.
- `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed: 1 file, 9 tests.
- `npm run lint` passed with existing warnings only: 0 errors, 68 warnings.
- `git diff --check` passed before the walkthrough append.

### Outstanding issues
- None for the deploy-blocking TypeScript syntax error.

### Risks or caveats
- Manual browser QA was not run; this was a parser/build-blocking syntax fix.
- Cloudflare still needs a new deploy from the repaired `main` commit after the fix is pushed.

### Operator follow-up
- Trigger or allow the connected Cloudflare deployment to rebuild after the fix commit is pushed.

### Next steps
- None.

## Twovestellium Obsidian Vault Embedded Image QA - 2026-06-01

### What changed
- Re-checked the user-provided vault after image files and embedded image references were added.
- Confirmed `Kron.md`, `Finn.md`, and `Magister Valencius Santoro.md` contain Obsidian image embeds.
- Fixed image section context parsing so adjacent embeds and tight Obsidian heading lines produce clean section labels.
- Updated the optional Twovestellium reference-vault test to assert the current five-note import set and resolved embedded images.
- Updated the Obsidian import guide, QA plan, completion tracker, and tasks checklist with the real embedded-image vault findings.

### Files touched
- `src/portals/writer/obsidianLoreImport.ts`
- `src/portals/writer/__tests__/obsidianLoreImport.test.ts`
- `src/portals/writer/__tests__/obsidianLoreImport.referenceVault.test.ts`
- `docs/writers-workshop-obsidian-lore-import-guide.md`
- `docs/superpowers/plans/2026-06-01-obsidian-lore-import-qa-plan.md`
- `docs/superpowers/plans/2026-06-01-writers-workshop-completion-and-verification.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The vault image files now include PNGs under `reference/Twovestellium Universe Obsidian Vault/Assets/Images/`.
- `Kron.md` resolves `Kron, Lumilquill, Dorm Room.png`, `Kron's Presentation Outfit.png`, and `Kron IDO Favorite Fit.png` under the clean section label `Story Arc`.
- `Finn.md` resolves `Monocerocephalic Form No More Telepathy.png` and `Monocerokorus Helm Version.png` under the clean section label `Notes`.
- `Magister Valencius Santoro.md` resolves `Valerius Santoro, Magistus Santoro.png` under the clean section label `Appearance`.
- The Santoro note exists at `reference/Twovestellium Universe Obsidian Vault/Characters/Magister Valencius Santoro.md`; the shorter path without `Obsidian Vault` was not present.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/obsidianLoreImport.test.ts src/portals/writer/__tests__/obsidianLoreImport.referenceVault.test.ts` passed: 2 files, 11 tests.
- `npm run build` passed.
- `npm run lint` passed with 0 errors and 68 existing warnings.
- `git diff --check` passed.

### Outstanding issues
- Native browser file-picker import, Supabase persistence, duplicate action UI, and real cloud image upload QA remain pending from the full QA plan.

### Risks or caveats
- The local reference-vault test depends on untracked files in `reference/Twovestellium Universe Obsidian Vault/` and intentionally skips when that folder is absent.

### Operator follow-up
- Run the full manual QA plan against a disposable Writer series to verify preview UI, confirmed import, Supabase image storage, and duplicate actions end to end.

### Next steps
- None for parser-level embedded image handling.

## Backlog Items - 2026-06-01

### What changed
- Added a dedicated backlog section for older, non-Obsidian tasks that remain outside the current Obsidian Lore Import QA track.

### Files touched
- `walkthrough.md`

### Backlog items
- Writers Workshop ribbon/workspace polish: compact the ribbon and workspace command density now that the core Writers Workshop flow is effectively complete; preserve the existing tab order and avoid reopening feature scope.
- Image Vault modal density: widen `ProfileVaultModal` / `CollectionVaultModal` and densify the internal image grid so more images fit without scrolling.
- Imageshop/browser smoke checks: run the remaining targeted browser smoke checks noted in `tasks.md`, including Imageshop lint/browser verification and any older manual no-console-error checks.
- Image-describe API follow-up: implement the future image-describe API for the Refine tab `NEW` workflow.

### Implementation notes
- These items are broader project backlog tasks and are not blockers for the Obsidian Lore Import parser or current embedded-image resolution work.

### Verification
- Documentation-only update; no runtime verification required.

### Outstanding issues
- The backlog items above remain unimplemented.

### Risks or caveats
- The backlog list is scoped to the items surfaced during the Obsidian handoff discussion, not a full audit of every historical `tasks.md` checkbox.

### Operator follow-up
- Prioritize these independently from Obsidian Lore Import end-to-end QA.

### Next steps
- Continue Obsidian Lore Import QA first if the goal is to finish that feature.

## Obsidian Lore Import Partial End-to-End QA - 2026-06-01

### What changed
- Ran the next QA pass for Writers Workshop / Canon Obsidian Lore Import using the existing QA plan.
- Updated the QA plan, active completion tracker, and task checklist with the actual pass/fail/pending state.
- Verified the signed-in Canon and Cockpit surfaces without changing application code.

### Files touched
- `docs/superpowers/plans/2026-06-01-obsidian-lore-import-qa-plan.md`
- `docs/superpowers/plans/2026-06-01-writers-workshop-completion-and-verification.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- No application source code changed in this QA pass.
- Focused parser QA initially failed when the parser test and optional reference-vault test were launched in parallel; the isolated parser rerun passed, so this was treated as a runner/runtime collision rather than an importer failure.
- The in-app browser runtime exposed the hidden Obsidian file inputs but did not expose file-upload automation (`setInputFiles` was unavailable). A standalone Playwright fallback could be installed, but it would need signed-in browser state or auth transfer before it could exercise the same Supabase-backed Writer project.
- Live signed-in QA created two temporary lore cards in the selected series:
  - `Codex Obsidian QA Manual 20260601`
  - `Codex Obsidian QA JSON 20260601`
- Cleanup complete: the user manually deleted those Supabase-backed QA cards after the regression pass.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/obsidianLoreImport.referenceVault.test.ts` passed: 1 file, 1 test.
- `npm run test -- --run src/portals/writer/__tests__/obsidianLoreImport.test.ts` passed on isolated rerun: 1 file, 10 tests.
- `npm run build` passed.
- `npm run lint` passed with 0 errors and 68 existing warnings.
- `git diff --check` passed before documentation edits.
- In-app browser QA at `http://127.0.0.1:5174/` confirmed:
  - page title `ARCS Expanded`;
  - Writers Workshop -> Canon rendered nonblank with no framework overlay;
  - `Import from Obsidian` rendered;
  - `Type filter` included `All types`, `character`, `species`, `faction`, `organization`, `location`, `event`, `discipline`, `artifact`, and `concept`;
  - `Select notes/images` and `Select vault folder` rendered;
  - no captured console errors.
- Signed-in browser regression QA confirmed:
  - manual lore card creation worked;
  - manual lore card edit/save worked;
  - JSON lore import worked;
  - both QA cards persisted after reload;
  - Cockpit left column set to `Lore` displayed the QA lore text;
  - Cockpit Lore digest did not show `ARCS_LORE_IMPORT_METADATA`, `storageUrl`, or raw storage URLs.

### Outstanding issues
- Native file-picker import with Markdown + image files remains unverified.
- Folder import with type filtering remains unverified.
- Obsidian preview duplicate actions (`skip`, `create duplicate`, `overwrite`, `merge`) remain unverified in the live UI.
- Supabase cloud image upload for imported Obsidian images remains unverified.
- Obsidian source badge and stored-image count display remain unverified.
- The two temporary QA lore cards were manually deleted by the user after this QA pass.

### Risks or caveats
- The tested Cockpit digest used manually created/JSON-imported lore cards, not Obsidian-imported cards, because native file selection could not be automated in the in-app browser.
- The selected signed-in series no longer contains the temporary QA lore cards after user cleanup.

### Operator follow-up
- For full native-picker coverage, either perform the OS file selection manually in the in-app browser or provide a way for an automated Playwright session to reuse a signed-in Writer session safely.

### Next steps
- Continue only with the remaining native-picker, duplicate-action, badge/count, and cloud image-upload checks if deeper Obsidian import QA is needed.

## Imageshop Cursory Audit and Backlog Update - 2026-06-01

### What changed
- Added Writers Workshop ribbon/workspace polish to the existing 2026-06-01 backlog section so it remains tracked as future polish rather than active feature work.
- Performed a cursory source and signed-in browser audit of Illustrator's Imageshop with emphasis on UI/UX hierarchy, comic-page beat leverage, prompt integrity, generation reliability, and button/menu fidelity.
- Added a `Cursory Audit Backlog - 2026-06-01` section to the Imageshop production-studio tracker with bugs, risks, and recommended next passes.

### Files touched
- `walkthrough.md`
- `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`

### Implementation notes
- No product code was changed in this pass.
- Source audit covered `StorylineStudio.tsx`, `GenericImageLabPanel.tsx`, `ImageshopImportPanel.tsx`, `imageshopPromptComposer.ts`, `imageshopJsonSchemas.ts`, `geminiImageApi.ts`, and the focused Imageshop component tests.
- The portal currently renders production libraries and the beat timeline before the Image Lab, so the image-generation workflow is not the first-screen focus for an empty project.
- Beats are partially integrated: selected beat refs can be pulled into Imageshop, generated output can become a selected/new B-roll beat, and Story Beat JSON can import production items. The missing workflow is a first-class page/panel queue that converts Writers/Guided page beats into Comic Pages generation items with per-panel prompts, references, status, retry, approval, and return targets.
- Prompt integrity needs hardening because `Negative prompt` is composed as ordinary text inside the same prompt body, and Comic Pages mode can generate from mostly configuration text if no meaningful main prompt exists.
- Generation reliability needs better diagnostics. The Gemini bridge retries 429s, but reference/network failures return immediately, batch failure copy is generic, and raw API errors can surface without user-friendly next steps.
- Button fidelity issues observed in the live portal included duplicated aspect controls, duplicated export/save language, weak distinction between `Process` and `Generate`, low-context reference buttons, and production dashboard controls with long concatenated accessible names.
- The two temporary Writer lore QA cards were manually deleted by the user after the signed-in regression pass.

### Verification
- Started local dev server with `npm run dev -- --host 127.0.0.1 --port 5174`.
- In-app browser loaded `http://127.0.0.1:5174/` as signed-in user `hayronivy@gmail.com` with page title `ARCS Expanded`.
- Opened Illustrator's Imageshop and confirmed no captured console errors on initial load.
- Filled a generic Imageshop prompt and confirmed the `Generate` button enabled.
- Ran one live generation smoke from the portal; generation completed successfully after roughly 35 seconds with no captured console errors and created an Imageshop production item.
- Browser screenshot capture timed out, so live audit evidence was DOM/console/state based.

### Outstanding issues
- The random Imageshop error issue was not reproduced in the single live generation smoke.
- Native image import/file picker and batch JSON generation were not exercised in this audit pass.
- A visual screenshot artifact could not be captured because the in-app browser screenshot command timed out.

### Risks or caveats
- The live generation smoke used a harmless generic prompt; it does not represent success rate under heavy reference payloads, large uploads, batch generation, safety-sensitive prompts, or quota pressure.
- The audit is intentionally cursory and should be followed by targeted implementation passes rather than treated as a complete design spec.

### Operator follow-up
- Decide whether the Imageshop overhaul should stay inside the existing `lab` portal or graduate into a more dedicated image-generation workspace route.

### Next steps
- First overhaul pass: recenter Imageshop's first viewport around prompt, references, generation status, preview, and save/export.
- Second overhaul pass: add a `Comic Pages from Beats` workflow that imports Writers/Guided page beats into panel-level generation items.
- Third overhaul pass: add prompt preflight, error classification, retry/fallback controls, and control/menu consolidation.

## Illustrator's Imageshop Priority Audit Document - 2026-06-01

### What changed
- Created a comprehensive priority audit document for Illustrator's Imageshop as the intended main portal for fast comic-page creation.
- Expanded the earlier short concern list into a full concern inventory covering product focus, comic page creation, Writers Workshop JSON, Obsidian lore/canon context, reference vault ergonomics, prompt integrity, generation reliability, batch workflows, button/menu fidelity, accessibility, dashboard/status design, save/export paths, state recovery, testing, performance, provenance, and visual design.
- Updated the existing Imageshop production-studio tracker to point future agents/operators to the new audit document.

### Files touched
- `docs/superpowers/plans/2026-06-01-illustrators-imageshop-priority-audit.md`
- `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`
- `walkthrough.md`

### Implementation notes
- No application source code changed in this pass.
- The new audit document frames the target product contract as: Imageshop owns comic-page image production; Writers Workshop supplies story/page/panel JSON; Reference Vaults supply visual continuity; Obsidian lore supplies canon context; Guided Comic Flow remains a consumer/return target.
- The document recommends a priority order: define the product contract, recenter the UI around generation, implement Writer JSON to comic-page queue, add reference/lore context, harden prompt/error reliability, then upgrade dashboard/save/export workflows.

### Verification
- Documentation-only update; no runtime test required.
- Verified the new audit document exists and is linked from the Imageshop tracker.
- `git diff --check` passed after documentation edits.

### Outstanding issues
- The audit is a planning/concern inventory, not an implementation pass.
- The temporary Writer lore QA cards were manually deleted by the user after the earlier QA pass.

### Risks or caveats
- The document intentionally lists broad concerns and does not resolve route ownership, full-page versus panel-first generation, lore attachment behavior, or batch failure defaults.

### Operator follow-up
- Use the new audit document as the source for the next Imageshop overhaul plan.
- Decide whether the next implementation pass should start with UI recentering or Writer JSON to page/panel queue.

### Next steps
- Convert the audit into an implementation tracker once the first overhaul slice is selected.

## Obsidian Lore QA Card Cleanup Recorded - 2026-06-01

### What changed
- Recorded that the user manually deleted the two temporary signed-in Writer lore QA cards created during Obsidian Lore Import regression QA.
- Updated the Obsidian Lore Import QA plan and Writers Workshop completion tracker so cleanup is no longer listed as pending.
- Replaced stale walkthrough caveats about pending QA-card deletion with completed-cleanup language.

### Files touched
- `docs/superpowers/plans/2026-06-01-obsidian-lore-import-qa-plan.md`
- `docs/superpowers/plans/2026-06-01-writers-workshop-completion-and-verification.md`
- `walkthrough.md`

### Implementation notes
- No application source code changed in this pass.
- The cleanup was performed manually by the user, not through Codex browser automation.
- The deleted QA cards were `Codex Obsidian QA Manual 20260601` and `Codex Obsidian QA JSON 20260601`.

### Verification
- Documentation-only update; no runtime test required.
- Searched the project trackers and walkthrough for stale pending-cleanup language.

### Outstanding issues
- Native file-picker import with Markdown + image files remains unverified.
- Folder import with type filtering remains unverified.
- Obsidian preview duplicate actions, source badges, stored-image counts, and real cloud image-upload verification remain unverified.

### Risks or caveats
- Codex did not independently verify the Supabase deletion after the user reported it.

### Operator follow-up
- None for QA-card cleanup.

### Next steps
- Continue only with the remaining Obsidian native-picker and cloud image-upload checks if deeper import QA is needed.

## Imageshop Comic Production Portal Plan - 2026-06-01

### What changed
- Created an approval-gated implementation plan for transforming Illustrator's Imageshop into the primary comic-page image production portal.
- Grounded the plan in the Imageshop priority audit and the earlier production-studio tracker.
- Set the two success barometers as: batch generation from Writer `.json` beats plus metadata, including Obsidian-derived canon context; and durable workflows between Writers' Workshop, Character Vault, Asset Vault, NPC/supporting references, and Imageshop for image generation and comic production.
- Organized the expected implementation into 8 passes with task checklists, TDD gates, verification expectations, UX direction, data flow, file responsibility map, risks, and approval questions.

### Files touched
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `walkthrough.md`

### Implementation notes
- No application source code was changed.
- The plan keeps the first overhaul inside the existing `lab` portal unless the user later approves broader routing scope.
- The recommended workflow is panel-first comic production, with full-page generation preserved as an explicit option.
- Obsidian lore is treated as Writer canon metadata and prompt-safe lore chips, not raw note dumping into image prompts.
- The plan preserves the existing no-Supabase-schema-change constraint unless a later approved pass demonstrates a persistence gap.
- The checklist requires `superpowers:test-driven-development` during implementation and keeps implementation blocked until user approval.

### Verification
- Documentation-only update; no runtime test required.
- Verified the new plan file was created.
- Verified this walkthrough section was appended.

### Outstanding issues
- The plan is not implemented.
- The user still needs to approve the plan and answer or accept the recommended approval-question defaults before implementation begins.

### Risks or caveats
- The final implementation scope is broad and should remain pass-based to avoid destabilizing existing Imageshop save/export and Guided return paths.
- Browser QA will need a signed-in session for the full Writer JSON import -> panel generation -> approval -> vault save -> Writer/Guided return path.

### Operator follow-up
- Review `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`.
- Approve the plan as written or revise the recommended approval-question defaults.

### Next steps
- After approval, begin Pass 1 with failing tests for queue hierarchy, provenance snapshots, readiness counters, and backward-compatible production-store persistence.

## Imageshop Comic Production Portal Pass 1 - 2026-06-01

### What changed
- Started implementation of the Imageshop comic production portal plan on branch `codex/imageshop-comic-production-portal`.
- Added the first page/panel queue contract for Writer-sourced comic production work.
- Added canon chips for Obsidian/Writer/manual context, reference chips for vault/Guided/approved-output sources, queue readiness counters, panel lookup helpers, panel status updates, and generation provenance snapshots.
- Extended `useImageshopProductionStore` with active panel queue state, selected panel queue item state, queue readiness state, and actions for setting/selecting/updating queue items while preserving existing Imageshop production items and batch behavior.
- Updated the active plan checklist and `tasks.md` so Pass 1 is recorded as complete and Pass 2 is clearly queued.

### Files touched
- `src/portals/storyline/imageshopPagePanelQueue.ts`
- `src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts`
- `src/stores/imageshopProductionStore.ts`
- `src/stores/__tests__/imageshopProductionStore.test.ts`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- This pass is intentionally foundational and does not yet expose the queue in the Imageshop UI.
- `createImageshopIssueQueue` preserves Writer series, issue, page, panel, beat, dialogue, SFX, art style, lore id, reference id, canon chip, and reference chip metadata.
- `getImageshopQueueReadiness` reports total, ready, missing-prompt, generated, approved, failed, canon chip, and reference chip counts for production health displays in later passes.
- `createImageshopGenerationProvenance` snapshots source queue, Writer issue/page/panel identity, model, aspect ratio, destination, composed prompt, prompt sections, canon chips, and reference chips.
- The store keeps the new queue state alongside the existing `arcs-imageshop-production-v1` persisted state so current art styles, batches, production items, layout templates, save/export flows, and Guided handoff behavior remain untouched.

### Verification
- Red test first: `npm run test -- --run src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts` failed because `@/portals/storyline/imageshopPagePanelQueue` did not exist.
- Focused green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts` passed 2 files / 8 tests.
- Regression green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed 8 files / 61 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 warnings.
- `git diff --check` passed.

### Outstanding issues
- Writer JSON is not yet imported into the new queue; that is Pass 2.
- The Imageshop UI does not yet render the generation-first cockpit, panel queue, context inspector, or output panel; those remain later passes.
- Obsidian canon chips can be represented by the queue contract but are not yet resolved from Writer lore cards in Imageshop.
- Batch generation, prompt preflight, structured generation diagnostics, and Writer/Guided round trip are not yet implemented.

### Risks or caveats
- The new queue state is foundational and currently unexposed, so browser QA is not meaningful for this pass alone.
- Later UI passes must avoid regressing existing save/export and Guided Comic Flow return behavior.

### Operator follow-up
- None for Pass 1.

### Next steps
- Pass 2: import Writer JSON into the page/panel queue with diagnostics, Writer provenance, lore ids, vault reference ids, reusable Imageshop production JSON, and Writer-compatible image maps.

## Imageshop Comic Production Portal Pass 2 - 2026-06-01

### What changed
- Added Writer issue-pack JSON import support for Imageshop's new page/panel queue.
- Added `imageshopWriterImport.ts` to normalize Writers Workshop issue exports into an Imageshop panel queue while preserving Writer series, issue, page, panel, dialogue, SFX, art style, lore ids, vault reference ids, canon chips, and reference chips.
- Extended `normalizeImageshopJson` so Writer issue-pack JSON returns a `writer-issue-json` production batch with an attached `panelQueue` and import diagnostics.
- Preserved existing Story Beat JSON, Comic Page JSON, and ARCS Page JSON normalization by keeping legacy schema priority intact.
- Added Writer-compatible image-map export support so generated/approved Imageshop panel outputs can be mapped back to Writer pages and panels.
- Updated `useImageshopProductionStore.importBatch` so importing a Writer issue batch activates the attached panel queue and queue readiness counts.
- Updated the active plan checklist and `tasks.md` so Pass 2 is recorded as complete.

### Files touched
- `src/portals/storyline/imageshopWriterImport.ts`
- `src/portals/storyline/__tests__/imageshopWriterImport.test.ts`
- `src/portals/storyline/imageshopJsonSchemas.ts`
- `src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts`
- `src/stores/imageshopProductionStore.ts`
- `src/stores/__tests__/imageshopProductionStore.test.ts`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- `normalizeImageshopWriterJson` accepts the existing Writer issue-pack shape used by Writers Workshop exports: `issue_id`, `exported_at`, `series`, `issue`, `production_defaults`, and `pages[]` with `beats_json`.
- The importer recognizes page/panel metadata including `characters`, `locations`, `art_style`, `dialogue_placeholder`, `sfx`, `lore_ids`, `reference_ids`, `canon`, and `references`.
- Canon entries can carry Obsidian provenance through `source_path`, `sourcePath`, or `obsidianPath`, which becomes `canonChips[].provenance.obsidianPath`.
- Reference entries accept snake_case or camelCase source fields and normalize them into queue reference chips.
- Import diagnostics currently cover missing `beats_json` panels, empty panel arrays, and panels with no action/composition/prompt text.
- `buildImageshopWriterImageMapExport` emits a Writer-targeted image map grouped by page with queue item id, Writer page id, Writer panel id, panel number, image URL, status, version id, prompt, model, and seed.
- This pass still does not render the queue in the Imageshop UI; it makes the data path real for the next UI pass.

### Verification
- Red test first: `npm run test -- --run src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts` failed because `@/portals/storyline/imageshopWriterImport` did not exist and `normalizeImageshopJson` rejected Writer issue-pack JSON.
- Focused green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts` passed 2 files / 8 tests after tightening schema priority so legacy Comic Page JSON remains `comic-page-json`.
- Store/schema/import green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/stores/__tests__/imageshopProductionStore.test.ts` passed 3 files / 14 tests.
- Regression green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed 9 files / 66 tests.
- Initial `npm run build` caught one unused import in `imageshopWriterImport.ts`; the import was removed.
- `npm run build` passed after that fix with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 warnings.
- `git diff --check` passed.

### Outstanding issues
- Imageshop still does not expose the Writer panel queue in the first viewport; that is Pass 3.
- Unknown lore ids and unknown vault ids are preserved as ids but not yet resolved against live Writer lore cards or vault albums.
- Obsidian canon chips are imported when present in Writer JSON, but automatic lore-card attachment/conflict detection remains Pass 5.
- Batch generation, prompt preflight, structured generation diagnostics, and unified output destinations remain later passes.

### Risks or caveats
- The importer is intentionally tolerant of snake_case and camelCase Writer metadata, but UI diagnostics should still make malformed inputs understandable in Pass 3.
- Writer-compatible image maps are generated as data objects only; no UI export button or Writer return application exists yet.

### Operator follow-up
- None for Pass 2.

### Next steps
- Pass 3: recenter Imageshop around a generation-first cockpit that can display the active Writer page/panel queue, import diagnostics, prompt/reference/canon readiness, preview, generate/retry actions, and output destinations before the old beat timeline/libraries.

## Imageshop Comic Production Portal Pass 3 Cockpit Surface - 2026-06-01

### What changed
- Added the first generation-first Imageshop cockpit surface for Writer-sourced page/panel production queues.
- Added `ImageshopGenerationCockpit` and rendered it at the top of the Image Lab before the legacy JSON production batch and production dashboard surfaces.
- Wired the cockpit to the active Writer panel queue, queue readiness counts, selected panel state, import diagnostics, prompt/ref/canon readiness, current prompt workspace, reference slots, generation action, and output destination summary.
- Added a focused component test proving the Writer Pages Cockpit appears before the older production surfaces and exposes source panel, canon, reference lanes, output destinations, and generate/load controls.
- Updated the active plan checklist and `tasks.md` to record Pass 3 as partially complete rather than fully done.

### Files touched
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The cockpit is intentionally layered on top of the existing Imageshop UI so the current batch import, dashboard, save/export, and refinement workflows remain available while Pass 3 continues.
- `Load selected panel prompt` fills the main prompt, context, and available reference slots from the selected Writer queue item and selects the matching production item when one exists.
- `Generate selected panel` composes the selected panel prompt from Writer action/composition, dialogue, SFX, art style, characters, locations, canon chips, and reference chips, then updates queue item status through `generating`, `generated`, or `failed`.
- The cockpit currently centralizes the first viewport, but the dedicated `ImageshopPanelQueue`, `ImageshopContextInspector`, and `ImageshopOutputPanel` extractions remain pending.

### Verification
- Red test first: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` failed because the Writer Pages Cockpit did not exist in the first viewport.
- Focused green test: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 1 file / 10 tests.
- Regression green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed 9 files / 67 tests.
- `git diff --check` passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 warnings.
- Signed-in browser smoke: opened `http://127.0.0.1:5174/`, launched Illustrator's Imageshop, imported a Writer issue JSON fixture through `Import pasted JSON`, and confirmed the Writer Pages Cockpit appeared before Generation Mode, JSON Production Batch, and Production Dashboard with the sample panel, canon chip, reference lane, and output destination text.

### Outstanding issues
- Legacy production libraries, beat timeline, JSON import, page configuration, dashboard, and refinement controls still need to move into contextual tabs or inspectors.
- Duplicated aspect/export/save controls still need to be reconciled into one command model per active workflow.
- Scoped accessible names and disabled-state helper copy for repeated controls still need a focused cleanup pass.

### Risks or caveats
- The first cockpit is now live, but Pass 3 should not be considered complete until the legacy surfaces are reorganized and browser-checked.
- The generated panel status updates are local queue state only; later passes still need unified production board/version selection, structured diagnostics, and Writer/Guided return behavior.

### Operator follow-up
- The signed-in local browser now contains the Writer issue JSON smoke-test fixture in Imageshop state. It is safe to replace through the normal Imageshop import workflow during the next QA pass.

### Next steps
- Continue Pass 3 by extracting the dedicated queue, context inspector, and output components, then move legacy production surfaces into tabs/inspectors without removing current capabilities.

## Imageshop Comic Production Portal Pass 3 Subcomponent Extraction - 2026-06-01

### What changed
- Continued Pass 3 by splitting the Writer Pages Cockpit into dedicated production sub-surfaces.
- Added a named `Panel Queue` surface for page/panel selection, active panel status, prompt/action text, composition, dialogue, SFX, characters, locations, and art style.
- Added a named `Context Inspector` surface for canon chips and labeled reference lanes, including human-readable lane labels such as `Character DNA`.
- Added a named `Output Destinations` surface for vault save, Writer image-map, Guided return, generate, load-prompt, and retry affordances.
- Updated the component test so the first Imageshop viewport must expose the extracted cockpit surfaces before the legacy JSON Production Batch and Production Dashboard.
- Updated the active plan checklist and `tasks.md` so the extraction portion of Pass 3 is recorded as complete while legacy surface relocation remains pending.

### Files touched
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
- `src/portals/storyline/components/ImageshopPanelQueue.tsx`
- `src/portals/storyline/components/ImageshopContextInspector.tsx`
- `src/portals/storyline/components/ImageshopOutputPanel.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- This pass is a UI extraction and cockpit-contract pass. It does not change routing, Supabase schema, Writer export shape, or Guided Comic return contracts.
- `ImageshopGenerationCockpit` now owns the high-level first-viewport shell and delegates panel navigation, context review, and output actions to focused child components.
- `ImageshopOutputPanel` exposes a disabled `Retry selected panel` affordance until the selected panel is in `failed` status; recoverable batch retry behavior remains a later Pass 7 responsibility.
- The legacy JSON import, comic page configuration, art style library, continuity lock, production dashboard, and refinement workspace remain available below the cockpit and still need to be moved into contextual tabs/inspectors to finish Pass 3.

### Verification
- Red test first: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` failed because `Panel Queue` was missing from the first-viewport cockpit.
- Focused green test: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 1 file / 10 tests.
- Regression green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed 9 files / 67 tests.
- `git diff --check` passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 warnings.

### Outstanding issues
- Legacy production libraries, beat timeline, JSON import, page configuration, dashboard, and refinement controls still need to move into contextual tabs or inspectors.
- Duplicated aspect/export/save controls still need to be reconciled into one command model per active workflow.
- Scoped accessible names and disabled-state helper copy for repeated controls still need a focused cleanup pass.

### Risks or caveats
- The retry button is an affordance only in this slice; full queue retry, pause/resume, partial success, and structured generation diagnostics remain later planned work.
- Browser QA was not rerun for this extraction slice because the behavior is covered by the same first-viewport component contract and nearby regression suite; run signed-in browser QA again after the legacy surfaces move.

### Operator follow-up
- None for this slice.

### Next steps
- Continue Pass 3 by moving the older production libraries, beat timeline, JSON import, page configuration, dashboard, and refinement workspace into contextual tabs or inspectors while preserving current capabilities.

## Imageshop Comic Production Portal Pass 3 Contextual Surface Tabs - 2026-06-01

### What changed
- Continued Pass 3 by adding contextual production tabs under the Writer Pages Cockpit.
- Added `Production Surface Tabs` with `Compose`, `Page setup`, `Batch JSON`, and `Review` modes.
- Kept `Compose` as the default surface for generation mode, external image import, prompt/reference controls, preview, save/export, and generation actions.
- Moved Image Lab production libraries and page setup controls behind `Page setup`, including Art Style Library, Continuity Lock, Comic Page Configuration, and Aspect ratio.
- Moved JSON import/export and batch generation controls behind `Batch JSON`.
- Moved Production Dashboard and Refinement Workspace behind `Review`.
- Updated production-studio component tests so JSON import and review assertions follow the new tabbed workflow.

### Files touched
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The change preserves the existing `lab` portal route, production store, JSON import/export handlers, generation actions, save/export panel, and Guided Comic return behavior.
- The tab model uses local UI state only; it does not alter persisted Imageshop production data.
- The right-side preview remains visible across tabs so users keep visual orientation while moving between setup, batch import, and review.
- This slice relocates the Image Lab production surfaces. The broader page-level beat timeline remains outside the tab model and still needs a later Pass 3 decision.

### Verification
- Red test first: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` failed because the expected `Compose`, `Page setup`, `Batch JSON`, and `Review` tab buttons did not exist.
- Focused green test: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 1 file / 10 tests.
- Regression green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed 9 files / 67 tests.
- `git diff --check` passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 warnings.

### Outstanding issues
- The broader Storyline/Imageshop beat timeline remains outside the contextual tab model.
- Duplicated aspect/export/save controls still need to be reconciled into one command model per active workflow.
- Scoped accessible names and disabled-state helper copy for repeated controls still need a focused cleanup pass.

### Risks or caveats
- Browser QA was not rerun for this tabbing slice; run signed-in browser QA after duplicate command cleanup or before closing Pass 3.
- Review is now an explicit tab, so users must switch to `Review` after importing JSON to inspect dashboard items.

### Operator follow-up
- None for this slice.

### Next steps
- Continue Pass 3 with command cleanup: reconcile duplicated aspect/export/save controls and tighten accessible names/disabled helper copy for repeated controls.

## Imageshop Comic Production Portal Pass 3 Command Cleanup - 2026-06-01

### What changed
- Continued Pass 3 by tightening repeated Imageshop command labels and disabled-state helper copy.
- Added scoped accessible names for the compose generation action, aspect-ratio controls, and recoverable session-result removal controls.
- Added visible helper copy explaining why empty-prompt generation is disabled.
- Added visible helper copy explaining why `Retry selected panel` is disabled until the selected Writer panel fails.
- Split the production-studio component test so empty-prompt disabled copy and restored session-result controls are tested in their correct UI states.
- Updated the active plan checklist and `tasks.md` so scoped command-label cleanup is complete while broader beat-timeline relocation and full save/export command-model consolidation remain pending.

### Files touched
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/components/ImageshopOutputPanel.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The compose `Generate` button now exposes the command as `Generate current Imageshop prompt` while preserving its existing visible label.
- Aspect-ratio buttons now expose `Set generation aspect ratio to Portrait`, `Set generation aspect ratio to Square`, and `Set generation aspect ratio to Cinematic`.
- Session result delete buttons now expose ordinal names such as `Remove session result 1`.
- The retry helper copy is informational only. Full retry strategy, structured diagnostics, pause/resume, and partial-success handling remain Pass 7 work.
- This slice did not change routing, Supabase schema, Writer export contracts, Guided return contracts, or the existing save/export behavior.

### Verification
- Red test first: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` failed because `Generate current Imageshop prompt` and `Retry unlocks after the selected panel fails.` were missing.
- Focused green test: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 1 file / 12 tests.
- Regression green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed 9 files / 69 tests.
- `git diff --check` passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 warnings.

### Outstanding issues
- The broader Storyline/Imageshop beat timeline remains outside the contextual tab model.
- Full save/export command-model consolidation remains pending for the unified output-destination work in Pass 8.
- Browser QA was not rerun for this command-cleanup slice.

### Risks or caveats
- The visible retry helper may appear in the cockpit even when the user has not attempted generation yet; this keeps the disabled reason explicit but should be reconsidered if the output panel becomes visually noisy.
- The existing `GenericImageLabPanel.tsx` hook-dependency lint warning remains pre-existing and was not changed in this pass.

### Operator follow-up
- None for this slice.

### Next steps
- Continue toward Pass 4 by adding reference lane construction from Character Vault, Asset Vault, NPC/supporting references, Guided handoff refs, and approved Imageshop outputs.

## Imageshop Comic Production Portal Pass 4 Reference Lanes - 2026-06-01

### What changed
- Started Pass 4 by adding a reference-context helper for Imageshop page/panel queues.
- Added `buildImageshopReferenceContext` to merge Writer JSON reference chips, Character Vault production cast, Asset Vault production assets, NPC/supporting references, Guided Comic handoff refs, and approved Imageshop outputs into one `ImageshopReferenceChip` list.
- Added labeled lane groups for `Character DNA`, `Wardrobe`, `Environment`, `Props`, `Style`, `Lighting`, and `Canon`.
- Wired the selected Writer panel in `GenericImageLabPanel` through the reference-context helper before rendering the cockpit inspector.
- Updated the selected-panel prompt loader so enriched vault/guided/approved references can populate Imageshop reference slots.
- Added focused helper and production-studio component tests for reference lane construction and cockpit display.
- Updated the active plan checklist and `tasks.md` so Pass 4 is marked partially complete rather than untouched.

### Files touched
- `src/portals/storyline/imageshopReferenceContext.ts`
- `src/portals/storyline/__tests__/imageshopReferenceContext.test.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The helper is pure and does not persist derived reference chips into the production store. It enriches the active panel for cockpit display and prompt-slot loading.
- Character Vault refs match Writer panels by explicit `referenceIds` or by panel character names against cast display/cast/profile names.
- Asset Vault refs match by explicit `referenceIds` or by panel location names against asset/collection names; location matches are placed in the `Environment` lane, otherwise assets fall into `Props`.
- NPC/supporting refs match by explicit `referenceIds` or label-to-character matching and are placed in `Character DNA`.
- Guided handoff refs use the existing Guided image-workshop preload helper; Guided location refs go to `Environment`, props to `Props`, and character/NPC refs to `Character DNA`.
- Approved or published Imageshop production items with a current image version are exposed as `approved-output` chips in the `Lighting` lane for continuity reuse.
- Missing reference ids are reported by the helper, but the UI does not yet route missing refs to Character Studio, Asset Studio, or quick supporting refs.

### Verification
- Red helper test first: `npm run test -- --run src/portals/storyline/__tests__/imageshopReferenceContext.test.ts` failed because `@/portals/storyline/imageshopReferenceContext` did not exist.
- Focused helper green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopReferenceContext.test.ts` passed 1 file / 1 test.
- Red UI test first: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` failed because imported Writer panels did not show vault lane chips such as `Flux Solara`, `Brass iris door`, and `Alley Witness`.
- Focused UI green test: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 1 file / 13 tests.
- Regression green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopReferenceContext.test.ts src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed 10 files / 71 tests.
- `git diff --check` passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 warnings.

### Outstanding issues
- Missing-reference routing from Writer context to Character Studio, Asset Studio, or quick supporting reference is still pending.
- Explicit replace/add/clear semantics with undo or confirmation for destructive replacement are still pending.
- Explicit continuity-role labels are not yet exposed beyond lane/source/id metadata.
- Browser QA was not rerun for this Pass 4 helper/UI slice.

### Risks or caveats
- Approved Imageshop outputs currently land in the `Lighting` lane as a pragmatic continuity-reuse default. Future Pass 8 output-destination work may want a more explicit continuity role model.
- Derived reference chips are not persisted into the queue; if later passes need durable provenance for derived vault references, store-level enrichment or generation-provenance capture should be added intentionally.

### Operator follow-up
- None for this slice.

### Next steps
- Continue Pass 4 with missing-reference routing and explicit replace/add/clear semantics, then move into Pass 5 Obsidian canon context when the reference workflow is complete enough.

## Imageshop Comic Production Portal Pass 4 Missing Reference Routes - 2026-06-01

### What changed
- Continued Pass 4 by adding missing-reference route suggestions for unresolved Writer reference ids.
- Extended `buildImageshopReferenceContext` with `missingReferenceRoutes`.
- Added route inference for unresolved ids:
  - character-like ids route to `Character Studio`,
  - NPC/supporting ids route to quick supporting reference creation,
  - all other unresolved ids route to `Asset Studio`.
- Surfaced missing-reference route chips inside the cockpit `Context Inspector`.
- Updated the production-studio component test so unresolved Writer refs must be visible in the first-viewport cockpit.
- Updated the active plan checklist and `tasks.md` to record missing-reference routing as partially complete.

### Files touched
- `src/portals/storyline/imageshopReferenceContext.ts`
- `src/portals/storyline/__tests__/imageshopReferenceContext.test.ts`
- `src/portals/storyline/components/ImageshopContextInspector.tsx`
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Missing-reference routing is currently a visible suggestion layer, not an active cross-portal navigation action.
- The route inference is conservative and based on unresolved reference-id text. `char*` or `*character*` goes to Character Studio; `npc*` or `*supporting*` goes to quick supporting reference; everything else defaults to Asset Studio.
- `ImageshopContextInspector` now accepts `missingReferenceRoutes` separately from panel chips so derived route suggestions do not mutate panel queue data.
- This slice does not add undo/replace/clear reference semantics and does not persist missing-route data.

### Verification
- Red helper test first: `npm run test -- --run src/portals/storyline/__tests__/imageshopReferenceContext.test.ts` failed because `missingReferenceRoutes` was undefined.
- Focused helper green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopReferenceContext.test.ts` passed 1 file / 2 tests.
- Red UI test first: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` failed because `Missing references` was not shown in the cockpit inspector.
- Focused UI green test: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 1 file / 13 tests.
- Regression green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopReferenceContext.test.ts src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed 10 files / 72 tests.
- `git diff --check` passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 warnings.

### Outstanding issues
- Missing-reference route chips do not yet navigate to Character Studio, Asset Studio, or a quick supporting-reference creation flow.
- Explicit replace/add/clear semantics with undo or confirmation remain pending.
- Continuity-role labeling beyond lane/source/id metadata remains pending.
- Browser QA was not rerun for this route-suggestion slice.

### Risks or caveats
- The destination inference is id-text based. It is useful for Writer JSON ids such as `char-*`, `asset-*`, and `npc-*`, but future Writer exports should carry explicit reference intent for higher confidence.

### Operator follow-up
- None for this slice.

### Next steps
- Continue Pass 4 with active route actions and explicit replace/add/clear semantics, or move to Pass 5 canon context if the next priority is Obsidian provenance over route interactivity.

## Imageshop Comic Production Portal Pass 4 Reference Mutation Semantics - 2026-06-02

### What changed
- Continued Pass 4 by adding undo-safe reference mutation semantics for active Imageshop page/panel queues.
- Added queue-level helpers for deduped add, confirmed replace, confirmed clear, and restore-from-undo reference edits.
- Added production-store actions that expose those reference edits from `useImageshopProductionStore`.
- Recalculate panel queue readiness after successful reference edits.
- Added focused queue and store tests for add, duplicate add, blocked unconfirmed replace, confirmed replace, restore, blocked unconfirmed clear, confirmed clear, and restore after clear.
- Updated the active plan checklist and `tasks.md` to record replace/add/clear semantics as partially complete while cockpit controls remain pending.

### Files touched
- `src/portals/storyline/imageshopPagePanelQueue.ts`
- `src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts`
- `src/stores/imageshopProductionStore.ts`
- `src/stores/__tests__/imageshopProductionStore.test.ts`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- `addImageshopPanelReferenceChip` is non-destructive and dedupes by chip id/source/reference/image/lane identity.
- `replaceImageshopPanelReferenceChips` and `clearImageshopPanelReferenceChips` require `{ confirmed: true }`; otherwise they return `blockedReason: 'confirmation-required'` and leave the queue unchanged.
- Successful mutations return an `ImageshopPanelReferenceUndo` snapshot with the previous `referenceIds` and `referenceChips`.
- `restoreImageshopPanelReferenceChips` restores the snapshot and returns a reciprocal undo snapshot for the state it replaced.
- Store actions intentionally throw if called without an active panel queue. The cockpit should only expose these actions when a queue exists.
- This slice adds the real state contract but does not yet render cockpit buttons/menus for reference add/replace/clear.

### Verification
- Red queue test first: `npm run test -- --run src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts` failed because `addImageshopPanelReferenceChip` did not exist.
- Focused queue green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts` passed 1 file / 4 tests.
- Red store test first: `npm run test -- --run src/stores/__tests__/imageshopProductionStore.test.ts` failed because `addPanelQueueReferenceChip` did not exist on the store.
- Focused store green test: `npm run test -- --run src/stores/__tests__/imageshopProductionStore.test.ts` passed 1 file / 7 tests.
- Regression green test: `npm run test -- --run src/portals/storyline/__tests__/imageshopReferenceContext.test.ts src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopPagePanelQueue.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` passed 10 files / 74 tests.
- `git diff --check` passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 warnings.

### Outstanding issues
- Cockpit UI controls for add, replace, clear, and undo are not yet rendered.
- Active cross-portal missing-reference route actions remain pending.
- Explicit continuity-role labels remain pending.
- Browser QA was not rerun for this data-store slice.

### Risks or caveats
- The store actions currently throw when called without an active panel queue. Future UI controls should be gated by queue presence and active panel selection.
- Replacing or clearing references updates `referenceIds` from the new chip list; if future Writer exports need to preserve unresolved original ids separately, add a separate unresolved-reference field rather than overloading `referenceIds`.

### Operator follow-up
- None for this slice.

### Next steps
- Add cockpit controls for reference add/replace/clear/undo, or move into Pass 5 Obsidian canon context if canon provenance is the next priority.

## Imageshop Comic Production Portal Pass 5 Obsidian Canon Context - 2026-06-05

### What changed
- Added a canon-context helper that resolves relevant Writer lore cards for the selected Imageshop panel through explicit lore ids, existing canon ids, and panel text matches across characters, locations, action, composition, dialogue, SFX, and art style.
- Converted Obsidian-backed Writer lore into prompt-safe canon chips with source paths and import provenance while stripping stored import metadata, markdown, and private note content from generation prompts.
- Added visible Obsidian/Writer/manual source labels, summaries, source paths, and shared-id label warnings to the first-viewport Context Inspector.
- Expanded selected-panel prompt loading so characters, locations, art style, canon summaries, and reference targets are composed into the generation workspace.
- Captured the exact canon/reference context used for selected-panel generation in session results and production versions.
- Included generation provenance in Character/Asset Vault save processing metadata and made generated provenance take precedence in Writer image-map `canon_used` and `references_used` exports.
- Mapped Writer Workshop image-workshop draft items into Imageshop lore candidates without adding a new route or persistence schema.
- Updated the active plan and `tasks.md` to mark Pass 5 partially complete.

### Files touched
- `src/portals/storyline/imageshopCanonContext.ts`
- `src/portals/storyline/__tests__/imageshopCanonContext.test.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/StorylineStudio.tsx`
- `src/portals/storyline/components/ImageshopContextInspector.tsx`
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
- `src/portals/storyline/imageshopWriterImport.ts`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `src/portals/storyline/__tests__/imageshopWriterImport.test.ts`
- `src/stores/imageshopProductionStore.ts`
- `src/stores/imageshopSessionStore.ts`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Obsidian metadata summaries are preferred when present. Otherwise the helper derives a sanitized summary from the first quoted line or cleaned Writer lore body and caps it at 360 characters.
- Lore cards with `includeInPrompt: false` are excluded from automatic prompt context.
- Canon chips preserve `obsidianPath`, `writerLoreCardId`, and import/update time where available.
- The initial warning model is intentionally narrow: a canon chip and a reference sharing the same id/reference id warn when their labels disagree.
- Auto-attached canon enriches the active panel used for prompting and provenance but is not yet persisted back into the base queue.
- Writer image-map exports prefer output generation provenance over import-time queue chips so exported metadata reflects what the model actually received.

### Verification
- Red helper test first: the focused canon-context test failed because `imageshopCanonContext` did not exist.
- Focused helper green: `npm run test -- --run src/portals/storyline/__tests__/imageshopCanonContext.test.ts` passed 1 file / 3 tests.
- Red cockpit test first: the production-studio test failed because imported Writer panels did not show the expected Obsidian canon context.
- Focused cockpit green: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 1 file / 14 tests.
- Red provenance checks first: Character Vault processing metadata and Writer image-map exports initially omitted generated canon provenance.
- Focused provenance green: `npm run test -- --run src/portals/storyline/__tests__/imageshopWriterImport.test.ts src/portals/storyline/__tests__/imageshopCanonContext.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 3 files / 20 tests.
- Regression suite: 14 focused Imageshop, store, bridge, Writer, Guided Comic, and Obsidian import test files passed 92 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 existing warnings.
- `git diff --check` passed.
- Signed-in browser smoke at `http://127.0.0.1:5174/` confirmed the first viewport showed `Flux`, `Obsidian`, `Characters/Flux.md`, and the prompt-safe summary; loading the selected panel populated canon context and continuity without raw metadata/private note content. Browser console errors: none.
- Browser screenshot capture timed out twice, so this pass has DOM-backed browser verification but no screenshot artifact.

### Outstanding issues
- Manual lore attach/detach controls are not yet available when Writer JSON lacks a usable id or text match.
- Conflict detection does not yet cover duplicate lore cards, conflicting Writer labels without shared ids, or semantic disagreements across multiple canon sources.
- Auto-attached canon is not persisted into the base queue or reusable Imageshop production JSON.
- Dedicated page-level, faction, and prop-category attachment tests remain.

### Risks or caveats
- Title matching is deliberately conservative but can still attach a lore card when its normalized title appears in broader panel text.
- Vault save provenance is carried in processing metadata; consumers that ignore that metadata will not display canon history yet.

### Operator follow-up
- None for this slice.

### Next steps
- Finish the remaining Pass 5 manual attach/detach and durable queue/export persistence, or proceed into Pass 6 prompt preflight while retaining the listed Pass 5 follow-ups.

## Imageshop Comic Production Portal Pass 6 Prompt Preflight - 2026-06-05

### What changed
- Added a pure Imageshop prompt-preflight evaluator for weak visual direction, configuration-dominant requests, oversized or high-risk reference payloads, failed reference URLs, unresolved reference routes, and canon conflicts.
- Applied preflight blocking to both selected Writer panel generation and standalone Imageshop prompt generation.
- Added a first-viewport preflight panel with ready/warning/blocked status, reference count, approximate known data size, ready/unchecked/failed URL counts, timeout risk, and actionable diagnostics.
- Added source-attributed prompt sections for Writer JSON, Vault, Lore, Manual, AI Helper, and Page Config.
- Renamed user-facing `Negative Prompt` and composed prompt output to `Avoid List` while retaining the existing internal workspace key for compatibility.
- Changed the AI prompt helper to validate/refine the composed production request, including page configuration and continuity sections, instead of only the raw main prompt.
- Updated the active plan and `tasks.md` to mark Pass 6 complete.

### Files touched
- `src/portals/storyline/imageshopPromptPreflight.ts`
- `src/portals/storyline/__tests__/imageshopPromptPreflight.test.ts`
- `src/portals/storyline/components/ImageshopPromptPreflightPanel.tsx`
- `src/portals/storyline/components/ImageshopOutputPanel.tsx`
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
- `src/portals/storyline/imageshopPromptComposer.ts`
- `src/portals/storyline/__tests__/imageshopPromptComposer.test.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Prompts with fewer than four semantic words are blocked as weak. Prompts with fewer than eight semantic words whose composed request is more than three times configuration text are blocked as configuration-dominant.
- Reference payloads block above ten references or eight MB of known inline data. More than eight references or five MB of known inline data produces timeout risk.
- Remote reference size remains unknown until fetched; the panel distinguishes ready, unchecked, and failed URL states instead of inventing byte counts.
- Canon conflicts and unresolved Writer reference routes are generation blockers for the selected panel.
- The selected-panel preflight uses the enriched canon/reference panel, so the displayed sections match generation provenance.
- Standalone prompt preflight displays only when a prompt exists and disables the existing generate command when blocked.

### Verification
- Red helper test first: `npm run test -- --run src/portals/storyline/__tests__/imageshopPromptPreflight.test.ts` failed because the preflight module did not exist.
- Focused helper green: the preflight suite passed 1 file / 5 tests.
- Red UI/composer tests first: the production-studio tests failed because no preflight surface or generation guard existed, and the composer still emitted `Negative prompt`.
- Focused green: `npm run test -- --run src/portals/storyline/__tests__/imageshopPromptPreflight.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 3 files / 23 tests.
- Regression suite: 15 focused Imageshop, store, bridge, Writer, Guided Comic, and Obsidian import test files passed 98 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and 68 existing warnings.
- `git diff --check` passed.
- Signed-in browser smoke at `http://127.0.0.1:5174/` confirmed `Prompt preflight`, `Ready to generate`, one-reference payload health, Writer JSON/Lore/Vault/Page Config badges, the renamed `Avoid List`, an enabled selected-panel generation command, and no browser console errors.

### Outstanding issues
- Pass 7 structured generation diagnostics and batch recovery actions remain.
- Pass 5 manual lore attach/detach and base-queue canon persistence remain tracked.

### Risks or caveats
- Remote reference byte size cannot be known before fetch, so timeout warnings use count plus known inline-data size.
- The threshold values are intentionally conservative and may need calibration against production provider limits.

### Operator follow-up
- None for this slice.

### Next steps
- Implement Pass 7 structured error classification, attempt metadata, and recoverable selected/page/all batch generation while preserving partial successes.

## Imageshop Comic Production Portal Pass 7 Batch Reliability - 2026-06-05

### What changed
- Added structured Gemini image diagnostics for missing key, safety, quota/rate limit, timeout, reference fetch, reference size, no image, unsupported payload, network, and unknown failures.
- Preserved the existing `error` and safety-block result shapes while attaching typed diagnostic class, retryability, and suggested recovery action.
- Added a pure sequential batch runner that preserves previous attempts, pauses after failure, resumes from the next panel, and supports normal, failed-reference removal, smaller-reference, and fallback-model strategies.
- Added cockpit actions for generate selected, generate page, generate all draft panels, pause, resume, skip selected, retry failed, retry without failed refs, retry smaller refs, and retry fallback model.
- Added visible batch status, total/generated/failed counts, elapsed time, last failure class/message, and disabled states for unavailable recovery actions.
- Stored attempt metadata on session results and production versions: model, prompt hash, reference count, elapsed time, seed, error class/message, retry count, and strategy.
- Preserved partial successes by recording each generated panel immediately before a later panel can fail.
- Added mocked component coverage for one successful panel, one timeout, paused state, and successful smaller-reference retry.
- Updated the active plan and `tasks.md` to mark Pass 7 complete.

### Files touched
- `src/shared/api/geminiImageApi.ts`
- `src/shared/api/__tests__/geminiImageDiagnostics.test.ts`
- `src/portals/storyline/imageshopBatchGeneration.ts`
- `src/portals/storyline/__tests__/imageshopBatchGeneration.test.ts`
- `src/portals/storyline/components/ImageshopBatchControls.tsx`
- `src/portals/storyline/components/ImageshopOutputPanel.tsx`
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `src/stores/imageshopSessionStore.ts`
- `src/stores/imageshopProductionStore.ts`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Batch execution is sequential so provider limits and partial results remain understandable.
- Failure pauses occur after the failed attempt is recorded; resume continues with the next unattempted panel. Failed panels are handled through the explicit retry actions.
- `Retry without failed refs` excludes chips with failed signed-URL status. `Retry smaller refs` limits the request to six reference images. `Retry fallback model` switches the attempt to the Flash model.
- Provider error display remains compatible because callers can still read `error`; batch callers use the attached structured diagnostic.
- Generated panels receive enriched canon/reference provenance. Retry strategies record the actual reference subset used in provenance and the attempt reference count.
- Pause requests take effect after an in-flight panel finishes; the current provider request is not force-aborted.

### Verification
- Red diagnostic test first: the classifier tests failed because `classifyGeminiImageFailure` did not exist.
- Diagnostic green: `npm run test -- --run src/shared/api/__tests__/geminiImageDiagnostics.test.ts` passed 1 file / 11 tests.
- Red batch-runner test first: the suite failed because `imageshopBatchGeneration` did not exist.
- Batch-runner green: diagnostics plus batch runner passed 2 files / 14 tests.
- Mocked component recovery test passed: first panel generated, second timed out, batch paused, session attempt metadata persisted, and `Retry smaller refs` completed the failed panel.
- Regression suite: 17 focused Imageshop, provider, store, bridge, Writer, Guided Comic, and Obsidian import test files passed 113 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the repository baseline warnings.
- `git diff --check` passed.
- Signed-in browser smoke at `http://127.0.0.1:5174/` confirmed the batch status counters and all page/all/pause/resume/skip/retry controls render with correct initial disabled states; browser console errors: none.

### Outstanding issues
- Pass 8 production board, version comparison/current selection, approval/publish controls, unified destinations, and Writer/Guided round trip remain.
- Pause does not abort an already-running provider request.
- Pass 5 manual lore attachment and durable base-queue canon persistence remain tracked.

### Risks or caveats
- Batch attempt state is local to the current Imageshop component session, while successful image/version records and panel statuses persist through their existing stores.
- Retry counts reflect attempt history retained in the current batch session.

### Operator follow-up
- None for this slice.

### Next steps
- Implement Pass 8 page/panel production board, version-current/revert/approve/publish behavior, unified output destinations, continuity reuse, and Writer/Guided return.

## Imageshop Comic Production Portal Pass 8 And Completion - 2026-06-05

### What changed
- Added a grouped Writer page/panel production board with explicit current-version selection, compare metadata, revert, approve, and publish actions.
- Added a persisted `currentVersionId` contract and changed approved continuity references and Writer image maps to use the operator-selected version rather than implicitly using the newest version.
- Added unified output destinations for Character Vault, Asset Vault, NPC Vault, selected-beat assignment, new-beat creation, production JSON, Writer image-map export/return, and Guided Comic return.
- Added a Writer round trip that merges image URLs, status, version, prompt, model, seed, canon, references, and return time into each matching page panel's existing `beats_json`.
- Added Guided Comic return provenance and retained it in the panel art image state.
- Added cockpit canon attach/detach and reference add/replace/remove/clear/undo controls.
- Added meaningful reference resolution modes (`auto`, `manual`, `none`), cross-portal missing-reference routes, source/status labels, duplicate cross-source canon warnings, and reusable production JSON queue persistence.
- Updated the implementation plan and `tasks.md` to mark all eight passes complete and ready for user review.

### Files touched
- `src/stores/imageshopProductionStore.ts`
- `src/stores/imageWorkshopBridge.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/imageshopProductionBoard.ts`
- `src/portals/storyline/imageshopPagePanelQueue.ts`
- `src/portals/storyline/imageshopReferenceContext.ts`
- `src/portals/storyline/imageshopCanonContext.ts`
- `src/portals/storyline/imageshopJsonSchemas.ts`
- `src/portals/storyline/components/ImageshopProductionBoard.tsx`
- `src/portals/storyline/components/ImageshopOutputDestinations.tsx`
- `src/portals/storyline/components/ImageshopOutputPanel.tsx`
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
- `src/portals/storyline/components/ImageshopContextInspector.tsx`
- `src/portals/writer/writerImageshopReturn.ts`
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/stores/__tests__/imageshopProductionStore.test.ts`
- `src/stores/__tests__/imageWorkshopBridge.test.ts`
- `src/portals/storyline/__tests__/imageshopProductionBoard.test.ts`
- `src/portals/storyline/__tests__/ImageshopProductionBoard.test.tsx`
- `src/portals/storyline/__tests__/ImageshopContextInspector.test.tsx`
- `src/portals/storyline/__tests__/imageshopCanonContext.test.ts`
- `src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `src/portals/writer/__tests__/writerImageshopReturn.test.ts`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Approve and publish synchronize the matching Writer panel queue to approved while preserving Imageshop's richer production status.
- Existing persisted production items without `currentVersionId` remain compatible because current-version lookup falls back to the newest version.
- Reference replacement switches a panel to manual resolution; clearing switches it to none; undo restores the prior mode and chips.
- Manual canon edits switch a panel to manual canon mode so a detached auto-match is not immediately reattached.
- Auto-attached canon synchronizes into the persisted queue and is included when reusable production JSON is exported and reimported.
- Writer returns use existing `writer_pages.beats_json`; no Supabase schema or route expansion was required.

### Verification
- TDD red/green coverage added for current version selection/revert, approval/publish queue synchronization, grouped board data and controls, Writer image-map merging, bridge returns, canon persistence, reusable queue JSON, duplicate canon warnings, reference/canon cockpit controls, and accessible output destinations.
- `npm run test -- --run` passed 62 test files / 363 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and repository baseline warnings.
- `git diff --check` passed.
- Signed-in browser QA at `http://127.0.0.1:5174/` confirmed the Writer Pages Cockpit, Obsidian canon/path display, reference mutation controls, prompt preflight, batch controls, unified destinations, and grouped review board. Browser console errors: none.
- A native confirmation dialog temporarily blocked the browser bridge during destructive-control smoke testing; the tab was closed and recovered cleanly. Store/component tests cover confirmed clear and undo behavior.
- Paid Gemini generation and destructive live Vault/Writer writes were not triggered during browser QA; mocked component and bridge tests cover those paths.

### Outstanding issues
- None for the approved eight-pass implementation scope.

### Risks or caveats
- Pause waits for an in-flight provider request to finish rather than aborting it.
- The existing `ComicPortal` production bundle remains above Vite's 500 kB warning threshold.
- Lint still reports pre-existing repository warnings outside this scope.

### Operator follow-up
- Review and approve the completed plan and implementation.

### Next steps
- After approval, commit or publish the branch through the repository's normal review workflow.

## Illustrator's Imageshop React Integrity Audit - 2026-06-05

### What changed
- Audited the current Imageshop working tree using the Vercel React best-practices categories for async waterfalls, bundle size, client persistence, rerender scope, rendering cost, and JavaScript performance.
- Added a durable audit report with prioritized integrity, performance, workflow, and missing-test findings.
- Confirmed the active implementation plan's completion claim is premature because critical storage and prompt-contract risks remain, reference lanes do not map reliably to provider slots, failed-reference retry lacks failure attribution, and the live first viewport remains beat-first.
- No runtime implementation code was changed in this audit pass.

### Files touched
- `docs/superpowers/plans/2026-06-05-imageshop-react-integrity-audit.md`
- `walkthrough.md`

### Implementation notes
- The highest-risk path duplicates full generated `data:` image URLs into both session and production web storage, while prompt edits synchronously persist the production store on every keystroke.
- Panel and batch preflight compose a richer prompt than the provider call sends, so visible instructions and provenance can diverge from the actual request.
- Reference lane labels are not compiled into Gemini's index-based slot roles; mixed reference types can reach the provider with incorrect semantics.
- Reference encoding is sequential, creating an avoidable async waterfall before generation.
- Existing retry and counter tests preserve historical failed attempts, which leaves successful retries reporting stale failures.

### Verification
- Focused Imageshop suite: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/portals/storyline/__tests__/imageshopBatchGeneration.test.ts src/portals/storyline/__tests__/imageshopPromptPreflight.test.ts src/portals/storyline/__tests__/imageshopReferenceContext.test.ts src/portals/storyline/__tests__/imageshopCanonContext.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/stores/__tests__/imageshopSessionStore.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts` passed 8 files / 60 tests.
- Full suite: `npm run test` passed 62 files / 363 tests.
- `npm run build` passed. `PhotoLab` built at 194.54 kB minified / 48.31 kB gzip; the existing `ComicPortal` chunk warning remains.
- `npm run lint` passed with 0 errors and 67 repository warnings.
- `git diff --check` passed.
- Signed-in browser inspection at `http://127.0.0.1:5173/` confirmed the live portal still places production libraries, Beat Timeline, Selected Frame Preview, and Beat Detail before Image Lab. Browser console warnings/errors: none.
- No paid Gemini generation or destructive Vault/Writer write was performed.

### Outstanding issues
- Critical: quota-safe image persistence and recovery.
- High: one prompt contract for preflight, provider execution, and provenance.
- High: lane-to-provider-slot compilation and parallel reference preparation.
- High: per-reference failure attribution for meaningful retry behavior.
- Medium: final-state batch counters, narrower render subscriptions, generation-first layout, and object URL cleanup.

### Risks or caveats
- Automated tests currently pass while asserting at least one inconsistent retry summary, so green coverage does not establish workflow integrity for the audited risks.
- Remote reference performance was assessed from the serial implementation path; paid provider calls were intentionally not used for timing.

### Operator follow-up
- Keep the branch in review until the critical and high findings are repaired and covered by regression tests.

### Next steps
- Start with storage/persistence hardening, then unify prompt execution and reference-slot compilation before additional UI expansion.

## Handoff Skill Creation - 2026-06-05

### What changed
- Created the global personal `$handoff` skill for context handoffs, session transfers, continuation briefs, checkpoint summaries, and next-thread packages.
- Required every generated handoff to use one fenced `md` text block with these ordered sections: Current State, Changed Files, Commands Run, Open Risks, Next Step, and Other Pertinent Information.
- Added accuracy rules requiring refreshed repository evidence, explicit failed or incomplete checks, checkpoint-scoped file changes, and one exact next action.
- Added a walkthrough rule requiring meaningful repository handoffs to reference the skill or resulting handoff artifact.

### Files touched
- `/Users/apoaaron/.codex/skills/handoff/SKILL.md`
- `/Users/apoaaron/.codex/skills/handoff/agents/openai.yaml`
- `walkthrough.md`

### Implementation notes
- The skill is installed in the personal Codex skills directory rather than this repository, so its implementation is available across projects but is not tracked by this repository's Git history.
- The output contract is intentionally fixed and continuation-oriented rather than a general conversational summary.
- A handoff must identify the last checkpoint when known; when it is unknown, the skill requires that uncertainty to be stated.

### Verification
- `init_skill.py handoff --path /Users/apoaaron/.codex/skills ...` completed successfully and created the skill scaffold.
- A Ruby frontmatter check passed for the skill name, description, allowed keys, and naming format.
- A contract check passed for the exact presence and order of all six required handoff sections inside a fenced `md` block.
- A metadata check passed for `agents/openai.yaml`, including the `$handoff` invocation and short-description length.
- The official `quick_validate.py` command could not run because its Python environment lacks the `yaml` module (`ModuleNotFoundError: No module named 'yaml'`); this is a validator dependency failure, not a detected skill-format failure.

### Outstanding issues
- The official validator has not completed until PyYAML is available in its execution environment.

### Risks or caveats
- An already-open Codex session may need to be restarted or replaced with a fresh thread before the newly installed personal skill appears in its discovered skill list.
- Because the skill lives outside the repository, cloning this repository alone will not reproduce the personal skill installation.

### Operator follow-up
- In a fresh Codex thread, invoke `$handoff` and confirm the generated artifact uses the six required sections in one fenced `md` text block.

### Next steps
- Use `$handoff` for the next context transfer and carry the Imageshop integrity audit into the new thread's Current State, Open Risks, and Other Pertinent Information sections.

## Illustrator's Imageshop Playwright End-to-End QA - 2026-06-05

### What changed
- Ran signed-in functional and visual QA through the requested persistent Playwright Interactive workflow.
- Exercised prompt preflight, generation modes, production tabs, malformed and valid Writer JSON import, canon/reference context, one live Gemini generation, reload recovery, production review, three Vault save paths, and Guided Comic return.
- Added a durable QA report with severity-ranked findings, exact storage/layout measurements, screenshot evidence, successful controls, limitations, and cleanup evidence.
- Added the live evidence to the React integrity audit and reopened the repair work in `tasks.md`.
- No runtime source code was changed.

### Files touched
- `docs/superpowers/plans/2026-06-05-imageshop-playwright-qa-report.md`
- `docs/superpowers/plans/2026-06-05-imageshop-react-integrity-audit.md`
- `docs/superpowers/plans/assets/2026-06-05-imageshop-playwright-qa/`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- One generated JPEG was stored as a complete data URL in both production localStorage and sessionStorage, consuming about 2.7 MB across the two keys.
- A 22-character typing probe produced 22 full writes of the approximately 1.36 MB production payload.
- An unreachable reference passed preflight as healthy, failed with `net::ERR_UNSAFE_PORT`, and did not stop the paid Gemini request.
- The Writer cockpit marked Page 1 Panel 2 generated, but the grouped board left the panel Draft with zero versions and stored the output under a separate generic item.
- The cockpit clipped horizontally at both tested desktop sizes, and the first viewport remained dominated by empty beat surfaces.
- Guided return preserved the panel image but returned to Comic Library instead of restoring panel focus.

### Verification
- Signed-in browser QA ran at `1600x900` and `1280x720`.
- The one permitted live Gemini generation completed and displayed a panel image.
- Character, Asset, and NPC Vault saves all reported success.
- Reload restored the imported queue and session output before cleanup.
- Prompt blocking, detailed-prompt readiness, malformed JSON feedback, tab/mode cycles, and reference remove/undo were verified.
- No uncaught browser page errors were captured.

### Outstanding issues
- Critical storage duplication and per-keystroke serialization remain unresolved.
- Failed/unchecked references can still reach paid generation without actionable attribution.
- Selected-panel output is not consistently linked to its grouped production-board panel.
- First-viewport hierarchy, cockpit overflow, and Guided return navigation require repair.

### Risks or caveats
- Only one paid Gemini generation was used.
- A failed retry could not be exercised because the invalid reference did not stop generation.
- Full multi-panel batch generation was intentionally not run.

### Operator follow-up
- Keep the branch in review and start with quota-safe persistence, then reference failure gating and page/panel version linkage.

### Next steps
- Implement the first integrity repair pass with regression tests for storage quota failure and large-history prompt typing.

## Imageshop Integrity Repair Approval Plan - 2026-06-06

### What changed
- Reviewed the June 5 React integrity audit, signed-in Playwright QA report, all seven screenshot artifacts, the active Imageshop feature plan, current repair tracker, relevant runtime contracts, and the current Git checkpoint.
- Used the `$handoff` skill as a checkpoint/evidence discipline so the plan distinguishes current verified state from proposed work and identifies one exact implementation entry point.
- Added an approval-gated seven-pass repair plan covering every finding from both audits.
- Reopened the prior feature plan's approval status and linked the new repair tracker from `tasks.md`.
- No runtime React, store, API, bridge, or persistence code was changed.

### Files touched
- `docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The proposed storage contract keeps reload recovery by storing generated image bytes once in IndexedDB while synchronous Zustand persistence retains metadata and shared asset ids only.
- The proposed generation contract compiles one exact request for preflight, provider execution, prompt hashes, provenance, queue identity, and retries.
- Reference lanes become explicit provider instructions, reference preparation becomes parallel and reference-id aware, and strict preflight blocks provider calls when included references are unchecked or failed.
- Queue/version integrity, Guided return focus, first-viewport hierarchy, responsive overflow, render scope, and object URL cleanup are separated into later passes after the data contracts are repaired.
- The plan preserves the existing `lab` route, avoids Supabase schema and `ComicEditor` changes, and keeps legacy image API callers compatible.

### Verification
- Inspected current branch/status and latest commit.
- Read both audit reports, the active feature plan, `tasks.md`, `walkthrough.md`, `.agents/workflows/chat-handoff.md`, and the relevant store/API/UI/bridge/test files.
- Visually reviewed the Playwright screenshots at `1600x900` and `1280x720`.
- Documentation link/status verification is required before final response.
- No runtime tests, build, lint, paid Gemini generation, deployment, or destructive Vault/Writer action was run because this was a planning-only pass.

### Outstanding issues
- All runtime findings remain unresolved until the user approves and implementation begins.
- The approval gate includes IndexedDB storage, strict failed/unchecked reference blocking, explicit lane-based provider instructions, and moving Image Lab ahead of beat/library surfaces.

### Risks or caveats
- IndexedDB hydration and blob URL ownership require focused lifecycle tests.
- The shared Gemini API must retain the existing positional reference path for non-Imageshop callers.
- Guided return must cover both unsaved recovery drafts and saved Comic Library projects.

### Operator follow-up
- Review and approve or revise `docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`.

### Next steps
- After approval, begin Pass 1 by writing failing store/component tests proving generated image payloads are absent from synchronous web storage and remain visible after quota failure.

## Imageshop Integrity Repair Pass 1 - 2026-06-06

### What changed
- Added quota-safe generated-image persistence backed by IndexedDB so one generated image is stored once and referenced by the same asset id from session and production records.
- Changed Imageshop Zustand persistence to retain image metadata instead of complete `data:` or `blob:` payloads, including nested batch-attempt image fields.
- Added version 2 migrations that strip legacy persisted image payloads while preserving prompts, queue identity, provenance, attempts, versions, and selection state.
- Added asynchronous image hydration, shared hydrated URL caching, and release of hydrated object URLs when assets are removed or the Imageshop panel unmounts.
- Kept successful provider results visible when IndexedDB storage fails, marked them memory-only, and added an accessible reload-safety warning.
- Moved prompt keystrokes into a local draft hook so production history is committed only at stable load, stage, and generation actions.
- Made async batch attempt callbacks await image persistence before recording the corresponding session and production metadata.
- Changed the session result summary to report only reload-safe results.

### Files touched
- `src/shared/utils/imageshopImageRepository.ts`
- `src/portals/storyline/hooks/useImageshopPromptDraft.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/imageshopBatchGeneration.ts`
- `src/stores/imageshopSessionStore.ts`
- `src/stores/imageshopProductionStore.ts`
- `src/stores/__tests__/imageshopSessionStore.test.ts`
- `src/stores/__tests__/imageshopProductionStore.test.ts`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Runtime records still expose the current image URL for preview, save, download, Writer map, and Guided workflows. Persisted web-storage records retain only the small asset descriptor and recovery status.
- Session and production records share the same asset id for each generated result, avoiding the audited duplicate binary payload.
- Hydration uses one cached object URL per asset id even when both stores reference the image.
- Prompt drafts remain local until an explicit stable action; this removes full production-history serialization from prompt typing without changing the existing stored prompt contract.
- Broader uploaded, pasted, and page-background object URL ownership remains scheduled for Pass 7.

### Verification
- TDD red phase reproduced payload persistence, per-keystroke writes, missing quota warning, and missing hydration behavior before implementation.
- Focused audit suite: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/portals/storyline/__tests__/imageshopBatchGeneration.test.ts src/portals/storyline/__tests__/imageshopPromptPreflight.test.ts src/portals/storyline/__tests__/imageshopReferenceContext.test.ts src/portals/storyline/__tests__/imageshopCanonContext.test.ts src/stores/__tests__/imageshopProductionStore.test.ts src/stores/__tests__/imageshopSessionStore.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts` passed 8 files / 67 tests.
- Full suite: `npm run test -- --run` passed 62 files / 370 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `npx tsc -b --pretty false` passed.
- `git diff --check` passed.
- Signed-in browser smoke at `http://127.0.0.1:5174/` confirmed Imageshop loaded, prompt editing worked, the uncommitted draft did not survive a portal reload, the previously committed panel prompt restored, and no console warnings/errors appeared.

### Outstanding issues
- Passes 2 through 7 remain open, beginning with one compiled request contract for preflight, provider execution, hashes, and provenance.
- A live quota failure was not forced in the signed-in browser; the `QuotaExceededError` path is covered by the component test.

### Risks or caveats
- No paid Gemini generation or destructive Vault/Writer action was performed in this pass.
- Full ownership cleanup for uploaded, pasted, and page-background object URLs remains a Pass 7 responsibility.

### Operator follow-up
- None for Pass 1.

### Next steps
- Begin Pass 2 with failing tests proving the displayed preflight prompt, provider prompt, stored version prompt, and provenance prompt are byte-for-byte identical.

## Imageshop Integrity Repair Pass 2 - 2026-06-06

### What changed
- Added one immutable `ImageshopGenerationRequest` contract for the exact prompt, provider inputs, source identity, model, aspect ratio, context, ordered references, provenance inputs, and prompt hash.
- Routed standalone generation, selected Writer-panel generation, page/all batch generation, and legacy production batch generation through the compiled request.
- Made preflight evaluate the same request object used for provider execution instead of independently recomposing prompt data.
- Removed the selected-panel `promptOverride` path that previously bypassed the normal preflight gate.
- Tied session prompts, production-version prompts, provenance composed prompts, and batch attempt hashes to the exact provider prompt.
- Ensured avoid-list, selected art style, continuity/canon instructions, and page configuration reach the provider exactly as shown in the composed request preview.

### Files touched
- `src/portals/storyline/imageshopGenerationRequest.ts`
- `src/portals/storyline/imageshopBatchGeneration.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/__tests__/imageshopGenerationRequest.test.ts`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The request compiler freezes the request, workspace, references, provider inputs, source identity, and provenance inputs so downstream code cannot silently substitute a different prompt.
- The prompt hash uses the exact compiled provider prompt rather than the earlier raw panel action text.
- Selected-panel provenance now receives the compiled prompt and complete compiled prompt sections.
- Batch retries continue to adjust reference URL subsets through the existing strategy contract; explicit failed-reference ids and retry-specific reference recompilation remain Pass 3 work.
- The existing compact composed-prompt surface is now the authoritative preview rather than a descriptive prompt that could diverge from execution.

### Verification
- TDD red phase:
  - The request-contract test initially failed because `imageshopGenerationRequest.ts` did not exist.
  - Selected-panel and batch tests then failed because provider calls received raw panel text without `Generation mode: Comic Pages`, avoid-list, art style, or page configuration.
- Focused request and prompt suite passed 5 files / 35 tests.
- Broader Imageshop audit suite passed 10 files / 74 tests.
- Full suite: `npm run test -- --run` passed 63 files / 374 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `npx tsc -b --pretty false` passed.
- `git diff --check` passed.
- Signed-in browser smoke at `http://127.0.0.1:5174/` confirmed the compiled request preview included generation mode, panel prompt, canon context, art-style instructions, and page configuration with no console warnings/errors.

### Outstanding issues
- Pass 3 must give reference lanes explicit provider roles, prepare references concurrently, block unknown/failed preparation, and record failed reference ids for retries.
- Browser text entry could not be exercised because the Browser Use virtual clipboard was not installed in the active session; avoid-list equality was verified by component tests.

### Risks or caveats
- No paid Gemini generation or destructive Vault/Writer action was performed.
- Retry strategies still share the original prompt text while changing reference subsets; Pass 3 will make those reference changes explicit in the compiled request and provenance.

### Operator follow-up
- None for Pass 2.

### Next steps
- Begin Pass 3 with failing tests for mixed reference lanes, bounded parallel preparation, strict provider-call suppression, failed-reference attribution, and retry-without-failed-reference request changes.

## Imageshop Integrity Repair Pass 3 - 2026-06-07

### What changed
- Added an explicit provider compiler for all seven Imageshop reference lanes: Character DNA, Wardrobe, Environment, Props, Style, Lighting, and Canon.
- Added deterministic lane ordering and retained the 14-reference maximum guard before provider execution.
- Replaced serial reference preparation in Imageshop with bounded concurrent preparation while preserving deterministic provider order.
- Added per-reference preparation results keyed by chip id, including timeout, fetch, decode, and decoded-size failure categories.
- Added a structured prepared-reference path to the Gemini image adapter while preserving the legacy positional URL path for non-Imageshop callers.
- Blocked provider execution until every included reference is ready and suppressed the provider completely when preparation fails.
- Updated matching panel queue chips with ready/failed preparation state and failure details.
- Added included and failed reference ids to batch attempt metadata.
- Made `Retry without failed refs` recompile the request from surviving reference ids so the provider payload, prompt hash, stored prompt, and provenance all reflect the references actually used.
- Removed duplicate reference-target text from the panel base prompt so the immutable request compiler is the only owner of reference inclusion.

### Files touched
- `src/portals/storyline/imageshopReferencePreparation.ts`
- `src/portals/storyline/imageshopGenerationRequest.ts`
- `src/portals/storyline/imageshopBatchGeneration.ts`
- `src/portals/storyline/imageshopPagePanelQueue.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/shared/api/geminiImageApi.ts`
- `src/stores/imageshopProductionStore.ts`
- `src/portals/storyline/__tests__/imageshopReferencePreparation.test.ts`
- `src/portals/storyline/__tests__/imageshopGenerationRequest.test.ts`
- `src/portals/storyline/__tests__/imageshopBatchGeneration.test.ts`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `src/shared/api/__tests__/geminiImagePreparedReferences.test.ts`
- `src/stores/__tests__/imageshopProductionStore.test.ts`
- `docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Provider instructions are attached to each compiled reference rather than inferred from array position or one global character/asset context.
- Preparation defaults to four concurrent workers, returns results in compiled lane order, and does not call Gemini while any reference is still pending.
- Queue status updates are id-targeted, so one failed fetch cannot mark unrelated chips failed.
- Batch retries use failed ids recorded on prior attempts, not a generic URL subset. The retry request is recompiled, which removes the failed reference from the selected-reference prompt line as well as provider inputs and provenance.
- The structured Gemini option carries pre-encoded image data and exact instructions. Existing callers that provide only `referenceImageUrls` continue through the legacy slot-role implementation.
- UI hierarchy and density findings remain assigned to Pass 6; Pass 3 did not widen its scope into layout work.

### Verification
- TDD red phase confirmed the reference compiler module and retry attribution contracts were absent before implementation.
- Focused tests covered all seven lane mappings, the maximum-reference guard, bounded concurrency, deterministic output order, timeout/fetch/decode/size attribution, pending-reference provider suppression, failed-reference provider suppression, queue-chip updates, prepared Gemini payload ordering, and retry request/provenance changes.
- `npm run test` passed 65 files / 390 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Signed-in non-paid browser smoke at `http://127.0.0.1:5173/` confirmed the Imageshop heading, prompt preflight, and generation controls rendered at the default 1280px viewport.
- Browser inspection reported `body.scrollWidth === document.documentElement.clientWidth` and no console warnings/errors.

### Outstanding issues
- Pass 4 must link selected-panel versions to the grouped panel production item and derive batch summaries/retry eligibility from each panel's latest attempt.
- Passes 5 through 7 remain open for Guided return restoration, generation-first responsive layout/render scope, and complete object URL cleanup/regression.

### Risks or caveats
- No paid Gemini generation or destructive Vault/Writer action was performed.
- Live unreachable-reference behavior was covered by component tests with the real component flow and mocked reference preparation; browser smoke remained non-paid and non-destructive.
- Historical failed ids remain available on attempts for diagnostics; current batch-summary semantics are intentionally deferred to Pass 4.

### Operator follow-up
- None for Pass 3.

### Next steps
- Begin Pass 4 with a failing selected-panel test that reproduces the detached generic production item, then add latest-attempt-per-panel batch selectors.

## Imageshop Integrity Repair Pass 4 - 2026-06-07

### What changed
- Fixed selected-panel generation so the generated version is recorded on the grouped production item whose `sourceId` is the Writer panel queue id instead of a detached generic `Imageshop item N`.
- Kept the queue panel, grouped production item, current version, production board, session provenance, and Writer image-map return synchronized around the same queue item and version.
- Added a latest-attempt-per-panel selector for current batch summaries and retry eligibility.
- Preserved complete attempt history for diagnostics while deriving generated, failed, and skipped counts from only each panel's latest attempt.
- Updated failed-panel retries to target panels whose latest attempt is failed.
- Disabled stale retry actions after a successful retry clears the current failed count.

### Files touched
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/imageshopBatchGeneration.ts`
- `src/portals/storyline/components/ImageshopBatchControls.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `src/portals/storyline/__tests__/imageshopBatchGeneration.test.ts`
- `docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Selected-panel success resolves the source panel from the current production-store queue before calling `ensureProductionItemForPanel`, avoiding stale React selection state after loading a panel prompt.
- The panel-linked production item receives the generated version before the Writer map is exported, so the board and return payload expose the same `version_id`.
- `getLatestImageshopBatchAttempts` retains the last attempt for each queue item in latest-attempt order. The original attempt array remains unchanged.
- Batch controls and result summaries use latest attempts for current status. Elapsed time still includes all historical attempts because it is diagnostic history rather than current panel state.
- The failed-panel retry action no longer treats an old queue `failed` status as sufficient when the latest attempt succeeded.
- No layout or styling changes were made. The existing generation-first hierarchy and density work remains assigned to Pass 6.

### Verification
- TDD red phase reproduced the detached selected-panel version and the stale historical failure count before implementation.
- Focused Pass 4 tests passed 8 files / 70 tests, covering panel-linked versions, production-board identity, Writer image-map return, latest-attempt selection, batch recovery, and stale retry disabling.
- `npm run test -- --run` passed 65 files / 391 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Non-paid browser smoke at `http://127.0.0.1:5173/` confirmed Imageshop and Batch JSON render at `1280x720`, `body.scrollWidth` equals the viewport width, and the console has no warnings/errors.

### Outstanding issues
- Pass 5 must restore Guided returns to the originating issue, page, and panel-focus workspace.
- Passes 6 and 7 remain open for responsive generation-first layout/render scope and complete object URL cleanup/regression.

### Risks or caveats
- No paid Gemini generation or destructive Vault/Writer action was performed.
- Browser smoke verified rendering and controls without generating. Panel identity and successful-retry behavior were verified through component tests with mocked provider responses.

### Operator follow-up
- None for Pass 4.

### Next steps
- Begin Pass 5 with a failing Guided bridge/component test that starts from a specific issue, page, and panel and verifies return to that same panel-focus workspace.

## Imageshop Integrity Repair Pass 5 - 2026-06-07

### What changed
- Added originating Comic Library project and Writer issue identity to Guided Imageshop handoffs and returns.
- Restored Guided returns directly into the originating issue workspace, Art step, page, selected panel, and panel-focus view.
- Preserved newer unsaved Guided recovery drafts when they are more current than the saved Comic Library snapshot.
- Kept returned image assignment, ready status, provenance, and layout geometry on the existing assignment path.

### Files touched
- `src/stores/imageWorkshopBridge.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/guided-comic/__tests__/guidedComicImageshopReturn.test.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The Guided handoff carries `projectId` and `writerIssueId`; Imageshop forwards that workspace unchanged in the return payload.
- When the return targets another saved project, Guided selects it, restores its snapshot, updates the selected series, and then applies the returned art.
- When the return targets the active project, Guided does not reapply an older saved snapshot, so newer local recovery pages and panels remain available.
- The return consumer explicitly opens `issue-workspace`, activates Art, restores `activePageNumber`, selects the returned panel, and enters `panel-focus`.
- Pass 5 did not change layout or styling. Responsive hierarchy and render-scope work remain in Pass 6.

### Verification
- TDD red phase reproduced the missing workspace payload and Cover Table landing for saved-project and recovery-draft returns.
- Focused Pass 5 suite passed 5 files / 61 tests; final return-path rerun passed 2 files / 28 tests.
- Full suite: `npm run test -- --run` passed 66 files / 393 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Signed-in non-paid browser smoke at `http://127.0.0.1:5173/` opened Comic Creator, selected the saved series, and entered its issue workspace with expected navigation and production controls. Browser logs contained no warnings or errors.

### Outstanding issues
- Pass 6 remains open for generation-first responsive layout, cockpit overflow, and narrowed render subscriptions.
- Pass 7 remains open for complete owned object URL cleanup and final regression.

### Risks or caveats
- No paid Gemini generation or destructive Vault/Writer action was performed.
- The exact Imageshop-to-Guided return transition is verified by component integration tests; browser smoke remained non-paid and non-mutating.

### Operator follow-up
- None for Pass 5.

### Next steps
- Begin Pass 6 with a failing layout/order regression test and render-scope evidence.

## Imageshop Integrity Repair Pass 6 - 2026-06-07

### What changed
- Made Image Lab the first full-width primary workspace in Illustrator's Imageshop.
- Moved production libraries, Beat timeline, Selected frame preview, and Beat detail below the generation workspace.
- Added a contextual Import tab so external-image retouch controls no longer crowd the default Compose surface.
- Reordered Compose around the main prompt, Generate action, reference tray, and preview.
- Replaced fixed-minimum Writer cockpit columns with fluid responsive columns.
- Narrowed the Storyline Zustand subscription and deferred callback-only state reads.

### Files touched
- `src/portals/storyline/StorylineStudio.tsx`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
- `src/portals/storyline/components/ImageshopOutputDestinations.tsx`
- `src/portals/storyline/__tests__/StorylineStudio.layout.test.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The primary workspace now has a stable `Imageshop generation workspace` region before all secondary Storyline surfaces.
- Compose keeps prompt, Generate, preview, references, labels, disabled explanations, and vertical scrolling available without rendering the Import form.
- Import is a peer surface beside Compose, Page setup, Batch JSON, and Review.
- Output destinations use a compact desktop command row instead of a tall two-column stack.
- The Writer Pages Cockpit uses two fluid columns at `lg` and four zero-minimum columns at `2xl`; no fixed `14rem` or `18rem` column minimum remains.
- `useStorylineStudioStore()` now uses a shallow selector for render-relevant fields. Export, Vault save, and director-setting callback data are read from `getState()` only when invoked.
- Render-count evidence showed selector isolation was sufficient, so no speculative component memoization was added.
- The UI critic review drove five revisions: primary workspace order, contextual Import, prompt/action placement, output density, and cockpit width behavior.

### Verification
- TDD red phase reproduced secondary-first DOM order, unrelated-store rerenders, fixed cockpit minima, default Import crowding, Generate after advanced fields, and references before the main prompt.
- Focused Pass 6 suite passed 2 files / 28 tests.
- Full suite: `npm run test -- --run` passed 67 files / 395 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Signed-in browser QA at `1280x720` measured the prompt at `596-668px` and Generate at `681-713px`; Import was hidden until selected.
- Browser measurements at `1600x900` and `1280x720` reported document width equal to viewport width.
- Expanded-sidebar content-width equivalents were checked at 1430px and 1110px, matching the AppShell's 170px collapsed-to-expanded width delta, with no horizontal document overflow.
- Import tab interaction rendered `Import external image`; returning to Compose restored the prompt. Browser console logs were clean.

### Outstanding issues
- Pass 7 remains open for complete owned object URL cleanup and final regression verification.

### Risks or caveats
- No paid Gemini generation or destructive Vault/Writer action was performed.
- The in-app browser screenshot command timed out. Responsive claims are supported by DOM snapshots, bounding boxes, document-width measurements, interaction state, and console logs instead.
- Expanded navigation could not be hover-triggered through the active browser bridge; equivalent available content widths were measured using the AppShell's exact 60px-to-230px sidebar delta.

### Operator follow-up
- None for Pass 6.

### Next steps
- Begin Pass 7 with failing object URL ownership tests for replace, clear, remove, and unmount.

## Imageshop Integrity Repair Handoff Checkpoint - 2026-06-07

### What changed
- Created a `$handoff` continuation checkpoint after completing Imageshop integrity repair Pass 6.
- The handoff is recorded in the chat response rather than persisted as a separate repository file.
- The checkpoint represents the state where Passes 1 through 6 are complete and Pass 7 is the next repair pass.

### Files touched
- `walkthrough.md`

### Implementation notes
- The working tree remains dirty with the broader Pass 1-6 rollout still uncommitted.
- The next action is to begin Pass 7 with failing object URL ownership tests.

### Verification
- `git branch --show-current`
- `git log -1 --oneline`
- `git status --short`
- `rg -n "Approval status|Pass 6 Results|Pass 7:" docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `sed -n '28,38p' tasks.md`
- `git status --short walkthrough.md tasks.md docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `rg -n "Imageshop Integrity Repair Handoff Checkpoint" walkthrough.md`
- `git diff --check`

### Outstanding issues
- Pass 7 remains open.

### Risks or caveats
- No new implementation or verification run was performed as part of the handoff checkpoint beyond evidence refresh, walkthrough update, and diff whitespace check.

### Operator follow-up
- None.

### Next steps
- Begin Pass 7 with failing object URL ownership tests for replace, clear, remove, and unmount.

## Imageshop Integrity Repair Pass 7 Object URL Cleanup - 2026-06-07

### What changed
- Completed Pass 7 of the Imageshop integrity repair plan.
- Added component-owned object URL tracking to Image Lab so uploaded references, pasted references, and uploaded page-background images are registered before they enter component state.
- Revoked owned object URLs exactly once when local references are removed, cleared, replaced by studio/panel references, or released during component unmount.
- Updated page-background handling so only component-owned blob URLs are revoked when replaced or overwritten; remote/data/manual URLs are not revoked.
- Added focused TDD coverage for remove, clear, replace, and unmount cleanup paths.
- Confirmed the two unrelated `output/imagegen/page-06-mirrorverse-invasion*.png` files were already absent from the repository before Pass 7 implementation continued.

### Files touched
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `docs/superpowers/plans/2026-06-06-imageshop-integrity-repair-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- `GenericImageLabPanel` now keeps a `Set` of object URLs created by the component.
- `registerOwnedObjectUrl` records a newly-created URL, while `revokeOwnedObjectUrl` deletes the URL from the set before calling `URL.revokeObjectURL`, preventing duplicate revokes.
- Reference replacements now route through a cleanup helper that compares previous refs to the next ref set and only revokes owned URLs that are no longer present.
- Pasted references now revoke immediately if no slot is available by the time the clipboard image resolves.
- IndexedDB-hydrated generated image URLs remain owned by `imageshopImageRepository` and continue to release through `releaseImageshopImageUrl(assetId)`.

### Verification
- TDD red: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx -t "owned"` failed 4 expected object URL cleanup tests with zero revoke calls.
- Green slice: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx -t "owned"` passed 4 tests.
- `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` passed 1 file / 30 tests.
- `npm run test -- --run src/stores/__tests__/imageshopSessionStore.test.ts src/stores/__tests__/imageshopProductionStore.test.ts` passed 2 files / 18 tests.
- `npm run test -- --run src/shared/api/__tests__/geminiImageDiagnostics.test.ts src/portals/storyline/__tests__/imageshopPromptPreflight.test.ts src/portals/storyline/__tests__/imageshopReferenceContext.test.ts src/portals/storyline/__tests__/imageshopBatchGeneration.test.ts` passed 4 files / 23 tests.
- `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts src/portals/guided-comic/__tests__/guidedComicImageshopReturn.test.tsx` passed 3 files / 48 tests.
- `npm run test -- --run` passed 67 files / 399 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Browser QA at `1600x900`: Image Lab rendered, Compose defaulted, Import was hidden until selected, document/body width equaled 1600px, prompt measured `596-668px`, Generate measured `681-713px`, and console warnings/errors were empty.
- Browser QA at `1280x720`: deterministic Writer-style prompt typing did not create generated image payloads in web storage, Import rendered and returned to Compose, document/body width equaled 1280px, prompt measured `596-668px`, Generate measured `681-713px`, and console warnings/errors were empty.

### Outstanding issues
- None for Pass 7.

### Risks or caveats
- Browser QA used non-paid/manual checks and did not trigger live Gemini generation.
- The browser storage check found no `localStorage` or `sessionStorage` entries after prompt typing in the active test profile.

### Operator follow-up
- None.

### Next steps
- Review the full Pass 1-7 rollout as one branch-level change set before commit/PR packaging.

## Writers Workshop Live Assistant Workflow Evaluation - 2026-06-07

### What changed
- Added a documentation-only evaluation of a possible live AI assistant for Writers Workshop.
- Captured the current Writers Workshop AI shape, including the Supabase `writer-tools` Edge Function path, Gemini API key usage, current model/fallback behavior, and cost surfaces.
- Documented the expected user workflow in chronological order and identified why the current ordering can feel confusing.
- Distinguished smoke testing from a full AI/user-agent portal QA approach, recommending a tool coverage audit plus deterministic browser regression and limited live-AI smoke verification.
- Preserved the user's request not to modify portal behavior or application code.

### Files touched
- `docs/writers-workshop-live-assistant-workflow-evaluation.md`
- `walkthrough.md`

### Implementation notes
- This was an evaluation and documentation pass only.
- The document notes that Writers Workshop currently uses Gemini via Supabase secrets, not OpenAI.
- The document flags that the repo default `gemini-2.0-flash` is listed by Google as shut down on June 1, 2026, so future assistant work should verify or set an active `GEMINI_MODEL` before relying on expanded live AI behavior.
- The recommended assistant direction is a confirmable, context-aware panel that reuses existing `idea_assist`-style flows before considering true realtime or voice behavior.

### Verification
- `date +%Y-%m-%d`
- Repository/source review only; no build, lint, browser QA, or tests were run because no portal code changed.

### Outstanding issues
- No implementation was performed.
- A future implementation plan would need to decide assistant placement, allowed actions, budget indicators, and live-vs-mocked AI QA policy.

### Risks or caveats
- Gemini and Supabase pricing can change; pricing references should be rechecked before implementation or high-volume live testing.
- The document is based on static repo/source inspection plus official pricing documentation, not a new live Writers Workshop browser session.

### Operator follow-up
- Review the document and decide whether the next step should be workflow simplification, a guided assistant plan, or a QA coverage matrix.

### Next steps
- If approved, create an implementation plan for either a workflow simplification pass or a low-risk assistant panel that reuses existing `writer-tools` modes with explicit user confirmation.

## Writers Workshop Chronology and Page Edit Autonomy - 2026-06-07

### What changed
- Implemented the Writers Workshop chronology simplification pass using a tested helper that models the visible flow as `Library -> Foundation -> Synopsis -> Canon -> Outline -> Pages -> Beats -> Dialogue -> Visual Prep -> Audit -> Cockpit -> Export`.
- Updated the Writer production map to use the shared chronology helper, including Foundation as the first production setup step while preserving the existing `notes.production_defaults` storage contract.
- Added a staged page-edit review helper for outline, page beats, and dialogue edits. The helper reports likely repetition, canon drift, neighboring-page overlap, layer mismatch, affected layers, and explicit safe actions.
- Added the "Edit current page review" panel to the active Beats and Dialogue workspaces and to the saved-output editor. The panel exposes only explicit actions: save staged layer, run canon check, regenerate beats, regenerate dialogue, or preview the affected page.
- Preserved the existing no-silent-overwrite behavior: cascade-style work opens preview/regeneration actions that still require user confirmation.
- Strengthened the Writer page-to-Imageshop handoff by preserving selected page dialogue in the Imageshop moodboard prompt context and adding focused tests around handoff and returned Writer image-map provenance.
- Saved and completed the execution plan for this pass.

### Files touched
- `docs/superpowers/plans/2026-06-07-writers-workshop-chronology-edit-autonomy-plan.md`
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerWorkflowChronology.ts`
- `src/portals/writer/writerPageEditReview.ts`
- `src/portals/writer/__tests__/writerWorkflowChronology.test.ts`
- `src/portals/writer/__tests__/writerPageEditReview.test.ts`
- `src/portals/writer/__tests__/writerImageshopReturn.test.ts`
- `src/portals/storyline/imageWorkshopPlanning.ts`
- `src/portals/storyline/__tests__/imageWorkshopPlanning.test.ts`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- `writerWorkflowChronology.ts` centralizes the ordered Writer production steps and status details so the UI order and tests stay aligned.
- `WriterPortal` now computes the active workflow step separately from the raw tab label, allowing Cockpit to remain late-stage while Foundation appears early.
- `writerPageEditReview.ts` is intentionally deterministic and local: it does not call AI or overwrite data. AI-backed regeneration still routes through the existing canon, page-beats, dialogue, and pacing preview paths.
- The page-edit review panel is shared JSX inside `WriterPortal` and renders in the live Beats/Dialogue tabs as well as the saved-output editor.
- `collectMoodboardPrompts` now prioritizes selected page script text before lower-level panel action/composition prompts so Writer dialogue context is not pushed out of the Imageshop handoff seed list.
- Live browser QA stopped before image generation. The Imageshop return button appeared but was disabled until generated panel/image-map output exists, which matches the guarded workflow.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerPageEditReview.test.ts` passed 2 files / 5 tests.
- `npm run test -- --run src/portals/storyline/__tests__/imageWorkshopPlanning.test.ts` passed 1 file / 5 tests.
- `npm run test -- --run src/portals/writer/__tests__/writerImageshopReturn.test.ts` passed 1 file / 3 tests.
- `npm run test -- --run src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerPageEditReview.test.ts src/portals/storyline/__tests__/imageWorkshopPlanning.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/portals/writer/__tests__/writerImageshopReturn.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/imageshopProductionStore.test.ts` passed 7 files / 72 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 warnings.
- Browser smoke on `http://127.0.0.1:5174/` confirmed the signed-in Writer issue rendered the new production map order, the staged review panel appeared on Dialogue and Beats, `Send page to Illustrator’s Imageshop` was visible from selected page beats, and Imageshop opened with Writer-derived page/panel context and no console errors.

### Outstanding issues
- No live Gemini image generation was run, so the browser smoke did not create new image-map provenance. Returned image-map merge behavior is covered by focused automated tests.
- The screenshot capture helper timed out during browser QA, but text-based browser inspection verified the target UI state.

### Risks or caveats
- The page-edit review is heuristic and local. It is meant to catch obvious conflicts and direct users to existing canon/regeneration tools, not to replace full AI/editorial review.
- The Writer-to-Imageshop route was browser-smoked with the existing signed-in local data and no paid generation.

### Operator follow-up
- Approve live Gemini generation separately if a future pass should verify generated image-map return in the browser with real images.

### Next steps
- Use the new chronology and staged edit review as the baseline for any future live assistant or deeper autonomy work.

## Writers Workshop to Imageshop Live Generation Verification - 2026-06-07

### What changed
- Ran the approved live Writer-to-Imageshop verification against `Oratoria de Conjunctio Oppositorum`, Issue 1 `Twove`, Page 8.
- Found a live bridge gap before spending API budget: `Send page to Illustrator's Imageshop` updated the Visual Prep prompt/lore context, but the active Imageshop production `panelQueue` could remain from a previous import. This meant `Generate selected panel` could target stale Writer queue data.
- Fixed Writer page handoff so selected-page beats build and carry a one-page Imageshop `panelQueue` alongside the existing Visual Prep draft.
- Updated Imageshop to adopt the Writer-provided queue automatically, switch into Comic Pages mode, and show the correct active panel queue for the selected Writer page.
- Used the single approved live Gemini generation on `P8.1` only.
- Returned the generated Writer image map to Writers Workshop and verified `imageshop_output` merged into Oratoria Issue 1 Page 8 Panel 1.

### Files touched
- `src/portals/storyline/imageWorkshopPlanning.ts`
- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/StorylineStudio.tsx`
- `src/portals/storyline/__tests__/imageWorkshopPlanning.test.ts`
- `docs/superpowers/plans/2026-06-07-writers-workshop-chronology-edit-autonomy-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- `ImageWorkshopDraft` now optionally includes `panelQueue`.
- `buildImageWorkshopDraftFromWriterSelection` uses `createImageshopIssueQueue` to convert selected Writer `beats_json.panels` into returnable Imageshop panel queue items while preserving Writer series/issue/page ids.
- `WriterPortal` now passes the selected series title into the handoff source context.
- `StorylineStudio` passes `imageWorkshopDraft.panelQueue` into `GenericImageLabPanel`.
- `GenericImageLabPanel` imports the Writer queue into `useImageshopProductionStore`, sets generation mode to `comic-pages`, and keeps the Compose surface active.
- The generated page beat merge produced `imageshop_output` with status `generated`, model `pro`, seed `877649595`, the composed prompt, and a generated data URL on Page 8 Panel 1.

### Verification
- Pre-generation browser check: Oratoria Issue 1 Page 8 handoff initially opened Visual Prep correctly but showed a stale panel queue from another issue; generation was intentionally paused before API spend.
- `npm run test -- --run src/portals/storyline/__tests__/imageWorkshopPlanning.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/portals/writer/__tests__/writerImageshopReturn.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/imageshopProductionStore.test.ts` passed 5 files / 67 tests after the bridge fix.
- Browser check after the bridge fix: Oratoria Issue 1 `Twove` Page 8 opened Imageshop with `P8.1` through `P8.5`, `5/5 panels ready`, canon chips for Angels/Cosmic, and the selected panel prompt for `P8.1`.
- Live Gemini generation: clicked `Generate selected panel` once for `P8.1`; generation completed successfully, changed `PAGE 8 PANEL 1` to `GENERATED`, and enabled `Writer map` and `Return to Writer`.
- Return verification: clicked the enabled `Send image map to Writers Workshop` control, reselected Oratoria Issue 1 Page 8 in Writers Workshop, and confirmed `imageshop_output` was present in the selected page beats JSON for Panel 1.
- Browser console errors were empty during the live generation and return checks.

### Outstanding issues
- None for the approved live verification.

### Risks or caveats
- This run intentionally generated one panel only; full page or batch live generation was not exercised.
- The generated image provenance is now stored in the live Writer page beat for Oratoria Issue 1 Page 8 Panel 1.

### Operator follow-up
- None required unless you want the generated image/provenance removed from the live Writer page beat.

### Next steps
- Treat the Writer page-to-Imageshop-to-Writer return path as live-verified for the single-panel case.

## Advanced Comic Creator Direct Access and Image Import Fix - 2026-06-07

### What changed
- Added a direct Advanced Comic Creator landing-page card that opens the existing Comic portal straight into the Advanced Studio canvas.
- Added a matching desktop left-rail `Advanced Comic Creator` button below the regular Comic Creator entry.
- Fixed Advanced Studio asset insertion so clicking a stored asset updates the comic workspace immediately instead of waiting on an image `onload` event that could make the UI appear nonresponsive.
- Added local image import controls in the Advanced Studio asset panel and Home/Panel menus.
- Reworked the Advanced Studio asset panel from the confusing hidden-overflow/masonry feel into a vertical two-column grid with an explicit `47 stored images - scroll down for the full library` hint.
- Improved the asset panel header contrast so the import button and scroll hint remain readable against the dock background.

### Files touched
- `src/App.tsx`
- `src/components/LandingPage.tsx`
- `src/components/layout/AppShell.tsx`
- `src/portals/ComicPortal.tsx`
- `src/modes/comic/components/AssetLibrary.tsx`
- `src/modes/comic/components/MenuBar.tsx`
- `src/modes/comic/layouts/ComicLayout.tsx`
- `src/stores/comicStore.ts`
- `src/modes/comic/components/__tests__/AssetLibrary.test.tsx`
- `src/modes/comic/components/__tests__/MenuBar.test.tsx`
- `src/portals/__tests__/ComicPortal.advancedEntry.test.tsx`
- `walkthrough.md`

### Implementation notes
- `ComicPortal` now accepts an `advancedStudioRequestKey` and switches to `ComicEditor` when the app shell or landing card requests direct advanced access.
- `App` owns the direct-open intent and preserves the existing phone guard that keeps Comic/Imageshop off phone layouts.
- `comicStore` now exposes `insertImageIntoWorkspace`, which either fills selected panels or creates and selects a new image panel centered near the last canvas position or page center.
- `AssetLibrary` uses the shared store insertion action for stored assets, mock generation, and local file imports, removing the fragile async-only image-load gate.
- `MenuBar` now exposes `Import image...` from Home and Panel menus, and replaces the external placeholder insertion path with a stored local asset insertion path.
- The asset dock remains inside the existing Studio panel system; no new route, Supabase schema, or comic serialization format was added.

### Verification
- `npm run test -- --run src/modes/comic/components/__tests__/AssetLibrary.test.tsx src/portals/__tests__/ComicPortal.advancedEntry.test.tsx` passed 2 files / 3 tests after first fixing the failing RED cases.
- `npm run test -- --run src/modes/comic/components/__tests__/AssetLibrary.test.tsx src/portals/__tests__/ComicPortal.advancedEntry.test.tsx src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/stores/__tests__/comicStoreSerialization.test.ts` passed 4 files / 15 tests.
- `npm run test -- --run src/modes/comic/components/__tests__/AssetLibrary.test.tsx src/modes/comic/components/__tests__/MenuBar.test.tsx src/portals/__tests__/ComicPortal.advancedEntry.test.tsx src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/stores/__tests__/comicStoreSerialization.test.ts` passed 5 files / 16 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 warnings.
- `git diff --check` passed.
- Browser QA on `http://127.0.0.1:5173/` confirmed the landing card and left-rail Advanced Comic Creator entry open Advanced Studio, the asset panel shows `Import local image` plus the 47-image scroll hint, clicking `Anunnaki Anubis.png` inserts a visible image panel, the Layers dock shows a new `Panel rect`, and browser console errors remained empty.

### Outstanding issues
- Local file import was covered by component tests and control visibility in browser QA, but the browser run did not upload a real local file through the OS picker.

### Risks or caveats
- Direct Advanced Comic Creator access still uses the existing protected Comic portal and desktop/tablet availability rules. On phone layouts, the app continues to route Comic access back to Home.
- Imported local images are embedded as data URLs in the current comic project state, matching the existing JSON/local persistence model.

### Operator follow-up
- None.

### Next steps
- Consider a future deeper Advanced Studio pass for richer imported-asset management if users need a persistent custom asset library rather than direct image insertion.

## Context Handoff Checkpoint - 2026-06-07

### What changed
- Created a `$handoff` continuation checkpoint for the current dirty branch state.
- The handoff is recorded in the chat response rather than persisted as a separate repository file.
- The checkpoint represents the state after Writers Workshop chronology/edit-autonomy implementation, approved single-panel Writer-to-Imageshop live generation verification, and the later Advanced Comic Creator direct-access/image-import work already reflected in this walkthrough.

### Files touched
- `walkthrough.md`

### Implementation notes
- The working tree remains dirty and contains at least two scopes: Writers Workshop/Imageshop bridge work and Advanced Comic Creator direct-access/image-import work.
- The next agent should not revert unrelated dirty files without explicit user approval.

### Verification
- `git branch --show-current`
- `git log -1 --oneline`
- `git status --short`
- `git diff --stat`
- `rg -n "Run approved live Writer-to-Imageshop generation|Writers Workshop to Imageshop Live Generation Verification|Live Gemini generation was later explicitly approved|Writers Workshop Chronology and Page Edit Autonomy" tasks.md walkthrough.md docs/superpowers/plans/2026-06-07-writers-workshop-chronology-edit-autonomy-plan.md`
- `tail -n 120 walkthrough.md`
- `git diff --check`

### Outstanding issues
- No new implementation issue was discovered while preparing the handoff.

### Risks or caveats
- The branch is not committed.
- The dirty tree includes files outside the Writer/Imageshop scope.

### Operator follow-up
- None.

### Next steps
- In the next thread, refresh `git status --short` and split review/staging by scope before any commit or PR packaging.

## Writers Workshop Outline and Beats Edit Discoverability - 2026-06-07

### What changed
- Made the existing saved-output editors easier to find from the workspaces where writers naturally look for them.
- Added an `Edit outline JSON` action beside the latest saved outline preview in the Outline workspace.
- Added `Edit this page's beats` to the selected-page Beats action row.
- Added a quieter `Edit beats JSON` action to the selected-page beats preview header.
- Kept the existing Scripts saved-output editor as the single save/validation surface, so outline and beats JSON still use the same database update paths and invalid JSON guards.

### Files touched
- `src/portals/writer/WriterPortal.tsx`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Added a small `openSavedOutputEditor` helper in `WriterPortal` that switches to the Scripts workspace and selects the requested saved-output editor tab.
- The Outline action is disabled when there is no saved outline to edit.
- The Beats actions are disabled until a page is selected.
- This pass deliberately did not duplicate the outline/beats textareas inside the Outline or Beats tabs, avoiding a second save surface for the same JSON.
- Existing prompt-library bridge edits in `WriterPortal.tsx` were preserved and not reverted.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerPageEditReview.test.ts src/portals/writer/__tests__/writerImageshopReturn.test.ts` passed 3 files / 8 tests.
- `npm run build` passed with the existing large chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 warnings.
- Browser QA on `http://127.0.0.1:5174/` loaded `ARCS Expanded` in the in-app browser with no console errors or warnings.
- Browser QA confirmed `Edit outline JSON` appears enabled when a saved outline is loaded and clicking it opens the Scripts saved-output editor with the outline save control present.
- Browser QA selected Page 8, opened Beats, confirmed both `Edit this page's beats` and `Edit beats JSON` are visible, and confirmed the primary beats edit action opens the Scripts saved-output editor with the beats save control present.

### Outstanding issues
- Screenshot capture through the in-app browser timed out during this QA pass; DOM and interaction checks were used as evidence instead.

### Risks or caveats
- The edit textareas still live in the Scripts saved-output editor. This pass adds direct access from Outline/Beats rather than moving or duplicating the editors.
- The checkout currently contains broader prompt-library portal work on `codex/prompt-library-portal`; this pass touched only the Writer edit-affordance slice plus tracker/walkthrough docs.

### Operator follow-up
- None.

### Next steps
- If users still expect inline editing directly inside Outline/Beats, consider a follow-up that embeds the same editor component in those workspaces rather than linking to Scripts.

## ARCS Prompt Library Signed-In CRUD QA - 2026-06-08

### What changed
- Ran the next Prompt Library QA pass against the local ARCS app with an already signed-in Supabase session.
- Verified the Prompt Library portal uses the database-backed state rather than demo memory after auth is ready.
- Created one temporary QA prompt, refreshed the app, confirmed the prompt persisted from Supabase, edited the same prompt, favorited it, refreshed again, deleted it, and confirmed the deletion after returning to Prompt Library from a fresh hub reload.
- Confirmed the signed-in user's Prompt Library returned to an empty database state after cleanup.

### Files touched
- `.agents/walkthrough.md`
- `walkthrough.md`

### Implementation notes
- No source code changes were required for this pass.
- Local Vite served this checkout at `http://127.0.0.1:5174/`.
- The QA prompt was titled `QA CRUD Prompt 2026-06-08 1780901971394`, then edited to `QA CRUD Prompt 2026-06-08 1780901971394 Edited`.
- Create saved the prompt to Supabase and surfaced `v1` in the Versions panel.
- Edit persisted the updated title and prompt text and surfaced `v2` plus `v1` in the Versions panel.
- Favorite toggled successfully and remained visible after reload with the Favorites count at `1`.
- Delete removed the prompt, cleared the detail pane, returned counts to `0`, and stayed deleted after a fresh navigation back into Prompt Library.

### Verification
- `git status --short --branch` confirmed the branch was clean before QA.
- `npm run dev -- --host 127.0.0.1` started Vite for this checkout at `http://127.0.0.1:5174/`.
- Browser QA: page identity was `http://127.0.0.1:5174/` with title `ARCS Expanded`.
- Browser QA: initial app load and Prompt Library portal were non-blank with no framework error overlay.
- Browser QA: console checks during load, create, refresh persistence, edit, favorite, delete, and final fresh-navigation deletion check returned no warnings or errors.
- Browser QA: screenshots were captured for app load, Prompt Library load, create, refresh persistence, edit/version history, favorite, delete, and final empty-state verification.

### Outstanding issues
- Cross-portal save/use handoff QA is still required for Writer, Imageshop, Character Studio, Asset Studio, and Guided Comic.
- Production Cloudflare deployment remains pending for this branch.

### Risks or caveats
- This pass covered the desktop-sized in-app browser viewport only.
- The final page reload returned to the ARCS hub; deletion persistence was verified by reopening Prompt Library from navigation and confirming the QA record was absent.

### Operator follow-up
- Keep the standalone Prompt Library available until ARCS production CRUD, cross-portal handoffs, and production deployment are verified.

### Next steps
- Run cross-portal Prompt Library save/use handoff QA.
- Deploy ARCS through the existing Cloudflare flow after browser QA is clean.

## ARCS Prompt Library Outbound Use Handoff QA - 2026-06-08

### What changed
- Ran the next Prompt Library cross-portal QA slice against the local ARCS app with an already signed-in Supabase session.
- Created one temporary Prompt Library QA record, then verified the outbound `Use in ...` handoff buttons for the three targets currently exposed by the Prompt Library detail pane:
  - Illustrator's Imageshop
  - Character Studio
  - Asset Studio
- Deleted the temporary QA prompt after the handoff checks and confirmed Prompt Library returned to an empty state.

### Files touched
- `.agents/walkthrough.md`
- `walkthrough.md`

### Implementation notes
- No source code changes were required for this pass.
- Local Vite served this checkout at `http://127.0.0.1:5174/`.
- The QA prompt was titled `QA Handoff Prompt 2026-06-08 1780928882708`.
- The QA prompt text included the marker `QA handoff marker 1780928882708` so each target portal could be verified from visible DOM text.
- Imageshop consumed the Prompt Library use request, navigated to Illustrator's Imageshop, showed `Loaded "QA Handoff Prompt 2026-06-08 1780928882708" from Prompt Library.`, and exposed the QA marker in the prompt workspace.
- Character Studio consumed the Prompt Library use request, navigated to Character Studio, pinned the Live Prompt editor, and exposed the QA marker in the override prompt textarea.
- Asset Studio consumed the Prompt Library use request and navigated to Asset Studio. It initially landed on the References workspace, so the QA marker became visible after selecting the Asset Studio `Prompt` tab, where the override prompt textarea contained the handoff text.

### Verification
- `git status --short --branch` confirmed the only pre-existing dirty files were `.agents/walkthrough.md` and `walkthrough.md` from the prior CRUD QA entry.
- `npm run dev -- --host 127.0.0.1` started Vite for this checkout at `http://127.0.0.1:5174/`.
- Browser QA: app identity was `http://127.0.0.1:5174/` with title `ARCS Expanded`, signed-in session visible, and no framework error overlay.
- Browser QA: Prompt Library create/save succeeded with `Prompt saved to Supabase.`
- Browser QA: outbound `Use in Imageshop` navigated to Imageshop and displayed both the loaded-from-library notice and the QA marker.
- Browser QA: outbound `Character Studio` use action navigated to Character Studio and displayed the QA marker in the pinned Live Prompt edit override.
- Browser QA: outbound `Asset Studio` use action navigated to Asset Studio and displayed the QA marker after switching to the Asset Studio `Prompt` tab.
- Browser QA: cleanup delete succeeded with `Prompt deleted.`, prompt counts returned to `0`, and the empty state was visible.
- Browser QA: console checks during app load, prompt creation, all three handoffs, and cleanup returned no warnings or errors.

### Outstanding issues
- Source-portal `Save to Prompt Library` QA is still required for Writer, Imageshop, Character Studio, Asset Studio, and Guided Comic.
- Production Cloudflare deployment remains pending for this branch.

### Risks or caveats
- This pass covered outbound Prompt Library use handoffs only, not source-portal save flows.
- Asset Studio receives the handoff correctly, but its outer workspace remains on References until the user selects the `Prompt` tab. This may be acceptable or may deserve a UX follow-up if users expect the handoff to open directly on the Prompt workspace.
- This pass covered the desktop-sized in-app browser viewport only.

### Operator follow-up
- Keep the standalone Prompt Library available until ARCS production CRUD, source save flows, cross-portal use flows, and production deployment are verified.

### Next steps
- Run source-portal `Save to Prompt Library` QA, starting with the lowest-friction visible prompt surfaces.
- Decide whether Asset Studio handoffs should automatically switch the outer workspace to the `Prompt` tab.
- Deploy ARCS through the existing Cloudflare flow after browser QA is clean.

## Writers Workshop First-Time User UX Audit - 2026-06-08

### What changed
- Ran a no-code, first-time-user UX audit of the Writers' Workshop portal against the local ARCS app.
- Evaluated the portal as a non-technical, tired creator trying to continue one real issue workflow from outline through beats, dialogue, visual prep, audit/cockpit, and export.
- Identified top UX issues for follow-up implementation, including excessive visible controls, conflicting primary actions, export discoverability failure, label drift, raw JSON prominence, and unclear workflow branching.

### Files touched
- `walkthrough.md`

### Implementation notes
- No source code changes were made.
- Local Vite was already serving this checkout at `http://127.0.0.1:5174/`.
- The audit used the signed-in local session and the existing selected issue `Fabula Coniunctio Oppositorum` / `The Blackening`.
- The first Writers' Workshop viewport exposed roughly 80 visible interactive controls before collapsing the workshop panels.
- Collapsing the right workshop panel reduced visible controls to roughly 39, but the screen still retained the left app nav, ribbon, workflow chips, production map, central form content, and a disabled or ambiguous primary action.
- Clicking the production map's `12 Export` step highlighted Export but opened the Synopsis helper surface, where export controls were buried among author-outline fields instead of presenting a dedicated export workspace.

### Verification
- Browser QA: opened `http://127.0.0.1:5174/` in the in-app browser and confirmed the app title was `ARCS Expanded`.
- Browser QA: entered Writers' Workshop from the ARCS hub card rather than deep-linking.
- Browser QA: inspected Outline, Beats, Dialogue, Video/Visual Prep, Arc/Audit, Cockpit, File, and production-map Export behavior.
- Browser QA: captured viewport screenshots for the hub, Writer outline, Beats, Dialogue, and collapsed-panel states.
- Browser QA: console error check returned no errors during the audit.

### Outstanding issues
- The portal needs a focused UX cleanup pass before it will feel approachable to a first-time creator.
- No fixes were implemented in this pass because the user explicitly requested evaluation only.

### Risks or caveats
- This was a desktop-sized in-app browser audit only.
- The audit did not create or delete production data and did not spend AI generation budget.
- Findings reflect the actual signed-in populated issue experience; a blank account or empty issue may have additional onboarding issues.

### Operator follow-up
- Use the ranked UX issue list from the audit response as the starting backlog for the next Writer portal pass.

### Next steps
- Prioritize the export routing failure and the contradictory primary actions on completed stages before cosmetic cleanup.

## Writers Workshop UX Edit And Lock Implementation Plan - 2026-06-08

### What changed
- Converted the first-time user UX audit findings into a prioritized implementation plan for Writers' Workshop.
- Added the user's unresolved direct-edit discoverability issue as a first-class plan requirement: edit controls may exist in the portal, but they are still too hard to find from the actual Outline, Beats, and Dialogue workspaces.
- Added a lock/protection tool requirement to prevent AI regeneration, clear actions, or batch operations from overwriting user-authored synopsis, outline instructions, outlines, page beats, dialogue, and related story fields.

### Files touched
- `docs/superpowers/plans/2026-06-08-writers-workshop-ux-edit-lock-plan.md`
- `walkthrough.md`

### Implementation notes
- No source code changes were made.
- The plan groups work into Quick Wins, Medium Fixes, and Structural Changes.
- The lock MVP is designed to use existing `writer_issues.notes` metadata first, avoiding a database migration unless implementation proves notes-based persistence is insufficient.
- The plan prioritizes export routing, direct edit discoverability, truthful primary actions, panel density reduction, and label consistency before larger guided-mode or version-restore work.

### Verification
- File creation was verified by saving the plan under `docs/superpowers/plans/`.
- No tests were run because this was a planning-only pass.

### Outstanding issues
- Implementation remains pending.
- The plan still needs user approval before code changes begin.

### Risks or caveats
- Lock metadata stored in issue notes is intentionally conservative for the first pass; a future migration may be needed if locks must become queryable or auditable across issues.

### Operator follow-up
- Review and approve the plan scope before implementation.

### Next steps
- Start with Quick Win 1: fix Export routing.
- Then implement Quick Win 2: make direct editing unmissable from the active workspaces.
## ARCS Prompt Library Source Save QA and Fixes - 2026-06-08

### What changed
- Ran signed-in ARCS browser QA for source-portal `Save to Prompt Library` flows across Writer, Imageshop, Character Studio, Asset Studio, and Guided Comic.
- Fixed Writer Prompt Library provenance labels so the saved source/title use `WRITER_WORKSPACE_TAB_LABELS[activeTab].heading` instead of stringifying the tab metadata object as `[object Object]`.
- Fixed Guided Comic panel source-save discoverability by wiring the Prompt Library save callback to the visible production panel and `selectedProductionPanelMetadata`, then rendering `Save to Prompt Library` beside the visible panel visual prompt in the Panel Workspace.

### Files touched
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `walkthrough.md`
- `.agents/walkthrough.md`

### Implementation notes
- Writer QA opened the context menu item `Save visible text to Prompt Library`; the review modal now shows clean provenance like `Writer · Issue outline · page 1` instead of `Writer · [object Object] · page 1`.
- Imageshop QA saved from `Imageshop · Page 8 Panel 1` with title `Page 8 Panel 1`, confirmed Supabase save, then deleted the selected Prompt Library record.
- Character Studio QA saved from `Character Studio` with title `Character Studio prompt`, confirmed Supabase save, then deleted the selected Prompt Library record.
- Asset Studio QA saved from `Asset Studio` with title `Asset Studio prompt`, confirmed Supabase save, then deleted the selected Prompt Library record.
- Guided Comic QA used the dev-only `guidedComicLibraryFixture=many` fixture, which explicitly states real saved comics are not overwritten. The panel workspace now exposes `Save to Prompt Library` next to the visible visual prompt, saved `Guided Comic · page 1, panel 1`, then deleted the selected record and verified the Prompt Library prompt count returned to `0`.
- Browser runtime caveat: the in-app Browser virtual clipboard was unavailable for modal text replacement, so QA used source-default titles and selected-record deletion instead of stamped title edits. Browser screenshot capture also timed out; DOM state and console health were used as proof.

### Verification
- Manual Browser QA: app identity `ARCS Expanded`, signed-in session visible, no relevant console warnings/errors during the source-save flows.
- Manual Browser QA: Writer, Imageshop, Character Studio, Asset Studio, and Guided Comic each opened the Prompt Library review/save path; temporary records were deleted afterward.
- `npm run test -- --run src/stores/__tests__/promptLibraryBridge.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryQaFixtures.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts` - PASS, 3 files / 29 tests.
- `git diff --check` - PASS.
- `npm run build` - FAIL, blocked by current `src/portals/writer/WriterPortal.tsx` unused-symbol errors from the Writer edit-lock affordance work already present in the working tree (`Edit3`, `Lock`, `ShieldCheck`, `Unlock`, lock/draft helpers, and related unused state/callbacks).

### Outstanding issues
- Full build remains blocked until the current Writer edit-lock unused-symbol errors are resolved or the in-progress Writer affordance work is completed.
- Production Cloudflare deployment and live smoke are still pending.
- Asset Studio outbound Prompt Library handoff still has the previously noted UX caveat: the prompt loads correctly, but visibility may depend on the Prompt tab being selected.

### Risks or caveats
- The source-save QA pass is complete locally, but production is not deployed or smoke-tested.
- Browser screenshot evidence could not be captured due the in-app Browser screenshot timeout, so this entry relies on DOM state, status text, console logs, and save/delete observations.

### Operator follow-up
- Decide whether to finish or temporarily neutralize the Writer edit-lock unused imports/state so `npm run build` can pass again.
- Proceed to Cloudflare deployment only after build is green.

### Next steps
- Resolve the Writer build blocker, rerun `npm run build`, then deploy the Prompt Library branch and run live Prompt Library smoke QA.

## Writers Workshop UX edit, export, and lock implementation - 2026-06-08

### What changed
- Implemented the approved Writers Workshop UX execution plan across export routing, direct edit discoverability, truthful primary actions, density cleanup, lock persistence, regeneration guards, draft persistence, readable previews, and structural workspace cleanup.
- Added a dedicated `Export` workspace so the workflow export step opens visible preferred export, issue pack JSON, Markdown script, and Guided Comics handoff controls above the fold.
- Added an always-visible edit/protect strip below the ribbon with direct actions for `Edit issue synopsis`, `Edit outline`, `Edit outline instructions`, `Edit Page N beats`, and `Edit Page N dialogue`.
- Added persistent lock metadata in existing issue notes for synopsis, author outline, outline instructions, production defaults, latest outline, page beats, and page dialogue.
- Added regeneration and destructive-action guards so locked outlines/pages are blocked or skipped before overwrite-capable actions run.
- Added draft persistence for outline instructions, beats director notes, and visual creative brief before AI calls and on blur.
- Added restore snapshot metadata before manual or AI overwrites of outline, page beats, page dialogue, and shot plan drafts.
- Changed completed-stage primary actions to continue forward instead of regenerating by default, with regeneration left as an explicit secondary action.
- Collapsed the right workshop dock by default, added Guided/Advanced mode, normalized `Visual Prep` and `Audit` labels, and added a unified top page selector.
- Replaced raw JSON-first outline and beats previews with readable creator text first, leaving raw JSON under an `Advanced JSON` disclosure.

### Files touched
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/WriterRibbon.tsx`
- `src/portals/writer/writerSearch.ts`
- `src/portals/writer/writerNextStep.ts`
- `src/portals/writer/writerWorkflowChronology.ts`
- `src/portals/writer/writerProtectionLocks.ts`
- `src/portals/writer/writerDraftPersistence.ts`
- `src/portals/writer/writerRegenerationScope.ts`
- `src/portals/writer/writerStorySnapshots.ts`
- `src/portals/writer/__tests__/writerProtectionLocks.test.ts`
- `src/portals/writer/__tests__/writerDraftPersistence.test.ts`
- `src/portals/writer/__tests__/writerRegenerationScope.test.ts`
- `src/portals/writer/__tests__/writerStorySnapshots.test.ts`
- `walkthrough.md`

### Implementation notes
- Lock metadata is stored under `writer_issues.notes.writer_locks`; no schema migration was added.
- Fragile draft metadata is stored under `writer_issues.notes.writer_drafts`; outline-instruction draft writes are skipped while the outline-instructions lock is active.
- Restore/version snapshots are stored under `writer_issues.notes.writer_story_snapshots` and capped by the helper.
- Batch page-beat generation uses explicit unlocked page IDs when locks are present; selected batch operations skip locked pages and show a safety message.
- Pacing apply blocks if it would delete locked page beats or dialogue.
- Pacing preview skips locked pages; preview apply checks the relevant page lock before writing beats or dialogue.
- The old Synopsis helper and JSON editors remain available as advanced affordances; direct local editors now exist in the active Outline, Beats, and Dialogue workspaces.
- Browser QA used the signed-in local app at `http://127.0.0.1:5174/`; a temporary Page 1 beats lock was created, verified after reload/reopen, tested against blocked regeneration, and then removed.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/writerProtectionLocks.test.ts src/portals/writer/__tests__/writerDraftPersistence.test.ts src/portals/writer/__tests__/writerRegenerationScope.test.ts src/portals/writer/__tests__/writerStorySnapshots.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerPageEditReview.test.ts` - PASS, 6 files / 13 tests.
- `npm run test -- --run` - PASS, 79 files / 429 tests.
- `npm run build` - PASS.
- `npm run lint` - PASS with existing repo warnings only; no errors.
- `git diff --check` - PASS.
- Browser QA at `http://127.0.0.1:5174/` - PASS:
  - opened Writers Workshop from the hub;
  - confirmed direct edit controls and lock tools are visible without using File;
  - confirmed Export workspace shows preferred export, issue pack JSON, Markdown script, and Guided Comics handoff above the fold;
  - locked Page 1 beats, reloaded/reopened Writers Workshop, and confirmed it persisted as `Locked`;
  - attempted `Regenerate page beats` while locked and confirmed the warning `Selected page beats is locked. Unlock it before regenerating, clearing, or overwriting it.`;
  - removed the temporary Page 1 beats lock afterward;
  - browser console warnings/errors remained empty during the Writer QA pass.

### Outstanding issues
- None for this implementation pass.

### Risks or caveats
- `src/portals/guided-comic/GuidedComicFlow.tsx`, `.agents/walkthrough.md`, and the plan document were already dirty or untracked outside this implementation slice; this pass did not revert or normalize unrelated work.
- Browser QA used the existing signed-in local issue data and avoided leaving the temporary lock in place.

### Operator follow-up
- Review the new Writer UX in a normal human pass, especially whether locks should block manual saves or only AI/destructive overwrites.

### Next steps
- Deploy only after the broader branch state is reviewed, because unrelated dirty files are present in the worktree.

## Writers Workshop concurrent pass tracker sync - 2026-06-08

### What changed
- Updated the active Writers Workshop UX edit/lock plan to record the nine approved passes as completed coordinated workstreams instead of leaving the plan in pre-implementation form.
- Added a complete `tasks.md` tracker section for the Writers Workshop UX Edit And Lock Plan, including pass-by-pass status, verification results, and the remaining human product-review follow-up.

### Files touched
- `docs/superpowers/plans/2026-06-08-writers-workshop-ux-edit-lock-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- No source code changed in this documentation sync.
- The status update preserves the original plan detail and adds a dated implementation-status section at the top so future agents can quickly distinguish planned work from completed work.
- The only open follow-up recorded is product judgment on whether locks should block manual saves or only AI/destructive overwrites.

### Verification
- Documentation-only verification:
  - Confirmed the active plan document contains `Implementation Status - 2026-06-08`.
  - Confirmed `tasks.md` contains `Writers Workshop — UX Edit And Lock Plan (2026-06-08) — COMPLETE`.
  - Confirmed this walkthrough section was appended.

### Outstanding issues
- None for the documentation sync.

### Risks or caveats
- No tests were rerun because this pass only updated project documentation.

### Operator follow-up
- Review the Writer lock semantics in normal product use and decide whether manual saves should be blocked by locks.

### Next steps
- No documentation-only next step remains; continue from product review or deployment review as needed.

## Prompt Library and Writer Verification Deploy Readiness - 2026-06-08

### What changed
- Re-ran the full local verification stack after the concurrent Writer edit/lock work landed in the worktree and the earlier Writer unused-symbol build blocker cleared.
- Confirmed the Prompt Library source-save fixes and Writer UX edit/lock work now build together locally.
- Attempted the production Cloudflare deploy path for Worker `asset-reference-comics-studio`.

### Files touched
- `tasks.md`
- `walkthrough.md`
- `.agents/walkthrough.md`

### Implementation notes
- No source code changes were required in this pass.
- `npm run build` now passes after the Writer edit/lock worktree reached a buildable state.
- `npx wrangler deploy --config ./wrangler.jsonc` reached Wrangler 4.80.0 but failed before upload because the local non-interactive environment does not have `CLOUDFLARE_API_TOKEN`.
- The Cloudflare plugin did not expose an alternate authenticated deployment tool in this session, so production deploy/live smoke remains operator-blocked rather than code-blocked.

### Verification
- `npm run build` - PASS.
- `npm run test` - PASS, 79 files / 429 tests.
- `npm run lint` - PASS with 67 existing warnings and 0 errors.
- `git diff --check` - PASS.
- `npx wrangler deploy --config ./wrangler.jsonc` - BLOCKED: Wrangler reported `Failed to fetch auth token: 400 Bad Request` and requires `CLOUDFLARE_API_TOKEN` in non-interactive mode.

### Outstanding issues
- Production Cloudflare deployment and live smoke are still pending because local Wrangler auth is unavailable.
- Human product review is still needed for whether Writer locks should block manual saves or only AI/destructive overwrites.

### Risks or caveats
- The branch remains dirty with Prompt Library fixes, Writer edit/lock implementation files, tracker updates, and walkthrough updates. This pass did not revert or normalize unrelated worktree changes.
- The local app was not re-smoked in Browser during this pass because the preceding QA passes already covered the Prompt Library source/save flows and Writer browser QA is documented in the immediately preceding Writer entry; this pass focused on build/test/lint/deploy readiness.

### Operator follow-up
- Provide/export a valid `CLOUDFLARE_API_TOKEN` for local Wrangler deploy, or trigger the connected Cloudflare Workers Build from a pushed/merged branch.
- After deploy, run live smoke on `https://asset-reference-comics-studio.onyxzion.workers.dev/` for Prompt Library CRUD, source saves, outbound handoffs, and Writer lock/export surfaces.

### Next steps
- Complete production deploy/live smoke once Cloudflare auth or dashboard build access is available.

## Prompt Library Cloudflare Deployment Verification - 2026-06-08

### What changed
- Verified the connected Cloudflare Worker deployment for `asset-reference-comics-studio` after the Prompt Library branch was pushed.
- Confirmed the live production URL serves the ARCS app and that the deployed JS/CSS asset bytes match the locally verified `dist` output.
- Updated the project tracker so deployment review is no longer listed as pending for this pass.

### Files touched
- `tasks.md`
- `walkthrough.md`
- `.agents/walkthrough.md`

### Implementation notes
- The dashboard screenshot supplied by the user showed active Cloudflare deployment version `2c6ac3b0`, deployed approximately one minute earlier, carrying the `codex/prompt library portal` deployment description.
- The live HTML at `https://asset-reference-comics-studio.onyxzion.workers.dev/` references `/assets/index-BRZgzHeH.js` and `/assets/index-DlsUrZzp.css`, matching the local verified build output.
- A Node-based hash comparison fetched every deployed `.js` and `.css` file under `/assets/` and compared it with local `dist/assets`.
- The first Node fetch attempt failed inside the sandbox with `ENOTFOUND`; the same read-only verification command passed when rerun with network access.
- This pass did not push the docs-only update, because pushing another commit could trigger a fresh Cloudflare deployment and require a new deployment verification loop.

### Verification
- `curl -sSI https://asset-reference-comics-studio.onyxzion.workers.dev/` - PASS, returned HTTP 200 from Cloudflare.
- `curl -sS https://asset-reference-comics-studio.onyxzion.workers.dev/` - PASS, returned `ARCS Expanded` HTML referencing the deployed Vite assets.
- Hash comparison of deployed JS/CSS against local `dist/assets` - PASS, 43 files checked / 43 matched / 0 mismatches.

### Outstanding issues
- Live authenticated Prompt Library CRUD/source-save/outbound handoff smoke on the production URL is still optional follow-up if the user wants end-to-end production interaction proof after the byte-level deployment check.
- Human product review is still needed for whether Writer locks should block manual saves or only AI/destructive overwrites.

### Risks or caveats
- The app does not currently embed an explicit git SHA/build marker in the runtime, so verification used Cloudflare dashboard context plus byte-for-byte deployed asset comparison instead of an in-app commit label.
- Direct local Wrangler deployment remains blocked without `CLOUDFLARE_API_TOKEN`, but the connected Cloudflare build path is confirmed live.

### Operator follow-up
- If a future push triggers a newer Cloudflare version, rerun the live URL and asset-hash verification for that new version.

### Next steps
- Run production authenticated smoke only if final product acceptance needs real CRUD/handoff interaction on the live URL rather than deployment verification.

## Prompt Library Production Auth Smoke Blocker - 2026-06-08

### What changed
- Began the next pass as production signed-in Prompt Library smoke against the live Cloudflare URL.
- Confirmed the deployed Prompt Library remains protected in production and requires an authenticated ARCS session.
- Attempted to create/sign in the requested ARCS agent account `codex.ai@onyxzhuzh.com`.
- Recorded the live-smoke blocker in `tasks.md`.

### Files touched
- `tasks.md`
- `walkthrough.md`
- `.agents/walkthrough.md`

### Implementation notes
- The production app loaded successfully at `https://asset-reference-comics-studio.onyxzion.workers.dev/` and showed the protected Prompt Library sign-in gate.
- The live ARCS sign-up flow accepted the agent email/password submission but returned to the sign-in form; a follow-up sign-in attempt returned `Invalid login credentials`.
- A direct Supabase Auth probe using the app's public anon client confirmed the underlying state: sign-in failed, sign-up succeeded, a user id was returned, no session was issued, and one identity was present.
- The absence of a session after successful sign-up means Supabase email confirmation is required before this account can be used for live Prompt Library CRUD.
- No password was written to repository documentation.

### Verification
- Browser QA: live Prompt Library route shows `Sign in to continue` for production.
- Direct Supabase Auth probe: `signUpOk: true`, `signUpUserIdPresent: true`, `signUpSessionPresent: false`, `signUpIdentitiesCount: 1`.
- Direct Supabase Auth probe: `signInError: Invalid login credentials` before email confirmation.

### Outstanding issues
- Production authenticated Prompt Library CRUD/source-save/outbound handoff smoke is blocked until `codex.ai@onyxzhuzh.com` is confirmed from its email inbox or the user explicitly approves an admin-side confirmation path.
- Human product review is still needed for whether Writer locks should block manual saves or only AI/destructive overwrites.

### Risks or caveats
- Because no authenticated production session exists yet, this pass did not create, edit, favorite, delete, or hand off live Prompt Library records.
- Manually confirming auth users through database/admin tooling should be treated as an operator-approved action, not an automatic workaround.

### Operator follow-up
- Open the confirmation email for `codex.ai@onyxzhuzh.com` and complete the confirmation link, then rerun production Prompt Library smoke.
- If the inbox confirmation path is unavailable, explicitly approve an admin-side confirmation/reset approach before continuing.

### Next steps
- After email confirmation, sign in on the live Cloudflare app and run production Prompt Library CRUD plus one source-save and one outbound-use handoff smoke, then clean up the temporary prompt record.

## Prompt Library Production Auth Follow-up - 2026-06-08

### What changed
- Confirmed that a temporary password was generated during the ARCS agent account sign-up attempt and was not written to repository documentation.
- Retried production auth after the user reported that `codex.ai@onyxzhuzh.com` was email-confirmed.
- Narrowed the remaining blocker from email confirmation to an unusable/unknown password or an auth-admin reset requirement.

### Files touched
- `tasks.md`
- `walkthrough.md`
- `.agents/walkthrough.md`

### Implementation notes
- The in-app Browser could open the live production Prompt Library auth modal, but text entry into the auth fields failed because this Browser session reports `Browser Use virtual clipboard is not installed` for both `fill` and `type` paths.
- A direct Supabase Auth sign-in probe using the same app anon client still returned `Invalid login credentials` after email confirmation was reported.
- Supabase CLI is installed locally, but `supabase projects list -o json` reported `Access token not provided`, so CLI admin inspection/reset is not available in this session.
- No service-role key or local admin auth helper was found in repo environment files.

### Verification
- Browser QA: production Prompt Library auth modal remains reachable on the live Cloudflare URL.
- Direct Supabase Auth probe: sign-in for `codex.ai@onyxzhuzh.com` still returned `Invalid login credentials`.
- `supabase projects list -o json` - BLOCKED: `Access token not provided`.
- `rg -n "service_role|SUPABASE_SERVICE|SERVICE_ROLE|auth\\.admin|resetPassword|updateUser|inviteUser|createUser" .env* supabase src package.json` - no local service-role/admin helper found.

### Outstanding issues
- Production authenticated Prompt Library CRUD/source-save/outbound handoff smoke remains blocked until the ARCS agent account has a known working password or an authenticated admin path is approved and available.
- Human product review is still needed for whether Writer locks should block manual saves or only AI/destructive overwrites.

### Risks or caveats
- The temporary password generated during signup should be treated as disposable and rotated once access is established.
- Because the Browser typing path is currently blocked by the missing virtual clipboard, a working password may still need to be verified through direct Supabase Auth or another browser surface if the in-app Browser cannot type.

### Operator follow-up
- Use the ARCS/Supabase password reset flow for `codex.ai@onyxzhuzh.com`, or provide the password set during confirmation if one was created.
- Alternatively, re-authenticate the Supabase MCP/CLI and explicitly approve an admin-side reset/confirmation path.

### Next steps
- Once a working password exists, run production Prompt Library CRUD plus one source-save and one outbound-use handoff smoke, then clean up temporary prompt records.

## Prompt Library Production Chrome Smoke Complete - 2026-06-08

### What changed
- Completed live production Prompt Library smoke on the deployed Cloudflare Worker using the user's real Chrome session.
- Verified the ARCS agent session is active in production as `codex.ai@onyxzhuzh.com`.
- Ran production Prompt Library CRUD, reload persistence, outbound handoff, source-save, and cleanup checks.
- Updated `tasks.md` so production live smoke is marked complete instead of auth-blocked.

### Files touched
- `tasks.md`
- `walkthrough.md`
- `.agents/walkthrough.md`

### Implementation notes
- Claimed the user's Chrome tab with title `ARCS Expanded` and URL `https://asset-reference-comics-studio.onyxzion.workers.dev/`.
- Chrome landed in Writers' Workshop with the `CO` signed-in profile button, confirming the real browser session was authenticated.
- The live Prompt Library initially showed `Database connected. Create your first prompt.` with `0` prompts for the agent account.
- Created temporary prompt `QA Production Prompt 1780965189825`, saved it to Supabase, and observed `Prompt saved to Supabase.`
- Reloaded the live app, reopened Prompt Library, and confirmed the prompt rehydrated from Supabase with `Database library synced.`
- Edited the same prompt body and confirmed version history updated to `v2 Saved from editor` above `v1 Initial draft.`
- Favorited the prompt and confirmed Favorites count moved to `1` with `Prompt favorited.`
- Sent the prompt through outbound `Use in Imageshop`; Imageshop loaded the prompt and displayed `Loaded "QA Production Prompt 1780965189825" from Prompt Library.` with the edited marker in the prompt workspace.
- From Imageshop, used `Save to Prompt Library`; the source-save editor opened with provenance `Imageshop · Imageshop item 1`, saved a second temporary source prompt, and displayed `Prompt saved to Supabase.`
- Deleted the Imageshop source-save record and the original QA prompt. Final production Prompt Library reload showed `0` prompts, `0` favorites, `0` collections, and `0` entities, and the QA marker was absent.

### Verification
- Chrome production QA: signed-in session visible as `CO` / `codex.ai@onyxzhuzh.com`.
- Chrome production QA: create/save showed `PROMPTS 1` and `Prompt saved to Supabase.`
- Chrome production QA: reload persistence showed the saved prompt after reopening Prompt Library.
- Chrome production QA: edit/versioning showed `v2 Saved from editor` and the edited marker.
- Chrome production QA: favorite showed `FAVORITES 1` and `Prompt favorited.`
- Chrome production QA: outbound `Use in Imageshop` loaded the prompt marker into Imageshop.
- Chrome production QA: Imageshop source-save created a second Prompt Library record with source context `LAB`.
- Chrome production QA: cleanup deleted both temporary records and final reload showed the account returned to empty Prompt Library state.

### Outstanding issues
- Human product review is still needed for whether Writer locks should block manual saves or only AI/destructive overwrites.
- Standalone Prompt Library deletion still requires explicit user approval; ARCS production Prompt Library is now deployed and smoke-tested.

### Risks or caveats
- Chrome automation had to use direct DOM-node clicks for the left-nav Prompt Library item after reload because role-based clicks sometimes landed on Reference Vault in this browser session.
- The edited QA prompt body duplicated the original sentence before the edit suffix during automation typing, but the edit/versioning behavior still proved persistence and `v2` creation.
- The Imageshop source-save title also retained the original `Imageshop item 1` prefix before the QA suffix during automation typing, but the saved source record still proved source provenance and Prompt Library persistence.

### Operator follow-up
- Rotate or store the `codex.ai@onyxzhuzh.com` ARCS password according to the team's preferred credential practice.
- Decide whether the standalone Prompt Library can be archived/deleted now that ARCS production deploy, CRUD, outbound handoff, source-save, and cleanup smoke have passed.

### Next steps
- Complete the remaining Writer lock product review, then decide whether to remove the standalone Prompt Library.

## Prompt Library Archive Deletion and Writer Lock Decision - 2026-06-08

### What changed
- Recorded the product decision that Writer locks should block all saves, including manual saves, to prevent accidental overwrites.
- Deleted the standalone Prompt Library archive folders now that ARCS production Prompt Library deploy, CRUD, persistence, outbound handoff, source-save, and cleanup smoke have passed.
- Updated `tasks.md` so the Writer lock product decision and standalone archive deletion are no longer open follow-ups.

### Files touched
- `tasks.md`
- `walkthrough.md`
- `.agents/walkthrough.md`
- Deleted outside this repo:
  - `/Users/apoaaron/Documents/New project 3`
  - `/Users/apoaaron/Documents/Prompt Library`

### Implementation notes
- The active ARCS Prompt Library remains in `src/portals/prompt-library/**`; only the standalone archive/project copies outside the ARCS workspace were removed.
- The in-repo `archived/gpt-image-2-worker/` folder was not removed because it is unrelated to the standalone Prompt Library archive.
- No Writer source files were changed in this pass because another agent is actively working on Writers Workshop.

### Verification
- Confirmed `/Users/apoaaron/Documents/New project 3` and `/Users/apoaaron/Documents/Prompt Library` no longer exist after deletion.
- Confirmed `tasks.md` records the Writer lock decision and standalone Prompt Library archive deletion.
- Confirmed this walkthrough entry was appended.

### Outstanding issues
- Writer implementation still needs to enforce the accepted product decision that locks block all saves; that work is left to the active Writers Workshop agent.

### Risks or caveats
- The standalone archive deletion is filesystem-only and outside this repo, so the removal itself is not represented in Git history for the ARCS workspace.
- If the standalone Prompt Library needs to be recovered later, it will need to come from backup, Git remote/history, or other external source.

### Operator follow-up
- Tell the Writers Workshop agent that the accepted lock behavior is: locks block all saves, not only AI/destructive overwrites.

### Next steps
- Let the Writers Workshop agent implement and verify lock-blocks-all-saves behavior.

## Writers Workshop issue visual references for beats - 2026-06-08

### What changed
- Added issue-level visual references for Writers Workshop so creators can attach Character Vault and Asset Vault images to the active issue before generating page beats.
- Added a Foundation Hub `Visual references for this issue` surface with vault source selection, saved-image selection, character/location/prop role selection, optional notes, attached-reference thumbnails, remove controls, and an AI context preview.
- Stored attached references under `writer_issues.notes.writer_visual_references`, preserving existing notes metadata and avoiding a schema migration.
- Non-destructively sync attached reference labels into synopsis helper fields: character references append to cast goals, location references append to locations, and prop/asset references append to outline rules.
- Updated `writer-tools` page-beat generation so attached issue references become hard visual canon. The Edge function reads the issue notes, fetches up to six attached image URLs, sends them to Gemini as `inlineData` image parts, and also includes a text digest for references that cannot be fetched.
- Updated Writer help copy so page beats are described as using attached visual references in addition to outline, cast, and locations.

### Files touched
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerVisualReferences.ts`
- `src/portals/writer/__tests__/writerVisualReferences.test.ts`
- `src/portals/writer/writerHelpRegistry.tsx`
- `supabase/functions/writer-tools/index.ts`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The new notes key is `writer_visual_references`.
- Supported sources in this pass are `character_vault` and `asset_vault`; NPC Vault is not included yet because its persistence path is local/session-oriented rather than the stable album API used by Character and Asset vaults.
- Beat generation remains backward-compatible because existing `page_beats` and `page_beats_issue` requests do not need new request fields; the Edge function reads visual references from the issue row it already loads.
- Image attachment is capped at six references per beat-generation call, with a 4 MB per-image fetch cap. Skipped images are named in the prompt as skipped while the text reference digest remains available.
- If the browser/local vault uses non-fetchable local URLs, writer-tools will still include the label/source/URL text digest but will not be able to attach image bytes.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/writerVisualReferences.test.ts` - PASS, 1 file / 3 tests.
- `npm run test -- --run src/portals/writer/__tests__/writerVisualReferences.test.ts src/portals/writer/__tests__/writerProtectionLocks.test.ts src/portals/writer/__tests__/writerDraftPersistence.test.ts src/portals/writer/__tests__/writerRegenerationScope.test.ts src/portals/writer/__tests__/writerStorySnapshots.test.ts` - PASS, 5 files / 11 tests.
- `npm run build` - PASS.
- `npm run lint` - PASS with existing repository warnings only; no errors.
- Browser smoke at `http://127.0.0.1:5175/` - PARTIAL: local app loaded as `ARCS Expanded`, Writers Workshop navigation selected, and console warnings/errors were empty. The in-app browser session was signed out, so the issue workspace and new attach controls could not be exercised live in that session.

### Outstanding issues
- Signed-in browser QA should still attach at least one Character Vault and one Asset Vault image to a real Writer issue, reload the issue, verify persistence, and run a page-beat generation call to confirm the Edge function accepts the multimodal payload.
- NPC Vault issue attachments are not included in this pass.

### Risks or caveats
- Existing deployed `writer-tools` will not use the new visual-reference image payload until the Supabase Edge Function is deployed.
- Gemini image fetches depend on attached vault image URLs being server-fetchable by the Edge runtime.

### Operator follow-up
- Deploy the updated `writer-tools` function before relying on visual-reference-aware beat generation in production.
- Run signed-in manual QA with real vault images after deployment.

### Next steps
- Add NPC Vault support if those references need the same issue-level canon behavior.

## Writers Workshop writer-tools visual reference deploy - 2026-06-08

### What changed
- Deployed the updated Supabase Edge Function `writer-tools` so hosted Writer page-beat generation can read `writer_issues.notes.writer_visual_references` and send attached vault images/text as visual canon.
- Updated `tasks.md` to record the deployed Supabase function version.

### Files touched
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- Deployment target was Supabase project `vxclogwiytxjolisnakd`.
- Deploy command used `--use-api` to avoid local Docker and `--no-verify-jwt` to match `supabase/config.toml`; the function still validates the signed-in user token internally.
- Supabase uploaded `supabase/functions/writer-tools/index.ts` and `supabase/functions/_shared/writerSchemas.ts`.

### Verification
- `supabase functions deploy writer-tools --project-ref vxclogwiytxjolisnakd --use-api --no-verify-jwt` - PASS.
- `supabase functions list --project-ref vxclogwiytxjolisnakd` - PASS; `writer-tools` is ACTIVE version 48, updated `2026-06-08 22:09:57 UTC`.

### Outstanding issues
- Signed-in app QA should still attach real Character/Asset Vault references to an issue and run page-beat generation to verify the deployed multimodal path end to end.

### Risks or caveats
- No local code tests were rerun during this deployment-only step; the preceding implementation pass already ran focused tests, build, lint, and partial browser smoke.

### Operator follow-up
- Run a signed-in Writer issue test with attached vault references when convenient.

### Next steps
- Add NPC Vault support if those references need the same issue-level canon behavior.

## Writers Workshop visual-reference QA pass - 2026-06-08

### What changed
- Performed a QA pass for the Writers Workshop visual-reference work after deploying `writer-tools`.
- Confirmed the deployed function still requires a signed-in user JWT even though Supabase Edge `verify_jwt` is disabled in config; the function validates the token internally before touching RLS-protected Writer data.
- Attempted a disposable end-to-end live data setup for a temporary Writer issue plus Character/Asset Vault references, but Supabase Auth returned an email-confirmation-only signup with no usable session, so the live page-beat invocation could not proceed.
- Ran local browser smoke through the in-app Browser against the Vite app and confirmed the hub and Writers Workshop auth gate render instead of a blank or framework-error page.
- Updated `tasks.md` to mark this as a partial QA pass with the remaining authenticated live issue/vault interaction called out.

### Files touched
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- No source code changed during this QA pass.
- The failed disposable live-data attempt did not create Writer, Character, or Asset rows because the script stopped before authenticated inserts. It may have created one unconfirmed temporary Supabase Auth user (`830490ca-681d-41d8-a16f-e7bb9a2d17f8`) that could not be deleted from the anon-auth path.
- Browser QA used local dev server `http://127.0.0.1:5174/`.
- The in-app Browser session was signed out, so the protected Writer issue workspace and new visual-reference attach controls were not reachable in-browser.

### Verification
- Disposable Supabase Auth E2E attempt - BLOCKED: `signUp` returned no session, likely because email confirmation is required.
- Authenticated QA account retry - BLOCKED: `codex.ai@onyxzhuzh.com` sign-in returned `Invalid login credentials` against the repo's configured Supabase project, so no temporary Writer/Vault rows were created and no live `page_beats` invocation ran.
- Local ARCS app login retry - BLOCKED: using the same `codex.ai@onyxzhuzh.com` ARCS credentials through the local `http://127.0.0.1:5174/` in-app browser sign-in form also returned `Invalid login credentials`. The sign-in fields were cleared and the modal was closed before stopping.
- External Chrome production session - PARTIAL: the production ARCS tab at `https://asset-reference-comics-studio.onyxzion.workers.dev/` was signed in as `CO` and loaded Writers Workshop. It included the earlier edit/lock/export UX, but the page text did not contain `Visual references for this issue`, `Attach reference`, `Character Vault`, `Asset Vault`, or `writer_visual_references`, so the visual-reference UI could not be tested there.
- Production disposable data note: the signed-in production Writer UI created one temporary `Untitled series` and issue `#1` while checking the Library workflow. Browser automation timed out during the delete click, and the Supabase CLI available in this repo does not expose a safe direct `db query` command for narrow cleanup. Manual cleanup may be needed from the Writer Library panel or Supabase dashboard.
- Function auth inspection - PASS: `writer-tools` returns `Missing JWT`/`Invalid JWT` paths before request handling when no valid signed-in token exists.
- Browser smoke at `http://127.0.0.1:5174/` - PARTIAL PASS: app title `ARCS Expanded`; hub rendered; Writers Workshop click opened `Sign in to continue`; no blank page or framework overlay.
- Browser console - PASS WITH NOTE: no errors; one Supabase auth-lock recovery warning appeared during startup.
- Screenshot evidence - captured and emitted for the signed-out Writers Workshop auth gate.
- `npm run test -- --run src/portals/writer/__tests__/writerVisualReferences.test.ts src/portals/writer/__tests__/writerProtectionLocks.test.ts src/portals/writer/__tests__/writerDraftPersistence.test.ts src/portals/writer/__tests__/writerRegenerationScope.test.ts src/portals/writer/__tests__/writerStorySnapshots.test.ts` - PASS, 5 files / 11 tests.
- `git diff --check` - PASS.
- `npm run build` - PASS with the existing large chunk warning.
- `npm run lint` - PASS with 0 errors and 67 existing warnings.

### Outstanding issues
- Authenticated live QA is still required with a reusable signed-in QA account or existing signed-in browser session:
  - attach one Character Vault image and one Asset Vault image to a Writer issue;
  - reload the issue and confirm references persist in `writer_issues.notes.writer_visual_references`;
  - generate page beats and confirm the deployed Edge function accepts the visual-reference payload;
  - clean up temporary Writer/Vault rows afterward.

### Risks or caveats
- The most important end-to-end behavior, deployed multimodal beat generation with real issue/vault rows, remains unproven in this pass because there was no authenticated session available.
- The available authenticated production session cannot validate the visual-reference UI until the current local UI changes are deployed to Cloudflare or the local origin has a valid signed-in session.
- The Browser console warning appears related to Supabase auth lock recovery and did not break rendering, but it should be watched if auth/session issues continue.

### Operator follow-up
- Provide or sign into a durable AI-agent/test Supabase account for Writer QA, or run the remaining live issue/vault steps from the existing signed-in Chrome session.
- Delete the temporary production Writer `Untitled series` / issue `#1` if it remains visible in the Library panel.
- Deploy the local visual-reference UI to the production Cloudflare app, or provide a working local-origin login, before rerunning authenticated visual-reference UI QA.

### Next steps
- Complete authenticated Writer visual-reference QA once a reusable signed-in session is available.

## Writers Workshop signed-in visual-reference QA completion - 2026-06-09

### What changed
- Completed the previously blocked authenticated Writers Workshop visual-reference QA using the user's signed-in in-app browser session at `http://127.0.0.1:5174/`.
- Created a disposable Writer issue `Visual Reference QA Issue 1780974238329` under a temporary `Untitled series`, added Page 1, and attached two issue-level visual references from existing vault records:
  - Character Vault: `Alpha Swag Aries` / `Aries` (`CHAR_ARIES_01`).
  - Asset Vault: `Expanded View of Prime Hall` / `IDO` (`ASST_IDO_01`) with role `Location / set`.
- Confirmed the Foundation Hub visual-reference block showed `2 attached`, displayed both reference cards, and exposed an AI context preview before generation.
- Reloaded the local app, reopened Writers Workshop, and confirmed the signed-in session, selected issue/page, and both attached references persisted.
- Ran live Page 1 beat generation from the Beats workspace with director notes explicitly requiring `Alpha Swag Aries` and `Expanded View of Prime Hall` as visual references.
- Verified the generated Page 1 beats referenced both visual-canon inputs and described the character/design and Prime Hall location across panel text, proving the deployed `writer-tools` path consumed the saved issue references.
- Updated `tasks.md` to mark the visual-reference QA pass complete with a cleanup caveat.

### Files touched
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- No source code changed during this QA completion pass.
- The signed-in browser showed visible direct edit controls (`Edit issue synopsis`, `Edit outline instructions`, `Edit Page 1 beats`, `Edit Page 1 dialogue`) and lock controls in the active Writer workspace while QA was running.
- The right workshop panel was collapsed by default; opening `Show workshop panels` exposed the Library delete controls, including `Delete issue #1` and `Delete series Untitled series`.
- Cleanup was intentionally paused because deleting the disposable issue/series removes real signed-in account data. The controls are visible and targeted, but deletion still needs explicit approval.

### Verification
- Signed-in local browser identity - PASS: in-app browser loaded `http://127.0.0.1:5174/` as the user's signed-in ARCS session with page title `ARCS Expanded`.
- Visual-reference attach - PASS: Character Vault `Alpha Swag Aries` and Asset Vault `Expanded View of Prime Hall` attached to the selected Writer issue and displayed as `2 attached`.
- Persistence after reload - PASS: reopening Writers Workshop restored the disposable issue, Page 1, and both attached references.
- Live beat generation - PASS: `Generate page beats` completed without UI or console errors. Output included `Alpha Swag Aries` and `Expanded View of Prime Hall` in the generated panel beats.
- Browser console - PASS: no warning/error entries were recorded during attach, reload persistence, or beat generation checks.
- Cleanup readiness - PARTIAL PASS: exact cleanup controls were found after expanding the workshop panel, but deletion was not performed without explicit approval.

### Outstanding issues
- Disposable local QA data remains in the signed-in account until cleanup is explicitly approved:
  - Series: `Untitled series`.
  - Issue: `#1 — Visual Reference QA Issue 1780974238329`.

### Risks or caveats
- The generated beat content proved the references reached the AI path, but this pass did not inspect database rows directly because Supabase SQL tooling was not available in this session and the user requested Supabase needs go through MCP or CLI.
- The temporary issue remains visible in the user's signed-in local Writer Library until deleted.

### Operator follow-up
- Approve deletion of the disposable local QA issue/series, or delete it manually from Writers Workshop Library using `Delete issue #1` and then `Delete series Untitled series`.

### Next steps
- None for visual-reference QA after cleanup is resolved.

## Prompt Library Quick Start Guide - 2026-06-09

### What changed
- Added a user-facing Prompt Library quick start guide with screenshot-backed walkthroughs for opening the library, creating prompts, reviewing saved records, searching/filtering/favoriting, sending prompts to Imageshop, saving Imageshop prompts back to the library, and using import/export safely.
- Captured six production screenshots from the live Cloudflare app while signed in as the ARCS agent account.
- Created and deleted a temporary guide demo prompt so the production Prompt Library account returned to zero prompts after screenshot capture.

### Files touched
- `docs/prompt-library-quick-start-guide.md`
- `docs/assets/prompt-library-quick-start/01-overview-empty-state.png`
- `docs/assets/prompt-library-quick-start/02-new-prompt-editor-filled.png`
- `docs/assets/prompt-library-quick-start/03-saved-prompt-detail.png`
- `docs/assets/prompt-library-quick-start/04-search-favorites-filter.png`
- `docs/assets/prompt-library-quick-start/05-imageshop-handoff.png`
- `docs/assets/prompt-library-quick-start/06-imageshop-save-to-library-editor.png`
- `walkthrough.md`
- `.agents/walkthrough.md`

### Implementation notes
- The guide is Markdown so it can live directly in the repo and render screenshots with relative links.
- Screenshots were captured from `https://asset-reference-comics-studio.onyxzion.workers.dev/`.
- The guide includes practical naming, tagging, collection, entity, favorite, versioning, handoff, source-save, import/export, and troubleshooting recommendations.
- The Creative Production plugin was available but was not a close fit for this task because its exposed widgets are style/shot/moodboard intake surfaces rather than product documentation generation.
- Product Design was referenced by the user, but no concrete Product Design callable surfaced in this session; the guide was produced from the live UI and repo source instead.

### Verification
- Chrome production screenshot pass: captured Prompt Library empty state, prompt editor, saved detail, search/favorites filter, Imageshop handoff, and Imageshop source-save editor.
- Cleanup verification: after deleting the temporary guide prompt, the production Prompt Library showed `0` prompts, `0` favorites, `0` collections, and `0` entities.
- Filesystem verification: confirmed the six screenshot assets exist under `docs/assets/prompt-library-quick-start/`.

### Outstanding issues
- The guide is drafted but not yet committed or pushed.
- The screenshots demonstrate core flows but do not include Character Studio or Asset Studio target screens.

### Risks or caveats
- Two modal screenshots are partially cropped by the current Chrome viewport because the Prompt Library editor is wider than the visible production window; the fields and workflow remain visible enough for the guide.
- Existing uncommitted Writer files and Writer docs from another agent remain in the working tree and were not modified intentionally.

### Operator follow-up
- Review the guide for tone and completeness, especially whether it should also become a Canva/PDF handout.

### Next steps
- Optionally add Character Studio and Asset Studio handoff screenshots in a future pass.

## Writers Workshop Focused UX Reset - 2026-06-09

### What changed
- Added a tested `Dashboard` workspace as the default Writers Workshop entry point.
- Added a first-class `Visual Canon` workspace and Dashboard card so issue visual references are no longer buried inside Foundation Hub.
- Renamed the Writer view split from `Guided / Advanced` to `Focused / All Tools`.
- Made Focused mode hide the full ribbon and production map while preserving them in All Tools.
- Added a persistent top `Series / Issue / Page` selector strip so users can switch series without opening the right dock.
- Compactly surfaced issue/page edit and lock status in Focused mode while keeping the full edit/lock strip in All Tools.
- Updated Writer help copy for Focused / All Tools, Visual Canon, top selectors, and Export.
- Added a durable UX location guide mapping old tool locations to new Focused locations.
- Added a focused implementation tracker for this UX reset and synced `tasks.md`.

### Files touched
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerSearch.ts`
- `src/portals/writer/writerWorkflowChronology.ts`
- `src/portals/writer/writerNextStep.ts`
- `src/portals/writer/writerHelpRegistry.tsx`
- `src/portals/writer/__tests__/writerWorkspaceModel.test.ts`
- `src/portals/writer/__tests__/writerWorkflowChronology.test.ts`
- `docs/writers-workshop-focused-ux-guide.md`
- `docs/superpowers/plans/2026-06-09-writers-workshop-focused-ux-reset-plan.md`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The existing visual-reference storage key remains `writer_issues.notes.writer_visual_references`.
- No Supabase migration or `writer-tools` prompt change was made.
- Focused mode persists in local storage under `writerPortalViewMode`; All Tools remains available for raw JSON, batch actions, diagnostics, and dense navigation.
- The Visual Canon workspace reuses the existing attach/remove/reference digest logic, with the AI context preview shown only in All Tools.
- Browser QA used the signed-in local in-app browser session. The non-persistent series-switch check changed the selected series and then restored the original selection; no issue/reference data was created or deleted during this pass.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts` - PASS.
- `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerVisualReferences.test.ts` - PASS.
- `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerVisualReferences.test.ts src/portals/writer/__tests__/writerProtectionLocks.test.ts src/portals/writer/__tests__/writerDraftPersistence.test.ts src/portals/writer/__tests__/writerRegenerationScope.test.ts` - PASS, 6 files / 15 tests.
- `npm run test` - PASS, 81 files / 434 tests.
- `npm run build` - PASS with existing large chunk warnings.
- `npm run lint` - PASS with 0 errors and 67 existing warnings.
- `git diff --check` - PASS.
- Browser QA at `http://127.0.0.1:5174/` - PASS: Writers Workshop opens to the Dashboard in Focused mode; Series / Issue / Page selectors are visible without the dock; Visual Canon is reachable from Dashboard and the Focused rail; All Tools restores the ribbon and production map; Focused hides them again; series switching worked and was restored.

### Outstanding issues
- No new visual reference was attached during this smoke pass to avoid creating extra signed-in account data.
- Deployment has not been performed for this branch.

### Risks or caveats
- The previous live QA already proved the visual-reference AI bridge. This pass moved the UI and reused that same storage/bridge path, but did not run a fresh beat-generation call with newly attached references.
- The initial focused screen is meaningfully quieter, but WriterPortal remains a large component and should eventually be split into smaller workspace components.

### Operator follow-up
- Review the Focused Dashboard and Visual Canon workspace in the browser for subjective density and wording.
- Decide whether this branch should be merged into the current Prompt Library branch or rebased onto `origin/main` before PR/push.

### Next steps
- Commit, push, and open a PR when the branch base is confirmed.

## Writers Workshop Focused UX Main Merge - 2026-06-09

### What changed
- Fast-forwarded local `main` to `origin/main`.
- Merged `codex/writer-focused-ux-reset` into `main` with merge commit `b536403`.
- Resolved conflicts in `src/portals/writer/WriterPortal.tsx`, `tasks.md`, and `walkthrough.md`.
- Preserved the Focused / All Tools Writer UX, Dashboard, Visual Canon workspace, top Series / Issue / Page selectors, visual-reference bridge, and Writer lock/draft safeguards.
- Removed a merge-introduced duplicate `export` tab entry from `WRITER_WORKSPACE_TAB_ORDER`.
- Pushed `main` to GitHub so Cloudflare Builds can deploy from the production branch.
- Updated `tasks.md` to mark the focused Writer UX reset as merged to main.

### Files touched
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerSearch.ts`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The merge brought along the already-committed branch changes for `AGENTS.md` DOX instructions and `.codex/environments/environment.toml` Supabase action.
- The generated `supabase/functions/tsconfig.tsbuildinfo` file changed during build verification and was restored before commit.
- Local browser smoke confirmed the merged app opens Writers Workshop with the new dashboard, top selectors, `All Tools` label, and `Visual Canon` entry. The browser’s remembered local mode affected which mode label was visible, but the old `Guided / Advanced` label was not present.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerVisualReferences.test.ts src/portals/writer/__tests__/writerProtectionLocks.test.ts src/portals/writer/__tests__/writerDraftPersistence.test.ts src/portals/writer/__tests__/writerRegenerationScope.test.ts` - PASS, 6 files / 15 tests.
- `npm run test` - PASS, 81 files / 434 tests.
- `npm run build` - PASS with existing large chunk warnings.
- `npm run lint` - PASS with 0 errors and 67 existing warnings.
- `git diff --check` - PASS.
- Local browser smoke at `http://127.0.0.1:5174/` - PASS for merged-main Writer dashboard, top selectors, and Visual Canon visibility.

### Outstanding issues
- None.

### Risks or caveats
- The production in-app browser smoke was stopped by the signed-out production auth gate, so deployed UI verification used bundle/hash evidence rather than an authenticated live account clickthrough.

### Operator follow-up
- Sign into the deployed live site and check Writers Workshop from the normal account session.

### Next steps
- Continue subjective UX QA on the deployed Writers Workshop portal.

### Deployment verification update
- Production Worker URL: `https://asset-reference-comics-studio.onyxzion.workers.dev/`
- Live `index.html` initially served the old `/assets/index-BRZgzHeH.js` bundle, then updated at poll attempt 8 to `/assets/index-B7XZBLbN.js`, matching the merged local production build.
- The deployed `/assets/WriterPortal-P4xjwUW7.js` bundle was reachable from production and contained the new `Visual Canon`, `Focused`, and `All Tools` strings.
- The in-app browser opened the deployed site but was signed out on the production origin and displayed the protected-workspace sign-in gate.

## Writers Workshop And Imageshop QoL Pass - 2026-06-09

### What changed
- Writers Workshop now stores the last selected series, issue, page, and workspace tab in `localStorage` under `writerPortalLastWorkspace`.
- Writers Workshop no longer silently falls back to the first series, issue, or page when there is no valid saved selection.
- Replaced the top Series / Issue / Page native selects with type-to-search combobox menus.
- Visual Canon now filters Character Vault references by profile and Asset Vault references by collection before image selection.
- Visual Canon image selection is now multi-select, with `Select visible` and `Clear` controls, so multiple cast/asset references can be attached to an issue in one save.
- Imageshop import now reads the chosen file as a durable data URL and exposes `Upload original`, allowing direct vault upload without first running the generative `Process` step.
- Added an exploration backlog note for issue-alignment metadata in Character/Asset Vaults so one image can be tagged to multiple Writer books/issues later.

### Files touched
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/storyline/ImageshopImportPanel.tsx`
- `tasks.md`
- `walkthrough.md`

### Implementation notes
- The Writer last-workspace restore validates saved IDs against loaded rows. If a saved series/issue/page no longer exists, the UI stays unselected instead of jumping to the first record.
- The searchable Writer menus are local React controls inside `WriterPortal.tsx` and do not change database contracts.
- Visual Canon continues to persist references in `writer_issues.notes.writer_visual_references`; no Supabase migration was added.
- Direct Imageshop original upload reuses the existing Character/Asset/NPC vault save paths and tags processing metadata with `directUpload: true`.
- Issue-alignment for vault images was intentionally not implemented because it likely needs either metadata contract expansion or schema/UI work across Character Vault, Asset Vault, and Writer Visual Canon.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerVisualReferences.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` - PASS, 4 files / 38 tests.
- `npm run build` - PASS with existing large chunk warnings.
- `npm run lint` - PASS with 0 errors and 67 existing warnings.
- `git diff --check` - PASS.
- Browser smoke at `http://127.0.0.1:5174/` - PASS: Writers Workshop loads with no auto-selected first series, Series / Issue / Page are searchable comboboxes, and Visual Canon remains visible.
- Browser smoke at `http://127.0.0.1:5174/` - PASS: Imageshop Import tab exposes `Upload original`, `Process`, and `Save to vault`.

### Outstanding issues
- Issue-alignment in the vaults remains an exploration item.

### Risks or caveats
- Direct original upload depends on the browser successfully reading the selected file as a data URL before upload.
- Visual Canon multi-select was smoke-tested for UI presence and covered by existing visual-reference persistence tests, but no live vault attachment was performed in this quick pass.

### Operator follow-up
- Try Visual Canon with a real Character Vault profile containing multiple cast images and confirm the grouping language feels right.
- Decide whether issue-alignment should live in vault item metadata, a join table, or a Writer-owned notes bridge before implementation.

### Next steps
- Commit, push, and deploy this QoL pass after review.

## Writer Search Menu Overlay Hotfix - 2026-06-09

### What changed
- Fixed the Writer top selector comboboxes so a plain click/focus no longer opens the full dropdown list.
- Search menus now open when the user types or presses ArrowDown, preserving type-to-search behavior without covering the workflow rail on first click.
- Capped visible menu options to 12 and raised the dropdown z-index above the focused workflow rail when it is intentionally open.

### Files touched
- `src/portals/writer/WriterPortal.tsx`
- `walkthrough.md`

### Implementation notes
- The bug was caused by `WriterSearchableMenu` calling `setOpen(true)` on focus. A selected/filled Series input therefore opened the whole list immediately and visually collided with the rail/content beneath it.
- The selector strip now has a higher stacking context and the dropdown uses a higher z-index so intentional search results render above neighboring controls.

### Verification
- `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerVisualReferences.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` - PASS, 4 files / 38 tests.
- `npm run build` - PASS with existing large chunk warnings.
- `npm run lint` - PASS with 0 errors and 67 existing warnings.
- `git diff --check` - PASS.
- Browser reproduction at `http://127.0.0.1:5174/` - PASS: clicking the Series combobox focuses it, `aria-expanded` remains `false`, and `Clear selection` is not visible.
- Browser search check at `http://127.0.0.1:5174/` - PASS: typing `Untitled` in the Series combobox opens the filtered option list.

### Outstanding issues
- None.

### Risks or caveats
- Users who want to browse without typing can use ArrowDown to open the menu.

### Operator follow-up
- Recheck the deployed Writer Series field after Cloudflare deploys this hotfix.

### Next steps
- Commit, push, and verify the live Worker bundle.

## Writer And Imageshop Menu QA Follow-Up - 2026-06-09

### What changed
- Audited the visible Writers Workshop menu surfaces after the first overlay hotfix: Series, Issue, Page, Visual Canon Profile, Visual Canon Collection, Visual Canon Vault, Visual Canon Role, and the All Tools page selector.
- Fixed the Series and Issue search result metadata so dropdown rows show compact previews instead of raw long story/logline/synopsis text.
- Kept full series logline and issue synopsis text searchable via `searchText`, so compact menu display does not remove search coverage.
- Added explicit accessible labels to Writer menu option buttons and native select menus.
- Audited the Imageshop Import tab menu and added an explicit label to the art-style dropdown.

### Files touched
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/storyline/ImageshopImportPanel.tsx`
- `walkthrough.md`

### Implementation notes
- `WriterSearchableMenu` now supports a display `meta` and separate `searchText`.
- `compactWriterMenuMeta` normalizes whitespace and caps menu preview text, preventing an issue synopsis from becoming the visible menu body.
- Writer select labels added: `Choose Writer page`, `Choose visual canon vault source`, and `Choose visual canon reference role`.
- Imageshop Import select label added: `Choose import art style`.

### Verification
- Browser QA at `http://127.0.0.1:5174/` - PASS: clicking/focusing Writer comboboxes keeps `aria-expanded="false"` and shows no options.
- Browser QA at `http://127.0.0.1:5174/` - PASS: typing into Series, Issue, Page, Visual Canon Profile, and Visual Canon Collection opens bounded search results capped at 12 options.
- Browser QA at `http://127.0.0.1:5174/` - PASS: Issue menu option text is compact instead of the previous full synopsis/instructions block.
- Browser QA at `http://127.0.0.1:5174/` - PASS: visible Writer native selects expose explicit labels.
- Browser QA at `http://127.0.0.1:5174/` - PASS: Imageshop Import art-style dropdown exposes `Choose import art style`.
- `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerVisualReferences.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx` - PASS, 3 files / 35 tests.
- `npm run build` - PASS with existing large chunk warnings.
- `npm run lint` - PASS with 0 errors and 67 existing warnings.
- `git diff --check` - PASS.
- `git push origin main` - PASS, pushed `dd342e2 fix: tighten Writer menu previews`.
- `npm run deploy` - PARTIAL: build passed, Wrangler deploy was blocked because this terminal does not have `CLOUDFLARE_API_TOKEN`.
- Live Cloudflare poll - PASS: production `https://asset-reference-comics-studio.onyxzion.workers.dev/` switched from `/assets/index-49nOFr0K.js` to `/assets/index-DiiZaiK0.js` after the push.
- Live bundle check - PASS: deployed `WriterPortal-D8vNUBXP.js` contains the Writer select labels/compact menu code, and deployed `PhotoLab-BNrATPOM.js` contains `Choose import art style`.

### Outstanding issues
- None from the visible menu surfaces checked in this pass.

### Risks or caveats
- The audit focused on visible Writer/Visual Canon menus and Imageshop Import controls tied to the recent QoL work, not every hidden/native select elsewhere in the entire application.
- Browser screenshot capture timed out during the pass, so verification is based on DOM state, ARIA state, option counts, and visible control labels.
- Direct local Wrangler deployment remains unavailable in this terminal without `CLOUDFLARE_API_TOKEN`; this deployment landed through the connected Cloudflare build after pushing `main`.

### Operator follow-up
- Optional live UI recheck: type `#` in the Writer Issue menu and confirm it shows a short `#1 - The Blackening` preview, not the full issue synopsis.

### Next steps
- None for this pass.

## Cross-Portal Keyboard Shortcut QA - 2026-06-10

### What changed
- Audited the main portal keyboard surfaces for Return/Enter activation and common copy/paste behavior: Hub navigation, Writers' Workshop, Character Studio, Asset Studio, Reference Vault, Prompt Library, Illustrator's Imageshop, Comic Creator, Advanced Comic Creator, and Wiki ARC Portal.
- Fixed Prompt Library's prompt editor so Return in single-line fields saves the prompt when the required prompt body is present.
- Fixed Character Studio's custom tag field so Return saves the entered tag instead of doing nothing.
- Fixed Character Studio's DNA Lock and Asset Studio's Architectural Lock custom switches so both Space and Return toggle them, with `aria-pressed` exposed for assistive tech and QA.
- Fixed a Guided Comic layout panel selector so Space and Return select the panel the same way a click does.

### Files touched
- `src/portals/CharacterStudio.tsx`
- `src/portals/asset-studio/AssetStudioLivePromptPanel.tsx`
- `src/portals/guided-comic/GuidedComicFlow.tsx`
- `src/portals/prompt-library/PromptLibraryPortal.tsx`
- `walkthrough.md`

### Implementation notes
- Existing native buttons, tabs, selects, inputs, and textareas were left alone so browser-default Ctrl/Cmd+C, Ctrl/Cmd+V, and Return behavior remains intact.
- Existing shortcut handlers were confirmed in source for Writer workspace shortcuts, Character/Asset Ctrl/Cmd+Enter generation, Imageshop beat generation, Guided Comic paste targets, and Advanced Comic copy/cut/paste/delete/undo handling.
- Prompt Library now uses a real form submit plus an explicit form-level Enter handler for single-line inputs; textareas still keep normal newline behavior.
- Custom switch-like controls now expose `aria-label` and `aria-pressed` and support both Space and Return, matching expected keyboard control behavior.

### Verification
- Browser QA at `http://127.0.0.1:5174/` - PASS: Prompt Library opens from the sidebar and Return in the Title field saves/closes the prompt editor when prompt text is present.
- Browser QA at `http://127.0.0.1:5174/` - PASS: Character Studio DNA Lock toggles false -> true with Space and true -> false with Return.
- Browser QA at `http://127.0.0.1:5174/` - PASS: Asset Studio Architectural Lock toggles false -> true with Space and true -> false with Return.
- Browser/source QA - PASS: Hub cards and sidebar portal navigation use native buttons; Writer, Imageshop, Guided Comic, Advanced Comic, Reference Vault, and Wiki portal shortcut surfaces retain their existing native or explicit handlers.
- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/modes/comic/components/__tests__/MenuBar.test.tsx src/portals/prompt-library/lib/promptUtils.test.ts` - PASS, 3 files / 16 tests.
- `npm run build` - PASS with existing large chunk warnings.
- `npm run lint` - PASS with 0 errors and 67 existing warnings.
- `git diff --check` - PASS.
- `git push origin main` - PASS, pushed the keyboard shortcut QA commit to `main`.
- `npm run deploy` - PARTIAL: local build passed, but Wrangler upload was blocked because the terminal does not have `CLOUDFLARE_API_TOKEN`.
- Live Cloudflare verification - PASS: production `https://asset-reference-comics-studio.onyxzion.workers.dev/` loaded in the in-app browser and serves the current build entry bundle `/assets/index-Cdgey5K5.js`.

### Outstanding issues
- The browser tool could not type into the Character Studio custom tag input because its text-entry path reported a missing virtual clipboard, so that specific Return-to-save behavior is verified by source review and build rather than browser text entry.

### Risks or caveats
- This pass focused on common keyboard expectations and custom controls discovered by source/DOM audit. It did not add a full automated keyboard regression suite for every portal screen.
- Advanced Comic already has global copy/cut/paste/delete/undo handlers in `ComicLayout.tsx`; no Advanced Comic changes were needed.
- Direct local Wrangler deployment remains unavailable in this terminal without `CLOUDFLARE_API_TOKEN`; this production update landed through the connected Cloudflare build after `main` was pushed.
- Production protected-workspace spot checks require signing in on the live origin; the unsigned live browser session reached the sign-in gate.

### Operator follow-up
- Sign in on the live site and spot-check Prompt Library prompt editing, Character DNA Lock, Asset Architectural Lock, and Guided Comic layout panel selection.

### Next steps
- None for deployment; optional signed-in live smoke remains.
