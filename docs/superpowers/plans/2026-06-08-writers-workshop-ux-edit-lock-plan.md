# Writers Workshop UX Edit And Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Writers' Workshop obvious enough for a tired creator to edit, protect, regenerate, export, and continue a real issue without hunting through hidden panels or losing user-authored work.

**Architecture:** Keep existing Writer data contracts intact for the first pass. Use issue `notes` metadata for lock/protection state so outlines, synopsis/helper fields, outline instructions, page beats, and dialogue can be protected without a database migration; add a focused lock helper and guard generation/clear/apply operations through it. Make discoverability fixes in `WriterPortal.tsx` first, then extract helpers only where tests need stable logic.

**Tech Stack:** React 19, TypeScript, Supabase writer tables, existing `writer_issues.notes`, Vitest, React Testing Library where practical, in-app browser QA.

---

## Implementation Status - 2026-06-08

Status: **Complete locally.** The nine passes were implemented as coordinated workstreams and verified together after the lock/export/edit/draft/snapshot surfaces were in place.

- [x] Pass 1: Export routing - `12 Export` opens a first-class Export workspace with preferred export, issue pack JSON, Markdown, and Guided Comics handoff visible above the fold.
- [x] Pass 2: Direct edit discoverability - active workspaces expose literal edit actions for issue synopsis, outline, outline instructions, selected-page beats, and selected-page dialogue.
- [x] Pass 3: Truthful primary actions - completed Outline, Beats, and Dialogue stages continue forward by default, with regeneration available as a secondary action.
- [x] Pass 4: Density and label cleanup - right workshop dock defaults collapsed, Guided/Advanced mode is available, and labels are normalized around `Visual Prep`, `Audit`, and `Export`.
- [x] Pass 5: Lock persistence - lock metadata is stored under `writer_issues.notes.writer_locks` for synopsis, author outline, outline instructions, production defaults, latest outline, page beats, and dialogue.
- [x] Pass 6: Regeneration guards - overwrite-capable outline/page/batch/pacing actions block or skip locked content and name the protected item.
- [x] Pass 7: Draft persistence - outline instructions, beats director notes, and visual creative brief persist before AI calls and on blur.
- [x] Pass 8: Readable outputs and scope preview - outline/beats previews show readable creator text before advanced JSON, and destructive/AI actions show `This will change` scope context.
- [x] Pass 9: Structural cleanup - Export is a real workspace, Guided/Advanced mode is present, page selection is unified near the top, restore snapshots are captured, and safe preview/assist surfaces are separated from apply/regenerate/clear actions.

### Verification Completed

- [x] Focused Writer tests: lock helpers, draft persistence, regeneration scope, story snapshots, chronology, and page-edit review passed.
- [x] Full test suite passed: 79 files / 429 tests.
- [x] `npm run build` passed.
- [x] `npm run lint` passed with existing repo warnings only; no errors.
- [x] `git diff --check` passed.
- [x] Browser QA passed at `http://127.0.0.1:5174/`: Writers Workshop opened from the hub, edit controls were findable without File, Page 1 beats lock persisted through reload, locked regeneration was blocked with a clear warning, Export routing worked, and temporary QA lock state was removed afterward.

### Remaining Follow-Up

- [ ] Human product review: decide whether locks should block manual saves or only AI/destructive overwrites.
- [ ] Deployment review: deploy only after the broader branch state is reviewed, because unrelated dirty files are present in the worktree.

---

## Priority Groups

### 1. Quick Wins

These should be implemented first because they repair the most visible workflow promises without changing storage contracts.

1. **Fix Export Routing**
   - Problem: clicking `12 Export` in the production map currently lands in `Synopsis helper`, with export controls buried below author-outline inputs.
   - Fix: add an explicit export surface or export anchor inside the existing `scripts` tab; clicking `12 Export` must land on a visible `Export issue` heading with primary export buttons above the fold.
   - Files:
     - Modify `src/portals/writer/WriterPortal.tsx`
     - Test/update `src/portals/writer/__tests__/writerWorkflowChronology.test.ts`
   - Acceptance:
     - Production map `12 Export` opens a visible export-first view.
     - `Download preferred export`, `Issue pack`, `Markdown`, and `Guided Comics handoff` are visible without scrolling.

2. **Make Direct Editing Unmissable**
   - Problem: the user was told direct editing exists, but it is scattered between Beats, raw JSON preview buttons, and `Synopsis helper` / File's `Edit saved outputs`.
   - Fix: add a persistent `Edit current story part` action row in the top of Outline, Synopsis, Beats, and Dialogue. Labels must be literal:
     - `Edit issue synopsis`
     - `Edit outline`
     - `Edit outline instructions`
     - `Edit Page N beats`
     - `Edit Page N dialogue`
   - Files:
     - Modify `src/portals/writer/WriterPortal.tsx`
   - Acceptance:
     - A first-time user can find edit controls in the workspace where the content appears.
     - Editing is not hidden behind `File`, `Synopsis helper`, or raw JSON language.

3. **Stop Primary Buttons From Contradicting Completion State**
   - Problem: complete stages still show primary actions like `Generate page beats` and `Draft dialogue`.
   - Fix: when a stage is complete, demote regenerate actions and make the primary action continue the workflow:
     - Beats complete -> `Continue to Dialogue`
     - Dialogue complete -> `Continue to Visual Prep`
     - Audit complete -> `Continue to Cockpit`
     - Export-ready -> `Export issue`
   - Files:
     - Modify `src/portals/writer/writerNextStep.ts`
     - Modify `src/portals/writer/WriterPortal.tsx`
     - Test `src/portals/writer/__tests__/writerWorkflowChronology.test.ts`
   - Acceptance:
     - The top-right primary action never asks users to regenerate already-complete work unless they explicitly choose a regenerate menu/action.

4. **Collapse Secondary Panels By Default**
   - Problem: the first viewport showed about 80 visible controls; hiding the right workshop panel cut this to about 39.
   - Fix: default the right Library/Activity/Shortcuts panel to collapsed on desktop, with a clear `Open library` icon/button.
   - Files:
     - Modify `src/portals/writer/WriterPortal.tsx`
   - Acceptance:
     - Initial Writer viewport focuses on current stage content.
     - Library remains one click away.

5. **Rename Conflicting Workflow Labels**
   - Problem: `Video` means `Visual Prep`; `Arc` means `Audit`; `Synopsis` sometimes means `Author source`; `Export` is not a workspace.
   - Fix: use the production-map labels consistently in workspace chips, headings, status, and next-step text:
     - `Synopsis`
     - `Visual Prep`
     - `Audit`
     - `Cockpit`
     - `Export`
   - Files:
     - Modify `src/portals/writer/writerSearch.ts`
     - Modify `src/portals/writer/writerWorkflowChronology.ts`
     - Modify `src/portals/writer/writerNextStep.ts`
     - Modify `src/portals/writer/WriterPortal.tsx`
   - Acceptance:
     - The same concept has the same name in the ribbon, map, heading, and status.

### 2. Medium Fixes

These make the workflow safer and more understandable, especially for user-authored edits and partial regeneration.

1. **Add A Lock / Protection MVP**
   - Problem: user-authored synopsis, outline instructions, outline, beats, and dialogue can be blanked or overwritten during regeneration.
   - Fix: store protection metadata in `writer_issues.notes.writer_locks` with keys for:
     - `issue.synopsis`
     - `issue.author_outline`
     - `issue.synopsis_helper`
     - `issue.outline_instructions`
     - `issue.production_defaults`
     - `outline.latest`
     - `page.<pageId>.beats`
     - `page.<pageId>.dialogue`
   - Files:
     - Create `src/portals/writer/writerProtectionLocks.ts`
     - Create `src/portals/writer/__tests__/writerProtectionLocks.test.ts`
     - Modify `src/portals/writer/WriterPortal.tsx`
   - Acceptance:
     - Users can lock/unlock each protected part.
     - Lock state persists after reload.
     - Locked parts show a visible lock badge next to the relevant editor and preview.

2. **Guard Regeneration Against Locked Content**
   - Problem: regeneration and batch operations can overwrite more than the user expects.
   - Fix: before `Generate outline`, `Generate page beats`, `Generate all beats`, `Draft dialogue`, pacing regeneration preview apply, clear beats, or clear dialogue, check locks and block or warn.
   - Files:
     - Modify `src/portals/writer/WriterPortal.tsx`
     - Test `src/portals/writer/__tests__/writerProtectionLocks.test.ts`
   - Acceptance:
     - Locked page beats/dialogue are skipped in batch generation.
     - Locked outline/synopsis/helper fields cannot be overwritten by a regenerate action without unlocking.
     - The warning names the exact locked item and the action that was blocked.

3. **Preserve Draft Inputs Before AI Calls**
   - Problem: optional text like outline instructions and director notes can disappear or remain unsaved, forcing re-entry.
   - Fix: save high-risk drafts before generation actions:
     - Outline instructions draft -> issue notes under `writer_drafts.outline_instructions`
     - Beats director notes -> issue notes under `writer_drafts.beats_director_notes`
     - Creative brief -> issue notes under `writer_drafts.visual_brief`
   - Files:
     - Create or extend a helper such as `src/portals/writer/writerDraftPersistence.ts`
     - Test `src/portals/writer/__tests__/writerDraftPersistence.test.ts`
     - Modify `src/portals/writer/WriterPortal.tsx`
   - Acceptance:
     - Reloading the portal restores these drafts.
     - Starting generation first persists the current draft value before invoking AI.

4. **Replace Raw JSON First Views With Creator-Friendly Summaries**
   - Problem: users see raw JSON as the dominant preview for outline and beats.
   - Fix: render readable summaries first:
     - Outline -> page list with scene, summary, emotional turn.
     - Beats -> panel cards with action, composition, emotion, dialogue placeholder.
     - Dialogue -> script block remains readable text.
     - JSON editor stays under `Advanced JSON`.
   - Files:
     - Modify `src/portals/writer/WriterPortal.tsx`
     - Optionally create `src/portals/writer/WriterReadableOutput.tsx`
   - Acceptance:
     - Non-technical users can inspect story outputs without reading JSON.

5. **Add Regeneration Scope Preview**
   - Problem: users do not know which pages or layers will change.
   - Fix: show a compact `This will change` panel before regeneration:
     - selected layer
     - selected pages
     - locked items skipped
     - downstream effects
   - Files:
     - Create `src/portals/writer/writerRegenerationScope.ts`
     - Test `src/portals/writer/__tests__/writerRegenerationScope.test.ts`
     - Modify `src/portals/writer/WriterPortal.tsx`
   - Acceptance:
     - Every destructive or overwrite-capable AI action names its scope before running.

### 3. Structural Changes

These should follow the quick and medium fixes. They are larger because they simplify the whole portal model.

1. **Create A Real Export Workspace**
   - Problem: Export is a production-map step but not a first-class workspace.
   - Fix: add `export` as a real workspace tab/stage rather than reusing `scripts`.
   - Files:
     - Modify `src/portals/writer/writerSearch.ts`
     - Modify `src/portals/writer/writerWorkflowChronology.ts`
     - Modify `src/portals/writer/WriterRibbon.tsx`
     - Modify `src/portals/writer/WriterPortal.tsx`
     - Update chronology tests.
   - Acceptance:
     - `Export` is visible as a workspace chip.
     - Export no longer competes with Synopsis helper.

2. **Introduce A Guided Mode For First-Time Or Tired Users**
   - Problem: the portal exposes every expert tool at once.
   - Fix: add a `Guided / Advanced` toggle. Guided mode shows one current-stage task, one primary next action, and one secondary `More actions` menu.
   - Files:
     - Modify `src/portals/writer/WriterPortal.tsx`
     - Optionally create `src/portals/writer/WriterGuidedStage.tsx`
   - Acceptance:
     - Guided mode reduces visible controls by at least half in the first viewport.
     - Advanced mode keeps current power-user access.

3. **Add Version / Restore For User-Owned Story Parts**
   - Problem: locks prevent future overwrite, but users also need recovery after accidental overwrite.
   - Fix: snapshot user-owned fields before overwrite-capable actions:
     - synopsis/helper/outline instructions
     - latest outline JSON
     - page beats JSON
     - page dialogue text
   - Files:
     - Create `src/portals/writer/writerStorySnapshots.ts`
     - Create `src/portals/writer/__tests__/writerStorySnapshots.test.ts`
     - Modify `src/portals/writer/WriterPortal.tsx`
   - Acceptance:
     - Before regeneration, the previous value is recoverable from a `Restore previous` control.
     - Snapshots are capped to avoid unbounded notes growth.

4. **Unify Page Selection**
   - Problem: page arrows, page buttons, batch checkboxes, production badges, and right-drawer page lists compete.
   - Fix: create one persistent page selector near the top of the Writer workspace, with separate `Batch mode` for multi-page operations.
   - Files:
     - Modify `src/portals/writer/WriterPortal.tsx`
     - Optionally create `src/portals/writer/WriterPageSelector.tsx`
   - Acceptance:
     - The selected page is always obvious.
     - Batch selection cannot be confused with the page currently being edited.

5. **Separate Safe AI Assist From Overwrite Actions**
   - Problem: brainstorming, preview, regenerate, save, and overwrite actions live too close together.
   - Fix: define two action groups:
     - `Ask / brainstorm / preview` never writes.
     - `Apply / regenerate / clear` requires scope preview and respects locks.
   - Files:
     - Modify `src/portals/writer/WriterPortal.tsx`
     - Update helper tests for locks and regeneration scope.
   - Acceptance:
     - Users can ask for help without fearing the app will rewrite story state.

## Execution Order

1. Quick Win 1: Export routing.
2. Quick Win 2: direct edit discoverability.
3. Quick Win 3: truthful primary actions.
4. Quick Win 4 and 5: panel default and label consistency.
5. Medium Fix 1: lock helper and persistence.
6. Medium Fix 2: generation guards.
7. Medium Fix 3: draft persistence.
8. Medium Fix 4 and 5: readable output and regeneration scope preview.
9. Structural changes after quick/medium fixes are stable.

## Verification Plan

- Run focused tests after helper work:
  - `npm run test -- --run src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerProtectionLocks.test.ts src/portals/writer/__tests__/writerDraftPersistence.test.ts src/portals/writer/__tests__/writerRegenerationScope.test.ts`
- Run existing Writer regression tests:
  - `npm run test -- --run src/portals/writer/__tests__/writerPageEditReview.test.ts src/portals/writer/__tests__/writerProductionBranches.test.ts src/shared/writer/__tests__/schemas.test.ts src/shared/api/__tests__/writerTools.test.ts`
- Run full project checks before handoff:
  - `npm run build`
  - `npm run lint`
  - `git diff --check`
- Browser QA:
  - Open Writers' Workshop from the hub.
  - Confirm direct edit controls are visible in Outline, Synopsis, Beats, and Dialogue without using File.
  - Lock synopsis, outline instructions, one page's beats, and one page's dialogue; reload and confirm locks remain.
  - Attempt blocked regeneration and confirm the warning names the locked item.
  - Confirm `12 Export` opens visible export controls.
  - Confirm completed Beats/Dialogue stages offer continue actions instead of primary regenerate actions.

## Non-Goals For The First Implementation Pass

- Do not add a database migration unless issue-notes lock metadata proves insufficient.
- Do not redesign the entire portal visual system.
- Do not remove advanced JSON editing; move it behind clearer advanced affordances.
- Do not change `writer-tools` prompts until UI guards and lock metadata behavior are proven locally.
