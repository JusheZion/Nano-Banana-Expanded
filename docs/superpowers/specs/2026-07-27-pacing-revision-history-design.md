# Pacing Revision History and Replacement Design

**Date:** 2026-07-27  
**Status:** Approved for implementation

## Problem

A saved Pacing Review and a Pacing Revision Set are separate records. Running a new review updates the diagnostic result, but the newest non-discarded Revision Set remains active. The Simple Workflow then keeps rendering an older applied set and hides the action that creates a Revision Set from the new review. Undo is not the correct replacement mechanism because Undo restores live story content and must stop when a newer official outline exists.

## Product decision

Revision Set replacement changes review metadata, not live story content:

- A new successful Pacing Review archives the older terminal Revision Set (`applied` or `failed`) automatically.
- An unfinished set (`ready` or `partially_ready`) requires confirmation before the new review starts. It is archived only after the new review succeeds.
- A set in `applying` cannot be replaced. The user must let Apply finish or resolve recovery first.
- A currently generating set must be stopped before replacement.
- Archiving never restores, deletes, or changes official Outline, Page Beats, Dialogue, or pages.
- Hard deletion is intentionally omitted. Archive preserves traceability and gives the requested clear/remove affordance without destroying history.

## Lifecycle and persistence

Add `archived` to the Revision Set status contract. Archived sets remain owner-scoped database records with their Items, Child Changes, proposals, decisions, apply snapshot, and failure ledger intact.

Add an authenticated owner-scoped `archive_writer_pacing_revision_set` transaction. It accepts the set ID, expected status, and expected `updated_at`; locks the row; rejects `applying`, `generating`, changed, foreign, or already terminal-hidden records; and changes only the set status to `archived`. It does not update child rows or live story tables.

The default active-set query excludes `archived` and `discarded`. A separate history query returns archived sets newest first. Existing discarded records remain hidden because they predate the recoverable archive contract.

## New-review flow

Before a single Pacing Review:

1. Inspect the active Revision Set.
2. Block replacement for `applying` or active generation.
3. For `ready` or `partially_ready`, ask once: “Archive this unfinished Revision Set if the new review succeeds?”
4. Run the AI Pacing Review without changing the old set.
5. If the review fails, preserve the old set unchanged.
6. If the review succeeds, archive the expected old set with its status and `updated_at` concurrency guard.
7. Refresh the issue, active Revision Set, and history.
8. Show the new saved review and its `Create Revision Set` action.

Applied and failed sets follow the same sequence without the unfinished-work confirmation. This ordering prevents a failed AI request from clearing the current workspace.

Batch Pacing Review uses the same per-issue lifecycle. It asks once before the batch when unfinished sets are present, skips issues whose sets are applying/generating, archives each eligible prior set only after that issue’s review succeeds, and preserves per-issue failures.

## Simple Workflow interface

The active workspace header gains an **Archive revision set** button. Manual archive always requires confirmation. It is disabled while generating/applying and disappears after archival.

Add a compact **Revision history (N)** disclosure above the active workspace:

- newest archived set first;
- creation date/time and prior lifecycle state;
- **View** opens the existing two-panel workspace in read-only history mode;
- **Back to current review** returns to the active/new diagnostic;
- archived labels explicitly say that official story content is unchanged;
- no Approve, Reject, Edit, Apply, Undo, Retry, selection, or batch controls render in history mode.

Advanced Workflow keeps its existing outline version tools. Pacing Revision history is also available there through the same compact component so users do not need to switch modes to understand why a set disappeared.

## Error and recovery behavior

- If review generation fails, no archive occurs.
- If guarded archive fails after a successful review, keep the old set visible, retain the new diagnostic, and show: “The new Pacing Review was saved, but the previous Revision Set changed before it could be archived.”
- If history loading fails, preserve the active workspace and provide a retry action.
- Archived records cannot be sent through Undo; official version restoration remains in Outline version history.

## Accessibility and responsiveness

- Use native buttons and disclosure semantics with visible focus.
- Confirmation text names whether unfinished decisions/edits will move to history.
- History entries remain keyboard reachable and wrap dates/status on narrow screens.
- Read-only history has a visible and semantic status message.
- No sticky batch footer or decision checkboxes render for archived sets.

## Verification contract

- API/migration tests prove owner scope, status/updated-at guards, metadata-only mutation, and active/history query boundaries.
- Hook tests prove terminal auto-archive, unfinished confirmation handoff, failure preservation, guarded archive failure, and active/history refresh.
- Portal/component tests prove the new review replaces the old workspace, manual Archive, history disclosure, read-only rendering, and accessible labels.
- Browser QA covers applied replacement, unfinished cancel/confirm, archived history viewing, new `Create Revision Set`, narrow layout, keyboard use, and clean console/network logs.
- Release requires focused regression, full Vitest, lint, production build, migration deployment, current-bundle verification, and one signed-in hosted lifecycle smoke.

## Out of scope

- Hard deletion of Revision Sets.
- Restoring official story content from Revision Set history.
- Changing Outline version-history behavior.
- Automatically creating or applying a new Revision Set after the diagnostic completes.
