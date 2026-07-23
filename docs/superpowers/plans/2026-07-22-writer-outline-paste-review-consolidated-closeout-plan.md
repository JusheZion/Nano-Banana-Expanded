# Writer Outline Paste Review Consolidated Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not dispatch one subagent per task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the two remaining Writer Outline capabilities—Advanced import and optional AI-assisted review—then complete one release-quality QA/deployment pass without reopening already-verified work.

**Architecture:** The existing lossless diagnostic parser and Simple Workflow review remain the shared foundation. Advanced Tools adds a larger review/import surface over the same diagnostic model; optional AI returns suggestions or a draft treatment that never overwrites source or official data until the user explicitly applies it. The final pass resolves responsive issues, verifies the complete workflow once, updates continuity records, and publishes only after every release gate passes.

**Tech Stack:** React, TypeScript, Vitest, Supabase Edge Functions, Cloudflare Workers, existing Writer persistence/version APIs.

---

## Scope consolidation

- **Pass 1 — Shared paste foundation: COMPLETE.** Lossless deterministic parsing, format variants, unassigned-text preservation, preferences, TXT/Markdown templates, help copy, and parser tests are implemented.
- **Pass 2 — Simple Workflow and recovery: COMPLETE.** Paste review, manual assignment without AI, local/global settings, source/editor integration, official-version creation, resumable recovery, and Undo are implemented. Fresh consolidated gate: 106 test files / 667 tests passed; production build passed.
- **Pass 3 — Advanced Tools and optional AI: COMPLETE.** One cohesive implementation pass for the second mode and both optional AI assistance points.
- **Pass 4 — Product polish and release: REQUIRES APPROVAL.** One cohesive responsive/accessibility/browser QA, documentation, commit/push, and live deployment pass.

## Pass 3: Advanced Tools and optional AI review

**Objective:** Add the full Advanced import mode and make AI classification/treatment optional, reviewable, editable, and explicitly promoted.

**Acceptance criteria:** TXT/Markdown and pasted text use the same lossless analyzer; drafts can be resumed or discarded; manual assignment always works with AI off; AI suggestions never replace source text; AI treatment remains a proposal until the user chooses **Make official**; errors preserve the current draft and manual controls.

**Primary files:**
- Create: `src/portals/writer/WriterOutlineImportWizard.tsx`
- Create: `src/portals/writer/WriterOutlineTreatmentReview.tsx`
- Create: `src/portals/writer/writerOutlineImportDraft.ts`
- Create: `src/portals/writer/writerOutlineAiClassification.ts`
- Modify: `src/portals/writer/WriterPortal.tsx`
- Modify: `src/portals/writer/writerOutlinePastePreferences.ts`
- Modify: `supabase/functions/writer-tools/index.ts`
- Test: matching focused files under `src/portals/writer/__tests__/` and `supabase/functions/writer-tools/`

- [x] Add failing tests for the Advanced wizard steps, TXT/Markdown parity, bulk/manual assignment, page ranges, resumable drafts, unsaved-close confirmation, and rollback.
- [x] Implement a controlled Advanced import wizard that reuses the lossless analyzer and existing assignment helpers; keep visible primary actions and preserve every source passage.
- [x] Add failing shared client/Edge schema tests for preview-only AI classification, invalid/duplicate passage IDs, input limits, AI errors, and zero persistence.
- [x] Implement optional AI classification as suggestions merged by stable passage ID; keep original text/ranges and allow the user to correct every assignment before Apply.
- [x] Add failing tests for editable AI treatment, cancel, regenerate, alternate retention, explicit promotion, validation failure, and Undo-compatible version promotion.
- [x] Add `save: false` preview behavior to the existing `outline_issue` request, render an editable treatment comparison, and create an official version only after **Make official**.
- [x] Run the focused Advanced/AI suites, Writer integration suites, TypeScript, and scoped lint.

**Smoke test:** With AI off, import an ambiguous Markdown outline, manually assign Unassigned passages, resume the draft after reload, and apply it without text loss. With AI on, request suggestions, correct one suggestion, preview/edit a treatment, cancel once, then promote and Undo once.

**Rollback:** Keep the new Advanced entry and AI controls feature-isolated. If the Edge preview contract blocks the pass, ship neither AI control; Simple Workflow remains functional and unchanged.

**Result summary:** Passed 10 focused files / 137 tests. TypeScript and scoped lint passed. Advanced import supports TXT/Markdown/paste, issue-scoped resume/discard, manual review with AI off, optional requested/automatic suggestions, and explicit AI treatment cancel/regenerate/alternate/promote behavior.

## Pass 4: Responsive polish, final QA, and release

**Objective:** Finish the user-facing quality gate once, then commit, push, deploy, and verify the live Writer Outline workflow.

**Acceptance criteria:** No desktop/mobile action overlap; keyboard and screen-reader flows work; guidance is dismissible/restorable; loading/error/empty/locked states are clear; automated regression and production build pass; signed-in browser QA covers both modes; the live Cloudflare deployment is confirmed.

**Primary files:**
- Modify only as findings require: `src/portals/writer/WriterOutlinePasteReview.tsx`, `src/portals/writer/WriterOutlineImportWizard.tsx`, `src/portals/writer/WriterOutlineTreatmentReview.tsx`, `src/portals/writer/WriterPortal.tsx`
- Modify: `docs/superpowers/plans/2026-07-22-writer-outline-paste-review-implementation.md` to mark it superseded by this consolidation
- Modify: `walkthrough.md`

- [ ] Fix the confirmed mobile overlap between the paste-review sticky action area and the app’s fixed bottom navigation; add a focused layout regression assertion.
- [ ] Complete one desktop/mobile keyboard and accessibility review for Simple paste, Advanced import, AI suggestions, and AI treatment; resolve only reproducible high/medium findings.
- [ ] Run one consolidated release gate: `npm run test`, `npm run lint -- --quiet`, `npm run build`, and `git diff --check`.
- [ ] Run signed-in local browser QA with disposable data across Simple/manual/Undo, Advanced/draft/apply/Undo, AI success/failure/edit/promote/Undo, preferences reload, and 390px/desktop layouts; clean up disposable records.
- [ ] Complete the DOX and walkthrough updates with actual evidence, then commit the final coherent diff.
- [ ] Push the approved branch, deploy any changed `writer-tools` Edge Function after project/auth verification, deploy Cloudflare, and smoke-test the live URL.

**Smoke test:** Reload the live Writer Outline tab at desktop and mobile widths, complete a safe non-destructive paste review, confirm no console/network errors, and confirm AI preview requests create no official version until promotion.

**Rollback:** Retain the previous live Cloudflare version and Edge Function version identifiers before deployment so either can be restored independently.

**Result summary:** Pending approval and execution.

## Approval gate

No Pass 3 or Pass 4 implementation begins until the user approves this consolidated plan. Execution stays inline in the primary task unless the user explicitly requests subagents.
