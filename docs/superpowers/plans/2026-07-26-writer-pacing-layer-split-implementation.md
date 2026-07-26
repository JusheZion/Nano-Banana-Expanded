# Writer Pacing Layer-Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate Pacing Revision Page Beats and Dialogue through separately bounded hosted requests so either layer can succeed, persist, and be retried independently.

**Architecture:** Keep the browser-owned one-page queue and its five-page checkpoints. For each affected page, derive the missing layers in dependency order (`beats`, then `dialogue`) and invoke `pacing_revision_page_preview` once per missing layer using the existing `include_beats` and `include_dialogue` flags. Persist layer-specific failure ledger entries, clear only the successful layer's failure, and mark a page complete only when both child layers are ready or applied.

**Tech Stack:** React 19, TypeScript, Vitest, Zod, Supabase Edge Functions, Supabase Postgres JSONB, Gemini structured output.

---

## Risk and dependency check

- The migration already stores `failure_ledger` as JSONB, so adding an optional `layer` field requires no database migration.
- Existing persisted failures have no layer. Client and Edge parsing must remain backward-compatible and infer their missing layers from saved Child Changes.
- Page Beats must run before Dialogue so a later Dialogue Child Change can depend on the Beats Child Change.
- A Dialogue-only request must build its prompt from the saved effective Beats Child Change (`edited_candidate` when present, otherwise `ai_proposal`), not from unchanged official Page Beats.
- If no ready/applied Beats Child Change exists, the Edge function must reject Dialogue generation with a recoverable dependency response instead of generating mismatched dialogue.
- A failed Dialogue request must not delete or regenerate a successful Page Beats proposal.
- A successful layer request must never mark the page complete until both Page Beats and Dialogue are ready or applied.
- The current local server remains at `http://127.0.0.1:5174/`; `writer-tools` v104 is the rollback baseline.
- Rollback: redeploy commit `3fca77e` if the split request path cannot persist partial success safely.

## Pass 1 — Layer-scoped Edge persistence

**Objective:** Make one Edge invocation own exactly one requested child layer and record success or failure without disturbing the sibling layer.

**Acceptance criteria:** A Beats-only success persists only Beats; a Dialogue-only failure adds only a Dialogue ledger entry; a successful retry clears only its matching layer; a page enters `completed_pages` only after both layers exist.

- [x] **Step 1: Extend client and Edge failure schemas**

Modify:

- `src/shared/writer/pacingRevisionSchemas.ts`
- `supabase/functions/_shared/pacingRevisionSchemas.ts`
- `src/shared/writer/__tests__/pacingRevisionSchemas.test.ts`

Add the backward-compatible field:

```ts
layer: z.enum(['beats', 'dialogue']).optional(),
```

The schema test must parse both `{ page_number, reason }` legacy entries and `{ page_number, layer, reason }` new entries.

- [x] **Step 2: Run the schema test and verify RED**

Run:

```bash
npm test -- src/shared/writer/__tests__/pacingRevisionSchemas.test.ts
```

Expected: FAIL because `layer` is rejected by the strict failure schema.

- [x] **Step 3: Add Edge branch regression tests**

Modify `supabase/functions/writer-tools/pacingRevisionPageCandidate.test.ts` to inspect the `pacing_revision_page_preview` branch and require:

```ts
expect(previewBranch).toContain("layer: 'beats'");
expect(previewBranch).toContain("layer: 'dialogue'");
expect(previewBranch).toContain('pageHasReadyBeats');
expect(previewBranch).toContain('pageHasReadyDialogue');
expect(previewBranch).toContain('effectiveBeatsCandidate');
expect(previewBranch).toContain('Page Beats candidate is required before Dialogue');
```

- [x] **Step 4: Run the Edge test and verify RED**

Run:

```bash
npm test -- supabase/functions/writer-tools/pacingRevisionPageCandidate.test.ts
```

Expected: FAIL because failures are still page-only and every successful invocation marks the page complete.

- [x] **Step 5: Implement layer-specific failure and completion logic**

Modify `supabase/functions/writer-tools/index.ts`:

```ts
const requestedLayers = [
  ...(includeBeats ? ['beats' as const] : []),
  ...(includeDialogue ? ['dialogue' as const] : []),
];
```

On failure, replace only matching page/layer entries and append one entry per requested layer:

```ts
const retainedLedger = ledger.filter((entry) =>
  entry.page_number !== page.page_number
  || (entry.layer != null && !requestedLayers.includes(entry.layer))
);
const requestedFailures = requestedLayers.map((layer) => ({
  page_number: page.page_number,
  item_id: item.id,
  layer,
  reason,
}));
```

Load existing page changes before building the prompt. For a Dialogue-only request, resolve:

```ts
const effectiveBeatsCandidate = beatsChange.edited_candidate ?? beatsChange.ai_proposal;
```

Use that value as the prompt page's `beats_json`. Reject Dialogue generation when no ready/applied Beats change exists.

After upsert, compute readiness from existing ready/applied changes plus the newly persisted rows:

```ts
const pageHasReadyBeats = readyLayers.has('beats');
const pageHasReadyDialogue = readyLayers.has('dialogue');
const pageComplete = pageHasReadyBeats && pageHasReadyDialogue;
```

Only add the page to `completed_pages` when `pageComplete` is true. Clear legacy or matching explicit failures for requested layers without clearing an unrelated sibling-layer failure.

- [x] **Step 6: Run the Pass 1 smoke test**

Run:

```bash
npm test -- src/shared/writer/__tests__/pacingRevisionSchemas.test.ts supabase/functions/writer-tools/pacingRevisionPageCandidate.test.ts supabase/functions/writer-tools/pacingRevisionPersistence.test.ts
```

Expected: all focused tests pass.

- [x] **Step 7: Record the Pass 1 result**

Check off this pass and add the test-file/test counts beneath it.

**Pass 1 result:** PASS — 3 focused test files, 8 individual tests.

## Pass 2 — Browser-owned split queue

**Objective:** Invoke Page Beats and Dialogue separately for each page, preserve partial success, and retry only missing or explicitly selected layers.

**Acceptance criteria:** Initial generation calls Beats then Dialogue; a Dialogue failure leaves Beats saved; reload/resume calls Dialogue only; completed pages remain skipped.

- [x] **Step 1: Add missing-layer and split-call hook tests**

Modify `src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx`:

```ts
expect(mocks.invoke).toHaveBeenNthCalledWith(2, {
  mode: 'pacing_revision_page_preview',
  revision_set_id: SET_ID,
  page_id: PAGE_ID,
  include_beats: true,
  include_dialogue: false,
});
expect(mocks.invoke).toHaveBeenNthCalledWith(3, {
  mode: 'pacing_revision_page_preview',
  revision_set_id: SET_ID,
  page_id: PAGE_ID,
  include_beats: false,
  include_dialogue: true,
});
```

Add a partial-success fixture containing a ready Beats change and require `generatePages()` to invoke only Dialogue. Add a failure test where Beats succeeds and Dialogue fails, and assert both calls occurred in dependency order.

- [x] **Step 2: Run the hook tests and verify RED**

Run:

```bash
npm test -- src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx
```

Expected: FAIL because the hook currently invokes both layers together once.

- [x] **Step 3: Implement missing-layer derivation and split calls**

Modify `src/portals/writer/useWriterPacingRevisionSet.ts`:

```ts
export type PacingRevisionRetryTarget = {
  page: number;
  layer?: 'beats' | 'dialogue';
};
```

Replace page-only derivation with a `missingLayersByPage` map. In each queue page runner, execute:

```ts
for (const layer of ['beats', 'dialogue'] as const) {
  if (!layersToRun.has(layer)) continue;
  const response = await invokeWriterTools({
    mode: 'pacing_revision_page_preview',
    revision_set_id: set.id,
    page_id: page.id,
    include_beats: layer === 'beats',
    include_dialogue: layer === 'dialogue',
  });
  if (!response.success) failures.push(`${layerLabel}: ${message}`);
}
```

Run Dialogue only after Beats succeeds or was already ready/applied. If Beats fails, retain that failure and leave Dialogue missing until the next retry; if Dialogue fails, preserve the successful Beats proposal. Keep five-page checkpoints page-based.

- [x] **Step 4: Run the Pass 2 smoke test**

Run:

```bash
npm test -- src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx src/portals/writer/__tests__/writerPacingRevisionQueue.test.ts
```

Expected: all focused tests pass.

- [x] **Step 5: Record the Pass 2 result**

Check off this pass and add the test-file/test counts beneath it.

**Pass 2 result:** PASS — 2 focused test files, 8 individual tests.

## Pass 3 — Layer-specific recovery interface

**Objective:** Show exactly which layer failed and let the user retry one layer, one page's missing layers, or all failed layers.

**Acceptance criteria:** Failure rows read `Page 2 · Page Beats` or `Page 2 · Dialogue`; buttons expose `Retry Page Beats for page 2` and `Retry Dialogue for page 2`; legacy page-only failures expand into currently missing layers; controls remain accessible and responsive.

- [x] **Step 1: Add recovery UI tests**

Modify `src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx` so the fixture contains:

```ts
failure_ledger: [
  { page_number: 4, layer: 'beats', reason: 'Beats failed' },
  { page_number: 4, layer: 'dialogue', reason: 'Dialogue failed' },
],
```

Require:

```ts
fireEvent.click(screen.getByRole('button', { name: 'Retry Page Beats for page 4' }));
expect(onRetryFailed).toHaveBeenCalledWith([{ page: 4, layer: 'beats' }]);
fireEvent.click(screen.getByRole('button', { name: 'Retry Dialogue for page 4' }));
expect(onRetryFailed).toHaveBeenCalledWith([{ page: 4, layer: 'dialogue' }]);
```

Also require the batch action to pass both unique targets.

- [x] **Step 2: Run the workspace test and verify RED**

Run:

```bash
npm test -- src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx
```

Expected: FAIL because recovery controls are page-only.

- [x] **Step 3: Implement recovery target projection**

Modify `src/portals/writer/WriterPacingRevisionWorkspace.tsx`:

```ts
type RetryTarget = { page: number; layer?: 'beats' | 'dialogue' };
```

Project explicit ledger entries directly. For a legacy entry without `layer`, inspect ready/applied changes on that page and create targets for whichever of Beats or Dialogue is missing. De-duplicate by `${page}:${layer}`.

Render compact, flat recovery rows with semantic layer labels and buttons whose accessible names include both layer and page. Keep `Open page N` as the navigation action.

- [x] **Step 4: Run the Pass 3 smoke test**

Run:

```bash
npm test -- src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx src/shared/writer/__tests__/pacingRevisionSchemas.test.ts
```

Expected: all focused tests pass.

- [x] **Step 5: Perform the three-pass midpoint audit**

Review:

- schema backward compatibility,
- one-page-per-Edge-invocation enforcement,
- Beats-before-Dialogue ordering,
- partial success after failure,
- no regeneration of ready/applied layers,
- accessible names, focus states, disabled states, and responsive containment.

Correct any finding through a new red-green test before proceeding.

- [x] **Step 6: Record the Pass 3 result and midpoint audit**

Check off this pass and add the focused counts and audit findings beneath it.

**Pass 3 result:** PASS — 3 focused test files, 14 individual tests.

**Midpoint audit:** PASS — legacy schema entries remain supported; the browser requests one child layer per invocation; ready/applied layers are skipped; Page Beats precedes Dialogue; a child failure preserves its successful sibling; and recovery controls have unique accessible names, visible focus treatment, disabled treatment, and wrapping containment. No corrective finding remained open.

## Pass 4 — Hosted integration and release gate

**Objective:** Prove the split workflow against the dedicated hosted QA Revision Set and finish the branch only if the complete user workflow passes.

**Acceptance criteria:** Page 2 produces one Beats and one Dialogue Child Change through separate calls; failures clear; proposals survive reload; individual approval and apply respect dependency order; undo restores exact prior content; no browser errors; regression/lint/build pass.

- [x] **Step 1: Run focused implementation verification**

Run:

```bash
npm test -- src/portals/writer/__tests__/writerPacingRevisionQueue.test.ts src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx src/shared/writer/__tests__/pacingRevisionSchemas.test.ts supabase/functions/writer-tools/pacingRevisionPageCandidate.test.ts supabase/functions/writer-tools/pacingRevisionPersistence.test.ts
```

Expected: all focused files pass.

- [x] **Step 2: Deploy the Edge function**

Decode the existing `Supabase CLI` Keychain credential without printing it, deploy `writer-tools`, then verify the new version reports `ACTIVE`.

- [x] **Step 3: Run the dedicated hosted Page 2 smoke**

At `http://127.0.0.1:5174/`, open `Untitled series` → Issue 1 → Story Review. Retry the Page 2 missing layers. Verify:

- Page Beats request completes and persists before Dialogue begins.
- Dialogue is generated from the saved effective proposed Beats candidate.
- Dialogue completes independently.
- Tabs show `Page Beats 1` and `Dialogue 1`.
- Page 2 recovery entries clear while unrelated historical failures remain.
- Current/proposed panels are readable and distinct.
- No official content changes automatically.

- [x] **Step 4: Run apply, undo, reload, and browser-health QA**

Approve the Outline, Page Beats, and Dialogue changes in dependency order. Apply, verify official content and snapshots, undo, verify exact restoration, reload, and confirm proposals and decisions persist without duplication. Inspect browser warnings/errors and responsive containment.

- [x] **Step 5: Run the consolidated release gate**

Run once:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Report test-file and individual-test counts separately. Existing warnings must be reported, not hidden.

- [x] **Step 6: Perform final audits**

Audit:

- ReAct boundaries and explicit user control,
- QA and recovery semantics,
- UI/UX hierarchy, density, loading/error/success states, keyboard focus, and accessible labels,
- DOX chain and walkthrough accuracy.

**Pass 4 verification:** PASS — the post-review consolidated gate passed 134 test files and 840 individual tests; lint completed with 0 errors and 71 existing repository warnings; production build and `git diff --check` passed. Hosted `writer-tools` v108 produced separate Page 2 Page Beats and Dialogue candidates, reload preserved them, apply promoted all three approved layers in dependency order, and undo restored exact prior official content while retaining the proposals.

**Final audit:** PASS — explicit preview/apply control remains intact; layer failures preserve successful siblings; legacy and absent ledger entries project into recoverable layer targets; current/proposed panels remain readable; the recovery ledger is keyboard-accessible and height-bounded; browser warnings/errors were empty; and the root DOX contract now records the approved split behavior.

### Pass 5: Independent review corrections

**Objective:** Close the release-blocking contract and dependency gaps found during independent code review.

**Acceptance criteria:** The API accepts exactly one requested child layer, stale client progress cannot mark incomplete pages complete, and changing Page Beats invalidates dependent Dialogue until it is regenerated.

- [x] Require exactly one of `includeBeats` or `includeDialogue` in shared/client and Edge request schemas.
- [x] Reject omitted-layer and combined-layer requests at the Edge boundary.
- [x] Re-fetch persisted Revision Set state before deriving final page completion.
- [x] Add a database trigger that marks dependent Dialogue stale after a Page Beats proposal or edit changes.
- [x] Refresh the client Revision Set after a direct Beats edit.
- [x] Add focused schema, Edge, persistence, migration, stale-progress, and edit-refresh regressions.
- [x] Apply migration `20260726000000_writer_pacing_revision_beats_invalidation.sql`.
- [x] Deploy and verify `writer-tools` v108.

**Pass 5 smoke test:** PASS — editing the Page 2 Beats candidate immediately exposed `Retry Dialogue for page 2`; resetting the edit preserved the stale dependency; the v108 Dialogue-only retry regenerated from the effective Beats candidate, cleared only the Page 2 Dialogue recovery row, and returned as a pending user decision. After explicit approval, all three layers applied and undo restored the official story. Browser warnings/errors remained empty.

**Pass 5 result:** PASS — the split request contract is enforced at both client and hosted boundaries, completion derives from fresh persisted state, and Page Beats changes can no longer leave an apparently valid but outdated Dialogue proposal.

**Pass 5 regression result:** PASS — the first consolidated run exposed a test-only readiness race in the new Beats-edit refresh regression (839 of 840 tests passed). Waiting for the Revision Set to load before invoking the hook corrected the setup; the focused 8-test hook suite then passed, followed by the complete 134-file/840-test gate.

- [ ] **Step 7: Update continuity records and finish the branch**

Update `walkthrough.md` with actual evidence and mark this plan's completed checkboxes. Commit and push. Merge draft PR #27 and deploy the frontend only if every hosted and consolidated gate passes; otherwise leave the PR draft and report the exact blocker.
