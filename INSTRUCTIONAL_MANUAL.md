# ARCS Instructional Manual

Last updated: 2026-04-23

This is the **end-to-end user manual** for the app, organized by **portal**. It explains:

- how to navigate
- how to establish a workflow in each portal
- how portals work together to produce **comics**, **images**, and **video plans/outputs**

If you want quick, browseable in-app docs, use **Docs → Portals Wiki**. This document is the “playbook” version.

---

## 0) Overview (what this app is)

### The portals (one-liners)

- **Writers’ Workshop**: Write and structure your story (series → issues → pages), generate **outline**, **panel beats**, and **dialogue**, and export story packs.
- **Illustrator’s Imageshop**: Turn story beats into images using references from the vault and studios; manage production references and iterate visually.
- **Character Studio**: Build consistent, reusable character images (identity “DNA”), then save them to the Character Vault.
- **Asset Studio**: Build consistent, reusable environments/props/sets, then save them to the Asset Vault.
- **Image Vault**: Browse and reuse saved generations across Characters, Assets, and NPC Vault; download/curate as needed.
- **Comics portal**: Assemble comic pages (panels + overlays), then export (PDF/images), if enabled in your build.
- **Docs (Portals Wiki)**: In-app reference documentation.

### Golden-path workflows (pick one)

#### A) Comics workflow (script → comic pages)

1. **Writers’ Workshop**: generate an outline for an issue.
2. **Writers’ Workshop**: generate panel beats per page; generate dialogue per page.
3. **Illustrator’s Imageshop**: prep visual references (characters/assets/NPC) and generate key panels/B-roll.
4. **Character Studio / Asset Studio** (as needed): refine character/setting consistency and save to the vault.
5. **Image Vault**: reuse saved assets/characters as references for new pages.
6. **Comics portal**: place images into panels (and overlays, if used) and export.

#### B) Single illustration workflow (one image, high quality)

1. **Illustrator’s Imageshop**: Process an image prompt with references.
2. **Character Studio / Asset Studio** (optional): refine identity or setting for long-term reuse.
3. **Save to vault**: save the result to Character / Asset / NPC Vault.
4. **Image Vault**: download, organize, or reuse later.

#### C) Video workflow (planning + image generation pass)

1. **Writers’ Workshop**: create outline + pages.
2. **Writers’ Workshop → Video**: generate a **shot plan** and export it (JSON/CSV).
3. **Illustrator’s Imageshop**: generate keyframes / establishing shots using the shot plan as guidance.
4. **Studios + Vault**: lock in recurring characters/locations; reuse them to keep shots consistent.
5. **Export**: use shot plan + images as inputs for your video pipeline (current app capabilities may be “planning + exports” rather than full video render).

---

## 1) Navigation & mental model

### Where to start (ARC Hub)

- Use the **ARC Hub** (home/landing) to open a portal.
- Switch portals anytime; the app is designed around **handoffs**:
  - Writers’ Workshop hands off story context to Imageshop.
  - Imageshop hands off “needs precision” work to Character/Asset Studio.
  - Studios save reusable work to Image Vault, which feeds back into Imageshop and future story generation.

### Local vs Supabase (what changes)

You may see features behave differently depending on whether Supabase is configured and you’re signed in:

- **Signed in + Supabase configured**: your vaults and writer data persist in the database; images may be stored in private storage and displayed via signed URLs.
- **Not signed in / Supabase not configured**: some features fall back to local persistence for development/offline use (for example, NPC Vault and local archives).

If an AI tool says you need to sign in, open the account control in the shell and authenticate.

---

## 2) Writers’ Workshop

### Purpose

Build the narrative backbone that later becomes images, comics pages, and shot plans:

- **Series**: your project container
- **Issues**: chapters/episodes inside a series
- **Pages**: the page-by-page structure for an issue

### Where to click (high level)

- Open **Writers’ Workshop**
- Use the **Library** (Series → Issues → Pages) to select what you’re working on.
- Use workspace tabs like **Outline**, **Beats**, **Dialogue**, **Arc**, **Video**, and **Scripts & exports**.

### Recommended workflow

#### Step 1: Create/choose Series and Issue

- In **Library → Series**, create or pick a series.
- In **Library → Issues**, create or pick an issue.

#### Step 2: Outline (issue-level)

- Go to **Outline**.
- Set a target page count (if you have one).
- Generate an outline.
- Review and iterate until the outline has enough structure to support page beats.

#### Step 3: Sync pages (optional but recommended)

- If your outline targets \(N\) pages, use **Sync pages** so pages 1..N exist.

#### Step 4: Panel beats (page-level)

- Go to **Beats**.
- Select pages (or “Generate all beats” if supported) and generate beats.
- Use “skip existing” when you’re filling gaps; disable it when you’re deliberately regenerating.

#### Step 5: Dialogue (page-level)

- Go to **Dialogue**.
- Generate dialogue for selected pages.
- Use batch dialogue when you want to fill many pages at once.

#### Step 6: Arc tools (cross-check)

- Go to **Arc**.
- Run pacing/canon checks as needed.
- Apply recommended changes by editing outline/beats/dialogue and re-running checks.

#### Step 7: Exports

- Export outline/beats/dialogue bundles for your downstream workflow.
- If you’re making comics: export the issue pack for reference while generating images.

### Outputs from this portal

- Outline (JSON + text exports, depending on build)
- Page beats (JSON + bundles)
- Dialogue scripts (text + fountain bundles, depending on build)
- Shot plans (Video tab)

### Tips for better downstream images

- Keep a consistent naming scheme for characters and key locations in beats/dialogue.
- Write beats with “camera intent” (POV, angle, subject focus) so Imageshop prompts are more stable.
- If a page’s beats are too vague, images will drift—tighten beats first.

---

## 3) Illustrator’s Imageshop

### Purpose

Generate images for beats/pages using:

- **Production references** (characters/assets/NPC refs)
- prompts and “visual notes”
- consistent aspect ratios (portrait/square/cinematic)

This portal is the bridge between writing and consistent visual output.

### Key parts of the UI (mental model)

- **Production lanes**: reusable references you’ll link into individual beats
  - **Cast** (Character Vault)
  - **Assets** (Asset Vault)
  - **NPC Vault** (supporting/reference images)
- **Visual Prep**: a queue that helps you route a Writer handoff into:
  - matched from vault
  - quick refs (good enough to generate immediately)
  - needs studio (Character/Asset Studio)
- **Image Lab / Processing**: where you generate or import/process an image and then save it to the vault

### Where to click (common entry points)

#### Start from scratch in Imageshop

- Open **Illustrator’s Imageshop**
- Add references (Cast/Assets/NPC) and generate images for beats.

#### Arrive from Writers’ Workshop

You may have entry points that open Imageshop with context preloaded from:

- the current outline
- a selected page
- a shot plan

When you arrive this way, start in **Visual Prep** and work top-to-bottom.

### Recommended workflow

#### Step 1: Prep your references (Production lanes)

- Add 1–3 **character** references for the main cast.
- Add **asset** references for key locations/props (establishing shots benefit a lot here).
- Add **NPC Vault** refs for supporting visuals, style anchors, or “one-off” references.

#### Step 2: Link references to the beat you’re generating

For each beat/page you’re generating:

- link only the cast/assets that truly apply
- avoid sending the entire production library unless you want broad influence

#### Step 3: Generate (or Process an import) and review the preview

- Choose an **aspect ratio** appropriate for your output (comic panel vs cinematic).
- Generate/process to get a preview image.
- If you change key processing options after generating, the app may require you to re-run Process before saving (this prevents mismatched metadata and saves).

#### Step 4: Save to vault (choose the right target)

- **Save to Character Vault** when this image should be reusable as a character identity/pose.
- **Save to Asset Vault** when it’s a reusable location/prop/setting.
- **Save to NPC Vault** when it’s supporting/reference material (quick anchors, style refs, one-offs).

#### Step 5: Escalate to studios when precision matters

Use the studios when:

- a character’s face/identity is drifting
- a location needs consistent architecture across multiple panels
- you need a reusable “source of truth” to reference later

### Outputs from this portal

- Processed/generated images ready for:
  - comics panels
  - illustration exports
  - video keyframes
- Saved vault items (Character / Asset / NPC)

### Tips (consistency & speed)

- Keep prompt deltas small when you want “same image, new POV.”
- Prefer one strong reference set over many weak references.
- Save early to vault for anything you’ll reuse across pages.

---

## 4) Character Studio

### Purpose

Create consistent character images you can reuse across many pages/shots.

### Workflow

#### Step 1: Build identity (references + tags)

- Load reference images into the character reference slots.
- Use the studio’s tags/modules to specify consistent traits.

#### Step 2: Generate and iterate

- Generate a first “canonical” result.
- Use refine flows to adjust without changing identity.

#### Step 3: Save to Character Vault

- Save the best outputs under a consistent profile name.
- Return to Imageshop and use those saved vault images as references.

### Outputs

- A stable character library (poses/expressions/outfits depending on your workflow)

### Tips

- Treat the vault as your long-term memory: save the best “DNA” images early.
- If the character drifts, tighten references first; then tighten prompt changes.

---

## 5) Asset Studio

### Purpose

Create consistent locations/props/sets you can reuse across many images.

### Workflow

#### Step 1: Pick your scope

- Are you building a **location** (street, room, landmark) or a **prop** (vehicle, object)?
- Keep your prompt and references scoped accordingly.

#### Step 2: Build/look + references

- Use references for architectural anchors when you need continuity.
- Use Build/Look controls to keep style and mood consistent.

#### Step 3: Generate and save to Asset Vault

- Save to a collection name you’ll reuse across issues/scenes.

### Outputs

- A reusable asset/setting library for establishing shots and recurring locations

### Tips

- If you’re building a recurring location, save several angles early (front/inside/detail).
- Reuse the same collection for continuity across issues.

---

## 6) Image Vault

### Purpose

Browse and reuse images you’ve saved:

- **Characters** (profile-based)
- **Assets** (collection-based)
- **NPC Vault** (supporting/reference)

### Recommended workflow

#### Step 1: Organize as you go

- Use consistent names for profiles/collections.
- Save “source of truth” images early so you stop re-generating the same anchors.

#### Step 2: Reuse vault images in Imageshop and studios

- Pull vault items into reference slots.
- Use them to stabilize identity and setting continuity.

#### Step 3: Download/export as needed

- Use HQ downloads/zip downloads if your build provides them.

---

## 7) Comics portal (if enabled in your build)

### Purpose

Assemble your comic pages using:

- **panel images** (the main art per panel)
- optional **overlay objects** (stickers/foreground elements, if supported)

### Recommended workflow

1. Generate your page’s key images in **Imageshop** (and refine in studios).
2. In the **Comics** portal, place images into panels.
3. Add overlays for emphasis (SFX, foreground objects) if that workflow is enabled.
4. Export the page/issue (PDF or images).

### Tips

- Decide early if you want “one flat panel image” vs “panel + overlays.”
- If your pipeline is flat panels only, focus on Imageshop consistency first.

---

## 8) Video workflow

### Purpose

Use Writers’ Workshop to produce a **shot plan**, then generate an image pass to support video creation.

### Recommended workflow

1. In **Writers’ Workshop → Video**, generate a shot plan for the issue.
2. Export the shot plan (JSON/CSV).
3. In **Imageshop**, generate:
   - establishing shots
   - key character moments
   - transitions (if needed)
4. Save recurring characters/locations to the vault for continuity.
5. Use the exports (shot plan + images) in your video editing/render pipeline.

---

## 9) Troubleshooting & FAQs

### “Why can’t I use AI tools?”

- If Supabase is configured, you typically need to **sign in** so Edge Functions can validate your JWT.
- Open the account control in the shell and sign in, then retry.

### “Why did my character drift?”

- Too few/weak references, or too large a prompt change between iterations.
- Fix order:
  1. strengthen references (Character Studio + save to vault)
  2. reuse those vault images as references
  3. reduce prompt deltas (especially for “same image, new POV”)

### “Why is Save disabled in Imageshop?”

Common reasons:

- You haven’t run **Process** yet (no processed preview exists).
- You changed processing options after the last Process; run **Process** again before saving so the saved metadata matches the preview you’re saving.

### “What’s the difference between Character/Asset/NPC Vault?”

- **Character Vault**: reusable character identity/poses.
- **Asset Vault**: reusable settings/props/locations.
- **NPC Vault**: supporting/reference images that don’t belong as canonical characters or assets, but still help generation.

