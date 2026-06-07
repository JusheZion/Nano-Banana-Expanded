# Writers Workshop Live Assistant Workflow Evaluation - 2026-06-07

## Scope

This document evaluates the current Writers Workshop workflow, the possibility of adding a more live AI assistant, likely cost points, and the right QA method for having an AI agent test the portal as a user.

No portal code changes were made for this evaluation.

## Current AI Shape

Writers Workshop already has several AI-backed tools, but they are exposed as form-driven actions instead of as one continuous assistant. The main AI path is:

1. The signed-in user clicks a Writers Workshop action.
2. The client calls `invokeWriterTools`.
3. `invokeWriterTools` sends the request to the Supabase `writer-tools` Edge Function with the user's JWT.
4. The Edge Function validates the user, reads project secrets, calls Gemini, validates JSON, and saves or returns the result depending on the mode.

Important files:

- `src/shared/api/writerTools.ts`
- `supabase/functions/writer-tools/index.ts`
- `src/portals/writer/WriterPortal.tsx`
- `src/portals/writer/writerHelpRegistry.tsx`
- `src/portals/writer/writerNextStep.ts`

The current AI modes include:

- `outline_issue`
- `page_beats`
- `page_beats_issue`
- `draft_dialogue`
- `pacing_review`
- `canon_check`
- `pacing_regeneration_preview`
- `plan_shots_from_issue`
- `idea_assist`
- `guided_comic_assist`

The most assistant-like behavior already exists in `idea_assist` and Cockpit digests. It can read selected context and answer or suggest changes, but it is still locked behind a submission box and does not guide the whole workflow continuously.

## API Keys and Cost Points

The current Writers Workshop AI path uses Gemini, not OpenAI.

Relevant implementation details:

- `writer-tools` reads `GEMINI_API_KEY` or `GOOGLE_API_KEY` from Supabase project secrets.
- It optionally reads `GEMINI_MODEL`.
- The code default is currently `gemini-2.0-flash`.
- The function then tries fallback models including `gemini-2.5-flash`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite-preview`, and `gemini-3.1-pro-preview`.

Cost attaches mainly to:

- Gemini input/output tokens for each AI call.
- Supabase Edge Function invocations and runtime under the active Supabase plan.
- Database reads/writes for persisted issue, page, lore, outline, and cache updates.
- Any future live/audio/image/video assistant mode if added.

Important dated caveat:

- As of this document date, Google lists `gemini-2.0-flash` as shut down on June 1, 2026. Because the repo default is still `gemini-2.0-flash`, the function may rely on fallback behavior unless `GEMINI_MODEL` is set to an active model in Supabase secrets.
- Google pricing and model availability change frequently. Verify the current pricing page before enabling a high-volume live assistant.

Official pricing references checked on 2026-06-07:

- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Supabase Edge Functions architecture and cost model overview: https://supabase.com/docs/guides/functions/architecture

## Live Assistant Options

### Option A - Reframe Existing `idea_assist`

This is the lowest-risk option.

What it would look like:

- A persistent assistant panel in Writers Workshop.
- The assistant can read the current active issue, selected page, production defaults, outline, lore digest, beats, dialogue, shot plan, and arc review.
- It offers next-step guidance, explains disabled controls, and drafts suggestions.
- It does not auto-save unless the user clicks an explicit apply button.

Cost:

- Similar to current `idea_assist`: one Gemini call per submitted assistant turn.
- Low additional engineering risk because it can reuse existing digest builders and `writer-tools`.

Best use:

- Workflow coaching.
- "What should I do next?"
- "Why is this tool disabled?"
- "What is missing before image production?"
- "Suggest edits for this selected page."

### Option B - Assistant With Tool-Aware Apply Buttons

This is the likely sweet spot.

What it would look like:

- The assistant remains chat-like, but responses can include structured proposed actions.
- Examples: "Save this as author outline", "Run page beats for pages 1-5", "Stage pacing plan", "Apply this dialogue draft to page 3".
- Every destructive or generative action remains confirmable.
- The assistant explains the chronological path and points to the exact next control.

Cost:

- Gemini call per assistant turn.
- Additional Gemini calls when the user confirms actions like outline generation, page beats, dialogue, pacing review, or shot planning.
- Same Supabase Edge Function cost surface as current tools.

Best use:

- Turning scattered tools into a guided writing-room experience.
- Preserving user control while reducing navigation confusion.

### Option C - True Realtime Assistant

This is the most expensive and most complex option.

What it would look like:

- Streaming text or voice assistant.
- Live contextual awareness while the user edits.
- Possibly multi-turn state, tool calls, and conversational recovery.

Cost:

- More requests and more tokens because the assistant is always available.
- Realtime audio or multimodal models can be materially more expensive than simple text submissions.
- More rate-limit, abuse-prevention, and budget-control work is needed.

Best use:

- Only worth considering after the workflow is simplified and the assistant's job is clearly defined.

## Expected User Workflow

The intended production flow is:

1. Select or create a series and issue in Library.
2. Set Foundation Hub values: medium, narrative scope, panel density, art style, character consistency, strict canon, video assumptions, and preferred export.
3. Add author source in Synopsis helper. Use author outline intake when the user already has a chronology or source structure.
4. Add or import Canon cards. Mark only relevant lore cards as included in AI prompts.
5. Save story context on Issue Outline.
6. Generate or revise the issue outline.
7. Sync pages to the target page count or add pages manually in Library.
8. Generate page beats for selected pages or all pages.
9. Review and edit beats, including insert/remove/merge/split/reorder controls.
10. Draft dialogue from the saved beats.
11. Generate visual prep or shot plan if needed.
12. Run Arc review tools: pacing review, canon check, continuity, emotional arc, character utilization, and worldbuilding density.
13. Use Cockpit for late-stage comparison and targeted `idea_assist` work.
14. Export the preferred output or explicit JSON/Markdown/Guided Comics handoff.

## Why The Chronology Feels Confusing

The current product model has two overlapping orderings:

- The production map order: Foundation, Synopsis, Canon, Structure, Beats, Dialogue, Visual, Audit.
- The workspace/tab/action order in parts of the UI and help text: Cockpit, Outline, Lore, Beats, Dialogue, Video, Arc, Scripts/Synopsis.

That means the user can see Cockpit or Outline before the system has made clear that Library selection, Foundation Hub, and Synopsis source are prerequisites. Foundation also lives inside the Outline area, while Synopsis helper appears later as Scripts/Synopsis. This is technically workable, but mentally expensive.

The clearest user-facing chronology should be:

Library -> Foundation -> Synopsis -> Canon -> Outline -> Pages -> Beats -> Dialogue -> Visual Prep -> Audit -> Cockpit -> Export.

## Tools That Feel Most Useful

High-value tools:

- Foundation Hub defaults, because they steer every later generation.
- Author outline intake, because it protects the user's chronology.
- Canon gate with included lore cards, because it grounds generation.
- Page sync and page beats, because page rows are required for beats and dialogue.
- Pacing review with preview-safe regeneration, because it avoids silent destructive rewrites.
- Preferred export and Guided Comics handoff, because they turn writing into usable production artifacts.

Tools that may need better framing:

- Cockpit is valuable late, but confusing early.
- `idea_assist` has potential but currently feels boxed-in.
- Branch/audit cards are helpful only if they clearly say what they will do and what prerequisite is missing.
- Multiple export locations can feel like clutter unless one preferred export path is visually dominant.

## Best Way For An AI Agent To Test The Portal

This is not just a smoke test.

A smoke test answers: "Does the portal load, can a signed-in user reach key screens, and do the primary controls respond without obvious console/network errors?"

Testing every tool and function is better described as:

- A tool coverage audit.
- An end-to-end interaction audit.
- A scripted browser regression suite.
- Agentic exploratory QA layered on top of deterministic tests.

Recommended approach:

1. Inventory every visible tool, button, tab, menu, form, import/export path, and AI action.
2. Classify each item as read-only, local edit, database write, AI generation, export/download, destructive, or paid/live.
3. Create a seeded QA story with known series, issue, lore, pages, beats, dialogue, and expected outputs.
4. Use deterministic browser automation for navigation, rendering, disabled/enabled states, form entry, save/reload persistence, and export file creation.
5. Use mocked AI tests for most generative paths so QA does not burn API budget or create flaky expectations.
6. Use a small authenticated live-AI smoke for the few modes that must prove hosted integration: outline, page beats, dialogue, pacing review, preview regeneration, and shot plan.
7. Capture console errors, network failures, screenshots, and database persistence evidence.
8. Keep destructive tests isolated to disposable QA records and delete them afterward.
9. Report coverage as a matrix, not a vague pass/fail.

The AI agent should not simply "click everything." It needs an oracle: expected state before the click, expected state after the click, whether the action should save, whether it should cost money, and how to clean up.

## Recommended Evaluation Verdict

A live assistant is possible and probably useful, but the best first version should not be a fully autonomous agent. It should be a guided assistant panel that:

- Explains the current workflow step.
- Reads the active issue/page context.
- Uses existing `idea_assist`-style calls.
- Offers explicit apply buttons for proposed changes.
- Never silently saves, deletes, regenerates, or spends API budget.
- Shows when an action will call Gemini.
- Shows when an action will write to Supabase.

Before building it, the portal would benefit from a workflow simplification pass that makes the chronology unmistakable:

Library -> Foundation -> Synopsis -> Canon -> Outline -> Pages -> Beats -> Dialogue -> Visual Prep -> Audit -> Cockpit -> Export.

## Open Questions For A Future Implementation Plan

- Should the assistant be text-only, or should voice/realtime be considered later?
- Should it live in Cockpit only, or persist across all Writers Workshop tabs?
- Should it be allowed to trigger AI tools directly after confirmation?
- Should it have a visible per-session budget or "this will call Gemini" indicator?
- Should the current `GEMINI_MODEL` secret be set to an active non-deprecated model before any live-assistant expansion?
- Should QA use only mocked AI by default, with a separate live-AI verification checklist?
