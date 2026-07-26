# Writers' Workshop

Canonical product language for story development, revision review, and promotion of approved work in Writers' Workshop.

## Language

**Pacing Review**:
A diagnostic assessment of an issue's pacing that identifies risks and opportunities without changing story content.
_Avoid_: Pacing update, automatic rewrite

**Pacing Revision Set**:
A user-requested collection of proposed pacing changes generated after a Pacing Review. It remains separate from live story content until the user approves changes.
_Avoid_: Automatic update, regeneration result

**Create Revision Set**:
The explicit action that turns a saved Pacing Review into a Pacing Revision Set. Running a Pacing Review alone never creates or applies story changes.
_Avoid_: Auto-apply, automatic cascade

**Revision Item**:
A reviewable pacing recommendation organized around one editorial intent. It contains the related Outline, Page Beat, and Dialogue Child Changes needed to realize that intent.
_Avoid_: Suggestion row, AI result

**Child Change**:
One proposed change to a specific Live Story layer within a Revision Item. A Child Change can be edited, approved, or rejected independently.
_Avoid_: Patch, subtask

**AI Proposal**:
The original candidate content generated for a Child Change. It remains immutable so the user can compare or restore it after editing.
_Avoid_: Draft, current proposal

**Edited Candidate**:
The user's editable version of an AI Proposal. It becomes the candidate applied to the Live Story when its Child Change is approved.
_Avoid_: Overwritten proposal, manual patch

**Dependency Warning**:
A notice that independently selected Child Changes no longer form a coherent cross-layer revision. It informs the user without silently changing their decisions.
_Avoid_: Validation error, forced selection

**Live Story**:
The currently approved Outline, Page Beats, and Dialogue used by the production workflow.
_Avoid_: Current JSON, generated output
