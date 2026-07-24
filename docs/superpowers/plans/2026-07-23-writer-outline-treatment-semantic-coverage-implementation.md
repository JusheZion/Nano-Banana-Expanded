# Writer Outline Treatment Semantic Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every AI treatment prove whole-outline review, reject meaningless edits, and produce mode-specific results that match the promises shown to writers.

**Architecture:** Keep the immutable source-plus-patches architecture, but add a compact deterministic section-review contract to the same Gemini response. The Edge Function derives expected page bands, validates that every band was reviewed, links operations to those assessments, and rejects exact/cosmetic no-op edits. The Simple review shows section assessments before proposed edits so unchanged sections are explained rather than silently treated as perfect.

**Tech Stack:** TypeScript, Zod, React, Tailwind CSS, Vitest, Testing Library, Supabase Edge Functions, Gemini JSON responses.

---

## Risk and dependency check

- Preserve the current exact-once source traceability and page-range safeguards.
- Do not require arbitrary changes merely to satisfy a quota; an unchanged section is valid only with an explicit assessment.
- Keep the response compact enough for the hosted Edge limit by using at most ten deterministic page bands rather than one review record per beat.
- Treat model assessments as display text only; the deterministic application remains authoritative.
- Roll back only `writer-tools` if the new response contract fails live; no database migration is required.

## File structure

| File | Responsibility |
|---|---|
| `supabase/functions/writer-tools/outlineTreatmentCoverage.ts` | Derive expected bands and validate whole-outline review/operation linkage. |
| `supabase/functions/writer-tools/outlineTreatmentCoverage.test.ts` | Prove opening-to-ending coverage and mode-specific review rules. |
| `supabase/functions/_shared/writerSchemas.ts` | Parse compact section reviews and overall treatment assessment. |
| `supabase/functions/writer-tools/outlineTreatmentPrompt.ts` | Require every deterministic band to be assessed under the selected mode. |
| `supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts` | Lock whole-outline and mode-specific prompt language. |
| `supabase/functions/writer-tools/outlineTreatmentPatch.ts` | Reject exact/cosmetic no-op edit operations. |
| `supabase/functions/writer-tools/outlineTreatmentPatch.test.ts` | Reproduce identical and punctuation-only proposals. |
| `supabase/functions/writer-tools/index.ts` | Validate semantic coverage before deterministic patch application. |
| `src/shared/writer/schemas.ts` | Parse the section-review payload on the client. |
| `src/portals/writer/writerOutlineTreatmentValidation.ts` | Define client section-review types. |
| `src/portals/writer/writerOutlineTreatmentIntegration.ts` | Map Edge section reviews into the proposal session. |
| `src/portals/writer/WriterOutlineTreatmentReadableReview.tsx` | Present whole-outline assessments and explain unchanged sections. |
| Focused `*.test.ts(x)` files | Verify all three modes and beginner-readable review behavior. |
| `AGENTS.md`, `walkthrough.md` | Preserve the durable semantic QA contract and release evidence. |

## Pass 1: Universal meaningful-change guard

**Objective:** Prevent all three treatment modes from presenting identical or cosmetic rewrites as AI improvements.

**Acceptance criteria:**

- Exact, whitespace-only, punctuation-only, and case-only summary edits are rejected.
- The original beat remains untouched.
- The rejection is labeled `no_material_change`.
- A genuinely different but source-continuous edit remains accepted.

**Rollback/fallback:** Revert only the equivalence guard if it rejects a proven meaningful change; keep the existing continuity protection.

- [x] Add failing tests to `outlineTreatmentPatch.test.ts`:

```ts
it.each([
  'The elder opens the gathering.',
  '  The elder opens the gathering.  ',
  'THE ELDER OPENS THE GATHERING!',
])('rejects a cosmetic no-op edit: %s', (summary) => {
  const input = makeInput(1);
  input.sourceBeats[0]!.text = 'The elder opens the gathering.';
  const result = applyOutlineTreatmentPatches({
    operations: [{
      operation_id: 'edit-1',
      operation: 'edit',
      source_beat_ids: [input.sourceBeats[0]!.id],
      summary,
    }],
  }, input);
  expect(result.operation_notices[0]).toMatchObject({
    status: 'rejected',
    code: 'no_material_change',
  });
  expect(result.proposal.page_beats?.[0]?.summary).toBe(input.sourceBeats[0]!.text);
});
```

- [x] Run the focused test and confirm it fails because no-op edits are currently accepted:

```bash
npm run test -- --run supabase/functions/writer-tools/outlineTreatmentPatch.test.ts --exclude '.worktrees/**'
```

- [x] Add deterministic comparison:

```ts
export function normalizeTreatmentComparison(value: string): string {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}']+/gu)?.join(' ') ?? '';
}
```

- [x] Reject an edit when its proposed summary normalizes to the source text, using code `no_material_change` and a plain-language retained message.

- [x] Run the focused patch test and record file/test counts.

### Pass 1 smoke test

```bash
npm run test -- --run supabase/functions/writer-tools/outlineTreatmentPatch.test.ts --exclude '.worktrees/**'
```

## Pass 2: Whole-outline section-review contract

**Objective:** Require evidence that every outline section was evaluated under the selected mode.

**Acceptance criteria:**

- The application derives contiguous bands covering ordinal 1 through the final source beat.
- Every expected band appears exactly once in the model response.
- Every operation belongs to one section review and every referenced operation exists.
- Unchanged sections include a substantive assessment and explicit `no_change` recommendation.
- Mode instructions differ for language, structure/pacing, and creative-expansion assessment.
- Ending-only or opening-only review responses fail before patch application.

**Rollback/fallback:** If the live model cannot satisfy the compact band contract, leave the previous function version active and retain the Pass 1 no-op guard locally until the prompt is corrected.

- [x] Create `outlineTreatmentCoverage.test.ts` with failing tests for:
  - a 70-beat outline deriving seven 10-page bands;
  - missing first/middle/final bands;
  - duplicate/overlapping bands;
  - unknown or multiply-linked operation IDs;
  - empty/generic assessments;
  - valid no-change explanations;
  - all three treatment modes.

- [x] Create the coverage API:

```ts
export type TreatmentReviewBand = {
  start_ordinal: number;
  end_ordinal: number;
  assessment: string;
  recommendation: 'no_change' | 'language' | 'structure' | 'expand';
  operation_ids: string[];
};

export function deriveTreatmentReviewBands(sourceBeatCount: number): Array<{
  startOrdinal: number;
  endOrdinal: number;
}>;

export function getTreatmentCoverageErrors(
  result: { operations: Array<{ operation_id: string }>; section_reviews: TreatmentReviewBand[] },
  input: OutlineTreatmentPromptInput,
): string[];
```

- [x] Derive no more than ten contiguous bands:

```ts
const bandSize = Math.max(1, Math.ceil(sourceBeatCount / 10));
```

- [x] Extend the Edge schema:

```ts
section_reviews: z.array(z.object({
  start_ordinal: z.number().int().min(1).max(200),
  end_ordinal: z.number().int().min(1).max(200),
  assessment: z.string().min(20).max(1200),
  recommendation: z.enum(['no_change', 'language', 'structure', 'expand']),
  operation_ids: z.array(z.string().min(1).max(160)).max(250),
}).strict()).min(1).max(10),
overall_assessment: z.string().min(40).max(2400),
```

- [x] Change the prompt from “omit unchanged beats” alone to:

```ts
`Review every supplied section range: ${JSON.stringify(expectedBands)}.`,
'Return one section_reviews record for every range, in range order.',
'A no_change recommendation must explain why the section already satisfies this treatment mode.',
'Every operation_id must appear in exactly one section review.',
```

- [x] Add mode-specific criteria:
  - preserve: grammar, clarity, consistency, formatting;
  - structure: pacing, density, sequence, transitions, page distribution;
  - expand: emotional development, escalation, connective scenes, creative opportunities.

- [x] Validate coverage before `applyOutlineTreatmentPatches` and return a plain semantic-coverage 422 when incomplete.

- [x] Run:

```bash
npm run test -- --run \
  supabase/functions/writer-tools/outlineTreatmentCoverage.test.ts \
  supabase/functions/writer-tools/outlineTreatmentPrompt.test.ts \
  supabase/functions/writer-tools/outlineTreatmentPatch.test.ts \
  --exclude '.worktrees/**'
```

### Pass 2 smoke test

- [x] Confirm opening, middle, and ending omissions fail and a complete 70-page review passes.

## Pass 3: Readable assessments, release gate, and production proof

**Objective:** Show writers what the AI evaluated and prove the three modes behave differently in production.

**Acceptance criteria:**

- Simple Workflow shows an overall assessment plus each section range in chronological order.
- Every section says what was evaluated and whether changes were proposed.
- No-op proposals never appear as accepted changes.
- Advanced Tools retains raw technical mappings behind disclosure.
- Production QA uses one representative outline per mode and inspects semantic usefulness, not only successful response status.

**Rollback/fallback:** Do not promote the paired release if any mode returns ending-only coverage, no-op edits, or indistinguishable mode behavior.

- [x] Add the client schema/types/integration mapping for `section_reviews` and `overall_assessment`.

- [x] Add failing readable-review tests asserting:
  - ranges appear from opening through ending;
  - `no_change` sections include their explanation;
  - assessment copy contains no opaque IDs;
  - Organize and Polish labels structure criteria;
  - changed page navigation remains intact.

- [x] Render:

```tsx
<section aria-labelledby="outline-assessment-heading">
  <h3 id="outline-assessment-heading">Whole-outline assessment</h3>
  <p>{session.overallAssessment}</p>
  {session.sectionReviews.map((review) => (
    <article key={`${review.startOrdinal}-${review.endOrdinal}`}>
      <h4>Pages {review.startOrdinal}–{review.endOrdinal}</h4>
      <p>{review.assessment}</p>
      <span>{review.recommendation === 'no_change' ? 'No change recommended' : 'Changes proposed'}</span>
    </article>
  ))}
</section>
```

- [x] Run the focused client/Edge regression once, targeted lint once, and production build once.

- [x] Deploy paired Supabase/frontend changes only after the consolidated gate passes.

- [x] In the persistent signed-in QA account, run all three modes against the same representative long outline and verify:
  - every section range is present;
  - Keep My Order proposes only meaningful language changes;
  - Organize and Polish contains structural assessment and is not a copyedit-only masquerade;
  - Expand Creatively identifies bounded creative opportunities;
  - no identical proposals appear;
  - each preview is canceled and official content remains unchanged.

### Pass 3 smoke test

- [x] Record test-file/test counts, versions, per-mode assessment/operation summaries, cancellation evidence, and any Yellow limitations.

## Final audit

- [x] ReAct: confirm every implementation step follows reproduced evidence.
- [x] QA: confirm preservation, coverage, meaningful difference, mode distinction, and recovery.
- [x] UI/UX: confirm chronological beginner-readable assessments, keyboard access, contrast, and no overlap.
- [x] DOX: add the durable semantic-coverage contract to the nearest owning `AGENTS.md`.
- [x] Walkthrough: record exact implementation and production evidence.

## Execution results

- Pass 1: the no-op regression failed before implementation, then 1 file and 13 tests passed.
- Pass 2: deterministic 70-beat range coverage, operation linkage, mode permissions, and client mapping passed in a 5-file, 53-test smoke.
- Pass 3: 7 focused files and 93 tests passed; the consolidated gate passed 122 files and 773 tests, lint, and the production build.
- Production: Supabase `writer-tools` and Cloudflare version `570c6e16-fb3d-4fea-8f37-8e47535979b3` deployed successfully.
- Live Keep My Order: seven ranges covered pages 1–70 and all 70 beats received meaningful language-only edits.
- Live Organize and Polish: seven structural assessments covered pages 1–70; six out-of-range combinations were rejected, while a bounded 70-to-65-page restructure retained all 70 source beats.
- Live Expand Creatively: seven creative assessments covered pages 1–70, with changes spanning the opening through ending; all 70 source beats remained traceable.
- All three previews were canceled; the official outline remained `Saved · v1`; production console warnings/errors were 0.
