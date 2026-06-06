# Illustrator's Imageshop Playwright QA Report

Status date: 2026-06-05

## Scope

Signed-in end-to-end QA was performed with the requested persistent Playwright Interactive workflow against `http://127.0.0.1:5173/`.

Coverage included:

- deterministic desktop review at `1600x900` and `1280x720`;
- first-viewport hierarchy and fixed-shell fit;
- prompt preflight, mode switches, tabs, and malformed JSON handling;
- Writer issue/page/panel JSON import with canon and reference metadata;
- reference remove/undo behavior;
- one paid Gemini panel generation;
- live web-storage measurement and prompt-typing instrumentation;
- production-board and output-destination behavior;
- Character, Asset, and NPC Vault saves;
- Guided Comic Flow handoff and return;
- reload recovery and cleanup.

No runtime source code was changed during this QA pass.

## Executive Result

Imageshop's core controls, Writer import, generation, reload recovery, three Vault saves, and Guided image assignment all functioned. The run also reproduced the audit's critical persistence issue and found additional high-impact workflow and viewport defects.

The branch should remain in review. The highest-priority repairs are:

1. remove generated image payloads from synchronous web-storage persistence;
2. prevent unchecked or failed references from reaching paid generation;
3. link selected-panel generation to the matching page/panel production version;
4. make the first viewport generation-first and remove cockpit horizontal clipping;
5. restore Guided return to the originating panel workspace.

## Findings

### Critical: One generation is duplicated across localStorage and sessionStorage

The generated JPEG data URL contained `1,343,871` characters.

After one generation:

- `arcs-imageshop-production-v1`: `1,359,811` characters, one complete `data:image` payload;
- `arcs-imageshop-session-v1`: `1,346,623` characters, the same complete `data:image` payload.

The output is therefore synchronously persisted twice, consuming about 2.7 MB of browser storage before additional history or references.

### Critical: Prompt typing rewrites the full generated image on every keystroke

With the generated output present, typing the 22-character probe ` QA typing probe 12345` produced:

- 22 `localStorage.setItem` calls;
- one write per character;
- each write serialized approximately 1.36 million characters;
- observed typing time of 1.43 seconds with a 20 ms input delay.

This confirms the audited responsiveness and quota risk through live instrumentation.

### High: An unreachable reference passes preflight and does not stop paid generation

The selected Writer panel contained:

`http://127.0.0.1:9/codex-imageshop-missing.png`

Preflight reported:

- `Ready to generate`;
- `0 ready / 1 unchecked / 0 failed URLs`;
- `Payload healthy`.

Generation then called Gemini. The reference request failed with `net::ERR_UNSAFE_PORT`, but Gemini still returned a successful image. The broken reference remained visible as a failed image slot.

Impact:

- users can pay for generation while believing the reference is active;
- identity/continuity references may be silently omitted;
- the failure is not attributed to the reference before the provider call;
- `Retry without failed refs` cannot act on a panel that is reported as successfully generated.

### High: Writer panel generation is detached from the production board panel

After generating Page 1 Panel 2:

- the Writer cockpit displayed `Page 1 Panel 2 - Generated`;
- the grouped production board displayed Panel 2 as `Draft`;
- the board said `No generated versions yet`;
- the generated version appeared under a separate generic `Imageshop item 3`;
- Writer map and Writer return actions remained disabled.

The generated image exists, but the page/panel version contract is not updated consistently.

### High: The Writer cockpit clips horizontally

At `1600x900`:

- the three-column cockpit grid had `760px` scroll width inside `666px` client width.

At `1280x720`:

- the same grid had `760px` scroll width inside `421px` client width;
- its parent Image Lab aside had `802px` scroll width inside `505px` client width.

The Context Inspector, reference controls, and prompt content are visibly cut off. No useful horizontal affordance is visible in the reviewed state.

### High: The live first viewport remains beat-first

At `1600x900`, the internal workspace measured `2,751px` scroll height inside an `807px` viewport.

The initial screen prioritizes:

- production libraries;
- empty Beat Timeline;
- empty Selected Frame Preview;
- empty Beat Detail.

Image Lab begins near the bottom-right, and its prompt/generation controls require internal scrolling.

At `1280x720`, the expanded `230px` navigation makes the layout worse:

- the active Imageshop navigation label is clipped;
- the empty Beat Timeline becomes a narrow text column;
- the generation cockpit remains below the initial view.

### Medium: Guided return loses the originating workspace

`Send back to Guided Comic Flow` was enabled and accepted the generated session result.

Observed result:

- the image was assigned to Page 1 Panel 1;
- reopening the temporary issue confirmed the assigned image;
- navigation returned to the Comic Library instead of Page 1 / Panel 1;
- the expected focused `Ready` state was not restored automatically.

The assignment survives, but the continuation path is disruptive and contradicts the control's return wording.

## Positive Controls

- Authenticated Imageshop opened without page exceptions.
- Empty prompt and `Blue hero.` were blocked by preflight.
- A detailed visual prompt enabled generation.
- Video Beats / Comic Pages mode switching worked.
- Compose / Page setup / Batch JSON / Review tabs completed a reversible cycle with correct `aria-pressed` state.
- Malformed pasted JSON produced a useful parser error.
- Writer JSON preserved issue, page, panel, canon, dialogue, SFX, and reference labels.
- Reference remove and undo controls were actionable.
- The single Gemini generation completed and displayed a readable panel image.
- Reload restored the Writer queue, generated panel status, and session result.
- Character Vault save succeeded as `Codex Imageshop QA Character 20260605`.
- Asset Vault save succeeded as `Codex Imageshop QA Assets 20260605`.
- NPC Vault save succeeded as `Codex Imageshop QA NPC 20260605`.
- Guided Comic Flow retained the assigned image.
- No uncaught page errors were captured.

## Cleanup

Cleanup completed:

- deleted the temporary Guided series and issue;
- deleted the exact QA Character and Asset rows from Supabase;
- removed both uploaded QA storage objects;
- removed timestamped Character, Asset, NPC, recent-generation, session, imported-batch, queue, and production-item cache entries;
- verified the Character and Asset queries returned zero remaining QA rows;
- reloaded Imageshop and confirmed no `Codex Imageshop QA` data remained.

## Evidence

- [Initial Imageshop at 1600x900](assets/2026-06-05-imageshop-playwright-qa/01-initial-1600x900.png)
- [Compose surface placement](assets/2026-06-05-imageshop-playwright-qa/03-compose-controls-1600x900.png)
- [Page setup](assets/2026-06-05-imageshop-playwright-qa/04-page-setup-1600x900.png)
- [Writer cockpit clipping](assets/2026-06-05-imageshop-playwright-qa/05-writer-cockpit.png)
- [Generated output and broken reference slot](assets/2026-06-05-imageshop-playwright-qa/06-generated-output.png)
- [Initial Imageshop at 1280x720](assets/2026-06-05-imageshop-playwright-qa/07-initial-1280x720.png)
- [Writer cockpit at 1280x720](assets/2026-06-05-imageshop-playwright-qa/08-cockpit-1280x720.png)

## Intentional Limits

- Only one paid Gemini generation was permitted and used.
- A naturally failed retry was not available because the unreachable reference did not stop provider execution.
- Full multi-panel batch generation was not run.
- No runtime fix was implemented in this findings-only pass.
