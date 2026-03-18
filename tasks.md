# ARCS Tasks

Checklist for current and upcoming phases. Update as work completes.

## ARCS Universal API Bridge & Data Persistence (Mar 2026) — COMPLETE

- [x] Semantic ID util + DB schema + Supabase client
- [x] Stores: referenceImageUrls, selectedOnyxModelId, generationStatus
- [x] Gemini API module: request/response, 429 backoff, safety
- [x] Onyx model selector in both studios (vault-unlocked)
- [x] Status breadcrumb + Gemstone Pulse (CSS vars, button, cycle)
- [x] Wire Generate to API (prompt, 9:16, reference_images)
- [x] Import Image multi-slot (up to 14) → reference_images
- [x] Save flow to DB (semantic ID, metadata_tags, seed)
- [x] Session cache (last 10) + Recent UI
- [x] Asset Expansion seed+1; portal switch state
- [x] Update walkthrough.md
- [x] Archive recall modal: browse albums (profile/collection), inject chosen image into reference slot (Character + Asset Studio)

## Studio UX refinement & polish (Mar 15, 2026) — IN PROGRESS / MOSTLY DONE

- [x] Prompt: subject-only prefix + `isVaultOverride` + context (character/asset) in `geminiImageApi.ts`
- [x] Stores: `refinementPromptOverride`, `previousLiveImageUrl`/`Seed`, `lastUsedPrompt`, `promptSnippets`, `galleryDensity`, `clearAllReferenceSlots`
- [x] Character + Asset: split Reference vs Tags panels; remove top bulk upload; Clear all / Paste first empty
- [x] 3-tab Live Prompt (Auto / Edit / Refine), pin-help `?`, refinement flow + suggest chips, NEW disabled
- [x] Shortcuts ⌘/Ctrl+Enter (Generate), Escape; Last prompt chip; snippets; Generate again; Undo last gen
- [x] Gallery density toggle; hover zoom refs + live image; loading “Working…”; empty states
- [ ] Image-describe API for Refine tab “NEW” (follow-up per plan §8)

## Character Archive thumbnail framing (Mar 16, 2026) — COMPLETE

- [x] DB columns + migration; localStorage `thumbnailFocus` on character generations
- [x] Gallery cards use focal + scale; **Framing** modal + save
- [x] Fallback Supabase select if thumbnail columns missing

## Future / Backlog

- Character Archive & Comics & Story Archive: read from Supabase when configured (fallback to localStorage).
- Optional: Supabase Storage bucket `arcs-generations` creation and RLS if not already present.
