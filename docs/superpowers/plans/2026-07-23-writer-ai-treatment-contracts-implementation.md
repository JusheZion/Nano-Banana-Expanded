# Writer AI Treatment Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Keep My Order, Organize and Polish, and Expand Creatively materially different, enforceable AI transformations with source-beat traceability, page-count tolerances, review controls, persistence, and reload-safe Undo.

**Architecture:** Replace the legacy prompt-only `outline_issue` treatment path with a bounded `outline_treatment_preview` contract. The client normalizes the approved source into stable beat records, the Edge Function returns a proposal plus a source-to-result manifest, and a pure deterministic validator blocks structurally invalid promotion. Simple Workflow summarizes contract-valid changes; Advanced Workflow exposes individual structural/creative decisions and revalidates before promotion.

**Tech Stack:** React 19, TypeScript, Zod, Vitest/Testing Library, Supabase Edge Functions/Postgres JSONB, Cloudflare Workers, Browser Use QA.

**Approved design:** `docs/superpowers/specs/2026-07-23-writer-ai-treatment-contracts-design.md`

---

## Risk and dependency check

- The current Edge prompt distinguishes modes only through prose and returns only an outline. No manifest is available to validate.
- `writer_issue_outlines.outline_json` is JSONB and `issueOutlineSchema` is passthrough, so the manifest can be stored under `treatment_manifest` without a migration. This plan must not add a database migration.
- Deterministic validation can prove identity coverage, ordering, page mapping, additions, combinations, and tolerance. It cannot independently prove nuanced semantic equivalence; source text and mapping evidence therefore remain visible in review, and protected names/page assignments receive explicit guards.
- Keep My Order must be reconstructed from immutable source beat structure so the AI cannot alter beat count, order, identity, or page assignment.
- Organize/Expand must retain every source beat ID in the manifest. Missing coverage is blocking even if the prose appears acceptable.
- Edge deployment requires authenticated Supabase CLI access to the linked project. Cloudflare deployment requires authenticated Wrangler access.
- Signed-in browser QA requires uniquely named disposable data and cleanup. If cleanup fails, report the exact recoverable-trash location.
- Rollback: the existing live `outline_issue` path remains available behind a local fallback until Pass 3 integration is green. Do not deploy a client that requests `outline_treatment_preview` before the Edge Function is deployed.

## File responsibility map

| File | Responsibility |
|---|---|
| `src/portals/writer/writerOutlineTreatmentContracts.ts` | Central labels, permissions, tolerances, source normalization, and page-range calculation. |
| `src/portals/writer/writerOutlineTreatmentValidation.ts` | Pure manifest validation, preservation summary, and Advanced decision application. |
| `src/shared/writer/schemas.ts` | Client request/response/manifest schemas. |
| `src/shared/writer/types.ts` | Shared treatment request and response types. |
| `supabase/functions/_shared/writerSchemas.ts` | Edge mirror of bounded treatment schemas. |
| `supabase/functions/writer-tools/index.ts` | Treatment prompt, Gemini response parsing, preview-only response, and zero persistence. |
| `src/portals/writer/WriterOutlineTreatmentReview.tsx` | Simple summary and Advanced per-change review. |
| `src/portals/writer/WriterPortal.tsx` | Orchestration, request state, validation, promotion, manifest persistence, and Undo integration. |
| `src/portals/writer/writerOutlineAlternates.ts` | Alternate-version manifest retention. |

## Pass 1: Treatment domain and deterministic validator

**Objective:** Establish one authoritative contract model and prove that invalid transformations cannot pass.

**Acceptance criteria:** All three modes share one definition; source beats receive stable request-scoped IDs; Keep My Order has one-to-one structural enforcement; Organize/Expand require full source coverage; page tolerances and manifest errors are deterministic.

### Task 1: Centralize treatment definitions

**Files:**
- Create: `src/portals/writer/writerOutlineTreatmentContracts.ts`
- Create: `src/portals/writer/__tests__/writerOutlineTreatmentContracts.test.ts`
- Modify: `src/portals/writer/writerSynopsisHelper.ts`
- Modify: `src/portals/writer/WriterPortal.tsx`

- [x] **Step 1: Write failing contract-definition tests**

```ts
expect(getTreatmentContract('preserve')).toMatchObject({
  pageTolerance: 0,
  allowReorder: false,
  allowCombine: false,
  allowAdd: false,
});
expect(getTreatmentContract('structure').pageTolerance).toBe(0.10);
expect(getTreatmentContract('expand').pageTolerance).toBe(0.20);
expect(getTreatmentPageRange('structure', 52)).toEqual({ min: 47, max: 57 });
```

- [x] **Step 2: Run the test and verify RED**

Run:

```bash
npm run test -- --run src/portals/writer/__tests__/writerOutlineTreatmentContracts.test.ts
```

Expected: FAIL because the contract module does not exist.

- [x] **Step 3: Implement the central contract**

```ts
export const WRITER_OUTLINE_TREATMENT_MODES = ['preserve', 'structure', 'expand'] as const;
export type WriterOutlineTreatmentMode = typeof WRITER_OUTLINE_TREATMENT_MODES[number];

export const TREATMENT_CONTRACTS = {
  preserve: {
    label: 'Keep my order',
    description: 'Improve language and formatting without changing beats, order, pages, events, or outcomes.',
    pageTolerance: 0,
    allowReorder: false,
    allowCombine: false,
    allowEnhance: false,
    allowAdd: false,
  },
  structure: {
    label: 'Organize and polish',
    description: 'Reorganize and strengthen pacing while keeping every source beat traceable.',
    pageTolerance: 0.10,
    allowReorder: true,
    allowCombine: true,
    allowEnhance: true,
    allowAdd: true,
  },
  expand: {
    label: 'Expand creatively',
    description: 'Enhance existing beats and add material while preserving every original event and outcome.',
    pageTolerance: 0.20,
    allowReorder: true,
    allowCombine: true,
    allowEnhance: true,
    allowAdd: true,
  },
} as const;
```

Use `Math.floor(sourcePages * (1 - tolerance))` and `Math.ceil(sourcePages * (1 + tolerance))`, clamped to `1..200`.

- [x] **Step 4: Replace duplicated labels in both Writer modes**

Render Simple and Advanced controls from `TREATMENT_CONTRACTS`. Preserve stored values `preserve`, `structure`, and `expand` for backward compatibility.

- [x] **Step 5: Run focused tests and commit**

```bash
npm run test -- --run src/portals/writer/__tests__/writerOutlineTreatmentContracts.test.ts src/portals/writer/__tests__/writerSynopsisHelper.test.ts
git add src/portals/writer/writerOutlineTreatmentContracts.ts src/portals/writer/__tests__/writerOutlineTreatmentContracts.test.ts src/portals/writer/writerSynopsisHelper.ts src/portals/writer/WriterPortal.tsx
git commit -m "feat: centralize outline treatment contracts"
```

### Task 2: Normalize source beats and validate manifests

**Files:**
- Create: `src/portals/writer/writerOutlineTreatmentValidation.ts`
- Create: `src/portals/writer/__tests__/writerOutlineTreatmentValidation.test.ts`

- [x] **Step 1: Write failing source-normalization tests**

```ts
const source = normalizeTreatmentSource({
  acts: [{ name: 'Act I', summary: 'The warning begins.' }],
  page_beats: [
    { page_target: 1, scene: 'Campfire', summary: 'The elder begins.' },
    { page_target: 2, summary: 'The warning arrives.' },
  ],
});
expect(source.beats.map((beat) => beat.id)).toEqual(['source-page-1-1', 'source-page-2-2']);
expect(source.pageCount).toBe(2);
```

IDs use page target plus source ordinal, never rewritten text alone. Missing page targets use `source-unpaged-{ordinal}`.

- [x] **Step 2: Write failing mode-validation tests**

Cover:

```ts
expect(validateTreatmentProposal(preserveInputWithMovedBeat).valid).toBe(false);
expect(validateTreatmentProposal(structureInputMissingOneSourceId).errors).toContainEqual(
  expect.objectContaining({ code: 'missing_source_beat' }),
);
expect(validateTreatmentProposal(structureInputAtTenPercent).valid).toBe(true);
expect(validateTreatmentProposal(structureInputAboveTenPercent).errors).toContainEqual(
  expect.objectContaining({ code: 'page_tolerance_exceeded' }),
);
expect(validateTreatmentProposal(expandInputWithMappedSourcesAndAddition).valid).toBe(true);
```

Also cover unknown IDs, duplicate result IDs, forbidden additions, Keep My Order page changes, protected character-name removal, malformed change types, and empty proposals.

- [x] **Step 3: Run the test and verify RED**

```bash
npm run test -- --run src/portals/writer/__tests__/writerOutlineTreatmentValidation.test.ts
```

Expected: FAIL because normalization and validation are absent.

- [x] **Step 4: Implement exact manifest types and validation**

```ts
export type TreatmentChangeType =
  | 'unchanged'
  | 'language_polished'
  | 'moved'
  | 'combined'
  | 'enhanced'
  | 'added';

export type TreatmentManifestEntry = {
  resultBeatId: string;
  sourceBeatIds: string[];
  changeType: TreatmentChangeType;
  originalPages: number[];
  proposedPage?: number;
  reason: string;
};

export type TreatmentValidationResult = {
  valid: boolean;
  errors: Array<{ code: string; message: string; sourceBeatIds: string[] }>;
  summary: {
    sourceBeats: number;
    preserved: number;
    moved: number;
    combined: number;
    enhanced: number;
    added: number;
    sourcePages: number;
    proposedPages: number;
  };
};
```

For Keep My Order, rebuild result ordering and page targets from source records before validation. For all modes, require the set union of manifest `sourceBeatIds` to equal the source ID set.

- [x] **Step 5: Add Advanced decision application tests**

```ts
const restored = rejectTreatmentChange(session, 'result-combined-3');
expect(restored.proposal.page_beats).toEqual(expect.arrayContaining([
  expect.objectContaining({ source_beat_ids: ['source-page-3-3'] }),
  expect.objectContaining({ source_beat_ids: ['source-page-4-4'] }),
]));
expect(validateTreatmentProposal(restored).valid).toBe(true);
```

Rejecting `added` removes the result. Rejecting `combined`, `moved`, or `enhanced` restores immutable source beats.

- [x] **Step 6: Run Pass 1 smoke test**

```bash
npm run test -- --run src/portals/writer/__tests__/writerOutlineTreatmentContracts.test.ts src/portals/writer/__tests__/writerOutlineTreatmentValidation.test.ts
npx tsc -b --pretty false
```

Expected: all focused tests and TypeScript pass.

- [x] **Step 7: Record Pass 1 result**

Append exact counts and any resolved edge cases to this plan and `walkthrough.md`.

**Pass 1 result (2026-07-23):** PASS. Contract definitions and deterministic
proposal validation are centralized. Source beats receive stable page/ordinal
identity; every proposal must account for the complete source set; duplicate,
unknown, missing, and mode-forbidden manifest changes are rejected; protected
terms are checked; and Advanced rejection restores immutable source beats or
removes additions. The bounded page ranges intentionally use the plan's
floor/ceil rule, producing `46..58` for a 52-page structure treatment and
`41..63` for expand. Focused smoke: 2 files, 12 tests passed. TypeScript:
`npx tsc -b --pretty false` passed.

**Pass 1 smoke test:** A fixture with 12 beats must reject one removed source ID under every mode, reject a moved beat under Keep My Order, accept traceable combination within Organize and Polish, and accept a mapped addition within Expand Creatively.

**Rollback:** Revert the isolated domain commit; no runtime path uses it yet.

## Pass 2: Edge preview contract and zero-persistence generation

**Objective:** Make AI return a bounded proposal and manifest whose behavior is mode-specific and preview-only.

**Acceptance criteria:** Request and response schemas match client/Edge; prompts contain exact permissions; malformed manifests fail; preview performs no outline insert/update; Keep My Order cannot alter structure because the server reconstructs it from source identity.

### Task 3: Add request and response schemas

**Files:**
- Modify: `src/shared/writer/schemas.ts`
- Modify: `src/shared/writer/types.ts`
- Modify: `supabase/functions/_shared/writerSchemas.ts`
- Modify: `src/shared/writer/__tests__/schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

```ts
expect(writerToolsOutlineTreatmentPreviewRequestSchema.parse({
  mode: 'outline_treatment_preview',
  issue_id: crypto.randomUUID(),
  treatment_mode: 'structure',
  source_page_count: 52,
  allowed_page_range: { min: 47, max: 58 },
  source_beats: [{ id: 'source-page-1-1', page_target: 1, text: 'Opening.' }],
})).toBeTruthy();
```

Reject more than 200 source beats, duplicate source IDs, text totals above 60,000 characters, invalid page ranges, unknown treatment modes, more than 250 manifest entries, and unknown change types.

- [ ] **Step 2: Run schema tests and verify RED**

```bash
npm run test -- --run src/shared/writer/__tests__/schemas.test.ts
```

- [ ] **Step 3: Implement mirrored schemas**

Add `writerToolsOutlineTreatmentPreviewRequestSchema` and `outlineTreatmentPreviewResultSchema` to both schema files. The result shape is:

```ts
{
  proposal: issueOutlineSchema,
  manifest: {
    treatment_mode: z.enum(['preserve', 'structure', 'expand']),
    source_page_count: z.number().int().min(1).max(200),
    proposed_page_count: z.number().int().min(1).max(200),
    entries: z.array(treatmentManifestEntrySchema).max(250),
  },
}
```

- [ ] **Step 4: Add the new payload to `WriterToolsRequest`**

Update the shared discriminated union and `WriterToolsOutlineTreatmentPreviewPayload`.

- [ ] **Step 5: Run mirrored-schema verification**

```bash
npm run test -- --run src/shared/writer/__tests__/schemas.test.ts
npx tsc -b --pretty false
```

### Task 4: Implement mode-specific Edge preview

**Files:**
- Modify: `supabase/functions/writer-tools/index.ts`
- Create: `supabase/functions/writer-tools/outlineTreatmentPrompt.ts`
- Create: `supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts`

- [ ] **Step 1: Write failing prompt tests**

Assert:

- Keep My Order says beat IDs, order, and page targets are immutable.
- Organize and Polish permits traceable combination/reordering and includes the allowed range.
- Expand Creatively permits enhancement/addition and includes the allowed range.
- Every prompt requires a manifest entry for every result beat.
- No prompt permits source-beat deletion.

- [ ] **Step 2: Run prompt tests and verify RED**

```bash
npm run test -- --run supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts
```

- [ ] **Step 3: Implement a pure prompt builder**

```ts
export function buildOutlineTreatmentPrompt(input: OutlineTreatmentPromptInput): string {
  return [
    'Return JSON only.',
    `Treatment mode: ${input.treatmentMode}`,
    `Allowed page range: ${input.allowedPageRange.min}-${input.allowedPageRange.max}`,
    'Every source beat id must appear in the manifest.',
    input.contractInstruction,
    JSON.stringify(input.sourceBeats),
  ].join('\n\n');
}
```

Keep mode-specific permissions in one record and test them directly.

- [ ] **Step 4: Add the Edge handler**

After authentication and issue ownership checks:

1. Validate request.
2. Build mode prompt.
3. Invoke Gemini through the existing model fallback.
4. Parse JSON.
5. Validate `outlineTreatmentPreviewResultSchema`.
6. For Keep My Order, replace proposal page targets/order with the immutable source structure.
7. Return `{ success: true, mode: 'outline_treatment_preview', data }`.
8. Do not query outline versions and do not insert/update `writer_issue_outlines`.

- [ ] **Step 5: Add zero-persistence Edge tests**

Spy on the Supabase query path and assert no `.insert()` or `.update()` occurs for success, schema failure, or AI failure.

- [ ] **Step 6: Run Pass 2 smoke test**

```bash
npm run test -- --run supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts src/shared/writer/__tests__/schemas.test.ts
npx tsc -b --pretty false
```

Expected: prompt/schema suites and TypeScript pass.

- [ ] **Step 7: Commit Pass 2**

```bash
git add src/shared/writer/schemas.ts src/shared/writer/types.ts src/shared/writer/__tests__/schemas.test.ts supabase/functions/_shared/writerSchemas.ts supabase/functions/writer-tools/index.ts supabase/functions/writer-tools/outlineTreatmentPrompt.ts supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts
git commit -m "feat: add validated outline treatment preview"
```

**Pass 2 smoke test:** Submit the same 12-beat fixture to all three prompt builders, validate three bounded responses, and prove zero database writes.

**Rollback:** Do not connect the client. Revert the Edge/schema commit or redeploy the previous `writer-tools` version.

## Midpoint QA audit

- [ ] Trace one populated fixture from normalized source through request schema, prompt, response schema, and deterministic validation.
- [ ] Confirm the three modes have distinct permitted transformations, not only different labels.
- [ ] Confirm every source ID is accounted for and additions cannot impersonate source beats.
- [ ] Confirm page tolerances use detected source pages rather than the UI default target.
- [ ] Confirm Keep My Order structure is reconstructed from immutable source data.
- [ ] Confirm preview success and failure create zero official versions.
- [ ] Record audit evidence and resolve failures before Pass 3.

## Pass 3: Simple and Advanced treatment review

**Objective:** Integrate validated previews into WriterPortal and provide mode-appropriate review without silent promotion.

**Acceptance criteria:** Simple shows contract and preservation summary; Advanced supports per-change review; invalid proposals cannot promote; manifests persist with official/alternate versions; source and official outline remain unchanged on cancel/error.

### Task 5: Integrate preview orchestration and persistence

**Files:**
- Modify: `src/portals/writer/WriterPortal.tsx`
- Modify: `src/portals/writer/writerOutlineAlternates.ts`
- Create: `src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts`

- [ ] **Step 1: Write failing orchestration tests**

Cover:

- request uses normalized approved source, mode, detected page count, and calculated range;
- invalid response never opens a promotable proposal;
- cancel creates no version;
- promotion stores `treatment_manifest` inside `outline_json`;
- alternate retains its manifest;
- source synchronization occurs only after promotion;
- Undo restores the exact prior outline and source after reload.

- [ ] **Step 2: Run integration tests and verify RED**

```bash
npm run test -- --run src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts
```

- [ ] **Step 3: Replace `outline_issue` preview generation**

`runOutlineGenerate` calls `outline_treatment_preview` with:

```ts
{
  mode: 'outline_treatment_preview',
  issue_id: selectedIssueId,
  treatment_mode: authorOutlineMode,
  source_page_count: normalized.pageCount,
  allowed_page_range: getTreatmentPageRange(authorOutlineMode, normalized.pageCount),
  source_beats: normalized.beats,
  production_defaults: productionDefaultsPayload,
}
```

Parse the response, validate it, and store a review session containing source, proposal, manifest, validation, and workflow mode.

- [ ] **Step 4: Gate promotion**

Disable promotion unless `validation.valid`. Revalidate after JSON edits and Advanced decisions. Persist:

```ts
{
  ...proposal,
  treatment_manifest: manifest,
}
```

Do not replace `authorOutlineText` until promotion succeeds.

- [ ] **Step 5: Update alternate retention**

Extend `WriterOutlineAlternate` with `manifest` and validate legacy alternates without manifests as read-only historical records.

- [ ] **Step 6: Run orchestration tests**

```bash
npm run test -- --run src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts src/portals/writer/__tests__/writerOutlineAlternates.test.ts src/portals/writer/__tests__/writerOutlinePasteRecovery.test.ts
```

### Task 6: Build Simple and Advanced review surfaces

**Files:**
- Modify: `src/portals/writer/WriterOutlineTreatmentReview.tsx`
- Create: `src/portals/writer/WriterOutlineTreatmentChangeList.tsx`
- Modify: `src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx`
- Create: `src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx`

- [ ] **Step 1: Write failing Simple review tests**

Assert selected contract copy, source/proposed page totals, preserved/combined/enhanced/added counts, blocking validation alert, disabled Make official, Review details, Regenerate, Cancel, and keyboard focus behavior.

- [ ] **Step 2: Write failing Advanced review tests**

Assert filters for Reordered, Combined, Enhanced, Added, and Needs attention; source/result mapping; approve/reject controls; Restore source beat; revalidation status; and no color-only meaning.

- [ ] **Step 3: Run component tests and verify RED**

```bash
npm run test -- --run src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx
```

- [ ] **Step 4: Implement shared summary plus workflow-specific detail**

Simple renders summary first and keeps detailed mapping behind **Review details**. Advanced renders `WriterOutlineTreatmentChangeList` expanded and exposes per-entry decisions.

- [ ] **Step 5: Implement loading, invalid, empty, error, and locked states**

All state messages use `role="status"` or `role="alert"`. Cancel remains available during non-saving failures. Busy promotion prevents duplicate actions and Escape.

- [ ] **Step 6: Run Pass 3 smoke test**

```bash
npm run test -- --run src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts
npx tsc -b --pretty false
npm run lint -- --quiet
```

- [ ] **Step 7: Commit Pass 3**

```bash
git add src/portals/writer/WriterPortal.tsx src/portals/writer/WriterOutlineTreatmentReview.tsx src/portals/writer/WriterOutlineTreatmentChangeList.tsx src/portals/writer/writerOutlineAlternates.ts src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts src/portals/writer/__tests__/writerOutlineAlternates.test.ts
git commit -m "feat: enforce outline treatment review"
```

**Pass 3 smoke test:** Generate all three modes from the same populated fixture. Simple must summarize only contract-valid changes. Advanced must reject one combination and one addition, restore source material, revalidate, and leave the official version unchanged until Make official.

**Rollback:** Restore the previous client generation path and keep the new Edge mode dormant; no schema migration is involved.

## Pass 4: Mutation regression, live QA, and release

**Objective:** Prove the complete populated-data workflow through persistence and reload, then publish client and Edge together.

**Acceptance criteria:** Focused/full tests, lint, build, mutation/reload browser QA, final ReAct/QA/UI audits, walkthrough, commit/push, Supabase deploy, Cloudflare deploy, and live verification all pass.

### Task 7: Add the populated mutation regression fixture

**Files:**
- Create: `src/portals/writer/__tests__/fixtures/outlineTreatmentSource.ts`
- Modify: `src/portals/writer/__tests__/writerOutlineTreatmentContracts.test.ts`
- Modify: `src/portals/writer/__tests__/writerOutlineTreatmentValidation.test.ts`
- Modify: `src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts`
- Modify: `src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx`
- Modify: `src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx`

- [ ] **Step 1: Define one shared 26-page fixture**

Include named characters, causal dependencies, a missing Page 26 label with sequential beats intact, sparse/dense pages, combinable beats, and a protected final outcome.

- [ ] **Step 2: Run all three modes against the same fixture**

Assert materially different allowed results and complete source coverage.

- [ ] **Step 3: Add persistence/reload/Undo regression**

Start with an existing official version, promote a validated treatment, reload stored rows, assert manifest and outline, Undo, reload, and assert exact prior restoration.

- [ ] **Step 4: Run focused mutation regression**

```bash
npm run test -- --run src/portals/writer/__tests__/writerOutlineTreatmentContracts.test.ts src/portals/writer/__tests__/writerOutlineTreatmentValidation.test.ts src/portals/writer/__tests__/writerOutlineTreatmentIntegration.test.ts src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx src/portals/writer/__tests__/WriterOutlineTreatmentChangeList.test.tsx
```

### Task 8: Consolidated regression and audits

- [ ] **Step 1: Run the release gate once**

```bash
npm run test -- --run --exclude '.worktrees/**'
npm run lint -- --quiet
npm run build
git diff --check
```

Expected: all commands pass; record exact counts.

- [ ] **Step 2: Run signed-in local browser QA**

Using uniquely named disposable data:

1. Create/select a populated issue.
2. Save the 26-page fixture and reload.
3. Generate Keep My Order; confirm identical beat/order/page structure.
4. Generate Organize and Polish; confirm complete mapping and range.
5. Generate Expand Creatively; confirm mapped additions/enhancements and range.
6. In Advanced, reject a combination and addition.
7. Promote, reload, verify stored outline and manifest.
8. Undo, reload, verify exact restoration.
9. Check desktop and 390px layouts, keyboard operation, status/error announcements, and console/network errors.
10. Clean up the disposable series.

- [ ] **Step 3: Perform final ReAct audit**

Verify every user action has observable feedback; validation uses current session state; retry preserves the selected contract; no hidden mutation occurs before promotion; and reload observations match persisted state.

- [ ] **Step 4: Perform final QA audit**

Trace every acceptance criterion to evidence. Separately record rendering, request, validation, promotion, persistence-after-reload, and Undo-after-reload.

- [ ] **Step 5: Perform final UI/UX audit**

Check treatment distinction, contract discoverability, summary comprehension, Advanced decision ergonomics, focus order, responsive layout, disabled/error/loading states, and non-color cues.

- [ ] **Step 6: Complete DOX and walkthrough**

Update the closest owning documentation only if contracts or file ownership changed. Append actual files, test counts, browser evidence, cleanup, deployment versions, risks, and rollback identifiers to `walkthrough.md`.

### Task 9: Deploy and verify production

- [ ] **Step 1: Commit and push the verified implementation**

```bash
git add AGENTS.md \
  src/portals/writer/WriterOutlineTreatmentChangeList.tsx \
  src/portals/writer/WriterOutlineTreatmentReview.tsx \
  src/portals/writer/WriterPortal.tsx \
  src/portals/writer/writerOutlineAlternates.ts \
  src/portals/writer/writerOutlineTreatmentContracts.ts \
  src/portals/writer/writerOutlineTreatmentValidation.ts \
  src/portals/writer/__tests__ \
  src/shared/writer/schemas.ts \
  src/shared/writer/types.ts \
  src/shared/writer/__tests__/schemas.test.ts \
  supabase/functions/_shared/writerSchemas.ts \
  supabase/functions/writer-tools/index.ts \
  supabase/functions/writer-tools/outlineTreatmentPrompt.ts \
  supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts \
  docs/superpowers/plans/2026-07-23-writer-ai-treatment-contracts-implementation.md \
  walkthrough.md
git commit -m "feat: enforce writer AI treatment contracts"
git push origin main
```

Omit any listed path that remained unchanged.

- [ ] **Step 2: Record current deployment versions**

```bash
supabase functions list
npx wrangler deployments list
```

- [ ] **Step 3: Deploy Edge first**

```bash
supabase functions deploy writer-tools
```

Confirm the linked project ID and active version.

- [ ] **Step 4: Run authenticated Edge preview smoke**

Generate each treatment against disposable populated data. Confirm valid response schemas and zero official-version creation before promotion.

- [ ] **Step 5: Deploy Cloudflare**

```bash
npm run deploy
```

- [ ] **Step 6: Run production mutation smoke**

Repeat one populated Organize and Polish flow: preview, mapping check, promotion, reload verification, Undo, reload verification, and cleanup. Confirm console/network health.

- [ ] **Step 7: Record final release result**

Update this plan and `walkthrough.md` with commit SHA, Supabase function version, Cloudflare version, live URL, test counts, browser evidence, cleanup result, and any blocked layer.

**Pass 4 smoke test:** Production promotion and Undo must both survive reload with exact source-beat coverage. A rendered page or HTTP 200 alone is not completion evidence.

**Rollback:** Roll Cloudflare back to the recorded prior Worker version and redeploy the recorded prior `writer-tools` function. Restore the preceding outline as a new version rather than deleting history.

## Closeout conditions

The plan is complete only when:

- all four passes and the midpoint audit are checked off;
- all focused and full automated gates pass;
- the three modes produce materially different, contract-valid transformations;
- signed-in local and production mutation/reload/Undo checks pass;
- disposable data is cleaned up or its recoverable-trash location is reported;
- DOX and walkthrough records are current;
- commits are pushed;
- Supabase and Cloudflare deployment versions are confirmed live.
