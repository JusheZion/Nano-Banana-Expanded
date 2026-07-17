# Writers' Workshop Timeline Motion Polish Plan

Date: 2026-07-17
Status: Approved for autonomous implementation

## Product decisions

- A user's first visit to Writers' Workshop and first visit to each major output workspace use a longer cinematic reveal with visible travel.
- Later visits use restrained editorial motion.
- Entrance choreography plays when entering Writers' Workshop and when opening a major workspace, not on every data refresh or minor interaction.
- Simple Workflow pulses only the single recommended next action.
- Advanced Tools may pulse several important currently available actions.
- Pulses are bounded, stop after interaction, and never replace labels or status feedback.
- `prefers-reduced-motion` removes travel, staggering, pulsing, and animated height changes while keeping every state immediately available.
- Existing layouts, colors, gradients, and visual identity remain unchanged.

## Risk and dependency check

- The repository has no motion library. Prefer scoped CSS keyframes, CSS custom properties, and small React primitives rather than adding a runtime dependency.
- Replaying entrance motion must not remount stateful editors or reset inputs.
- Native disclosure semantics, keyboard focus, and hidden-content interaction must survive animated expansion.
- Motion must not cause document overflow, cumulative layout shift, delayed primary actions, or persistent GPU work.
- Preserve the user's unrelated `AGENTS.md` modification.

## Pass 1 - Motion inventory and contract

Objective: map the Writer hierarchy, major workspace boundaries, disclosure surfaces, attention targets, and reduced-motion requirements.

- [x] Inventory Simple Workflow, Advanced Tools, 13 stages, major output workspaces, dock, dialogs, menus, and disclosures.
- [x] Define cinematic and editorial timing tokens, easing, travel, stagger, replay, and pulse lifecycle.
- [x] Record selectors/components that must remain motion-free.

Acceptance: every planned motion has a purpose, replay boundary, and reduced-motion fallback.

Smoke: passed. The inventory was compared against both modes, the authoritative 13-stage chronology, overlays, the dock, native disclosures, and stateful editor boundaries.

## Pass 2 - Shared Writer motion primitives

Objective: implement reusable, Writer-scoped choreography rather than one-off animation classes.

- [x] Add timing/easing/keyframe tokens and reduced-motion overrides.
- [x] Add reusable entrance groups/items with first-visit persistence and major-workspace replay keys.
- [x] Add bounded Simple and Advanced attention treatments.
- [x] Add reusable animated disclosure behavior without fixed content heights.

Acceptance: primitives do not remount stateful content, trap focus, or animate outside Writers' Workshop.

Smoke: component-level normal/reduced-motion checks and production build.

Result: passed. Writer-scoped primitives compile cleanly, storage failure falls back to editorial motion, and stateful workspace content is not keyed or remounted.

## Pass 3 - Timeline entrances and workspace transitions

Objective: choreograph header -> mode/tabs -> navigation -> sections -> output workspace.

- [x] Apply cinematic first-entry motion and restrained revisits.
- [x] Apply major-workspace transitions across the 13-stage flow.
- [x] Cancel/restart cleanly during rapid navigation.
- [x] Keep content actionable while motion plays.

Acceptance: sequence communicates hierarchy without delaying work or producing layout shift.

Smoke: navigate all stages, switch modes, revisit stages, and reload.

Result: passed. Signed-in browser QA confirmed cinematic first entry, editorial revisits, stable workspace state, and no horizontal overflow.

## Audit 1 / midpoint QA

- [x] Independent accessibility and state audit.
- [x] Focused tests, build, responsive browser check, and reduced-motion check.
- [x] Repair every scoped failure before Pass 4.

Result: passed after repairing keyboard dock focus transfer, single-action Simple cue selection, persistent cue dismissal, and stable focus styling.

## Pass 4 - Disclosures and dock motion

Objective: smooth appropriate expand/collapse interactions while preserving semantics.

- [x] Animate targeted details/disclosures, Story Library/dock, and supported expandable sections.
- [x] Preserve Escape, Enter/Space, focus order, screen-reader state, and dynamic content sizing.
- [x] Prevent clipping and scroll jumps.

Acceptance: every targeted region opens and closes smoothly in normal motion and immediately in reduced motion.

Smoke: keyboard, pointer, phone, short landscape, and dynamic-content disclosure checks.

Result: passed. Native disclosure semantics remain intact, dock focus preservation has a regression test, phone dock behavior is responsive, and reduced motion removes size transitions.

## Pass 5 - Mode-aware engagement

Objective: direct attention without distracting the author.

- [x] Pulse only the recommended next action in Simple Workflow.
- [x] Pulse several important available Advanced Tools actions.
- [x] Stop attention motion after interaction, stage change, bounded cycles, or reduced-motion preference.
- [x] Add restrained hover/press/success-settle feedback where it improves clarity.

Acceptance: attention cues remain contextual, bounded, and subordinate to writing content.

Smoke: exercise Foundation, generation, review, Export, Trash, Undo, and Restore states.

Result: passed for the available signed-in states. Simple mode exposed exactly one enabled cue, Advanced markings are capped to three ribbon actions, and dismissal survived a workspace round-trip.

## Pass 6 - Full signed-in interaction and responsive QA

Objective: validate motion across real Writer states.

- [x] Test empty, selected, working, output, loading, success, error, and restored states.
- [x] Test desktop and phone layouts with normal motion; verify reduced-motion behavior through scoped CSS and automated policy coverage.
- [x] Test rapid stage changes, repeated workspace visits, reload, and restored workspace state.
- [x] Repair blockers; record nonblocking follow-ups.

Acceptance: no interaction delay, focus regression, overflow, clipping, console error, or persistent animation.

Smoke: signed-in representative Writer workflow in the in-app browser.

Result: passed. The local demo account exercised empty and selected series states, saved canon actions, cue dismissal, revisit behavior, desktop/phone layouts, and console/overflow checks.

## Pass 7 - Regression, final audits, and documentation

Objective: establish release readiness.

- [x] Add focused motion, replay, attention, disclosure, and reduced-motion tests.
- [x] Run full tests, lint, build, and diff checks.
- [x] Run final ReAct, QA, accessibility/performance, and strict UI-critic audits.
- [x] Update this plan, `tasks.md`, UX guidance, and `walkthrough.md`.
- [x] Perform DOX closeout without altering unrelated contracts.

Acceptance: all release gates pass and no material audit finding remains.

Smoke: final signed-in local release-candidate check.

Result: passed. The final UI critic required replay, Advanced-cue, dock-size, pulse-duration, and compact-motion repairs; the re-audit approved deployment. Writer regression, lint, build, diff, signed-in local, and phone checks are clean.

## Pass 8 - Commit, deploy, and live verification

Objective: deploy only the verified diff.

- [ ] Commit and push scoped changes, excluding unrelated `AGENTS.md` edits.
- [ ] Deploy to Cloudflare.
- [ ] Verify the signed-in live site, normal/reduced motion, responsiveness, and console health.
- [ ] Record commit and Cloudflare version in the walkthrough.

Acceptance: live behavior matches the verified local release candidate.

Smoke: signed-in live Writers' Workshop entrance, major-workspace, pulse, disclosure, and responsive checks.

## Subagent operating model

- Inventory agent: read-only mapping of motion surfaces and layout/performance risks.
- Accessibility agent: independent reduced-motion, keyboard, focus, and hidden-content audit after Pass 3.
- UI critic: final top-five review after Pass 6; material findings require repair.
- Every subagent must read `AGENTS.md`, receive a non-overlapping scope, avoid deployment/commits, and return evidence. The primary agent reviews all findings, diffs, and verification before acceptance.

## Rollback

- Motion enhancements remain isolated behind Writer-scoped classes and components so a blocking animation can be disabled without reverting feature-completeness work.
- If cinematic first-visit persistence proves unreliable, fall back to restrained editorial motion everywhere rather than blocking release.
