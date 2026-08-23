# ARCS — Refactoring & Debugging Roadmap

Written 2026-08-17, after the audit pass on branch `refactor/arcs-audit-2026-08` (commit `ce31f9d`).

**Current health (2026-08-23):** `tsc -b` clean · ESLint 0 errors / 0 warnings · 1285 tests across
160 files passing · production build has no oversized-chunk warnings.

## 2026-08-23 completion update

The weekly full-debug/refactor pass completed the actionable backlog recorded here:

- §2a and §2b were completed by the six existing audit-branch commits: balloon geometry is
  registry-driven and the engine now has geometry, snapping, migration, and rendering coverage.
- §2c is complete: `RibbonButton` is reusable, and `MenuBar` plus `ContextualRibbon` consume the
  same memoized document-command and viewport-control interfaces instead of threading individual
  callbacks.
- §2d has completed its safe decomposition pass. Reusable tag controls, Imageshop navigation,
  Guided progress UI, and Writer searchable menus now live in focused modules. Optional Writer
  workspaces and the Guided/Advanced Comic workspaces are demand-loaded. The remaining portal
  bodies retain orchestration state whose extraction would create broad prop sacks rather than
  deeper modules; future feature work should move a complete state-and-behavior slice when a new
  cohesive seam appears.
- §2e is complete. Authenticated vault mutations now obtain a narrowed client and contain no
  non-null Supabase assertions.
- The four lint warnings in the old appendix are gone, and the executable TypeScript scan contains
  no unsafe `any` usage.

The sections below remain as historical rationale and extension guidance, not an open audit queue.

---

## Part 1 — Quality-of-life work on the Advanced Comic Portal

Short answer: **rearranging buttons is trivial, adding a tail type is easy, adding a balloon type is
medium.** The detail matters, so here is each one with the exact files involved.

### 1a. Rearranging existing toolbar buttons — ★☆☆☆☆ (trivial, minutes)

Every toolbar in the portal is hand-written JSX with one `<button>` block per control. There is no
ordering config, no registry, no index numbers — the visual order *is* the source order.

| Toolbar | File | Lines |
| --- | --- | --- |
| Top menu bar (Home / Edit / View / Panel / Balloon) | `src/modes/comic/components/MenuBar.tsx` | 479 |
| Contextual ribbon (changes with active menu) | `src/modes/comic/components/ContextualRibbon.tsx` | 534 |
| Object toolbar (shape / arrange / group) | `src/modes/comic/components/ObjectToolbar.tsx` | 412 |
| Text toolbar | `src/modes/comic/components/TextToolbar.tsx` | 439 |
| Balloon picker strip | `src/modes/comic/components/BalloonRibbonContent.tsx` | 223 |

To reorder, cut and paste the `<button>` block. To move a control between toolbars, cut and paste it
plus whatever store fields it reads (all of these components already pull from `useComicStore`, so
the action is usually available in both places already).

**One caveat.** The buttons are visually grouped by `border-r border-white/20 pr-2 mr-1` wrapper
divs. Moving a button out of a group without moving the wrapper leaves a stray divider. Look for the
enclosing `<div className="flex flex-nowrap items-center gap-1 border-r ...">` before cutting.

### 1b. Adding a new toolbar button — ★★☆☆☆ (easy, ~30 min)

Two cases:

**Case A — the action already exists in the store** (most of them do: `addPanel`, `splitPanel`,
`bringToFront`, `toggleFlip`, `createGroup`, `setKnifeMode`…). Copy an adjacent button block, swap
the icon, label and handler. Add the action name to the `useShallow` selector at the top of the
component. **One file, done.**

**Case B — the action lives in `ComicLayout`** (save, load, export, zoom, undo/redo, theme). These
are threaded down as props. `MenuBarProps` currently has 25 of them. You need three edits:
1. Add the callback to the props interface in `MenuBar.tsx`
2. Pass it from `ComicLayout.tsx` (~line 402, the `<MenuBar>` block)
3. Render the button

That prop-threading is the friction point, and it's the thing worth fixing — see §2c below.

**If the button needs a keyboard shortcut**, that's a fourth edit: the shortcut handler is a single
`keydown` listener in `ComicLayout.tsx` around line 179.

### 1c. Adding a new tail type — ★★☆☆☆ (easy, ~1 hour) — *with one real gotcha*

Tails are cleanly factored. `renderTail()` in `BalloonNode.tsx` (line ~645) branches on
`styleDef.tailStyle`, which is a four-way union in `src/types/balloon.ts`:

```ts
tailStyle: 'straight' | 'curved' | 'spiky' | 'bubbles';
```

Adding e.g. `'wavy'` means:
1. Add `'wavy'` to that union — `src/types/balloon.ts` line 37
2. Add one branch to `renderTail()` returning a `<Path data={...} />`, alongside the existing
   `bubbles` and `spiky` branches
3. Set `tailStyle: 'wavy'` on whichever entries in `BALLOON_STYLES` should use it

**The gotcha, and it will bite you.** `renderTail()` bails out on its third line:

```ts
if (unifiedEllipseTailPath || unifiedRoundedRectTailPath) return null;
```

For ellipse-shaped and rounded-rect balloons the tail is *baked into the body outline* as one
continuous path (so it blends into the bubble with no seam) rather than drawn separately. So
`tailStyle` is ignored for those, and `renderTail()` is reached by **exactly one style in the app
today: Fluffy Cloud.** A new tail type will show up there and nowhere else, with no warning.

To put it on the round/whisper styles you also have to extend the `unifiedEllipseTailPath` memo
(line ~233); for Modern Square and Narration Box, `unifiedRoundedRectTailPath` (line ~327). That's
the harder half. Budget a couple of hours if you want a new tail everywhere.

> ### ⚠ Bug found while tracing this — three styles draw no tail at all
>
> `renderBody()` returns early for custom-shaped styles *before* it reaches the
> `unifiedEllipseTailPath` fallback, but `renderTail()` still bails because that path is non-null.
> The tail is computed, never drawn by either function, and silently vanishes.
>
> Affected (all declare `hasTail: true`, all render tailless):
>
> | Style | Declared tail | `renderBody` early-returns at |
> | --- | --- | --- |
> | **Thought Cloud** (`thought_cloud`) | `curved` | line ~474 (shares the fluffy-cloud outline) |
> | **Radio / Electric** (`radio_electric`) | `spiky` | line ~618 (sawtooth ellipse) |
> | **Spiky Shout** (`shout_spiky`) | `spiky` | line ~547 (starburst path) |
>
> Thought Cloud is reachable from the Balloons picker in `ContextualRibbon` (line 486, which passes
> `hasTail: true` explicitly), so this is user-visible, not theoretical. It also means the `curved`
> tail branch has no live consumer anywhere in the app.
>
> The fix depends on intent — merge the tail into each custom outline, or let those styles fall
> through to `renderTail()`. Both are one-line-ish changes once you decide, but it's a *visual*
> change, so it wants your eyes on the canvas. **§2a makes this class of bug impossible** by making
> the body path and the tail attachment mode two required fields on the same object.

### 1d. Adding a new balloon type — ★★★☆☆ (medium, ~2–3 hours) — *scattered seams*

This is the one to be careful with. The `BalloonStyle` object is data, but the **shape geometry is
not** — it's a chain of `if (styleDef.id === '...')` branches inside `BalloonNode.tsx`. There are
seven places a new style can need touching, and four of them fail *silently* if you miss them:

| # | File | What | Fails how |
| --- | --- | --- | --- |
| 1 | `src/types/balloon.ts` | Add id to the `BalloonStyleId` union | Compile error — safe |
| 2 | `src/modes/comic/data/BalloonStyles.ts` | Add the style entry | Compile error — safe |
| 3 | `BalloonNode.tsx` ~474–640 | Add the body-path geometry branch | **Renders as a plain ellipse** |
| 4 | `BalloonNode.tsx` line ~231 `ellipseOnlyIds` | Add id if it is *not* ellipse-based | **Tail merges wrongly, or vanishes** |
| 5 | `BalloonRibbonContent.tsx` `balloonStyleIcon()` | Icon mapping (string `.includes()` heuristic) | **Wrong icon** |
| 6 | `BalloonRibbonContent.tsx` `RIBBON_BALLOON_STYLES` | Curated 5-style quick strip | Style missing from the strip |
| 7 | `ContextualRibbon.tsx` line ~471 | Hardcoded `['speech_round', 'speech_rounded_rectangle', 'thought_cloud']` | Style missing from that picker |

Two things make #3–#4 worse than they look:

- **`ellipseOnlyIds` is misnamed.** It is the list of ids that are *not* ellipse-based —
  `isEllipseStyle` is computed as `!ellipseOnlyIds.includes(id)`. So a new style that you forget to
  add gets treated as an ellipse by default and silently picks up the merged-tail path.
- **The default is wrong-but-plausible.** A missing geometry branch doesn't crash; it draws a
  generic ellipse. That renders fine, so the bug looks like "my new balloon shape didn't save"
  rather than "I forgot a branch."

**Recommendation before you add balloon #17:** spend an hour on §2a below first. It converts steps
3–7 into one data entry and turns the silent failures into compile errors. That hour pays for itself
on the second balloon.

---

## Part 2 — Refactoring priorities

Ordered by *value per unit of risk*, not by size.

### 2a. Make the balloon registry data-driven — HIGH value, LOW risk ★

**The problem.** `BalloonNode.tsx` is 1,171 lines, and roughly 200 of them are a hardcoded
`if (styleDef.id === ...)` cascade that duplicates knowledge already implied by the style data.

**The fix.** Extend `BalloonStyle` so the geometry travels with the style:

```ts
export interface BalloonStyle {
  // …existing fields…
  /** Body outline generator. Receives half-width/half-height and returns an SVG path. */
  bodyPath: (halfW: number, halfH: number, style: BalloonStyle) => string;
  /** How the tail attaches: merged into the body outline, or drawn as a separate shape. */
  tailAttachment: 'merged-ellipse' | 'merged-rounded-rect' | 'separate';
}
```

Move each existing `if` branch into a named function in a new
`src/modes/comic/data/balloonGeometry.ts`. `BalloonNode` then calls `styleDef.bodyPath(...)` and
switches on `tailAttachment` — no ids in the renderer at all.

**Why this is low risk:** it's a pure extraction. Every branch becomes a function with the same body.
Making both new fields *required* means TypeScript refuses to compile a style that's missing either
one — the silent failures in the table above become compile errors. Adding balloon #17 afterwards is
a single entry in one file.

Also fix `ellipseOnlyIds` while you're in there: either rename it to `nonEllipseStyleIds` or, better,
delete it once `tailAttachment` exists.

**Do this before any new balloon work.** ~1–2 hours.

### 2b. Characterization tests for the comic engine — HIGH value, LOW risk ★

This is the biggest gap in the codebase and it sits directly under the work you want to do:

| Area | Test files | Source files |
| --- | --- | --- |
| **`modes/comic`** | **4** | **46** |
| `portals/writer` | 62 | 66 |
| `portals/storyline` | 19 | 30 |
| `stores` | 10 | 12 |
| `components/ui` | 1 | 19 |

The Writer portal is thoroughly covered — 62 test files — which is why the audit found almost nothing
wrong with it. The comic engine has near-zero coverage, which is why it held the one genuine crash
bug (the conditional hooks in `ComicCanvas`).

You don't need component tests with Konva in jsdom — that's painful and low-yield. Test the pure
functions instead, which is where the actual logic lives:

- `utils/geometry.ts` — `splitConvexPolygon`, `pointInPanel`
- `utils/snapping.ts` — `getGutterAwareSnapLines`, `getVertexSnapLines`
- `utils/circularPanelPaths.ts` — the arc/sector path builders
- `data/balloonGeometry.ts` — once §2a exists, snapshot the path string for every style. Sixteen
  one-line assertions that catch any geometry regression permanently.

That last one is the payoff: after §2a, a snapshot test per balloon means you can add or edit shapes
without fear.

~2–3 hours, and it makes everything after it cheaper.

### 2c. Collapse toolbar prop-threading and button duplication — COMPLETED 2026-08-23

`MenuBarProps` has 25 members, almost all `() => void` callbacks threaded from `ComicLayout`. And the
buttons themselves are heavily duplicated — `ObjectToolbar.tsx` alone repeats the
`className={ribbonIconBtn} style={active ? {background: ACCENT_GOLD_GRADIENT, …} : …}` pattern 20
times.

Two independent, easily-reverted improvements:

1. **Extract a `<RibbonButton>` component** taking `{ icon, label, active, onClick, title }`. The
   shape-picker section of `ObjectToolbar` goes from ~60 lines to ~10, and adding a button becomes
   one line instead of ten.
2. **Group the `ComicLayout` callbacks into a context or a single `actions` object.** `onSave`,
   `onLoad`, `onImportImage`, `onExportPng`, `onExportPdf`, `onUndo`, `onRedo`, `onCut`, `onCopy`,
   `onPaste`, the four zoom handlers — these are one cohesive "document commands" bundle. Passing
   them as `commands={documentCommands}` removes the three-file edit from §1b Case B.

Do this if toolbar work is going to be a recurring theme. ~2 hours.

### 2d. Decompose the four monoliths — COMPLETED SAFE-SEAM PASS 2026-08-23

| File | Lines |
| --- | --- |
| `src/portals/writer/WriterPortal.tsx` | 12,812 |
| `src/portals/guided-comic/GuidedComicFlow.tsx` | 10,297 |
| `src/portals/storyline/GenericImageLabPanel.tsx` | 3,879 |
| `src/portals/CharacterStudio.tsx` | 2,989 |

These two alone are 23k lines — a fifth of the codebase in two files. Both exceed Babel's 500KB
pretty-printing threshold, which is why ESLint prints a deopt warning on them.

**Do not attempt these in one pass, and do not start with WriterPortal.** Suggested order:

1. **`CharacterStudio.tsx` (2,989) first** — smallest, and it shares structure with `AssetsStudio.tsx`
   (1,652). Extracting the common reference-slot grid, vault modal wiring and generation panel into
   shared components fixes *two* files and establishes the pattern.
2. **`GenericImageLabPanel.tsx` (3,879)** next — it already has a good test file
   (`GenericImageLabPanel.productionStudio.test.tsx`, 1,696 lines) to refactor against.
3. **`GuidedComicFlow.tsx`** — 10 test files already cover the bridge logic. Extract per-step
   components; the step boundaries are natural seams.
4. **`WriterPortal.tsx` last**, and only in slices. It has 62 test files backing it, which is the only
   reason this is tractable at all. Extract one cockpit panel at a time, run the suite after each.

Rule for all four: **extract, don't rewrite.** Move code into a new file, pass what it needs as
props, change nothing else, run the tests. Anything that changes behaviour belongs in a separate
commit from anything that moves code.

Budget: a session per file, minimum. `WriterPortal` is several.

### 2e. Replace the `supabase!` assertions — COMPLETED 2026-08-23

12 sites across `arcsVault.ts`, `arcsAssetVault.ts` and `arcsArchive.ts` do
`supabase!.from('characters')…`, guarded by an `async` configuration check that TypeScript can't
narrow through. Safe today. Fragile if someone reorders a guard — the failure would be a raw
`TypeError: Cannot read properties of null` rather than a handled error.

A `requireSupabase()` helper returning the client or throwing a labelled error would fix all 12.
Worth doing when you're next in those files; not worth a dedicated session.

---

## Part 3 — Original suggested order (completed audit history)

| # | Task | Effort | Risk | Why here |
| --- | --- | --- | --- | --- |
| 0 | **Missing tails on Thought Cloud / Radio / Spiky Shout** (§1c) | 30 min | Low | Live visual bug; decide the intended look first |
| 1 | §2a data-driven balloon registry | 1–2 h | Low | Unblocks the QoL work and removes 4 silent-failure modes |
| 2 | §2b comic-engine tests | 2–3 h | Low | Makes everything after it safe; closes the coverage gap |
| 3 | **QoL features** (§1a–1d) | varies | Low | Now cheap and verifiable |
| 4 | §2c toolbar extraction | ~2 h | Low | Only if toolbar work recurs |
| 5 | §2d `CharacterStudio` + `AssetsStudio` | 1 session | Medium | Two files for one refactor |
| 6 | §2d remaining monoliths | multiple | High | One per session, tests after each |
| 7 | §2e `requireSupabase()` | 30 min | Low | Opportunistic |

Steps 1 and 2 total roughly half a day and convert the balloon/tail work from "medium, with traps"
to "trivial, with a test proving it." If you only do one thing from this document, do §2a.

---

## Appendix — resolved lint warnings

The four warnings recorded on 2026-08-17 were removed on 2026-08-23:

- The Edge entry uses the imported Supabase client type; pacing persistence exposes a narrow query
  interface that both the real client and tests satisfy.
- The Writer outline test reads the inferred passthrough field directly.

`react-hooks/rules-of-hooks` is now `'error'` and must stay that way; it was disabled, and that is
what hid the `ComicCanvas` crash.
