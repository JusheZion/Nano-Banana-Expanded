# Nano Banana: Professional Comic Studio Roadmap

## Phase 1-5: Engine, Geometry & FX (COMPLETED)
- [x] Polygon Geometry, Knife Tool, and Edge Dragging.
- [x] Modular Curved Balloons & FX Suite (Glow/Shadow/Textures).

## Phase 6: Intelligence, Serialization & UX Polish (NEXT)
- [ ] **JSON Save/Load Engine**: Full persistence of all panel/balloon/FX data.
- [ ] **Undo/Redo System**: Wire up buttons and keyboard shortcuts (Cmd+Z/Cmd+Shift+Z) using `zundo`.
- [ ] **Studio Intelligence**:
    - [ ] Implement "Inclusive Bias" toggle and "Demographic Focus" field.
    - [ ] **Mock AI Workflow**: Button to test prompt logic using Asset Library images.
- [ ] **UX Tooltips**: Implement hover tooltips for all icons/objects (e.g., via Radix UI or Tippy.js).
- [ ] **Auto-Framing**: One-click "Standard Grid" generator to auto-populate the page with panels.

## Phase 7: Multi-Page & Cinematic Layouts
- [ ] **Page Navigator**: Sidebar for navigating between page thumbnails (ProjectTemplate.json).
- [ ] **Cinematic Controls**:
    - [ ] **Zoom to Fit/Page**: Controls to plan layouts at full scale.
    - [ ] **2-Page Spread Mode**: Side-by-side view for cinematic 1-panel splashes.
- [ ] **State Persistence**: Auto-save to local storage so work survives browser refreshes.

## Phase 8: Word Art & Professional Publishing
- [ ] **Word Art Studio**: 
    - [ ] "Sound Effect" tool (e.g., 'POW', 'BOOM') with warped text and custom comic fonts.
    - [ ] Cover Art Logos: Support for text-stroke, multi-layered fills, and outer glows.
- [ ] **High-Res Export**: 300 DPI PNG/PDF generation for print.
- [ ] **Genre Presets**: One-click themes (Sci-Fi, Noir, Fantasy) to swap fonts and prompt biases.