# Prompt Library Combine Prompts Action Plan - 2026-06-15

## Objective

Add a polished Prompt Library workflow that lets an operator select 2-3 existing prompts, preview the combined result, reorder/remove selected prompts, and quick-save the result as a new unified prompt.

## Action Sequence

1. Add deterministic combine utilities.
   - Merge 2-3 `PromptRecord` items into a `PromptDraft`.
   - Preserve useful metadata by de-duplicating tags, collections, entities, and variables.
   - Generate a readable default title and provenance note.

2. Add a compact selection workflow to `PromptLibraryPortal`.
   - Add checkboxes to prompt rows with a hard 3-prompt cap.
   - Keep ordinary row click behavior for selecting/viewing one prompt.
   - Surface selected prompts in a dense combine tray.

3. Add polished combine controls.
   - Show a preview of the generated prompt body.
   - Allow selected prompts to be moved up/down before saving.
   - Allow selected prompts to be removed or cleared.
   - Disable save until 2 prompts are selected.

4. Save through existing prompt persistence.
   - Reuse `handleSave` so signed-in users persist to Supabase and signed-out/demo users use session memory.
   - Select the newly combined prompt after save.

5. Verify and publish.
   - Add focused unit/component coverage for combine utility and UI workflow.
   - Run local browser smoke against the Prompt Library flow.
   - Run lint, full test suite, build, deploy, and live reachability check.
   - Append the walkthrough entry and commit/push the finished change.

## UX Guardrails

- Keep the feature inside the existing creative-tool surface rather than introducing a large modal.
- Use compact labels, clear disabled states, and visible selected-count feedback.
- Treat reorder as optional polish but include it if it stays small.
- Preserve the prior copy/edit/duplicate actions.

## Smoke Target

`Prompt Library -> choose 2 prompts -> Combine selected becomes enabled -> preview appears -> Save combined prompt -> new prompt is selected and visible -> combined body contains both source prompts.`
