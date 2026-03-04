# Technical Spec: Sub-Selection & Masked Content Logic

## 1. The Problem
Currently, when an image is inserted into a panel, the image and the panel (polygon) are treated as a single entity. Scaling or moving the panel forces the image to transform identically, preventing the user from "reframing" the shot or adjusting character placement within the panel.

## 2. The Architecture: The "Nested Group" Model
To allow independent manipulation, the `ComicPanel` component must be refactored into a Parent-Child hierarchy using Konva Groups.

### Hierarchy Structure:
- **Parent Group (The Frame)**: 
    - Holds the `clipFunc` (the polygon points defining the panel shape).
    - Owns the `x`, `y`, `scale`, and `rotation` of the panel on the page.
- **Child 1: Image Node (The Content)**: 
    - Sits inside the Parent Group.
    - Owns its own `x`, `y`, `scale`, and `rotation` relative to the group's (0,0).
- **Child 2: Stroke Node (The Border)**: 
    - Sits inside the Parent Group.
    - Renders the `Konva.Line` using the same polygon points to ensure the border stays aligned with the clip.

## 3. Interaction Modes
The `ObjectToolbar` must toggle between two interaction states for selected panels:

### A. Frame Mode (Default)
- **Target**: The Parent Group.
- **Transformer**: Attaches to the Group. 
- **Result**: Moving/Scaling the handles changes the panel's size and position on the page. The content stays anchored to the frame.

### B. Content Mode (Sub-Selection)
- **Trigger**: Double-click the panel OR click a "Select Content" icon in the toolbar.
- **Target**: The Child Image Node.
- **Transformer**: Attaches directly to the Image *inside* the clipped group.
- **Result**: Moving/Scaling the handles moves the character/background *within* the panel boundaries. The frame remains stationary.

## 4. Implementation Details
- **Coordinate Conversion**: When in "Content Mode," the Transformer must account for the Parent Group's scale. Use `node.getRelativePointerPosition()` or `node.getAbsoluteTransform().invert()` to ensure mouse drags remain precise.
- **Deletion Logic**: 
    - In Frame Mode: Deleting removes the entire panel.
    - In Content Mode: Deleting only removes the image, leaving a blank panel ready for a new generation/upload.
- **Auto-Fill Check**: If "Content Mode" is used to move an image, disable the "Auto-Cover" math temporarily so the user’s manual placement isn't overwritten by the automatic scaling logic.