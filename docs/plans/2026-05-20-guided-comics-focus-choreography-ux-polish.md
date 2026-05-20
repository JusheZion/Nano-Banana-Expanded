# Guided Comics Focus Choreography UX Refactor - Polish Continuation Plan

**Goal:** Continue the Guided Comics focus choreography refactor so the workspace moves creators through three emotional lenses instead of exposing the whole production pipeline at once.

**Current modes:** `story-prep`, `issue-lightbox`, `page-production`, `panel-focus`.

**Primary direction:**
- Show only the creative surface that matters right now.
- Replace dashboard exposure with designed creative rhythm: Issue Lightbox -> Page Production -> Panel Focus.
- Let page and panel art dominate the workspace while support controls recede.
- Make Guided Comics feel like focused comic production software, not an AI/admin dashboard.
- Preserve the existing Guided Comics engine, Advanced Studio handoff, Imageshop, Image Vault, save/load, export, panel geometry, shapes, balloons, and image preservation.

## Source Plan To Preserve

The previous agent's plan remains the north star:

- `Issue Lightbox` is a page-first re-entry hub, not a permanent dashboard.
- `Page Production` makes the comic page the hero and should carry roughly 60-75% of visual attention.
- `Panel Focus` is an immersive close-up for the selected panel, with only beat, dialogue, image/reference tools, style continuity, and panel actions visible.
- Motion should clarify movement: issue overview to page, page to panel, panel back to page or issue.
- Existing state, bridge, geometry, Imageshop, Image Vault, Advanced Studio, save/load, and export contracts stay intact.

## Skill And QA Stack

Use these resources in this order for the next implementation pass:

1. `superpowers:brainstorming`
   - Use only if the next pass changes the intended experience beyond the accepted Issue Lightbox -> Page Production -> Panel Focus choreography.
   - If the work is simply executing this accepted plan, do not restart broad ideation; preserve the current design intent.
2. `frontend-house-style`
   - Use before each visible UI pass to keep the interface dense, authored, hierarchy-led, and creative-tool specific.
3. `build-web-apps:frontend-app-builder`
   - Use for visual hierarchy, concept fidelity, and agency-level polish standards.
   - Because this is a targeted refactor inside an existing design system, do not require a new Image Gen concept unless the next pass becomes a broader redesign or the user asks for visual options.
4. `react-best-practices`
   - Use during React refactors so the giant `GuidedComicFlow.tsx` surface becomes safer, not more tangled.
   - Prefer extracted pure helpers, stable mode selection, primitive dependencies, and event handlers that do not create avoidable re-render churn.
5. `browser` and `frontend-testing-debugging`
   - Use for local/deployed rendered QA after React/CSS changes.
   - Browser QA should prove the flow under test: Story/Prep -> Issue Lightbox -> Page Production -> Panel Focus -> Next Panel -> Return to Page -> Pull Back to Issue.
6. `ui-critic`
   - Use after each rendered UI pass. The review must identify the top 5 design issues by impact and require revision if the screen still feels generic, wasteful, or dashboard-like.

## Mode Intent

### 1. Frontend house style gate

Use `frontend-house-style` before each visible UI pass. The intended hierarchy for this Guided Comics pass is:

- `Panel Focus` is the most immersive state: selected panel first, inspector second, current-page strip third.
- `Page Production` is the assembly state: full page/stage first, page rail second, panel actions third.
- `Issue Lightbox` is the re-entry lens: issue/page scan first, resume action second, metadata last.
- `Story/Prep` stays preparatory: production on-ramp first when pages exist, older writing/prep controls below it.
- Controls should read like compact creative tooling, not equally weighted dashboard cards.

### 2. Issue Lightbox

Purpose:

- Re-entry hub only.
- Show a prominent current page, compact page rail, and only the signals needed to re-enter work.
- Preserve default reopen behavior as last active creative state, with user preference choices for last active, Issue Lightbox, or Page Production.

Watch for:

- Page rail becoming a dashboard.
- Too many metadata/status surfaces competing with the current page.
- Old guided steps or production prep remaining visible after entering a focus state.

### 3. Page Production

Purpose:

- Make the comic page the hero.
- Hide or collapse prep, metadata, dialogue dumps, and old workflow walls.
- Use the compact breadcrumb `Issue -> Page -> Panel`.
- Move secondary controls into quiet contextual drawers or a compact inspector.

Watch for:

- The page falling below the fold.
- Equal-weight cards around the stage.
- Panel controls stealing visual priority from the page.

### 4. Panel Focus

Purpose:

- Clicking a panel should feel like zooming into production detail.
- The selected panel becomes visually dominant.
- Show only beat, dialogue, image/reference tools, style continuity, panel actions, and fast momentum controls.
- Preserve previous panel, next panel, return to page, and pull back to issue.

Watch for:

- Any production dashboard still visible inside Panel Focus.
- Long dialogue or references pushing momentum actions out of reach.
- The panel strip becoming louder than the selected panel.

## Design Gates

Before implementing polish, check:

- Can any repeated rounded card be replaced by a flatter inspector, divider, stage, strip, or toolbar?
- Does the page or selected panel dominate the first viewport?
- Are labels and metadata quieter than creative objects and primary actions?
- Are hover, focus, active, disabled, loading, empty, error, and success states present for new interactive surfaces?
- Is motion used to reveal focus changes instead of decorating every element equally?

### UI critic review gate

Use `ui-critic` after each React/CSS UI change and before calling the pass complete. The review must identify the top 5 design issues by impact and either require another revision or explicitly approve the pass for manual QA.

Review prompts for this refactor:

- Are Issue Lightbox, Page Production, and Panel Focus still too similar in container shape, radius, border, or padding?
- Is any old dashboard surface visible at the same time as a focused creative state?
- Does the selected panel/page own the visual hierarchy without being crowded by metadata?
- Are controls grouped by creator intent: resume, produce, inspect, generate, return?
- Does the motion choreography clarify where the creator is moving: issue to page, page to panel, panel to page?

## Motion Choreography

- Page -> Panel: selected panel expands into focus.
- Panel -> Page: panel rejoins the page context without losing selected page/panel state.
- Panel -> Issue Lightbox: pullback should feel like zooming from panel to page to issue context.
- Issue Lightbox -> Page: selected page comes forward while overview context recedes.
- Reduced motion: instant state changes with subtle opacity/scale only.

## Revised Remaining Work

### Phase A - Full flow manual QA

Run the deployed flow end to end:

1. Story/Prep
2. Issue Lightbox
3. Page Production
4. Panel Focus
5. Next Panel
6. Return to Page
7. Pull Back to Issue

Acceptance criteria:

- Only one focus state owns the main workspace at a time.
- Page Production hides Story/Prep dashboards.
- Panel Focus hides Page Production and issue/dashboard scaffolding.
- Return and pullback actions preserve the selected page/panel context.
- No Advanced Studio, Imageshop, Image Vault, save/load, export, or geometry regressions appear.

### Phase B - Structure the remaining React refactor safely

Use `react-best-practices` while cleaning the giant component:

- Keep mode-selection helpers pure and covered by focused tests.
- Avoid adding new nested component definitions inside `GuidedComicFlow`.
- Use stable handlers and primitive dependencies where practical.
- Prefer small extracted render helpers only when they reduce mode-surface risk.
- Do not refactor `ComicEditor`, routing, or the comic runtime model.

### Phase C - Remove safe legacy dashboard JSX

Retire hidden or no-longer-reachable dashboard JSX only after Phase A and B pass.

Constraints:

- Do not delete helpers still used by saved projects, tests, hidden compatibility paths, or Advanced Studio handoff.
- Keep the old data contracts intact.
- Prefer extracting mode surfaces only if it reduces risk and keeps behavior unchanged.

### Phase D - Stronger saved-comic re-entry

Decide whether saved comics with pages should default to last active, Issue Lightbox, or Page Production.

Decision criteria:

- The previous agent plan preferred last active creative state as default.
- If last active state is missing, Issue Lightbox is the safest fallback for existing comics with pages.
- If an explicit reopen preference exists, preserve it.
- Do not remove `last-active`; treat stronger behavior as fallback and preference handling, not replacement.

### Phase E - Transition and motion polish

Tune mode transitions so focus changes feel intentional:

- Story/Prep to Issue Lightbox: reveal the page-first re-entry lens.
- Issue Lightbox to Page Production: expand from selected page to stage.
- Page Production to Panel Focus: selected panel becomes dominant.
- Panel Focus to Page/Issue: pullback should feel like zooming out of production detail.

Motion constraints:

- Respect `prefers-reduced-motion`.
- Keep timing short and functional.
- Do not animate every control equally.

### Phase F - Responsive and content stress QA

Test with:

- generated art,
- long dialogue,
- many pages,
- missing references,
- narrow laptop widths,
- mobile or tablet-width breakpoints.

Acceptance criteria:

- No overlapping labels, buttons, rails, or inspectors.
- Long dialogue remains readable without pushing core actions off-screen.
- Missing-reference messaging is visible but not louder than the panel/page.
- Page rail and panel strip remain compact.

### Phase G - Regression pass

Run the known regression surfaces:

- Imageshop handoff and return.
- Image Vault guided selection.
- Advanced Studio handoff.
- save/load recovery.
- export path.
- panel geometry, shapes, balloons, and image preservation.

Recommended verification:

- `npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts`
- `npm run lint`
- `npm run build`
- Manual browser QA on local and deployed app when deployment is part of the pass.

## Browser QA Flow

Use the Browser plugin first when available. The flow under test is:

`Story/Prep -> Issue Lightbox -> Page Production -> Panel Focus -> Next Panel -> Return to Page -> Pull Back to Issue`

QA must check:

- Existing comic opens to last active state by default when preference is `last-active`.
- Issue Lightbox is page-first, not dashboard-first.
- Page Production gives the comic page roughly 60-75% of visual attention.
- Panel click enters focused panel editing.
- Panel-to-page and panel-to-issue transitions preserve selected page/panel context.
- Advanced Studio and Imageshop handoffs remain visible and functional from the expected states.
- No relevant console errors or framework overlays appear.

## Non-Goals

- No new portal type.
- No ComicEditor refactor.
- No Supabase or schema expansion.
- No rewritten comic runtime model.
- No automatic balloon placement from Guided Comics.
- No redesign of Advanced Studio, Imageshop, or Image Vault as part of this focus polish.

## Handoff Notes

- Treat `GuidedComicFlow.tsx` as a high-risk, high-context file. Prefer small, reversible edits.
- Keep changes additive until the focused surfaces pass manual QA.
- The UI critic gate should be run after screenshots or browser inspection whenever possible.
- If the next pass only changes implementation docs, no browser QA is required; if it changes React or CSS, browser QA is required before completion.
