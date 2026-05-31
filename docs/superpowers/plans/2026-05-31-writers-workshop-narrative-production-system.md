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
  - Remaining work: add file upload/import and editable hierarchy controls.
- [~] Add pacing recommendation apply path.
  - Current state: Arc length recommendation can stage a pacing plan, update the target, create/trim affected page rows, select affected pages, and optionally regenerate the outline.
  - Remaining work: add a safer downstream regeneration wizard for affected page beats/dialogue, with preview/diff before overwriting existing page content.
- [x] Add Foundation Hub fields for primary medium type.
- [x] Add Foundation Hub fields for narrative scope.
- [x] Persist production defaults in existing writer notes/metadata before schema expansion.
- [x] Add comic/book/video/wiki-specific defaults for panel density, art style, character consistency, strict canon, and output format.
  - Current state: medium type, narrative scope, comic panel density, art style, character consistency, strict canon, no-video-assumptions, and preferred output format save through `notes.production_defaults`.
- [x] Inject production defaults into outline, page-beat, dialogue, shot/visual, and export prompts.
- [ ] Add hierarchical structure support: arc -> book/issue/episode -> chapter/page/scene -> beat.
- [~] Add user-controlled outline import/upload/paste flow with editable hierarchy.
  - Current state: paste/save flow exists.
  - Remaining work: file upload/import plus editable hierarchy tree.
- [ ] Add dynamic beat editing: insert, remove, merge, split, reorder, regenerate selected.
- [ ] Expand audit modes: continuity, emotional arc, character utilization, worldbuilding density.
- [ ] Add production branches for visual prep, dialogue, exports, and Guided Comics handoff.
- [ ] Reduce ribbon/workspace density after the core flow is stable.
- [ ] Run authenticated in-app browser QA after each visible UI pass.

## Current Pass Notes

- The outline placement issue is functionally solved for paste/draft workflows: users now have a named source-outline area and can choose whether AI should preserve, structure, or expand it.
- Full outline import remains pending until file upload/import and hierarchy-tree editing are added.
- Pacing automation must remain confirmable when it deletes or overwrites saved page rows, beats, or dialogue.
- The first pacing-apply slice intentionally avoids silently rewriting existing dialogue or page beats. It stages affected pages for follow-up regeneration after outline changes.
- Foundation Hub production defaults now persist without schema changes through existing series/issue notes metadata; issue defaults override series defaults.
- Generation calls now send production defaults to outline, page beats, dialogue, and shot/visual planning, while issue-pack exports include the resolved defaults and preferred output format.
