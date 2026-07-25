# Writer Pacing Revision Sets Design

**Date:** 2026-07-25
**Status:** Approved through delegated product authority; ready for implementation planning

## Goal

Connect Story Review's Pacing Review to the Live Outline, Page Beats, and Dialogue without silently rewriting approved work. Users create a durable Pacing Revision Set, compare every proposed Child Change in two readable panels, edit or decide changes individually or in batches, and apply only approved candidates with dependency, staleness, lock, snapshot, and recovery protection.

## Current Gap

Simple Workflow can run Pacing Review but only displays the saved result. Advanced Tools exposes a partial path:

- `Apply + regenerate outline` updates the target, page rows, and official outline immediately;
- affected pages are queued afterward;
- `Preview AI replacements` returns Page Beat and Dialogue candidates;
- current and proposed values are shown as raw JSON/text;
- apply is page-by-page with no edit, reject, batch-decision, durable resume, or shared Outline review.

There is no single review workspace covering all three story layers, and the safest controls are hidden from the default workflow.

## Product Decisions

### Explicit creation

`Run Pacing Review` remains diagnostic. It never generates or applies story changes.

After a saved review exists, `Create Revision Set` is the explicit action that generates connected proposals. The action first shows the proposed scope, affected pages, and estimated generation work. No Live Story content changes during creation.

### Parent and child hierarchy

Each Revision Item represents one editorial intent, such as delaying a reveal or giving an aftermath more space. It owns Child Changes for one or more layers:

- Outline;
- Page Beats;
- Dialogue.

Child Changes can be edited, approved, or rejected independently. The interface warns when those independent decisions break a cross-layer dependency but never silently changes another decision.

### Three-state editing

Every Child Change preserves:

1. the current Live Story value captured when the Revision Set was created;
2. the immutable original AI Proposal;
3. an optional user Edited Candidate.

Reset restores the AI Proposal. Native field undo/redo remains available while editing. Applying uses the Edited Candidate when present and otherwise uses the AI Proposal.

### Two-panel review

Simple Workflow always shows exactly two primary comparison panels:

- **Current Live Story**;
- **Proposed Candidate**, editable when the content type supports direct editing.

Raw JSON, opaque identifiers, operation manifests, fingerprints, and technical failure details remain in an Advanced Tools disclosure.

## Considered Approaches

### Selected: persisted revision set with deterministic outline operations and queued page proposals

The Outline proposal is patch-based and derived deterministically from the complete current outline. Page Beat and Dialogue candidates are generated one page per Edge invocation against the proposed outline. Progress persists after each page.

Benefits:

- preserves the complete source outline;
- respects the existing one-page hosted execution safety limit;
- resumes after refresh or interruption;
- supports partial failure and failed-page-only retry;
- provides durable comparison and provenance.

Cost:

- requires dedicated database records and a migration;
- requires a generation coordinator and apply recovery logic.

### Rejected: one monolithic automatic cascade

One request would regenerate the Outline, Page Beats, and Dialogue immediately after Pacing Review.

It was rejected because it spends AI work before user intent is confirmed, risks hosted timeouts on long issues, makes partial recovery difficult, and contradicts preview-first autonomy.

### Rejected: transient client-only preview

The existing preview response could be expanded and kept only in React state.

It was rejected because a refresh or interruption would lose AI work and decisions, long-issue generation could not resume reliably, and provenance would be too fragile for batch apply and undo.

## Persistence Model

### Revision Set

A dedicated owner-protected record stores:

- issue and source outline identifiers/version;
- saved Pacing Review snapshot and timestamp;
- source and proposed outline data;
- source fingerprints for staleness checks;
- status: `generating`, `ready`, `partially_ready`, `applying`, `applied`, `failed`, or `discarded`;
- generation progress and failed-page ledger;
- apply snapshot and recovery status;
- created and updated timestamps.

### Revision Item

Each ordered item stores:

- editorial title and rationale;
- affected page numbers;
- generation status;
- aggregate decision/apply status.

Affected-page ownership must be deterministic. If two editorial intentions target the same page, the planning stage combines them into one Revision Item rather than generating conflicting page replacements.

### Child Change

Each change stores:

- parent Revision Item;
- layer: `outline`, `beats`, or `dialogue`;
- target key and optional page identity;
- captured Live value;
- immutable AI Proposal;
- optional Edited Candidate;
- decision: `pending`, `approved`, or `rejected`;
- dependency identifiers;
- plain-language reason;
- source fingerprint, generation status, and apply timestamp.

RLS follows Writer ownership through issue → series → `owner_id`.

## Generation Architecture

### Stage 1: outline plan and preview

`Create Revision Set` invokes a new preview-only Writer tool mode.

The server:

1. loads the issue, saved Pacing Review, latest outline, pages, canon, and production defaults;
2. normalizes the complete outline into stable opaque source beat IDs;
3. asks Gemini for Revision Items plus explicit `edit`, `move`, `combine`, and `add` operations linked to one Revision Item;
4. rejects invalid, conflicting, untraceable, or cosmetic-only operations individually;
5. applies valid operations to the immutable source through the existing deterministic patch engine;
6. derives the proposed outline, manifest, affected pages, and Outline Child Changes locally;
7. persists the Revision Set before returning.

Unmentioned source beats remain unchanged. The model never supplies a replacement outline.

### Stage 2: downstream page queue

The client owns an ordered queue of affected pages. Each Supabase Edge invocation handles no more than one page and:

1. loads the persisted proposed outline and the relevant Revision Item;
2. loads the current page, neighboring context, canon, and production defaults;
3. returns schema-constrained Page Beats and Dialogue candidates with plain-language reasons;
4. retries malformed model JSON once at lower temperature;
5. persists Child Changes before reporting success.

Progress appears in groups of no more than five pages, refreshes persisted status at each checkpoint, and offers **Stop after current page**. Isolated page failures do not stop later pages. A persistent ledger lists every failed page, reason, navigation action, retry-one action, and failed-pages-only retry.

Locked layers are excluded before generation and identified in the scope summary.

## Review Workspace

### Entry and summary

Story Review shows:

- saved Pacing Review summary;
- `Create Revision Set`;
- affected layer/page scope;
- active Revision Set status;
- resume, discard, and start-new actions when applicable.

Creating a new set does not delete an earlier unapplied set without confirmation.

### Revision Item navigator

The left navigator lists items in story order with:

- editorial intent;
- affected pages;
- Child Change counts by decision;
- warning and failure counts;
- complete/partial/pending status.

### Child Change review

The main workspace includes:

- layer tabs for Outline, Page Beats, and Dialogue;
- two side-by-side panels on desktop and vertically ordered panels on narrow screens;
- current and proposed/edited readable content;
- change highlighting where reliable;
- reason and dependency messages;
- selection checkbox;
- `Approve`, `Reject`, `Edit`, `Reset edit`, and `Go to page`;
- overflow/context actions exposing the same decisions without hiding the primary buttons.

Unchanged content is hidden by default and can be revealed.

### Batch actions

Users can:

- select all visible Child Changes;
- select a Revision Item;
- select a layer;
- approve selected;
- reject selected;
- reset selected decisions;
- retry selected failures.

Batch actions announce counts and never include hidden locked, failed, stale, or already applied changes unless the user explicitly selects an eligible filter.

### Dependency behavior

Dependencies are advisory until apply:

- decisions remain independent;
- warnings identify the upstream and downstream changes involved;
- selecting the warning navigates to the dependency;
- **Apply approved changes** is blocked only when an approved change requires a rejected, stale, failed, or missing prerequisite;
- the user can resolve the warning by changing decisions or rejecting the dependent change.

## Apply, Recovery, and Undo

### Preflight

Before apply:

- reload the latest Outline and pages;
- compare source versions/fingerprints;
- re-check content locks;
- validate Edited Candidates;
- validate dependencies;
- list exactly which layers/pages will change.

Stale or newly locked changes are blocked and remain reviewable. The application never overwrites newer Live Story content.

### Ordered application

Approved changes apply in dependency order:

1. save a complete apply snapshot;
2. compose and insert the approved Outline as a new official version;
3. create or remove page rows only when the approved outline operation and destructive warning explicitly permit it;
4. update approved Page Beats;
5. update approved Dialogue;
6. mark applied Child Changes and the Revision Set.

Rejected and pending changes remain unapplied.

### Failure recovery

If any write fails:

- stop subsequent writes;
- restore every modified page from the apply snapshot;
- restore the prior Outline as the latest version when needed;
- preserve the Revision Set and failure evidence;
- show whether automatic rollback completed;
- provide retry or finish-recovery actions.

After success, **Undo applied revision set** restores the saved snapshot as new history rather than deleting audit records.

## State and Accessibility Requirements

- Distinguish loading, empty, generating, partially ready, ready, applying, applied, failed, stale, locked, and permission-denied states.
- Preserve the last valid Revision Set while refreshing.
- Disable duplicate generation and apply actions while work is active.
- Use semantic headings, lists, tabs, labels, status regions, and alerts.
- Maintain visible focus, logical tab order, and keyboard activation.
- Move focus to the first failure or blocking dependency after a failed action.
- Use text/icons in addition to color.
- Announce generation checkpoints, decision changes, batch results, apply results, and clipboard/edit failures.
- Keep primary controls unobstructed at desktop, tablet, and phone widths.

## Error Handling

- No Pacing Review: explain that the diagnostic must run first.
- No material operations: save an unchanged Revision Set with a plain-language explanation.
- Invalid AI operation: reject only that operation and retain the complete source.
- Malformed page response: retry once, then record a page-specific failure.
- Network interruption: retain persisted successes and resume from unfinished pages.
- Permission failure: retain local UI state, block writes, and offer re-authentication.
- Stale source: block affected apply operations and offer regeneration from the latest Live Story.
- Partial apply failure: run compensating recovery and expose its exact status.

## Testing Strategy

### Deterministic and schema tests

- complete-source outline preservation;
- valid and invalid operation grouping;
- overlapping affected-page consolidation;
- material-change validation;
- page numbering and metadata preservation;
- three-state candidate selection;
- dependency blocking;
- stale fingerprint detection;
- lock filtering;
- snapshot, rollback, and undo composition;
- one-page Edge request cap;
- malformed JSON retry;
- failure-ledger continuation and failed-only retry.

### Component and interaction tests

- readable two-panel rendering without JSON in Simple Workflow;
- parent/item and layer navigation;
- direct editing and reset to AI Proposal;
- individual and batch approve/reject/reset;
- dependency navigation and apply blocking;
- loading/empty/failure/stale/locked/applied states;
- accessible labels, focus movement, announcements, and keyboard operation;
- responsive stacking and unobstructed controls.

### Browser and production QA

Use the dedicated QA account and persistent long issue. Never mutate the user's completed Page Beats.

- run a Pacing Review or use a saved representative result;
- create a Revision Set against a long outline near 70 pages;
- verify opening, middle, and ending Revision Items;
- cross a five-page generation checkpoint;
- force or safely simulate one isolated page failure and confirm later pages continue;
- edit, reset, approve, reject, and batch-select Child Changes;
- inspect top, middle, and bottom at the production viewport;
- check phone and landscape widths;
- verify keyboard, focus, contrast, and overlap;
- cancel/discard without Live Story mutation;
- apply a bounded disposable set, reload, verify all approved layers, then undo and confirm recovery;
- inspect browser and hosted function errors.

## Rollback

- Database additions are additive and can remain unused if the feature flag or entry control is removed.
- Edge deployment can roll back independently while existing Revision Sets remain preserved.
- Client apply always snapshots before mutation and can restore through history-preserving writes.
- If live verification exposes a blocking defect, do not enable or merge the apply control; retain preview/review functionality behind the existing explicit entry point.

## Acceptance Criteria

- Pacing Review itself never changes story content.
- `Create Revision Set` is explicit and preview-only.
- Outline, Page Beats, and Dialogue appear in one durable review workspace.
- Every Child Change supports readable two-panel comparison plus individual edit/approve/reject.
- Batch selection and batch decisions work without including ineligible changes.
- Original AI Proposals survive user edits.
- Dependency, stale, and lock conflicts prevent unsafe apply.
- Long-issue generation uses one page per Edge invocation, persists checkpoints, continues after isolated failures, and retries failed pages only.
- Apply snapshots, ordered writes, automatic recovery, and undo are verified.
- Simple Workflow exposes no raw JSON or opaque identifiers.
- Focused tests, full regression, lint, production build, signed-in browser QA, and a bounded production smoke all pass before merge.
