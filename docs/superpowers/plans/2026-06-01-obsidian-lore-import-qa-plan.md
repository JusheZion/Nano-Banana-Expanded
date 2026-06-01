# Obsidian Lore Import QA Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify that Writers Workshop can import Obsidian Markdown lore notes and attached image references without breaking existing lore, prompt generation, or Canon tab workflows.

**Architecture:** QA is split into automated parser coverage, local browser smoke, manual native-file-picker import, Supabase persistence checks, and hosted Edge verification. The importer stores rich metadata in existing lore card bodies, so QA must confirm both preservation and prompt-safe stripping.

**Tech Stack:** React, TypeScript, Vite, Vitest, Supabase, Supabase Storage `arcs-generations`, Writers Workshop Canon tab, in-app Browser.

---

## QA Execution Log - 2026-06-01

- Automated parser QA passed after rerunning the focused parser test by itself. The first focused parser run was started in parallel with the optional reference-vault test and hit a Workers runtime startup failure; the isolated rerun passed.
- Optional Twovestellium reference-vault parser QA passed against the checked-in reference vault.
- Production build, lint, and whitespace checks passed. Lint still reports the known 68 warnings and 0 errors.
- In-app browser smoke QA on `http://127.0.0.1:5174/` passed for Writers Workshop -> Canon -> Obsidian import UI visibility, type-filter options, picker button visibility, page identity, nonblank render, no framework overlay, and no captured console errors.
- Live signed-in browser regression QA passed for manual lore card create, edit, JSON import, reload persistence, and Cockpit Lore digest display. The QA cards used were `Codex Obsidian QA Manual 20260601` and `Codex Obsidian QA JSON 20260601`.
- Cockpit Lore digest showed the QA lore text and did not expose `ARCS_LORE_IMPORT_METADATA`, `storageUrl`, or raw storage URLs.
- Native file-picker import, folder import, duplicate actions through the Obsidian preview UI, Obsidian source badges, stored image counts, and real cloud image-upload verification remain unverified in-browser. The in-app browser runtime exposes the hidden file inputs but does not expose `setInputFiles`; a standalone Playwright fallback required installing Playwright and would also need a signed-in browser state or token transfer before it could exercise the same Supabase-backed project.
- Cleanup complete: the user manually deleted the two live QA lore cards after the signed-in regression pass.

## QA Scope

This plan verifies:

- Markdown/frontmatter parsing.
- Filename title fallback.
- Obsidian wiki link detection.
- Embedded image detection and resolution.
- Folder import behavior.
- Type filtering.
- Preview deselection.
- Duplicate actions.
- Warnings for unresolved images.
- Supabase lore-card persistence.
- Supabase image upload behavior.
- Prompt digest stripping for imported metadata.
- Existing JSON import and manual lore-card creation remain usable.

## Current Local Reference Vault

The user-provided local vault at `reference/Twovestellium Universe Obsidian Vault/` currently contains:

- `Characters/Kron.md`
- `Characters/Finn.md`
- `Characters/Magister Valencius Santoro.md`
- `Species/Glimm.md`
- `Factions & Organizations/Institute of Divination & Occultivation.md`
- multiple `.png` files under `Assets/Images/`
- three notes under `Templates/`

Observed real-vault traits:

- Frontmatter uses capitalized keys such as `Type`, `Species`, `Faction`, and `Timeline`.
- Some frontmatter keys contain spaces or slashes, such as `Threat Level`, `First Appearance`, and `Symbols/Logos`.
- Character notes do not currently provide an explicit type/category, so category inference from the `Characters/` folder is required.
- Character notes now include embedded image references, including adjacent embeds on one line such as `![[image-a.png]]![[image-b.png]]`.
- Some section headings are tight Obsidian-style lines such as `#Notes` or include embeds on the same line, so section context should normalize to clean labels like `Notes` and `Story Arc`.
- Template notes should not appear in the import preview.

## Test Fixture

Create a temporary local folder outside the repo, for example `/private/tmp/obsidian-lore-import-fixture`.

Use this structure:

```text
obsidian-lore-import-fixture/
  Characters/
    Kron.md
    kron-reference.png
  Organizations/
    Stellar Academy.md
  Locations/
    Moon Gate.md
  Broken/
    Missing Image Note.md
```

Use these note contents.

`Characters/Kron.md`:

```markdown
---
name: Kron
type: character
summary: Black Magic Major at the Institute of Divination & Occultivation.
tags: [protagonist, black-magic, student]
species: human
faction: IDO
---

## Overview
Kron is a Black Magic Major linked to [[Stellar Academy]].

## Relationships
- Best friends with [[Rhia Simms]].

## Abilities
Kron uses black magic and arithmamagic.

## Visual References
![[kron-reference.png|Primary Kron reference]]

## Notes
Keep his spellcasting instability consistent.
```

`Organizations/Stellar Academy.md`:

```markdown
---
title: Stellar Academy
type: organization
summary: An academy for occult disciplines.
tags:
  - academy
  - occultivation
discipline: Black Magic
---

## Overview
Stellar Academy trains [[Kron]] and other majors.

## History
Its rules shape the Blackening curriculum.
```

`Locations/Moon Gate.md`:

```markdown
---
type: location
summary: A transit ruin used during stellar alignments.
tags: [ruin, transit]
---

## Overview
Moon Gate is tied to [[Stellar Academy]] ceremonies.
```

`Broken/Missing Image Note.md`:

```markdown
---
type: artifact
summary: A note with an intentionally missing image.
tags: [qa]
---

## Overview
This note should import even though the image is missing.

## Visual References
![[missing-artifact.png]]
```

For `Characters/kron-reference.png`, use any small PNG image.

## Task 1: Automated Parser QA

**Files:**
- Test: `src/portals/writer/__tests__/obsidianLoreImport.test.ts`
- Source: `src/portals/writer/obsidianLoreImport.ts`

- [ ] Run the focused parser tests.

```bash
npm run test -- --run src/portals/writer/__tests__/obsidianLoreImport.test.ts
```

Expected:

```text
Test Files  1 passed (1)
Tests  7 passed (7)
```

- [ ] Confirm tests cover:
  - YAML/frontmatter parsing.
  - Capitalized Obsidian property names.
  - Spaced/slashed property names such as `Threat Level` and `Symbols/Logos`.
  - Filename title fallback.
  - Folder-based category inference.
  - Template folder exclusion.
  - Obsidian internal links.
  - Embedded image references.
  - Adjacent embedded image references on the same line.
  - Tight Obsidian heading lines and headings that include image embeds.
  - Folder-style relative paths.
  - Type filter behavior.
  - Unresolved image warnings.
  - Duplicate skip, merge, and create duplicate behavior.

- [ ] Run the optional local reference-vault parser test.

```bash
npm run test -- --run src/portals/writer/__tests__/obsidianLoreImport.referenceVault.test.ts
```

Expected when `reference/Twovestellium Universe Obsidian Vault/` exists:

```text
Test Files  1 passed (1)
Tests  1 passed (1)
```

Expected if the local reference vault is absent:

```text
test skipped
```

## Task 2: Build And Lint QA

**Files:**
- Source: full repo

- [ ] Run the production build.

```bash
npm run build
```

Expected:

```text
✓ built
```

- [ ] If `supabase/functions/tsconfig.tsbuildinfo` changes during build and is not part of the feature, restore it.

```bash
git restore supabase/functions/tsconfig.tsbuildinfo
```

- [ ] Run lint.

```bash
npm run lint
```

Expected:

```text
0 errors
```

Known repo warnings may still appear. Do not treat pre-existing warnings as an Obsidian import failure unless the warning is in newly touched files.

## Task 3: Local Browser Smoke QA

**Files:**
- Source: `src/portals/writer/WriterPortal.tsx`

- [ ] Start the local app.

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

Expected:

```text
Local: http://127.0.0.1:5174/
```

- [ ] Open `http://127.0.0.1:5174/` in the in-app browser.
- [ ] Open **Writers Workshop**.
- [ ] Open the **Canon** tab.
- [ ] Confirm **Import from Obsidian** is visible.
- [ ] Confirm **Type filter** is visible with these options:
  - All types
  - character
  - species
  - faction
  - organization
  - location
  - event
  - discipline
  - artifact
  - concept
- [ ] Confirm **Select notes/images** is visible.
- [ ] Confirm **Select vault folder** is visible.
- [ ] Check browser console errors.

Expected:

```text
No captured console errors
```

## Task 4: Manual File Import QA

**Files:**
- Test fixture: `/private/tmp/obsidian-lore-import-fixture`

- [ ] In the Canon tab, click **Select notes/images**.
- [ ] Select:
  - `Characters/Kron.md`
  - `Characters/kron-reference.png`
  - `Organizations/Stellar Academy.md`
  - `Locations/Moon Gate.md`
  - `Broken/Missing Image Note.md`
- [ ] Confirm preview shows four entries.
- [ ] Confirm `Kron` shows:
  - category `character`
  - tags including `protagonist`
  - links including `Stellar Academy`
  - one detected image
- [ ] Confirm `Stellar Academy` shows:
  - category `organization`
  - tags including `academy`
  - link to `Kron`
- [ ] Confirm `Moon Gate` shows:
  - category `location`
  - link to `Stellar Academy`
- [ ] Confirm `Missing Image Note` shows:
  - category `artifact`
  - one warning for `missing-artifact.png`
- [ ] Deselect `Missing Image Note`.
- [ ] Click **Confirm import**.

Expected:

- Three lore cards are created.
- Result message reports imported cards and stored image count.
- `Missing Image Note` is not imported because it was deselected.

## Task 5: Manual Folder Import QA

**Files:**
- Test fixture: `/private/tmp/obsidian-lore-import-fixture`

- [ ] Clear the preview.
- [ ] Set **Type filter** to `organization`.
- [ ] Click **Select vault folder**.
- [ ] Select `/private/tmp/obsidian-lore-import-fixture`.

Expected:

- Preview includes `Stellar Academy`.
- Preview excludes `Kron`, `Moon Gate`, and `Missing Image Note`.

- [ ] Clear the preview.
- [ ] Set **Type filter** to `All types`.
- [ ] Click **Select vault folder** again.
- [ ] Select `/private/tmp/obsidian-lore-import-fixture`.

Expected:

- Preview includes all four Markdown notes.
- `Kron` image resolves from the folder.
- `Missing Image Note` displays an unresolved image warning.

## Task 6: Duplicate Handling QA

**Files:**
- Test fixture: `/private/tmp/obsidian-lore-import-fixture`

- [ ] Import `Kron.md` once.
- [ ] Select `Kron.md` again.
- [ ] Confirm preview marks it as a duplicate.
- [ ] Choose **skip** and confirm import.

Expected:

- No new `Kron` card is created.
- Result reports one skipped entry.

- [ ] Select `Kron.md` again.
- [ ] Choose **create duplicate** and confirm import.

Expected:

- A second `Kron` lore card is created.

- [ ] Select `Kron.md` again.
- [ ] Choose **overwrite** and confirm import.

Expected:

- The existing matched card body is replaced with the imported Markdown body and import metadata.

- [ ] Add a temporary app-specific marker to an existing `Kron` body:

```markdown
<!-- ARCS_LORE_APP_FIELDS {"qa":"preserve"} -->
```

- [ ] Select `Kron.md` again.
- [ ] Choose **merge** and confirm import.

Expected:

- The imported Markdown body updates.
- The `ARCS_LORE_APP_FIELDS` marker remains present in the saved card body.

## Task 7: Supabase Persistence QA

**Files:**
- Tables/storage:
  - `writer_lore_cards`
  - `arcs-generations`

- [ ] After a confirmed import, reload the browser.
- [ ] Return to **Writers Workshop -> Canon**.
- [ ] Confirm imported lore cards still appear.
- [ ] Confirm imported body text still includes headings such as `## Overview`, `## Relationships`, or `## Visual References`.
- [ ] Confirm the card UI shows the `Obsidian` source badge for imported cards.
- [ ] Confirm cards with stored images show visual reference counts.

Expected:

- Lore text persists after reload.
- Import metadata persists.
- Stored image reference counts remain visible.

## Task 8: Prompt Digest QA

**Files:**
- Source:
  - `src/portals/writer/obsidianLoreImport.ts`
  - `src/portals/writer/WriterPortal.tsx`
  - `supabase/functions/writer-tools/index.ts`

- [ ] Open **Cockpit**.
- [ ] Set a cockpit panel to **Lore** if needed.
- [ ] Confirm imported lore text appears.
- [ ] Confirm hidden import metadata does not appear:
  - `ARCS_LORE_IMPORT_METADATA`
  - `storageUrl`
  - raw storage URLs

Expected:

- The visible lore digest contains clean Markdown lore text only.

- [ ] If testing hosted generation, deploy the Edge function first.

```bash
supabase functions deploy writer-tools
```

Expected:

- Hosted `outline_issue` and `page_beats` prompts use clean lore text after deploy.

## Task 9: Existing Workflow Regression QA

**Files:**
- Source: `src/portals/writer/WriterPortal.tsx`

- [ ] Manually create a new lore card with title, category, body, include flag, and sort order.
- [ ] Edit that card.
- [ ] Delete that card.
- [ ] Expand **Import JSON**.
- [ ] Import a JSON lore payload with one new card.

Expected:

- Existing create/edit/delete behavior still works.
- Existing JSON import still works.
- JSON duplicates are still skipped by normalized category/title.

## Task 10: Cleanup QA

- [x] Delete QA lore cards from the selected series if they were imported into a real project. User completed manual cleanup for `Codex Obsidian QA Manual 20260601` and `Codex Obsidian QA JSON 20260601`.
- [ ] Stop the local dev server.
- [ ] Run final whitespace check.

```bash
git diff --check
```

Expected:

```text
no output
```

## Pass / Fail Criteria

Pass requires:

- Focused parser tests pass.
- Build passes.
- Lint has 0 errors.
- Browser smoke confirms the Canon import UI renders.
- Manual file import creates expected lore cards.
- Manual folder import respects type filter.
- Unresolved images warn without blocking note import.
- Duplicate actions behave as selected.
- Imported image metadata persists after reload.
- Prompt digests strip hidden import metadata.
- Existing manual lore card and JSON import workflows still work.

Fail if:

- Importing one bad image blocks all notes.
- Imported Markdown body loses headings or Obsidian links.
- Duplicate overwrite/merge updates the wrong card.
- Image URLs are automatically injected into text-generation prompts.
- Existing JSON import or manual lore card creation breaks.
