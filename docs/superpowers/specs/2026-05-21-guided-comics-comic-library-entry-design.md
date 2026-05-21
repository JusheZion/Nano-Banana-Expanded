# Guided Comics Comic Library Entry Design - 2026-05-21

## Goal

Add a cover-led Comic Library entry layer before the existing Guided Comics focus choreography so the comic portal opens like a studio tabletop gallery of series and issue covers, not an AI/admin dashboard.

## Approved Direction

The Comic Portal flow becomes:

`Series Cover Gallery -> Series Focus -> Issue Cover Gallery -> Issue Lightbox -> Page Production -> Panel Focus`

The existing focus choreography remains intact after an issue is selected:

`Issue Lightbox -> Page Production -> Panel Focus`

## Core Product Rules

- Opening the Comic Portal defaults to a **Series Cover Gallery**.
- Series and issues are represented as **physical comic cover objects**, not rounded cards.
- Covers sit on a **pre-rendered studio tabletop / workspace background**.
- The portal uses a **blue/gold identity system** for lighting, active states, dividers, and primary actions.
- Individual covers keep their own visual identity and should not all become blue/gold UI tiles.
- Every guided comic, including one-shots, must belong to a series container via `seriesTitle`.
- A permanent blank cover starts a new series.
- A permanent blank cover inside a selected series starts a new issue.
- `Cover Gallery First` is the default entry layout.
- `Last Series First` and `Hybrid Shelf` are user-defined local preferences.
- The living panel-collage background is a later reward unlock after four completed issues.

## Data Model

The first implementation should not introduce Supabase schema changes, a new portal type, or a new ComicEditor contract.

Series should be derived from the existing local Guided Comic Library:

- Existing saved guided comics remain issue-level projects.
- Projects are grouped by normalized `seriesTitle`.
- One-shots still use a series container title for organization and metadata consistency.
- The default series cover is the first issue cover in that series.
- A user-selected series cover can be stored as a local preference mapping from series key to project id.
- If no real cover image exists yet, render a designed blank cover object with the series or issue title.

Recommended local preference shape:

```ts
type GuidedComicLibraryEntryLayout = 'cover-gallery' | 'last-series' | 'hybrid-shelf';

type GuidedComicLibraryPreferences = {
  version: 1;
  entryLayout: GuidedComicLibraryEntryLayout;
  seriesCoverProjectIds: Record<string, string>;
  livingArchiveBackgroundEnabled: boolean;
};
```

This preference state should live in localStorage only.

## Entry Layouts

### Cover Gallery First

Default. The portal opens to the full tabletop series gallery.

User sees:

- Existing series covers.
- Blank `Start New Series` cover.
- Blue/gold studio lighting.
- A compact preference affordance, not a dashboard settings panel.

### Last Series First

Optional preference. The portal opens directly to the last active series focus stage.

User sees:

- Selected series cover dominant.
- Series title and premise side frames.
- Current/last issue cover.
- Access to `All Series` and `Issue Cover Gallery`.

### Hybrid Shelf

Optional preference. The portal opens with series covers and recent/current issue access in one scene.

This should still feel like covers arranged on a desk, not a two-column dashboard.

## Series Focus

Selecting a series cover brings that cover forward into a focused stage.

The stage should show:

- Dominant series cover object.
- Series title.
- Series premise.
- Issue count.
- Current or last issue worked on.
- Primary action to open the current/last issue.
- Secondary action to open the issue cover gallery.
- Blank `Start New Issue` cover if the creator wants a new issue.

## Issue Cover Gallery

The issue gallery is scoped to the selected series.

It should show:

- Existing issue covers.
- Issue number and issue title as cover or spine metadata.
- Current/last issue indication.
- Blank `Start New Issue` cover.
- A transition path back to Series Focus.

Selecting an issue should load that saved project and then enter the existing issue-level Guided Comics focus flow.

## Motion

Motion should clarify hierarchy rather than decorate the interface.

Required transitions:

- Series cover selection: the selected cover moves forward from the tabletop into Series Focus.
- Series Focus to Issue Gallery: side covers fan or slide into issue-specific cover selection.
- Issue cover selection: selected issue cover moves forward, then resolves into Issue Lightbox.
- Issue Gallery back to Series Focus: pullback transition.
- Series Focus back to Series Gallery: selected cover rejoins the tabletop gallery.

Respect `prefers-reduced-motion` with instant state changes plus subtle opacity/scale only.

## Backgrounds

### Default Background

Use a pre-rendered or CSS-backed studio tabletop / writer-artist desk environment:

- Blue/gold lighting.
- Desk surface.
- Physical cover shadows.
- Cover objects with slight perspective.
- No repeated rounded-card grid.

### Living Archive Background

After four completed issues, optionally unlock a faint moving collage of panels from the user’s completed comics.

This should:

- Stay subtle and secondary.
- Never compete with cover legibility.
- Respect reduced motion.
- Fall back to the default tabletop if no eligible panel images exist.

## Out Of Scope For First Implementation

- No new portal type.
- No Supabase schema expansion.
- No ComicEditor refactor.
- No Advanced Studio behavior change.
- No Imageshop, Image Vault, export, save/load, geometry, shapes, balloons, or image-preservation contract changes.
- No hard dependency on generated cover art existing.
- No requirement to implement the living collage immediately; it can be scaffolded as a locked/preference state.

## Acceptance Criteria

- The Comic Portal no longer opens directly into an issue workflow when saved comics exist and default entry layout is `Cover Gallery First`.
- Existing saved guided comics group into series by `seriesTitle`.
- One-shot comics still display under a series container.
- Series and issue entries read visually as comic covers on a tabletop, not dashboard cards.
- Blank cover objects exist for new series and new issue.
- Choosing an issue preserves the existing `Issue Lightbox -> Page Production -> Panel Focus` behavior.
- Layout preference changes persist locally.
- Advanced Studio, Imageshop, Image Vault, save/load, export, panel geometry, shapes, balloons, and image preservation remain unchanged.

## Operator Checklist Purpose

Implementation should be tracked with visible checklist language after each pass. Each pass should report:

- What changed visually.
- What changed under the hood.
- What the user should be able to see now.
- What was verified.
- What remains pending.

