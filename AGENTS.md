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

## Browser Use / in-app browser access

When the user asks Codex to inspect, click, screenshot, or QA the in-app browser for this project, use the Browser Use plugin through the Node REPL browser bridge.

- First read the Browser Use skill file completely before browser work: `/Users/apoaaron/.codex/plugins/cache/openai-bundled/browser-use/0.1.0-alpha1/skills/browser/SKILL.md`.
- If the browser tool is not visible, use tool discovery for `node_repl js` or `node_repl JavaScript execution`; the actual callable tool is the Node REPL `js` tool, not a separate browser-specific tool.
- Bootstrap the runtime with the Browser Use `iab` backend from `/Users/apoaaron/.codex/plugins/cache/openai-bundled/browser-use/0.1.0-alpha1/scripts/browser-client.mjs`.
- Reuse the selected in-app tab when possible:

```js
if (!globalThis.agent) {
  const { setupAtlasRuntime } = await import('/Users/apoaaron/.codex/plugins/cache/openai-bundled/browser-use/0.1.0-alpha1/scripts/browser-client.mjs');
  const backend = 'iab';
  await setupAtlasRuntime({ globals: globalThis, backend });
}
await agent.browser.nameSession('🔎 Guided Comic Flow QA');
if (typeof tab === 'undefined') {
  globalThis.tab = await agent.browser.tabs.selected();
}
```

- A successful setup can confirm the current app tab with `await tab.url()` and `await tab.title()`; for this repo the expected local app is usually `http://127.0.0.1:5173/` with title `ARCS Expanded`.
- Do not use Computer Use as the first fallback for the Codex in-app browser. Computer Use may be blocked from controlling the Codex app window; Browser Use via `node_repl` is the correct path.
- If `node_repl js` still cannot be discovered in a fresh chat, tell the user the Browser Use plugin is enabled but the Node REPL bridge is not exposed in that active session, then suggest starting a fresh Codex thread or restarting Codex.

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
- In this repository, meaningful project work should update `walkthrough.md` directly in the same turn unless the user explicitly asks not to modify the file. Returning an append-ready section in chat is not enough when filesystem access is available.
- Before final response after meaningful project work, verify the walkthrough update landed with a direct file check such as `git status --short walkthrough.md` plus a targeted `rg -n "<new section title>" walkthrough.md`.
- If direct file editing is unavailable, blocked, or intentionally skipped, say that explicitly in the final response and provide the append-ready section for the user.

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

Whenever a prompt produces meaningful project work, Codex must append a walkthrough update that reflects the immediate delta created by that prompt.

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

# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

## Child DOX Index

- No nested `AGENTS.md` files currently exist; this root file owns the active contract for the whole repository.
- `.agents/` contains project standards, handoff workflows, historical task files, and design/UX reference material. Read relevant workflow files before handoff or process-heavy work.
- `.codex/`, `.cursor/`, `.superpowers/`, `.vscode/`, and `.worktrees/` contain local agent/editor/worktree support files. Preserve unless a task explicitly targets tooling.
- `archived/` contains retired or reference implementation material.
- `docs/` contains product guides, implementation plans, audits, and exported intake documents.
- `exports/` contains generated/exported prompt-vault artifacts.
- `patches/` contains dependency patch-package patches.
- `public/` contains static web assets, wiki output, and the web manifest.
- `reference/` contains visual/source reference material and Obsidian vault imports.
- `scripts/` contains local utility scripts.
- `src/` contains the React/Vite application. Major subareas include shared app shell/components, portal implementations, stores, content, styles, and utilities.
- `src/portals/` owns top-level portal UIs, including Prompt Library, Writer, Imageshop/Storyline, Guided Comic, Asset Studio, and supporting tests.
- `supabase/` contains Supabase config, Edge Functions, and migrations. For Supabase work, verify MCP/tool/auth exposure and migration scope before editing.
- `worker/` and `wrangler.jsonc` contain Cloudflare Worker/deploy configuration. For deploy work, verify Cloudflare auth/tooling before publishing.
- Root files (`package.json`, Vite/TypeScript/Tailwind/ESLint configs, `walkthrough.md`, `tasks.md`, and implementation plans) own app-wide build, verification, and continuity records.
