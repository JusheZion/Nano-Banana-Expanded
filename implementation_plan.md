# Current feature: Studio UX refinement (2026-03-15)

**Source:** `docs/plans/2026-03-15-studio-ux-refinement-and-polish.md`

**Implemented logic (summary):**

1. **API** — When any reference image is present, prepend subject-only instruction; when `isVaultOverride` + refs, append stronger no-background line (character vs asset via `context`).
2. **Refinement** — Single reference = current live image; prompt = art style + user refinement text; both studios.
3. **UI** — Reference panel (slots only) + scrollable Tags panel; 3-tab prompt; vault edit in center Edit tab; persisted snippets and refinement draft.
4. **Efficiency** — Keyboard shortcuts, last-prompt chip, clear/paste slots, generate again, undo one step.

**Follow-up:** “NEW” describe-from-image (separate API work).
