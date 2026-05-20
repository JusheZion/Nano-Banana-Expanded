# Project Style Guide

This repository should feel like a polished creative tool, not a generic SaaS dashboard or marketing template.

## Product Character

- Dense, capable, and visually intentional.
- Built for creative and technical users who can handle sophisticated controls.
- Efficient with space without feeling cramped.
- Distinctive enough to feel authored, but disciplined enough to stay usable.

## Core UX Priorities

- Reduce wasted space.
- Make hierarchy obvious at a glance.
- Group controls by user intent, not implementation detail.
- Keep primary actions visually prominent.
- Make results, previews, and generated outputs feel more important than surrounding controls.
- Ensure every key surface has useful feedback states.

## Visual Direction

Avoid the default AI-tool look:

- Too many oversized rounded panels.
- Stacked cards with identical padding and radius.
- Centered-everything layouts.
- Gray-on-gray interfaces with weak emphasis.
- Excess whitespace used to fake elegance.
- Flat screens with no motion or feedback.

Instead, favor:

- Left-aligned content by default.
- Mixed panel emphasis and varied surface hierarchy.
- Strong typography with clear heading, label, and metadata contrast.
- Compact but breathable spacing.
- A restrained neutral base with one primary accent and one optional support hue.
- Motion that clarifies state changes, not motion for its own sake.

## Layout Principles

- Not every section needs a card.
- Prefer structural hierarchy over constant boxing.
- Use whitespace to separate meaning, not to create emptiness.
- Avoid deeply nested containers that each add border, radius, and padding.
- Give high-value areas more visual weight: result canvas, previews, selected item views, important controls.
- Use denser treatments for inspectors, toolbars, and secondary panels.
- When two neighboring panels feel identical in size, spacing, and styling, introduce hierarchy.

## Typography

- Typography should do more work before adding more containers.
- Headings must be clearly distinct from labels and body text.
- Labels should be compact and scannable.
- Metadata should be quieter than primary information.
- Avoid oversized body text in dense tool workflows.
- Use limited type styles, but make them deliberate.

## Color

- Use color with meaning.
- Accent color should signal primary actions, active states, selections, or key statuses.
- Support hues should be used sparingly.
- Avoid rainbow noise and arbitrary decorative color.
- Avoid washed-out neutrality that makes every region feel the same.

## Motion

Every important interaction should feel responsive and intentional.

Include, where appropriate:

- Hover feedback.
- Focus states.
- Active and pressed states.
- Loading and processing states.
- Success and completion feedback.
- Empty states with visual intent.
- Gentle transitions for panel expansion, tab changes, and result updates.

Motion should:

- Confirm action.
- Guide attention.
- Clarify changes in state.
- Make the app feel alive without becoming noisy.

## Component Guidance

- Reuse patterns aggressively.
- Buttons, tabs, chips, panels, toolbars, filters, and inspectors should feel like members of the same family.
- Dense controls should use tighter spacing and more restrained radius.
- Larger radius can be reserved for high-value preview or modal surfaces.
- Avoid over-styling low-importance components.
- Empty states should be designed, not left blank.

## Screen Quality Tests

Before considering a screen complete, check:

1. Is there wasted space that serves no readability purpose?
2. Are too many surfaces using the same card treatment?
3. Does the typography create enough hierarchy?
4. Are controls grouped according to user goals?
5. Is the result area getting enough emphasis?
6. Does the screen feel like a creative tool instead of a generic dashboard?
7. Are hover, focus, loading, empty, and success states defined?
8. Is color being used intentionally?
9. Does anything feel visually repetitive or safe in a boring way?

If any answer is no, revise.

## Writing Style for UI Copy

- Be direct.
- Prefer clear action verbs.
- Keep labels short.
- Avoid hype language.
- Avoid vague AI-product phrases like “unleash creativity,” “supercharge,” or “reimagine your workflow.”
- Use concise helper text only where it reduces confusion.

## Product Standard

This product should feel:

- More like a serious creative workstation.
- Less like a startup template.
- More like a tool designed by someone with taste.
- Less like a rounded-panel component demo.
