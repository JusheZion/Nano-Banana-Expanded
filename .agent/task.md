# Nano Banana: Dynamic Geometry & Pro FX Studio

## Phase 1-3: Core Foundation (COMPLETED)
- [x] **Polygon Geometry Engine**: Sutherland-Hodgman bisection & vertex anchors.
- [x] **Edge Translation**: Gold-highlighted hitboxes for moving vertex pairs.
- [x] **Modular Balloons**: Quad-Bezier tails with seam-masking.

## Phase 4: Advanced Layouts & Pro-UX (NEXT)
- [ ] **Ellipse Panel Integration**: Support `shape: 'ellipse'` with circular clipping masks.
- [ ] **Smart Guides & Snapping**: Implement visual alignment lines for center/edge snapping.
- [ ] **The Layer Tree**: Implement sidebar UI per technical spec (refer to layer-tree-spec.md).
- [ ] **Edge Attraction**: Implement vertex-snapping (20px threshold) to adjacent panel edges.

## Phase 5: Advanced FX & Texture Studio
- [ ] **Reactive Padding**: Balloon bodies must automatically resize to fit text content.
- [ ] **The FX Toolbar**: Sliders for Shadow (Blur/Offset/Opacity) and Glow (0-offset shadow).
- [ ] **Advanced Fill Modes**:
    - **Stretch/Center**: Scale textures to cover polygon bounding boxes.
    - **Decal Mode**: Non-repeating image fills with XY offset controls.
- [ ] **Global Style Sync**: Updating a preset should optionally update all active instances.
- [ ] **Texture Registry**: Integrate the `TextureRegistry.json` for Halftone, Hex, and Grit.

## Phase 6: Representative Community & Deployment
- [ ] **Inclusive Generation Bias**: Ensure AI prompts default to diverse representations per user instructions.
- [ ] **JSON Serialization**: Full project save/load functionality.
- [ ] **High-Res Export**: 300 DPI PNG/PDF generation.

## Phase 7: Multi-Page Architecture & Project Management
- [ ] **Project Schema**: Implement the `ProjectTemplate.json` structure to support multiple chapters and pages.
- [ ] **Page Navigator**: Create a "Storyboard View" sidebar that shows thumbnails of all pages in the current chapter.
- [ ] **State Persistence**: Update the store to handle switching between pages without losing data (auto-save to local storage).
- [ ] **Project Metadata**: Add a UI to edit Chapter Titles and Project Info.