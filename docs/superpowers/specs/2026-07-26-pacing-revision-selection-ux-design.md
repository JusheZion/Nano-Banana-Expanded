# Pacing Revision Selection and Failure Summary UX Design

**Date:** 2026-07-26  
**Status:** Approved for implementation on 2026-07-27
**Scope:** Writers' Workshop → Story Review → Pacing revision workspace

## Problem

The Pacing revision workspace currently separates selection, approval, and application correctly in its data flow, but the controls do not communicate that workflow clearly:

- Selecting checkboxes does not approve changes.
- `Approve selected` and `Reject selected` sit below a long scrolling item list and can be outside the viewport.
- There is no select-all or clear-selection affordance.
- A large failed-layer ledger can dominate the workspace even when the user is reviewing independent Outline suggestions.
- The disabled `Apply approved changes` button does not explain that selected changes must first be approved.

Failed or missing Page Beats and Dialogue candidates must not block reviewing, approving, or applying independent Live Outline changes.

## Product Decisions

### Tab-scoped selection

- Selection controls operate only on the active layer tab: Live Outline, Page Beats, or Dialogue.
- `Select all in <active layer>` selects every ready, selectable change in that tab.
- `Clear <active layer> selection` clears only selections in that tab.
- Selections may remain while the user visits another tab, but batch counts and batch actions always apply only to the active tab.
- Switching across all three tabs therefore supports the user's preferred three-click select-all workflow without a global cross-layer action.
- Stale, failed, missing, or already-applied changes are not selectable.

### Persistently visible batch actions

- The Revision Items sidebar has a compact selection toolbar above the item list.
- `Approve selected` and `Reject selected` remain in a sticky footer within the sidebar.
- The footer reports the active tab's selected count.
- Batch decisions update only the currently selected, ready changes in the active tab.
- A successful batch decision clears that tab's selection.

### Failure summary hierarchy

- The failed-layer area is collapsed by default into a concise summary.
- The summary shows the number of failed or missing layers and provides `Show failed layers` / `Hide failed layers`.
- `Retry all failed layers` remains available from the collapsed summary.
- Expanding preserves the existing bounded, scrollable ledger with individual page navigation and retry actions.
- When the Live Outline tab is active, the summary explicitly states that Page Beats and Dialogue failures do not prevent Outline approval.

### Approval and application clarity

- Checkbox selection remains an ephemeral UI state; it does not modify saved decisions.
- `Approve selected` or `Reject selected` persists decisions.
- `Apply approved changes` promotes only approved, dependency-valid changes.
- Missing child candidates do not block applying approved Outline changes.
- Dependency rules still prevent applying a child whose required parent change is not approved.
- The header status continues to distinguish pending changes from ready-to-apply changes.

## Interaction States

- **No ready changes in the tab:** Select-all and batch actions are disabled with accurate accessible labels.
- **Some ready changes selected:** Clear, Approve, and Reject are enabled and display the active-tab count.
- **All ready changes selected:** Select-all is disabled or communicates that all eligible changes are selected.
- **Busy/applying:** Selection mutation and batch decisions are disabled; existing selections remain visible.
- **Failed child generation:** The compact failure summary remains visible, but Outline controls remain operable.
- **Expanded failures:** The ledger remains height-bounded and keyboard-scrollable.
- **Tab change:** The toolbar label, selected count, and batch action target update to the new active tab.

## Accessibility

- Selection controls use explicit active-layer accessible names.
- The item list retains individually labelled checkboxes.
- Batch controls remain reachable by keyboard without traversing every failure row.
- The failure disclosure uses `aria-expanded` and an associated region.
- Focus rings remain visible and the sticky footer must not overlap list content.
- Live status text announces pending and ready-to-apply totals without announcing every checkbox toggle.

## Technical Boundaries

- This is a client-only UI correction in `WriterPacingRevisionWorkspace`.
- No schema, migration, Edge Function, or persistence changes are required.
- Existing `onChange`, `onApply`, `onRetryFailed`, and `onNavigateToPage` contracts remain unchanged.
- Selection remains component-local and is not persisted across reloads.

## Verification

- Component tests prove:
  - select-all and clear affect only the active tab;
  - hidden selections are not included in another tab's batch decision;
  - Outline batch approval remains enabled when child layers have failures;
  - the sticky batch footer reports the correct active-tab count;
  - the failure ledger is collapsed initially and can be expanded;
  - retry-all and individual retry/navigation remain available;
  - busy and no-eligible states disable the correct controls.
- Focused Writer tests pass.
- Full regression, lint, production build, and `git diff --check` pass before release.
- Browser QA at the production viewport verifies top/middle/bottom layout, keyboard reachability, no overlap, responsive containment, clean console output, and Outline approval while Beats/Dialogue failures remain.

## Acceptance Criteria

1. A user can select all ready changes in the active tab with one control.
2. A user can clear only the active tab's selection with one control.
3. Approve/Reject selected actions remain visible while the item list scrolls.
4. Batch decisions never include hidden selections from another layer.
5. Page Beats or Dialogue failures do not prevent Outline approval or Outline-only application.
6. Failure details no longer dominate the workspace by default.
7. The two-stage select → approve/reject → apply workflow is understandable from visible labels and status.
8. Existing individual decisions, editing, dependency navigation, retry, apply, and undo behavior remain intact.
