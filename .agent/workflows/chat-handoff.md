# Chat Handoff Workflow

Use this workflow when a conversation is approaching the context limit, when the user asks for a handoff, or before starting substantial new work in a long thread.

## Trigger

- The user asks for a chat handoff.
- The user says context is nearly full.
- The agent estimates the conversation is around 80% of the usable context window.
- Context has already been compacted and the next step depends on details from earlier work.

Because exact context usage is usually not exposed to agents, use the 80% trigger as a conservative heuristic rather than an exact measurement.

## Steps

1. Stop new implementation work unless the user explicitly asks to continue.
2. Summarize only the state needed for a new agent to continue safely.
3. Separate verified facts from assumptions.
4. Include commands already run and their results.
5. Include known warnings, blockers, and uncommitted changes.
6. End with the immediate next action for the new chat.

## Template

```md
# Chat Handoff

## Current Goal
- ...

## Project Context
- Workspace:
- Branch:
- Relevant instructions:

## User Constraints
- ...

## Work Completed
- ...

## Files Changed Or Inspected
- ...

## Key Decisions
- ...

## Verification
- Commands run:
- Results:
- Not run:

## Known Warnings Or Blockers
- ...

## Current Git State
- ...

## Next Steps
1. ...
2. ...
3. ...

## Suggested First Prompt For New Chat
...
```
