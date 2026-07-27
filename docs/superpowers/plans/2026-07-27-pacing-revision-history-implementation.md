# Pacing Revision History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stale active Pacing Revision Sets with a safe archive/history lifecycle whenever a new Pacing Review succeeds.

**Architecture:** Add an `archived` persistence status and an authenticated metadata-only archive RPC guarded by owner, expected status, and `updated_at`. Keep active and history queries separate, centralize replacement policy in a pure lifecycle module, and render archived sets through a dedicated read-only history surface that reuses the existing comparison workspace.

**Tech Stack:** React 19, TypeScript, Supabase/PostgreSQL/RLS, Zod, Vitest/Testing Library, Vite, Cloudflare Workers.

---

## Risk and dependency check

- The archive transition must never mutate `writer_pages`, `writer_issue_outlines`, Items, or Child Changes.
- A failed new AI review must leave the existing active set untouched.
- Concurrent set edits must make guarded archive fail rather than hiding newer work.
- `applying` and active generation are non-replaceable.
- Archived history must be read-only and must not expose Undo/Apply/Edit/Retry/decision actions.
- Supabase CLI authentication and Cloudflare deploy authentication must be verified before hosted release.
- Rollback: if the migration or frontend release blocks the workflow, preserve existing statuses, revert the frontend to the prior Cloudflare version, and leave archived records recoverable through the history query.

## File map

- Create `src/portals/writer/writerPacingRevisionLifecycle.ts` — pure replacement/archive policy.
- Create `src/portals/writer/WriterPacingRevisionHistory.tsx` — compact history disclosure and read-only selected-history shell.
- Create `src/portals/writer/__tests__/writerPacingRevisionLifecycle.test.ts` — lifecycle policy tests.
- Create `src/portals/writer/__tests__/WriterPacingRevisionHistory.test.tsx` — history interaction/accessibility tests.
- Create `supabase/migrations/20260727030000_writer_pacing_revision_archive.sql` — `archived` status and owner-scoped guarded archive RPC.
- Modify `src/shared/writer/pacingRevisionSchemas.ts` — add `archived`.
- Modify `src/shared/api/writerPacingRevisionSets.ts` — active/history queries and archive RPC.
- Modify `src/shared/api/__tests__/writerPacingRevisionSets.test.ts` — query and RPC regressions.
- Modify `src/portals/writer/useWriterPacingRevisionSet.ts` — active/history state and manual/automatic archive actions.
- Modify `src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx` — hook lifecycle regressions.
- Modify `src/portals/writer/WriterPacingRevisionWorkspace.tsx` — archived terminal/read-only semantics.
- Modify `src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx` — archived control suppression.
- Modify `src/portals/writer/WriterPortal.tsx` — single/batch replacement orchestration and Simple/Advanced history placement.
- Modify targeted Portal tests — new review success/failure and replacement UI.
- Modify `AGENTS.md`, the design/plan, and `walkthrough.md` — durable contract and factual release record.

## Pass 1: Persistence lifecycle

**Objective:** Make archive a durable, owner-scoped, metadata-only lifecycle state.

**Acceptance criteria:**

- `archived` parses as a Revision Set status.
- Active listing excludes archived/discarded sets.
- History listing returns only archived sets newest first.
- Archive RPC requires the authenticated owner plus exact status and `updated_at`.
- RPC rejects generating/applying/foreign/changed sets and updates only the set row.

- [x] **Step 1: Write RED schema/API/migration tests**

Add assertions equivalent to:

```ts
expect(pacingRevisionSetStatusSchema.parse('archived')).toBe('archived');
expect(activeQuery.neq).toHaveBeenCalledWith('status', 'archived');
expect(historyQuery.eq).toHaveBeenCalledWith('status', 'archived');
expect(rpc).toHaveBeenCalledWith('archive_writer_pacing_revision_set', {
  p_set_id: SET_ID,
  p_expected_status: 'applied',
  p_expected_updated_at: '2026-07-27T10:00:00.000Z',
});
```

Migration-contract tests must assert `security invoker`, `auth.uid()`, `series.owner_id`, `for update`, exact expected status/time comparisons, allowed archive sources, one-row verification, authenticated-only grant, and absence of `writer_pages`, `writer_issue_outlines`, Item, or Child Change mutation.

- [x] **Step 2: Run Pass 1 RED**

```bash
npm run test -- --run src/shared/api/__tests__/writerPacingRevisionSets.test.ts src/shared/api/__tests__/writerPacingRevisionArchiveMigration.test.ts
```

Expected: failures for missing status, history query, archive RPC, and migration.

- [x] **Step 3: Implement migration and schema**

Add `archived` to the database status constraint and Zod enum. Implement:

```sql
create or replace function public.archive_writer_pacing_revision_set(
  p_set_id uuid,
  p_expected_status text,
  p_expected_updated_at timestamptz
) returns boolean
```

The function locks the owner’s set, requires `p_expected_status in ('ready','partially_ready','applied','failed')`, compares status/time exactly, updates only `writer_pacing_revision_sets.status = 'archived'`, and verifies one affected row.

- [x] **Step 4: Implement active/history/archive API**

Add:

```ts
listWriterPacingRevisionSetHistory(issueId: string): Promise<SetsResult>
archiveWriterPacingRevisionSet(input: {
  setId: string;
  expectedStatus: 'ready' | 'partially_ready' | 'applied' | 'failed';
  expectedUpdatedAt: string;
}): Promise<{ ok: true } | ApiFailure>
```

Fail before RPC when `updated_at` is absent or status is ineligible.

- [x] **Step 5: Run Pass 1 smoke**

Run the two focused files plus `git diff --check`. Expected: all pass.

- [x] **Step 6: Commit Pass 1**

```bash
git add src/shared/writer/pacingRevisionSchemas.ts src/shared/api/writerPacingRevisionSets.ts src/shared/api/__tests__ supabase/migrations/20260727030000_writer_pacing_revision_archive.sql
git commit -m "feat: add pacing revision archive lifecycle"
```

**Pass 1 smoke test:** Schema, API, and migration-contract files only.

**Pass 1 result:** PASS — added the owner-scoped guarded archive lifecycle and separate active/history queries. RED failed for the missing status, API functions/query guards, and migration. GREEN passed 3 files / 27 tests, including schema, API, and static migration contracts; `git diff --check` passed. No live Supabase migration or deployment was performed.

## Pass 2: Replacement orchestration and hook state

**Objective:** Archive the expected prior set only after a new review succeeds and expose recoverable history state.

**Acceptance criteria:**

- Applied/failed sets use automatic post-success archive.
- Ready/partially-ready sets require confirmation.
- Applying/generating sets block replacement.
- Failed AI review never archives.
- Archive conflict preserves the active set and reports the saved-review/failed-archive split.
- Hook exposes history loading, retry, selected history, and manual archive.

- [ ] **Step 1: Write RED lifecycle policy tests**

Define and test:

```ts
replacementPolicy({ status: 'applied', generating: false }) // auto_archive
replacementPolicy({ status: 'ready', generating: false }) // confirm_archive
replacementPolicy({ status: 'applying', generating: false }) // blocked
replacementPolicy({ status: 'failed', generating: false }) // auto_archive
replacementPolicy({ status: 'ready', generating: true }) // blocked
```

- [ ] **Step 2: Write RED hook/orchestration tests**

Prove:

1. successful review → guarded archive → active/history refresh;
2. failed review → no archive;
3. confirmation cancel → no review and no archive;
4. archive conflict → new review retained, old active set visible, explicit error;
5. manual archive requires eligible status and moves the set into history;
6. history-load error preserves active state and exposes retry.

- [ ] **Step 3: Run Pass 2 RED**

```bash
npm run test -- --run src/portals/writer/__tests__/writerPacingRevisionLifecycle.test.ts src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx
```

Expected: failures for missing policy and history/archive hook contract.

- [ ] **Step 4: Implement the pure lifecycle module**

Export:

```ts
export type PacingRevisionReplacementPolicy =
  | { kind: 'none' }
  | { kind: 'auto_archive' }
  | { kind: 'confirm_archive'; message: string }
  | { kind: 'blocked'; message: string };
```

No React, network, or browser dependency belongs in this file.

- [ ] **Step 5: Implement hook history/archive state**

Add `historySets`, `historyLoading`, `historyError`, `selectedHistorySet`, `refreshHistory`, `selectHistory`, `closeHistory`, and `archiveActive`. Refresh active and history after successful archive. Preserve active state on every failure.

- [ ] **Step 6: Add single-review orchestration**

In `WriterPortal`, evaluate policy before AI invocation; use one confirmation for unfinished work; call guarded archive only after `pacing_review` succeeds; refresh issue plus active/history state; and surface the split-success error verbatim.

- [ ] **Step 7: Run Pass 2 smoke**

Run lifecycle/hook tests and the focused Portal orchestration test. Expected: all pass.

- [ ] **Step 8: Commit Pass 2**

```bash
git add src/portals/writer/writerPacingRevisionLifecycle.ts src/portals/writer/useWriterPacingRevisionSet.ts src/portals/writer/WriterPortal.tsx src/portals/writer/__tests__
git commit -m "feat: replace stale pacing revision sets"
```

**Pass 2 smoke test:** Lifecycle, hook, and single-review orchestration only.

**Pass 2 result:** Pending.

## Pass 3: Simple Workflow history and manual archive

**Objective:** Make archived versions discoverable and safely readable in both workflow modes.

**Acceptance criteria:**

- Active workspace shows `Archive revision set`.
- Manual archive always confirms.
- `Revision history (N)` is visible in Simple and Advanced Story Review.
- Archived selection is explicitly read-only and exposes no mutation controls.
- History works by keyboard and at narrow widths.

- [ ] **Step 1: Write RED component tests**

Cover disclosure count, newest-first entries, View/Back interactions, archive confirmation callback, loading/error/retry, wrapped metadata, and semantic archived status.

- [ ] **Step 2: Write RED workspace terminal tests**

Render an archived set and assert absence of select-all, checkboxes, Edit, Approve, Reject, Retry, Apply, Undo, and batch controls.

- [ ] **Step 3: Run Pass 3 RED**

```bash
npm run test -- --run src/portals/writer/__tests__/WriterPacingRevisionHistory.test.tsx src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx
```

- [ ] **Step 4: Implement `WriterPacingRevisionHistory`**

Use native `<details>`, `<summary>`, and buttons. The selected-history shell renders:

```tsx
<div role="status">Archived revision set — official story content is unchanged.</div>
```

and delegates comparison rendering to the existing workspace.

- [ ] **Step 5: Implement archived workspace semantics**

Treat `archived` as terminal/read-only and use `Archived proposal`/`Archived current` language without mutation actions.

- [ ] **Step 6: Integrate both Story Review layouts**

Place the history disclosure beside the active/new review lifecycle in both duplicated Simple and Advanced render paths. Add a confirmed manual archive action and keep active/new diagnosis visible when history closes.

- [ ] **Step 7: Run Pass 3 smoke**

Run history, workspace, hook, and Portal UI tests. Expected: all pass.

- [ ] **Step 8: Three-pass audit**

Audit lifecycle truthfulness, no live mutation, confirmation copy, stale-state guards, read-only control suppression, loading/error/retry, keyboard/focus, responsive wrapping, and duplicated Simple/Advanced consistency. Fix all P0/P1 issues.

- [ ] **Step 9: Commit Pass 3**

```bash
git add src/portals/writer/WriterPacingRevisionHistory.tsx src/portals/writer/WriterPacingRevisionWorkspace.tsx src/portals/writer/WriterPortal.tsx src/portals/writer/__tests__
git commit -m "feat: show pacing revision history"
```

**Pass 3 smoke test:** History/workspace UI and accessibility only.

**Pass 3 result:** Pending.

**Three-pass audit result:** Pending.

## Pass 4: Batch consistency and recovery edges

**Objective:** Apply the same replacement contract to batch Pacing Review without silent loss.

**Acceptance criteria:**

- Batch preflights all selected issues.
- One confirmation covers all unfinished eligible sets.
- Applying/generating issues are skipped with visible reasons.
- Each successful issue archives only its own expected prior set.
- AI or archive failure on one issue does not discard another issue’s success.

- [ ] **Step 1: Add RED batch lifecycle tests**

Cover mixed terminal/unfinished/applying issues, confirmation cancel, per-issue AI failure, archive conflict, and partial success.

- [ ] **Step 2: Implement batch preflight and per-issue archive**

Load each issue’s active set before the first invocation. Confirm once for unfinished sets. Preserve current ordered queue and history messages; append skipped/conflicted issue summaries.

- [ ] **Step 3: Run Pass 4 smoke**

Run batch orchestration and lifecycle tests only. Expected: all pass.

- [ ] **Step 4: Commit Pass 4**

```bash
git add src/portals/writer/WriterPortal.tsx src/portals/writer/writerPacingRevisionLifecycle.ts src/portals/writer/__tests__
git commit -m "fix: preserve pacing batch replacement state"
```

**Pass 4 smoke test:** Batch replacement and partial-success recovery only.

**Pass 4 result:** Pending.

## Pass 5: Integrated QA, release, and final audits

**Objective:** Verify the complete replacement/history workflow and release the tested state.

**Acceptance criteria:**

- Applied set → new review → automatic archive → new Create Revision Set works.
- Unfinished cancel/confirm and manual archive work.
- Archived history is readable and mutation-free.
- Full regression, lint, build, migration, browser QA, code review, merge, and deployment pass.

- [ ] **Step 1: Run consolidated focused gate**

Run all Pacing Revision model/API/hook/workspace/history/Portal/migration tests. Report files and tests separately.

- [ ] **Step 2: Run full regression gate**

```bash
npm run test -- --run
npm run lint
npm run build
git diff --check
```

- [ ] **Step 3: Local signed-in browser QA**

Verify applied replacement, unfinished cancel and confirm, manual archive, history View/Back, new Create Revision Set, keyboard focus, narrow viewport, and clean console/network. Capture representative top/middle/bottom evidence.

- [ ] **Step 4: Final audits**

- **ReAct:** no observation/action ambiguity or silent replacement.
- **QA:** status concurrency, AI failure, archive failure, partial batch success, and rollback boundaries.
- **UI/UX:** discoverability, confirmation, history clarity, accessibility, responsive behavior, loading/error/retry.
- **DOX:** changed paths and durable contracts current.
- **Code review:** no unresolved Critical/Important finding.

- [ ] **Step 5: Update durable records**

Update `AGENTS.md`, this plan, and `walkthrough.md`; verify targeted section presence and `git diff --check`.

- [ ] **Step 6: Commit and push**

Push `codex/pacing-revision-history`, open a complete PR, and wait for checks.

- [ ] **Step 7: Deploy and smoke production**

Deploy migration, frontend, and any changed Edge Function. Record migration/version IDs. In a fresh signed-in production tab, confirm the current bundle and one safe archive/history lifecycle with clean logs.

- [ ] **Step 8: Merge**

Merge only after review/checks and hosted smoke pass. Confirm production remains live.

**Pass 5 smoke test:** Fresh signed-in production archive/history replacement plus clean console/network.

**Pass 5 result:** Pending.

## Final completion checklist

- [ ] Design requirements are implemented without hard deletion.
- [ ] Every pass smoke passes before the next pass.
- [ ] Three-pass and final audits are recorded.
- [ ] Full tests, lint, build, and diff checks pass.
- [ ] Migration and production bundle match the tested commit.
- [ ] Walkthrough and DOX updates are verified.
- [ ] PR is reviewed, merged, and production status confirmed.
