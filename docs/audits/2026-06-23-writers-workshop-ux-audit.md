# Writers' Workshop UX Audit - 2026-06-23

## Scope

This audit reviews the Writers' Workshop user experience without implementing changes. It focuses on workflow order, confusing labels, missing tooltips/helper notes, image alignment and Vault sync friction, and low-risk improvements that should not break the working app.

## Evidence reviewed

- Rendered local app at `http://127.0.0.1:5174/` in Writers' Workshop.
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/WriterRibbon.tsx`
- `src/portals/writer/WriterStudioDock.tsx`
- `src/portals/writer/writerWorkflowChronology.ts`
- `src/portals/writer/writerSearch.ts`
- `src/portals/writer/writerNextStep.ts`
- `src/portals/writer/writerHelpRegistry.tsx`
- `src/portals/writer/writerVisualReferences.ts`
- `src/portals/writer/writerImageshopReturn.ts`
- `tasks.md`
- `docs/superpowers/plans/2026-06-01-imageshop-comic-production-portal-plan.md`

## Executive summary

Writers' Workshop is functional and already contains strong building blocks: a focused mode, a full tool ribbon, workflow chronology, help registry, keyboard hints, a right-side dock, Visual Canon attachment, Vault loading, and Imageshop handoff/return plumbing. The UX problem is not missing capability. The problem is that several useful systems are visible at the same time, use overlapping labels, and sometimes describe internal implementation details instead of the user's next task.

The safest path is not a redesign first. The safest path is a low-risk clarity pass: align labels, add plain-language microcopy, simplify the primary workflow path in Focused mode, and explain the snapshot behavior of Visual Canon/Vault references. After that, add small edit/refresh affordances for attached visual references before considering deeper data-sync changes.

## Findings

### 1. The workflow has too many competing maps

The current rendered first screen can show the top status row, Focused/All Tools controls, series/issue/page selectors, ribbon menus, workspace tabs, edit controls, a production map, the Visual Canon workspace, and the right/bottom dock. Each piece is individually useful, but together they create a "where do I start?" problem.

Relevant source evidence:

- `writerWorkflowChronology.ts` defines a 14-step workflow: Dashboard, Selection, Story Setup, Synopsis, Visual Canon, Canon, Outline, Pages, Beats, Dialogue, Visual Prep, Audit, Cockpit, Export.
- `writerSearch.ts` defines a different tab order: Dashboard, Outline, Visual Canon, Beats, Dialogue, Arc, Export, Scripts, Lore, Video, Cockpit.
- `WriterRibbon.tsx` exposes another interaction layer through File/Home/Insert/Review/View/AI Tools/Help.
- `WriterPortal.tsx` renders the production map and focused workspace controls in the same viewport.

Impact:

- Users may not know whether the production map, workspace tabs, top next-action prompt, or ribbon is the authoritative path.
- The same area can be described as "Synopsis", "Scripts", "Story Setup", "Outline", or "Foundation" depending on where the user is looking.

Low-risk recommendation:

- Make Focused mode the single visible path for ordinary writing work.
- Keep All Tools for power use, but make it feel like an advanced drawer, not the default mental model.
- Align the visible stage order, workspace tabs, and next-action labels to one shared vocabulary.

### 2. Several labels are accurate but not intuitive

The current labels are technically meaningful, but some ask the user to translate product language before acting.

Labels worth revisiting:

- `Selection`: clearer as `Choose Story` or `Choose Series/Issue`.
- `Story Setup`: clearer as `Foundation`.
- `Canon`: clearer as `Story Canon` or `Story Canon (Lore)`.
- `Visual Canon`: good concept, but should carry a short subtitle such as `Images the AI should keep consistent`.
- `Visual Prep`: clearer as `Imageshop Prep` or `Image / Shot Prep`.
- `Audit`: clearer as `Story Review` or `Pacing & Continuity`.
- `Cockpit`: evocative but unclear; clearer as `Compare & Review` or `Review Cockpit`.
- `Scripts`: if it means synopsis helper, the user-facing label should say `Synopsis Helper`.

Impact:

- Users may avoid powerful tools because the names do not tell them what the tool does or when to use it.

Low-risk recommendation:

- Rename labels and subtitles only; avoid changing internal ids or data structures.
- Use one-line helper text below each workspace heading: "Use this when..." or "This affects...".

### 3. Tooltips and help exist, but the copy is too technical in places

`writerHelpRegistry.tsx` already contains a substantial help system and `WriterSectionTip` infrastructure. The issue is copy tone and placement, not lack of infrastructure.

Examples of user-facing help that currently leans technical:

- Mentions of Supabase environment variables.
- Mentions of `writer_pages` rows.
- Mentions of `writer_tools` Edge Function behavior.
- Mentions of `notes.writer_tool_cache`.
- JSON-focused guidance in places where the user likely wants a plain task explanation.

Impact:

- Help can feel like operator documentation rather than in-app assistance.
- A user trying to decide "what happens if I click this?" may get implementation detail instead of confidence.

Low-risk recommendation:

- Split help into two levels:
  - Primary tooltip: one plain-language sentence.
  - Help modal details: optional technical explanation.
- Add helper notes to high-friction controls: Refresh vault, Role, Attach to issue, Continue to beats, Send to Imageshop, Apply returned images, Copy/export.

### 4. Visual Canon is snapshot-based, so Vault sync feels broken even when the code is behaving as designed

`writerVisualReferences.ts` stores attached reference data inside issue notes: source, source id, label, kind, image URL, note, and linked timestamp. It includes merge/remove helpers but no update helper for changing an attached reference's kind, note, label, or image URL in place.

Observed UX:

- The Visual Canon screen can load Character Vault and Asset Vault images.
- Character Vault references are forced to role `Character`.
- Asset Vault references can be attached as `Location / set` or `Prop / asset`.
- Attached references are described as visual canon for page-beat AI calls.
- There is a `Refresh vault` concept in code, but it refreshes available Vault choices, not already-attached issue references.

Impact:

- If an image changes in the Vault, the issue's attached reference can become stale.
- If the user needs to change a reference from Location to Character or Prop, the current path is effectively remove/re-add.
- Users may reasonably expect attached Vault references to stay linked, but they behave more like snapshots.

Low-risk recommendation:

- Add clear microcopy: `Attached references are snapshots. Refresh attached refs to pull latest Vault names/images.`
- Add inline edit controls for attached reference role, label, and note.
- Add a `Refresh attached refs from Vault` action that updates labels/image URLs from source ids without altering generated story text.
- Keep live auto-sync as a later phase because it has broader data and regression risk.

### 5. Visual reference updates can leave stale synopsis/helper text

`mergeVisualReferencesIntoSynopsisParts` appends visual reference lines into synopsis helper fields. That is useful, but it creates a second copy of reference context outside the attached visual reference list.

Impact:

- Removing or editing an attached reference may not clean up or revise already-appended synopsis helper text.
- Users can see different truth in the attached refs list versus the helper text that AI uses.

Low-risk recommendation:

- Add a visible note when attaching references: `This also adds reference notes to the synopsis helper.`
- For the first editability pass, update only the attached reference list and warn if synopsis text may need review.
- In a later pass, consider rebuilding generated reference text from the canonical attached refs list instead of appending permanent lines.

### 6. Imageshop handoff/return is powerful but not framed as a clear workflow

Writer can send outline/page/shot context to Illustrator's Imageshop and merge returned image maps into page beats. The underlying bridge is valuable. The UX gap is that users may not understand what was sent, what came back, or where returned images now live.

Relevant source evidence:

- `WriterPortal.tsx` includes send-to-Imageshop paths and return handling.
- `writerImageshopReturn.ts` merges returned image output into `beats_json`.
- Existing project plans identify Imageshop as the comic-page image production surface while Writers supplies story/page/panel JSON.

Impact:

- Users may think Vault edits should change Workshop images automatically.
- Users may not know whether returned Imageshop images are stored in Vault, beats, or both.
- Users may not know whether to send a page, a shot plan, or the whole issue.

Low-risk recommendation:

- Add a compact `Imageshop handoff status` panel in Visual Prep:
  - what will be sent,
  - what has returned,
  - which page/panels were updated,
  - where to review the result next.
- Add a return-history card with `returned_at`, panel count, and `Open page beats`.

### 7. Focused vs All Tools is helpful, but it needs a clearer promise

Focused mode is a good direction because it reduces overload. The risk is that users may not understand whether Focused hides important tools.

Impact:

- Users may stay in All Tools because they fear missing controls.
- Or they may stay in Focused and not know where advanced functions went.

Low-risk recommendation:

- Rename or subtitle the switch:
  - `Focused` -> `Simple Workflow`
  - `All Tools` -> `Advanced Tools`
- Add a brief note near the switch: `Simple Workflow shows the main path. Advanced Tools shows batch, JSON, and review controls.`
- Keep the current state behavior unchanged.

## Phased recommendations

### Phase 1: Clarity pass, no state changes

Goal: reduce confusion without touching persistence, generation, Vault sync, or Imageshop data flow.

Recommended work:

- Align visible workflow labels and order across the production map, workspace tabs, and next-action copy.
- Rename ambiguous labels where possible without changing internal ids.
- Add short workspace subtitles and empty-state explanations.
- Rewrite primary tooltips to be plain-language first.
- Keep technical help in the Help modal or an Advanced Details section.
- Rename or subtitle Focused/All Tools.
- Rename the dock `Shortcuts` tab to `Help / Shortcuts` if it contains user assistance.

Risk: low.

Suggested smoke test:

- Open Writers' Workshop locally.
- Confirm Focused mode still loads.
- Confirm every workspace tab still navigates.
- Confirm no existing actions disappear.
- Confirm no console errors.

### Phase 2: Visual Canon editability and explicit snapshot behavior

Goal: make attached references understandable and editable without building full live sync.

Recommended work:

- Add inline role/note/label edit controls for attached references.
- Add `Refresh attached refs from Vault`.
- Add status text explaining attached refs are snapshots.
- Add helper copy explaining what `Attach to issue` affects.
- Preserve remove/re-add as a fallback.

Risk: low to medium.

Suggested smoke test:

- Attach one character and one asset reference.
- Edit an asset reference role from Prop to Location.
- Refresh attached refs.
- Confirm generated data is not unexpectedly overwritten.
- Confirm removing a reference still works.

### Phase 3: Imageshop bridge clarity

Goal: make the existing Writer-to-Imageshop workflow understandable.

Recommended work:

- Add a Visual Prep handoff checklist.
- Distinguish `Send page`, `Send shot plan`, and `Open Imageshop`.
- Show return status after Imageshop output is merged.
- Add `Open affected page beats` after return merge.

Risk: medium.

Suggested smoke test:

- Send a page/shot context to Imageshop in local QA.
- Return to Writers.
- Confirm returned image map updates the expected page beats.
- Confirm status copy explains what happened.

### Phase 4: Workflow consolidation

Goal: reduce duplicated navigation once labels and help copy have been proven safe.

Recommended work:

- Make one primary workflow rail authoritative in Focused mode.
- Demote the production map to an optional overview.
- Keep ribbon/workspace tabs for Advanced Tools.
- Add a small `What should I do next?` panel driven by `writerNextStep.ts`.

Risk: medium to high because this changes navigation hierarchy.

Suggested smoke test:

- Full Writers' Workshop navigation pass across Dashboard, Foundation, Visual Canon, Beats, Dialogue, Review, Export.
- Confirm saved issue/page selection survives mode switches.
- Confirm keyboard shortcuts and Help still work.

### Phase 5: True Vault sync policy

Goal: decide whether Writer references are snapshots, live links, or manually refreshed links.

Recommended work:

- Define the source of truth for image role, label, and URL.
- Consider storing durable source metadata that can be refreshed safely.
- Decide whether Vault changes should auto-update issues or require user confirmation.
- Review how synopsis helper text should be rebuilt or cleaned up when references change.

Risk: high relative to the earlier phases because this touches cross-portal data expectations.

Suggested smoke test:

- Change an image in Vault.
- Confirm Writer reports stale vs refreshed state clearly.
- Confirm no generated page beats are unexpectedly changed.
- Confirm Imageshop handoff receives the intended latest references.

### Phase 6: App-wide user-facing feature completeness standards pass

Goal: apply the updated user-facing feature completeness standard to the existing ARCS app in a controlled, non-disruptive way after the Writers' Workshop-specific UX work is understood. This should not be treated as an immediate redesign or a reason to rebuild working portals.

Recommended work:

- Inventory each major portal for discoverability, visible primary controls, secondary access paths, keyboard support, contextual actions, empty/loading/error states, persistence expectations, accessibility labels, and responsive behavior.
- Start with documentation and issue-style findings before implementation so working areas are not destabilized.
- Rank gaps by user impact and regression risk.
- Prefer small completeness additions first: helper notes, button labels, tooltips, empty states, keyboard hints, confirmation text, disabled-state explanations, and recovery paths.
- Defer structural redesigns, data-model changes, and cross-portal synchronization changes until a portal-specific pass proves they are necessary.
- Apply the standard to one portal at a time, with a smoke test after each portal.

Risk: medium to high because the standard applies across the full app and can easily expand in scope if not kept incremental.

Suggested smoke test:

- For each portal touched, verify the primary workflow starts, completes, and recovers from an empty or missing-selection state.
- Confirm the most important controls are visible, labeled, and keyboard reachable.
- Confirm no existing save/generate/export workflow regresses.
- Run the relevant targeted tests plus build before considering a portal pass complete.

## Recommended first implementation slice

Start with Phase 1 only. It gives the user immediate relief with the least risk: clearer labels, helper notes, and tooltips, with no persistence changes and no generation behavior changes.

Suggested first target files:

- `src/portals/writer/writerWorkflowChronology.ts`
- `src/portals/writer/writerSearch.ts`
- `src/portals/writer/writerNextStep.ts`
- `src/portals/writer/writerHelpRegistry.tsx`
- `src/portals/writer/WriterStudioDock.tsx`
- Limited `src/portals/writer/WriterPortal.tsx` edits only for visible helper notes or headings.

## Acceptance criteria for the next implementation pass

- A new user can identify the next recommended Writers' Workshop step without opening All Tools.
- The difference between Story Canon and Visual Canon is visible in plain language.
- Visual Canon explains that attached Vault images are used as AI visual references.
- Visual Canon explains whether attached references are snapshots or live synced.
- Existing generation, save, Vault loading, and Imageshop handoff behavior remain unchanged.
- Local smoke test passes without console errors.
