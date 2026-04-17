# Warning Remediation Notes

## Verification summary

- Start-of-pass baseline: `79` warnings, `0` errors
- End-of-pass baseline: `61` warnings, `0` errors
- Verification command: `npm run lint`
- Scope of safe fixes completed in this pass:
  - all touched Image Workshop UI hook warnings
  - two stale `eslint-disable` directives
  - several low-risk `prefer-const` cleanups

## Fixed warnings

- `src/portals/AssetsStudio.tsx:174` | `react-hooks/exhaustive-deps` | `fixed` | Added `STATUS_BREADCRUMBS.length` to the pending-status interval effect dependency list.
- `src/portals/CharacterStudio.tsx:317` | `react-hooks/exhaustive-deps` | `fixed` | Added `STATUS_BREADCRUMBS.length` to the pending-status interval effect dependency list.
- `src/portals/CharacterStudio.tsx:791` | `react-hooks/exhaustive-deps` | `fixed` | Memoized `getMatchedExistingProfile` and included it in the keyboard handler effect dependencies.
- `src/portals/storyline/StorylineStudio.tsx:315` | `react-hooks/exhaustive-deps` | `fixed` | Removed the unused `imageWorkshopDraft` callback dependency.
- `src/portals/writer/WriterPortal.tsx:275` | `react-hooks/exhaustive-deps` | `fixed` | Stabilized `pushHistory` with `useCallback` and updated dependent callbacks.
- `src/portals/writer/WriterPortal.tsx:1373` | `react-hooks/exhaustive-deps` | `fixed` | Updated the outline edit-draft effect to depend on `latestOutline`.
- `src/portals/writer/WriterPortal.tsx:1385` | `react-hooks/exhaustive-deps` | `fixed` | Updated the selected-page edit-draft effect to depend on `selectedPage`.
- `src/portals/writer/WriterPortal.tsx:1393` | `react-hooks/exhaustive-deps` | `fixed` | Updated the shot-plan edit-draft effect to depend on `latestShotPlan`.
- `src/shared/context/ProjectContext.tsx:29` | `Unused eslint-disable directive` | `fixed` | Removed the stale `react-refresh/only-export-components` suppression.
- `src/shared/context/ThemeContext.tsx:34` | `Unused eslint-disable directive` | `fixed` | Removed the stale `react-refresh/only-export-components` suppression.
- `src/shared/utils/buildCharacterStudioPromptForApi.ts:104` | `prefer-const` | `fixed` | Changed `workingRefs` binding to `const`.
- `src/modes/comic/components/BalloonNode.tsx:395` | `prefer-const` | `fixed` | Changed `baseProps` binding to `const`.
- `src/modes/comic/components/ComicPanel.tsx:368` | `prefer-const` | `fixed` | Changed `nw` binding to `const`.
- `src/modes/comic/components/ComicPanel.tsx:369` | `prefer-const` | `fixed` | Changed `nh` binding to `const`.
- `src/stores/comicStore.ts:1215` | `prefer-const` | `fixed` | Changed `top_x` binding to `const`.
- `src/stores/comicStore.ts:1216` | `prefer-const` | `fixed` | Changed `bot_x` binding to `const`.
- `src/stores/comicStore.ts:1227` | `prefer-const` | `fixed` | Changed `left_y` binding to `const`.
- `src/stores/comicStore.ts:1228` | `prefer-const` | `fixed` | Changed `right_y` binding to `const`.

## Intentionally retained warnings

### `src/modes/comic/components/BalloonNode.tsx`

- `:20` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Legacy comic balloon props still cross untyped Konva/editor data. Safe narrowing needs a dedicated comic type pass.
- `:29` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; shared balloon render contracts are not yet typed end-to-end.
- `:30` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; changing in isolation risks breaking shape serialization or event payload assumptions.
- `:31` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; requires coordinated type extraction for balloon geometry helpers.
- `:32` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; not safe to infer ad hoc during a warning-only pass.
- `:33` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; this file participates in a broader legacy comic rendering path.
- `:34` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; follow-up should define explicit balloon prop interfaces.
- `:46` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; runtime payload shape is broader than can be safely narrowed here.
- `:177` | `react-hooks/exhaustive-deps` | `intentionally retained` | The memo depends on geometry/render inputs; removing the flagged deps needs a behavior review of text sizing and redraw cadence in comic balloons.
- `:185` | `react-hooks/exhaustive-deps` | `intentionally retained` | `localTailTip` is recreated for several geometry memos; fixing safely requires restructuring the tail-geometry pipeline, not a mechanical patch.
- `:185` | `react-hooks/exhaustive-deps` | `intentionally retained` | Same warning instance for a separate memo use; retain until the shared `localTailTip` object is refactored.
- `:185` | `react-hooks/exhaustive-deps` | `intentionally retained` | Same rationale; one fix should cover all downstream memo sites together.
- `:185` | `react-hooks/exhaustive-deps` | `intentionally retained` | Same rationale; grouped into a future comic memoization cleanup.
- `:395` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | The render-prop bag is still intentionally broad because Konva prop shape differs by pass and node kind.

### `src/modes/comic/components/ColorWheelPicker.tsx`

- `:118` | `react-hooks/exhaustive-deps` | `intentionally retained` | The missing `cy` dependency affects pointer math. This should be fixed during a dedicated UI interaction check for the color wheel so drag behavior can be retested.

### `src/modes/comic/components/ComicPanel.tsx`

- `:17` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Legacy comic panel props span multiple node shapes and editor payloads; safe typing needs a shared interface pass.
- `:19` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; avoid piecemeal narrowing in transform-heavy panel code.
- `:28` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; these event/render structures are not locally owned.
- `:29` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; changing in isolation risks narrowing valid panel variants.
- `:30` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; defer to the planned comic type cleanup.
- `:40` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; this code path still accepts multiple untyped editor node forms.
- `:222` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; geometry and transform payloads are loosely typed today.
- `:851` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; downstream Konva integration remains untyped.
- `:852` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; safe fix requires shared type definitions.
- `:854` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; not appropriate for a mechanical lint-only pass.
- `:865` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; panel serialization/deserialization types are still broad.
- `:866` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; tighten only after editor payload contracts are formalized.
- `:902` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; transform handle payloads are still dynamic.
- `:903` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; defer until comic typing work is scoped.
- `:915` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; this warning is in the same legacy transform cluster.
- `:921` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; grouped into the same follow-up type migration.

### `src/modes/comic/components/FloatingAsset.tsx`

- `:14` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Floating asset payloads still bridge untyped comic overlay objects and Konva nodes.
- `:24` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; needs shared overlay object types before narrowing.
- `:25` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; defer to the comic type-hardening pass.

### `src/modes/comic/components/LayerTree.tsx`

- `:243` | `react-hooks/exhaustive-deps` | `intentionally retained` | `resolveDetails` participates in tree derivation and selection labeling; dependency changes should be paired with a manual Layer Tree regression check.

### `src/modes/comic/components/MenuBar.tsx`

- `:114` | `@typescript-eslint/no-unused-vars` | `intentionally retained` | `_icon` is a deliberately ignored positional argument in an existing callback signature. Keep until the signature itself is simplified.

### `src/modes/comic/components/ObjectToolbar.tsx`

- `:347` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Toolbar action payload remains loosely typed across multiple object kinds; safe narrowing requires shared comic object action types.

### `src/modes/comic/components/TextToolbar.tsx`

- `:247` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Text tool payloads still accept heterogeneous editor node shapes; safe fix deferred to a broader comic editor typing pass.

### `src/modes/comic/engine/ComicCanvas.tsx`

- `:98` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Core canvas state/actions still accept untyped payloads from multiple comic tools.
- `:100` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; central engine types should be introduced holistically.
- `:181` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; event payload narrowing here would ripple across the tool system.
- `:193` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; not safe to infer locally.
- `:231` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; this is engine-level shared state.
- `:245` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; defer to engine typing follow-up.
- `:295` | `@typescript-eslint/no-unused-vars` | `intentionally retained` | `id` is currently destructured for parity with other payload readers; remove only when the surrounding callback signature is narrowed.
- `:295` | `@typescript-eslint/no-unused-vars` | `intentionally retained` | `type` has the same intentional-signature rationale as `id`.
- `:562` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; canvas interaction payload remains untyped.
- `:597` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; engine typing work should cover this cluster together.

### `src/modes/comic/utils/circularPanelPaths.ts`

- `:94` | `@typescript-eslint/no-unused-vars` | `intentionally retained` | `_bandDepth` is intentionally unused in the current path variant but kept for API symmetry between helper signatures.
- `:98` | `@typescript-eslint/no-unused-vars` | `intentionally retained` | Same rationale; keep until helper signatures are consolidated.

### `src/shared/api/geminiImageApi.ts`

- `:374` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Gemini API response parsing still traverses partially known response shapes; safe narrowing needs a validated response schema.
- `:374` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; nested response fields are not yet modeled explicitly.
- `:375` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; defer until response contract work is scoped.
- `:380` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; broad fallback parsing is intentional for robustness today.

### `src/stores/comicStore.ts`

- `:280` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Comic store actions still receive heterogeneous panel/object payloads; safe typing requires store-wide model cleanup.
- `:281` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; not safe to narrow in one reducer branch only.
- `:281` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; payload contracts are shared across comic features.
- `:282` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; defer to coordinated comic schema work.
- `:671` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; store update helper still depends on loosely typed objects.

### `supabase/functions/writer-tools/index.ts`

- `:14` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Edge function request/response helpers still accept flexible AI payload shapes. Safe narrowing should happen alongside schema extraction in the function shared layer.
- `:566` | `@typescript-eslint/no-explicit-any` | `intentionally retained` | Same rationale; tool result parsing remains intentionally broad until response contracts are formalized.

## Follow-up recommendations

- Prioritize a dedicated `comic typing + hook stability` pass for the `src/modes/comic/` tree; that area now holds most remaining warnings.
- Treat `src/shared/api/geminiImageApi.ts` and `supabase/functions/writer-tools/index.ts` as separate schema-hardening work, since both need explicit response typing rather than lint-only edits.
