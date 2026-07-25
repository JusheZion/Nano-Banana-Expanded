# Writer Pacing Revision Sets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a durable, preview-first Pacing Revision Set workflow that connects Pacing Review to the Live Outline, Page Beats, and Dialogue through readable individual and batch review.

**Architecture:** Persist revision sets, editorial items, and three-state Child Changes in owner-protected Supabase tables. Generate the proposed Outline with deterministic patch operations, then generate affected Page Beat and Dialogue candidates through a resumable one-page-per-Edge-invocation client queue. Apply approved changes in dependency order after staleness/lock checks and a complete recovery snapshot.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Zod, Supabase/Postgres/RLS/Edge Functions, Gemini structured output, Tailwind CSS, Browser plugin.

---

## Risk and Dependency Check

- Preserve the intentional dirty `AGENTS.md`, `tasks.md`, `walkthrough.md`, and handoff changes.
- Work only on `codex/pacing-revision-set`.
- Use the authenticated Supabase CLI fallback because Supabase MCP is not exposed.
- Use the dedicated QA account and persistent QA issue; never mutate the user's completed 70-page issue.
- Keep every page-generation Edge invocation capped at one page.
- Do not expose raw JSON or opaque IDs in Simple Workflow.
- Stop a pass when its focused smoke fails; repair before continuing.
- Fallback: the additive database tables may remain deployed while the client entry control stays hidden if live apply QA fails.

## File Map

- `supabase/migrations/20260725000000_writer_pacing_revision_sets.sql` — tables, indexes, timestamps, and owner RLS.
- `src/shared/writer/pacingRevisionSchemas.ts` — client Zod contracts and inferred types.
- `supabase/functions/_shared/pacingRevisionSchemas.ts` — Edge mirror of request/result contracts.
- `src/shared/api/writerPacingRevisionSets.ts` — revision-set CRUD and decision persistence.
- `supabase/functions/writer-tools/pacingRevisionPrompt.ts` — outline-plan prompt, normalization, deterministic application, and page prompt.
- `supabase/functions/writer-tools/index.ts` — new Writer tool modes and persistence orchestration.
- `src/portals/writer/writerPacingRevisionModel.ts` — three-state candidate, dependency, batch, stale, and progress selectors.
- `src/portals/writer/writerPacingRevisionQueue.ts` — one-page queue, five-page checkpoints, cancellation, failure ledger, and failed-only retry.
- `src/portals/writer/writerPacingRevisionApply.ts` — apply preflight, ordered writes, snapshot, compensation, and undo.
- `src/portals/writer/useWriterPacingRevisionSet.ts` — UI-facing orchestration and refresh lifecycle.
- `src/portals/writer/WriterPacingRevisionWorkspace.tsx` — readable two-panel review workspace.
- `src/portals/writer/WriterPortal.tsx` — Story Review entry, active-set integration, and Live Story refresh.
- Focused tests live beside the modules or under `src/portals/writer/__tests__` and `supabase/functions/writer-tools`.

## Pass 1 — Persistence and Shared Contracts

**Objective:** Create durable owner-scoped storage and matching client/Edge contracts.

**Acceptance criteria:** Owner RLS is explicit; three-state values, decisions, dependencies, progress, failures, fingerprints, and recovery snapshots validate on both runtimes.

- [x] **Step 1: Write failing schema tests**

Create `src/shared/writer/__tests__/pacingRevisionSchemas.test.ts` with cases that parse a complete set and reject an edited candidate without an AI proposal:

```ts
expect(pacingRevisionChildChangeSchema.parse({
  id: crypto.randomUUID(),
  item_id: crypto.randomUUID(),
  layer: 'beats',
  target_key: 'page:24:beats',
  current_value: { panels: [] },
  ai_proposal: { panels: [{ panel_number: 1, action: 'Mara waits.' }] },
  edited_candidate: null,
  decision: 'pending',
  dependency_ids: [],
  source_fingerprint: 'sha256:source',
  generation_status: 'ready',
})).toMatchObject({ layer: 'beats', decision: 'pending' });
```

- [x] **Step 2: Run the schema test and confirm failure**

Run:

```bash
npm run test -- --run src/shared/writer/__tests__/pacingRevisionSchemas.test.ts
```

Expected: FAIL because `pacingRevisionSchemas.ts` does not exist.

- [x] **Step 3: Add the migration**

Create `supabase/migrations/20260725000000_writer_pacing_revision_sets.sql` with:

```sql
create table public.writer_pacing_revision_sets (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.writer_issues(id) on delete cascade,
  source_outline_id uuid references public.writer_issue_outlines(id) on delete set null,
  status text not null check (status in ('generating','partially_ready','ready','applying','applied','failed','discarded')),
  pacing_review_json jsonb not null,
  source_outline_json jsonb not null,
  proposed_outline_json jsonb,
  source_fingerprint text not null,
  progress_json jsonb not null default '{}'::jsonb,
  failure_ledger jsonb not null default '[]'::jsonb,
  apply_snapshot jsonb,
  recovery_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.writer_pacing_revision_items (
  id uuid primary key,
  revision_set_id uuid not null references public.writer_pacing_revision_sets(id) on delete cascade,
  position integer not null,
  title text not null,
  rationale text not null,
  affected_page_numbers integer[] not null default '{}',
  generation_status text not null default 'pending',
  unique (revision_set_id, position)
);

create table public.writer_pacing_revision_changes (
  id uuid primary key,
  item_id uuid not null references public.writer_pacing_revision_items(id) on delete cascade,
  layer text not null check (layer in ('outline','beats','dialogue')),
  target_key text not null,
  page_id uuid references public.writer_pages(id) on delete set null,
  page_number integer,
  current_value jsonb,
  ai_proposal jsonb not null,
  edited_candidate jsonb,
  decision text not null default 'pending' check (decision in ('pending','approved','rejected')),
  dependency_ids uuid[] not null default '{}',
  reason text not null,
  source_fingerprint text not null,
  generation_status text not null default 'ready',
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, layer, target_key)
);
```

Add indexes, updated-at triggers, RLS, and `FOR ALL` policies using `writer_issues → writer_series.owner_id = auth.uid()` for all three tables.

- [x] **Step 4: Implement mirrored Zod schemas**

Create the client and Edge schema files with identical enums and payload shapes. Export:

```ts
export const pacingRevisionLayerSchema = z.enum(['outline', 'beats', 'dialogue']);
export const pacingRevisionDecisionSchema = z.enum(['pending', 'approved', 'rejected']);
export const pacingRevisionChildChangeSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  layer: pacingRevisionLayerSchema,
  target_key: z.string().min(1),
  page_id: z.string().uuid().nullable().optional(),
  page_number: z.number().int().positive().nullable().optional(),
  current_value: z.unknown().nullable(),
  ai_proposal: z.unknown(),
  edited_candidate: z.unknown().nullable(),
  decision: pacingRevisionDecisionSchema,
  dependency_ids: z.array(z.string().uuid()),
  reason: z.string().min(1),
  source_fingerprint: z.string().min(1),
  generation_status: z.enum(['pending', 'ready', 'failed', 'stale', 'locked', 'applied']),
});
```

- [x] **Step 5: Add CRUD API tests and implementation**

Create `src/shared/api/__tests__/writerPacingRevisionSets.test.ts` around injected Supabase responses, then create `src/shared/api/writerPacingRevisionSets.ts` exporting:

```ts
listWriterPacingRevisionSets(issueId: string)
getWriterPacingRevisionSet(setId: string)
updateWriterPacingRevisionChange(changeId: string, patch: DecisionPatch)
updateWriterPacingRevisionProgress(setId: string, progress: ProgressPatch)
discardWriterPacingRevisionSet(setId: string)
```

- [x] **Step 6: Run the Pass 1 smoke test**

Run:

```bash
npm run test -- --run src/shared/writer/__tests__/pacingRevisionSchemas.test.ts src/shared/api/__tests__/writerPacingRevisionSets.test.ts
```

Expected: both files pass; record file and individual-test counts in the checklist.

- [x] **Step 7: Commit Pass 1**

```bash
git add supabase/migrations/20260725000000_writer_pacing_revision_sets.sql src/shared/writer/pacingRevisionSchemas.ts src/shared/writer/__tests__/pacingRevisionSchemas.test.ts supabase/functions/_shared/pacingRevisionSchemas.ts src/shared/api/writerPacingRevisionSets.ts src/shared/api/__tests__/writerPacingRevisionSets.test.ts
git commit -m "feat: persist pacing revision sets"
```

**Smoke result summary:** PASS — 2 focused files and 5 individual tests passed. Persistence contracts and owner RLS were added; no runtime UI behavior changed.

## Pass 2 — Deterministic Outline Revision Preview

**Objective:** Produce persisted Revision Items and Outline Child Changes without mutating the official outline.

**Acceptance criteria:** The model returns operations only; untouched source beats survive exactly once; invalid operations are rejected individually; items own non-overlapping affected pages.

- [ ] **Step 1: Write failing prompt and patch tests**

Create `supabase/functions/writer-tools/pacingRevisionPrompt.test.ts` covering a 70-beat source, eight returned operations, invalid IDs, duplicate page ownership, and no-material-change edits.

- [ ] **Step 2: Run the focused test and confirm failure**

```bash
npm run test -- --run supabase/functions/writer-tools/pacingRevisionPrompt.test.ts
```

Expected: FAIL because the pacing revision prompt module is missing.

- [ ] **Step 3: Implement the outline planning contract**

Create `pacingRevisionPrompt.ts`. Reuse `applyOutlineTreatmentPatches` and require:

```ts
type PacingRevisionPlan = {
  items: Array<{
    item_id: string;
    title: string;
    rationale: string;
    affected_page_numbers: number[];
  }>;
  operations: Array<OutlineTreatmentPatchOperation & { item_id: string }>;
};
```

Normalize overlapping pages by merging their intents before patch application. Derive Outline Child Changes from accepted operation notices and the immutable source.

- [ ] **Step 4: Add request/result schemas and Writer tool mode**

Extend client and Edge writer schemas with `pacing_revision_outline_preview`. In `index.ts`, load the saved Pacing Review and full source outline, call Gemini JSON with structured output, apply operations deterministically, insert set/items/outline changes, and return the hydrated set.

- [ ] **Step 5: Add endpoint tests**

Extend `src/shared/api/__tests__/writerTools.test.ts` and add an Edge helper test proving the mode is preview-only and does not insert `writer_issue_outlines`.

- [ ] **Step 6: Run the Pass 2 smoke test**

```bash
npm run test -- --run supabase/functions/writer-tools/pacingRevisionPrompt.test.ts supabase/functions/writer-tools/outlineTreatmentPatch.test.ts src/shared/api/__tests__/writerTools.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 7: Commit Pass 2**

```bash
git add supabase/functions/writer-tools/pacingRevisionPrompt.ts supabase/functions/writer-tools/pacingRevisionPrompt.test.ts supabase/functions/writer-tools/index.ts supabase/functions/_shared/writerSchemas.ts src/shared/writer/schemas.ts src/shared/writer/types.ts src/shared/api/__tests__/writerTools.test.ts
git commit -m "feat: preview pacing outline revisions"
```

**Smoke result summary:** Record accepted/rejected operation coverage and confirm the official outline remains unchanged.

## Pass 3 — Resumable Page Candidate Queue

**Objective:** Generate Page Beat and Dialogue Child Changes one page at a time with five-page checkpoints and persistent failure recovery.

**Acceptance criteria:** One page per Edge call; later pages continue after isolated failures; persisted successes survive cancellation/reload; failed-only retry excludes successful pages.

- [ ] **Step 1: Write failing queue tests**

Create `src/portals/writer/__tests__/writerPacingRevisionQueue.test.ts` with an injected runner:

```ts
const result = await runPacingRevisionQueue({
  pages: [1, 2, 3, 4, 5, 6],
  runPage: async (page) => page === 3
    ? { ok: false, page, reason: 'Malformed model output' }
    : { ok: true, page },
  checkpointSize: 5,
});
expect(result.completedPages).toEqual([1, 2, 4, 5, 6]);
expect(result.failures).toEqual([{ page: 3, reason: 'Malformed model output' }]);
```

- [ ] **Step 2: Confirm the queue test fails**

```bash
npm run test -- --run src/portals/writer/__tests__/writerPacingRevisionQueue.test.ts
```

- [ ] **Step 3: Implement queue and retry selectors**

Create `writerPacingRevisionQueue.ts` with ordered execution, abort-after-current-page, checkpoint callbacks, continuation after failure, and `failedPagesOnly(result)`.

- [ ] **Step 4: Add page-preview Edge mode**

Add `pacing_revision_page_preview` with a server-side one-page request cap. Load the proposed outline beat plus neighbors, current page, canon, and defaults. Require schema-constrained `panels` and Dialogue output, retry malformed JSON once at lower temperature, and persist changes before returning.

- [ ] **Step 5: Add structured-output and endpoint tests**

Cover missing panel actions, malformed JSON repair, second failure ledger entry, locked-layer exclusion, and persisted page success.

- [ ] **Step 6: Run the Pass 3 smoke test**

```bash
npm run test -- --run src/portals/writer/__tests__/writerPacingRevisionQueue.test.ts supabase/functions/writer-tools/pacingRevisionPrompt.test.ts supabase/functions/writer-tools/pageBeatsStructuredOutput.test.ts
```

- [ ] **Step 7: Commit Pass 3**

```bash
git add src/portals/writer/writerPacingRevisionQueue.ts src/portals/writer/__tests__/writerPacingRevisionQueue.test.ts supabase/functions/writer-tools/pacingRevisionPrompt.ts supabase/functions/writer-tools/pacingRevisionPrompt.test.ts supabase/functions/writer-tools/index.ts supabase/functions/_shared/writerSchemas.ts src/shared/writer/schemas.ts src/shared/writer/types.ts
git commit -m "feat: queue pacing revision candidates"
```

**Smoke result summary:** Record checkpoint, cancellation, continuation, and failed-only retry evidence.

## Audit 1 — After Three Passes

- [ ] Compare implementation against every design section through Generation Architecture.
- [ ] Confirm no page endpoint accepts more than one page.
- [ ] Confirm RLS ownership paths match existing Writer policies.
- [ ] Confirm no official Outline/Page Beats/Dialogue write occurs in preview modes.
- [ ] Run `git diff --check`.
- [ ] Record findings in the plan; repair any defect before Pass 4.

## Pass 4 — Decisions, Dependencies, Staleness, Apply, and Undo

**Objective:** Make three-state review decisions safe to apply and recover.

**Acceptance criteria:** Edited Candidates preserve AI Proposals; batch actions exclude ineligible changes; stale/locked/dependency conflicts block apply; failure compensates; undo restores through history.

- [ ] Write failing model tests in `writerPacingRevisionModel.test.ts` for effective candidate selection, batch eligibility, and dependency blockers.
- [ ] Implement pure selectors in `writerPacingRevisionModel.ts`.
- [ ] Write failing apply tests with injected Outline/page writers and a forced Dialogue failure.
- [ ] Implement `writerPacingRevisionApply.ts` with fingerprint/lock preflight, snapshot, Outline → rows → Beats → Dialogue order, reverse compensation, and undo.
- [ ] Run:

```bash
npm run test -- --run src/portals/writer/__tests__/writerPacingRevisionModel.test.ts src/portals/writer/__tests__/writerPacingRevisionApply.test.ts
```

- [ ] Commit:

```bash
git add src/portals/writer/writerPacingRevisionModel.ts src/portals/writer/writerPacingRevisionApply.ts src/portals/writer/__tests__/writerPacingRevisionModel.test.ts src/portals/writer/__tests__/writerPacingRevisionApply.test.ts
git commit -m "feat: apply pacing revisions safely"
```

**Smoke result summary:** Record stale, locked, dependency, rollback, and undo cases.

## Pass 5 — Two-Panel Review Workspace

**Objective:** Deliver the readable individual/batch review experience in an isolated component.

**Acceptance criteria:** Two distinct panels, direct edit/reset, individual and batch decisions, item/layer navigation, accessible statuses, responsive stacking, and no raw JSON in Simple Workflow.

- [ ] Write failing component tests in `WriterPacingRevisionWorkspace.test.tsx` for current/proposed headings, edit/reset, approve/reject, batch counts, dependency navigation, failed-page retry, and phone stacking classes.
- [ ] Implement `WriterPacingRevisionWorkspace.tsx` with semantic navigation, tabs, status regions, alerts, selection checkboxes, primary buttons, and matching overflow actions.
- [ ] Keep technical data inside an `Advanced details` disclosure controlled by an `advanced` prop.
- [ ] Run:

```bash
npm run test -- --run src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx
```

- [ ] Commit:

```bash
git add src/portals/writer/WriterPacingRevisionWorkspace.tsx src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx
git commit -m "feat: add pacing revision review workspace"
```

**Smoke result summary:** Record component test counts and confirm Simple Workflow contains no implementation metadata.

## Pass 6 — Story Review Integration and UX States

**Objective:** Connect creation, resume, generation, review, apply, discard, and undo to Story Review.

**Acceptance criteria:** Entry is discoverable in Simple and Advanced modes; loading is distinct from empty; refresh preserves valid content; duplicate/destructive controls disable correctly; all recovery actions are reachable.

- [ ] Write failing integration tests for the hook and WriterPortal Story Review entry.
- [ ] Implement `useWriterPacingRevisionSet.ts` with persisted refresh, queue lifecycle, announcements, and active-set selection.
- [ ] Integrate `Create Revision Set`, scope confirmation, progress checkpoints, workspace, discard, apply, and undo into `WriterPortal.tsx`.
- [ ] Add focused accessibility coverage to `writerOverlaysAccessibility.test.tsx`.
- [ ] Run:

```bash
npm run test -- --run src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx src/portals/writer/__tests__/writerOverlaysAccessibility.test.tsx
```

- [ ] Commit:

```bash
git add src/portals/writer/useWriterPacingRevisionSet.ts src/portals/writer/WriterPortal.tsx src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx src/portals/writer/__tests__/writerOverlaysAccessibility.test.tsx
git commit -m "feat: connect pacing review to live story revisions"
```

**Smoke result summary:** Record Simple/Advanced entry, loading, recovery, and accessibility evidence.

## Audit 2 — Midpoint and Six-Pass Audit

- [ ] Audit code boundaries and reduce any new module that mixes persistence, generation, UI, and apply responsibilities.
- [ ] Audit ReAct behavior: every AI action must expose observation, persisted progress, and a recoverable next action.
- [ ] Audit UI/UX against the accepted companion mockup and project style.
- [ ] Audit loading, empty, failed, stale, locked, permission, and partial-success states.
- [ ] Run focused regression for all new test files plus existing pacing preview, outline treatment, Page Beats, Dialogue, and Writer bridge tests.
- [ ] Repair every blocking or high-severity finding before release work.

## Pass 7 — Deployment, Production QA, Regression, and Merge

**Objective:** Prove the feature locally and live, then publish and merge only a fully passing result.

**Acceptance criteria:** Migration and Edge deploy succeed; bounded QA set survives reload; apply and undo work on disposable QA data; full tests/lint/build pass; no blocking UX defect remains.

- [ ] Apply the migration to the linked Supabase project and verify tables/RLS using owner and unauthenticated paths.
- [ ] Deploy `writer-tools`; confirm ACTIVE version increased from 97.
- [ ] Start Vite at the registered strict port and perform browser QA with the dedicated QA account.
- [ ] Capture production-viewport top/middle/bottom evidence plus phone and landscape views.
- [ ] Exercise keyboard order, focus, contrast, overlap, edit/reset, individual and batch decisions, checkpoint continuation, isolated failure recovery, reload/resume, apply, and undo.
- [ ] Run one bounded hosted smoke on disposable QA pages only.
- [ ] Run the consolidated final gate once:

```bash
npm run test -- --run
npm run lint
npm run build
git diff --check
```

- [ ] Record test-file and individual-test counts separately, lint warning baseline, build advisory, deployed versions, URLs, and live-smoke outcome.
- [ ] Perform the final ReAct, QA, UI/UX, DOX, and walkthrough audit.
- [ ] Update `AGENTS.md` only for durable contracts, `tasks.md` for completion state, and `walkthrough.md` with the immediate implementation record.
- [ ] Commit final documentation, push `codex/pacing-revision-set`, merge into `main`, push `main`, deploy the final Cloudflare bundle if client code changed, and verify the live URL.

**Smoke result summary:** Record local and production results; if any required check fails, do not merge and leave the branch with an exact recovery command.

## Final Completion Checklist

- [ ] Every pass checklist and smoke result is complete.
- [ ] Both audits and the final audit have no unresolved blocker.
- [ ] The diff passes focused tests, full regression, lint, build, and browser QA.
- [ ] Supabase migration/function and Cloudflare client deployment are live and verified.
- [ ] Branch commits are pushed and successfully merged to `main`.
- [ ] Walkthrough and operator continuity records identify deployed versions, verification, risks, and the next action.
