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

## Future / Backlog

- Character Archive & Comics & Story Archive: read from Supabase when configured (fallback to localStorage).
- Optional: Supabase Storage bucket `arcs-generations` creation and RLS if not already present.
