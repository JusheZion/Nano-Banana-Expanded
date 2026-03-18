# Studio UX, Refinement Engine, and Polish — Implementation Plan

> **For Claude:** Use this plan task-by-task. Execute in a worktree or main as appropriate.

**Goal:** (1) Steer the AI to use only subject/wardrobe/hairstyle from references (exclude background/furniture). (2) Add a refinement prompt engine for already-generated images. (3) Apply UI/layout and tooltip improvements. (4) Add efficiency, aesthetics, and polish features (shortcuts, snippets, last-prompt chip, bulk slot actions, undo, empty states, suggest chips, gallery density, micro-animations, pin-on-click tooltips).

**Architecture:** Prompt logic in build-prompt and API; refinement = new flow (refinement prompt + current image as reference). UI = layout/component updates in both portals and shared components.

**Tech Stack:** React, Zustand, [geminiImageApi.ts](src/shared/api/geminiImageApi.ts), [buildPrompt.ts](src/shared/utils/buildPrompt.ts), Radix Tooltip.

---

## 1. Prompt logic: subject-only / exclude background

**Problem:** Generations sometimes pull in background or furniture from references; worse when the user edits the prompt.

**Approach:**

- **A. Global subject-only prefix**  
  In [geminiImageApi.ts](src/shared/api/geminiImageApi.ts), when there is at least one reference image, prepend to the final prompt:  
  "Use only the subject, wardrobe, hairstyle, and likeness from the reference images; do not copy background, furniture, or environment."

- **B. Stronger instruction when vault override is active**  
  When using `vaultPromptOverride`, append:  
  "Ignore any background or setting in the reference images; generate only the character [or asset] as described."  
  Portals pass a boolean (e.g. `isVaultOverride`) into `generateImage` so the API can add this only when override is used.

**Files:** [src/shared/api/geminiImageApi.ts](src/shared/api/geminiImageApi.ts), [src/portals/CharacterStudio.tsx](src/portals/CharacterStudio.tsx), [src/portals/AssetsStudio.tsx](src/portals/AssetsStudio.tsx).

---

## 2. Refinement prompt engine

**Concept:** Dedicated flow for "refine this generated image": user types a refinement prompt (or later uses "NEW" for AI-generated description); "Refine" runs generation with refinement prompt + current image as single reference; result appears in gallery.

- **Tab 3 (Refinement):** Text area for refinement prompt; "NEW" button (follow-up: image-to-text API); "Refine" button.
- **State:** e.g. `refinementPromptOverride: string` in each studio store, persisted.
- **"NEW" (describe):** Follow-up task; implement manual refinement first.

**Files:** Character/Asset stores, portals (Tab 3 UI, Refine handler), [geminiImageApi.ts](src/shared/api/geminiImageApi.ts) or new module for describe API later.

---

## 3. UI layout and structure (both portals)

- **3.1 Separate panels:** Panel A = Image Reference (14 slots, per-slot Upload/Archive, Diversify). Panel B = Tags (Art Style, DNA, Wardrobe, Cinematic, etc.). Two distinct panels (e.g. left column split or side-by-side).
- **3.2 Remove top "Add reference image" button** — only per-slot Upload/Archive.
- **3.3 Prompt panel → 3-tab layout:** Tab 1 = Auto prompt (read-only). Tab 2 = Edit prompt (password-gated). Tab 3 = Refine (refinement prompt + NEW + Refine button).
- **3.4 Increase prompt text size** — at least `text-sm` for all prompt-related text areas.
- **3.5 Tag panel** extends to bottom of viewport with internal scroll.
- **3.6 Zoom on hover** for reference thumbnails and generated images (scale or small overlay).
- **3.7 Tooltips:** Extend [Tooltip.tsx](src/shared/components/Tooltip.tsx) for click-to-pin and close button so tip stays until user closes it.

**Files:** [CharacterStudio.tsx](src/portals/CharacterStudio.tsx), [AssetsStudio.tsx](src/portals/AssetsStudio.tsx), [Tooltip.tsx](src/shared/components/Tooltip.tsx).

---

## 4. Efficiency features

- **Keyboard shortcuts**
  - `Ctrl/Cmd+Enter`: trigger Generate (primary action).
  - `Escape`: close modals, clear selection, blur inputs.
  - Implement in portals via `useEffect` + `keydown` listener; scope to when portal is focused or document.

- **Prompt snippets / presets**
  - Save 3–5 named prompt snippets (e.g. "Close-up portrait", "Full body neutral").
  - Store in Zustand (e.g. `promptSnippets: { id, name, text }[]`) with add/remove; persist.
  - UI: dropdown or chip list "Insert snippet" that inserts snippet text into current prompt (Edit or Refine tab).
  - Files: store additions, small SnippetPicker or dropdown in prompt area.

- **"Last prompt" chip**
  - After each generation, store the prompt used (e.g. `lastUsedPrompt: string` in store or local state).
  - Show a chip near the prompt area: "Last prompt" (truncated). Click = copy to clipboard and/or paste into Refinement tab.
  - Files: store or portal state, one chip component or inline button.

- **Bulk slot actions**
  - In reference panel: "Clear all" (clear all 14 slots); "Paste in first empty" (paste from clipboard into first empty slot, if clipboard has image).
  - Files: reference panel in both portals, clipboard read for image (e.g. `navigator.clipboard.read()` / paste event).

- **"Generate again" / queue**
  - After a result, one-click "Generate again" (same prompt + same or new seed) to re-run without re-clicking Generate.
  - Optional: small queue (e.g. 2 runs) so power users can trigger multiple and see latest. Start with single "Generate again" button.
  - Files: portals, reuse existing `handleGenerateCharacter` / asset equivalent with same prompt/seed.

---

## 5. Aesthetics and interactivity

- **Slot state styling**
  - Empty slots: dashed border; filled slots: solid border.
  - Optional: light pulse or glow on the "active" reference (e.g. slot that maps to current live image or first identity slot). Use CSS or Tailwind.

- **Smooth transitions for live image**
  - When live image updates after generation: short crossfade or scale-in (e.g. 200–300ms) instead of hard swap. Use CSS transition on the image container or img.

- **Micro-animations**
  - Generate/Refine loading: subtle shimmer or progress indicator (e.g. skeleton or small spinner) instead of only text.
  - Optional: light motion on tab switch (opacity/translate); panel expand/collapse if applicable.

- **Refinement tab "Suggest"**
  - Offer 3–5 short refinement prompts as clickable chips (e.g. "Softer lighting", "Different pose", "Closer crop", "Same style different angle"). Click = append or replace refinement text.
  - Can be context-aware later (e.g. character vs asset); start with a shared set per portal.

- **Gallery grid density toggle**
  - "Compact" vs "Comfortable" for Recent/saved thumbnails. Compact = smaller cards, more per row; Comfortable = larger. Store preference in portal state or persist.
  - Files: gallery section in both portals, toggle control, conditional class or grid columns.

---

## 6. Consistency and polish

- **Empty states**
  - No reference images: short message + primary CTA "Upload first reference" (focus first slot or open file picker).
  - No recent generations: message + "Generate your first image."
  - No refinement prompt: hint "Type a refinement or use Suggest chips below."
  - Use consistent empty-state component or inline block with icon/text/button.

- **Contextual help**
  - Small "?" next to each prompt tab title (Prompt, Edit prompt, Refine). Click opens tooltip with 1–2 sentence explanation. Use pin-on-click tooltip so it stays open until closed.

- **Undo last generation**
  - Store `previousLiveImageUrl` (and optionally previous seed) in store or portal state. When user clicks "Undo", set `currentLiveImageUrl` back to `previousLiveImageUrl`. Update on each successful generation (previous = current before overwrite).
  - Files: store or portal state, "Undo" button near live image or in action bar.

---

## 7. Implementation order (suggested)

1. Prompt logic — subject-only prefix + vault-override suffix.
2. Layout and panels — split reference vs tags, remove top upload, extend tag panel.
3. 3-tab prompt panel — Tabs 1–3, increase text size, refinement state and Refine button.
4. Refinement engine — Refine flow, result in gallery.
5. Zoom on hover — reference and generated images.
6. Tooltips — pin-on-click and close button.
7. Efficiency — keyboard shortcuts, Last prompt chip, Clear all / Paste first empty, Generate again.
8. Snippets — store + UI to insert into prompt.
9. Aesthetics — slot styling, live image transition, loading micro-animation, Suggest chips, gallery density.
10. Polish — empty states, ? on tabs, Undo last generation.
11. "NEW" describe button — after image-describe API (follow-up).

---

## 8. Out of scope / follow-ups

- Image describe API for "NEW" in Tab 3 (separate design/implementation).
- Asset vs character wording for subject-only copy.
- Unit tests for new prompt building; E2E for Refine and shortcuts.

---

## 9. Summary table

| Area | Action |
|------|--------|
| Subject-only | Global prefix + vault-override suffix in API; portals pass override flag. |
| Refinement engine | Tab 3, refinement state, Refine button; "NEW" later. |
| Panels | Separate Reference and Tags; remove top upload; tag panel full height + scroll. |
| Prompt UI | 3 tabs (Auto, Edit, Refine); larger text. |
| Zoom | Hover zoom on reference and generated images. |
| Tooltips | Click-to-pin and close button. |
| Shortcuts | Ctrl/Cmd+Enter = Generate; Escape = close. |
| Snippets | Named presets; insert into Edit/Refine. |
| Last prompt | Chip to copy/paste last used prompt. |
| Bulk slots | Clear all; Paste in first empty. |
| Generate again | One-click re-run same prompt. |
| Slot styling | Dashed/solid; optional active glow. |
| Live image | Crossfade/scale-in on update. |
| Loading | Shimmer/progress for Generate/Refine. |
| Suggest | Refinement chips (Softer lighting, etc.). |
| Gallery density | Compact vs Comfortable toggle. |
| Empty states | No refs, no recent, no refinement + CTAs. |
| Contextual help | ? on tab titles with pin-on-click tooltip. |
| Undo | Restore previous live image after generation. |
