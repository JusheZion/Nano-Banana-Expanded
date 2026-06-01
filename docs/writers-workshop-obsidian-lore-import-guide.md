# Writers Workshop Obsidian Lore Import Guide

This guide explains how to import lore notes from an Obsidian vault into Writers Workshop Canon / Lore.

## What This Import Supports

The Obsidian importer can read:

- Markdown notes: `.md`
- Image files: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`
- Individual selected files
- A selected folder from an Obsidian vault
- YAML/frontmatter properties
- Obsidian internal links like `[[Kron]]` and `[[Stellar Academy]]`
- Obsidian image embeds like `![[image.png]]` and `![[Assets/Characters/Kron/kron-reference.png]]`

Imported notes become Writers Workshop lore cards for the selected series.

Folder imports skip notes inside `Templates/` folders and files named like `Character Template.md`.

## Recommended Obsidian Note Shape

Use frontmatter when possible:

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
Kron is a Black Magic Major at [[Stellar Academy]].

## Relationships
- Mentored by [[Magister Santoro]].
- Best friends with [[Rhia Simms]].

## Abilities
Kron uses black magic and arithmamagic.

## Visual References
![[Assets/Characters/Kron/kron-reference.png|Primary reference]]

## Notes
Keep his spellcasting instability consistent before outline and beat generation.
```

## Property Mapping

The importer maps note fields like this:

| Obsidian property | Lore import field |
| --- | --- |
| `name` or `title` | Lore card title |
| filename | Title fallback when no `name` or `title` exists |
| `type`, `category`, or `kind` | Lore card category |
| `summary` or `description` | Summary shown at the top of the lore body |
| `tags` | Imported tags metadata |
| other properties | Preserved as metadata |

Property names are read case-insensitively, so `Type`, `type`, and `TYPE` are treated the same for import mapping. Properties with spaces or slashes, such as `Threat Level` or `Symbols/Logos`, are preserved as metadata.

When no explicit type/category/kind property exists, the importer infers the category from common vault folders:

- `Characters/` -> `character`
- `Species/` -> `species`
- folders containing `Faction` -> `faction`
- folders containing `Organization` -> `organization`
- `Locations/` -> `location`
- `Events/` -> `event`
- `Disciplines/` -> `discipline`
- `Artifacts/` -> `artifact`
- `Concepts/` -> `concept`

Supported type filters include:

- `character`
- `species`
- `faction`
- `organization`
- `location`
- `event`
- `discipline`
- `artifact`
- `concept`

The importer does not hardcode character-only behavior.

## How To Import

1. Open the app and go to **Writers Workshop**.
2. Select the target series in the right Library panel.
3. Open the **Canon** tab.
4. Find **Import from Obsidian**.
5. Optional: set **Type filter** to import only one taxonomy type.
6. Choose one of:
   - **Select notes/images** for one or more Markdown/image files.
   - **Select vault folder** for a folder containing Obsidian notes and assets.
7. Review the preview list.
8. Deselect any note you do not want to import.
9. For duplicate titles, choose one duplicate action:
   - **skip**: do not import the note.
   - **overwrite**: replace the existing lore body and imported metadata.
   - **merge**: update the imported lore body while preserving app-specific markers.
   - **create duplicate**: create a second lore card with the same title.
10. Click **Confirm import**.

## Preview Screen Meaning

Each preview row shows:

- Title
- Type/category
- Source path
- Tags
- Detected Obsidian links
- Detected image embeds
- Matched lore references
- Warnings

Warnings do not block the entire import. For example, if a note references `![[missing.png]]`, the lore note can still import and the missing image is listed as unresolved.

## Image Handling

When a Markdown note contains an embedded image reference, the importer tries to resolve it from:

- The same folder as the note
- The selected folder path
- A unique matching image filename in the selected files/folder

Resolved images are uploaded through the app's existing `arcs-generations` storage path during confirmed import. The stored URLs are saved as visual reference metadata on the lore card.

Adjacent embeds on the same line are supported, such as `![[front.png]]![[back.png]]`. If an image appears directly in a heading line, the importer strips the embed syntax from the stored section context so the image can still be associated with a clean section label.

Important constraints:

- You must be signed in for cloud image storage.
- Storage policies must allow uploads to `arcs-generations`.
- If image upload fails, the lore text can still import and the UI reports a warning.
- Imported image URLs are not automatically injected into text prompts. They are preserved as reference assets for future image-capable generation flows.

## How Imported Lore Is Used By Generation

Lore cards marked **Include in AI prompts** are available to Writers Workshop generation:

- Outline generation
- Page beat generation
- Dialogue generation
- Page planning and related context digests

The prompt digest uses the clean Markdown lore text. Hidden import metadata, image URLs, and storage details are stripped before text-generation calls.

## Troubleshooting

### No notes were detected

Confirm the selection includes `.md` files. If using a type filter, clear it and try again.

### Image reference is unresolved

Select the referenced image file or import a folder that contains it. Obsidian embed paths are resolved relative to the note folder when possible.

### Duplicate note appears

The importer matches duplicates by title/name against existing lore cards. Pick skip, overwrite, merge, or create duplicate in the preview row.

### Images do not upload

Confirm you are signed in and that Supabase storage is configured for the `arcs-generations` bucket. The lore note can still import without stored images.

### Hosted generation still includes metadata

The local app strips metadata in the client. Hosted generation also needs the updated `writer-tools` Supabase Edge function deployed.

## Operator Notes

- The feature currently stores imported metadata inside the existing lore card body to avoid a database migration.
- A future schema can move source path, tags, links, and image assets into first-class columns or a related lore-assets table.
- Future image-capable generation should explicitly select imported lore images instead of injecting them automatically into text prompts.
