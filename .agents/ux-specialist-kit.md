# Nano Banana: UI/UX Specialist Handover & Pro-Refinement (V3.0)

## 1. Top Priority: Stability & Bug Squashing
- **Undo/Redo Reliability:** Currently functions intermittently. Fix the `zundo` integration and ensure every state change (draws, cuts, text edits, moves) is captured.
- **Image/Panel Decoupling:** Once an image is in a panel, they currently feel "linked." Implement "Sub-Selection" logic so the user can manipulate the image (pan/scale) independently of the panel frame, or "break them apart."
- **Unresponsive Components:** - Fix "Insert Image" button.
    - Fix Layer Menu Checkboxes (visibility/lock toggles).
- **Snapping & Guides:** Grid guides are currently inconsistent. Ensure snapping/guides appear for ALL vertices and sides across all shapes.

## 2. Universal UI Consolidation (The "Ribbon" Architecture)
- **The Top Ribbon:** Consolidate the following menus into a single, sleek, collapsible ribbon at the top of the workspace:
    - Library, Layers, Pages, Settings, Export PDF.
- **Iconification:** Replace text-heavy buttons with traditional, high-contrast icons.
- **Tooltip System:** Universal hover tooltips for every icon/button.
- **Home Page:** - Add a 5th photo link for the Comic Mode Portal.
    - Collapse the main menu into a vertical icon strip that expands on hover.

## 3. Advanced Balloon & Typography Suite
- **Shape Hot-Swapping:** When a balloon is selected, choosing a new shape from the menu should **replace** the current shape instead of creating a new object.
- **Inner-Balloon Text Control:** - Ability to select, scale, and shift the text box *inside* the balloon independently of the balloon body.
    - Alignment: Horizontal (Left/Center/Right) and Vertical (Top/Bottom/Center) justifications.
    - Expand Font Library: Add more professional comic/sci-fi font choices.
- **Smart Overlap:** Automatically hide balloon seams where tails connect to bodies.
- **Snap Tail Cleanly:** Implement a button/action to snap a tail to the nearest panel edge instantly.

## 4. Visuals, FX & Asset Management
- **Panel Aesthetics:** Add controls for Border Color and Drop Shadows for individual panels.
- **Page Styling:** Options for Background Color and Background Images (with scale/positioning).
- **Asset Imports:** Allow "Import Image" for objects *outside* of panels (custom sound effects, decals).
- **Defaults:** "Auto-Fit" for text boxes/balloons should be **OFF** by default.

## 5. Keyboard Shortcut Map
| Action | Shortcut | Action | Shortcut |
| :--- | :--- | :--- | :--- |
| **Select / Pointer** | `V` | **Undo** | `Cmd/Ctrl + Z` |
| **Split Panel** | `S` | **Redo** | `Cmd/Ctrl + Shift + Z` |
| **Knife Tool (Cut)** | `K` | **Delete Selected** | `Backspace / Delete` |
| **Add Balloon** | `B` | **Pan Canvas** | `Space (Hold) + Drag` |
| **Add Text** | `T` | **Zoom In/Out** | `Cmd/Ctrl + +/-` |
| **Rotate (15°)** | `R` | **Export PDF** | `Cmd/Ctrl + E` |