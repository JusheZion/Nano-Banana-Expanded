# Writers' Workshop

_Last reviewed: 2026-04-05_

Series, issues, **pages**, AI tooling (outline, beats, dialogue, pacing, canon), and **shot plans**. This article is the **long-form** companion to the in-app **Ribbon → Help** modal.

> **Session:** AI-backed writer tools expect a **signed-in** Supabase user and deployed **writer-tools** Edge Function where applicable.

## Setup

- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`, then **restart** `npm run dev` (Vite reads env at startup).
- Configure **Gemini** keys per project docs; writer tools use the same stack as other AI surfaces.
- Use **Ribbon → Help → Setup** for a short recap any time.

## Workflow

- **Library**: pick a **series**, then an **issue**. Re-select the issue if fields stay disabled.
- **Issue outline**: story context saves to `writer_issues` / `writer_series` — no spreadsheet upload.
- **Workspace tabs**: ⌘2 focuses Issue Outline (see **Keyboard** below).

## Pages tools

- **Pages** live under Library → Pages. Outline generation does **not** auto-create page rows — use **Add page** when the list is empty.
- **Beats** and **dialogue** attach to the selected page; outputs persist to `writer_pages`.
- **Video / shot plans**: combine outline + page digests; export JSON, CSV, or issue pack from the Video tab.

## Review export

- **Pacing** and **canon** runs are **issue-level**; on success, results are saved on the issue under `notes.writer_tool_cache` (no separate Save).
- **Find in view** searches visible JSON including combined review output.

## Keyboard

| Shortcut | Action |
|----------|--------|
| ⌘1–⌘6 | Outline, Beats, Dialogue, Video, Arc, Scripts |
| ⌘F | Focus Find |
| ⌘⇧H | Show / hide Library, Activity, Shortcuts |
| Esc | Clear find (when focused) |

## Screenshot

![Writers' Workshop placeholder](/wiki/screenshots/writer/writer-placeholder.svg)
