# Writer AI Treatment Patch Model Design

**Date:** 2026-07-23  
**Status:** Implemented locally; production verification pending

## Problem

The current Outline AI Treatment asks Gemini to return a complete replacement outline. On a 70-beat source, Gemini returned only eight late-story beats. Deterministic normalization then appended the omitted source beats after those eight and renumbered the result. Structural bookkeeping passed even though the story was rotated, one ending beat was omitted semantically, and another event was duplicated.

The full-replacement contract is unsafe because incomplete model output must never determine where unchanged source material is restored.

## Goal

Make AI Treatment additive and patch-based. The application owns the complete source outline and its order. AI may propose explicit operations against that source, but it may not replace the source wholesale.

## Core Contract

1. Begin every preview from an immutable copy of the complete source outline.
2. Gemini returns a compact ordered list of operations, not a replacement `page_beats` array.
3. Unmentioned source beats remain unchanged and in their original relative positions.
4. Every operation must reference valid source beat IDs and include an explanation.
5. Invalid operations are rejected without affecting valid operations or untouched source beats. An edit whose proposed wording has no recognizable continuity with the selected source event is invalid even when its source ID exists.
6. The deterministic engine applies accepted operations, assigns sequential page numbers, derives the manifest, and validates the final proposal.
7. Preview remains non-mutating until the user explicitly selects **Make official**.

## Patch Operations

### Edit

- Targets exactly one source beat.
- May change language, formatting, scene wording, or emotional-turn wording.
- Must preserve the source event and outcome.
- Used by all three treatment modes within their permissions.

### Move

- Targets exactly one source beat.
- Specifies placement before or after another valid source beat ID.
- Available to **Organize and Polish** and **Expand Creatively**.
- A move changes position only; it must not silently rewrite or delete the beat.

### Combine

- Targets two or more source beat IDs.
- Replaces those source beats with one proposed beat at the earliest affected position unless an explicit valid placement is supplied.
- Available to **Organize and Polish** and **Expand Creatively**.
- Each source beat may be consumed by only one combine operation.

### Add

- Uses no source beat IDs.
- Specifies placement before or after a valid source beat ID.
- Available only where the selected treatment contract permits additions.
- Must be identified as new connective or creative material.

## Treatment Permissions

### Keep My Order

- Allows `edit` only.
- Preserves beat count, order, events, outcomes, and page positions.

### Organize and Polish

- Allows `edit`, `move`, `combine`, and narrowly connective `add` operations.
- Preserves every original event and outcome.
- Final page count remains within the approved 10% range.

### Expand Creatively

- Allows all patch operations.
- Preserves every original event and outcome while permitting explicit enhancements and additions.
- Final page count remains within the approved 20% range.

## Deterministic Application

The application will:

1. Validate operation shape and mode permission.
2. Reject unknown, duplicate, self-referential, conflicting, or already-consumed source references.
3. Apply edits without changing position.
4. Apply combinations without leaving duplicate source beats behind.
5. Apply moves using explicit anchors.
6. Apply additions using explicit anchors.
7. Retain every untouched source beat in its original relative position.
8. Renumber the final proposal sequentially.
9. Derive the treatment manifest from applied operations.
10. Reject the preview if page-range or exact-once source preservation fails.

The engine must never append omitted source beats as a recovery strategy because omitted source beats were never removed from the deterministic base.

## Semantic Safety

- The AI prompt includes each source ID alongside its text.
- Edit and combine operations return proposed text only for their declared source IDs.
- Deterministic validation checks structural traceability.
- The review interface presents original and proposed text together for every change.
- Advanced workflow permits accepting or rejecting individual operations.
- Simple workflow shows a clear change summary and retains preview/cancel protection.
- A proposal containing suspiciously weak source-to-result correspondence must be blocked or clearly flagged rather than silently promoted.

## Error Handling

- Invalid operation: exclude it and report why.
- Conflicting operations: reject the later conflicting operation.
- Missing or partial model response: retain untouched source beats and show only valid returned changes.
- No valid operations: return an unchanged preview with an explanatory status, not a destructive error.
- Hosted timeout or malformed JSON: preserve the current official outline and provide an actionable retry message.

## Verification

Focused automated coverage must include:

- a 70-beat response containing only eight late-story edits;
- omitted operations leaving the other 62 beats in place;
- invalid source IDs;
- duplicate and conflicting operations;
- move anchors;
- combinations;
- additions;
- each treatment mode’s permissions;
- page-range enforcement;
- sequential numbering;
- title, premise, Acts, and notes preservation;
- cancel leaving the official outline unchanged.

The release gate requires one signed-in production preview using the representative 70-beat source. Verification must compare source and proposal chronology, exact-once coverage, metadata, first and last events, page count, numbering, and cancellation safety.

## Rollback

The existing official-outline history and Undo behavior remain unchanged. If the patch-model deployment fails its live preview, roll back the Edge Function and Cloudflare deployment together; do not re-enable the unsafe omitted-beat append normalization.
