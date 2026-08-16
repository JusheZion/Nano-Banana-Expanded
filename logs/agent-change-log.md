### 2026-08-16 00:12 EDT - Feature: Weekly bug and refactor check

- Job ID: 20260816-000304-arcs-weekly-bug-check
- Workflow: Heavy
- Workflow version: lean-routing-2026-08-03
- Model: GPT-5
- Started: 2026-08-16 00:03 EDT
- Finished: 2026-08-16 00:12 EDT
- Elapsed: 9m
- Initial outcome: success
- Outcome: success
- Rerouted: none
- Failed fix attempts: 0
- Bugs:
  - Pre-existing: 1
  - Introduced and caught: 1
  - Escaped regression: 0
- Release result: success
- Related job ID: none
- Files changed:
  - `src/portals/storyline/ImageshopImportPanel.tsx`
  - `src/portals/storyline/__tests__/ImageshopImportPanel.test.tsx`
  - `src/modes/comic/components/LayerTree.tsx`
  - `src/modes/comic/components/TextToolbar.tsx`
  - `src/modes/comic/components/ObjectToolbar.tsx`
  - `src/modes/comic/components/ColorWheelPicker.tsx`
  - `walkthrough.md`
- Steps taken:
  1. Established clean build/test behavior and inventoried 72 ESLint warnings without touching user-owned worktree changes.
  2. Reproduced the Imageshop NPC-to-Character stale metadata failure with a focused interaction test.
  3. Added the missing callback dependency and verified the corrected persistence metadata.
  4. Extracted LayerTree's pure resolver, tightened two UI domain types, and completed the color-picker dependency list.
  5. Audited Vite environment access and 59 catalog/hero asset references, then ran the consolidated gate.
  6. Committed `9cb1216` and pushed it to `origin/main`.
- Tests run:
  - Command: baseline `npm run lint` - passed with 0 errors / 72 warnings.
  - Command: baseline `npm run build` - passed with the existing chunk-size advisory.
  - Command: baseline `npm run test` - passed, 150 files / 1,073 tests.
  - Command: `npm run test -- --run src/portals/storyline/__tests__/ImageshopImportPanel.test.tsx` before the fix - failed as expected, reproducing `vaultTarget: npc` on a Character save.
  - Command: corrected `npm run test -- --run src/portals/storyline/__tests__/ImageshopImportPanel.test.tsx` - passed, 1 file / 1 test.
  - Command: targeted `npx eslint` checks for each changed implementation/test file - passed with 0 warnings.
  - Command: `npx tsc -b --pretty false` after each typed refactor - passed three times.
  - Command: catalog/hero asset existence audit with Node and `test -f` - passed, 59 references present.
  - Command: final `npm run lint` - passed with 0 errors / 67 warnings.
  - Command: final `npm run build` - passed with the existing chunk-size advisory.
  - Command: final `npm run test` - passed, 151 files / 1,074 tests.
  - Command: `git diff --check` and `git diff --cached --check` - passed.
- Notes:
  - The introduced-and-caught count records an intermediate LayerItem type that omitted the existing group variant; post-edit inspection caught and corrected it before TypeScript verification.
  - No live Gemini, Supabase, migration, deployment, or production-data mutation was performed.
  - 67 legacy warnings remain concentrated in larger Konva/comic rendering and backend/test surfaces.
  - The DOX pass left `AGENTS.md` unchanged because no durable contract, ownership, structure, workflow, permission, or behavior rule changed.
