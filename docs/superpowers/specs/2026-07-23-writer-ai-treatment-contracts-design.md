# Writer AI Treatment Contracts Design

**Date:** 2026-07-23  
**Status:** Approved design  
**Scope:** Writers' Workshop AI Treatment behavior, validation, review, recovery, and release evidence

## Problem

The three AI Treatment choices currently behave as prompt variations rather than enforceable transformation contracts. In production use, **Keep My Order** and **Organize and Polish** produced nearly identical results, including deletion and rewriting of source beats. Their labels promise preservation that the application does not validate.

The correction must make each treatment materially distinct and prevent an AI result from becoming official when it violates the selected treatment.

## Product principles

1. Source beats are author-owned story requirements.
2. Treatment labels describe enforceable behavior, not suggestions to the AI.
3. Every source beat remains traceable through structural and creative treatments.
4. Simple Workflow provides safe automation within explicit limits.
5. Advanced Workflow exposes consequential changes for individual review.
6. The target page count is a pacing target for structural/creative modes, not a rigid ceiling.
7. No AI proposal changes the official outline until explicit promotion.
8. Validation, persistence, reload, and Undo must be proven independently.

## Treatment contracts

### Keep My Order

- Preserve source beat identity, count, order, and page assignments.
- Preserve named characters, actions, events, causality, and outcomes.
- Permit grammar, spelling, punctuation, clarity, word choice, paragraphing, and sentence-formatting changes.
- Do not add, remove, combine, split, relocate, or renumber beats.
- Retain original wording when a proposed edit would change meaning.
- Preserve the total page count.

### Organize and Polish

- Preserve every source beat through a traceable source-to-result mapping.
- Permit reordering, page redistribution, elaboration, and combining related beats.
- Permit new connective beats when pacing requires them.
- Do not remove an event, character action, causal link, or outcome.
- Permit a page-count change of approximately ±10% from the detected source page count, bounded by application limits.
- In Simple Workflow, accept combinations automatically only when all source content remains represented.
- In Advanced Workflow, expose combinations and reorderings for individual approval.

### Expand Creatively

- Preserve every source event and outcome through traceable mapping.
- Permit substantial enhancement within existing beats.
- Permit new scenes, transitions, escalation, staging, and connective material.
- Distinguish original, enhanced, and newly added material.
- Permit a page-count change of approximately ±20% from the detected source page count, bounded by application limits.
- In Simple Workflow, accept contract-valid enhancements automatically.
- In Advanced Workflow, require individual approval for additions and substantial rewrites.

### Page-count escalation

Changes beyond a treatment's permitted tolerance are not silently applied. They become pacing-review recommendations because they indicate that a larger story revision may be required.

## Enforcement architecture

### Stable source identity

Normalize the approved source outline into beats with stable identifiers before requesting treatment. Stable IDs must not depend solely on mutable wording.

### Treatment response

The AI response contains:

- the proposed outline;
- a treatment manifest;
- the source beat ID represented by each resulting beat;
- change type: `unchanged`, `language_polished`, `moved`, `combined`, `enhanced`, or `added`;
- original and proposed page assignments;
- a concise rationale for structural or creative changes.

New beats use a distinct added-material identity and cannot impersonate source beats.

### Deterministic validation

A deterministic validator enforces the selected contract:

- **Keep My Order:** one-to-one mapping, identical order, beat count, and page assignments;
- **Organize and Polish:** complete source coverage, permitted combinations/reordering, and page change within ±10%;
- **Expand Creatively:** complete source-event/outcome coverage, permitted enhancements/additions, and page change within ±20%.

Promotion is blocked for:

- missing or unknown source IDs;
- duplicate mappings that violate the selected mode;
- unexplained source removal;
- forbidden additions, combinations, movement, or renumbering;
- out-of-tolerance page counts;
- malformed outline or manifest data.

The validator, not the AI, determines whether the proposal honors the contract.

## User experience

### Shared treatment controls

Each treatment choice presents a concise statement of what AI may and may not change. The controls use the same contract definitions in Simple and Advanced Workflow so labels and execution cannot drift.

### Simple Workflow

Before generation, show the selected contract. After generation, show a concise preservation report:

> 48 beats preserved · 4 combined · 3 added · pages changed from 52 to 56

Actions:

- **Review details**
- **Make official**
- **Regenerate**
- **Cancel**

**Make official** remains disabled while source beats are missing or page-count tolerance is exceeded.

### Advanced Workflow

Present source and proposal side by side with filters for:

- Reordered
- Combined
- Enhanced
- Added
- Needs attention

Show the source-to-result mapping for every beat. Users may approve or reject individual combinations, reorderings, additions, and substantial enhancements. Rejection restores the relevant source beat or removes an added beat, then reruns validation.

### Error and recovery behavior

- AI, schema, or validation failure leaves source and official outline unchanged.
- Unmapped source beats are blocking errors.
- Out-of-tolerance page changes become pacing recommendations.
- Regeneration preserves treatment choice and user constraints.
- Promotion creates a new official version with immediate Undo.
- The treatment manifest is stored with the promoted version.
- Cancel, failure, and rejected promotion create no official version.

## Data flow

1. Load the user-approved source outline.
2. Normalize it into stable source beats.
3. Calculate source page count and treatment tolerance.
4. Send source beats, contract, page range, and user constraints to AI.
5. Parse the proposed outline and manifest through a bounded schema.
6. Run deterministic contract validation.
7. Render the preservation summary and review interface.
8. Apply Advanced approvals/rejections and revalidate.
9. Promote only a valid proposal.
10. Snapshot the previous official version, store the proposal and manifest, synchronize the approved source, and expose Undo.
11. Reload and verify the stored version and manifest.

## QA and release standard

### Contract fixture

Use one representative populated outline across all modes. It includes:

- named events and causal dependencies;
- a missing page label within an otherwise sequential outline;
- dense and sparse pages;
- related beats eligible for combination;
- character names that must not change;
- an outcome that must survive every treatment.

### Automated contract tests

- Keep My Order rejects deletion, addition, combination, movement, renumbering, and meaning changes.
- Organize and Polish requires complete mapping and enforces ±10%.
- Expand Creatively requires original event/outcome coverage and enforces ±20%.
- The three modes produce materially different permitted transformations.
- Malformed, incomplete, unknown, and duplicate mappings are rejected.
- Removing one source mapping blocks promotion.
- Rejecting an Advanced change restores source material and revalidates.
- Cancel and AI failure create no official version.
- Promotion and Undo survive reload.

### End-to-end browser regression

Begin with a populated official outline:

1. Generate each treatment.
2. Compare the visible preservation summary with the source.
3. Reject one Advanced combination and one addition.
4. Promote a valid proposal.
5. Reload and confirm beats, ordering, page count, manifest, and version history.
6. Undo, reload, and confirm exact restoration.
7. Clean up disposable records.

### Release evidence

Report these independently:

- UI rendered;
- treatment request succeeded;
- contract validation succeeded;
- promotion succeeded;
- persistence survived reload;
- Undo survived reload;
- production smoke used representative existing data.

A blocked layer remains incomplete and cannot be replaced with evidence from another layer.

## Settings-page boundary

Application-wide Writer preferences are a separate future design and implementation plan. This treatment work should centralize contract definitions and defaults so they can later be exposed through Settings without redesigning the treatment model.

Current defaults:

- Keep My Order: language plus formatting;
- Organize and Polish: traceable combining in Simple, per-change review in Advanced;
- Expand Creatively: substantial enhancement plus additions in Simple, per-change review in Advanced;
- page flexibility: ±10% for Organize and Polish, ±20% for Expand Creatively.

## Acceptance criteria

1. Treatment labels and runtime enforcement share one contract definition.
2. Keep My Order cannot change story structure or page assignments.
3. Organize and Polish preserves every source beat while permitting traceable restructuring.
4. Expand Creatively preserves every source event/outcome while permitting substantial enhancement and additions.
5. Page-count flexibility follows the approved mode tolerances.
6. Simple Workflow safely automates only contract-valid changes.
7. Advanced Workflow supports individual approval and rejection.
8. Invalid proposals cannot become official.
9. Promotion, reload persistence, and Undo are verified with populated data.
10. The treatment manifest remains available with the promoted version.

