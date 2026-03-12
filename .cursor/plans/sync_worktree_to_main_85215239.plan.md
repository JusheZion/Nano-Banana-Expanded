---
name: Sync worktree to main
overview: Commit the existing build-fix and Phase 16 changes on main, then update the arcs-migration worktree so it has the same code. No ARCS restructure in this plan—only preserving integrity and aligning the worktree.
todos: []
isProject: false
---

# Sync arcs-migration worktree to main (Option A)

## Goal

- Preserve all current work (build fixes, Home ribbon, Phase 16) by committing on `main`.
- Bring the `arcs-migration` worktree up to date with that commit so future ARCS work starts from a clean, building baseline.

## Preconditions

- **Main workspace** is on branch `main` with uncommitted changes (TypeScript/comicStore fixes, Home ribbon, balloon B/I/U, etc.).
- **Worktree** at `.worktrees/arcs-migration` is on branch `arcs-migration` at an older commit (same as previous `main` HEAD before the uncommitted fixes).

## Steps

### 1. Commit on main (in main workspace)

- **Where:** Use the main repo root (`/Users/apoaaron/.gemini/antigravity/Nano Banana Expanded`), not the worktree.
- **Actions:**
  - Stage only the files that are part of the build fix and Phase 16 work (exclude unrelated or generated paths like `.cursor/settings.json`, `nano-banana-expanded@0.0.0`, `vite`, if present in status).
  - Commit with a single descriptive message, e.g.:  
  `fix: TypeScript strict types in comicStore + Phase 16 Home ribbon; add .worktrees to gitignore`
- **Files to include in commit (from prior context):**  
`.gitignore`, `implementation_plan.md`, `src/modes/comic/components/BalloonNode.tsx`, `ColorWheelPicker.tsx`, `ContextualRibbon.tsx`, `GradientBuilder.tsx`, `MenuBar.tsx`, `PrecisionSlider.tsx`, `ComicLayout.tsx`, `gradientUtils.ts`, `comicStore.ts`, `src/types/balloon.ts`, `tasks.md`, `walkthrough.md`.  
Omit untracked/generated dirs (e.g. `.cursor/`, `nano-banana-expanded@0.0.0`, `vite`) unless you explicitly want them versioned.
- **Verification:** After commit, run `npm run build` in the main workspace and confirm it still passes.

### 2. Update arcs-migration worktree to match main

- **Where:** From the main repo root (or the worktree directory).
- **Option 2a (rebase, linear history):**  
`git checkout arcs-migration && git rebase main`  
Then in the worktree folder, the working tree will show the same files as the new `main` (worktree is tied to `arcs-migration`; after rebase, `arcs-migration` will point to the same commit as `main` if there are no other commits on `arcs-migration`).
- **Option 2b (merge, explicit merge commit):**  
`git checkout arcs-migration && git merge main`  
Same end state for the worktree files; history keeps a merge commit.
- **Recommendation:** Use **rebase** (2a) so `arcs-migration` is simply “main + future ARCS commits” with a straight line.
- **Verification:** In `.worktrees/arcs-migration`, run `npm install` (if needed) and `npm run build`; both should pass.

### 3. Confirm baseline

- In the worktree: `git log -1 --oneline` should show the same commit as `main` (after rebase) or a merge commit that includes it (after merge).
- Document in `walkthrough.md` (or a short note) that ARCS migration work is done in branch `arcs-migration` and worktree `.worktrees/arcs-migration` so that future sessions know where to work.

## Safety and rollback

- **Before committing:** You can run `git diff --stat` and `git status` in the main workspace to double-check what will be committed.
- **If rebase causes issues:** `git rebase --abort` from `arcs-migration` restores the branch to its pre-rebase state.
- **No destructive moves:** This plan does not delete or restructure any app directories; it only commits current changes and syncs the worktree branch.

## Outcome

- All build fixes and Phase 16 work are committed on `main`.
- The `arcs-migration` worktree has the same code as the new `main` and builds successfully.
- ARCS ecosystem migration (rebrand, directory restructure, code-splitting, new portals) can then be implemented in the worktree without risking the main workspace until merge.

## Out of scope for this plan

- Implementing the ARCS rebrand, `src/shared/`, `src/portals/`*, dual-studio logic, WordArt expansion, or pre-fetch behavior. Those follow in a separate plan after this sync is done.

