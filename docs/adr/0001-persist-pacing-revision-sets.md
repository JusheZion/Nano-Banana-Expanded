# Persist Pacing Revision Sets Outside Issue Notes

Pacing Revision Sets use dedicated owner-protected records rather than `writer_issues.notes` or transient client state. Revision sets may contain a proposed outline plus many Page Beat and Dialogue candidates; dedicated records avoid oversized issue rows, preserve three-state editing and recovery across reloads, and support one-page-per-invocation generation without losing partial progress.

## Considered Options

- Transient client state was rejected because refresh, interruption, and handoff would lose review work.
- `writer_issues.notes` was rejected because large multi-page candidates would make the shared issue record heavy and vulnerable to conflicting whole-note updates.

## Consequences

- The feature requires a migration, owner-scoped RLS, and explicit cleanup behavior.
- Generation and apply progress can be resumed safely and audited independently of the Live Story.
