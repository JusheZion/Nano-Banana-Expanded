# Illustrator's Imageshop Priority Audit

Status date: 2026-06-01

## Purpose

This document lists the current concerns for Illustrator's Imageshop now that it is being raised in priority as the main portal for making comic book pages quickly and easily.

The desired direction is not just "more image generation." Imageshop should become the fast comic-page production workspace where a creator can combine:

- image reference vaults for character, asset, NPC/supporting, style, and continuity references;
- Writers Workshop generated JSON for page beats, panel beats, dialogue, SFX, and layout intent;
- Obsidian lore/canon context for names, places, artifacts, factions, constraints, and continuity rules;
- reliable AI image generation with visible prompt integrity, recoverable errors, and clear save/return paths.

## Current High-Level Assessment

Imageshop already contains many production-studio pieces: reference slots, prompt sections, Comic Pages mode, page configuration, JSON import/export, a production dashboard, session recovery, save/export, and Guided Comic Flow return-art wiring.

The main problem is that those features are layered into a portal that still behaves like a beat-timeline/storyboard utility with an embedded Image Lab. The current shape makes the generator feel secondary, hides the fastest comic-page path, and leaves too many important controls spread across one large surface.

The priority should shift from adding more controls to establishing a clear production loop:

1. Choose or import page/panel source material.
2. Attach reference vault context.
3. Attach lore/canon context.
4. Review the composed generation prompt.
5. Generate or batch-generate panel/page art.
6. Retry/refine failures without losing context.
7. Approve/save/send outputs back to the comic page workflow.

## Evidence Reviewed

- Live signed-in browser audit of Illustrator's Imageshop at `http://127.0.0.1:5174/`.
- One live Imageshop generation smoke with a generic prompt; it completed successfully after roughly 35 seconds and created a production item.
- Existing Imageshop tracker: `docs/superpowers/plans/2026-05-31-imageshop-production-studio.md`.
- Source review of:
  - `src/portals/storyline/StorylineStudio.tsx`
  - `src/portals/storyline/GenericImageLabPanel.tsx`
  - `src/portals/storyline/ImageshopImportPanel.tsx`
  - `src/portals/storyline/imageshopPromptComposer.ts`
  - `src/portals/storyline/imageshopJsonSchemas.ts`
  - `src/shared/api/geminiImageApi.ts`
  - `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx`

## Concern Inventory

### 1. Product Focus And First-Screen Hierarchy

Concern: Imageshop is not yet visually or structurally centered on image generation.

- `StorylineStudio.tsx` renders the production cast/assets/NPC libraries first, then a Beat timeline, then Beat detail, then the Image Lab.
- For an empty project, the first major workspace tells the user they have "No beats yet" before it gives them a strong generation cockpit.
- The primary creation loop is below the fold, especially on constrained screens.
- The page title says "Illustrator's Imageshop," but the subtitle still frames it as "Beats, production libraries & Image Lab."
- The app currently asks users to understand the old beat workflow before they can discover the new comic-page generation system.

Recommendation:

- Make the first viewport a generation cockpit: prompt, references, page/panel source, preview, generation status, and save/export.
- Move production libraries, beat timeline, JSON batch import, page config, dashboard, and refinement into clear tabs, drawers, or side inspectors.
- Introduce workflow modes that match user intent: `Quick Image`, `Comic Page`, `Panel Batch`, `Reference Cleanup`, and `Refine Existing`.

### 2. Comic Page Creation Is Not Yet The Main Path

Concern: Comic Pages mode exists, but it does not yet feel like a page-making tool.

- The Comic Pages controls are configuration inputs, not a page production workflow.
- There is no first-class "Page N / Panel N" queue that a user can generate through quickly.
- Layout templates are selectable, but the user cannot see a clear page/panel workbench in Imageshop.
- Page type, panel options, and gutter/border settings are prompt text inputs rather than visible production objects.
- It is unclear whether users should generate a full page, a single panel, a cover, a character sheet, or batch panels from the same surface.

Recommendation:

- Add a dedicated `Comic Pages from Beats` workflow.
- Represent imported pages as a page rail and panels as generation cards.
- Each panel card should show beat text, dialogue, SFX, linked refs, prompt status, generation status, thumbnail, retry, approve, and send-back actions.
- Make full-page generation and per-panel generation distinct choices.

### 3. Writers Workshop JSON Is Too Indirect

Concern: JSON import accepts Story Beat, Comic Page, and ARCS Page JSON, but it does not yet feel like a direct continuation of Writers Workshop.

- `imageshopJsonSchemas.ts` normalizes story beats into production items, but it does not preserve enough Writers Workshop provenance for issue/page/panel continuity.
- Comic page JSON becomes flattened production items, not a visible issue/page/panel hierarchy.
- The UI labels the feature as `JSON Production Batch`, which is technically accurate but not user-oriented.
- There is no obvious "Import from Writers Workshop" affordance.
- Failed import states are schema-level, not workflow-level: a user may not know what part of the Writer export is missing or malformed.
- Batch generation can be started from imported items, but the dashboard does not read as a Writer-sourced production queue.

Recommendation:

- Rename/reframe the surface as `Import Writer Pages` or `Writer JSON -> Comic Pages`.
- Preserve Writer provenance: series, issue, page number, panel number, beat id, dialogue id, lore references, and source timestamps.
- Show the imported JSON as a reviewable page/panel outline before generation.
- Add import diagnostics that explain missing page beats, missing dialogue, missing refs, unsupported schema fields, and skipped items.

### 4. Obsidian Lore Is Not Yet Connected To Imageshop

Concern: Obsidian lore/canon is part of the future consistency story, but Imageshop currently has no visible lore ingestion or canon constraint path.

- Lore imported into Writers Workshop Canon does not appear as an Imageshop reference/canon panel.
- Prompt composition does not include a lore/canon context section distinct from generic continuity instructions.
- There is no way to attach lore cards to a page, panel, character, location, artifact, faction, or prop inside Imageshop.
- Lore provenance is not visible. A user cannot tell whether a generated image respected a specific Obsidian note.
- There is no conflict warning when Writer JSON, vault labels, and lore cards disagree.
- The current `continuity` field is a freeform prompt section, not a structured canon contract.

Recommendation:

- Add a `Canon Context` inspector for Imageshop.
- Let Writer JSON carry canonical lore ids/labels into Imageshop where available.
- Let users manually attach lore cards to a panel/page generation item.
- Summarize attached lore into prompt-safe constraints: names, visual descriptions, factions, locations, artifacts, forbidden contradictions, and continuity notes.
- Preserve lore provenance in generated item metadata so users can audit what canon was used.

### 5. Reference Vault Use Is Powerful But Not Ergonomic

Concern: Imageshop can use reference vaults, but reference selection and meaning are not yet clear enough for fast page production.

- The visible 14 reference slots are generic numbered boxes.
- `Replace with Character refs`, `Replace with Asset refs`, `Add Character refs`, and `Add Asset refs` are low-context controls.
- Slot role semantics are important in `geminiImageApi.ts`, but the UI does not clearly explain which slots mean identity, wardrobe, atmosphere, exterior, interior, materials, or lighting.
- Production cast/assets/NPC are above the generator, while active generation references are lower in Image Lab, which splits the user's mental model.
- There is no per-panel reference chip system that says "Flux identity," "Flux costume," "Sky Observatory environment," etc.
- It is easy to overfill refs without clear payload/quality warnings.

Recommendation:

- Replace generic reference slots with labeled reference lanes: Character DNA, Wardrobe, Environment, Props, Style, Lighting, Canon.
- Add per-panel reference chips derived from Writer JSON, vault links, and lore links.
- Show a payload health indicator: reference count, approximate size, signed URL status, and likely timeout risk.
- Make "replace" destructive enough to require clearer language or undo.

### 6. Prompt Integrity Is Not Strong Enough

Concern: The current prompt stack can mislead the user about what is actually sent to the image model.

- `Negative prompt` is composed as plain text inside the same positive prompt body.
- Comic Pages mode can produce a composed prompt that is mostly configuration text if the main prompt is empty.
- There is no preflight that blocks or warns on weak prompts.
- The "Composed generation prompt" preview is small and buried.
- The AI prompt helper only refines the raw prompt and does not appear to validate the full composed prompt with references, page config, style, continuity, and lore.
- It is not obvious when `Using raw prompt` versus `Using refined prompt` affects the final composed prompt.
- Art style, continuity, camera, and page config can all influence generation, but there is no clear final prompt diff or source attribution.

Recommendation:

- Add a mandatory prompt preflight panel before generation.
- Use explicit sections: Positive Prompt, Avoid/Do Not Include, Reference Instructions, Page/Panel Instructions, Canon Constraints, Style Instructions.
- Rename `Negative prompt` to `Avoid list` unless a true negative-prompt API channel exists.
- Warn when the main prompt is empty or when the final prompt is mostly settings.
- Show source badges in the composed prompt: Writer JSON, Vault, Lore, Manual, AI Helper.

### 7. Image Generation Reliability And Error Recovery Are Too Thin

Concern: The user reported random image-generation errors, and the current implementation does not give enough diagnostic or recovery help.

- `geminiImageApi.ts` retries 429 rate limits but returns immediately on network/reference failures.
- Reference fetch failures can end the whole generation before the model call starts.
- Timeout, no-image response, safety block, missing API key, quota/rate limit, and unknown API errors are all different problems but are not consistently surfaced as different user actions.
- `generateBatch` stops on first failed item and reports a generic message.
- There is no visible retry button tied to the failed prompt/ref payload.
- There is no model fallback control exposed in the Imageshop UI.
- There is no elapsed-time or progress state beyond `Generating...`.
- There is no generation attempt log to inspect after failure.

Recommendation:

- Add structured error classes: missing key, safety, quota/rate limit, timeout, reference fetch, reference size, no image, unsupported payload, network, unknown.
- Add retry actions: retry same payload, retry without failed refs, retry smaller refs, retry with fallback model, duplicate item and edit prompt.
- For batches, mark the failed item with its reason and continue/skip based on user choice.
- Record attempt metadata: model, prompt hash, ref count, elapsed time, seed, error class, retry count.

### 8. Batch Generation Needs A Production Queue

Concern: Batch generation exists as a button, but it is not yet a robust comic production queue.

- The current batch queue is derived from production item statuses.
- Users cannot easily reorder, skip, pause, resume, or retry individual batch items.
- Failure stops the batch and gives little context.
- There is no queue health check before running a batch.
- There is no clear separation between draft items imported from JSON and generated/refined/approved assets.
- A comic page workflow needs panel-by-panel visibility, not just a generic item dashboard.

Recommendation:

- Add a queue table or panel grid with item status, source, refs, prompt readiness, last attempt, thumbnail, and actions.
- Support `Generate selected`, `Generate page`, `Generate all draft panels`, `Retry failed`, and `Skip`.
- Preserve failed output context and partial successes.

### 9. Button And Menu Fidelity Is Not Production-Grade Yet

Concern: The UI has too many similarly styled text buttons and duplicated concepts.

- Live UI showed duplicate `Portrait`, `Square`, and `Cinematic` controls for import and generation.
- There are duplicate `Export JSON` actions at the portal header and inside Image Lab.
- There are multiple save concepts: story save to Asset Vault, processed import save, generated result save, NPC local save, Character Vault save, Asset Vault save.
- `Process` and `Generate` are adjacent concepts but not clearly differentiated.
- `Use selected beat refs`, `Use as selected beat image`, and `Create new B-roll beat` are related to beats but are not part of a coherent comic-page flow.
- Several controls are text-only where icons, segmented controls, menus, or tooltips would reduce ambiguity.
- Status buttons (`draft`, `generated`, `refined`, `approved`, `published`) are cramped and look like tags rather than workflow actions.

Recommendation:

- Establish one command model:
  - Primary: Generate
  - Secondary: Refine, Retry, Save, Send Back
  - Menus: Import, Export, Reference Sources, More
  - Modes: segmented controls
  - Status: dropdown or workflow stepper
- Consolidate save/export into one clearly named area.
- Use icon buttons with tooltips for repeated utility actions.

### 10. Accessibility And Semantic Quality Need Attention

Concern: The current DOM can produce confusing accessible names and control semantics.

- Production dashboard item buttons can concatenate item label, status, full prompt, and version count into one huge accessible name.
- Some file-upload labels are visually clickable but not always explicit as buttons.
- Repeated button labels are ambiguous to screen readers and automated tests.
- Several icon-only buttons have good aria-labels, but many text buttons are duplicated without context.
- Disabled controls do not always explain why they are disabled.

Recommendation:

- Give repeated buttons scoped accessible names, for example `Export Imageshop production JSON` versus `Export story JSON`.
- Add disabled-state helper copy for generate, batch, process, save, and send-back.
- Avoid large nested clickable cards where a smaller explicit action would be clearer.

### 11. Dashboard And Status Model Are Underpowered

Concern: The production dashboard tracks statuses, but it does not yet behave like a comic production board.

- Status transitions are manual button clicks with no validation.
- "Approved" and "Published" can be selected without clear consequences.
- Versions exist, but version comparison and rollback are not visible enough.
- Generated images become production references if approved/published, but the UI does not make that relationship obvious.
- There is no page/panel grouping in dashboard.
- There is no "what still needs art?" view for a comic issue.

Recommendation:

- Convert the dashboard into a production board grouped by page/panel/source.
- Add readiness and completion counters.
- Add version history UI with choose-current, compare, revert, and approve.
- Make approved assets explicitly available as continuity references.

### 12. Save, Export, And Return Paths Need One Mental Model

Concern: Imageshop can save and export in multiple ways, but the user has to infer which one is right.

- Header `Save to Vault` saves story/beats to Asset Vault.
- Import panel `Save to vault` saves a processed external image.
- Generated result `Save to Vault` saves the current generated output.
- Guided Comic Flow `Send back` appears only in guided handoff conditions.
- `Use as selected beat image` and `Create new B-roll beat` are beat-specific save/return paths.
- Export JSON can mean story JSON or Imageshop production config.

Recommendation:

- Create a unified output panel with explicit destinations:
  - Save to Character Vault
  - Save to Asset Vault
  - Save to NPC/Supporting Vault
  - Assign to current panel
  - Add as new beat
  - Export production JSON
  - Export Writer-compatible image map
- Label all exports by destination and schema.

### 13. State Persistence And Recovery Need More Transparency

Concern: Imageshop uses local and session persistence, but users do not get enough confidence about what is saved.

- Session results are recoverable, but scope/lifetime is unclear.
- Production items are local persisted state, but not obviously tied to a named issue/project.
- Imported JSON batches may persist locally without clear provenance or cleanup tools.
- A successful generated image can be in session results, production item versions, local recent archive, Supabase vault, or Guided return state.
- There is no central "current Imageshop project" save state.

Recommendation:

- Add visible project/session state: unsaved, local draft, saved to vault, exported, sent back.
- Add clear reset/clear controls with confirmation and scope labels.
- Preserve provenance on every generated item.

### 14. Obsidian Lore Could Become A Strength, But Needs Guardrails

Concern: Lore context could improve consistency, but naïvely dumping lore into prompts will create long, noisy prompts and inconsistent results.

- Not every lore card should affect every panel.
- Lore cards need typed relevance: character appearance, location design, artifact design, faction symbol, canon prohibition, timeline note.
- Conflicting lore needs detection before generation.
- Imageshop should not leak raw storage URLs or importer metadata into model prompts.
- Lore descriptions need prompt-safe summaries, not whole notes.

Recommendation:

- Add lore-to-prompt summarization rules.
- Attach lore at the page/panel/reference level.
- Show a compact `Canon used` list before generation.
- Record lore ids and summary text in generation metadata.
- Add conflict warnings when imported Writer JSON and lore disagree.

### 15. Testing Coverage Does Not Match The New Priority

Concern: Existing tests cover shell rendering and some save/export paths, but not the new mission-critical comic-page workflow.

- Current component tests cover rendering, Comic Pages visibility, JSON import into dashboard items, save/export without regeneration, Guided return wiring, and approved references.
- There are no tests for error classification.
- There are no tests for a Writer JSON page/panel import turning into a generation queue.
- There are no tests for Obsidian lore/canon attachment because the feature does not exist yet.
- There are no tests for prompt preflight behavior.
- There are no tests for batch failure recovery.
- There are no accessibility tests for duplicated buttons or long accessible names.

Recommendation:

- Add tests for Writer JSON import -> page/panel queue.
- Add prompt preflight tests.
- Add generation error classification tests with mocked API responses.
- Add batch partial-failure tests.
- Add accessibility assertions for unique button names and dashboard card semantics.

### 16. Performance And Payload Risk

Concern: Fast comic production will stress the image API and browser more than one-off generation.

- Up to 14 references can be encoded per generation.
- Large blob/http references can add long pre-model delays.
- Batch generation can multiply timeout risk.
- Signed URL refresh and reference downloads can fail independently.
- The UI does not surface payload size or expected duration.
- The in-app browser screenshot/control bridge became flaky during prior long sessions, suggesting heavy UI/browser sessions should be designed with recovery in mind.

Recommendation:

- Add payload health checks before generation.
- Consider reference compression/resizing before model calls if quality allows.
- Add batch throttling and progress.
- Add "lite retry" options with fewer refs.

### 17. Data Provenance And Auditability

Concern: If Imageshop becomes the main comic-page portal, every generated image needs traceable context.

- Generated output metadata should capture source Writer issue/page/panel, prompt sections, selected refs, lore summaries, model id, seed, aspect ratio, page config, and destination.
- Current save metadata captures some prompt/aspect/context/model/guided panel data, but not a full production provenance chain.
- Exported production JSON should be enough to recreate or audit the generation setup.
- Users need to know whether an image came from imported external image processing, quick generation, batch generation, refinement, or guided panel generation.

Recommendation:

- Define an Imageshop generation provenance schema.
- Attach provenance to production versions, session results, vault saves, and exports.
- Make provenance visible in the UI at least as a compact details drawer.

### 18. Visual Design And Density

Concern: The current UI is dense but not yet disciplined enough for a serious creative production cockpit.

- Many panels use similar dark bordered cards, making hierarchy hard to scan.
- There are too many small uppercase labels competing for attention.
- The generated image preview is not always visually dominant.
- First-screen empty states emphasize missing beats rather than inviting image creation.
- Some controls are cramped into text-heavy rows that should be segmented controls, menus, or inspectors.

Recommendation:

- Make preview and current generation item visually dominant.
- Use a calmer side-inspector model.
- Reduce repeated card nesting.
- Promote the active page/panel/generation task as the main focus.

## Recommended Priority Order

### Priority 0: Define The New Product Contract

- Imageshop is the primary comic-page image production portal.
- Writers Workshop remains the source for story/page/panel text.
- Reference Vaults remain the source for visual continuity.
- Obsidian lore becomes canon context, not raw prompt stuffing.
- Guided Comic Flow remains a consumer/return target, but Imageshop owns generation.

### Priority 1: Recenter The UI Around Generation

- First viewport: source item, prompt, refs, preview, generate, retry, save/send.
- Move timeline/libraries/dashboard into secondary surfaces.
- Remove duplicated controls and ambiguous save/export labels.

### Priority 2: Writer JSON To Comic Page Queue

- Import Writer JSON as issue -> pages -> panels.
- Preserve Writer provenance.
- Show panel generation queue.
- Generate one panel, one page, selected panels, or all draft panels.

### Priority 3: Reference And Lore Context System

- Add per-panel reference chips from Character/Asset/NPC vaults.
- Add lore/canon attachments.
- Show context health and conflicts.
- Record provenance.

### Priority 4: Prompt Integrity And Error Recovery

- Prompt preflight.
- Structured errors.
- Retry/fallback paths.
- Batch partial-failure recovery.

### Priority 5: Production Dashboard And Save/Export Model

- Page/panel grouped dashboard.
- Version history.
- Approval workflow.
- Unified output destinations.

## Open Product Questions

- Should Imageshop remain inside the existing `lab` portal route, or should the main nav still point to `lab` while the internal UI becomes a dedicated Imageshop workspace?
- Should full-page generation be a first-class option, or should the default comic workflow generate panels and assemble pages elsewhere?
- Should Obsidian lore be attached manually first, or should Writer JSON carry lore ids into Imageshop automatically?
- Should approved Imageshop outputs automatically become reusable continuity references for later panels?
- Should batch generation continue after failures by default, or pause for user review?

## Suggested Next Implementation Passes

1. Imageshop UI recentering pass: create a generation-first cockpit and move secondary surfaces into tabs/inspectors.
2. Writer JSON import pass: convert Writer JSON into an issue/page/panel generation queue.
3. Prompt preflight and diagnostics pass: add prompt readiness, payload health, and structured generation errors.
4. Reference/lore context pass: attach vault refs and lore cards to panel generation items.
5. Production workflow pass: add per-panel versions, approval, retry, save/export, and send-back flows.

