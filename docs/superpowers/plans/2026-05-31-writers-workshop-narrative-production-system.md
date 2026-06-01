# Writers Workshop Narrative Production System Plan

Status date: 2026-05-31

Use this checklist after each Writers Workshop pass so the implementation state stays aligned with the product plan.

## Plan

Writers Workshop is being retooled from a generic AI writing dashboard into a structured Narrative Production System. The workflow should prioritize author-controlled source material, canon/lore grounding, hierarchical planning, pacing management, and production-ready outputs for books, comics, screenplays, lore systems, multi-book arcs, shared-universe storytelling, and Guided Comics handoff.

The visible flow should become:

1. Project foundation: medium, scope, production defaults.
2. Author source: synopsis helper and user-provided outline intake.
3. Canon gate: lore, visual facts, world rules, pre-lore entry, post-lore check.
4. Structure: generated/editable hierarchy from author source plus canon.
5. Beats: nested production beats by medium.
6. Dialogue: page/scene/panel-linked dialogue.
7. Visual prep: comic/image/video/storyboard preparation.
8. Audit: pacing, continuity, emotional arc, character use, worldbuilding density.
9. Cockpit: late-stage comparison, review, and targeted AI assistance.

## Task List

- [x] Reframe the top shell as `Narrative Production System`.
- [x] Add compact production header/status metrics.
- [x] Replace the generic pipeline strip with a production map.
- [x] Move Synopsis before generation-heavy steps.
- [x] Reframe Scripts as `Synopsis helper`.
- [x] Reframe Lore as `Canon gate`.
- [x] Add pre-lore intake guidance.
- [x] Add post-lore canon check entry point.
- [x] Add AI missing-lore suggestions using existing `idea_assist`.
- [x] Move Cockpit to the end of the flow.
- [x] Address the outline confusion.
  - Current state: Synopsis helper now includes a first-class "Author outline intake" area stored separately from issue synopsis under `notes.author_outline`.
  - Current state: Outline generation reads `notes.author_outline` and instructs AI to preserve, structure, or expand the user's source outline instead of inventing a replacement story.
- [x] Add pacing recommendation apply path.
  - Current state: Arc length recommendation can stage a pacing plan, update the target, create/trim affected page rows, select affected pages, optionally regenerate the outline, and preview queued affected pages before explicit beat/dialogue regeneration.
  - Current state: Arc now includes a preview-only pacing regeneration path that asks `writer-tools` for proposed page-beat/dialogue replacements, shows current vs proposed content, and only saves accepted proposals.
- [x] Add Foundation Hub fields for primary medium type.
- [x] Add Foundation Hub fields for narrative scope.
- [x] Persist production defaults in existing writer notes/metadata before schema expansion.
- [x] Add comic/book/video/wiki-specific defaults for panel density, art style, character consistency, strict canon, and output format.
  - Current state: medium type, narrative scope, comic panel density, art style, character consistency, strict canon, no-video-assumptions, and preferred output format save through `notes.production_defaults`.
- [x] Inject production defaults into outline, page-beat, dialogue, shot/visual, and export prompts.
- [x] Add hierarchical structure support: arc -> book/issue/episode -> chapter/page/scene -> beat.
  - Current state: `notes.hierarchy_tree` stores normalized hierarchy nodes with import helpers and a saved tree preview in Synopsis helper.
- [x] Add user-controlled outline import/upload/paste flow with editable hierarchy.
  - Current state: `.txt`, `.md`, and JSON can be pasted or file-imported, normalized, saved, and previewed as a hierarchy tree.
- [x] Add dynamic beat editing: insert, remove, merge, split, reorder, regenerate selected.
  - Current state: the Beats JSON editor can insert, remove, merge, split, and move panel beats while preserving page-level metadata; selected-page regeneration remains the existing `Generate page beats` action.
- [x] Expand audit modes: continuity, emotional arc, character utilization, worldbuilding density.
  - Current state: schemas/prompts now accept emotional arc, character utilization, and worldbuilding density branches, and Arc exposes readable readiness/summary cards for each audit mode.
- [x] Add production branches for visual prep, dialogue, exports, and Guided Comics handoff.
  - Current state: Video workspace exposes readiness-aware branch cards with direct actions for visual prep, dialogue, issue-pack exports, markdown export, and Guided Comics handoff JSON export.
- [~] Reduce ribbon/workspace density after the core flow is stable.
  - Current state: secondary production routes are grouped under branch/audit cards, but full ribbon compaction is still a later polish task.
- [x] Run authenticated in-app browser QA after each visible UI pass.

## Current Pass Notes

- The outline placement issue is functionally solved for paste/draft workflows: users now have a named source-outline area and can choose whether AI should preserve, structure, or expand it.
- Outline import now supports paste and `.txt` / `.md` / JSON file import into a saved hierarchy tree.
- Pacing automation must remain confirmable when it deletes or overwrites saved page rows, beats, or dialogue.
- Pacing apply still avoids silently rewriting existing dialogue or page beats. It stages affected pages, previews their current saved beat/dialogue state, and requires explicit beat/dialogue regeneration.
- Foundation Hub production defaults now persist without schema changes through existing series/issue notes metadata; issue defaults override series defaults.
- Generation calls now send production defaults to outline, page beats, dialogue, and shot/visual planning, while issue-pack exports include the resolved defaults and preferred output format.
- Preferred output format now drives a primary preferred-export action in production branches and Scripts exports while preserving all explicit download buttons.
- Page-beat generation now requires page-level `characters`, `locations`, and `art_style`, grounded in outline/synopsis/cast/location/lore source material with empty arrays when source material does not name a value.
- Pass 2 branch hardening added explicit issue-pack markdown and `writer-guided-comics-handoff.json` exports so production branches produce portable artifacts, not just navigation cues.
- The saved hierarchy tree is now editable in place with title/kind edits, sibling move controls, delete, reset, and explicit save back to `notes.hierarchy_tree`.
- `writer-tools` was deployed after adding preview-only pacing regeneration; hosted `writer-tools` is active at version 46, updated `2026-06-01 05:45:41 UTC`.
- Signed-in browser QA verified live `outline_issue`, `page_beats`, `draft_dialogue`, `plan_shots_from_issue`, `pacing_review`, and `pacing_regeneration_preview` calls against a temporary `Codex Live AI Verification` issue, then deleted the temporary issue.
- Authenticated browser QA also verified the preferred-export button, hierarchy import/edit controls, screenshot capture, DOM inspection, and console log checks with no captured console errors.
