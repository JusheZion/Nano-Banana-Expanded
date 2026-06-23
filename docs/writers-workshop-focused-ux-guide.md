# Writers Workshop Simple Workflow UX Guide

Date: 2026-06-09

This guide maps the Writers Workshop UX reset from the older tool-heavy layout to the Simple Workflow / Advanced Tools model.

## Simple Workflow vs Advanced Tools

| Mode | Use it when | What changes |
| --- | --- | --- |
| Simple Workflow | You want to draft, revise, lock, attach references, generate beats/dialogue, review, and export without extra tool noise. | Shows the compact Series / Issue / Page selector, workflow rail, Dashboard, Visual Canon, and small edit/protection bar. Hides the full ribbon and production navigator. |
| Advanced Tools | You need batch actions, raw JSON editors, diagnostics, helper internals, advanced exports, or the older full navigation model. | Restores the full ribbon, production map, advanced JSON disclosures, and dense tool surfaces. |

## Tool Location Map

| Tool or workflow | Old location | New Simple Workflow location |
| --- | --- | --- |
| Switch series | Right Library dock -> Series | Top selector strip -> Series |
| Switch issue | Right Library dock -> Issues | Top selector strip -> Issue |
| Switch page | Right Library dock or edit bar page selector | Top selector strip -> Page |
| Visual references | Outline -> Foundation Hub -> Visual references for this issue | Visual Canon workspace and Dashboard Visual Canon card |
| Character/location/prop reference counts | Not visible without opening the buried visual-reference block | Dashboard -> Visual Canon card |
| Attach a vault image to an issue | Outline -> Foundation Hub -> Visual references | Visual Canon -> Vault / Image / Role / Attach to issue |
| AI context preview for visual references | Visual references details disclosure | Advanced Tools mode -> Visual Canon -> AI context preview |
| Edit issue synopsis | Global edit bar / Outline field | Simple Workflow protection bar -> Edit issue, or Outline workspace |
| Edit selected page beats/dialogue | Full edit bar | Simple Workflow protection bar -> Edit page, or Beats / Dialogue workspace |
| Raw JSON editors | Visible in story workspaces | Advanced Tools mode disclosures |
| Full ribbon | Always visible | Advanced Tools mode only |
| Production map | Advanced side navigator | Advanced Tools mode only |
| Export issue | Export workspace | Export workspace remains in the Simple Workflow rail |

## Simple Workflow

1. Select the active Series, Issue, and Page from the top strip.
2. Use Dashboard to confirm current issue status, Visual Canon status, and lock status.
3. Open Visual Canon to attach Character Vault or Asset Vault references.
4. Continue through Foundation, Synopsis Helper, Visual Canon, Story Canon, Outline, Page Beats, Dialogue, Imageshop Prep, Story Review, Compare & Review, and Export.
5. Switch to Advanced Tools only when you need batch operations, raw JSON, diagnostics, or helper internals.

## Notes For QA

- Simple Workflow should be the default for new sessions unless local storage already contains `writerPortalViewMode=all-tools`.
- The visual-reference storage key remains `writer_issues.notes.writer_visual_references`.
- This pass does not change `writer-tools` prompt behavior; attached visual references should still feed page-beat generation through the existing bridge.
- The right dock remains available, but core selection should no longer depend on opening it.
- Attached Visual Canon references are issue snapshots; refreshing the Vault reloads available choices before new attachments and does not silently rewrite already-attached issue references.
