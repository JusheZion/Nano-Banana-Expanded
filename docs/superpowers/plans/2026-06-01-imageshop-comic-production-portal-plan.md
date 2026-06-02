# Imageshop Comic Production Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL after approval: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Use `superpowers:test-driven-development` before production code changes. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Illustrator's Imageshop into the primary comic-page image production portal, driven by Writer JSON, Obsidian canon metadata, and Character/Asset/NPC Vault continuity.

**Architecture:** Keep the first implementation inside the existing Imageshop / `lab` portal and build on the current Imageshop production store, prompt composer, JSON import/export, vault helpers, Writer handoff, and Guided Comic return contracts. Add a page/panel production queue, canon/reference context layer, prompt preflight, structured generation diagnostics, and a unified output model before considering route or schema expansion.

**Tech Stack:** React 19, TypeScript, Zustand/localStorage, Zod, Vitest, React Testing Library, Supabase client/helpers, existing Gemini image API bridge, existing Writers Workshop and vault APIs.

**Approval status:** Implementation started on branch `codex/imageshop-comic-production-portal` after the active-goal continuation request on 2026-06-01.

---

## Barometer Of Success

1. Illustrator's Imageshop becomes a portal for batch generation from `.json` comic beats and metadata. The queue preserves Writer issue/page/panel hierarchy, Obsidian-derived canon context, vault references, prompt provenance, and generation metadata so outputs remain consistent in characters, visual elements, and art styles.
2. Writers' Workshop, Character Vault, Asset Vault, and NPC/supporting references form a reliable workflow for both general image generation and comic book production. Writer pages can request refs, Imageshop can generate/refine art, approved results can return to Writer/Guided workflows and become reusable vault continuity.

## Source Context

- Audit source: `docs/superpowers/plans/2026-06-01-illustrators-imageshop-priority-audit.md`
- Prior tracker: `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`
- Existing production foundation: `src/stores/imageshopProductionStore.ts`
- Existing prompt composer: `src/portals/storyline/imageshopPromptComposer.ts`
- Existing JSON import/export: `src/portals/storyline/imageshopJsonSchemas.ts`
- Existing Imageshop UI: `src/portals/storyline/GenericImageLabPanel.tsx` and `src/portals/storyline/StorylineStudio.tsx`
- Existing Writer-to-Imageshop planning helper: `src/portals/storyline/imageWorkshopPlanning.ts`
- Existing Writer and Guided bridge surfaces: `src/stores/writerWorkshopBridge.ts`, `src/stores/imageWorkshopBridge.ts`, `src/portals/guided-comic/writersWorkshopBridge.ts`
- Existing Obsidian lore import/canon surface: `src/portals/writer/obsidianLoreImport.ts`, `src/portals/writer/WriterPortal.tsx`, `src/shared/api/arcsWriterRoom.ts`
- Existing image API bridge: `src/shared/api/geminiImageApi.ts`

## Product Decisions For This Plan

- Keep the main nav route as the existing `lab` portal during the first overhaul. Recenter the internal UI before adding routing scope.
- Make panel-first comic production the default. Full-page generation remains available as an explicit mode, not the default.
- Treat Obsidian lore as canon context through existing Writer lore cards and Writer JSON metadata. Do not dump raw notes into prompts.
- Let approved Imageshop outputs become reusable continuity references, but require explicit user approval before they affect later panels.
- For batch failures, default to preserving partial successes and pausing the failed item with retry choices rather than discarding the run.
- Preserve the no-Supabase-schema-change constraint from the production-studio tracker unless a later approved pass proves persistence cannot be handled through existing JSON metadata/local state.

## UX Direction

Use a dense creative-production cockpit, not a landing page or generic dashboard. The first viewport should make the current generation task obvious: source page/panel, prompt readiness, active reference chips, canon used, preview, generate/retry, and output destinations. Secondary material belongs in tabs, drawers, or a right-side inspector: beat timeline, production libraries, Writer JSON import diagnostics, page config, production board, versions, and refinement tools.

Frontend-design principles to preserve:
- Make preview and current page/panel visually dominant.
- Use segmented controls for modes, menus for import/export/destination sets, icon buttons with tooltips for repeated utility actions, and clear disabled-state helper copy.
- Avoid repeated nested cards and duplicated text buttons.
- Use scoped accessible names for repeated actions.
- Keep labels concrete: `Writer Pages`, `Panel Queue`, `Canon Context`, `Reference Lanes`, `Output Destinations`.

## Proposed Data Flow

1. Writers' Workshop exports or hands off an issue/page/panel image-production JSON package.
2. The package includes issue metadata, page numbers, panel numbers, beat text, dialogue, SFX, layout intent, characters, locations, art style hints, Obsidian lore ids/labels, and desired vault reference ids when available.
3. Imageshop imports the package into a reviewable page/panel queue instead of flattening it into generic production items.
4. Each panel queue item resolves reference chips from Character Vault, Asset Vault, NPC/supporting references, Guided refs, and approved Imageshop outputs.
5. Each panel queue item resolves canon chips from Writer lore cards, including Obsidian provenance and prompt-safe summaries.
6. Prompt preflight composes sectioned prompts with source attribution: Writer JSON, Vault, Lore, Manual, AI Helper, and Page Config.
7. The batch runner generates selected panels, a page, or all draft panels with per-item progress, retry, skip, and partial-success handling.
8. Approved outputs can save to vaults, return to Guided Comic Flow, export as a Writer-compatible image map, or remain as local production versions.

## File Responsibility Map

### New or likely new files

- `src/portals/storyline/imageshopPagePanelQueue.ts`
  - Owns issue/page/panel queue types, queue item readiness, hierarchy helpers, selected panel/page helpers, and status aggregation.
- `src/portals/storyline/imageshopWriterImport.ts`
  - Converts Writer JSON and current Comic Page JSON into structured page/panel queue data with diagnostics.
- `src/portals/storyline/imageshopCanonContext.ts`
  - Converts Writer lore cards and Obsidian metadata into prompt-safe canon chips, conflict warnings, and provenance summaries.
- `src/portals/storyline/imageshopReferenceContext.ts`
  - Converts vault/Guided/approved-output references into labeled lanes and per-panel chips.
- `src/portals/storyline/imageshopPromptPreflight.ts`
  - Validates prompt readiness, section attribution, avoid-list semantics, reference payload health, and canon/reference conflicts before generation.
- `src/portals/storyline/imageshopGenerationDiagnostics.ts`
  - Classifies image generation failures and maps each class to user-facing retry/fallback actions.
- `src/portals/storyline/imageshopProductionProvenance.ts`
  - Defines generation provenance snapshots for versions, session results, vault saves, and exported JSON.
- `src/portals/storyline/components/ImageshopGenerationCockpit.tsx`
  - Renders the generation-first first viewport.
- `src/portals/storyline/components/ImageshopPanelQueue.tsx`
  - Renders issue/page/panel queue navigation and panel cards.
- `src/portals/storyline/components/ImageshopContextInspector.tsx`
  - Renders canon chips, reference lanes, conflicts, and payload health.
- `src/portals/storyline/components/ImageshopOutputPanel.tsx`
  - Renders unified save/export/send-back destinations.

### Existing files expected to change

- `src/stores/imageshopProductionStore.ts`
  - Add queue/provenance/canon/reference state while preserving current production items and local persistence.
- `src/portals/storyline/imageshopJsonSchemas.ts`
  - Preserve Writer provenance and add Writer image-production JSON import/export support.
- `src/portals/storyline/imageshopPromptComposer.ts`
  - Replace misleading `Negative prompt` wording with avoid-list prompt text and add source-attributed prompt sections.
- `src/portals/storyline/GenericImageLabPanel.tsx`
  - Split the current large surface into smaller cockpit, queue, inspector, dashboard, and output components.
- `src/portals/storyline/StorylineStudio.tsx`
  - Reorder the page so Imageshop generation is first-screen and production libraries/timeline become contextual.
- `src/portals/storyline/imageWorkshopPlanning.ts`
  - Extend Writer/lore/vault planning into panel-level reference requests.
- `src/shared/api/geminiImageApi.ts`
  - Return structured generation diagnostics without breaking existing callers.
- `src/portals/writer/writerProductionBranches.ts`
  - Add or extend Writer export branch for Imageshop image-production JSON and return image maps.
- `src/portals/writer/WriterPortal.tsx`
  - Add affordances for sending page/panel production packages to Imageshop and receiving output maps.

### Existing tests expected to expand

- `src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts`
- `src/portals/storyline/__tests__/imageshopPromptComposer.test.ts`
- `src/portals/storyline/__tests__/imageWorkshopPlanning.test.ts`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
- `src/stores/__tests__/imageWorkshopBridge.test.ts`
- `src/stores/__tests__/writerWorkshopBridge.test.ts`
- `src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
- `src/portals/writer/__tests__/writerProductionBranches.test.ts`
- New focused tests beside each new helper file.

## Pass Checklist

Expected implementation: **8 passes** after approval.

### Pass 1: Product Contract, Types, And Test Harness

- [x] Write failing tests for page/panel queue hierarchy, provenance snapshots, and readiness counters.
- [x] Add queue/provenance/canon/reference type helpers in focused files.
- [x] Extend `useImageshopProductionStore` with backward-compatible queue state and persistence version handling.
- [x] Add migration-safe defaults so existing production items, batches, art styles, and layout templates still load.
- [x] Document the approved product contract inside this plan or a follow-up execution tracker.
- [x] Verify focused queue/store tests, then run `npm run test -- --run src/stores/__tests__/imageshopProductionStore.test.ts`.

### Pass 2: Writer JSON To Page/Panel Queue

- [x] Write failing tests for importing Writer issue/page/panel JSON with series, issue, page, panel, dialogue, SFX, art style, lore ids, reference ids, and timestamps.
- [x] Extend `imageshopJsonSchemas.ts` through `imageshopWriterImport.ts` so Writer JSON imports as a visible hierarchy instead of flattened generic items.
- [x] Add diagnostics for missing pages, empty panels, malformed dialogue/SFX fields, unknown lore ids, unknown vault ids, and skipped unsupported fields.
- [x] Preserve existing Story Beat JSON, Comic Page JSON, and ARCS Page JSON imports.
- [x] Add export support for reusable Imageshop production JSON and Writer-compatible image maps.
- [x] Verify focused JSON tests and existing production-studio component tests.

### Pass 3: Generation-First Cockpit UI

- [x] Write failing component tests that the first Imageshop viewport exposes source item, prompt, active refs, canon used, preview, generate/retry, and output destinations before beat timeline/libraries.
- [x] Extract `ImageshopGenerationCockpit`, `ImageshopPanelQueue`, `ImageshopContextInspector`, and `ImageshopOutputPanel` from `GenericImageLabPanel.tsx`.
- [~] Move production libraries, beat timeline, JSON import, page configuration, dashboard, and refinement into tabs/inspectors without removing their current capabilities. Image Lab production libraries, JSON import, page configuration, dashboard, and refinement are now behind production surface tabs; the broader page-level beat timeline still remains outside this tab model.
- [~] Replace duplicated aspect/export/save controls with one command model per active workflow. Compose aspect/generation/session-result/retry actions now have scoped labels and helper copy; full save/export command-model consolidation remains pending for Pass 8 output destinations.
- [x] Add scoped accessible names and disabled-state helper copy for repeated controls.
- [x] Verify focused component tests and manual browser scan of the first viewport.

### Pass 4: Reference Vault Workflow

- [x] Write failing tests for reference lane construction from Character Vault, Asset Vault, NPC/supporting refs, Guided handoff refs, and approved Imageshop outputs.
- [x] Add labeled reference lanes: Character DNA, Wardrobe, Environment, Props, Style, Lighting, Canon.
- [~] Add per-panel reference chips with source labels, vault ids, image labels, signed URL status, and continuity role. Queue panels now merge Writer, vault, Guided, NPC, and approved Imageshop output chips with source type, reference id, image URL, and signed URL status; explicit continuity role labeling remains pending.
- [~] Add missing-reference routing from Writer context to Character Studio, Asset Studio, or quick supporting reference. The cockpit now surfaces route suggestions for unresolved Writer reference ids; actual cross-portal navigation actions remain pending.
- [~] Add explicit replace/add/clear semantics with undo or confirmation for destructive replacement. Queue/store actions now support deduped add, confirmed replace, confirmed clear, and restore from undo snapshots; cockpit controls for these actions remain pending.
- [x] Verify reference-context helper tests, production-studio component tests, nearby Imageshop tests, and Guided Comic bridge tests.

### Pass 5: Obsidian Canon Context

- [ ] Write failing tests for attaching Writer lore cards with Obsidian metadata to pages, panels, characters, locations, artifacts, factions, and props.
- [ ] Add canon chips with prompt-safe summaries rather than raw Obsidian note bodies.
- [ ] Add conflict warnings when Writer JSON labels, vault labels, and lore cards disagree.
- [ ] Add `Canon used` provenance to queue items, generation versions, vault saves, and exported JSON.
- [ ] Add manual attach/detach affordances for lore cards where Writer JSON lacks ids.
- [ ] Verify lore/context helper tests, Writer production branch tests, and Obsidian import regression tests that do not require native file picker automation.

### Pass 6: Prompt Preflight And Prompt Integrity

- [ ] Write failing tests for prompt preflight blocking weak prompts, mostly-configuration prompts, oversized reference payloads, and unresolved canon/reference conflicts.
- [ ] Rename user-facing `Negative prompt` semantics to `Avoid list` unless a real negative API channel is added.
- [ ] Show final prompt sections with badges for Writer JSON, Vault, Lore, Manual, AI Helper, and Page Config.
- [ ] Add payload health: reference count, approximate size, signed URL/fetch status, and likely timeout risk.
- [ ] Add AI helper validation for the composed prompt, not only the raw main prompt.
- [ ] Verify prompt composer/preflight tests and a manual prompt-review browser pass.

### Pass 7: Batch Generation Reliability

- [ ] Write failing tests for structured error classes: missing key, safety, quota/rate limit, timeout, reference fetch, reference size, no image, unsupported payload, network, and unknown.
- [ ] Update `geminiImageApi.ts` and callers to preserve structured diagnostics while keeping existing error display behavior compatible.
- [ ] Add queue actions: generate selected, generate page, generate all draft panels, retry failed, retry without failed refs, retry smaller refs, retry with fallback model, skip, pause, and resume.
- [ ] Preserve partial successes and attach attempt metadata: model, prompt hash, ref count, elapsed time, seed, error class, retry count.
- [ ] Add elapsed-time and progress state for long runs.
- [ ] Verify diagnostics tests, batch partial-failure tests, and a mocked generation component test.

### Pass 8: Production Board, Output Destinations, And Workflow Round Trip

- [ ] Write failing tests for page/panel grouped production board, version choose-current, compare metadata, revert, approve, and publish behavior.
- [ ] Add a unified output panel with explicit destinations: Character Vault, Asset Vault, NPC/Supporting Vault, assign current panel, add as new beat, export production JSON, export Writer-compatible image map.
- [ ] Make approved outputs available as explicit continuity references for later panels.
- [ ] Add Writer return flow so Imageshop outputs can update Writer/Guided page panels without losing provenance.
- [ ] Add accessibility assertions for unique button names, bounded card labels, and explicit disabled reasons.
- [ ] Run focused tests, `npm run test`, `npm run lint`, `npm run build`, `git diff --check`, and signed-in browser QA for Writer JSON import -> panel generation -> approval -> vault save -> Guided/Writer return.

## Verification Strategy

- Use test-first execution for every code pass: write the failing Vitest or component test, confirm the expected failure, implement the smallest change, then rerun the focused test.
- Keep focused helper tests close to the new modules so queue, canon, references, prompt preflight, diagnostics, and provenance can be verified without browser setup.
- Preserve existing high-value regression checks:
  - `npm run test -- --run src/portals/storyline/__tests__/imageshopJsonSchemas.test.ts src/portals/storyline/__tests__/imageshopPromptComposer.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`
  - `npm run test -- --run src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/writerWorkshopBridge.test.ts src/portals/guided-comic/__tests__/writersWorkshopBridge.test.ts`
  - `npm run lint`
  - `npm run build`
- Browser QA should use a signed-in session when possible and cover the full production path:
  - Import Writer JSON with lore metadata.
  - Review page/panel queue diagnostics.
  - Attach vault references and canon chips.
  - Preflight a panel prompt.
  - Generate one panel.
  - Retry a mocked or naturally failed item when available.
  - Approve output and save to Character/Asset/NPC Vault as appropriate.
  - Return or export an image map to Writer/Guided flow.

## Risks And Guardrails

- The current Imageshop implementation is concentrated in large UI files. Extract components only where they reduce immediate complexity and improve tests.
- Obsidian lore can easily bloat prompts. Use summaries, relevance, and provenance chips instead of raw note injection.
- Reference payload size can dominate generation time. Surface payload health before generation and make fallback paths visible.
- Batch generation can hit quota, safety, and timeout conditions. Preserve partial success and per-item diagnostics.
- Existing save/export paths are already used. Keep old paths working until the unified output panel has equivalent coverage.
- Do not introduce Supabase schema changes unless explicitly approved after a persistence gap is demonstrated.
- Update `walkthrough.md`, this plan/checklist, and `tasks.md` after meaningful implementation passes.

## Approval Questions

Recommended answers are already reflected in the plan:

1. Should Imageshop stay under the existing `lab` route for the first overhaul?
   - Recommended: yes, recenter the internal workspace first.
2. Should the default comic workflow generate panels first, with full-page generation as an explicit option?
   - Recommended: yes, panel-first provides better consistency, retry, and approval control.
3. Should Obsidian lore enter Imageshop through Writer lore cards and Writer JSON metadata first?
   - Recommended: yes, this reuses the existing Obsidian import/canon surface and avoids raw note prompt stuffing.
4. Should batch generation pause on failed items while preserving partial successes?
   - Recommended: yes, this protects completed work and makes failures actionable.

## Definition Of Done

- Imageshop opens with a generation-first cockpit rather than a beat-first utility layout.
- Writer JSON imports into an issue/page/panel queue with diagnostics and provenance.
- Obsidian-derived canon and vault references are visible as chips before generation and stored in output metadata.
- Prompt preflight clearly shows what will be sent and warns before weak or risky requests.
- Batch generation supports selected/page/all workflows with partial failure recovery.
- Approved outputs can be saved to the correct vaults, reused as continuity refs, and returned/exported to Writer/Guided workflows.
- Focused tests, full tests, lint, build, diff check, walkthrough update, and signed-in browser QA are complete for the approved implementation scope.
