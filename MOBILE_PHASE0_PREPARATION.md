# Mobile web — Phase 0 preparation (iPhone & iPad)

Complete this **before** implementing touch layouts, responsive shell changes, and portal passes. It merges the mobile roadmap **audit checklist** with **decision questions** so scope stays clear.

## How to use this

1. **In the editor:** Use the checkboxes below and type answers under **Your answer** (or replace the placeholder lines).
2. **In the browser (recommended for a form-like flow):** Open [`docs/MOBILE_PHASE0_INTAKE.html`](docs/MOBILE_PHASE0_INTAKE.html) locally (double-click or “Open with” your browser), fill the fields, click **Copy for ARCS assistant**, then paste into your chat.
3. **After you submit answers:** We align on any open items, then start **Phase 1** (touch-first `AppShell`) and follow-on phases.

---

## A. Goals and success criteria

- [ ] **A1.** We agree the ship target is **one responsive web app** (same URL for phone and tablet), not two separate native apps for v1.
- [ ] **A2.** We agree **iPhone** and **iPad** mean two **layout profiles** (narrow touch vs tablet-width touch), not two codebases.

**Your answer — anything to add or change to A1–A2:**

```

```

---

## B. Product and scope

**B1. Minimum device** — Smallest CSS width you must support (examples: iPhone SE ~320px, “iPhone 13 mini” ~375px, “only down to 390px”).

**Your answer:**

```

```

**B2. Orientation** — Should **portrait** and **landscape** both be first-class for v1, or portrait-first with best-effort landscape?

**Your answer:**

```

```

**B3. Portal priority** — If we phase work, rank portals **1 = must work on phone first**, …, **N = can trail**.  
(Portals: Home, Reference Character Studio, Assets Studio, Image Vault, Comic Studio, Storyline Studio, Writers’ Workshop.)

**Your answer (ordered list or table):**

```

```

**B4. “Good enough” for phone on Konva-heavy studios** — Are Character/Assets/Comic allowed to be **read-only or simplified on small phone** for v1, or must **full generate/edit** work?

**Your answer:**

```

```

---

## C. UX and navigation

**C1. Primary navigation pattern on phone** — Preference: **drawer + top bar**, **bottom tab bar**, **hybrid**, or **decide with the team after audit**.

**Your answer:**

```

```

**C2. iPad multitasking** — Do we need to support **Split View / Slide Over** (narrow column widths), or is “full iPad width” enough for v1?

**Your answer:**

```

```

**C3. Known hover-only flows** — The current sidebar uses **hover** to expand and **hover** for account menus. Are you OK replacing these with **tap** (drawer, menu button, bottom sheet) everywhere?

**Your answer:**

```

```

---

## D. Technical considerations (awareness)

- [ ] **D1.** We understand **Konva / canvas** areas may need explicit touch behavior (pan/zoom, hit targets) and should be tested on real hardware, not only desktop emulation.
- [ ] **D2.** We will watch for **scroll traps** (`overflow-hidden`, `100vh` vs `100dvh`, flex `min-h-0`) on mobile Safari.
- [ ] **D3.** We will test **heavy blur / `background-attachment: fixed`** on a real device and simplify if needed.

**Your answer — risks or constraints to flag:**

```

```

---

## E. Auth and Supabase (mobile Safari)

**E1. Production origin** — Exact URL users will use on mobile (e.g. `https://…pages.dev` or custom domain).

**Your answer:**

```

```

**E2. Supabase Auth** — Confirm **Site URL** and **Redirect URLs** in the Supabase dashboard already include that production origin **and** local dev (`http://localhost:5173` etc.). Any **preview** (`*.pages.dev`) URLs that must sign in?

**Your answer:**

```

```

**E3. In-app browsers** — Should we support sign-in from **embedded browsers** (e.g. some social in-app webviews), or is **system Safari / Chrome** only?

**Your answer:**

```

```

---

## F. Deployment and ops

**F1. Cloudflare** — Any **non-default** routing, caching, or headers that could affect the SPA on mobile?

**Your answer:**

```

```

**F2. Error visibility** — Do you want **client error logging** (e.g. Sentry) scoped in this phase, or rely on manual testing for v1?

**Your answer:**

```

```

---

## G. Testing and definition of done

**G1. Desktop emulation** — Acknowledged: **phone/tablet layouts can be exercised on desktop** via narrow window + DevTools device mode; **real devices** still needed for touch, Safari quirks, and performance.

- [ ] Acknowledged

**G2. Device matrix for sign-off** — List devices or simulators you will use (e.g. “iPhone 15 Pro, iPad Air, Safari”).

**Your answer:**

```

```

**G3. One-sentence definition of done** — What must be true to call “mobile v1” shippable?

**Your answer:**

```

```

---

## H. Optional — PWA / Add to Home Screen

**H1.** Do we include **PWA basics** in this phase (`theme-color`, icons, `apple-mobile-web-app-capable`), or **defer**?

**Your answer:**

```

```

---

## I. Phase 0 audit checklist (review pass)

Run these during or after answering the questions; note findings in a separate doc or issue list if large.

| Area | Check |
|------|--------|
| Navigation | Every portal reachable **without hover** |
| Touch targets | Primary controls meet ~**44×44pt** equivalent |
| Scroll | No dead ends; primary content scrolls on short viewports |
| Modals | Usable on **narrow width** (full-screen or bottom sheet if needed) |
| Canvas | Konva: touch doesn’t fight page scroll; performance OK |
| Hover-only | Hover zoom / popovers have **tap** alternative |
| Safe area | Fixed chrome respects **notch / home indicator** (when applicable) |
| iPad split | Layout tolerates **~50% screen width** if required |

**Your answer — top 3 predicted pain areas (optional):**

```

```

---

## Implementation handoff (after Phase 0)

When the above is complete and you’ve pasted answers into chat:

1. **Phase 1:** Touch-first **`AppShell`** (no hover-only nav or account UI).
2. **Phase 2:** Global **safe-area / mobile CSS** (`theme.css`, viewport meta if needed).
3. **Phase 3:** **Portal-by-portal** passes in agreed priority order.
4. **Phase 4:** **Verification** (emulators + your device matrix + desktop regression).

Tracked in [`tasks.md`](tasks.md) (Mobile web section) and [`implementation_plan.md`](implementation_plan.md).
