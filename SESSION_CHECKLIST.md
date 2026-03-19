# Session Checklist (20 Seconds)

Use this at the start of every new chat session to avoid permission/mode surprises.

## Preflight

- [ ] **Mode**: Chat is in `Agent` mode (not `Ask`/`Plan`).
- [ ] **Workspace**: Correct project root is open.
- [ ] **Tools check**: Agent can run a harmless command (for example: `git status`).
- [ ] **Permissions**: No stuck deny/approval prompts from earlier sessions.
- [ ] **Capability check**: Agent can perform one tiny edit if needed.

## If Something Feels Restricted

1. Stop using the current chat.
2. Start a **new chat in Agent mode**.
3. Re-state the task in the first message.
4. If restrictions persist, review/clear approvals and retry.

## End-of-Session Routine (Optional)

- [ ] Confirm `walkthrough.md` is updated.
- [ ] Confirm `tasks.md` is updated.
- [ ] Stage docs + migrations you want to ship.
- [ ] Commit.
- [ ] Push to `main`.
