# User-Facing Feature Completeness Inventory - 2026-06-23

## Scope

This inventory applies the project user-facing feature completeness standard to the existing ARCS app without starting a broad redesign. It records discoverability, visible controls, helper copy, keyboard/context affordances, state handling, and low-risk improvement opportunities by portal.

## Standard applied

For each major user-facing portal, check whether ordinary users can discover the primary workflow, understand the controls, recover from empty or disabled states, use expected keyboard/context affordances, and understand persistence or cross-portal side effects.

## Portal inventory

### Writers' Workshop

Current pass completed:

- Renamed ambiguous Writer workflow labels to plain-language stages.
- Added workspace subtitles and a Simple Workflow next-step panel.
- Added Visual Canon snapshot/refresh copy.
- Added attached Visual Canon reference edit controls for label, role, and note.
- Added manual refresh for attached Visual Canon references from Vault metadata.
- Added Imageshop Prep handoff status and return status.

Remaining low-risk opportunities:

- Add richer disabled-state explanations to generation buttons when issue/page prerequisites are missing.
- Add one visible "advanced details" disclosure for the remaining technical Help modal paragraphs.
- Add rendered regression coverage for the Simple Workflow next-step panel.

Risk: low to medium.

### Prompt Library

Current strengths:

- Visible prompt row selection and combine workflow exist.
- Combine builder moved to the right inspector to reduce list compression.
- Tests cover prompt combine behavior and layout placement.

Low-risk opportunities:

- Add a short empty-state note for filtered results that explains how to clear filters.
- Add a local helper note explaining row click vs checkbox selection.
- Add a visible keyboard shortcut hint only where the shortcut is supported.

Risk: low.

### Character Studio

Current strengths:

- Primary generation workflow is visible.
- Character Vault save path is established.
- The studio has strong domain-specific controls for reference character generation.

Low-risk opportunities:

- Add clearer disabled-state text for missing prompt/reference prerequisites.
- Add "what this affects" helper notes near DNA/wardrobe/style controls.
- Add explicit recovery text when save-to-vault fails or generated image persistence is memory-only.

Risk: low to medium.

### Asset Studio

Current strengths:

- Primary asset generation workflow and vault save path exist.
- Domain controls are already organized around environment/props.

Low-risk opportunities:

- Add clearer helper notes for which controls affect scene, prop, lighting, or style.
- Add empty-state guidance when no saved asset collections exist.
- Add consistent save/retry messaging matching Character Studio.

Risk: low to medium.

### Image Vault

Current strengths:

- Central image organization surface exists and is already used by Writer, Guided Comic, and Imageshop paths.

Low-risk opportunities:

- Add visible notes explaining when Vault edits do or do not update already-attached references in other portals.
- Add clearer controls for changing image type/category without delete/re-add where the underlying data supports it.
- Add filter empty-state and bulk-action recovery copy.

Risk: medium because Vault metadata affects multiple portals.

### Illustrator's Imageshop

Current strengths:

- Production studio has strong generation output and Writer/Guided handoff integration.
- Existing tests cover production store, prompt composition, batch behavior, and Writer image-map import/export.

Low-risk opportunities:

- Add an always-visible "current input source" strip for Writer, Guided Comic, import JSON, or manual mode.
- Add clearer copy for memory-only vs stored generated images.
- Add a quick note explaining which reference lanes travel back to Writer/Guided flows.

Risk: medium.

### Comic Creator / Guided Comic Flow

Current strengths:

- Guided flow has strong staged workflow, Writer import, Imageshop handoff, and panel assignment paths.

Low-risk opportunities:

- Add clearer state notes for when Writer sync is one-way vs editable locally.
- Add visible recovery options when an Image Vault selection is missing or stale.
- Add consistent keyboard/secondary access hints for panel-level actions.

Risk: medium.

### Advanced Comic Creator

Current strengths:

- Powerful canvas workspace exists for panel, lettering, image, layer, and export work.

Low-risk opportunities:

- Add stronger onboarding/empty-state guidance inside the actual tool surface rather than relying on external knowledge.
- Add visible recovery language for destructive layer/page actions.
- Add clearer bridge status when arriving from Guided Comic Flow.

Risk: medium to high because canvas interaction regressions are harder to smoke test.

### ARCS Wiki Portal

Current strengths:

- Long-form help exists and can be linked from in-app help.

Low-risk opportunities:

- Keep wiki labels synchronized with the app after every portal terminology pass.
- Add "last reviewed" dates for high-change portal pages.
- Add screenshots or small annotated reference images where tool naming remains abstract.

Risk: low.

## Recommended execution order

1. Finish Writers' Workshop UX audit updates and verify live.
2. Prompt Library and Wiki copy pass.
3. Character Studio and Asset Studio disabled/empty-state copy pass.
4. Image Vault metadata and cross-portal expectation pass.
5. Imageshop source/status pass.
6. Guided Comic and Advanced Comic completeness pass with heavier visual QA.

## Cross-app acceptance criteria

- Each touched portal has an obvious first action.
- Disabled controls explain the missing prerequisite where practical.
- Empty states tell users what to do next.
- Cross-portal handoffs say what moved, what stayed local, and where to review it.
- Keyboard hints only describe supported shortcuts.
- Tests or smoke checks cover the primary workflow for every portal touched in a pass.

