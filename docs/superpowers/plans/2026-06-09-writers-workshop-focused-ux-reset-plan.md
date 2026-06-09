# Writers Workshop Focused UX Reset Plan

**Goal:** Reduce Writers Workshop first-screen overload, make series switching obvious, remove redundant navigation in the default view, and promote issue visual references into a findable Visual Canon workflow without changing the working Writer AI generation pipeline.

**Status:** Complete locally on `codex/writer-focused-ux-reset`.

## Pass Checklist

- [x] Pass 1: Branch and baseline from the clean current checkout.
- [x] Pass 2: Add red/green workspace model tests for Dashboard and Visual Canon.
- [x] Pass 3: Replace `Guided / Advanced` UI language with `Focused / All Tools`.
- [x] Pass 4: Add Focused Dashboard as the default Writer workspace.
- [x] Pass 5: Add persistent top Series / Issue / Page selectors so switching series does not depend on the hidden dock.
- [x] Pass 6: Add Focused workflow rail and hide the full ribbon / production navigator in Focused mode.
- [x] Pass 7: Promote visual references into a first-class Visual Canon workspace and Dashboard card.
- [x] Pass 8: Compact the Focused edit/protection bar while preserving the full edit/lock strip in All Tools.
- [x] Pass 9: Add a user-facing location map guide at `docs/writers-workshop-focused-ux-guide.md`.

## Verification

- [x] `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts`
- [x] `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerVisualReferences.test.ts`
- [x] `npm run test -- --run src/portals/writer/__tests__/writerWorkspaceModel.test.ts src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerVisualReferences.test.ts src/portals/writer/__tests__/writerProtectionLocks.test.ts src/portals/writer/__tests__/writerDraftPersistence.test.ts src/portals/writer/__tests__/writerRegenerationScope.test.ts`
- [x] `npm run test` - 81 files / 434 tests passed.
- [x] `npm run build`
- [x] `npm run lint` - 0 errors, 67 existing warnings.
- [x] `git diff --check`
- [x] Browser QA on local Writers Workshop:
  - Dashboard appears first.
  - Series / Issue / Page switching is visible without the dock.
  - Focused mode hides ribbon and production map.
  - All Tools restores ribbon and production map.
  - Visual Canon is reachable from Dashboard and workflow rail.
  - Existing visual references render in the issue picker context; no attach/remove was performed during this smoke pass to avoid creating new signed-in account data.

## Assumptions

- Existing visual-reference storage and `writer-tools` bridge behavior are correct.
- This pass should not add a Supabase migration.
- All advanced Writer controls remain available in All Tools rather than being deleted.
