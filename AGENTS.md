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
