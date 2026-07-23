# Writer Outline Review Recovery Implementation Plan

**Status:** Passes 1-2 complete; Pass 3 release deployed; one live Edge alias repair awaits redeploy and production retry.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the technical Simple Workflow treatment review with a chronological, page-aware, directly editable review and verify the critical path from official outline to Comic Creator.

**Architecture:** Extend operation notices with the rejected proposal payload, derive a presentation-only review model from the existing source/proposal/manifest contract, and render Simple Workflow through focused readable components while preserving raw JSON for Advanced Tools. The dialog becomes a fixed-height flex shell with one scrollable body and a non-overlapping footer. Release QA uses one focused automated gate plus a persistent signed-in production corridor.

**Tech Stack:** TypeScript, Zod, React, Tailwind CSS, Vitest, Testing Library, Supabase Edge Functions, Cloudflare Workers, Browser Use.

---

## Risk and dependency check

- Supabase and Cloudflare authentication must be verified before release.
- The production smoke uses the signed-in dedicated QA/demo project; never promote or overwrite the user's official outline.
- The existing patch engine remains authoritative. This plan changes notice context and review presentation, not treatment permissions.
- A rejected operation may contain AI-proposed text; render it as plain text only.
- Word-level highlighting must remain deterministic and bounded for 70-page outlines.
- Rollback requires recording both the Supabase function version and Cloudflare Worker version before deployment.

## File structure

| File | Responsibility |
|---|---|
| `supabase/functions/_shared/writerSchemas.ts` | Add optional rejected-operation proposal fields to notice schema. |
| `supabase/functions/writer-tools/outlineTreatmentPatch.ts` | Populate rejected notices with attempted operation text. |
| `supabase/functions/writer-tools/outlineTreatmentPatch.test.ts` | Prove rejected notices identify the affected source and attempted wording. |
| `src/shared/writer/schemas.ts` | Parse the optional notice proposal payload. |
| `src/portals/writer/writerOutlineTreatmentIntegration.ts` | Map notice proposal payload into the client session. |
| `src/portals/writer/writerOutlineTreatmentValidation.ts` | Extend the client notice type. |
| `src/portals/writer/writerOutlineTreatmentReviewModel.ts` | Derive chronological, page-aware accepted/rejected/unchanged review items. |
| `src/portals/writer/writerOutlineTreatmentReviewModel.test.ts` | Test mapping, chronology, labels, and tab normalization. |
| `src/portals/writer/WriterOutlineTreatmentReadableReview.tsx` | Render readable Simple Workflow summary, cards, navigation, and structured editor. |
| `src/portals/writer/WriterOutlineTreatmentDiff.tsx` | Render accessible bounded word-level highlights. |
| `src/portals/writer/WriterOutlineTreatmentReview.tsx` | Choose Simple/Advanced review, own structured draft, and provide non-overlapping shell/footer. |
| `src/portals/writer/WriterOutlineTreatmentChangeList.tsx` | Keep Advanced change list readable and move technical IDs into disclosure. |
| Focused `*.test.ts(x)` files | Verify user-facing behavior and regression safety. |
| `AGENTS.md`, plan/spec, `walkthrough.md` | Durable contract, execution evidence, and release record. |

---

## Pass 1: Page-aware review data

**Objective:** Give the UI complete, human-meaningful information without weakening the deterministic patch contract.

**Acceptance criteria:**

- Every rejected notice can identify its source page, original wording, attempted wording, and reason.
- Accepted and rejected changes are sorted by affected/proposed page.
- Unchanged pages are represented but hidden by default.
- Tabs and escaped tab markers become readable spacing.
- Internal IDs remain available to Advanced Tools but are unnecessary for Simple rendering.

**Rollback/fallback:** The new notice payload is optional and backward compatible. If the client model cannot parse it, keep production on the prior paired versions while correcting locally.

### Task 1: Add rejected-operation context at the Edge boundary

**Files:**
- Modify: `supabase/functions/_shared/writerSchemas.ts`
- Modify: `supabase/functions/writer-tools/outlineTreatmentPatch.ts`
- Test: `supabase/functions/writer-tools/outlineTreatmentPatch.test.ts`
- Modify: `src/shared/writer/schemas.ts`
- Modify: `src/portals/writer/writerOutlineTreatmentValidation.ts`
- Modify: `src/portals/writer/writerOutlineTreatmentIntegration.ts`
- Test: `src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts`

- [ ] Write a failing Edge test asserting a rejected edit includes attempted text:

```ts
expect(result.operation_notices.at(-1)).toMatchObject({
  status: 'rejected',
  code: 'source_event_mismatch',
  source_beat_ids: [input.sourceBeats[1]!.id],
  proposed: {
    summary: 'The elder reveals a different event.',
  },
});
```

- [ ] Run the focused test and confirm it fails because `proposed` is absent:

```bash
npm run test -- --run supabase/functions/writer-tools/outlineTreatmentPatch.test.ts --exclude '.worktrees/**'
```

- [ ] Extend the shared Edge/client notice schemas with:

```ts
proposed: z.object({
  scene: z.string().optional(),
  summary: z.string().optional(),
  emotional_turn: z.string().optional(),
}).strict().optional(),
```

- [ ] Populate the payload inside `reject` without interpreting it:

```ts
proposed: {
  ...(operation.scene === undefined ? {} : { scene: operation.scene }),
  ...(operation.summary === undefined ? {} : { summary: operation.summary }),
  ...(operation.emotional_turn === undefined ? {} : { emotional_turn: operation.emotional_turn }),
},
```

- [ ] Extend `TreatmentOperationNotice` and the integration mapper with the same optional fields.

- [ ] Add a client integration assertion that `proposed.summary` survives Edge parsing.

- [ ] Run:

```bash
npm run test -- --run \
  supabase/functions/writer-tools/outlineTreatmentPatch.test.ts \
  src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts \
  --exclude '.worktrees/**'
```

Expected: both files pass.

### Task 2: Derive the readable chronological model

**Files:**
- Create: `src/portals/writer/writerOutlineTreatmentReviewModel.ts`
- Create: `src/portals/writer/writerOutlineTreatmentReviewModel.test.ts`

- [ ] Write failing tests for:
  - accepted changes ordered by proposed page;
  - rejected changes ordered by source ordinal;
  - original and proposed text;
  - plain-language labels;
  - unchanged pages retained but marked unchanged;
  - actual tabs and literal `\\t` normalized;
  - missing source mapping falls back safely.

- [ ] Define the focused public interface:

```ts
export type OutlineTreatmentReviewItem = {
  key: string;
  status: 'accepted' | 'rejected' | 'unchanged';
  changeType: string;
  changeLabel: string;
  page: number | null;
  original: IssueOutlinePageBeat | null;
  proposed: IssueOutlinePageBeat | null;
  reason: string;
  technical?: {
    operationId?: string;
    resultBeatId?: string;
    sourceBeatIds: string[];
    code?: string;
  };
};

export function buildOutlineTreatmentReviewItems(
  session: TreatmentProposalSession,
): OutlineTreatmentReviewItem[];

export function normalizeOutlineReviewText(value: string | undefined): string;
```

- [ ] Normalize text without changing stored data:

```ts
export function normalizeOutlineReviewText(value = ''): string {
  return value
    .replace(/\\t/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}
```

- [ ] Build lookups by source ID and result ID, derive readable items, and sort by:

```ts
const pageOrder = item.page ?? Number.MAX_SAFE_INTEGER;
```

- [ ] Run:

```bash
npm run test -- --run src/portals/writer/writerOutlineTreatmentReviewModel.test.ts --exclude '.worktrees/**'
```

Expected: the new model tests pass.

### Pass 1 smoke test

- [ ] Run:

```bash
npm run test -- --run \
  supabase/functions/writer-tools/outlineTreatmentPatch.test.ts \
  src/portals/writer/writerOutlineTreatmentReviewModel.test.ts \
  src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts \
  --exclude '.worktrees/**'
```

- [ ] Record test-file and individual-test counts.

### Pass 1 result summary

- [ ] Confirm rejection context, chronological mapping, and tab normalization pass before Pass 2.

---

## Pass 2: Readable Simple review and unobstructed controls

**Objective:** Replace raw JSON in Simple Workflow with a beginner-readable review that supports direct editing and fast navigation.

**Acceptance criteria:**

- Simple Workflow contains no raw JSON or opaque beat IDs.
- Changed/rejected beats appear chronologically with page, original, proposal, and reason.
- Selecting a change focuses and scrolls to its page editor.
- Changed wording is highlighted accessibly.
- Unchanged pages are hidden by default and can be shown.
- Title, premise, Acts, and page beats remain directly editable.
- Advanced Workflow retains raw JSON and technical details behind disclosure.
- The footer never overlaps scrollable content and all buttons have readable explicit states.

**Rollback/fallback:** Keep the current component behind the Advanced branch during local work. If the readable editor fails validation, do not deploy; the official outline remains unaffected.

### Task 3: Add bounded accessible text highlighting

**Files:**
- Create: `src/portals/writer/WriterOutlineTreatmentDiff.tsx`
- Create: `src/portals/writer/__tests__/WriterOutlineTreatmentDiff.test.tsx`

- [ ] Write failing tests asserting:
  - unchanged text renders without `<mark>`;
  - inserted/replaced words render inside `<mark>`;
  - screen-reader text identifies proposed wording;
  - long values fall back to whole-field highlighting rather than expensive diffing.

- [ ] Implement a bounded word-token comparison:

```ts
export function WriterOutlineTreatmentDiff({
  original,
  proposed,
}: {
  original: string;
  proposed: string;
}) {
  // For values above 2,000 characters, mark the complete proposal.
  // Otherwise compute a deterministic word LCS and mark proposed-only runs.
}
```

- [ ] Run:

```bash
npm run test -- --run src/portals/writer/__tests__/WriterOutlineTreatmentDiff.test.tsx --exclude '.worktrees/**'
```

Expected: highlighting tests pass.

### Task 4: Build the Simple readable editor

**Files:**
- Create: `src/portals/writer/WriterOutlineTreatmentReadableReview.tsx`
- Create: `src/portals/writer/__tests__/WriterOutlineTreatmentReadableReview.test.tsx`
- Modify: `src/portals/writer/WriterOutlineTreatmentReview.tsx`

- [ ] Write failing component tests asserting:
  - no `{ "page_beats"` or `beat-` text appears in Simple Workflow;
  - rejected cards include `Page N`, original, attempted wording, and retained message;
  - accepted cards include original/proposed/reason;
  - changed cards are chronological;
  - unchanged pages are hidden until **Show unchanged pages**;
  - clicking **Go to page N** focuses the matching editor;
  - editing a page updates the proposal passed to Make official;
  - `\t` and literal `\\t` do not appear in rendered copy.

- [ ] Give the readable component a structured callback:

```ts
type Props = {
  draft: IssueOutline;
  session: TreatmentProposalSession;
  onChange(next: IssueOutline): void;
};
```

- [ ] Render editable metadata fields:

```tsx
<input aria-label="Outline title" value={draft.title ?? ''} />
<textarea aria-label="Outline premise" value={draft.premise ?? ''} />
```

- [ ] Render one page editor per visible proposal beat with stable focus targets:

```tsx
<article id={`proposal-page-${page}`} data-status={status}>
  <textarea aria-label={`Page ${page} summary`} value={beat.summary ?? ''} />
</article>
```

- [ ] Render the chronological change list before the full editor and use:

```ts
document.getElementById(`proposal-page-${page}`)?.scrollIntoView({ block: 'center' });
document.querySelector(`[aria-label="Page ${page} summary"]`)?.focus();
```

- [ ] Refactor `WriterOutlineTreatmentReview` state from Simple raw string editing to a structured `IssueOutline` draft. Keep a separate JSON string only inside the Advanced branch.

- [ ] Run:

```bash
npm run test -- --run \
  src/portals/writer/__tests__/WriterOutlineTreatmentReadableReview.test.tsx \
  src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx \
  --exclude '.worktrees/**'
```

Expected: both files pass.

### Task 5: Repair Advanced disclosure and dialog layout

**Files:**
- Modify: `src/portals/writer/WriterOutlineTreatmentReview.tsx`
- Modify: `src/portals/writer/WriterOutlineTreatmentChangeList.tsx`
- Test: `src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx`
- Test: `src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx`

- [ ] Add failing tests asserting:
  - technical IDs appear only after opening **Technical details** in Advanced mode;
  - Simple mode has no technical disclosure;
  - footer actions have explicit accessible names and dark/light text classes;
  - the dialog has one scrollable body and a separate non-sticky footer;
  - focus order follows Cancel, Regenerate, Keep alternate, Make official.

- [ ] Convert the shell to:

```tsx
<section className="mx-auto flex max-h-[calc(100dvh-2rem)] max-w-6xl flex-col overflow-hidden ...">
  <div className="min-h-0 flex-1 overflow-y-auto p-5">{/* review body */}</div>
  <footer className="shrink-0 border-t ...">{/* actions */}</footer>
</section>
```

- [ ] Set explicit action styles:

```tsx
className="... bg-white text-slate-950 hover:bg-slate-50 disabled:text-slate-500"
```

- [ ] Move source/result IDs into:

```tsx
<details>
  <summary>Technical details</summary>
  {/* opaque IDs and operation codes */}
</details>
```

- [ ] Run:

```bash
npm run test -- --run \
  src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx \
  src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx \
  --exclude '.worktrees/**'
```

Expected: layout/visibility tests pass.

### Pass 2 smoke test

- [ ] Run the focused review suite once:

```bash
npm run test -- --run \
  src/portals/writer/writerOutlineTreatmentReviewModel.test.ts \
  src/portals/writer/__tests__/WriterOutlineTreatmentDiff.test.tsx \
  src/portals/writer/__tests__/WriterOutlineTreatmentReadableReview.test.tsx \
  src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx \
  src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx \
  --exclude '.worktrees/**'
```

- [ ] Run a local browser smoke at desktop and narrow viewports; capture top, middle, and bottom screenshots.

### Pass 2 result summary

- [ ] Confirm readable chronology, direct editing, navigation, technical-detail isolation, contrast, and zero overlap before Pass 3.

---

## Pass 3: Consolidated release and production corridor

**Objective:** Prove the repaired review and downstream comic-production path with one proportional release gate.

**Acceptance criteria:**

- Focused regression, targeted lint, and production build pass once.
- Production Simple review is readable at top/middle/bottom and preserves the 70-page story.
- QA proposal is canceled and official data is unchanged.
- Every downstream corridor stage receives a Green, Yellow, or Red status with evidence.
- No Red blocker remains before release closeout.

**Rollback/fallback:** If any Red issue appears, stop at that boundary. Roll back only the affected paired deployment if production is worse than the recorded prior versions; otherwise leave the safe preview-only release unpromoted while fixing locally.

### Task 6: Consolidated automated gate and audits

**Files:**
- Update tests only when a real regression is reproduced.
- Modify: `AGENTS.md`
- Modify: `walkthrough.md`
- Modify: design/plan status files.

- [ ] Run one consolidated treatment-review gate:

```bash
npm run test -- --run \
  supabase/functions/writer-tools/outlineTreatmentPatch.test.ts \
  supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts \
  src/shared/writer/__tests__/schemas.test.ts \
  src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts \
  src/portals/writer/__tests__/writerOutlineTreatmentValidation.test.ts \
  src/portals/writer/writerOutlineTreatmentReviewModel.test.ts \
  src/portals/writer/__tests__/WriterOutlineTreatmentDiff.test.tsx \
  src/portals/writer/__tests__/WriterOutlineTreatmentReadableReview.test.tsx \
  src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx \
  src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx \
  --exclude '.worktrees/**'
```

- [ ] Run targeted lint on changed source files:

```bash
npm exec eslint \
  src/portals/writer/WriterOutlineTreatmentReview.tsx \
  src/portals/writer/WriterOutlineTreatmentReadableReview.tsx \
  src/portals/writer/WriterOutlineTreatmentDiff.tsx \
  src/portals/writer/writerOutlineTreatmentReviewModel.ts \
  supabase/functions/writer-tools/outlineTreatmentPatch.ts
```

- [ ] Run the production build once:

```bash
npm run build
```

- [ ] Perform the required three-pass audit:
  - ReAct: evidence gathered before each fix; no speculative expansion.
  - QA: source/proposal/rejection semantics, persistence, and non-mutation.
  - UI/UX: plain language, chronology, focus, keyboard, contrast, responsive layout, and no overlap.

- [ ] Record file/test counts separately and update the walkthrough.

### Task 7: Paired deployment and visual production smoke

- [ ] Verify Git, Supabase, Cloudflare, browser, and QA-account access.
- [ ] Commit and push the reviewed implementation.
- [ ] Deploy `writer-tools` and record its version.
- [ ] Deploy Cloudflare and record its Worker version.
- [ ] Load a fresh versioned production bundle.
- [ ] Generate a 70-page Organize and Polish preview.
- [ ] Verify:
  - no raw JSON or opaque IDs in Simple Workflow;
  - changed/rejected cards are chronological and page-aware;
  - no visible `\t`/stray `t` markers;
  - editor navigation and direct edit work;
  - top/middle/bottom screenshots show readable controls and no overlap;
  - keyboard focus and Escape work.
- [ ] Cancel the proposal.
- [ ] Confirm official outline version/content remains unchanged.

### Task 8: Persistent production-readiness corridor

- [ ] In the dedicated QA/demo project, verify and record:

| Stage | Required evidence |
|---|---|
| Outline | Official outline saves/reloads with correct count/order. |
| Pages & Beats | Receives official outline, generates, saves, reloads, and preserves issue identity. |
| Dialogue | Receives the correct beats, generates, saves, and reloads. |
| Imageshop Prep | Receives the expected outline/page/dialogue context and produces its handoff. |
| Comic Creator | Receives selected issue/page data without mutation or loss. |

- [ ] Assign each stage Green, Yellow, or Red.
- [ ] Repair only Red defects that block the critical path, using a failing focused test before code changes.
- [ ] Re-run only the affected focused smoke after a Red repair; do not repeat the complete gate without cross-cutting risk.
- [ ] Stop when no Red blocker remains.

### Pass 3 smoke test

- [ ] Confirm:
  - production review preview canceled safely;
  - screenshots cover top/middle/bottom and narrow viewport;
  - corridor status table contains evidence for every stage;
  - no Red production blocker remains.

### Pass 3 result summary

- [ ] Record commits, Supabase/Cloudflare versions, test counts, screenshots, readiness statuses, Yellow follow-ups, and confirmation that no personal official content was changed.

---

## Final audit and closeout

- [ ] Confirm the diff matches only the approved specification.
- [ ] Verify root and nearest DOX instructions; update `AGENTS.md` only for durable behavior changes.
- [ ] Verify `walkthrough.md` with `git status --short walkthrough.md` and targeted `rg`.
- [ ] Mark the design and plan implemented only after production evidence passes.
- [ ] Commit and push final release documentation.
- [ ] Report exactly what was automated, visually inspected, exercised in production, and deferred.
