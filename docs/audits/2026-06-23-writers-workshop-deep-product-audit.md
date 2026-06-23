# Writers' Workshop Deep Product UX Audit - 2026-06-23

## Scope

This audit is a corrective deep-dive after the prior Writers' Workshop polish pass. The prior pass improved several labels and controls, but it did not fully address the underlying product problem: the portal is powerful, functional, and dense, yet many user-facing surfaces still expose technical language, mixed responsibilities, redundant panels, unclear action consequences, and empty or advanced boxes in the primary workflow.

This document focuses on the full Writers' Workshop portal as a user-facing creative tool. It does not implement changes. It defines what should be simplified, renamed, split, archived, or explained before further polish work is considered complete.

## Evidence Reviewed

- User screenshot of the live deployed Writers' Workshop Synopsis area showing:
  - clipped Production Map step subtitles;
  - crowded top editing/protection toolbar;
  - author outline controls with unclear `Preserve`, `Structure`, and `Expand` actions;
  - `Hierarchy tree import` and `Saved hierarchy tree` sharing the same page as author outline;
  - technical file/type language such as `.txt`, `.md`, `JSON`, and `NOTES.HIERARCHY_TREE`;
  - a large underused right-side panel;
  - multiple inputs/outputs on one step.
- Live deployed ARCS tab at `https://asset-reference-comics-studio.onyxzion.workers.dev/`.
- `docs/audits/2026-06-23-writers-workshop-ux-audit.md`
- `docs/audits/2026-06-23-user-facing-feature-completeness-inventory.md`
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerSearch.ts`
- `src/portals/writer/writerWorkflowChronology.ts`
- `src/portals/writer/writerHelpRegistry.tsx`
- `src/portals/writer/writerProductionBranches.ts`
- `src/portals/writer/writerHierarchy.ts`
- Two read-only subagent audits:
  - language, affordances, disabled states, and technical/internal labels;
  - workflow order, page boundaries, redundancy, and mixed responsibilities.

## Executive Conclusion

Writers' Workshop is not product-polished yet. It has strong workflow machinery, but the visible experience still asks users to understand too much of the implementation model. The main issue is not that the portal lacks features. The main issue is that too many features are visible at once, and some of the most useful features are buried under technical wording or placed beside unrelated tools.

The safest next phase should be a product audit implementation pass, not a code rewrite. The work should preserve existing data models and generation behavior while changing what the user sees:

- each workflow step should have its own obvious space;
- the primary path should avoid raw `JSON`, `.txt`, `.md`, `notes.*`, metadata, database, and internal id language;
- advanced/raw editors should move behind an explicit advanced surface;
- empty panels should collapse behind prerequisites or become concise next-action cards;
- inputs and outputs should not share one page unless the step is explicitly for review or comparison;
- every visible control should answer: what does this do, what does it affect, and where will the result appear?

## Systemic Findings

### 1. The Workflow Rail Promises More Separation Than The Pages Deliver

`writerWorkflowChronology.ts` defines distinct steps:

- Dashboard
- Choose Story
- Foundation
- Synopsis
- Visual Canon
- Story Canon
- Outline
- Pages
- Beats
- Dialogue
- Imageshop Prep
- Story Review
- Compare & Review
- Export

But several steps map to the same underlying tabs:

- `Foundation`, `Outline`, and `Pages` all route to `outline`.
- `Synopsis` routes to `scripts`, which also contains hierarchy import, helper fields, exports, and saved-output editors.
- `Compare & Review` is a late review tool, but also contains idea generation and append actions.

User impact:

- The left Production Map looks like a guided sequence, but clicking steps can land users in crowded shared workspaces.
- A user cannot easily tell whether they are setting up the story, writing the outline, syncing pages, editing raw output, or preparing exports.
- The screenshot shows exactly this: Synopsis contains author outline input, hierarchy-tree import, saved hierarchy output, and generation contract status in one area.

Recommendation:

- Keep the existing internal ids for safety, but make visible page boundaries real.
- Foundation should own story context and production settings.
- Synopsis / Author Source should own source text only.
- Story Map / Structure Tree should own hierarchy import and saved structure.
- Outline should own generated outline preview/edit and outline generation.
- Pages should own page row sync and page selection readiness.
- Export should be the only full download hub.

### 2. Primary User Surfaces Still Expose Technical Storage Language

Examples found in source and screenshot:

- `notes.author_outline`
- `notes.hierarchy_tree`
- `notes.synopsis_helper`
- `notes.production_defaults`
- `Outline JSON`
- `Beats JSON`
- `Shot plan JSON`
- `Invalid JSON will not save`
- `Empty JSON clears beats`
- `Save outline to database`
- `Issue pack JSON`
- `Handoff JSON`
- `writer_pages`
- `writer_tool_cache`
- `.txt`, `.md`, `JSON structure`
- `metadata on issue notes`
- `page_id`

User impact:

- These labels make normal writing tools feel like database or developer tools.
- Users may avoid useful controls because the copy sounds risky.
- The hierarchy feature may be valuable, but the phrase `Hierarchy tree import` plus `notes.hierarchy_tree` makes it look technical instead of helpful.

Recommendation:

- Replace internal badges with plain labels:
  - `notes.author_outline` -> `Saved with this issue`
  - `notes.hierarchy_tree` -> `Story map`
  - `notes.synopsis_helper` -> `Synopsis helper`
  - `notes.production_defaults` -> `Story settings`
- Move exact storage keys into an `Advanced details` disclosure.
- Rename raw editors as `Advanced data editor`.
- Do not show `JSON`, `database`, `metadata`, or field keys in the primary path unless the user has opened Advanced Tools.

### 3. Action Consequences Are Not Clear Enough

The author outline mode buttons are a good example:

- `Preserve`
- `Structure`
- `Expand`

The title tooltips explain the intent, but the visible labels do not answer the user's main questions:

- Will this overwrite my original?
- Where will the result appear?
- Is this a preview, a mode, or an immediate transformation?
- Does the button change the text box, the generated outline, or the next AI call?

Recommendation:

- Rename the modes:
  - `Preserve` -> `Keep my order`
  - `Structure` -> `Organize into production outline`
  - `Expand` -> `Add missing connective scenes`
- Add visible helper text:
  - `Choose how strictly AI should follow the outline you pasted. This does not change your source text; it affects the next generated issue outline.`
- For every generation/control cluster, add a one-line consequence note:
  - what input is used;
  - what saved item changes;
  - whether it previews or overwrites;
  - where to review the result.

### 4. Inputs And Outputs Are Mixed On Pages That Should Be Single-Purpose

The user specifically called out that the outline is divided across two panels and hard to compare. The code confirms broader mixing:

- The `outline` tab includes story context, production defaults, Visual Canon relocation, outline instructions, page target, outline generation, page sync, latest outline preview, and direct outline editor entry points.
- The `scripts` tab includes author outline intake, generation contract, hierarchy import, saved hierarchy tree, synopsis helper fields, copy/download actions, and advanced saved-output editors.
- The `cockpit` tab compares outputs but also contains AI idea assist and append-to-draft actions.

User impact:

- Users cannot easily check whether two related outline surfaces are aligned.
- Users may not know which box is source, which box is generated output, and which box is advanced raw editor.
- Dense pages feel like workbenches instead of guided steps.

Recommendation:

- Treat each workflow step as one primary job:
  - one input surface or one output/review surface per step;
  - exceptions only for `Story Review` and `Compare & Review`.
- Move advanced editors into one Advanced Tools drawer or modal.
- Remove full export/download clusters from Synopsis.
- Move hierarchy/story-map tools into a dedicated step between Synopsis and Outline.

### 5. Empty Boxes And Disabled Controls Create Noise Instead Of Guidance

Observed patterns:

- Empty panels such as no references, no beats, no script, no shot plan, empty helper fields, empty previews.
- Disabled controls with only visual fading.
- Disabled controls that may not expose tooltip explanations because disabled elements are hard to hover/focus reliably.
- Empty states that say `Select a page in Library` while the current UI also has a top Page selector and a collapsible dock.

User impact:

- Empty containers make the portal feel unfinished or intimidating.
- Users see controls they cannot use without knowing what is missing.
- The path forward is unclear when several disabled buttons and blank boxes are visible at once.

Recommendation:

- Replace repeated empty boxes with one next-action card per page.
- Add inline prerequisite text near disabled clusters:
  - `Select an issue first.`
  - `Create or select a page.`
  - `Generate beats before sending to Imageshop.`
  - `Run Story Review before exporting review notes.`
- Hide secondary empty panels until the prerequisite exists.

### 6. Protection / Locking Is Noisy And Repetitive

Current visible concepts include:

- `Protect`
- `Lock`
- `Locked`
- `0 locked`
- `Protected story parts`
- `Manage locks`
- per-item `Locked` / `Open`

User impact:

- The safety model is valuable, but repeated lock labels across the top toolbar and dashboard feel mechanical.
- It is not obvious which lock affects which content or what happens during regeneration.

Recommendation:

- Standardize visible language around `Prevent overwrites`.
- Use states like:
  - `Protected`
  - `Can overwrite`
- Add one persistent explanation:
  - `Protected items will not be replaced by regenerate, clear, or batch actions.`
- Consolidate repeated lock controls into a single protection summary where possible.

### 7. Export And Advanced Data Editing Are Too Prominent Outside Export

Export-like actions appear in multiple places:

- Export tab.
- Synopsis copy/download cluster.
- Imageshop production branches/downloads.
- Advanced saved-output editors.

User impact:

- Users may not know which export path is authoritative.
- Primary writing steps become cluttered with technical file actions.

Recommendation:

- Make `Export` the full download hub.
- Other tabs should keep only contextual sends, such as `Send selected page to Imageshop`.
- Group exports by user purpose:
  - `For reading`
  - `For ARCS tools`
  - `For Guided Comics`
- Rename:
  - `Issue pack JSON` -> `Full project data file`
  - `Guided Comics handoff` -> `Send to Guided Comics`
  - `Copy issue pack (JSON)` -> `Copy full project data (advanced)`

### 8. Hierarchy Tree Is Likely A Pearl, But It Is Buried

The hierarchy tool appears to normalize source structure into:

- arc
- book / issue / episode
- chapter / page / scene
- beat

That could be very helpful for preserving story order and helping AI generate better outlines or page beats. But it is currently presented as `Hierarchy tree import`, with `.txt`, `.md`, `JSON`, and `metadata on issue notes` copy.

User impact:

- A useful feature looks like an advanced data-import tool.
- Users who would benefit from it may skip it.

Recommendation:

- Promote the feature as a dedicated `Story Map` or `Structure Tree` step.
- Plain-language framing:
  - `Turn your outline into a story map so ARCS can keep arcs, issues, pages, scenes, and beats in order.`
- Primary controls:
  - `Use my author outline`
  - `Paste a story map`
  - `Save story map`
  - `Review saved story map`
- Put file import and raw format support behind `Import from file (advanced)`.

## Page-by-Page Audit Notes

### Dashboard

Current role:

- Shows readiness, selected issue/page state, locks, references, next step, and high-level workflow.

Issues:

- The dashboard can become another map competing with the Production Map, top selectors, and workflow tabs.
- `Protected story parts` and `Manage locks` are useful but still use internal-feeling safety language.

Recommendation:

- Make Dashboard a concise home/status page only.
- Keep one prominent `Next action` card.
- Convert protection summary to `Overwrite protection`.

### Choose Story

Current role:

- Series, issue, and page selection are split between top controls and Library/dock concepts.

Issues:

- Empty/disabled states reference `Library`, but the top selectors are also a primary selection path.
- When dock panels are hidden, the phrase `Library` may not be visible.

Recommendation:

- Use copy like `Select a series, issue, and page from the top menus, or open Library for full lists.`
- Rename small page-list buttons currently labeled `Library` to clearer actions like `Make active` or `Open this page`.

### Foundation

Current role:

- Story context, production defaults, and some outline-related controls share the `outline` tab.

Issues:

- Foundation and Outline are not truly separated.
- `Foundation / production defaults` is understandable to agents but not ideal user copy.
- `Saved in existing notes metadata` and `notes.production_defaults` are implementation details.

Recommendation:

- Rename section to `Story settings for AI and exports`.
- Helper: `These settings tell ARCS what kind of project you are making and shape outline, beats, dialogue, Imageshop prep, and downloads.`
- Keep Foundation focused on setup only.

### Synopsis / Author Source

Current role:

- Author outline intake, generation-mode control, generation contract, hierarchy import, synopsis helper fields, copy/download, and advanced editors all live together.

Issues:

- This is the most crowded step.
- `Preserve / Structure / Expand` lacks visible consequence text.
- Technical badges and file formats are exposed.
- Input and output/review surfaces are mixed.

Recommendation:

- Rename this step to `Author Source` or split visible substeps:
  - `Author Source`
  - `Synopsis Builder`
- Keep only source intake on the default page.
- Move story-map/hierarchy into its own step.
- Move exports and raw editors out of the default page.

### Story Map / Hierarchy Tree

Current role:

- Buried inside Synopsis.

Issues:

- Powerful but not discoverable.
- Name and helper text sound technical.
- Saved tree appears beside import controls rather than as its own reviewable output.

Recommendation:

- Promote to its own step.
- Default view should show the saved story map first when present.
- Import/replace controls should be secondary.

### Visual Canon

Current role:

- Attaches image references to the issue and explains snapshot/refresh behavior.

Issues:

- Previous pass improved this area, but it remains important to keep plain-language distinctions:
  - attached references are snapshots;
  - Vault refresh and attached-reference refresh are different;
  - editing Vault items does not automatically rewrite Writer outputs.

Recommendation:

- Keep the new refresh/edit affordances, but continue using explicit copy:
  - `Refresh vault choices`
  - `Refresh attached references`
  - `Attached references are snapshots used for future AI calls.`

### Story Canon

Current role:

- Lore/world facts included in AI prompts.

Issues:

- Advanced import paths expose `JSON` and raw keys such as `include_in_prompt`.

Recommendation:

- Keep raw import behind an advanced disclosure.
- Primary copy should say `Choose story facts the AI should remember.`

### Outline

Current role:

- Should be generated issue structure and review/edit surface.

Issues:

- Outline-related work is split across Foundation, Synopsis, advanced editors, and saved preview.
- The user cannot easily see source outline vs generated outline alignment.

Recommendation:

- Give Outline its own focused page:
  - input summary: what source/story-map/settings will be used;
  - generate/regenerate controls;
  - saved outline preview;
  - direct edit as an explicit edit mode, not a second always-visible panel.

### Pages

Current role:

- Page rows and page targets are part of Outline.

Issues:

- The workflow rail has a Pages step, but the page management surface is not clearly its own space.

Recommendation:

- Give Pages its own readiness surface:
  - target pages;
  - current page rows;
  - sync pages;
  - select page for beats/dialogue.

### Beats

Current role:

- Page-level beat generation and editing.

Issues:

- Some beat coverage and raw JSON editing appears elsewhere.
- Page prerequisite language should consistently reference the top Page menu as well as Library.

Recommendation:

- Keep beat generation/editing here.
- Move beat coverage from Synopsis to Beats or Dashboard readiness.
- Label raw beat editing as advanced.

### Dialogue

Current role:

- Page script/dialogue generation and editing.

Issues:

- Same page-selection prerequisite problem as Beats.
- Dialogue raw/edit surfaces should not be duplicated in Synopsis advanced editors unless under Advanced Tools.

Recommendation:

- Keep default page focused on selected page dialogue.
- Hide cross-output editors behind Advanced Tools.

### Imageshop Prep

Current role:

- Shot plans and handoff context for Illustrator's Imageshop.

Issues:

- The bridge is powerful, but the user needs clearer distinction between what is sent, what returns, and where returned images are reviewed.

Recommendation:

- Keep this as a dedicated handoff checklist:
  - `Send selected page`
  - `Send shot plan`
  - `Send outline`
  - `Last handoff`
  - `Returned images`
  - `Open affected page beats`

### Story Review

Current role:

- Pacing and canon checks.

Issues:

- Some actions such as `Stage plan`, `Preview AI replacements`, and `Review beats batch` are not explicit enough about whether they apply changes immediately.

Recommendation:

- Rename to consequence-based actions:
  - `Apply page target only`
  - `Preview suggested rewrites`
  - `Send affected pages to Beats`
- Keep explicit notes near these controls.

### Compare & Review

Current role:

- Compare saved outputs side by side and optionally run Idea assist.

Issues:

- `Left / Middle / Right digest` and `Focus for page_id` ask users to think in layout slots and ids.
- `Append to beats JSON draft` exposes raw data language.

Recommendation:

- Label controls by selected content:
  - `Include Outline column`
  - `Include Beats column`
  - `Include Dialogue column`
  - `Focus on selected page`
- Rename append actions:
  - `Add to outline notes`
  - `Add to page beats draft (advanced)`
  - `Add to dialogue draft`
- Add copy:
  - `Idea assist is not saved until you copy or add it to another draft.`

### Export

Current role:

- Download/handoff hub.

Issues:

- Export language still exposes file internals.
- Export actions elsewhere compete with this tab.

Recommendation:

- Make Export the only full download hub.
- Group by audience/purpose instead of file format.

## Controls And Copy That Need Direct Treatment

| Current user-facing text | Issue | Recommended treatment |
| --- | --- | --- |
| `Preserve` | Abstract AI mode. | `Keep my order` |
| `Structure` | Abstract AI mode. | `Organize into production outline` |
| `Expand` | Abstract AI mode. | `Add missing connective scenes` |
| `Hierarchy tree import` | Technical and unclear. | `Story map` or `Import story map` |
| `Saved hierarchy tree` | Technical. | `Saved story map` |
| `notes.author_outline` | Internal storage key. | Move under `Advanced details`; primary label `Saved with this issue` |
| `notes.hierarchy_tree` | Internal storage key. | Move under `Advanced details`; primary label `Story map` |
| `notes.production_defaults` | Internal storage key. | Move under `Advanced details`; primary label `Story settings` |
| `Paste .txt, .md, or JSON structure` | Technical primary-path wording. | `Paste an outline, page list, or story map.` |
| `Import .txt/.md/JSON file` | Technical primary-path wording. | `Import from file (advanced)` |
| `Save helper to issue notes` | Storage-language action. | `Save synopsis helper` |
| `Build synopsis -> Issue Outline draft` | Ambiguous output destination. | `Copy helper text into outline instructions` |
| `Copy issue pack (JSON)` | Technical export wording. | `Copy full project data (advanced)` |
| `Download issue pack .md` | File-format-first wording. | `Download readable issue pack` |
| `Outline JSON` | Technical raw editor label. | `Outline data (advanced)` |
| `Beats JSON` | Technical raw editor label. | `Page beats data (advanced)` |
| `Shot plan JSON` | Technical raw editor label. | `Shot plan data (advanced)` |
| `Save outline to database` | Implementation detail. | `Save outline changes` |
| `Empty JSON clears beats` | Technical and high-risk. | `Clearing this box removes saved beats for this page.` |
| `Focus for page_id` | Internal id language. | `Focus on selected page` |
| `Include left digest` | Layout-slot language. | `Include [selected column name]` |
| `Append to beats JSON draft` | Technical. | `Add to page beats draft (advanced)` |
| `Protected story parts` | Stiff safety language. | `Overwrite protection` |
| `Manage locks` | Mechanical. | `Choose what AI can replace` |

## Archive Or Hide Candidates

These do not need to be deleted immediately. They should be moved out of the default path unless the user opens Advanced Tools.

- Raw saved-output editors on the Synopsis page.
- Full copy/download cluster on the Synopsis page.
- Raw JSON import for lore/story canon.
- File-format badges and storage-key badges.
- Beat coverage grid inside Synopsis.
- Duplicate export actions outside Export.
- Repeated lock buttons in the top toolbar if a single overwrite-protection panel can serve the same purpose.
- Empty preview panels before prerequisites exist.

## Phased Implementation Recommendation

### Pass 1 - Language And Prerequisite Clarity

Objective:

- Remove technical language from the primary workflow without changing data flow.

Tasks:

- Replace internal `notes.*`, `JSON`, `database`, `metadata`, and `page_id` copy in default surfaces.
- Add visible helper text for `Preserve / Structure / Expand`.
- Add prerequisite messages beside disabled control groups.
- Standardize protection language around overwrite prevention.
- Keep technical labels inside Advanced Details only.

Acceptance criteria:

- No primary-path page displays `notes.*`, `database`, `metadata`, `page_id`, or raw `JSON` labels.
- Every disabled primary action has nearby text explaining what is missing.
- Author outline mode explains what it affects and confirms it does not rewrite the source text by itself.

Smoke test:

- Open Writers' Workshop.
- Visit each workflow step.
- Confirm every visible technical term is either removed or inside an Advanced disclosure.
- Confirm no generation, save, or navigation behavior changed.

### Pass 2 - One Step, One Space

Objective:

- Make the workflow rail truthful by separating crowded shared pages into clearer user-facing spaces.

Tasks:

- Split Foundation and Outline visually.
- Promote Story Map / Structure Tree out of Synopsis.
- Give Pages a visible readiness space.
- Keep Synopsis / Author Source focused on source text and helper fields only.
- Move copy/download and raw editors out of default Synopsis.

Acceptance criteria:

- Foundation, Author Source, Story Map, Outline, and Pages each have a distinct visible space.
- Except for Story Review and Compare & Review, each step has one primary job.
- Outline source and generated outline can be compared intentionally, not accidentally split across unrelated panels.

Smoke test:

- Click every workflow rail step.
- Confirm the title, helper copy, primary action, and expected output match that step.
- Confirm tab navigation, top selectors, and focused workflow still work.

### Pass 3 - Archive Advanced And Redundant Panels

Objective:

- Keep power features without making them default-path clutter.

Tasks:

- Move raw data editors to Advanced Tools.
- Move raw import/export actions behind Advanced sections.
- Consolidate export actions into Export.
- Collapse empty/secondary panels until prerequisites exist.

Acceptance criteria:

- A normal user can complete the writing workflow without seeing raw editors.
- Advanced users can still reach raw editors and data exports.
- Empty panels are replaced by one next-action card per step.

Smoke test:

- Complete a basic issue flow through visible primary controls.
- Open Advanced Tools and confirm raw editors remain reachable.
- Confirm Export is the authoritative download hub.

### Pass 4 - Story Map Usability

Objective:

- Turn hierarchy tree from a buried technical tool into a useful story-structure tool.

Tasks:

- Rename hierarchy tree to Story Map or Structure Tree.
- Add plain-language examples.
- Show saved story map first when present.
- Put file/import format details behind Advanced.
- Explain how the story map affects outline, pages, scenes, and beats.

Acceptance criteria:

- A user can understand why the story map exists without knowing what hierarchy metadata is.
- The story map page makes clear whether it is source, generated structure, or saved output.

Smoke test:

- Paste an outline.
- Save a story map.
- Confirm saved story map appears in plain language.
- Confirm outline generation still uses existing saved data as before.

### Pass 5 - Live QA And Regression

Objective:

- Verify the portal is easier to use without breaking the working app.

Tasks:

- Run targeted unit tests for touched writer helpers/components.
- Run `npm run build`.
- Run local browser smoke.
- Deploy after code review.
- Run signed-in live smoke in Chrome with the dedicated QA account.

Acceptance criteria:

- No console errors on smoke path.
- Primary workflow can be followed without technical interpretation.
- Existing saved Writer data still loads.
- Advanced tools remain available but no longer dominate the default path.

## Implementation Guardrails

- Do not start with a broad rewrite.
- Do not change Supabase schema.
- Do not change generation APIs unless a later pass explicitly requires it.
- Preserve internal ids where possible; change visible labels first.
- Keep the old raw/editor functionality reachable until the user has confirmed it is safe to remove.
- Treat deletion/removal as a separate archive decision after the UI has hidden or demoted the noisy surfaces.

## Outstanding Questions For Implementation

- Should the visible name be `Story Map` or `Structure Tree`?
- Should `Author Source` replace `Synopsis`, or should Synopsis remain but be split into `Author Source` and `Synopsis Builder`?
- Should the top edit/protect toolbar become a compact dropdown/status area?
- Should raw data editors live in a modal, a drawer, or an Advanced Tools tab?
- Should Export be the only place for all downloads, or should each step keep a single contextual copy action?

## Recommended Next Step

Start Pass 1 only: language and prerequisite clarity. This is low risk, directly addresses the screenshot, and creates a cleaner base before moving panels or changing workflow boundaries.
