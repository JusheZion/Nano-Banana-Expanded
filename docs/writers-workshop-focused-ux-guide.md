# Writers Workshop Simple Workflow UX Guide

Date: 2026-06-09

Updated: 2026-07-16

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
| Rename or move a series/issue to Trash | Advanced Library icons or indirect Story Context editing | Top selector strip -> Series/Issue `More actions`, or the matching row context menu |
| Restore a series/issue | Not available | Top selector strip -> `Trash` -> Restore; immediate Undo is also offered after moving a record to Trash |
| Set issue production defaults | Advanced Foundation Hub | Foundation -> medium, scope, panel density, preferred export, art style, strict references, and video settings -> Save issue defaults |
| Visual references | Outline -> Foundation Hub -> Visual references for this issue | Visual Canon workspace and Dashboard Visual Canon card |
| Character/location/prop reference counts | Not visible without opening the buried visual-reference block | Dashboard -> Visual Canon card |
| Attach a vault image to an issue | Outline -> Foundation Hub -> Visual references | Visual Canon -> Vault / Image / Role / Attach to issue |
| AI context preview for visual references | Visual references details disclosure | Advanced Tools mode -> Visual Canon -> AI context preview |
| Edit issue synopsis | Global edit bar / Outline field | Simple Workflow protection bar -> Edit issue, or Outline workspace |
| Edit selected page beats/dialogue | Full edit bar | Simple Workflow protection bar -> Edit page, or Beats / Dialogue workspace |
| Create Story Canon manually | Lore advanced tools | Story Canon -> Add lore card; saved cards expose Edit and Delete |
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

## Record Management And Recovery

- Use the `More actions` menu beside the active Series or Issue to Rename or Move to Trash. The same actions are available from the target row's context menu, including Context Menu and Shift+F10 keyboard access.
- Move to Trash is recoverable. It hides the record from active selectors while preserving its saved children. Use the immediate Undo action for a quick reversal, or open `Trash` later and choose Restore.
- Restoring a series reveals its active issues; issues independently moved to Trash stay in Trash until restored separately.
- Restoring an issue keeps its original issue number and saved pages, outline, beats, dialogue, lore, and review work.
- Writers' Workshop intentionally does not expose permanent series/issue deletion. Permanent cleanup remains a manual operator/database action.

## Stage Readiness And Feedback

- A disabled stage action is paired with a local explanation of the missing series, issue, page, outline, beats, or export requirement.
- Foundation is complete only after issue defaults are saved. Compare & Review is complete only after `Mark review complete`. Story Review requires both pacing and canon review results.
- Beats and Dialogue expose direct editing whenever a page is selected, including when that page has no generated content yet.
- Visual Canon with an empty vault explains that references must first be created in Character Studio or Asset Studio, and provides Refresh after returning.
- Progress, success, informational, and actionable failure messages appear in the workspace; users do not need to open the Activity panel to learn whether an action completed.
- Preferred Export follows the Foundation output-format setting and explains any format-specific prerequisites before download.

## Notes For QA

- Simple Workflow should be the default for new sessions unless local storage already contains `writerPortalViewMode=all-tools`.
- The visual-reference storage key remains `writer_issues.notes.writer_visual_references`.
- This pass does not change `writer-tools` prompt behavior; attached visual references should still feed page-beat generation through the existing bridge.
- The right dock remains available, but core selection should no longer depend on opening it.
- Attached Visual Canon references are issue snapshots; refreshing the Vault reloads available choices before new attachments and does not silently rewrite already-attached issue references.
- Signed-in functional QA on 2026-07-16 completed a 22-page disposable issue through Foundation, Story Canon, Outline, Pages, Beats, Dialogue, Imageshop Prep, Story Review, Compare & Review, and five export formats. The demo account had no vault images, so Visual Canon attachment still relies on automated coverage until a disposable vault image is available for an end-to-end browser check.
- Functional QA records should be moved to Recoverable Trash after validation. Do not permanently delete them through an ad hoc database operation during ordinary UI QA.
