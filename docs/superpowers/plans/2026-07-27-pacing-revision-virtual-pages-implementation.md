# Pacing Revision Virtual Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully preview pacing-recommended future pages before Apply, create and verify them atomically on Apply, and make the review UI report the actual remaining/ready/applied state.

**Architecture:** Represent future pages as Revision Set child changes with `page_id: null`, a real `page_number`, and `virtual-page:<number>` target keys. Extend the authenticated one-page Edge preview contract to validate virtual targets against the proposed outline, then extend the client apply transaction to create exact page rows, map candidates, read back the persisted result, and complete the set only after verification.

**Tech Stack:** React 19, TypeScript, Zod, Supabase/Postgres/Edge Functions, Vitest, Testing Library, Tailwind CSS, Vite

---

## Risk and dependency check

- **Primary integrity risk:** reporting a Revision Set applied before its target page count and child content are persisted. Completion must be downstream of read-back verification.
- **Hosted contract risk:** virtual requests must not allow arbitrary future-page generation. The Edge Function must derive target identity and validate issue ownership, page occupancy, Revision Item ownership, and exact proposed-outline coverage.
- **Compensation risk:** page cleanup must use exact newly created IDs, never “all pages after N.”
- **Concurrency risk:** creation can collide with a concurrent page insert. Preflight and the existing `(issue_id, page_number)` uniqueness constraint must fail safely, followed by exact compensation.
- **AI boundary risk:** the saved outline proposal must actually reach the Pacing Review target. Schema-valid but semantically incomplete proposals are rejected before virtual children are queued.
- **Release dependencies:** callable Supabase CLI/auth for the Edge Function deploy, authenticated app QA data, a local host registered through project conventions, and network access for live smoke.
- **Rollback:** if hosted virtual preview cannot ship, keep expansion sets unapplied with an explicit unsupported-expansion error. Do not pre-create placeholder pages or restore false-success completion.
- **No migration expected:** nullable `writer_pacing_revision_changes.page_id`, positive `page_number`, and `(item_id, layer, target_key)` uniqueness already support virtual children.

## File map

- Modify `src/shared/writer/schemas.ts`: physical/virtual page-preview request validation.
- Modify `src/shared/writer/types.ts`: request payload type.
- Modify `supabase/functions/_shared/writerSchemas.ts`: mirrored hosted request contract.
- Modify `src/shared/writer/pacingRevisionSchemas.ts`: typed apply snapshot if shared parsing is introduced.
- Modify `src/portals/writer/useWriterPacingRevisionSet.ts`: queue all affected page numbers and send nullable IDs.
- Modify `supabase/functions/writer-tools/pacingRevisionPageTarget.ts`: pure physical/virtual target resolution helpers.
- Modify `supabase/functions/writer-tools/index.ts`: target validation, virtual prompt page, persistence, and target-page outline enforcement.
- Modify `supabase/functions/writer-tools/pacingRevisionPrompt.ts`: pacing target prompt/validation support.
- Modify `src/portals/writer/writerPacingRevisionApply.ts`: virtual-unit preflight, exact row creation/mapping, compensation, snapshot, and undo.
- Create `src/portals/writer/writerPacingRevisionApplyVerification.ts`: pure persisted-result verification.
- Modify `src/portals/writer/WriterPortal.tsx`: create/delete/read-back orchestration, verified completion, navigation destinations, and undo.
- Modify `src/shared/api/writerPacingRevisionSets.ts`: guarded applying/completion status transitions if required by current persistence behavior.
- Modify `src/portals/writer/writerPacingRevisionModel.ts`: fail-closed blockers and per-layer status summaries.
- Modify `src/portals/writer/WriterPacingRevisionWorkspace.tsx`: dynamic status, applied language, context strip, and page navigation.
- Modify focused tests adjacent to every file above.
- Modify `AGENTS.md`: record the durable fully-previewed/verified-apply contract.
- Modify `walkthrough.md`: append actual implementation, verification, deploy, and release evidence.
- Modify this plan after each pass: check completed work and record smoke/audit results.

## Pass 1: Physical and virtual preview request contracts

**Objective:** Make a future page a valid, explicit request target without weakening existing-page validation.

**Acceptance criteria:**

- Physical requests require matching `page_id` and `page_number`.
- Virtual requests require `page_id: null` and a bounded `page_number`.
- Exactly one child layer remains mandatory.
- API invocation retains the 90-second client timeout.

- [x] **Step 1: Add RED schema and API tests**

Add physical and virtual fixtures to `src/shared/writer/__tests__/schemas.test.ts` and `src/shared/api/__tests__/writerTools.test.ts`:

```ts
const virtualRequest = {
  mode: 'pacing_revision_page_preview' as const,
  revision_set_id: crypto.randomUUID(),
  page_id: null,
  page_number: 72,
  include_beats: true,
  include_dialogue: false,
};
expect(writerToolsRequestSchema.safeParse(virtualRequest).success).toBe(true);
expect(writerToolsRequestSchema.safeParse({ ...virtualRequest, page_number: 0 }).success).toBe(false);
expect(writerToolsRequestSchema.safeParse({
  ...virtualRequest,
  include_dialogue: true,
}).success).toBe(false);
```

- [x] **Step 2: Run focused tests and confirm failure**

Run:

```bash
npx vitest run src/shared/writer/__tests__/schemas.test.ts src/shared/api/__tests__/writerTools.test.ts
```

Expected: FAIL because `page_number` is rejected and `page_id` cannot be null.

- [x] **Step 3: Update mirrored contracts**

Use the same strict shape in `src/shared/writer/schemas.ts` and `supabase/functions/_shared/writerSchemas.ts`:

```ts
export const writerToolsPacingRevisionPagePreviewRequestSchema = z.object({
  mode: z.literal('pacing_revision_page_preview'),
  revision_set_id: z.string().uuid(),
  page_id: z.string().uuid().nullable(),
  page_number: z.number().int().min(1).max(200),
  include_beats: z.boolean(),
  include_dialogue: z.boolean(),
}).strict().refine((request) => request.include_beats !== request.include_dialogue, {
  message: 'Exactly one Pacing Revision child layer must be requested.',
});
```

Update `WriterToolsPacingRevisionPagePreviewPayload` to match.

- [x] **Step 4: Run Pass 1 smoke**

Run the two schema/API test files. Expected: both files pass.

- [x] **Step 5: Commit Pass 1**

```bash
git add src/shared/writer/schemas.ts src/shared/writer/types.ts supabase/functions/_shared/writerSchemas.ts src/shared/writer/__tests__/schemas.test.ts src/shared/api/__tests__/writerTools.test.ts docs/superpowers/plans/2026-07-27-pacing-revision-virtual-pages-implementation.md
git commit -m "feat: define virtual pacing page requests"
```

**Pass 1 smoke test:** Request schema/API tests only.

**Pass 1 result:** Complete after quality follow-up. Initial RED failed because the strict schema did not accept `page_number`; follow-up RED then proved the physical client queue omitted the now-required number. GREEN passed the schema, API, and queue files (56 tests), and `npm run build` passed. Client and Edge schemas accept UUID-backed physical targets and null-ID virtual targets with required integer page numbers from 1 through 200, still reject equal include flags, and a source-parity regression test now catches mirror drift. API coverage confirms the 90-second timeout for both target kinds, and physical queue requests send their matching page number.

## Pass 2: Outline target enforcement and virtual hosted preview

**Objective:** Permit one preview-only future page only when the saved proposed outline and Revision Item authorize it.

**Acceptance criteria:**

- The outline proposal reaches the saved pacing target before child generation begins.
- Existing ID/number mismatches are rejected.
- A virtual page must be unoccupied, above the physical maximum, item-owned, and present in the proposed outline.
- Virtual candidates persist with `page_id: null`, stable target keys, null current values, and normal dependency relationships.
- Preview never inserts a live page.

- [x] **Step 1: Add RED outline-target and target-resolution tests**

Create `supabase/functions/writer-tools/pacingRevisionPageTarget.test.ts` with pure cases:

```ts
expect(resolvePacingRevisionPageTarget({
  requestedPageId: null,
  requestedPageNumber: 72,
  physicalPages: [{ id: page71Id, page_number: 71 }],
  proposedPageNumbers: new Set([72]),
})).toEqual({
  kind: 'virtual',
  pageId: null,
  pageNumber: 72,
  targetKey: 'virtual-page:72',
});
```

Also prove mismatched physical identity, occupied null-ID targets, in-range virtual targets, gaps, and absent proposed beats fail. Extend `pacingRevisionPrompt.test.ts` for 71→85 exact target acceptance and underfilled proposal rejection.

- [x] **Step 2: Run focused server tests and confirm failure**

Run:

```bash
npx vitest run supabase/functions/writer-tools/pacingRevisionPageTarget.test.ts supabase/functions/writer-tools/pacingRevisionPrompt.test.ts supabase/functions/writer-tools/pacingRevisionPageCandidate.test.ts
```

Expected: FAIL because the resolver and target enforcement do not exist.

- [x] **Step 3: Implement pure target resolution**

Create `pacingRevisionPageTarget.ts` with a fail-closed result:

```ts
export type PacingRevisionPageTarget =
  | { kind: 'physical'; pageId: string; pageNumber: number; targetKey: string }
  | { kind: 'virtual'; pageId: null; pageNumber: number; targetKey: string };

export function resolvePacingRevisionPageTarget(input: {
  requestedPageId: string | null;
  requestedPageNumber: number;
  physicalPages: Array<{ id: string; page_number: number }>;
  proposedPageNumbers: Set<number>;
}): PacingRevisionPageTarget {
  // Cross-check a physical ID/number or validate an unoccupied,
  // contiguous future number present in the proposed outline.
}
```

Return server-owned `page:<uuid>` / `virtual-page:<number>` keys only.

- [x] **Step 4: Enforce the Pacing Review target**

In the outline-preview branch, derive the deterministic target from `length_alignment.recommended_pages`, clamp 1–200, make the allowed range include that expansion target, and reject a built proposal that does not contain sequential page beats through the target.

- [x] **Step 5: Extend the hosted page-preview branch**

Load issue pages, resolve the target, synthesize an ephemeral UUID prompt page for virtual targets, and persist:

```ts
{
  target_key: target.targetKey,
  page_id: target.pageId,
  page_number: target.pageNumber,
  current_value: target.kind === 'virtual' ? null : liveValue,
}
```

Validate model echo against the ephemeral ID/page number, but never persist the ephemeral ID. Dialogue must still require the effective Beats child candidate.

- [x] **Step 6: Run Pass 2 smoke**

Run the three server test files plus persistence tests. Expected: all pass and source inspection proves no `writer_pages` insert occurs in preview.

- [x] **Step 7: Commit Pass 2**

```bash
git add supabase/functions/writer-tools src/shared/writer docs/superpowers/plans/2026-07-27-pacing-revision-virtual-pages-implementation.md
git commit -m "feat: preview virtual pacing pages"
```

**Pass 2 smoke test:** Hosted target, prompt, candidate, and persistence tests only.

**Pass 2 result:** Complete in commit `feat: preview virtual pacing pages`. RED coverage proved the resolver, expansion-target enforcement, virtual prompt identity, server wiring, and persistence projection were absent; follow-up RED coverage caught in-range null-ID targets and a pacing-specific lower bound that still allowed page deletion. GREEN passed 4 focused server files / 37 tests. The pure modules passed a targeted TypeScript check, focused ESLint completed with 0 errors and 3 pre-existing explicit-`any` warnings, and source inspection confirms the preview branch only reads `writer_pages` and never inserts, upserts, or updates a live page. Exact and range recommendations reuse the established deterministic selection semantics, clamp at 200, ignore contraction, and require sequential proposal coverage through the expansion target. Physical targets require exact issue ID/number identity; virtual targets require null ID, an unoccupied number beyond the physical maximum, contiguous proposed-outline coverage, Revision Item ownership, and a server-derived `virtual-page:<number>` key. Virtual model prompts use an ephemeral UUID, while persisted candidates retain `page_id: null`, the real page number, null current values, normal Outline/Beats dependencies, one-layer locking/retry behavior, and no live page mutation.

**Pass 2 specification-review correction:** Complete in commit `fix: harden virtual pacing preview authorization`. Review found that model-declared item pages could authorize a future page without an accepted deterministic Outline change and that handler coverage relied too heavily on source substrings. Follow-up RED tests reproduced both gaps. Persisted item/page ownership now derives only from accepted Outline child changes; virtual Beats require non-empty exact-page Outline dependencies, and virtual Dialogue rejects effective Beats that do not carry that dependency. The Edge handler now executes a tested hosted-preview flow covering null request IDs, item ownership, ephemeral model identity, effective edited Beats, model echo validation, null virtual persistence, physical compatibility, and an unchanged live-page collection. The corrected focused gate passes 5 files / 45 tests; targeted TypeScript passes, focused ESLint reports 0 errors and the same 3 pre-existing explicit-`any` warnings, and root DOX now records the fully-previewed virtual-page and verified-Apply contract.

**Pass 2 affected-page re-review correction:** Complete in commit `fix: derive shifted pacing revision pages`. Re-review found that using only each accepted change's `proposed_page` underreported structural ownership. Follow-up RED tests proved that a page 2→4 move omitted pages 2–3, a combine omitted every shifted later page, and a mid-outline add omitted shifted/future pages. Ownership now compares deterministic source-page occupants with final manifest occupants, excludes assignments that remain truly unchanged, and intersects the changed-page set with each accepted operation's precise impact range: one page for edits, source-to-destination for moves, and the shifted tail for combines/adds. Executable coverage preserves one-page edit ownership and contiguous append-only pages 72–85. The corrected Pass 2 gate passes 5 files / 50 tests, targeted TypeScript and focused lint pass, and model-declared page claims remain unused.

**Pass 2 shifted-virtual dependency correction:** Complete in commit `fix: authorize shifted virtual page previews`. A mid-outline insertion can deterministically own a later shifted virtual page even though its accepted Outline child records the insertion result page rather than that later page. Hosted authorization now begins with persisted deterministic item ownership and attaches all ready/applied, non-rejected Outline changes on that owning item, so virtual Beats receive non-empty provenance without trusting model page claims. An executable page-3 insertion → virtual-page-5 flow verifies null live identity and the accepted insertion dependency. The corrected focused gate passes 5 files / 51 tests, targeted TypeScript and focused lint pass.

**Pass 2 deterministic item-grouping correction:** Complete in commit `fix: merge pacing items by deterministic pages`. Model-declared `affected_page_numbers` are no longer used to merge original Revision Items before deterministic validation. Accepted impact pages are derived per original item first; only those backed page sets may merge, after which operations and Outline children are remapped to the surviving item while preserving their original title/rationale composition. Executable regressions prove two accepted edits with the same false model page claim but deterministic pages 1 and 4 remain separate, while a deterministic move/edit overlap still merges titles, rationales, operations, and Outline children correctly. The corrected focused gate passes 5 files / 53 tests, targeted TypeScript and focused lint pass.

## Pass 3: Mixed physical/virtual client queue

**Objective:** Generate Beats then Dialogue for every affected physical or virtual page while preserving failure continuation and checkpoints.

**Acceptance criteria:**

- Future affected pages are not filtered out.
- Physical requests send UUID + number; virtual requests send null + number.
- Mixed pages stay numerically ordered.
- Dialogue automatically queues after/restores Beats.
- Isolated failure and failed-only retry behavior remains intact.

- [x] **Step 1: Add RED hook/queue tests**

Extend `useWriterPacingRevisionSet.test.tsx` with a set affecting physical page 71 and virtual pages 72–73. Assert invocations:

```ts
expect(mocks.invoke).toHaveBeenNthCalledWith(2, {
  mode: 'pacing_revision_page_preview',
  revision_set_id: set.id,
  page_id: null,
  page_number: 72,
  include_beats: true,
  include_dialogue: false,
});
```

Then assert Dialogue follows, virtual resume skips ready Beats, failed-only retry does not regenerate successful pages, and the old “not available” error is absent.

- [x] **Step 2: Run hook/queue tests and confirm failure**

Run:

```bash
npx vitest run src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx src/portals/writer/__tests__/writerPacingRevisionQueue.test.ts
```

Expected: FAIL because virtual page numbers are filtered by `pagesRef`.

- [x] **Step 3: Queue all affected page numbers**

Replace the runnable-page physical filter with sorted requested page numbers and invoke:

```ts
const physicalPage = pageByNumber.get(pageNumber);
await invokeWriterTools({
  mode: 'pacing_revision_page_preview',
  revision_set_id: set.id,
  page_id: physicalPage?.id ?? null,
  page_number: pageNumber,
  include_beats: layer === 'beats',
  include_dialogue: layer === 'dialogue',
});
```

Keep the existing sequential layer loop and five-page checkpoint callback.

- [x] **Step 4: Run Pass 3 smoke**

Run hook and queue test files. Expected: both pass.

- [x] **Step 5: Audit after three passes**

Audit schema mirrors, one-page invocation, server-derived target keys, proposed-outline authorization, queue ordering, isolated-failure continuation, and no live write during preview. Record findings in this plan before proceeding.

- [x] **Step 6: Commit Pass 3**

```bash
git add src/portals/writer/useWriterPacingRevisionSet.ts src/portals/writer/__tests__/useWriterPacingRevisionSet.test.tsx docs/superpowers/plans/2026-07-27-pacing-revision-virtual-pages-implementation.md
git commit -m "feat: queue virtual pacing previews"
```

**Pass 3 smoke test:** Hook and queue tests only.

**Pass 3 result:** PASS — RED reproduced the physical-row filter across mixed generation, virtual resume, and layer-specific virtual retry. The client now sorts every requested affected page number, sends the physical UUID when a row exists and `null` otherwise, and preserves the existing per-page Beats-then-Dialogue loop. Virtual resume skips ready Beats, failed-only retry does not regenerate successful pages, and the obsolete unavailable-page error is removed. The focused smoke passes 2 files / 13 tests.

**Three-pass audit result:** PASS — the shared payload type and Zod request schema both require `page_id: string | null`, `page_number`, and exactly one selected child layer. The hosted resolver verifies physical ID/number ownership or derives a `virtual-page:<number>` target only for an unoccupied, contiguous proposed-outline page owned by a persisted Revision Item. The preview flow requires applicable accepted Outline provenance for virtual Beats and a ready, provenance-backed Beats candidate before virtual Dialogue. Both client and server retain one layer per invocation; the queue sorts and deduplicates page numbers, continues after isolated failures, checkpoints after at most five attempts, and stops only between pages. Source inspection and the existing preview-branch regression confirm `writer_pages` is read-only during preview; only Revision Set change/progress records are written. No schema drift, authorization bypass, queue regression, or preview live-write path was found. Root DOX remains current because this pass implements its existing virtual-preview contract without changing durable responsibilities or workflow rules.

## Pass 4: Atomic virtual-page Apply, verification, and Undo

**Objective:** Create exact future rows only during Apply and prevent completion until persisted page count/content is verified.

**Acceptance criteria:**

- Incomplete virtual units fail before any mutation.
- Pages are created in ascending order and mapped by returned IDs.
- Any failure removes exact created rows and restores prior writes.
- Verification catches missing/duplicate pages and content mismatches.
- Undo deletes exact created rows before reopening the set.

- [x] **Step 1: Add RED apply and verification tests**

Extend `writerPacingRevisionApply.test.ts` for:

- one and two complete virtual pages;
- missing/rejected Dialogue and unresolved Outline dependency;
- page-number collision;
- creation failure and content-write failure compensation;
- existing-only regression;
- undo delete success/failure.

Create `writerPacingRevisionApplyVerification.test.ts` proving correct 71→85 verification and failures for missing page 79, duplicate numbering, wrong created ID, Beats mismatch, and Dialogue mismatch.

- [x] **Step 2: Run apply tests and confirm failure**

Run:

```bash
npx vitest run src/portals/writer/__tests__/writerPacingRevisionApply.test.ts src/portals/writer/__tests__/writerPacingRevisionApplyVerification.test.ts
```

Expected: FAIL because virtual creation, mapping, and verification do not exist.

- [x] **Step 3: Implement apply preflight and snapshot**

Extend `ApplyWriters`:

```ts
createPage: (pageNumber: number) => Promise<{ pageId: string; pageNumber: number }>;
deletePages: (pageIds: string[]) => Promise<void>;
```

Extend `PacingRevisionApplySnapshot` with exact `createdPages`. Validate complete virtual units, contiguous future numbers, collision-free existing page numbers, resolved dependencies, and the built approved outline before the first writer call.

- [x] **Step 4: Implement mutation and reverse compensation**

Write Outline → create rows → Beats → Dialogue. Resolve child targets through `change.page_id ?? createdByPageNumber.get(change.page_number)`. On failure, restore existing content, delete exact created IDs, and roll back the created Outline while preserving the original error.

- [x] **Step 5: Implement pure read-back verification**

`verifyPacingRevisionApply` accepts the target outline, fresh pages, created mapping, and approved changes. It returns success only when the target page-number set and approved candidate values exactly match persisted rows.

- [x] **Step 6: Wire WriterPortal completion and Undo**

Use `createWriterPage` directly, never `ensureWriterPagesToCount`. After apply writes, call `listWriterPages`, run verification, and only then call `completeWriterPacingRevisionSet`. Undo restores prior content and deletes `snapshot.createdPages` by exact IDs; verify deletion before reopening.

- [x] **Step 7: Run Pass 4 smoke**

Run apply, verification, and persistence API tests. Expected: all pass.

- [x] **Step 8: Midpoint QA audit**

Review the changed code for false-success paths, unverified zero-row updates, cleanup ordering, concurrent page collisions, incomplete virtual units, stale/locked targets, and recovery messaging. Fix all P0/P1 findings before proceeding.

- [x] **Step 9: Commit Pass 4**

```bash
git add src/portals/writer/writerPacingRevisionApply.ts src/portals/writer/writerPacingRevisionApplyVerification.ts src/portals/writer/WriterPortal.tsx src/shared/api/writerPacingRevisionSets.ts src/portals/writer/__tests__ src/shared/api/__tests__/writerPacingRevisionSets.test.ts docs/superpowers/plans/2026-07-27-pacing-revision-virtual-pages-implementation.md
git commit -m "fix: verify pacing expansion apply"
```

**Pass 4 smoke test:** Apply, verification, and Revision Set persistence tests only.

**Pass 4 result:** PASS — RED coverage reproduced missing virtual creation/mapping, incomplete and dependency-invalid virtual units, physical/virtual identity collisions, non-sequential targets, creation/content compensation gaps, missing read-back verification, zero-row completion, and Undo deletion failures. Apply now builds and validates the approved outline before mutation; verifies stale fingerprints, locks, dependency identity, physical ID/number identity, sequential target numbering, collision-free contiguous creation, and one complete approved Outline/Beats/Dialogue unit per future page; then writes Outline → exact ascending `createWriterPage` rows → Beats → Dialogue. The snapshot records only prior existing-page content plus exact created IDs/numbers, source/target counts, and applied IDs. `WriterPortal` reads fresh issue pages and verifies the complete number set, exact created mapping, and every approved persisted Beats/Dialogue candidate before completion. Verification or completion failure restores existing content, deletes the exact created rows, rolls back the created outline, verifies created-row absence, and leaves the set unapplied. Undo restores existing state, deletes and verifies exact created-row absence, and only then reopens the set. Existing-only legacy snapshots remain undoable. The focused smoke passes 3 files / 27 tests; the production build passes; focused ESLint reports 0 errors and 3 pre-existing `WriterPortal` warnings.

**Midpoint QA audit result:** PASS after corrections — false-success completion is downstream of fresh read-back; physical and virtual identity checks fail closed; the database completion/reopen helpers verify every requested change ID and the single set row instead of accepting zero-row updates; unique page creation collisions compensate the exact created prefix; cleanup preserves the original apply error while surfacing recovery failures; legacy existing-only Undo does not require a created-page ledger. Mutation order, reverse cleanup, stale/locked target checks, incomplete virtual-unit rejection, and user-visible recovery messages were reviewed with no remaining P0/P1 finding. No migration or Pass 5 UI work was introduced.

**Pass 4 specification-review correction:** PASS — follow-up review found five blocking gaps in the first Pass 4 closeout. `WriterPortal` now reloads the authoritative latest outline and issue pages before fingerprints, identity checks, lock projection, and expected-outline versioning. Preflight rejects any physical page set that is not exactly contiguous from page 1 through its maximum. Apply persists a guarded base snapshot while transitioning an allowed set to `applying` before the first live write, refreshes the snapshot after the outline write and after every successful page creation with exact IDs, and requires `applying` for completion. Apply compensation and Undo independently attempt reverse existing Dialogue/Beats restoration, exact created-page deletion, and outline rollback while collecting every recovery failure. Completion conditionally transitions children and the applying set, verifies child rollback when set completion fails, and Undo uses a checked set-first transition with compensation back to `applied` if child reopening fails. Follow-up focused coverage passes 3 files / 36 tests, including authoritative reload, physical `[1, 3]` rejection before begin/write, snapshot lifecycle ordering, earlier-restore-failure deletion, guarded begin/update/completion, and split-state compensation. Production build passes. Root DOX now records the durable authoritative-reload and guarded applying-snapshot requirements; no migration or Pass 5 UI behavior was added.

**Pass 4 atomicity re-review correction:** PASS — the prior snapshot refresh still left an interruption window between a successful remote insert and its returned ID being persisted, and client-side multi-table completion/Undo could still split state if the process ended between requests. Apply now reloads the persisted Revision Set and issue notes as well as the outline/pages, derives locks from the fresh notes, preassigns the outline UUID and every possible page UUID, and stores the complete cleanup plan before the first insert. Page and outline APIs accept these caller IDs, and exact outline cleanup is idempotent for a preplanned row that was never inserted. Failure and hard-reload continuation orchestration always reload the persisted snapshot before cleanup, clean only a still-`applying` attempt, verify planned pages and outline are absent, and return the set to retryable `ready` with visible recovery detail; incomplete or invalid cleanup remains `applying` with `recovery_required` detail. Migration `20260727000000_writer_pacing_revision_apply_transactions.sql` adds authenticated, owner-scoped, security-invoker PostgreSQL transactions for exact completion and Undo reopen, with status guards, membership checks, exact row counts, and authenticated-only execution. Focused coverage passes 7 files / 53 tests, including persisted-snapshot validation, pre-first-insert interruption cleanup, caller-assigned IDs, idempotent cleanup, recovery transitions, RPC routing, and migration contract assertions. The production build passes. No Pass 5 UI behavior was added.

**Pass 4 final release-blocker correction:** PASS — ambiguous completion failures now reload persisted state before any compensation. A persisted `applied` set is accepted only after fresh page/content verification; only a confirmed `applying` set may compensate; unreadable, unexpected, or applied-but-unverified states surface recovery-required detail and never mutate live data. Destructive recovery snapshot parsing now requires canonical UUIDs for outline/page/change identities, unique IDs and page numbers, unique prior-content targets per layer, integer counts bounded to 0–200, `target >= source`, an exact contiguous planned range from `source + 1` through `target`, count equality, a planned outline for expansion, and unique applied IDs. Corrupt snapshots fail closed before cleanup. Focused coverage passes 7 files / 67 tests and the production build passes.

**Pass 4 integrity-review correction:** PASS — normal Undo now reloads and strictly binds the persisted applied snapshot to the authoritative set, issue, applied changes, prior-content page IDs/numbers, created page IDs/numbers, and latest applied outline before any mutation. Pacing Apply/cleanup/Undo uses result-bearing page reads and exact returning-row checks for Beats, Dialogue, and deletes; read errors and zero-row mutations fail closed. Abort and Undo verify restored existing content plus exact created-page and planned-outline absence before transitioning state. Completion now sends expected latest outline identity/JSON, target count, exact page identities/numbers, and approved candidate values to the owner-scoped RPC; the transaction locks the live page/outline tables and revalidates all expectations before any child/set status mutation, closing the client-readback race. Focused coverage passes 8 files / 75 tests and the production build passes.

**Pass 4 final continuity correction:** PASS — locked completion now proves the exact distinct contiguous page-number set `1..target`, including min/max, missing-number, and out-of-range checks, so a same-count gap plus extra page cannot pass. Undo authority compares live physical and created-page Beats/Dialogue with the authoritative applied candidates before any restore/delete; post-Apply edits block Undo without writes. Reopen failures now use a reusable persisted-state resolver: `ready` confirms a lost-response commit, `applied` records explicit recovery-required detail without further destructive mutation, and unreadable/unknown states fail closed. Focused coverage passes 8 files / 79 tests and the production build passes.

**Pass 4 outline-freshness correction:** PASS — the guarded Apply snapshot now persists the exact applied outline JSON, the completion transaction binds that JSON to its locked expectation, and normal Undo compares the freshly loaded latest same-ID outline row with the persisted applied result before any destructive write. An in-place outline edit after Apply therefore blocks Undo instead of deleting or restoring across newer content. Focused coverage passes 8 files / 79 tests; the production build passes; focused ESLint reports 0 errors and 3 pre-existing `WriterPortal` warnings.

## Pass 5: Truthful workspace status and page navigation

**Objective:** Make all visible status, dependency, comparison, and navigation controls reflect current persisted state.

**Acceptance criteria:**

- Tabs show remaining/ready/applied counts rather than historical totals.
- Missing dependency IDs fail closed; resolved dependency warnings disappear.
- Applied/terminal sets are read-only and use applied/rejected wording.
- Every comparison identifies its page.
- Revision Item page numbers navigate to physical content or the matching virtual preview.

- [x] **Step 1: Add RED model and component tests**

Add summary/blocker lifecycle tests to `writerPacingRevisionModel.test.ts`. Add component cases for:

- `1 remaining` → `0 remaining · 1 ready` → `0 remaining · 1 applied`;
- approved/applied parent removes the dependency warning;
- applied labels/status and no edit/decision actions;
- terminal rejected rows remain read-only;
- physical Page Beats/Dialogue navigation callbacks;
- virtual-page local selection and badge;
- applied-set failure suppression.

- [x] **Step 2: Run focused UI tests and confirm failure**

Run:

```bash
npx vitest run src/portals/writer/__tests__/writerPacingRevisionModel.test.ts src/portals/writer/__tests__/WriterPacingRevisionWorkspace.test.tsx
```

Expected: FAIL on historical counts, unconditional dependency banner, applied wording, and missing page controls.

- [x] **Step 3: Add fail-closed layer summaries**

In `writerPacingRevisionModel.ts`, make missing dependency IDs unresolved and export:

```ts
export type PacingRevisionLayerSummary = {
  remaining: number;
  ready: number;
  applied: number;
  rejected: number;
};
```

Derive `ready` through the same dependency-valid predicate used by Apply.

- [x] **Step 4: Implement terminal and comparison language**

Use `generation_status` and set status for sidebar labels, panel labels, edit/decision visibility, failure suppression, and primary action text. Prune stale selected IDs after refresh.

- [x] **Step 5: Implement context and page controls**

Render wrapped native buttons for each affected page. Physical pages call `onNavigateToPage(page, destinationLayer)`; virtual pages select a matching local child or show a clear missing-preview/retry state. Map Outline page navigation to Page Beats in `WriterPortal`.

- [x] **Step 6: Run Pass 5 smoke**

Run model and workspace tests. Expected: all pass.

- [x] **Step 7: Commit Pass 5**

```bash
git add src/portals/writer/WriterPacingRevisionWorkspace.tsx src/portals/writer/writerPacingRevisionModel.ts src/portals/writer/WriterPortal.tsx src/portals/writer/__tests__ docs/superpowers/plans/2026-07-27-pacing-revision-virtual-pages-implementation.md
git commit -m "fix: show current pacing revision status"
```

**Pass 5 smoke test:** PASS — 3 focused files / 29 tests cover model summaries, Apply-equivalent dependency validity, workspace lifecycle and navigation, and WriterPortal destination mapping. Focused ESLint reports 0 errors and the same 3 pre-existing `WriterPortal` warnings; `git diff --check` passes.

**Pass 5 result:** PASS — layer tabs now report pending-decision remaining, dependency-valid approved ready, and applied counts while excluding rejected history. Missing dependencies fail closed, resolved banners disappear, applied/discarded sets are read-only, failure actions are suppressed after terminal completion, and selected IDs are pruned when candidates stop being actionable. Comparison and sidebar language reflects approved/rejected/applied lifecycle state. Every review identifies its page/layer; wrapped native page controls route physical Outline/Page Beats/Dialogue to the mapped Writer workspace, while virtual pages select their local preview or expose a direct layer retry without dead external navigation. The existing two-panel comparison, dense sidebar, and sticky batch footer remain intact.

**Pass 5 specification-review correction:** PASS — four focused RED cases exposed rejected changes that still offered editing/decision actions, terminal sets that retained disabled selection chrome, and same-layer sidebar selection that could not leave a missing virtual preview. Rejected rows are now read-only as soon as rejected, applied/discarded sets omit select-all, clear, checkbox, and batch-decision controls entirely, and every normal sidebar selection clears the local missing-preview state. The corrected focused gate passes 3 files / 33 tests; focused ESLint reports 0 errors and the same 3 pre-existing `WriterPortal` warnings, and `git diff --check` passes.

**Pass 5 quality-review correction:** PASS — applied child changes with a persisted `page_number` now navigate as created physical pages even when their immutable proposal identity retains `page_id: null`; only unapplied virtual previews retain the local preview badge and navigation. Remaining counts now include only pending, ready changes. The applied action uses the exact terminal label `All approved changes applied`, and both that success text and the virtual-preview badge expose one polite `status` announcement without duplicate visible copy. TDD coverage added one ready-only model case and one applied-virtual navigation case while strengthening the existing terminal and preview accessibility cases. Root DOX now preserves the applied identity/navigation boundary and actionable remaining-count rule. The corrected focused gate passes 3 files / 35 tests; focused ESLint reports 0 errors and the same 3 pre-existing `WriterPortal` warnings, walkthrough presence is verified, and `git diff --check` passes.

**Pass 5 final accessibility correction:** PASS — the applied announcement is an independent screen-reader-only `status` sibling outside the disabled primary action, rather than a live-region descendant of that control. The action retains its exact visible and accessible label, while one standalone polite region announces terminal success. A focused RED assertion reproduced the nested-region defect before the workspace correction. The consolidated focused gate remains 3 files / 35 tests; focused ESLint reports 0 errors and the same 3 pre-existing `WriterPortal` warnings, walkthrough presence is verified, and `git diff --check` passes.

## Pass 6: Integrated local QA and contract documentation

**Objective:** Exercise the complete preview→review→apply→undo workflow and record the durable contract.

**Acceptance criteria:**

- A representative expansion previews future pages in all three layers without live page creation.
- Apply creates and verifies the pages.
- Undo removes only created pages.
- Loading/error/retry states and keyboard/responsive interaction are usable.
- Root DOX and walkthrough accurately describe the verified behavior.

- [ ] **Step 1: Run the complete focused pacing suite**

Run all `pacingRevision` tests plus WriterPortal bridge tests that cover page CRUD/navigation. Resolve failures before browser work.

- [ ] **Step 2: Start/register the local app and perform browser smoke**

Use the project local-host registry and in-app Browser bridge. Verify:

1. future page candidates appear as virtual;
2. no physical row exists before Apply;
3. individual edit/approve/reject works;
4. physical and virtual page heading controls work;
5. dependency warnings disappear when resolved;
6. Apply produces the target count and content;
7. applied labels/counts update;
8. Undo removes exact new pages.

Capture top/middle/bottom production-viewport evidence and check console/network logs.

- [ ] **Step 3: Accessibility and responsive smoke**

Verify tab order, Enter/Space page buttons, focus rings, semantic status, long wrapped page lists, sticky footer clearance, narrow stacking, and no horizontal overflow.

- [ ] **Step 4: Update durable contracts**

Add the fully previewed virtual-page and verified-apply behavior to `AGENTS.md`. Append a factual immediate entry to `walkthrough.md` with files, focused tests, browser evidence, unresolved issues, and next steps.

- [ ] **Step 5: Audit after six passes**

Audit the complete data flow for preview-only guarantees, RLS/issue scoping, exact compensation, completion ordering, retry preservation, UI truthfulness, accessibility, and no stale documentation. Fix all release-blocking findings.

- [ ] **Step 6: Run Pass 6 smoke**

Repeat one fresh representative local expansion smoke after fixes. Expected: preview, Apply verification, and Undo all succeed with clean browser logs.

- [ ] **Step 7: Commit Pass 6**

```bash
git add AGENTS.md walkthrough.md docs/superpowers/plans/2026-07-27-pacing-revision-virtual-pages-implementation.md src supabase
git commit -m "docs: record verified pacing expansion"
```

**Pass 6 smoke test:** One fresh local end-to-end expansion and undo.

**Pass 6 result:** Pending.

**Six-pass audit result:** Pending.

## Pass 7: Consolidated regression, hosted release, and final audits

**Objective:** Pass the release gate once, deploy the exact tested state, smoke production, and merge only verified changes.

**Acceptance criteria:**

- Focused tests, full regression, lint, build, and diff checks pass.
- Hosted Edge Function and frontend deployment use the tested commit.
- Production shows the current bundle and completes a bounded representative virtual preview.
- Final ReAct, QA, UI/UX, DOX, and code-review audits have no release blocker.
- Branch is committed, pushed, reviewed, merged, and production status is reported.

- [ ] **Step 1: Run the consolidated final gate**

Run once:

```bash
npm run test -- --run
npm run lint
npm run build
git diff --check
```

Report test-file count and individual-test count separately. Resolve any failure and rerun the affected focused scope before repeating the consolidated gate.

- [ ] **Step 2: Request code review**

Use the requesting-code-review workflow against the full branch diff. Resolve every P0/P1 and any correctness-relevant P2, then rerun affected tests.

- [ ] **Step 3: Final audits**

Record:

- **ReAct:** observations/actions are grounded, preview and mutation boundaries are explicit, failures recover without silent cascade.
- **QA:** semantic invariants, parser/AI/external-service/nondeterministic boundaries, rollback, and regressions pass.
- **UI/UX:** discoverability, remaining/ready/applied language, comparison clarity, keyboard/accessibility, loading/error/retry, responsive layout pass.
- **DOX:** changed paths rechecked; root contract and Child DOX Index remain current.

- [ ] **Step 4: Deploy hosted contracts**

Verify Supabase MCP/CLI is configured, authenticated, and callable. Deploy the tested `writer-tools` function. Deploy the frontend through the repository’s current production path and record immutable version IDs/commit SHA.

- [ ] **Step 5: Production smoke**

Open a fresh production page/tab and verify the current bundle. On dedicated/disposable QA data:

- preview at least the first and last future page across hosted calls;
- cross a five-page checkpoint when safe;
- prove page count does not change before Apply;
- Apply and verify physical count/content;
- Undo and verify cleanup;
- check browser console/network;
- clean up disposable data.

If credentials or safe data are unavailable, label production mutation smoke blocked by access; do not call the product failed and do not merge a false-success path.

- [ ] **Step 6: Finalize walkthrough and plan**

Replace all Pending pass/audit results with factual evidence. Verify:

```bash
git status --short walkthrough.md
rg -n "Pacing Revision Virtual Pages" walkthrough.md
git diff --check
```

- [ ] **Step 7: Commit, push, PR, and merge**

Use concise conventional commits, push `codex/pacing-revision-virtual-pages`, open a complete PR with actual testing/impact, wait for checks, merge when green, then confirm production remains live.

**Pass 7 smoke test:** Fresh production preview/apply/undo on safe QA data plus clean console/network logs.

**Pass 7 result:** Pending.

## Final completion checklist

- [ ] Design acceptance criteria 1–10 are all satisfied.
- [ ] Every pass smoke passed before advancing.
- [ ] Three-pass, midpoint, six-pass, and final audits are recorded.
- [ ] Full regression, lint, build, and diff checks pass.
- [ ] Hosted function and frontend deployments match the tested commit.
- [ ] Production smoke is successful or distinctly documented as access-blocked.
- [ ] Walkthrough and DOX updates are verified.
- [ ] PR is reviewed, merged, and live deployment status confirmed.
