# Pacing Revision Selection UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Pacing Revision batch decisions obvious and tab-scoped while keeping child-generation failures from obscuring or appearing to block independent Outline approval.

**Architecture:** Keep selection ephemeral inside `WriterPacingRevisionWorkspace`, but derive eligible selections and batch decisions from the active layer only. Restructure the sidebar into a fixed toolbar, scrolling item region, and persistent action footer; convert the failure ledger to an accessible collapsed disclosure while retaining all existing retry callbacks.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, Vite

---

## Risk and dependency check

- Client-only change: no Supabase migration, Edge Function deploy, schema change, or persisted-data rewrite.
- Preserve the existing `Props` callback contract and individual change controls.
- The highest regression risks are approving hidden cross-tab selections, obscuring the last list item with the persistent footer, and hiding individual failure recovery.
- Rollback is one frontend commit: restore the prior workspace component and test file. Saved Revision Sets remain unaffected.
- Release dependency: local signed-in browser access to a representative Revision Set containing Outline proposals and child failures.

## File map

- Modify `src/portals/writer/WriterPacingRevisionWorkspace.tsx`: active-tab eligibility, select/clear controls, sticky batch actions, and failure disclosure.
- Modify `src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx`: tab-scoped selection, batch isolation, disclosure, failure independence, and disabled-state coverage.
- Modify `AGENTS.md`: only if implementation reveals a durable contract not already recorded.
- Modify `walkthrough.md`: append the verified implementation and release evidence.
- Modify this plan: check completed steps and record each pass result.

## Pass 1: Tab-scoped selection and batch decisions

**Objective:** Ensure selection and batch decisions operate only on ready changes in the active layer.

**Acceptance criteria:**

- Select-all and clear-selection affect only the active tab.
- Hidden selections from another tab are never included in the current tab's batch decision or count.
- Outline selection and approval remain enabled while Page Beats or Dialogue candidates are missing.

- [x] **Step 1: Add a failing active-tab selection regression**

Extend the fixture with a second ready Outline change and retain the ready Page Beats change. Add a test that selects all Outline changes, switches to Page Beats, selects its change, and proves `Approve selected` calls `onChange` only for the active Page Beats ID.

```tsx
it('scopes select all, clear, counts, and batch decisions to the active tab', async () => {
  const revisionSet = fixture();
  const firstOutline = revisionSet.items[0]!.changes.find((change) => change.layer === 'outline')!;
  revisionSet.items[0]!.changes.push({
    ...firstOutline,
    id: crypto.randomUUID(),
    target_key: 'outline:second-turn',
    reason: 'Strengthen the second turn.',
    ai_proposal: { proposed_beat: { summary: 'The second door opens.' } },
  });
  const outlineIds = revisionSet.items.flatMap((item) => item.changes)
    .filter((change) => change.layer === 'outline')
    .map((change) => change.id);
  const beatsId = revisionSet.items.flatMap((item) => item.changes)
    .find((change) => change.layer === 'beats')!.id;
  const onChange = vi.fn().mockResolvedValue(undefined);

  render(
    <WriterPacingRevisionWorkspace
      revisionSet={revisionSet}
      onChange={onChange}
      onApply={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Select all in Live Outline' }));
  expect(screen.getByRole('button', { name: `Approve selected (${outlineIds.length})` })).toBeTruthy();

  fireEvent.click(screen.getByRole('tab', { name: /Page Beats/ }));
  expect(screen.getByRole('button', { name: 'Approve selected (0)' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Select all in Page Beats' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve selected (1)' }));

  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  expect(onChange).toHaveBeenCalledWith(beatsId, { decision: 'approved' });
  expect(onChange).not.toHaveBeenCalledWith(outlineIds[0], { decision: 'approved' });
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx
```

Expected: FAIL because `Select all in Live Outline` is absent and batch eligibility still spans all layers.

- [x] **Step 3: Derive active-layer eligibility and selection state**

In `WriterPacingRevisionWorkspace.tsx`, replace global batch eligibility with active-layer derivations:

```tsx
const activeLayerLabel = LAYERS.find((entry) => entry.id === layer)?.label ?? 'current tab';
const activeLayerEligible = allChanges.filter((change) =>
  change.layer === layer && change.generation_status === 'ready'
);
const selectedEligible = activeLayerEligible.filter((change) => selectedIds.has(change.id));
const allActiveEligibleSelected = activeLayerEligible.length > 0
  && activeLayerEligible.every((change) => selectedIds.has(change.id));

const selectAllActiveLayer = () => {
  setSelectedIds((current) => {
    const next = new Set(current);
    for (const change of activeLayerEligible) next.add(change.id);
    return next;
  });
};

const clearActiveLayerSelection = () => {
  setSelectedIds((current) => {
    const next = new Set(current);
    for (const change of allChanges) {
      if (change.layer === layer) next.delete(change.id);
    }
    return next;
  });
};
```

Keep `batchDecision` based on the new `selectedEligible`, so its `Promise.all` contains only active-tab ready changes.

- [x] **Step 4: Add the active-tab selection toolbar**

Place this toolbar between the `Revision items` heading and the scrolling `<ol>`:

```tsx
<div className="flex flex-wrap items-center gap-2 border-t border-slate-300/70 px-3 py-2">
  <button
    type="button"
    disabled={busy || activeLayerEligible.length === 0 || allActiveEligibleSelected}
    onClick={selectAllActiveLayer}
    className="text-[10px] font-black text-slate-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:opacity-40"
  >
    Select all in {activeLayerLabel}
  </button>
  <button
    type="button"
    disabled={busy || selectedEligible.length === 0}
    onClick={clearActiveLayerSelection}
    className="text-[10px] font-black text-slate-600 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 disabled:opacity-40"
  >
    Clear {activeLayerLabel} selection
  </button>
</div>
```

- [x] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
npx vitest run src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx
```

Expected: the component test file passes.

- [x] **Step 6: Commit Pass 1**

```bash
git add src/portals/writer/WriterPacingRevisionWorkspace.tsx src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx docs/superpowers/plans/2026-07-27-pacing-revision-selection-ux-implementation.md
git commit -m "fix: scope pacing batch selection by tab"
```

**Pass 1 smoke test:** Run the component test file only. Do not proceed until it passes.

**Pass 1 result:** PASS — focused smoke test completed with 1 test file and 6 individual tests passing. The regression first failed with 1 failed and 5 passing tests because the active-tab select-all control was absent.

## Pass 2: Persistent batch actions and compact failure disclosure

**Objective:** Keep batch decisions visible and prevent the failure ledger from dominating the review workspace.

**Acceptance criteria:**

- The item list scrolls independently between a fixed toolbar and visible action footer.
- The failure ledger starts collapsed and remains fully accessible when expanded.
- Retry-all remains available while collapsed.
- The Live Outline tab explicitly explains that child failures do not block Outline approval.

- [x] **Step 1: Add failing disclosure and visibility tests**

Add tests with these assertions:

```tsx
it('collapses failure details without hiding recovery or Outline independence', () => {
  const onRetryFailed = vi.fn();
  render(
    <WriterPacingRevisionWorkspace
      revisionSet={fixture()}
      onChange={vi.fn()}
      onApply={vi.fn()}
      onRetryFailed={onRetryFailed}
    />,
  );

  expect(screen.getByText('Page Beats and Dialogue failures do not prevent Outline approval.')).toBeTruthy();
  const disclosure = screen.getByRole('button', { name: 'Show failed layers' });
  expect(disclosure.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByTestId('pacing-recovery-list')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Retry all failed layers' }));
  expect(onRetryFailed).toHaveBeenCalled();

  fireEvent.click(disclosure);
  expect(screen.getByTestId('pacing-recovery-list')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Hide failed layers' }).getAttribute('aria-expanded')).toBe('true');
});

it('keeps batch actions in a persistent sidebar footer', () => {
  render(<WriterPacingRevisionWorkspace revisionSet={fixture()} onChange={vi.fn()} onApply={vi.fn()} />);
  expect(screen.getByTestId('pacing-batch-footer').className).toContain('sticky');
  expect(screen.getByTestId('pacing-revision-item-list').className).toContain('overflow-y-auto');
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx
```

Expected: FAIL because the ledger always renders and the footer/list test IDs and sticky structure are absent.

- [x] **Step 3: Add accessible failure disclosure state**

Add state and render a concise summary:

```tsx
const [showFailures, setShowFailures] = useState(false);
const failureRegionId = 'pacing-failed-layer-details';
```

```tsx
<div role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-xs text-red-900">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <strong>{failureRows.length} failed or missing layers need attention.</strong>
      {layer === 'outline' && (
        <p className="mt-1">Page Beats and Dialogue failures do not prevent Outline approval.</p>
      )}
    </div>
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        aria-expanded={showFailures}
        aria-controls={failureRegionId}
        onClick={() => setShowFailures((current) => !current)}
        className="font-black underline decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
      >
        {showFailures ? 'Hide failed layers' : 'Show failed layers'}
      </button>
      {onRetryFailed && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRetryFailed(failureRows.map(({ page, layer: failedLayer }) => ({ page, layer: failedLayer })))}
          className="font-black underline decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-40"
        >
          Retry all failed layers
        </button>
      )}
    </div>
  </div>
  {showFailures && (
    <ul
      id={failureRegionId}
      data-testid="pacing-recovery-list"
      className="mt-3 max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-2"
    >
      {failureRows.map((failure) => {
        const layerLabel = failure.layer === 'beats' ? 'Page Beats' : 'Dialogue';
        return (
          <li key={`${failure.page}:${failure.layer}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-red-200 pt-2">
            <span><strong>Page {failure.page} · {layerLabel}:</strong> {failure.reason}</span>
            <span className="flex gap-3">
              {onNavigateToPage && (
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Open page ${failure.page} for ${layerLabel}`}
                  onClick={() => void onNavigateToPage(failure.page)}
                  className="font-black underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-40"
                >
                  Open page {failure.page}
                </button>
              )}
              {onRetryFailed && (
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Retry ${layerLabel} for page ${failure.page}`}
                  onClick={() => void onRetryFailed([{ page: failure.page, layer: failure.layer }])}
                  className="font-black underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-40"
                >
                  Retry {layerLabel}
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  )}
</div>
```

- [x] **Step 4: Restructure the sidebar into fixed controls and a scrolling list**

Replace the opening `nav` tag with:

```tsx
<nav
  aria-label="Revision items"
  className="flex min-w-0 flex-col border-b border-slate-300 bg-[#e7e0d2] lg:max-h-[520px] lg:border-b-0 lg:border-r"
>
```

Apply these exact attribute replacements:

```tsx
<ol
  data-testid="pacing-revision-item-list"
  className="max-h-60 flex-1 overflow-y-auto lg:max-h-none"
>
```

```tsx
<div
  data-testid="pacing-batch-footer"
  className="sticky bottom-0 z-10 flex gap-2 border-t border-slate-300 bg-[#e7e0d2] p-3 shadow-[0_-8px_16px_-16px_rgba(15,23,42,0.8)]"
>
```

- [x] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
npx vitest run src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx
```

Expected: the component test file passes with disclosure and footer coverage.

- [x] **Step 6: Run the midpoint browser QA smoke**

Start the registered local frontend in this worktree using the project host registry, then inspect a representative failed Revision Set at the production viewport. Verify:

- the failure details begin collapsed;
- the Outline independence message is visible;
- the sidebar begins above the fold;
- select-all, clear, approve, and reject remain visible and keyboard reachable;
- expanding failures preserves bounded scrolling and retry controls;
- no overlap occurs at the final revision item.

Record the URL, port, viewport, and browser-console result.

- [x] **Step 7: Commit Pass 2**

```bash
git add src/portals/writer/WriterPacingRevisionWorkspace.tsx src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx docs/superpowers/plans/2026-07-27-pacing-revision-selection-ux-implementation.md
git commit -m "fix: keep pacing review actions visible"
```

**Pass 2 smoke test:** Component tests plus the focused local browser workflow.

**Pass 2 result:** PASS — focused smoke completed with 1 test file and 11 individual tests passing. Initial RED produced 5 expected failures and 4 passes because the disclosure, Outline independence message, and persistent sidebar structure were absent. The accessibility correction RED then produced 3 expected failures and 8 passes: ready checkboxes remained mutable while busy, the header omitted missing layers, and expanded recovery rows were descendants of the assertive alert. GREEN disables every active-tab selection mutation while busy, labels failed or missing layers consistently, and limits the alert subtree to concise summary/copy/actions while keeping the controlled recovery list outside it. Signed-in midpoint QA at `http://127.0.0.1:5174/` with a `2560x1536` viewport override confirmed the 52-layer failure summary starts collapsed, the Outline independence message and retry-all remain visible, select-all and clear update the active count, and the batch footer follows the scrolling item list without overlap. Expanding failures produced a bounded 320px region with 1695px of scrollable recovery content, preserved individual navigation/retry controls, and produced no browser warnings or errors.

## Pass 3: Integration behavior and audit

**Objective:** Prove the corrected controls preserve individual decisions, retry behavior, dependencies, and Outline-independent approval.

**Acceptance criteria:**

- Existing edit/reset, individual approve/reject, dependency navigation, retry, and apply entry points still work.
- An Outline-only batch approval changes header readiness even while child failures remain.
- Keyboard order and responsive layout remain usable.

- [ ] **Step 1: Add an Outline-with-child-failures integration regression**

Add a controlled rerender test:

```tsx
it('allows Outline approval while child generation failures remain', async () => {
  const revisionSet = fixture();
  const outlineChanges = revisionSet.items.flatMap((item) => item.changes)
    .filter((change) => change.layer === 'outline');
  const onChange = vi.fn().mockResolvedValue(undefined);

  render(
    <WriterPacingRevisionWorkspace
      revisionSet={revisionSet}
      onChange={onChange}
      onApply={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Select all in Live Outline' }));
  fireEvent.click(screen.getByRole('button', { name: `Approve selected (${outlineChanges.length})` }));

  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(outlineChanges.length));
  for (const change of outlineChanges) {
    expect(onChange).toHaveBeenCalledWith(change.id, { decision: 'approved' });
  }
  expect(screen.getByText(/failed or missing layers need attention/)).toBeTruthy();
});
```

- [ ] **Step 2: Run focused Writer regressions**

Run:

```bash
npx vitest run \
  src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx \
  src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx \
  src/portals/writer/__tests__/writerPacingRevisionModel.test.ts \
  src/portals/writer/__tests__/writerPacingRevisionApply.test.ts
```

Expected: all listed files and tests pass.

- [ ] **Step 3: Perform the third-pass audit**

Audit and record:

- ReAct boundaries: selection is local UI state; decisions still pass through `onChange`; promotion still requires `onApply`.
- QA: no hidden cross-tab batch mutation; failure disclosure does not remove recovery.
- UI/UX: tab labels, selected counts, sticky footer, collapse state, focus order, contrast, responsive containment, loading/busy states, and final-item visibility.
- DOX: the root active-tab selection contract matches the implementation.

- [ ] **Step 4: Run a browser interaction smoke**

On the representative Revision Set:

1. Keep child failures unresolved.
2. Select all Outline changes.
3. Clear the Outline selection and confirm the count returns to zero.
4. Select all Outline changes again.
5. Approve selected and confirm the ready-to-apply count increases.
6. Verify the Page Beats tab has an independent zero selection.
7. Do not apply official changes during this smoke unless a disposable QA set is used.
8. Inspect browser warnings/errors.

- [ ] **Step 5: Commit Pass 3 records**

```bash
git add docs/superpowers/plans/2026-07-27-pacing-revision-selection-ux-implementation.md
git commit -m "test: verify pacing selection workflow"
```

**Pass 3 smoke test:** Focused Writer regressions and the active-tab browser workflow.

**Pass 3 result:** Record test counts, browser results, and the three-pass audit.

## Pass 4: Final gate, release, and continuity

**Objective:** Complete consolidated verification, publish the frontend-only fix, and preserve accurate project records.

**Acceptance criteria:**

- Full tests, lint, build, and diff validation pass.
- Final ReAct, QA, UI, and UX audits pass.
- The production bundle exposes the new controls and disclosure behavior.
- The branch is committed, pushed, reviewed, merged, and the production endpoint is healthy.

- [ ] **Step 1: Run the consolidated regression gate once**

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected:

- all test files and individual tests pass;
- lint has zero errors, with existing warnings reported;
- production build succeeds, with existing chunk advisories reported;
- `git diff --check` succeeds.

- [ ] **Step 2: Run final audits**

Record:

- explicit select → decide → apply boundaries;
- tab isolation and child-failure independence;
- keyboard access, disclosure semantics, loading/disabled states, responsive containment, and no control overlap;
- unchanged Supabase/Edge contracts;
- rollback readiness.

- [ ] **Step 3: Update continuity records**

Append actual implementation, files, test counts, browser evidence, risks, deployment, and merge status to `walkthrough.md`. Check every completed plan step and record each pass smoke result.

- [ ] **Step 4: Complete the DOX pass**

Confirm the root `AGENTS.md` contract matches the shipped behavior. No child `AGENTS.md` is needed because the change does not create a new domain boundary.

- [ ] **Step 5: Commit and push**

```bash
git add AGENTS.md walkthrough.md docs/superpowers/plans/2026-07-27-pacing-revision-selection-ux-implementation.md
git commit -m "docs: record pacing selection UX release"
git push -u origin codex/pacing-revision-selection-ux
```

- [ ] **Step 6: Review, deploy, and verify**

Create or update a pull request with actual verification evidence. Deploy with:

```bash
npm run deploy
```

Open a fresh production tab and verify:

- `Select all in Live Outline`;
- `Clear Live Outline selection`;
- `Show failed layers`;
- visible `Approve selected` and `Reject selected`;
- clean browser warnings/errors;
- production HTTP 200.

- [ ] **Step 7: Merge only after every gate passes**

Merge the ready pull request, verify remote `main` contains the merge commit, and confirm the production endpoint remains healthy.

**Pass 4 smoke test:** Fresh production UI and endpoint verification.

**Pass 4 result:** Record final test, deployment, and merge evidence.

## Plan self-review

- Specification coverage: all eight acceptance criteria map to Passes 1–4.
- Placeholder scan: no incomplete implementation steps or unspecified code contracts remain.
- Type consistency: active layer uses `PacingRevisionLayer`; retry targets remain `{ page, layer }`; callbacks are unchanged.
- Test discipline: every behavior change begins with a failing component test and a focused red/green cycle.
- Audit cadence: midpoint QA occurs in Pass 2, the required three-pass audit occurs after Pass 3, and final ReAct/QA/UI/UX audits occur in Pass 4.
- Rollback: frontend commits can be reverted without changing persisted data or hosted service contracts.
