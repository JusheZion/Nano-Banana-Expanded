# Reference Character Studio

_Last reviewed: 2026-04-05_

Create and refine **character** reference art: prompts, albums, and generation workflows tied to the Character Studio store.

## Purpose

- Build consistent visual references for cast used across Image Vault, Storyline, and exports.
- Organize generations into **albums** and iterate with studio-specific tools (see in-app chrome).

## Navigation map

- **Header / ribbon**: generation mode, album picker, and primary actions (exact labels match the live ribbon).
- **Main workspace**: prompt area, reference thumbnails, and preview grid — layout is **overflow contained** in the app shell (vertical scroll is disabled for this portal so the studio controls stay pinned).

## Tools & functions (high level)

- **Album CRUD** — create and switch albums; persist is local + vault hooks where configured.
- **Generate** — calls the configured Gemini image pipeline with character-appropriate prompts and safety context.
- **Import / export** — use in-app buttons for promote-to-studio flows when available from Storyline or vault.

## Customization

- **Theme**: entering Character Studio switches the hub to the **teal** family (see `ThemeContext`).

## Screenshot

![Character Studio placeholder](/wiki/screenshots/studio/studio-placeholder.svg)
