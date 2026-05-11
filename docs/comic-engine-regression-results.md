# Advanced Comics Studio Regression Results

Date: 2026-05-10

## Summary

Status: Partial pass, not clean enough to remove legacy code.

Focused store/import serialization tests passed, and the in-app browser confirmed that a Guided Flow page can be handed to Advanced Studio with its 3-panel layout and panel images visible. The full manual Advanced Studio checklist is not yet clean because coordinate-heavy canvas editing actions could not be reliably completed through the available browser automation surface in this pass.

Do not remove legacy compatibility code yet.

## Automated Regression Coverage

Command run:

```bash
npm run test -- src/stores/__tests__/comicStoreSerialization.test.ts src/stores/__tests__/guidedComicLayoutImport.test.ts src/modes/comic/types/__tests__/comicObjects.test.ts
```

Result: Pass.

Coverage confirmed:

- `comicStore` project export preserves panel geometry, panel image fields, balloon text, balloon tail points, balloon overrides, and layer order.
- Legacy saved comic project payloads load without dropping panel geometry, panel image URLs, balloons, balloon tail geometry, or layer order.
- Existing panel images remain attached when a panel shape and pixel geometry are updated through `updatePanel`.
- Guided Flow import compatibility remains covered for edited 3-panel and 4-panel layouts, image preservation, panel count preservation, panel order, and legacy template-only handoff.
- Canonical comic object compatibility tests continue to cover legacy object normalization and serialized page compatibility.

Additional verification:

- `npm run build` - Pass. Vite emitted the existing large chunk-size warning for `ComicPortal`.
- `npm run lint` - Pass with 0 errors and 67 existing warnings in pre-existing areas.

## Manual Browser Regression Notes

Browser access status:

- In-app Browser: working. It opened `http://127.0.0.1:5173/`, loaded ARCS Expanded, opened Comic Creator, and completed a Guided Flow to Advanced Studio handoff.
- External Google Chrome: partially accessible through Computer Use for inspection, but not reliable enough for this pass. Chrome state and screenshots were visible, but tab switching and navigation did not consistently take effect. Earlier Browser-runtime attempts to create/open a Chrome tab timed out. Use the in-app Browser path for this repo until Chrome control is stable.

Manual checks performed:

| Area | Result | Notes |
| --- | --- | --- |
| Open app | Pass | ARCS Expanded loaded in the in-app browser. |
| Open Comic Creator | Pass | Guided Comic Flow opened at the Layout step from the existing persisted draft. |
| Import from Guided Flow | Pass | Page 1 handoff opened Advanced Studio without a confirm blocker. |
| Preserve panel count on import | Pass | Advanced Studio sidebar showed `Page 1` with `3 Panels`. |
| Preserve panel images on import | Pass | Advanced Studio canvas displayed the imported panel images. |
| Preserve panel order on import | Pass, visual/partial | The visible page opened with the expected 3-panel sequence: two upper panels and one lower panel. Exact object IDs/order are covered by focused tests. |
| Layer tree availability | Partial | Advanced Studio exposed the `Layers` dock tab, but layer selection/order interaction was not fully exercised manually. |
| Create a page | Not completed | Not manually exercised in Advanced Studio during this pass. |
| Add panel images from Advanced Studio | Partial | Imported panel images were confirmed visually. The Advanced Studio `Insert Image` control was not separately exercised. |
| Resize panels | Not completed manually | Canvas drag/resize actions require coordinate input that was not reliable through the current browser automation surface. Store-level geometry/image preservation is covered by tests. |
| Move panels | Not completed manually | Same automation limitation as resize. |
| Change panel shapes | Not completed manually | Store-level image preservation across shape change is covered by tests. |
| Confirm images after shape changes | Automated pass, manual not completed | `updatePanel` shape/geometry updates preserve image fields in the focused regression test. |
| Create balloons | Not completed manually | Balloon serialization is covered by focused tests. |
| Edit balloon text | Not completed manually | Balloon text serialization is covered by focused tests. |
| Move balloon tails/pointers | Not completed manually | Tail point serialization is covered by focused tests. |
| Resize balloons | Not completed manually | Balloon geometry serialization is covered by focused tests where currently supported. |
| Save/reload | Automated pass | Project export/load behavior is covered by focused tests. File picker/native download flows were not manually exercised. |
| Export | Not completed manually | Export UI was visible from Guided Flow, but Advanced Studio export was not exercised in this pass. |

## Known Issues And Gaps

- Full manual canvas manipulation remains incomplete because the available in-app browser automation does not expose reliable low-level drag/resize control for the Konva canvas, and Computer Use cannot control the Codex app window.
- External Chrome access improved enough to inspect Chrome, but it did not reliably operate the local app target during this pass.
- Legacy compatibility code should stay in place until a human or a more capable browser-control path completes the remaining manual checks: page creation, panel drag/resize, shape switching, balloon creation/editing, tail dragging, layer reorder, save/reload, and export.

## Follow-Up Checklist Before Modernization Is Complete

- Manually test Advanced Studio page creation.
- Manually add or replace a panel image from the Advanced Studio UI.
- Manually drag and resize panels, then verify images remain attached.
- Manually change imported panel shapes and verify images remain attached.
- Manually create balloons, edit balloon text, resize balloons, and drag tails/pointers.
- Manually verify layer tree selection and ordering.
- Manually test save/reload and export flows where supported.
- Repeat Guided Flow import, then continue editing the imported page in Advanced Studio.
