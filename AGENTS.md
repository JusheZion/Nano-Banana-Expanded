# Agent Instructions

Work in a structured, step-by-step way. Prioritize correctness, clarity, and minimal changes.

Before implementing non-trivial tasks, outline a short plan. If anything is unclear, ask a clarifying question.

Follow existing project patterns and conventions. Prefer clean, maintainable code over clever or complex solutions.

Do not fabricate APIs, configs, or file structures. State assumptions explicitly.

After completing work, verify correctness, consider edge cases, and suggest tests.

Keep diffs minimal and avoid modifying unrelated code.

When working on user-facing features, prioritize clarity and usability over technical cleverness.

When project-specific standards or workflows exist, follow the `.agent` documentation strictly.

## Context Handoff Protocol

Agents usually do not receive an exact live token percentage. Treat 80% as an operational threshold: if the conversation appears long, tool output has been heavy, context has been compacted, or the next step requires preserving detailed state, prepare a handoff before continuing.

At the approximate 80% context threshold, or whenever context loss seems likely:

1. Pause new implementation work.
2. Prepare a compact handoff using `.agent/workflows/chat-handoff.md`.
3. Include current goal, constraints, decisions, touched files, verification, warnings, blockers, and next steps.
4. Ask the user whether to continue in the current thread or start a fresh chat with the handoff.

If the user explicitly says the context window is nearly full, prepare the handoff immediately.

# Project walkthrough operating rule

## Purpose of the walkthrough in this repository

This repository uses a master walkthrough markdown file as a cumulative implementation record and continuity layer for the project. The walkthrough is a living project memory document. It is not merely a changelog, and it is not a casual summary. It records what was changed, where it was changed, why it was changed, how it was verified, what is still unresolved, and what future agents or operators need to preserve when continuing the work.

The walkthrough supports:
- prompt-to-prompt continuity,
- multi-step implementation tracking,
- chat window handoff,
- agent-to-agent continuity,
- selective extraction of updates by timeframe or work segment,
- and safer project continuation without re-discovering context.

## Master walkthrough file

- Master walkthrough file: `walkthrough.md`
- Treat `walkthrough.md` as the long-running source of truth for implementation continuity.
- Add new content in discrete appendable sections unless explicitly instructed to reorganize or rewrite prior history.
- Do not overwrite existing historical content by default.
- Do not compress multiple unrelated updates into a vague summary if distinct sections are more accurate.

## Relationship to the global AGENTS.md

This project rule inherits the global walkthrough standard from the user’s global `AGENTS.md` and makes it concrete for this repository.

The global file defines:
- the general purpose of walkthroughs,
- the requirement to maintain them after meaningful work,
- the distinction between immediate updates, session updates, and timeframe extracts,
- and the expectation that walkthroughs be factual, append-ready, and continuity-preserving.

This project file adds repository-specific expectations for:
- where the master walkthrough lives,
- how walkthrough updates should be structured in this repo,
- what should be considered important local implementation detail,
- and how handoff and extract requests should be interpreted in the context of this project.

If there is ever a conflict, follow the more specific project instruction while preserving the core global walkthrough principles.

## Core operating rule

Whenever a prompt produces meaningful project work, Codex must prepare a walkthrough update that reflects the immediate delta created by that prompt.

Codex must clearly distinguish between:
1. the immediate update,
2. the chat window session update,
3. and the timeframe extract.

These outputs serve different purposes and must not be merged by assumption.

## Definitions and distinctions

### 1. Immediate update
An immediate update is the walkthrough section created as a direct result of a single prompt.

This is the default walkthrough output that should accompany a meaningful response.

Characteristics:
- scoped to one prompt,
- includes only the new work from that prompt,
- excludes prior unrelated changes from earlier prompts,
- formatted as a paste-ready markdown textblock,
- intended for immediate insertion into `walkthrough.md`.

Use this when:
- a prompt caused code or project changes,
- the user wants the latest walkthrough contribution,
- or the user expects the current response to include the exact new walkthrough section.

Important distinction:
The immediate update is not the same as the whole chat window’s activity. It is only the section attributable to the current prompt.

### 2. Chat window session update
A chat window session update is the cumulative set of all walkthrough sections produced during the current chat window.

This is the correct output for handoff into a new chat.

Characteristics:
- includes all meaningful walkthrough sections created in the current chat window,
- preserves chronological order,
- excludes older material from prior chat windows unless explicitly requested,
- may contain multiple immediate sections grouped together,
- intended for continuity and transfer into the next chat session.

Use this when:
- the user asks for a handoff,
- the user asks for everything done in this window,
- the user wants the current session’s walkthrough contribution,
- or the work needs to be transferred into another conversation.

Important distinction:
The session update is broader than the immediate update. It includes all immediate updates from the current chat window, not just the latest one.

### 3. Timeframe extract
A timeframe extract is a filtered subset of walkthrough content restricted to a specified period, sequence, milestone, or work slice.

Characteristics:
- includes only the relevant matching entries or portions,
- may draw from one or multiple walkthrough sections,
- preserves chronological order,
- remains append-ready or excerpt-ready,
- should avoid unrelated entries.

Use this when:
- the user asks for updates from a specific date,
- the user asks for changes during a certain work period,
- the user asks for updates tied to a milestone or incident,
- or the user asks for only part of the changes made.

Important distinction:
A timeframe extract is not automatically identical to either an immediate update or a session update. It is a filtered output based on the user’s requested boundary.

## Meaningful change threshold

A walkthrough update is required when a prompt results in meaningful project work, including but not limited to:
- code edits,
- file creation,
- file deletion,
- refactors,
- bug fixes,
- UI or UX changes,
- architecture decisions,
- schema or migration changes,
- environment or config changes,
- build, lint, test, or verification status changes,
- deployment instructions or deploy-relevant changes,
- newly identified issues,
- operator instructions,
- handoff-relevant findings,
- workflow or toolchain changes,
- and important constraints future work must preserve.

If none of the above occurred and no meaningful project state changed, Codex should explicitly say that no walkthrough update is needed.

## Output mode rules

### Default mode after meaningful work
After a prompt that caused meaningful work, return the immediate update.

### Handoff mode
If the user asks for handoff, next chat continuity, transfer notes, or a carry-forward package, return the chat window session update.

### Timeframe mode
If the user asks for updates from a specific period or bounded slice, return the timeframe extract only.

### Full master mode
Only rewrite, consolidate, restructure, or regenerate the entire `walkthrough.md` when the user explicitly requests that action.

## Required content within each walkthrough section

Each walkthrough section should include the following when relevant and available:

- Title or task name
- Date
- What changed
- Files touched
- Important implementation notes
- Verification performed
- Outstanding issues
- Risks or caveats
- Operator follow-up
- Next steps

The more implementation-significant the change, the more detailed the section should be.

## Preferred section structure

Use this structure unless the user asks for a different format:

## [Feature or task title] - YYYY-MM-DD

### What changed
- ...

### Files touched
- `path/to/file`
- `path/to/other-file`

### Implementation notes
- ...

### Verification
- `npm run build`
- `npm run test -- --run`
- Manual check: ...

### Outstanding issues
- None.

### Risks or caveats
- None.

### Operator follow-up
- None.

### Next steps
- None.

## Immediate update instructions

When returning an immediate update:
- include only the walkthrough section created from the current prompt,
- do not include prior immediate updates from earlier prompts in the same chat unless explicitly requested,
- do not summarize the whole session,
- and do not include historical material from earlier chat windows.

This output should be compact enough to append immediately, but detailed enough to preserve implementation continuity.

## Session update instructions

When returning a chat window session update:
- include every meaningful walkthrough section produced during the current chat window,
- preserve the order in which the work happened,
- keep distinct work items as separate sections when that improves clarity,
- and exclude prior chat-window history unless the user explicitly asks for a larger rollup.

If the current chat window includes multiple prompts that touched the same area, it is acceptable to combine them only if doing so improves clarity and does not erase important sequencing.

## Timeframe extract instructions

When returning a timeframe extract:
- include only the walkthrough material that falls within the requested timeframe or requested slice,
- preserve chronology,
- retain original implementation specificity,
- and omit unrelated sections.

Valid timeframe boundaries may include:
- a specific date,
- a date range,
- a portion of the current session,
- work done after or before a specific event,
- a milestone period,
- or a topic-specific implementation window.

If the boundary is unclear, ask a clarifying question before producing the extract.

## Accuracy and evidence rules

Walkthrough entries must reflect actual completed work only.

Do not:
- invent commands,
- claim tests passed if they were not run,
- imply files were edited when they were only discussed,
- state that deployment occurred if it did not,
- or present planned work as completed work.

If something was planned but not done, label it as planned, deferred, pending, or operator follow-up.

## Repository-specific expectations

For this project:
- prefer titles that reflect the actual feature, bug, or task completed,
- include real repository paths in `Files touched`,
- include actual verification commands that were run,
- note manual browser or UI checks when applicable,
- preserve deploy notes when a future operator must take action,
- and keep the wording concrete enough that a future agent can continue from the section without guessing.

## Handoff expectations

When a chat handoff is requested:
- provide the current chat window session update as a paste-ready markdown textblock,
- ensure it contains all meaningful walkthrough sections created during that chat window,
- and avoid replacing it with only the latest immediate section unless the user specifically asks for only the most recent part.

If the user asks for both the immediate update and the session update, provide both clearly labeled.

## Timeframe retrieval expectations

When the user asks for a specific portion of updates, interpret the request as a retrieval request against walkthrough history rather than as a request to rewrite the whole document.

Examples:
- “Give me only what changed today.”
- “Give me the updates from this morning.”
- “Give me the part related to the vault save changes.”
- “Give me the updates after the deployment fix.”
- “Give me only what you changed in the first half of this chat.”

In these cases, return only the filtered walkthrough material that matches the request.

## Priority note

When walkthrough output is requested or expected, prioritize walkthrough completeness, accuracy, and append-readiness over brevity. In this repository, preserving implementation continuity is more important than producing a short summary.

## Default behavioral summary

- Prompt causes meaningful work -> return immediate update.
- User asks for current chat handoff -> return session update.
- User asks for a bounded slice -> return timeframe extract.
- User asks to rebuild or rewrite the whole walkthrough -> do that only then.

## Final rule

Treat walkthrough maintenance as part of the implementation workflow, not as optional reporting. The project depends on the walkthrough to preserve continuity across prompts, windows, and agents. Protect that continuity by maintaining precise, scoped, append-ready walkthrough updates.
