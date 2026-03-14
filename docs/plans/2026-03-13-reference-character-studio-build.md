# Reference Character Studio: Finalized Build — Implementation Plan

**Goal:** Build the Reference Character Studio to the finalized spec: Emerald-Black + Gold theme, left control panel (tags/chips + Save as Tag / Save to Library), right Live Image display, DNA weighting, Cinematic Suite, Onyx Vault, and footer actions with persistence to Character Archive and Cast in Story.

**Architecture:** Two-column layout (left: scrollable sections; right: Live Image + Age/Pose/Import + footer). Zustand store `characterStudioStore` (persist to localStorage). DNA logic: 1/N when Heritage/Gender unselected; +15% weight for African-American and Blatino. Save → generationOutputRouter + Character Archive (CinematicGallery). Cast in Story → story photo collections; button disabled when no saved stories/comics.

**Tech Stack:** React 19, Vite 7, Tailwind, Zustand (+ persist), PromptCompiler, characterStudioPrompt (DNA weights), generationOutputRouter, storyPhotoCollections.

## Key files created/updated

- `src/shared/theme/Phase12DesignTokens.ts` — CHARACTER_STUDIO_* tokens
- `src/data/character_studio_spec.ts` — Art Style, DNA, Surgical, Wardrobe, Cinematic option lists
- `src/stores/characterStudioStore.ts` — store + persist
- `src/shared/utils/characterStudioPrompt.ts` — buildCharacterStudioPrompt, applyDnaWeights
- `src/shared/utils/storyPhotoCollections.ts` — getStoryPhotoCollections, addCharacterRefToStory
- `src/portals/CharacterStudio.tsx` — full UI (left panel sections, right Live Image, footer)
- `src/components/ui/CinematicGallery.tsx` — wired to getGenerations('character')

## Verification

- Open Reference Character Studio; confirm Emerald-Black + Gold, two-column layout.
- Select tags (Art Style, Heritage, Gender, Surgical, Wardrobe, Cinematic); confirm Live Prompt updates.
- Unlock Onyx Vault with password "onyx"; edit prompt; confirm override used when non-empty.
- Generate Character (mock); Save New Character; open Character Archive and confirm image appears.
- Cast in Story: disabled when no stories; when stories exist, modal to pick story and add character ref.
