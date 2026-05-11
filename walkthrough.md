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

## How to Use These Docs

| File | Use |
|------|-----|
| **tasks.md** | Checklist for Phases 10-13 and Critical Bug-Squash; tick off as you go. |
| **implementation_plan.md** | Where to change code (files, store, components) and how it fits the Konva/React/Zustand setup. |
| **walkthrough.md** | This file: big picture and roadmap for you and future agents. |

Cursor does not auto-update these files; update them (or ask the agent to) as you complete work so the roadmap stays accurate.
