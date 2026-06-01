# Imageshop Production Studio Implementation Tracker

Status date: 2026-05-31

Use this checklist after each Imageshop implementation pass so the production-studio plan stays aligned with the shipped app. Update this document in place after every meaningful pass, and update `walkthrough.md` with the immediate implementation delta.

## Plan

Illustrator's Imageshop should evolve from a single-image generation utility into a production-grade visual content studio for comic books, graphic novels, manga, storyboards, animatics, video production, and marketing assets.

The v1 evolution should stay inside the existing Imageshop / `lab` portal and build on the current bridge, session recovery, vault save/export, and Guided Comic Flow handoff contracts. The production workflow should support structured generation modes, JSON-backed batches, expanded prompt workspaces, automatic reference injection, art style management, comic page configuration, continuity locking, production tracking, and refinement/correction workflows.

Estimated implementation: **7 passes**.

## Defaults and Constraints

- Keep all work inside the existing Imageshop / `lab` portal unless the user explicitly approves broader routing changes.
- Do not change Supabase schema for v1.
- Do not modify ComicEditor for this Imageshop pass.
- Reuse `imageWorkshopBridge.ts`, `imageshopSessionStore.ts`, existing vault helpers, and current Guided Comic reference contracts.
- Preserve the existing Guided Comic Flow -> Imageshop -> return-art path.
- Preserve existing Save / Export behavior for Character Vault, Asset Vault, NPC Vault, and Download.
- Implement refinement/correction as structured generation/edit prompts unless a real region-edit API already exists in the repo.
- Keep state local through Zustand/localStorage/session storage unless a later pass explicitly approves persistence changes.
- Maintain the project rule that meaningful implementation work updates `walkthrough.md` directly.

## Pass Estimate

### Pass 1: Production state foundation

Add typed Imageshop production config/state, local persistence, production items, statuses, and tests.

Expected outcomes:
- Imageshop has a local production-store foundation separate from short-lived generated-result recovery.
- Production items can track status, selected item, source type, prompt snapshot, image versions, and generated metadata.
- Existing session recovery remains unchanged.

### Pass 2: Generation modes + shell UI

Add Video Beats / Comic Pages mode selector and reorganize Imageshop without changing existing generation behavior.

Expected outcomes:
- Video Beats mode preserves current behavior.
- Comic Pages mode unlocks comic-specific settings progressively.
- Existing guided panel handoff still opens Imageshop with the right prompt, refs, aspect ratio, and return target.

### Pass 3: Prompt workspace + prompt composer

Add structured prompt sections, art style field/library, continuity controls, and composed prompt tests.

Expected outcomes:
- Prompt workspace supports main prompt, negative prompt, character instructions, environment instructions, art style instructions, camera instructions, and continuity instructions.
- Art style controls are separate from the main prompt and support saved local styles.
- Continuity lock options and continuity strength influence the composed generation prompt.

### Pass 4: Reference integration upgrade

Reuse existing Character/Asset/NPC/Guided references, inject metadata into prompts, and preserve 14-slot preload behavior.

Expected outcomes:
- Selected references automatically contribute appearance, costume, color, source-label, art-style, and continuity details where available.
- The first 14 reference URLs continue to preload into visible reference slots.
- Overflow references remain available to prompt composition and production config.

### Pass 5: Comic page configuration

Add page types, panel toggles, panel styling, and reusable layout templates.

Expected outcomes:
- Comic Pages mode supports standard page, double-page spread, splash page, cover, character sheet, environment sheet, and asset sheet.
- Panel options can independently request panel numbers, dialogue, captions, SFX, and page numbers.
- Panel border designer supports border style, border color, gutter color, gutter width, and page background upload.
- Layout templates include standard, cinematic, manga, and custom/saveable templates.

### Pass 6: JSON import/export + batch queue

Add JSON validation, normalized production batches, sequential generation, and export/reimport round-trip tests.

Expected outcomes:
- Import JSON accepts Story Beat JSON, Comic Page JSON, and ARCS Page JSON.
- Imported issue/chapter/scene/sequence content becomes editable production items before generation.
- Batch generation runs sequentially with visible per-item status and recoverable errors.
- Export JSON writes reusable generation configuration.

### Pass 7: Refinement dashboard

Add Generate -> Review -> Refine -> Approve statuses, production dashboard filters, correction/refinement prompt workflows.

Expected outcomes:
- Production dashboard supports Draft, Generated, Refined, Approved, and Published statuses.
- Refinement tools include prompt edit, character correction, face correction, costume correction, lighting adjustment, color adjustment, and dialogue correction.
- Continuity Correction workflow accepts approved source image + target image and applies only selected continuity-match instructions.
- Refined outputs are stored as versions under the same production item.

## Agent Checklist

- [x] Create `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`.
- [x] Add the plan summary, pass estimate, checklist, assumptions, and verification matrix.
- [x] Pass 1 complete: production state foundation implemented and tested.
- [x] Pass 2 complete: generation mode selector and shell UI implemented.
- [x] Pass 3 complete: structured prompt workspace and prompt composer implemented.
- [x] Pass 4 complete: reference metadata injection implemented without breaking existing handoffs.
- [x] Pass 5 complete: comic page controls, panel styling, and layout templates implemented.
- [x] Pass 6 complete: JSON import/export and batch generation implemented.
- [x] Pass 7 complete: dashboard, refinement, approval, and continuity correction workflows implemented.
- [x] Existing Guided Comic Flow -> Imageshop -> return-art path manually verified.
- [x] Existing Save / Export to Character Vault, Asset Vault, NPC Vault, and Download manually verified.
- [x] Existing Guided Comic Flow -> Imageshop -> return-art path verified by focused bridge/component tests.
- [x] Existing Save / Export without regeneration verified by focused component tests for the NPC Vault/local archive path.
- [x] `npm run test` or focused Imageshop/store/bridge tests pass.
- [x] `npm run lint` passes or only known pre-existing warnings remain.
- [x] `npm run build` passes.
- [x] `walkthrough.md` updated after each meaningful implementation pass.

## Verification Matrix

| Pass | Required automated checks | Required manual checks |
|------|---------------------------|-------------------------|
| Pass 1 | Store/unit tests for production items, statuses, version snapshots, and persistence. | Confirm Imageshop still restores recent session results. |
| Pass 2 | Focused component/store tests where practical; existing bridge tests. | Open Imageshop, switch modes, confirm Video Beats behavior still works. |
| Pass 3 | Prompt composer tests for every section, art style, continuity locks, and negative prompt output. | Compose a prompt in the UI and confirm the preview/generation text is understandable. |
| Pass 4 | `imageWorkshopBridge` tests for all-reference preservation and active-reference filtering. | Guided Comic Flow panel handoff still preloads refs and sends generated art back. |
| Pass 5 | Layout/page config helper tests. | Comic Pages controls show/hide correctly and do not crowd the base Imageshop workflow. |
| Pass 6 | JSON schema, normalization, export, and round-trip tests. | Import a small JSON sequence, generate one item, skip one item, export config. |
| Pass 7 | Store tests for status transitions and version history; prompt tests for correction modes. | Generate -> Review -> Refine -> Approve flow works without losing original output. |

## Current Status

- Tracker document created on 2026-05-31.
- Passes 1-7 were implemented on 2026-05-31 inside the existing Imageshop / `lab` portal.
- The final implementation includes the explicit `Single Comic Page` page type, approved/published production outputs as reusable prompt references, and ARCS JSON export/import support for saved art style definitions plus the selected style.
- Automated verification passed with the full `npm run test` suite, focused Imageshop/store/bridge tests, `npm run lint`, `npm run build`, and `git diff --check`.
- Latest verification on 2026-05-31: focused Imageshop/store/bridge tests passed 6 files / 34 tests; full `npm run test` passed 49 files / 292 tests; `npm run build` passed with the existing large `ComicPortal` chunk warning; `npm run lint` passed with 0 errors and the existing 67-warning baseline.
- Focused component/bridge tests now cover JSON import into dashboard items, saved session-result Save / Export to the NPC Vault/local archive path without regeneration, and Guided Comic Flow panel return wiring.
- Authenticated in-app browser QA was attempted against `http://127.0.0.1:5173/` in both the in-app browser and Chrome profile. Both browser surfaces were stopped at the protected Supabase sign-in gate, and disposable sign-up was blocked by Supabase email rate limiting. Manual signed-in checks for Guided Comic Flow return-art and vault Save / Export remain operator QA.
- Resumed in-app browser QA on 2026-06-01 against `http://127.0.0.1:5173/` again loaded `ARCS Expanded`, but the Imageshop card led to `Sign in to continue`; the signed-in manual checks remain blocked until a valid authenticated session is available.
- A fresh disposable Supabase sign-up attempt on 2026-06-01 succeeded at the user-creation step but returned `needsConfirmation: true` and no session, so it did not unlock the protected Imageshop route. The local env does not include a service-role key or documented QA credential.
- Signed-in in-app browser QA on 2026-06-01 using `hayronivy@gmail.com` generated an Imageshop smoke-test image, downloaded it, saved it to NPC Vault, saved it to Character Vault as `Imageshop QA Character 20260601`, and saved it to Asset Vault collection `Imageshop QA Assets 20260601`. The in-app browser control bridge then became unresponsive while entering Comic Creator, so Guided Comic Flow return-art manual QA remains unchecked.
- Signed-in Guided Comic Flow QA on 2026-06-01 opened Page 1 / Panel 1 in Imageshop, generated panel art, sent it back to Guided Comic Flow, and confirmed the panel focus returned with status `Ready` plus an assigned image. A restore-order fix now preserves newer unsaved Guided Comic drafts over older Comic Library snapshots when returning from Imageshop.
- Cursory audit on 2026-06-01 found that the production features are present but the portal still reads as a beat-timeline/storyboard utility before it reads as an image-generation studio. The highest-priority next pass should recenter the first screen around prompt, references, generation state, preview, and save/export, then move beat timeline, production libraries, JSON batch import, page configuration, dashboard, and refinement into contextual panels or tabs.
- The same audit found that beats are only partially leveraged for comic pages: selected beat references can be pulled into Imageshop and Story Beat JSON can import production items, but there is no first-class page beat to panel generation queue that maps Writers/Guided page beats directly into Comic Pages mode with panel-specific prompts, references, status, and return targets.
- Prompt integrity needs a hardening pass. The `Negative prompt` field is currently composed as ordinary prompt text, not passed as a distinct model negative channel, and Comic Pages mode can generate mostly configuration text when the main prompt is empty. Add prompt preflight checks, visible composed-prompt review, token/payload warnings, and a clearer distinction between positive instructions, avoid-list guidance, and model/API capabilities.
- Image-generation reliability needs better user-facing diagnostics. The API bridge retries 429 responses, but network/reference failures return immediately, batch failures collapse to a generic message, and raw API errors can surface without next-action guidance. Add structured error classes, retry controls, reference-count/size warnings, model fallback options, elapsed/progress state, and clearer safety/quota/timeout copy.
- Button and menu fidelity needs a consolidation pass. The live UI shows duplicated aspect controls, duplicated export/save language, weakly distinguished `Process` versus `Generate`, low-context reference buttons, and production dashboard cards whose accessible text can concatenate the full prompt and status into one giant control label.
- Priority audit document added: `docs/superpowers/plans/2026-06-01-illustrators-imageshop-priority-audit.md` captures the broader concern inventory for making Imageshop the main fast comic-page creation portal backed by reference vaults, Writers Workshop JSON, and Obsidian lore/canon context.
- No routing, Supabase schema, or ComicEditor changes were introduced.

## Cursory Audit Backlog - 2026-06-01

### Bugs / risks
- First-screen hierarchy: `StorylineStudio.tsx` renders production libraries and the beat timeline before `GenericImageLabPanel`, so the generator is below the fold for an empty project.
- Prompt integrity: `imageshopPromptComposer.ts` writes `Negative prompt:` into the same text prompt as positive instructions; this should not be presented as a true negative-prompt capability unless the backing model/API supports it.
- Generation errors: `geminiImageApi.ts` returns unstructured error strings and only retries rate limits. Users who hit timeouts, reference fetch failures, no-image responses, or quota/safety failures do not get consistent retry/fallback guidance.
- Batch generation: `generateBatch` stops on the first failed item and reports a generic batch failure, with no per-item failure reason visible in the dashboard.
- Control fidelity: live UI contains repeated `Portrait` / `Square` / `Cinematic`, repeated `Export JSON`, repeated save-to-vault actions with inconsistent casing, and several reference commands that are hard to distinguish at a glance.
- Accessibility: production dashboard item buttons can expose label + status + full prompt as one very long accessible name.

### Recommendations
- Reframe Imageshop as an image-generation workspace first: prompt/reference/preview/save should be the dominant first viewport; cast/assets/NPC, beat timeline, JSON batch, page config, production dashboard, and refinement should become secondary tabs, collapsible inspectors, or right-rail panels.
- Add a dedicated `Comic Pages from Beats` flow: import Writer/Guided page beats into a page/panel queue, prefill panel prompts/dialogue/SFX/reference chips, and let the user generate, retry, approve, and send back per panel.
- Add prompt preflight: require a meaningful main prompt before generation, warn when Comic Pages mode is only configuration text, summarize reference payload count/size, and show exactly what prompt will be sent.
- Add generation diagnostics: classify safety, quota/rate-limit, timeout, missing key, reference fetch, API no-image, and unknown errors; provide retry/fallback actions and preserve failed-item status in dashboard/batch runs.
- Consolidate controls: one aspect control per active workflow, one export menu, one save/export area, clearer `Import image -> Process` versus `Generate new image`, and icon/tooltips for reference-source actions.
