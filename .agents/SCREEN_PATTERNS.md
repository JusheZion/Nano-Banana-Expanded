# Screen Patterns

These patterns define how major interface areas in this repository should usually behave.

## Overall Shell

Prefer a clear primary workspace layout:

- Main result or preview area.
- Supporting control region.
- Secondary metadata, history, or settings region when needed.

Good default structures:

- Split pane with result left and controls right.
- Result-first vertical stack on smaller screens.
- Docked inspector for advanced settings.
- Segmented toolbar above workspace.

Avoid:

- Wrapping every region in identical cards.
- Making results and controls feel equally important.
- Hiding key actions in visually weak footer rows.

## Toolbars

Toolbars should feel compact, fast, and scannable.

Rules:

- Group by task, not by implementation detail.
- Keep high-frequency actions visible.
- Push infrequent actions into overflow, menus, or secondary controls.
- Use separators, spacing, and label changes to create structure.
- Keep toolbar height efficient.

Prefer:

- Icon plus label for important controls.
- Segmented toggles for modes.
- Small status indicators for active context.

Avoid:

- Huge pill buttons across the full width.
- Too many equal-priority controls in one row.
- Ambiguous icon-only actions without tooltip or label support.

## Inspector Panels

Inspector panels should be denser than landing-page UI.

Rules:

- Group controls by outcome: generation, refinement, style, export, metadata.
- Use section headings that are compact but clear.
- Put advanced options in collapsible groups when appropriate.
- Keep related controls visually tight.
- Reduce redundant wrapper containers.

Prefer:

- Labels above controls when clarity matters.
- Inline grouped toggles for quick comparisons.
- Compact helper text beneath only the most confusing inputs.

Avoid:

- One-card-per-control layouts.
- Huge vertical gaps between related settings.
- Equal visual treatment for primary and obscure settings.

## Prompt Builder Areas

Prompt areas should feel important and expressive, not like generic form fields.

Rules:

- Give the main prompt input enough weight to feel central.
- Place prompt actions close to the input.
- Keep enhancement, presets, and history clearly related but secondary.
- Allow the prompt area to breathe more than raw settings.

Prefer:

- Larger central text area with compact secondary controls.
- Inline chips or toggles for prompt modifiers.
- Clear distinction between prompt input and generation parameters.

Avoid:

- Tiny prompt fields surrounded by giant empty cards.
- Over-fragmenting prompt controls into too many sub-panels.
- Making the most important text entry area visually weak.

## Result and Preview Areas

Results should usually be the visual anchor of the screen.

Rules:

- Give generated output stronger emphasis than support controls.
- Make selected result states obvious.
- Keep actions like save, reuse, upscale, variant, or compare close to the result.
- Design loading, failure, and empty states carefully.

Prefer:

- Large preview stage.
- Thumbnail rail or variant strip as a secondary system.
- Comparison modes with clean toggles.
- Metadata that recedes until needed.

Avoid:

- Tiny results squeezed between oversized panels.
- Hiding useful result actions far away from the output.
- Making all thumbnails visually equal when one is selected.

## Tabs and Segmented Modes

Mode switching should feel fast and legible.

Rules:

- Use tabs for mutually exclusive views.
- Use segmented controls for smaller mode switches.
- Make active state obvious through contrast, background, and typography.
- Animate transitions lightly.

Avoid:

- Weak active states.
- Too many tabs with the same visual weight.
- Switching patterns that relocate controls unpredictably.

## Modals and Drawers

Use overlays when users need focus without losing context.

Rules:

- Use modal for short, high-attention tasks.
- Use drawer or sheet for secondary configuration and supporting flows.
- Keep titles and actions obvious.
- Preserve a strong action hierarchy.

Prefer:

- One dominant action.
- Clear cancel path.
- Compact explanatory copy.

Avoid:

- Huge empty modal bodies.
- Overly decorative containers.
- Multiple competing primary buttons.

## Galleries and Grids

When showing multiple images, presets, or variants:

- Use visual hierarchy, not uniform sameness.
- Make selected and hovered states obvious.
- Support quick scanning.
- Keep metadata compact.
- Allow one item to be featured when context calls for it.

Avoid:

- Identical floating cards with large padding.
- Equal emphasis on every item all the time.
- Weak selection states.

## Empty States

Empty states should feel intentional.

Rules:

- Explain what belongs here.
- Show the next useful action.
- Use a simple visual treatment or icon.
- Avoid dead blank space.

Tone:

- Calm.
- Direct.
- Slightly encouraging.
- Never cheesy.

## Loading States

Loading should preserve structure.

Rules:

- Use skeletons or placeholders that mirror the final layout.
- Keep loaders visually calm.
- Show progress, status, or stage when useful.
- Avoid jumpy layout shifts.

## Feedback States

All key interactions should account for:

- Hover.
- Focus.
- Pressed.
- Disabled.
- Loading.
- Success.
- Error.
- Empty.
- Selected.

If a component has only a default state, it is unfinished.

## Mobile Behavior

On smaller screens:

- Preserve result-first thinking.
- Stack panels in priority order.
- Collapse secondary controls before shrinking everything.
- Keep actions thumb-friendly.
- Avoid hover-dependent interaction.
- Avoid dense multi-column layouts that break scanability.

## Anti-Patterns

Do not default to:

- Rounded panel everywhere.
- Big generic cards for every feature.
- Centered text blocks for dense workflows.
- Repetitive three-column grids.
- Overuse of low-contrast gray borders.
- Empty space as a substitute for hierarchy.
- Identical section rhythm across the whole app.

## Final Test

A finished screen should feel:

- Efficient.
- Cohesive.
- Distinctive.
- Responsive.
- Designed for real use.

It should not feel like a safe autogenerated dashboard.
