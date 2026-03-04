# Nano Banana: Walkthrough & Roadmap

High-level narrative of where the project is and where it’s going. For checklists and technical steps, see **tasks.md** and **implementation_plan.md**.

---

## Current Stack

- **UI**: React 19, Vite 7, Tailwind, Radix UI (e.g. Tooltip)
- **Canvas**: Konva + react-konva (Stage, Layer, Group, Rect, Line, Image, Transformer, etc.)
- **State**: Zustand (`comicStore`) with **zundo** (temporal undo/redo) and **persist** (localStorage)
- **Comic surface**: Multi-page (Webtoon / 2‑page spread), 800×1200 logical canvas, BSP-style panel splitting with fixed gutter

---

## What’s Already Done (Phases 1–9)

- **Serialization**: Save/Load JSON; project and custom theme persist in localStorage.
- **Undo/Redo**: Buttons and Cmd+Z / Cmd+Shift+Z; history includes layout and theme.
- **Studio intelligence**: Project Settings (inclusive bias, demographic focus), prompt middleware, Mock AI Generate in Asset Library.
- **Tooltips**: Radix-based Tooltip used across Comic Layout and toolbars.
- **Auto-framing**: BSP-style split (vertical/horizontal/slant), ellipse masking, panel flip/rotate.
- **Multi-page**: PageNavigator, add/remove/duplicate/reorder pages, Webtoon vs Spread.
- **Word art & balloons**: BalloonNode (strokes, warp, 3D extrusion), TextToolbar, shared FontSelect, Custom Theme (palette, font, texture).
- **Export**: High-res PNG/PDF (e.g. 300 DPI) via ComicCanvas.
- **Genre system**: GenreRegistry, Custom Theme with color/texture/font, Apply to All, persistence.

---

## What’s Next: Phases 10–13 & Critical Bugs

### Phase 10: Obsidian Tech UI
Unify the comic UI around a single, collapsible top ribbon (Library, Layers, Pages, Settings, Export), move to icons + tooltips, refresh the main hub (5th link to Comic, vertical icon menu), and apply the Obsidian-style theme (e.g. `#0F0F12`, `#1A1A1E`, `#00D1FF`).

### Phase 11: Canvas & Geometry
Frame vs Content sub-selection in ComicPanel, snap guides in Cyber Cyan, configurable BSP gutter, page background color/image, and image objects outside panels (e.g. SFX/overlays).

### Phase 12: Typography & Balloons
Shape hot-swap, inner-balloon text control and alignment, tail smart overlap and “Snap Tail to Panel Edge,” and Auto-Fit OFF by default.

### Phase 13: Templates & Genre
Save/load blank panel templates, Cover Studio workflow, and final pass on Smart Bias for all genres in the registry.

### Priority 1 Bugs
- Undo/Redo: reliable capture of all state changes.
- Insert Image: Asset Library button correctly updating the selected panel.
- Layer panel: visibility and lock toggles correctly wired and reflected in the UI.

---

## How to Use These Docs

| File | Use |
|------|-----|
| **tasks.md** | Checklist for Phases 10–13 and Critical Bug-Squash; tick off as you go. |
| **implementation_plan.md** | Where to change code (files, store, components) and how it fits the Konva/React/Zustand setup. |
| **walkthrough.md** | This file: big picture and roadmap for you and future agents. |

Cursor does not auto-update these files; update them (or ask the agent to) as you complete work so the roadmap stays accurate.
