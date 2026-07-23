# Writer Outline Review Recovery Design

**Date:** 2026-07-23  
**Status:** Approved; awaiting written-spec review

## Goal

Restore confidence in the critical comic-production path without reopening the entire Writers' Workshop. Repair the Outline AI Treatment review so a beginning user can understand, edit, and act on proposed changes, then verify that saved outline data travels safely through the downstream production corridor.

## Scope

### Included

- Simple Workflow AI Treatment review.
- Human-readable accepted and rejected changes.
- Chronological page-level review and direct editing.
- Highlighting and navigation to proposed changes.
- Tab-marker normalization.
- Non-overlapping, readable action controls.
- Advanced-only technical details.
- Signed-in production verification of:
  - Outline;
  - Pages & Beats;
  - Dialogue;
  - Imageshop Prep;
  - Comic Creator handoff.

### Excluded

- Redesigning unrelated Writer tabs.
- Settings-page work.
- Changes to AI Treatment permissions or the patch engine unless reproduction proves a new data-integrity defect.
- Promotion of QA proposals into the user's official project.
- Cosmetic work that does not affect comprehension, access, or the July 30 production path.

## Root Problem

The current Simple Workflow review exposes implementation artifacts instead of presenting a review task:

- JSON escape sequences such as `\t` are visible.
- Current and proposed outlines are raw JSON.
- Rejections omit the affected page and attempted wording.
- Internal beat IDs appear as user-facing content.
- Changes are difficult to locate and are not presented chronologically.
- The sticky action bar can obscure content.
- Secondary button labels can inherit unreadable colors.

The previous production smoke proved data preservation and non-mutation, but did not prove beginner comprehension, viewport usability, or downstream readiness.

## Simple Workflow Review

### Change summary

Show counts for:

- pages before and after;
- accepted changes;
- rejected changes;
- combined, added, or reordered pages when present.

Do not count unchanged pages as “changes.”

### Chronological change list

Show accepted and rejected operations in proposed page order. Each card includes:

- `Page N`;
- change type in plain language;
- original wording;
- proposed wording;
- the AI's reason;
- rejection reason when applicable.

Rejected cards state that the original wording was retained. They identify the affected page and attempted change rather than repeating a generic message.

Unchanged pages are hidden by default behind **Show unchanged pages**.

### Readable editing

Replace the Simple Workflow JSON textarea with a readable page-by-page proposal editor.

- Each proposed page remains directly editable.
- Changed pages receive a persistent visual marker.
- Changed text receives accessible highlighting when a reliable word-level comparison is available.
- Selecting a change card scrolls to and focuses its proposed page editor.
- Rejected operations point to the retained source page.
- Tabs and escaped tab markers are normalized to spaces or readable separators.

The outline title, premise, and Acts remain readable and editable without exposing JSON syntax.

### Advanced Workflow

Advanced Tools may retain:

- raw JSON;
- manifest details;
- opaque beat IDs;
- technical operation codes.

The default Advanced view still leads with the readable change list. Technical details live in an explicitly labeled disclosure.

## Action Bar

- The dialog reserves enough bottom space for the action bar at every supported viewport.
- The bar never covers outline content.
- Every button sets explicit foreground, background, border, hover, focus, and disabled colors.
- Mobile buttons wrap or stack without truncation.
- `Escape` cancels only when no save operation is active.
- Tab order follows Cancel → Regenerate → Keep as alternate → Make official.

## Data and Error Handling

- Existing proposal and manifest structures remain authoritative.
- The UI derives page labels from manifest source IDs mapped through the normalized source, never from opaque IDs alone.
- Missing mappings fall back to “Affected page unavailable” and remain visible in Advanced technical details.
- A rejected operation never blocks promotion when the deterministic proposal is otherwise valid.
- Invalid editable content blocks promotion with a field-specific, plain-language error.
- Canceling leaves the official outline unchanged.

## Production-Readiness Corridor

Use a persistent demo project and realistic saved data. Verify:

1. Outline proposal review, editing, cancel, and save/reload behavior.
2. Pages & Beats receives the official outline, preserves page order/count, generates, saves, and reloads.
3. Dialogue receives the correct beats, generates, saves, and reloads.
4. Imageshop Prep receives outline/page/dialogue context and produces its expected handoff.
5. Comic Creator receives the selected issue/page data without mutation or loss.

Report each stage:

- **Green:** production workflow completed successfully.
- **Yellow:** usable with a documented non-blocking defect.
- **Red:** blocks comic production.

Stop and repair only Red defects that block the July 30 production path. Record Yellow issues for later work.

## Accessibility and Responsive Requirements

- Semantic headings, labels, status messages, and buttons.
- Keyboard-reachable change cards and editors.
- Focus moves to the selected changed page.
- Rejection and change states use text/icons in addition to color.
- Text and controls meet readable contrast.
- Verify desktop production viewport and a narrow mobile viewport.

## Verification

### Focused automated checks

- tab normalization;
- chronological change mapping;
- page-aware rejection messages;
- unchanged-page hiding;
- change-to-editor focus/navigation;
- readable editing and promotion parsing;
- explicit action-button states;
- action-bar layout classes and reserved dialog spacing.

### Browser checks

- Real 70-page proposal.
- Screenshots of top, middle, and bottom of the review dialog.
- Keyboard traversal and Escape behavior.
- No covered content or unreadable labels.
- Preview canceled; official outline unchanged.

### Corridor checks

- Persistent demo data survives reload between each stage.
- Page counts/order and issue identity match at every boundary.
- No production mutation outside the dedicated demo project.

## Completion Standard

The work is complete only when:

- focused tests and production build pass;
- the full Simple Workflow review is understandable without JSON knowledge;
- visual evidence confirms no overlap or unreadable controls;
- the 70-page preview is canceled safely;
- every production-corridor stage has a Green, Yellow, or Red evidence-backed status;
- no Red blocker remains between the official outline and comic page production.

