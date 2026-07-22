# Writer Outline Paste Review and Import Design

**Date:** 2026-07-22

**Status:** Approved design; implementation planning pending user review

**Scope:** Writers' Workshop outline editing, clipboard paste, text/Markdown import, AI treatment review, and related preferences

## Problem

The plain-text outline editor currently behaves like a structured import surface without making that contract sufficiently visible. Its deterministic parser recognizes known headings and patterns such as `TITLE:`, `PREMISE:`, `ACTS:`, `PAGE BEATS:`, supported Act headings, and numbered page entries. Plausible text outside those patterns may be omitted from the structured result or placed unexpectedly, while the user receives no pre-save explanation of what was recognized, what was not, or how to correct it.

The design must guarantee that pasted writing is preserved, expose the interpretation before it can affect the official outline, keep the Simple Workflow approachable, and offer greater mapping control in Advanced Tools.

## Design principles

1. **Never silently discard writing.** Preserve the exact pasted or imported source before interpretation.
2. **Deterministic first, AI optional.** Explicit format signals are recognized locally; AI never becomes a prerequisite for manual correction.
3. **Nothing becomes official without review when uncertainty exists.** Parsing and AI output are proposals until explicitly applied.
4. **Simple stays simple.** Confident pastes remain fast; ambiguity invokes focused review.
5. **Advanced control remains available.** Complex documents can use a deliberate import-and-mapping workflow.
6. **Every destructive transition is recoverable.** Applying a paste or AI treatment creates a restorable prior version.
7. **Explain the workflow where it happens.** Guidance is local, accessible, dismissible, and recoverable from Settings.

## Information model

Parsing should produce a diagnostic result instead of only a structured outline:

- original source text;
- source type (`clipboard`, `.txt`, or `.md`);
- recognized sections and the source ranges that produced them;
- unassigned passages, retained verbatim;
- warnings and conflicts;
- inferred page count and detected page ranges;
- proposed structured outline;
- whether review is required;
- assignment provenance: deterministic, user, or AI suggestion.

The original source and diagnostic result remain temporary until the user applies or deliberately saves them. An applied result creates a new outline version and retains the previous official outline for rollback.

## Recognition pipeline

1. Preserve the original input verbatim.
2. Run deterministic recognition for explicit headings, Act labels, numbered pages, page ranges, and known format variants.
3. Assign only high-confidence matches.
4. Put all unmatched passages in **Unassigned Text** without changing their contents.
5. If enabled, request optional AI assignment suggestions for unassigned passages.
6. Mark AI suggestions distinctly and require review; AI may not discard passages or make changes official.
7. Let the user assign or reassign passages manually regardless of AI preference.
8. Build a live proposed outline and validation summary.
9. Apply only after explicit confirmation, creating a recoverable version first.

## Simple Workflow: Paste Review

### Entry behavior

Pasting into the outline field first creates a temporary preserved source. The default preference is **Review only when needed**:

- a fully recognized, conflict-free paste may remain in the normal editing flow with a concise recognition summary;
- ambiguity, conflicts, or unassigned text opens Paste Review;
- the user may change the preference to **Always review** or **Never interrupt**;
- **Never interrupt** must preserve uncertain input as unstructured source rather than silently converting or discarding it.

The same rules apply to `.txt` and `.md` file input.

### Review surface

Paste Review shows:

- **Original preserved** status;
- recognition summary, for example `68 page beats and 3 Acts recognized`;
- recognized sections grouped by Title, Premise, Acts, Page Beats, and Notes;
- a prominent **Unassigned Text** area;
- warnings such as duplicate pages, missing ranges, conflicting headings, or absent page numbers;
- assignment provenance where AI suggestions are enabled.

Selecting one or more passages exposes manual assignment choices:

- Title;
- Premise;
- Act;
- Page Beat;
- Notes;
- Unassigned Text.

Act assignment requests the Act number/name when it cannot be inferred. Page Beat assignment requests a page number or supports sequential numbering for a multi-selection. Assigning a passage changes its category, not its wording.

### Actions

- **Apply reviewed paste** — creates a rollback snapshot, saves the structured proposal as a new official version, and synchronizes the approved source used by future AI treatment.
- **Keep as unstructured source** — preserves all writing without forcing structure; the official outline remains unchanged until the user takes a later explicit action.
- **Restore original paste** — resets the temporary review to the verbatim input.
- **Cancel — keep current outline** — discards the temporary review only.

The UI must state `Your official outline has not changed` until Apply succeeds.

## Optional AI classification

AI classification is a preference and enhancement, not an access gate. Available modes are:

1. **No AI classification** — default; uncertain passages remain Unassigned for manual assignment.
2. **Suggest likely sections** — AI proposes assignments, visibly labeled, and the user accepts or changes them.
3. **Automatically classify with review** — AI pre-assigns uncertain passages but the entire proposal still requires review before applying.

AI may suggest Title, Premise, Act, Page Beat, or Notes. It may not label text as disposable, remove it, silently rewrite it, or bypass user confirmation.

## Advanced Tools: Outline Import wizard

Advanced Tools adds a dedicated **Import outline** entry point for complex documents.

### Steps

1. **Source** — paste text or choose `.txt` / `.md`; preserve it verbatim.
2. **Map sections** — display source passages and mapped structure side by side; support individual and bulk assignment, reordering, Act metadata, page numbers, and page ranges.
3. **Validate** — identify duplicates, gaps, reversed ranges, uncertain headings, conflicting assignments, and remaining unassigned text.
4. **Preview and import** — show the resulting outline and change summary before creating a new official version.

An optional **Ask AI to propose mappings** action may populate suggestions. Suggestions carry visible AI provenance and remain editable. Manual mapping is always available.

The wizard supports Back, Save draft, Cancel, and Restore original source. Canceling or closing with changes prompts the user before discarding the temporary mapping.

## AI Treatment review

AI Treatment is distinct from input parsing and mapping. It begins only from the user-approved source and treatment choice.

The generated result opens as an editable proposal beside the current official outline. The comparison identifies additions, removals, rewrites, and reordered material. The user can edit the proposal before promotion.

Actions:

- **Make official** — snapshots the current official outline and promotes the reviewed proposal;
- **Keep as alternate version**;
- **Regenerate**;
- **Cancel**.

The AI result never silently overwrites the official outline.

## Format guide and templates

The outline editor exposes local links for:

- **Format guide**;
- **Download `.txt` template**;
- **Download `.md` template**;
- **Paste settings**.

Both templates demonstrate:

- optional Title and Premise;
- optional Acts;
- `Act III — Name` and equivalent supported separators;
- individual page beats;
- page ranges;
- Notes;
- intentionally unassigned prose;
- a reminder that ordinary prose is accepted and can be assigned during review.

The guide distinguishes accepted input from required input. Acts are explicitly optional.

## Guidance, tooltips, and first-use help

Every non-obvious control receives a concise tooltip available on pointer hover and keyboard focus. Tooltips explain the action, not implementation terminology.

The first ambiguous paste may also show contextual onboarding callouts explaining:

- why Paste Review opened;
- that the original is preserved;
- what Unassigned Text means;
- how manual assignment works;
- that nothing changes until Apply.

Each onboarding callout includes **Don't show these tips again** and a normal dismiss action. Dismissal is persisted. Users can re-enable the guidance through both **Paste settings** and application Settings. Essential warnings, validation errors, button labels, and accessible descriptions must never exist only in a tooltip or dismissible callout.

## Preferences and discoverability

Preferences appear beneath the outline field through **Paste settings** and in the application Settings area. Both surfaces edit the same persisted values:

- paste review frequency: Always, Only when needed (default), Never interrupt;
- AI classification: Off (default), Suggest, Automatically classify with review;
- first-use guidance: On by default, dismissible and restorable.

The local surface prevents Settings discoverability from becoming a prerequisite. The global surface makes preferences predictable and recoverable.

## Feedback and error states

Use task-oriented messages rather than raw parser errors:

- `68 page beats and 3 Acts recognized.`
- `Two passages need your attention. Nothing has been discarded.`
- `Pages 22–24 appear twice.`
- `No page numbers were found. Keep this as unstructured source or assign sections.`
- `Your official outline has not changed.`

Required states include idle, analyzing, recognized, needs review, AI suggestions loading, AI unavailable, validation warning, blocking validation error, applying, success, save failure, empty input, and permission/lock conflict. An AI failure leaves deterministic results and manual assignment fully usable.

## Undo, recovery, and persistence

- Preserve the current official outline before every Apply or Make official action.
- Expose an immediate undo action after success.
- Keep prior outline versions accessible through the existing recovery/version path.
- Preserve temporary wizard progress when the user deliberately selects Save draft.
- Never allow a failed save to clear the preserved input or current review.
- Synchronize the AI source only from an approved applied result, not from an unreviewed parser or AI proposal.

## Accessibility and responsive behavior

- All assignment, preference, wizard, and dialog controls use native semantics and complete accessible names.
- Tooltips work on hover and keyboard focus; their content is available to assistive technology.
- Status changes use appropriate live announcements without repeatedly reading the full outline.
- Focus moves to the review heading when opened and returns to the paste field when canceled.
- Escape closes a non-saving overlay after warning about unsaved mapping changes where needed.
- Applying requires an explicit button action; no single-key shortcut may cause an accidental save.
- Native tab order and visible focus are preserved.
- On narrow screens, source and mapping panels stack without horizontal page scrolling.
- Passage selection and assignment do not rely on color alone.

## Acceptance criteria

1. No pasted or imported text can disappear without appearing in the preserved source or an explicit user-approved removal.
2. Ambiguous input opens review under the default preference.
3. Users can manually assign all unassigned text with AI disabled or unavailable.
4. AI suggestions are optional, visibly attributed, editable, and never applied automatically to the official outline.
5. Applying creates a recoverable previous version and supplies immediate undo.
6. Simple Workflow stays focused; Advanced Tools provides the complete mapping wizard.
7. AI Treatment provides editable comparison before promotion.
8. `.txt` and `.md` templates and a format guide are available beside the editor.
9. Local and global preferences remain synchronized and persisted.
10. First-use callouts can be dismissed permanently and restored; essential information remains available without them.
11. Keyboard, screen-reader, responsive, loading, empty, success, error, and locked-source behaviors are verified.

## Verification strategy

### Parser and diagnostic tests

- supported headings and separators, including Roman numerals and ASCII/Unicode dashes;
- prose-only and mixed-format pastes;
- multiline Acts and summaries;
- numbered pages, page ranges, duplicates, gaps, and reordered pages;
- preservation of whitespace and every unassigned passage;
- large outlines;
- deterministic provenance and review-required decisions.

### Simple Workflow tests

- default review-only-when-needed behavior;
- Always and Never interrupt preferences;
- individual and bulk manual assignment with AI off;
- Act/page metadata prompts;
- cancel, restore original, keep unstructured, apply, undo, and save failure;
- AI unavailable fallback;
- local/global preference synchronization;
- tooltip focus behavior and dismiss/restore guidance.

### Advanced Tools tests

- paste and `.txt` / `.md` parity;
- wizard navigation and draft preservation;
- manual and AI-proposed mapping;
- validation and preview;
- close-with-unsaved-changes warning;
- rollback after import.

### AI Treatment tests

- visible comparison and editable proposal;
- make official, alternate version, regenerate, cancel, failure, and undo;
- no official-outline mutation before promotion.

### QA gates

- focused unit/component tests after each implementation pass;
- Writer regression suite;
- build and scoped lint;
- keyboard and responsive browser QA;
- signed-in end-to-end paste, import, AI suggestion, AI treatment, rollback, reload, and live-deployment smoke checks.

## Out of scope

- `.docx` generation or import;
- Final Draft, Fountain, or screenplay-specific import;
- AI rewriting during Paste Review;
- automatic deletion of unrecognized or allegedly irrelevant text;
- making Acts mandatory.

## Implementation boundary

This document defines approved product behavior only. The implementation plan must split work into test-driven passes with scoped smoke tests, rollback notes, midpoint QA, regression coverage, final ReAct/QA/UI-UX audits, and deployment verification. Production code changes begin only after the user reviews this specification and approves the subsequent implementation plan.
