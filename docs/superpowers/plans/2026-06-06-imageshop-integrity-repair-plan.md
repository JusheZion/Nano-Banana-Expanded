# Imageshop Integrity Repair Implementation Plan

> **For agentic workers:** Do not implement this plan until the user approves it. After approval, use test-driven development for each pass and update this document, `tasks.md`, and `walkthrough.md` as work lands.

**Goal:** Resolve the critical, high, medium, and low findings in the June 5 React integrity audit and signed-in Playwright QA without regressing the working Writer import, generation, Vault save, reload recovery, production board, or Guided image-assignment paths.

**Architecture:** Keep Imageshop inside the existing `lab` portal. Move generated image bytes out of synchronous web storage, compile one immutable generation request for preflight/provider/provenance, make reference semantics and failures explicit, repair page/panel and Guided return identity, then recenter and narrow the React surfaces after the data contracts are trustworthy.

**Tech stack:** React 19, TypeScript, Zustand, browser IndexedDB, Zod, Vitest, React Testing Library, existing Gemini image API bridge, existing Writer/Guided/Vault bridges.

**Approval status:** Approved by the user on 2026-06-06. Passes 1 through 6 are complete; Pass 7 is next.

---

## Source Evidence

- React integrity audit: `docs/superpowers/plans/2026-06-05-imageshop-react-integrity-audit.md`
- Signed-in Playwright report: `docs/superpowers/plans/2026-06-05-imageshop-playwright-qa-report.md`
- Screenshot evidence: `docs/superpowers/plans/assets/2026-06-05-imageshop-playwright-qa/`
- Completed feature plan under review: `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`
- Current repair tracker: `tasks.md`
- Current branch checkpoint: `03a7d1c docs: add live QA confirmation to Imageshop audits`

## Confirmed Repair Scope

This plan addresses every finding from both audits:

1. Duplicate generated image payloads in `localStorage` and `sessionStorage`.
2. Full production-history serialization on prompt keystrokes.
3. Preflight/provider/provenance prompt drift.
4. Unchecked or failed references reaching paid generation.
5. Reference lane labels not controlling provider semantics.
6. Serial reference download and encoding.
7. Failed-reference retry lacking reference ids.
8. Selected Writer panel output attaching to a detached generic item.
9. Batch counters reporting historical failures as current failures.
10. Guided return landing in Comic Library instead of the originating panel.
11. Generation cockpit horizontal clipping at `1600x900` and `1280x720`.
12. Beat-first initial hierarchy instead of a generation-first viewport.
13. Broad Zustand subscriptions and input-critical rerender scope.
14. Uploaded and pasted reference object URLs not being revoked.

## Guardrails

- Keep the existing `lab` route and portal identity.
- Do not add a Supabase schema migration.
- Do not change `ComicEditor`.
- Preserve existing Character, Asset, and NPC Vault save contracts.
- Preserve Writer production JSON/image-map compatibility.
- Preserve legacy `generateImage` callers outside Imageshop while adding the structured Imageshop path.
- A provider response must remain visible even if browser persistence fails afterward.
- Do not perform paid Gemini generation or destructive live Vault/Writer writes during implementation unless the user explicitly approves them.
- Keep diffs scoped to the audited contracts; do not turn this into a full Storyline or Guided Comic rewrite.

## Target Data Contracts

### Generated image storage

Add an asynchronous browser image repository backed by IndexedDB. One generated image receives one asset id, and both the session result and production version reference that same asset id.

Persisted Zustand metadata must not contain full `data:` or `blob:` image payloads. Runtime records may expose a resolved object URL for rendering, but persistence should retain only small metadata such as asset id, MIME type, byte length, and timestamps.

If IndexedDB is unavailable or quota-limited:

- keep the successful provider result in current runtime state;
- show a recovery warning that the result will not survive reload;
- do not retry synchronous base64 persistence in web storage;
- keep existing saves/downloads available from the runtime result.

### Compiled generation request

Introduce one Imageshop request object used by:

- prompt preflight;
- selected-panel generation;
- page/all batch generation;
- provider execution;
- prompt hash and provenance;
- retry diagnostics.

The request should contain the exact final prompt, model, aspect ratio, queue/source identity, ordered structured references, and provenance inputs. Callers must not separately rebuild or substitute the provider prompt after preflight.

### Structured references

Imageshop references should carry:

- reference id;
- chip id;
- label;
- lane;
- source type;
- image URL;
- provider role/instruction;
- preparation status;
- failure reason when preparation fails.

The Imageshop compiler should map Character DNA, Wardrobe, Environment, Props, Style, Lighting, and Canon lanes into deterministic provider instructions. Imageshop must not infer one global character/asset context from the presence of any character chip.

Reference preparation should run independent downloads/conversions concurrently with bounded concurrency and return per-reference results. The Gemini request must not begin when the default strict request still contains failed or unchecked references.

## File Responsibility Map

### New focused modules

- `src/portals/storyline/imageshopGenerationRequest.ts`
  - Own the compiled request type and exact prompt/reference/provenance assembly.
- `src/portals/storyline/imageshopReferenceCompiler.ts`
  - Map reference lanes to deterministic provider roles, ordering, limits, and retry subsets.
- `src/shared/utils/imageshopImageRepository.ts`
  - Store, restore, and remove generated image blobs through IndexedDB with quota-safe errors.
- `src/portals/storyline/hooks/useImageshopPromptDraft.ts`
  - Isolate editable prompt state from the persisted production-history store and commit at stable checkpoints.

### Existing files expected to change

- `src/stores/imageshopSessionStore.ts`
  - Persist image asset references and metadata, not full image payloads; expose restore status.
- `src/stores/imageshopProductionStore.ts`
  - Add persistence filtering/migration, shared image asset references, and queue-linked version recording.
- `src/shared/api/geminiImageApi.ts`
  - Accept prepared structured references for Imageshop, prepare references in parallel, and return per-reference failures while preserving legacy callers.
- `src/portals/storyline/imageshopPromptPreflight.ts`
  - Evaluate the compiled request and block unknown/failed reference preparation.
- `src/portals/storyline/imageshopBatchGeneration.ts`
  - Persist failed reference ids and derive summaries from the latest attempt per panel.
- `src/portals/storyline/GenericImageLabPanel.tsx`
  - Use the compiled request, record selected-panel versions on the matching item, isolate prompt drafts, and clean up object URLs.
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
  - Remove width assumptions that cause clipping and support the recentered full-width surface.
- `src/portals/storyline/components/ImageshopContextInspector.tsx`
  - Surface preparation state and reference-specific failure/retry information.
- `src/portals/storyline/StorylineStudio.tsx`
  - Move Image Lab/cockpit ahead of beat and library surfaces and replace the whole-store subscription with narrow selectors.
- `src/stores/imageWorkshopBridge.ts`
  - Preserve explicit Guided return workspace context when needed.
- `src/portals/guided-comic/GuidedComicFlow.tsx`
  - Restore issue workspace, active page, selected panel, and panel-focus mode when consuming an Imageshop return.

### Tests expected to expand

- `src/stores/__tests__/imageshopSessionStore.test.ts`
- `src/stores/__tests__/imageshopProductionStore.test.ts`
- `src/shared/api/__tests__/geminiImageDiagnostics.test.ts`
- `src/portals/storyline/__tests__/imageshopPromptPreflight.test.ts`
- `src/portals/storyline/__tests__/imageshopReferenceContext.test.ts`
- `src/portals/storyline/__tests__/imageshopBatchGeneration.test.ts`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `src/stores/__tests__/imageWorkshopBridge.test.ts`
- A focused Storyline layout test for source order and overflow.
- A focused Guided Comic return test for workspace restoration.

## Pass Checklist

Expected implementation: **7 passes after approval**.

### Pass 1: Quota-Safe Image Persistence

- [x] Write failing tests proving persisted session/production JSON contains no complete `data:` or `blob:` image payload.
- [x] Add the IndexedDB image repository and one shared asset id per generated result.
- [x] Add a backward-compatible Zustand migration that strips legacy persisted image payloads without dropping queue, prompt, provenance, or version metadata.
- [x] Restore cached images asynchronously after hydration and revoke restored object URLs when replaced, removed, or released on unmount.
- [x] Handle IndexedDB/quota failure after provider success without losing the visible result or disabling save/download.
- [x] Remove the production image-history payload from prompt-section persistence writes.
- [x] Verify storage tests plus a component test that simulates `QuotaExceededError`.

#### Pass 1 Results - 2026-06-06

- Added `src/shared/utils/imageshopImageRepository.ts` for one-copy IndexedDB blob persistence, shared asset ids, cached hydration URLs, and hydrated URL release.
- Session and production stores now persist metadata-only image references, strip nested attempt payloads, and migrate version 1 data without dropping non-image metadata.
- Generation records the same image asset metadata in the session result and production version. Quota failure keeps the runtime image visible and surfaces a reload-safety warning.
- Prompt fields now edit through `useImageshopPromptDraft`; the production workspace commits only at stable actions such as load, stage, and generate.
- The session strip now reports the count of reload-safe results instead of labeling every runtime result recoverable.
- Focused Imageshop audit suite: 8 files / 67 tests passed.
- Full suite: 62 files / 370 tests passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Signed-in browser smoke at `http://127.0.0.1:5174/` confirmed prompt editing, memory-only draft behavior across portal reload, committed prompt restoration, and no console warnings/errors. No paid generation or destructive write was performed.

### Pass 2: One Prompt And Generation Request Contract

- [x] Write failing tests asserting the prompt shown by preflight is byte-for-byte equal to the prompt passed to the provider and stored in provenance.
- [x] Add `ImageshopGenerationRequest` and compile it once for standalone, selected-panel, and batch generation.
- [x] Make selected-panel and batch preflight consume the compiled request instead of independently rebuilding prompt data.
- [x] Remove the `promptOverride` path that bypasses the normal preflight guard.
- [x] Ensure avoid-list, selected art style, continuity, canon, and page configuration instructions reach the provider exactly as displayed.
- [x] Keep prompt hashes and saved version prompts tied to the exact provider prompt.
- [x] Verify prompt composer, preflight, selected-panel, and batch component tests.

#### Pass 2 Results - 2026-06-06

- Added `src/portals/storyline/imageshopGenerationRequest.ts` with an immutable request contract containing the exact prompt, model, aspect ratio, context, source identity, ordered references, provider inputs, provenance inputs, and FNV-1a prompt hash.
- Standalone, selected-panel, page/all batch, and legacy production batch paths now compile one request and use its prompt for preflight, provider execution, session records, production versions, provenance, and attempt hashing.
- Removed the selected-panel `promptOverride` bypass. Every generation path evaluates its compiled request before calling the provider.
- Added red-green tests proving the displayed standalone prompt and composed panel/batch prompts include avoid-list, art style, continuity/canon, and page configuration and remain byte-identical through provider options and persisted metadata.
- Focused request and prompt suite: 5 files / 35 tests passed.
- Broader Imageshop audit suite: 10 files / 74 tests passed.
- Full suite: 63 files / 374 tests passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Signed-in non-paid browser smoke confirmed the compiled request preview contains generation mode, panel prompt, canon, art style, and page configuration with no console warnings/errors. Browser text entry was unavailable because the Browser Use virtual clipboard was not installed, so avoid-list live editing remained covered by component tests.

### Pass 3: Reference Semantics, Preparation, And Retry Attribution

- [x] Write failing tests for mixed Character DNA, Wardrobe, Environment, Props, Style, Lighting, and Canon lanes.
- [x] Add the lane-to-provider-role compiler with deterministic ordering and the existing maximum-reference guard.
- [x] Prepare independent references concurrently with bounded concurrency instead of serial awaits.
- [x] Return preparation results keyed by chip/reference id, including timeout, fetch, decode, and size failures.
- [x] Block provider execution while any included reference is unknown or failed.
- [x] Record failed reference ids on attempts and update the matching queue chips to `failed`.
- [x] Make `Retry without failed refs` remove the recorded ids from the next compiled request and provenance.
- [x] Verify provider-call suppression when one reference fails, exact lane mapping, parallel preparation, and meaningful retry payload changes.

#### Pass 3 Results - 2026-06-07

- Added a deterministic seven-lane provider compiler for Character DNA, Wardrobe, Environment, Props, Style, Lighting, and Canon references while retaining the 14-reference guard.
- Added bounded-concurrency reference preparation with ordered output and per-reference results keyed by reference id. Timeout, fetch, decode, and decoded-size failures retain the failed id and actionable message.
- Added the structured Imageshop path to `generateImage`; prepared images are encoded immediately after their exact lane instruction while legacy positional callers remain unchanged.
- Standalone, selected-panel, legacy production batch, and page/all panel batch generation now wait for all included references to become ready before calling Gemini.
- Panel preparation results update only the matching queue chips. Batch attempts record both included reference ids and failed reference ids.
- `Retry without failed refs` recompiles the immutable request from the surviving ids, changes its prompt hash/provider payload, and records provenance containing only the references actually used.
- Removed duplicate `Reference targets` text from the panel base prompt so reference inclusion is owned solely by the immutable request compiler.
- Focused Pass 3 suites passed, including provider suppression, lane ordering, bounded parallel work, API payload ordering, queue-chip attribution, and meaningful retry payload/provenance changes.
- Full suite: 65 files / 390 tests passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Signed-in non-paid browser smoke at `http://127.0.0.1:5173/` confirmed Imageshop, prompt preflight, and generation controls rendered at the default 1280px viewport with no horizontal document overflow and no console warnings/errors.
- The UI critic review left the existing generation-first hierarchy and cockpit-density work scoped to Pass 6; no unrelated layout changes were added here.

### Pass 4: Page/Panel Version And Batch State Integrity

- [x] Write a failing selected-panel test reproducing the detached `Imageshop item N` version.
- [x] Route selected-panel generation through `ensureProductionItemForPanel` and record the version on the production item whose `sourceId` is the panel queue id.
- [x] Keep the queue panel, production board, current version, session result, and Writer image map synchronized after generation.
- [x] Add a latest-attempt-per-panel selector for batch summaries and retry eligibility.
- [x] Preserve historical attempts for diagnostics while reporting current generated/failed/skipped counts from each panel's latest attempt.
- [x] Update the existing component assertion so a successful retry clears the current failed count and disables stale retry actions.
- [x] Verify production board, Writer map/return, and batch recovery tests.

#### Pass 4 Results - 2026-06-07

- Selected-panel generation now resolves its source panel from the current queue and records the generated version on the grouped production item whose `sourceId` matches that panel queue id. It no longer creates a detached generic `Imageshop item N`.
- The selected panel, grouped production item, current version, production board row, session result provenance, and Writer image-map return now share the same queue item and version identity.
- Added `getLatestImageshopBatchAttempts` as the current-state selector while retaining the complete attempt array for diagnostics and elapsed-time history.
- Batch result counts, visible controls, and failed-panel retry selection now use only each panel's latest attempt.
- A successful retry changes the current failed count to zero and disables stale retry actions even though the earlier failed attempt remains in history.
- TDD red phase reproduced both defects: selected-panel output had no version on the panel-linked item, and historical failure counts remained active after a successful retry.
- Focused Pass 4 suite: 8 files / 70 tests passed.
- Full suite: 65 files / 391 tests passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Non-paid browser smoke at `http://127.0.0.1:5173/` confirmed Imageshop and the Batch JSON surface render at `1280x720` with no document-level horizontal overflow and no console warnings/errors.
- The UI critic review confirmed the existing generation hierarchy and density concerns remain scoped to Pass 6; Pass 4 added no unrelated layout changes.

### Pass 5: Guided Return Workspace Restoration

- [x] Write a failing bridge/component test that starts from a specific Guided issue, page, and panel and consumes an Imageshop return.
- [x] Preserve or derive the originating issue workspace context in the handoff/return payload.
- [x] On return, set `libraryStage` to `issue-workspace`, set the active Art step, restore `activePageNumber`, select the returned panel, and open `panel-focus`.
- [x] Keep the assigned image, `ready` status, provenance, and layout geometry update unchanged.
- [x] Verify return behavior for unsaved recovery drafts and saved Comic Library projects.

#### Pass 5 Results - 2026-06-07

- Added project and Writer issue workspace identity to the Guided Imageshop handoff and return contracts.
- Guided panel handoffs now preserve the active Comic Library project id and linked Writer issue id through Imageshop.
- A return targeting another saved project selects that project, restores its snapshot, updates the selected series, and opens the originating issue workspace at the returned page and panel.
- A return targeting the active project preserves a newer unsaved recovery draft instead of overwriting it with an older saved snapshot.
- Returned art still uses the existing assignment path, preserving panel `ready` state, Imageshop provenance, and layout geometry updates.
- TDD red phase reproduced the missing workspace payload and Cover Table landing for both saved-project and recovery-draft returns.
- Focused Pass 5 suite: 5 files / 61 tests passed; the final return-path rerun passed 2 files / 28 tests.
- Full suite: 66 files / 393 tests passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Signed-in non-paid browser smoke at `http://127.0.0.1:5173/` confirmed Comic Creator opens through Cover Table into the saved issue workspace with the expected navigation and production controls and no console warnings/errors.
- No layout or styling changes were made; generation-first hierarchy, cockpit density, and render-scope work remain assigned to Pass 6.

### Pass 6: Generation-First Responsive Layout And Render Scope

- [x] Write a layout/order regression test proving Image Lab/cockpit precedes production libraries, Beat Timeline, Selected Frame Preview, and Beat Detail.
- [x] Move the full Image Lab surface to the first primary workspace row; place beat/library surfaces below or behind contextual sections without removing them.
- [x] Replace cockpit fixed minimum-column assumptions with a layout that collapses cleanly within its actual container width.
- [x] Verify no horizontal overflow at `1600x900` and `1280x720`, including expanded-navigation content-width equivalents.
- [x] Replace `useStorylineStudioStore()` whole-store subscription with narrow selectors.
- [x] Move prompt editing into the focused draft hook so keystrokes do not rerender or serialize production history. Completed in Pass 1.
- [x] Use render-scope evidence to decide whether another memo boundary is useful; selector isolation removed the unrelated rerender without adding speculative memoization.
- [x] Preserve keyboard access, labels, disabled-state explanations, and visible vertical scrolling.

#### Pass 6 Results - 2026-06-07

- Added a focused Storyline layout suite proving Image Lab precedes Production cast, Beat timeline, Selected frame preview, and Beat detail.
- Moved the full Image Lab into the first full-width primary workspace section and retained production libraries, timeline/preview, and Beat detail as secondary surfaces below it.
- Added an `Import` production-surface tab so the retouch workflow no longer displaces the default Compose prompt and preview.
- Reordered Compose so the main prompt and Generate action precede the reference tray and advanced direction fields.
- Compacted output destinations into a desktop command row while preserving labels, disabled states, and all existing actions.
- Replaced the three fixed-minimum cockpit columns with fluid two-column and four-column grids using `minmax(0, ...)`.
- Replaced the whole Storyline store subscription with a shallow selector containing only render-relevant state/actions. Callback-only raw story, cleaned story, interval, and director settings are read on demand.
- A render-count regression proved an unrelated `rawStoryline` update no longer rerenders the Image Lab subtree. No additional memo boundary was justified.
- UI critic revisions addressed the five highest-impact issues: secondary-first source order, Import crowding Compose, prompt/action below the fold, oversized output-destination stacking, and fixed cockpit width assumptions.
- Focused Pass 6 suite: 2 files / 28 tests passed.
- Full suite: 67 files / 395 tests passed.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Signed-in browser QA confirmed the main prompt at `596-668px` and Generate at `681-713px` in the `1280x720` Compose viewport. Import remains absent until its tab is selected.
- Direct browser measurements showed document width equals viewport width at `1600x900` and `1280x720`. Equivalent content widths for the sidebar expanding from 60px to 230px were also clean at 1430px and 1110px.
- The Import tab interaction rendered the retouch surface and returning to Compose restored the main prompt. Browser console logs contained no warnings or errors.
- Browser screenshot capture timed out in the active in-app browser session; DOM snapshots, bounding-box measurements, interaction state, and console evidence completed successfully.

### Pass 7: Object URL Cleanup And Full Regression

- [x] Track uploaded, pasted, hydrated, and page-background object URLs by ownership.
- [x] Revoke owned URLs on slot removal, replacement, clear, result removal, and component unmount without revoking remote/data URLs.
- [x] Add focused cleanup tests for replace, clear, remove, and unmount.
- [x] Run all focused Imageshop/provider/store/bridge/Guided tests.
- [x] Run the full test suite, build, lint, and `git diff --check`.
- [x] Run signed-in browser QA at `1600x900` and `1280x720` using a deterministic Writer fixture and mocked/non-paid generation where possible.
- [x] Measure persisted key sizes and prompt-typing writes again; confirm no generated image payload appears in web storage.
- [x] Confirm an unreachable reference blocks the provider call and identifies the failed chip.
- [x] Confirm selected-panel generation updates the grouped board and Writer map.
- [x] Confirm Guided return reopens the originating panel focus.
- [x] Update this plan, `tasks.md`, and `walkthrough.md` with exact results.

#### Pass 7 Results - 2026-06-07

- Added component-owned object URL tracking in `GenericImageLabPanel` for uploaded reference slots, pasted references, and uploaded page backgrounds.
- Owned URLs are now revoked exactly once when a reference slot is removed, references are cleared, references are replaced by studio or panel refs, a page-background upload is replaced or overwritten, and the component unmounts.
- Existing hydrated IndexedDB image asset release remains asset-id based through `releaseImageshopImageUrl`; the hydration/removal regression still covers shared session/production result cleanup.
- TDD red phase: `npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx -t "owned"` failed 4 cleanup tests with zero `URL.revokeObjectURL` calls.
- Green phase: the same object URL slice passed 4 tests.
- Full production-studio focused suite passed 1 file / 30 tests.
- Focused store suite passed 2 files / 18 tests.
- Focused provider/preflight/reference/batch suite passed 4 files / 23 tests.
- Focused production-studio/bridge/Guided suite passed 3 files / 48 tests.
- Full suite: `npm run test -- --run` passed 67 files / 399 tests.
- `npm run build` passed with the existing large `ComicPortal` chunk warning.
- `npm run lint` passed with 0 errors and the existing 67 repository warnings.
- `git diff --check` passed.
- Browser QA at `1600x900` confirmed Image Lab rendered, Compose was default, Import was hidden until selected, document/body width equaled 1600px, prompt measured `596-668px`, Generate measured `681-713px`, and console warnings/errors were empty.
- Browser QA at `1280x720` used a deterministic Writer-style prompt without generation, selected Import and returned to Compose, confirmed document/body width equaled 1280px, prompt measured `596-668px`, Generate measured `681-713px`, Import content was hidden again after returning to Compose, and console warnings/errors were empty.
- Browser storage inspection after prompt typing found no `localStorage` or `sessionStorage` generated image payloads.
- Unreachable reference blocking, failed-chip diagnostics, selected-panel grouped board updates, Writer map updates, retry failed-count reset, and Guided return focus remain covered by the focused regression tests rather than paid/live generation.

## Required Regression Assertions

- A successful provider result remains visible when IndexedDB persistence fails.
- `localStorage` and `sessionStorage` contain no full generated image data URLs.
- Prompt typing does not serialize production versions or image history.
- Displayed preflight prompt equals provider prompt equals provenance prompt.
- Mixed reference lanes compile to stable explicit provider instructions.
- Reference preparation time is bounded by parallel work rather than the sum of serial timeouts.
- A failed reference id appears in diagnostics and is absent from a retry-without-failed-refs request.
- No Gemini provider call occurs when strict reference preparation fails.
- Selected Writer panel generation adds a version to the matching grouped production item.
- A successful retry produces a current failed count of zero.
- Guided return opens the originating issue/page/panel in panel-focus mode.
- The first viewport is generation-first and has no horizontal cockpit overflow at both audited desktop sizes.
- Owned object URLs are revoked exactly once.

## Verification Commands

Focused commands should be refined as tests are added, then include:

```bash
npm run test -- --run src/stores/__tests__/imageshopSessionStore.test.ts src/stores/__tests__/imageshopProductionStore.test.ts
npm run test -- --run src/shared/api/__tests__/geminiImageDiagnostics.test.ts src/portals/storyline/__tests__/imageshopPromptPreflight.test.ts src/portals/storyline/__tests__/imageshopReferenceContext.test.ts src/portals/storyline/__tests__/imageshopBatchGeneration.test.ts
npm run test -- --run src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/stores/__tests__/imageWorkshopBridge.test.ts
npm run test -- --run
npm run build
npm run lint
git diff --check
```

## Risks And Mitigations

- **IndexedDB hydration is asynchronous.** Render explicit restoring/unavailable states and keep metadata usable while images resolve.
- **Blob URL lifecycle can become fragile.** Centralize ownership in the repository/hook and never revoke URLs not created by Imageshop.
- **Structured references affect a shared API.** Add an Imageshop-specific optional path and retain current positional arguments for Character/Asset Studio callers.
- **Prompt unification can change output behavior.** Lock exact request strings in tests before changing provider calls.
- **Reordering Storyline surfaces can disturb beat users.** Preserve every existing surface and action; change hierarchy, not capability.
- **Guided state has recovery and saved-library precedence.** Test both paths and reuse existing snapshot selection rules.
- **Large-file refactoring can widen scope.** Extract only the prompt draft and request/storage boundaries required by the findings.

## Approval Gate

Implementation should begin only after the user approves:

1. IndexedDB as the browser-local binary store for generated Imageshop results.
2. Strict default behavior that blocks provider execution when any included reference is unchecked or failed.
3. Explicit lane-based provider instructions for Imageshop while preserving legacy positional reference behavior elsewhere.
4. Moving the full Image Lab/cockpit ahead of Storyline beat/library surfaces.

## Definition Of Done

- All findings in both June 5 audits are fixed or explicitly documented as deferred with user approval.
- Generated image bytes are not duplicated in synchronous web storage.
- Preflight, provider execution, provenance, retry, and production-board identity share one request contract.
- Failed references are attributable and cannot silently reach paid generation.
- Writer panel versions, batch summaries, and Guided return state reflect the current result.
- Imageshop opens generation-first without audited desktop overflow.
- Focused and full automated verification pass.
- Browser QA confirms the repaired workflows with no uncaught page errors.
- `tasks.md`, this plan, and `walkthrough.md` are synchronized.
