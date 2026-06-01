# Writers Workshop Completion and Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Writers Workshop Narrative Production System follow-through by reconciling stale handoff gaps against the current repo, hardening output-format/export defaults, confirming outline import and hierarchy editing, adding preview-safe pacing regeneration, and closing live AI, Supabase Edge, browser QA, and documentation evidence.

**Architecture:** Treat the current repo as authoritative when it conflicts with the older handoff. Keep existing notes-backed metadata contracts (`notes.production_defaults`, `notes.author_outline`, `notes.hierarchy_tree`) and extend the existing writer-tools/client workflow only where a true behavior gap remains. Use preview-first behavior for destructive regeneration so page beats and dialogue are not overwritten until the user explicitly applies selected proposals.

**Tech Stack:** React, TypeScript, Vite, Vitest, Supabase Edge Functions, existing Writers Workshop helpers and notes metadata.

---

## Task List

- [x] **Pass 1: Reconcile current state**
  - Baseline branch: `codex-writers-output-format-defaults`.
  - Baseline tests: `npm run test -- --run src/portals/writer/__tests__/writerProductionDefaults.test.ts src/portals/writer/__tests__/writerHierarchy.test.ts src/portals/writer/__tests__/writerProductionBranches.test.ts src/shared/writer/__tests__/schemas.test.ts src/shared/api/__tests__/writerTools.test.ts` passed, 5 files / 48 tests.
  - Current state correction: output-format defaults, author-outline import, and hierarchy-tree storage already exist after repo updates made after the handoff.

- [x] **Pass 2: Explicit output-format export branch**
  - Added `buildPreferredWriterExport` for all output-format defaults.
  - Added primary preferred-export buttons to the Video production-branch export card and Scripts export panel.
  - Kept JSON, markdown, Guided Comics handoff, and existing explicit download actions available.

- [x] **Pass 3: Author outline import and editable hierarchy**
  - Verify paste, `.txt`, `.md`, and JSON import into `notes.hierarchy_tree`.
  - Added editable saved-tree affordances for title rename, kind-change, sibling move up/down, delete, reset, and explicit save.
  - Keep the data in existing issue notes; do not add a migration.

- [x] **Pass 4: Preview-safe downstream pacing wizard**
  - Add preview-only pacing regeneration support that proposes replacement beats and/or dialogue without saving.
  - Show current vs proposed content and let the user apply selected proposals explicitly.
  - Persist only accepted proposals through existing page update helpers.

- [x] **Pass 5: Supabase Edge and live AI verification**
  - Verified `writer-tools` was active at version 45 before this pass.
  - Deployed `writer-tools`; verified active version 46, updated `2026-06-01 05:45:41 UTC`.
  - Signed-in browser verification created a temporary `Codex Live AI Verification` issue, then cleaned it up after QA.
  - Live `outline_issue` call succeeded and saved `Outline · v1`.
  - Live `page_beats` call succeeded for Page 1 and saved panel JSON.
  - Live `draft_dialogue` call succeeded for Page 1 and saved script text.
  - Live `plan_shots_from_issue` call succeeded and saved a `shots` array.
  - Live `pacing_review` call succeeded and saved pacing cache output.
  - Live `pacing_regeneration_preview` call succeeded and returned preview-only current/proposed beat/dialogue replacements with explicit `Apply beats`, `Apply dialogue`, and `Apply both` controls.

- [x] **Pass 6: Browser timeout investigation and final QA**
  - Recheck the in-app browser bridge path before long QA.
  - Capture DOM, console, interaction, and screenshot/fallback evidence.
  - Run targeted tests, build, lint, `git diff --check`, and sync `tasks.md`, the active tracker, and `walkthrough.md`.
  - Browser evidence: authenticated DOM snapshots worked, protected Writers Workshop interaction worked, screenshot capture succeeded after the authenticated retry, and console log checks showed no captured errors.
  - Timeout investigation: the earlier screenshot timeout was reproduced in the signed-out/protected-route state; the authenticated retry captured a screenshot successfully, so the failure is not universal to the in-app browser bridge.
  - Verification: targeted tests passed, full `npm run test` passed, `npm run build` passed, `npm run lint` passed with 0 errors / 67 warnings, and `git diff --check` passed.

## Acceptance Criteria

- All five requested next-step items are represented in tracker docs and addressed or explicitly blocked with evidence.
- Preferred output format has a first-class export action instead of being metadata only.
- Author-outline import/tree behavior is confirmed and any missing edit affordance is implemented.
- Pacing downstream regeneration has a non-persisting preview path and explicit apply path.
- Live AI and Edge deploy verification are passed with browser evidence.
- Browser timeout investigation leaves a repeatable QA approach for future agents.
