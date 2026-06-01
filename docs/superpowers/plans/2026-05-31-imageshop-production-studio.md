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
- [ ] Existing Guided Comic Flow -> Imageshop -> return-art path manually verified.
- [ ] Existing Save / Export to Character Vault, Asset Vault, NPC Vault, and Download manually verified.
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
- No routing, Supabase schema, or ComicEditor changes were introduced.
