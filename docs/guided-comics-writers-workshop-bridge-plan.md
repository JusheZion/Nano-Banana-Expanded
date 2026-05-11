# Guided Comics / Writers Workshop Bridge Plan

Date: 2026-05-11

## Decision

Guided Comics should not rebuild a weaker, parallel Writers Workshop inside the Comic Portal.

Writers Workshop remains the primary writing engine for:

- outline generation and refinement
- page-count and pacing revision
- page beat generation
- dialogue drafting
- saved writer issue data and exports

Guided Comics becomes the bridge from writing to comic production:

- mapping narrative structure to comic pages
- mapping page beats to panel beats
- mapping story intent to visual references
- mapping panel beats to image generation prompts
- mapping narrative pacing to layout choices
- handing exact page geometry, images, and metadata to Advanced Comics Studio

## Product Principle

Use Guided Comics for accessible creative assembly and visual storytelling.

Use Writers Workshop for deeper writing, outline, pacing, beat, and dialogue work.

Use Advanced Comics Studio for power-user composition, custom shapes, lettering, overlays, masks, balloons, and export polish.

The three systems should feel connected, not duplicated.

## Target Guided Comics Structure

### Step 2A - Story Foundation

Purpose: capture rough creative intent only.

Fields:

- premise
- setting
- characters
- conflict
- ending goal

AI role:

- co-writer
- expander
- possibility generator

Allowed actions:

- expand premise
- generate possible conflicts
- suggest character dynamics
- generate story foundation

Do not run pacing critique here.

### Step 2B - Outline

Purpose: generate or edit actual structural story beats, preferably through Writers Workshop outline systems.

Expected bridge behavior:

- create or select a Writers Workshop issue when the user wants full writing power
- call the existing `outline_issue` writer-tools mode where possible
- show AI suggestions side-by-side with the user draft
- import accepted outline beats back into Guided Comics only as a bridge artifact

Guided Comics should avoid becoming the long-term outline editor if Writers Workshop already has the stronger editor.

### Step 2C - Page Planning

Purpose: decide intended page count and pacing before visual planning.

Expected bridge behavior:

- use Writers Workshop pacing/page-count revision logic where possible
- surface page-count recommendations as optional editorial assistance
- allow compress/expand/rebalance suggestions before generating comic pages
- keep the tone collaborative, not evaluative

Guided Comics output:

- target comic page count
- page summary rows
- pacing notes mapped to page planning decisions

### Step 2D - Page Beats

Purpose: convert accepted outline/page plan into page beats and panel-ready story units.

Expected bridge behavior:

- use Writers Workshop page beat generation systems where possible
- attach generated page beats directly to Guided Comic page cards
- preserve user-selected page and panel counts
- treat page beats as the source for panel beats, image prompts, and layout intent

Guided Comics output:

- page cards
- panel beats
- page/panel narrative metadata
- visual prompt seeds

### Step 2E - Dialogue

Purpose: draft/edit dialogue using Writers Workshop strength, then associate relevant text with comic pages or panels.

Expected bridge behavior:

- use Writers Workshop dialogue generation systems where possible
- optionally attach dialogue to pages or panels
- keep lettering and final balloon placement in Advanced Comics Studio

Guided Comics output:

- page dialogue notes
- panel dialogue candidates
- optional balloon text seed metadata for Advanced Studio

## System Mapping

| Need | Primary System | Guided Comics Role |
| --- | --- | --- |
| Rough idea intake | Guided Comics | Capture accessible starting point |
| Full outline generation | Writers Workshop | Trigger, preview, import accepted beats |
| Outline refinement | Writers Workshop | Link out or sync accepted revisions |
| Page count and pacing | Writers Workshop | Translate recommendations into page plan options |
| Page beats | Writers Workshop | Attach beats to page cards and panels |
| Dialogue | Writers Workshop | Associate dialogue candidates with pages/panels |
| Visual references | Guided Comics / Vault | Prepare references for image generation |
| Panel art prompts | Guided Comics / Imageshop | Convert beats and references to image prompts |
| Layout | Guided Comics | Start layout from narrative/panel intent |
| Advanced composition | Advanced Studio | Final custom shapes, balloons, overlays, masks, polish |

## Implementation Direction

## Implementation Status

- Phase 1 is implemented in the current Guided Comic Step 2 UX direction: story intake is separated from outline generation/readiness review, and pacing language is softened until structure exists.
- Phase 2 is implemented as a tested bridge contract in `src/portals/guided-comic/writersWorkshopBridge.ts`.
- The bridge contract currently covers Guided story foundation, Writers Workshop issue metadata, Writers Workshop outline JSON, Writers Workshop page beats JSON, Writers Workshop dialogue text, and Guided page card/panel beat outputs.
- Phase 3 is implemented as an explicit Guided Comics bridge panel: users can continue locally, load/select/link existing Writer issues, create a linked Writer issue from the Guided story foundation, open the linked issue in Writers Workshop, and import latest outline/page beats/dialogue from the linked issue.
- Phase 4 is implemented as direct linked-issue writer-tools actions inside Guided Comics. When a linked Writer issue exists, Guided can trigger outline generation, pacing review, page-beat generation, and selected-page dialogue drafting through the same Writers Workshop modes.
- Phase 5 remains the next implementation boundary: make Guided Comics the visual storytelling bridge from accepted story structure into page cards, panel beats, reference needs, image prompts, layout intent, and Advanced Studio-ready metadata.

### Phase 1 - Stop Duplicating the Writing Workflow

- Keep Step 2 story intake lightweight.
- Remove or hide early pacing/readiness pressure until structure exists.
- Rename any writing controls that imply Guided Comics is the full outline editor.
- Add explicit copy that Writers Workshop is the deeper writing workspace.

### Phase 2 - Add a Writers Workshop Bridge Contract

Create a typed adapter that can convert between:

- Guided Comic story foundation
- Writers Workshop issue metadata
- Writers Workshop outline JSON
- Writers Workshop page beats JSON
- Writers Workshop dialogue text
- Guided Comic page cards and panel beats

The adapter should be shared/tested and should not require Advanced Studio changes.

### Phase 3 - Link or Create Writer Issues from Guided Comics

Guided Comics should support:

- select existing Writers Workshop issue
- create writer issue from Guided story foundation
- open linked issue in Writers Workshop
- import latest outline/page beats/dialogue from linked issue

This should be additive and local-first until the user chooses to connect a Writers Workshop issue. Guided Comics must not silently auto-create a Writers Workshop issue.

The bridge should be prominently offered once the user:

- generates an outline
- requests pacing review
- requests page beats
- requests dialogue generation
- wants long-term narrative persistence or export

Writers Workshop should feel like a connected power-up, not a required detour.

### Phase 4 - Reuse Writer Tools Actions

Prefer existing writer-tools modes:

- `outline_issue`
- `page_beats`
- `page_beats_issue`
- `draft_dialogue`
- `pacing_review`

Guided Comics should call the same underlying writer-tools modes directly whenever possible so normal comic creation does not require repeated portal switching.

Writers Workshop remains available as:

- a deeper editing workspace
- a narrative management workspace
- an advanced writing refinement workspace

Use `guided_comic_assist` only for bridge-specific tasks:

- mapping outline beats to comic pages
- mapping page beats to panels
- recommending visual reference needs
- recommending layout intent
- translating story structure into image/panel composition prompts

### Phase 5 - Make Guided Comics the Visual Storytelling Bridge

Guided Comics should focus on:

- page cards from accepted story structure
- panel density and beat-to-panel mapping
- visual prep rows from story/page data
- panel art prompts
- layout intent from narrative importance
- handoff to Advanced Studio with exact geometry/images/metadata

## UX Guardrails

- Do not make Guided Comics feel like it is grading the user.
- Do not show pacing/readiness critique before an outline or page plan exists.
- Avoid "Ready" / "Gap" badge language in early creative phases.
- Prefer language like:
  - story structure progress
  - outline development
  - narrative signals detected
  - story pacing assistant
  - optional editorial notes
- Make Writers Workshop feel like a connected power-up, not a detour.
- Keep the user in Guided Comics when their goal is visual production.
- Offer escape hatches to Writers Workshop and Advanced Studio without forcing either.

## Answered Product Decisions

### Writer issue creation

Do not auto-create a Writers Workshop issue silently.

Guided Comics should remain usable standalone/local-first for beginners. Offer the Writers Workshop bridge prominently at natural escalation points, especially outline generation, pacing review, page beats, dialogue generation, long-term narrative persistence, and export.

### Persistent writer issue link

Store a persistent optional `writerIssueId` inside Guided Comics draft/library snapshots.

Do not fully merge Guided Comics local draft state and Writers Workshop issue state into one shared mutable object initially.

Instead:

- keep separate source-of-truth domains
- sync through a tested bridge adapter
- support import/export/update flows
- preserve local-first Guided Comic behavior without Writers Workshop connectivity

Reason: the workflows have different responsibilities and mutation patterns. A loose bridge is safer than premature full state unification.

### Dialogue handoff

Accepted Writers Workshop dialogue should become:

1. panel/page narrative metadata
2. optional Advanced Studio balloon seed metadata

Final lettering, balloon layout, tail placement, and cinematic composition remain Advanced Studio responsibilities.

Guided Comics should suggest dialogue placement contextually, not finalize comic lettering automatically.

### Page beat generation

Guided Comics should call the same underlying writer-tools modes directly whenever possible.

The user should remain inside a unified Guided workflow for:

- outline generation
- pacing refinement
- page planning
- page beat generation
- dialogue drafting

Writers Workshop should remain available as the deeper editing, narrative management, and advanced writing refinement workspace.

### Local-first database requirements

Guided Comics should support a local-first beginner workflow with minimal required writer database state.

A beginner should be able to:

- enter a premise
- generate an outline
- generate page beats
- generate dialogue
- create comic pages
- experiment locally

They should not need to understand Writers Workshop issue persistence to start creating.

Persistent writer database state should become additive when users want:

- long-term story management
- cross-project narrative continuity
- advanced outline editing
- exports
- issue libraries
- collaboration/sync
- deeper Writers Workshop workflows

The bridge should progressively enhance the experience rather than block local creative flow.

## Recommended Next Step

Begin Phase 5 with the visual storytelling bridge:

- turn accepted outline/page beat/dialogue data into richer Guided page and panel metadata
- surface dialogue seeds as editable page/panel suggestions before Advanced Studio handoff
- derive visual reference needs from story/page data
- generate panel art prompt inputs from accepted beats, dialogue context, and references
- preserve the exact Guided geometry/images/metadata handoff into Advanced Studio
- keep Advanced Studio as the power-user refinement path for lettering, custom shapes, overlays, masks, and export polish
