# Archive-Driven Generation & Multi-Category Modifiers — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement dual-layer naming and album grouping, modifier ribbons (color + material) per category, 14 categorized reference slots with Archive recall, and QoL (global reset, pulse verification, tab state).

**Architecture:** Supabase migration adds profile/cast and collection/asset name columns; persistence and Archive UI group by them. One shared ModifierRibbon component; each studio gets a modifier store slice and prompt fusion. Recall modal reuses Album data source; slot index passed into existing setReferenceImageAt. QoL: one reset action per studio; verify existing pulse and portal state.

**Tech Stack:** React 19, Zustand (persist), Supabase (optional), TypeScript, Tailwind, Phase12DesignTokens.

**Design reference:** `docs/plans/2026-03-15-archive-driven-generation-modifiers-design.md`

---

## Task 1: Supabase migration — dual-layer name columns

**Files:**
- Create: `supabase/migrations/20260315000000_arcs_dual_layer_names.sql`

**Step 1: Add columns and indexes**

Add to the new migration file:

```sql
-- Dual-layer naming for characters: profile_name (album group), cast_name (specific look)
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS profile_name TEXT,
  ADD COLUMN IF NOT EXISTS cast_name TEXT;

-- Dual-layer naming for assets: collection_name (album group), asset_name (specific)
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS collection_name TEXT,
  ADD COLUMN IF NOT EXISTS asset_name TEXT;

CREATE INDEX IF NOT EXISTS idx_characters_profile_name ON public.characters (profile_name);
CREATE INDEX IF NOT EXISTS idx_assets_collection_name ON public.assets (collection_name);
```

**Step 2: Verify migration**

Run (if Supabase CLI available): `supabase db push` or apply in Supabase SQL editor.  
Expected: No errors; `characters` and `assets` have new columns.

**Step 3: Commit**

```bash
git add supabase/migrations/20260315000000_arcs_dual_layer_names.sql
git commit -m "feat(db): add profile_name/cast_name and collection_name/asset_name for albums"
```

---

## Task 2: Persistence — accept and persist profile/cast and collection/asset names

**Files:**
- Modify: `src/shared/api/arcsPersistence.ts` (saveCharacterToDb, saveAssetToDb signatures and insert payloads)
- Modify: `src/shared/utils/generationOutputRouter.ts` (extend StoredGeneration with optional profile_name, collection_name)
- Modify: `src/shared/utils/semanticId.ts` (no change; keep generateSemanticId as-is; callers pass base name)

**Step 1: Extend saveCharacterToDb**

- Add optional params: `profileName: string`, `castName?: string` (or a single `names: { profileName: string; castName?: string }`).
- In insert payload include: `profile_name: profileName`, `cast_name: castName ?? null`, keep `name` as display (e.g. `castName ?? profileName ?? baseName`).

**Step 2: Extend saveAssetToDb**

- Add optional params: `collectionName: string`, `assetName?: string`.
- In insert payload include: `collection_name: collectionName`, `asset_name: assetName ?? null`, `name` as display.

**Step 3: Extend StoredGeneration (generationOutputRouter)**

- Add optional `profileName?: string` and `collectionName?: string` to the interface and to the object pushed in saveGeneration (accept optional params).
- getGenerations remains unchanged (returns same shape; callers can group by profileName/collectionName when present).

**Step 4: Lint and type-check**

Run: `npm run build` or `npx tsc --noEmit`  
Expected: No type errors.

**Step 5: Commit**

```bash
git add src/shared/api/arcsPersistence.ts src/shared/utils/generationOutputRouter.ts
git commit -m "feat(arcs): persist profile/cast and collection/asset names; StoredGeneration optional grouping"
```

---

## Task 3: ModifierRibbon component

**Files:**
- Create: `src/components/ui/ModifierRibbon.tsx`

**Step 1: Implement component**

- Props: `categoryLabel: string`, `selectedColor: string` (hex), `material: 'matte' | 'gloss' | 'glow'`, `tagLabel?: string`, `onColorChange: (hex: string) => void`, `onMaterialChange: (m: 'matte' | 'gloss' | 'glow') => void`, optional `variant?: 'emerald' | 'amethyst'` for styling.
- Layout: one row — color swatch (small div or input type color), then three toggle buttons (Matte | Gloss | Glow), then optional tag text.
- Use Phase12DesignTokens: CHARACTER_STUDIO_* for emerald, ASSET_STUDIO_* / amethyst for asset; gold for active toggle.

**Step 2: Use in a single place (smoke test)**

- Temporarily render one ModifierRibbon in CharacterStudio (e.g. above Wardrobe) with local state; remove after verification.
- Or add to Storybook/placeholder page if project has it.

**Step 3: Lint**

Run: `npm run lint`  
Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/ui/ModifierRibbon.tsx
git commit -m "feat(ui): add ModifierRibbon (color swatch + Matte/Gloss/Glow)"
```

---

## Task 4: Character Studio — wardrobe modifier state and ribbons

**Files:**
- Modify: `src/stores/characterStudioStore.ts` (add wardrobeModifiers state and actions; persist)
- Modify: `src/portals/CharacterStudio.tsx` (render ModifierRibbon for Tops, Bottoms, Outerwear, Accessories; wire to store)

**Step 1: Add state and actions (character store)**

- Define type: `WardrobeModifierCategory = 'tops' | 'bottoms' | 'outerwear' | 'accessories'`.
- State: `wardrobeModifiers: Record<WardrobeModifierCategory, { color: string; material: 'matte' | 'gloss' | 'glow' }>` with defaults (e.g. #888888, 'matte').
- Actions: `setWardrobeModifierColor(category, hex)`, `setWardrobeModifierMaterial(category, material)`.
- Include in persist partialize so it persists.

**Step 2: Render four ModifierRibbons in Character Studio**

- In Wardrobe section, for each of tops, bottoms, outerwear, accessories: render ModifierRibbon with categoryLabel, store color/material, and tagLabel from wardrobeSelections[category] (e.g. first selected or comma-joined). Wire onColorChange and onMaterialChange to store actions. variant="emerald".

**Step 3: Lint and build**

Run: `npm run build`  
Expected: Success.

**Step 4: Commit**

```bash
git add src/stores/characterStudioStore.ts src/portals/CharacterStudio.tsx
git commit -m "feat(character-studio): wardrobe modifier state and ModifierRibbons for Tops, Bottoms, Outerwear, Accessories"
```

---

## Task 5: Asset Studio — asset modifier state and ribbons

**Files:**
- Modify: `src/stores/assetStudioStore.ts` (add assetModifiers state and actions; persist)
- Modify: `src/portals/AssetsStudio.tsx` (render ModifierRibbon for Structure, Furniture, Atmospherics; wire to store)

**Step 1: Add state and actions (asset store)**

- Define type: `AssetModifierCategory = 'structure' | 'furniture' | 'atmospherics'`.
- State: `assetModifiers: Record<AssetModifierCategory, { color: string; material: 'matte' | 'gloss' | 'glow' }>` with defaults.
- Actions: `setAssetModifierColor(category, hex)`, `setAssetModifierMaterial(category, material)`.
- Include in persist.

**Step 2: Render three ModifierRibbons in Asset Studio**

- In Scene Setting & Props (or equivalent), for Structure, Furniture, Atmospherics: render ModifierRibbon; tagLabel from setDressingSelections (map structure → roomType, furniture → furniture, atmospherics → lightingFixtures or surfaceTextures). variant="amethyst".

**Step 3: Lint and build**

Run: `npm run build`  
Expected: Success.

**Step 4: Commit**

```bash
git add src/stores/assetStudioStore.ts src/portals/AssetsStudio.tsx
git commit -m "feat(asset-studio): asset modifier state and ModifierRibbons for Structure, Furniture, Atmospherics"
```

---

## Task 6: Prompt fusion — [Color] [Material] [Tag]

**Files:**
- Create or modify: `src/shared/utils/buildPrompt.ts` (shared fusion helper)
- Modify: `src/shared/utils/characterStudioPrompt.ts` (call fusion for wardrobe modifiers; append to compiled prompt)
- Modify: `src/shared/utils/assetStudioPrompt.ts` (call fusion for asset modifiers; append to compiled prompt)

**Step 1: Add fusion helper**

- In `buildPrompt.ts` (create if missing): export `fuseModifierSegment(color: string, material: string, tag?: string): string` returning e.g. `"${color}, ${material}${tag ? ', ' + tag : ''}"`. Optionally hexToName for common colors or pass through as hex.
- Export `fuseWardrobeModifiers(wardrobeModifiers, wardrobeSelections, categories): string[]` and `fuseAssetModifiers(assetModifiers, setDressingSelections, categories): string[]` that return array of segments for each category with a selected tag or non-default color/material.

**Step 2: Integrate into buildCharacterStudioPrompt**

- Accept optional `wardrobeModifiers` and use fuseWardrobeModifiers for Tops, Bottoms, Outerwear, Accessories; append segments to extraParts or to compiled string before DNA weights.

**Step 3: Integrate into buildAssetStudioPrompt**

- Accept optional `assetModifiers` and use fuseAssetModifiers for Structure, Furniture, Atmospherics; append segments to extraParts.

**Step 4: Wire callers**

- CharacterStudio: when building live prompt, pass store.wardrobeModifiers and store.wardrobeSelections into buildCharacterStudioPrompt.
- AssetsStudio: pass store.assetModifiers and store.setDressingSelections into buildAssetStudioPrompt.

**Step 5: Lint and build**

Run: `npm run build`  
Expected: Success.

**Step 6: Commit**

```bash
git add src/shared/utils/buildPrompt.ts src/shared/utils/characterStudioPrompt.ts src/shared/utils/assetStudioPrompt.ts src/portals/CharacterStudio.tsx src/portals/AssetsStudio.tsx
git commit -m "feat(prompt): fuse [Color] [Material] [Tag] for wardrobe and asset modifiers in prompts"
```

---

## Task 7: Reference slot labels (14 slots, 4 categories)

**Files:**
- Create or modify: `src/shared/constants/referenceSlots.ts` (or under data/)
- Modify: `src/portals/CharacterStudio.tsx` and `src/portals/AssetsStudio.tsx` (reference area UI to show slot index and category label)

**Step 1: Define slot labels**

- Export `REFERENCE_SLOT_CATEGORIES`: Physicality 0–3, Hairstyle 4–6, Clothing 7–10, Aesthetic 11–13. e.g. `Array<{ start: number; end: number; label: string }>` or `getSlotLabel(index: number): string` returning "Physicality 1" etc.

**Step 2: Update reference area UI (Character Studio)**

- Where referenceImageUrls are rendered, show slot index (0–13) and label (e.g. "Physicality 1") per thumbnail. Keep existing add/remove; add placeholder for "Archive" button in next task.

**Step 3: Update reference area UI (Asset Studio)**

- Same: show slot index and label per thumbnail.

**Step 4: Lint**

Run: `npm run lint`  
Expected: No errors.

**Step 5: Commit**

```bash
git add src/shared/constants/referenceSlots.ts src/portals/CharacterStudio.tsx src/portals/AssetsStudio.tsx
git commit -m "feat(reference): 14 slots labeled Physicality, Hairstyle, Clothing, Aesthetic"
```

---

## Task 8: Archive Recall modal — browse Albums and inject into slot

**Files:**
- Create: `src/components/ui/ArchiveRecallModal.tsx`
- Modify: `src/portals/CharacterStudio.tsx` (open modal from Archive button per slot; onSelect inject url into slot)
- Modify: `src/portals/AssetsStudio.tsx` (same)

**Step 1: Implement ArchiveRecallModal**

- Props: `open: boolean`, `onClose: () => void`, `context: 'character' | 'asset'`, `slotIndex: number`, `onSelect: (imageUrl: string) => void`.
- Data: when context is character, fetch characters (Supabase) or getGenerations('character'); group by profile_name or StoredGeneration.profileName. When context is asset, same for assets / getGenerations('asset') and collection_name.
- UI: list/accordion of Albums (group name); each album expands to grid of images; click image calls onSelect(imageUrl) and onClose.

**Step 2: Wire in Character Studio**

- State: recallModalOpen (or slotIndexForRecall null); when "Archive" on slot i clicked, set slotIndexForRecall = i and open modal. OnSelect: setReferenceImageAt(i, url), close modal.

**Step 3: Wire in Asset Studio**

- Same pattern: Archive button per slot opens modal with context='asset'; onSelect sets reference slot and closes.

**Step 4: Supabase fetch helper (optional)**

- If Supabase configured: add functions in arcsPersistence or new file to fetch characters grouped by profile_name and assets grouped by collection_name; use in modal. Else use getGenerations and group by optional profileName/collectionName.

**Step 5: Browser test**

- Open Character Studio → add reference → click Archive on slot 0 → modal shows albums → select image → slot 0 shows selected image. Repeat for Asset Studio.

**Step 6: Commit**

```bash
git add src/components/ui/ArchiveRecallModal.tsx src/portals/CharacterStudio.tsx src/portals/AssetsStudio.tsx
git commit -m "feat(recall): Archive recall modal to inject saved image into reference slot"
```

---

## Task 9: Character Archive and Asset Archive — group by profile/collection

**Files:**
- Modify: `src/components/ui/CinematicGallery.tsx` (Character Archive: group by profile_name; use Supabase or getGenerations + profileName)
- Create or locate Asset Archive component (e.g. in ReferenceAlbum or AssetsStudio or separate); same grouping by collection_name

**Step 1: Character Archive grouping**

- Fetch: if Supabase, select characters order by created_at, group in JS by profile_name (or null/unnamed). Else getGenerations('character') and group by profileName.
- Render: section per album (header = profile name); grid of cards (image_url, cast_name or name, seed).

**Step 2: Asset Archive grouping**

- Same pattern: group by collection_name; section per album; cards with asset_name or name, seed.

**Step 3: Save flows — collect profile/collection names**

- When user saves "Save New Character" or "Save Edited Profile", prompt for or derive profileName (required) and optional castName; pass to saveCharacterToDb and to saveGeneration(..., { profileName }).
- When user saves asset, collect collectionName (required) and optional assetName; pass to saveAssetToDb and saveGeneration(..., { collectionName }). UI: input or modal for name(s) if not already present.

**Step 4: Commit**

```bash
git add src/components/ui/CinematicGallery.tsx [and Asset Archive component, arcsPersistence callers]
git commit -m "feat(archive): group Character/Asset archives by profile_name and collection_name; save flows collect names"
```

---

## Task 10: Global reset — clear all modifier colors and materials

**Files:**
- Modify: `src/stores/characterStudioStore.ts` (add resetWardrobeModifiers action)
- Modify: `src/stores/assetStudioStore.ts` (add resetAssetModifiers action)
- Modify: `src/portals/CharacterStudio.tsx` (button "Reset all modifiers" near ribbons)
- Modify: `src/portals/AssetsStudio.tsx` (same)

**Step 1: Store actions**

- Character: `resetWardrobeModifiers()` sets all wardrobeModifiers to default (e.g. #888888, 'matte').
- Asset: `resetAssetModifiers()` sets all assetModifiers to default.

**Step 2: UI buttons**

- One button in each studio near modifier ribbons; onClick calls reset action. Label: "Clear colors & materials" or "Reset all modifiers".

**Step 3: Commit**

```bash
git add src/stores/characterStudioStore.ts src/stores/assetStudioStore.ts src/portals/CharacterStudio.tsx src/portals/AssetsStudio.tsx
git commit -m "feat(qol): global reset for modifier colors and materials"
```

---

## Task 11: Verify Gemstone pulse and tab state

**Files:**
- No code changes unless issues found. Verify: `src/portals/CharacterStudio.tsx`, `src/portals/AssetsStudio.tsx`, `src/App.tsx`, theme.css / Phase12DesignTokens.

**Step 1: Gemstone pulse**

- Trigger Generate in Character Studio: button shows Emerald pulse during pending. Trigger Generate in Asset Studio: Amethyst pulse. Confirm GEM_EMERALD / GEM_AMETHYST and generationStatus === 'pending' drive the UI.

**Step 2: Tab state**

- Switch Character → Asset → Character. Confirm reference slots, live image, modifier ribbons, and Onyx selection are unchanged (Zustand persist; no unmount clear).

**Step 3: Document in walkthrough**

- Add short entry to walkthrough.md: Archive-driven generation and modifier ribbons (v11.0) — dual-layer names, modifier ribbons, recall modal, global reset; pulse and tab state verified.

**Step 4: Commit**

```bash
git add walkthrough.md
git commit -m "docs: walkthrough v11.0 archive-driven generation and modifiers"
```

---

## Execution

After implementing, run full regression: both studios (generate, save, archive, recall, reset, tab switch). Run `npm run build` and `npm run test` (if applicable).
