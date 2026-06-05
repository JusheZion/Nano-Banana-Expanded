# Illustrator's Imageshop React Integrity Audit

Status date: 2026-06-05

## Scope

This audit reviewed the current working tree on `codex/imageshop-comic-production-portal` using the Vercel React best-practices categories for async waterfalls, bundle size, client persistence, rerender scope, rendering cost, and JavaScript performance.

The review covered:

- `src/portals/storyline/GenericImageLabPanel.tsx`
- `src/portals/storyline/StorylineStudio.tsx`
- Imageshop queue, canon, reference, preflight, batch, and production-board helpers
- Imageshop Zustand persistence and session recovery
- `src/shared/api/geminiImageApi.ts`
- focused and full automated tests
- a signed-in browser inspection at `http://127.0.0.1:5173/`

No paid Gemini generation or destructive Vault/Writer write was performed.

## Executive Assessment

Imageshop is feature-rich and its automated suite is green, but it is not yet production-safe for long comic-generation sessions. The highest risks are storage exhaustion from duplicated base64 images, prompt/preflight drift, reference-lane semantics that do not reach the provider correctly, and sequential reference preparation.

The implementation plan currently says the eight-pass scope is complete with no outstanding issues. This audit does not support that conclusion. The current branch should remain in review until the critical and high findings below are resolved.

## Findings

### Critical: Generated images are persisted twice and can exhaust browser storage

- `imageshopSessionStore` keeps up to eight complete image URLs in `sessionStorage`.
- `imageshopProductionStore` persists every production version, including complete `data:` image URLs, to `localStorage`.
- A successful generation writes the same image to both stores before updating the visible preview.
- The production store has no `partialize`, image sanitization, quota fallback, or persistence error recovery.
- Prompt edits also update the persisted production store on every keystroke, forcing serialization of all stored production versions.

Impact:

- successful provider results can be lost from the visible workflow when storage throws;
- prompt typing can degrade as production history grows;
- local/session storage can become unusable after only a few full-resolution generations.

Relevant code:

- `src/stores/imageshopSessionStore.ts:33`
- `src/stores/imageshopSessionStore.ts:52`
- `src/stores/imageshopProductionStore.ts:353`
- `src/stores/imageshopProductionStore.ts:559`
- `src/portals/storyline/GenericImageLabPanel.tsx:1012`
- `src/portals/storyline/GenericImageLabPanel.tsx:2543`

### High: Prompt preflight does not match the prompt sent for panel and batch generation

- Batch preflight composes art style, continuity, avoid-list, and page configuration instructions.
- The provider call sends `item.prompt`, not that composed prompt.
- Selected-panel generation builds provenance from the panel prompt and passes it as an override.
- The generic generation callback skips its own preflight guard whenever an override is present.

Impact:

- the UI can report that a composed request is ready while the model receives a materially different request;
- avoid-list, selected style, continuity settings, and page configuration can be omitted;
- provenance can describe instructions that were not actually sent.

Relevant code:

- `src/portals/storyline/GenericImageLabPanel.tsx:985`
- `src/portals/storyline/GenericImageLabPanel.tsx:1914`
- `src/portals/storyline/GenericImageLabPanel.tsx:1944`
- `src/portals/storyline/GenericImageLabPanel.tsx:2184`

### High: Reference lanes are visual labels, not provider-enforced semantics

- The UI models Character DNA, Wardrobe, Environment, Props, Style, Lighting, and Canon lanes.
- The Gemini bridge interprets references only by array index and one global `character` or `asset` context.
- Queue references are passed in chip insertion order without a lane-to-slot compiler.
- A mixed character/environment set can therefore place an environment image in a character identity slot.

Impact:

- character identity, wardrobe, environment, and style consistency can drift even though the UI displays correct lane labels;
- reference provenance does not prove the provider received the same semantic arrangement.

Relevant code:

- `src/portals/storyline/imageshopReferenceContext.ts:197`
- `src/portals/storyline/GenericImageLabPanel.tsx:2061`
- `src/portals/storyline/GenericImageLabPanel.tsx:2165`
- `src/shared/api/geminiImageApi.ts:402`

### High: Reference preparation is a serial async waterfall

`generateImage` awaits reference download, signed-URL refresh, blob conversion, and base64 encoding one reference at a time. With up to 14 references and a 90-second reference timeout, one slow reference blocks all later references and can make preparation take several minutes before the model request begins.

Relevant code:

- `src/shared/api/geminiImageApi.ts:408`
- `src/shared/api/geminiImageApi.ts:423`

### High: Retry without failed references cannot identify the failed reference

- Reference chips are marked `ready` when they merely contain a non-empty URL.
- Provider preparation returns one aggregate reference-fetch error without identifying or updating the failed chip.
- The retry strategy only removes references already marked `failed`.

Impact:

`Retry without failed refs` is normally a no-op for real fetch failures.

Relevant code:

- `src/portals/storyline/imageshopReferenceContext.ts:222`
- `src/portals/storyline/imageshopBatchGeneration.ts:81`
- `src/shared/api/geminiImageApi.ts:426`

### Medium: Batch status reports historical attempts as current failures

Retry runs preserve all previous attempts, and counters count attempts rather than the latest outcome per panel. A successful retry can therefore finish with every panel generated while still reporting a failed count and leaving retry controls enabled. The existing component test currently asserts this inconsistent result.

Relevant code:

- `src/portals/storyline/imageshopBatchGeneration.ts:100`
- `src/portals/storyline/GenericImageLabPanel.tsx:2107`
- `src/portals/storyline/components/ImageshopBatchControls.tsx:31`
- `src/portals/storyline/__tests__/GenericImageLabPanel.productionStudio.test.tsx:451`

### Medium: Render and persistence scope is too broad

- `StorylineStudio` subscribes to the entire storyline store.
- `GenericImageLabPanel` remains a 3,400-line state owner with more than 40 local/store subscriptions.
- Prompt typing updates both local React state and the persisted production store.
- Extracted children are not isolated from parent rerenders.

This conflicts with the React guidance to subscribe to the narrowest derived state, split independent hooks, and avoid broad rerenders for input-critical surfaces.

Relevant code:

- `src/portals/storyline/StorylineStudio.tsx:133`
- `src/portals/storyline/GenericImageLabPanel.tsx:2543`

### Medium: The live first viewport remains beat-first

The live signed-in portal still shows production libraries, an empty Beat Timeline, Selected Frame Preview, and Beat Detail before Image Lab. This contradicts the active plan's definition of done that Imageshop opens with a generation-first cockpit.

Relevant code:

- `src/portals/storyline/StorylineStudio.tsx:1443`

### Low: Uploaded and pasted reference object URLs are not revoked

Uploaded and clipboard image references create `blob:` URLs, but clear, replace, removal, and component unmount do not revoke them. Long sessions can retain unnecessary image memory.

Relevant code:

- `src/portals/storyline/GenericImageLabPanel.tsx:818`
- `src/portals/storyline/GenericImageLabPanel.tsx:843`

## Positive Controls

- Portal-level lazy loading is present.
- The production `PhotoLab` chunk is 194.54 kB minified / 48.31 kB gzip, below Vite's 500 kB warning threshold.
- Full tests passed: 62 files / 363 tests.
- Focused Imageshop tests passed: 8 files / 60 tests.
- `npm run build` passed.
- `npm run lint` passed with 0 errors and 67 repository warnings.
- `git diff --check` passed.
- Signed-in browser inspection showed no console warnings or errors.

## Recommended Repair Order

1. Remove full image payloads from synchronous Zustand web-storage persistence and add quota-safe recovery.
2. Create one composed prompt contract used by preflight, provider calls, provenance, and tests.
3. Add a lane-to-provider-slot compiler and prepare independent references in parallel.
4. Attribute reference failures to reference ids so retry strategies change the payload.
5. Derive batch counters from the latest attempt per panel.
6. Narrow store subscriptions and split input-critical state from the large parent surface.
7. Move the generation cockpit ahead of legacy beat surfaces.
8. Revoke local object URLs on replacement, removal, clear, and unmount.

## Required Regression Tests

- storage quota failure after a successful provider response;
- large production history plus prompt typing;
- exact provider prompt equals the displayed/preflight prompt;
- mixed character/environment/style lane-to-slot mapping;
- failed reference id is recorded and excluded on retry;
- successful retry clears current failed count;
- object URL cleanup on clear, replace, and unmount.
