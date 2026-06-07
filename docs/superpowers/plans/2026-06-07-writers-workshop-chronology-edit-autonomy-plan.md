# Writers Workshop Chronology + Edit Autonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Writers Workshop easier to follow chronologically, add confirmable page-level edit review, and verify the Writer page-to-Imageshop production path end to end.

**Architecture:** Keep existing Writer and Imageshop data contracts intact. Add small tested helper modules for chronology and page-edit review decisions, then wire them into the existing `WriterPortal` UI with minimal state and confirmable apply/regenerate actions.

**Tech Stack:** React, TypeScript, Vitest, Supabase `writer-tools`, existing Zustand bridge stores.

---

## Pass Checklist

- [x] Pass 1: Chronology and tool clarity.
- [x] Pass 2: Page-level edit autonomy with safe cascades.
- [x] Pass 3: Writer beats to Imageshop focused E2E verification.
- [x] Final verification: focused tests, build, lint, diff check, browser smoke.

## Pass 1 - Chronology and Tool Clarity

- [x] Add a tested Writer workflow chronology helper that models:
  `Library -> Foundation -> Synopsis -> Canon -> Outline -> Pages -> Beats -> Dialogue -> Visual Prep -> Audit -> Cockpit -> Export`.
- [x] Wire the production map to the helper so the UI speaks in the same order as the expected workflow.
- [x] Promote Foundation copy and next-step guidance so users understand it happens before Synopsis/Canon/Outline, even while storage remains in `notes.production_defaults`.
- [x] Clarify labels for Imageshop sends and export destinations without changing data contracts.

## Pass 2 - Page-Level Edit Autonomy

- [x] Add a tested page-edit review helper for staged edits to `outline`, `beats`, or `dialogue`.
- [x] The helper must report affected layers, likely conflict categories, and safe actions.
- [x] Add an "Edit current page" panel that stages page edits before saving.
- [x] Provide explicit actions only: save current layer, run canon check, regenerate beats, regenerate dialogue, or request pacing regeneration preview for selected affected pages.
- [x] Do not silently overwrite outline, beats, dialogue, or neighboring pages.

## Pass 3 - Writer Beats to Imageshop Verification

- [x] Extend focused tests around Writer page handoff payloads.
- [x] Extend focused tests around Imageshop Writer image-map return.
- [x] Add a test proving returned Imageshop panel metadata merges back into the matching Writer page beat.
- [x] Add a browser smoke for Writer page -> Imageshop handoff and guarded return behavior.
- [x] Run one approved live Gemini selected-panel generation and verify Writer image-map return into the selected Writer page.

## Verification Commands

- [x] `npm run test -- --run src/portals/writer/__tests__/writerWorkflowChronology.test.ts src/portals/writer/__tests__/writerPageEditReview.test.ts`
- [x] `npm run test -- --run src/portals/storyline/__tests__/imageWorkshopPlanning.test.ts src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx src/portals/writer/__tests__/writerImageshopReturn.test.ts src/stores/__tests__/imageWorkshopBridge.test.ts src/stores/__tests__/imageshopProductionStore.test.ts`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `git diff --check`

## Notes

- Live Gemini generation was later explicitly approved and run once against `Oratoria de Conjunctio Oppositorum`, Issue 1 `Twove`, Page 8, Panel 1.
- Existing Writer and Imageshop contracts should be preserved unless a focused test proves a contract is broken.
- `tasks.md` and `walkthrough.md` must be synchronized before final response.
- Initial browser smoke confirmed the local signed-in Writer issue rendered the new production map, the staged review panel appeared on Beats and Dialogue, the Writer page handoff opened Illustrator's Imageshop with page/panel context, and no console errors appeared without spending API budget.
- Live verification found and fixed a bridge gap: Writer page handoff updated Visual Prep but did not populate the Imageshop production `panelQueue`, so the selected-panel generation target could remain stale. Writer page handoffs now carry a one-page `panelQueue`, Imageshop adopts it automatically, and the live return merged `imageshop_output` into Page 8 Panel 1.
