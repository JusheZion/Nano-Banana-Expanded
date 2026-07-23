# Writer AI Treatment Patch Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unsafe full-outline AI replacement with deterministic patch application so partial AI output cannot rotate, omit, or duplicate a long outline.

**Architecture:** Gemini returns explicit `edit`, `move`, `combine`, and `add` operations against immutable source beat IDs. The Edge Function validates and applies accepted operations to the complete source, retains all unmentioned beats in place, derives the proposal and manifest, and returns operation notices for review. The existing client promotion, version history, and Undo flow remain intact.

**Tech Stack:** TypeScript, Zod, Supabase Edge Functions/Deno, React, Vitest, Cloudflare Workers.

---

## Risk and dependency check

- Supabase CLI authentication and Edge deployment access must be confirmed before release.
- Cloudflare authentication and the configured `npm run deploy` path must be confirmed before release.
- Live AI calls use the supported low-latency Gemini route already configured for outline treatment.
- Production mutation is prohibited during smoke testing; the representative 70-beat proposal must be canceled.
- The supplied malformed-original attachment is diagnostic evidence only. The production source stored in the app remains authoritative.
- Rollback requires paired Supabase and Cloudflare version awareness. Do not restore the unsafe omitted-beat append normalizer.

## File structure

| File | Responsibility |
|---|---|
| `supabase/functions/_shared/writerSchemas.ts` | Edge request, patch-operation, notice, proposal, and manifest schemas. |
| `src/shared/writer/schemas.ts` | Matching client response schema including optional operation notices. |
| `supabase/functions/writer-tools/outlineTreatmentPatch.ts` | Pure deterministic patch validation/application and manifest derivation. |
| `supabase/functions/writer-tools/outlineTreatmentPrompt.ts` | Patch-only Gemini prompt and repair prompt; no full-outline normalization. |
| `supabase/functions/writer-tools/index.ts` | Parse patch output, apply it once, and return the deterministic preview. |
| `src/portals/writer/writerOutlineTreatmentIntegration.ts` | Parse notices with the existing proposal session. |
| `src/portals/writer/writerOutlineTreatmentValidation.ts` | Retain promotion validation and safe per-change rejection behavior. |
| `src/portals/writer/WriterOutlineTreatmentReview.tsx` | Show accepted/rejected operation notices and preserve preview controls. |
| Focused `*.test.ts(x)` files | Reproduce partial-output rotation and cover operation contracts. |

---

## Pass 1: Deterministic patch engine

**Objective:** Establish the operation schema and pure applicator before changing the live handler.

**Acceptance criteria:**

- A response containing only eight late-story edits leaves all other source beats in their original relative positions.
- Unknown, duplicate, conflicting, self-anchored, and mode-forbidden operations are rejected individually.
- Accepted additions and combinations cannot exceed the selected page range.
- The applicator always returns a complete proposal, exact-once manifest, sequential pages, and notices.

**Rollback/fallback:** No runtime code calls the new applicator during this pass. Revert the new files/schema additions if the focused unit smoke cannot pass.

### Task 1: Define patch schemas

**Files:**
- Modify: `supabase/functions/_shared/writerSchemas.ts`
- Modify: `src/shared/writer/schemas.ts`

- [ ] Add a patch operation schema with this stable wire shape:

```ts
const outlineTreatmentPatchOperationSchema = z.object({
  operation_id: z.string().min(1).max(160),
  operation: z.enum(['edit', 'move', 'combine', 'add']),
  source_beat_ids: z.array(z.string().min(1).max(160)).max(200),
  anchor_source_beat_id: z.string().min(1).max(160).optional(),
  placement: z.enum(['before', 'after']).optional(),
  reason: z.string().min(1).max(1000),
  scene: z.string().optional(),
  summary: z.string().optional(),
  emotional_turn: z.string().optional(),
}).strict();

export const outlineTreatmentPatchResultSchema = z.object({
  operations: z.array(outlineTreatmentPatchOperationSchema).max(250),
}).strict();

const outlineTreatmentOperationNoticeSchema = z.object({
  operation_id: z.string().min(1).max(160),
  status: z.enum(['accepted', 'rejected', 'warning']),
  code: z.string().min(1).max(160),
  message: z.string().min(1).max(1000),
  source_beat_ids: z.array(z.string().min(1).max(160)).max(200),
}).strict();
```

- [ ] Extend `outlineTreatmentPreviewResultSchema` with:

```ts
operation_notices: z.array(outlineTreatmentOperationNoticeSchema).max(250).optional(),
```

- [ ] Remove `outlineTreatmentCompactResultSchema` only after all imports migrate in Pass 2.

### Task 2: Write the failing applicator regression

**Files:**
- Create: `supabase/functions/writer-tools/outlineTreatmentPatch.test.ts`

- [ ] Add a 70-beat test where the AI returns only edits for source beats 63–70:

```ts
it('keeps untouched beats in place when AI returns only eight late-story edits', () => {
  const input = makeInput(70, 'structure');
  const result = applyOutlineTreatmentPatches({
    operations: input.sourceBeats.slice(62).map((beat, index) => ({
      operation_id: `late-${index + 1}`,
      operation: 'edit',
      source_beat_ids: [beat.id],
      reason: 'Polish the ending.',
      summary: `Polished ${beat.text}`,
    })),
  }, input);

  expect(result.proposal.page_beats).toHaveLength(70);
  expect(result.proposal.page_beats?.[0]?.summary).toBe(input.sourceBeats[0]?.text);
  expect(result.proposal.page_beats?.[61]?.summary).toBe(input.sourceBeats[61]?.text);
  expect(result.proposal.page_beats?.[62]?.summary).toBe(`Polished ${input.sourceBeats[62]?.text}`);
  expect(result.proposal.page_beats?.at(-1)?.summary).toBe(`Polished ${input.sourceBeats[69]?.text}`);
  expect(result.manifest.entries.flatMap((entry) => entry.source_beat_ids)).toEqual(
    input.sourceBeats.map((beat) => beat.id),
  );
});
```

- [ ] Add focused tests for:
  - edit retains position;
  - move requires a valid distinct anchor;
  - combine consumes each source exactly once;
  - add requires an anchor;
  - forbidden operations are rejected by mode;
  - duplicate/conflicting operations reject the later operation;
  - min/max page range rejects only the violating operation;
  - sequential numbering and unique result IDs.

- [ ] Run:

```bash
npm run test -- --run supabase/functions/writer-tools/outlineTreatmentPatch.test.ts --exclude '.worktrees/**'
```

Expected: FAIL because `applyOutlineTreatmentPatches` does not exist.

### Task 3: Implement the pure applicator

**Files:**
- Create: `supabase/functions/writer-tools/outlineTreatmentPatch.ts`

- [ ] Export these interfaces:

```ts
export type OutlineTreatmentPatchOperation = z.infer<typeof outlineTreatmentPatchOperationSchema>;
export type OutlineTreatmentOperationNotice = z.infer<typeof outlineTreatmentOperationNoticeSchema>;

export function applyOutlineTreatmentPatches(
  patchResult: { operations: OutlineTreatmentPatchOperation[] },
  input: OutlineTreatmentPromptInput,
): CompleteTreatmentPreviewResult & {
  operation_notices: OutlineTreatmentOperationNotice[];
};
```

- [ ] Start from one node per source beat:

```ts
type WorkingBeat = {
  resultId: string;
  sourceIds: string[];
  changeType: TreatmentChangeType;
  reason: string;
  beat: { scene?: string; summary: string; emotional_turn?: string };
};

const working: WorkingBeat[] = input.sourceBeats.map((source) => ({
  resultId: source.id,
  sourceIds: [source.id],
  changeType: 'unchanged',
  reason: 'Source beat retained.',
  beat: { summary: source.text },
}));
```

- [ ] Apply operations in response order using source-ID lookup against the working list:
  - `edit`: replace only declared text fields and retain index;
  - `move`: remove the target node and insert it before/after the anchor node;
  - `combine`: remove all targeted nodes and insert one combined node at the earliest affected index or valid anchor;
  - `add`: insert a source-less node before/after its valid anchor.

- [ ] Before each mutation, validate mode permission, source existence, conflict consumption, anchor validity, operation cardinality, required proposed text, and projected page count.

- [ ] Convert rejected operations to notices and continue:

```ts
notices.push({
  operation_id: operation.operation_id,
  status: 'rejected',
  code: 'unknown_source_beat',
  message: 'The operation references a source beat that does not exist.',
  source_beat_ids: operation.source_beat_ids,
});
```

- [ ] Derive proposal, manifest, and sequential numbering from `working`; do not append or restore omitted beats because the base always contains them.

### Pass 1 smoke test

- [ ] Run:

```bash
npm run test -- --run \
  supabase/functions/writer-tools/outlineTreatmentPatch.test.ts \
  supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts \
  --exclude '.worktrees/**'
```

Expected: both files pass.

### Pass 1 result summary

- [ ] Record test-file/test counts and confirm the eight-operation/70-beat chronology regression passes before Pass 2.

---

## Pass 2: Edge prompt and handler migration

**Objective:** Make production preview consume patch operations and eliminate full-outline salvage.

**Acceptance criteria:**

- The prompt requests operations only.
- The Edge handler never calls `normalizeCompactTreatmentResult` or hydrates a model-supplied replacement outline.
- Schema-valid partial output produces a complete deterministic proposal without a repair call.
- Malformed patch JSON still fails closed with an actionable response.

**Rollback/fallback:** The Edge deployment remains untouched until the pass smoke passes. If migration fails, retain production version 77 while correcting locally.

### Task 4: Replace the full-outline prompt

**Files:**
- Modify: `supabase/functions/writer-tools/outlineTreatmentPrompt.ts`
- Modify: `supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts`

- [ ] Replace the return contract with:

```ts
[
  'Return JSON only with an operations array. Do not return a replacement outline.',
  'Omit unchanged beats; the application retains them automatically.',
  'Use edit for wording changes, move for explicit reordering, combine for explicit consolidation, and add for new material.',
  'Every move and add must include anchor_source_beat_id and placement.',
  'Every edit must reference exactly one source beat.',
  'Every combine must reference at least two source beats.',
  'Never claim a source ID whose supplied text does not match the event being changed.',
  JSON.stringify(input.sourceBeats),
  'Return shape: {"operations":[...]}',
].join('\n\n');
```

- [ ] Delete `normalizeCompactTreatmentResult`, `hydrateOutlineTreatmentResult`, and the full-result repair prompt after the handler migration compiles.

- [ ] Update prompt tests to assert `operations`, “Do not return a replacement outline,” and absence of the old `page_beats` return shape.

### Task 5: Migrate the Edge handler

**Files:**
- Modify: `supabase/functions/writer-tools/index.ts`
- Modify: `supabase/functions/_shared/writerSchemas.ts`

- [ ] Parse Gemini output with `outlineTreatmentPatchResultSchema`.
- [ ] Call `applyOutlineTreatmentPatches(parsed.data, promptInput)`.
- [ ] Validate the derived result with `outlineTreatmentPreviewResultSchema` and `getOutlineTreatmentConsistencyErrors`.
- [ ] Return one 422 only when the patch response itself is malformed or the deterministic derived result violates an invariant.
- [ ] Remove the AI self-repair call for schema-valid partial operations.
- [ ] Keep the low-latency model and `thinkingBudget: 0`.

### Pass 2 smoke test

- [ ] Run:

```bash
npm run test -- --run \
  supabase/functions/writer-tools/outlineTreatmentPatch.test.ts \
  supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts \
  src/shared/writer/__tests__/schemas.test.ts \
  --exclude '.worktrees/**'
```

Expected: all focused Edge/schema tests pass.

### Pass 2 result summary

- [ ] Confirm no full-outline normalizer or AI repair path remains and record focused counts.

---

## Midpoint QA audit

- [ ] Trace request → Gemini operation response → deterministic applicator → schema validation → client parser.
- [ ] Confirm partial operation output is safe by construction rather than repaired after replacement.
- [ ] Confirm no official-outline mutation occurs in preview.
- [ ] Confirm operation permission and page-range rules match `writerOutlineTreatmentContracts.ts`.
- [ ] Run `rg -n "normalizeCompactTreatmentResult|outlineTreatmentCompactResultSchema|buildOutlineTreatmentRepairPrompt"` and require no runtime references.

---

## Pass 3: Client review and recovery behavior

**Objective:** Surface patch acceptance/rejection clearly while preserving promotion, alternate, cancel, and Undo behavior.

**Acceptance criteria:**

- Simple review shows accepted/rejected/warning counts and plain-language rejected reasons.
- Advanced review retains per-change rejection.
- The proposal includes title, premise, Acts, notes, and the complete deterministic page sequence.
- Cancel and Escape leave the official outline unchanged.

**Rollback/fallback:** The Edge can return optional notices without requiring immediate client rendering. If UI work blocks, keep notices optional and do not deploy the client until focused review tests pass.

### Task 6: Parse and display operation notices

**Files:**
- Modify: `src/portals/writer/writerOutlineTreatmentIntegration.ts`
- Modify: `src/portals/writer/writerOutlineTreatmentValidation.ts`
- Modify: `src/portals/writer/WriterOutlineTreatmentReview.tsx`
- Modify: `src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts`
- Modify: `src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx`

- [ ] Add notices to `TreatmentProposalSession`:

```ts
export type TreatmentOperationNotice = {
  operationId: string;
  status: 'accepted' | 'rejected' | 'warning';
  code: string;
  message: string;
  sourceBeatIds: string[];
};
```

- [ ] Map optional `operation_notices` in `parseOutlineTreatmentPreview`.
- [ ] Add a review summary region:

```tsx
{reviewSession?.operationNotices?.length ? (
  <section aria-label="AI operation notices">
    <p>{acceptedCount} accepted · {rejectedCount} rejected · {warningCount} warnings</p>
    {rejectedNotices.map((notice) => (
      <p key={notice.operationId}>{notice.message}</p>
    ))}
  </section>
) : null}
```

- [ ] Keep **Make official** enabled when invalid operations were safely excluded and the final deterministic proposal validates.
- [ ] Preserve existing Cancel, Regenerate, Keep as alternate, Advanced rejection, and Make official controls.

### Task 7: Add the supplied failure as a client regression

**Files:**
- Modify: `src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts`
- Create: `src/portals/writer/__tests__/fixtures/outlineTreatmentPartialEnding.ts`

- [ ] Encode a 70-beat synthetic source and eight accepted late-story edits.
- [ ] Assert the parsed proposal begins with source beat 1, not late-story material.
- [ ] Assert source beat 63 remains at result position 63 and the conclusion remains last.
- [ ] Assert metadata and all 70 beats survive.
- [ ] Assert the proposal can be canceled without calling promotion.

### Pass 3 smoke test

- [ ] Run:

```bash
npm run test -- --run \
  src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts \
  src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx \
  src/portals/writer/__tests__/writerOutlineTreatmentValidation.test.ts \
  --exclude '.worktrees/**'
```

Expected: all client review/promotion tests pass.

### Pass 3 result summary

- [ ] Record focused counts and confirm the user-visible review identifies rejected operations without corrupting the proposal.

---

## Pass 3 audit

- [ ] Review UI completeness: discoverability, loading, empty notices, rejected notices, keyboard Escape, focus, disabled state, cancel, alternate, promotion, and responsive layout.
- [ ] Review ReAct boundary: model proposes operations; deterministic code owns state transition; user approves mutation.
- [ ] Review recovery: preview-only, version snapshot, Undo, cancel, and rollback remain intact.

---

## Pass 4: Consolidated release gate

**Objective:** Verify the complete patch model once, deploy both surfaces, and run one representative production smoke.

**Acceptance criteria:**

- Focused treatment suite, targeted lint, and production build pass.
- Supabase and Cloudflare deploy successfully with recorded versions.
- A signed-in 70-beat Organize and Polish preview preserves chronology, exact-once coverage, metadata, numbering, and cancellation safety.
- No production outline is promoted during QA.

**Rollback/fallback:** If the live preview fails, cancel it, retain the official outline, record the failing deployment versions, and roll back both surfaces to their last paired working versions.

### Task 8: Consolidated regression and audits

- [ ] Run the complete focused treatment suite once:

```bash
npm run test -- --run \
  supabase/functions/writer-tools/outlineTreatmentPatch.test.ts \
  supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts \
  src/shared/writer/__tests__/schemas.test.ts \
  src/portals/writer/__tests__/writerOutlineTreatmentContracts.test.ts \
  src/portals/writer/__tests__/writerOutlineTreatmentValidation.test.ts \
  src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts \
  src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx \
  src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx \
  --exclude '.worktrees/**'
```

- [ ] Run targeted lint on changed files with `npx eslint <changed files>`.
- [ ] Run `npm run build`.
- [ ] Perform final code audit for deterministic ownership, schema parity, user-facing notices, and absence of obsolete full-outline repair code.

### Task 9: Documentation, commit, deploy, and live smoke

**Files:**
- Modify: `AGENTS.md`
- Modify: `walkthrough.md`
- Modify: `docs/superpowers/specs/2026-07-23-writer-ai-treatment-patch-model-design.md`
- Modify: this plan checklist

- [ ] Update DOX with the implemented patch-operation contract and QA release gate.
- [ ] Append the immediate walkthrough entry with actual commands, counts, versions, risks, and live result.
- [ ] Change the design status to implemented after verification.
- [ ] Commit with:

```bash
git commit -m "fix: apply outline treatments as patches"
```

- [ ] Push `main`.
- [ ] Deploy `writer-tools` and confirm the active Supabase version.
- [ ] Deploy Cloudflare with `npm run deploy` and record the Worker version.
- [ ] Load a fresh signed-in production page.
- [ ] Run **Organize and Polish** against the representative 70-beat source.
- [ ] Verify:
  - request completes below 150 seconds;
  - proposal starts with the original opening;
  - late-story edits remain near the ending;
  - the concluding campfire beat remains last;
  - every source beat is represented exactly once;
  - title, premise, four Acts, and notes remain;
  - pages are sequential and within the 10% range;
  - operation notices are understandable;
  - Cancel closes review;
  - official outline remains unchanged.

### Pass 4 smoke test

- [ ] Confirm the fresh live production preview passes every release assertion and is canceled without promotion.

### Pass 4 result summary

- [ ] Record final commit, push, Supabase version, Cloudflare version, focused test-file/test counts, build result, live duration, proposal counts, and confirmation that official data did not change.

