# Pacing Revision Virtual Pages and Verified Apply Design

**Date:** 2026-07-27
**Status:** Approved for implementation
**Scope:** Writers' Workshop → Story Review → Pacing revision workspace

## Problem

The Pacing revision workflow currently reports an approved Revision Set as applied even when an approved pacing expansion cannot be materialized. A Pacing Review can recommend expanding a 71-page issue to 85 pages, but:

- the outline revision generator is constrained to roughly 90–110% of the current outline and does not enforce the saved Pacing Review target;
- Page Beats and Dialogue previews are generated only for existing `writer_pages` rows, so pages 72–85 never appear in the Revision Set;
- the apply pipeline can update existing pages but cannot create new page rows;
- completion persistence marks approved changes and the Revision Set as applied without verifying the resulting page count or the new page content;
- the workspace continues to show historical tab totals, resolved dependency warnings, and pre-apply wording after changes are applied;
- the two-panel comparison does not identify its page, and Revision Item page lists are not navigable.

The result is a false-success state: the review UI says that expansion changes were approved and applied while the issue remains at its original page count.

## Product Decisions

### Chosen approach: fully previewed virtual pages

Pages beyond the current physical issue length exist inside a Revision Set as **virtual pages** until final Apply:

- each virtual page has a real proposed page number and no physical `writer_pages.id`;
- its proposed Outline beat, Page Beats, and Dialogue are generated and displayed in the existing two-panel review experience;
- each layer remains individually editable, approvable, and rejectable;
- virtual page children use stable page-number targets and dependency IDs in the same way existing-page children use physical page targets;
- no `writer_pages` row is created during generation or review;
- final Apply creates only complete, approved virtual pages and maps their page numbers to the new physical row IDs.

This preserves the preview-first contract while making the proposed 85-page result fully inspectable before it changes live story data.

### Alternatives considered

1. **Pre-create empty page rows before review.** This reuses existing page-ID APIs, but it mutates live issue structure before approval, creates confusing empty pages, complicates cancellation, and violates the preview-first contract.
2. **Apply the outline first, then generate new page children later.** This is close to the current behavior and keeps implementation smaller, but it cannot provide a truthful full preview and leaves users with partially applied story structure.
3. **Fully previewed virtual pages.** This requires request, queue, apply, undo, and UI changes, but it is the only option that gives users a complete comparison and prevents false success. This is the approved approach.

## Domain Model and Identity

- Existing pages retain `target_key: "page:<uuid>"`, `page_id: <uuid>`, and `page_number`.
- Virtual pages use `target_key: "virtual-page:<page_number>"`, `page_id: null`, and `page_number`.
- `page_number` is the stable identity only within one Revision Set. It is never used as a cross-issue database identity.
- A virtual Page Beats change depends on the Outline change(s) that introduce or materially define that page.
- A virtual Dialogue change depends on its virtual Page Beats change.
- Existing migration columns already permit nullable `page_id` and a populated `page_number`; no new database column is required.
- The saved `proposed_outline_json` is the authority for whether a virtual page belongs to the Revision Set.

## Outline Target Contract

The saved Pacing Review determines the proposed expansion target:

1. Read `length_alignment.recommended_pages`.
2. For an exact recommendation, use that exact value.
3. For a range, choose the already established recommendation helper's deterministic target.
4. Clamp the target to the supported 1–200 page range.
5. Expansion applies only when the target exceeds the current physical page count.

The outline preview request must pass an allowed page range that includes the approved pacing target and explicitly require that the deterministic proposal materialize page beats through that target. The server rejects an expansion plan whose deterministically built proposal does not contain the target number of sequential page beats. It must never create virtual child work from a recommendation that the outline proposal did not actually fulfill.

This implementation supports expansion. It does not silently delete physical pages for a shorter recommendation; contraction remains a separate product decision.

## Preview Generation

### Client queue

- Build the queue from affected page numbers in the Revision Set, not only from existing page rows.
- For an existing page, send both `page_id` and `page_number`.
- For a virtual page, send `page_number` and omit `page_id`.
- Preserve the one-layer, one-page, one-Edge-invocation rule.
- Generate Page Beats before Dialogue for every page.
- Continue after isolated failures, preserve completed candidates, and retain five-page progress checkpoints and retry-failed-only behavior.

### Hosted validation

The `pacing_revision_page_preview` request accepts:

- required `revision_set_id`;
- required `page_number`;
- optional `page_id`;
- exactly one of `include_beats` or `include_dialogue`.

The Edge Function:

- authenticates and loads the Revision Set and issue as today;
- if `page_id` is provided, verifies it belongs to the issue and matches `page_number`;
- if `page_id` is absent, verifies that `page_number` is beyond the current physical maximum, is owned by a Revision Item, and exists in `proposed_outline_json`;
- rejects virtual pages that are not justified by the saved proposed outline;
- synthesizes an unsaved prompt page with empty live Beats/Dialogue and the proposed outline context;
- requires an effective virtual Page Beats candidate before generating virtual Dialogue;
- persists the candidate with `page_id: null`, its real `page_number`, and `virtual-page:<number>`;
- never creates or updates a live `writer_pages` row.

The model response identifies the requested page number. Server-side validation, not the model, establishes the final target key.

## Review and Navigation Experience

### Dynamic tab status

Each layer tab shows state rather than a historical total:

- primary: number of ready changes still awaiting a user decision (`N remaining`);
- secondary when applicable: approved dependency-valid changes waiting for Apply (`N ready`);
- secondary after application: applied changes (`N applied`).

Rejected changes and approved-but-not-applied changes are not mislabeled as “remaining.”

### Applied-state language

- Sidebar status derives from `generation_status`: applied changes display **Applied**, not merely **Approved**.
- Dependency warnings render only for unresolved blockers returned by `pacingRevisionDependencyBlockers`.
- An applied change shows a success message and no edit/approve/reject controls.
- Applied comparisons use **Before this revision** and **Applied revision**.
- Approved changes waiting for Apply use **Current live** and **Approved proposal**.
- When the set is applied, the disabled primary action says **All approved changes applied**.

### Page context

- The comparison header always identifies the selected layer and page.
- Existing-page context is `Page N · Page Beats` or `Page N · Dialogue`.
- Virtual-page context adds `Virtual page · created on Apply`.
- Outline changes with several affected pages show the relevant page or page range.

### Clickable page lists

- Each page number in a Revision Item heading is a native button with a specific accessible name.
- For a physical page, the control opens the matching Writer page and appropriate Page Beats or Dialogue layer.
- For an Outline page, the control opens the concrete Page Beats page view.
- For a virtual page, the control stays in the Revision workspace, activates the best matching change for that page in the current layer, and announces that the page will be created on Apply.
- Focus, keyboard activation, disabled/busy states, and visible focus rings follow existing application patterns.

## Atomic Apply Contract

Apply has a preflight phase and a mutation phase.

### Preflight

- Resolve all approved dependency-valid changes.
- Validate source fingerprints and locks for existing targets.
- Derive the approved virtual page numbers from proposed outline additions and child changes.
- Require every virtual page selected for creation to have:
  - an approved, applicable Outline introduction;
  - an approved, ready Page Beats candidate;
  - an approved, ready Dialogue candidate.
- Reject partial virtual pages with a clear error before any live write.
- Require virtual page numbers to be contiguous from the current maximum + 1 through the approved target.

### Mutation

1. Save the approved outline version.
2. Create the required physical page rows.
3. Refresh page rows and map each virtual `page_number` to its new physical ID.
4. Write approved existing and virtual Page Beats.
5. Write approved existing and virtual Dialogue.
6. Read back the pages and verify:
   - the physical page count reaches the approved target;
   - every created page number exists exactly once;
   - every created page contains the approved Beats and Dialogue values.
7. Only after successful read-back, persist the apply snapshot and mark changes/the set applied.

### Compensation and undo

- The apply snapshot records original outline/content plus every page created by this Revision Set.
- If any mutation or verification step fails, restore existing content, remove the just-created outline version, and delete only page rows created by this Apply attempt.
- The Revision Set remains unapplied and displays the error.
- Undo restores prior existing-page content and outline state, then deletes only the pages recorded as created by this Revision Set.
- Completion persistence must never run before read-back verification succeeds.

## Loading, Error, and Recovery States

- Applying disables duplicate mutation controls and announces progress.
- Existing valid comparison content remains visible while refreshing.
- A verification failure is shown as an apply failure, never as applied.
- Missing or incomplete virtual layers name the page and required layer.
- Hosted virtual preview failures enter the existing page/layer failure ledger and can be retried individually or as failed-only work.
- Stale existing-page changes remain blocked; virtual pages fingerprint their empty pre-apply state plus the saved proposed-outline authority.

## Accessibility and Responsive Behavior

- Tab state text remains readable at narrow widths and does not rely on color alone.
- Page-number controls have visible focus and page/layer-specific accessible names.
- Applied and virtual status messages use semantic live/status regions without announcing every decorative count.
- Two-panel comparisons retain their current responsive stacking behavior.
- Sticky batch controls must not obscure the last Revision Item.

## Security and Data Integrity

- Virtual requests remain authenticated and issue-scoped.
- A caller cannot request an arbitrary future page: page ownership and proposed-outline presence are validated server-side.
- The one-page Edge cap remains enforced.
- Physical page creation occurs only in the authenticated client apply flow using existing issue-scoped page APIs.
- Read-back verification is mandatory before the server-side Revision Set is completed.
- No live content is silently cascaded from an unapproved parent.

## Verification Strategy

- Schema/API tests cover existing and virtual request shapes and reject mismatched IDs/numbers.
- Edge tests cover virtual authorization, proposed-outline validation, Beats-before-Dialogue, persistence identity, and one-page generation.
- Queue/hook tests cover mixed physical/virtual ordering, five-page checkpoints, isolated failure continuation, and failed-only retry.
- Apply tests cover complete virtual page preflight, row creation/mapping, successful read-back, rollback, false-success prevention, and undo deletion.
- Component tests cover remaining/ready/applied tab status, resolved blockers, applied wording/actions, page context, and physical/virtual page navigation.
- A representative local browser smoke previews at least one future page in all three layers, applies it, confirms the new physical page and content, and undoes it.
- Production smoke uses disposable or approved representative data, confirms the current deployed bundle, crosses multiple hosted invocations and a five-page checkpoint when safe, and cleans up disposable data.

## Acceptance Criteria

1. A pacing recommendation from 71 to 85 produces reviewable Outline, Page Beats, and Dialogue proposals for pages 72–85 without creating live pages.
2. Every proposed future page is individually editable, approvable, and rejectable before Apply.
3. Apply refuses an incomplete virtual page before mutating live data.
4. Successful Apply creates pages 72–85, saves approved content, and verifies the resulting page count/content before reporting success.
5. A failed Apply compensates all writes it introduced and does not mark the Revision Set applied.
6. Undo removes only pages created by the Revision Set and restores prior content.
7. Tab numbers reflect remaining, ready, and applied state.
8. Resolved dependency warnings and pre-apply controls disappear after application.
9. The main comparison identifies its page, and Revision Item page numbers provide appropriate physical or virtual navigation.
10. Existing-page preview, approval, retry, apply, and undo behavior remains intact.

## Rollback

The implementation ships as a cohesive client/Edge contract. If hosted virtual preview cannot be released safely, keep the Revision Set unapplied and hide/disable virtual generation with an explicit unsupported-expansion message. Do not restore the current false-success behavior and do not pre-create placeholders.
