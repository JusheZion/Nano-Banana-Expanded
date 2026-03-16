# Archive-Driven Generation & Multi-Category Modifiers — Design (ARCS v11.0)

**Status:** Approved  
**Date:** 2026-03-15

## Goal

Build archive-driven generation and multi-category modifier ribbons for ARCS Studio: dual-layer naming and album grouping in Supabase, modifier ribbons (color + material) per category, categorized reference slots with Archive recall, and QoL (global reset, gemstone pulse verification, tab state preservation).

## 1. Dual-Layer Naming & Album Logic

- **Characters:** `cast_name` (specific look, e.g. "Hollywood Barbie"), `profile_name` (permanent character, e.g. "Barbie").
- **Assets:** `asset_name` (specific room, e.g. "Main Lab"), `collection_name` (set, e.g. "Cyber-Clinic").
- **Schema:** Migration adds `cast_name`, `profile_name` to `characters`; `asset_name`, `collection_name` to `assets`. Indexes for grouping.
- **Persistence:** Save flows collect profile/collection (required) and cast/asset (optional); `arcsPersistence` and optional `StoredGeneration` fields support grouping.
- **Archive UI:** Character Archive groups by `profile_name`; Asset Archive groups by `collection_name`. Each group = one Album (header + grid of cards).

## 2. Multi-Category Modifier Ribbons

- **ModifierRibbon:** Reusable component: category label, color swatch, Material toggle (Matte | Gloss | Glow), optional tag display.
- **Character Studio:** Ribbons for Tops, Bottoms, Outerwear, Accessories; store slice e.g. `wardrobeModifiers`.
- **Asset Studio:** Ribbons for Structure, Furniture, Atmospherics; store slice e.g. `assetModifiers`.
- **Prompt:** Shared fusion helper; prompt segment per category: `[Color] [Material] [Tag]`; integrated into `buildCharacterStudioPrompt` and `buildAssetStudioPrompt`.

## 3. Archive Recall Engine

- **Slots:** 14 reference slots, fixed mapping to 4 labels: Physicality (0–3), Hairstyle (4–6), Clothing (7–10), Aesthetic (11–13).
- **Recall modal:** "Archive" button per slot opens modal; Albums (grouped by profile/collection); pick image injects `image_url` into that slot.
- **Scope:** Character Studio → Character Archive; Asset Studio → Asset Archive.

## 4. QoL & Performance

- **Global reset:** Button to clear all ribbon colors and materials in each studio.
- **Gemstone pulse:** Verify Emerald (Character) / Amethyst (Asset) during generation.
- **Navigation:** Verify no state loss when switching portals (Zustand persist; no re-fetch/clear on switch).

## Out of Scope (this design)

- Variable number of slots per category.
- Separate "names" table; single migration only.
